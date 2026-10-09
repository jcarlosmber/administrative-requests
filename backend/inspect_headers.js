const ExcelJS = require('exceljs');
const path = require('path');

async function checkHeaders() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve(__dirname, '../Scratch/PLANTA.xlsx'));
  const sheet = wb.worksheets[0];
  for (let r = 1; r <= 5; r++) {
    const row = sheet.getRow(r);
    const vals = [];
    row.eachCell((c, col) => vals.push(`[${col}] ${c.value}`));
    console.log(`Row ${r}:`, vals.slice(0, 25).join(' | '));
  }
}

checkHeaders().catch(console.error);
