// server/routes/submissions.js
const express = require('express');
const router = express.Router();
const { upload, verifyImageMagicBytes } = require('../middleware/upload');
const db = require('../models/db');
const { submitRecord } = require('../controllers/submissionsController');
const requireAdmin = require('../middleware/requireAdmin');
const requireAuth = require('../middleware/requireAuth');

// =============================================================
// Helper: Log admin actions
// =============================================================
async function logAdminAction(adminUsername, actionType, recordId) {
  try {
    await db.query(
      `INSERT INTO admin_actions (admin_username, action_type, record_id)
       VALUES ($1, $2, $3)`,
      [adminUsername, actionType, recordId]
    );
  } catch (err) {
    console.error('Admin action log failed:', err?.message || err);
  }
}

// Helper: validate numeric id param (prevents weird edge cases)
function parseIdParam(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid id' });
    return null;
  }
  return id;
}

// =============================================================
// PUBLIC ROUTES
// =============================================================

// Submit new record
router.post(
  "/submit",
  requireAuth,
  upload.single("photo"),
  verifyImageMagicBytes,
  submitRecord
);

// Get approved submissions
router.get('/approved', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, caption, source, photographer,
              year, month, day, estimated,
              photo_url,
              ST_X(geom) AS lng,
              ST_Y(geom) AS lat,
              location, notes, user_id, created_at
       FROM submissions
       WHERE status = 'approved'
         AND deleted = FALSE
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching approved submissions:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================
// ADMIN ROUTES
// =============================================================

// Get pending submissions
router.get('/admin/pending', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, caption, source, photographer,
              year, month, day, estimated,
              photo_url, user_id,
              ST_X(geom) AS lng,
              ST_Y(geom) AS lat,
              location, notes, created_at
       FROM submissions
       WHERE status = 'pending'
         AND deleted = FALSE
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pending submissions:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------
// Approve submission (only from pending + not deleted)
// -------------------------------------------------------------
router.post('/admin/:id/approve', requireAdmin, async (req, res) => {
  const id = parseIdParam(req, res);
  if (!id) return;

  const adminUsername = req.user.username;

  try {
    const result = await db.query(
      `UPDATE submissions
       SET status = 'approved'
       WHERE id = $1
         AND status = 'pending'
         AND deleted = FALSE
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      // Either not found, or not eligible (already approved/rejected/deleted)
      return res.status(404).json({ error: 'Record not found or not pending' });
    }

    await logAdminAction(adminUsername, 'approve', id);
    return res.json({ message: 'Submission approved' });
  } catch (err) {
    console.error('Error approving submission:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------
// Reject submission (NOT a delete) (only from pending + not deleted)
// -------------------------------------------------------------
router.delete('/admin/:id/reject', requireAdmin, async (req, res) => {
  const id = parseIdParam(req, res);
  if (!id) return;

  const adminUsername = req.user.username;

  try {
    const result = await db.query(
      `UPDATE submissions
       SET status = 'rejected'
       WHERE id = $1
         AND status = 'pending'
         AND deleted = FALSE
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found or not pending' });
    }

    await logAdminAction(adminUsername, 'reject', id);
    return res.json({ message: 'Submission rejected' });
  } catch (err) {
    console.error('Error rejecting submission:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------
// Soft delete submission (post-approval moderation)
// -------------------------------------------------------------
router.post('/admin/:id/soft-delete', requireAdmin, async (req, res) => {
  const id = parseIdParam(req, res);
  if (!id) return;

  const adminUsername = req.user.username;

  let reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!reason) reason = 'Deleted by admin';
  // Prevent very large reasons from bloating DB/logs
  if (reason.length > 500) reason = reason.slice(0, 500);

  try {
    const result = await db.query(
      `UPDATE submissions
       SET deleted = TRUE,
           delete_reason = $1,
           deleted_at = NOW()
       WHERE id = $2
         AND deleted = FALSE
       RETURNING id`,
      [reason, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found or already deleted' });
    }

    await logAdminAction(adminUsername, 'delete', id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Error soft deleting submission:', err?.message || err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// =============================================================
module.exports = router;