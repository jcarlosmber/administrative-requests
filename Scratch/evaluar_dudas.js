const fs = require('fs');

const simoMatch = fs.readFileSync('frontend/lib/reporteSimoData.ts', 'utf8').match(/export const REPORTES_SIMO_4_0_DATA: RegistroSimoOpec\[\] = (\[[\s\S]*?\]);/);
const simoData = JSON.parse(simoMatch[1]);
const plantaData = JSON.parse(fs.readFileSync('frontend/lib/plantaMockData.json', 'utf8'));

const norm = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const evaluacion = simoData.map(s => {
  const cod = norm(s.codigo);
  const grado = norm(s.grado);
  const depSimo = norm(s.dependencia);
  const opecSimo = String(s.opec).trim();
  const propSimo = norm(s.proposito);
  const esDisp = s.estadoProvision === 'Disponible';

  // 1. Match directo por OPEC
  const porOpec = plantaData.filter(p => String(p.opec || '').trim() === opecSimo);

  // 2. Plazas por código y grado
  const porCodGrado = plantaData.filter(p => norm(p.codigo) === cod && norm(p.grado) === grado);

  // 3. Plazas filtradas por dependencia
  const porDep = porCodGrado.filter(p => {
    const depP = norm(p.dependencia_cargo);
    return depP.includes(depSimo) || depSimo.includes(depP) ||
      (depP.includes('GESTION JUDICIAL') && depSimo.includes('GESTION JUDICIAL')) ||
      (depP.includes('DISCIPLINARIOS') && depSimo.includes('DISCIPLINARIOS')) ||
      (depP.includes('POLITICA') && depSimo.includes('POLITICA')) ||
      (depP.includes('CORPORATIVA') && depSimo.includes('CORPORATIVA')) ||
      (depP.includes('PLANEACION') && depSimo.includes('PLANEACION')) ||
      (depP.includes('TECNOLOGIAS') && depSimo.includes('TECNOLOGIAS')) ||
      (depP.includes('CONTROL INTERNO') && depSimo.includes('CONTROL INTERNO')) ||
      (depP.includes('DOCTRINA') && depSimo.includes('DOCTRINA')) ||
      (depP.includes('DEFENSA') && depSimo.includes('DEFENSA')) ||
      (depP.includes('DESPACHO') && depSimo.includes('DESPACHO'));
  });

  const pool = porDep.length > 0 ? porDep : porCodGrado;

  // Evaluar score propósito
  const scored = pool.map(p => {
    const propP = norm(p.proposito);
    let score = 0;
    if (propSimo && propP) {
      if (propSimo === propP) score = 1.0;
      else {
        const wordsS = propSimo.split(' ').filter(w => w.length > 4);
        const matches = wordsS.filter(w => propP.includes(w));
        score = wordsS.length > 0 ? (matches.length / wordsS.length) : 0;
      }
    }
    const esVacante = norm(p.titular_nombre).includes('VACANTE') || norm(p.situacion_titular).includes('VACANTE');
    const esIngreso2026 = (p.fecha_ingreso_entidad || '').startsWith('2026');
    return { p, score, esVacante, esIngreso2026 };
  });

  return {
    s,
    porOpec,
    porCodGrado,
    porDep,
    scored
  };
});

const seguras = [];
const conDudas = [];

evaluacion.forEach(item => {
  const { s, porOpec, porCodGrado, porDep, scored } = item;
  const esDisp = s.estadoProvision === 'Disponible';

  // Si ya tiene OPEC exacta en 1 sola plaza
  if (porOpec.length === 1) {
    seguras.push({ s, match: porOpec[0], motivo: 'OPEC exacta ya registrada en la plaza #' + porOpec[0].id_plaza });
    return;
  }

  // Si solo hay 1 plaza en toda la planta con ese código y grado
  if (porCodGrado.length === 1) {
    seguras.push({ s, match: porCodGrado[0], motivo: 'Única plaza en la entidad con este código y grado (Plaza #' + porCodGrado[0].id_plaza + ')' });
    return;
  }

  // Si en la dependencia solo hay 1 plaza
  if (porDep.length === 1) {
    seguras.push({ s, match: porDep[0], motivo: 'Única plaza con este cargo en la dependencia (Plaza #' + porDep[0].id_plaza + ')' });
    return;
  }

  // Si es DISPONIBLE y en la dependencia hay exactamente 1 plaza con VACANTE DEFINITIVA
  if (esDisp) {
    const vacantesEnDep = scored.filter(x => x.esVacante);
    if (vacantesEnDep.length === 1) {
      seguras.push({ s, match: vacantesEnDep[0].p, motivo: 'Única plaza VACANTE DEFINITIVA en la dependencia (Plaza #' + vacantesEnDep[0].p.id_plaza + ')' });
      return;
    }
  }

  // Si no es DISPONIBLE (Ofertado / Provisto) y hay exactamente 1 ingreso 2026 en la dependencia
  if (!esDisp) {
    const ing2026 = scored.filter(x => x.esIngreso2026);
    if (ing2026.length === 1) {
      seguras.push({ s, match: ing2026[0].p, motivo: 'Único ingreso de personal 2026 en la dependencia (Plaza #' + ing2026[0].p.id_plaza + ')' });
      return;
    }
  }

  // Si hay diferencia contundente en el propósito
  const conMaxProp = scored.filter(x => x.score > 0.85);
  const otrosBajoProp = scored.filter(x => x.score < 0.4);
  if (conMaxProp.length === 1 && otrosBajoProp.length > 0) {
    seguras.push({ s, match: conMaxProp[0].p, motivo: 'Coincidencia exacta de propósito del manual de funciones (' + (conMaxProp[0].score*100).toFixed(0) + '%) - Plaza #' + conMaxProp[0].p.id_plaza });
    return;
  }

  // Caso con duda
  conDudas.push({
    s,
    candidatas: scored
  });
});

console.log('SEGURAS / IDENTIFICADAS:', seguras.length);
console.log('CON DUDA / MÚLTIPLES PLAZAS:', conDudas.length);
console.log('\n=============================================');
console.log('LISTADO DE EMPAREJAMIENTOS CLAROS (' + seguras.length + '):');
console.log('=============================================');
seguras.forEach(x => {
  console.log(`SIMO #${x.s.id} [OPEC ${x.s.opec} | ${x.s.codigo}-${x.s.grado} ${x.s.denominacion}] -> Plaza #${x.match.id_plaza} (${x.match.dependencia_cargo}) [${x.motivo}]`);
});

console.log('\n=============================================');
console.log('DETALLE DE CASOS CON DUDA (' + conDudas.length + '):');
console.log('=============================================');
conDudas.forEach(cd => {
  const s = cd.s;
  console.log(`\nSIMO #${s.id} | OPEC: ${s.opec} | Cargo: ${s.codigo}-${s.grado} ${s.denominacion}`);
  console.log(`  Estado: ${s.estadoProvision} | Dependencia SIMO: ${s.dependencia}`);
  console.log(`  Propósito: ${s.proposito ? s.proposito.substring(0, 80) + '...' : 'N/A'}`);
  console.log('  Plazas candidatas:');
  cd.candidatas.forEach(c => {
    console.log(`    - Plaza #${c.p.id_plaza}: Dep: ${c.p.dependencia_cargo} | Titular: ${c.p.titular_nombre} (${c.p.situacion_titular}) | Encargo: ${c.p.encargo_nombre || 'N/A'} | OpecActual: ${c.p.opec || 'N/A'} | Vacante: ${c.esVacante} | ScoreProp: ${c.score.toFixed(2)}`);
  });
});
