const fs = require('fs');
const path = require('path');

// Cargar reporteSimoData
const simoContent = fs.readFileSync('frontend/lib/reporteSimoData.ts', 'utf8');
// Extraer el JSON array
const simoMatch = simoContent.match(/export const REPORTES_SIMO_4_0_DATA: RegistroSimoOpec\[\] = (\[[\s\S]*?\]);/);
if (!simoMatch) {
  console.error("No se pudo extraer REPORTES_SIMO_4_0_DATA");
  process.exit(1);
}
const simoData = JSON.parse(simoMatch[1]);

// Cargar plantaMockData
const plantaData = JSON.parse(fs.readFileSync('frontend/lib/plantaMockData.json', 'utf8'));

// Cargar casos2026Data si existe
let casos2026 = [];
try {
  const casosContent = fs.readFileSync('frontend/lib/casos2026Data.ts', 'utf8');
  const casosMatch = casosContent.match(/export const CASOS_2026_RAW: Caso2026Raw\[\] = (\[[\s\S]*?\]);/);
  if (casosMatch) casos2026 = JSON.parse(casosMatch[1]);
} catch (e) {
  console.log("No casos 2026", e.message);
}

console.log(`=== SIMO 4.0 ===`);
console.log(`Total registros SIMO: ${simoData.length}`);

const simoPorEstado = {};
simoData.forEach(s => {
  simoPorEstado[s.estadoProvision] = (simoPorEstado[s.estadoProvision] || 0) + 1;
});
console.log('Estados de provisión en SIMO:', simoPorEstado);

console.log('\n=== PLANTA DE PERSONAL ===');
console.log(`Total plazas en planta: ${plantaData.length}`);

// Ver vacantes definitivas en planta
const vacantesDefinitivas = plantaData.filter(p => {
  const tit = (p.titular_nombre || '').toUpperCase();
  const sit = (p.situacion_titular || '').toUpperCase();
  const est = (p.estado_cargo || '').toUpperCase();
  return tit.includes('VACANTE DEFINITIVA') || sit.includes('VACANTE DEFINITIVA') || est.includes('VACANTE');
});
console.log(`Plazas con vacante definitiva en planta: ${vacantesDefinitivas.length}`);

// Ver ingresos 2026 en planta y en casos2026
const ingresosCasos = casos2026.filter(c => c.tipo_proceso === 'VINCULACION');
console.log(`Casos de vinculación 2026: ${ingresosCasos.length}`);

const ingresosPlanta2026 = plantaData.filter(p => {
  const f = p.fecha_ingreso_entidad || '';
  return f.startsWith('2026');
});
console.log(`Plazas con fecha_ingreso_entidad en 2026: ${ingresosPlanta2026.length}`);

// Guardar un reporte detallado
const out = {
  simoResumen: {
    total: simoData.length,
    porEstado: simoPorEstado
  },
  simoRegistros: simoData.map(s => ({
    id: s.id,
    opec: s.opec,
    idCargo: s.idCargo,
    idUnico: s.idUnico,
    codigo: s.codigo,
    denominacion: s.denominacion,
    grado: s.grado,
    dependencia: s.dependencia,
    estadoProvision: s.estadoProvision,
    proposito: s.proposito ? s.proposito.substring(0, 80) + '...' : '',
    funciones: s.funciones ? s.funciones.substring(0, 80) + '...' : ''
  })),
  vacantesDefinitivas: vacantesDefinitivas.map(p => ({
    id_plaza: p.id_plaza,
    codigo: p.codigo,
    cargo: p.cargo,
    grado: p.grado,
    dependencia_cargo: p.dependencia_cargo,
    tipo_vinculacion: p.tipo_vinculacion,
    encargo_nombre: p.encargo_nombre,
    es_encargo: p.es_encargo,
    opec: p.opec
  })),
  ingresosCasos: ingresosCasos.map(c => ({
    id: c.id,
    id_plaza: c.id_plaza,
    servidor_nombre: c.servidor_nombre,
    cargo: c.cargo,
    codigo: c.codigo,
    grado: c.grado,
    dependencia: c.dependencia,
    modalidad: c.modalidad,
    subtipo_concurso: c.subtipo_concurso,
    fecha_efectiva: c.fecha_efectiva
  }))
};

fs.writeFileSync('Scratch/analisis_resumen.json', JSON.stringify(out, null, 2), 'utf8');
console.log('Resumen escrito en Scratch/analisis_resumen.json');
