#!/bin/bash

## This script is supposed to run inside containers
## It is for IPC demo case, client side
## 					by Dong Du


## The current path should be /env in the container
TEST_PATH=$1
source ./env_prepare.sh
source ./$TEST_PATH/env_caller.sh
node ./index_ipc_base.js
