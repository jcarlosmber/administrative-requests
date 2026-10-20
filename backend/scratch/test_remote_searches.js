const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('Conectado a 10.54.80.209');
  const testCmd = `
    export PGPASSWORD='.Secjur-2026**'
    echo "=== BUSQUEDA 'doris' EN BD REMOTA ==="
    psql -h localhost -U sasge -d sasge_db -c "
      SELECT id_plaza, cargo, estado_cargo, titular_cedula, titular_nombre, situacion_titular, servidor_activo_nombre, encargo_nombre 
      FROM public.planta_personal_sjd 
      WHERE titular_nombre ILIKE '%doris%' OR servidor_activo_nombre ILIKE '%doris%' OR encargo_nombre ILIKE '%doris%';
    "

    echo "=== BUSQUEDA 'jeffe' EN BD REMOTA ==="
    psql -h localhost -U sasge -d sasge_db -c "
      SELECT id_plaza, cargo, estado_cargo, titular_cedula, titular_nombre, situacion_titular, servidor_activo_nombre, encargo_nombre 
      FROM public.planta_personal_sjd 
      WHERE titular_nombre ILIKE '%jeffe%' OR servidor_activo_nombre ILIKE '%jeffe%' OR encargo_nombre ILIKE '%jeffe%';
    "

    echo "=== TEST HTTP API LOCALHOST:3000 EN EL SERVIDOR REMOTO ==="
    curl -s "http://localhost:3000/api/nomina/plazas?busqueda=jeffe" | grep -o '"id_plaza":18[^}]*' | head -n 1
    curl -s "http://localhost:3000/api/nomina/plazas?busqueda=doris" | grep -o '"id_plaza":18[^}]*' | head -n 1
  `;

  conn.exec(testCmd, (err, stream) => {
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
