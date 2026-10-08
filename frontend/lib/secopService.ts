import { API_URL } from './supabase';

export interface ContratoSecop {
  idContrato: string;
  referencia: string;
  procesoCompra: string;
  entidad: string;
  nitEntidad: string;
  ordenEntidad: string;
  departamento: string;
  ciudad: string;
  proveedor: string;
  documentoProveedor: string;
  tipoDocumento: string;
  tipoContrato: string;
  modalidad: string;
  objeto: string;
  estado: string;
  esActivo: boolean;
  fechaFirma: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  duracion: string;
  valorTotal: number;
  valorPagado: number;
  valorPendiente: number;
  urlProceso: string | null;
  supervisor: string | null;
  ordenadorGasto: string | null;
}

export interface ResultadoConsultaSecop {
  ok: boolean;
  criterio?: 'documento' | 'nombre';
  valorBuscado?: string;
  fechaConsulta?: string;
  totalContratos: number;
  totalActivos: number;
  totalHistoricos: number;
  tieneContratosActivos: boolean;
  nivelRiesgo: 'ALERTA_CONTRATO_ACTIVO' | 'SIN_RIESGO';
  dictamen: string;
  entidadesActivas: string[];
  valorTotalActivo: number;
  contratosActivos: ContratoSecop[];
  contratosHistoricos: ContratoSecop[];
  todosContratos: ContratoSecop[];
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
  totalHistoricos: number;
  tieneContratosActivos: boolean;
  nivelRiesgo: 'ALERTA_CONTRATO_ACTIVO' | 'SIN_RIESGO';
  dictamen: string;
  entidadesActivas: string[];
  valorTotalActivo: number;
  contratosActivos: ContratoSecop[];
  contratosHistoricos: ContratoSecop[];
  todosContratos: ContratoSecop[];
} {
  const hoy = new Date();
  const activos: ContratoSecop[] = [];
  const historicos: ContratoSecop[] = [];

  for (const c of contratos) {
    const estadoNorm = (c.estado_contrato || '').trim().toLowerCase();

    let vigentePorFecha = false;
    if (c.fecha_de_fin_del_contrato) {
      try {
        const fechaFin = new Date(c.fecha_de_fin_del_contrato);
        if (!isNaN(fechaFin.getTime()) && fechaFin >= hoy) {
          vigentePorFecha = true;
        }
      } catch (e) {}
    }

    const esActivoPorEstado = ESTADOS_ACTIVOS.includes(estadoNorm);
    const esCerradoDefinitivo = estadoNorm === 'cerrado' || estadoNorm === 'terminado' || estadoNorm === 'cancelado';
    const esActivo = (esActivoPorEstado || vigentePorFecha) && !esCerradoDefinitivo;

    const contratoItem: ContratoSecop = {
      idContrato: c.id_contrato || c.referencia_del_contrato || 'N/D',
      referencia: c.referencia_del_contrato || 'Sin referencia',
      procesoCompra: c.proceso_de_compra || '',
      entidad: c.nombre_entidad || 'Entidad no especificada',
      nitEntidad: c.nit_entidad || '',
      ordenEntidad: c.orden || '',
      departamento: c.departamento || '',
      ciudad: c.ciudad || '',
      proveedor: c.proveedor_adjudicado || c.nombre_representante_legal || '',
      documentoProveedor: c.documento_proveedor || c.identificaci_n_representante_legal || '',
      tipoDocumento: c.tipodocproveedor || '',
      tipoContrato: c.tipo_de_contrato || 'Prestación de servicios',
      modalidad: c.modalidad_de_contratacion || '',
      objeto: c.objeto_del_contrato || c.descripcion_del_proceso || 'Sin objeto registrado',
      estado: c.estado_contrato || 'Desconocido',
      esActivo,
      fechaFirma: c.fecha_de_firma ? c.fecha_de_firma.split('T')[0] : null,
      fechaInicio: c.fecha_de_inicio_del_contrato ? c.fecha_de_inicio_del_contrato.split('T')[0] : null,
      fechaFin: c.fecha_de_fin_del_contrato ? c.fecha_de_fin_del_contrato.split('T')[0] : null,
      duracion: c.duraci_n_del_contrato || '',
      valorTotal: parseFloat(c.valor_del_contrato || 0),
      valorPagado: parseFloat(c.valor_pagado || 0),
      valorPendiente: parseFloat(c.valor_pendiente_de_ejecucion || c.valor_pendiente_de_pago || 0),
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

  let nivelRiesgo: 'ALERTA_CONTRATO_ACTIVO' | 'SIN_RIESGO' = 'SIN_RIESGO';
  let dictamen = 'No se registran contratos activos en SECOP II. Sin alerta de inhabilidad contractual preliminar.';

  if (tieneContratosActivos) {
    nivelRiesgo = 'ALERTA_CONTRATO_ACTIVO';
    dictamen = `¡ATENCIÓN! La persona registra ${activos.length} contrato(s) activo(s) o en ejecución en el Estado colombiano (Entidades: ${entidadesActivas.join(', ')}). De conformidad con el artículo 128 de la Constitución Política y las leyes 80 de 1993 y 1952 de 2019, un servidor público no puede desempeñar simultáneamente más de un empleo público ni recibir más de una asignación del tesoro público, salvo excepciones legales expresas. Verifique la cesión, suspensión o acta de terminación antes de formalizar la posesión.`;
  } else if (historicos.length > 0) {
    dictamen = `Registro verificado: Se encontraron ${historicos.length} contrato(s) históricos en SECOP II, todos cerrados o terminados formalmente. No se evidencian contratos en ejecución actualmente.`;
  }

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
    todosContratos: [...activos, ...historicos]
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
