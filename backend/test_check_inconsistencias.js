const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  // 1. Ver qué plazas tienen situacion_titular o situacion_administrativa o notas relacionadas con "COMISION", "PRUEBA", "TEMPORAL"
  // 2. Ver discrepancias entre estado_cargo y situacion_titular/situacion_administrativa
  // 3. Ver plazas que fueron sobreescritas por personal_perno_sjd
  const query = `
    SELECT id_plaza, id_sideap, id_perno, cargo, codigo, grado, estado_cargo, 
           titular_cedula, titular_nombre, situacion_titular, situacion_administrativa,
           encargo_cedula, encargo_nombre, es_encargo
    FROM public.planta_personal_sjd
    WHERE situacion_titular ILIKE '%PRUEBA%' 
       OR situacion_titular ILIKE '%COMIS%'
       OR situacion_titular ILIKE '%TEMPORAL%'
       OR situacion_administrativa ILIKE '%PRUEBA%'
       OR situacion_administrativa ILIKE '%COMIS%'
       OR situacion_administrativa ILIKE '%TEMPORAL%'
       OR estado_cargo ILIKE '%TEMPORAL%'
       OR (titular_nombre ILIKE '%VACANTE%' AND (encargo_nombre IS NOT NULL AND encargo_nombre != ''))
       OR (situacion_titular ILIKE '%VACANTE DEFINITIVA%' AND estado_cargo = 'OCUPADO')
    ORDER BY id_plaza;
  `;
  conn.exec(`psql -U sasge -d sasge_db -c "${query}"`, (err, stream) => {
    if (err) throw err;
    let data = '';
    stream.on('close', () => {
      console.log('--- PLAZAS CON SITUACIONES ESPECIALES O INCONSISTENCIAS ---');
      console.log(data);
      conn.end();
    }).on('data', (c) => data += c);
  });
}).connect({
  host: '10.54.80.209',
  port: 22,
  username: 'sasge',
  password: '.Secjur-2026**'
});
