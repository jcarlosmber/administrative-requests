const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  // Ver funcionarios retirados en perno que coinciden o coincidían con plazas
  const query = `
    SELECT p.cedula, p.nombre_completo, p.posicion_planta, p.cargo, p.tipo_nombramiento, p.fecha_retiro,
           pl.id_plaza, pl.cargo as cargo_planta, pl.estado_cargo, pl.titular_cedula, pl.titular_nombre, pl.situacion_titular, pl.encargo_nombre
    FROM public.personal_perno_sjd p
    LEFT JOIN public.planta_personal_sjd pl ON pl.id_perno = p.posicion_planta
    WHERE p.estado_funcionario = 'R' OR p.fecha_retiro IS NOT NULL
    ORDER BY pl.id_plaza;
  `;
  conn.exec(`psql -U sasge -d sasge_db -c "${query}"`, (err, stream) => {
    if (err) throw err;
    let data = '';
    stream.on('close', () => {
      console.log('--- RETIRADOS EN PERNO VS PLANTA ---');
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
