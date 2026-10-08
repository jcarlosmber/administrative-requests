const fs = require('fs');
const targetPath = 'c:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/frontend/app/rrhh/vinculaciones-desvinculaciones.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

const needle = 'const [tabActiva, setTabActiva] = useState<';
const idx = content.indexOf(needle);
console.log('Indice de tabActiva:', idx);
if (idx !== -1) {
  console.log('Snippet:', content.substring(idx - 40, idx + 200));
}
