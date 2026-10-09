const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const cmd = `export PGPASSWORD='.Secjur-2026**' && psql -h localhost -U sasge -d sasge_db -c "
    SELECT 
      count(*) as total_filas,
      count(case when per.estado_funcionario = 'A' and per.fecha_retiro is null then 1 end) as activos,
      count(case when per.estado_funcionario = 'R' or per.fecha_retiro is not null then 1 end) as retirados
    FROM public.personal_perno_sjd per
    LEFT JOIN LATERAL (
      SELECT * FROM public.planta_personal_sjd pl
      WHERE pl.encargo_cedula = per.cedula 
         OR pl.titular_cedula = per.cedula 
         OR (per.posicion_planta IS NOT NULL AND pl.id_perno = per.posicion_planta)
      ORDER BY 
        CASE 
          WHEN pl.encargo_cedula = per.cedula THEN 1
          WHEN pl.titular_cedula = per.cedula THEN 2
          ELSE 3
        END,
        pl.id_plaza ASC
      LIMIT 1
    ) pl ON true;
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
