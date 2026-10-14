const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function main() {
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planta_personal_sjd'
    ORDER BY ordinal_position
  `);
  console.log('Columnas de planta_personal_sjd:');
  cols.rows.forEach(c => console.log(`- ${c.column_name}: ${c.data_type}`));
  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
