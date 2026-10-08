/**
 * Servicio de Integración con la API de SECOP II - Contratos Electrónicos
 * Portal: www.datos.gov.co / Dataset: jbjy-vk9h
 * Documentación Socrata: https://dev.socrata.com/foundry/www.datos.gov.co/jbjy-vk9h
 * 
 * Utilizado para verificación de inhabilidades, incompatibilidades (Art. 128 C.P.)
 * y constatación de contratos activos previos a la vinculación de servidores,
 * pasantes o judicantes en la Secretaría Jurídica Distrital.
 */

const SECOP_DATASET_URL = 'https://www.datos.gov.co/resource/jbjy-vk9h.json';

const KEY_ID = process.env.SECOP_API_KEY_ID || '';
const KEY_SECRET = process.env.SECOP_API_KEY_SECRET || '';

function getAuthHeader() {
  if (KEY_ID && KEY_SECRET) {
    const creds = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
    return `Basic ${creds}`;
  }
  return null;
}

// Estados que indican que un contrato se encuentra activo o en trámite en SECOP II
const ESTADOS_ACTIVOS = [
  'en ejecución',
  'aprobado',
  'modificado',
  'prorrogado',
  'suspendido',
  'en aprobación',
  'enviado proveedor',
  'borrador'
];

/**
 * Normaliza y clasifica los contratos obtenidos de SECOP II
 */
function analizarContratos(contratos = []) {
  const hoy = new Date();
  const activos = [];
  const historicos = [];

  for (const c of contratos) {
    const estadoNorm = (c.estado_contrato || '').trim().toLowerCase();
    
    // Verificar si la fecha de fin aún está vigente
    let vigentePorFecha = false;
    let diasRestantes = null;
    if (c.fecha_de_fin_del_contrato) {
      try {
        const fechaFin = new Date(c.fecha_de_fin_del_contrato);
        if (!isNaN(fechaFin.getTime())) {
          diasRestantes = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
          if (fechaFin >= hoy) {
            vigentePorFecha = true;
          }
        }
      } catch (e) {}
    }

    const esActivoPorEstado = ESTADOS_ACTIVOS.includes(estadoNorm);
    const esCerradoDefinitivo = estadoNorm === 'cerrado' || estadoNorm === 'terminado' || estadoNorm === 'cancelado';

    const esActivo = (esActivoPorEstado || vigentePorFecha) && !esCerradoDefinitivo;

    const valorTotal = parseFloat(c.valor_del_contrato || 0);
    const valorPagado = parseFloat(c.valor_pagado || 0);
    const valorPendiente = parseFloat(
      c.valor_pendiente_de_ejecucion || c.valor_pendiente_de_pago || Math.max(0, valorTotal - valorPagado)
    );
    const porcentajeEjecucion = valorTotal > 0 ? Math.min(100, Math.round((valorPagado / valorTotal) * 100)) : 0;

    const contratoItem = {
      idContrato: c.id_contrato || c.referencia_del_contrato || 'N/D',
      referencia: c.referencia_del_contrato || 'Sin referencia',
      procesoCompra: c.proceso_de_compra || '',
      entidad: c.nombre_entidad || 'Entidad no especificada',
      nitEntidad: c.nit_entidad || '',
      codigoEntidad: c.codigo_entidad || '',
      ordenEntidad: c.orden || 'Nacional / Territorial',
      departamento: c.departamento || '',
      ciudad: c.ciudad || '',
      proveedor: c.proveedor_adjudicado || c.nombre_representante_legal || '',
      documentoProveedor: c.documento_proveedor || c.identificaci_n_representante_legal || '',
      tipoDocumento: c.tipodocproveedor || 'CC',
      tipoContrato: c.tipo_de_contrato || 'Prestación de servicios',
      subtipoContrato: c.subtipo_de_contrato || '',
      modalidad: c.modalidad_de_contratacion || 'Contratación Directa',
      justificacionModalidad: c.justificacion_modalidad_de || '',
      objeto: c.objeto_del_contrato || c.descripcion_del_proceso || 'Sin objeto registrado',
      estado: c.estado_contrato || 'Desconocido',
      esActivo,
      fechaFirma: c.fecha_de_firma ? c.fecha_de_firma.split('T')[0] : null,
      fechaInicio: c.fecha_de_inicio_del_contrato ? c.fecha_de_inicio_del_contrato.split('T')[0] : null,
      fechaFin: c.fecha_de_fin_del_contrato ? c.fecha_de_fin_del_contrato.split('T')[0] : null,
      fechaLiquidacion: c.fecha_de_liquidacion ? c.fecha_de_liquidacion.split('T')[0] : null,
      diasRestantes,
      plazoEjecucion: c.plazo_de_ejec_del_contrato || c.duraci_n_del_contrato || '',
      duracion: c.duraci_n_del_contrato || '',
      valorTotal,
      valorPagado,
      valorPendiente,
      porcentajeEjecucion,
      saldoFavorEntidad: parseFloat(c.saldo_a_favor_de_la_entidad || 0),
      urlProceso: c.urlproceso?.url || (typeof c.urlproceso === 'string' ? c.urlproceso : null),
      supervisor: c.nombre_supervisor || null,
      ordenadorGasto: c.nombre_ordenador_del_gasto || null,
    };

    if (esActivo) {
      activos.push(contratoItem);
    } else {
      historicos.push(contratoItem);
    }
  }

  const tieneContratosActivos = activos.length > 0;
  const entidadesActivas = Array.from(new Set(activos.map(a => a.entidad)));
  const valorTotalActivo = activos.reduce((sum, a) => sum + (a.valorTotal || 0), 0);
  const valorPagadoActivo = activos.reduce((sum, a) => sum + (a.valorPagado || 0), 0);
  const valorPendienteActivo = activos.reduce((sum, a) => sum + (a.valorPendiente || 0), 0);
  const valorTotalHistorico = historicos.reduce((sum, h) => sum + (h.valorTotal || 0), 0);
  const porcentajeTotalPagado = valorTotalActivo > 0 ? Math.round((valorPagadoActivo / valorTotalActivo) * 100) : 0;

  let nivelRiesgo = 'SIN_RIESGO';
  let dictamen = 'No se registran contratos activos en SECOP II. Sin alerta de inhabilidad contractual preliminar.';

  if (tieneContratosActivos) {
    nivelRiesgo = 'ALERTA_CONTRATO_ACTIVO';
    dictamen = `¡ATENCIÓN! La persona registra ${activos.length} contrato(s) activo(s) o en ejecución en el Estado colombiano (Entidades: ${entidadesActivas.join(', ')}). De conformidad con el artículo 128 de la Constitución Política y las leyes 80 de 1993 y 1952 de 2019, un servidor público no puede desempeñar simultáneamente más de un empleo público ni recibir más de una asignación del tesoro público, salvo excepciones legales expresas. Verifique la cesión, suspensión o acta de terminación antes de formalizar la posesión.`;
  } else if (historicos.length > 0) {
    dictamen = `Registro verificado: Se encontraron ${historicos.length} contrato(s) históricos en SECOP II, todos cerrados o terminados formalmente. No se evidencian contratos en ejecución actualmente.`;
  }

  const resumenNormativo = {
    titulo: 'Fundamentación Constitucional y Legal Aplicable',
    articulos: [
      {
        norma: 'Artículo 128 de la Constitución Política de Colombia',
        descripcion: 'Nadie podrá desempeñar simultáneamente más de un empleo público ni recibir más de una asignación que provenga del tesoro público, o de empresas o instituciones estatales.'
      },
      {
        norma: 'Ley 80 de 1993, Art. 8 (Inhabilidades e Incompatibilidades)',
        descripcion: 'Prohíbe celebrar contratos o posesionarse en cargos públicos existiendo contratos estatales en vigor que generen conflicto de interés o concurrencia no exceptuada.'
      },
      {
        norma: 'Ley 1952 de 2019 / Ley 2094 de 2021 (Código General Disciplinario)',
        descripcion: 'Constituye falta gravísima desempeñar cargos o celebrar contratos públicos en situación de inhabilidad sobreviniente o doble percepción.'
      }
    ],
    orientacionTalentoHumano: tieneContratosActivos
      ? 'ACCIÓN PREVENTIVA OBLIGATORIA: Previo a formalizar la posesión, la Subdirección de Talento Humano debe requerir al aspirante la acreditación formal de la cesión, suspensión o acta de terminación bilateral y liquidación con paz y salvo suscrita con la entidad contratante.'
      : 'CONCEPTO FAVORABLE: No se registran contratos en ejecución en SECOP II. Continúe con la verificación ordinaria de antecedentes y requisitos.',
    accionRequerida: tieneContratosActivos
      ? 'Exigir Acta de Terminación Bilateral / Liquidación o Suspensión Formal aprobada por la entidad pública antes del acto de posesión.'
      : 'Apto para posesión en materia de contratación estatal preliminar.'
  };

  const resumenFinanciero = {
    valorTotalActivo,
    valorPagadoActivo,
    valorPendienteActivo,
    valorTotalHistorico,
    porcentajeTotalPagado
  };

  return {
    totalContratos: contratos.length,
    totalActivos: activos.length,
    totalHistoricos: historicos.length,
    tieneContratosActivos,
    nivelRiesgo,
    dictamen,
    entidadesActivas,
    valorTotalActivo,
    contratosActivos: activos,
    contratosHistoricos: historicos,
    todosContratos: [...activos, ...historicos],
    resumenNormativo,
    resumenFinanciero
  };
}

/**
 * Consultar contratos en SECOP II por número de documento de identidad
 */
async function consultarPorDocumento(documento, opciones = {}) {
  const docLimpio = String(documento || '').trim().replace(/\D/g, '');
  if (!docLimpio) {
    throw new Error('Debe proporcionar un número de documento válido.');
  }

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'SASGE-RRHH-SJD/1.0'
  };
  const auth = getAuthHeader();
  if (auth) {
    headers['Authorization'] = auth;
  }

  // Consulta por documento_proveedor (prioritaria)
  const params = new URLSearchParams({
    documento_proveedor: docLimpio,
    '$limit': String(opciones.limit || 50)
  });

  const url = `${SECOP_DATASET_URL}?${params.toString()}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[SECOP II] Error ${res.status}:`, errText);
      throw new Error(`Error en el servicio de SECOP II (${res.status}): ${errText}`);
    }

    const data = await res.json();
    let contratos = Array.isArray(data) ? data : [];

    // Si no encontró como proveedor directo, consultar si figura como representante legal
    if (contratos.length === 0) {
      const paramsRep = new URLSearchParams({
        identificaci_n_representante_legal: docLimpio,
        '$limit': String(opciones.limit || 50)
      });
      const resRep = await fetch(`${SECOP_DATASET_URL}?${paramsRep.toString()}`, { headers });
      if (resRep.ok) {
        const dataRep = await resRep.json();
        if (Array.isArray(dataRep) && dataRep.length > 0) {
          contratos = dataRep;
        }
      }
    }

    const analisis = analizarContratos(contratos);
    return {
      criterio: 'documento',
      valorBuscado: docLimpio,
      fechaConsulta: new Date().toISOString(),
      ...analisis
    };
  } catch (error) {
    console.error('[SECOP II] Error al consultar por documento:', error.message);
    throw error;
  }
}

/**
 * Consultar contratos en SECOP II por nombre de la persona
 */
async function consultarPorNombre(nombre, opciones = {}) {
  const nombreLimpio = String(nombre || '').trim().toUpperCase();
  if (!nombreLimpio || nombreLimpio.length < 3) {
    throw new Error('Debe ingresar al menos 3 caracteres para buscar por nombre.');
  }

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'SASGE-RRHH-SJD/1.0'
  };
  const auth = getAuthHeader();
  if (auth) {
    headers['Authorization'] = auth;
  }

  // SoQL like
  const params = new URLSearchParams({
    '$where': `upper(proveedor_adjudicado) like '%${nombreLimpio.replace(/'/g, "''")}%'`,
    '$limit': String(opciones.limit || 30)
  });

  const url = `${SECOP_DATASET_URL}?${params.toString()}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[SECOP II] Error ${res.status}:`, errText);
      throw new Error(`Error en el servicio de SECOP II (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const contratos = Array.isArray(data) ? data : [];
    const analisis = analizarContratos(contratos);

    return {
      criterio: 'nombre',
      valorBuscado: nombreLimpio,
      fechaConsulta: new Date().toISOString(),
      ...analisis
    };
  } catch (error) {
    console.error('[SECOP II] Error al consultar por nombre:', error.message);
    throw error;
  }
}

module.exports = {
  consultarPorDocumento,
  consultarPorNombre,
  analizarContratos
};
