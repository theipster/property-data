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

async function requestSnapshot(id, env) {
  return eventBridge.putEvents({
    Entries: [
      {
        Detail: JSON.stringify({id}),
        DetailType: env.EVENT_TYPE,
        EventBusName: env.EVENT_BUS,
        Source: env.EVENT_SOURCE
      }
    ]
  }).promise();
}

async function scheduleRepeat(id, now, env) {
  let ttl = parseInt(env.TTL);
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
    TableName: env.SCHEDULE
  }).promise();
}

module.exports.newHandler = async event => {
  let id = event.detail.id;
  let now = Math.floor(new Date().getTime() / 1000);
  console.log(`Scheduling new snapshot for ${id}`);

  return Promise.all([
    requestSnapshot(id, env),
    scheduleRepeat(id, now, env)
  ]);
};

module.exports.repeatHandler = async event => {
  let now = Math.floor(new Date().getTime() / 1000);

  return Promise.all(
    event.Records
      .filter(hasRecordExpiredNaturally)
      .map(
        record => {
          let id = record.dynamodb.Keys.id.S;
          console.log(`Scheduling repeat snapshot for ${id}`);

          return Promise.all([
            requestSnapshot(id, env),
            scheduleRepeat(id, now, env)
          ]);
        }
      )
  );
};
