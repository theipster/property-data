'use strict';

const https = require("https");

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36 Edg/95.0.1020.40",
};

class HttpError extends Error {
  constructor(response) {
    super(`Download failed: HTTP ${response.statusCode}.`);
    this.name = "HttpError";
    this.httpResponseHeaders = response.headers;
  }
}

class ExpiredError extends HttpError {
  constructor(response) {
    super(response);
    this.name = "ExpiredError";
  }
}

async function get(url) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading URL ${url}`);

    https.get(
      url,
      {
        headers,
      },
      response => {
        let { headers, statusCode } = response;

        if (statusCode != 200) {
          response.resume();

          // Redirect? Only if whitelisted.
          if (statusCode == 301) {
            const redirectUrl = new URL(headers.location, url).href;

            // New homes
            if (redirectUrl.startsWith("https://www.zoopla.co.uk/new-homes/details/")) {
              return resolve(get(redirectUrl));
            }

            // Expired?
            if (redirectUrl.startsWith("https://www.zoopla.co.uk/") && redirectUrl.endsWith("/#expired")) {
              return reject(new ExpiredError(response));
            }
          }

          // Unknown failure
          return reject(new HttpError(response));
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

module.exports = { ExpiredError, get };
