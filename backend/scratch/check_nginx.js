const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  conn.exec('grep -rn "root " /etc/nginx/sites-enabled/ 2>/dev/null || cat /etc/nginx/nginx.conf', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', d => console.log(d.toString()))
      .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({
  host: '10.54.80.209',
  port: 22,
  username: 'sasge',
  password: '.Secjur-2026**',
  readyTimeout: 15000
});
