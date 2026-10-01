/**
 * Script de importación de la Planta Oficial SJD desde PLANTA.xlsx
 * Pobla tanto la tabla de cargos de validación (ingreso_cargos)
 * como la tabla de plazas de personal (planta_personal_sjd).
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const ExcelJS = require('exceljs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER || 'sasge',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'sasge_db',
  password: process.env.PGPASSWORD || '.Secjur-2026**',
  port: parseInt(process.env.PGPORT || '5432', 10),
});

function parseFunctions(funcionesText) {
  if (!funcionesText || typeof funcionesText !== 'string') return [];
  // Separar por números de función (ej. "1. ", "2. ", etc.) o saltos de línea
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

function estimateExperienceMonths(nivel, codigo, grado, requisitosText) {
  const text = (requisitosText || '').toLowerCase();
  
  // Buscar coincidencia explícita de meses
  const matchMeses = text.match(/(\d+)\s*meses/i);
  if (matchMeses) return parseFloat(matchMeses[1]);

  const matchAnios = text.match(/(\d+)\s*a[ñn]os?\s+de\s+experiencia/i);
  if (matchAnios) return parseFloat(matchAnios[1]) * 12;

  // Por defecto según manual oficial SJD / Decreto 1083
  const codNum = parseInt(codigo, 10);
  const gradoNum = parseInt(grado, 10);
  const nivelUp = (nivel || '').toUpperCase();

  if (nivelUp.includes('DIRECTIV') || nivelUp.includes('ASESOR') || codNum === 105 || codNum === 115) {
    return 54;
  }
  if (codNum === 222) { // Profesional Especializado
    return gradoNum >= 24 ? 54 : 36;
  }
  if (codNum === 219) { // Profesional Universitario
    return gradoNum >= 15 ? 24 : 12;
  }
  if (codNum === 314) { // Técnico
    return 12;
  }
  return 0; // Asistenciales
}

function getCellValue(cell) {
  if (!cell) return null;
  const val = cell.value;
  if (val && typeof val === 'object') {
    if ('result' in val) return val.result;
    if ('text' in val) return val.text;
  }
  return val;
}

async function runImport() {
  let filePath = path.resolve(__dirname, 'PLANTA.xlsx');
  if (!fs.existsSync(filePath)) {
    filePath = path.resolve(__dirname, '../Scratch/PLANTA.xlsx');
  }
  console.log('Ruta de archivo Excel:', filePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheetCargos = wbSheet(workbook, 'PLANTA SJD');
  const sheetPersonas = wbSheet(workbook, 'PLANTA SJD (2)');

  if (!sheetCargos) {
    throw new Error("No se encontró la hoja 'PLANTA SJD' en el Excel.");
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Crear tabla de planta_personal_sjd si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.planta_personal_sjd (
          id_plaza INT PRIMARY KEY,
          id_sideap INT,
          id_perno INT,
          nivel TEXT,
          cargo TEXT NOT NULL,
          codigo TEXT,
          grado TEXT,
          dependencia_cargo TEXT,
          dependencia_funcional TEXT,
          proposito TEXT,
          funciones JSONB DEFAULT '[]'::jsonb,
          requisitos TEXT,
          asignacion_basica NUMERIC(14, 2) DEFAULT 0,
          titular_cedula TEXT,
          titular_nombre TEXT,
          tipo_vinculacion TEXT,
          situacion_administrativa TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ Tabla planta_personal_sjd verificada/creada.');

    // 2. Procesar las 170 plazas de personal
    let plazasCount = 0;
    const cargosMap = new Map();

    for (let r = 5; r <= 174; r++) {
      const rowC = sheetCargos.getRow(r);
      const rowP = sheetPersonas ? sheetPersonas.getRow(r) : null;

      const idPlaza = parseInt(getCellValue(rowC.getCell(1)), 10);
      const cargoNom = getCellValue(rowC.getCell(5));
      if (!idPlaza || !cargoNom) continue;

      const idSideap = parseInt(getCellValue(rowC.getCell(2)), 10) || null;
      const idPerno = parseInt(getCellValue(rowC.getCell(3)), 10) || null;
      const nivel = String(getCellValue(rowC.getCell(4)) || '').trim();
      const codigo = String(getCellValue(rowC.getCell(6)) || '').trim();
      const grado = String(getCellValue(rowC.getCell(7)) || '').trim();
      const depCargo = String(getCellValue(rowC.getCell(8)) || '').trim();
      const depFunc = String(getCellValue(rowC.getCell(9)) || '').trim();
      const proposito = String(getCellValue(rowC.getCell(10)) || '').trim();
      const funcionesRaw = String(getCellValue(rowC.getCell(11)) || '').trim();
      const requisitosRaw = String(getCellValue(rowC.getCell(12)) || '').trim();
      const asignacion = parseFloat(getCellValue(rowC.getCell(14))) || 0;

      // Datos de la persona titular de la plaza
      let titularCedula = '';
      let titularNombre = '';
      let tipoVinc = '';
      let situacionAdmin = '';

      if (rowP) {
        titularCedula = String(getCellValue(rowP.getCell(4)) || '').trim();
        titularNombre = String(getCellValue(rowP.getCell(5)) || '').trim();
        tipoVinc = String(getCellValue(rowP.getCell(6)) || '').trim();
        situacionAdmin = String(getCellValue(rowP.getCell(14)) || '').trim();
      }

      const funcionesArr = parseFunctions(funcionesRaw);

      // Guardar plaza en planta_personal_sjd
      await client.query(`
        INSERT INTO public.planta_personal_sjd (
          id_plaza, id_sideap, id_perno, nivel, cargo, codigo, grado,
          dependencia_cargo, dependencia_funcional, proposito, funciones,
          requisitos, asignacion_basica, titular_cedula, titular_nombre,
          tipo_vinculacion, situacion_administrativa, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        ON CONFLICT (id_plaza) DO UPDATE SET
          id_sideap = EXCLUDED.id_sideap,
          id_perno = EXCLUDED.id_perno,
          nivel = EXCLUDED.nivel,
          cargo = EXCLUDED.cargo,
          codigo = EXCLUDED.codigo,
          grado = EXCLUDED.grado,
          dependencia_cargo = EXCLUDED.dependencia_cargo,
          dependencia_funcional = EXCLUDED.dependencia_funcional,
          proposito = EXCLUDED.proposito,
          funciones = EXCLUDED.funciones,
          requisitos = EXCLUDED.requisitos,
          asignacion_basica = EXCLUDED.asignacion_basica,
          titular_cedula = EXCLUDED.titular_cedula,
          titular_nombre = EXCLUDED.titular_nombre,
          tipo_vinculacion = EXCLUDED.tipo_vinculacion,
          situacion_administrativa = EXCLUDED.situacion_administrativa,
          updated_at = NOW();
      `, [
        idPlaza, idSideap, idPerno, nivel, cargoNom, codigo, grado,
        depCargo, depFunc, proposito, JSON.stringify(funcionesArr),
        requisitosRaw, asignacion, titularCedula, titularNombre,
        tipoVinc, situacionAdmin
      ]);

      plazasCount++;

      // Agrupar perfil para ingreso_cargos
      const cargoKey = `${cargoNom.toUpperCase()}|${codigo}|${grado}|${depCargo.toUpperCase()}`;
      if (!cargosMap.has(cargoKey)) {
        const mesesExp = estimateExperienceMonths(nivel, codigo, grado, requisitosRaw);
        cargosMap.set(cargoKey, {
          nombre: cargoNom,
          codigo: codigo,
          grado: grado,
          dependencia: depCargo,
          requisito_experiencia_meses: mesesExp,
          requisitos_formacion: requisitosRaw,
          funciones_cargo: funcionesArr
        });
      }
    }

    console.log(`✓ Se sincronizaron ${plazasCount} plazas de personal en 'planta_personal_sjd'.`);

    // 3. Insertar / Actualizar los perfiles en ingreso_cargos
    let cargosCount = 0;
    for (const [key, cargo] of cargosMap.entries()) {
      // Verificar si ya existe un cargo con el mismo nombre, código, grado y dependencia
      const findRes = await client.query(`
        SELECT id FROM public.ingreso_cargos
        WHERE UPPER(nombre) = UPPER($1) AND codigo = $2 AND grado = $3 AND UPPER(dependencia) = UPPER($4)
        LIMIT 1;
      `, [cargo.nombre, cargo.codigo, cargo.grado, cargo.dependencia]);

      if (findRes.rows.length > 0) {
        // Actualizar funciones y requisitos
        await client.query(`
          UPDATE public.ingreso_cargos
          SET funciones_cargo = $1,
              requisitos_formacion = $2,
              requisito_experiencia_meses = COALESCE(NULLIF(requisito_experiencia_meses, 0), $3),
              updated_at = NOW()
          WHERE id = $4;
        `, [
          JSON.stringify(cargo.funciones_cargo),
          cargo.requisitos_formacion,
          cargo.requisito_experiencia_meses,
          findRes.rows[0].id
        ]);
      } else {
        // Insertar nuevo cargo
        await client.query(`
          INSERT INTO public.ingreso_cargos (
            nombre, codigo, grado, dependencia, requisito_experiencia_meses, requisitos_formacion, funciones_cargo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [
          cargo.nombre,
          cargo.codigo,
          cargo.grado,
          cargo.dependencia,
          cargo.requisito_experiencia_meses,
          cargo.requisitos_formacion,
          JSON.stringify(cargo.funciones_cargo)
        ]);
      }
      cargosCount++;
    }

    console.log(`✓ Se sincronizaron ${cargosCount} perfiles de cargo oficiales en 'ingreso_cargos'.`);

    await client.query('COMMIT');
    console.log('--- Importación finalizada con éxito total ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error durante la importación:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

function wbSheet(wb, name) {
  const exact = wb.getWorksheet(name);
  if (exact) return exact;
  return wb.worksheets.find(s => s.name.trim().toLowerCase() === name.trim().toLowerCase());
}

runImport().catch(err => {
  console.error('Fallo de ejecución:', err.message);
  process.exit(1);
});
