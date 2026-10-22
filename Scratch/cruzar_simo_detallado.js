const fs = require('fs');

const simoContent = fs.readFileSync('frontend/lib/reporteSimoData.ts', 'utf8');
const simoMatch = simoContent.match(/export const REPORTES_SIMO_4_0_DATA: RegistroSimoOpec\[\] = (\[[\s\S]*?\]);/);
const simoData = JSON.parse(simoMatch[1]);

const plantaData = JSON.parse(fs.readFileSync('frontend/lib/plantaMockData.json', 'utf8'));

let casos2026 = [];
try {
  const casosContent = fs.readFileSync('frontend/lib/casos2026Data.ts', 'utf8');
  const casosMatch = casosContent.match(/export const CASOS_2026_RAW: Caso2026Raw\[\] = (\[[\s\S]*?\]);/);
  if (casosMatch) casos2026 = JSON.parse(casosMatch[1]);
} catch (e) {}

// Normalizar strings para comparar
function norm(str) {
  if (!str) return '';
  return str.toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}

console.log('--- REVISIÓN DE REGISTROS SIMO DISPONIBLES (26) ---');
const simoDisponibles = simoData.filter(s => s.estadoProvision === 'Disponible');
console.log('Total Disponibles en SIMO:', simoDisponibles.length);

// Agrupados por cargo + codigo + grado
const simoDispAgrupados = {};
simoDisponibles.forEach(s => {
  const key = `${norm(s.denominacion)} | COD:${norm(s.codigo)} | GRADO:${norm(s.grado)}`;
  if (!simoDispAgrupados[key]) simoDispAgrupados[key] = [];
  simoDispAgrupados[key].push(s);
});

console.log('Cargos en SIMO Disponibles:');
for (const [k, v] of Object.entries(simoDispAgrupados)) {
  console.log(`- ${k}: ${v.length} plaza(s) [OPECs: ${v.map(x => x.opec + ' (idCargo:' + x.idCargo + ')').join(', ')}]`);
}

console.log('\n--- VACANTES DEFINITIVAS EN PLANTA ---');
// Filtrar en planta solo los de carrera administrativa o todas las vacantes definitivas
const vacantesDefPlanta = plantaData.filter(p => {
  const tit = norm(p.titular_nombre);
  const sit = norm(p.situacion_titular);
  const est = norm(p.estado_cargo);
  const esVac = tit.includes('VACANTE DEFINITIVA') || sit.includes('VACANTE DEFINITIVA') || est.includes('VACANTE');
  return esVac;
});

const vacCarrera = vacantesDefPlanta.filter(p => norm(p.tipo_vinculacion).includes('CARRERA') || norm(p.tipo_nombramiento).includes('CARRERA'));
console.log(`Total vacantes definitivas en planta: ${vacantesDefPlanta.length}`);
console.log(`De las cuales son Carrera Administrativa: ${vacCarrera.length}`);
console.log(`Otras vinculaciones (Libre Nombramiento, etc.): ${vacantesDefPlanta.length - vacCarrera.length}`);

const vacDispAgrupadas = {};
vacantesDefPlanta.forEach(p => {
  const key = `${norm(p.cargo)} | COD:${norm(p.codigo)} | GRADO:${norm(p.grado)}`;
  if (!vacDispAgrupadas[key]) vacDispAgrupadas[key] = [];
  vacDispAgrupadas[key].push(p);
});

console.log('\nCargos con Vacante Definitiva en Planta:');
for (const [k, v] of Object.entries(vacDispAgrupadas)) {
  const tipos = [...new Set(v.map(x => x.tipo_vinculacion || x.tipo_nombramiento))].join('/');
  console.log(`- ${k}: ${v.length} plaza(s) [Tipo: ${tipos}] [IDs Plazas: ${v.map(x => x.id_plaza).join(', ')}]`);
}

console.log('\n==================================================');
console.log('--- REVISIÓN DE REGISTROS SIMO OFERTADOS Y PROVISTOS (18 + 7 = 25) ---');
const simoOfertadosYProvistos = simoData.filter(s => s.estadoProvision !== 'Disponible');
console.log('Total Ofertados y Provistos en SIMO:', simoOfertadosYProvistos.length);

const simoOfertAgrupados = {};
simoOfertadosYProvistos.forEach(s => {
  const key = `${norm(s.denominacion)} | COD:${norm(s.codigo)} | GRADO:${norm(s.grado)}`;
  if (!simoOfertAgrupados[key]) simoOfertAgrupados[key] = [];
  simoOfertAgrupados[key].push(s);
});

for (const [k, v] of Object.entries(simoOfertAgrupados)) {
  console.log(`- ${k}: ${v.length} registro(s) [Estados: ${v.map(x => x.estadoProvision).join(', ')}] [OPECs: ${v.map(x => x.opec).join(', ')}]`);
}

console.log('\n--- INGRESOS 2026 EN PLANTA / CASOS ---');
// Ingresos en planta: fecha_ingreso_entidad en 2026 O casos2026 de vinculacion
const ingresos2026 = plantaData.filter(p => {
  const f = p.fecha_ingreso_entidad || '';
  return f.startsWith('2026');
});
console.log(`Plazas con fecha de ingreso en 2026 en planta: ${ingresos2026.length}`);

const ingresosAgrupados = {};
ingresos2026.forEach(p => {
  const key = `${norm(p.cargo)} | COD:${norm(p.codigo)} | GRADO:${norm(p.grado)}`;
  if (!ingresosAgrupados[key]) ingresosAgrupados[key] = [];
  ingresosAgrupados[key].push(p);
});

for (const [k, v] of Object.entries(ingresosAgrupados)) {
  const tipos = [...new Set(v.map(x => x.tipo_nombramiento || x.tipo_vinculacion))].join('/');
  console.log(`- ${k}: ${v.length} persona(s) [Tipo: ${tipos}] [Titulares: ${v.map(x => x.titular_nombre + ' (Plaza ' + x.id_plaza + ')').join(', ')}]`);
}
