// ============================================================================
// SERVICIO DE ALMACENAMIENTO PERSISTENTE DE DOCUMENTOS EN INDEXEDDB (WEB)
// Permite guardar archivos (PDF, Excel, Word, imágenes) en la base de datos
// local del navegador sin límite de tamaño de localStorage y sin que se borren al recargar (F5)
// ============================================================================

import { Platform } from 'react-native';

const DB_NAME = 'SASGE_RRHH_EXPEDIENTES';
const DB_VERSION = 1;
const STORE_NAME = 'documentos_adjuntos';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no está disponible en este entorno'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });

  return dbPromise;
}

export interface RegistroArchivoPersistente {
  id: string;
  nombre: string;
  mimeType?: string;
  size?: number;
  dataUrl: string;
  fechaSubida: string;
}

/**
 * Convierte un asset de Expo DocumentPicker (File, Blob o URI) a Data URL Base64
 */
export async function assetADataUrl(asset: any): Promise<string> {
  if (typeof window === 'undefined') return asset.uri || '';

  // 1. Si Expo Web adjuntó el objeto File nativo del input
  if (asset.file instanceof Blob || asset.file instanceof File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(asset.file);
    });
  }

  // 2. Si ya es Data URL
  if (typeof asset.uri === 'string' && asset.uri.startsWith('data:')) {
    return asset.uri;
  }

  // 3. Si es un blob: URL o recurso local accesible
  if (typeof asset.uri === 'string' && asset.uri.startsWith('blob:')) {
    try {
      const resp = await fetch(asset.uri);
      const blob = await resp.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('No se pudo convertir blob a DataUrl:', e);
      return asset.uri;
    }
  }

  return asset.uri || '';
}

/**
 * Guarda un archivo adjunto completo en IndexedDB
 */
export async function guardarArchivoEnIndexedDB(
  id: string,
  nombre: string,
  mimeType: string | undefined,
  size: number | undefined,
  dataUrl: string
): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.indexedDB) {
    return;
  }

  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const registro: RegistroArchivoPersistente = {
        id,
        nombre,
        mimeType: mimeType || 'application/octet-stream',
        size,
        dataUrl,
        fechaSubida: new Date().toISOString(),
      };
      const req = store.put(registro);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error al guardar documento en IndexedDB:', err);
  }
}

/**
 * Recupera un archivo guardado en IndexedDB por su ID
 */
export async function obtenerArchivoDeIndexedDB(id: string): Promise<RegistroArchivoPersistente | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  try {
    const db = await getDB();
    return await new Promise<RegistroArchivoPersistente | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error al recuperar archivo de IndexedDB:', err);
    return null;
  }
}

/**
 * Elimina un archivo de IndexedDB
 */
export async function eliminarArchivoDeIndexedDB(id: string): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.indexedDB) {
    return;
  }

  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error al eliminar archivo de IndexedDB:', err);
  }
}

/**
 * Convierte un Data URL a Blob nativo del navegador
 */
function dataUrlABlob(dataUrl: string, defaultMime = 'application/octet-stream'): Blob {
  const partes = dataUrl.split(',');
  const header = partes[0] || '';
  const matchMime = header.match(/:(.*?);/);
  const mime = matchMime ? matchMime[1] : defaultMime;

  const bstr = atob(partes[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function descargarBlob(blob: Blob, nombreArchivo: string) {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/**
 * Abre o descarga el archivo adjunto de manera garantizada tras recargar la página
 */
export async function abrirODescargarArchivoAdjunto(
  doc: {
    id: string;
    nombre: string;
    uri?: string;
    mimeType?: string;
  },
  onErrorModal?: (msg: string) => void
): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    let dataUrl = '';

    // 1. Buscar en IndexedDB
    try {
      const enDB = await obtenerArchivoDeIndexedDB(doc.id);
      if (enDB && enDB.dataUrl) {
        dataUrl = enDB.dataUrl;
      }
    } catch (e) {
      console.warn('Error leyendo de IndexedDB:', e);
    }

    if (!dataUrl && doc.uri && doc.uri.startsWith('data:')) {
      dataUrl = doc.uri;
    }

    // Si tenemos Data URL persistente, creamos Blob fresco
    if (dataUrl) {
      const blob = dataUrlABlob(dataUrl, doc.mimeType);
      const freshBlobUrl = URL.createObjectURL(blob);

      const mime = doc.mimeType || '';
      const esPrevisualizable = mime.includes('pdf') || mime.startsWith('image/') || doc.nombre.toLowerCase().endsWith('.pdf');

      if (esPrevisualizable) {
        const nuevaVentana = window.open(freshBlobUrl, '_blank');
        if (!nuevaVentana) {
          descargarBlob(blob, doc.nombre);
        }
      } else {
        descargarBlob(blob, doc.nombre);
      }
      return;
    }

    // 2. Si no hay dataUrl pero hay uri (ej. URL remota http o https)
    if (doc.uri && (doc.uri.startsWith('http://') || doc.uri.startsWith('https://'))) {
      window.open(doc.uri, '_blank');
      return;
    }

    // 3. Fallback
    if (onErrorModal) {
      onErrorModal(`El archivo "${doc.nombre}" no contiene contenido recuperable.`);
    }
  }
}

/**
 * Obtiene la URL resoluble (Blob URL o HTTP) de un documento persistido para visor en Modal
 */
export async function resolverUrlArchivoAdjunto(doc: {
  id: string;
  nombre: string;
  uri?: string;
  mimeType?: string;
}): Promise<{ url: string; mimeType: string; esPrevisualizable: boolean } | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    let dataUrl = '';

    try {
      const enDB = await obtenerArchivoDeIndexedDB(doc.id);
      if (enDB && enDB.dataUrl) {
        dataUrl = enDB.dataUrl;
      }
    } catch (e) {
      console.warn('Error leyendo de IndexedDB:', e);
    }

    if (!dataUrl && doc.uri && doc.uri.startsWith('data:')) {
      dataUrl = doc.uri;
    }

    if (dataUrl) {
      const matchMime = dataUrl.substring(0, 50).match(/:(.*?);/);
      const mime = doc.mimeType || (matchMime ? matchMime[1] : 'application/octet-stream');
      const blob = dataUrlABlob(dataUrl, mime);
      const freshBlobUrl = URL.createObjectURL(blob);
      const esPrevisualizable =
        mime.includes('pdf') ||
        mime.startsWith('image/') ||
        doc.nombre.toLowerCase().endsWith('.pdf') ||
        /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.nombre);

      return {
        url: freshBlobUrl,
        mimeType: mime,
        esPrevisualizable,
      };
    }

    if (doc.uri && (doc.uri.startsWith('http://') || doc.uri.startsWith('https://') || doc.uri.startsWith('blob:'))) {
      const mime = doc.mimeType || (doc.nombre.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
      return {
        url: doc.uri,
        mimeType: mime,
        esPrevisualizable: mime.includes('pdf') || mime.startsWith('image/') || doc.nombre.toLowerCase().endsWith('.pdf'),
      };
    }
  }

  return null;
}

/**
 * Descarga directamente un archivo a través de su Blob o URL
 */
export function descargarArchivoDirecto(url: string, nombreArchivo: string) {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

