const ExcelJS = require('../backend/node_modules/exceljs');
const path = require('path');
const fs = require('fs');

async function testFixSharedFormula() {
  const templatePath = path.join(__dirname, '../backend/templates/2311300-FT-318_template.xlsx');
  const outputPath = path.join(__dirname, 'test_output_cleaned_adjusted.xlsx');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.worksheets[0];

  // Limpiar todas las fórmulas compartidas de las filas 36 a 66 antes de hacer cualquier manipulación
  for (let r = 36; r <= 66; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 15; c++) {
      const cell = row.getCell(c);
      if (cell && cell.value && typeof cell.value === 'object' && cell.value.sharedFormula) {
        cell.value = null;
      }
    }
  }

  // Ahora hagamos la prueba de borrar filas
  // Eliminemos por ejemplo 14 filas de títulos
  const rowsToDeleteTitles = [31, 30, 29, 28, 27, 26, 25, 23, 19, 18, 17, 15, 14, 13];
  rowsToDeleteTitles.forEach(r => ws.spliceRows(r, 1));

  // Localizar 2.2. EXPERIENCIA
  let expHeader = -1;
  for (let r = 10; r <= ws.rowCount; r++) {
    const val = String(ws.getRow(r).getCell('A').value || '');
    if (val.includes('2.2. EXPERIENCIA')) {
      expHeader = r;
      break;
    }
  }

  const startExp = expHeader + 3;
  let sumRow = -1;
  for (let r = startExp; r <= ws.rowCount; r++) {
    const val = String(ws.getRow(r).getCell('A').value || '');
    if (val.includes('TIEMPO DE EXPERIENCIA')) {
      sumRow = r;
      break;
    }
  }

  const available = sumRow - startExp;
  const numCerts = 3;

  // Llenar 3 filas
  for (let i = 0; i < numCerts; i++) {
    const r = startExp + i;
    const row = ws.getRow(r);
    row.getCell('A').value = `Entidad ${i + 1}`;
    row.getCell('B').value = `Cargo ${i + 1}`;
    row.getCell('C').value = new Date('2020-01-01');
    row.getCell('D').value = new Date('2022-01-01');
    row.getCell('E').value = 'Relacionada';
    row.getCell('H').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y")),"-")` };
    row.getCell('I').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"YM")),"-")` };
    row.getCell('J').value = { formula: `IF(E${r}="Relacionada",IF(F${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Md")),"-")` };
    row.getCell('M').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF(C${r},D${r},"Y"))` };
    row.getCell('N').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"YM"))` };
    row.getCell('O').value = { formula: `IF(K${r}="Traslape Total","-",DATEDIF($C${r},$D${r},"MD"))` };
  }

  // Eliminar filas sobrantes de experiencia
  if (available > numCerts) {
    const toDelete = available - numCerts;
    const deleteFrom = startExp + numCerts;
    // Antes de spliceRows, limpiar todas las celdas de ese rango
    for (let r = deleteFrom; r < deleteFrom + toDelete; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= 15; c++) {
        row.getCell(c).value = null;
      }
    }
    ws.spliceRows(deleteFrom, toDelete);
  }

  const newSumRow = startExp + numCerts;
  const newTotalRow = newSumRow + 1;
  const endExp = newSumRow - 1;

  ws.getCell(`H${newSumRow}`).value = { formula: `SUM(H${startExp}:H${endExp})` };
  ws.getCell(`I${newSumRow}`).value = { formula: `SUM(I${startExp}:I${endExp})` };
  ws.getCell(`J${newSumRow}`).value = { formula: `SUM(J${startExp}:J${endExp})` };
  ws.getCell(`M${newSumRow}`).value = { formula: `SUM(M${startExp}:M${endExp})` };
  ws.getCell(`N${newSumRow}`).value = { formula: `SUM(N${startExp}:N${endExp})` };
  ws.getCell(`O${newSumRow}`).value = { formula: `SUM(O${startExp}:O${endExp})` };

  ws.getCell(`H${newTotalRow}`).value = { formula: `+INT((SUM(I${startExp}:I${endExp})+INT((SUM(J${startExp}:J${endExp})/30)))/12)+H${newSumRow}` };
  ws.getCell(`I${newTotalRow}`).value = { formula: `(((SUM(I${startExp}:I${endExp})+INT(SUM(J${startExp}:J${endExp})/30))/12)-(INT((SUM(I${startExp}:I${endExp})+INT((SUM(J${startExp}:J${endExp})/30)))/12)))*12` };
  ws.getCell(`J${newTotalRow}`).value = { formula: `(SUM(J${startExp}:J${endExp})/30-INT(SUM(J${startExp}:J${endExp})/30))*30` };
  ws.getCell(`M${newTotalRow}`).value = { formula: `+INT((SUM(N${startExp}:N${endExp})+INT((SUM(O${startExp}:O${endExp})/30)))/12)+M${newSumRow}` };
  ws.getCell(`N${newTotalRow}`).value = { formula: `(((SUM(N${startExp}:N${endExp})+INT(SUM(O${startExp}:O${endExp})/30))/12)-(INT((SUM(N${startExp}:N${endExp})+INT((SUM(O${startExp}:O${endExp})/30)))/12)))*12` };
  ws.getCell(`O${newTotalRow}`).value = { formula: `(SUM(O${startExp}:O${endExp})/30-INT(SUM(O${startExp}:O${endExp})/30))*30` };

  await wb.xlsx.writeFile(outputPath);
  console.log('✓ Archivo escrito con éxito en:', outputPath);
}

testFixSharedFormula().catch(console.error);
