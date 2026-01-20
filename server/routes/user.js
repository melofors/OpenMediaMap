const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();
const pgDB = require('../models/db');

// --- Helpers ---
function escapeHtml(input) {
  // Escapes text for safe HTML interpolation (prevents XSS)
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Conservative username rules: letters/numbers/underscore, 3-30 chars.
// Adjust to match your actual signup constraints.
function isValidUsername(username) {
  return typeof username === 'string' && /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

router.get('/:username', async (req, res) => {
  const usernameRaw = req.params.username;

  if (!isValidUsername(usernameRaw)) {
    return res.status(400).send('Invalid username.');
  }

  const username = usernameRaw; // validated

  try {
    if (process.env.DEBUG_USER_ROUTES === 'true') {
      console.log(`Fetching user: ${username}`);
    }

    // 1. Fetch user from Firestore
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('username', '==', username).limit(1).get();

    if (querySnapshot.empty) {
      // Avoid reflecting untrusted input in HTML
      return res.status(404).send('<h1>User not found.</h1>');
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() || {};

    const safeUsername = escapeHtml(userData.username || username);
    const safeBio = escapeHtml(userData.bio || 'No bio yet.');

    // Handle created_at safely
    let joinedText = 'Unknown';
    try {
      if (userData.created_at && typeof userData.created_at.toDate === 'function') {
        joinedText = userData.created_at.toDate().toDateString();
      }
    } catch {
      // keep default
    }

    // 2. Fetch submission count (safe param query)
    let submissionCount = 0;
    try {
      const result = await pgDB.query(
        `SELECT COUNT(*)
         FROM submissions
         WHERE user_id = $1
           AND status = 'approved'
           AND deleted = FALSE`,
        [userData.username || username]
      );
      submissionCount = Number(result.rows?.[0]?.count ?? 0);
    } catch (pgErr) {
      console.error('Error fetching submission count:', pgErr);
    }

    // 3. Render profile page
    // NOTE: Email intentionally not rendered publicly (PII + scraping risk).
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeUsername}'s Profile</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>

<div class="topnav">
  <a href="/forum.html">
    <img src="/logos/logo2.png" class="logo2" alt="Logo">
  </a>

  <div class="nav-links">
    <div class="topnav-left">
      <a class="page" href="/index.html">Home</a>
      <a class="page" href="/map.html">Map</a>
      <a class="page" href="/database.html">Database</a>
      <a class="page" href="/contribute.html">Contribute</a>
      <a class="page" href="/about.html">About</a>
      <a id="admin-link" class="page" href="/admin.html" style="display:none">Admin</a>
    </div>

    <div class="topnav-right">
      <div id="topnav-auth">
        <a class="page" href="/login.html" id="login-link">Login</a>
      </div>
      <a class="page" href="/forum.html">Forum</a>
    </div>
  </div>
</div>

<div class="main-forum-layout">

  <nav class="vertical-tabs" role="tablist" aria-orientation="vertical">
    <div id="user-link-container" class="login-link">
      <a href="/login.html">Login</a>
    </div>

    <a href="/forum.html" role="tab" class="tab">Forum</a>
    <a href="/recent.html" role="tab" class="tab">Recent Contributions</a>
  </nav>

  <main class="forumcontent" role="tabpanel">

    <div class="profile-header">
      <div class="profile-header-inner">
        <div class="profile-avatar">
          <span>${safeUsername.charAt(0).toUpperCase()}</span>
        </div>
        <div class="profile-info">
          <h1>@${safeUsername}</h1>
          <p class="profile-meta">
            Joined: ${escapeHtml(joinedText)}
          </p>
        </div>
      </div>
    </div>

    <div class="profile-bio" id="profile-bio-section">
      <h3 id="bio-header">Bio</h3>
      <p id="bio-text">${safeBio}</p>
    </div>

    <div class="profile-bio">
      <h3>Stats</h3>
      <p>
        Number of files uploaded:
        ${submissionCount}
        (<a href="/database.html?uploader=${encodeURIComponent(userData.username || username)}">view</a>)
      </p>
    </div>

    <!-- Modal -->
    <div id="bio-overlay"></div>
    <div id="bio-modal">
      <h3>Edit Bio</h3>
      <textarea id="bio-input" rows="3"></textarea>
      <div class="modal-buttons">
        <button id="save-bio-btn" class="btn">Save</button>
        <button id="close-bio-btn" class="btn btn-secondary">Close</button>
      </div>
    </div>

  </main>
</div>

<script type="module" src="/auth.js"></script>
</body>
</html>
    `);
  } catch (err) {
    console.error('Error in /user/:username route:', err);
    res.status(500).send('Server error.');
  }
});

module.exports = router;