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
  console.log('--- 1. Datos del vehiculo e3ef8a92-e0bd-43a4-82a6-22e5862265b2 ---');
  const qVeh = `SELECT * FROM public.user_vehicles WHERE id = 'e3ef8a92-e0bd-43a4-82a6-22e5862265b2';`;
  const resVeh = await runRemoteCommand(`export PGPASSWORD='.Secjur-2026**' && psql -h localhost -U sasge -d sasge_db -c "${qVeh}"`);
  console.log(resVeh.stdout || resVeh.stderr);

  console.log('--- 2. Ultimos logs de error en pm2 ---');
  const resErr = await runRemoteCommand('tail -n 40 /home/sasge/.pm2/logs/backend-solicitudes-error.log');
  console.log(resErr.stdout || resErr.stderr);

  console.log('--- 3. Ultimos logs de salida en pm2 ---');
  const resOut = await runRemoteCommand('tail -n 40 /home/sasge/.pm2/logs/backend-solicitudes-out.log');
  console.log(resOut.stdout || resOut.stderr);
}

main().catch(console.error);
