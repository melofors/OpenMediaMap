require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const helmet = require('helmet');

// -----------------------------
// Firebase Admin Initialization
// -----------------------------
// Prefer env var in production to avoid keeping service account JSON on disk.
// Set FIREBASE_SERVICE_ACCOUNT_JSON to the full JSON string.
let credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(svc);
  } catch (err) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', err);
    process.exit(1);
  }
} else {
  // Local/dev fallback (make sure serviceAccountKey.json is NEVER committed)
  // eslint-disable-next-line global-require
  const serviceAccount = require('./serviceAccountKey.json');
  credential = admin.credential.cert(serviceAccount);
}

admin.initializeApp({ credential });

// -----------------------------
// App + Config
// -----------------------------
const app = express();
const PORT = process.env.PORT || 5000;

// -----------------------------
// Middleware
// -----------------------------

// Don’t leak implementation details
app.disable('x-powered-by');

// Baseline security headers (low-risk hardening)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],

        "script-src": [
          "'self'",
          "https://www.gstatic.com",
          "https://www.googleapis.com",
          "https://apis.google.com",
        ],

        "style-src": ["'self'", "https:", "'unsafe-inline'"],

        "connect-src": [
          "'self'",
          "https://www.googleapis.com",
          "https://firestore.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://www.gstatic.com",
          "https://openmediamap.firebaseapp.com",
        ],

        "frame-src": [
          "'self'",
          "https://openmediamap.firebaseapp.com",
          "https://apis.google.com",
        ],

        "img-src": ["'self'", "data:", "https:"],
        "font-src": ["'self'", "https:", "data:"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "frame-ancestors": ["'self'"],
        "upgrade-insecure-requests": [],
      },
    },
  })
);


// 🔐 CORS — REQUIRED FOR PROD
app.use(
  cors({
    origin: [
      'http://openmediamap.com',
      'https://openmediamap.com',
      'http://www.openmediamap.com',
      'https://www.openmediamap.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);

// Prevent large JSON bodies (basic DoS protection)
app.use(express.json({ limit: '1mb' }));

// -----------------------------
// Imports that depend on Firebase
// -----------------------------
const requireAdmin = require('./middleware/requireAdmin');
const pool = require('./models/db');
const userRoutes = require('./routes/user');

// -----------------------------
// Static Files
// -----------------------------

// Main public site
app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// Admin frontend
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// -----------------------------
// Routes
// -----------------------------

// User profiles
app.use('/user', userRoutes);

// Submissions (public + admin)
app.use('/api/submissions', require('./routes/submissions'));

// Admin logs
app.get('/api/admin/actions', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, admin_username, action_type, record_id, created_at
      FROM admin_actions
      ORDER BY created_at DESC
      LIMIT 500
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin logs:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// -----------------------------
// Start Server
// -----------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});