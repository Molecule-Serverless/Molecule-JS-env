const info = require('./info');
const trace = require('./trace');
const config = require('./config');
const policy = require('./policy')
var funcName = process.env.FUNC_NAME

exports.InitMesh = (meshData) => {
    // todo init a struct for get info or a interface to get info
    info.watch(config, meshData);
    return trace.InitTracer(config)
};

exports.GetAppName = (meshData) => {
    if (meshData.application === undefined) {
        // Because the mesh center sync information to the instance need some time after the instance is init, so we need some protected strategy
        return null
    }
    return meshData.application.name
}

// IsFirst will check whether the function is the first step in the application.
exports.IsFirst = (meshData) => {
    if (meshData.application === undefined) {
        // Because the mesh center sync information to the instance need some time after the instance is init, so we need some protected strategy
        return false
    }
    let steps = meshData.application.stepChains
    let selfName = process.env.FUNC_NAME

    return (steps.length > 0 && steps[0].functionName === selfName)
}
// GetCallee will give all of getData information which is from mesh control plane
exports.GetCallee = (meshData) => {

    if (meshData.application === undefined) {
        // Because the mesh center sync information to the instance need some time after the instance is init, so we need some protected strategy
        return null
    }
    let steps = meshData.application.stepChains
    let selfName = process.env.FUNC_NAME
    let callee = ""
    for (let index = 0; index < steps.length; ++index) {
        if (steps[index].functionName === selfName) {
            if (index + 1 < steps.length) {
                callee = steps[index + 1].functionName
                break
            } else {
                return null
            }
        }
    }
    if (callee === "") {
        return null // todo here maybe data mistake
    }
    if (meshData.functions != null) {
        console.log("choose functions %o", meshData.functions)
        let calleeFunc = meshData.functions[callee]
        console.log("callee function %o", calleeFunc)
        let chosenPolicy =  process.env.POLICY || "simple"

	console.log("policy.Policies:%s",policy.Policies)
        return policy.Policies[chosenPolicy](calleeFunc)
    }
    return null

}
