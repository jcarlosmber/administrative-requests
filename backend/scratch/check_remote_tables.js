const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const cmd = `export PGPASSWORD='.Secjur-2026**' && psql -h localhost -U sasge -d sasge_db -c "
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    SELECT count(*) as total_users FROM users;
    SELECT count(*) as total_planta FROM planta_personal_sjd;
    SELECT count(*) as total_perno FROM personal_perno_sjd;
    SELECT count(*) as activos_perno FROM personal_perno_sjd WHERE estado_funcionario = 'A';
    SELECT count(*) as ocupados_planta FROM planta_personal_sjd WHERE estado_cargo = 'OCUPADO';
    SELECT count(DISTINCT titular_cedula) FROM planta_personal_sjd WHERE titular_cedula IS NOT NULL;
    SELECT count(DISTINCT encargo_cedula) FROM planta_personal_sjd WHERE encargo_cedula IS NOT NULL;
  "`;

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
  readyTimeout: 15000
});
