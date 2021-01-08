const info = require('./info')
const mesh = require('./mesh')
const config = require('./config.json')
let metaData = {}
process.env.PROVIDER = "hcloud"
process.env.FUNC_NAME = "test_js_A"
process.env.APP_NAME = ""
info.watch(config, metaData)

function sleep(time = 0) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time);
    })
};
async function test() {
    while(true) {
        await sleep(1000)
        console.log(mesh.GetCallee(metaData))
    }
}
test()
