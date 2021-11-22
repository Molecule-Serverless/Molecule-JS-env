#!/bin/bash

function run_test(){
	#NAME=interact-smarthome
	#./docker_run-IPC-client.sh tests/ipc/stages/$NAME/
	./docker_run-IPC-client_cross_network.sh tests/ipc/stages/$1/
	sleep 1
	#./docker_run-IPC-server.sh tests/ipc/stages/$NAME/
	./docker_run-IPC-server.sh tests/ipc/stages/$1/
	sleep 1

	./test_ipc.sh

	sleep 2

	#docker logs ipc_stage_test_caller > $NAME-caller_logs.txt
	#docker logs ipc_stage_test_callee > $NAME-callee_logs.txt
	docker logs ipc_stage_test_caller > $1-cross-network_caller_logs.txt
	docker logs ipc_stage_test_callee > $1-cross-network_callee_logs.txt

	##Clean
	docker stop $(docker ps -aq)
}

##Clean
docker stop $(docker ps -aq)

# 1. front-end -> interact
run_test front-interact

# 2. interact-smarthome
run_test interact-smarthome

# 3. smarthome-door
run_test smarthome-door

# 4. smarthome-light
run_test smarthome-light

##Clean
docker stop $(docker ps -aq)
