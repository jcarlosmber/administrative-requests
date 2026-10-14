import { API_URL } from './supabase';
import manualesData from './manualesIndex.json';

export interface ManualCargoInfo {
  id_sideap: number;
  cargo: string;
  codigo: string;
  grado: string;
  archivo: string;
}

export const CATALOGO_MANUALES: ManualCargoInfo[] = manualesData as ManualCargoInfo[];

// Mapas de búsqueda rápida
const manualesPorSideap = new Map<number, ManualCargoInfo>();
const manualesPorClave = new Map<string, ManualCargoInfo>();

// Normalizar texto para búsquedas flexibles
function normalizarTexto(txt: string): string {
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

CATALOGO_MANUALES.forEach((item) => {
  manualesPorSideap.set(item.id_sideap, item);
  const clave = `${normalizarTexto(item.cargo)}_${item.codigo}_${item.grado}`;
  manualesPorClave.set(clave, item);
});

/**
 * Obtiene la URL pública / endpoint de visualización inline del manual de funciones.
 */
export function obtenerUrlManual(id_sideap?: number | string | null, archivo?: string | null): string {
  if (id_sideap != null && !isNaN(Number(id_sideap))) {
    return `${API_URL}/api/nomina/manuales/${Number(id_sideap)}`;
  }
  if (archivo) {
    return `${API_URL}/api/nomina/manuales/archivo/${encodeURIComponent(archivo)}`;
  }
  return '';
}

/**
 * Obtiene la URL estática alternativa (carpeta public) para web.
 */
export function obtenerUrlManualEstatica(archivo?: string | null): string {
  if (!archivo) return '';
  return `/manuales/${encodeURIComponent(archivo)}`;
}

/**
 * Busca el manual de funciones más adecuado a partir del ID SIDEAP, o por cargo, código y grado.
 */
export function buscarManualCargo(params: {
  id_sideap?: number | string | null;
  cargo?: string | null;
  codigo?: string | null;
  grado?: string | null;
}): (ManualCargoInfo & { url: string; urlEstatica: string }) | null {
  // 1. Búsqueda por ID SIDEAP (prioritaria y exacta)
  if (params.id_sideap != null) {
    const num = Number(params.id_sideap);
    if (!isNaN(num) && manualesPorSideap.has(num)) {
      const info = manualesPorSideap.get(num)!;
      return {
        ...info,
        url: obtenerUrlManual(info.id_sideap, info.archivo),
        urlEstatica: obtenerUrlManualEstatica(info.archivo)
      };
    }
  }

  // 2. Búsqueda por clave (cargo + código + grado)
  if (params.cargo && params.codigo && params.grado) {
    const clave = `${normalizarTexto(params.cargo)}_${String(params.codigo).trim()}_${String(params.grado).trim()}`;
    if (manualesPorClave.has(clave)) {
      const info = manualesPorClave.get(clave)!;
      return {
        ...info,
        url: obtenerUrlManual(info.id_sideap, info.archivo),
        urlEstatica: obtenerUrlManualEstatica(info.archivo)
      };
    }
  }

  // 3. Búsqueda por coincidencia de cargo y código
  if (params.cargo) {
    const cargoNorm = normalizarTexto(params.cargo);
    const coincidencia = CATALOGO_MANUALES.find((m) => {
      const matchCargo = normalizarTexto(m.cargo) === cargoNorm || cargoNorm.includes(normalizarTexto(m.cargo)) || normalizarTexto(m.cargo).includes(cargoNorm);
      const matchCod = params.codigo ? String(m.codigo) === String(params.codigo).trim() : true;
      const matchGrado = params.grado ? String(m.grado) === String(params.grado).trim() : true;
      return matchCargo && matchCod && matchGrado;
    }) || CATALOGO_MANUALES.find((m) => {
      return normalizarTexto(m.cargo) === cargoNorm;
    });

    if (coincidencia) {
      return {
        ...coincidencia,
        url: obtenerUrlManual(coincidencia.id_sideap, coincidencia.archivo),
        urlEstatica: obtenerUrlManualEstatica(coincidencia.archivo)
      };
    }
  }

  return null;
}
