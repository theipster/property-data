const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  params: {
    Bucket: process.env.ARCHIVE_BUCKET
  }
});

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
  return Promise.all(
    event.Records
      .filter(shouldArchiveToS3)
      .map(archiveToS3)
  );
};
