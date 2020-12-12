'use strict';

const AWS = require("aws-sdk"),
  { get } = require("https.js");

const dynamodb = new AWS.DynamoDB({
  params: {
    TableName: process.env.INDEX_TABLE
  }
});

const NORMALIZERS = [

  // A/B test
  /ZPG\.(trackData\.ab|flags) = {.*?};/g,

  // Page view count
  /[0-9]+ page views/,

  // Rental estimates
  /£[0-9,]+ pcm/,

  // Similar properties
  /<article class="ui-property-card">.*?<\/article>/gs
];

function normalize(body) {
  return NORMALIZERS.reduce(
    (normalized, regex) => normalized.replace(regex, ""),
    body
  );
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
