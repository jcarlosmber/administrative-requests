const fs = require('fs');

const simoContent = fs.readFileSync('frontend/lib/reporteSimoData.ts', 'utf8');
const simoMatch = simoContent.match(/export const REPORTES_SIMO_4_0_DATA: RegistroSimoOpec\[\] = (\[[\s\S]*?\]);/);
const simoData = JSON.parse(simoMatch[1]);
const plantaData = JSON.parse(fs.readFileSync('frontend/lib/plantaMockData.json', 'utf8'));

const norm = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

console.log('Total SIMO:', simoData.length);
console.log('Total Planta:', plantaData.length);

// 1. Ver cuántas plazas en planta ya tienen OPEC
const plazasConOpec = plantaData.filter(p => p.opec && String(p.opec).trim() !== '');
console.log('\n--- Plazas en planta que ya tienen OPEC (' + plazasConOpec.length + ') ---');
plazasConOpec.forEach(p => {
  const sMatch = simoData.filter(s => String(s.opec) === String(p.opec));
  console.log(`Plaza #${p.id_plaza} [${p.codigo}-${p.grado} ${p.cargo}] -> OPEC: ${p.opec} | Matches en SIMO: ${sMatch.length} (IDs: ${sMatch.map(x => x.id).join(', ')})`);
});

// 2. Analizar cada uno de los 51 registros de SIMO
const analisis = simoData.map(s => {
  const cod = norm(s.codigo);
  const grado = norm(s.grado);
  const cargoSimo = norm(s.denominacion);
  const depSimo = norm(s.dependencia);
  const opecSimo = String(s.opec).trim();

  // Buscar por OPEC exacta primero
  const porOpec = plantaData.filter(p => String(p.opec || '').trim() === opecSimo);

  // Buscar por codigo y grado
  const porCodGrado = plantaData.filter(p => norm(p.codigo) === cod && norm(p.grado) === grado);

  // De los de cod y grado, buscar coincidencia en dependencia
  const porCodGradoDep = porCodGrado.filter(p => {
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

  // También comparar similitud de propósito si existe
  const propSimo = norm(s.proposito);
  const conSimilitudProp = porCodGrado.map(p => {
    const propP = norm(p.proposito);
    let matchScore = 0;
    if (propSimo && propP) {
      const wordsSimo = propSimo.split(' ').filter(w => w.length > 4);
      const matches = wordsSimo.filter(w => propP.includes(w));
      matchScore = wordsSimo.length > 0 ? (matches.length / wordsSimo.length) : 0;
    }
    return {
      plaza: p,
      matchScore
    };
  }).sort((a,b) => b.matchScore - a.matchScore);

  return {
    simo: s,
    porOpec,
    porCodGrado,
    porCodGradoDep,
    mejorProp: conSimilitudProp[0]
  };
});

let exactos = 0;
let conDuda = 0;
let sinMatch = 0;

console.log('\n======================================================');
console.log('DETALLE DE CRUCE DE LOS 51 REGISTROS SIMO CON CARGOS/PLAZAS');
console.log('======================================================');

analisis.forEach((a, i) => {
  const s = a.simo;
  console.log(`\n[#${s.id}] OPEC: ${s.opec} | ${s.codigo}-${s.grado} ${s.denominacion} | Estado: ${s.estadoProvision}`);
  console.log(`     Dep SIMO: ${s.dependencia}`);
  console.log(`     Propósito: ${s.proposito ? s.proposito.substring(0, 70) + '...' : 'N/A'}`);

  if (a.porOpec.length === 1) {
    const p = a.porOpec[0];
    console.log(`     ✅ VINCULADO POR OPEC EXACTA: Plaza #${p.id_plaza} (${p.dependencia_cargo}) - Titular: ${p.titular_nombre}`);
    exactos++;
  } else if (a.porOpec.length > 1) {
    console.log(`     ⚠️ MÚLTIPLES PLAZAS CON MISMA OPEC (${a.porOpec.length}): Plazas ${a.porOpec.map(p => p.id_plaza).join(', ')}`);
    conDuda++;
  } else {
    // No tiene OPEC en planta
    if (a.porCodGradoDep.length === 1) {
      const p = a.porCodGradoDep[0];
      console.log(`     🎯 COINCIDENCIA ÚNICA POR COD/GRADO/DEP: Plaza #${p.id_plaza} (${p.dependencia_cargo}) [Titular: ${p.titular_nombre}] [Opec actual: "${p.opec || ''}"]`);
      exactos++;
    } else if (a.porCodGradoDep.length > 1) {
      console.log(`     ❓ DUDA: Múltiples plazas en la MISMA dependencia (${a.porCodGradoDep.length} plazas):`);
      a.porCodGradoDep.forEach(p => {
        console.log(`        - Plaza #${p.id_plaza}: Titular: ${p.titular_nombre} | Opec actual: "${p.opec || ''}" | Situación: ${p.situacion_titular} | Encargo: ${p.encargo_nombre || 'N/A'}`);
      });
      conDuda++;
    } else if (a.porCodGrado.length === 1) {
      const p = a.porCodGrado[0];
      console.log(`     📍 COINCIDENCIA ÚNICA POR COD/GRADO (dep difiere ligeramente): Plaza #${p.id_plaza} (${p.dependencia_cargo}) [Titular: ${p.titular_nombre}]`);
      exactos++;
    } else if (a.porCodGrado.length > 1) {
      console.log(`     ❓ DUDA: Múltiples plazas con este Cod/Grado (${a.porCodGrado.length} plazas en varias dependencias):`);
      a.porCodGrado.forEach(p => {
        console.log(`        - Plaza #${p.id_plaza}: Dep: ${p.dependencia_cargo} | Titular: ${p.titular_nombre} | Opec actual: "${p.opec || ''}"`);
      });
      conDuda++;
    } else {
      console.log(`     ❌ SIN COINCIDENCIA de Código y Grado en planta`);
      sinMatch++;
    }
  }
});

console.log('\n======================================================');
console.log(`RESUMEN: Exactos: ${exactos} | Con duda / múltiples: ${conDuda} | Sin match: ${sinMatch}`);
