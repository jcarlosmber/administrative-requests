const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const nodeScript = `
    const ExcelJS = require('exceljs');
    async function checkExcel(file) {
      console.log('=== BUSCANDO EN ' + file + ' ===');
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(file);
      const ws = wb.worksheets[0];
      ws.eachRow((row, rNum) => {
        let match = false;
        row.eachCell((c) => {
          const t = String(c.value || '').toUpperCase();
          if (t.includes('FORERO') || t.includes('OMAIRA') || t.includes('51882380') || t.includes('52115141')) {
            match = true;
          }
        });
        if (match) {
          const vals = [];
          for (let i = 1; i <= 20; i++) {
            const v = row.getCell(i).value;
            vals.push(v && typeof v === 'object' ? (v.result || v.text || '') : v);
          }
          console.log('Fila ' + rNum + ':', JSON.stringify(vals));
        }
      });
    }

    async function run() {
      await checkExcel('/opt/administrative-requests/backend/PLANTA.xlsx');
      await checkExcel('/opt/administrative-requests/Scratch/Documentos/PLANTA DE PERSONAL -SJD_06102026.xlsx');
    }
    run();
  `;

  const cmd = `cd /opt/administrative-requests/backend && node -e "${nodeScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (d) => {
      process.stdout.write(d.toString());
    }).stderr.on('data', (d) => {
      process.stderr.write(d.toString());
    });
  });
}).on('error', (e) => {
  console.error('SSH Error:', e.message);
}).connect({
  host: '10.54.80.209',
  port: 22,
  username: 'sasge',
  password: '.Secjur-2026**',
});
