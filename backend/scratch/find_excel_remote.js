const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    echo "=== BUSCANDO ARCHIVOS EXCEL EN SERVIDOR ==="
    find /opt/administrative-requests -name "*.xlsx" -o -name "*.xls"
    
    echo "=== REVISANDO TABLA TABLAS EN sasge_db ==="
    psql -h localhost -U sasge -d sasge_db -c "\\dt"

    echo "=== REVISANDO SI HAY NOVEDADES O TABLA PERNO EN BD ==="
    psql -h localhost -U sasge -d sasge_db -c "
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    "
  `;

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
