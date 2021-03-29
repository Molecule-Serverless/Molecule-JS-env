var ipc = require('bindings')('ipc.node')

console.log('This should be eight:', ipc.add(3, 5))
console.log('Setup FIFO server, fd:', ipc.fifo_server_setup(0xbeef))
