const ExcelJS = require('../backend/node_modules/exceljs');
const path = require('path');
const fs = require('fs');

async function testCleanup() {
  const templatePath = path.join(__dirname, '../backend/templates/2311300-FT-318_template.xlsx');
  const outputPath = path.join(__dirname, 'test_output_cleaned_adjusted.xlsx');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.worksheets[0];

  console.log('Template inicial:', ws.name, 'Rows:', ws.rowCount);

  // Simulemos un candidato típico:
  // - 1 bachiller
  // - 0 técnicos
  // - 0 tecnólogos
  // - 1 pregrado
  // - 2 posgrados
  // - 1 tarjeta profesional
  // - 3 certificados de experiencia
  const formacion = [
    { tipo: 'BACHILLER', titulo_obtenido: 'Bachiller Académico', institucion: 'Colegio Mayor', fecha_grado: '2005-12-01' },
    { tipo: 'PREGRADO', titulo_obtenido: 'Abogado', institucion: 'Universidad Nacional', fecha_grado: '2011-06-15' },
    { tipo: 'POSGRADO', titulo_obtenido: 'Especialista en Derecho Administrativo', institucion: 'Universidad del Rosario', fecha_grado: '2014-11-20' },
    { tipo: 'POSGRADO', titulo_obtenido: 'Magíster en Derecho Público', institucion: 'Universidad Externado', fecha_grado: '2018-05-30' },
    { tipo: 'TARJETA_PROFESIONAL', numero_tarjeta_o_registro: '185942', fecha_grado: '2011-08-10' }
  ];

  const certs = [
    { entidad: 'Secretaría Jurídica Distrital', cargo_certificado: 'Profesional Especializado', fecha_inicio: '2022-01-01', fecha_fin: '2024-01-01', clasificacion_experiencia: 'RELACIONADA' },
    { entidad: 'Ministerio de Justicia', cargo_certificado: 'Asesor Jurídico', fecha_inicio: '2019-03-01', fecha_fin: '2021-12-31', clasificacion_experiencia: 'RELACIONADA' },
    { entidad: 'Firma Legal', cargo_certificado: 'Abogado Junior', fecha_inicio: '2015-06-01', fecha_fin: '2018-12-31', clasificacion_experiencia: 'NO_RELACIONADA' }
  ];

  // Clasificar títulos
  let bachiller = null;
  const tecnicos = [];
  const tecnologos = [];
  const pregrados = [];
  const posgrados = [];
  let tarjeta = null;

  formacion.forEach(item => {
    const tipo = (item.tipo || '').toUpperCase();
    const titulo = (item.titulo_obtenido || '').toUpperCase();
    if (tipo === 'BACHILLER' || titulo.includes('BACHILLER')) {
      if (!bachiller) bachiller = item;
    } else if (tipo === 'TECNICO' || (titulo.includes('TECNIC') && !titulo.includes('TECNOLOG'))) {
      tecnicos.push(item);
    } else if (tipo === 'TECNOLOGO' || tipo === 'TECNOLOGIA' || titulo.includes('TECNOLOG')) {
      tecnologos.push(item);
    } else if (tipo === 'PREGRADO' || tipo === 'PROFESIONAL' || (!titulo.includes('ESPECIALIZ') && !titulo.includes('MAESTR') && !titulo.includes('DOCTOR') && tipo !== 'TARJETA_PROFESIONAL')) {
      pregrados.push(item);
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

  // 1. Datos personales (B4, F4, I4, M4)
  ws.getCell('B4').value = 'DIEGO JAVIER RIVERO GONZALEZ';
  ws.getCell('F4').value = '79752219';
  ws.getCell('I4').value = '3502610835';
  ws.getCell('M4').value = 'diegojavier11@yahoo.com';

  // 2. Datos del cargo (B5, E5, J5, N5)
  ws.getCell('B5').value = 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS';
  ws.getCell('E5').value = 'PROFESIONAL ESPECIALIZADO';
  ws.getCell('J5').value = '222';
  ws.getCell('N5').value = '24';

  // 3. Requisitos (A8, G8)
  ws.getCell('A8').value = '54 meses de experiencia profesional relacionada con las funciones del cargo.';
  ws.getCell('G8').value = 'Título profesional en Derecho y título de posgrado en áreas afines.';

  // 4. Formación académica
  // En la plantilla:
  // Fila 11: Bachiller (1 fila)
  // Filas 12-15: Técnico (4 filas)
  // Filas 16-19: Tecnólogo (4 filas)
  // Filas 20-23: Pregrado (4 filas)
  // Filas 24-31: Posgrado (8 filas)
  // Fila 32: Tarjeta Profesional (1 fila)

  // Primero llenamos los valores en las filas correspondientes
  // Bachiller (Fila 11)
  if (bachiller) {
    ws.getCell('B11').value = bachiller.titulo_obtenido;
    ws.getCell('H11').value = bachiller.institucion;
    ws.getCell('N11').value = parseFecha(bachiller.fecha_grado);
  } else {
    ws.getCell('B11').value = null;
    ws.getCell('H11').value = null;
    ws.getCell('N11').value = null;
  }

  // Técnicos (Filas 12 a 15)
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
    }
  }

  // Tecnólogos (Filas 16 a 19)
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
    }
  }

  // Pregrados (Filas 20 a 23)
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
    }
  }

  // Posgrados (Filas 24 a 31)
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
    }
  }

  // Tarjeta profesional (Fila 32)
  if (tarjeta) {
    ws.getCell('B32').value = tarjeta.numero_tarjeta_o_registro || tarjeta.titulo_obtenido || 'NO CONSTA';
    ws.getCell('H32').value = parseFecha(tarjeta.fecha_grado || tarjeta.fecha_expedicion);
  } else {
    ws.getCell('B32').value = null;
    ws.getCell('H32').value = null;
  }

  // Ahora determinemos qué filas de títulos SOBRAN y deben eliminarse:
  // Importante: para no alterar los índices mientras borramos, calculamos los rangos a eliminar
  // y los eliminamos de abajo hacia arriba (bottom to top).
  const rowsToDelete = [];

  // Posgrados: iban de 24 a 31 (8 filas). Dejamos posgradosCount (min 1).
  // Las sobrantes van desde (24 + posgradosCount) hasta 31.
  for (let r = 31; r >= 24 + posgradosCount; r--) {
    rowsToDelete.push(r);
  }

  // Pregrados: iban de 20 a 23 (4 filas). Dejamos pregradosCount (min 1).
  for (let r = 23; r >= 20 + pregradosCount; r--) {
    rowsToDelete.push(r);
  }

  // Tecnólogos: iban de 16 a 19 (4 filas). Dejamos tecnologosCount (min 1).
  for (let r = 19; r >= 16 + tecnologosCount; r--) {
    rowsToDelete.push(r);
  }

  // Técnicos: iban de 12 a 15 (4 filas). Dejamos tecnicosCount (min 1).
  for (let r = 15; r >= 12 + tecnicosCount; r--) {
    rowsToDelete.push(r);
  }

  console.log('Filas de formación a eliminar (de abajo a arriba):', rowsToDelete);
  rowsToDelete.forEach(rowNum => {
    ws.spliceRows(rowNum, 1);
  });

  console.log('Filas de formación eliminadas. Nuevo rowCount:', ws.rowCount);

  // Buscar dónde quedó la fila "2.2. EXPERIENCIA" y los encabezados de experiencia
  let expHeaderRowIdx = -1;
  for (let r = 10; r <= ws.rowCount; r++) {
    const val = ws.getRow(r).getCell('A').value;
    if (val && String(val).includes('2.2. EXPERIENCIA')) {
      expHeaderRowIdx = r;
      break;
    }
  }
  console.log('Fila 2.2. EXPERIENCIA encontrada en:', expHeaderRowIdx);

  // La fila de encabezados 1 es expHeaderRowIdx + 1
  // La fila de encabezados 2 es expHeaderRowIdx + 2
  // Las filas de certificados arrancan en expHeaderRowIdx + 3
  const startExp = expHeaderRowIdx + 3;
  console.log('Inicio de filas de experiencia en:', startExp);

  // Buscar la fila de "TIEMPO DE EXPERIENCIA"
  let sumRowIdx = -1;
  for (let r = startExp; r <= ws.rowCount; r++) {
    const val = ws.getRow(r).getCell('A').value;
    if (val && String(val).includes('TIEMPO DE EXPERIENCIA')) {
      sumRowIdx = r;
      break;
    }
  }
  console.log('Fila TIEMPO DE EXPERIENCIA encontrada en:', sumRowIdx);

  const availableExpRows = sumRowIdx - startExp;
  console.log('Filas de experiencia disponibles en plantilla:', availableExpRows);

  const certsCount = Math.max(1, certs.length);

  // Llenar certificados
  for (let i = 0; i < certs.length; i++) {
    const r = startExp + i;
    const cert = certs[i];
    const row = ws.getRow(r);

    row.getCell('A').value = cert.entidad;
    row.getCell('B').value = cert.cargo_certificado;
    row.getCell('C').value = parseFecha(cert.fecha_inicio);
    if (row.getCell('C').value instanceof Date) row.getCell('C').numFmt = 'yyyy-mm-dd';

    row.getCell('D').value = cert.vinculo_vigente ? new Date() : parseFecha(cert.fecha_fin);
    if (row.getCell('D').value instanceof Date) row.getCell('D').numFmt = 'yyyy-mm-dd';

    const esRel = (cert.clasificacion_experiencia || '').toUpperCase() === 'RELACIONADA';
    row.getCell('E').value = esRel ? 'Relacionada' : 'Profesional';

    row.getCell('H').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y")),"-")` };
    row.getCell('I').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"YM")),"-")` };
    row.getCell('J').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Md")),"-")` };

    row.getCell('M').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y"))` };
    row.getCell('N').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"YM"))` };
    row.getCell('O').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"MD"))` };
  }

  // Eliminar filas de experiencia sobrantes si certsCount < availableExpRows
  if (availableExpRows > certsCount) {
    const rowsToDeleteExp = availableExpRows - certsCount;
    const deleteFrom = startExp + certsCount;
    console.log(`Eliminando ${rowsToDeleteExp} filas sobrantes de experiencia desde la fila ${deleteFrom}`);
    ws.spliceRows(deleteFrom, rowsToDeleteExp);
  }

  // Localizar la nueva posición de TIEMPO DE EXPERIENCIA y TOTAL
  const newSumRowIdx = startExp + certsCount;
  const newTotalRowIdx = newSumRowIdx + 1;
  const endExp = newSumRowIdx - 1;

  console.log(`Nuevas filas de totales: Suma en ${newSumRowIdx}, Total en ${newTotalRowIdx}. Rango certs: ${startExp} a ${endExp}`);

  // Actualizar fórmulas de sumas
  ws.getCell(`H${newSumRowIdx}`).value = { formula: `SUM(H${startExp}:H${endExp})` };
  ws.getCell(`I${newSumRowIdx}`).value = { formula: `SUM(I${startExp}:I${endExp})` };
  ws.getCell(`J${newSumRowIdx}`).value = { formula: `SUM(J${startExp}:J${endExp})` };

  ws.getCell(`M${newSumRowIdx}`).value = { formula: `SUM(M${startExp}:M${endExp})` };
  ws.getCell(`N${newSumRowIdx}`).value = { formula: `SUM(N${startExp}:N${endExp})` };
  ws.getCell(`O${newSumRowIdx}`).value = { formula: `SUM(O${startExp}:O${endExp})` };

  // Fórmulas de Conversión TOTAL
  ws.getCell(`H${newTotalRowIdx}`).value = { formula: `+INT((SUM(I${startExp}:I${endExp})+INT((SUM(J${startExp}:J${endExp})/30)))/12)+H${newSumRowIdx}` };
  ws.getCell(`I${newTotalRowIdx}`).value = { formula: `(((SUM(I${startExp}:I${endExp})+INT(SUM(J${startExp}:J${endExp})/30))/12)-(INT((SUM(I${startExp}:I${endExp})+INT((SUM(J${startExp}:J${endExp})/30)))/12)))*12` };
  ws.getCell(`J${newTotalRowIdx}`).value = { formula: `(SUM(J${startExp}:J${endExp})/30-INT(SUM(J${startExp}:J${endExp})/30))*30` };

  ws.getCell(`M${newTotalRowIdx}`).value = { formula: `+INT((SUM(N${startExp}:N${endExp})+INT((SUM(O${startExp}:O${endExp})/30)))/12)+M${newSumRowIdx}` };
  ws.getCell(`N${newTotalRowIdx}`).value = { formula: `(((SUM(N${startExp}:N${endExp})+INT(SUM(O${startExp}:O${endExp})/30))/12)-(INT((SUM(N${startExp}:N${endExp})+INT((SUM(O${startExp}:O${endExp})/30)))/12)))*12` };
  ws.getCell(`O${newTotalRowIdx}`).value = { formula: `(SUM(O${startExp}:O${endExp})/30-INT(SUM(O${startExp}:O${endExp})/30))*30` };

  // Actualizar fechas y firmas en el pie
  for (let r = newTotalRowIdx + 1; r <= ws.rowCount; r++) {
    const cellVal = String(ws.getRow(r).getCell('A').value || '');
    if (cellVal.includes('Fecha de Expedición')) {
      ws.getRow(r).getCell('A').value = `Fecha de Expedición: Ver fecha de firma (${new Date().toLocaleDateString('es-CO')})`;
    } else if (cellVal.includes('Elaborado por')) {
      ws.getRow(r).getCell('A').value = `Elaborado por: Sistema de Validación SASGE - Profesional Universitario DGC`;
    } else if (cellVal.includes('Revisado por')) {
      ws.getRow(r).getCell('A').value = `Revisado por: Dirección de Gestión Corporativa`;
    }
  }

  await wb.xlsx.writeFile(outputPath);
  console.log('✓ Archivo limpio generado con éxito en:', outputPath);
}

testCleanup().catch(console.error);
