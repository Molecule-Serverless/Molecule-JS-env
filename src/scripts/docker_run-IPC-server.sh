#!/bin/bash

## Note: Please ensure the path of molecule-benchmarks and molecule-js-env are correct
## The path assumptions:
##		current path: molecule-js-env/src
##		molecule-js-env and molecule-benchmarks located in a same dir


### To run in a bash shell, uncomment the following command
docker run --rm -it -p 12302:40041 -v $(pwd)/../../molecule-benchmarks/:/home -v $(pwd)/../../molecule-js-env/src/:/env -w /env --entrypoint=/env/scripts/local_server.sh ddnirvana/molecule-js-env:v3-node14.16.0

### To run in a bash shell, uncomment the following command
#docker run --rm -it -p 12301:40041 -v $(pwd)/../../molecule-benchmarks/:/home -v $(pwd)/../../molecule-js-env/src/:/env --entrypoint=/bin/bash ddnirvana/molecule-js-env:v3-node14.16.0

