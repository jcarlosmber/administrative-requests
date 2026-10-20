// ============================================================================
// SERVICIO DE PERSISTENCIA SEGURA Y GESTIÓN DE CUOTA PARA CASOS RRHH
// Resuelve el error de QuotaExceededError en localStorage (límite de ~5MB en Web)
// Purgando claves obsoletas, sanitizando URIs pesadas (base64) y respaldando en IndexedDB.
// ============================================================================

import { Platform } from 'react-native';
import { guardarArchivoEnIndexedDB } from './storageAdjuntosIndexedDB';

export const STORAGE_KEY_CASOS = 'rrhh_vinculaciones_casos_v7';
export const STORAGE_KEY_CASO_ACTIVO = 'rrhh_vinculaciones_caso_activo_v5';

// Base de datos IndexedDB para respaldo ilimitado de casos
const IDB_CASOS_DB_NAME = 'SASGE_RRHH_CASOS_BACKUP';
const IDB_CASOS_STORE = 'casos_completos';
const IDB_CASOS_VERSION = 1;

let idbCasosPromise: Promise<IDBDatabase> | null = null;

function getIdbCasos(): Promise<IDBDatabase> | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }
  if (idbCasosPromise) return idbCasosPromise;

  idbCasosPromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(IDB_CASOS_DB_NAME, IDB_CASOS_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_CASOS_STORE)) {
          db.createObjectStore(IDB_CASOS_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e: any) => resolve(e.target.result);
      request.onerror = (e: any) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });

  return idbCasosPromise;
}

/**
 * Guarda una copia de respaldo completa de todos los casos en IndexedDB.
 * IndexedDB no tiene el límite restrictivo de 5MB de localStorage.
 */
export async function respaldarCasosEnIndexedDB(casos: any[]): Promise<void> {
  try {
    const dbPromise = getIdbCasos();
    if (!dbPromise) return;
    const db = await dbPromise;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_CASOS_STORE, 'readwrite');
      const store = tx.objectStore(IDB_CASOS_STORE);
      // Guardar el paquete completo bajo la clave 'lista_actual'
      const req = store.put({ id: 'lista_actual', casos, fechaActualizacion: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[storageCasosRRHH] No fue posible respaldar en IndexedDB:', err);
  }
}

/**
 * Recupera el respaldo de casos desde IndexedDB si localStorage se perdió o vació.
 */
export async function recuperarCasosDeIndexedDB(): Promise<any[] | null> {
  try {
    const dbPromise = getIdbCasos();
    if (!dbPromise) return null;
    const db = await dbPromise;

    return await new Promise<any[] | null>((resolve, reject) => {
      const tx = db.transaction(IDB_CASOS_STORE, 'readonly');
      const store = tx.objectStore(IDB_CASOS_STORE);
      const req = store.get('lista_actual');
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.casos)) {
          resolve(req.result.casos);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[storageCasosRRHH] Error recuperando casos de IndexedDB:', err);
    return null;
  }
}

/**
 * Purga de localStorage versiones viejas acumuladas que consumen la cuota de 5MB
 */
export function purgarClavesObsoletasLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const totalKeys = window.localStorage.length;
    const keysABorrar: string[] = [];

    for (let i = 0; i < totalKeys; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;

      // Borrar versiones viejas de casos vinculaciones (v1 a v6)
      if (k.startsWith('rrhh_vinculaciones_casos_') && k !== STORAGE_KEY_CASOS) {
        keysABorrar.push(k);
      }
      // Borrar versiones viejas de caso activo (v1 a v4)
      if (k.startsWith('rrhh_vinculaciones_caso_activo_') && k !== STORAGE_KEY_CASO_ACTIVO) {
        keysABorrar.push(k);
      }
      // Borrar claves legacy sueltas
      if (k === 'rrhh_vinculaciones_caso_activo' || k === 'rrhh_vinculaciones_casos') {
        keysABorrar.push(k);
      }
    }

    keysABorrar.forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {}
    });
  } catch (e) {
    console.warn('[storageCasosRRHH] Error purgando claves obsoletas:', e);
  }
}

/**
 * Sanitiza los casos eliminando datos masivos que no deben vivir en localStorage:
 * 1. Base64 de archivos adjuntos (los transfiere a IndexedDB si es necesario y los limpia de la copia local).
 * 2. Recortes de listas redundantes en resultados SECOP extensos.
 */
export function sanitizarCasosParaStorage(casos: any[]): any[] {
  if (!Array.isArray(casos)) return [];

  return casos.map((c) => {
    let casoModificado = { ...c };

    // 1. Sanitizar etapas y documentos adjuntos
    if (Array.isArray(casoModificado.etapas)) {
      casoModificado.etapas = casoModificado.etapas.map((etapa: any) => {
        if (!Array.isArray(etapa.requisitos)) return etapa;

        const nuevosRequisitos = etapa.requisitos.map((req: any) => {
          if (!Array.isArray(req.documentosAdjuntos) || req.documentosAdjuntos.length === 0) {
            return req;
          }

          const docsSanitizados = req.documentosAdjuntos.map((doc: any) => {
            // Si el documento tiene un Data URL base64 largo, se respalda en IndexedDB y se aligera
            if (typeof doc.uri === 'string' && doc.uri.startsWith('data:') && doc.uri.length > 200) {
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                guardarArchivoEnIndexedDB(
                  doc.id,
                  doc.nombre,
                  doc.mimeType,
                  doc.size,
                  doc.uri
                ).catch(() => {});
              }
              return {
                ...doc,
                uri: '', // Vaciamos el base64 de localStorage; se recuperará de IndexedDB
              };
            }
            return doc;
          });

          return {
            ...req,
            documentosAdjuntos: docsSanitizados,
          };
        });

        return {
          ...etapa,
          requisitos: nuevosRequisitos,
        };
      });
    }

    // 2. Aligerar resultadoSecop si contiene arreglos masivos de contratos
    if (casoModificado.resultadoSecop) {
      const secop = { ...casoModificado.resultadoSecop };
      // Limitar todosContratos y finalizados a máximo 5 para no reventar storage
      if (Array.isArray(secop.todosContratos) && secop.todosContratos.length > 5) {
        secop.todosContratos = secop.todosContratos.slice(0, 5);
      }
      if (Array.isArray(secop.contratosActivosFinalizados) && secop.contratosActivosFinalizados.length > 5) {
        secop.contratosActivosFinalizados = secop.contratosActivosFinalizados.slice(0, 5);
      }
      casoModificado.resultadoSecop = secop;
    }

    return casoModificado;
  });
}

/**
 * Guarda los casos en localStorage con tolerancia completa a fallos de cuota:
 * - Purga claves viejas
 * - Sanitiza y comprime
 * - Respalda en IndexedDB
 * - NUNCA arroja excepciones que detengan la experiencia de usuario
 */
export function guardarCasosEnStorage(casos: any[]): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true;

  try {
    purgarClavesObsoletasLocalStorage();
    const casosLigeros = sanitizarCasosParaStorage(casos);
    const jsonStr = JSON.stringify(casosLigeros);

    try {
      window.localStorage.setItem(STORAGE_KEY_CASOS, jsonStr);
      // Respaldar asíncronamente en IndexedDB sin bloquear
      respaldarCasosEnIndexedDB(casos).catch(() => {});
      return true;
    } catch (quotaError: any) {
      console.warn('[storageCasosRRHH] Alerta de cuota excedida. Aplicando compresión agresiva...', quotaError);

      // Intento 2: Limpieza de emergencia de claves viejas y recorte de secop
      purgarClavesObsoletasLocalStorage();

      const casosUltraLigeros = casosLigeros.map((c) => {
        if (!c.resultadoSecop) return c;
        const copiaSecop = { ...c.resultadoSecop };
        delete copiaSecop.todosContratos;
        delete copiaSecop.contratosActivosFinalizados;
        return { ...c, resultadoSecop: copiaSecop };
      });

      try {
        window.localStorage.setItem(STORAGE_KEY_CASOS, JSON.stringify(casosUltraLigeros));
        respaldarCasosEnIndexedDB(casos).catch(() => {});
        return true;
      } catch (err2) {
        // Intento 3: Guardar los 50 casos más recientes para garantizar operatividad inmediata
        console.warn('[storageCasosRRHH] Guardando ventana de casos recientes en localStorage:', err2);
        try {
          const ventanaCasos = casosUltraLigeros.slice(0, 50);
          window.localStorage.setItem(STORAGE_KEY_CASOS, JSON.stringify(ventanaCasos));
          respaldarCasosEnIndexedDB(casos).catch(() => {});
          return true;
        } catch (err3) {
          console.warn('[storageCasosRRHH] localStorage lleno al 100%. Preservando en memoria e IndexedDB:', err3);
          respaldarCasosEnIndexedDB(casos).catch(() => {});
          return false;
        }
      }
    }
  } catch (generalError) {
    console.warn('[storageCasosRRHH] Error inesperado en guardarCasosEnStorage:', generalError);
    return false;
  }
}

/**
 * Guarda el ID del caso activo seleccionado sin romper por cuota
 */
export function guardarCasoActivoEnStorage(casoId: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !casoId) return;
  try {
    window.localStorage.setItem(STORAGE_KEY_CASO_ACTIVO, casoId);
  } catch (e) {
    console.warn('[storageCasosRRHH] Error guardando caso activo:', e);
  }
}

/**
 * Obtiene los casos desde localStorage de forma segura
 */
export function obtenerCasosDeStorage(): any[] | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    purgarClavesObsoletasLocalStorage();
    const raw = window.localStorage.getItem(STORAGE_KEY_CASOS);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch (e) {
    console.warn('[storageCasosRRHH] Error leyendo casos de localStorage:', e);
    return null;
  }
}
