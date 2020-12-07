'use strict';

const AWS = require("aws-sdk"),
  crypto = require("crypto"),
  https = require("https");

const env = process.env;
const s3 = new AWS.S3();

class HttpError extends Error {
  constructor(response) {
    super(`Download failed: HTTP ${response.statusCode}.`);
    this.errorType = "HttpError";
    this.httpResponseHeaders = response.headers;
  }
}

async function httpsGet(url) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading URL ${url}`);

    https.get(
      url,
      response => {
        if (response.statusCode != 200) {
          response.resume();
          throw new HttpError(response);
        }

        let body = "";
        response.on(
          "data",
          data => {
            body += data;
          }
        );

        response.on(
          "end",
          () => {
            console.log(`Downloaded ${Buffer.byteLength(body)} bytes.`);
            resolve(body);
          }
        );
      }
    ).on(
      "error",
      reject
    ).end();
  });
}

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

  let body = await httpsGet(`https://www.zoopla.co.uk/for-sale/details/${id}`);
  return putS3(id, body, env.BUCKET);
};
