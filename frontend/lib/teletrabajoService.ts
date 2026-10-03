import { API_URL } from './supabase';

export interface PersonaPlanta {
  id_plaza: number;
  id_sideap?: number;
  nivel?: string;
  cargo: string;
  codigo?: string;
  grado?: string;
  dependencia_cargo?: string;
  dependencia_funcional?: string;
  titular_cedula: string;
  titular_nombre: string;
  tipo_vinculacion?: string;
  situacion_administrativa?: string;
  cargo_es_teletrabajable: boolean;
  cargo_max_dias: number;
  asignacion_id?: string;
  modalidad?: 'TELETRABAJO' | 'TRABAJO_EN_CASA';
  submodalidad?: string;
  resolucion_id?: string;
  numero_resolucion_display?: string;
  asignacion_desde?: string;
  asignacion_hasta?: string;
  esquema_dias_tipo?: 'DIAS_FIJOS' | 'DIAS_PARES' | 'DIAS_IMPARES' | 'CANTIDAD_LIBRE';
  dias_por_semana?: number;
  dias_semana_fijos?: string[];
  excepcion_jefe_aprobada?: boolean;
  motivo_excepcion_jefe?: string;
  asignacion_estado?: 'ACTIVO' | 'VENCIDO' | 'SUSPENDIDO' | 'REVOCADO';
  acuerdo_id?: string;
  acuerdo_cargo?: string;
  acuerdo_fecha?: string;
  acuerdo_archivo_url?: string;
  acuerdo_nombre_archivo?: string;
  requiere_nuevo_acuerdo: boolean;
}

export interface ResolucionTeletrabajo {
  id: string;
  numero_resolucion: string;
  anio: number;
  fecha_expedicion: string;
  fecha_inicio_vigencia: string;
  fecha_fin_vigencia: string;
  descripcion?: string;
  modalidad_principal: 'TELETRABAJO' | 'TRABAJO_EN_CASA' | 'MIXTA';
  archivo_pdf_url?: string;
  nombre_archivo?: string;
  estado: 'VIGENTE' | 'DEROGADA' | 'FINALIZADA';
  total_personas_activas?: number;
  total_personas_historico?: number;
}

export interface CargoConfig {
  id: string;
  cargo_nombre: string;
  codigo: string;
  grado: string;
  dependencia?: string;
  es_teletrabajable: boolean;
  max_dias_semana: number;
  justificacion_estudio?: string;
  total_titulares_cargo?: number;
}

export interface AsignacionModalidad {
  id?: string;
  servidor_cedula: string;
  servidor_nombre: string;
  id_plaza?: number | null;
  cargo_actual: string;
  codigo_cargo?: string;
  grado_cargo?: string;
  dependencia?: string;
  modalidad: 'TELETRABAJO' | 'TRABAJO_EN_CASA';
  submodalidad?: string;
  resolucion_id?: string | null;
  numero_resolucion_display?: string;
  fecha_inicio: string;
  fecha_fin: string;
  cargo_es_teletrabajable: boolean;
  excepcion_jefe_aprobada: boolean;
  motivo_excepcion_jefe?: string;
  esquema_dias_tipo: 'DIAS_FIJOS' | 'DIAS_PARES' | 'DIAS_IMPARES' | 'CANTIDAD_LIBRE';
  dias_por_semana: number;
  dias_semana_fijos: string[];
  estado?: 'ACTIVO' | 'VENCIDO' | 'SUSPENDIDO' | 'REVOCADO';
  observaciones?: string;
  acuerdo_id?: string;
  acuerdo_fecha?: string;
  archivo_acuerdo_url?: string;
  resolucion_pdf_url?: string;
}

export interface AcuerdoCompromiso {
  id: string;
  asignacion_id?: string;
  servidor_cedula: string;
  servidor_nombre: string;
  cargo_al_momento: string;
  fecha_suscripcion: string;
  periodo_vigencia?: string;
  archivo_acuerdo_url?: string;
  nombre_archivo?: string;
  es_vigente: boolean;
  observaciones?: string;
  dependencia_cargo?: string;
}

export interface SeguimientoTeletrabajo {
  id: string;
  asignacion_id?: string;
  servidor_cedula: string;
  servidor_nombre: string;
  cargo?: string;
  dependencia_cargo?: string;
  fecha_corte_desde: string;
  fecha_corte_hasta: string;
  evaluador_nombre?: string;
  evaluador_cargo?: string;
  cumplimiento_nivel: 'SOBRESALIENTE' | 'SATISFACTORIO' | 'PARCIAL' | 'NO_CUMPLE';
  calificacion_porcentaje: number;
  actividades_reportadas?: string;
  soporte_evidencias_url?: string;
  nombre_archivo_soporte?: string;
  nombre_archivo?: string;
  concepto_recomendacion: 'CONTINUAR' | 'AJUSTAR_DIAS' | 'REVERSION_PRESENCIAL';
  observaciones?: string;
}

export interface EstadisticasTeletrabajo {
  total_personal_planta: number;
  activas: {
    total_activas: string | number;
    en_teletrabajo: string | number;
    en_trabajo_en_casa: string | number;
    con_excepcion_jefe: string | number;
    dias_pares: string | number;
    dias_impares: string | number;
  };
  total_resoluciones_vigentes: number;
  total_acuerdos_firmados: number;
}

export const teletrabajoService = {
  async obtenerPersonas(): Promise<PersonaPlanta[]> {
    const res = await fetch(`${API_URL}/api/teletrabajo/personas`);
    if (!res.ok) throw new Error('Error al cargar censo de personal');
    return res.json();
  },

  async obtenerResoluciones(): Promise<ResolucionTeletrabajo[]> {
    const res = await fetch(`${API_URL}/api/teletrabajo/resoluciones`);
    if (!res.ok) throw new Error('Error al cargar resoluciones');
    return res.json();
  },

  async guardarResolucion(data: Partial<ResolucionTeletrabajo> & { archivo_base64?: string }): Promise<ResolucionTeletrabajo> {
    const isEdit = !!data.id;
    const url = isEdit ? `${API_URL}/api/teletrabajo/resoluciones/${data.id}` : `${API_URL}/api/teletrabajo/resoluciones`;
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar resolución');
    }
    return res.json();
  },

  async obtenerCargos(): Promise<CargoConfig[]> {
    const res = await fetch(`${API_URL}/api/teletrabajo/cargos`);
    if (!res.ok) throw new Error('Error al cargar configuración de cargos');
    return res.json();
  },

  async actualizarCargo(id: string, data: Partial<CargoConfig>): Promise<CargoConfig> {
    const res = await fetch(`${API_URL}/api/teletrabajo/cargos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar viabilidad del cargo');
    return res.json();
  },

  async obtenerAsignaciones(): Promise<AsignacionModalidad[]> {
    const res = await fetch(`${API_URL}/api/teletrabajo/asignaciones`);
    if (!res.ok) throw new Error('Error al cargar asignaciones');
    return res.json();
  },

  async guardarAsignacion(data: AsignacionModalidad): Promise<AsignacionModalidad> {
    const isEdit = !!data.id;
    const url = isEdit ? `${API_URL}/api/teletrabajo/asignaciones/${data.id}` : `${API_URL}/api/teletrabajo/asignaciones`;
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar asignación de modalidad');
    }
    return res.json();
  },

  async obtenerAcuerdos(): Promise<AcuerdoCompromiso[]> {
    const res = await fetch(`${API_URL}/api/teletrabajo/acuerdos`);
    if (!res.ok) throw new Error('Error al cargar acuerdos');
    return res.json();
  },

  async guardarAcuerdo(data: Partial<AcuerdoCompromiso> & { archivo_base64?: string }): Promise<AcuerdoCompromiso> {
    const res = await fetch(`${API_URL}/api/teletrabajo/acuerdos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar acuerdo de compromiso');
    }
    return res.json();
  },

  async obtenerSeguimientos(params?: { cedula?: string; desde?: string; hasta?: string }): Promise<SeguimientoTeletrabajo[]> {
    const search = new URLSearchParams();
    if (params?.cedula) search.append('cedula', params.cedula);
    if (params?.desde) search.append('desde', params.desde);
    if (params?.hasta) search.append('hasta', params.hasta);

    const res = await fetch(`${API_URL}/api/teletrabajo/seguimientos?${search.toString()}`);
    if (!res.ok) throw new Error('Error al cargar seguimientos');
    return res.json();
  },

  async guardarSeguimiento(data: Partial<SeguimientoTeletrabajo> & { archivo_base64?: string }): Promise<SeguimientoTeletrabajo> {
    const res = await fetch(`${API_URL}/api/teletrabajo/seguimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar corte de seguimiento');
    }
    return res.json();
  },

  async obtenerEstadisticas(): Promise<EstadisticasTeletrabajo> {
    const res = await fetch(`${API_URL}/api/teletrabajo/estadisticas`);
    if (!res.ok) throw new Error('Error al cargar estadísticas');
    return res.json();
  },

  getResolucionUrl(nombre: string): string {
    return `${API_URL}/api/teletrabajo/resoluciones/archivo/${encodeURIComponent(nombre)}`;
  },

  getAcuerdoUrl(nombre: string): string {
    return `${API_URL}/api/teletrabajo/acuerdos/archivo/${encodeURIComponent(nombre)}`;
  },

  getSeguimientoUrl(nombre: string): string {
    return `${API_URL}/api/teletrabajo/seguimientos/archivo/${encodeURIComponent(nombre)}`;
  },
};
