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
}

export const secopService = {
  /**
   * Consulta contratos en SECOP II por documento (cédula/NIT) o nombre
   */
  async consultar(params: { documento?: string; nombre?: string; limit?: number }): Promise<ResultadoConsultaSecop> {
    const search = new URLSearchParams();
    if (params.documento) search.set('documento', params.documento);
    if (params.nombre) search.set('nombre', params.nombre);
    if (params.limit) search.set('limit', String(params.limit));

    const res = await fetch(`${API_URL}/api/secop/consultar?${search.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Error ${res.status}` }));
      throw new Error(err.error || `Error al consultar SECOP II (${res.status})`);
    }
    return res.json();
  },

  /**
   * Consulta estado de conectividad con la API de SECOP II
   */
  async obtenerEstado(): Promise<{ ok: boolean; servicio: string; dataset: string; autenticacion: boolean }> {
    const res = await fetch(`${API_URL}/api/secop/estado`);
    if (!res.ok) {
      throw new Error('No fue posible conectar con el servicio SECOP II');
    }
    return res.json();
  }
};
