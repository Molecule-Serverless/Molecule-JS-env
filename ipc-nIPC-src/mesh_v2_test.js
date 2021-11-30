const PROTO_PATH = __dirname + "/proto/discovery/"
const DISCOVERY_PATH = PROTO_PATH + "discovery.proto"
const MODEL_PATH = PROTO_PATH + "model.proto"
const grpc = require('grpc')
const protobuf = require("protobufjs")
const protoLoader = require('@grpc/proto-loader')
const mesh = require('./mesh')
const packageDefinition = protoLoader.loadSync(
    [DISCOVERY_PATH, MODEL_PATH],
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    })

function test() {
    let provider = "aws"
    process.env.PROVIDER = provider
    protobuf.load(MODEL_PATH)
        .then(async function (root) {
            let applicationType = root.lookupType("mesh.model.Application")
            let stepType = root.lookupType("mesh.model.Step")
            let functionStepType = root.lookupType("mesh.model.FunctionStep")
            let conditionStepType = root.lookupType("mesh.model.ConditionStep")
            let endStepType = root.lookupType("mesh.model.EndStep")
            let parallelStepType = root.lookupType("mesh.model.ParallelStep")
            let conditionType = root.lookupType("mesh.model.ConditionStep.Condition")
            let operatorEnum = root.lookupEnum("mesh.model.ConditionStep.Operator")
            let functionType = root.lookupType("mesh.model.Function")
            let infoType = root.lookupType("mesh.model.Info")
            let app = applicationType.create({
                name: "app",
                entryStep: "entry",
                steps: {
                    "a": stepType.create({
                        stepName: "a",
                        function: functionStepType.create({
                            functionName: "a",
                            nextStep: "b"
                        })
                    }),
                    "b": stepType.create({
                        stepName: "b",
                        function: functionStepType.create({
                            functionName: "b",
                            nextStep: "branch"
                        })
                    }),
                    "branch": stepType.create({
                        stepName: "branch",
                        condition: conditionStepType.create({
                            conditions: [
                                conditionType.create(
                                    {
                                        operator: operatorEnum.values.EQ,
                                        leftValue: "$data",
                                        rightValue: "test",
                                        defaultNextStep: "end",
                                        targetNextStep: "else",
                                    }
                                )
                            ],
                        })
                    }),
                    "else": stepType.create({
                        stepName: "else",
                        parallel: parallelStepType.create({
                            targets: ["c", "d"],
                            nextStep: "final"
                        })
                    }),
                    "final": stepType.create({
                        stepName: "else",
                        function: functionStepType.create({
                            functionName: "e",
                            nextStep: "end"
                        })
                    }),
                    "c": stepType.create({
                        stepName: "c",
                        function: functionStepType.create({
                            functionName: "c",
                            nextStep: "end"
                        })
                    }),
                    "d": stepType.create({
                        stepName: "d",
                        function: functionStepType.create({
                            functionName: "d",
                            nextStep: "end"
                        })
                    }),
                    "end":
                        stepType.create({
                            stepName: "end",
                            end: endStepType.create(
                                {
                                    stepName: "end"
                                }
                            )
                        })
                }
            })

            let metaData = {
                application: app,
                functions: {
                    "a": functionType.create({
                        name: "a",
                        method: "GET",
                        infos: {
                            "aws": infoType.create({
                                url: "aws.com",
                                internalUrl: "internal.aws.com",
                                price: 0.2,
                                instances: ["10.0.a.1:40041"]
                            })
                        }
                    }),
                    "b": functionType.create({
                        name: "b",
                        method: "GET",
                        infos: {
                            "aws": infoType.create({
                                url: "a.aws.com",
                                internalUrl: "internal.a.aws.com",
                                price: 0.2,
                                instances: ["10.0.b.1:40041"]
                            })
                        }
                    }),
                    "c": functionType.create({
                        name: "c",
                        method: "GET",
                        infos: {
                            "aws": infoType.create({
                                url: "c.aws.com",
                                internalUrl: "internal.c.aws.com",
                                price: 0.2,
                                instances: ["10.0.c.1:40041"]
                            })
                        }
                    }),
                    "d": functionType.create({
                        name: "d",
                        method: "GET",
                        infos: {
                            "aws": infoType.create({
                                url: "d.aws.com",
                                internalUrl: "internal.d.aws.com",
                                price: 0.2,
                                instances: ["10.0.d.1:40041"]
                            })
                        }
                    }),
                    "e": functionType.create({
                        name: "e",
                        method: "GET",
                        infos: {
                            "aws": infoType.create({
                                url: "e.aws.com",
                                internalUrl: "internal.e.aws.com",
                                price: 0.2,
                                instances: ["10.0.e.1:40041"]
                            })
                        }
                    }),
                }
            }

            for (const [key, value] of Object.entries(app.steps)) {
                console.log(`${key}: ${value}`);
            }
            // console.log("check step a: %o", await mesh.GetCallee(metaData, "a", {}))
            process.env.FUNC_NAME = "b"
            console.log("check step b: %o", await mesh.GetCallee(metaData, "b", {"data": "test"}))
        })


}

test()

