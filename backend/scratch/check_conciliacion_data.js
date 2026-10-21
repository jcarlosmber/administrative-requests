const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('Conectado a 10.54.80.209');
  const sql = `
    export PGPASSWORD='.Secjur-2026**'
    psql -h localhost -U sasge -d sasge_db -t -A -c "
      SELECT json_build_object(
        'total_plazas', (SELECT count(*) FROM planta_personal_sjd),
        'plazas_ocupadas', (SELECT count(*) FROM planta_personal_sjd WHERE estado_cargo = 'OCUPADO'),
        'plazas_vacantes_def', (SELECT count(*) FROM planta_personal_sjd WHERE estado_cargo = 'VACANTE DEFINITIVA'),
        'plazas_vacantes_temp', (SELECT count(*) FROM planta_personal_sjd WHERE estado_cargo = 'VACANTE TEMPORAL'),
        'plazas_encargo', (SELECT count(*) FROM planta_personal_sjd WHERE es_encargo = true OR tipo_vinculacion_cargo = 'EN ENCARGO'),
        'total_perno', (SELECT count(*) FROM personal_perno_sjd),
        'perno_activos', (SELECT count(*) FROM personal_perno_sjd WHERE estado_funcionario = 'A' AND fecha_retiro IS NULL),
        'perno_retirados', (SELECT count(*) FROM personal_perno_sjd WHERE estado_funcionario = 'R' OR fecha_retiro IS NOT NULL)
      );
    "
    
    echo "--- POSICION PLANTA STATS ---"
    psql -h localhost -U sasge -d sasge_db -c "
      SELECT p.cedula, p.nombre_completo, p.cargo, p.posicion_planta, pl.id_plaza, pl.cargo as cargo_plaza, pl.titular_cedula, pl.encargo_cedula, pl.servidor_activo_cedula
      FROM personal_perno_sjd p
      LEFT JOIN planta_personal_sjd pl ON (pl.titular_cedula = p.cedula OR pl.encargo_cedula = p.cedula OR pl.servidor_activo_cedula = p.cedula)
      WHERE p.estado_funcionario = 'A' AND p.fecha_retiro IS NULL AND (p.posicion_planta IS NULL OR p.posicion_planta = 0);
    "
    psql -h localhost -U sasge -d sasge_db -c "
      SELECT p.cedula, p.nombre_completo, p.cargo, p.dependencia, p.posicion_planta, p.estado_funcionario
      FROM personal_perno_sjd p
      WHERE (p.estado_funcionario = 'A' AND p.fecha_retiro IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM planta_personal_sjd pl
          WHERE pl.titular_cedula = p.cedula
             OR pl.encargo_cedula = p.cedula
             OR pl.servidor_activo_cedula = p.cedula
             OR (p.posicion_planta IS NOT NULL AND pl.id_perno = p.posicion_planta)
        );
    "

    echo "--- PLAZAS OCUPADAS SIN PERSONA ACTIVA EN PERNO ---"
    psql -h localhost -U sasge -d sasge_db -c "
      SELECT pl.id_plaza, pl.cargo, pl.estado_cargo, pl.titular_cedula, pl.titular_nombre, pl.servidor_activo_cedula, pl.servidor_activo_nombre
      FROM planta_personal_sjd pl
      WHERE pl.estado_cargo = 'OCUPADO'
        AND NOT EXISTS (
          SELECT 1 FROM personal_perno_sjd p
          WHERE (p.estado_funcionario = 'A' AND p.fecha_retiro IS NULL)
            AND (
              p.cedula = pl.servidor_activo_cedula
              OR p.cedula = pl.encargo_cedula
              OR p.cedula = pl.titular_cedula
              OR (p.posicion_planta IS NOT NULL AND p.posicion_planta = pl.id_perno)
            )
        );
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
