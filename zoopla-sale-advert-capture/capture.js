'use strict';

const AWS = require("aws-sdk"),
  { createHash } = require("crypto"),
  { gzip } = require("zlib"),
  { promisify } = require("util"),
  { ExpiredError, get } = require("https.js");

const dynamodb = new AWS.DynamoDB({
  params: {
    TableName: process.env.INDEX_TABLE
  }
});
const env = process.env;
const eventBridge = new AWS.EventBridge();
const promisifiedGzip = promisify(gzip);

async function capture(id, now) {
  let body = await get(`https://www.zoopla.co.uk/for-sale/details/${id}/`);
  validate(body);
  let normalized = normalize(body);
  return putIndexItem(id, normalized, now);
}

async function expire(id, env) {
  console.log(`Marking Zoopla advert ${id} as expired.`);
  return eventBridge.putEvents({
    Entries: [{
      Detail: JSON.stringify({ id }),
      DetailType: "ZOOPLA_SALE_ADVERT_EXPIRED",
      EventBusName: env.EVENT_BUS,
      Source: env.EVENT_SOURCE,
    }],
  }).promise();
}

function normalize(body) {
  return body
    .replace(/<style data-emotion="css .*<\/style>/gs, "")
    .replace(/"optimizelyUserInfo":{"id":"[0-f-]{36}",/, '"optimizelyUserInfo":{"id":"<id>",');
}

async function putIndexItem(id, body, now) {
  let compressed = await promisifiedGzip(body)
    .then(
      compressed => {
        console.log(`Downloaded compressed to ${Buffer.byteLength(compressed)} bytes.`);
        return compressed;
      }
    );

  let md5 = createHash("md5")
    .update(compressed)
    .digest("base64");

  return dynamodb.putItem({
    Item: {
      id: {
        S: id
      },
      time: {
        N: now.toString()
      },
      contentGzip: {
        B: compressed
      },
      contentMd5: {
        S: md5
      }
    }
  }).promise();
}

function validate(body) {
  if (!body.includes('<script id="__NEXT_DATA__" type="application/json">')) {
    throw new Error("Downloaded content failed basic validation.");
  }

  console.log("Downloaded content passed basic validation.");
}

module.exports.handler = async event => {
  let id = event.detail.id;
  let now = Math.floor(new Date().getTime() / 1000);

  return capture(id, now)
    .catch(error => {
      if (error instanceof ExpiredError) {
        return expire(id, env);
      } else {
        throw error;
      }
    });
};
