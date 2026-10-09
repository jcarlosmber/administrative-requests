const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const cmd = `export PGPASSWORD='.Secjur-2026**' && psql -h localhost -U sasge -d sasge_db -c "
    SELECT titular_cedula, titular_nombre, count(*) as count_plazas
    FROM public.planta_personal_sjd
    WHERE titular_cedula IS NOT NULL AND titular_cedula <> ''
    GROUP BY titular_cedula, titular_nombre
    HAVING count(*) > 1;

    SELECT id_plaza, cargo, estado_cargo, titular_cedula, titular_nombre, encargo_cedula, encargo_nombre
    FROM public.planta_personal_sjd
    WHERE titular_cedula IN (
      SELECT titular_cedula FROM public.planta_personal_sjd GROUP BY titular_cedula HAVING count(*) > 1
    )
    ORDER BY titular_cedula;
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
