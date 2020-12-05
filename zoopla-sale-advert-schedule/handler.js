'use strict';

const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB(),
  eventBridge = new AWS.EventBridge();
const env = process.env;

function hasRecordExpiredNaturally(record) {
  return "userIdentity" in record
    && record.userIdentity.type == "Service"
    && record.userIdentity.principalId == "dynamodb.amazonaws.com";
}

function requestSnapshot(id, eventBus, eventSource, eventType) {
  return eventBridge.putEvents({
    Entries: [
      {
        Detail: JSON.stringify({id}),
        DetailType: eventType,
        EventBusName: eventBus,
        Source: eventSource
      }
    ]
  }).promise();
}

function scheduleRepeat(id, now, ttl, table) {
  return dynamodb.putItem({
    Item: {
      id: {
        S: id
      },
      creation: {
        N: now.toString()
      },
      expiry: {
        N: (now + ttl).toString()
      }
    },
    TableName: table
  }).promise();
}

module.exports.newHandler = async event => {
  let id = event.detail.id;
  let now = Math.floor(new Date().getTime() / 1000);
  let ttl = parseInt(env.TTL);
  console.log(`Handling new snapshot for ${id}`);

  return await Promise.all([
    requestSnapshot(id, env.EVENT_BUS, env.EVENT_SOURCE, env.EVENT_TYPE),
    scheduleRepeat(id, now, ttl, env.SCHEDULE)
  ]);
};

module.exports.repeatHandler = async event => {
  let now = Math.floor(new Date().getTime() / 1000);
  let ttl = parseInt(env.TTL);

  return await Promise.all(
    event.Records
      .filter(hasRecordExpiredNaturally)
      .map(
        record => {
          let id = record.dynamodb.Keys.id.S;
          console.log(`Handling repeat snapshot for ${id}`);

          return Promise.all([
            requestSnapshot(id, env.EVENT_BUS, env.EVENT_SOURCE, env.EVENT_TYPE),
            scheduleRepeat(id, now, ttl, env.SCHEDULE)
          ]);
        }
      )
  );
};
