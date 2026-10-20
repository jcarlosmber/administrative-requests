const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('Conectado a 10.54.80.209');
  const sqlUpdate = `
    export PGPASSWORD='.Secjur-2026**'
    psql -h localhost -U sasge -d sasge_db -c "
      UPDATE public.planta_personal_sjd SET
        estado_cargo = 'OCUPADO',
        titular_cedula = '52557124',
        titular_nombre = 'DORIS SILVA GARCIA',
        situacion_titular = 'PERIODO DE PRUEBA EN OTRA ENTIDAD',
        tipo_vinculacion = 'CARRERA ADMINISTRATIVA',
        tipo_vinculacion_entidad = 'CARRERA ADMINISTRATIVA',
        tipo_vinculacion_cargo = 'EN ENCARGO',
        situacion_administrativa = 'ENCARGO',
        encargo_cedula = '80842817',
        encargo_nombre = 'JEFFER FRANK VELANDIA LOPEZ',
        servidor_activo_cedula = '80842817',
        servidor_activo_nombre = 'JEFFER FRANK VELANDIA LOPEZ',
        es_encargo = true,
        id_escalera = 'E22',
        peldano_escalera = 1,
        updated_at = NOW()
      WHERE id_plaza = 18;

      SELECT id_plaza, cargo, estado_cargo, titular_cedula, titular_nombre, situacion_titular, servidor_activo_cedula, servidor_activo_nombre, encargo_cedula, encargo_nombre, es_encargo, id_escalera
      FROM public.planta_personal_sjd 
      WHERE id_plaza = 18;
    "
  `;

  conn.exec(sqlUpdate, (err, stream) => {
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
