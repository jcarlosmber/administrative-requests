import { API_URL, appStorage } from './supabase';

export interface CargoEvaluado {
  id?: string;
  id_sideap?: number;
  id_perno?: number;
  id_plaza?: number;
  nombre: string;
  codigo?: string;
  grado?: string;
  dependencia?: string;
  requisito_experiencia_meses: number;
  requisitos_formacion?: string;
  funciones_cargo: string[];
}

export interface PlazaPlanta {
  id_plaza: number;
  id_sideap?: number;
  id_perno?: number;
  nivel?: string;
  cargo: string;
  codigo?: string;
  grado?: string;
  dependencia_cargo?: string;
  dependencia_funcional?: string;
  proposito?: string;
  funciones?: string[];
  requisitos?: string;
  asignacion_basica?: number;
  titular_cedula?: string;
  titular_nombre?: string;
  tipo_vinculacion?: string;
  situacion_administrativa?: string;
}

export interface CandidatoInfo {
  id?: string;
  nombre: string;
  documento: string;
  email?: string;
  telefono?: string;
}

export interface FuncionCoincidente {
  funcion_certificada: string;
  funcion_del_cargo: string;
  coincidencia: 'DIRECTA' | 'PARCIAL' | 'INDIRECTA' | 'SIN_RELACIÓN';
  justificacion: string;
  evidencia_textual: string;
}

export interface VerificacionFormalCertificado {
  corresponde_aspirante: boolean;
  aspirante_nombre_doc?: string;
  entidad_identificable: boolean;
  entidad_nombre?: string;
  suscriptor_identificable: boolean;
  suscriptor_nombre_cargo_calidad?: string;
  cuenta_con_firma: boolean;
  tipo_firma?: string;
  fecha_expedicion_identificable: boolean;
  fecha_expedicion?: string;
  documento_legible_integro: boolean;
  detalle_legibilidad?: string;
  mecanismos_contacto_verificacion: boolean;
  mecanismos_contacto_cuales?: string;
}

export interface CertificadoAnalizado {
  id?: string;
  id_certificado: string;
  nombre_archivo?: string;
  verificacion_formal?: VerificacionFormalCertificado;
  entidad: string;
  nit_entidad?: string;
  ciudad_expedicion?: string;
  fecha_expedicion?: string;
  firmante?: string;
  cargo_firmante?: string;
  tipo_vinculo?: string;
  cargo_certificado: string;
  codigo_cargo?: string;
  grado_cargo?: string;
  dependencia?: string;
  numero_contrato_o_acto?: string;
  fecha_inicio: string;
  fecha_fin: string;
  vinculo_vigente?: boolean;
  funciones_certificadas?: Array<{ funcion: string; evidencia_textual?: string }>;
  experiencia_profesional?: boolean;
  clasificacion_experiencia?: 'RELACIONADA' | 'NO_RELACIONADA' | 'PROFESIONAL_NO_RELACIONADA' | 'NO_PROFESIONAL' | 'NO_DETERMINABLE';
  experiencia_relacionada?: {
    resultado: 'RELACIONADA' | 'NO_RELACIONADA' | 'REQUIERE_REVISION';
    nivel_confianza?: 'ALTO' | 'MEDIO' | 'BAJO';
    funciones_coincidentes?: FuncionCoincidente[];
    funciones_no_coincidentes?: string[];
  };
  tiempo_certificado?: {
    anios: number;
    meses: number;
    dias: number;
    meses_totales_aproximados: number;
    metodo_calculo?: string;
  };
  traslapes?: Array<{
    otro_certificado_id: string;
    entidad_coincidente?: string;
    fecha_inicio_traslape: string;
    fecha_fin_traslape: string;
    tipo: string;
    tiempo_a_excluir_meses: number;
    explicacion: string;
  }>;
  tiempo_valido?: {
    anios?: number;
    meses?: number;
    dias?: number;
    meses_totales: number;
  };
  documento?: {
    firma_visible: boolean;
    fecha_visible: boolean;
    entidad_identificable: boolean;
    documento_legible: boolean;
    estado: 'COMPLETO' | 'INCOMPLETO';
  };
  observaciones?: string[];
}

export interface ConsolidadoValidacion {
  experiencia_relacionada_meses: number;
  experiencia_no_relacionada_meses: number;
  tiempo_excluido_por_traslapes_meses: number;
  requisito_minimo_meses: number;
  diferencia_meses: number;
  resultado_final: 'CUMPLE' | 'NO_CUMPLE' | 'REQUIERE_REVISION';
  justificacion: string;
  faltantes?: string[];
  requiere_revision_humana: boolean;
}

export interface AnalisisCompleto {
  id?: string;
  candidato: CandidatoInfo;
  cargo_evaluado: CargoEvaluado;
  certificados: CertificadoAnalizado[];
  consolidado: ConsolidadoValidacion;
  created_at?: string;
}

export const ingresosService = {
  async obtenerCargos(): Promise<CargoEvaluado[]> {
    const res = await fetch(`${API_URL}/api/ingresos/cargos`);
    if (!res.ok) throw new Error('Error al obtener cargos');
    return res.json();
  },

  async obtenerPlanta(): Promise<PlazaPlanta[]> {
    const res = await fetch(`${API_URL}/api/ingresos/planta`);
    if (!res.ok) throw new Error('Error al obtener planta de personal');
    return res.json();
  },

  async guardarCargo(cargo: CargoEvaluado): Promise<CargoEvaluado> {
    const isEdit = !!cargo.id;
    const url = isEdit ? `${API_URL}/api/ingresos/cargos/${cargo.id}` : `${API_URL}/api/ingresos/cargos`;
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cargo)
    });
    if (!res.ok) throw new Error(isEdit ? 'Error al actualizar el cargo' : 'Error al guardar el cargo');
    return res.json();
  },

  async eliminarCargo(id: string): Promise<boolean> {
    const res = await fetch(`${API_URL}/api/ingresos/cargos/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar el cargo');
    return true;
  },

  async analizarDocumentos(
    archivos: Array<{ base64: string; name: string; mimeType?: string }>,
    cargo: CargoEvaluado,
    candidato: CandidatoInfo
  ): Promise<AnalisisCompleto> {
    const res = await fetch(`${API_URL}/api/ingresos/analizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivos, cargo, candidato })
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Error en el análisis de documentos.');
    }
    return json.data;
  },

  async recalcularTiempos(certificados: CertificadoAnalizado[], requisitoMeses: number) {
    const res = await fetch(`${API_URL}/api/ingresos/recalcular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificados, requisito_minimo_meses: requisitoMeses })
    });
    if (!res.ok) throw new Error('Error al recalcular tiempos');
    return res.json();
  },

  async guardarValidacion(payload: AnalisisCompleto): Promise<{ id: string; mensaje: string }> {
    const userStr = await appStorage.getItem('user_data');
    let email = 'talento_humano@secjuridica.gov.co';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.email) email = u.email;
      } catch (e) {}
    }

    const res = await fetch(`${API_URL}/api/ingresos/guardar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, evaluador_email: email })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al guardar la validación');
    return json;
  },

  async obtenerValidaciones(): Promise<any[]> {
    const res = await fetch(`${API_URL}/api/ingresos/validaciones`);
    if (!res.ok) throw new Error('Error al obtener validaciones');
    return res.json();
  },

  async obtenerValidacionPorId(id: string): Promise<AnalisisCompleto> {
    const res = await fetch(`${API_URL}/api/ingresos/validaciones/${id}`);
    if (!res.ok) throw new Error('Error al obtener la validación');
    return res.json();
  },

  getExcelDownloadUrl(id: string): string {
    return `${API_URL}/api/ingresos/validaciones/${id}/excel`;
  }
};
