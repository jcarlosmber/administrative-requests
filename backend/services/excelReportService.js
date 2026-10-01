/**
 * Servicio de Generación de Reportes Excel - Formato Oficial 2311300-FT-318
 * Certificado de Cumplimiento de Requisitos para Tomar Posesión
 * Dirección de Gestión Corporativa - Secretaría Jurídica Distrital
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function generarReporteExcelValidacion(data) {
  const templatePath = path.join(__dirname, '../templates/2311300-FT-318_template.xlsx');
  const workbook = new ExcelJS.Workbook();

  // 1. Cargar plantilla oficial o inicializar libro nuevo si no existiera
  let ws;
  if (fs.existsSync(templatePath)) {
    await workbook.xlsx.readFile(templatePath);
    ws = workbook.worksheets[0];
    ws.name = 'FORMATO FT-318';
    ws.tables = {};
  } else {
    ws = workbook.addWorksheet('FORMATO FT-318', {
      views: [{ showGridLines: true }]
    });
    ws.tables = {};
  }

  const candidato = data.candidato || {};
  const cargo = data.cargo_evaluado || {};
  const consolidado = data.consolidado || {};
  const formacion = data.formacion_academica || [];
  const certs = data.certificados || [];
  const noAplican = data.documentos_no_aplican || [];

  const parseFecha = (str) => {
    if (!str || str === 'NO CONSTA' || str === 'Vigente') return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d;
  };

  // ----------------------------------------------------
  // 1. DATOS DEL FUNCIONARIO (Fila 4)
  // ----------------------------------------------------
  ws.getCell('B4').value = (candidato.nombre || 'N/A').toUpperCase();
  ws.getCell('F4').value = candidato.documento ? String(candidato.documento) : 'N/A';
  ws.getCell('I4').value = candidato.telefono || 'N/A';
  ws.getCell('M4').value = candidato.email || 'N/A';

  // ----------------------------------------------------
  // 2. DATOS DEL CARGO (Fila 5)
  // ----------------------------------------------------
  ws.getCell('B5').value = (cargo.dependencia || 'SECRETARÍA JURÍDICA DISTRITAL').toUpperCase();
  ws.getCell('E5').value = (cargo.nombre || 'N/A').toUpperCase();
  ws.getCell('J5').value = cargo.codigo ? String(cargo.codigo) : 'N/A';
  ws.getCell('N5').value = cargo.grado ? String(cargo.grado) : 'N/A';

  // ----------------------------------------------------
  // 3. REQUISITOS DEL CARGO (Fila 8)
  // ----------------------------------------------------
  const reqMeses = consolidado.requisito_minimo_meses || cargo.requisito_experiencia_meses || 0;
  ws.getCell('A8').value = `${reqMeses} meses de experiencia profesional relacionada con las funciones del cargo.`;
  if (cargo.requisitos_formacion || cargo.requisitos) {
    ws.getCell('G8').value = cargo.requisitos_formacion || cargo.requisitos;
  }

  // ----------------------------------------------------
  // 4. FORMACIÓN ACADÉMICA (Filas 11 a 17)
  // ----------------------------------------------------
  // Rescate de salvaguarda: si algún diploma de bachiller, técnico, pregrado,
  // posgrado o tarjeta profesional quedó en documentos_no_aplican, lo recuperamos:
  const noAplicanLimpios = [];
  const formacionCompleta = [...formacion];

  noAplican.forEach(item => {
    const texto = `${item.descripcion || ''} ${item.nombre_archivo || ''} ${item.motivo_no_aplica || ''} ${item.entidad || ''}`.toUpperCase();
    const esBachiller = texto.includes('BACHILLER') || texto.includes('BACHILLERATO') || texto.includes('EDUCACION MEDIA') || texto.includes('SECUNDARIA') || texto.includes('COLEGIO');
    const esTecnico = texto.includes('TECNIC') || texto.includes('TECNOLOG');
    const esTarjeta = texto.includes('TARJETA PROFESIONAL') || texto.includes('MATRICULA PROFESIONAL') || texto.includes('REGISTRO PROFESIONAL');
    const esPosgrado = texto.includes('ESPECIALIZ') || texto.includes('MAESTR') || texto.includes('MAGISTER') || texto.includes('DOCTOR');
    const esPregrado = texto.includes('PREGRADO') || texto.includes('ABOGAD') || texto.includes('LICENCIAT') || texto.includes('INGENIER') || texto.includes('DIPLOMA') || texto.includes('ACTA DE GRADO');

    if (esBachiller || esTecnico || esTarjeta || esPosgrado || esPregrado) {
      let tipo = 'PREGRADO';
      if (esBachiller) tipo = 'BACHILLER';
      else if (esTecnico) tipo = 'TECNICO';
      else if (esTarjeta) tipo = 'TARJETA_PROFESIONAL';
      else if (esPosgrado) tipo = 'POSGRADO';

      // Extraer posible fecha del texto si fecha_grado no consta
      let fechaDetectada = item.fecha_grado || null;
      if (!fechaDetectada || fechaDetectada === 'NO CONSTA') {
        const matchFecha = (item.descripcion || item.motivo_no_aplica || '').match(/\b(19\d\d|20\d\d)[-\/\.]\d{1,2}[-\/\.]\d{1,2}\b|\b\d{1,2}[-\/\.]\d{1,2}[-\/\.](19\d\d|20\d\d)\b|\b(19\d\d|20\d\d)\b/);
        if (matchFecha) fechaDetectada = matchFecha[0];
      }

      formacionCompleta.push({
        tipo: tipo,
        titulo_obtenido: item.descripcion || item.nombre_archivo || (esBachiller ? 'Bachiller' : 'Título Formativo'),
        institucion: item.entidad && item.entidad !== 'NO CONSTA' ? item.entidad : (item.descripcion ? item.descripcion.split(' - ')[0] : 'Institución Educativa'),
        fecha_grado: fechaDetectada || 'NO CONSTA',
        numero_tarjeta_o_registro: item.numero_tarjeta || 'NO CONSTA'
      });
    } else {
      noAplicanLimpios.push(item);
    }
  });

  let bachiller = null;
  let tecnico = null;
  let pregrado = null;
  const posgrados = [];
  let tarjeta = null;

  formacionCompleta.forEach(item => {
    const tipo = (item.tipo || '').toUpperCase();
    const titulo = (item.titulo_obtenido || '').toUpperCase();
    if (tipo === 'BACHILLER' || titulo.includes('BACHILLER') || titulo.includes('BACHILLERATO') || titulo.includes('EDUCACION MEDIA') || titulo.includes('SECUNDARIA')) {
      if (!bachiller) bachiller = item;
    } else if (tipo === 'TECNICO' || tipo === 'TECNOLOGO' || titulo.includes('TECNIC') || titulo.includes('TECNOLOG')) {
      if (!tecnico) tecnico = item;
    } else if (tipo === 'PREGRADO' || tipo === 'PROFESIONAL' || (!pregrado && !titulo.includes('ESPECIALIZ') && !titulo.includes('MAESTR') && !titulo.includes('DOCTOR') && tipo !== 'TARJETA_PROFESIONAL')) {
      if (!pregrado) pregrado = item;
    } else if (tipo === 'POSGRADO' || tipo === 'ESPECIALIZACION' || tipo === 'MAESTRIA' || tipo === 'DOCTORADO' || titulo.includes('ESPECIALIZ') || titulo.includes('MAESTR') || titulo.includes('DOCTOR')) {
      posgrados.push(item);
    } else if (tipo === 'TARJETA_PROFESIONAL' || titulo.includes('TARJETA') || item.numero_tarjeta_o_registro) {
      if (!tarjeta) tarjeta = item;
    }
  });

  // Bachiller (Fila 11)
  if (bachiller) {
    ws.getCell('B11').value = bachiller.titulo_obtenido;
    ws.getCell('H11').value = bachiller.institucion;
    ws.getCell('N11').value = parseFecha(bachiller.fecha_grado);
  } else {
    ws.getCell('B11').value = 'NO REGISTRA';
    ws.getCell('H11').value = 'NO REGISTRA';
    ws.getCell('N11').value = null;
  }

  // Técnico (Fila 12)
  if (tecnico) {
    ws.getCell('B12').value = tecnico.titulo_obtenido;
    ws.getCell('H12').value = tecnico.institucion;
    ws.getCell('N12').value = parseFecha(tecnico.fecha_grado);
  } else {
    ws.getCell('B12').value = 'NO REGISTRA';
    ws.getCell('H12').value = 'NO REGISTRA';
    ws.getCell('N12').value = null;
  }

  // Pregrado (Fila 13)
  if (pregrado) {
    ws.getCell('B13').value = pregrado.titulo_obtenido;
    ws.getCell('H13').value = pregrado.institucion;
    ws.getCell('N13').value = parseFecha(pregrado.fecha_grado);
  } else {
    ws.getCell('B13').value = 'NO REGISTRA';
    ws.getCell('H13').value = 'NO REGISTRA';
    ws.getCell('N13').value = null;
  }

  // Posgrados (Filas 14, 15, 16)
  const posgradoRows = [14, 15, 16];
  posgradoRows.forEach((r, idx) => {
    if (posgrados[idx]) {
      ws.getCell(`B${r}`).value = posgrados[idx].titulo_obtenido;
      ws.getCell(`H${r}`).value = posgrados[idx].institucion;
      ws.getCell(`N${r}`).value = parseFecha(posgrados[idx].fecha_grado);
    } else {
      ws.getCell(`B${r}`).value = 'NO REGISTRA';
      ws.getCell(`H${r}`).value = 'NO REGISTRA';
      ws.getCell(`N${r}`).value = null;
    }
  });

  // Tarjeta profesional (Fila 17)
  if (tarjeta) {
    ws.getCell('B17').value = tarjeta.numero_tarjeta_o_registro || tarjeta.titulo_obtenido || 'NO CONSTA';
    ws.getCell('L17').value = parseFecha(tarjeta.fecha_grado || tarjeta.fecha_expedicion);
  } else {
    ws.getCell('B17').value = 'NO REGISTRA';
    ws.getCell('L17').value = null;
  }

  // ----------------------------------------------------
  // 5. EXPERIENCIA LABORAL (Filas 21 en adelante)
  // ----------------------------------------------------
  const maxInitialRows = 11; // Plantilla original filas 21 a 31
  const certCount = certs.length;
  const totalRowsNeeded = Math.max(maxInitialRows, certCount);

  if (certCount > maxInitialRows) {
    const extraRows = certCount - maxInitialRows;
    for (let i = 0; i < extraRows; i++) {
      ws.insertRow(32, []);
    }
  }

  const startExpRow = 21;
  const endExpRow = 20 + totalRowsNeeded;
  const sumRowIdx = endExpRow + 1;
  const totalRowIdx = endExpRow + 2;

  for (let r = startExpRow; r <= endExpRow; r++) {
    const certIdx = r - startExpRow;
    const cert = certs[certIdx];
    const row = ws.getRow(r);

    if (cert) {
      row.getCell('A').value = cert.entidad || 'N/A';
      row.getCell('B').value = cert.cargo_certificado || 'N/A';

      const fIni = parseFecha(cert.fecha_inicio);
      row.getCell('C').value = fIni;
      if (fIni instanceof Date) row.getCell('C').numFmt = 'yyyy-mm-dd';

      const fFin = cert.vinculo_vigente ? new Date() : parseFecha(cert.fecha_fin);
      row.getCell('D').value = fFin;
      if (fFin instanceof Date) row.getCell('D').numFmt = 'yyyy-mm-dd';

      const esRelacionada = (cert.clasificacion_experiencia || '').toUpperCase() === 'RELACIONADA';
      row.getCell('E').value = esRelacionada ? 'Relacionada' : 'Profesional';

      let obs = '';
      if (cert.traslapes && cert.traslapes.length > 0) {
        obs = cert.traslapes.map(t => t.explicacion).join('; ');
      } else if (cert.experiencia_relacionada?.funciones_coincidentes?.length > 0) {
        obs = `${cert.experiencia_relacionada.funciones_coincidentes.length} funciones coincidentes con el empleo`;
      }
      row.getCell('F').value = obs || null;

      // Fórmulas oficiales DATEDIF
      row.getCell('H').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y")),"-")` };
      row.getCell('I').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"YM")),"-")` };
      row.getCell('J').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Md")),"-")` };

      row.getCell('M').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y"))` };
      row.getCell('N').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"YM"))` };
      row.getCell('O').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"MD"))` };
    } else {
      // Limpiar fila vacía sobrante
      for (let c = 1; c <= 15; c++) {
        row.getCell(c).value = null;
      }
    }
  }

  // Fórmulas de Suma de Experiencia
  ws.getCell(`H${sumRowIdx}`).value = { formula: `SUM(H${startExpRow}:H${endExpRow})` };
  ws.getCell(`I${sumRowIdx}`).value = { formula: `SUM(I${startExpRow}:I${endExpRow})` };
  ws.getCell(`J${sumRowIdx}`).value = { formula: `SUM(J${startExpRow}:J${endExpRow})` };

  ws.getCell(`M${sumRowIdx}`).value = { formula: `SUM(M${startExpRow}:M${endExpRow})` };
  ws.getCell(`N${sumRowIdx}`).value = { formula: `SUM(N${startExpRow}:N${endExpRow})` };
  ws.getCell(`O${sumRowIdx}`).value = { formula: `SUM(O${startExpRow}:O${endExpRow})` };

  // Fórmulas de Conversión TOTAL
  ws.getCell(`H${totalRowIdx}`).value = { formula: `+INT((SUM(I${startExpRow}:I${endExpRow})+INT((SUM(J${startExpRow}:J${endExpRow})/30)))/12)+H${sumRowIdx}` };
  ws.getCell(`I${totalRowIdx}`).value = { formula: `(((SUM(I${startExpRow}:I${endExpRow})+INT(SUM(J${startExpRow}:J${endExpRow})/30))/12)-(INT((SUM(I${startExpRow}:I${endExpRow})+INT((SUM(J${startExpRow}:J${endExpRow})/30)))/12)))*12` };
  ws.getCell(`J${totalRowIdx}`).value = { formula: `(SUM(J${startExpRow}:J${endExpRow})/30-INT(SUM(J${startExpRow}:J${endExpRow})/30))*30` };

  ws.getCell(`M${totalRowIdx}`).value = { formula: `+INT((SUM(N${startExpRow}:N${endExpRow})+INT((SUM(O${startExpRow}:O${endExpRow})/30)))/12)+M${sumRowIdx}` };
  ws.getCell(`N${totalRowIdx}`).value = { formula: `(((SUM(N${startExpRow}:N${endExpRow})+INT(SUM(O${startExpRow}:O${endExpRow})/30))/12)-(INT((SUM(N${startExpRow}:N${endExpRow})+INT((SUM(O${startExpRow}:O${endExpRow})/30)))/12)))*12` };
  ws.getCell(`O${totalRowIdx}`).value = { formula: `(SUM(O${startExpRow}:O${endExpRow})/30-INT(SUM(O${startExpRow}:O${endExpRow})/30))*30` };

  // ----------------------------------------------------
  // 6. FIRMAS Y PIE DE PÁGINA
  // ----------------------------------------------------
  const firmaRow = totalRowIdx + 3;
  ws.getCell(`E${firmaRow}`).value = 'DIRECTOR (A) DE GESTION CORPORATIVA';

  const expDateRow = firmaRow + 2;
  ws.getCell(`A${expDateRow}`).value = `Fecha de Expedición: Ver fecha de firma (${new Date().toLocaleDateString('es-CO')})`;

  const elabRow = expDateRow + 1;
  const evaluadorTxt = data.evaluador || data.candidato?.evaluador || 'Profesional Universitario DGC';
  ws.getCell(`A${elabRow}`).value = `Elaborado por: Sistema de Validación SASGE - ${evaluadorTxt}`;

  const revRow = elabRow + 1;
  ws.getCell(`A${revRow}`).value = `Revisado por: Dirección de Gestión Corporativa`;

  // ----------------------------------------------------
  // 7. HOJA 2: DOCUMENTOS Y CERTIFICACIONES QUE NO APLICAN
  // ----------------------------------------------------
  const wsNoAplican = workbook.addWorksheet('Documentos NO Aplican', {
    views: [{ showGridLines: false }]
  });

  wsNoAplican.columns = [
    { header: 'No.', key: 'num', width: 6 },
    { header: 'Documento / Archivo', key: 'doc', width: 35 },
    { header: 'Entidad Emisora', key: 'entidad', width: 30 },
    { header: '¿Por qué no aplica al cargo? (Motivo)', key: 'motivo', width: 50 },
    { header: 'Sustento / Criterio Técnico', key: 'sustento', width: 45 }
  ];

  const headerRowNo = wsNoAplican.getRow(1);
  headerRowNo.height = 28;
  headerRowNo.eachCell(cell => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  if (noAplicanLimpios.length === 0) {
    const r = wsNoAplican.addRow([1, 'N/A', 'N/A', 'Todos los documentos aportados son válidos y computables para la evaluación del cargo.', 'Cumple con los requisitos del perfil.']);
    r.font = { name: 'Arial', size: 10, italic: true };
  } else {
    noAplicanLimpios.forEach((d, idx) => {
      const r = wsNoAplican.addRow([
        idx + 1,
        d.descripcion || d.nombre_archivo || `Documento ${idx + 1}`,
        d.entidad || 'NO CONSTA',
        d.motivo_no_aplica || 'No computable para la experiencia laboral del cargo',
        d.sustento_criterio || 'Criterio técnico de equivalencia y manual de funciones'
      ]);
      r.height = 32;
      r.font = { name: 'Arial', size: 9 };
      r.alignment = { vertical: 'middle', wrapText: true };
      r.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  }

  // ----------------------------------------------------
  // 8. HOJA 3: COTEJO FUNCIONAL DETALLADO
  // ----------------------------------------------------
  const wsCotejo = workbook.addWorksheet('Cotejo Funcional', {
    views: [{ showGridLines: false }]
  });

  wsCotejo.columns = [
    { header: 'ID Cert.', key: 'id_cert', width: 14 },
    { header: 'Entidad Emisora', key: 'entidad', width: 28 },
    { header: 'Cargo Certificado', key: 'cargo_cert', width: 28 },
    { header: 'Función del Empleo SJD', key: 'func_cargo', width: 45 },
    { header: 'Evidencia Textual en Certificado', key: 'evidencia', width: 45 },
    { header: 'Criterio de Equivalencia', key: 'criterio', width: 35 },
    { header: 'Coincidencia', key: 'coincidencia', width: 16 }
  ];

  const headerRowCotejo = wsCotejo.getRow(1);
  headerRowCotejo.height = 28;
  headerRowCotejo.eachCell(cell => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  let cotejoCount = 0;
  certs.forEach(c => {
    const coincidencias = c.experiencia_relacionada?.funciones_coincidentes || [];
    coincidencias.forEach(f => {
      cotejoCount++;
      const r = wsCotejo.addRow([
        c.id_certificado || 'Certificado',
        c.entidad || 'N/A',
        c.cargo_certificado || 'N/A',
        f.funcion_del_cargo || 'Función del cargo evaluado',
        f.evidencia_textual || f.funcion_certificada || 'Evidencia textual en certificado',
        f.justificacion || 'Cotejo funcional positivo',
        f.coincidencia || 'COINCIDENTE'
      ]);
      r.height = 36;
      r.font = { name: 'Arial', size: 9 };
      r.alignment = { vertical: 'middle', wrapText: true };
      r.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  });

  if (cotejoCount === 0) {
    const r = wsCotejo.addRow(['N/A', 'N/A', 'N/A', 'No se registraron coincidencias directas en la evaluación.', 'N/A', 'N/A', 'SIN COINCIDENCIA']);
    r.font = { name: 'Arial', size: 9, italic: true };
  }

  // Generar Buffer del libro completo
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  generarReporteExcelValidacion
};
