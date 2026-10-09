const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const query = `
    SELECT id_plaza, id_sideap, id_perno, cargo, codigo, grado, estado_cargo, 
           titular_cedula, titular_nombre, situacion_titular, tipo_vinculacion, situacion_administrativa,
           encargo_cedula, encargo_nombre, es_encargo, dependencia_cargo
    FROM public.planta_personal_sjd 
    WHERE id_plaza IN (82, 84);
  `;
  conn.exec(`psql -U sasge -d sasge_db -x -c "${query}"`, (err, stream) => {
    if (err) throw err;
    let data = '';
    stream.on('close', () => {
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
