const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool();

async function run() {
  try {
    const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'planta_personal_sjd' ORDER BY ordinal_position");
    console.table(r.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
