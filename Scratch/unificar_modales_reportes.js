const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'app', 'rrhh', 'nomina.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Eliminar declaraciones de estado de modalDetallePlazaReporteVisible
content = content.replace(/\r?\n\s*const \[plazaDetalleReporte, setPlazaDetalleReporte\] = useState<PlazaNomina \| null>\(null\);/, '');
content = content.replace(/\r?\n\s*const \[modalDetallePlazaReporteVisible, setModalDetallePlazaReporteVisible\] = useState\(false\);/, '');

// 2. Reemplazar los 3 manejadores onPress
content = content.replace(
  /setPlazaDetalleReporte\(p\);\s*\r?\n\s*setModalDetallePlazaReporteVisible\(true\);/g,
  "setModalTab('general');\n                                    setPlazaModal(p);"
);

// 3. Eliminar el modal antiguo
const modalRegex = /\r?\n\s*\{\/\* Modal Ficha Técnica de la Plaza \(Reportes\) \*\/\}\r?\n\s*<Modal[\s\S]*?visible=\{modalDetallePlazaReporteVisible\}[\s\S]*?<\/Modal>/;
if (modalRegex.test(content)) {
  content = content.replace(modalRegex, '');
  console.log('Modal antiguo modalDetallePlazaReporteVisible eliminado con éxito');
} else {
  console.log('Advertencia: No se encontró el Modal antiguo por regex');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Operación completada exitosamente.');
