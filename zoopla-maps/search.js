'use strict';

const EventBridge = require("aws-sdk/clients/eventbridge"),
  { batchPutEvents } = require("lib/eventBridge.js"),
  { get } = require("lib/https.js"),
  { unique } = require("lib/utils.js");

const eventBridge = new EventBridge();

const PAGE_SIZE = 25;
const { EVENT_BUS, EVENT_SOURCE } = process.env;

function messageToPolyline(record) {
  const body = JSON.parse(record.body);
  return body.id;
}

function parseAdvertIds(json) {
  const ids = json.props.pageProps.initialProps.searchResults.listings.regular.map(item => item.listingId);
  console.log(`Parsed ${ids.length} adverts.`);
  return ids;
}

function parseAdvertListingsData(html) {
  const data = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*)<\/script>/);
  if (data == null) {
    throw new Error("Map search results corrupt (no data).");
  }
  const json = JSON.parse(data[1]);
  if (json == null) {
    throw new Error("Map search results corrupt (invalid JSON).");
  }
  return json;
}

function parseNumPages(json) {
  const numResults = json.props.pageProps.initialProps.searchResults.pagination.totalResults;
  return Math.ceil(numResults / PAGE_SIZE);
}

function searchForAdverts(section) {
  return async polyenc => {
    const url = `https://www.zoopla.co.uk/${section}/property/uk/`;
    const params = {
      page_size: PAGE_SIZE,
      polyenc,
    };
    return get(url, params)
      .then(html => {
        const json = parseAdvertListingsData(html);
        const numPages = parseNumPages(json);
        console.log(`Expecting total of ${numPages} pages.`);
        return Promise.all([

          // Current page (no need to re-fetch page)
          Promise.resolve(parseAdvertIds(json)),

          // Any other pages
          ...Array.from({ length: numPages - 1 }, (_, i) => i + 2)
            .map(pageIdx => {
              return get(url, { ...params, pn: pageIdx })
                .then(html => {
                  const json = parseAdvertListingsData(html);
                  return Promise.resolve(parseAdvertIds(json));
                }).catch(error => {
                  console.error(`Failed to fetch page ${pageIdx}: ${error}.`);
                  throw error;
                });
            }),
        ]);
      });
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
