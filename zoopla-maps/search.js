'use strict';

const EventBridge = require("aws-sdk/clients/eventbridge"),
  { batchPutEvents } = require("lib/eventBridge.js"),
  { post } = require("lib/https.js"),
  { unique } = require("lib/utils.js");

const eventBridge = new EventBridge();

const { EVENT_BUS, EVENT_SOURCE } = process.env;

function extractAdvertIds(results) {
  if (!("listings" in results)
    || !Array.isArray(results.listings)
    || !results.listings.every(item => "listing_id" in item)
  ) {
    throw new Error("Map search results corrupt.");
  }

  console.log(`Map search results passed basic validation: found ${results.listings.length} listings.`);
  return results.listings.map(item => item.listing_id);
}

function messageToPolyline(record) {
  const body = JSON.parse(record.body);
  return body.id;
}

function searchForAdverts(section) {
  return async polyline => {
    const postParams = {
      polyenc: [ polyline ],
      q: "",
      section
    };
    return post("https://www.zoopla.co.uk/ajax/maps/listings", postParams)
      .then(extractAdvertIds);
  };
}

function toEventBridge(DetailType) {
  return id => {
    return {
      Detail: JSON.stringify({id}),
      DetailType,
      EventBusName: EVENT_BUS,
      Source: EVENT_SOURCE
    };
  };
}

module.exports.handler = async event => {
  const polylines = event.Records.map(messageToPolyline);

  const saleAdvertIds = await Promise.all(polylines.map(searchForAdverts("for-sale")));
  const saleAdvertEvents = unique(saleAdvertIds.flat()).map(toEventBridge("ZOOPLA_SALE_ADVERT_IDENTIFIED"));

  return Promise.all([
    ...batchPutEvents(eventBridge, saleAdvertEvents)
  ]);
};
