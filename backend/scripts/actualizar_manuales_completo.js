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

function parseFunctionsRobust(funcionesText) {
  if (!funcionesText || typeof funcionesText !== 'string') return [];
  
  // Normalizar caracteres especiales de espacio y saltos
  const limpio = funcionesText.replace(/[\r\t]+/g, ' ').trim();
  
  // Dividir cuando un número de función aparezca al inicio, tras salto o tras punto/espacio
  const chunks = limpio.split(/(?=(?:^|\n|[\.\s])\d+[\.\)]\s*[A-ZÁÉÍÓÚÑ])/g);
  
  const result = [];
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    // Quitar el número del inicio para tener el texto limpio de la función
    const textoLimpio = trimmed.replace(/^\d+[\.\)]\s*/, '').trim();
    if (textoLimpio.length > 5) {
      result.push(textoLimpio);
    }
  }
  
  return result.length > 0 ? result : [limpio];
}

function parseMesesExperiencia(expText) {
  if (!expText) return null;
  const str = String(expText).toLowerCase();

  // Caso: no requiere
  if (str.includes('no requiere') || str.includes('no aplica')) return 0;

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
  if (str.includes('seis (6) años') || str.includes('seis años') || str.includes('6 años')) return 72;
  if (str.includes('seis (6) meses') || str.includes('seis meses')) return 6;

  return null;
}

function parseResolucion(paginasResolucion) {
  if (!paginasResolucion) return { paginas: null, resolucion: null };
  const str = String(paginasResolucion).trim();
  
  const resMatch = str.match(/(?:RES\.?|RESOLUCIÓN|RESOLUCION)\s*([0-9A-Za-z\s]+)/i);
  let resolucion = null;
  if (resMatch) {
    resolucion = resMatch[0].trim();
  }

  let paginas = str;
  if (resolucion) {
    paginas = str.replace(resolucion, '').replace(/[-,\s]+$/, '').trim();
  }
  if (!paginas) paginas = str;

  return { paginas, resolucion };
}

async function main() {
  console.log('--- 1. LEER EXCEL ACTUALIZADO Y PARSEAR CON PARSER ROBUSTO ---');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const sheet = wb.getWorksheet(1);

  const datosActualizados = new Map();
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

    const funcionesArray = parseFunctionsRobust(funcionesRaw);
    const meses = parseMesesExperiencia(requisitos_experiencia);
    const { paginas, resolucion } = parseResolucion(paginas_resolucion);

    const partesReq = [];
    if (requisitos_estudio) partesReq.push(`Formación: ${requisitos_estudio}`);
    if (requisitos_experiencia) partesReq.push(`Experiencia: ${requisitos_experiencia}`);
    const requisitosConsolidados = partesReq.join('\n\n');

    const item = {
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
    };

    if (id_sideap) {
      datosActualizados.set(id_sideap, item);
      if (archivo_pdf) {
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
  }

  console.log(`Leídos ${datosActualizados.size} cargos únicos del Excel.`);

  console.log('\n--- 2. ACTUALIZAR BASE DE DATOS POSTGRESQL ---');
  let actualizadosBD = 0;
  for (const [id_sideap, d] of datosActualizados.entries()) {
    const res = await pool.query(`
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
        dependencia_cargo = $10,
        archivo_pdf = $9,
        updated_at = NOW()
      WHERE id_sideap = $11
      RETURNING id_plaza
    `, [
      d.proposito || null,
      JSON.stringify(d.funciones),
      d.requisitos || null,
      d.requisitos_formacion || null,
      d.requisitos_experiencia || null,
      d.meses_experiencia,
      d.manual_funciones || null,
      d.resolucion_manual || null,
      d.archivo_pdf || null,
      d.dependencia || null,
      id_sideap
    ]);
    if (res.rowCount > 0) actualizadosBD += res.rowCount;
  }
  console.log(`Plazas actualizadas en BD: ${actualizadosBD}`);

  console.log('\n--- 3. ACTUALIZAR manualesIndex.json PARA EL VISOR PDF ---');
  const frontendIndexPath = path.join(__dirname, '../../frontend/lib/manualesIndex.json');
  fs.writeFileSync(frontendIndexPath, JSON.stringify(manualesParaFrontend, null, 2), 'utf8');
  console.log(`manualesIndex.json actualizado.`);

  console.log('\n--- 4. ACTUALIZAR plantaMockData.json PARA SINCRONIZACIÓN FRONTEND COMPLETA ---');
  const mockPath = path.join(__dirname, '../../frontend/lib/plantaMockData.json');
  if (fs.existsSync(mockPath)) {
    const rawMock = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    let mockActualizados = 0;

    const mockActualizado = rawMock.map(p => {
      const actual = p.id_sideap ? datosActualizados.get(Number(p.id_sideap)) : null;
      if (actual) {
        mockActualizados++;
        return {
          ...p,
          proposito: actual.proposito || p.proposito,
          funciones: actual.funciones || p.funciones,
          requisitos: actual.requisitos || p.requisitos,
          requisitos_formacion: actual.requisitos_formacion || '',
          requisitos_experiencia: actual.requisitos_experiencia || '',
          meses_experiencia: actual.meses_experiencia,
          manual_funciones: actual.manual_funciones || p.manual_funciones,
          resolucion_manual: actual.resolucion_manual || p.resolucion_manual,
          archivo_pdf: actual.archivo_pdf || '',
        };
      }
      return p;
    });

    fs.writeFileSync(mockPath, JSON.stringify(mockActualizado, null, 2), 'utf8');
    console.log(`plantaMockData.json sincronizado con éxito (${mockActualizados} plazas actualizadas con funciones separadas y requisitos completos).`);
  }

  console.log('\n--- VERIFICACIÓN DE EJEMPLO PARA SIDEAP 5016 (Foto del usuario) ---');
  const verif = await pool.query('SELECT id_plaza, id_sideap, cargo, funciones, requisitos_experiencia, meses_experiencia FROM public.planta_personal_sjd WHERE id_sideap = 5016');
  console.log(JSON.stringify(verif.rows[0], null, 2));

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  pool.end();
});
