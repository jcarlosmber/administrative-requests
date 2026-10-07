import { API_URL } from './supabase';
import mockPlazasData from './plantaMockData.json';

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
};
