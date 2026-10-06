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

function getVal(cell) {
  if (!cell) return null;
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    if ('result' in v) return v.result;
    if ('text' in v) return v.text;
  }
  return v;
}

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

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Agregar columnas si no existen y eliminar constraint UNIQUE indebido en titular_cedula
    await client.query(`
      ALTER TABLE public.planta_personal_sjd 
        DROP CONSTRAINT IF EXISTS planta_personal_sjd_titular_cedula_key;

      ALTER TABLE public.planta_personal_sjd 
        ADD COLUMN IF NOT EXISTS estado_cargo TEXT DEFAULT 'OCUPADO',
        ADD COLUMN IF NOT EXISTS encargo_cedula TEXT,
        ADD COLUMN IF NOT EXISTS encargo_nombre TEXT,
        ADD COLUMN IF NOT EXISTS es_encargo BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS situacion_titular TEXT,
        ADD COLUMN IF NOT EXISTS tipo_funcionario TEXT,
        ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
        ADD COLUMN IF NOT EXISTS direccion TEXT,
        ADD COLUMN IF NOT EXISTS telefono TEXT,
        ADD COLUMN IF NOT EXISTS sexo TEXT,
        ADD COLUMN IF NOT EXISTS fondo_salud TEXT,
        ADD COLUMN IF NOT EXISTS fondo_pension TEXT,
        ADD COLUMN IF NOT EXISTS fondo_cesantias TEXT,
        ADD COLUMN IF NOT EXISTS fecha_ingreso_entidad DATE,
        ADD COLUMN IF NOT EXISTS fecha_ingreso_distrito DATE,
        ADD COLUMN IF NOT EXISTS tipo_nombramiento TEXT,
        ADD COLUMN IF NOT EXISTS acto_nombramiento TEXT,
        ADD COLUMN IF NOT EXISTS numero_acto_nombramiento TEXT,
        ADD COLUMN IF NOT EXISTS fecha_acto_nombramiento DATE,
        ADD COLUMN IF NOT EXISTS total_devengado NUMERIC(14, 2);
    `);

    // 2. Leer Excel
    let filePath = path.resolve(__dirname, '../Scratch/PLANTA.xlsx');
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve(__dirname, './PLANTA.xlsx');
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    const sheetPlanta = wb.getWorksheet('PLANTA SJD (2)') || wb.getWorksheet('PLANTA SJD');
    const sheetPerno = wb.getWorksheet('PLANTA PERNO');

    console.log('Procesando hoja PLANTA SJD (2)...');
    let plazasCount = 0;

    for (let r = 5; r <= 174; r++) {
      const row = sheetPlanta.getRow(r);
      const idPlaza = parseInt(getVal(row.getCell(1)), 10);
      if (!idPlaza) continue;

      const idSideap = parseInt(getVal(row.getCell(2)), 10) || null;
      const idPerno = parseInt(getVal(row.getCell(3)), 10) || null;

      // Ocupante actual (desempeña la plaza)
      let cedulaActual = String(getVal(row.getCell(4)) || '').trim();
      let nombreActual = String(getVal(row.getCell(5)) || '').trim();
      const tipoVinculacion = String(getVal(row.getCell(6)) || '').trim();
      
      let situacionAdmin = String(getVal(row.getCell(13)) || '').trim();
      if (situacionAdmin === '[object Object]') situacionAdmin = '';

      let situacionTitular = String(getVal(row.getCell(14)) || '').trim();
      if (situacionTitular === '[object Object]') situacionTitular = '';

      // Titular del cargo
      let titularCedula = String(getVal(row.getCell(15)) || '').trim();
      let titularNombre = String(getVal(row.getCell(16)) || '').trim();

      // Estado del cargo
      let estadoCargo = String(getVal(row.getCell(25)) || '').trim().toUpperCase();
      if (!estadoCargo || estadoCargo.includes('IF(') || estadoCargo.includes('[OBJECT')) {
        if (nombreActual.includes('VACANTE DEFINITIVA') || titularNombre.includes('VACANTE DEFINITIVA')) {
          estadoCargo = 'VACANTE DEFINITIVA';
        } else if (nombreActual.includes('VACANTE TEMPORAL') || titularNombre.includes('VACANTE TEMPORAL')) {
          estadoCargo = 'VACANTE TEMPORAL';
        } else if (nombreActual || titularNombre) {
          estadoCargo = 'OCUPADO';
        } else {
          estadoCargo = 'VACANTE DEFINITIVA';
        }
      }

      // Detectar encargo:
      // Si situación admin es ENCARGO o si hay alguien desempeñando el puesto diferente del titular
      let esEncargo = false;
      let encargoNombre = null;
      let encargoCedula = null;

      const normActual = nombreActual.toUpperCase();
      const normTitular = titularNombre.toUpperCase();
      const esVacante = normActual.includes('VACANTE') || normTitular.includes('VACANTE');

      if (situacionAdmin.toUpperCase() === 'ENCARGO' || situacionTitular.toUpperCase() === 'EN ENCARGO') {
        esEncargo = true;
      } else if (!esVacante && normActual && normTitular && normActual !== normTitular) {
        esEncargo = true;
      }

      if (esEncargo) {
        if (!normActual.includes('VACANTE') && nombreActual) {
          encargoNombre = nombreActual;
          encargoCedula = cedulaActual;
        }
      }

      // Si titularNombre es vacío pero nombreActual tiene nombre (y no es vacante)
      if ((!titularNombre || titularNombre.includes('VACANTE')) && !esEncargo && !normActual.includes('VACANTE')) {
        titularNombre = nombreActual;
        titularCedula = cedulaActual;
      }

      titularCedula = titularCedula ? titularCedula : null;
      encargoCedula = encargoCedula ? encargoCedula : null;

      const nivel = String(getVal(row.getCell(26)) || '').trim().toUpperCase();
      const cargoNom = String(getVal(row.getCell(27)) || '').trim().toUpperCase();
      const codigo = String(getVal(row.getCell(28)) || '').trim();
      const grado = String(getVal(row.getCell(29)) || '').trim();
      const depCargo = String(getVal(row.getCell(31)) || '').trim().toUpperCase();
      const depFuncional = String(getVal(row.getCell(32)) || depCargo).trim().toUpperCase();
      const proposito = String(getVal(row.getCell(33)) || '').trim();
      const funcionesRaw = String(getVal(row.getCell(34)) || '').trim();
      const requisitos = String(getVal(row.getCell(35)) || '').trim();
      const asignacion = parseFloat(getVal(row.getCell(37))) || 0;

      await client.query(`
        INSERT INTO public.planta_personal_sjd (
          id_plaza, id_sideap, id_perno, nivel, cargo, codigo, grado,
          dependencia_cargo, dependencia_funcional, proposito, funciones,
          requisitos, asignacion_basica, estado_cargo,
          titular_cedula, titular_nombre, situacion_titular,
          encargo_cedula, encargo_nombre, es_encargo,
          tipo_vinculacion, situacion_administrativa, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16, $17,
          $18, $19, $20,
          $21, $22, NOW()
        )
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
          estado_cargo = EXCLUDED.estado_cargo,
          titular_cedula = EXCLUDED.titular_cedula,
          titular_nombre = EXCLUDED.titular_nombre,
          situacion_titular = EXCLUDED.situacion_titular,
          encargo_cedula = EXCLUDED.encargo_cedula,
          encargo_nombre = EXCLUDED.encargo_nombre,
          es_encargo = EXCLUDED.es_encargo,
          tipo_vinculacion = EXCLUDED.tipo_vinculacion,
          situacion_administrativa = EXCLUDED.situacion_administrativa,
          updated_at = NOW();
      `, [
        idPlaza, idSideap, idPerno, nivel, cargoNom, codigo, grado,
        depCargo, depFuncional, proposito, JSON.stringify(parseFunctions(funcionesRaw)),
        requisitos, asignacion, estadoCargo,
        titularCedula, titularNombre, situacionTitular,
        encargoCedula, encargoNombre, esEncargo,
        tipoVinculacion, situacionAdmin
      ]);

      plazasCount++;
    }

    console.log(`✓ Sincronizadas ${plazasCount} plazas.`);

    // 3. Enriquecer con Planta Perno
    let pernoCount = 0;
    if (sheetPerno) {
      for (let r = 10; r <= sheetPerno.rowCount; r++) {
        const row = sheetPerno.getRow(r);
        const cedula = String(getVal(row.getCell(1)) || '').trim();
        if (!cedula) continue;

        const tipoFunc = String(getVal(row.getCell(15)) || '').trim();
        const dir = String(getVal(row.getCell(7)) || '').trim();
        const tel = String(getVal(row.getCell(8)) || '').trim();
        const sexo = String(getVal(row.getCell(9)) || '').trim();
        const eps = String(getVal(row.getCell(20)) || '').trim();
        const pension = String(getVal(row.getCell(22)) || '').trim();
        const cesantias = String(getVal(row.getCell(24)) || '').trim();
        const tipoNomb = String(getVal(row.getCell(34)) || '').trim();
        const actoNomb = String(getVal(row.getCell(35)) || '').trim();
        const numActo = String(getVal(row.getCell(37)) || '').trim();
        const totalDevengado = parseFloat(getVal(row.getCell(43))) || null;

        const u = await client.query(`
          UPDATE public.planta_personal_sjd SET
            tipo_funcionario = $1, direccion = $2, telefono = $3, sexo = $4,
            fondo_salud = $5, fondo_pension = $6, fondo_cesantias = $7,
            tipo_nombramiento = $8, acto_nombramiento = $9, numero_acto_nombramiento = $10,
            total_devengado = COALESCE($11, total_devengado),
            updated_at = NOW()
          WHERE titular_cedula = $12 OR encargo_cedula = $12
        `, [tipoFunc, dir, tel, sexo, eps, pension, cesantias, tipoNomb, actoNomb, numActo, totalDevengado, cedula]);

        if (u.rowCount > 0) pernoCount += u.rowCount;
      }
      console.log(`✓ Enriquecidas plazas con Planta Perno: ${pernoCount} coincidencias.`);
    }

    await client.query('COMMIT');
    console.log('¡Sincronización completada con éxito!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error durante sincronización:', e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
