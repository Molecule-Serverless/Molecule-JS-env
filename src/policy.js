const INVOKE_PATH = '/invoke'
const HTTP_PREFIX = 'http://'

// Information is the return struct for all policy
class Information {
    constructor(hostname, port, path, method) {
        this.hostname = hostname;
        this.port = port
        this.path = path;
        this.method = method;
    }
}

var SimplePolicy = (func) => {
    let infos = func.infos
    let provider = process.env.PROVIDER

    if (infos != null) {
        let info = null
        if (infos.hasOwnProperty(provider)) {
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
            // no instances
            return null
        }
        // now because of the special point of openstack, HTTP_PREFIX + info.url is not useful.
        // let chosenUrl = HTTP_PREFIX + info.url
        let chosenUrl = null;
        if (infos.hasOwnProperty(provider) && info.instances.length > 0) {
            // the internal instance is existed
            var rand = Math.floor(Math.random() * info.instances.length);
            chosenUrl = HTTP_PREFIX + info.instances[rand] + INVOKE_PATH
            console.log(chosenUrl)
        }
        if (chosenUrl === null) {
            return null;
        }
        let method = func.method
        let query = new URL(chosenUrl)
        return new Information(query.hostname, query.port, query.pathname, method)
    } else {
        return null
    }

}

exports.Policies = {
    "simple": SimplePolicy
}
