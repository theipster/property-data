'use strict';

const AWS = require("aws-sdk");
const sns = new AWS.SNS();

const topicArns = {
  ZOOPLA_SALE: process.env.ZOOPLA_SALE_TOPIC_ARN
};

function generateNotification(url, topicArns) {
  let zooplaSaleMatches = /^https:\/\/www\.zoopla\.co\.uk\/for-sale\/details\/([0-9]+)/.exec(url);
  if (zooplaSaleMatches) {
    return {
      Message: "Detected Zoopla Sale advert",
      MessageAttributes: {
        id: {
          DataType: "String",
          StringValue: zooplaSaleMatches[1]
        }
      },
      TopicArn: topicArns.ZOOPLA_SALE
    };
  }

  throw new Error("Could not recognise URL: " + url);
}

module.exports.decode = async event => {
  let url = event.Records[0].dynamodb.Keys.url.S;
  let notification = generateNotification(url, topicArns);
  return sns.publish(notification).promise();
};
