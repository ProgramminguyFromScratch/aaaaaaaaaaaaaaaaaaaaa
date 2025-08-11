// netlify/functions/_s3.js
const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;

if (!REGION || !BUCKET) {
  console.warn("AWS_REGION or S3_BUCKET not set in env; functions will fail until you set them.");
}

const s3 = new S3Client({ region: REGION });

async function getObjectBody(key) {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const res = await s3.send(cmd);
    const body = await streamToString(res.Body);
    return { body, etag: res.ETag };
  } catch (err) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

async function putObjectBody(key, body) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: typeof body === "string" ? body : JSON.stringify(body),
    ContentType: "application/json"
  });
  return s3.send(cmd);
}

async function headObject(key) {
  try {
    const cmd = new HeadObjectCommand({ Bucket: BUCKET, Key: key });
    const res = await s3.send(cmd);
    return res;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

module.exports = { getObjectBody, putObjectBody, headObject };
