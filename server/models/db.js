const { Pool } = require('pg');

// IMPORTANT: dotenv should be loaded once in server.js (single source of truth)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Enable SSL in production if your DB requires it.
  // Set DATABASE_SSL=true in env when needed.
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

module.exports = pool;

// Connection check (avoid noisy logs in production)
if (process.env.DEBUG_DB === 'true') {
  pool.query('SELECT current_database();', (err, res) => {
    if (err) {
      console.error('Database connection error:', err.stack);
    } else {
      console.log('Connected to DB:', res.rows[0].current_database);
    }
  });
}