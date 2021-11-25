const mesh = require('./mesh')
const fs = require('fs')
const config = require('./config.json')
const opentracing = require("opentracing")
var protoLoader = require('@grpc/proto-loader')
var grpc = require('grpc')
const protobuf = require("protobufjs")
var express = require('express')
var bodyParser = require('body-parser')
const isEmpty = require('lodash.isempty')
const prom = require('./prom')
var http = require('http')
var gracefulShutdown = require('http-graceful-shutdown')
const STEP_NAME_KEY = 'step-name'
const APP_NAME_KEY = 'app-name'


var app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
let tracer = null
let func = null
var meshData = {}

function sleep(time = 0) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

async function handler(req) {
    // the function is a demo callee, get span from http headers
    let span = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
    console.log(req.headers)
    let stepName = req.headers[STEP_NAME_KEY]
    let applicationName = req.headers[APP_NAME_KEY]
    let headers = {}
    let localSpan = null
    if (span !== null) {
        localSpan = tracer.startSpan(process.env.FUNC_NAME || "A", {childOf: span})
        tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, headers)
        console.log("headers after inject %o", headers)
    }
    let finalResult = null
    let result = null
    if (func) {
        if (isEmpty(req.body)) {
            result = await func({})
        } else {
            //console.log("req body: %s", req.body)
            console.log("req body: %o", req.body)
            result = await func(req.body)
        }
    } else {
        console.log("function does not init")
        return ""
    }
    if (localSpan !== null) {
        localSpan.finish()
    }
    let callee = await mesh.GetCallee(meshData, applicationName, stepName, result, localSpan, span)
    console.log("get callee %o", callee)
    if (!callee) {
        console.log("send result directly %o", result)
        finalResult = result
    } else if (callee.information) {
        let data = result
        if (callee.result) {
            data = callee.result
        }
        headers[STEP_NAME_KEY] = callee.stepName
        headers[APP_NAME_KEY] = applicationName
        // todo use mesh information to mapping transfer data
        let response = await mesh.GetData({
            ...callee.information,
            headers: headers
        }, data)
        console.log("send result indirectly which is from callee: %o", callee)
        finalResult = JSON.parse(response)
    } else if (callee.information === null) {
        console.log("callee need wait for instances")
        let retryTime = 200
        let i = 0
        for (; i < retryTime; ++i) {
            let retryCallee = await mesh.GetCallee(meshData, applicationName, stepName, result, localSpan, span)
            console.log("get retry callee %o", retryCallee)
            if (retryCallee && retryCallee.information) {
                let data = result
                if (retryCallee.result) {
                    data = retryCallee.result
                }
                headers[STEP_NAME_KEY] = retryCallee.stepName
                headers[APP_NAME_KEY] = applicationName
                // todo use mesh information to mapping transfer data
                let response = await mesh.GetData({
                    ...retryCallee.information,
                    headers: headers
                }, data)
                console.log("send result indirectly which is from callee: %o", retryCallee)
                finalResult = JSON.parse(response)
                break
            } else if (retryCallee.information === undefined) {
                finalResult = retryCallee.result
                break
            } else {
                await sleep(50)
            }
        }
        if (i === retryTime) {
            finalResult = result
        }
    } else if (callee.information === undefined) {
        // end
        if (callee.result) {
            finalResult = callee.result;
        } else {
            finalResult = result;
        }
    }
    return finalResult
}

function getLastLine(filename) {
    var data = fs.readFileSync(filename, 'utf8')
    var lines = data.split("\n")
    return lines[lines.length - 2]
}

function readId() {
    return getLastLine("/etc/hosts").split("\t")[1]
}

function readIp() {
    return getLastLine("/etc/hosts").split("\t")[0]
}

async function RegisterToWorker() {
    let target = process.env.WORK_HOST || "127.0.0.1:8001"
    let WORKER_PROTO_PATH = __dirname + '/proto/worker/worker.proto'

    let packageDefinition = protoLoader.loadSync(
        WORKER_PROTO_PATH,
        {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        })
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
    let worker_proto = protoDescriptor.worker
    let client = new worker_proto.Worker(target,
        grpc.credentials.createInsecure())
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


function main() {
    process.on('message', function (msg) {
        console.log(msg)
        func = require(msg.target).handler
        console.log("function init at express")
    })
    tracer = mesh.InitMesh(meshData)
    app.get('/invoke', async (req, res) => {
        let result = await handler(req)
        console.log("result:%o", result)
        res.json(result)
        prom.qps.inc()
    })
    prom.qps.inc(0)
    app.get('/metrics', prom.metrics)
    server = app.listen(40041, function () {
        console.log('Example app listening on port 40041')
        RegisterToWorker().then((res) => {
            console.log("register res %o", res)
        }).catch((err) => {
            console.log("get err %s", err)
        })
    })
    gracefulShutdown(server)
}

main()
