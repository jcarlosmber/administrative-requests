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
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'X-HTTP-Method-Override': 'PUT'
    };

    // 1. Probar POST /validaciones/:id con X-HTTP-Method-Override (100% compatible con WAF y con Express)
    let res = await fetch(`${API_URL}/api/ingresos/validaciones/${id}`, {
      method: 'POST',
      headers,
      body: payload
    }).catch(() => null);

    // 2. Si no responde o da 404, intentar POST a /validaciones/:id/update
    if (!res || !res.ok) {
      const resAlt = await fetch(`${API_URL}/api/ingresos/validaciones/${id}/update`, {
        method: 'POST',
        headers,
        body: payload
      }).catch(() => null);
      if (resAlt && resAlt.ok) {
        res = resAlt;
      }
    }

    // 3. Como último recurso solo si no fue error 500 del WAF
    if (!res || (!res.ok && res.status !== 500)) {
      const resPut = await fetch(`${API_URL}/api/ingresos/validaciones/${id}`, {
        method: 'PUT',
        headers,
        body: payload
      }).catch(() => null);
      if (resPut && resPut.ok) {
        res = resPut;
      }
    }

    if (!res) {
      throw new Error('No se pudo establecer conexión con el servidor para actualizar el expediente.');
    }

    let json: any = null;
    try {
      json = await res.json();
    } catch (_) {
      // Si la respuesta fue HTML (ej. página de error 500 del WAF o 404 de Nginx), capturar texto limpio
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`Error del servidor (${res.status}): ${text.slice(0, 120) || 'Error de conexión o bloqueo de red.'}`);
      }
    }

    if (!res.ok) {
      throw new Error(json?.error || `Error ${res.status} al actualizar la validación`);
    }

    return json || { success: true, mensaje: 'Validación actualizada exitosamente.' };
  },

  async adjuntarYAnalizarDocumentos(
    id: string,
    archivos: Array<{ base64: string; name: string; size?: number; mimeType?: string }>,
    expedienteActual?: AnalisisCompleto | null
  ): Promise<{ success: boolean; mensaje: string; resumen_ia: any; validacion: AnalisisCompleto }> {
    // 1. Intentar endpoint dedicado
    let res = await fetch(`${API_URL}/api/ingresos/validaciones/${id}/adjuntar-y-analizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivos })
    }).catch(() => null);

    // 2. Si el servidor respondió 200/201, devolver resultado
    if (res && res.ok) {
      return res.json();
    }

    // 3. Si respondió 404 (o el backend en producción aún no tiene la ruta activa en memoria),
    // ejecutar el flujo resiliente usando los endpoints base ya desplegados (/analizar + /recalcular + /update):
    if (!res || res.status === 404) {
      const exp = expedienteActual || (await this.obtenerValidacionPorId(id));
      if (!exp) throw new Error('No se encontró el expediente para procesar los documentos.');

      const cargo = exp.cargo_evaluado;
      const candidato = exp.candidato;

      // Analizar los nuevos documentos con Gemini
      const analisisNuevo = await this.analizarDocumentos(archivos, cargo, candidato);

      // Combinar formación académica
      const formacionExistente = Array.isArray(exp.formacion_academica) ? [...exp.formacion_academica] : [];
      const titulosAgregados: FormacionAcademicaItem[] = [];
      (analisisNuevo.formacion_academica || []).forEach(nt => {
        const existe = formacionExistente.some(ft =>
          (ft.nombre_archivo && nt.nombre_archivo && ft.nombre_archivo.toLowerCase() === nt.nombre_archivo.toLowerCase()) ||
          (ft.titulo_obtenido && nt.titulo_obtenido && ft.titulo_obtenido.toLowerCase().trim() === nt.titulo_obtenido.toLowerCase().trim() && ft.tipo === nt.tipo)
        );
        if (!existe) {
          nt.id = `ACAD-${formacionExistente.length + 1}`;
          formacionExistente.push(nt);
          titulosAgregados.push(nt);
        }
      });

      // Combinar certificados
      const certsExistentes = Array.isArray(exp.certificados) ? [...exp.certificados] : [];
      const certsAgregados: CertificadoAnalizado[] = [];
      let maxCertNum = 0;
      certsExistentes.forEach(c => {
        const m = (c.id_certificado || '').match(/CERT-(\d+)/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxCertNum) maxCertNum = num;
        }
      });

      (analisisNuevo.certificados || []).forEach(nc => {
        const existe = certsExistentes.some(ce => {
          const mismoArchivo = ce.nombre_archivo && nc.nombre_archivo && ce.nombre_archivo.toLowerCase().trim() === nc.nombre_archivo.toLowerCase().trim();
          const mismaVinculacion = ce.entidad && nc.entidad &&
            ce.entidad.toLowerCase().trim() === nc.entidad.toLowerCase().trim() &&
            ce.fecha_inicio && nc.fecha_inicio && String(ce.fecha_inicio).trim() === String(nc.fecha_inicio).trim() &&
            ce.fecha_fin && nc.fecha_fin && String(ce.fecha_fin).trim() === String(nc.fecha_fin).trim();
          return mismoArchivo || mismaVinculacion;
        });
        if (!existe) {
          maxCertNum++;
          nc.id_certificado = `CERT-${maxCertNum}`;
          certsExistentes.push(nc);
          certsAgregados.push(nc);
        }
      });

      // Combinar no aplican
      const noAplicanExistente = Array.isArray(exp.documentos_no_aplican) ? [...exp.documentos_no_aplican] : [];
      const noAplicanAgregados: DocumentoNoAplicaItem[] = [];
      (analisisNuevo.documentos_no_aplican || []).forEach(na => {
        const existe = noAplicanExistente.some(ne =>
          (ne.nombre_archivo && na.nombre_archivo && ne.nombre_archivo.toLowerCase() === na.nombre_archivo.toLowerCase())
        );
        if (!existe) {
          na.id = `NO-APLICA-${noAplicanExistente.length + 1}`;
          noAplicanExistente.push(na);
          noAplicanAgregados.push(na);
        }
      });

      // Recalcular determinísticamente con /recalcular
      const reqMeses = cargo.requisito_experiencia_meses || 54;
      const recalc = await this.recalcularTiempos(certsExistentes, reqMeses);

      const certificadosFinales = recalc.certificados || certsExistentes;
      const consolidadoFinal = recalc.consolidado || exp.consolidado;

      // Filtrar no_aplican para evitar que certificados figuren allí
      const certFilesSet = new Set<string>(certificadosFinales.map((c: CertificadoAnalizado) => (c.nombre_archivo || '').toLowerCase().trim()).filter(Boolean));
      const certIdsList: string[] = certificadosFinales.map((c: CertificadoAnalizado) => (c.id_certificado || '').toUpperCase().trim()).filter(Boolean);
      const acadFilesSet = new Set<string>(formacionExistente.map((f: FormacionAcademicaItem) => (f.nombre_archivo || '').toLowerCase().trim()).filter(Boolean));
      const noAplicanLimpio = noAplicanExistente.filter((item: DocumentoNoAplicaItem) => {
        const nom = (item.nombre_archivo || '').toLowerCase().trim();
        const idItem = (item.id || '').toUpperCase().trim();
        const desc = (item.descripcion || '').toUpperCase();
        if (nom && (certFilesSet.has(nom) || acadFilesSet.has(nom))) return false;
        for (const cId of certIdsList) {
          if (idItem.includes(cId) || desc.includes(cId)) return false;
        }
        return true;
      });

      // Actualizar en BD mediante actualizarValidacion (/update)
      await this.actualizarValidacion(id, {
        formacion_academica: formacionExistente,
        certificados: certificadosFinales,
        documentos_no_aplican: noAplicanLimpio,
        consolidado: consolidadoFinal
      });

      const validacionActualizada: AnalisisCompleto = {
        ...exp,
        formacion_academica: formacionExistente,
        certificados: certificadosFinales,
        documentos_no_aplican: noAplicanLimpio,
        consolidado: consolidadoFinal
      };

      return {
        success: true,
        mensaje: 'Documento(s) analizado(s) e incorporado(s) exitosamente al expediente.',
        resumen_ia: {
          titulos_agregados: titulosAgregados,
          certificados_agregados: certsAgregados,
          no_aplican_agregados: noAplicanAgregados
        },
        validacion: validacionActualizada
      };
    }

    if (res && res.status === 413) {
      throw new Error(
        'Los archivos PDF adjuntos superan el tamaño máximo permitido por el servidor web (Error 413: Payload Too Large).'
      );
    }
    let errorMsg = `Error en el análisis de los documentos adjuntos (Código ${res ? res.status : 'ERR'}).`;
    try {
      const json = await res.json();
      if (json && json.error) errorMsg = json.error;
    } catch (_) {
      const text = await res.text().catch(() => '');
      if (text) errorMsg = `Error del servidor: ${text.slice(0, 100)}`;
    }
    throw new Error(errorMsg);
  },

  async eliminarValidacion(id: string): Promise<{ success: boolean; mensaje: string }> {
    const headers = {
      'Content-Type': 'application/json',
      'X-HTTP-Method-Override': 'DELETE'
    };

    // 1. Probar POST /validaciones/:id con X-HTTP-Method-Override (100% compatible con WAF y Express)
    let res = await fetch(`${API_URL}/api/ingresos/validaciones/${id}`, {
      method: 'POST',
      headers
    }).catch(() => null);

    // 2. Si no responde o falla, probar POST /delete
    if (!res || !res.ok) {
      const resAlt = await fetch(`${API_URL}/api/ingresos/validaciones/${id}/delete`, {
        method: 'POST',
        headers
      }).catch(() => null);
      if (resAlt && resAlt.ok) {
        res = resAlt;
      }
    }

    // 3. Como último recurso solo si no es error 500 del WAF
    if (!res || (!res.ok && res.status !== 500)) {
      const resDel = await fetch(`${API_URL}/api/ingresos/validaciones/${id}`, {
        method: 'DELETE',
        headers
      }).catch(() => null);
      if (resDel && resDel.ok) {
        res = resDel;
      }
    }

    if (!res) {
      throw new Error('No se pudo conectar con el servidor.');
    }

    let json: any = null;
    try {
      json = await res.json();
    } catch (_) {
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`Error al eliminar en el servidor (${res.status}): ${text.slice(0, 120) || 'Error de conexión o bloqueo de red institucional.'}`);
      }
    }

    if (!res.ok) {
      throw new Error(json?.error || `Error ${res.status} al eliminar la validación`);
    }

    return json || { success: true, mensaje: 'Validación eliminada correctamente.' };
  },

  async eliminarCertificado(validacionId: string, certId: string): Promise<{ success: boolean; mensaje: string }> {
    const enc = encodeURIComponent(certId);
    let res = await fetch(`${API_URL}/api/ingresos/validaciones/${validacionId}/certificados/${enc}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HTTP-Method-Override': 'DELETE'
      }
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch(`${API_URL}/api/ingresos/validaciones/${validacionId}/certificados/${enc}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-HTTP-Method-Override': 'DELETE'
        }
      }).catch(() => null);
    }

    if (!res) {
      return { success: false, mensaje: 'Sin conexión' };
    }
    const json = await res.json().catch(() => ({}));
    return { success: res.ok, mensaje: json?.mensaje || 'Certificado procesado' };
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

