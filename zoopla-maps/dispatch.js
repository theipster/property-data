'use strict';

const { enqueue } = require("lib/enqueue.js"),
  { schedule } = require("lib/schedule.js");

async function dispatch(record) {
  switch (record.eventName) {
    case "INSERT":
      console.info("Dispatcher matched new job...");
      return enqueue(record.dynamodb.NewImage.id.S)
        .then(() => console.info("Dispatcher enqueued job."));

    case "REMOVE":
      if (isExpired(record)) {
        console.info("Dispatcher matched expired job...");
        return schedule(record.dynamodb.OldImage.id.S)
          .then(() => console.info("Dispatcher rescheduled job."));
      }

      console.info("Dispatcher matched deleted job.");
      return;

    default:
      console.warn("Dispatcher could not handle job event ", record);
      return;
  }
}

function isExpired(record) {
  return "userIdentity" in record
    && record.userIdentity.type == "Service"
    && record.userIdentity.principalId == "dynamodb.amazonaws.com";
}

module.exports.handler = async event => {
  return Promise.all(
    event.Records
      .map(dispatch)
      .filter(Boolean)
  );
};
