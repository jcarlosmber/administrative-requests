const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('curl -s "http://localhost:3000/api/nomina/peticiones-opec/consultar?opec=220280"', (err, stream) => {
    if (err) throw err;
    let data = '';
    stream.on('close', () => {
      try {
        const json = JSON.parse(data);
        console.log('✓ Endpoint en producción funcionando:');
        console.log('Encontrado:', json.encontrado);
        console.log('Cargo:', json.identificacion?.cargo);
        console.log('Total plazas:', json.conteo?.total_empleos);
      } catch (e) {
        console.log('Respuesta:', data.slice(0, 300));
      }
      conn.end();
    }).on('data', d => data += d.toString());
  });
}).connect({
  host: '10.54.80.209',
  port: 22,
  username: 'sasge',
  password: '.Secjur-2026**',
  readyTimeout: 15000,
});
