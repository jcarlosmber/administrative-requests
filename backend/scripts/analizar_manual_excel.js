const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const ExcelJS = require('exceljs');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

const excelPath = 'c:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/Scratch/Documentos/MANUAL_DE_FUNCIONES_PLANTA_SJD.xlsx';

async function main() {
  console.log('--- Iniciando análisis del archivo Excel ---');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const sheet = wb.getWorksheet(1);

  console.log(`Hoja: ${sheet.name}, Total filas: ${sheet.rowCount}`);

  // Leer encabezados en fila 4
  const headerRow = sheet.getRow(4);
  const headers = {};
  headerRow.eachCell((cell, colNum) => {
    headers[colNum] = String(cell.value || '').trim();
  });
  console.log('Encabezados:', headers);

  // Leer registros a partir de fila 5
  const registros = [];
  for (let r = 5; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const getVal = (col) => {
      const c = row.getCell(col);
      if (!c || c.value === null || c.value === undefined) return '';
      if (typeof c.value === 'object' && c.value.text) return c.value.text.trim();
      return String(c.value).trim();
    };

    const id_sideap = getVal(1);
    const nivel = getVal(2);
    const cargo = getVal(3);
    const codigo = getVal(4);
    const grado = getVal(5);
    const dependencia = getVal(6);
    const proposito = getVal(7);
    const funciones = getVal(8);
    const requisitos_estudio = getVal(9);
    const requisitos_experiencia = getVal(10);
    const paginas_resolucion = getVal(11);
    const archivo_pdf = getVal(12);

    if (!cargo && !id_sideap) continue;

    registros.push({
      fila: r,
      id_sideap: id_sideap ? parseInt(id_sideap, 10) : null,
      nivel,
      cargo,
      codigo,
      grado,
      dependencia,
      proposito,
      funciones,
      requisitos_estudio,
      requisitos_experiencia,
      paginas_resolucion,
      archivo_pdf,
    });
  }

  console.log(`Registros válidos leídos del Excel: ${registros.length}`);

  // Muestra del primer registro
  console.log('Ejemplo primer registro:', JSON.stringify(registros[0], null, 2));

  // Consultar plazas en la base de datos
  const dbPlazas = await pool.query(`
    SELECT id_plaza, id_sideap, cargo, codigo, grado, proposito, manual_funciones, resolucion_manual
    FROM public.planta_personal_sjd
  `);
  console.log(`Total plazas en base de datos (planta_personal_sjd): ${dbPlazas.rowCount}`);

  // Verificar cuántas plazas cruzan por id_sideap
  const sideapMap = new Map();
  registros.forEach(reg => {
    if (reg.id_sideap) sideapMap.set(Number(reg.id_sideap), reg);
  });

  let matchPorSideap = 0;
  let matchPorCargoCodGrado = 0;
  let sinMatch = 0;

  for (const p of dbPlazas.rows) {
    if (p.id_sideap && sideapMap.has(Number(p.id_sideap))) {
      matchPorSideap++;
    } else {
      // Buscar por cargo, codigo y grado
      const found = registros.find(r => 
        r.cargo && p.cargo && r.cargo.trim().toLowerCase() === p.cargo.trim().toLowerCase() &&
        String(r.codigo || '').trim() === String(p.codigo || '').trim() &&
        String(r.grado || '').trim() === String(p.grado || '').trim()
      );
      if (found) {
        matchPorCargoCodGrado++;
      } else {
        sinMatch++;
        if (sinMatch <= 5) {
          console.log(`  Plaza sin match directo: #${p.id_plaza} SIDEAP: ${p.id_sideap} Cargo: ${p.cargo} (${p.codigo}-${p.grado})`);
        }
      }
    }
  }

  console.log(`Coincidencias en BD:`);
  console.log(`- Por ID SIDEAP: ${matchPorSideap}`);
  console.log(`- Por Cargo + Código + Grado: ${matchPorCargoCodGrado}`);
  console.log(`- Sin coincidencia: ${sinMatch}`);

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  pool.end();
});
