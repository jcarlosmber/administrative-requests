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
    const res = await pool.query(
      "SELECT id, email, username, name, role, ldap_enabled, (password_hash IS NOT NULL) as has_pass FROM users WHERE role IN ('superadmin', 'admin')"
    );
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();
