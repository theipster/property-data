'use strict';

const AWS = require("aws-sdk");
const eventBridge = new AWS.EventBridge();
const env = process.env;

function generateEvent(url, env) {
  let zooplaSaleMatches = /^https:\/\/www\.zoopla\.co\.uk\/for-sale\/details\/([0-9]+)/.exec(url)
    || /^https:\/\/www\.zoopla\.co\.uk\/new-homes\/details\/([0-9]+)/.exec(url);
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
  let Entries = event.Records.map(
    record => generateEvent(
      record.dynamodb.Keys.url.S,
      env
    )
  );
  return eventBridge.putEvents({Entries}).promise();
};
