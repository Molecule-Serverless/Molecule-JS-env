docker run --rm -it -p 12302:40041 -v /home/dd/devlop/serverless/molecule-faas/molecule-benchmarks/:/home -v /home/dd/devlop/serverless/molecule-faas/molecule-js-env/src/:/env --entrypoint=/bin/bash ddnirvana/molecule-js-env:v3-node14.16.0