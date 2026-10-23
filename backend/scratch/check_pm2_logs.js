const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    echo "=== ULTIMOS LOGS DE ERROR DE PM2 ==="
    pm2 logs backend-solicitudes --lines 30 --nostream --err || true
    echo "=== ULTIMOS LOGS DE OUT DE PM2 ==="
    pm2 logs backend-solicitudes --lines 20 --nostream --out || true
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
