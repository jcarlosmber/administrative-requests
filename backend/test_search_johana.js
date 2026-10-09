const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const query = `
    SELECT id_plaza, id_perno, cargo, titular_cedula, titular_nombre, encargo_cedula, encargo_nombre, situacion_administrativa, situacion_titular
    FROM public.planta_personal_sjd 
    WHERE titular_cedula = '53015269' OR encargo_cedula = '53015269';
  `;
  conn.exec(`psql -U sasge -d sasge_db -c "${query}"`, (err, stream) => {
    if (err) throw err;
    let data = '';
    stream.on('close', () => {
      console.log('--- PLAZAS CON JOHANA GAMEZ ---');
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
