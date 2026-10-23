const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    export PGPASSWORD='.Secjur-2026**'
    psql -h localhost -U sasge -d sasge_db -c "
      SELECT id_plaza, cargo, codigo, grado, estado_cargo, 
             titular_cedula, titular_nombre, situacion_titular, 
             encargo_cedula, encargo_nombre, es_encargo, 
             servidor_activo_cedula, servidor_activo_nombre 
      FROM public.planta_personal_sjd 
      WHERE id_plaza = 28;
    "
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
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
