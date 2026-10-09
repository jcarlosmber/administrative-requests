const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const localFile = path.resolve(__dirname, '../routes/nominaRoutes.js');
const remoteFile = '/opt/administrative-requests/backend/routes/nominaRoutes.js';

conn.on('ready', () => {
  console.log('SSH conectado. Iniciando SFTP...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(localFile, remoteFile, (errPut) => {
      if (errPut) throw errPut;
      console.log('✓ Archivo nominaRoutes.js subido exitosamente a producción.');
      
      conn.exec('pm2 restart backend-solicitudes', (errExec, stream) => {
        if (errExec) throw errExec;
        stream.on('close', () => {
          console.log('✓ PM2 backend-solicitudes reiniciado exitosamente.');
          conn.end();
        }).on('data', d => console.log(d.toString()))
          .stderr.on('data', d => console.error(d.toString()));
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
