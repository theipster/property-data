const AWS = require("aws-sdk"),
  { gzip } = require("zlib"),
  { promisify } = require("util"),
  crypto = require("crypto");

const s3 = new AWS.S3({
  params: {
    Bucket: process.env.ARCHIVE_BUCKET
  }
});

const promisifiedGzip = promisify(gzip);

async function archiveToS3(record) {
  let { id, contentGzip, contentMd5 } = record.dynamodb.NewImage;
  let content = Buffer.from(contentGzip.B, "base64");

  return s3.putObject({
    Body: content,
    ContentMD5: contentMd5.S,
    ContentType: "text/html",
    Key: `details/${id.S}.html.gz`
  })
    .on("success", response => {
      console.log(`Archived ${id.S}, ${Buffer.byteLength(content)} bytes.`);
    })
    .promise();
}

async function migrateRecordImage(image) {

  // No migration required?
  if ("contentMd5" in image) {
    return image;
  }

  console.warn("LEGACY: still using uncompressed record.");

  // Compress
  let compressed = await promisifiedGzip(image.content.S);
  delete image.content;
  image.contentGzip = { B: compressed.toString("base64") };

  // Calculate hash
  let md5 = crypto.createHash("md5")
    .update(compressed)
    .digest("base64");
  image.contentMd5 = { S: md5 };

  return image;
}

function shouldArchiveToS3(record) {
  if (!("NewImage" in record.dynamodb)) {
    console.warn(`Archiving skipped, no new content available for ${record.dynamodb.OldImage.id.S}`);
    return false;
  }

  let { id } = record.dynamodb.NewImage;
  if (!("OldImage" in record.dynamodb)) {
    console.log(`Archiving ${id.S}, old content not available.`);
    return true;
  }

  if (record.dynamodb.OldImage.contentMd5.S != record.dynamodb.NewImage.contentMd5.S) {
    console.log(`Archiving ${id.S}, new content is different.`);
    return true;
  }

  console.log(`Archiving ${id.S} skipped, duplicated content.`);
  return false;
}

module.exports.handler = async event => {
  let records = await Promise.all(
    event.Records.map(
      async record => {
        if ("OldImage" in record.dynamodb) {
          record.dynamodb.OldImage = await migrateRecordImage(record.dynamodb.OldImage);
        }
        if ("NewImage" in record.dynamodb) {
          record.dynamodb.NewImage = await migrateRecordImage(record.dynamodb.NewImage);
        }
        return record;
      }
    )
  );

  return Promise.all(
    records
      .filter(shouldArchiveToS3)
      .map(archiveToS3)
  );
};
