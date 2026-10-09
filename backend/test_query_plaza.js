const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Client :: ready');
  conn.exec('psql -U sasge -d sasge_db -c "SELECT id_plaza, id_perno, cargo, estado_cargo, titular_cedula, titular_nombre, situacion_titular, encargo_nombre, encargo_cedula FROM public.planta_personal_sjd WHERE id_plaza IN (82, 84);"', (err, stream) => {
    if (err) throw err;
    let data = '';
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code);
      console.log(data);
      conn.end();
    }).on('data', (chunk) => {
      data += chunk;
    }).stderr.on('data', (chunk) => {
      console.error('STDERR: ' + chunk);
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '10.54.80.209',
  port: 22,
  username: 'sasge',
  password: '.Secjur-2026**'
});
