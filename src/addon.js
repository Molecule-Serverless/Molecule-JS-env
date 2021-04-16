var ipc = require('bindings')('ipc.node')

console.log('This should be eight:', ipc.add(3, 5))
//console.log('Setup FIFO server, fd:', ipc.fifo_server_setup(0xbeef))

function IPCServerSetup(uuid) {
	fd = ipc.fifo_server_setup(uuid)
	console.log('Setup FIFO server, fd:', fd)
	return fd
}

function IPCClientSetup(uuid) {
	fd = ipc.fifo_client_setup(uuid)
	console.log('Setup FIFO client, fd:', fd)
	return fd
}

//conn is the fd in FIFO
function IPCSend(conn, buf) {
	ret = ipc.fifo_write(conn, buf)
	return ret 
}

//conn is the fd in FIFO
function IPCRecv(conn) {
	buf = ipc.fifo_read(conn)
	return buf 
}

function IPCInit(uuid)
{
	fd = ipc.fifo_ipc_init(uuid);
	return fd
}

function RegisterSelfGlobal()
{
	global_pid = ipc.register_self_global()
	return global_pid
}

function IPCConnect(uuid)
{
	fd = ipc.fifo_ipc_connect(uuid)
	return fd
}

exports.IPCClientSetup = IPCClientSetup
exports.IPCServerSetup = IPCServerSetup
exports.IPCSend = IPCSend
exports.IPCRecv = IPCRecv
exports.IPCInit = IPCInit
exports.IPCConnect = IPCConnect
exports.RegisterSelfGlobal = RegisterSelfGlobal
