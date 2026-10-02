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

  // 1. Cargar plantilla oficial
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
  ws.getCell('A8').alignment = { wrapText: true, vertical: 'top' };

  const reqFormacion = cargo.requisitos_formacion || cargo.requisitos || '';
  ws.getCell('G8').value = reqFormacion;
  ws.getCell('G8').alignment = { wrapText: true, vertical: 'top' };

  // ----------------------------------------------------
  // ----------------------------------------------------
  // 4. FORMACIÓN ACADÉMICA (Filas 11 a 32)
  // ----------------------------------------------------
  // Rescate de salvaguarda: si algún título formal quedó erróneamente en documentos_no_aplican
  const noAplicanLimpios = [];
  const formacionCompleta = [...formacion];

  noAplican.forEach(item => {
    const desc = (item.descripcion || '').toUpperCase();
    const id = (item.id || '').toUpperCase();
    const tipoDoc = (item.tipo_documento || '').toUpperCase();
    const motivo = (item.motivo_no_aplica || '').toUpperCase();
    const archivo = (item.nombre_archivo || '').toUpperCase();
    const entidad = (item.entidad || '').toUpperCase();

    // Si es un certificado laboral o de experiencia, NUNCA debe considerarse título académico
    const esExperienciaLaboral = id.includes('CERT') || desc.startsWith('CERT-') || tipoDoc.includes('EXPERIENCIA') || motivo.includes('EXPERIENCIA') || motivo.includes('FUNCIONES');
    // Educación continua o informal no constituye título formal habilitante
    const esEducacionInformal = desc.includes('DIPLOMADO') || desc.includes('SEMINARIO') || desc.includes('CURSO') || desc.includes('CONGRESO') || desc.includes('CAPACITACION') || desc.includes('TALLER') || desc.includes('HORAS') || archivo.includes('DIPLOMADO') || archivo.includes('CURSO') || archivo.includes('SEMINARIO');

    if (esExperienciaLaboral || esEducacionInformal) {
      noAplicanLimpios.push(item);
      return;
    }

    const texto = `${desc} ${archivo} ${motivo} ${entidad}`;
    const esBachiller = texto.includes('BACHILLER') || texto.includes('BACHILLERATO') || texto.includes('EDUCACION MEDIA') || texto.includes('SECUNDARIA');
    const esTecnico = texto.includes('TECNIC') && !texto.includes('TECNOLOG');
    const esTecnologo = texto.includes('TECNOLOG');
    const esTarjeta = texto.includes('TARJETA PROFESIONAL') || texto.includes('MATRICULA PROFESIONAL') || texto.includes('REGISTRO PROFESIONAL');
    const esPosgrado = texto.includes('ESPECIALIZ') || texto.includes('MAESTR') || texto.includes('MAGISTER') || texto.includes('DOCTOR');
    const esPregrado = texto.includes('PREGRADO') || texto.includes('TITULO PROFESIONAL') || texto.includes('ACTA DE GRADO') || texto.includes('LICENCIAT');

    if (esBachiller || esTecnico || esTecnologo || esTarjeta || esPosgrado || esPregrado) {
      let tipo = 'PREGRADO';
      if (esBachiller) tipo = 'BACHILLER';
      else if (esTecnico) tipo = 'TECNICO';
      else if (esTecnologo) tipo = 'TECNOLOGO';
      else if (esTarjeta) tipo = 'TARJETA_PROFESIONAL';
      else if (esPosgrado) tipo = 'POSGRADO';

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
  const tecnicos = [];
  const tecnologos = [];
  const pregrados = [];
  const posgrados = [];
  let tarjeta = null;

  formacionCompleta.forEach(item => {
    const tipo = (item.tipo || '').toUpperCase();
    const titulo = (item.titulo_obtenido || '').toUpperCase();
    if (tipo === 'BACHILLER' || titulo.includes('BACHILLER') || titulo.includes('BACHILLERATO') || titulo.includes('EDUCACION MEDIA') || titulo.includes('SECUNDARIA')) {
      if (!bachiller) bachiller = item;
    } else if (tipo === 'TECNICO' || (titulo.includes('TECNIC') && !titulo.includes('TECNOLOG'))) {
      tecnicos.push(item);
    } else if (tipo === 'TECNOLOGO' || tipo === 'TECNOLOGIA' || titulo.includes('TECNOLOG')) {
      tecnologos.push(item);
    } else if (tipo === 'POSGRADO' || tipo === 'ESPECIALIZACION' || tipo === 'MAESTRIA' || tipo === 'DOCTORADO' || titulo.includes('ESPECIALIZ') || titulo.includes('MAESTR') || titulo.includes('DOCTOR') || titulo.includes('MAGISTER')) {
      posgrados.push(item);
    } else if (tipo === 'PREGRADO' || tipo === 'PROFESIONAL' || tipo === 'UNIVERSITARIO' || (!titulo.includes('ESPECIALIZ') && !titulo.includes('MAESTR') && !titulo.includes('DOCTOR') && tipo !== 'TARJETA_PROFESIONAL')) {
      pregrados.push(item);
    } else if (tipo === 'TARJETA_PROFESIONAL' || titulo.includes('TARJETA') || item.numero_tarjeta_o_registro) {
      if (!tarjeta) tarjeta = item;
    }
  });

  // Fila 11: Bachiller (1 fila fija, deja campos vacíos si no hay)
  if (bachiller) {
    ws.getCell('B11').value = bachiller.titulo_obtenido;
    ws.getCell('H11').value = bachiller.institucion;
    ws.getCell('N11').value = parseFecha(bachiller.fecha_grado);
  } else {
    ws.getCell('B11').value = null;
    ws.getCell('H11').value = null;
    ws.getCell('N11').value = null;
  }

  // Filas 12 a 15: Técnicos (4 filas preparadas en plantilla)
  const tecnicosCount = Math.max(1, tecnicos.length);
  for (let i = 0; i < 4; i++) {
    const r = 12 + i;
    if (i < tecnicos.length) {
      ws.getCell(`B${r}`).value = tecnicos[i].titulo_obtenido;
      ws.getCell(`H${r}`).value = tecnicos[i].institucion;
      ws.getCell(`N${r}`).value = parseFecha(tecnicos[i].fecha_grado);
    } else {
      ws.getCell(`B${r}`).value = null;
      ws.getCell(`H${r}`).value = null;
      ws.getCell(`N${r}`).value = null;
      if (i >= tecnicosCount) {
        ws.getRow(r).hidden = true;
      }
    }
  }

  // Filas 16 a 19: Tecnólogos (4 filas preparadas en plantilla)
  const tecnologosCount = Math.max(1, tecnologos.length);
  for (let i = 0; i < 4; i++) {
    const r = 16 + i;
    if (i < tecnologos.length) {
      ws.getCell(`B${r}`).value = tecnologos[i].titulo_obtenido;
      ws.getCell(`H${r}`).value = tecnologos[i].institucion;
      ws.getCell(`N${r}`).value = parseFecha(tecnologos[i].fecha_grado);
    } else {
      ws.getCell(`B${r}`).value = null;
      ws.getCell(`H${r}`).value = null;
      ws.getCell(`N${r}`).value = null;
      if (i >= tecnologosCount) {
        ws.getRow(r).hidden = true;
      }
    }
  }

  // Filas 20 a 23: Pregrados (4 filas preparadas en plantilla)
  const pregradosCount = Math.max(1, pregrados.length);
  for (let i = 0; i < 4; i++) {
    const r = 20 + i;
    if (i < pregrados.length) {
      ws.getCell(`B${r}`).value = pregrados[i].titulo_obtenido;
      ws.getCell(`H${r}`).value = pregrados[i].institucion;
      ws.getCell(`N${r}`).value = parseFecha(pregrados[i].fecha_grado);
    } else {
      ws.getCell(`B${r}`).value = null;
      ws.getCell(`H${r}`).value = null;
      ws.getCell(`N${r}`).value = null;
      if (i >= pregradosCount) {
        ws.getRow(r).hidden = true;
      }
    }
  }

  // Filas 24 a 31: Posgrados (8 filas preparadas en plantilla)
  const posgradosCount = Math.max(1, posgrados.length);
  for (let i = 0; i < 8; i++) {
    const r = 24 + i;
    if (i < posgrados.length) {
      ws.getCell(`B${r}`).value = posgrados[i].titulo_obtenido;
      ws.getCell(`H${r}`).value = posgrados[i].institucion;
      ws.getCell(`N${r}`).value = parseFecha(posgrados[i].fecha_grado);
    } else {
      ws.getCell(`B${r}`).value = null;
      ws.getCell(`H${r}`).value = null;
      ws.getCell(`N${r}`).value = null;
      if (i >= posgradosCount) {
        ws.getRow(r).hidden = true;
      }
    }
  }

  // Fila 32: Tarjeta profesional
  if (tarjeta) {
    ws.getCell('B32').value = tarjeta.numero_tarjeta_o_registro || tarjeta.titulo_obtenido || 'NO CONSTA';
    ws.getCell('H32').value = parseFecha(tarjeta.fecha_grado || tarjeta.fecha_expedicion);
  } else {
    ws.getCell('B32').value = null;
    ws.getCell('H32').value = null;
  }

  // ----------------------------------------------------
  // 5. EXPERIENCIA LABORAL
  // ----------------------------------------------------
  // Localizar dinámicamente la sección 2.2. EXPERIENCIA
  let expHeaderIdx = -1;
  for (let r = 10; r <= ws.rowCount; r++) {
    const val = String(ws.getRow(r).getCell('A').value || '');
    if (val.includes('2.2. EXPERIENCIA')) {
      expHeaderIdx = r;
      break;
    }
  }

  // Los certificados inician 3 filas abajo del encabezado (después de encabezados nivel 1 y 2)
  const startExp = expHeaderIdx + 3;

  // Localizar la fila "TIEMPO DE EXPERIENCIA"
  let sumRowIdx = -1;
  for (let r = startExp; r <= ws.rowCount; r++) {
    const val = String(ws.getRow(r).getCell('A').value || '');
    if (val.includes('TIEMPO DE EXPERIENCIA')) {
      sumRowIdx = r;
      break;
    }
  }

  const availableExpRows = sumRowIdx - startExp;
  const certsCount = Math.max(1, certs.length);

  // Limpiar cualquier fórmula compartida o valor previo en las filas de experiencia
  for (let r = startExp; r < sumRowIdx; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 15; c++) {
      row.getCell(c).value = null;
    }
  }

  // Llenar certificados
  for (let i = 0; i < certs.length; i++) {
    const r = startExp + i;
    const cert = certs[i];
    const row = ws.getRow(r);

    row.getCell('A').value = cert.entidad || 'N/A';
    row.getCell('B').value = cert.cargo_certificado || 'N/A';

    const fIniOriginal = parseFecha(cert.fecha_inicio);
    const fFin = cert.vinculo_vigente ? new Date() : parseFecha(cert.fecha_fin);

    // Validación de experiencia previa al grado / terminación de materias (Dcto 1083/2015 y Ley 2039/2020)
    const expPrevia = cert.verificacion_experiencia_previa;
    const esNoComputablePrevia = expPrevia && expPrevia.tipo_resultado === 'NO_COMPUTABLE_PREVIA_AL_GRADO';
    const esParcialCorte = expPrevia && expPrevia.tipo_resultado === 'COMPUTABLE_PARCIAL_DESDE_CORTE';
    const esLey2039 = expPrevia && expPrevia.tipo_resultado === 'COMPUTABLE_TOTAL_LEY_2039';

    // Si es computable parcial, la fecha de inicio en celda C es la fecha de corte profesional
    let fIni = fIniOriginal;
    if (esParcialCorte && expPrevia.fecha_inicio_computable) {
      fIni = parseFecha(expPrevia.fecha_inicio_computable);
    }
    row.getCell('C').value = fIni;
    if (fIni instanceof Date) row.getCell('C').numFmt = 'yyyy-mm-dd';

    row.getCell('D').value = fFin;
    if (fFin instanceof Date) row.getCell('D').numFmt = 'yyyy-mm-dd';

    const esRel = (cert.clasificacion_experiencia || '').toUpperCase() === 'RELACIONADA';

    if (esNoComputablePrevia) {
      row.getCell('E').value = 'No Computable';
    } else {
      row.getCell('E').value = esRel ? 'Relacionada' : 'Profesional';
    }

    // 1. Determinar si hay traslape total
    const tieneTraslapeTotal = Boolean(
      cert.es_traslape_total === true ||
      (cert.traslapes && cert.traslapes.some(t => (t.tipo || '').toUpperCase().includes('TOTAL'))) ||
      (cert.tiempo_valido && cert.tiempo_valido.dias_totales === 0 && (cert.tiempo_certificado?.dias_totales > 0 || cert.tiempo_certificado?.meses_totales > 0)) ||
      (cert.tiempo_valido_meses === 0 && Number(cert.tiempo_certificado?.meses_totales || 0) > 0)
    );

    // 2. Extraer y formatear TODAS las funciones coincidentes (cotejo explícito con el cargo oficial)
    const funcionesCoincidentes = cert.experiencia_relacionada?.funciones_coincidentes || [];
    let textoFunciones = '';
    if (funcionesCoincidentes.length > 0) {
      textoFunciones = funcionesCoincidentes.map((f, fIdx) => {
        const fCert = (f.funcion_certificada || f.funcion || '').trim();
        const fCargo = (f.funcion_del_cargo || '').trim();
        const rel = f.coincidencia ? ` [${f.coincidencia}]` : '';
        if (fCargo) {
          return `${fIdx + 1}. Cert: "${fCert}" ➔ Empleo: "${fCargo}"${rel}`;
        }
        return `${fIdx + 1}. Cert: "${fCert}"`;
      }).join('\n');
    } else if (Array.isArray(cert.funciones_certificadas) && cert.funciones_certificadas.length > 0) {
      textoFunciones = cert.funciones_certificadas.map((fc, fcIdx) => {
        const fText = typeof fc === 'string' ? fc : (fc.funcion || '');
        return `${fcIdx + 1}. "${fText}"`;
      }).join('\n');
    }

    // 3. Asignar columnas F (Observación Exp Relacionada) y K (Observación Exp General)
    if (esNoComputablePrevia) {
      // No computable bajo Dcto 1083 de 2015 por ser previo al grado / terminación pénsum
      row.getCell('F').value = `NO COMPUTABLE [Dcto 1083/2015]: Experiencia previa a la obtención del título profesional / terminación de materias. No reúne condiciones de Ley 2039 de 2020 ni Dcto 952 de 2021.`;
      row.getCell('K').value = 'Traslape Total'; // Activa "-" en fórmulas M, N, O de experiencia general
      row.getCell('F').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('K').alignment = { wrapText: true, vertical: 'top' };
    } else if (esRel) {
      let prefijoNormativo = '';
      if (esParcialCorte) {
        prefijoNormativo = `[Dcto 1083/2015: Inició ${cert.fecha_inicio} previo al grado. Tramo computable desde ${expPrevia.fecha_inicio_computable}]\n`;
      } else if (esLey2039) {
        prefijoNormativo = `[Ley 2039/2020 y Dcto 952/2021: Modalidad previa reconocida (${expPrevia.tipo_experiencia_previa}) relacionada con la profesión]\n`;
      }

      if (tieneTraslapeTotal) {
        row.getCell('F').value = 'Traslape Total';
        if (textoFunciones || prefijoNormativo) {
          row.getCell('F').note = `TRASLAPE TOTAL: periodo simultáneo cubierto en su totalidad.\n${prefijoNormativo}\nFunciones coincidentes con el empleo:\n${textoFunciones}`;
        }
      } else {
        let obsTexto = prefijoNormativo;
        if (cert.traslapes && cert.traslapes.length > 0) {
          const tParciales = cert.traslapes.filter(t => !(t.tipo || '').toUpperCase().includes('TOTAL'));
          if (tParciales.length > 0) {
            obsTexto += `[TRASLAPE PARCIAL: ${tParciales.map(t => `${t.tiempo_a_excluir_meses || 0} meses`).join(', ')}]\n`;
          }
        }
        obsTexto += (textoFunciones || 'Experiencia laboral relacionada con las funciones del cargo.');
        row.getCell('F').value = obsTexto;
      }
      row.getCell('F').alignment = { wrapText: true, vertical: 'top' };
    } else {
      // Experiencia profesional no relacionada
      let prefijoNormativo = '';
      if (esParcialCorte) {
        prefijoNormativo = `[Dcto 1083/2015: Tramo previo excluido. Computable desde ${expPrevia.fecha_inicio_computable}]\n`;
      } else if (esLey2039) {
        prefijoNormativo = `[Ley 2039/2020: Modalidad previa reconocida]\n`;
      }

      if (tieneTraslapeTotal) {
        row.getCell('K').value = 'Traslape Total';
        row.getCell('F').value = prefijoNormativo + 'Experiencia profesional no relacionada.';
      } else {
        row.getCell('F').value = prefijoNormativo + 'Experiencia profesional no relacionada.';
        if (cert.traslapes && cert.traslapes.length > 0) {
          row.getCell('K').value = `Traslape parcial: ${cert.traslapes.map(t => `${t.tiempo_a_excluir_meses || 0} meses`).join(', ')}`;
        }
      }
      row.getCell('F').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('K').alignment = { wrapText: true, vertical: 'top' };
    }

    // Fórmulas oficiales DATEDIF
    row.getCell('H').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y")),"-")` };
    row.getCell('I').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"YM")),"-")` };
    row.getCell('J').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Md")),"-")` };

    row.getCell('M').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y"))` };
    row.getCell('N').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"YM"))` };
    row.getCell('O').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"MD"))` };
  }

  // Ocultar filas de experiencia sobrantes (de startExp + certs.length hasta 66)
  // De esta forma NO se rompen los merges ni las fórmulas compartidas de las filas 37 y 38
  const maxExpRows = 66;
  const startEmpty = startExp + certs.length;
  for (let r = startEmpty; r <= maxExpRows; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 7; c++) {
      row.getCell(c).value = null;
    }
    row.getCell('K').value = null;
    row.getCell('L').value = null;
    row.hidden = true;
  }

  // Actualizar fechas y textos de firmas en el pie de página
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  const fechaExpedicionStr = `${dia}/${mes}/${anio}`;

  for (let r = 67; r <= ws.rowCount; r++) {
    const cellVal = String(ws.getRow(r).getCell('A').value || '');
    if (cellVal.includes('Fecha de Expedición')) {
      ws.getRow(r).getCell('A').value = `Fecha de Expedición: ${fechaExpedicionStr}`;
    } else if (cellVal.includes('Elaborado por')) {
      ws.getRow(r).getCell('A').value = 'Elaborado por:';
    } else if (cellVal.includes('Revisado por')) {
      ws.getRow(r).getCell('A').value = 'Revisado por:';
    }
  }

  // ----------------------------------------------------
  // 6. HOJA 2: DOCUMENTOS Y CERTIFICACIONES QUE NO APLICAN
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
  // 7. HOJA 3: COTEJO FUNCIONAL DETALLADO
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
