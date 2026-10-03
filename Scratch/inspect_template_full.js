const ExcelJS = require('../backend/node_modules/exceljs');
const path = require('path');

async function inspect() {
  const filePath = path.join(__dirname, '3. 2311300-FT-318 Certificado de  1 oct.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];

  console.log('Sheet Name:', ws.name);
  console.log('Total Rows:', ws.rowCount);
  console.log('Total Columns:', ws.columnCount);

  // Anchos de columna
  const colWidths = ws.columns.map((c, i) => ({ col: i + 1, width: c.width }));
  console.log('Column Widths:', JSON.stringify(colWidths));

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rowData = {
      height: row.height,
      cells: {}
    };
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      rowData.cells[cell.address] = {
        value: typeof cell.value === 'object' && cell.value !== null && cell.value.formula ? cell.value.formula : cell.value,
        type: cell.type,
        numFmt: cell.numFmt,
        align: cell.alignment,
        font: cell.font ? { name: cell.font.name, size: cell.font.size, bold: cell.font.bold, color: cell.font.color } : undefined,
        fill: cell.fill ? { type: cell.fill.type, fgColor: cell.fill.fgColor } : undefined,
        border: cell.border ? 'has_border' : undefined
      };
    });
    if (Object.keys(rowData.cells).length > 0) {
      console.log(`\n--- ROW ${r} (H: ${row.height}) ---`);
      console.log(JSON.stringify(rowData, null, 2));
    }
  }
}

inspect().catch(console.error);
