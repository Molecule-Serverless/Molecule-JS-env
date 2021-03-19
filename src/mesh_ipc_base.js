const info = require('./info')
const trace = require('./trace')
const config = require('./config')
const policy = require('./policy')
var funcName = process.env.FUNC_NAME
const PROTO_PATH = __dirname + "/proto/discovery/"
const MODEL_PATH = PROTO_PATH + "model.proto"
const grpc = require('grpc')
const protobuf = require("protobufjs")
const opentracing = require("opentracing")
const http = require('http')
const https = require('https')
const STEP_NAME_KEY = 'step-name'
const APP_NAME_KEY = 'app-name'


// Information is the return struct for all policy
class CalleeInformation {
    constructor(stepName, information, result) {
        this.stepName = stepName
        this.information = information
        this.result = result
    }
}


let tracer = trace.InitTracer(config)
exports.InitMesh = (meshData) => {
    // todo init a struct for get info or a interface to get info
    info.watch(config, meshData)
    return tracer
}

function sleep(time = 0) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

// getData assume we will send data to the next step function, now we igonre the param
GetData = (opts, data) => {
    let finalData = "{}"
    let needPost = true
    if (needPost) {
        finalData = JSON.stringify(data)
        opts.headers["Content-Type"] = 'application/json'
        opts.headers['Content-Length'] = finalData.length
    }
    opts.timeout = 1000
    console.log("GetData's opts: %o\n", opts)
    return new Promise(function (resolve, reject) {
        let method = http
        if (opts.protocol === 'https:') {
            method = https
        }
        let req = method.request(opts, (res) => {
            console.log('req in')
            console.log(`STATUS: ${res.statusCode}`)
            console.log(`HEADERS: ${JSON.stringify(res.headers)}`)
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
            console.error("error in getData: %o", error)
            reject(error)
        })
        if (needPost) {
            req.write(finalData)
        }
        req.end()
    })
}
// deprecated
// exports.GetAppName = (meshData) => {
//     if (meshData.application === undefined) {
//         // Because the mesh center sync information to the instance need some time after the instance is init, so we need some protected strategy
//         return null
//     }
//     return meshData.application.name
// }

// IsFirst will check whether the function is the first step in the application.
// deprecated
// exports.IsFirst = (meshData) => {
//     if (meshData.application === undefined) {
//         // Because the mesh center sync information to the instance need some time after the instance is init, so we need some protected strategy
//         return false
//     }
//     let steps = meshData.application.steps
//     let selfName = process.env.FUNC_NAME
//
//     // todo change IsFirst logic
//     return (steps.length > 0 && steps[0].functionName === selfName)
// }

// json {"data": {"key": "value"}}
// description: $data.key
// return "value"
function getValue(json, description) {
    return eval("json." + description)
}

async function executeCondition(conditions, result) {
    console.log("in executeCondition")
    return new Promise(async (resolve, reject) => {
        for (let i = 0; i < conditions.length; i++) {
            let cond = conditions[i]
            let left = cond.leftValue
            let right = cond.rightValue
            if (cond.leftValue.startsWith("$")) {
                console.log("left value ref: %s", cond.leftValue.slice(1))
                left = getValue(result, cond.leftValue.slice(1))
            }
            if (cond.rightValue.startsWith("$")) {
                console.log("right value ref: %s", cond.rightValue.slice(1))
                right = getValue(result, cond.rightValue.slice(1))
            }
            console.log("left value: %o", left)
            console.log("right value: %o", right)
            let protobufRoot = await protobuf.load(MODEL_PATH)
            let OpEnum = protobufRoot.lookupEnum("mesh.model.ConditionStep.Operator")
            let compareResult = false;
            switch (cond.operator) {
                case OpEnum.values.EQ: {
                    compareResult = (left === right)
                    break
                }
                case OpEnum.values.NEQ: {
                    compareResult = (left !== right)
                    break
                }
                case OpEnum.values.GT: {
                    compareResult = (left > right)
                    break
                }
                case OpEnum.values.LT: {
                    compareResult = (left < right)
                    break
                }
                case OpEnum.values.GTE: {
                    compareResult = (left >= right)
                    break
                }
                case OpEnum.values.LTE: {
                    compareResult = (left <= right)
                    break
                }
                case OpEnum.values.NONE: {
                    console.log("error on OpEnum")
                    break
                }
            }
            if (compareResult) {
                console.log("compare return")
                resolve(cond.targetNextStep)
                return
            }
            //Do something
        }
        console.log(conditions)
        resolve(conditions[conditions.length - 1].defaultNextStep)
    })
}

async function executeParallelCall(meshData, app, target, result, span) {
    return new Promise(async (resolve, reject) => {
        let localSpan = tracer.startSpan(target, {childOf: span})
        let headers = {}
        let callee = await GetCallee(meshData, app.name, target, result, localSpan, span)
        console.log("parallel callee: %o", callee)
        if (callee && callee.information) {
            let data = result
            if (callee.result) {
                data = callee.result
            }
            localSpan.finish()
            tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, headers)
            // todo use mesh information to mapping transfer data
            headers[STEP_NAME_KEY] = callee.stepName
            headers[APP_NAME_KEY] = app.name
            try {
                let response = await GetData({
                    ...callee.information,
                    headers: headers
                }, data)
                console.log(response)
                resolve(JSON.parse(response))
            } catch (e) {
                console.log("error in executeParallelCall: %o", e)
                reject(e)
            }
        } else if (callee.information === null) {
            // retry
            let RetryTime = 50;
            let retryCallee = null;
            for (let time = 0; time < RetryTime; time++) {
                retryCallee = await GetCallee(meshData, app.name, target, result, localSpan, span)
                if (retryCallee && retryCallee.information) {
                    break
                } else {
                    await sleep(50)
                }
            }
            try {
                let data = result;
                if (retryCallee.result) {
                    data = retryCallee.result
                }
                tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, headers)
                // todo use mesh information to mapping transfer data
                headers[STEP_NAME_KEY] = callee.stepName
                headers[APP_NAME_KEY] = app.name
                let response = await GetData({
                    ...retryCallee.information,
                    headers: headers
                }, data)
                console.log(response)
                resolve(JSON.parse(response))
            } catch (e) {
                console.log("error in executeParallelCall: %o", e)
                reject(e)
            }
        } else {
            resolve(null)
        }
    })
}

async function executeParallel(meshData, app, parallelStepName, result, span) {
    console.log("start parallel call")
    return executeParallelCall(meshData, app, parallelStepName, result, span)
}

// executeBranch will do ParallelStep, ConditionStep or EndStep work
async function executeBranch(meshData, app, stepName, result, localSpan, span) {
    console.log("in executeBranch")
    let localResult = result;
    return new Promise(async (resolve, reject) => {
        console.log("at 1")
        console.log("step: %o", app.steps[stepName])
        let next = app.steps[stepName]
        while (next !== null) {
            console.log("at 3")
            if (!next) {
                console.log("at 4")
                resolve(null)
                return
            }
            if (next.function) {
                console.log("at 5")
                if (next.function.functionName !== process.env.FUNC_NAME) {
                    resolve({stepName: next.stepName, function: next.function.functionName, result: localResult})
                    return
                } else {
                    next = app.steps[next.function.nextStep]
                    continue
                }
            } else if (next.condition) {
                console.log("at 6")
                console.log("next condition: %o", next.condition)
                let conditionSpan = tracer.startSpan(next.stepName, {childOf: span})
                let nextName = await executeCondition(next.condition.conditions, localResult)
                conditionSpan.finish()
                next = app.steps[nextName]
                console.log("next function: %o", next)
                continue
            } else if (next.parallel) {
                console.log("at 7")
                // todo may executeBranch
                try {
                    let parallelSpan = tracer.startSpan(next.stepName, {childOf: span})
                    let targets = next.parallel.targets
                    let promises = []
                    for (let i = 0; i < targets.length; ++i) {
                        promises.push(executeParallel(meshData, app, targets[i], localResult, parallelSpan))
                    }
                    localResult = await Promise.all(promises)
                    parallelSpan.finish()
                    console.log("parallel result: %o", localResult)
                    next = app.steps[next.parallel.nextStep]
                    continue
                } catch (e) {
                    console.log("error in executeBranch parallel: %o", e)
                    resolve(null)
                    return
                }
            } else if (next.end) {
                console.log("at 8")
                resolve(new CalleeInformation(undefined, undefined, localResult))
                return
            }
        }
        resolve(null)
    })
}

// GetCallee will give all of getData information which is from mesh control plane
// stepName is now stepName
GetCallee = async (meshData, applicationName, stepName, result, localSpan, span) => {
    console.log("in Get Callee")
    return new Promise(async (resolve, reject) => {

	    //resolve(new CalleeInformation(process.env.NEXTSTEPNAME, process.env.INFORMATION, result))
	    if (process.env.NEXTSTEPNAME) {
	    	resolve(new CalleeInformation(process.env.NEXTSTEPNAME, new policy.Information(process.env.INFO_HOST, process.env.INFO_PORT, '/invoke', 'GET', 'http:'), result))
	    }else{
	    	resolve(new CalleeInformation(process.env.NEXTSTEPNAME, undefined , result))
	    }
	    return
/*
        if (!meshData.applications) {
            // Because the mesh center sync information to the instance need some time after the instance is init, so we need some protected strategy
            console.log("error meshData.applications is null")
            info.CallADS([applicationName], meshData)
            resolve(new CalleeInformation(stepName, null, result))
            return
        }

        let application = meshData.applications[applicationName]
        console.log("application choose %o", application)

        if (application === undefined) {
            //console.log("[error] application undefined")
            meshData.applications[applicationName] = null
            info.CallADS([applicationName], meshData)
            resolve(new CalleeInformation(stepName, null, result))
            return
        } else if(application === null) {
            //console.log("[error] application null")
            resolve(new CalleeInformation(stepName, null, result))
            return
        }

        let callee = null
        try {
            callee = await executeBranch(meshData, application, stepName, result, localSpan, span)
        } catch (e) {
            console.log("GetCallee get error: %o", e)
        }

        console.log("get callee in GetCallee: %o", callee)

        if (callee === null) {
            resolve(null)
            return
        } else if (callee.stepName === undefined) {
            // end
            resolve(new CalleeInformation(stepName, undefined, callee.result))
            return
        }

        if (meshData.functions != null) {
            console.log(callee)
            let calleeFunc = meshData.functions[callee.function]
            console.log("callee function %o", calleeFunc)
            let chosenPolicy = process.env.POLICY || "simple"
            resolve(new CalleeInformation(callee.stepName, policy.Policies[chosenPolicy](calleeFunc), callee.result))
            return
        }
        resolve(new CalleeInformation(callee.stepName, null, callee.result))
	*/
    })
}

exports.GetCallee = GetCallee
exports.GetData = GetData
