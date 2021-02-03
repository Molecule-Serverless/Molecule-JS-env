const INVOKE_PATH = '/invoke'
const HTTP_PREFIX = 'http://'
const HTTPS_PREFIX = 'https://'
var URL = require('url').URL;

// Information is the return struct for all policy
class Information {
    constructor(hostname, port, path, method, protocol) {
        this.hostname = hostname
        this.port = port
        this.path = path
        this.method = method
        this.protocol = protocol
    }
}

SimplePolicy = (func) => {
    let infos = func.infos
    let provider = process.env.PROVIDER
    let protocol = 'http:'
    let chosenUrl = null
    console.log("provider: %s", provider)

    if (infos != null) {
        console.log("simple policy 1")
        let info = null
        if (infos.hasOwnProperty(provider)) {
            // the internal instance is existed
            info = infos[provider]
            chosenUrl = info.internalUrl
        } else {
            // choose the first one
            for (let key of Object.keys(infos)) {
                info = infos[key]
                chosenUrl = info.url
                break
            }
        }
        if (info == null) {
            // no instances
            return null
        }
        if (infos.hasOwnProperty(provider) && info.instances.length > 0) {
            // the internal instance is existed
            console.log("simple policy 2")
            let rand = Math.floor(Math.random() * info.instances.length)
            chosenUrl = HTTP_PREFIX + info.instances[rand] + INVOKE_PATH
            console.log(chosenUrl)
        }
        if (chosenUrl.startsWith(HTTPS_PREFIX)) {
            protocol = 'https:'
        }
        let method = func.method
        let query = new URL(chosenUrl)
        let resultInformation = new Information(query.hostname, query.port, query.pathname, method, protocol)
        console.log("simple policy return result %o", resultInformation)
        return resultInformation
    } else {
        console.log("simple policy 3")
        return null
    }

}

MixedPolicy = (func) => {
    let infos = func.infos
    let provider = process.env.PROVIDER
    let protocol = 'http:'
    console.log("provider: %s", provider)

    if (infos != null) {
        let bias = Math.random() > 1
        console.log("mixed policy 1")
        let info = null
        let chooseProvider = false
        // choose the first one
        for (let key of Object.keys(infos)) {
            if (key !== provider) {
                info = infos[key]
                break
            }
        }

        if (bias) {
            if (infos.hasOwnProperty(provider)) {
                // the internal instance is existed
                info = infos[provider]
                chooseProvider = true
            }
        }

        if (info == null) {
            // no instances
            return null
        }
        // now because of the special point of openstack, HTTP_PREFIX + info.url is not useful.
        let chosenUrl = info.url

        if (chooseProvider && info.instances.length > 0) {
            // the internal instance is existed
            console.log("mixed policy 2")
            let rand = Math.floor(Math.random() * info.instances.length)
            chosenUrl = HTTP_PREFIX + info.instances[rand] + INVOKE_PATH
            console.log(chosenUrl)
        }

        if (info.url.startsWith(HTTPS_PREFIX)) {
            protocol = 'https:'
        }

        let method = func.method
        let query = new URL(chosenUrl)
        let resultInfo =  new Information(query.hostname, query.port, query.pathname, method, protocol)
        console.log("mixed policy return result:%o", resultInfo)
        return resultInfo
    } else {
        console.log("mixed policy 3")
        return null
    }

}

exports.Policies = {
    "simple": SimplePolicy,
    "mixed": MixedPolicy
}
