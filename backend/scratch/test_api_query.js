const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const busqueda = 'jeffe';
    const params = [`%${busqueda.trim()}%`];
    const query = `
      SELECT * FROM public.planta_personal_sjd WHERE 1=1 AND (
        cargo ILIKE $1 OR 
        titular_nombre ILIKE $1 OR 
        titular_cedula ILIKE $1 OR 
        servidor_activo_nombre ILIKE $1 OR 
        servidor_activo_cedula ILIKE $1 OR 
        encargo_nombre ILIKE $1 OR 
        encargo_cedula ILIKE $1 OR 
        dependencia_cargo ILIKE $1 OR 
        dependencia_funcional ILIKE $1 OR 
        codigo ILIKE $1 OR 
        grado ILIKE $1 OR 
        (COALESCE(codigo, '') || '-' || COALESCE(grado, '')) ILIKE $1 OR 
        id_plaza::text ILIKE $1 OR 
        id_sideap::text ILIKE $1 OR 
        id_perno::text ILIKE $1 OR 
        opec::text ILIKE $1 OR 
        situacion_administrativa ILIKE $1 OR 
        situacion_titular ILIKE $1 OR 
        tipo_vinculacion ILIKE $1
      )
    `;
    const res = await pool.query(query, params);
    console.log(`Total filas devueltas por API para "${busqueda}":`, res.rows.length);
    res.rows.forEach(r => {
      console.log(`Plaza #${r.id_plaza}: Cargo="${r.cargo}", Estado="${r.estado_cargo}", Titular="${r.titular_nombre}" (CC ${r.titular_cedula}), SitTit="${r.situacion_titular}", Activo="${r.servidor_activo_nombre}", Encargo="${r.encargo_nombre}"`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
