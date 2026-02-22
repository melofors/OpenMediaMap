const { Pool } = require('pg');

// IMPORTANT: dotenv should be loaded once in server.js (single source of truth)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

// optional debug connection check
if (process.env.DEBUG_DB === 'true') {
  pool.query('SELECT current_database();', (err, res) => {
    if (err) {
      console.error('Database connection error:', err.stack);
    } else {
      console.log('Connected to DB:', res.rows[0].current_database);
    }
  });
}

/*
Export BOTH styles:

db.query(...)        -> simple queries (existing code)
db.pool.connect()    -> transactions (new revision system)
*/
module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};