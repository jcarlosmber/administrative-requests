const fs = require('fs');
const path = 'c:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/frontend/app/rrhh/vinculaciones-desvinculaciones.tsx';

let code = fs.readFileSync(path, 'utf8');

console.log('Original length:', code.length);
