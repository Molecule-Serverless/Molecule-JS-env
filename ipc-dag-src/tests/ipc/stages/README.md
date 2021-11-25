## DAG Communication Stage tests

### Local Network

	./run_alexa_stage_tests.sh

This should always work and produce the results in current dirs.

Note:

1. if some errors happen on Centos, like iptables things on port redirection, try restart docker

	sudo systemctl restart docker

It should works.

2. If you find some grpc error

	./docker-run-IPC-docker.sh

And in the docker shell's /env dir, try to install dependeicies

	npm install --unsafe-perm=true




### Cross-device Network

Please ensure the INFO_HOST in env_cross_network_caller.sh in each alexa stage dir is the IP addr of the callee machine.

The run:

	./run_alexa_cross-PU_stage_tests.sh

Currently, to test Bluefield-Host settings,
we can use the following two scripts

	# Host is the caller, Bluefield is the callee
	./run_alexa_cross-PU_stage_tests.sh

and,

	# Bluefield is the caller, and Host is the callee
	./run_alexa_cross-PU_stage_tests_bluefield.sh


