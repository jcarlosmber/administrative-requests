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

export interface VerificacionExperienciaPrevia {
  es_previo_al_corte: boolean;
  corte_referencia: {
    tipo: 'TERMINACION_MATERIAS' | 'FECHA_GRADO' | 'NO_CONSTA';
    fecha: string;
    titulo_relacionado?: string;
    sustento_normativo: string;
  };
  check_terminacion_pensum: {
    acredita_terminacion_materias: boolean;
    fecha_terminacion: string;
    observacion: string;
  };
  check_relacion_profesion: {
    cumple: boolean;
    disciplina_o_profesion_exigida: string;
    observacion: string;
  };
  check_modalidad_ley_2039: {
    aplica_excepcion: boolean;
    modalidad: string;
    observacion: string;
  };
  tipo_resultado: 'COMPUTABLE_TOTAL_POSTERIOR' | 'COMPUTABLE_TOTAL_LEY_2039' | 'COMPUTABLE_PARCIAL_DESDE_CORTE' | 'NO_COMPUTABLE_PREVIA_AL_GRADO';
  conclusion_juridica: string;
  fecha_inicio_computable?: string;
  dias_excluidos_previos?: number;
}

export interface CertificadoAnalizado {
  id?: string;
  id_certificado: string;
  nombre_archivo?: string;
  verificacion_formal?: VerificacionFormalCertificado;
  verificacion_experiencia_previa?: VerificacionExperienciaPrevia;
  cumple_excepcion_ley_2039?: boolean;
  modalidad_ley_2039?: string;
  justificacion_ley_2039?: string;
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

export interface VerificacionFormalTitulo {
  institucion_reconocida: boolean;
  institucion_evidencia?: string;
  corresponde_aspirante: boolean;
  aspirante_evidencia?: string;
  titulo_y_nivel_formal: boolean;
  titulo_evidencia?: string;
  fecha_grado_cierta: boolean;
  fecha_grado_evidencia?: string;
  acta_o_registro_valido: boolean;
  acta_o_registro_evidencia?: string;
  firmas_autoridades: boolean;
  firmas_evidencia?: string;
  convalidacion_men: boolean;
  convalidacion_evidencia?: string;
}

export interface VerificacionFormalTarjeta {
  consejo_emisor_identificable: boolean;
  consejo_evidencia?: string;
  corresponde_profesional: boolean;
  profesional_evidencia?: string;
  matricula_o_tarjeta_identificable: boolean;
  matricula_evidencia?: string;
  profesion_autorizada: boolean;
  profesion_evidencia?: string;
  certificado_vigencia_y_sanciones: boolean;
  vigencia_evidencia?: string;
  vigencia_temporal_valida: boolean;
  vigencia_temporal_evidencia?: string;
  mecanismo_autenticacion_o_firma: boolean;
  mecanismo_evidencia?: string;
}

export interface FormacionAcademicaItem {
  id?: string;
  nombre_archivo?: string;
  tipo: 'BACHILLER' | 'TECNICO' | 'TECNOLOGO' | 'PREGRADO' | 'ESPECIALIZACION' | 'MAESTRIA' | 'DOCTORADO' | 'TARJETA_PROFESIONAL' | 'OTRO';
  titulo_obtenido: string;
  institucion: string;
  fecha_grado?: string;
  certifica_terminacion_materias?: boolean;
  fecha_terminacion_materias?: string;
  numero_tarjeta_o_registro?: string;
  cumple_requisito_cargo: boolean;
  justificacion: string;
  verificacion_formal_titulo?: VerificacionFormalTitulo;
  verificacion_formal_tarjeta?: VerificacionFormalTarjeta;
}

export interface DocumentoNoAplicaItem {
  id?: string;
  nombre_archivo?: string;
  tipo_documento?: string;
  descripcion: string;
  entidad?: string;
  motivo_no_aplica: string;
  sustento_criterio?: string;
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
  formacion_academica?: FormacionAcademicaItem[];
  certificados: CertificadoAnalizado[];
  documentos_no_aplican?: DocumentoNoAplicaItem[];
  consolidado: ConsolidadoValidacion;
  archivos?: Array<{ name: string; base64: string; size?: number; mimeType?: string }>;
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

    if (!res.ok) {
      if (res.status === 413) {
        throw new Error(
          'Los archivos PDF adjuntos superan el tamaño máximo permitido por el servidor web (Error 413: Payload Too Large). Por favor adjunta archivos más livianos o de menor peso.'
        );
      }
      let errorMsg = `Error en el análisis de documentos (Código ${res.status}).`;
      try {
        const json = await res.json();
        if (json && json.error) errorMsg = json.error;
      } catch (_) {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = `Error del servidor: ${text.slice(0, 100)}`;
      }
      throw new Error(errorMsg);
    }

    const json = await res.json();
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

  async actualizarValidacion(id: string, data: Partial<AnalisisCompleto>): Promise<{ success: boolean; mensaje: string }> {
    // 1. Probar POST /update con X-HTTP-Method-Override para evitar bloqueos del WAF corporativo
    let res = await fetch(`${API_URL}/api/ingresos/validaciones/${id}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HTTP-Method-Override': 'PUT'
      },
      body: JSON.stringify(data)
    }).catch(() => null);

    // 2. Si no responde o falla, intentar PUT estándar
    if (!res || !res.ok) {
      res = await fetch(`${API_URL}/api/ingresos/validaciones/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-HTTP-Method-Override': 'PUT'
        },
        body: JSON.stringify(data)
      });
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al actualizar la validación');
    return json;
  },

  async eliminarValidacion(id: string): Promise<{ success: boolean; mensaje: string }> {
    // 1. Probar POST /delete con X-HTTP-Method-Override (100% compatible con WAF distrital)
    let res = await fetch(`${API_URL}/api/ingresos/validaciones/${id}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HTTP-Method-Override': 'DELETE'
      }
    }).catch(() => null);

    // 2. Si no responde o falla, probar DELETE estándar
    if (!res || !res.ok) {
      res = await fetch(`${API_URL}/api/ingresos/validaciones/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-HTTP-Method-Override': 'DELETE'
        }
      });
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al eliminar la validación');
    return json;
  },

  getExcelDownloadUrl(id: string): string {
    return `${API_URL}/api/ingresos/validaciones/${id}/excel`;
  },

  obtenerUrlArchivo(validacionId: string | undefined, nombreArchivo: string): string {
    if (validacionId) {
      return `${API_URL}/api/ingresos/validaciones/${validacionId}/archivo/${encodeURIComponent(nombreArchivo)}`;
    }
    return `${API_URL}/api/ingresos/archivos/${encodeURIComponent(nombreArchivo)}`;
  }
};

