const express = require('express');
const router = express.Router();
const admin = require('../firebaseAdmin');
const requireAuth = require('../middleware/requireAuth');

function isValidUsername(username) {
  return typeof username === 'string' && /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

// GET /api/user/me — get own username (requires auth)
// MUST be before /:username to avoid being matched as a username
router.get('/me', requireAuth, async (req, res) => {
  return res.json({ username: req.user.username });
});

// POST /api/user/bio — update own bio (requires auth)
router.post('/bio', requireAuth, async (req, res) => {
  try {
    const db = admin.firestore();
    const bio = req.body.bio ?? '';

    if (typeof bio !== 'string' || bio.length > 300) {
      return res.status(400).json({ error: 'Bio must be a string under 300 characters' });
    }

    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('username', '==', req.user.username).limit(1).get();

    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    await querySnapshot.docs[0].ref.update({ bio: bio.trim() });

    return res.json({ success: true });
  } catch (err) {
    console.error('Error updating bio:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/user — list all users with stats
router.get('/', async (req, res) => {
  const db = admin.firestore();
  const pgDB = require('../models/db');

  try {
    // Get submission counts from postgres
    const pgResult = await pgDB.query(`
      SELECT user_id, COUNT(*) as submission_count
      FROM submissions
      WHERE status = 'approved' AND deleted = FALSE
      GROUP BY user_id
    `);

    const submissionMap = {};
    pgResult.rows.forEach(row => {
      submissionMap[row.user_id] = Number(row.submission_count);
    });

    // Get edit counts from postgres
    const editResult = await pgDB.query(`
      SELECT editor_username, COUNT(*) as edit_count
      FROM submission_revisions
      WHERE revision_number > 0
      GROUP BY editor_username
    `);

    const editMap = {};
    editResult.rows.forEach(row => {
      editMap[row.editor_username] = Number(row.edit_count);
    });

    // Get all usernames that have activity
    const allUsernames = [...new Set([
      ...Object.keys(submissionMap),
      ...Object.keys(editMap)
    ])];

    // Fetch user docs from Firestore
    const usersRef = db.collection('users');
    const users = [];

    for (const username of allUsernames) {
      if (!isValidUsername(username)) continue;
      try {
        const snap = await usersRef.where('username', '==', username).limit(1).get();
        const created_at = snap.empty ? null : (snap.docs[0].data().created_at?.toDate().toISOString() ?? null);
        users.push({
          username,
          created_at,
          submission_count: submissionMap[username] || 0,
          edit_count: editMap[username] || 0
        });
      } catch {
        users.push({
          username,
          created_at: null,
          submission_count: submissionMap[username] || 0,
          edit_count: editMap[username] || 0
        });
      }
    }

    users.sort((a, b) => b.submission_count - a.submission_count);

    return res.json(users);
  } catch (err) {
    console.error('Error fetching user list:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/user/:username — fetch user profile
// MUST be last since /:username matches anything
router.get('/:username', async (req, res) => {
  const db = admin.firestore();
  const pgDB = require('../models/db');
  const usernameRaw = req.params.username;

  if (!isValidUsername(usernameRaw)) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  const username = usernameRaw;

  try {
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('username', '==', username).limit(1).get();

    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() || {};

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

    return res.json({
      username: userData.username || username,
      bio: userData.bio || '',
      created_at: userData.created_at ? userData.created_at.toDate().toISOString() : null,
      submissionCount
    });

  } catch (err) {
    console.error('Error in /api/user/:username route:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;