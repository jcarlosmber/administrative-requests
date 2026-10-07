const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();

async function run() {
  try {
    const res = await pool.query(
      `SELECT id, candidato_nombre, candidato_cedula, cargo_nombre, fecha_validacion 
       FROM public.ingreso_validaciones 
       ORDER BY fecha_validacion DESC LIMIT 15`
    );
    console.log('Validaciones registradas:');
    res.rows.forEach(r => {
      console.log(`ID: ${r.id} | Cedula: ${r.candidato_cedula} | Candidato: ${r.candidato_nombre} | Cargo: ${r.cargo_nombre} | Fecha: ${r.fecha_validacion}`);
    });

    const busqueda = await pool.query(
      `SELECT v.id, v.candidato_nombre, v.candidato_cedula, v.cargo_nombre, c.id AS cert_id, c.entidad, c.cargo_certificado, c.fecha_inicio, c.fecha_fin
       FROM public.ingreso_validaciones v
       LEFT JOIN public.ingreso_certificados c ON c.validacion_id = v.id
       WHERE v.candidato_nombre ILIKE '%sanchez%' 
          OR v.candidato_nombre ILIKE '%gustavo%'
          OR v.candidato_cedula ILIKE '%79906841%'
          OR c.entidad ILIKE '%idu%'
          OR c.entidad ILIKE '%desarrollo urbano%'`
    );
    console.log('\nCoincidencias encontradas:', busqueda.rows.length);
    busqueda.rows.forEach(r => {
      console.log(`Val ID: ${r.id} | ${r.candidato_nombre} | Cert: ${r.entidad} | ${r.cargo_certificado} (${r.fecha_inicio} a ${r.fecha_fin})`);
    });
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
