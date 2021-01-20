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


var app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
let tracer = null
let func = null
var meshData = {}

// getData assume we will send data to the next step function, now we igonre the param
function getData(opts, data) {
    let finalData = "{}"
    let needPost = true
    if (needPost) {
        finalData = JSON.stringify(data)
        opts.headers["Content-Type"] = 'application/json'
        opts.headers['Content-Length'] = finalData.length
    }
    return new Promise(function (resolve, reject) {
        let req = http.request(opts, (res) => {
            console.log('req in')
            let returnData = ''
            res.on('data', function (d) {
                console.log('get data')
                returnData += d
            })
            res.on('end', function (date) {
                resolve(returnData.toString())
            })
        })
        req.on('error', error => {
            console.error(error)
            reject(error)
        })
        if (needPost) {
            req.write(finalData)
        }
        req.end()
    })
}

function sleep(time = 0) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

async function handler(req) {
    // the function is a demo callee, get span from http headers
    let span = null
    let isFirst = mesh.IsFirst(meshData)
    if (isFirst) {
        let appName = mesh.GetAppName(meshData)
        if (appName != null) {
            console.log("start span as the first one")
            span = tracer.startSpan(appName)
        }

    } else {
        span = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
    }
    let headers = {}
    let localSpan = null
    if (span != null) {
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
            console.log("req body: %s", req.body)
            result = await func(req.body)
        }
    } else {
        console.log("function does not init")
        return ""
    }
    if (localSpan != null) {
        localSpan.finish()
    }
    let callee = mesh.GetCallee(meshData)
    console.log("get callee %o", callee)
    if (callee) {
        let data = result
        // todo use mesh information to mapping transfer data
        let response = await getData({
            hostname: callee.hostname,
            port: callee.port,
            path: callee.path,
            method: callee.method,
            headers: headers
        }, data)
        console.log("send result indirectly which is from %o", callee)
        finalResult = JSON.parse(response)
    } else if (callee === null) {
        console.log("callee need wait for instances")
        let retryTime = 200
        let i = 0
        for (; i < retryTime; ++i) {
            let retryCallee = mesh.GetCallee(meshData)
            if (retryCallee) {
                let data = result
                // todo use mesh information to mapping transfer data
                let response = await getData({
                    hostname: retryCallee.hostname,
                    port: retryCallee.port,
                    path: retryCallee.path,
                    method: retryCallee.method,
                    headers: headers
                }, data)
                console.log("send result indirectly which is from %o", retryCallee)
                finalResult = JSON.parse(response)
                break
            } else {
                await sleep(50)
            }
        }
        if (i === retryTime) {
            finalResult = result
        }
    } else if (callee === undefined) {
        console.log("send result directly")
        finalResult = result
    }
    if (span != null && isFirst) {
        span.finish()
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
