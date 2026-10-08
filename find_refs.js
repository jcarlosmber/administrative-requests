const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== '.expo') {
        searchDir(full, pattern);
      }
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes('vinculaciones-desvinculaciones')) {
        console.log('Referencia a pantalla en:', full);
      }
    }
  }
}

searchDir('c:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/frontend/app', 'vinculaciones-desvinculaciones');
