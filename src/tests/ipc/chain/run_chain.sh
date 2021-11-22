#!/bin/bash

echo "[Chained Function Test] Alexa"

docker stop alexa-front alexa-interact alexa-smarthome alexa-door alexa-light > /dev/null 2>&1

./docker_run-IPC-client.sh tests/ipc/chain/front-interact alexa-front

./docker_run-IPC-server.sh tests/ipc/chain/front-interact alexa-interact 12302

./docker_run-IPC-server.sh tests/ipc/chain/interact-smarthome  alexa-smarthome 12303

./docker_run-IPC-server.sh tests/ipc/chain/smarthome-door  alexa-door 12304

./docker_run-IPC-server.sh tests/ipc/chain/door-light   alexa-light 12305

echo "[Test] Alexa function started, test starting (taking minutes)"

./test_ipc.sh > /dev/null 2>&1

docker logs alexa-front | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > alexa-front_logs.txt

docker logs alexa-interact | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > alexa-interact_logs.txt

docker logs alexa-smarthome | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > alexa-smarthome_logs.txt

docker logs alexa-door | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > alexa-door_logs.txt

docker logs alexa-light | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" > alexa-light_logs.txt

#docker stop $(docker ps -aq)
docker stop alexa-front alexa-interact alexa-smarthome alexa-door alexa-light > /dev/null 2>&1

caller_data=($(cat alexa-front_logs.txt| grep "callee " | awk '{ print $5 }'))
for i in "${!caller_data[@]}";
do
	if [ $i -gt 0 ]; then
		caller_data_now=${caller_data[$i]}
		printf "#%s invocation: %s us\n" "$i" "$caller_data_now"
	fi
done
