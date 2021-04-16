{
  "targets": [
    {
      "target_name": "ipc",
      "sources": [ 
      		"ipc.c", 
		"moleculeOS-userlib/global_syscall_interfaces.c",
		"moleculeOS-userlib/global_syscall_runtime.c",
		"moleculeOS-userlib/ipc.c",
		"moleculeOS-userlib/local-ipc/common/benchmarks.c",
		"moleculeOS-userlib/local-ipc/common/arguments.c",
		"moleculeOS-userlib/local-ipc/common/parent.c",
		"moleculeOS-userlib/local-ipc/common/process.c",
		"moleculeOS-userlib/local-ipc/common/signals.c",
		"moleculeOS-userlib/local-ipc/common/sockets.c",
		"moleculeOS-userlib/local-ipc/common/utility.c",
	],
	"include_dirs": [
		"moleculeOS-userlib/include", "moleculeOS-userlib/local-ipc/"
	],
	"libraries": [
		"-lm", "-lpthread"
	],
	"cflags": ["-DMOLECULE_CLEAN"]
    }
  ]
}
