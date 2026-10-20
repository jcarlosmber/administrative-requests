const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('Conectado a 10.54.80.209');
  const cmd = `
    export PGPASSWORD='.Secjur-2026**'
    echo "=== PLAZA 21 EN BD REMOTA ==="
    psql -h localhost -U sasge -d sasge_db -c "SELECT id_plaza, cargo, estado_cargo, titular_cedula, titular_nombre, situacion_titular, encargo_cedula, encargo_nombre, servidor_activo_cedula, servidor_activo_nombre, es_encargo FROM public.planta_personal_sjd WHERE id_plaza = 21;"
    
    echo "=== TODAS LAS PLAZAS CON VACANTE DEFINITIVA EN BD REMOTA ==="
    psql -h localhost -U sasge -d sasge_db -c "SELECT id_plaza, cargo, estado_cargo, titular_cedula, titular_nombre, situacion_titular, encargo_cedula, encargo_nombre FROM public.planta_personal_sjd WHERE estado_cargo = 'VACANTE DEFINITIVA' ORDER BY id_plaza;"
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
