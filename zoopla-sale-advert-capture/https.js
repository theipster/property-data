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

module.exports.get = get;
