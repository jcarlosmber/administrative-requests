require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool();

async function run() {
  try {
    const r = await pool.query(`
      SELECT *
      FROM public.planta_personal_sjd 
      WHERE id_plaza = 49 OR titular_nombre ILIKE '%CATALINA%' OR titular_nombre ILIKE '%FUENTES%' OR encargo_nombre ILIKE '%FUENTES%'
    `);
    console.log("Plazas encontradas en BD:", r.rows.length);
    console.log(JSON.stringify(r.rows, null, 2));

    const totalPlazas = await pool.query('SELECT COUNT(*) FROM public.planta_personal_sjd');
    console.log("Total plazas en BD:", totalPlazas.rows[0].count);

    const dupes = await pool.query(`
      SELECT id_plaza, COUNT(*) 
      FROM public.planta_personal_sjd 
      GROUP BY id_plaza 
      HAVING COUNT(*) > 1
    `);
    console.log("Plazas duplicadas por id_plaza:", dupes.rows);

  } catch(e) {
    console.error("Error:", e.message);
  } finally {
    pool.end();
  }
}
run();
