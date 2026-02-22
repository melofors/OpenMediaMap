// server/middleware/requireAdmin.js
const requireAuth = require("./requireAuth");

function requireAdmin(req, res, next) {
  // First ensure user is authenticated
  return requireAuth(req, res, () => {
    try {
      // Decide your “admin” rule:
      // - custom claim decoded.admin === true (req.user.isAdmin)
      // - OR Firestore role === 'admin'
      const isAdmin = req.user?.isAdmin === true || req.user?.role === "admin";

      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      return next();
    } catch (err) {
      console.error("requireAdmin failed:", err?.message || err);
      return res.status(403).json({ error: "Admin access required" });
    }
  });
}

module.exports = requireAdmin;