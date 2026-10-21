const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('Conectado a 10.54.80.209');
  const sql = `
    export PGPASSWORD='.Secjur-2026**'
    psql -h localhost -U sasge -d sasge_db -c "
      UPDATE public.planta_personal_sjd
      SET servidor_activo_nombre = 'MARIA GABRIELA TREJO CHAVES',
          servidor_activo_cedula = '1193101660',
          encargo_nombre = 'MARIA GABRIELA TREJO CHAVES',
          encargo_cedula = '1193101660',
          es_encargo = true,
          sexo = 'F'
      WHERE id_plaza = 23;
    "

    echo "--- VERIFICACION PLAZA 23 ---"
    psql -h localhost -U sasge -d sasge_db -x -c "
      SELECT id_plaza, cargo, estado_cargo, titular_cedula, titular_nombre, encargo_cedula, encargo_nombre, servidor_activo_cedula, servidor_activo_nombre, es_encargo, sexo
      FROM public.planta_personal_sjd
      WHERE id_plaza = 23;
    "
  `;

  conn.exec(sql, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (d) => {
      console.log(d.toString());
    }).stderr.on('data', (d) => {
      console.error(d.toString());
    });
  });
}).on('error', (e) => {
  console.error('SSH Error:', e.message);
}).connect({
  host: '10.54.80.209',
  port: 22,
  username: 'sasge',
  password: '.Secjur-2026**',
});
