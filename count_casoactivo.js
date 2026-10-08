const fs = require('fs');
const path = 'c:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/frontend/app/rrhh/vinculaciones-desvinculaciones.tsx';
const code = fs.readFileSync(path, 'utf8');

const startIndex = code.indexOf('{tabActiva === \'flujos\' && (');
const endIndex = code.indexOf('{tabActiva === \'secop\' && (');
const block = code.substring(startIndex, endIndex);

const matches = block.match(/casoActivo/g);
console.log('Ocurrencias de casoActivo en el bloque:', matches ? matches.length : 0);
