#!/bin/bash
#array=($(ps -ef|grep tlda |awk '{print $2}'))
# The first arg gives the name of test-case
NAME=$1

caller_data=($(cat $NAME-caller_logs.txt| grep "callee " | awk '{ print $5 }'))
callee_data=($(cat $NAME-callee_logs.txt| grep "calleee " | awk '{ print $3 }'))

for i in "${!caller_data[@]}";
do
	caller_data_now=${caller_data[$i]}
	callee_data_now=${callee_data[$i]}
	#printf "%s\t- %s\n" "$caller_data_now" "$callee_data_now"
	#time_elapsed=$[ caller_data_now - callee_data_now ];
	#time_elapsed=$(expr $caller_data_now - $callee_data_now)
	time_elapsed=$(python3 ./float_op.py $caller_data_now $callee_data_now)
	printf "#%s invocation: %s us\n" "$i" "$time_elapsed"
done




	#echo ${callee_data[@]}
