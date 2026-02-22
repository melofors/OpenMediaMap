// server/firebaseAdmin.js
require("dotenv").config({ path: __dirname + "/.env" });

const admin = require("firebase-admin");
const path = require("path");

function log(msg) {
  console.log(`${new Date().toISOString()}: ${msg}`);
}

if (!admin.apps.length) {
  // Accept either env var name, but FORCE ADC to use GOOGLE_APPLICATION_CREDENTIALS
  const credsPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_ADMIN_CREDENTIALS;

  if (!credsPath) {
    throw new Error(
      "Missing GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_ADMIN_CREDENTIALS"
    );
  }

  // Resolve relative paths safely
  const resolvedPath = credsPath.startsWith("/")
    ? credsPath
    : path.resolve(__dirname, credsPath);

  // Ensure ADC sees it
  process.env.GOOGLE_APPLICATION_CREDENTIALS = resolvedPath;

  // Initialize using Application Default Credentials (ADC)
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  log(`Firebase Admin initialized via ADC using ${resolvedPath}`);
}

module.exports = admin;