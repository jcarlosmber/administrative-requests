const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('Conectado a 10.54.80.209');
  const cmd = `
    cd /home/sasge/administrative-requests || cd /var/www/administrative-requests || pwd
    pwd
    git status
    git log -n 3 --oneline
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (d) => {
      console.log(d.toString());
    }).stderr.on('data', (d) => {
      console.error(d.toString());
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
