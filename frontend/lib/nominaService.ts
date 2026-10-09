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
  edad?: number;
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
  fecha_vacancia?: string;
  fecha_reporte_simo?: string;
  proceso_seleccion_simo?: string;
  notas_peticion?: string;
}

export interface CatalogoOPEC {
  opec: string;
  cargo: string;
  codigo: string;
  grado: string;
  nivel: string;
  total_plazas: number;
  vacantes_definitivas: number;
  ocupadas: number;
}

export interface CargoPlanta {
  cargo: string;
  codigo: string;
  grado: string;
  nivel: string;
  total_plazas: number;
  vacantes_definitivas: number;
  opecs_asociadas: string[];
}

export interface ResultadoPeticionOPEC {
  success: boolean;
  encontrado: boolean;
  mensaje?: string;
  opec_buscada?: string;
  opec_encontrada_en_planta?: boolean;
  identificacion?: {
    cargo: string;
    codigo: string;
    grado: string;
    nivel: string;
  };
  conteo?: {
    total_empleos: number;
    vacantes_definitivas: number;
    vacantes_temporales: number;
    carrera: number;
    periodo_prueba: number;
    encargo: number;
    provisional: number;
    libre_nombramiento: number;
  };
  literales?: {
    a_denominacion: string;
    b_codigo: string;
    c_grado: string;
    d_dependencias: string;
    d_dependencias_array: Array<{ dependencia: string; cantidad: number }>;
    e_numero_empleos: string;
    f_vacantes_definitivas: string;
    g_fecha_vacancia: string;
    h_situacion_administrativa: string;
    i_reporte_simo: string;
  };
  oficio_borrador?: string;
  plazas?: Array<PlazaNomina & {
    fecha_vacancia?: string;
    fecha_reporte_simo?: string;
    proceso_seleccion_simo?: string;
    notas_peticion?: string;
  }>;
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

export interface FiltrosPlazasNomina {
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
}

// Helper para comprobar coincidencia flexible de Código y Grado (normalizando ceros a la izquierda y soportando múltiples selecciones con comas o arrays)
export function coincideCodigoGrado(
  plaza: { codigo?: string | number | null; grado?: string | number | null },
  filtro?: string | string[] | null
): boolean {
  if (!filtro) return true;
  if (Array.isArray(filtro)) {
    if (filtro.length === 0 || filtro.includes('TODOS')) return true;
    return filtro.some((item) => coincideCodigoGrado(plaza, item));
  }
  const fTrim = filtro.trim();
  if (!fTrim || fTrim === 'TODOS') return true;

  // Si vienen múltiples códigos y grados separados por comas
  if (fTrim.includes(',')) {
    const items = fTrim.split(',').map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) return true;
    return items.some((item) => coincideCodigoGrado(plaza, item));
  }

  const codPlaza = String(plaza.codigo ?? '').trim();
  const graPlaza = String(plaza.grado ?? '').trim();

  // Si el filtro viene en formato COD-GRA con guión
  if (fTrim.includes('-')) {
    const parts = fTrim.split('-');
    const fCod = parts[0].trim();
    const fGra = parts[1].trim();

    const codMatch =
      codPlaza.toLowerCase() === fCod.toLowerCase() ||
      codPlaza.replace(/^0+/, '') === fCod.replace(/^0+/, '');
    const graMatch =
      graPlaza.toLowerCase() === fGra.toLowerCase() ||
      graPlaza.replace(/^0+/, '') === fGra.replace(/^0+/, '');

    return codMatch && graMatch;
  }

  // Si viene solo un término (ej. "115" o "6" o "06")
  const fLtrim = fTrim.replace(/^0+/, '');
  const codMatch = codPlaza.toLowerCase() === fTrim.toLowerCase() || (fLtrim !== '' && codPlaza.replace(/^0+/, '') === fLtrim);
  const graMatch = graPlaza.toLowerCase() === fTrim.toLowerCase() || (fLtrim !== '' && graPlaza.replace(/^0+/, '') === fLtrim);
  const compMatch = `${codPlaza}-${graPlaza}`.toLowerCase().includes(fTrim.toLowerCase());

  return codMatch || graMatch || compMatch;
}

// Función pura de filtrado defensivo aplicable a cualquier colección de plazas
export function aplicarFiltrosPlazas(plazas: PlazaNomina[], filtros?: FiltrosPlazasNomina): PlazaNomina[] {
  if (!filtros) return plazas;
  let result = plazas;

  if (filtros.busqueda && filtros.busqueda.trim()) {
    const q = filtros.busqueda.trim().toLowerCase();
    result = result.filter(
      (p) =>
        (p.cargo && p.cargo.toLowerCase().includes(q)) ||
        (p.titular_nombre && p.titular_nombre.toLowerCase().includes(q)) ||
        (p.titular_cedula && p.titular_cedula.toString().includes(q)) ||
        (p.encargo_nombre && p.encargo_nombre.toLowerCase().includes(q)) ||
        (p.encargo_cedula && p.encargo_cedula.toString().includes(q)) ||
        (p.dependencia_cargo && p.dependencia_cargo.toLowerCase().includes(q)) ||
        (p.dependencia_funcional && p.dependencia_funcional.toLowerCase().includes(q)) ||
        (p.codigo && p.codigo.toString().toLowerCase().includes(q)) ||
        (p.grado && p.grado.toString().toLowerCase().includes(q)) ||
        (`${p.codigo || ''}-${p.grado || ''}`.toLowerCase().includes(q)) ||
        (p.id_plaza && p.id_plaza.toString().includes(q)) ||
        (p.id_sideap && p.id_sideap.toString().includes(q)) ||
        (p.id_perno && p.id_perno.toString().includes(q)) ||
        (p.situacion_administrativa && p.situacion_administrativa.toLowerCase().includes(q)) ||
        (p.situacion_titular && p.situacion_titular.toLowerCase().includes(q)) ||
        (p.tipo_vinculacion && p.tipo_vinculacion.toLowerCase().includes(q))
    );
  }

  if (filtros.nivel && filtros.nivel !== 'TODOS') {
    const nivFiltro = filtros.nivel.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    result = result.filter((p) => {
      const pNiv = (p.nivel || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return pNiv === nivFiltro;
    });
  }

  if (filtros.estado && filtros.estado !== 'TODOS') {
    result = result.filter((p) => (p.estado_cargo || '').toUpperCase() === filtros.estado?.toUpperCase());
  }

  if (filtros.dependencia && filtros.dependencia !== 'TODAS') {
    const depQ = filtros.dependencia.trim().toLowerCase();
    result = result.filter(
      (p) =>
        (p.dependencia_cargo && p.dependencia_cargo.toLowerCase().includes(depQ)) ||
        (p.dependencia_funcional && p.dependencia_funcional.toLowerCase().includes(depQ))
    );
  }

  if (filtros.cargo && filtros.cargo !== 'TODOS') {
    const carQ = filtros.cargo.trim().toLowerCase();
    result = result.filter((p) => (p.cargo || '').trim().toLowerCase() === carQ);
  }

  if (filtros.codigo_grado && filtros.codigo_grado.trim() && filtros.codigo_grado !== 'TODOS') {
    result = result.filter((p) => coincideCodigoGrado(p, filtros.codigo_grado));
  }

  if (filtros.situacion && filtros.situacion.trim() && filtros.situacion !== 'TODAS') {
    const sitQuery = filtros.situacion.trim().toLowerCase();
    result = result.filter(
      (p) =>
        (p.situacion_administrativa && p.situacion_administrativa.toLowerCase().includes(sitQuery)) ||
        (p.situacion_titular && p.situacion_titular.toLowerCase().includes(sitQuery)) ||
        (p.tipo_vinculacion && p.tipo_vinculacion.toLowerCase().includes(sitQuery))
    );
  }

  if (filtros.id_sieap && filtros.id_sieap.trim() && filtros.id_sieap !== 'TODOS') {
    const sieapQuery = filtros.id_sieap.trim();
    result = result.filter((p) => p.id_sideap != null && p.id_sideap.toString() === sieapQuery);
  }

  if (filtros.id_perno && filtros.id_perno.trim() && filtros.id_perno !== 'TODOS') {
    const pernoQuery = filtros.id_perno.trim();
    result = result.filter((p) => p.id_perno != null && p.id_perno.toString() === pernoQuery);
  }

  if (filtros.solo_encargo) {
    result = result.filter(
      (p) => p.es_encargo === true || (p.encargo_cedula && p.encargo_cedula.toString().trim() !== '')
    );
  }

  return result;
}

export const nominaService = {
  // Obtener listado de plazas
  async getPlazas(filtros?: FiltrosPlazasNomina): Promise<PlazaNomina[]> {
    try {
      const searchParams = new URLSearchParams();
      if (filtros?.busqueda) searchParams.append('busqueda', filtros.busqueda);
      if (filtros?.nivel && filtros.nivel !== 'TODOS') searchParams.append('nivel', filtros.nivel);
      if (filtros?.estado && filtros.estado !== 'TODOS') searchParams.append('estado', filtros.estado);
      if (filtros?.dependencia && filtros.dependencia !== 'TODAS') searchParams.append('dependencia', filtros.dependencia);
      if (filtros?.cargo && filtros.cargo !== 'TODOS') searchParams.append('cargo', filtros.cargo);
      if (filtros?.id_sieap && filtros.id_sieap !== 'TODOS') searchParams.append('id_sieap', filtros.id_sieap);
      if (filtros?.codigo_grado && filtros.codigo_grado !== 'TODOS') searchParams.append('codigo_grado', filtros.codigo_grado);
      if (filtros?.situacion && filtros.situacion !== 'TODAS') searchParams.append('situacion', filtros.situacion);
      if (filtros?.id_perno && filtros.id_perno !== 'TODOS') searchParams.append('id_perno', filtros.id_perno);
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
          const plazasProcesadas = data.plazas.map((p: PlazaNomina) => {
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

            return plazaActual;
          });

          return aplicarFiltrosPlazas(plazasProcesadas, filtros);
        }
      }
    } catch {
      // Fallback local silencioso si la API aún no está disponible
    }

    // Retornar datos precargados reales aplicando filtros
    const result = ((mockPlazasData as unknown as PlazaNomina[]) || []);
    return aplicarFiltrosPlazas(result, filtros);
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

  // Subir Libro Completo: Nómina Integral (PLANTA SJD + PLANTA PERNO)
  async uploadCompleto(file: { uri: string; name: string; type?: string; file?: any }): Promise<{
    success: boolean;
    mensaje: string;
    planta?: {
      sheetName: string;
      rowHeader: number;
      procesados: number;
      actualizados: number;
      filasOmitidas?: number;
      advertencias?: string[];
    };
    perno?: {
      sheetName: string;
      rowHeader: number;
      procesados: number;
      actualizados: number;
      retiradosOSinPlaza?: number;
      advertencias?: string[];
    };
    registros_actualizados?: number;
    registros_procesados?: number;
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

      const res = await fetch(`${API_URL}/api/nomina/upload-completo`, {
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

  // =========================================================================
  // MÓDULO: ASISTENTE DE DERECHOS DE PETICIÓN (OPEC Y EMPLEOS EQUIVALENTES)
  // =========================================================================

  async listarOpecsDisponibles(): Promise<{ opecs: CatalogoOPEC[]; cargos_planta: CargoPlanta[] }> {
    try {
      const res = await fetch(`${API_URL}/api/nomina/peticiones-opec/lista-opecs`);
      const data = await res.json();
      return { opecs: data.opecs || [], cargos_planta: data.cargos_planta || [] };
    } catch (e) {
      console.warn('Error al listar OPECs para peticiones:', e);
      return { opecs: [], cargos_planta: [] };
    }
  },

  async consultarPeticionOPEC(params: {
    opec?: string;
    codigo?: string;
    grado?: string;
    cargo?: string;
    peticionario?: string;
    radicado?: string;
  }): Promise<ResultadoPeticionOPEC> {
    const sp = new URLSearchParams();
    if (params.opec) sp.append('opec', params.opec.trim());
    if (params.codigo) sp.append('codigo', params.codigo.trim());
    if (params.grado) sp.append('grado', params.grado.trim());
    if (params.cargo) sp.append('cargo', params.cargo.trim());
    if (params.peticionario) sp.append('peticionario', params.peticionario.trim());
    if (params.radicado) sp.append('radicado', params.radicado.trim());

    const res = await fetch(`${API_URL}/api/nomina/peticiones-opec/consultar?${sp.toString()}`);
    return await res.json();
  },

  async actualizarPlazaPeticion(
    id_plaza: number,
    data: {
      fecha_vacancia?: string;
      fecha_reporte_simo?: string;
      proceso_seleccion_simo?: string;
      opec?: string;
      notas_peticion?: string;
    }
  ): Promise<{ success: boolean; mensaje?: string; error?: string }> {
    const res = await fetch(`${API_URL}/api/nomina/peticiones-opec/plaza/${id_plaza}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  },
};

