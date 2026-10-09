const ExcelJS = require('exceljs');
const path = require('path');

async function checkExcel() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve(__dirname, '../Scratch/PLANTA.xlsx'));
  const sheet = wb.worksheets[0];
  console.log('Sheet name:', sheet.name);

  // Leer encabezados
  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell((cell, colNumber) => {
    headers.push({ col: colNumber, text: String(cell.value || '').trim() });
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = String(row.getCell(1).value || '').trim();
    let rowStr = '';
    row.eachCell((c) => {
      rowStr += ' ' + String(c.value || '');
    });

    if (id === '82' || id === '84' || rowStr.includes('DANIEL') || rowStr.includes('91526810') || rowStr.includes('53015269')) {
      console.log(`\n--- Row ${rowNumber} (ID: ${id}) ---`);
      headers.forEach(h => {
        const val = row.getCell(h.col).value;
        if (val !== null && val !== undefined) {
          const displayVal = typeof val === 'object' && val.result !== undefined ? val.result : val;
          console.log(`  ${h.text} [col ${h.col}]: ${displayVal}`);
        }
      });
    }
  });
}

checkExcel().catch(console.error);
