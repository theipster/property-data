'use strict';

const { schedule } = require("lib/schedule.js");

module.exports.handler = async event => {
  const id = event.detail["polyline"];

  console.log(`Ingestor scheduling job ${id}...`);
  return schedule(id)
    .then(() => console.log(`Ingestor scheduled job ${id}.`))
    .catch(error => {
      if (error.code == "ConditionalCheckFailedException") {
        console.log(`Ingestor skipped - found existing job ${id}.`);
        return;
      }
      throw error;
    });
};
