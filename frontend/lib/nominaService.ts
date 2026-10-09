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
  plaza_nivel?: string | null;
  plaza_cargo?: string | null;
  plaza_codigo?: string | null;
  plaza_grado?: string | null;
  plaza_dependencia_cargo?: string | null;
  plaza_dependencia_funcional?: string | null;
  plaza_proposito?: string | null;
  plaza_funciones?: string[] | string | null;
  plaza_requisitos?: string | null;
  plaza_estado_cargo?: string | null;
  plaza_situacion_titular?: string | null;
  plaza_tipo_vinculacion?: string | null;
  plaza_situacion_administrativa?: string | null;
  plaza_encargo_cedula?: string | null;
  plaza_encargo_nombre?: string | null;
  plaza_es_encargo?: boolean | null;
  plaza_opec?: string | null;
  plaza_id_escalera?: string | null;
  plaza_peldano_escalera?: number | null;
  plaza_resolucion_manual?: string | null;
  plaza_manual_funciones?: string | null;
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
  titular_cedula?: string | null;
  titular_nombre?: string | null;
  situacion_titular?: string | null;
  encargo_cedula?: string | null;
  encargo_nombre?: string | null;
  es_encargo?: boolean;
  tipo_vinculacion?: string;
  situacion_administrativa?: string;
  opec?: string;
  // Campos de Escalera de Encargo (Columnas Q y R: ID-E y N)
  id_escalera?: string | null;
  peldano_escalera?: number | null;
  // Resoluciones y Manual de Funciones (Columnas AJ, AF y AH)
  resolucion_manual?: string;
  manual_funciones?: string;
  // Situaciones administrativas específicas (Columnas S a V)
  pv?: string | null;
  pp_oe?: string | null;
  vt_lm?: string | null;
  vt_lnr?: string | null;
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
          const listPerno = (mockPernoData as unknown as PersonaPerno[]) || [];
          return data.plazas.map((p: PlazaNomina) => {
            const m = (mockPlazasData as any[]).find((mock) => mock.id_plaza === p.id_plaza);
            let plazaActual: PlazaNomina = {
              ...p,
              id_escalera: p.id_escalera || m?.id_escalera || null,
              peldano_escalera: p.peldano_escalera || m?.peldano_escalera || null,
              encargo_cedula: p.encargo_cedula || m?.encargo_cedula || null,
              encargo_nombre: p.encargo_nombre || m?.encargo_nombre || null,
              es_encargo: p.es_encargo !== undefined ? p.es_encargo : m?.es_encargo,
              opec: p.opec || m?.opec || null,
              situacion_titular: p.situacion_titular || m?.situacion_titular || 'EN PROPIEDAD',
              manual_funciones: p.manual_funciones || m?.manual_funciones || m?.resolucion_manual || null,
              resolucion_manual: p.resolucion_manual || m?.resolucion_manual || m?.manual_funciones || null,
            };

            // Garantía: Si el titular reportado estuviera retirado en PERNO, sustituir por el activo actual o vacante
            const titularCed = plazaActual.titular_cedula ? String(plazaActual.titular_cedula).trim() : null;
            if (titularCed) {
              const perFunc = listPerno.find((per) => String(per.cedula).trim() === titularCed);
              if (perFunc && (perFunc.estado_funcionario === 'R' || perFunc.fecha_retiro)) {
                const activo = plazaActual.id_perno
                  ? listPerno.find((per) => per.posicion_planta === plazaActual.id_perno && per.estado_funcionario === 'A' && !per.fecha_retiro)
                  : null;
                if (activo) {
                  plazaActual.titular_cedula = activo.cedula;
                  plazaActual.titular_nombre = activo.nombre_completo || `${activo.nombres} ${activo.primer_apellido}`;
                  plazaActual.estado_cargo = 'OCUPADO';
                } else {
                  plazaActual.titular_cedula = null;
                  plazaActual.titular_nombre = 'VACANTE DEFINITIVA';
                  plazaActual.estado_cargo = 'VACANTE DEFINITIVA';
                }
              }
            }

            return plazaActual;
          });
        }
      }
    } catch {
      // Fallback local silencioso si la API aún no está disponible
    }

    // Filtrar sobre los datos precargados reales garantizando sólo personal actual
    const listPernoFallback = (mockPernoData as unknown as PersonaPerno[]) || [];
    let result = ((mockPlazasData as unknown as PlazaNomina[]) || []).map((p) => {
      const titularCed = p.titular_cedula ? String(p.titular_cedula).trim() : null;
      if (titularCed) {
        const perFunc = listPernoFallback.find((per) => String(per.cedula).trim() === titularCed);
        if (perFunc && (perFunc.estado_funcionario === 'R' || perFunc.fecha_retiro)) {
          const activo = p.id_perno
            ? listPernoFallback.find((per) => per.posicion_planta === p.id_perno && per.estado_funcionario === 'A' && !per.fecha_retiro)
            : null;
          if (activo) {
            return {
              ...p,
              titular_cedula: activo.cedula,
              titular_nombre: activo.nombre_completo || `${activo.nombres} ${activo.primer_apellido}`,
              estado_cargo: 'OCUPADO',
            };
          } else {
            return {
              ...p,
              titular_cedula: null,
              titular_nombre: 'VACANTE DEFINITIVA',
              estado_cargo: 'VACANTE DEFINITIVA',
            };
          }
        }
      }
      return p;
    });

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

  // Obtener listado de todas las escaleras de encargo agrupadas
  async getEscaleras(busqueda?: string): Promise<EscaleraEncargo[]> {
    try {
      const searchParams = new URLSearchParams();
      if (busqueda) searchParams.append('busqueda', busqueda);
      const url = `${API_URL}/api/nomina/escaleras?${searchParams.toString()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.escaleras) && data.escaleras.length > 0) {
          return data.escaleras;
        }
      }
    } catch {}

    const todas = (mockPlazasData as unknown as PlazaNomina[]) || [];
    const map = new Map<string, PlazaNomina[]>();
    todas.forEach((p) => {
      if (p.id_escalera && String(p.id_escalera).trim()) {
        const key = String(p.id_escalera).trim().toUpperCase();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      }
    });

    let lista: EscaleraEncargo[] = [];
    map.forEach((peldanos, id_escalera) => {
      peldanos.sort((a, b) => (Number(a.peldano_escalera) || 999) - (Number(b.peldano_escalera) || 999));
      lista.push({ id_escalera, total_peldanos: peldanos.length, peldanos });
    });

    lista.sort((a, b) => a.id_escalera.localeCompare(b.id_escalera, undefined, { numeric: true }));

    if (busqueda && busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(
        (e) =>
          e.id_escalera.toLowerCase().includes(q) ||
          e.peldanos.some(
            (p) =>
              (p.cargo && p.cargo.toLowerCase().includes(q)) ||
              (p.titular_nombre && p.titular_nombre.toLowerCase().includes(q)) ||
              (p.encargo_nombre && p.encargo_nombre.toLowerCase().includes(q)) ||
              (p.dependencia_cargo && p.dependencia_cargo.toLowerCase().includes(q)) ||
              (p.id_plaza && p.id_plaza.toString().includes(q))
          )
      );
    }

    return lista;
  },

  // Obtener detalle de una escalera por ID
  async getEscaleraDetalle(idEscalera: string): Promise<EscaleraEncargo | null> {
    try {
      const id = idEscalera.trim().toUpperCase();
      const url = `${API_URL}/api/nomina/escaleras/${id}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.peldanos) {
          return {
            id_escalera: data.id_escalera,
            total_peldanos: data.total_peldanos || data.peldanos.length,
            peldanos: data.peldanos,
          };
        }
      }
    } catch {}

    const todas = (mockPlazasData as unknown as PlazaNomina[]) || [];
    const id = idEscalera.trim().toUpperCase();
    const peldanos = todas
      .filter((p) => p.id_escalera && String(p.id_escalera).trim().toUpperCase() === id)
      .sort((a, b) => (Number(a.peldano_escalera) || 999) - (Number(b.peldano_escalera) || 999));

    if (peldanos.length === 0) return null;
    return { id_escalera: id, total_peldanos: peldanos.length, peldanos };
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

