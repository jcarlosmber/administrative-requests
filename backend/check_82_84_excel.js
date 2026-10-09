const ExcelJS = require('exceljs');
const path = require('path');

async function check82and84() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve(__dirname, '../Scratch/PLANTA.xlsx'));
  const sheet = wb.worksheets[0];

  const headerRow = sheet.getRow(4);
  const headers = {};
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value || '').trim();
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 4) return;
    const id = String(row.getCell(1).value || '').trim();
    if (id === '82' || id === '84') {
      console.log(`\n================= PLAZA ID: ${id} (Fila ${rowNumber}) =================`);
      for (let c = 1; c <= 35; c++) {
        const h = headers[c] || `Col_${c}`;
        let v = row.getCell(c).value;
        if (v && typeof v === 'object' && v.result !== undefined) v = v.result;
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          console.log(`  ${h} [${c}]: ${v}`);
        }
      }
    }
  });
}

check82and84().catch(console.error);
