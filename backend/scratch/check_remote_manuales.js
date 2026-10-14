const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH conectado. Verificando rutas de manuales en backend de producción...');
  conn.exec('grep -n "manuales" /opt/administrative-requests/backend/routes/nominaRoutes.js', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.on('close', () => {
      console.log('Resultado en nominaRoutes.js remoto:');
      console.log(out || '(Sin resultados)');
      
      conn.exec('ls -la /opt/administrative-requests/backend/uploads/manuales_funciones', (err2, stream2) => {
        let out2 = '';
        stream2.on('data', d => out2 += d.toString());
        stream2.on('close', () => {
          console.log('\nDirectorio uploads/manuales_funciones remoto:');
          console.log(out2 || '(Sin resultados)');
          conn.end();
        });
      });
    });
  });
}).on('error', e => console.error('Error SSH:', e.message))
.connect({
  host: '10.54.80.209',
  port: 22,
  username: 'sasge',
  password: '.Secjur-2026**',
  readyTimeout: 15000
});
