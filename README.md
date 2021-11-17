## Env

Two Dockerfiles:
- Dockerfile: default one inherit from Hcloud project
- Dockerfile-14.xxx: A new that uses updated node version


## Demos

### How to run a single IPC demo

Prepare three terminals (or three tabs if you use tmux)

First, you should download molecule-js-env and molecule-benchmarks from gitlab, in a same directory

1st terminal:

	cd PATH-to-molecule-js-env/src
	# Init the test environment
	./scripts/docker_test_init.sh
	./scripts/docker_run-IPC-client.sh

2nd terminal:

	cd PATH-to-molecule-js-env/src
	./scripts/docker_run-IPC-server.sh

3rd terminal:

	cd PATH-to-molecule-benchmarks/
	./test_ipc.sh

You should see results on both three terminals if success.


### FIFO-IPC in a single container

start a container use:

	./docker_run_dd-heteroIPC.sh in /src dir.

exec a bash in the container in another term:

	docker exec container_id_xxx /bin/bash


Note: use docker ps to see the container_id

in the first term:

	export IPCTest=IPCTestClient
	node .

in the second term:

	export IPCTest=IPCTestServer
	node .


You should see the results then.

### FIFO-IPC in two different containers

start two containers, both use:

	./docker_run_dd-heteroIPC.sh in /src dir.

Note: ensure the script does not bind a port (or change the port number manually)

in the first container:

	export IPCTest=IPCTestClient
	node .

in the second container:

	export IPCTest=IPCTestServer
	node .


You should see the results then.

Explained: It does not change much to support the two-container cases. This is because we update the FIFO_PATH in ipc.c to use /env path, this is a shared dir for both two containers.
