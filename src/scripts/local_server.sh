#!/bin/bash

## This script is supposed to run inside containers
## It is for IPC demo case, client side
## 					by Dong Du


## The current path should be /env in the container
source ./env_prepare.sh
#source ./env_interact.sh
source ./$1/env_callee.sh
node ./index_ipc_base.js
#node ./index_heteroIPC.js
