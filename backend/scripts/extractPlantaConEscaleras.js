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
  const wbPlanta = new ExcelJS.Workbook();
  const plantaPath = path.resolve(__dirname, '../../Scratch/Plantilla_Planta_Oficial_SJD.xlsx');
  await wbPlanta.xlsx.readFile(plantaPath);
  const wsPlanta = wbPlanta.getWorksheet('PLANTA SJD (2)');

  // Mapear perno por cédula desde archivo PERNO oficial si existe
  const pernoMap = new Map();
  const pernoPath = path.resolve(__dirname, '../../Scratch/Plantilla_Planta_Perno_SJD.xlsx');
  if (fs.existsSync(pernoPath)) {
    const wbPerno = new ExcelJS.Workbook();
    await wbPerno.xlsx.readFile(pernoPath);
    const wsPerno = wbPerno.getWorksheet('PLANTA PERNO');
    if (wsPerno) {
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
    }
  }

  const list = [];
  for (let r = 5; r <= wsPlanta.rowCount; r++) {
    const row = wsPlanta.getRow(r);
    const idPlaza = parseInt(getV(row.getCell(1)), 10);
    if (!idPlaza) continue;

    const idSideap = parseInt(getV(row.getCell(2)), 10) || null;
    const idPerno = parseInt(getV(row.getCell(3)), 10) || null;

    // Columna 4 y 5: Ocupante actual (en propiedad, en encargo o en provisionalidad)
    const ocupanteCedula = cleanDoc(getV(row.getCell(4)));
    const ocupanteNombre = cleanText(getV(row.getCell(5)));

    // Columna 6 y 7: Vinculación a la entidad y al cargo
    const vinculacionEntidad = cleanText(getV(row.getCell(6)));
    const tipoVinculacion = cleanText(getV(row.getCell(7))) || vinculacionEntidad;

    // Columna 8 y 9: Fechas ingreso
    const fechaIngresoEntidad = getV(row.getCell(8));
    const fechaIngresoDistrito = getV(row.getCell(9));

    // Columna 10 y 11: Sexo y edad
    const sexo = cleanText(getV(row.getCell(10)));
    const edad = parseInt(getV(row.getCell(11)), 10) || null;

    // Columna 12: Situación administrativa del ocupante actual
    const situacionAdmin = cleanText(getV(row.getCell(12)));

    // Columna 13: Situación administrativa del titular del cargo
    const situacionTitular = cleanText(getV(row.getCell(13)));

    // Columna 14 y 15: Titular propio de la plaza (en propiedad o VACANTE DEFINITIVA)
    const rawTitularCedula = cleanDoc(getV(row.getCell(14)));
    const rawTitularNombre = cleanText(getV(row.getCell(15)));

    // Columna 16 y 17: Escalera de Encargos (ID-E y N)
    const idE = cleanText(getV(row.getCell(16))) || null;
    const n = parseInt(getV(row.getCell(17)), 10) || null;
    const idEscalera = idE ? idE.toUpperCase() : null;
    const peldanoEscalera = n;

    // Columnas 18 a 21: Situaciones especiales
    const pv = cleanText(getV(row.getCell(18))) || null; // Col 18 (R): Provisionalidad
    const ppOe = cleanText(getV(row.getCell(19))) || null; // Col 19 (S): Periodo de prueba otra entidad
    const vtLm = cleanText(getV(row.getCell(20))) || null; // Col 20 (T): Licencia maternidad
    const vtLnr = cleanText(getV(row.getCell(21))) || null; // Col 21 (U): Licencia no remunerada

    // Columna 22: OPEC
    const opec = cleanText(getV(row.getCell(22))) || null;

    // Columna 23: Estado del cargo
    let estadoCargo = cleanText(getV(row.getCell(23))).toUpperCase();
    if (!estadoCargo || estadoCargo.includes('IF(') || estadoCargo.includes('[OBJECT')) {
      if (rawTitularNombre === 'VACANTE DEFINITIVA' || situacionTitular === 'VACANTE DEFINITIVA') {
        estadoCargo = 'VACANTE DEFINITIVA';
      } else if (ocupanteNombre === 'VACANTE TEMPORAL' || situacionAdmin === 'VACANTE TEMPORAL' || tipoVinculacion === 'VACANTE TEMPORAL') {
        estadoCargo = 'VACANTE TEMPORAL';
      } else if (ocupanteNombre) {
        estadoCargo = 'OCUPADO';
      } else {
        estadoCargo = 'VACANTE DEFINITIVA';
      }
    }

    // Columna 24 a 27: Estructura del cargo
    const nivel = cleanText(getV(row.getCell(24))).toUpperCase();
    const cargoNom = cleanText(getV(row.getCell(25))).toUpperCase();
    const codigo = cleanText(getV(row.getCell(26)));
    const grado = cleanText(getV(row.getCell(27)));

    // Columna 29 y 30: Dependencias
    const depCargo = cleanText(getV(row.getCell(29))).toUpperCase();
    const depFuncionalRaw = cleanText(getV(row.getCell(30)));
    const depFuncional = depFuncionalRaw ? depFuncionalRaw.toUpperCase() : depCargo;

    // Columna 31: Propósito
    const proposito = cleanText(getV(row.getCell(31)));

    // Columna 32: Funciones
    const funcionesRaw = String(getV(row.getCell(32)) || '');
    const funcionesFinales = parseFunctions(funcionesRaw);

    // Columna 33: Requisitos
    const requisitos = cleanText(getV(row.getCell(33)));

    // Columna 34: Páginas Manual de Funciones / Resolución
    const resolucionManual = cleanText(getV(row.getCell(34))) || null;

    // Columna 35: Asignación básica
    const asignacion = parseFloat(getV(row.getCell(35))) || 0;

    // Determinar Titular del Empleo con máxima precisión
    let titularCedula = rawTitularCedula;
    let titularNombre = rawTitularNombre;

    if (!titularNombre || titularNombre === 'VACANTE DEFINITIVA' || situacionTitular === 'VACANTE DEFINITIVA') {
      titularNombre = 'VACANTE DEFINITIVA';
      titularCedula = null;
    } else if (!titularNombre && ocupanteNombre && ocupanteNombre !== 'VACANTE TEMPORAL') {
      titularNombre = ocupanteNombre;
      titularCedula = ocupanteCedula;
    }

    // Encargo / Ocupante de la Plaza:
    // Ocurre si hay una escalera (id_escalera), situación es ENCARGO, o titular != ocupante
    const esEncargo = Boolean(
      idEscalera ||
      tipoVinculacion.toUpperCase().includes('ENCARGO') ||
      situacionAdmin.toUpperCase().includes('ENCARGO') ||
      situacionTitular.toUpperCase().includes('ENCARGO') ||
      (ocupanteCedula && titularCedula && ocupanteCedula !== titularCedula) ||
      (ocupanteNombre === 'VACANTE TEMPORAL')
    );

    let encargoCedula = null;
    let encargoNombre = null;

    if (esEncargo) {
      if (ocupanteNombre === 'VACANTE TEMPORAL') {
        encargoCedula = null;
        encargoNombre = 'VACANTE TEMPORAL';
      } else if (ocupanteNombre && ocupanteNombre !== 'VACANTE DEFINITIVA') {
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
      situacion_titular: situacionTitular || (titularNombre === 'VACANTE DEFINITIVA' ? 'VACANTE DEFINITIVA' : 'EN PROPIEDAD'),
      tipo_vinculacion: tipoVinculacion || vinculacionEntidad || null,
      situacion_administrativa: situacionAdmin || (esEncargo ? 'ENCARGO' : 'EN PROPIEDAD'),
      encargo_cedula: encargoCedula,
      encargo_nombre: encargoNombre,
      es_encargo: esEncargo,
      opec: opec,
      id_escalera: idEscalera,
      peldano_escalera: peldanoEscalera,
      pv: pv,
      pp_oe: ppOe,
      vt_lm: vtLm,
      vt_lnr: vtLnr,
      sexo: sexo || null,
      edad: edad || null
    };

    // Cruzar datos de PERNO si existe titular o encargado
    const cedulaParaPerno = encargoCedula || titularCedula;
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
