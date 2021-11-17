var PROTO_PATH = __dirname + '/proto/container/container.proto'
var grpc = require('grpc')
var protoLoader = require('@grpc/proto-loader')
var addon = require('./addon')
var express = require('express')
var process = require('process')
const protobuf = require("protobufjs")
const request = require('superagent')
const fs = require('fs')
const admZip = require('adm-zip')
const opentracing = require("opentracing")
const cp = require('child_process')
const { response, Router } = require('express')
const { config, exit } = require('process')
const { json, urlencoded } = require('body-parser')
const e = require('express')
const { assert } = require('console')
let child = null
let packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    })
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
let container_proto = protoDescriptor.container
let func = null
let root = null
let config_json = null
let self_fifo = null
let next_fifo = null
let prev_fifo = null
let has_next = null
async function test() {
    let root = await protobuf.load(PROTO_PATH)
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
        console.log("payload:%s", call.request.payload.toString())
        let payload = JSON.parse(call.request.payload.toString())
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
    let envs = call.request.env
    let iter = envs[Symbol.iterator]()
    for (let pair of iter) {
        const keyAndValue = pair.split('=')
        if (keyAndValue.length !== 2) {
            continue
        }
        process.env[keyAndValue[0]] = keyAndValue[1]
    }
    let resp = setEnvsResponse.create({
        code: Code.values.OK
    })
    callback(null, resp)
}

/* DD: load code from local path */
function loadCode_local(path) {
    return new Promise((resolve, reject) => {
                try {
			//the path should /xx/xx/index.js
                    let initFunc = require(path).handler
                    if (!initFunc) {
                        console.log("function init error")
                        throw new Error("function init error")
                    }
		    // send the code path to child
                    // child.send({target: path})
                    resolve(initFunc)
                } catch (e) {
                    console.log("error in require code:%s", e)
                    reject(e)
                }
    })
}

function loadCode(url) {
    return new Promise((resolve, reject) => {
        const zipFile = "index.zip"
        const targetPath = "/tmp/code/"
        request
            .get(url)
            .on('error', function (e) {
                console.log("request get error %o", e)
                reject(e)
            })
            .pipe(fs.createWriteStream(zipFile))
            .on('finish', function () {
                console.log('finished dowloading')
                var zip = new admZip(zipFile)
                console.log('start unzip')
                zip.extractAllTo(targetPath, true)
                console.log('finished unzip')
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
    let resp = StopResponse.create({code: Code.values.OK})
    callback(null, resp)
}


//skip exception handling
function Read_Config(path)
{
    // console.log(path)
    config_data = fs.readFileSync(path, 'utf8')
    return JSON.parse(config_data.toString())
}


function get_microsecond()
{
    let hrtime = process.hrtime()
    return hrtime[0]*1000000 + hrtime[1] / 1000
}

//FIXME: using json to send to/recv from fifo,  


/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
async function main() {
    /* 1. boot here */
    console.log("Node.JS runtime for Molecule-serverless　hetero started\n")
    //load function

    try
    {
	console.log(process.env.CODE_PATH)
        func = await loadCode_local(process.env.CODE_PATH)
    }catch(e)
    {
        console.log(e)
        exit(-1)
    }
	//FIXME: now use environment variable to determine the caller
    //FIXME: and the first and second callee.
    
    //initial caller should listen to network to get client request
    if("IPCTestCaller" === process.env.IPCTest)
    {
        console.log("IPC Test Caller Start\n")
        config_path = process.env.CONFIG_PATH
        console.log(config_path)
        config_json = Read_Config(config_path)
        //FIXME: uuid should read from config file later
        self_fifo = addon.IPCInit(parseInt(config_json.self_fifo))
        //only first container need to get request from network
        let app = express()
        has_next = config_json.hasNext
        if(has_next === true)
        {
            next_fifo = addon.IPCConnect(parseInt(config_json.next_fifo))
        }
        console.log("caller init successfully\n")
        app.use(json())
        app.use(urlencoded({extended: false}))
        app.get('/invoke', async (req, res)=>{
            console.log("get into invoke\n")
            ret = await func(req)
            if(has_next)
            {
                before_sending_time = get_microsecond()
                addon.IPCSend(next_fifo, JSON.stringify({source:'prev',data:ret} ))
                result = addon.IPCRecv(self_fifo)
                after_recving_time = get_microsecond()
                result = JSON.parse(result)
				// The logging will not impact the results as we have recorded
				// the time
                console.log("caller receive result\n")
                assert(result.source === 'next')
                console.log("caller after_receiving: ", after_recving_time, "before_sending: ",  before_sending_time)
                console.log("callee + round-trip comm: ", after_recving_time - before_sending_time, " us")
                // console.log("caller after_receiving: ")
                // console.log(after_recving_time)
                // console.log("caller before sending: ")
                // console.log(before_sending_time)
                // //TODO: how to return the result to client?
                res.json(result)
            }
            else
            {
                res.json(result)
            }
        })
        server = app.listen(40041, ()=>
        {
            console.log("caller listening in port 40041\n")
        })
    //     let server = new grpc.Server()
    //     server.addService(container_proto.Container.service, {
    //     Invoke: Invoke,
    //     SetEnvs: SetEnvs,
    //     LoadCode: LoadCode,
    //     Stop: Stop
    // })
    // //start server.js
    // server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure())
    // server.start()
    }
    // other containter read requset from fifo and write the ret value to 
    else
    {
        console.log("IPC Test Callee Start\n")
        config_path = process.env.CONFIG_PATH
        console.log(config_path)
        config_json = Read_Config(config_path)
        prev_fifo = addon.IPCConnect(parseInt(config_json.prev_fifo))
        self_fifo = addon.IPCInit(parseInt(config_json.self_fifo))
        has_next = config_json.hasNext
        if(has_next === true)
        {
            next_fifo = addon.IPCConnect(parseInt(config_json.next_fifo))
        }
        console.log("Callee init successfully\n")
        while(true)
        {
            msg = addon.IPCRecv(self_fifo)
            after_recving_time = get_microsecond()
            if(msg != null)
            {
                msg = JSON.parse(msg)
            }
            else
            {
                console.log("broken pipe")
                exit(0)
            }
            console.log(msg)
            if(msg.source === 'prev')
            {
                console.log("callee get message\n")
                ret = await func(msg.data)
                if(has_next)
                {
                    before_sending_time = get_microsecond()
                    addon.IPCSend(next_fifo,JSON.stringify({
                        source: 'prev',
                        data: ret
                    }))
                    console.log("callee after_receiving: ", after_recving_time, "before_sending: ",  before_sending_time)
                }
                else
                {
                    console.log("callee return result")
                    before_sending_time = get_microsecond()
                    addon.IPCSend(prev_fifo,JSON.stringify({
                        source: 'next',
                        data: ret
                    }))
                    //console.log("callee after_receiving: ", after_recving_time, "before_sending: ", before_sending_time)
                	console.log("calleee takes: ", before_sending_time - after_recving_time, " us")
                }
            }
            else if(msg.source === 'next')
            {
                addon.IPCSend(prev_fifo, msg)
            }
            else
            {
                console.log("error msg source")
                exit(-1)
            }
        }
    }
    /* For IPC Test only==================Begin====================*/
    // 	if ("IPCTestClient" === process.env.IPCTest) {
	// 	console.log('IPC Test client start\n')
	// 	request_conn = addon.IPCClientSetup(0xbeef)
    //     response_conn = addon.IPCServerSetup(0xbeee)
    //     console.log("node0 set up")
	// 	addon.IPCSend(request_conn, "Hello, I am client")
    //     response_msg = addon.IPCRecv(response_conn)
    //     console.log("[Client got Response]: %s", response_msg)
	// }
    // 	if ("IPCTestServer" === process.env.IPCTest) {
	// 	console.log('IPC Test server start\n')
	// 	request_conn = addon.IPCServerSetup(0xbeef)
    //     response_conn = addon.IPCClientSetup(0xbeee)
    //     console.log("node1 set up")
	// 	msg = addon.IPCRecv(request_conn)
	// 	console.log('[Server recv msg from client]: %s', msg)
    //     addon.IPCSend(response_conn, "Hello, I am server, I got your request")
	// }
	// return

    /* For IPC Test only==================End====================*/

    /* 2. start a client server */
    // child = cp.fork('./server_ipc_base.js')
    // child.on('exit', function (code) {
    //     console.log('express closed with code:%o', code)
    //     process.exit(0)
    // })
    // process.on('SIGTERM', () => {
    //     console.log('main process get SIGTERM')
    //     child.kill('SIGTERM')
    // })

    // /* 3. load function handler and pass the function to child */
    // try {
    //     //func = await loadCode(process.env.CODE_URI)
    //     func = await loadCode_local(process.env.CODE_PATH)
    // } catch(e) {
    //     console.log(e)
    //     process.exit(-1)
    // }

    // /* 4. We do not use grpc.Server now, but we can rely on it to loop the parent process */
    // let server = new grpc.Server()
    // root = await protobuf.load(PROTO_PATH)
    // server.addService(container_proto.Container.service, {
    //     Invoke: Invoke,
    //     SetEnvs: SetEnvs,
    //     LoadCode: LoadCode,
    //     Stop: Stop
    // })
    // //start server.js
    // server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure())
    // server.start()

/*
    child = cp.fork('./server.js')
    child.on('exit', function (code) {
        console.log('express closed with code:%o', code)
        process.exit(0)
    })
    process.on('SIGTERM', () => {
        console.log('main process get SIGTERM')
        child.kill('SIGTERM')
    })
    try {
        func = await loadCode(process.env.CODE_URI)
    } catch(e) {
        console.log(e)
        process.exit(-1)
    }
    let server = new grpc.Server()
    root = await protobuf.load(PROTO_PATH)
    server.addService(container_proto.Container.service, {
        Invoke: Invoke,
        SetEnvs: SetEnvs,
        LoadCode: LoadCode,
        Stop: Stop
    })
    //start server.js
    server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure())
    server.start()
    */
}


main()
