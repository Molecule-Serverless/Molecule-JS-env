var PROTO_PATH = __dirname + '/proto/container/container.proto';
var grpc = require('grpc');
var protoLoader = require('@grpc/proto-loader');
const protobuf = require("protobufjs");

var packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
var container_proto = protoDescriptor.container;

var client = new container_proto.Container("127.0.0.1:50051",
    grpc.credentials.createInsecure());

let funcName = "testFunc"


async function test() {
    let setEnvsResponse = await new Promise((resolve, reject) => {
        client.SetEnvs({
            env: ["FUNC_NAME=" + funcName],
        }, function (err, response) {
            if (err) {
                reject(err)
            }
            resolve(response)
        })
    })
    console.log(setEnvsResponse)
    let loadCodeResponse = await new Promise((resolve, reject) => {
        client.LoadCode({
            funcName: funcName,
            url: "http://106.15.225.249:8081/index-js.zip",
        }, function (err, response) {
            if (err) {
                reject(err)
            }
            resolve(response)
        })
    })
    console.log(loadCodeResponse)
    let invokeResponse = await new Promise((resolve, reject) => {
        client.Invoke({
            funcName: funcName,
            payload: Buffer.from(`{"a":"b"}`, "utf-8")
        }, function(err, response) {
            if (err) {
                reject(err)
            }
            resolve(response)
        });
    });
    console.log(invokeResponse)
    console.log(invokeResponse.output.toString())
}

test()
