'use strict';

const AWS = require("aws-sdk"),
  { gunzip } = require("zlib"),
  { promisify } = require("util");

const dynamodb = new AWS.DynamoDB({
  params: {
    TableName: process.env.DATA_LAKE_TABLE
  }
});

const promisifiedGunzip = promisify(gunzip);

const MATCHERS = {
  ID: /^details\/([0-9]+)\.html$/,
  STRUCTURED_JSON: /<script type="application\/ld\+json">(.*?)<\/script>/s,
  UNSTRUCTURED_JSON: /ZPG.trackData.taxonomy = ({.*?});/s,
  UNSTRUCTURED_JSON_TIDY: / +([a-z_]+):/g
};

async function extractToDataLake(record) {
  let { id, time, content, contentGzip } = record.dynamodb.NewImage;

  console.log(`Extracting ${id.S}, snapshot from ${time.N}`);

  // Decompress
  if (!contentGzip) {
    console.warn("LEGACY: still using uncompressed record.");
  } else {
    let decompressed = await promisifiedGunzip(Buffer.from(contentGzip.B, "base64"));
    content, contentGzip = null;     // Save memory during the swap
    content = { S: decompressed };
  }

  // Parse snapshot content
  let snapshotItem = sanitiseItem(
    parseSnapshot(
      content.S,
      MATCHERS
    )
  );

  // Output structured data to logs ;)
  console.log(`Extracted ${id.S}`, snapshotItem);

  // Persist to data lake
  return saveDataLakeItem({
    id,
    time,
    ...snapshotItem
  });
}

function parseSnapshot(content, matchers) {
  let item = {};

  // Parse structured JSON
  let jsonMatches, json;
  if ((jsonMatches = matchers.STRUCTURED_JSON.exec(content))
    && (json = JSON.parse(jsonMatches[1]))
    && ("@graph" in json)
  ) {
    let residence = json["@graph"].filter(it => it["@type"] == "Residence")[0];
    item.latitude = { N: residence.geo.latitude };
    item.longitude = { N: residence.geo.longitude };
  } else {
    console.warn("Could not parse structured JSON.");
  }

  // Parse less-structured JSON
  if ((jsonMatches = matchers.UNSTRUCTURED_JSON.exec(content))
    && (json = JSON.parse(jsonMatches[1].replace(matchers.UNSTRUCTURED_JSON_TIDY, ' "$1":')))
  ) {
    item.address = { S: json.display_address };
    item.askingPrice = { N: json.price.toString() };
    item.bathrooms = { N: json.num_baths.toString() };
    item.bedrooms = { N: json.num_beds.toString() };
    item.postcodeInward = { S: json.incode };
    item.postcodeOutward = { S: json.outcode };
    item.propertyType = { S: json.property_type };
    item.retirement = { BOOL: json.is_retirement_home };
    item.sharedOwnership = { BOOL: json.is_shared_ownership };
    item.status = { S: json.listing_status };
    item.tenure = { S: json.tenure };
  } else {
    console.warn("Could not parse unstructured JSON.");
  }

  return item;
}

function sanitiseItem(item) {

  // Strip blank values
  Object.keys(item)
    .filter(it =>
      "S" in item[it] && item[it].S == ""
        || "N" in item[it] && item[it].N == ""
    )
    .forEach(key => {
      console.warn("Removing empty value for %s: %s", key, item[key]);
      delete item[key];
    });

  // Sort by keys
  return Object.fromEntries(Object.entries(item).sort());
}

async function saveDataLakeItem(Item) {
  return dynamodb.putItem({Item}).promise();
}

function shouldExtractToDataLake(record) {
  return "NewImage" in record.dynamodb;
}

module.exports.handler = async event => {
  return Promise.all(
    event.Records
      .filter(shouldExtractToDataLake)
      .map(extractToDataLake)
  );
};
