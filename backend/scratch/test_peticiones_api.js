const http = require('http');

// Probamos directamente la lógica de los endpoints importando el router o llamando a postgres
const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();
const nominaRoutes = require('../routes/nominaRoutes');

const app = express();
app.use(express.json());
app.use('/api/nomina', nominaRoutes(pool));

const server = app.listen(4999, async () => {
  console.log('Servidor de prueba en puerto 4999');
  try {
    // 1. Probar lista de OPECs
    const r1 = await fetch('http://localhost:4999/api/nomina/peticiones-opec/lista-opecs');
    const data1 = await r1.json();
    console.log('OPECs encontradas:', data1.opecs.length);

    // 2. Probar consulta de OPEC 220280
    const r2 = await fetch('http://localhost:4999/api/nomina/peticiones-opec/consultar?opec=220280&peticionario=Dr.%20Carlos%20P%C3%A9rez&radicado=2026-ER-01234');
    const data2 = await r2.json();
    console.log('Resultado 220280:');
    console.log('Encontrado:', data2.encontrado);
    console.log('Identificación:', data2.identificacion);
    console.log('Total empleos equivalentes:', data2.conteo?.total_empleos);
    console.log('Vacantes definitivas:', data2.conteo?.vacantes_definitivas);
    console.log('\n--- LITERARLES RESUMEN ---');
    console.log('a. Denominación:', data2.literales?.a_denominacion);
    console.log('b. Código:', data2.literales?.b_codigo);
    console.log('c. Grado:', data2.literales?.c_grado);
    console.log('e. Número empleos:', data2.literales?.e_numero_empleos);
    console.log('f. Vacantes def:', data2.literales?.f_vacantes_definitivas);
    console.log('g. Fecha vacancia:', data2.literales?.g_fecha_vacancia);
    console.log('\n--- OFICIO BORRADOR (primeras 20 líneas) ---');
    console.log(data2.oficio_borrador?.split('\n').slice(0, 25).join('\n'));
  } catch (err) {
    console.error('Error en prueba:', err);
  } finally {
    server.close();
    await pool.end();
  }
});
