'use strict';

const AWS = require("aws-sdk");

const env = process.env;

const dynamodb = new AWS.DynamoDB(),
  s3 = new AWS.S3();

const MATCHERS = {
  ID: /^details\/([0-9]+)\.html$/,
  STRUCTURED_JSON: /<script type="application\/ld\+json">(.*?)<\/script>/s,
  UNSTRUCTURED_JSON: /ZPG.trackData.taxonomy = ({.*?});/s,
  UNSTRUCTURED_JSON_TIDY: / +([a-z_]+):/g
};

function extract(bucketName, objectKey, objectVersionId, matchers) {
  console.log(`Extracting ${objectKey} @ ${objectVersionId}`);
  return getRawSnapshot(bucketName, objectKey, objectVersionId)
    .then(data => {
      return saveSnapshotItem(
        parseSnapshotItem(
          objectKey,
          objectVersionId,
          data.Body.toString(),
          data.LastModified,
          matchers
        )
      );
    });
}

function getRawSnapshot(bucketName, objectKey, objectVersionId) {
  return s3.getObject({
    Bucket: bucketName,
    Key: objectKey,
    VersionId: objectVersionId
  }).promise();
}

function parseSnapshotItem(objectKey, objectVersionId, content, lastModified, matchers) {
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
    console.warn("Could not parse structured JSON: %s @ %s", objectKey, objectVersionId);
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
    console.warn("Could not parse unstructured JSON: %s @ %s", objectKey, objectVersionId);
  }

  // Tag essential info
  item.id = { S: matchers.ID.exec(objectKey)[1] };
  item.creationTime = { N: Math.floor(lastModified.getTime() / 1000).toString() };

  return sanitiseItem(item);
}

function sanitiseItem(item) {

  // Strip blank values
  Object.keys(item)
    .filter(it => "S" in item[it])
    .forEach(key => {
      if (item[key].S == "") {
        console.warn("Removing empty value for %s: %s", key, item[key]);
        delete item[key];
      }
    });

  // Sort by keys
  return Object.fromEntries(Object.entries(item).sort());
}

function saveSnapshotItem(item) {
  return dynamodb.putItem({
    Item: item,
    TableName: env.TABLE
  }).promise();
}

module.exports.handler = async event => {
  return await Promise.all(
    event.Records.map(
      record => extract(
        record.s3.bucket.name,
        record.s3.object.key,
        record.s3.object.versionId,
        MATCHERS
      )
    )
  );
};
