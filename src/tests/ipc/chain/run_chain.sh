#!/bin/bash


docker stop front
docker stop interact
docker stop smarthome
docker stop door
docker stop light
docker rm front
docker rm interact
docker rm smarthome
docker rm door
docker rm light

./docker_run-IPC-client.sh tests/ipc/chain/front-interact front
sleep 1

./docker_run-IPC-server.sh tests/ipc/chain/front-interact interact 12302
sleep 1

./docker_run-IPC-server.sh tests/ipc/chain/interact-smarthome  smarthome 12303
sleep 1

./docker_run-IPC-server.sh tests/ipc/chain/smarthome-door  door 12304
sleep 1

./docker_run-IPC-server.sh tests/ipc/chain/door-light   light 12305
sleep 1

./test_ipc.sh

docker logs front | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > front_logs.txt

docker logs interact | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > interact_logs.txt

docker logs smarthome | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > smarthome_logs.txt

docker logs door | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > door_logs.txt

docker logs light | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > light_logs.txt

#docker stop $(docker ps -aq)
docker stop front
docker stop interact
docker stop smarthome
docker stop door
docker stop light
docker rm front
docker rm interact
docker rm smarthome
docker rm door
docker rm light
