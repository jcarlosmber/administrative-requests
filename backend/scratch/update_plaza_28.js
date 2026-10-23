const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('Conectado a 10.54.80.209');
  const sqlUpdate = `
    export PGPASSWORD='.Secjur-2026**'
    psql -h localhost -U sasge -d sasge_db -c "
      UPDATE public.planta_personal_sjd SET
        estado_cargo = 'VACANTE TEMPORAL',
        situacion_titular = 'EN ENCARGO',
        titular_cedula = '51882380',
        titular_nombre = 'CARMEN ALICIA FORERO FORERO',
        encargo_cedula = NULL,
        encargo_nombre = NULL,
        es_encargo = false,
        servidor_activo_cedula = NULL,
        servidor_activo_nombre = NULL,
        tipo_vinculacion = 'VACANTE TEMPORAL',
        tipo_vinculacion_cargo = 'VACANTE TEMPORAL',
        situacion_administrativa = 'VACANTE TEMPORAL',
        updated_at = NOW()
      WHERE id_plaza = 28;

      SELECT id_plaza, cargo, estado_cargo, titular_cedula, titular_nombre, situacion_titular, 
             encargo_cedula, encargo_nombre, es_encargo, servidor_activo_cedula, servidor_activo_nombre 
      FROM public.planta_personal_sjd 
      WHERE id_plaza = 28;
    "
  `;

  conn.exec(sqlUpdate, (err, stream) => {
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
