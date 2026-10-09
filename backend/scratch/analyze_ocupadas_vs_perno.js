const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const cmd = `export PGPASSWORD='.Secjur-2026**' && psql -h localhost -U sasge -d sasge_db -c "
    -- 1. Análisis de las 159 plazas OCUPADAS
    SELECT estado_cargo, count(*) 
    FROM public.planta_personal_sjd 
    GROUP BY estado_cargo;

    -- 2. Plazas ocupadas: tienen titular, tienen encargo?
    SELECT 
      count(*) as total_ocupadas,
      count(case when titular_cedula is not null and titular_cedula <> '' then 1 end) as con_titular_cedula,
      count(case when encargo_cedula is not null and encargo_cedula <> '' then 1 end) as con_encargo_cedula,
      count(case when (titular_cedula is null or titular_cedula = '') and (encargo_cedula is not null and encargo_cedula <> '') then 1 end) as solo_encargo,
      count(case when (titular_cedula is not null and titular_cedula <> '') and (encargo_cedula is not null and encargo_cedula <> '') then 1 end) as titular_y_encargo
    FROM public.planta_personal_sjd
    WHERE estado_cargo = 'OCUPADO';

    -- 3. Cédulas únicas en planta vs en perno
    SELECT 
      count(distinct titular_cedula) filter (where titular_cedula is not null and titular_cedula <> '') as titulares_unicos,
      count(distinct encargo_cedula) filter (where encargo_cedula is not null and encargo_cedula <> '') as encargados_unicos
    FROM public.planta_personal_sjd;

    -- 4. Cuántos titulares de plazas ocupadas están en PERNO como activos?
    SELECT 
      count(*) as titulares_en_perno_activos
    FROM public.planta_personal_sjd pl
    INNER JOIN public.personal_perno_sjd per ON pl.titular_cedula = per.cedula
    WHERE pl.estado_cargo = 'OCUPADO' AND per.estado_funcionario = 'A' AND per.fecha_retiro IS NULL;

    -- 5. Hay plazas OCUPADAS sin titular en PERNO activo?
    SELECT pl.id_plaza, pl.cargo, pl.titular_cedula, pl.titular_nombre, pl.encargo_cedula, pl.encargo_nombre, per.estado_funcionario
    FROM public.planta_personal_sjd pl
    LEFT JOIN public.personal_perno_sjd per ON pl.titular_cedula = per.cedula
    WHERE pl.estado_cargo = 'OCUPADO' AND (per.cedula IS NULL OR per.estado_funcionario <> 'A' OR per.fecha_retiro IS NOT NULL);

    -- 6. Funcionarios activos en PERNO que NO están como titular de ninguna plaza ocupada:
    SELECT per.cedula, per.nombre_completo, per.cargo, per.posicion_planta
    FROM public.personal_perno_sjd per
    WHERE per.estado_funcionario = 'A' AND per.fecha_retiro IS NULL
      AND per.cedula NOT IN (
        SELECT titular_cedula FROM public.planta_personal_sjd WHERE titular_cedula IS NOT NULL AND estado_cargo = 'OCUPADO'
      );
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
