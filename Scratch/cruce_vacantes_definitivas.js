const fs = require('fs');

const simoMatch = fs.readFileSync('frontend/lib/reporteSimoData.ts', 'utf8').match(/export const REPORTES_SIMO_4_0_DATA: RegistroSimoOpec\[\] = (\[[\s\S]*?\]);/);
const simoData = JSON.parse(simoMatch[1]);
const plantaData = JSON.parse(fs.readFileSync('frontend/lib/plantaMockData.json', 'utf8'));

const norm = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Solo vacantes definitivas en la planta
const vacantesDef = plantaData.filter(p => {
  const tit = norm(p.titular_nombre);
  const sit = norm(p.situacion_titular);
  const est = norm(p.estado_cargo);
  return tit.includes('VACANTE DEFINITIVA') || sit.includes('VACANTE DEFINITIVA') || est.includes('VACANTE');
});

console.log('Total Vacantes Definitivas en Planta:', vacantesDef.length);

const cruce = simoData.map(s => {
  const cod = norm(s.codigo);
  const grado = norm(s.grado);
  const depSimo = norm(s.dependencia);
  const opecSimo = String(s.opec).trim();

  // Filtrar entre vacantes definitivas por código y grado
  const porCodGrado = vacantesDef.filter(p => norm(p.codigo) === cod && norm(p.grado) === grado);

  // Filtrar por dependencia
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

  // Check matching de propósito
  const propSimo = norm(s.proposito);
  const scored = (porDep.length > 0 ? porDep : porCodGrado).map(p => {
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
    const opecMatch = String(p.opec || '').trim() === opecSimo;
    return { p, score, opecMatch };
  });

  return { s, porCodGrado, porDep, scored };
});

console.log('\n======================================================');
console.log('CRUCE DE SIMO DISPONIBLES (26) vs VACANTES DEFINITIVAS');
console.log('======================================================');

let dispExactos = 0;
let dispDudas = 0;
let dispSinMatch = 0;

const asignaciones = [];

cruce.filter(c => c.s.estadoProvision === 'Disponible').forEach(c => {
  const s = c.s;
  if (c.scored.length === 1) {
    dispExactos++;
    console.log(`[MATCH EXACTO] SIMO #${s.id} [OPEC ${s.opec} | ${s.codigo}-${s.grado} ${s.denominacion}] -> Plaza #${c.scored[0].p.id_plaza} (${c.scored[0].p.dependencia_cargo}) [Encargo: ${c.scored[0].p.encargo_nombre || 'Sin encargo'}]`);
    asignaciones.push({ simoId: s.id, opec: s.opec, estado: s.estadoProvision, plazaId: c.scored[0].p.id_plaza });
  } else if (c.scored.length > 1) {
    const exactos = c.scored.filter(x => x.score >= 0.95);
    if (exactos.length === 1) {
      dispExactos++;
      console.log(`[MATCH EXACTO POR PROPÓSITO] SIMO #${s.id} [OPEC ${s.opec} | ${s.codigo}-${s.grado} ${s.denominacion}] -> Plaza #${exactos[0].p.id_plaza} (${exactos[0].p.dependencia_cargo}) [Encargo: ${exactos[0].p.encargo_nombre || 'Sin encargo'}]`);
      asignaciones.push({ simoId: s.id, opec: s.opec, estado: s.estadoProvision, plazaId: exactos[0].p.id_plaza });
    } else {
      dispDudas++;
      console.log(`[DUDA] SIMO #${s.id} [OPEC ${s.opec} | ${s.codigo}-${s.grado} ${s.denominacion}] en ${s.dependencia}:`);
      c.scored.forEach(x => {
        console.log(`     - Plaza #${x.p.id_plaza} (${x.p.dependencia_cargo}) [Encargo: ${x.p.encargo_nombre || 'Sin encargo'}] [Score: ${x.score}]`);
      });
    }
  } else {
    dispSinMatch++;
    console.log(`[SIN MATCH] SIMO #${s.id} [OPEC ${s.opec} | ${s.codigo}-${s.grado} ${s.denominacion}] en ${s.dependencia}`);
  }
});

console.log('\n--- RESUMEN DISPONIBLES ---');
console.log({ dispExactos, dispDudas, dispSinMatch });

console.log('\n======================================================');
console.log('CRUCE DE SIMO OFERTADOS Y PROVISTOS (25) vs VACANTES DEFINITIVAS');
console.log('======================================================');

let ofertExactos = 0;
let ofertDudas = 0;
let ofertSinMatch = 0;

cruce.filter(c => c.s.estadoProvision !== 'Disponible').forEach(c => {
  const s = c.s;
  // Verificar si la plaza ya fue asignada a una disponible
  const plazasLibres = c.scored.filter(x => !asignaciones.some(a => a.plazaId === x.p.id_plaza));
  // O si tiene match exacto por opec ya registrada en la plaza
  const opecMatch = c.scored.filter(x => String(x.p.opec).trim() === String(s.opec).trim());

  if (opecMatch.length === 1) {
    ofertExactos++;
    console.log(`[OPEC MATCH EN VACANTE] SIMO #${s.id} [OPEC ${s.opec} | ${s.codigo}-${s.grado} ${s.denominacion} | ${s.estadoProvision}] -> Plaza #${opecMatch[0].p.id_plaza} (${opecMatch[0].p.dependencia_cargo}) [Encargo: ${opecMatch[0].p.encargo_nombre || 'Sin encargo'}]`);
    asignaciones.push({ simoId: s.id, opec: s.opec, estado: s.estadoProvision, plazaId: opecMatch[0].p.id_plaza });
  } else if (plazasLibres.length === 1) {
    ofertExactos++;
    console.log(`[ÚNICA VACANTE RESTANTE] SIMO #${s.id} [OPEC ${s.opec} | ${s.codigo}-${s.grado} ${s.denominacion} | ${s.estadoProvision}] -> Plaza #${plazasLibres[0].p.id_plaza} (${plazasLibres[0].p.dependencia_cargo}) [Encargo: ${plazasLibres[0].p.encargo_nombre || 'Sin encargo'}]`);
    asignaciones.push({ simoId: s.id, opec: s.opec, estado: s.estadoProvision, plazaId: plazasLibres[0].p.id_plaza });
  } else if (plazasLibres.length > 1) {
    ofertDudas++;
    console.log(`[DUDA EN VACANTES RESTANTES] SIMO #${s.id} [OPEC ${s.opec} | ${s.codigo}-${s.grado} ${s.denominacion} | ${s.estadoProvision}] en ${s.dependencia}:`);
    plazasLibres.forEach(x => {
      console.log(`     - Plaza #${x.p.id_plaza} (${x.p.dependencia_cargo}) [Encargo: ${x.p.encargo_nombre || 'Sin encargo'}] [OPEC Actual: ${x.p.opec || 'N/A'}]`);
    });
  } else {
    ofertSinMatch++;
    console.log(`[NO HAY VACANTE DEFINITIVA LIBRE] SIMO #${s.id} [OPEC ${s.opec} | ${s.codigo}-${s.grado} ${s.denominacion} | ${s.estadoProvision}] en ${s.dependencia}`);
  }
});

console.log('\n--- RESUMEN OFERTADOS Y PROVISTOS ---');
console.log({ ofertExactos, ofertDudas, ofertSinMatch });

// Guardar asignaciones
fs.writeFileSync('Scratch/resultado_cruce_vacantes.json', JSON.stringify({ asignaciones }, null, 2));
