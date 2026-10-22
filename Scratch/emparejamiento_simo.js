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

function norm(str) {
  if (!str) return '';
  return str.toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// SIMO DISPONIBLES (26)
const simoDisponibles = simoData.filter(s => s.estadoProvision === 'Disponible');

// Vacantes definitivas en planta
const vacantesDefPlanta = plantaData.filter(p => {
  const tit = norm(p.titular_nombre);
  const sit = norm(p.situacion_titular);
  const est = norm(p.estado_cargo);
  return tit.includes('VACANTE DEFINITIVA') || sit.includes('VACANTE DEFINITIVA') || est.includes('VACANTE');
});

console.log('========================================================================');
console.log('CRUCE 1: SIMO DISPONIBLES (26) vs VACANTES DEFINITIVAS EN PLANTA');
console.log('========================================================================');

const matchesDisponibles = [];
const simoDispSinMatch = [];

simoDisponibles.forEach(s => {
  const codSimo = norm(s.codigo);
  const gradoSimo = norm(s.grado);
  const depSimo = norm(s.dependencia);
  const cargoSimo = norm(s.denominacion);

  // Buscar en vacantesDefPlanta por código y grado
  const candidatas = vacantesDefPlanta.filter(p => {
    return norm(p.codigo) === codSimo && norm(p.grado) === gradoSimo;
  });

  matchesDisponibles.push({
    simo: {
      id: s.id,
      opec: s.opec,
      idCargo: s.idCargo,
      cargo: s.denominacion,
      codigo: s.codigo,
      grado: s.grado,
      dependencia: s.dependencia,
      proposito: s.proposito
    },
    candidatasPlazas: candidatas.map(p => ({
      id_plaza: p.id_plaza,
      cargo: p.cargo,
      codigo: p.codigo,
      grado: p.grado,
      dependencia_cargo: p.dependencia_cargo,
      tipo_vinculacion: p.tipo_vinculacion,
      titular_nombre: p.titular_nombre,
      encargo_nombre: p.encargo_nombre,
      proposito: p.proposito
    }))
  });
});

matchesDisponibles.forEach(m => {
  const s = m.simo;
  console.log(`\nSIMO ID ${s.id} | OPEC ${s.opec} | idCargo ${s.idCargo} | ${s.codigo}-${s.grado} ${s.cargo}`);
  console.log(`  Dep SIMO: ${s.dependencia}`);
  if (m.candidatasPlazas.length === 0) {
    console.log(`  >>> SIN COINCIDENCIA DIRECTA DE COD/GRADO EN VACANTES DEFINITIVAS <<<`);
  } else if (m.candidatasPlazas.length === 1) {
    const p = m.candidatasPlazas[0];
    console.log(`  ===> COINCIDENCIA ÚNICA: Plaza ${p.id_plaza} (${p.dependencia_cargo}) - ${p.tipo_vinculacion} ${p.encargo_nombre ? '[Encargo: ' + p.encargo_nombre + ']' : ''}`);
  } else {
    console.log(`  <?> MÚLTIPLES COINCIDENCIAS (${m.candidatasPlazas.length} plazas):`);
    m.candidatasPlazas.forEach(p => {
      const matchDep = norm(p.dependencia_cargo).includes(norm(s.dependencia)) || norm(s.dependencia).includes(norm(p.dependencia_cargo));
      console.log(`     - Plaza ${p.id_plaza}: Dep: ${p.dependencia_cargo} [Match Dep: ${matchDep}] | Tipo: ${p.tipo_vinculacion} ${p.encargo_nombre ? '[Encargo: ' + p.encargo_nombre + ']' : ''}`);
    });
  }
});

console.log('\n\n========================================================================');
console.log('CRUCE 2: SIMO OFERTADOS Y PROVISTOS (25) vs INGRESOS 2026');
console.log('========================================================================');

const simoOfertadosYProvistos = simoData.filter(s => s.estadoProvision !== 'Disponible');

// Ingresos en planta: fecha_ingreso_entidad 2026 O vinculaciones en casos2026
const ingresosPlanta2026 = plantaData.filter(p => {
  const f = p.fecha_ingreso_entidad || '';
  return f.startsWith('2026');
});

const matchesOfertados = [];

simoOfertadosYProvistos.forEach(s => {
  const codSimo = norm(s.codigo);
  const gradoSimo = norm(s.grado);
  const depSimo = norm(s.dependencia);

  // Buscar en ingresosPlanta2026 por código y grado
  const candidatas = ingresosPlanta2026.filter(p => {
    return norm(p.codigo) === codSimo && norm(p.grado) === gradoSimo;
  });

  // También buscar en casos2026
  const casosCand = casos2026.filter(c => {
    return c.tipo_proceso === 'VINCULACION' && norm(c.codigo) === codSimo && norm(c.grado) === gradoSimo;
  });

  matchesOfertados.push({
    simo: {
      id: s.id,
      opec: s.opec,
      idCargo: s.idCargo,
      cargo: s.denominacion,
      codigo: s.codigo,
      grado: s.grado,
      estadoProvision: s.estadoProvision,
      dependencia: s.dependencia
    },
    candidatasPlazas: candidatas.map(p => ({
      id_plaza: p.id_plaza,
      cargo: p.cargo,
      codigo: p.codigo,
      grado: p.grado,
      dependencia_cargo: p.dependencia_cargo,
      titular_nombre: p.titular_nombre,
      tipo_nombramiento: p.tipo_nombramiento,
      fecha_ingreso_entidad: p.fecha_ingreso_entidad
    })),
    casosCand: casosCand.map(c => ({
      id: c.id,
      id_plaza: c.id_plaza,
      servidor_nombre: c.servidor_nombre,
      cargo: c.cargo,
      dependencia: c.dependencia,
      modalidad: c.modalidad
    }))
  });
});

matchesOfertados.forEach(m => {
  const s = m.simo;
  console.log(`\nSIMO ID ${s.id} | OPEC ${s.opec} | idCargo ${s.idCargo} | ${s.codigo}-${s.grado} ${s.cargo} | ${s.estadoProvision}`);
  console.log(`  Dep SIMO: ${s.dependencia}`);
  if (m.candidatasPlazas.length === 0) {
    console.log(`  >>> SIN COINCIDENCIA DIRECTA EN INGRESOS PLANTA 2026 <<<`);
    if (m.casosCand.length > 0) {
      console.log(`  (Pero en Casos 2026 hay: ${m.casosCand.map(c => c.servidor_nombre + ' Plaza ' + c.id_plaza).join(', ')})`);
    }
  } else if (m.candidatasPlazas.length === 1) {
    const p = m.candidatasPlazas[0];
    console.log(`  ===> COINCIDENCIA ÚNICA: Plaza ${p.id_plaza} - ${p.titular_nombre} (${p.dependencia_cargo}) [${p.tipo_nombramiento}]`);
  } else {
    console.log(`  <?> MÚLTIPLES COINCIDENCIAS (${m.candidatasPlazas.length} ingresos):`);
    m.candidatasPlazas.forEach(p => {
      const matchDep = norm(p.dependencia_cargo).includes(norm(s.dependencia)) || norm(s.dependencia).includes(norm(p.dependencia_cargo));
      console.log(`     - Plaza ${p.id_plaza}: ${p.titular_nombre} | Dep: ${p.dependencia_cargo} [Match Dep: ${matchDep}]`);
    });
  }
});
