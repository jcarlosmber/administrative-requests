const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const query = `
    INSERT INTO users (email, username, name, role, ldap_enabled, password_hash) 
    VALUES ('admin@sasge.com', 'admin_sasge', 'Administrador Sistema', 'admin', false, '$2a$10$tZ2zVjD8v1C.i9Q0F7T5X.Z1k3L8x5X5X5X5X5X5X5X5X5X5X5X5X')
    ON CONFLICT (email) DO NOTHING;
  `;
  const cmd = `export PGPASSWORD='.Secjur-2026**' && psql -h localhost -U sasge -d sasge_db -c "${query}"`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '10.54.80.209',
  port: 22,
  username: 'sasge',
  password: '.Secjur-2026**'
});
