const ExcelJS = require('../backend/node_modules/exceljs');
const path = require('path');
const fs = require('fs');

async function testFullService(data) {
  const templatePath = path.join(__dirname, '../backend/templates/2311300-FT-318_template.xlsx');
  const outputPath = path.join(__dirname, 'test_output_full.xlsx');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.worksheets[0];

  const candidato = data.candidato || {};
  const cargo = data.cargo_evaluado || {};
  const consolidado = data.consolidado || {};
  const formacion = data.formacion_academica || [];
  const certs = data.certificados || [];
  const noAplican = data.documentos_no_aplican || [];

  // 1. Datos del funcionario (Fila 4)
  ws.getCell('B4').value = (candidato.nombre || 'N/A').toUpperCase();
  ws.getCell('F4').value = candidato.documento ? String(candidato.documento) : 'N/A';
  ws.getCell('I4').value = candidato.telefono || 'N/A';
  ws.getCell('M4').value = candidato.email || 'N/A';

  // 2. Datos del cargo (Fila 5)
  ws.getCell('B5').value = (cargo.dependencia || 'Secretaría Jurídica Distrital').toUpperCase();
  ws.getCell('E5').value = (cargo.nombre || 'N/A').toUpperCase();
  ws.getCell('J5').value = cargo.codigo ? String(cargo.codigo) : 'N/A';
  ws.getCell('N5').value = cargo.grado ? String(cargo.grado) : 'N/A';

  // 3. Requisitos del cargo (Fila 8)
  const reqMeses = consolidado.requisito_minimo_meses || cargo.requisito_experiencia_meses || 0;
  ws.getCell('A8').value = `${reqMeses} meses de experiencia profesional relacionada con las funciones del cargo.`;
  
  if (cargo.requisitos_formacion || cargo.requisitos) {
    ws.getCell('G8').value = cargo.requisitos_formacion || cargo.requisitos;
  }

  // 4. Formación académica (Filas 11 a 17)
  // Clasificar formación recibida
  let bachiller = null;
  let tecnico = null;
  let pregrado = null;
  const posgrados = [];
  let tarjeta = null;

  formacion.forEach(item => {
    const tipo = (item.tipo || '').toUpperCase();
    const titulo = (item.titulo_obtenido || '').toUpperCase();
    if (tipo === 'BACHILLER' || titulo.includes('BACHILLER')) {
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

  const parseFecha = (str) => {
    if (!str || str === 'NO CONSTA' || str === 'Vigente') return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d;
  };

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

  // 5. Experiencia laboral (Filas 21 en adelante)
  const maxInitialRows = 11; // 21 a 31
  let certCount = certs.length;
  let totalRowsNeeded = Math.max(maxInitialRows, certCount);

  // Si necesitamos más de 11 filas, insertamos antes de la fila 32
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

  // Limpiar y llenar filas
  for (let r = startExpRow; r <= endExpRow; r++) {
    const certIdx = r - startExpRow;
    const cert = certs[certIdx];
    const row = ws.getRow(r);

    if (cert) {
      row.getCell('A').value = cert.entidad;
      row.getCell('B').value = cert.cargo_certificado;
      
      const fIni = parseFecha(cert.fecha_inicio);
      row.getCell('C').value = fIni;
      if (fIni instanceof Date) row.getCell('C').numFmt = 'yyyy-mm-dd';

      const fFin = cert.vinculo_vigente ? new Date() : parseFecha(cert.fecha_fin);
      row.getCell('D').value = fFin;
      if (fFin instanceof Date) row.getCell('D').numFmt = 'yyyy-mm-dd';

      const esRelacionada = (cert.clasificacion_experiencia || '').toUpperCase() === 'RELACIONADA';
      row.getCell('E').value = esRelacionada ? 'Relacionada' : 'Profesional';

      // Observaciones de traslapes o cotejo
      let obs = '';
      if (cert.traslapes && cert.traslapes.length > 0) {
        obs = cert.traslapes.map(t => t.explicacion).join('; ');
      } else if (cert.experiencia_relacionada?.funciones_coincidentes?.length > 0) {
        obs = `${cert.experiencia_relacionada.funciones_coincidentes.length} funciones coincidentes con el empleo`;
      }
      row.getCell('F').value = obs || null;

      // Fórmulas DATEDIF oficiales
      row.getCell('H').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y")),"-")` };
      row.getCell('I').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"YM")),"-")` };
      row.getCell('J').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Md")),"-")` };

      row.getCell('M').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y"))` };
      row.getCell('N').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"YM"))` };
      row.getCell('O').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"MD"))` };
    } else {
      // Limpiar fila vacía de la plantilla
      for (let c = 1; c <= 15; c++) {
        row.getCell(c).value = null;
      }
    }
  }

  // Fórmulas de Suma en sumRowIdx
  ws.getCell(`H${sumRowIdx}`).value = { formula: `SUM(H${startExpRow}:H${endExpRow})` };
  ws.getCell(`I${sumRowIdx}`).value = { formula: `SUM(I${startExpRow}:I${endExpRow})` };
  ws.getCell(`J${sumRowIdx}`).value = { formula: `SUM(J${startExpRow}:J${endExpRow})` };

  ws.getCell(`M${sumRowIdx}`).value = { formula: `SUM(M${startExpRow}:M${endExpRow})` };
  ws.getCell(`N${sumRowIdx}`).value = { formula: `SUM(N${startExpRow}:N${endExpRow})` };
  ws.getCell(`O${sumRowIdx}`).value = { formula: `SUM(O${startExpRow}:O${endExpRow})` };

  // Fórmulas de Conversión TOTAL en totalRowIdx
  ws.getCell(`H${totalRowIdx}`).value = { formula: `+INT((SUM(I${startExpRow}:I${endExpRow})+INT((SUM(J${startExpRow}:J${endExpRow})/30)))/12)+H${sumRowIdx}` };
  ws.getCell(`I${totalRowIdx}`).value = { formula: `(((SUM(I${startExpRow}:I${endExpRow})+INT(SUM(J${startExpRow}:J${endExpRow})/30))/12)-(INT((SUM(I${startExpRow}:I${endExpRow})+INT((SUM(J${startExpRow}:J${endExpRow})/30)))/12)))*12` };
  ws.getCell(`J${totalRowIdx}`).value = { formula: `(SUM(J${startExpRow}:J${endExpRow})/30-INT(SUM(J${startExpRow}:J${endExpRow})/30))*30` };

  ws.getCell(`M${totalRowIdx}`).value = { formula: `+INT((SUM(N${startExpRow}:N${endExpRow})+INT((SUM(O${startExpRow}:O${endExpRow})/30)))/12)+M${sumRowIdx}` };
  ws.getCell(`N${totalRowIdx}`).value = { formula: `(((SUM(N${startExpRow}:N${endExpRow})+INT(SUM(O${startExpRow}:O${endExpRow})/30))/12)-(INT((SUM(N${startExpRow}:N${endExpRow})+INT((SUM(O${startExpRow}:O${endExpRow})/30)))/12)))*12` };
  ws.getCell(`O${totalRowIdx}`).value = { formula: `(SUM(O${startExpRow}:O${endExpRow})/30-INT(SUM(O${startExpRow}:O${endExpRow})/30))*30` };

  // 6. Sección de Documentos que NO Aplican (debajo de la tabla de firmas o en sección complementaria)
  // En la plantilla, la firma está en E36 (ya combinada con G36)
  ws.getCell('E36').value = 'DIRECTOR (A) DE GESTION CORPORATIVA';
  ws.getCell('A38').value = `Fecha de Expedición: Ver fecha de firma (${new Date().toLocaleDateString('es-CO')})`;
  ws.getCell('A39').value = `Elaborado por: Sistema de Validación SASGE - Profesional DGC`;
  ws.getCell('A40').value = `Revisado por: Dirección de Gestión Corporativa`;

  // 7. Hoja 2: Documentos y Certificaciones que NO Aplican
  const wsNoAplican = wb.addWorksheet('Documentos NO Aplican', {
    views: [{ showGridLines: true }]
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
  });

  if (noAplican.length === 0) {
    const r = wsNoAplican.addRow([1, 'N/A', 'N/A', 'Todos los documentos aportados son válidos y computables para la evaluación del cargo.', 'Cumple con los requisitos del perfil.']);
    r.font = { name: 'Arial', size: 10, italic: true };
  } else {
    noAplican.forEach((d, idx) => {
      const r = wsNoAplican.addRow([
        idx + 1,
        d.descripcion || d.nombre_archivo || `Documento ${idx + 1}`,
        d.entidad || 'NO CONSTA',
        d.motivo_no_aplica || 'No computable',
        d.sustento_criterio || 'Criterio técnico de equivalencia y manual de funciones'
      ]);
      r.height = 30;
      r.font = { name: 'Arial', size: 9 };
      r.alignment = { vertical: 'middle', wrapText: true };
    });
  }

  await wb.xlsx.writeFile(outputPath);
  console.log('Reporte completo de prueba generado con éxito:', outputPath);
}

// Probar con datos ficticios
const sampleData = {
  candidato: {
    nombre: 'Diego Javier Rivero González',
    documento: '79752219',
    telefono: '3502610835',
    email: 'diegojavier11@yahoo.com'
  },
  cargo_evaluado: {
    nombre: 'PROFESIONAL ESPECIALIZADO',
    codigo: '222',
    grado: '24',
    dependencia: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS'
  },
  consolidado: {
    requisito_minimo_meses: 54,
    experiencia_relacionada_meses: 63,
    tiempo_excluido_por_traslapes_meses: 10,
    diferencia_meses: 9,
    resultado_final: 'CUMPLE'
  },
  formacion_academica: [
    {
      tipo: 'BACHILLER',
      titulo_obtenido: 'Bachiller Técnico Industrial',
      institucion: 'Instituto Técnico Central La Salle',
      fecha_grado: '1992-12-05'
    },
    {
      tipo: 'PREGRADO',
      titulo_obtenido: 'ABOGADO',
      institucion: 'UNIVERSIDAD NACIONAL DE COLOMBIA',
      fecha_grado: '2006-03-22'
    },
    {
      tipo: 'POSGRADO',
      titulo_obtenido: 'ESPECIALIZACIÓN EN DERECHO ADMINISTRATIVO',
      institucion: 'UNIVERSIDAD NACIONAL DE COLOMBIA',
      fecha_grado: '2010-02-18'
    },
    {
      tipo: 'POSGRADO',
      titulo_obtenido: 'MAESTRÍA EN DERECHO',
      institucion: 'UNIVERSIDAD NACIONAL DE COLOMBIA',
      fecha_grado: '2016-02-03'
    },
    {
      tipo: 'TARJETA_PROFESIONAL',
      numero_tarjeta_o_registro: '148958',
      titulo_obtenido: 'TARJETA PROFESIONAL DE ABOGADO',
      fecha_grado: '2006-05-16'
    }
  ],
  certificados: [
    {
      entidad: 'Ministerio de Justicia y del Derecho',
      cargo_certificado: 'Profesional Especializado 2028 grado 20',
      fecha_inicio: '2024-04-25',
      fecha_fin: '2024-06-03',
      clasificacion_experiencia: 'RELACIONADA',
      traslapes: [{ explicacion: '2 SJD con 1 Minjusticia' }]
    },
    {
      entidad: 'Inpec',
      cargo_certificado: 'Profesional Especializado',
      fecha_inicio: '2015-12-03',
      fecha_fin: '2016-02-28',
      clasificacion_experiencia: 'RELACIONADA',
      traslapes: []
    },
    {
      entidad: 'Contraloría General de la República',
      cargo_certificado: 'Profesional Universitario 01',
      fecha_inicio: '2013-05-02',
      fecha_fin: '2014-06-16',
      clasificacion_experiencia: 'RELACIONADA',
      traslapes: []
    },
    {
      entidad: 'Servicios de Defensa Legal',
      cargo_certificado: 'Abogado Auxiliar',
      fecha_inicio: '2009-01-01',
      fecha_fin: '2013-02-15',
      clasificacion_experiencia: 'NO_RELACIONADA',
      traslapes: []
    }
  ],
  documentos_no_aplican: [
    {
      descripcion: 'Diplomado en Contratación Estatal (120 horas)',
      entidad: 'Universidad Javeriana',
      motivo_no_aplica: 'Constituye educación continua / capacitación, no es experiencia laboral ni título formal de posgrado.',
      sustento_criterio: 'Decreto 1083 de 2015 - Artículos sobre educación informal vs formal'
    },
    {
      descripcion: 'Constancia de Monitoría Académica',
      entidad: 'Universidad Nacional de Colombia',
      motivo_no_aplica: 'Actividad realizada con anterioridad a la terminación de materias y sin funciones profesionales computables.',
      sustento_criterio: 'Ley 2039 de 2020 y Decreto Distrital de requisitos mínimos'
    }
  ]
};

testFullService(sampleData).catch(console.error);
