const AWS = require("aws-sdk");

const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT);

const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.SPACES_KEY,
  secretAccessKey: process.env.SPACES_SECRET,

  // DigitalOcean Spaces uses "us-east-1" as a common compatible region value
  // (doesn't change security, but avoids weird signing issues)
  region: process.env.SPACES_REGION || "us-east-1",

  // Ensure HTTPS is used
  sslEnabled: true,

  // Avoid hanging forever during network issues (stability / DoS-resilience)
  httpOptions: {
    timeout: 15000,        // 15s request timeout
    connectTimeout: 5000,  // 5s connection timeout
  },

  // Conservative retries
  maxRetries: 2,
});

module.exports = s3;