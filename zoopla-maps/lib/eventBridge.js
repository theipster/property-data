'use strict';

const { chunk } = require("lib/utils.js");

// See https://amzn.to/2Ms5ZzD
const EVENTBRIDGE_MAX_BATCHSIZE = 10;

module.exports.batchPutEvents = (eventBridge, events) => {
  return chunk(events, EVENTBRIDGE_MAX_BATCHSIZE)
    .map(Entries => eventBridge.putEvents({Entries}).promise());
};
