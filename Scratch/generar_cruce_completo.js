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

const norm = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function depMatches(d1, d2) {
  const n1 = norm(d1);
  const n2 = norm(d2);
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  const words = ['PLANEACION', 'DISCIPLINARIOS', 'POLITICA JURIDICA', 'CORPORATIVA', 'TECNOLOGIAS', 'CONTROL INTERNO', 'GESTION JUDICIAL', 'DOCTRINA', 'VIGILANCIA', 'DESPACHO'];
  for (const w of words) {
    if (n1.includes(w) && n2.includes(w)) return true;
  }
  return false;
}

// Vacantes definitivas en planta
const vacantesDefPlanta = plantaData.filter(p => {
  const tit = norm(p.titular_nombre);
  const sit = norm(p.situacion_titular);
  const est = norm(p.estado_cargo);
  return tit.includes('VACANTE DEFINITIVA') || sit.includes('VACANTE DEFINITIVA') || est.includes('VACANTE');
});

// Ingresos 2026
const ingresosPlanta2026 = plantaData.filter(p => (p.fecha_ingreso_entidad || '').startsWith('2026'));
const vincCasos = casos2026.filter(c => c.tipo_proceso === 'VINCULACION');

const resultado = {
  disponibles: [],
  ofertados_provistos: []
};

// 1. DISPONIBLES (26)
simoData.filter(s => s.estadoProvision === 'Disponible').forEach(s => {
  const candCodGrado = vacantesDefPlanta.filter(p => norm(p.codigo) === norm(s.codigo) && norm(p.grado) === norm(s.grado));
  const candDep = candCodGrado.filter(p => depMatches(p.dependencia_cargo, s.dependencia));

  resultado.disponibles.push({
    simoId: s.id,
    opec: s.opec,
    idCargo: s.idCargo,
    cargo: s.denominacion,
    codigo: s.codigo,
    grado: s.grado,
    dependenciaSimo: s.dependencia,
    estadoProvision: s.estadoProvision,
    coincidenciaExactaDep: candDep.length === 1 ? {
      id_plaza: candDep[0].id_plaza,
      cargo: candDep[0].cargo,
      dependencia: candDep[0].dependencia_cargo,
      tipo_vinculacion: candDep[0].tipo_vinculacion,
      encargo_nombre: candDep[0].encargo_nombre
    } : null,
    candidatasDep: candDep.map(p => ({
      id_plaza: p.id_plaza,
      cargo: p.cargo,
      dependencia: p.dependencia_cargo,
      tipo_vinculacion: p.tipo_vinculacion,
      encargo_nombre: p.encargo_nombre
    })),
    otrasCandidatasMismoCodGrado: candCodGrado.filter(p => !candDep.some(cd => cd.id_plaza === p.id_plaza)).map(p => ({
      id_plaza: p.id_plaza,
      dependencia: p.dependencia_cargo
    }))
  });
});

// 2. OFERTADOS Y PROVISTOS (25)
simoData.filter(s => s.estadoProvision !== 'Disponible').forEach(s => {
  const candPlanta = ingresosPlanta2026.filter(p => norm(p.codigo) === norm(s.codigo) && norm(p.grado) === norm(s.grado));
  const candPlantaDep = candPlanta.filter(p => depMatches(p.dependencia_cargo, s.dependencia));

  const candCasos = vincCasos.filter(c => norm(c.codigo) === norm(s.codigo) && norm(c.grado) === norm(s.grado));
  const candCasosDep = candCasos.filter(c => depMatches(c.dependencia, s.dependencia));

  resultado.ofertados_provistos.push({
    simoId: s.id,
    opec: s.opec,
    idCargo: s.idCargo,
    cargo: s.denominacion,
    codigo: s.codigo,
    grado: s.grado,
    dependenciaSimo: s.dependencia,
    estadoProvision: s.estadoProvision,
    candidatasPlantaDep: candPlantaDep.map(p => ({
      id_plaza: p.id_plaza,
      titular: p.titular_nombre,
      dependencia: p.dependencia_cargo,
      tipo_nombramiento: p.tipo_nombramiento,
      fecha_ingreso: p.fecha_ingreso_entidad
    })),
    candidatasCasosDep: candCasosDep.map(c => ({
      idCaso: c.id,
      id_plaza: c.id_plaza,
      servidor: c.servidor_nombre,
      dependencia: c.dependencia,
      modalidad: c.modalidad
    })),
    otrasPlantaMismoCodGrado: candPlanta.filter(p => !candPlantaDep.some(cd => cd.id_plaza === p.id_plaza)).map(p => ({
      id_plaza: p.id_plaza,
      titular: p.titular_nombre,
      dependencia: p.dependencia_cargo
    }))
  });
});

fs.writeFileSync('Scratch/resultado_cruce_completo.json', JSON.stringify(resultado, null, 2), 'utf8');
console.log('Cruce completo guardado en Scratch/resultado_cruce_completo.json');
