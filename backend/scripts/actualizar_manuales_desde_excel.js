const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const ExcelJS = require('exceljs');
const fs = require('fs');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

const excelPath = 'c:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/Scratch/Documentos/MANUAL_DE_FUNCIONES_PLANTA_SJD.xlsx';

function parseFunctions(funcionesText) {
  if (!funcionesText || typeof funcionesText !== 'string') return [];
  const lines = funcionesText.split(/\n+/);
  const result = [];
  let current = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\d+[\.\)]\s*/.test(trimmed)) {
      if (current) result.push(current);
      current = trimmed;
    } else {
      if (current) {
        current += ' ' + trimmed;
      } else {
        current = trimmed;
      }
    }
  }
  if (current) result.push(current);
  return result.length > 0 ? result : [funcionesText.trim()];
}

function parseMesesExperiencia(expText) {
  if (!expText) return null;
  const str = String(expText).toLowerCase();

  // 1. Buscar número entre paréntesis seguido de meses: "(64) meses" o "64 meses"
  const mMesesPar = str.match(/\((\d+)\)\s*meses?/);
  if (mMesesPar) return parseInt(mMesesPar[1], 10);

  const mMeses = str.match(/(\d+)\s*meses?/);
  if (mMeses) return parseInt(mMeses[1], 10);

  // 2. Buscar número entre paréntesis seguido de años: "(4) años" o "4 años"
  const mAñosPar = str.match(/\((\d+)\)\s*(?:año|años)/);
  if (mAñosPar) return parseInt(mAñosPar[1], 10) * 12;

  const mAños = str.match(/(\d+)\s*(?:año|años)/);
  if (mAños) return parseInt(mAños[1], 10) * 12;

  // 3. Casos textuales
  if (str.includes('un (1) año') || str.includes('un año') || str.includes('1 año')) return 12;
  if (str.includes('dos (2) años') || str.includes('dos años') || str.includes('2 años')) return 24;
  if (str.includes('tres (3) años') || str.includes('tres años') || str.includes('3 años')) return 36;
  if (str.includes('cuatro (4) años') || str.includes('cuatro años') || str.includes('4 años')) return 48;
  if (str.includes('cinco (5) años') || str.includes('cinco años') || str.includes('5 años')) return 60;
  if (str.includes('seis (6) meses') || str.includes('seis meses')) return 6;

  // No requiere experiencia
  if (str.includes('no requiere') || str.includes('no aplica')) return 0;

  return null;
}

function parseResolucion(paginasResolucion) {
  if (!paginasResolucion) return { paginas: null, resolucion: null };
  const str = String(paginasResolucion).trim();
  
  // Extraer resolución
  const resMatch = str.match(/(?:RES\.?|RESOLUCIÓN|RESOLUCION)\s*([0-9A-Za-z\s]+)/i);
  let resolucion = null;
  if (resMatch) {
    resolucion = resMatch[0].trim();
  }

  // Las páginas son la parte antes de la resolución
  let paginas = str;
  if (resolucion) {
    paginas = str.replace(resolucion, '').replace(/[-,\s]+$/, '').trim();
  }
  if (!paginas) paginas = str;

  return { paginas, resolucion };
}

async function main() {
  console.log('--- 1. ASEGURAR COLUMNAS EN BASE DE DATOS ---');
  await pool.query(`
    ALTER TABLE public.planta_personal_sjd 
    ADD COLUMN IF NOT EXISTS requisitos_formacion TEXT,
    ADD COLUMN IF NOT EXISTS requisitos_experiencia TEXT,
    ADD COLUMN IF NOT EXISTS meses_experiencia INTEGER,
    ADD COLUMN IF NOT EXISTS archivo_pdf TEXT;
  `);
  console.log('Columnas verificadas/creadas con éxito.');

  console.log('\n--- 2. LEER Y PROCESAR ARCHIVO EXCEL ACTUALIZADO ---');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const sheet = wb.getWorksheet(1);

  const filas = [];
  const manualesParaFrontend = [];

  for (let r = 5; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const getVal = (col) => {
      const c = row.getCell(col);
      if (!c || c.value === null || c.value === undefined) return '';
      if (typeof c.value === 'object' && c.value.text) return c.value.text.trim();
      return String(c.value).trim();
    };

    const id_sideap = getVal(1) ? parseInt(getVal(1), 10) : null;
    const nivel = getVal(2);
    const cargo = getVal(3);
    const codigo = getVal(4);
    const grado = getVal(5);
    const dependencia = getVal(6);
    const proposito = getVal(7);
    const funcionesRaw = getVal(8);
    const requisitos_estudio = getVal(9);
    const requisitos_experiencia = getVal(10);
    const paginas_resolucion = getVal(11);
    const archivo_pdf = getVal(12);

    if (!cargo && !id_sideap) continue;

    const funcionesArray = parseFunctions(funcionesRaw);
    const meses = parseMesesExperiencia(requisitos_experiencia);
    const { paginas, resolucion } = parseResolucion(paginas_resolucion);

    const partesReq = [];
    if (requisitos_estudio) partesReq.push(`Formación: ${requisitos_estudio}`);
    if (requisitos_experiencia) partesReq.push(`Experiencia: ${requisitos_experiencia}`);
    const requisitosConsolidados = partesReq.join('\n\n');

    filas.push({
      id_sideap,
      cargo,
      codigo,
      grado,
      dependencia,
      proposito,
      funciones: funcionesArray,
      requisitos_formacion: requisitos_estudio,
      requisitos_experiencia: requisitos_experiencia,
      requisitos: requisitosConsolidados,
      meses_experiencia: meses,
      manual_funciones: paginas_resolucion || paginas,
      resolucion_manual: resolucion,
      archivo_pdf,
    });

    if (id_sideap && archivo_pdf) {
      manualesParaFrontend.push({
        id_sideap,
        cargo,
        codigo,
        grado,
        archivo: archivo_pdf,
        paginas: paginas || undefined,
        resolucion: resolucion || undefined,
      });
    }
  }

  console.log(`Leídos ${filas.length} registros del Excel.`);

  console.log('\n--- 3. ACTUALIZAR TABLA PLANTA_PERSONAL_SJD EN POSTGRESQL ---');
  let actualizados = 0;
  let noEncontrados = 0;

  for (const f of filas) {
    const funcionesJson = JSON.stringify(f.funciones);

    // Intentar primero por id_sideap
    let res = null;
    if (f.id_sideap) {
      res = await pool.query(`
        UPDATE public.planta_personal_sjd
        SET
          proposito = $1,
          funciones = $2::jsonb,
          requisitos = $3,
          requisitos_formacion = $4,
          requisitos_experiencia = $5,
          meses_experiencia = $6,
          manual_funciones = $7,
          resolucion_manual = $8,
          archivo_pdf = $9,
          updated_at = NOW()
        WHERE id_sideap = $10
        RETURNING id_plaza, id_sideap, cargo
      `, [
        f.proposito || null,
        funcionesJson,
        f.requisitos || null,
        f.requisitos_formacion || null,
        f.requisitos_experiencia || null,
        f.meses_experiencia,
        f.manual_funciones || null,
        f.resolucion_manual || null,
        f.archivo_pdf || null,
        f.id_sideap
      ]);
    }

    // Si no hubo match por id_sideap, intentar por cargo, codigo y grado
    if (!res || res.rowCount === 0) {
      res = await pool.query(`
        UPDATE public.planta_personal_sjd
        SET
          proposito = $1,
          funciones = $2::jsonb,
          requisitos = $3,
          requisitos_formacion = $4,
          requisitos_experiencia = $5,
          meses_experiencia = $6,
          manual_funciones = $7,
          resolucion_manual = $8,
          archivo_pdf = $9,
          updated_at = NOW()
        WHERE TRIM(cargo) ILIKE TRIM($10)
          AND TRIM(codigo) = TRIM($11)
          AND TRIM(grado) = TRIM($12)
        RETURNING id_plaza, id_sideap, cargo
      `, [
        f.proposito || null,
        funcionesJson,
        f.requisitos || null,
        f.requisitos_formacion || null,
        f.requisitos_experiencia || null,
        f.meses_experiencia,
        f.manual_funciones || null,
        f.resolucion_manual || null,
        f.archivo_pdf || null,
        f.cargo,
        f.codigo,
        f.grado
      ]);
    }

    if (res && res.rowCount > 0) {
      actualizados += res.rowCount;
    } else {
      noEncontrados++;
      console.log(`  No encontrado: SIDEAP ${f.id_sideap} - ${f.cargo} (${f.codigo}-${f.grado})`);
    }
  }

  console.log(`\nResultado de actualización en BD:`);
  console.log(`- Plazas actualizadas: ${actualizados}`);
  console.log(`- Registros no encontrados: ${noEncontrados}`);

  console.log('\n--- 4. ACTUALIZAR CATÁLOGO DE MANUALES FRONTEND (manualesIndex.json) ---');
  const frontendIndexPath = path.join(__dirname, '../../frontend/lib/manualesIndex.json');
  if (fs.existsSync(frontendIndexPath)) {
    fs.writeFileSync(frontendIndexPath, JSON.stringify(manualesParaFrontend, null, 2), 'utf8');
    console.log(`Archivo manualesIndex.json actualizado con éxito con ${manualesParaFrontend.length} cargos.`);
  } else {
    console.log(`No se encontró manualesIndex.json en ${frontendIndexPath}`);
  }

  // Verificación final en BD
  const verificacion = await pool.query(`
    SELECT count(*) as total,
           count(proposito) as con_proposito,
           count(requisitos_formacion) as con_formacion,
           count(requisitos_experiencia) as con_experiencia,
           count(manual_funciones) as con_manual,
           count(archivo_pdf) as con_archivo_pdf
    FROM public.planta_personal_sjd
  `);
  console.log('\n--- VERIFICACIÓN FINAL EN BD ---');
  console.log(verificacion.rows[0]);

  await pool.end();
}

main().catch(err => {
  console.error('Error en proceso:', err);
  pool.end();
});
