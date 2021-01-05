const url = require("url");
// Information is the return struct for all policy
class Information {
    constructor(hostname, path, method) {
        this.hostname = hostname;
        this.path = path;
        this.method = method;
    }
}

var SimplePolicy = (func) => {
    let infos = func.infos
    let provider = process.env.PROVIDER || ""

    if(infos != null) {
        let info = null
        if(infos.hasOwnProperty(provider)) {
            // the internal instance is existed
            info = infos[provider]
        } else {
            // choose the first one
            for (let key of Object.keys(infos)) {
                info = infos[key]
                break
            }
        }
        if (info == null) {
            return null
        }
        let chosenUrl = info.url
        let method = func.method
        let query = url.parse(chosenUrl)
        return new Information(query.hostname, query.path, method)
    } else {
        return null
    }

}

exports.Policies = {
    "simple" : SimplePolicy
}
