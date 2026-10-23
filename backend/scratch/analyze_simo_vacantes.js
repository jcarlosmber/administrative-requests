const perno = require('../../frontend/lib/pernoMockData.json');
const plazas = require('../../frontend/lib/plantaMockData.json');
const fs = require('fs');

const simoFile = fs.readFileSync('frontend/lib/reporteSimoData.ts', 'utf8');
const lines = simoFile.split('\n');
const jsonLines = [];
let started = false;
for (const line of lines) {
  if (line.includes('export const REPORTES_SIMO_4_0_DATA')) {
    started = true;
    continue;
  }
  if (started) {
    if (line.trim().startsWith('];')) {
      break;
    }
    jsonLines.push(line);
  }
}
const simoData = JSON.parse('[' + jsonLines.join('\n') + ']');
console.log('Total SIMO records:', simoData.length);

let totalProvGenerador = 0;
let totalCarreraEncontrado = 0;
let totalSinCarrera = 0;

simoData.forEach((r) => {
  let plaza = null;
  if (r.idPlazaVinculada) plaza = plazas.find(p => p.id_plaza === r.idPlazaVinculada);
  if (!plaza && r.plazaVinculada?.idPlaza) plaza = plazas.find(p => p.id_plaza === r.plazaVinculada?.idPlaza);
  if (!plaza) {
    const denom = (r.denominacion || '').toLowerCase().trim();
    const cod = String(r.codigo || '').trim();
    const gr = String(r.grado || '').trim();
    plaza = plazas.find(p => (p.cargo || '').toLowerCase().trim() === denom && String(p.codigo || '').trim() === cod && String(p.grado || '').trim() === gr);
  }

  if (plaza && plaza.id_perno) {
    const idPerno = Number(plaza.id_perno);
    const regs = perno.filter(p => Number(p.posicion_planta) === idPerno);
    const retirados = regs
      .filter(p => p.fecha_retiro || p.estado_funcionario === 'R')
      .sort((a,b) => (b.fecha_retiro || '').localeCompare(a.fecha_retiro || ''));

    if (retirados.length > 0) {
      const top = retirados[0];
      const esProv = String(top.tipo_nombramiento || '').toUpperCase().includes('PROVISIONAL') ||
                     String(top.tipo_funcionario || '').toUpperCase().includes('PROVISIONAL') ||
                     String(top.cargo || '').toUpperCase().includes('PROVISIONAL');

      if (esProv) {
        totalProvGenerador++;
        // Buscar el titular de carrera retirado más reciente
        const deCarrera = retirados.filter(p => {
          const tn = String(p.tipo_nombramiento || '').toUpperCase();
          const tf = String(p.tipo_funcionario || '').toUpperCase();
          return !tn.includes('PROVISIONAL') && !tf.includes('PROVISIONAL') && (tn.includes('CARRERA') || tn.includes('PROPIEDAD') || tf.includes('CARRERA') || tf.includes('PLANTA'));
        });

        if (deCarrera.length > 0) {
          totalCarreraEncontrado++;
          console.log(`[CORREGIBLE] OPEC #${r.opec} (Plaza #${plaza.id_plaza}, Pos #${idPerno}): Mostraba prov: ${top.nombre_completo} (${top.tipo_nombramiento}) -> Debe ser carrera: ${deCarrera[0].nombre_completo} (${deCarrera[0].tipo_nombramiento}, Retiro: ${deCarrera[0].fecha_retiro})`);
        } else {
          totalSinCarrera++;
          console.log(`[SIN CARRERA HISTÓRICO] OPEC #${r.opec} (Plaza #${plaza.id_plaza}, Pos #${idPerno}): Mostraba prov: ${top.nombre_completo} (${top.tipo_nombramiento}) -> NO hubo titular de carrera previo retirado en nómina (Plaza creada/vacancia definitiva original)`);
        }
      }
    }
  }
});

console.log('\nResumen:');
console.log('Total casos donde aparecía un provisional como generador:', totalProvGenerador);
console.log('Casos donde existe un titular de carrera previo retirado:', totalCarreraEncontrado);
console.log('Casos donde solo hubo provisionales (sin titular de carrera previo):', totalSinCarrera);
