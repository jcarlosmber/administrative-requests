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
  
  // Buscar meses directos
  const mMeses = str.match(/(\d+)\s*meses/);
  if (mMeses) return parseInt(mMeses[1], 10);

  // Buscar años
  const mAñosNum = str.match(/(\d+)\s*(?:año|años)/);
  if (mAñosNum) return parseInt(mAñosNum[1], 10) * 12;

  // Buscar palabras de texto
  if (str.includes('un (1) año') || str.includes('un año') || str.includes('(1) año')) return 12;
  if (str.includes('dos (2) años') || str.includes('dos años') || str.includes('(2) años')) return 24;
  if (str.includes('tres (3) años') || str.includes('tres años') || str.includes('(3) años')) return 36;
  if (str.includes('cuatro (4) años') || str.includes('cuatro años') || str.includes('(4) años')) return 48;
  if (str.includes('cinco (5) años') || str.includes('cinco años') || str.includes('(5) años')) return 60;
  if (str.includes('seis (6) meses') || str.includes('seis meses')) return 6;

  return null;
}

function parseResolucion(paginasResolucion) {
  if (!paginasResolucion) return { paginas: null, resolucion: null };
  const str = String(paginasResolucion).trim();
  
  // Ejemplo: "34-37 RES. 085 de 2020" o "PÁG. 12 RES 085 DE 2020"
  const resMatch = str.match(/(?:RES\.?|RESOLUCIÓN|RESOLUCION)\s*([0-9A-Za-z\s]+)/i);
  let resolucion = null;
  if (resMatch) {
    resolucion = resMatch[0].trim();
  }

  // Las páginas son la parte antes de la resolución o si hay números / rangos
  let paginas = str;
  if (resolucion) {
    paginas = str.replace(resolucion, '').replace(/[-,\s]+$/, '').trim();
  }
  if (!paginas) paginas = str;

  return { paginas, resolucion };
}

async function main() {
  console.log('=== PREPARACIÓN DE ACTUALIZACIÓN DE MANUAL DE FUNCIONES ===');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const sheet = wb.getWorksheet(1);

  const updates = [];
  const manualesIndex = [];

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

    updates.push({
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
      manualesIndex.push({
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

  console.log(`Total registros procesados: ${updates.length}`);
  console.log('Muestra de 3 registros procesados:');
  for (let i = 0; i < 3; i++) {
    const u = updates[i];
    console.log(`\n[${i + 1}] SIDEAP: ${u.id_sideap} | ${u.cargo} (${u.codigo}-${u.grado})`);
    console.log(`  Propósito: ${u.proposito.substring(0, 60)}...`);
    console.log(`  Funciones: ${u.funciones.length} funciones encontradas`);
    console.log(`  1ª función: ${u.funciones[0] ? u.funciones[0].substring(0, 50) : 'N/A'}...`);
    console.log(`  Estudio: ${u.requisitos_formacion.substring(0, 50)}...`);
    console.log(`  Experiencia: ${u.requisitos_experiencia.substring(0, 50)}... (Meses: ${u.meses_experiencia})`);
    console.log(`  Manual: ${u.manual_funciones} | Res: ${u.resolucion_manual}`);
    console.log(`  PDF: ${u.archivo_pdf}`);
  }

  // Comprobar estado en la base de datos
  const dbCheck = await pool.query(`
    SELECT count(*) as total,
           count(proposito) as con_proposito,
           count(requisitos_formacion) as con_formacion,
           count(requisitos_experiencia) as con_experiencia,
           count(manual_funciones) as con_manual
    FROM public.planta_personal_sjd
  `);
  console.log('\nEstado actual en BD:', dbCheck.rows[0]);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
