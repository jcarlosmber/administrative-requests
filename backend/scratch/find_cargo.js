const { Pool } = require('pg');
require('dotenv').config();
const p = new Pool();

async function run() {
  try {
    const res = await p.query(`
      SELECT id_plaza, cargo, codigo, grado, dependencia_cargo, proposito, funciones::text as funciones_txt
      FROM planta_personal_sjd
      WHERE funciones::text ILIKE '%Revisar, tramitar, consolidar%'
         OR funciones::text ILIKE '%Analizar, evaluar y proyectar los conceptos%'
      LIMIT 5
    `);
    console.log('Cargos encontrados:', res.rows.length);
    res.rows.forEach(r => {
      console.log(`Plaza: ${r.id_plaza} | Cargo: ${r.cargo} | Cod: ${r.codigo} | Grd: ${r.grado} | Dep: ${r.dependencia_cargo}`);
      console.log('Funciones:', r.funciones_txt);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await p.end();
  }
}

run();
