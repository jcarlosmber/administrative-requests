const { Client } = require('ssh2');

const conn = new Client();

console.log('Intentando conectar por SSH a 10.54.80.209...');

const timeout = setTimeout(() => {
  console.error('Timeout de conexión a 10.54.80.209 (10 segundos)');
  process.exit(1);
}, 10000);

conn.on('ready', () => {
  clearTimeout(timeout);
  console.log('¡Conectado exitosamente por SSH a 10.54.80.209!');
  const cmd = `
    echo "=== PM2 STATUS ==="
    pm2 status || pm2 list
    echo "=== NGINX STATUS ==="
    systemctl status nginx --no-pager -n 5 || true
    echo "=== GIT STATUS EN /opt/administrative-requests ==="
    cd /opt/administrative-requests && git status -s
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error al ejecutar comando:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log(`Comando finalizado con código: ${code}`);
      conn.end();
    }).on('data', (d) => {
      process.stdout.write(d.toString());
    }).stderr.on('data', (d) => {
      process.stderr.write(d.toString());
    });
  });
}).on('error', (e) => {
  clearTimeout(timeout);
  console.error('SSH Error:', e.message);
}).connect({
  host: '10.54.80.209',
  port: 22,
  username: 'sasge',
  password: '.Secjur-2026**',
  readyTimeout: 10000
});
