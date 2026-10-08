const fs = require('fs');
const targetPath = 'c:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/frontend/app/rrhh/vinculaciones-desvinculaciones.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

const needle = 'PESTAÑAS (NAVEGACIÓN ESTILO NÓMINA)';
const idx = content.indexOf(needle);
console.log('Indice de PESTAÑAS:', idx);
if (idx !== -1) {
  const nextNeedle = '{tabActiva === \'flujos\' && (';
  const endIdx = content.indexOf(nextNeedle, idx);
  console.log('Snippet pestañas completo length:', endIdx - idx);
  console.log(content.substring(idx - 40, endIdx));
}
