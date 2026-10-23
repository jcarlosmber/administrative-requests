const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    export PGPASSWORD='.Secjur-2026**'
    echo "=== PLAZA 28 EN sasge_db ==="
    psql -h localhost -U sasge -d sasge_db -c "
      SELECT id_plaza, id_perno, id_sideap, cargo, nivel, codigo, grado, estado_cargo, 
             titular_cedula, titular_nombre, situacion_titular, 
             encargo_cedula, encargo_nombre, es_encargo, 
             servidor_activo_cedula, servidor_activo_nombre, 
             tipo_vinculacion, situacion_administrativa
      FROM public.planta_personal_sjd 
      WHERE id_plaza = 28;
    "

    echo "=== REGISTROS DE OMAIRA EN sasge_db ==="
    psql -h localhost -U sasge -d sasge_db -c "
      SELECT id_plaza, cargo, estado_cargo, titular_nombre, encargo_nombre, servidor_activo_nombre 
      FROM public.planta_personal_sjd 
      WHERE titular_nombre ILIKE '%omaira%' OR encargo_nombre ILIKE '%omaira%' OR servidor_activo_nombre ILIKE '%omaira%';
    "

    echo "=== OMAIRA EN PLANTA PERNO ==="
    psql -h localhost -U sasge -d sasge_db -c "
      SELECT cedula, nombre_completo, estado_funcionario, fecha_retiro, cargo, posicion_planta 
      FROM public.planta_perno 
      WHERE nombre_completo ILIKE '%omaira%' 
      LIMIT 5;
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
