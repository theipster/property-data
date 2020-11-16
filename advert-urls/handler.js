'use strict';

const AWS = require("aws-sdk");
const eventBridge = new AWS.EventBridge();
const env = process.env;

function generateEvent(url, env) {
  let zooplaSaleMatches = /^https:\/\/www\.zoopla\.co\.uk\/for-sale\/details\/([0-9]+)/.exec(url);
  if (zooplaSaleMatches) {
    return {
      Detail: JSON.stringify({
        id: zooplaSaleMatches[1]
      }),
      DetailType: "ZOOPLA_SALE_ADVERT_IDENTIFIED",
      EventBusName: env.EVENT_BUS,
      Source: env.EVENT_SOURCE
    };
  }

  throw new Error("Could not recognise URL: " + url);
}

module.exports.decode = async event => {
  let url = event.Records[0].dynamodb.Keys.url.S;
  let generatedEvent = generateEvent(url, env);
  return eventBridge.putEvents({Entries: [generatedEvent]}).promise();
};
