const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const sql = `
    export PGPASSWORD='.Secjur-2026**'
    psql -h localhost -U sasge -d sasge_db -x -c "
      SELECT id_plaza, cargo, estado_cargo, tipo_vinculacion, tipo_vinculacion_cargo, titular_cedula, titular_nombre, encargo_cedula, encargo_nombre, servidor_activo_cedula, servidor_activo_nombre, es_encargo, situacion_titular, situacion_administrativa, sexo
      FROM planta_personal_sjd
      WHERE id_plaza IN (18, 23);
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
