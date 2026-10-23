const { Client } = require('ssh2');

const conn = new Client();

console.log('Conectando por SSH a 10.54.80.209 para compilar y desplegar el frontend...');

conn.on('ready', () => {
  console.log('✓ SSH listo');
  const cmd = `
    cd /opt/administrative-requests/frontend
    echo "=== 1. COMPILANDO FRONTEND CON EXPO ==="
    npx expo export -p web

    echo "=== 2. COPIANDO A /var/www/administrative-requests ==="
    echo '.Secjur-2026**' | sudo -S cp -r dist/* /var/www/administrative-requests/
    echo '.Secjur-2026**' | sudo -S chown -R nginx:nginx /var/www/administrative-requests/

    echo "=== 3. VERIFICANDO DIST EN NGINX ==="
    ls -l /var/www/administrative-requests/index.html
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log(`\nCompilación remota finalizada con código: ${code}`);
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
