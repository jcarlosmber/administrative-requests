const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  conn.exec(`node -e "
    const http = require('http');
    http.get('http://localhost:3000/api/nomina/perno', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        console.log('Total devuelto por /api/nomina/perno:', json.total);
        const activos = json.personal.filter(p => p.estado_funcionario === 'A' && !p.fecha_retiro);
        console.log('Total activos devueltos:', activos.length);
        const retirados = json.personal.filter(p => p.estado_funcionario === 'R' || p.fecha_retiro);
        console.log('Total retirados devueltos:', retirados.length);
      });
    });
  "`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', d => console.log(d.toString()))
      .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({
  host: '10.54.80.209',
  port: 22,
  username: 'sasge',
  password: '.Secjur-2026**',
  readyTimeout: 15000
});
