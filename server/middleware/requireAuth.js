// server/middleware/requireAuth.js
const admin = require("firebase-admin");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  // More robust token parsing (handles extra spaces)
  const parts = authHeader.split(" ");
  const idToken = (parts[1] || "").trim();

  if (!idToken) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  try {
    // Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(idToken);

    // Fetch Firestore user profile (for username / display purposes)
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(decoded.uid)
      .get();

    if (!userDoc.exists) {
      return res.status(403).json({ error: "User profile not found" });
    }

    const userData = userDoc.data() || {};
    const username = typeof userData.username === "string" ? userData.username.trim() : "";

    if (!username) {
      // Server/data issue (your app expects every user to have a username)
      return res.status(500).json({ error: "User username missing" });
    }

    // Attach enriched user object
    // Authorization source of truth: token validity (and claims if you use them)
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      username,
      isAdmin: decoded.admin === true, // handy, but don't use for enforcement here
      role: userData.role,
    };

    return next();
  } catch (err) {
    console.error("Auth check failed:", err?.message || err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = requireAuth;