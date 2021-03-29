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

