const { Pool } = require('pg');
require('dotenv').config();
const p = new Pool();
p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
  .then(r => console.log('Tablas:', r.rows.map(x => x.table_name)))
  .catch(console.error)
  .finally(() => p.end());
