'use strict';

const AWS = require("aws-sdk");
const eventBridge = new AWS.EventBridge();
const env = process.env;

function generateEvent(polyline, env) {
  return {
    Detail: JSON.stringify({polyline}),
    DetailType: "GEOGRAPHICAL_AREA_IDENTIFIED",
    EventBusName: env.EVENT_BUS,
    Source: env.EVENT_SOURCE
  };
}

module.exports.handler = async event => {
  let Entries = event.Records.map(
    record => generateEvent(
      record.dynamodb.Keys.polyline.S,
      env
    )
  );
  return eventBridge.putEvents({Entries}).promise();
};
