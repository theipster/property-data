#!/bin/sh

now=`date +%Y%m%d-%H%M%S`

find . -type f -name "serverless.yml" -exec dirname {} \; \
    | xargs -I {} -P 0 bash --login -O expand_aliases -c "cd {}; mkdir -p logs; echo \"Deploying \$(basename {})...\"; serverless info $@ > logs/deploy-$now.log" \
    && echo "Deployed. 🚀"
