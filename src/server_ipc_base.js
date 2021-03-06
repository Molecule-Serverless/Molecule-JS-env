const mesh = require('./mesh_ipc_base')
const fs = require('fs')
const config = require('./config.json')
const opentracing = require("opentracing")
var protoLoader = require('@grpc/proto-loader')
var grpc = require('grpc')
const protobuf = require("protobufjs")
var express = require('express')
var bodyParser = require('body-parser')
const isEmpty = require('lodash.isempty')
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

    let span = null
    //let span = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)

    console.log(req.headers)
    let stepName = req.headers[STEP_NAME_KEY]
    let applicationName = req.headers[APP_NAME_KEY]
    let headers = {}
    let localSpan = null
    /*
    if (span !== null) {
        localSpan = tracer.startSpan(process.env.FUNC_NAME || "A", {childOf: span})
        tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, headers)
        console.log("headers after inject %o", headers)
    }
    */

    /* By Dd: we simply use the environment to get the trace inject info */
    //headers = process.env.TRACER_INJECT
    headers = {'uber-trace-id': '2a0285386f62c81a:2a0285386f62c81a:0000000000000000:1'}

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
	 let response = null
	 var beginTime = process.hrtime();
        try {
       	 //let response = await mesh.GetData({
       	 response = await mesh.GetData({
       	     ...callee.information,
       	     headers: headers
       	 }, data)
    	}catch(e) {
		console.log("[Dd] got error on Getdata")
    		console.log(e)
   	 }
	var endTime = process.hrtime(beginTime);
	var interval = parseInt(endTime[0] * 1e6 + endTime[1]*1e-3);
	console.log('[Results] callee comm (round-trip) + exe (callee) costs: ', interval, 'us' )
        console.log("send result indirectly which is from %o", callee)
        console.log("response: %o", response)
        finalResult = JSON.parse(response)
    } else if (callee.information === null) {
        console.log("error callee.info is null\n")
	    /*
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
                console.log("send result indirectly which is from %o", retryCallee)
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
	*/
    } else if (callee.information === undefined) {
        // end
        if (callee.result) {
            finalResult = callee.result;
        } else {
            finalResult = result;
        }
        console.log("end of a call: %o", finalResult)
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
    //tracer = mesh.InitMesh(meshData)
    app.get('/invoke', async (req, res) => {
	var beginTime = process.hrtime();
        let result = await handler(req)
	var endTime = process.hrtime(beginTime);
	var interval = parseInt(endTime[0] * 1e6 + endTime[1]*1e-3);
	console.log('[Results] exe (handler) costs: ', interval, 'us' )
        console.log("result:%o", result)
        res.json(result)
    })
    //server = app.listen(40041, function () {
    server = app.listen(process.env.PORT, function () {
        //console.log('Example app listening on port 40041')
        console.log('Example app listening on port %s', process.env.PORT)
        //RegisterToWorker().then((res) => {
        //    console.log("register res %o", res)
        //}).catch((err) => {
        //    console.log("get err %s", err)
        //})
    })
    gracefulShutdown(server)
}

main()
