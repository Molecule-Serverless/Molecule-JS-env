#!/bin/bash

function run_test(){
	#NAME=interact-smarthome
	#./docker_run-IPC-client.sh tests/ipc/stages/$NAME/
	echo start client
	./docker_run-IPC-client.sh tests/ipc/stages/$1/
	# ./docker_run-IPC-server.sh tests/ipc/stages/$1/
	# sleep 1

	# echo start server
	# #./docker_run-IPC-server.sh tests/ipc/stages/$NAME/
	
	# sleep 1

	# echo start test_ipc.sh
	# ./test_ipc.sh

	# sleep 2

	#docker logs ipc_stage_test_caller > $NAME-caller_logs.txt
	# #docker logs ipc_stage_test_callee > $NAME-callee_logs.txt
	docker logs ipc_stage_test_caller > $1-caller_logs.txt
	# docker logs ipc_stage_test_callee > $1-callee_logs.txt

	##Clean
	docker stop $(docker ps -aq)
}

##Clean
# docker stop $(docker ps -aq)

# 1. front-end -> interact
	if [[ $1 == "front-interact" ]];then
		run_test front-interact
	fi

	if [[ $1 == "interact-smarthome" ]];then
		run_test interact-smarthome
	fi

	if [[ $1 == "smarthome-door" ]];then
		run_test smarthome-door
	fi

	if [[ $1 == "smarthome-light" ]];then
		run_test smarthome-light
	fi

# # 2. interact-smarthome
# run_test interact-smarthome

# # 3. smarthome-door
# run_test smarthome-door

# # 4. smarthome-light
# run_test smarthome-light

# ##Clean
# docker stop $(docker ps -aq)
