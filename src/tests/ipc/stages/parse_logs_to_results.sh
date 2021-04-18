#!/bin/bash

# The dir of original logs
LOG_DIR=$1
# The result file name
DUMP_FILE=$2

function parse_logs(){
	echo "Test-case: $1"
	echo "Callee results:"
	#cat $LOG_DIR/$1-callee_logs.txt |  sed "s,\x1B\[[0-9;]*[a-zA-Z],,g" |  grep "exe (handler)" | awk '{print $5}'
	cat $LOG_DIR/$1-callee_logs.txt |  sed "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g"| sed "s,\x1B\[[0-9;]*[a-zA-Z],,g" |  grep "exe (handler)" | awk '{print $5}'
	echo "Caller results:"
	#cat $LOG_DIR/$1-caller_logs.txt | sed "s,\x1B\[[0-9;]*[a-zA-Z],,g" | grep "callee comm" | awk '{print $9}'
	cat $LOG_DIR/$1-caller_logs.txt | sed "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g"| sed "s,\x1B\[[0-9;]*[a-zA-Z],,g" | grep "callee comm" | awk '{print $9}'
	echo ""
}

echo "Parse begin, LOG_DIR: $LOG_DIR, result: $DUMP_FILE"

rm $DUMP_FILE -rf

parse_logs front-interact >> $DUMP_FILE 2>&1
parse_logs interact-smarthome >> $DUMP_FILE 2>&1
parse_logs smarthome-door >> $DUMP_FILE 2>&1
parse_logs smarthome-light >> $DUMP_FILE 2>&1

echo "Parse finished, please check $DUMP_FILE"
