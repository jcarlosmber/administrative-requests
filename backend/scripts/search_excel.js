const ExcelJS = require('exceljs');
const wb = new ExcelJS.Workbook();
wb.xlsx.readFile('../Scratch/PLANTA.xlsx').then(() => {
  const ws = wb.getWorksheet('PLANTA SJD (2)');
  [17, 30, 109, 158, 160, 165].forEach(r => {
    const row = ws.getRow(r);
    console.log(`=== ROW ${r} ===`);
    for (let c = 1; c <= 35; c++) {
      const v = row.getCell(c).value;
      if (v !== null && v !== undefined && v !== '') {
        console.log(`  Col ${c}: ${JSON.stringify(v)}`);
      }
    }
  });
}).catch(console.error);
