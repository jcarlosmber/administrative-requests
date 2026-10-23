const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const nodeScript = `
    const ExcelJS = require('exceljs');
    async function listSheets(file) {
      console.log('=== HOJAS EN ' + file + ' ===');
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(file);
      wb.worksheets.forEach((ws, idx) => {
        console.log(idx, ws.name, 'Filas:', ws.rowCount);
      });
    }

    async function run() {
      try { await listSheets('/opt/administrative-requests/backend/PLANTA.xlsx'); } catch(e){console.error(e.message);}
      try { await listSheets('/opt/administrative-requests/Scratch/Documentos/PLANTA DE PERSONAL -SJD_06102026.xlsx'); } catch(e){console.error(e.message);}
      try { await listSheets('/opt/administrative-requests/Scratch/PLANTA.xlsx'); } catch(e){console.error(e.message);}
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
