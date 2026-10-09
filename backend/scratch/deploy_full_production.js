const { Client } = require('ssh2');

const conn = new Client();

function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> Ejecutando: ${command}`);
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream
        .on('close', (code) => {
          console.log(`>>> Fin comando (código ${code})`);
          if (code === 0) {
            resolve({ stdout, stderr, code });
          } else {
            reject(new Error(`Comando falló con código ${code}: ${stderr || stdout}`));
          }
        })
        .on('data', (d) => {
          const str = d.toString();
          process.stdout.write(str);
          stdout += str;
        })
        .stderr.on('data', (d) => {
          const str = d.toString();
          process.stderr.write(str);
          stderr += str;
        });
    });
  });
}

conn.on('ready', async () => {
  console.log('=== Conectado por SSH a 10.54.80.209 ===');
  try {
    // 1. Limpiar cambios locales y hacer reset hard al último commit de origin/main
    console.log('\n--- 1. Sincronizando con origin/main ---');
    await runCommand('cd /opt/administrative-requests && git fetch origin main && git reset --hard origin/main');

    // 2. Verificar estado de git
    console.log('\n--- 2. Estado de Git y último commit ---');
    await runCommand('cd /opt/administrative-requests && git status && git log -1 --oneline');

    // 3. Compilar frontend Expo web
    console.log('\n--- 3. Compilando frontend web con Expo ---');
    await runCommand('cd /opt/administrative-requests/frontend && npx expo export -p web');

    // 4. Copiar bundle compilado a /var/www/administrative-requests
    console.log('\n--- 4. Desplegando en /var/www/administrative-requests ---');
    await runCommand("echo '.Secjur-2026**' | sudo -S cp -r /opt/administrative-requests/frontend/dist/* /var/www/administrative-requests/");
    await runCommand("echo '.Secjur-2026**' | sudo -S chown -R nginx:nginx /var/www/administrative-requests/");

    // 5. Reiniciar PM2 backend
    console.log('\n--- 5. Reiniciando backend en PM2 ---');
    await runCommand('pm2 restart backend-solicitudes');

    console.log('\n======================================================');
    console.log('✓ DESPLIEGUE COMPLETO EXITOSO EN PRODUCCIÓN');
    console.log('======================================================');
  } catch (err) {
    console.error('Error durante el despliegue:', err.message);
  } finally {
    conn.end();
  }
}).on('error', (e) => {
  console.error('Error de conexión SSH:', e.message);
}).connect({
  host: '10.54.80.209',
  port: 22,
  username: 'sasge',
  password: '.Secjur-2026**',
  readyTimeout: 20000,
});
