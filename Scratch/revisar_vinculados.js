const fs = require('fs');

const content = fs.readFileSync('./frontend/lib/casos2026Data.ts', 'utf8');

// Parse raw cases using simple regex or JSON extract
const jsonMatch = content.match(/export const CASOS_2026_RAW: Caso2026Raw\[\] = (\[[\s\S]*?\]);/);
if (!jsonMatch) {
  console.log('No match for CASOS_2026_RAW');
  process.exit(1);
}

const casos = JSON.parse(jsonMatch[1]);
console.log('Total casos:', casos.length);

const vinculaciones = casos.filter(c => c.tipo_proceso === 'VINCULACION');
console.log('Total vinculaciones:', vinculaciones.length);

const carrera = casos.filter(c => c.modalidad === 'CARRERA_ADMINISTRATIVA' || c.concurso_opec);
console.log('Total casos que entran a Listas de Elegibles (casosConcursoElegibles):', carrera.length);

console.log('\n--- CASOS QUE ENTRAN A LISTAS DE ELEGIBLES & TÉRMINOS ---');
carrera.forEach(c => {
  console.log(`[${c.id}] ${c.tipo_proceso} | ${c.modalidad} | ${c.servidor_nombre} | Plaza #${c.id_plaza} | OPEC: ${c.concurso_opec || 'N/A'}`);
});
