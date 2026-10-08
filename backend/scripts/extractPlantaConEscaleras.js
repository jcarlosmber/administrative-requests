const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

function getV(c) {
  if (!c) return null;
  const v = c.value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return v.result !== undefined ? v.result : (v.text || '');
  return v;
}

function cleanText(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  str = str
    .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú')
    .replace(/Ã /g, 'Á').replace(/Ã‰/g, 'É').replace(/Ã /g, 'Í').replace(/Ã“/g, 'Ó').replace(/Ãš/g, 'Ú')
    .replace(/Ã±/g, 'ñ').replace(/Ã‘/g, 'Ñ').replace(/SECRETARÃA/gi, 'SECRETARÍA').replace(/JURÃDICA/gi, 'JURÍDICA')
    .replace(/DIRECCIÃN/gi, 'DIRECCIÓN').replace(/ADMINISTRACIÃN/gi, 'ADMINISTRACIÓN').replace(/GESTIÃN/gi, 'GESTIÓN');
  return str.replace(/\s+/g, ' ').trim();
}

function cleanDoc(val) {
  if (val === null || val === undefined) return null;
  let str = String(val).trim();
  if (str.includes('.') && !isNaN(str) && Number(str) % 1 === 0) {
    str = String(Math.floor(Number(str)));
  }
  str = str.replace(/[\.,\s-]/g, '').trim();
  return str || null;
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
      if (current) current += ' ' + trimmed;
      else current = trimmed;
    }
  }
  if (current) result.push(current);
  return result.length > 0 ? result : [funcionesText.trim()];
}

async function run() {
  const wb = new ExcelJS.Workbook();
  const filePath = path.resolve(__dirname, '../../Scratch/PLANTA.xlsx');
  await wb.xlsx.readFile(filePath);
  const wsPlanta = wb.getWorksheet('PLANTA SJD (2)');
  const wsPerno = wb.getWorksheet('PLANTA PERNO');
  
  // Mapear perno por cédula
  const pernoMap = new Map();
  for (let r = 10; r <= wsPerno.rowCount; r++) {
    const row = wsPerno.getRow(r);
    const ced = cleanDoc(getV(row.getCell(1)));
    if (!ced) continue;
    pernoMap.set(ced, {
      tipo_funcionario: cleanText(getV(row.getCell(15))),
      direccion: cleanText(getV(row.getCell(7))),
      telefono: cleanText(getV(row.getCell(8))),
      sexo: cleanText(getV(row.getCell(9))),
      fondo_salud: cleanText(getV(row.getCell(20))),
      fondo_pension: cleanText(getV(row.getCell(22))),
      fondo_cesantias: cleanText(getV(row.getCell(24))),
      tipo_nombramiento: cleanText(getV(row.getCell(34))),
      acto_nombramiento: cleanText(getV(row.getCell(35))),
      numero_acto_nombramiento: cleanText(getV(row.getCell(37))),
      total_devengado: parseFloat(getV(row.getCell(43))) || null
    });
  }

  const list = [];
  for (let r = 5; r <= 174; r++) {
    const row = wsPlanta.getRow(r);
    const idPlaza = parseInt(getV(row.getCell(1)), 10);
    if (!idPlaza) continue;

    const idSideap = parseInt(getV(row.getCell(2)), 10) || null;
    const idPerno = parseInt(getV(row.getCell(3)), 10) || null;

    // Columna 4 y 5: Ocupante actual (en propiedad, en encargo o en provisionalidad)
    const ocupanteCedula = cleanDoc(getV(row.getCell(4)));
    const ocupanteNombre = cleanText(getV(row.getCell(5)));

    // Columna 6: Vinculación a la entidad
    const tipoVinculacion = cleanText(getV(row.getCell(6)));

    // Columna 13: Situación administrativa del ocupante actual
    const situacionAdmin = cleanText(getV(row.getCell(13)));

    // Columna 14: Situación administrativa del titular del cargo
    const situacionTitular = cleanText(getV(row.getCell(14)));

    // Columna 15 y 16: Titular propio de la plaza (en propiedad o VACANTE DEFINITIVA)
    const rawTitularCedula = cleanDoc(getV(row.getCell(15)));
    const rawTitularNombre = cleanText(getV(row.getCell(16)));

    // Columna 17 y 18: Escalera de Encargos
    const idE = cleanText(getV(row.getCell(17))) || null;
    const n = parseInt(getV(row.getCell(18)), 10) || null;
    const idEscalera = idE ? idE.toUpperCase() : null;
    const peldanoEscalera = n;

    // Columnas 19 a 22: Situaciones especiales de vacancia / provisión
    const pv = cleanText(getV(row.getCell(19))) || null; // Col S: Provisionalidad
    const ppOe = cleanText(getV(row.getCell(20))) || null; // Col T: Periodo de prueba otra entidad
    const vtLm = cleanText(getV(row.getCell(21))) || null; // Col U: Licencia maternidad
    const vtLnr = cleanText(getV(row.getCell(22))) || null; // Col V: Licencia no remunerada

    // Columna 23: OPEC
    const opec = cleanText(getV(row.getCell(23))) || null;

    // Columna 25: Estado del cargo
    let estadoCargo = cleanText(getV(row.getCell(25))).toUpperCase();
    if (!estadoCargo || estadoCargo.includes('IF(') || estadoCargo.includes('[OBJECT')) {
      if (rawTitularNombre === 'VACANTE DEFINITIVA' || situacionTitular === 'VACANTE DEFINITIVA') {
        estadoCargo = 'VACANTE DEFINITIVA';
      } else if (ocupanteNombre === 'VACANTE TEMPORAL' || situacionAdmin === 'VACANTE TEMPORAL') {
        estadoCargo = 'VACANTE TEMPORAL';
      } else if (ocupanteNombre) {
        estadoCargo = 'OCUPADO';
      } else {
        estadoCargo = 'VACANTE DEFINITIVA';
      }
    }

    // Columna 26 a 37: Estructura, Manual de Funciones y Resoluciones
    const nivel = cleanText(getV(row.getCell(26))).toUpperCase();
    const cargoNom = cleanText(getV(row.getCell(27))).toUpperCase();
    const codigo = cleanText(getV(row.getCell(28)));
    const grado = cleanText(getV(row.getCell(29)));
    const depCargo = cleanText(getV(row.getCell(31))).toUpperCase();
    const depFuncionalRaw = cleanText(getV(row.getCell(32))); // Col 32 (AF)
    const depFuncional = depFuncionalRaw ? depFuncionalRaw.toUpperCase() : depCargo;
    const proposito = cleanText(getV(row.getCell(33)));
    
    // Funciones: Unificar Columna AH (34) y Columna AF (32) si contiene funciones o resoluciones
    const funcionesRawAH = String(getV(row.getCell(34)) || ''); // Col 34 (AH)
    const funcionesRawAF = String(getV(row.getCell(32)) || ''); // Col 32 (AF)
    const funcsAH = parseFunctions(funcionesRawAH);
    let funcionesFinales = funcsAH;
    if (funcionesRawAF && (funcionesRawAF.length > 60 || /^\d+[\.\)]/.test(funcionesRawAF.trim()) || funcionesRawAF.toUpperCase().includes('RES.'))) {
      const funcsAF = parseFunctions(funcionesRawAF);
      funcionesFinales = Array.from(new Set([...funcsAH, ...funcsAF]));
    }

    const requisitos = cleanText(getV(row.getCell(35))); // Col 35 (AI)
    const resolucionManual = cleanText(getV(row.getCell(36))) || null; // Col 36 (AJ): Páginas Manual de Funciones / Resolución (ej: 34-37 RES. 085 de 2020)
    const asignacion = parseFloat(getV(row.getCell(37))) || 0; // Col 37 (AK)

    // Determinar con precisión Titular vs Ocupante / Encargo
    let titularCedula = rawTitularCedula;
    let titularNombre = rawTitularNombre;

    if (!titularNombre || titularNombre === 'VACANTE DEFINITIVA') {
      if (rawTitularNombre === 'VACANTE DEFINITIVA' || situacionTitular === 'VACANTE DEFINITIVA') {
        titularNombre = 'VACANTE DEFINITIVA';
        titularCedula = null;
      } else {
        titularNombre = ocupanteNombre || 'VACANTE DEFINITIVA';
        titularCedula = ocupanteCedula;
      }
    }

    // Encargo: ocurre si hay una escalera (id_escalera), o situación administrativa es ENCARGO o PROVISIONALIDAD
    const esEncargo = Boolean(
      idEscalera ||
      situacionAdmin.includes('ENCARGO') ||
      situacionTitular === 'EN ENCARGO' ||
      (ocupanteCedula && titularCedula && ocupanteCedula !== titularCedula)
    );

    let encargoCedula = null;
    let encargoNombre = null;

    if (esEncargo) {
      if (ocupanteNombre && ocupanteNombre !== 'VACANTE TEMPORAL') {
        encargoCedula = ocupanteCedula;
        encargoNombre = ocupanteNombre;
      }
    }

    const plazaObj = {
      id_plaza: idPlaza,
      id_sideap: idSideap,
      id_perno: idPerno,
      nivel: nivel,
      cargo: cargoNom,
      codigo: codigo,
      grado: grado,
      dependencia_cargo: depCargo,
      dependencia_funcional: depFuncional,
      proposito: proposito,
      funciones: funcionesFinales,
      requisitos: requisitos,
      resolucion_manual: resolucionManual,
      manual_funciones: resolucionManual,
      asignacion_basica: asignacion,
      estado_cargo: estadoCargo,
      titular_cedula: titularCedula || null,
      titular_nombre: titularNombre || null,
      situacion_titular: situacionTitular || 'EN PROPIEDAD',
      tipo_vinculacion: tipoVinculacion || null,
      situacion_administrativa: situacionAdmin || 'EN PROPIEDAD',
      encargo_cedula: encargoCedula,
      encargo_nombre: encargoNombre,
      es_encargo: esEncargo,
      opec: opec,
      id_escalera: idEscalera,
      peldano_escalera: peldanoEscalera,
      pv: pv,
      pp_oe: ppOe,
      vt_lm: vtLm,
      vt_lnr: vtLnr
    };

    // Cruzar datos de PERNO si existe titular o encargado
    const cedulaParaPerno = titularCedula || encargoCedula;
    if (cedulaParaPerno && pernoMap.has(cedulaParaPerno)) {
      const pernoInfo = pernoMap.get(cedulaParaPerno);
      Object.assign(plazaObj, pernoInfo);
    }

    list.push(plazaObj);
  }

  const outPath = path.resolve(__dirname, '../../frontend/lib/plantaMockData.json');
  fs.writeFileSync(outPath, JSON.stringify(list, null, 2), 'utf8');
  console.log('✅ Actualizadas ' + list.length + ' plazas en ' + outPath);
  const conEsc = list.filter(p => p.id_escalera);
  console.log('✅ Plazas con escalera en mock: ' + conEsc.length);
  const distinctEsc = new Set(conEsc.map(p => p.id_escalera));
  console.log('✅ Escaleras distintas: ' + distinctEsc.size + ' -> ' + Array.from(distinctEsc).sort().join(', '));
}

run().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
