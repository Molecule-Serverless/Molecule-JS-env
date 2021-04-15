#!/bin/bash

function run_test(){
	#NAME=interact-smarthome
	#./docker_run-IPC-client.sh tests/ipc/stages/$NAME/
	./docker_run-IPC-client.sh tests/ipc/stages/$1/ $1-caller
	sleep 1
	#./docker_run-IPC-server.sh tests/ipc/stages/$NAME/
	./docker_run-IPC-server.sh tests/ipc/stages/$1/ $1-callee 12302
	sleep 1

	./test_ipc.sh

	sleep 2

	#docker logs ipc_stage_test_caller > $NAME-caller_logs.txt
	#docker logs ipc_stage_test_callee > $NAME-callee_logs.txt
	docker logs $1-caller | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > $1-caller_logs.txt
	docker logs $1-callee | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > $1-callee_logs.txt

	##Clean
	#docker stop $(docker ps -aq)
	docker stop ipc_stage_test_caller
	docker stop ipc_stage_test_callee
}

##Clean
#docker stop $(docker ps -aq)
	docker stop ipc_stage_test_caller
	docker stop ipc_stage_test_callee

# 1. front-end -> interact
run_test front-interact

# 2. interact-smarthome
# run_test interact-smarthome

# # # 3. smarthome-door
# run_test smarthome-door

# # # 4. smarthome-light
# run_test smarthome-light

##Clean
#docker stop $(docker ps -aq)
