'use strict';

const https = require("https"),
  querystring = require("querystring");

class HttpError extends Error {
  constructor(response) {
    super(`Download failed: HTTP ${response.statusCode}.`);
    this.errorType = "HttpError";
    this.httpResponseHeaders = response.headers;
  }
}

async function post(url, data) {
  return new Promise((resolve, reject) => {
    let postData = querystring.stringify(data);
    let postDataLength = Buffer.byteLength(postData);

    console.log(`Downloading URL ${url} with payload ${postDataLength} bytes...`);

    let request = https.request(
      url,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": postDataLength
        },
        method: "POST"
      },
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

            let json = JSON.parse(body);
            resolve(json);
          }
        );
      }
    ).on(
      "error",
      reject
    );

    request.write(postData);
    request.end();
  });
}

module.exports.post = post;
