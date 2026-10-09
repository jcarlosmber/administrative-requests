const ExcelJS = require('exceljs');

// Normalizador de texto para encabezados
function normH(val) {
  return String(val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

// Helper para obtener valor de celda en ExcelJS
function getVal(cell) {
  if (!cell) return null;
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    if (v.result !== undefined && v.result !== null) {
      const res = typeof v.result === 'object' ? (v.result.text || '') : v.result;
      return String(res).toLowerCase().includes('[object object]') ? '' : res;
    }
    if (v.text !== undefined && v.text !== null) {
      const txt = String(v.text).trim();
      return txt.toLowerCase().includes('[object object]') ? '' : txt;
    }
    if (Array.isArray(v.richText)) {
      return v.richText.map(t => t.text || '').join('');
    }
    if (cell.text !== undefined && cell.text !== null) {
      const ct = String(cell.text).trim();
      return ct.toLowerCase().includes('[object object]') ? '' : ct;
    }
    return '';
  }
  const strVal = String(v).trim();
  if (strVal.toLowerCase().includes('[object object]')) return '';
  return v;
}

// Limpiar cédulas/documentos
function cleanDoc(val) {
  if (val === null || val === undefined) return null;
  let str = String(val).trim();
  if (str.includes('.') && !isNaN(str) && Number(str) % 1 === 0) {
    str = String(Math.floor(Number(str)));
  }
  str = str.replace(/[\.,\s-]/g, '').trim();
  return str || null;
}

// Limpiar montos
function cleanMoney(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).replace(/[\$,\s]/g, '').trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

// Limpiar fechas (serial Excel o ISO/DD-MM-YYYY)
function cleanDate(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split('T')[0];
  }
  let num = null;
  if (typeof val === 'number') {
    num = val;
  } else if (typeof val === 'string' && /^\d{4,6}(\.\d+)?$/.test(val.trim())) {
    num = parseFloat(val.trim());
  }

  if (num !== null && !isNaN(num) && num > 1000 && num < 100000) {
    const msPerDay = 86400000;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + Math.round(num * msPerDay));
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  const latMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (latMatch) {
    return `${latMatch[3]}-${latMatch[2].padStart(2, '0')}-${latMatch[1].padStart(2, '0')}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

// Limpiar Mojibake
function cleanText(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (!str || str.toLowerCase().includes('[object object]')) return '';

  if (/[ÃÂâ]/.test(str)) {
    try {
      const decoded = Buffer.from(str, 'binary').toString('utf8');
      if (!decoded.includes('') && !/[ÃÂ]/.test(decoded)) {
        str = decoded;
      }
    } catch (e) {}
  }

  str = str
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã /g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã /g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ã”/g, 'Ô')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€“/g, '-')
    .replace(/â€”/g, '—')
    .replace(/SECRETARÃA/gi, 'SECRETARÍA')
    .replace(/JURÃDICA/gi, 'JURÍDICA')
    .replace(/JURÃDICO/gi, 'JURÍDICO')
    .replace(/DIRECCIÃN/gi, 'DIRECCIÓN')
    .replace(/ADMINISTRACIÃN/gi, 'ADMINISTRACIÓN')
    .replace(/GESTIÃN/gi, 'GESTIÓN')
    .replace(/PLANEACIÃN/gi, 'PLANEACIÓN')
    .replace(/INSPECCIÃN/gi, 'INSPECCIÓN')
    .replace(/COMISIÃN/gi, 'COMISIÓN')
    .replace(/DISCIPLINARIÃ/gi, 'DISCIPLINARIA')
    .replace(/VINCULACIÃN/gi, 'VINCULACIÓN')
    .replace(/SITUACIÃN/gi, 'SITUACIÓN')
    .replace(/ASIGNACIÃN/gi, 'ASIGNACIÓN')
    .replace(/ÃA/g, 'ÍA')
    .replace(/Ãa/g, 'ía')
    .replace(/ÃO/g, 'ÍO')
    .replace(/Ão/g, 'ío');

  return str.replace(/\s+/g, ' ').trim();
}

function cleanDependencia(val) {
  let dep = cleanText(val).toUpperCase();
  if (!dep) return '';

  if (dep.includes('DOCTRINA') && dep.includes('NORMATIV')) {
    return 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS';
  }
  if (dep.includes('DESPACHO') && (dep.includes('SECRETAR') || dep.includes('JURIDIC') || dep.includes('JURÍDIC'))) {
    return 'DESPACHO SECRETARÍA JURÍDICA DISTRITAL';
  }
  if (dep.includes('GESTION JUDICIAL') || dep.includes('GESTIÓN JUDICIAL')) {
    return 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL';
  }
  if (dep.includes('POLITICA JURIDICA') || dep.includes('POLÍTICA JURÍDICA')) {
    return 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA';
  }
  if (dep.includes('DEFENSA JUDICIAL') || dep.includes('DAÑO ANTIJURIDICO') || dep.includes('DAÑO ANTIJURÍDICO')) {
    return 'DIRECCIÓN DISTRITAL DE DEFENSA JUDICIAL Y PREVENCIÓN DEL DAÑO ANTIJURÍDICO';
  }
  if (dep.includes('INSPECCION') || dep.includes('INSPECCIÓN') || dep.includes('VIGILANCIA') || dep.includes('SIN ANIMO') || dep.includes('SIN ÁNIMO')) {
    return 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL DE PERSONAS JURÍDICAS SIN ÁNIMO DE LUCRO';
  }
  if (dep.includes('PLANEACION') || dep.includes('PLANEACIÓN')) {
    return 'OFICINA ASESORA DE PLANEACIÓN';
  }
  if (dep.includes('CONTROL INTERNO') && !dep.includes('DISCIPLINARI')) {
    return 'OFICINA DE CONTROL INTERNO';
  }
  if (dep.includes('DISCIPLINARI')) {
    return 'OFICINA DE CONTROL DISCIPLINARIO INTERNO';
  }
  if (dep.includes('TECNOLOG') || dep.includes('TIC') || dep.includes('INFORMACION') || dep.includes('INFORMACIÓN')) {
    return 'OFICINA DE TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES';
  }
  if (dep.includes('CORPORATIVA') || dep.includes('GESTION CORPORATIVA') || dep.includes('GESTIÓN CORPORATIVA')) {
    return 'SUBDIRECCIÓN DE GESTIÓN CORPORATIVA';
  }

  return dep;
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

// Detección de hojas en el libro
function obtenerHojaPlanta(workbook) {
  if (!workbook || !workbook.worksheets) return null;
  return (
    workbook.getWorksheet('PLANTA SJD') ||
    workbook.getWorksheet('PLANTA SJD (2)') ||
    workbook.worksheets.find(w => {
      const n = normH(w.name);
      return n.includes('PLANTA SJD') || (n.includes('PLANTA') && !n.includes('PERNO') && !n.includes('INICIAL'));
    }) ||
    null
  );
}

function obtenerHojaPerno(workbook) {
  if (!workbook || !workbook.worksheets) return null;
  return (
    workbook.getWorksheet('PLANTA PERNO') ||
    workbook.worksheets.find(w => {
      const n = normH(w.name);
      return n.includes('PLANTA PERNO') || n.includes('PERNO');
    }) ||
    null
  );
}

// Detección dinámica de filas de encabezados
function detectarFilaEncabezadoPlanta(sheet) {
  if (!sheet) return 4;
  for (let r = 1; r <= 25; r++) {
    const row = sheet.getRow(r);
    let rowText = '';
    row.eachCell((c) => { rowText += ' ' + normH(c.value); });
    if (
      (rowText.includes('ID') || rowText.includes('SIDEAP')) &&
      (rowText.includes('CEDULA') || rowText.includes('APELLIDOS') || rowText.includes('NOMENCLATURA') || rowText.includes('CARGO'))
    ) {
      return r;
    }
  }
  return 4;
}

function detectarFilaEncabezadoPerno(sheet) {
  if (!sheet) return 9;
  for (let r = 1; r <= 25; r++) {
    const row = sheet.getRow(r);
    let rowText = '';
    row.eachCell((c) => { rowText += ' ' + normH(c.value); });
    if (
      rowText.includes('NUMERO_IDENTIFICACION') ||
      (rowText.includes('IDENTIFICACION') && (rowText.includes('APELLIDO') || rowText.includes('NOMBRE')))
    ) {
      return r;
    }
  }
  return 9;
}

// Extracción y procesamiento de Hoja PLANTA SJD
async function procesarExtraccionPlanta(sheet, workbook, pool) {
  const rowHeader = detectarFilaEncabezadoPlanta(sheet);

  const mapaPernoPorCedula = new Map();
  const mapaPernoPorId = new Map();
  const mapaSideapPorId = new Map();

  const sheetPernoAux = obtenerHojaPerno(workbook);
  if (sheetPernoAux && sheetPernoAux.rowCount > 2) {
    const rowHeaderPernoAux = detectarFilaEncabezadoPerno(sheetPernoAux);
    for (let rp = rowHeaderPernoAux + 1; rp <= sheetPernoAux.rowCount; rp++) {
      const rowP = sheetPernoAux.getRow(rp);
      const cRaw = cleanDoc(getVal(rowP.getCell(1)));
      if (!cRaw) continue;

      const ape1 = cleanText(getVal(rowP.getCell(2)) || '').toUpperCase();
      const ape2 = cleanText(getVal(rowP.getCell(3)) || '').toUpperCase();
      const nom = cleanText(getVal(rowP.getCell(4)) || '').toUpperCase();
      const nomComp = [nom, ape1, ape2].filter(Boolean).join(' ').trim();

      const infoPerno = {
        cedula: cRaw,
        nombreCompleto: nomComp,
        direccion: cleanText(getVal(rowP.getCell(7)) || '').toUpperCase(),
        telefono: cleanText(getVal(rowP.getCell(8)) || ''),
        sexo: cleanText(getVal(rowP.getCell(9)) || '').toUpperCase(),
        tipoFuncionario: cleanText(getVal(rowP.getCell(15)) || '').toUpperCase(),
        fondoSalud: cleanText(getVal(rowP.getCell(20)) || '').toUpperCase(),
        fondoPension: cleanText(getVal(rowP.getCell(22)) || '').toUpperCase(),
        fondoCesantias: cleanText(getVal(rowP.getCell(24)) || '').toUpperCase(),
        idPerno: parseInt(String(getVal(rowP.getCell(31)) || ''), 10) || null,
        tipoNomb: cleanText(getVal(rowP.getCell(34)) || '').toUpperCase(),
        totalDevengado: cleanMoney(getVal(rowP.getCell(43) || rowP.getCell(29))) || null,
      };

      mapaPernoPorCedula.set(cRaw, infoPerno);
      if (infoPerno.idPerno) {
        mapaPernoPorId.set(infoPerno.idPerno, infoPerno);
      }
    }
  }

  const sheetSideapAux = workbook.getWorksheet('SIDEAP');
  if (sheetSideapAux && sheetSideapAux.rowCount > 2) {
    for (let rs = 2; rs <= sheetSideapAux.rowCount; rs++) {
      const rowS = sheetSideapAux.getRow(rs);
      const idS = parseInt(String(getVal(rowS.getCell(1)) || ''), 10);
      const nomS = cleanText(getVal(rowS.getCell(3)) || '').toUpperCase();
      const cedS = cleanDoc(getVal(rowS.getCell(4)));
      if (idS && (nomS || cedS)) {
        mapaSideapPorId.set(idS, { idSideap: idS, nombre: nomS, cedula: cedS });
      }
    }
  }

  const headerRow = sheet.getRow(rowHeader);
  const colMap = {};
  headerRow.eachCell((c, colNum) => {
    const raw = normH(c.value);
    if (raw === 'ID' || raw === 'ID_PLAZA' || raw === 'ID PLAZA' || raw === 'PLAZA') {
      colMap.id = colNum;
    } else if (raw === 'ID SIDEAP' || raw === 'ID_SIDEAP' || (raw.includes('SIDEAP') && !raw.includes('VINCULAC') && !raw.includes('CARGO/'))) {
      colMap.id_sideap = colNum;
    } else if (raw === 'ID PERNO' || raw === 'ID_PERNO' || (raw.includes('PERNO') && !raw.includes('VINCULAC'))) {
      colMap.id_perno = colNum;
    } else if (raw.includes('SITUACION') && (raw.includes('TITULAR') || raw.includes('DEL CARGO'))) {
      colMap.situacion_titular = colNum;
    } else if (raw === 'SITUACION ADMINISTRATIVA' || raw === 'SITUACION' || (raw.includes('SITUACION') && !raw.includes('TITULAR'))) {
      colMap.situacion_admin = colNum;
    } else if (raw.includes('TITULAR') && (raw.includes('CEDULA') || raw.includes('DOCUMENTO') || raw.includes('C.C'))) {
      colMap.titular_cedula = colNum;
    } else if (raw.includes('TITULAR') && (raw.includes('CARGO') || raw.includes('NOMBRE') || raw.includes('SERVIDOR') || raw.includes('EMPLEO'))) {
      colMap.titular_nombre = colNum;
    } else if (raw === 'CEDULA' || raw === 'DOCUMENTO') {
      if (!colMap.cedula_actual) {
        colMap.cedula_actual = colNum;
      } else if (!colMap.titular_cedula) {
        colMap.titular_cedula = colNum;
      }
    } else if ((raw.includes('APELLIDOS') || raw.includes('NOMBRES')) && !colMap.nombre_actual) {
      colMap.nombre_actual = colNum;
    } else if (raw === 'ID-E' || raw === 'IDE' || raw === 'ID_E' || raw.includes('ID-E') || raw.includes('ID ESCALERA') || raw === 'ESCALERA') {
      colMap.id_escalera = colNum;
    } else if ((raw === 'N' || raw.includes('PELDANO') || raw.includes('PELDAÑO')) && !colMap.peldano_escalera) {
      colMap.peldano_escalera = colNum;
    } else if (raw.includes('VINCULACION A LA ENTIDAD') || raw.includes('TIPO DE VINCULACION')) {
      colMap.tipo_vinculacion = colNum;
    } else if (raw.includes('OPEC')) {
      colMap.opec = colNum;
    } else if (raw.includes('ESTADO DEL CARGO') || raw.includes('ESTADO CARGO')) {
      colMap.estado_cargo = colNum;
    } else if (raw === 'NIVEL') {
      colMap.nivel = colNum;
    } else if (raw.includes('NOMENCLATURA') || raw === 'CARGO' || raw.includes('DENOMINACION')) {
      colMap.cargo = colNum;
    } else if (raw.includes('CODIGO') || raw.includes('CÓDIGO')) {
      colMap.codigo = colNum;
    } else if (raw.includes('GRADO')) {
      colMap.grado = colNum;
    } else if (raw.includes('DEPENDENCIA DEL CARGO') || raw === 'DEPENDENCIA') {
      colMap.dep_cargo = colNum;
    } else if (raw.includes('DEPENDENCIA FUNCIONAL')) {
      colMap.dep_funcional = colNum;
    } else if (raw.includes('PROPOSITO') || raw.includes('PROPÓSITO')) {
      colMap.proposito = colNum;
    } else if (raw === 'FUNCIONES' || raw === 'FUNCIONES ESENCIALES' || raw.includes('FUNCIONES ESENCIALES') || (raw.includes('FUNCIONES') && !raw.includes('RES') && !raw.includes('RESOLUC') && !raw.includes('MANUAL') && !raw.includes('PAGINA') && !raw.includes('PÁGINA'))) {
      if (!colMap.funciones) colMap.funciones = colNum;
    } else if (raw.includes('REQUISITOS')) {
      colMap.requisitos = colNum;
    } else if (raw.includes('MANUAL') || raw.includes('PAGINA') || raw.includes('PÁGINA') || raw.includes('RESOLUCION') || raw.includes('RESOLUCIÓN')) {
      colMap.manual_funciones = colNum;
    } else if (raw.includes('ASIGNACION BASICA') || raw.includes('ASIGNACIÓN BÁSICA') || raw.includes('SUELDO BASICO') || raw.includes('ASIGNACION')) {
      colMap.asignacion = colNum;
    } else if (raw.includes('TOTAL') && raw.includes('DEVENGAD')) {
      colMap.total_devengado = colNum;
    }
  });

  if (!colMap.id) {
    throw new Error(`En la hoja '${sheet.name}' (Fila ${rowHeader}) no se encontró la columna de ID de plaza.`);
  }

  let procesados = 0;
  let actualizados = 0;
  let filasOmitidas = 0;
  const advertencias = [];
  const plazasVistas = new Set();

  for (let r = rowHeader + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const idCellVal = getVal(row.getCell(colMap.id || 1));

    if (idCellVal === null || idCellVal === undefined || String(idCellVal).trim() === '') {
      let tieneContenido = false;
      row.eachCell(() => { tieneContenido = true; });
      if (tieneContenido) {
        filasOmitidas++;
      }
      continue;
    }

    const idPlaza = parseInt(String(idCellVal).trim(), 10);
    if (isNaN(idPlaza) || idPlaza <= 0) {
      filasOmitidas++;
      continue;
    }

    if (plazasVistas.has(idPlaza)) {
      if (advertencias.length < 10) {
        advertencias.push(`Fila ${r}: El ID de plaza ${idPlaza} aparece duplicado (se actualiza con el último registro).`);
      }
    }
    plazasVistas.add(idPlaza);

    const idSideap = parseInt(getVal(row.getCell(colMap.id_sideap || 2)), 10) || null;
    const idPerno = parseInt(getVal(row.getCell(colMap.id_perno || 3)), 10) || null;

    let cedulaActual = cleanDoc(getVal(row.getCell(colMap.cedula_actual || 4)));
    let nombreActual = cleanText(getVal(row.getCell(colMap.nombre_actual || 5)) || '').toUpperCase();
    let tipoVinculacion = cleanText(getVal(row.getCell(colMap.tipo_vinculacion || 6)) || '').toUpperCase();

    let situacionAdmin = cleanText(getVal(row.getCell(colMap.situacion_admin || 12)) || '').toUpperCase();
    let situacionTitular = cleanText(getVal(row.getCell(colMap.situacion_titular || 13)) || '').toUpperCase();

    let titularCedula = cleanDoc(getVal(row.getCell(colMap.titular_cedula || 14)));
    let titularNombre = cleanText(getVal(row.getCell(colMap.titular_nombre || 15)) || '').toUpperCase();

    if (cedulaActual && mapaPernoPorCedula.has(cedulaActual)) {
      const pernoInfo = mapaPernoPorCedula.get(cedulaActual);
      if (pernoInfo.nombreCompleto) nombreActual = pernoInfo.nombreCompleto;
      if (!tipoVinculacion && pernoInfo.tipoFuncionario) tipoVinculacion = pernoInfo.tipoFuncionario;
    } else if (idSideap && mapaSideapPorId.has(idSideap)) {
      const sideapInfo = mapaSideapPorId.get(idSideap);
      if (sideapInfo.nombre && (!nombreActual || nombreActual.includes('VACANTE') || nombreActual.includes('IF('))) {
        nombreActual = sideapInfo.nombre;
        if (!cedulaActual && sideapInfo.cedula) cedulaActual = sideapInfo.cedula;
      }
    }

    if (titularCedula && mapaPernoPorCedula.has(titularCedula)) {
      const pernoInfo = mapaPernoPorCedula.get(titularCedula);
      if (pernoInfo.nombreCompleto) titularNombre = pernoInfo.nombreCompleto;
    }

    const normActual = nombreActual.toUpperCase();
    const normTitular = titularNombre.toUpperCase();
    const actualEsVacante = !normActual || normActual.includes('VACANTE') || normActual.includes('VACANCIA');
    const titularEsVacante = !normTitular || normTitular.includes('VACANTE') || normTitular.includes('VACANCIA');
    const esEncargoPorSituacion = situacionAdmin.includes('ENCARGO') || situacionTitular.includes('ENCARGO');

    if (!titularEsVacante) {
      // Titular oficial registrado
    } else {
      if (esEncargoPorSituacion) {
        titularNombre = situacionTitular || 'VACANTE TEMPORAL';
        titularCedula = null;
      } else if (!actualEsVacante) {
        titularNombre = nombreActual;
        titularCedula = cedulaActual;
        if (!situacionTitular || situacionTitular.includes('VACANTE')) {
          situacionTitular = situacionAdmin || 'EN PROPIEDAD';
        }
      } else {
        titularNombre = 'VACANTE DEFINITIVA';
        titularCedula = null;
      }
    }

    let esEncargo = false;
    let encargoNombre = null;
    let encargoCedula = null;

    if (!actualEsVacante) {
      const hayDiferencia = titularCedula && cedulaActual 
        ? (titularCedula !== cedulaActual) 
        : (titularNombre && normActual !== normTitular);

      if (esEncargoPorSituacion || hayDiferencia) {
        esEncargo = true;
        encargoNombre = nombreActual;
        encargoCedula = cedulaActual;
      }
    }

    let estadoCargo = String(getVal(row.getCell(colMap.estado_cargo || 23)) || '').trim().toUpperCase();
    if (!estadoCargo || estadoCargo.includes('IF(') || estadoCargo.includes('[OBJECT')) {
      if (actualEsVacante && titularEsVacante) {
        estadoCargo = 'VACANTE DEFINITIVA';
      } else if (normActual.includes('TEMPORAL') || normTitular.includes('TEMPORAL') || situacionAdmin.includes('TEMPORAL') || situacionTitular.includes('TEMPORAL')) {
        estadoCargo = 'VACANTE TEMPORAL';
      } else if (!actualEsVacante || !titularEsVacante) {
        estadoCargo = 'OCUPADO';
      } else {
        estadoCargo = 'VACANTE DEFINITIVA';
      }
    }

    if (idPlaza === 84 || titularCedula === '91526810' || normTitular.includes('DANIEL YIDID')) {
      estadoCargo = 'VACANTE TEMPORAL';
      if (!situacionTitular || situacionTitular.includes('ENCARGO')) {
        situacionTitular = 'EN ENCARGO / PERÍODO DE PRUEBA EN OTRA ENTIDAD';
      }
      esEncargo = true;
      if (!encargoNombre && !actualEsVacante) {
        encargoNombre = nombreActual;
        encargoCedula = cedulaActual;
      }
    } else if (idPlaza === 82 || (actualEsVacante && titularEsVacante)) {
      estadoCargo = 'VACANTE DEFINITIVA';
      titularNombre = 'VACANTE DEFINITIVA';
      titularCedula = null;
      situacionTitular = 'VACANTE DEFINITIVA';
      situacionAdmin = 'VACANTE DEFINITIVA';
      encargoNombre = null;
      encargoCedula = null;
      esEncargo = false;
    }

    let nivel = String(getVal(row.getCell(colMap.nivel || 24)) || '').trim().toUpperCase();
    if (nivel.includes('DIRECTIV')) nivel = 'DIRECTIVO';
    else if (nivel.includes('ASESOR')) nivel = 'ASESOR';
    else if (nivel.includes('PROFESIONAL')) nivel = 'PROFESIONAL';
    else if (nivel.includes('TECNIC') || nivel.includes('TÉCNIC')) nivel = 'TECNICO';
    else if (nivel.includes('ASISTENCIAL')) nivel = 'ASISTENCIAL';

    const cargoNom = cleanText(getVal(row.getCell(colMap.cargo || 25)) || '').toUpperCase();
    const codigo = cleanText(getVal(row.getCell(colMap.codigo || 26)) || '');
    const grado = cleanText(getVal(row.getCell(colMap.grado || 27)) || '');
    const opec = cleanText(getVal(row.getCell(colMap.opec || 22)) || '');
    const depCargo = cleanDependencia(getVal(row.getCell(colMap.dep_cargo || 29)) || '');
    const depFuncional = cleanDependencia(getVal(row.getCell(colMap.dep_funcional || 30)) || depCargo);
    const proposito = cleanText(getVal(row.getCell(colMap.proposito || 31)) || '');
    const funcionesRaw = cleanText(getVal(row.getCell(colMap.funciones || 32)) || '');
    const requisitos = cleanText(getVal(row.getCell(colMap.requisitos || 33)) || '');
    const manualFuncionesRaw = cleanText(getVal(row.getCell(colMap.manual_funciones || 34)) || '');
    const asignacion = cleanMoney(getVal(row.getCell(colMap.asignacion || 35)));
    const devengadoPlanta = cleanMoney(getVal(row.getCell(colMap.total_devengado || 42)));

    let idEscalera = cleanText(getVal(row.getCell(colMap.id_escalera || 16)) || '').trim();
    if (idEscalera === '-' || idEscalera === '0' || idEscalera.toLowerCase().includes('[object')) idEscalera = '';

    let peldanoRaw = getVal(row.getCell(colMap.peldano_escalera || 17));
    let peldanoEscalera = null;
    if (peldanoRaw !== null && peldanoRaw !== undefined && String(peldanoRaw).trim() !== '') {
      const pNum = parseInt(String(peldanoRaw).trim(), 10);
      if (!isNaN(pNum) && pNum > 0) peldanoEscalera = pNum;
    }

    if (!idEscalera) {
      idEscalera = null;
      peldanoEscalera = null;
    }

    const funcionesArr = parseFunctions(funcionesRaw);
    const personaMatch = (titularCedula && mapaPernoPorCedula.get(titularCedula)) || 
                         (cedulaActual && mapaPernoPorCedula.get(cedulaActual)) || null;

    await pool.query(`
      INSERT INTO public.planta_personal_sjd (
        id_plaza, id_sideap, id_perno, nivel, cargo, codigo, grado,
        dependencia_cargo, dependencia_funcional, proposito, funciones,
        requisitos, asignacion_basica, estado_cargo,
        titular_cedula, titular_nombre, situacion_titular,
        encargo_cedula, encargo_nombre, es_encargo,
        tipo_vinculacion, situacion_administrativa, opec,
        id_escalera, peldano_escalera,
        fondo_salud, fondo_pension, fondo_cesantias, telefono, direccion, sexo,
        manual_funciones, resolucion_manual, total_devengado,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20,
        $21, $22, $23,
        $24, $25,
        $26, $27, $28, $29, $30, $31,
        $32, $33, $34,
        NOW()
      )
      ON CONFLICT (id_plaza) DO UPDATE SET
        id_sideap = COALESCE(EXCLUDED.id_sideap, public.planta_personal_sjd.id_sideap),
        id_perno = COALESCE(EXCLUDED.id_perno, public.planta_personal_sjd.id_perno),
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
        opec = EXCLUDED.opec,
        id_escalera = EXCLUDED.id_escalera,
        peldano_escalera = EXCLUDED.peldano_escalera,
        fondo_salud = COALESCE(EXCLUDED.fondo_salud, public.planta_personal_sjd.fondo_salud),
        fondo_pension = COALESCE(EXCLUDED.fondo_pension, public.planta_personal_sjd.fondo_pension),
        fondo_cesantias = COALESCE(EXCLUDED.fondo_cesantias, public.planta_personal_sjd.fondo_cesantias),
        telefono = COALESCE(EXCLUDED.telefono, public.planta_personal_sjd.telefono),
        direccion = COALESCE(EXCLUDED.direccion, public.planta_personal_sjd.direccion),
        sexo = COALESCE(EXCLUDED.sexo, public.planta_personal_sjd.sexo),
        manual_funciones = COALESCE(EXCLUDED.manual_funciones, public.planta_personal_sjd.manual_funciones),
        resolucion_manual = COALESCE(EXCLUDED.resolucion_manual, public.planta_personal_sjd.resolucion_manual),
        total_devengado = COALESCE(EXCLUDED.total_devengado, public.planta_personal_sjd.total_devengado),
        updated_at = NOW();
    `, [
      idPlaza, idSideap, idPerno, nivel, cargoNom, codigo, grado,
      depCargo, depFuncional, proposito, JSON.stringify(funcionesArr),
      requisitos, asignacion, estadoCargo,
      titularCedula, titularNombre, situacionTitular,
      encargoCedula, encargoNombre, esEncargo,
      tipoVinculacion, situacionAdmin, opec,
      idEscalera, peldanoEscalera,
      personaMatch?.fondoSalud || null,
      personaMatch?.fondoPension || null,
      personaMatch?.fondoCesantias || null,
      personaMatch?.telefono || null,
      personaMatch?.direccion || null,
      personaMatch?.sexo || null,
      manualFuncionesRaw || null,
      manualFuncionesRaw || null,
      devengadoPlanta || personaMatch?.totalDevengado || null
    ]);

    procesados++;
    actualizados++;
  }

  return {
    sheetName: sheet.name,
    rowHeader,
    procesados,
    actualizados,
    filasOmitidas,
    advertencias
  };
}

// Extracción y procesamiento de Hoja PLANTA PERNO
async function procesarExtraccionPerno(sheet, pool) {
  const rowHeader = detectarFilaEncabezadoPerno(sheet);
  const headerRow = sheet.getRow(rowHeader);
  const colMap = {};

  headerRow.eachCell((c, colNum) => {
    const rawTxt = String(c.value || '').toUpperCase();
    const txt = rawTxt.replace(/[\r\n_]+/g, ' ').trim();
    const norm = txt.replace(/\s+/g, '');

    if (!colMap.cedula) {
      if (
        (norm.includes('NUMEROIDENTIFICA') || norm.includes('IDENTIFICACION') || norm === 'CEDULA' || norm === 'CÉDULA' || colNum === 1) &&
        !norm.includes('MILITAR') && !norm.includes('TRIBUTAR') && !norm.includes('FISCAL')
      ) {
        colMap.cedula = colNum;
        return;
      }
    }

    if (!colMap.ape1 && txt.includes('PRIMER APELLIDO')) colMap.ape1 = colNum;
    else if (!colMap.ape2 && txt.includes('SEGUNDO APELLIDO')) colMap.ape2 = colNum;
    else if (!colMap.nombres && (txt === 'NOMBRE' || txt.includes('NOMBRES'))) colMap.nombres = colNum;
    else if (!colMap.estado_funcionario && (txt.includes('ESTADO FUNCIONARIO') || txt === 'ESTADO')) colMap.estado_funcionario = colNum;
    else if (!colMap.fecha_nacimiento && txt.includes('FECHA NACIMIENTO')) colMap.fecha_nacimiento = colNum;
    else if (!colMap.direccion && txt.includes('DIRECCION')) colMap.direccion = colNum;
    else if (!colMap.telefono && txt.includes('TELEFONO')) colMap.telefono = colNum;
    else if (!colMap.sexo && (txt === 'SEXO' || txt.includes('GENERO'))) colMap.sexo = colNum;
    else if (!colMap.libreta_militar && txt.includes('LIBRETA MILITAR')) colMap.libreta_militar = colNum;
    else if (!colMap.clase_libreta && txt.includes('CLASE LIBRETA')) colMap.clase_libreta = colNum;
    else if (!colMap.distrito_militar && txt.includes('DISTRITO MILITAR')) colMap.distrito_militar = colNum;
    else if (!colMap.tipo_sangre && txt.includes('TIPO SANGRE')) colMap.tipo_sangre = colNum;
    else if (!colMap.rh && txt === 'RH') colMap.rh = colNum;
    else if (!colMap.tipo_funcionario && txt.includes('TIPO FUNCIONARIO')) colMap.tipo_funcionario = colNum;
    else if (!colMap.fecha_ingreso_entidad && txt.includes('FECHA INGRESO ENTIDAD')) colMap.fecha_ingreso_entidad = colNum;
    else if (!colMap.fecha_ingreso_distrito && txt.includes('FECHA INGRESO DISTRITO')) colMap.fecha_ingreso_distrito = colNum;
    else if (!colMap.fecha_ingreso_nacion && txt.includes('FECHA INGRESO NACION')) colMap.fecha_ingreso_nacion = colNum;
    else if (!colMap.codigo_eps && (txt.includes('CODIGO EPS') || txt.includes('COD EPS'))) colMap.codigo_eps = colNum;
    else if (!colMap.fondo_salud && (txt.includes('FONDO SALUD') || txt === 'EPS')) colMap.fondo_salud = colNum;
    else if (!colMap.codigo_fondo_pensiones && (txt.includes('CODIGO FONDO PENSIONES') || txt.includes('COD FONDO PENSION'))) colMap.codigo_fondo_pensiones = colNum;
    else if (!colMap.fondo_pension && (txt.includes('FONDO PENSION') || txt === 'PENSION')) colMap.fondo_pension = colNum;
    else if (!colMap.codigo_fondo_cesantias && (txt.includes('CODIGO FONDO CESANTIAS') || txt.includes('COD FONDO CESANTIA'))) colMap.codigo_fondo_cesantias = colNum;
    else if (!colMap.fondo_cesantias && (txt.includes('FONDO CESANTIAS') || txt === 'CESANTIAS')) colMap.fondo_cesantias = colNum;
    else if (!colMap.dependencia_cod && txt === 'DEPENDENCIA') colMap.dependencia_cod = colNum;
    else if (!colMap.dependencia && (txt.includes('DESC DEPENDENCIA') || txt.includes('NOMBRE DEPENDENCIA'))) colMap.dependencia = colNum;
    else if (!colMap.cargo_cod && txt === 'CARGO') colMap.cargo_cod = colNum;
    else if (!colMap.grado && txt === 'GRADO') colMap.grado = colNum;
    else if (!colMap.asignacion_basica && txt.includes('ASIGNACION')) colMap.asignacion_basica = colNum;
    else if (!colMap.cargo && (txt === 'DESCRIPCION' || txt.includes('DESC CARGO'))) colMap.cargo = colNum;
    else if (!colMap.posicion_planta && (txt.includes('POSICION PLANTA') || txt.includes('ID PERNO') || txt === 'PERNO')) colMap.posicion_planta = colNum;
    else if (!colMap.sede_cod && txt.includes('CODSEDE')) colMap.sede_cod = colNum;
    else if (!colMap.sede && txt === 'SEDE') colMap.sede = colNum;
    else if (!colMap.tipo_nomb && txt.includes('TIPO NOMB')) colMap.tipo_nomb = colNum;
    else if (!colMap.acto_nomb && txt.includes('ACTO NOMB') && !txt.includes('NUMERO') && !txt.includes('FECHA')) colMap.acto_nomb = colNum;
    else if (!colMap.fecha_efectiva_nomb && txt.includes('FECHA EFECTIVA NOMB')) colMap.fecha_efectiva_nomb = colNum;
    else if (!colMap.num_acto && (txt.includes('NUMERO ACTO NOMB') || txt.includes('NUM ACTO'))) colMap.num_acto = colNum;
    else if (!colMap.fecha_acto_nomb && txt.includes('FECHA ACTO NOMB')) colMap.fecha_acto_nomb = colNum;
    else if (!colMap.fecha_efectiva_encargo && txt.includes('FECHA EFECTIVA ENC')) colMap.fecha_efectiva_encargo = colNum;
    else if (!colMap.numero_acto_encargo && txt.includes('NUMERO ACTO ENC')) colMap.numero_acto_encargo = colNum;
    else if (!colMap.fecha_acto_encargo && txt.includes('FECHA ACTO ENC')) colMap.fecha_acto_encargo = colNum;
    else if (!colMap.fecha_retiro && txt.includes('FECHA RETIRO')) colMap.fecha_retiro = colNum;
    else if (!colMap.devengado && (txt.includes('DEVENGADO') || txt.includes('TOTAL DEVENGADOS'))) colMap.devengado = colNum;
  });

  if (!colMap.cedula) colMap.cedula = 1;

  let procesados = 0;
  let actualizados = 0;
  let retiradosOSinPlaza = 0;
  const advertencias = [];

  for (let r = rowHeader + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cedulaRaw = getVal(row.getCell(colMap.cedula || 1));
    const cedula = cleanDoc(cedulaRaw);
    if (!cedula) continue;

    const idPerno = parseInt(String(getVal(row.getCell(colMap.posicion_planta || 31)) || ''), 10) || null;
    const ape1 = cleanText(getVal(row.getCell(colMap.ape1 || 2)) || '').toUpperCase();
    const ape2 = cleanText(getVal(row.getCell(colMap.ape2 || 3)) || '').toUpperCase();
    const nom = cleanText(getVal(row.getCell(colMap.nombres || 4)) || '').toUpperCase();
    const nomComp = [nom, ape1, ape2].filter(Boolean).join(' ').trim();

    const estadoFuncRaw = cleanText(getVal(row.getCell(colMap.estado_funcionario || 5)) || '').toUpperCase();
    const fechaRetiro = cleanDate(getVal(row.getCell(colMap.fecha_retiro || 42)));
    const esRetirado = estadoFuncRaw === 'R' || estadoFuncRaw.includes('RETIRAD') || !!fechaRetiro;

    const fechaNacimiento = cleanDate(getVal(row.getCell(colMap.fecha_nacimiento || 6)));
    const direccion = cleanText(getVal(row.getCell(colMap.direccion || 7)) || '').toUpperCase();
    const telefono = cleanText(getVal(row.getCell(colMap.telefono || 8)) || '');
    const sexo = cleanText(getVal(row.getCell(colMap.sexo || 9)) || '').toUpperCase();
    const libretaMilitar = cleanText(getVal(row.getCell(colMap.libreta_militar || 10)) || '');
    const claseLibreta = cleanText(getVal(row.getCell(colMap.clase_libreta || 11)) || '');
    const distritoMilitar = cleanText(getVal(row.getCell(colMap.distrito_militar || 12)) || '');
    const tipoSangre = cleanText(getVal(row.getCell(colMap.tipo_sangre || 13)) || '');
    const rh = cleanText(getVal(row.getCell(colMap.rh || 14)) || '');
    const tipoFuncionario = cleanText(getVal(row.getCell(colMap.tipo_funcionario || 15)) || '').toUpperCase();
    const fechaIngresoEntidad = cleanDate(getVal(row.getCell(colMap.fecha_ingreso_entidad || 16)));
    const fechaIngresoDistrito = cleanDate(getVal(row.getCell(colMap.fecha_ingreso_distrito || 17)));
    const fechaIngresoNacion = cleanDate(getVal(row.getCell(colMap.fecha_ingreso_nacion || 18)));
    const codigoEps = cleanText(getVal(row.getCell(colMap.codigo_eps || 19)) || '');
    const fondoSalud = cleanText(getVal(row.getCell(colMap.fondo_salud || 20)) || '').toUpperCase();
    const codigoFondoPensiones = cleanText(getVal(row.getCell(colMap.codigo_fondo_pensiones || 21)) || '');
    const fondoPension = cleanText(getVal(row.getCell(colMap.fondo_pension || 22)) || '').toUpperCase();
    const codigoFondoCesantias = cleanText(getVal(row.getCell(colMap.codigo_fondo_cesantias || 23)) || '');
    const fondoCesantias = cleanText(getVal(row.getCell(colMap.fondo_cesantias || 24)) || '').toUpperCase();
    const dependenciaCod = cleanText(getVal(row.getCell(colMap.dependencia_cod || 25)) || '');
    const dependencia = cleanDependencia(getVal(row.getCell(colMap.dependencia || 26)) || '');
    const cargoCod = cleanText(getVal(row.getCell(colMap.cargo_cod || 27)) || '');
    const grado = cleanText(getVal(row.getCell(colMap.grado || 28)) || '');
    const asignacionBasica = cleanMoney(getVal(row.getCell(colMap.asignacion_basica || 29))) || null;
    const cargo = cleanText(getVal(row.getCell(colMap.cargo || 30)) || '').toUpperCase();
    const sedeCod = cleanText(getVal(row.getCell(colMap.sede_cod || 32)) || '');
    const sede = cleanText(getVal(row.getCell(colMap.sede || 33)) || '');
    const tipoNomb = cleanText(getVal(row.getCell(colMap.tipo_nomb || 34)) || '').toUpperCase();
    const actoNomb = cleanText(getVal(row.getCell(colMap.acto_nomb || 35)) || '').toUpperCase();
    const fechaEfectivaNomb = cleanDate(getVal(row.getCell(colMap.fecha_efectiva_nomb || 36)));
    const numActo = cleanText(getVal(row.getCell(colMap.num_acto || 37)) || '');
    const fechaActoNomb = cleanDate(getVal(row.getCell(colMap.fecha_acto_nomb || 38)));
    const fechaEfectivaEnc = cleanDate(getVal(row.getCell(colMap.fecha_efectiva_encargo || 39)));
    const numActoEnc = cleanText(getVal(row.getCell(colMap.numero_acto_encargo || 40)) || '');
    const fechaActoEnc = cleanDate(getVal(row.getCell(colMap.fecha_acto_encargo || 41)));
    const totalDevengado = cleanMoney(getVal(row.getCell(colMap.devengado || 43))) || null;

    try {
      await pool.query(`
        INSERT INTO public.personal_perno_sjd (
          cedula, primer_apellido, segundo_apellido, nombres, nombre_completo,
          estado_funcionario, fecha_nacimiento, direccion, telefono, sexo,
          libreta_militar, clase_libreta, distrito_militar, tipo_sangre, rh,
          tipo_funcionario, fecha_ingreso_entidad, fecha_ingreso_distrito, fecha_ingreso_nacion,
          codigo_eps, fondo_salud, codigo_fondo_pensiones, fondo_pension, codigo_fondo_cesantias, fondo_cesantias,
          dependencia_cod, dependencia, cargo_cod, grado, asignacion_basica, cargo, posicion_planta,
          sede_cod, sede, tipo_nombramiento, acto_nombramiento, fecha_efectiva_nombramiento,
          numero_acto_nombramiento, fecha_acto_nombramiento,
          fecha_efectiva_encargo, numero_acto_encargo, fecha_acto_encargo,
          fecha_retiro, total_devengado, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25,
          $26, $27, $28, $29, $30, $31, $32,
          $33, $34, $35, $36, $37,
          $38, $39,
          $40, $41, $42,
          $43, $44, NOW()
        ) ON CONFLICT (cedula) DO UPDATE SET
          primer_apellido = EXCLUDED.primer_apellido,
          segundo_apellido = EXCLUDED.segundo_apellido,
          nombres = EXCLUDED.nombres,
          nombre_completo = EXCLUDED.nombre_completo,
          estado_funcionario = EXCLUDED.estado_funcionario,
          fecha_nacimiento = EXCLUDED.fecha_nacimiento,
          direccion = EXCLUDED.direccion,
          telefono = EXCLUDED.telefono,
          sexo = EXCLUDED.sexo,
          libreta_militar = EXCLUDED.libreta_militar,
          clase_libreta = EXCLUDED.clase_libreta,
          distrito_militar = EXCLUDED.distrito_militar,
          tipo_sangre = EXCLUDED.tipo_sangre,
          rh = EXCLUDED.rh,
          tipo_funcionario = EXCLUDED.tipo_funcionario,
          fecha_ingreso_entidad = EXCLUDED.fecha_ingreso_entidad,
          fecha_ingreso_distrito = EXCLUDED.fecha_ingreso_distrito,
          fecha_ingreso_nacion = EXCLUDED.fecha_ingreso_nacion,
          codigo_eps = EXCLUDED.codigo_eps,
          fondo_salud = EXCLUDED.fondo_salud,
          codigo_fondo_pensiones = EXCLUDED.codigo_fondo_pensiones,
          fondo_pension = EXCLUDED.fondo_pension,
          codigo_fondo_cesantias = EXCLUDED.codigo_fondo_cesantias,
          fondo_cesantias = EXCLUDED.fondo_cesantias,
          dependencia_cod = EXCLUDED.dependencia_cod,
          dependencia = EXCLUDED.dependencia,
          cargo_cod = EXCLUDED.cargo_cod,
          grado = EXCLUDED.grado,
          asignacion_basica = EXCLUDED.asignacion_basica,
          cargo = EXCLUDED.cargo,
          posicion_planta = EXCLUDED.posicion_planta,
          sede_cod = EXCLUDED.sede_cod,
          sede = EXCLUDED.sede,
          tipo_nombramiento = EXCLUDED.tipo_nombramiento,
          acto_nombramiento = EXCLUDED.acto_nombramiento,
          fecha_efectiva_nombramiento = EXCLUDED.fecha_efectiva_nombramiento,
          numero_acto_nombramiento = EXCLUDED.numero_acto_nombramiento,
          fecha_acto_nombramiento = EXCLUDED.fecha_acto_nombramiento,
          fecha_efectiva_encargo = EXCLUDED.fecha_efectiva_encargo,
          numero_acto_encargo = EXCLUDED.numero_acto_encargo,
          fecha_acto_encargo = EXCLUDED.fecha_acto_encargo,
          fecha_retiro = EXCLUDED.fecha_retiro,
          total_devengado = COALESCE(EXCLUDED.total_devengado, public.personal_perno_sjd.total_devengado),
          updated_at = NOW()
      `, [
        cedula, ape1, ape2, nom, nomComp,
        esRetirado ? 'R' : 'A', fechaNacimiento, direccion, telefono, sexo,
        libretaMilitar, claseLibreta, distritoMilitar, tipoSangre, rh,
        tipoFuncionario, fechaIngresoEntidad, fechaIngresoDistrito, fechaIngresoNacion,
        codigoEps, fondoSalud, codigoFondoPensiones, fondoPension, codigoFondoCesantias, fondoCesantias,
        dependenciaCod, dependencia, cargoCod, grado, asignacionBasica, cargo, idPerno,
        sedeCod, sede, tipoNomb, actoNomb, fechaEfectivaNomb,
        numActo, fechaActoNomb,
        fechaEfectivaEnc, numActoEnc, fechaActoEnc,
        fechaRetiro, totalDevengado
      ]);
    } catch (ePerno) {
      console.warn('Error al guardar registro en personal_perno_sjd:', ePerno.message);
    }

    procesados++;

    if (esRetirado) {
      retiradosOSinPlaza++;
      await pool.query(`
        UPDATE public.planta_personal_sjd SET
          titular_cedula = NULL,
          titular_nombre = 'VACANTE DEFINITIVA',
          estado_cargo = 'VACANTE DEFINITIVA',
          situacion_titular = 'VACANTE DEFINITIVA',
          updated_at = NOW()
        WHERE titular_cedula = $1
      `, [cedula]);
      continue;
    }

    const updateRes = await pool.query(`
      UPDATE public.planta_personal_sjd SET
        tipo_funcionario = COALESCE(NULLIF($1, ''), tipo_funcionario),
        direccion = COALESCE(NULLIF($2, ''), direccion),
        telefono = COALESCE(NULLIF($3, ''), telefono),
        sexo = COALESCE(NULLIF($4, ''), sexo),
        fondo_salud = COALESCE(NULLIF($5, ''), fondo_salud),
        fondo_pension = COALESCE(NULLIF($6, ''), fondo_pension),
        fondo_cesantias = COALESCE(NULLIF($7, ''), fondo_cesantias),
        tipo_nombramiento = COALESCE(NULLIF($8, ''), tipo_nombramiento),
        acto_nombramiento = COALESCE(NULLIF($9, ''), acto_nombramiento),
        numero_acto_nombramiento = COALESCE(NULLIF($10, ''), numero_acto_nombramiento),
        total_devengado = COALESCE($11, total_devengado),
        fecha_nacimiento = COALESCE($12::date, fecha_nacimiento),
        fecha_ingreso_entidad = COALESCE($13::date, fecha_ingreso_entidad),
        fecha_ingreso_distrito = COALESCE($14::date, fecha_ingreso_distrito),
        fecha_acto_nombramiento = COALESCE($15::date, fecha_acto_nombramiento),
        updated_at = NOW()
      WHERE titular_cedula = $16 OR encargo_cedula = $16 OR titular_cedula = $17 OR encargo_cedula = $17
    `, [
      tipoFuncionario, direccion, telefono, sexo, fondoSalud, fondoPension,
      fondoCesantias, tipoNomb, actoNomb, numActo, totalDevengado,
      fechaNacimiento, fechaIngresoEntidad, fechaIngresoDistrito, fechaActoNomb,
      cedula, String(parseInt(cedula, 10) || '')
    ]);

    if (updateRes.rowCount > 0) {
      actualizados += updateRes.rowCount;
    } else if (idPerno && nomComp) {
      const updatePernoId = await pool.query(`
        UPDATE public.planta_personal_sjd SET
          titular_cedula = $1,
          titular_nombre = $2,
          tipo_funcionario = COALESCE(NULLIF($3, ''), tipo_funcionario),
          direccion = COALESCE(NULLIF($4, ''), direccion),
          telefono = COALESCE(NULLIF($5, ''), telefono),
          sexo = COALESCE(NULLIF($6, ''), sexo),
          fondo_salud = COALESCE(NULLIF($7, ''), fondo_salud),
          fondo_pension = COALESCE(NULLIF($8, ''), fondo_pension),
          fondo_cesantias = COALESCE(NULLIF($9, ''), fondo_cesantias),
          tipo_nombramiento = COALESCE(NULLIF($10, ''), tipo_nombramiento),
          acto_nombramiento = COALESCE(NULLIF($11, ''), acto_nombramiento),
          numero_acto_nombramiento = COALESCE(NULLIF($12, ''), numero_acto_nombramiento),
          total_devengado = COALESCE($13, total_devengado),
          fecha_nacimiento = COALESCE($14::date, fecha_nacimiento),
          fecha_ingreso_entidad = COALESCE($15::date, fecha_ingreso_entidad),
          fecha_ingreso_distrito = COALESCE($16::date, fecha_ingreso_distrito),
          fecha_acto_nombramiento = COALESCE($17::date, fecha_acto_nombramiento),
          updated_at = NOW()
        WHERE id_perno = $18
      `, [
        cedula, nomComp, tipoFuncionario, direccion, telefono, sexo,
        fondoSalud, fondoPension, fondoCesantias, tipoNomb, actoNomb, numActo, totalDevengado,
        fechaNacimiento, fechaIngresoEntidad, fechaIngresoDistrito, fechaActoNomb,
        idPerno
      ]);

      if (updatePernoId.rowCount > 0) {
        actualizados += updatePernoId.rowCount;
      } else {
        retiradosOSinPlaza++;
      }
    } else {
      retiradosOSinPlaza++;
    }
  }

  return {
    sheetName: sheet.name,
    rowHeader,
    procesados,
    actualizados,
    retiradosOSinPlaza,
    advertencias
  };
}

module.exports = {
  normH,
  getVal,
  cleanDoc,
  cleanMoney,
  cleanDate,
  cleanText,
  cleanDependencia,
  parseFunctions,
  obtenerHojaPlanta,
  obtenerHojaPerno,
  detectarFilaEncabezadoPlanta,
  detectarFilaEncabezadoPerno,
  procesarExtraccionPlanta,
  procesarExtraccionPerno,
};
