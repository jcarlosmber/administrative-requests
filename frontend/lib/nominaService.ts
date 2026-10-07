import { API_URL } from './supabase';
import mockPlazasData from './plantaMockData.json';
import mockPernoData from './pernoMockData.json';

export interface PersonaPerno {
  cedula: string;
  primer_apellido: string;
  segundo_apellido?: string;
  nombres: string;
  nombre_completo: string;
  estado_funcionario: 'A' | 'R' | string;
  estado_descripcion?: string;
  fecha_nacimiento?: string | null;
  direccion?: string;
  telefono?: string;
  sexo?: string;
  libreta_militar?: string;
  clase_libreta?: string;
  distrito_militar?: string;
  tipo_sangre?: string;
  rh?: string;
  tipo_funcionario?: string;
  fecha_ingreso_entidad?: string | null;
  fecha_ingreso_distrito?: string | null;
  fecha_ingreso_nacion?: string | null;
  codigo_eps?: string;
  fondo_salud?: string;
  codigo_fondo_pensiones?: string;
  fondo_pension?: string;
  codigo_fondo_cesantias?: string;
  fondo_cesantias?: string;
  dependencia_cod?: string;
  dependencia?: string;
  cargo_cod?: string;
  grado?: string;
  asignacion_basica?: number;
  cargo?: string;
  posicion_planta?: number | null;
  sede_cod?: string;
  sede?: string;
  tipo_nombramiento?: string;
  acto_nombramiento?: string;
  fecha_efectiva_nombramiento?: string | null;
  numero_acto_nombramiento?: string;
  fecha_acto_nombramiento?: string | null;
  fecha_efectiva_encargo?: string | null;
  numero_acto_encargo?: string;
  fecha_acto_encargo?: string | null;
  fecha_retiro?: string | null;
  total_devengado?: number | null;
  // Campos vinculados a la Planta Oficial
  plaza_id_plaza?: number | null;
  plaza_id_sideap?: number | null;
  plaza_nivel?: string;
  plaza_cargo?: string;
  plaza_codigo?: string;
  plaza_grado?: string;
  plaza_dependencia_cargo?: string;
  plaza_dependencia_funcional?: string;
  plaza_proposito?: string;
  plaza_funciones?: string[] | string;
  plaza_requisitos?: string;
  plaza_estado_cargo?: string;
  plaza_situacion_titular?: string;
  plaza_tipo_vinculacion?: string;
  plaza_situacion_administrativa?: string;
  plaza_encargo_cedula?: string;
  plaza_encargo_nombre?: string;
  plaza_es_encargo?: boolean;
  plaza_opec?: string;
  plaza_id_escalera?: string | null;
  plaza_peldano_escalera?: number | null;
}

export interface PlazaNomina {
  id_plaza: number;
  id_sideap?: number | null;
  id_perno?: number | null;
  nivel: string;
  cargo: string;
  codigo: string;
  grado: string;
  dependencia_cargo: string;
  dependencia_funcional?: string;
  proposito?: string;
  funciones?: string[] | string;
  requisitos?: string;
  asignacion_basica?: number | string;
  estado_cargo: 'OCUPADO' | 'VACANTE DEFINITIVA' | 'VACANTE TEMPORAL' | 'ENCARGO' | string;
  titular_cedula?: string;
  titular_nombre?: string;
  situacion_titular?: string;
  encargo_cedula?: string;
  encargo_nombre?: string;
  es_encargo?: boolean;
  tipo_vinculacion?: string;
  situacion_administrativa?: string;
  opec?: string;
  // Campos de Escalera de Encargo (Columnas P y Q: ID-E y N)
  id_escalera?: string | null;
  peldano_escalera?: number | null;
  // Campos complementarios de Planta Perno
  tipo_funcionario?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  telefono?: string;
  sexo?: string;
  fondo_salud?: string;
  fondo_pension?: string;
  fondo_cesantias?: string;
  tipo_nombramiento?: string;
  acto_nombramiento?: string;
  numero_acto_nombramiento?: string;
  fecha_acto_nombramiento?: string;
  total_devengado?: number;
}

export interface EscaleraEncargo {
  id_escalera: string;
  total_peldanos: number;
  peldanos: PlazaNomina[];
}

export interface EstadisticasNomina {
  total_plazas: number;
  ocupadas: number;
  vacantes_definitivas: number;
  vacantes_temporales: number;
  encargos: number;
  masa_salarial_mensual: number;
}

export const nominaService = {
  // Obtener listado de plazas
  async getPlazas(filtros?: {
    busqueda?: string;
    nivel?: string;
    estado?: string;
    dependencia?: string;
    cargo?: string;
    id_sieap?: string;
    codigo_grado?: string;
    situacion?: string;
    id_perno?: string;
    solo_encargo?: boolean;
  }): Promise<PlazaNomina[]> {
    try {
      const searchParams = new URLSearchParams();
      if (filtros?.busqueda) searchParams.append('busqueda', filtros.busqueda);
      if (filtros?.nivel && filtros.nivel !== 'TODOS') searchParams.append('nivel', filtros.nivel);
      if (filtros?.estado && filtros.estado !== 'TODOS') searchParams.append('estado', filtros.estado);
      if (filtros?.dependencia && filtros.dependencia !== 'TODAS') searchParams.append('dependencia', filtros.dependencia);
      if (filtros?.cargo && filtros.cargo !== 'TODOS') searchParams.append('cargo', filtros.cargo);
      if (filtros?.id_sieap && filtros.id_sieap !== 'TODOS') searchParams.append('id_sieap', filtros.id_sieap);
      if (filtros?.codigo_grado) searchParams.append('codigo_grado', filtros.codigo_grado);
      if (filtros?.situacion) searchParams.append('situacion', filtros.situacion);
      if (filtros?.id_perno) searchParams.append('id_perno', filtros.id_perno);
      if (filtros?.solo_encargo) searchParams.append('solo_encargo', 'true');

      const url = `${API_URL}/api/nomina/plazas?${searchParams.toString()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.plazas) && data.plazas.length > 0) {
          return data.plazas;
        }
      }
    } catch {
      // Fallback local silencioso si la API aún no está disponible
    }

    // Filtrar sobre los datos precargados reales
    let result = (mockPlazasData as unknown as PlazaNomina[]) || [];

    if (filtros?.busqueda && filtros.busqueda.trim()) {
      const q = filtros.busqueda.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.cargo && p.cargo.toLowerCase().includes(q)) ||
          (p.titular_nombre && p.titular_nombre.toLowerCase().includes(q)) ||
          (p.titular_cedula && p.titular_cedula.toString().includes(q)) ||
          (p.encargo_nombre && p.encargo_nombre.toLowerCase().includes(q)) ||
          (p.encargo_cedula && p.encargo_cedula.toString().includes(q)) ||
          (p.dependencia_cargo && p.dependencia_cargo.toLowerCase().includes(q)) ||
          (p.codigo && p.codigo.toString().includes(q)) ||
          (p.id_plaza && p.id_plaza.toString().includes(q)) ||
          (p.id_sideap && p.id_sideap.toString().includes(q))
      );
    }

    if (filtros?.nivel && filtros.nivel !== 'TODOS') {
      result = result.filter((p) => p.nivel?.toUpperCase() === filtros.nivel?.toUpperCase());
    }

    if (filtros?.estado && filtros.estado !== 'TODOS') {
      result = result.filter((p) => p.estado_cargo?.toUpperCase() === filtros.estado?.toUpperCase());
    }

    if (filtros?.dependencia && filtros.dependencia !== 'TODAS') {
      result = result.filter((p) => p.dependencia_cargo?.toUpperCase() === filtros.dependencia?.toUpperCase());
    }

    if (filtros?.cargo && filtros.cargo !== 'TODOS') {
      result = result.filter((p) => p.cargo?.toUpperCase() === filtros.cargo?.toUpperCase());
    }

    if (filtros?.id_sieap && filtros.id_sieap.trim()) {
      const sieapQuery = filtros.id_sieap.trim();
      result = result.filter((p) => p.id_sideap && p.id_sideap.toString() === sieapQuery);
    }

    if (filtros?.codigo_grado && filtros.codigo_grado.trim()) {
      result = result.filter(
        (p) => `${p.codigo || ''}-${p.grado || ''}` === filtros.codigo_grado
      );
    }

    if (filtros?.situacion && filtros.situacion.trim()) {
      const sitQuery = filtros.situacion.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.situacion_administrativa && p.situacion_administrativa.toLowerCase().includes(sitQuery)) ||
          (p.situacion_titular && p.situacion_titular.toLowerCase().includes(sitQuery)) ||
          (p.tipo_vinculacion && p.tipo_vinculacion.toLowerCase().includes(sitQuery))
      );
    }

    if (filtros?.id_perno && filtros.id_perno.trim()) {
      const pernoQuery = filtros.id_perno.trim();
      result = result.filter((p) => p.id_perno && p.id_perno.toString() === pernoQuery);
    }

    if (filtros?.solo_encargo) {
      result = result.filter((p) => p.es_encargo === true);
    }

    return result;
  },

  // Obtener estadísticas consolidadas
  async getEstadisticas(): Promise<EstadisticasNomina> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_URL}/api/nomina/estadisticas`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.estadisticas) {
          return {
            total_plazas: parseInt(data.estadisticas.total_plazas || '0', 10),
            ocupadas: parseInt(data.estadisticas.ocupadas || '0', 10),
            vacantes_definitivas: parseInt(data.estadisticas.vacantes_definitivas || '0', 10),
            vacantes_temporales: parseInt(data.estadisticas.vacantes_temporales || '0', 10),
            encargos: parseInt(data.estadisticas.encargos || '0', 10),
            masa_salarial_mensual: parseFloat(data.estadisticas.masa_salarial_mensual || '0'),
          };
        }
      }
    } catch {
      // Fallback con datos calculados
    }

    const data = (mockPlazasData as unknown as PlazaNomina[]) || [];
    const total = data.length;
    let ocupadas = 0;
    let vacDef = 0;
    let vacTemp = 0;
    let masa = 0;

    data.forEach((p) => {
      if (p.estado_cargo === 'OCUPADO') ocupadas++;
      else if (p.estado_cargo === 'VACANTE DEFINITIVA') vacDef++;
      else if (p.estado_cargo === 'VACANTE TEMPORAL') vacTemp++;
      masa += Number(p.asignacion_basica) || 0;
    });

    return {
      total_plazas: total,
      ocupadas,
      vacantes_definitivas: vacDef,
      vacantes_temporales: vacTemp,
      encargos: 0,
      masa_salarial_mensual: masa,
    };
  },

  // URLs para descarga de plantillas oficiales
  getPlantillaPlantaUrl(): string {
    return `${API_URL}/api/nomina/plantilla/planta`;
  },

  getPlantillaPernoUrl(): string {
    return `${API_URL}/api/nomina/plantilla/perno`;
  },

  // Subir Archivo 1: Planta de Personal (Imagen 1)
  async uploadPlanta(file: { uri: string; name: string; type?: string; file?: any }): Promise<{
    success: boolean;
    mensaje: string;
    registros_actualizados?: number;
    registros_procesados?: number;
    filas_omitidas?: number;
    advertencias?: string[];
    total_advertencias?: number;
    error?: string;
  }> {
    try {
      const formData = new FormData();
      if (file.file) {
        formData.append('archivo', file.file);
      } else if (file.uri && (file.uri.startsWith('blob:') || file.uri.startsWith('data:'))) {
        const blob = await fetch(file.uri).then((r) => r.blob());
        formData.append('archivo', blob, file.name);
      } else {
        // @ts-ignore
        formData.append('archivo', {
          uri: file.uri,
          name: file.name,
          type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }

      const res = await fetch(`${API_URL}/api/nomina/upload-planta`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok && !json.mensaje) {
        json.mensaje = json.error || `Error ${res.status} al procesar archivo`;
      }
      return json;
    } catch (e: any) {
      return {
        success: false,
        mensaje: `Error al procesar archivo en el servidor: ${e.message}`,
      };
    }
  },

  // Subir Archivo 2: Planta Perno / Nómina (Imagen 2)
  async uploadPerno(file: { uri: string; name: string; type?: string; file?: any }): Promise<{
    success: boolean;
    mensaje: string;
    registros_actualizados?: number;
    registros_procesados?: number;
    registros_sin_plaza?: number;
    advertencias?: string[];
    total_advertencias?: number;
    error?: string;
  }> {
    try {
      const formData = new FormData();
      if (file.file) {
        formData.append('archivo', file.file);
      } else if (file.uri && (file.uri.startsWith('blob:') || file.uri.startsWith('data:'))) {
        const blob = await fetch(file.uri).then((r) => r.blob());
        formData.append('archivo', blob, file.name);
      } else {
        // @ts-ignore
        formData.append('archivo', {
          uri: file.uri,
          name: file.name,
          type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }

      const res = await fetch(`${API_URL}/api/nomina/upload-perno`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok && !json.mensaje) {
        json.mensaje = json.error || `Error ${res.status} al procesar archivo`;
      }
      return json;
    } catch (e: any) {
      return {
        success: false,
        mensaje: `Error al procesar archivo en el servidor: ${e.message}`,
      };
    }
  },

  // Sincronizar archivo local existente
  async syncLocal(): Promise<{ success: boolean; mensaje: string }> {
    try {
      const res = await fetch(`${API_URL}/api/nomina/sync-local`, { method: 'POST' });
      return await res.json();
    } catch (e: any) {
      return { success: false, mensaje: e.message };
    }
  },

  // Obtener todas las escaleras de encargo
  async getEscaleras(): Promise<EscaleraEncargo[]> {
    try {
      const res = await fetch(`${API_URL}/api/nomina/escaleras`);
      const data = await res.json();
      if (data.success && data.escaleras) {
        return data.escaleras;
      }
      return [];
    } catch (e) {
      console.warn('Error al cargar escaleras:', e);
      return [];
    }
  },

  // Obtener detalle de una escalera de encargo específica
  async getEscaleraDetalle(idEscalera: string): Promise<PlazaNomina[]> {
    try {
      const res = await fetch(`${API_URL}/api/nomina/escaleras/${encodeURIComponent(idEscalera)}`);
      const data = await res.json();
      if (data.success && data.peldanos) {
        return data.peldanos;
      }
      return [];
    } catch (e) {
      console.warn('Error al cargar detalle de escalera:', e);
      return [];
    }
  },

  // Obtener listado de personal integral (PLANTA PERNO - Activos y Desvinculados)
  async getPersonalPerno(filtros?: {
    busqueda?: string;
    estado?: string;
    solo_plaza?: boolean;
  }): Promise<PersonaPerno[]> {
    try {
      const searchParams = new URLSearchParams();
      if (filtros?.busqueda) searchParams.append('busqueda', filtros.busqueda);
      if (filtros?.estado && filtros.estado !== 'TODOS') searchParams.append('estado', filtros.estado);
      if (filtros?.solo_plaza) searchParams.append('solo_plaza', 'true');

      const url = `${API_URL}/api/nomina/perno?${searchParams.toString()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.personal) && data.personal.length > 0) {
          return data.personal;
        }
      }
    } catch {
      // Fallback local enriquecido
    }

    // Cruce local entre mockPernoData y mockPlazasData
    const listPerno = (mockPernoData as unknown as PersonaPerno[]) || [];
    const listPlazas = (mockPlazasData as unknown as PlazaNomina[]) || [];

    let result = listPerno.map((per) => {
      const match = listPlazas.find(
        (pl) =>
          String(pl.titular_cedula) === String(per.cedula) ||
          String(pl.encargo_cedula) === String(per.cedula)
      );
      if (!match) return per;

      return {
        ...per,
        plaza_id_plaza: match.id_plaza,
        plaza_id_sideap: match.id_sideap,
        plaza_nivel: match.nivel,
        plaza_cargo: match.cargo,
        plaza_codigo: match.codigo,
        plaza_grado: match.grado,
        plaza_dependencia_cargo: match.dependencia_cargo,
        plaza_dependencia_funcional: match.dependencia_funcional,
        plaza_proposito: match.proposito,
        plaza_funciones: match.funciones,
        plaza_requisitos: match.requisitos,
        plaza_estado_cargo: match.estado_cargo,
        plaza_situacion_titular: match.situacion_titular,
        plaza_tipo_vinculacion: match.tipo_vinculacion,
        plaza_situacion_administrativa: match.situacion_administrativa,
        plaza_encargo_cedula: match.encargo_cedula,
        plaza_encargo_nombre: match.encargo_nombre,
        plaza_es_encargo: match.es_encargo,
        plaza_opec: match.opec,
        plaza_id_escalera: match.id_escalera,
        plaza_peldano_escalera: match.peldano_escalera,
      };
    });

    if (filtros?.busqueda && filtros.busqueda.trim()) {
      const q = filtros.busqueda.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.nombre_completo && p.nombre_completo.toLowerCase().includes(q)) ||
          (p.cedula && p.cedula.toString().includes(q)) ||
          (p.cargo && p.cargo.toLowerCase().includes(q)) ||
          (p.dependencia && p.dependencia.toLowerCase().includes(q)) ||
          (p.fondo_salud && p.fondo_salud.toLowerCase().includes(q)) ||
          (p.fondo_pension && p.fondo_pension.toLowerCase().includes(q)) ||
          (p.plaza_cargo && p.plaza_cargo.toLowerCase().includes(q))
      );
    }

    if (filtros?.estado && filtros.estado !== 'TODOS') {
      if (filtros.estado === 'ACTIVO' || filtros.estado === 'A') {
        result = result.filter((p) => p.estado_funcionario === 'A' && !p.fecha_retiro);
      } else if (filtros.estado === 'RETIRADO' || filtros.estado === 'DESVINCULADO' || filtros.estado === 'R') {
        result = result.filter((p) => p.estado_funcionario === 'R' || !!p.fecha_retiro);
      }
    }

    if (filtros?.solo_plaza) {
      result = result.filter((p) => p.plaza_id_plaza !== null && p.plaza_id_plaza !== undefined);
    }

    return result;
  },
};

