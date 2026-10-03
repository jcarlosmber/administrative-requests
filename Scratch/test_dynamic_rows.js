const ExcelJS = require('../backend/node_modules/exceljs');
const path = require('path');
const fs = require('fs');

async function testDynamic() {
  const templatePath = path.join(__dirname, '../backend/templates/2311300-FT-318_template.xlsx');
  const outputPath = path.join(__dirname, 'test_output_dynamic.xlsx');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.worksheets[0];

  // Simulemos 4 certificados
  const certs = [
    {
      entidad: 'Secretaría Distrital de Planeación',
      cargo: 'Profesional Especializado',
      desde: new Date('2021-01-15'),
      hasta: new Date('2023-08-30'),
      tipo: 'Relacionada',
      obs: 'Funciones sustancialmente coincidentes con el empleo'
    },
    {
      entidad: 'Alcaldía Local de Suba',
      cargo: 'Abogado Contratista',
      desde: new Date('2019-02-01'),
      hasta: new Date('2020-12-31'),
      tipo: 'Relacionada',
      obs: 'Funciones jurídicas y defensa judicial'
    },
    {
      entidad: 'Firma Legal Martínez & Asoc.',
      cargo: 'Asesor Jurídico',
      desde: new Date('2017-06-01'),
      hasta: new Date('2018-12-15'),
      tipo: 'Profesional',
      obs: 'Experiencia profesional en litigio'
    },
    {
      entidad: 'Superintendencia de Industria y Comercio',
      cargo: 'Profesional Universitario',
      desde: new Date('2015-08-01'),
      hasta: new Date('2017-04-30'),
      tipo: 'Relacionada',
      obs: '1 SJD con 2 SIC (Traslape con especialización)'
    }
  ];

  // Copiemos el estilo de la fila 21 para usarlo como molde
  const templateRow = ws.getRow(21);

  // Limpiar filas de la 21 a la 31
  for (let r = 21; r <= 31; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 15; c++) {
      row.getCell(c).value = null;
    }
  }

  // Escribir los certificados
  certs.forEach((c, idx) => {
    const r = 21 + idx;
    const row = ws.getRow(r);

    row.getCell('A').value = c.entidad;
    row.getCell('B').value = c.cargo;
    row.getCell('C').value = c.desde;
    row.getCell('C').numFmt = 'yyyy-mm-dd';
    row.getCell('D').value = c.hasta;
    row.getCell('D').numFmt = 'yyyy-mm-dd';
    row.getCell('E').value = c.tipo;
    row.getCell('F').value = c.obs;

    // Fórmulas DATEDIF
    row.getCell('H').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y")),"-")` };
    row.getCell('I').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"YM")),"-")` };
    row.getCell('J').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Md")),"-")` };

    row.getCell('M').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y"))` };
    row.getCell('N').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"YM"))` };
    row.getCell('O').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"MD"))` };
  });

  await wb.xlsx.writeFile(outputPath);
  console.log('Generado dinámico exitoso en:', outputPath);
}

testDynamic().catch(console.error);
