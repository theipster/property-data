'use strict';

const EventBridge = require("aws-sdk/clients/eventbridge"),
  { readFileSync } = require("fs"),
  { batchPutEvents } = require("lib/eventBridge.js"),
  { post } = require("lib/https.js"),
  { unique } = require("lib/utils.js");

const eventBridge = new EventBridge();

const { EVENT_BUS, EVENT_SOURCE } = process.env;

const GRAPHQL_TEMPLATE = readFileSync("graphql.json", "utf8");

function extractAdvertIds(results) {
  if (!("data" in results)
    || !("searchResults" in results.data)
    || !("listings" in results.data.searchResults)
  ) {
    throw new Error("Map search results (wrapper) corrupt.");
  }

  const listingsByType = results.data.searchResults.listings;
  const listings = [
    ...listingsByType.regular,
    ...listingsByType.featured,
    ...listingsByType.extended,
  ];
  if (!listings.every(item => "listingId" in item)) {
    throw new Error(`Map search results (listings) corrupt.`);
  }

  console.log(`Map search results passed basic validation: found ${listings.length} listings.`);
  return listings.map(item => item.listingId);
}

function messageToPolyline(record) {
  const body = JSON.parse(record.body);
  return body.id;
}

function searchForAdverts(section) {
  return async polyline => {
    console.log(`Processing polyline: ${polyline}.`);
    const graphql = GRAPHQL_TEMPLATE
      .replace(/&polyenc=/, `&polyenc=${polyline}`)
      .replace(/\/SECTION\/map/, `/${section}/map`);
    return post("https://api-graphql-lambda.prod.zoopla.co.uk/graphql", graphql)
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
