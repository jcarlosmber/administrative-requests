const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'administrative_requests',
  password: process.env.PGPASSWORD || 'Juancho1',
  port: parseInt(process.env.PGPORT || '5432', 10),
});

async function run() {
  try {
    await pool.query('ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS tipo_vinculacion_entidad TEXT;');
    await pool.query('ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS tipo_vinculacion_cargo TEXT;');
    console.log('Columns added or verified in planta_personal_sjd.');

    const mock = JSON.parse(fs.readFileSync('./data/plantaMockData.json', 'utf8'));
    for (const p of mock) {
      await pool.query(
        'UPDATE public.planta_personal_sjd SET tipo_vinculacion_entidad = $1, tipo_vinculacion_cargo = $2 WHERE id_plaza = $3',
        [p.tipo_vinculacion_entidad, p.tipo_vinculacion_cargo, p.id_plaza]
      );
    }
    console.log('Successfully updated rows in database:', mock.length);
  } catch (err) {
    console.error('Error updating DB:', err.message);
  } finally {
    await pool.end();
  }
}

run();
