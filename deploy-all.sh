#!/bin/sh

now=`date +%Y%m%d-%H%M%S`
basedir=`dirname "$0"`

# Ensure log dir exists
logdir="$basedir/logs/deployment-$now"
mkdir -p $logdir
logdir=`realpath "$logdir"`

# Run serverless deploy
find "$basedir" -type f -name "serverless.yml" -exec dirname {} \; \
    | xargs -I {} -P 0 bash --login -O expand_aliases -c "cd {}; service=\$(basename {}); echo \"Deploying \$service...\"; serverless -r $AWS_REGION deploy $@ > \"$logdir/\$service.log\"" \
    && echo "Deployed. 🚀" \
    || echo "Deployment failed. Logs: $logdir"

# Dump logs for CI
if [ -n "$CI" ] && "$CI" == "true"; then
  tail -n +1 $logdir/*
fi
