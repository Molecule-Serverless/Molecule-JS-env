#!/bin/bash
mkdir -p results/logs
mkdir -p results/data

export CODE_PATH=/home/src/frontend/index.js
TEST_NAME=frontend

for (( i=0; i<10; i++))
do
	node index_single.js >> results/logs/alexa-$TEST_NAME.txt
done
cat results/logs/alexa-$TEST_NAME.txt | grep "exe costs" >> results/data/alexa-$TEST_NAME.txt


export CODE_PATH=/home/src/interact/index.js
TEST_NAME=interact

for (( i=0; i<10; i++))
do
	node index_single.js >> results/logs/alexa-$TEST_NAME.txt
done
cat results/logs/alexa-$TEST_NAME.txt | grep "exe costs" >> results/data/alexa-$TEST_NAME.txt




export CODE_PATH=/home/src/door/index.js
TEST_NAME=door

for (( i=0; i<10; i++))
do
	node index_single.js >> results/logs/alexa-$TEST_NAME.txt
done
cat results/logs/alexa-$TEST_NAME.txt | grep "exe costs" >> results/data/alexa-$TEST_NAME.txt


export CODE_PATH=/home/src/light/index.js
TEST_NAME=light

for (( i=0; i<10; i++))
do
	node index_single.js >> results/logs/alexa-$TEST_NAME.txt
done
cat results/logs/alexa-$TEST_NAME.txt | grep "exe costs" >> results/data/alexa-$TEST_NAME.txt


export CODE_PATH=/home/src/smarthome/index.js
TEST_NAME=smarthome

for (( i=0; i<10; i++))
do
	node index_single.js >> results/logs/alexa-$TEST_NAME.txt
done
cat results/logs/alexa-$TEST_NAME.txt | grep "exe costs" >> results/data/alexa-$TEST_NAME.txt


