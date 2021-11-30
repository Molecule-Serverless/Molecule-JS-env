#!/bin/bash


docker stop $(docker ps -aq)

./docker_run-IPC-client.sh tests/ipc/stages/front-interact front_interact_caller

./docker_run-IPC-server.sh tests/ipc/stages/front-interact front_interact_callee 12305

./docker_run-IPC-server.sh tests/ipc/stages/interact-smarthome  interact_smarthome 12302

./docker_run-IPC-server.sh tests/ipc/stages/smarthome-door  smarthome_door 12303

./docker_run-IPC-server.sh tests/ipc/stages/door-light   door_light 12304

./test_ipc.sh

docker logs front_interact_caller | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > front-interact_caller_logs.txt

docker logs front_interact_callee | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > front-interact__callee_logs.txt

docker logs interact-smarthome | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > interact-smarthome_logs.txt

docker logs smarthome-door | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > smarthome-door_logs.txt

docker logs door-light | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > door-light_logs.txt

docker stop $(docker ps -aq)