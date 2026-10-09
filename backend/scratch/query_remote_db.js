const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH conectado a 10.54.80.209');
  const cmd = `export PGPASSWORD='.Secjur-2026**' && psql -h localhost -U sasge -d sasge_db -c "
    SELECT 'planta_personal_sjd' as tabla, count(*) as total,
      count(case when estado_cargo = 'OCUPADO' then 1 end) as ocupadas,
      count(case when estado_cargo = 'VACANTE DEFINITIVA' then 1 end) as vac_def,
      count(case when estado_cargo = 'VACANTE TEMPORAL' then 1 end) as vac_temp
    FROM public.planta_personal_sjd;
    
    SELECT estado_cargo, count(*) FROM public.planta_personal_sjd GROUP BY estado_cargo;
    
    SELECT 'personal_perno_sjd' as tabla, count(*) as total,
      count(case when estado_funcionario = 'A' and fecha_retiro is null then 1 end) as activos,
      count(case when estado_funcionario = 'R' or fecha_retiro is not null then 1 end) as retirados
    FROM public.personal_perno_sjd;
    
    SELECT estado_funcionario, count(*) FROM public.personal_perno_sjd GROUP BY estado_funcionario;
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
