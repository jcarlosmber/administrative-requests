const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function run() {
  try {
    const sqlPath = path.join(__dirname, '../database/migration_ldap.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Ejecutando migración...');
    await pool.query(sql);
    console.log('Migración completada exitosamente.');
  } catch (err) {
    console.error('Error al ejecutar la migración:', err);
  } finally {
    await pool.end();
  }
}

run();
