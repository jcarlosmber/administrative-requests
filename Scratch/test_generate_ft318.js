const ExcelJS = require('../backend/node_modules/exceljs');
const path = require('path');
const fs = require('fs');

async function testGenerate() {
  const templatePath = path.join(__dirname, '../backend/templates/2311300-FT-318_template.xlsx');
  const outputPath = path.join(__dirname, 'test_output_FT318.xlsx');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.worksheets[0];

  console.log('Template cargado exitosamente. Hoja:', ws.name);

  // Modificar datos de prueba
  ws.getCell('B4').value = 'JUAN PÉREZ RODRÍGUEZ';
  ws.getCell('F4').value = '1018456789';
  ws.getCell('I4').value = '3109876543';
  ws.getCell('M4').value = 'juan.perez@bogota.gov.co';

  ws.getCell('B5').value = 'DIRECCIÓN DISTRITAL DE GESTIÓN CORPORATIVA';
  ws.getCell('E5').value = 'PROFESIONAL ESPECIALIZADO';
  ws.getCell('J5').value = '222';
  ws.getCell('N5').value = '24';

  ws.getCell('A8').value = 'Cincuenta y cuatro (54) meses de experiencia profesional relacionada con las funciones del cargo.';
  ws.getCell('G8').value = 'Título profesional en Derecho y título de posgrado en áreas relacionadas.';

  // Formación
  ws.getCell('B13').value = 'ABOGADO';
  ws.getCell('H13').value = 'UNIVERSIDAD NACIONAL DE COLOMBIA';
  ws.getCell('N13').value = new Date('2015-06-20');

  ws.getCell('B14').value = 'ESPECIALIZACIÓN EN DERECHO ADMINISTRATIVO';
  ws.getCell('H14').value = 'UNIVERSIDAD DEL ROSARIO';
  ws.getCell('N14').value = new Date('2018-11-15');

  ws.getCell('B17').value = '245678';
  ws.getCell('L17').value = new Date('2015-08-10');

  await wb.xlsx.writeFile(outputPath);
  console.log('Archivo de prueba generado en:', outputPath, 'Size:', fs.statSync(outputPath).size);
}

testGenerate().catch(console.error);
