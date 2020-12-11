'use strict';

const AWS = require("aws-sdk"),
  crypto = require("crypto"),
  { get } = require("https.js");

const env = process.env;
const s3 = new AWS.S3();

async function putS3(id, body, bucket) {
  let contentMd5 = crypto.createHash("md5")
    .update(body)
    .digest("base64");

  return s3.putObject({
    Body: body,
    Bucket: bucket,
    ContentMD5: contentMd5,
    ContentType: "text/html",
    Key: `details/${id}.html`
  }).promise();
}

module.exports.handler = async event => {
  let id = event.detail.id;

  let body = await get(`https://www.zoopla.co.uk/for-sale/details/${id}`);
  return putS3(id, body, env.BUCKET);
};
