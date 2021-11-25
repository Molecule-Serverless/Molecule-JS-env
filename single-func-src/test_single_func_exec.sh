#!/bin/bash
mkdir -p /home/single-func/results/logs
mkdir -p /home/single-func/results/data

export CODE_PATH=/home/src/frontend/index.js
TEST_NAME=frontend

for (( i=0; i<10; i++))
do
	node index_single.js >> /home/single-func/results/logs/alexa-$TEST_NAME.txt
done
cat /home/single-func/results/logs/alexa-$TEST_NAME.txt | grep "exe costs" >> /home/single-func/results/data/alexa-$TEST_NAME.txt


export CODE_PATH=/home/src/interact/index.js
TEST_NAME=interact

for (( i=0; i<10; i++))
do
	node index_single.js >> /home/single-func/results/logs/alexa-$TEST_NAME.txt
done
cat /home/single-func/results/logs/alexa-$TEST_NAME.txt | grep "exe costs" >> /home/single-func/results/data/alexa-$TEST_NAME.txt




export CODE_PATH=/home/src/door/index.js
TEST_NAME=door

for (( i=0; i<10; i++))
do
	node index_single.js >> /home/single-func/results/logs/alexa-$TEST_NAME.txt
done
cat /home/single-func/results/logs/alexa-$TEST_NAME.txt | grep "exe costs" >> /home/single-func/results/data/alexa-$TEST_NAME.txt


export CODE_PATH=/home/src/light/index.js
TEST_NAME=light

for (( i=0; i<10; i++))
do
	node index_single.js >> /home/single-func/results/logs/alexa-$TEST_NAME.txt
done
cat /home/single-func/results/logs/alexa-$TEST_NAME.txt | grep "exe costs" >> /home/single-func/results/data/alexa-$TEST_NAME.txt


export CODE_PATH=/home/src/smarthome/index.js
TEST_NAME=smarthome

for (( i=0; i<10; i++))
do
	node index_single.js >> /home/single-func/results/logs/alexa-$TEST_NAME.txt
done
cat /home/single-func/results/logs/alexa-$TEST_NAME.txt | grep "exe costs" >> /home/single-func/results/data/alexa-$TEST_NAME.txt

echo "All the tests finished and passed"
cat /home/single-func/results/data/alexa-frontend.txt
echo "Check the single-func/results/data/ for the other execution latency for each function"
echo "You can also refer single-func/results/logs/ for the logs of the tests"
