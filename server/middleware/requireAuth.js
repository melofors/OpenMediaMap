// server/middleware/requireAuth.js
const admin = require("../firebaseAdmin");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid Authorization header" });
    }

    const idToken = authHeader.split(" ")[1]?.trim();
    if (!idToken) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    // Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(idToken);

    // Fetch Firestore user profile
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(decoded.uid)
      .get();

    if (!userDoc.exists) {
      return res.status(403).json({ error: "User profile not found" });
    }

    const userData = userDoc.data() || {};
    const username =
      typeof userData.username === "string" ? userData.username.trim() : "";

    if (!username) {
      return res.status(500).json({ error: "User username missing" });
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      username,
      // custom claims (if you set them)
      isAdmin: decoded.admin === true,
      role: userData.role || null,
    };

    return next();
  } catch (err) {
    // IMPORTANT: never crash → always a clean auth response
    console.error("requireAuth failed:", err?.message || err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = requireAuth;