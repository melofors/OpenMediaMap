const admin = require("firebase-admin");

async function requireAdmin(req, res, next) {
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

    // Require explicit boolean admin claim
    if (decoded.admin !== true) {
      return res.status(403).json({ error: "Admin privileges required" });
    }

    // Fetch Firestore user profile (for username / display purposes)
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(decoded.uid)
      .get();

    if (!userDoc.exists) {
      return res.status(403).json({ error: "Admin user profile not found" });
    }

    const userData = userDoc.data() || {};

    if (!userData.username) {
      // This is a server misconfiguration / data issue, not user fault
      return res.status(500).json({ error: "Admin username missing" });
    }

    // Attach enriched user object
    // Authorization source of truth: decoded.admin (custom claim)
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      username: userData.username,
      isAdmin: true,
      // Keep role for convenience, but don't rely on it for authorization
      role: userData.role,
    };

    return next();
  } catch (err) {
    // Avoid dumping potentially sensitive internals; keep enough for debugging
    console.error("Admin check failed:", err?.message || err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = requireAdmin;