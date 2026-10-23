const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const sftp = conn.sftp((err, sftp) => {
    if (err) throw err;
    const remoteScriptContent = `
const ExcelJS = require('/opt/administrative-requests/backend/node_modules/exceljs');

async function searchOmaira(file) {
  console.log('=== BUSCANDO A OMAIRA EN ' + file + ' ===');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  
  wb.worksheets.forEach((ws) => {
    ws.eachRow((row, rNum) => {
      let match = false;
      row.eachCell((c) => {
        const t = String(c.value?.result || c.value?.text || c.value || '').toUpperCase();
        if (t.includes('52115141') || t.includes('OMAIRA ALONSO')) {
          match = true;
        }
      });
      if (match) {
        const vals = [];
        row.eachCell((c, col) => {
          const v = c.value?.result || c.value?.text || c.value;
          vals.push(col + ': ' + JSON.stringify(v));
        });
        console.log('[' + ws.name + '] Fila ' + rNum + ' => ' + vals.slice(0, 30).join(' | '));
      }
    });
  });
}

searchOmaira('/opt/administrative-requests/backend/PLANTA.xlsx');
`;
    const writeStream = sftp.createWriteStream('/tmp/search_omaira.js');
    writeStream.write(remoteScriptContent);
    writeStream.end();
    writeStream.on('close', () => {
      conn.exec('node /tmp/search_omaira.js', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          conn.end();
        }).on('data', (d) => {
          process.stdout.write(d.toString());
        }).stderr.on('data', (d) => {
          process.stderr.write(d.toString());
        });
      });
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
