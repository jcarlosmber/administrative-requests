const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function check() {
  try {
    const res = await pool.query("SELECT id, email, role, username FROM users");
    console.table(res.rows);
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await pool.end();
  }
}

check();
