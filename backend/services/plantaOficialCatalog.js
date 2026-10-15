const fs = require('fs');
const path = require('path');

let catalogoPlanta = null;

function cargarCatalogo() {
  if (catalogoPlanta) return catalogoPlanta;
  try {
    // Intentar leer desde backend/data o desde frontend/lib
    const rutas = [
      path.join(__dirname, '../data/plantaMockData.json'),
      path.join(__dirname, '../../frontend/lib/plantaMockData.json'),
      'c:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/frontend/lib/plantaMockData.json'
    ];

    for (const r of rutas) {
      if (fs.existsSync(r)) {
        const raw = fs.readFileSync(r, 'utf8');
        catalogoPlanta = JSON.parse(raw);
        break;
      }
    }
  } catch (err) {
    console.warn('[plantaOficialCatalog] Advertencia al cargar catálogo:', err.message);
    catalogoPlanta = [];
  }

  if (!catalogoPlanta) catalogoPlanta = [];
  return catalogoPlanta;
}

function normalizarTexto(txt) {
  if (!txt || typeof txt !== 'string') return '';
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Busca una plaza en el catálogo oficial de la planta SJD (170 plazas)
 */
function buscarPlantaOficial(criterios = {}) {
  const lista = cargarCatalogo();
  if (!lista || lista.length === 0) return null;

  const idSideap = criterios.id_sideap ? Number(criterios.id_sideap) : null;
  const idPlaza = criterios.id_plaza ? Number(criterios.id_plaza) : null;
  const idPerno = criterios.id_perno ? Number(criterios.id_perno) : null;
  const cod = criterios.codigo ? String(criterios.codigo).trim() : null;
  const grado = criterios.grado ? String(criterios.grado).trim() : null;
  const nomCargo = normalizarTexto(criterios.cargo || criterios.nombre || criterios.cargo_nombre);

  // 1. Coincidencia por id_sideap
  if (idSideap) {
    const m = lista.find(p => Number(p.id_sideap) === idSideap);
    if (m) return m;
  }

  // 2. Coincidencia por id_plaza
  if (idPlaza) {
    const m = lista.find(p => Number(p.id_plaza) === idPlaza);
    if (m) return m;
  }

  // 3. Coincidencia por id_perno
  if (idPerno) {
    const m = lista.find(p => Number(p.id_perno) === idPerno);
    if (m) return m;
  }

  // 4. Coincidencia por Código y Grado (Muy precisa en cargos distritales)
  if (cod && grado) {
    const m = lista.find(p => String(p.codigo).trim() === cod && String(p.grado).trim() === grado);
    if (m) return m;
  }

  // 5. Coincidencia por Nombre de Cargo
  if (nomCargo) {
    const m = lista.find(p => normalizarTexto(p.cargo) === nomCargo);
    if (m) return m;
  }

  return null;
}

/**
 * Convierte un número de meses a texto formal en letras y números si aplica
 */
function mesesEnLetras(m) {
  const mapa = {
    6: 'Seis (6) meses',
    12: 'Doce (12) meses',
    18: 'Dieciocho (18) meses',
    24: 'Veinticuatro (24) meses',
    30: 'Treinta (30) meses',
    36: 'Treinta y seis (36) meses',
    42: 'Cuarenta y dos (42) meses',
    48: 'Cuarenta y ocho (48) meses',
    54: 'Cincuenta y cuatro (54) meses',
    60: 'Sesenta (60) meses',
    64: 'Sesenta y cuatro (64) meses',
    72: 'Setenta y dos (72) meses',
    84: 'Ochenta y cuatro (84) meses'
  };
  return mapa[m] || `${m} meses`;
}

/**
 * Retorna de forma infalible la Redacción Oficial de los Requisitos de Experiencia
 */
function resolverRedaccionOficialExperiencia(cargo = {}, consolidado = {}, data = {}) {
  // 1. Buscar en el catálogo oficial de 170 plazas del Manual de Funciones SJD
  const plazaOficial = buscarPlantaOficial({
    id_sideap: cargo.id_sideap || data.id_sideap,
    id_plaza: cargo.id_plaza || cargo.id || data.id_plaza,
    id_perno: cargo.id_perno || data.id_perno,
    codigo: cargo.codigo || data.cargo_codigo,
    grado: cargo.grado || data.cargo_grado,
    cargo: cargo.nombre || cargo.cargo || data.cargo_nombre
  });

  if (plazaOficial && plazaOficial.requisitos_experiencia && plazaOficial.requisitos_experiencia.trim()) {
    return plazaOficial.requisitos_experiencia.trim();
  }

  // 2. Si viene explícitamente en cargo_evaluado o data y contiene redacción completa (más de 12 caracteres y no solo dígitos)
  const expDirecta = (cargo.requisitos_experiencia || consolidado.requisitos_experiencia || data.requisitos_experiencia || '').trim();
  if (expDirecta && isNaN(Number(expDirecta)) && expDirecta.length > 15) {
    return expDirecta;
  }

  // 3. Si en requisitos generales o formación viene la sección "Experiencia:"
  const reqGeneral = cargo.requisitos || cargo.requisitos_formacion || data.requisitos || '';
  if (reqGeneral.includes('Experiencia:')) {
    const partes = reqGeneral.split(/Experiencia:\s*/i);
    if (partes[1] && partes[1].trim()) {
      return partes[1].trim();
    }
  }

  // 4. Si la plaza oficial tiene requisitos consolidados con "Experiencia:"
  if (plazaOficial && plazaOficial.requisitos && plazaOficial.requisitos.includes('Experiencia:')) {
    const partes = plazaOficial.requisitos.split(/Experiencia:\s*/i);
    if (partes[1] && partes[1].trim()) {
      return partes[1].trim();
    }
  }

  // 5. Fallback con redacción legal oficial estructurada
  const reqMeses = Number(consolidado.requisito_minimo_meses) || Number(cargo.requisito_experiencia_meses) || 0;
  const tipoExp = String(cargo.tipo_experiencia_requerida || consolidado.tipo_experiencia_requerida || 'PROFESIONAL_RELACIONADA').toUpperCase();

  if (reqMeses === 0) {
    return 'No requiere experiencia previa.';
  }

  const tiempoTexto = mesesEnLetras(reqMeses);
  if (tipoExp === 'LABORAL') {
    return `${tiempoTexto} de experiencia laboral.`;
  } else if (tipoExp === 'PROFESIONAL') {
    return `${tiempoTexto} de experiencia profesional.`;
  } else {
    return `${tiempoTexto} de experiencia profesional relacionada con las funciones del cargo.`;
  }
}

/**
 * Retorna la redacción oficial de formación académica
 */
function resolverRedaccionOficialFormacion(cargo = {}, data = {}) {
  const plazaOficial = buscarPlantaOficial({
    id_sideap: cargo.id_sideap || data.id_sideap,
    id_plaza: cargo.id_plaza || cargo.id || data.id_plaza,
    id_perno: cargo.id_perno || data.id_perno,
    codigo: cargo.codigo || data.cargo_codigo,
    grado: cargo.grado || data.cargo_grado,
    cargo: cargo.nombre || cargo.cargo || data.cargo_nombre
  });

  if (plazaOficial && plazaOficial.requisitos_formacion && plazaOficial.requisitos_formacion.trim()) {
    return plazaOficial.requisitos_formacion.trim();
  }

  const formDirecta = (cargo.requisitos_formacion || cargo.requisitos || data.requisitos_formacion || '').trim();
  if (formDirecta) {
    if (formDirecta.includes('Experiencia:')) {
      const p = formDirecta.split(/Experiencia:\s*/i)[0].replace(/^Formación:\s*/i, '').trim();
      if (p) return p;
    }
    return formDirecta.replace(/^Formación:\s*/i, '').trim();
  }

  return 'No especificado.';
}

module.exports = {
  cargarCatalogo,
  buscarPlantaOficial,
  resolverRedaccionOficialExperiencia,
  resolverRedaccionOficialFormacion
};
