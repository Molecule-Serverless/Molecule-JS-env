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
	docker stop $(docker ps -aq)
}

function run_all(){
	##Clean
	docker stop $(docker ps -aq)

	# 1. front-end -> interact
	run_test front-interact

	# 2. interact-smarthome
	run_test interact-smarthome

	# # # 3. smarthome-door
	run_test smarthome-door

	# # # 4. smarthome-light
	run_test smarthome-light

	##Clean
	docker stop $(docker ps -aq)
}

function print_usage(){
	echo "run_alexa_stage_test.sh [args]"
	echo "args:"
	echo "-a: run all test cases in one command"
	echo "-c: run specific test case, e.g., -c front-interact"
	echo "-h: Print the help info"
	echo "-r: run a test case's caller, e.g., -r front-interact"
	echo "-e: run a test case's callee, e.g., -e front-interact"
}

while getopts ":habc:" opt; do
	case $opt in
		a)
			echo "Run all test cases"
			run_all
			exit
			;;
		h)
			print_usage
			exit
			;;


	esac
done

