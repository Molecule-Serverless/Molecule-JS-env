const PROTO_PATH = __dirname + "/proto/discovery/";
const DISCOVERY_PATH = PROTO_PATH + "discovery.proto"
const MODEL_PATH = PROTO_PATH + "model.proto"
const grpc = require('grpc');
const protobuf = require("protobufjs");
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync(
    [DISCOVERY_PATH, MODEL_PATH],
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
const discovery = grpc.loadPackageDefinition(packageDefinition).mesh.discovery;
const model = grpc.loadPackageDefinition(packageDefinition).mesh.model;
exports.watch = (config, meshData) => {
    let client = new discovery.DiscoveryServer(config.info.target,
        grpc.credentials.createInsecure());
    let call = client.XDS();
    let funcData = {
        "instance": {
            "provider" :    process.env.PROVIDER || "AWS",
            "functionName" : process.env.FUNC_NAME || "A",
            "applicationName" : process.env.APP_NAME || "test",
            "url": "a.aws.com"
        },
        "resourceType": "ads",
        "resourcesName": [process.env.APP_NAME || "test"],
        "resourceNonce": ""
    }
    call.on('data', function (res) {
        switch (res.resourceType) {
            case "ads": {
                if (res.resources.length !== 1) {
                    // mesh center gives wrong ads
                    let funcData = {}
                    let instance = {}
                    instance.provider = process.env.PROVIDER || "AWS"
                    instance.functionName = process.env.FUNC_NAME || "A"
                    instance.applicationName = process.env.APP_NAME || "test"
                    instance.url = "a.aws.com"
                    funcData.instance = instance
                    funcData.resourceType = "ads"
                    funcData.resourcesName = [instance.applicationName]
                    funcData.responseNonce = ""
                    call.write(funcData)
                } else {
                    protobuf.load(MODEL_PATH)
                        .then(function (root) {
                            let resource = res.resources[0]
                            let application = root.lookupType("mesh.model.Application")
                            let message = application.decode(resource.value);
                            meshData.application = message
                            // after get application message, get function info
                            let steps = meshData.application.stepChains
                            let funcNames = []
                            for (let step of steps) {
                               funcNames.push(step.functionName)
                            }
                            protobuf.load(DISCOVERY_PATH).then(function (root) {
                                let requestType = root.lookupType("mesh.discovery.XDSRequest")
                                let payload = {
                                    "instance": {
                                        "provider" :    process.env.PROVIDER || "AWS",
                                        "functionName" : process.env.FUNC_NAME || "A",
                                        "applicationName" : process.env.APP_NAME || "test",
                                        "url": "a.aws.com"
                                    },
                                    "resourceType": "fds",
                                    "resourcesName" : funcNames,
                                    responseNonce: ""
                                }
                                let err = requestType.verify(payload)
                                if (err != null) {
                                    console.log(err)
                                }
                                call.write(payload)
                            })
                        })
                }
                break
            }
            case "fds": {
                protobuf.load(MODEL_PATH).then(function (root) {
                    let funcs = {}
                    for (let resource of res.resources) {
                        let func = root.lookupType("mesh.model.Function")
                        let message = func.decode(resource.value)
                        let funcObject = func.toObject(message, {
                            enums: String,  // enums as string names
                            longs: String,  // longs as strings (requires long.js)
                            bytes: String,  // bytes as base64 encoded strings
                            defaults: true, // includes default values
                            arrays: true,   // populates empty arrays (repeated fields) even if defaults=false
                            objects: true,  // populates empty objects (map fields) even if defaults=false
                            oneofs: true    // includes virtual oneof fields set to the present field's name
                        });
                        funcs[funcObject.name] = funcObject
                        console.log(funcObject)
                    }
                    meshData.functions = funcs
                })
                break
            }
            default : {
                console.log("resource type has not supported")
            }
        }
    });
    call.on('end', function () {
        console.log('Server ended call');
    });
    call.on('error', function (e) {
        console.log(e);
    });
    call.write(funcData)
};

