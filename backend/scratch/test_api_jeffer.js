const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  conn.exec("curl -s 'http://localhost:3000/api/nomina/plazas?busqueda=jeffer'", (err, stream) => {
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.on('close', () => {
      try {
        const parsed = JSON.parse(out);
        const plazas = parsed.plazas || parsed;
        console.log(plazas.map(p => ({
          id_plaza: p.id_plaza,
          cargo: p.cargo,
          titular_nombre: p.titular_nombre,
          encargo_nombre: p.encargo_nombre,
          servidor_activo_nombre: p.servidor_activo_nombre,
          tipo_vinculacion: p.tipo_vinculacion,
          tipo_vinculacion_cargo: p.tipo_vinculacion_cargo,
          es_encargo: p.es_encargo,
          sexo: p.sexo
        })));
      } catch (e) {
        console.log('Error parsing:', e.message, out.slice(0, 300));
      }
      conn.end();
    });
  });
}).connect({ host: '10.54.80.209', port: 22, username: 'sasge', password: '.Secjur-2026**' });
