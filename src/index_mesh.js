var PROTO_PATH = __dirname + '/proto/container/container.proto';
var grpc = require('grpc');
var protoLoader = require('@grpc/proto-loader');
const protobuf = require("protobufjs");
const request = require('superagent');
const fs = require('fs');
const admZip = require('adm-zip');
const opentracing = require("opentracing");
const cp = require('child_process');
let child = null
let packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
let container_proto = protoDescriptor.container;
let func = null;
let root = null;

async function test() {
    let root = await protobuf.load(PROTO_PATH);
    let invokeResponse = root.lookupType("container.InvokeResponse")
    let Code = root.lookupEnum("container.InvokeResponse.Code")
    let resp = invokeResponse.create({code: Code.values.NOT_READY})
    console.log(resp)
}

/**
 * Implements the SayHello RPC method.
 */
async function Invoke(call, callback) {
    let invokeResponse = root.lookupType("container.InvokeResponse")
    let Code = root.lookupEnum("container.InvokeResponse.Code")
    if (func == null) {
        let resp = invokeResponse.create({code: Code.values.NOT_READY})
        callback(null, resp)
        return
    }
    if (call.request.funcName !== process.env.FUNC_NAME) {
        let resp = invokeResponse.create({code: Code.values.FUNC_MISMATCH})
        callback(null, resp)
        return
    }
    try {
        console.log("payload:%s", call.request.payload.toString());
        let payload = JSON.parse(call.request.payload.toString());
        let output = await func(payload)
        let resp = invokeResponse.create({
            code: Code.values.OK,
            output: Buffer.from(JSON.stringify(output))
        })
        callback(null, resp)
    } catch (e) {
        console.log("get error in invoke %s", e)
        let resp = invokeResponse.create({
            code: Code.values.RUNTIME_ERROR,
        })
        callback(null, resp)
    }
    console.log("invoke fianally")
}

function SetEnvs(call, callback) {
    let setEnvsResponse = root.lookupType("container.SetEnvsRequest")
    let Code = root.lookupEnum("container.SetEnvsResponse.Code")
    let envs = call.request.env;
    let iter = envs[Symbol.iterator]();
    for (let pair of iter) {
        const keyAndValue = pair.split('=');
        if (keyAndValue.length !== 2) {
            continue
        }
        process.env[keyAndValue[0]] = keyAndValue[1];
    }
    let resp = setEnvsResponse.create({
        code: Code.values.OK
    })
    callback(null, resp)
}

function loadCode(url) {
    return new Promise((resolve, reject) => {
        const zipFile = "index.zip"
        const targetPath = "/tmp/code/"
        request
            .get(url)
            .on('error', function (e) {
                console.log("request get error %o", e);
                reject(e)
            })
            .pipe(fs.createWriteStream(zipFile))
            .on('finish', function () {
                console.log('finished dowloading');
                var zip = new admZip(zipFile);
                console.log('start unzip');
                zip.extractAllTo(targetPath, true);
                console.log('finished unzip');
                try {
                    let initFunc = require('/tmp/code/index.js').handler
                    if (!initFunc) {
                        console.log("function init error")
                        throw new Error("function init error")
                    }
                    child.send({target: '/tmp/code/index.js'})
                    resolve(initFunc)
                } catch (e) {
                    console.log("error in require code:%s", e)
                    reject(e)
                }
            })
    })
}

function LoadCode(call, callback) {
    let LoadCodeResponse = root.lookupType("container.LoadCodeResponse")
    let Code = root.lookupEnum("container.LoadCodeResponse.Code")
    let url = call.request.url
    let resp = LoadCodeResponse.create({
        code: Code.values.OK
    })
    try {
        loadCode(url)
    } catch (e) {
        console.log(e)
        resp = LoadCodeResponse.create({
            code: Code.values.ERROR
        })
    }
    callback(null, resp)
}

function Stop(call, callback) {
    let StopResponse = root.lookupType("container.StopResponse")
    let Code = root.lookupEnum("container.StopResponse.Code")
    let resp = StopResponse.create({code: Code.values.OK});
    callback(null, resp)
}

function getLastLine(filename) {
    var data = fs.readFileSync(filename, 'utf8');
    var lines = data.split("\n");
    return lines[lines.length - 2]
}

function readId() {
    return getLastLine("/etc/hosts").split("\t")[1]
}

function readIp() {
    return getLastLine("/etc/hosts").split("\t")[0]
}

async function RegisterToWorker() {
    try {
        func = await loadCode(process.env.CODE_URI)
    } catch(e) {
        console.log(e)
        process.exit(-1)
    }
    let target = process.env.WORK_HOST || "127.0.0.1:8001"
    let WORKER_PROTO_PATH = __dirname + '/proto/worker/worker.proto';

    let packageDefinition = protoLoader.loadSync(
        WORKER_PROTO_PATH,
        {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    let worker_proto = protoDescriptor.worker;
    let client = new worker_proto.Worker(target,
        grpc.credentials.createInsecure());
    return new Promise((resolve, reject) => {
        client.Register({
            id: readId(),
            addr: readIp(),
            runtime: process.env.RUNTIME,
            funcName: process.env.FUNC_NAME,
            memory: parseInt(process.env.MEMORY),
        }, function (err, response) {
            if (err) {
                reject(err)
            }
            resolve(response)
        })
    })
}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
async function main() {
    child = cp.fork('./server.js');
    let server = new grpc.Server();
    root = await protobuf.load(PROTO_PATH);
    server.addService(container_proto.Container.service, {
        Invoke: Invoke,
        SetEnvs: SetEnvs,
        LoadCode: LoadCode,
        Stop: Stop
    });
    RegisterToWorker().then((res) => {
        console.log("register res %o", res)
    }).catch((err) => {
        console.log("get err %s", err)
    })
    //start server.js
    server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
    server.start();
}


main();
