const fs = require('fs');
const path = 'c:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/frontend/app/rrhh/vinculaciones-desvinculaciones.tsx';
const code = fs.readFileSync(path, 'utf8');

const startIndex = code.indexOf('{tabActiva === \'flujos\' && (');
const listIndex = code.indexOf('Trámites Registrados ({casosFiltrados.length})', startIndex);

console.log(code.substring(startIndex, listIndex));
