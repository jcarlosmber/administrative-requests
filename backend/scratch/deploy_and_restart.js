const { Client } = require('ssh2');

const conn = new Client();

console.log('Conectando por SSH a 10.54.80.209 para sincronizar y reiniciar PM2...');

conn.on('ready', () => {
  console.log('✓ SSH listo');
  const cmd = `
    cd /opt/administrative-requests
    echo "=== 1. GIT PULL ==="
    git fetch origin main
    git reset --hard origin/main

    echo "=== 2. COMPROBANDO SINTAXIS ==="
    node -c backend/server.js
    node -c backend/routes/nominaRoutes.js

    echo "=== 3. REINICIANDO PM2 ==="
    pm2 restart all || pm2 start backend/server.js --name "backend-solicitudes"

    echo "=== 4. ESPERANDO 2 SEGUNDOS Y VERIFICANDO PM2 ==="
    sleep 2
    pm2 status

    echo "=== 5. PROBANDO ENDPOINT LOCAL EN SERVIDOR ==="
    curl -s http://localhost:3000/api/health || curl -s -I http://localhost:3000/
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log(`\nProceso remoto terminado con código: ${code}`);
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
  readyTimeout: 30000,
  keepaliveInterval: 10000
});
