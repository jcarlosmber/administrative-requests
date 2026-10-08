const fs = require('fs');
const path = 'c:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/frontend/app/rrhh/vinculaciones-desvinculaciones.tsx';
const code = fs.readFileSync(path, 'utf8');

const startIndex = code.indexOf('{tabActiva === \'flujos\' && (');
const endIndex = code.indexOf('{tabActiva === \'secop\' && (');

console.log('--- START 1500 chars ---');
console.log(code.substring(startIndex, startIndex + 1500));

console.log('--- END 500 chars ---');
console.log(code.substring(endIndex - 500, endIndex));
