const client = require('prom-client')
const register = client.register

exports.qps = new client.Counter({
    name: 'qps',
    help: 'the number of requests',
    labelNames: [process.env.FUNC_NAME],
})

exports.metrics = async (req, res) => {
    try {
        res.set('Content-Type', register.contentType)
        res.end(await register.metrics())
    } catch (ex) {
        res.status(500).end(ex)
    }
}
