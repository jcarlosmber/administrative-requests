const { Client } = require('ssh2');

function runRemoteCommand(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        let stderr = '';
        stream.on('close', (code) => {
          conn.end();
          resolve({ code, stdout, stderr });
        }).on('data', (d) => { stdout += d; })
          .stderr.on('data', (d) => { stderr += d; });
      });
    }).on('error', reject).connect({
      host: '10.54.80.209',
      port: 22,
      username: 'sasge',
      password: '.Secjur-2026**'
    });
  });
}

async function main() {
  console.log('1. Git pull en /opt/administrative-requests...');
  const resPull = await runRemoteCommand('cd /opt/administrative-requests && git pull origin main');
  console.log(resPull.stdout || resPull.stderr);

  console.log('2. Compilando frontend (npx expo export)...');
  const resBuild = await runRemoteCommand('cd /opt/administrative-requests/frontend && npx expo export');
  console.log(resBuild.stdout || resBuild.stderr);

  console.log('3. Sincronizando a /var/www/administrative-requests...');
  const syncCmd = `
    echo ".Secjur-2026**" | sudo -S rm -rf /var/www/administrative-requests/* &&
    echo ".Secjur-2026**" | sudo -S cp -r /opt/administrative-requests/frontend/dist/* /var/www/administrative-requests/ &&
    echo ".Secjur-2026**" | sudo -S chown -R nginx:nginx /var/www/administrative-requests &&
    echo ".Secjur-2026**" | sudo -S chmod -R 755 /var/www/administrative-requests
  `;
  const resSync = await runRemoteCommand(syncCmd);
  console.log(resSync.stdout || resSync.stderr);

  console.log('4. Reiniciando backend en PM2...');
  const resPm2 = await runRemoteCommand('pm2 restart backend-solicitudes');
  console.log(resPm2.stdout || resPm2.stderr);

  console.log('5. Despliegue completado con éxito.');
}

main().catch(console.error);
