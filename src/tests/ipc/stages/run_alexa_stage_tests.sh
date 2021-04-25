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


MOLECULE_ENV_HOME=$(pwd)/../../../../

# Accept 1 args: e.g., front-interact (i.e., the name of test case)
function run_test_r(){
	#NAME=interact-smarthome
	#./docker_run-IPC-client.sh tests/ipc/stages/$NAME/
	#./docker_run-IPC-client.sh tests/ipc/stages/$1/ $1-caller
	docker stop test_ipc_caller
	docker run --rm --name test_ipc_caller --ipc=host -d -it -p 12301:40041 -v /tmp/fifo_dir/:/tmp/fifo_dir -v $MOLECULE_ENV_HOME/../molecule-benchmarks/:/home -v $MOLECULE_ENV_HOME/src/:/env -w /env --entrypoint=/env/scripts/local_ipc_caller.sh ddnirvana/molecule-js-env:v3-node14.16.0 tests/ipc/stages/$1/
	sleep 1
}

# Accept 1 args: e.g., front-interact (i.e., the name of test case)
function run_test_e(){
	docker stop test_ipc_callee
	#./docker_run-IPC-server.sh tests/ipc/stages/$NAME/
	#./docker_run-IPC-server.sh tests/ipc/stages/$1/ $1-callee 12302
	docker run --rm --name test_ipc_callee --ipc=host -d -it -p 12302:40041 -v /tmp/fifo_dir/:/tmp/fifo_dir -v $MOLECULE_ENV_HOME/../molecule-benchmarks/:/home -v $MOLECULE_ENV_HOME/src/:/env -w /env --entrypoint=/env/scripts/local_ipc_callee.sh ddnirvana/molecule-js-env:v3-node14.16.0 tests/ipc/stages/$1
	sleep 1
}

# Accept 1 args: e.g., front-interact (i.e., the name of test case)
function run_test_R(){
	#NAME=interact-smarthome
	#./docker_run-IPC-client.sh tests/ipc/stages/$NAME/
	#./docker_run-IPC-client.sh tests/ipc/stages/$1/ $1-caller
	docker stop test_ipc_caller
	docker run --rm --name test_ipc_caller --ipc=host -it -p 12301:40041 -v /tmp/fifo_dir/:/tmp/fifo_dir -v $MOLECULE_ENV_HOME/../molecule-benchmarks/:/home -v $MOLECULE_ENV_HOME/src/:/env -w /env --entrypoint=/env/scripts/local_ipc_caller.sh ddnirvana/molecule-js-env:v3-node14.16.0 tests/ipc/stages/$1/
	sleep 1
}

# Accept 1 args: e.g., front-interact (i.e., the name of test case)
function run_test_E(){
	docker stop test_ipc_callee
	#./docker_run-IPC-server.sh tests/ipc/stages/$NAME/
	#./docker_run-IPC-server.sh tests/ipc/stages/$1/ $1-callee 12302
	docker run --rm --name test_ipc_callee --ipc=host -it -p 12302:40041 -v /tmp/fifo_dir/:/tmp/fifo_dir -v $MOLECULE_ENV_HOME/../molecule-benchmarks/:/home -v $MOLECULE_ENV_HOME/src/:/env -w /env --entrypoint=/env/scripts/local_ipc_callee.sh ddnirvana/molecule-js-env:v3-node14.16.0 tests/ipc/stages/$1
	sleep 1
}

# 1 args: the testcase name
function run_test_invoke(){
	./test_ipc.sh
	sleep 2
	#docker logs ipc_stage_test_caller > $NAME-caller_logs.txt
	#docker logs ipc_stage_test_callee > $NAME-callee_logs.txt
	docker logs test_ipc_caller | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > $1-caller_logs.txt
	docker logs test_ipc_callee | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > $1-callee_logs.txt

	##Clean
	docker stop test_ipc_caller
	docker stop test_ipc_callee
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
	echo "-R: run a test case's caller (show terminal/blocking), e.g., -r front-interact"
	echo "-E: run a test case's callee (show terminal/blocking), e.g., -e front-interact"
	echo "-i: invoke a test case (need prepared caller and calee), e.g., -e front-interact"
}

while getopts ":habc:R:E:r:e:i:" opt; do
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

		R)
			run_test_R $OPTARG
			exit
			;;
		E)
			run_test_E $OPTARG
			exit
			;;
		r)
			run_test_r $OPTARG
			exit
			;;
		e)
			run_test_e $OPTARG
			exit
			;;
		i)
			run_test_invoke $OPTARG
			exit
			;;
		:)
			echo "Option -$OPTARG requires an argument".
			exit
			;;
		?)
			echo "Invalid option: -$OPTARG index:$OPTIND"
			exit
			;;
	esac
done

# In case no args passed
print_usage

