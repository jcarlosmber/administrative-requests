const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const sftp = conn.sftp((err, sftp) => {
    if (err) throw err;
    const remoteScriptContent = `
const ExcelJS = require('/opt/administrative-requests/backend/node_modules/exceljs');

async function checkPlantaSJD(file) {
  console.log('=== LEYENDO HOJA PLANTA SJD DE ' + file + ' ===');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet('PLANTA SJD');
  if (!ws) {
    console.log('No existe hoja PLANTA SJD');
    return;
  }
  
  const h1 = [];
  ws.getRow(1).eachCell((c, col) => h1.push(col + ': ' + (c.value?.result || c.value?.text || c.value)));
  console.log('Headers R1:\\n', h1.slice(0, 30).join(' | '));
  
  const h2 = [];
  ws.getRow(2).eachCell((c, col) => h2.push(col + ': ' + (c.value?.result || c.value?.text || c.value)));
  console.log('Headers R2:\\n', h2.slice(0, 30).join(' | '));

  ws.eachRow((row, rNum) => {
    const c1 = row.getCell(1).value;
    const c2 = row.getCell(2).value;
    const c3 = row.getCell(3).value;
    if (c1 == 28 || c2 == 28 || c3 == 28) {
      console.log('\\nPLAZA 28 EN FILA ' + rNum + ':');
      for (let i = 1; i <= 30; i++) {
        const v = row.getCell(i).value;
        const val = v && typeof v === 'object' ? (v.result !== undefined ? v.result : (v.text || '')) : v;
        console.log('  Col ' + i + ' => ' + JSON.stringify(val));
      }
    }
  });
}

async function run() {
  await checkPlantaSJD('/opt/administrative-requests/backend/PLANTA.xlsx');
}
run();
`;
    const writeStream = sftp.createWriteStream('/tmp/read_planta_28.js');
    writeStream.write(remoteScriptContent);
    writeStream.end();
    writeStream.on('close', () => {
      conn.exec('node /tmp/read_planta_28.js', (err, stream) => {
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
