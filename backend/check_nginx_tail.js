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
  const res = await runRemoteCommand('echo ".Secjur-2026**" | sudo -S tail -n 25 /var/log/nginx/access.log');
  console.log('Nginx access log:\n', res.stdout || res.stderr);
}

main().catch(console.error);
