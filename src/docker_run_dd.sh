docker run --rm -it -p 12302:40041 -v /home/dd/devlop/serverless/molecule-faas/molecule-benchmarks/:/home -v /home/dd/devlop/serverless/molecule-faas/env-javascript/src/:/env --entrypoint=/bin/bash registry.cn-shanghai.aliyuncs.com/jointfaas-serverless/env-javascript:v6.1