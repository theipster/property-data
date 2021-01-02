'use strict';

const SQS = require("aws-sdk/clients/sqs");

const sqs = new SQS({
  params: {
    QueueUrl: process.env.TASKS
  }
});

module.exports.enqueue = async id => {
  const MessageBody = JSON.stringify({id});
  return sqs.sendMessage({MessageBody}).promise();
};
