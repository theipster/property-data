const AWS = require("aws-sdk"),
  crypto = require("crypto");

const s3 = new AWS.S3({
  params: {
    Bucket: process.env.ARCHIVE_BUCKET
  }
});

async function archiveToS3(record) {
  let { id, content } = record.dynamodb.NewImage;

  let contentMd5 = crypto.createHash("md5")
    .update(content.S)
    .digest("base64");

  return s3.putObject({
    Body: content.S,
    ContentMD5: contentMd5,
    ContentType: "text/html",
    Key: `details/${id.S}.html`
  })
    .on("success", response => {
      console.log(`Archived ${id.S}, ${Buffer.byteLength(content.S)} bytes.`);
    })
    .promise();
}

function shouldArchiveToS3(record) {
  if (!("NewImage" in record.dynamodb)) {
    console.warn(`Archiving skipped, no new content available for ${record.dynamodb.OldImage.id.S}`);
    return false;
  }

  let { id, content } = record.dynamodb.NewImage;
  if (!("OldImage" in record.dynamodb)) {
    console.log(`Archiving ${id.S}, old content not available.`);
    return true;
  }
  if (record.dynamodb.OldImage.content.S != content.S) {
    console.log(`Archiving ${id.S}, new content is different.`);
    return true;
  }

  console.log(`Archiving ${id.S} skipped, duplicated content.`);
  return false;
}

module.exports.handler = async event => {
  return Promise.all(
    event.Records
      .filter(shouldArchiveToS3)
      .map(archiveToS3)
  );
};
