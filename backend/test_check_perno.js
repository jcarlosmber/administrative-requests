const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const query = `
    SELECT cedula, nombre_completo, estado_funcionario, estado_descripcion, cargo, posicion_planta, tipo_nombramiento, fecha_retiro 
    FROM public.personal_perno_sjd 
    WHERE cedula IN ('91526810', '53015269');
  `;
  conn.exec(`psql -U sasge -d sasge_db -c "${query}"`, (err, stream) => {
    if (err) throw err;
    let data = '';
    stream.on('close', () => {
      console.log('--- PERSONAL PERNO SJD ---');
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
