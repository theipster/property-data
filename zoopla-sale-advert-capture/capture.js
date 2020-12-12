'use strict';

const AWS = require("aws-sdk"),
  { get } = require("https.js");

const dynamodb = new AWS.DynamoDB({
  params: {
    TableName: process.env.INDEX_TABLE
  }
});

function normalize(body) {
  // Strip A/B test data.
  return body.replace(/ZPG\.(trackData\.ab|flags) = {.*?};/g, '');
}

async function putIndexItem(id, body, now) {
  return dynamodb.putItem({
    Item: {
      id: {
        S: id
      },
      time: {
        N: now.toString()
      },
      content: {
        S: body
      }
    }
  }).promise();
}

module.exports.handler = async event => {
  let id = event.detail.id;
  let now = Math.floor(new Date().getTime() / 1000);

  let body = await get(`https://www.zoopla.co.uk/for-sale/details/${id}`);
  let normalized = normalize(body);
  return putIndexItem(id, normalized, now);
};
