## Env

Two Dockerfiles:
- Dockerfile: default one inherit from Hcloud project
- Dockerfile-14.xxx: A new that uses updated node version


## Demos

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
