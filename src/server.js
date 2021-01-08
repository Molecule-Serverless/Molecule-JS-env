const mesh = require('./mesh')
const config = require('./config.json')
const opentracing = require("opentracing");
var express = require('express')
var bodyParser = require('body-parser');
const isEmpty = require('lodash.isempty');
var http = require('http');

var app = express()
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
let tracer = null;
let func = null;
var meshData = {}

// getData assume we will send data to the next step function, now we igonre the param
function getData(opts, data) {
    let finalData = ""
    let needPost = opts.method === 'DELETE' || opts.method === 'POST' || opts.method === 'PUT'
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

async function handler(req) {
    // the function is a demo callee, get span from http headers
    let span = null
    let isFirst = mesh.IsFirst(meshData)
    if (isFirst) {
        let appName = mesh.GetAppName(meshData)
        if (appName != null) {
            console.log("start span as the first one")
            span = tracer.startSpan(appName);
        }

    } else {
        span = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers);
    }
    let headers = {}
    let localSpan = null
    if (span != null) {
        localSpan = tracer.startSpan(process.env.FUNC_NAME || "A", {childOf: span});
        tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, headers);
        console.log("headers after inject %o", headers)
    }
    let finalResult = null
    let result = null
    if (func) {
        if (isEmpty(req.body)) {
            result = func({})
        } else {
            console.log("req body: %s", req.body)
            result = func(req.body);
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
        console.log("send result indirectly which is from " + callee)
        finalResult = response
    } else {
        console.log("send result directly")
        finalResult = result
    }
    if (span != null && isFirst) {
        span.finish()
    }
    return finalResult;
}


function main() {
    process.on('message', function (msg) {
        console.log(msg)
        func = require(msg.target).handler
        console.log("function init at express")
    })
    tracer = mesh.InitMesh(meshData)
    app.get('/invoke', async function (req, res) {
        let result = await handler(req)
        console.log("result:%o", result)
        res.json(result)
    })
    app.listen(40041, function () {
        console.log('Example app listening on port 40041');
    })
}

main()
