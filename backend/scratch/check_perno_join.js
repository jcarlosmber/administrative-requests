const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH conectado a 10.54.80.209');
  const cmd = `export PGPASSWORD='.Secjur-2026**' && psql -h localhost -U sasge -d sasge_db -c "
    -- Cuántos registros devuelve la consulta de /perno?
    SELECT count(*) as total_filas_query_perno,
           count(case when per.estado_funcionario = 'A' and per.fecha_retiro is null then 1 end) as activos_query
    FROM public.personal_perno_sjd per
    LEFT JOIN public.planta_personal_sjd pl 
      ON (per.cedula = pl.titular_cedula OR per.cedula = pl.encargo_cedula);

    -- Cuántas personas distintas activas hay?
    SELECT count(distinct per.cedula) as personas_unicas_activas
    FROM public.personal_perno_sjd per
    LEFT JOIN public.planta_personal_sjd pl 
      ON (per.cedula = pl.titular_cedula OR per.cedula = pl.encargo_cedula)
    WHERE per.estado_funcionario = 'A' and per.fecha_retiro is null;

    -- Cuáles personas se duplican por el LEFT JOIN?
    SELECT per.cedula, per.nombre_completo, count(*) as veces
    FROM public.personal_perno_sjd per
    LEFT JOIN public.planta_personal_sjd pl 
      ON (per.cedula = pl.titular_cedula OR per.cedula = pl.encargo_cedula)
    WHERE per.estado_funcionario = 'A' and per.fecha_retiro is null
    GROUP BY per.cedula, per.nombre_completo
    HAVING count(*) > 1;
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
