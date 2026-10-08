import { API_URL } from './supabase';

export interface ContratoSecop {
  id?: string;
  idContrato: string;
  referencia: string;
  numeroContrato?: string;
  urlSecop?: string | null;
  procesoCompra: string;
  entidad: string;
  nitEntidad: string;
  codigoEntidad?: string;
  ordenEntidad: string;
  departamento: string;
  ciudad: string;
  proveedor: string;
  documentoProveedor: string;
  tipoDocumento: string;
  tipoContrato: string;
  subtipoContrato?: string;
  modalidad: string;
  justificacionModalidad?: string;
  objeto: string;
  estado: string;
  esActivo: boolean;
  esActivoFinalizado?: boolean;
  plazoVencido?: boolean;
  esHistorico?: boolean;
  fechaFirma: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  fechaLiquidacion?: string | null;
  diasRestantes?: number | null;
  plazoEjecucion?: string;
  duracion: string;
  valorTotal: number;
  valorPagado: number;
  valorPendiente: number;
  porcentajeEjecucion?: number;
  saldoFavorEntidad?: number;
  urlProceso: string | null;
  supervisor: string | null;
  ordenadorGasto: string | null;
}

export interface ArticuloNormativoSecop {
  norma: string;
  descripcion: string;
}

export interface ResumenNormativoSecop {
  titulo: string;
  articulos: ArticuloNormativoSecop[];
  orientacionTalentoHumano: string;
  accionRequerida: string;
}

export interface ResumenFinancieroSecop {
  valorTotalActivo: number;
  valorPagadoActivo: number;
  valorPendienteActivo: number;
  valorTotalActivoFinalizado?: number;
  valorTotalHistorico: number;
  porcentajeTotalPagado: number;
}

export interface ResultadoConsultaSecop {
  ok: boolean;
  criterio?: 'documento' | 'nombre';
  valorBuscado?: string;
  fechaConsulta?: string;
  totalContratos: number;
  totalActivos: number;
  totalActivosVigentes?: number;
  totalActivosFinalizados?: number;
  totalHistoricos: number;
  tieneContratosActivos: boolean;
  tieneContratosActivosFinalizados?: boolean;
  nivelRiesgo: 'ALERTA_CONTRATO_ACTIVO' | 'PREVENCION_FINALIZADO' | 'SIN_RIESGO';
  dictamen: string;
  entidadesActivas: string[];
  entidadesFinalizadas?: string[];
  valorTotalActivo: number;
  valorTotalActivoFinalizado?: number;
  contratosActivos: ContratoSecop[];
  contratosActivosFinalizados?: ContratoSecop[];
  contratosHistoricos: ContratoSecop[];
  todosContratos: ContratoSecop[];
  resumenNormativo?: ResumenNormativoSecop;
  resumenFinanciero?: ResumenFinancieroSecop;
  error?: string;
  fuente?: 'backend' | 'datos.gov.co-directo';
}

const SECOP_DATASET_URL = 'https://www.datos.gov.co/resource/jbjy-vk9h.json';

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
 * Normaliza y clasifica registros provenientes del dataset jbjy-vk9h de SECOP II
 */
function analizarContratosRaw(contratos: any[] = []): {
  totalContratos: number;
  totalActivos: number;
  totalActivosVigentes: number;
  totalActivosFinalizados: number;
  totalHistoricos: number;
  tieneContratosActivos: boolean;
  tieneContratosActivosFinalizados: boolean;
  nivelRiesgo: 'ALERTA_CONTRATO_ACTIVO' | 'PREVENCION_FINALIZADO' | 'SIN_RIESGO';
  dictamen: string;
  entidadesActivas: string[];
  entidadesFinalizadas: string[];
  valorTotalActivo: number;
  valorTotalActivoFinalizado: number;
  contratosActivos: ContratoSecop[];
  contratosActivosFinalizados: ContratoSecop[];
  contratosHistoricos: ContratoSecop[];
  todosContratos: ContratoSecop[];
  resumenNormativo: ResumenNormativoSecop;
  resumenFinanciero: ResumenFinancieroSecop;
} {
  const hoy = new Date();
  const activos: ContratoSecop[] = [];
  const activosFinalizados: ContratoSecop[] = [];
  const historicos: ContratoSecop[] = [];

  for (const c of contratos) {
    const estadoNorm = (c.estado_contrato || '').trim().toLowerCase();

    let diasRestantes: number | null = null;
    let haVencidoPorFecha = false;
    let fechaFinObj: Date | null = null;

    if (c.fecha_de_fin_del_contrato) {
      try {
        fechaFinObj = new Date(c.fecha_de_fin_del_contrato);
        if (!isNaN(fechaFinObj.getTime())) {
          diasRestantes = Math.ceil((fechaFinObj.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
          if (fechaFinObj < hoy) {
            haVencidoPorFecha = true;
          }
        }
      } catch (e) {}
    }

    const esCerradoDefinitivo = estadoNorm === 'cerrado' || estadoNorm === 'terminado' || estadoNorm === 'cancelado' || estadoNorm === 'liquidado';
    const esActivoPorEstado = ESTADOS_ACTIVOS.includes(estadoNorm);

    // Clasificación:
    // 1. Histórico: cerrado formalmente por la entidad
    // 2. Activo pero Finalizado: figura como activo/modificado en SECOP pero fecha fin ya terminó
    // 3. Activo Vigente: activo y fecha fin futura o sin vencer
    let esActivo = false;
    let esActivoFinalizado = false;
    let esHistorico = false;

    if (esCerradoDefinitivo) {
      esHistorico = true;
    } else if (haVencidoPorFecha) {
      esActivoFinalizado = true;
    } else if (esActivoPorEstado || (fechaFinObj && fechaFinObj >= hoy)) {
      esActivo = true;
    } else {
      esHistorico = true;
    }

    const valorTotal = parseFloat(c.valor_del_contrato || 0);
    const valorPagado = parseFloat(c.valor_pagado || 0);
    const valorPendiente = parseFloat(
      c.valor_pendiente_de_ejecucion || c.valor_pendiente_de_pago || Math.max(0, valorTotal - valorPagado)
    );
    const porcentajeEjecucion = valorTotal > 0 ? Math.min(100, Math.round((valorPagado / valorTotal) * 100)) : 0;

    const contratoItem: ContratoSecop = {
      id: c.id_contrato || c.referencia_del_contrato || 'N/D',
      idContrato: c.id_contrato || c.referencia_del_contrato || 'N/D',
      numeroContrato: c.referencia_del_contrato || 'Sin referencia',
      urlSecop: c.urlproceso?.url || (typeof c.urlproceso === 'string' ? c.urlproceso : null),
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
      esActivoFinalizado,
      plazoVencido: haVencidoPorFecha,
      esHistorico,
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
    } else if (esActivoFinalizado) {
      activosFinalizados.push(contratoItem);
    } else {
      historicos.push(contratoItem);
    }
  }

  const tieneContratosActivos = activos.length > 0;
  const tieneContratosActivosFinalizados = activosFinalizados.length > 0;
  const entidadesActivas = Array.from(new Set(activos.map(a => a.entidad)));
  const entidadesFinalizadas = Array.from(new Set(activosFinalizados.map(a => a.entidad)));
  const valorTotalActivo = activos.reduce((sum, a) => sum + (a.valorTotal || 0), 0);
  const valorPagadoActivo = activos.reduce((sum, a) => sum + (a.valorPagado || 0), 0);
  const valorPendienteActivo = activos.reduce((sum, a) => sum + (a.valorPendiente || 0), 0);
  const valorTotalActivoFinalizado = activosFinalizados.reduce((sum, a) => sum + (a.valorTotal || 0), 0);
  const valorTotalHistorico = historicos.reduce((sum, h) => sum + (h.valorTotal || 0), 0);
  const porcentajeTotalPagado = valorTotalActivo > 0 ? Math.round((valorPagadoActivo / valorTotalActivo) * 100) : 0;

  let nivelRiesgo: 'ALERTA_CONTRATO_ACTIVO' | 'PREVENCION_FINALIZADO' | 'SIN_RIESGO' = 'SIN_RIESGO';
  let dictamen = 'No se registran contratos activos en SECOP II. Sin alerta de inhabilidad contractual preliminar.';

  if (tieneContratosActivos) {
    nivelRiesgo = 'ALERTA_CONTRATO_ACTIVO';
    dictamen = `¡ATENCIÓN! La persona registra ${activos.length} contrato(s) activo(s) en ejecución vigente en el Estado colombiano (Entidades: ${entidadesActivas.join(', ')}). De conformidad con el artículo 128 de la Constitución Política y las leyes 80 de 1993 y 1952 de 2019, un servidor público no puede desempeñar simultáneamente más de un empleo público ni recibir más de una asignación del tesoro público. Verifique la cesión, suspensión o acta de terminación antes de formalizar la posesión.`;
  } else if (tieneContratosActivosFinalizados) {
    nivelRiesgo = 'PREVENCION_FINALIZADO';
    dictamen = `PREVENCIÓN CONTRACTUAL: La persona registra ${activosFinalizados.length} contrato(s) con estado activo/modificado en SECOP II, pero cuya fecha de finalización ya culminó (Entidades: ${entidadesFinalizadas.join(', ')}). No se evidencia ejecución activa simultánea en tiempo real. Sin embargo, al no figurar cerrado o liquidado formalmente en la plataforma, se sugiere requerir paz y salvo, acta de terminación o constancia de cumplimiento a satisfacción.`;
  } else if (historicos.length > 0) {
    dictamen = `Registro verificado: Se encontraron ${historicos.length} contrato(s) históricos en SECOP II, todos cerrados o terminados formalmente. No se evidencian contratos en ejecución actualmente.`;
  }

  const resumenNormativo: ResumenNormativoSecop = {
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
      : tieneContratosActivosFinalizados
      ? 'VERIFICACIÓN PREVENTIVA DE CIERRE: Los contratos registran fecha de fin cumplida pero no figuran cerrados o liquidados en SECOP II. Solicite paz y salvo, constancia de cumplimiento a satisfacción o acta de liquidación para anexar a la carpeta del aspirante.'
      : 'CONCEPTO FAVORABLE: No se registran contratos en ejecución en SECOP II. Continúe con la verificación ordinaria de antecedentes y requisitos.',
    accionRequerida: tieneContratosActivos
      ? 'Exigir Acta de Terminación Bilateral / Liquidación o Suspensión Formal aprobada por la entidad pública antes del acto de posesión.'
      : tieneContratosActivosFinalizados
      ? 'Solicitar constancia de cumplimiento a satisfacción, paz y salvo o acta de liquidación suscrita con la entidad estatal.'
      : 'Apto para posesión en materia de contratación estatal preliminar.'
  };

  const resumenFinanciero: ResumenFinancieroSecop = {
    valorTotalActivo,
    valorPagadoActivo,
    valorPendienteActivo,
    valorTotalActivoFinalizado,
    valorTotalHistorico,
    porcentajeTotalPagado
  };

  return {
    totalContratos: contratos.length,
    totalActivos: activos.length,
    totalActivosVigentes: activos.length,
    totalActivosFinalizados: activosFinalizados.length,
    totalHistoricos: historicos.length,
    tieneContratosActivos,
    tieneContratosActivosFinalizados,
    nivelRiesgo,
    dictamen,
    entidadesActivas,
    entidadesFinalizadas,
    valorTotalActivo,
    valorTotalActivoFinalizado,
    contratosActivos: activos,
    contratosActivosFinalizados: activosFinalizados,
    contratosHistoricos: historicos,
    todosContratos: [...activos, ...activosFinalizados, ...historicos],
    resumenNormativo,
    resumenFinanciero
  };
}

/**
 * Consulta directa a la API pública de Datos Abiertos (datos.gov.co / Socrata)
 * como respaldo resiliente si el backend local/remoto no tiene la ruta activa aún (404)
 */
async function consultarDirectoDatosGovCo(params: { documento?: string; nombre?: string; limit?: number }): Promise<ResultadoConsultaSecop> {
  const limit = String(params.limit || 50);

  if (params.documento) {
    const docLimpio = String(params.documento).trim().replace(/\D/g, '');
    if (!docLimpio) throw new Error('Número de documento no válido.');

    // 1. Consulta por documento de proveedor adjudicado
    const searchParams = new URLSearchParams({
      documento_proveedor: docLimpio,
      '$limit': limit
    });

    let res = await fetch(`${SECOP_DATASET_URL}?${searchParams.toString()}`);
    let data: any[] = [];
    if (res.ok) {
      data = await res.json();
    }

    // 2. Si no hay resultados, intentar por identificación de representante legal
    if (!Array.isArray(data) || data.length === 0) {
      const repParams = new URLSearchParams({
        identificaci_n_representante_legal: docLimpio,
        '$limit': limit
      });
      const resRep = await fetch(`${SECOP_DATASET_URL}?${repParams.toString()}`);
      if (resRep.ok) {
        const dataRep = await resRep.json();
        if (Array.isArray(dataRep) && dataRep.length > 0) {
          data = dataRep;
        }
      }
    }

    const contratos = Array.isArray(data) ? data : [];
    const analisis = analizarContratosRaw(contratos);

    return {
      ok: true,
      criterio: 'documento',
      valorBuscado: docLimpio,
      fechaConsulta: new Date().toISOString(),
      fuente: 'datos.gov.co-directo',
      ...analisis
    };
  } else if (params.nombre) {
    const nombreLimpio = String(params.nombre).trim().toUpperCase();
    if (!nombreLimpio || nombreLimpio.length < 3) {
      throw new Error('Debe ingresar al menos 3 caracteres para buscar por nombre.');
    }

    const searchParams = new URLSearchParams({
      '$where': `upper(proveedor_adjudicado) like '%${nombreLimpio.replace(/'/g, "''")}%'`,
      '$limit': String(params.limit || 30)
    });

    const res = await fetch(`${SECOP_DATASET_URL}?${searchParams.toString()}`);
    if (!res.ok) {
      throw new Error(`Error al consultar datos.gov.co: ${res.status}`);
    }

    const data = await res.json();
    const contratos = Array.isArray(data) ? data : [];
    const analisis = analizarContratosRaw(contratos);

    return {
      ok: true,
      criterio: 'nombre',
      valorBuscado: nombreLimpio,
      fechaConsulta: new Date().toISOString(),
      fuente: 'datos.gov.co-directo',
      ...analisis
    };
  }

  throw new Error('Debe especificar documento o nombre.');
}

export const secopService = {
  /**
   * Consulta contratos en SECOP II por documento (cédula/NIT) o nombre.
   * Intenta primero mediante el backend; si el backend responde 404 (aún no desplegado/reiniciado),
   * recurre automáticamente de forma transparente y resiliente a la API abierta de datos.gov.co.
   */
  async consultar(params: { documento?: string; nombre?: string; limit?: number }): Promise<ResultadoConsultaSecop> {
    const search = new URLSearchParams();
    if (params.documento) search.set('documento', params.documento);
    if (params.nombre) search.set('nombre', params.nombre);
    if (params.limit) search.set('limit', String(params.limit));

    try {
      const res = await fetch(`${API_URL}/api/secop/consultar?${search.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return { ...data, fuente: 'backend' };
      }

      // Si el servidor responde 404 (endpoint no desplegado o reiniciado aún en producción)
      if (res.status === 404 || res.status === 502 || res.status === 503) {
        console.warn(`[SECOP Service] Backend ${API_URL}/api/secop/consultar devolvió ${res.status}. Usando fallback directo a datos.gov.co.`);
        return await consultarDirectoDatosGovCo(params);
      }

      const err = await res.json().catch(() => ({ error: `Error ${res.status}` }));
      throw new Error(err.error || `Error al consultar SECOP II (${res.status})`);
    } catch (error: any) {
      console.warn('[SECOP Service] Error al contactar backend:', error?.message);
      // Fallback directo a datos.gov.co ante fallo de red o 404
      return await consultarDirectoDatosGovCo(params);
    }
  },

  /**
   * Consulta estado de conectividad con la API de SECOP II
   */
  async obtenerEstado(): Promise<{ ok: boolean; servicio: string; dataset: string; autenticacion: boolean }> {
    try {
      const res = await fetch(`${API_URL}/api/secop/estado`);
      if (res.ok) {
        return res.json();
      }
    } catch (e) {}

    // Fallback verificando datos.gov.co directamente
    try {
      const res = await fetch(`${SECOP_DATASET_URL}?$limit=1`);
      if (res.ok) {
        return {
          ok: true,
          servicio: 'SECOP II - Contratos Electrónicos (Directo Datos Abiertos)',
          dataset: 'jbjy-vk9h',
          autenticacion: false
        };
      }
    } catch (e) {}

    throw new Error('No fue posible conectar con el servicio SECOP II');
  }
};
