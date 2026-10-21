const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const sql = `
    export PGPASSWORD='.Secjur-2026**'
    psql -h localhost -U sasge -d sasge_db -x -c "
      SELECT * FROM personal_perno_sjd WHERE cedula = '1193101660' OR nombre_completo ILIKE '%TREJO%';
    "
  `;

  conn.exec(sql, (err, stream) => {
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
