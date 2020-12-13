'use strict';

const { DocumentClient } = require("aws-sdk/clients/dynamodb");

const dynamodb = new DocumentClient({
  params: {
    TableName: process.env.TABLE
  }
});

const TTL = parseInt(process.env.TTL, 10);

function randomise(x) {
  const factor = 0.75 + Math.random() / 2;
  return Math.round(x * factor);
}

module.exports.schedule = async (id) => {
  const now = Math.floor(new Date().getTime() / 1000);

  return dynamodb.put({
    ConditionExpression: "attribute_not_exists(id)",
    Item: {
      id,
      creation: now,
      expiry: now + randomise(TTL)
    }
  }).promise();
};
