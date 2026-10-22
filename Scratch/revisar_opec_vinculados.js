const fs = require('fs');

const content = fs.readFileSync('./frontend/lib/casos2026Data.ts', 'utf8');
const plazas = JSON.parse(fs.readFileSync('./frontend/lib/plantaMockData.json', 'utf8'));

const jsonMatch = content.match(/export const CASOS_2026_RAW: Caso2026Raw\[\] = (\[[\s\S]*?\]);/);
const casos = JSON.parse(jsonMatch[1]);

const vincCarrera = casos.filter(c => c.tipo_proceso === 'VINCULACION' && (c.modalidad === 'CARRERA_ADMINISTRATIVA' || c.modalidad === 'ASCENSO' || c.concurso_opec));

console.log('Total vinculaciones de Carrera / Ascenso:', vincCarrera.length);
vincCarrera.forEach(c => {
  const pl = plazas.find(p => p.id_plaza === c.id_plaza);
  console.log(`[${c.id}] ${c.servidor_nombre} | Plaza #${c.id_plaza} -> Plaza OPEC: ${pl?.opec || 'SIN_OPEC'} | Cargo: ${c.cargo} (Plaza: ${pl?.cargo})`);
});
