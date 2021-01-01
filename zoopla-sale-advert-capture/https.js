'use strict';

const https = require("https");

class HttpError extends Error {
  constructor(response) {
    super(`Download failed: HTTP ${response.statusCode}.`);
    this.errorType = "HttpError";
    this.httpResponseHeaders = response.headers;
  }
}

async function get(url) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading URL ${url}`);

    https.get(
      url,
      response => {
        let { headers, statusCode } = response;

        // Follow whitelisted redirects
        if (statusCode == 301
          && headers.location.startsWith("https://www.zoopla.co.uk/new-homes/details/")
        ) {
          return resolve(get(headers.location));
        }

        if (statusCode != 200) {
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

module.exports.get = get;
