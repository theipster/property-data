'use strict';

const AWS = require("aws-sdk");

const env = process.env;

const dynamodb = new AWS.DynamoDB(),
  s3 = new AWS.S3();

const MATCHERS = {
  ID: /^details\/([0-9]+)\.html$/
};

function extract(bucketName, objectKey, objectVersionId, matchers) {
  console.log(`Extracting ${objectKey} @ ${objectVersionId}.`);
  return getRawSnapshot(bucketName, objectKey, objectVersionId)
    .then(data => {
      return saveSnapshotItem(
        parseSnapshotItem(
          objectKey,
          data.Body,
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

function parseSnapshotItem(objectKey, content, lastModified, matchers) {
  let item = {};
  item.id = { S: matchers.ID.exec(objectKey)[1] };
  item.version = { N: lastModified.getTime().toString() };  // Note: milliseconds
  item.hash = { S: `${item.id.S}-${item.version.N}` };
  // @todo Some other attributes
  return item;
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
