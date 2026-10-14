const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
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
  console.log('--- 1. LEER EXCEL OFICIAL MANUAL DE FUNCIONES SJD ---');
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Archivo Excel no encontrado en: ${excelPath}`);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const sheet = wb.worksheets[0];

  const dependenciasPorSideap = [];
  const sqlStatements = [];

  for (let r = 5; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const getVal = (col) => {
      const c = row.getCell(col);
      if (!c || c.value === null || c.value === undefined) return '';
      if (typeof c.value === 'object' && c.value.text) return c.value.text.trim();
      return String(c.value).trim();
    };

    const idSideap = getVal(1) ? parseInt(getVal(1), 10) : null;
    const cargo = getVal(3);
    const codigo = getVal(4);
    const grado = getVal(5);
    const dependencia = getVal(6);

    if (!idSideap || !dependencia) continue;

    dependenciasPorSideap.push({
      idSideap,
      cargo,
      codigo,
      grado,
      dependencia
    });

    const safeDep = dependencia.replace(/'/g, "''");
    sqlStatements.push(`UPDATE public.planta_personal_sjd SET dependencia_cargo = '${safeDep}', updated_at = NOW() WHERE id_sideap = ${idSideap};`);
  }

  console.log(`Leídas ${dependenciasPorSideap.length} plazas con dependencia oficial desde el Excel.`);

  // Generar archivo SQL independiente
  const sqlFilePath = path.join(__dirname, 'actualizar_dependencias_manual.sql');
  const sqlContent = `-- ACTUALIZACIÓN OFICIAL DE DEPENDENCIAS DESDE MANUAL_DE_FUNCIONES_PLANTA_SJD.xlsx
BEGIN;

${sqlStatements.join('\n')}

COMMIT;
`;
  fs.writeFileSync(sqlFilePath, sqlContent, 'utf8');
  console.log(`Archivo SQL generado en: ${sqlFilePath}`);

  // Actualizar en base de datos PostgreSQL si la tabla existe
  console.log('\n--- 2. EJECUTAR ACTUALIZACIÓN EN BASE DE DATOS LOCAL/CONFIGURADA ---');
  let actualizadosBD = 0;
  try {
    for (const item of dependenciasPorSideap) {
      const res = await pool.query(`
        UPDATE public.planta_personal_sjd
        SET dependencia_cargo = $1,
            updated_at = NOW()
        WHERE id_sideap = $2
      `, [item.dependencia, item.idSideap]);
      if (res.rowCount > 0) actualizadosBD += res.rowCount;
    }
    console.log(`✓ Plazas actualizadas en BD PostgreSQL: ${actualizadosBD}`);
  } catch (dbErr) {
    console.warn(`Aviso DB (se aplicará cuando el usuario pruebe en su base): ${dbErr.message}`);
  }

  // Actualizar también plantaMockData.json
  console.log('\n--- 3. ACTUALIZAR plantaMockData.json PARA SINCRONIZACIÓN FRONTEND ---');
  const mockPath = path.join(__dirname, '../../frontend/lib/plantaMockData.json');
  if (fs.existsSync(mockPath)) {
    try {
      const mockData = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
      const depMap = new Map(dependenciasPorSideap.map(d => [d.idSideap, d.dependencia]));
      let mockActualizados = 0;

      mockData.forEach(p => {
        if (p.id_sideap && depMap.has(p.id_sideap)) {
          const nuevaDep = depMap.get(p.id_sideap);
          if (p.dependencia_cargo !== nuevaDep) {
            p.dependencia_cargo = nuevaDep;
            mockActualizados++;
          }
        }
      });

      fs.writeFileSync(mockPath, JSON.stringify(mockData, null, 2), 'utf8');
      console.log(`✓ plantaMockData.json sincronizado (${mockActualizados} plazas actualizadas).`);
    } catch (errMock) {
      console.error('Error al actualizar plantaMockData.json:', errMock.message);
    }
  }

  console.log('\n--- PROCESO COMPLETADO EXITOSAMENTE ---');
}

main().catch(err => {
  console.error('Error en ejecución:', err);
  process.exit(1);
}).finally(() => {
  pool.end();
});
