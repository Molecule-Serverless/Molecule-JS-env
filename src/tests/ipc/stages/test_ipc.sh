#!/bin/bash

for (( i=0; i<20; i++))
do
	curl -v --location --request GET 'http://127.0.0.1:12301/invoke' --header 'Step-Name: frontend' --header 'App-Name: alexa_v2' 	--header 'Content-Type: application/json' 	--data '{ "utter" : "open smarthome to I love Taylor Swift"	}'
	sleep 0.1
done
# Note: To see logs, add -v after curl
