const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(`
      SELECT id_plaza, cargo, estado_cargo, titular_cedula, titular_nombre, situacion_titular, encargo_cedula, encargo_nombre, servidor_activo_cedula, servidor_activo_nombre, es_encargo, tipo_vinculacion_cargo 
      FROM public.planta_personal_sjd 
      WHERE 
        servidor_activo_nombre ILIKE '%jeffe%' OR 
        encargo_nombre ILIKE '%jeffe%' OR 
        titular_nombre ILIKE '%jeffe%'
    `);
    console.log('Resultados coincidentes con jeffe:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
