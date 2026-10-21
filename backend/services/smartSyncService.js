// ============================================================================
// SERVICIO DE SINCRONIZACIÓN AUTOMÁTICA CON SMART SJD
// Conecta con el Sistema Integrado de Gestión SMART de la Secretaría Jurídica Distrital:
// https://smart.secretariajuridica.gov.co/SJD/portal/buscar_documentos.php
// Permite buscar, descargar y actualizar automáticamente las últimas versiones oficiales
// de los formatos y plantillas de Talento Humano y Gestión Documental.
// ============================================================================

const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

const FORMATOS_DIR = path.join(__dirname, '../templates/formatos_rrhh');
const MANIFEST_FILE = path.join(FORMATOS_DIR, 'smart_manifest.json');

if (!fs.existsSync(FORMATOS_DIR)) {
  fs.mkdirSync(FORMATOS_DIR, { recursive: true });
}

function leerManifiesto() {
  try {
    if (fs.existsSync(MANIFEST_FILE)) {
      return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('Error leyendo smart_manifest.json, iniciando nuevo:', e.message);
  }
  return { ultimaSincronizacion: null, formatos: {} };
}

function guardarManifiesto(manifiesto) {
  try {
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifiesto, null, 2), 'utf8');
  } catch (e) {
    console.error('Error guardando smart_manifest.json:', e.message);
  }
}

/**
 * Consulta el buscador público de documentos SMART SJD mediante POST a resultados_busqueda.php
 */
async function consultarDocumentosSmart(filtro = {}, retries = 3) {
  const postData = querystring.stringify({
    proceso: filtro.proceso || '', // '5' es Talento Humano, vacío = todos
    tipo_documento: filtro.tipo_documento || '7', // '7' es Formato
    titulo: filtro.titulo || '',
    codigo: filtro.codigo || '',
    Submit: 'Buscar                                   ',
    opcion_regreso: '1',
  });

  for (let intento = 1; intento <= retries; intento++) {
    try {
      return await new Promise((resolve, reject) => {
        const options = {
          hostname: 'smart.secretariajuridica.gov.co',
          port: 443,
          path: '/SJD/portal/resultados_busqueda.php',
          method: 'POST',
          rejectUnauthorized: false,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            const rows = [];
            const trMatches = data.match(/<tr bgcolor=[\s\S]*?<\/tr>/gi) || [];

            for (const tr of trMatches) {
              const codMatch = tr.match(/<td align="left">([\s\S]*?)<\/td>/i);
              const linkMatch = tr.match(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
              const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];

              if (codMatch && linkMatch && tds.length >= 6) {
                const codigo = codMatch[1].replace(/<!--[\s\S]*?-->/g, '').trim();
                const linkRel = linkMatch[1];
                const titulo = linkMatch[2].trim();
                const proceso = tds[2]?.replace(/<[^>]+>/g, '').trim();
                const tipoDoc = tds[3]?.replace(/<[^>]+>/g, '').trim();
                const fechaVigencia = tds[4]?.replace(/<[^>]+>/g, '').trim();
                const version = tds[5]?.replace(/<[^>]+>/g, '').trim();

                rows.push({
                  codigo,
                  titulo,
                  proceso,
                  tipoDoc,
                  fechaVigencia,
                  version: version || '1',
                  pathDescarga: '/SJD' + linkRel.replace(/^\.\./, ''),
                  urlDescargaCompleta: 'https://smart.secretariajuridica.gov.co/SJD' + linkRel.replace(/^\.\./, ''),
                });
              }
            }
            resolve(rows);
          });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
      });
    } catch (err) {
      if (intento === retries) throw new Error('No se pudo conectar con SMART SJD: ' + err.message);
      await new Promise((r) => setTimeout(r, 600 * intento));
    }
  }
}

/**
 * Descarga el archivo desde el endpoint seguro download.php de SMART
 */
async function descargarArchivoSmart(pathDescarga, fallbackFilename, retries = 3) {
  for (let intento = 1; intento <= retries; intento++) {
    try {
      return await new Promise((resolve, reject) => {
        const options = {
          hostname: 'smart.secretariajuridica.gov.co',
          port: 443,
          path: pathDescarga,
          method: 'GET',
          rejectUnauthorized: false,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        };

        https.get(options, (res) => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Respuesta no exitosa de SMART: HTTP ${res.statusCode}`));
          }

          const disposition = res.headers['content-disposition'] || '';
          let filename = fallbackFilename;
          const matchName = disposition.match(/filename="?([^"]+)"?/i);
          if (matchName && matchName[1]) {
            filename = matchName[1].trim();
          }

          const filePath = path.join(FORMATOS_DIR, filename);
          const fileStream = fs.createWriteStream(filePath);
          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            const stat = fs.statSync(filePath);
            resolve({
              filename,
              filePath,
              sizeBytes: stat.size,
              mimeType: res.headers['content-type'] || 'application/octet-stream',
            });
          });

          fileStream.on('error', reject);
        }).on('error', reject);
      });
    } catch (err) {
      if (intento === retries) throw err;
      await new Promise((r) => setTimeout(r, 600 * intento));
    }
  }
}

/**
 * Compara y verifica si hay formatos que requieran actualización o descarga
 */
async function verificarEstadoFormatos() {
  const manifiesto = leerManifiesto();
  const todosEnSmart = await consultarDocumentosSmart({ tipo_documento: '7' });

  const archivosEnDisco = fs.existsSync(FORMATOS_DIR) ? fs.readdirSync(FORMATOS_DIR) : [];

  const reporte = todosEnSmart.map((doc) => {
    const regManifiesto = manifiesto.formatos[doc.codigo];
    const archivoExiste = regManifiesto
      ? archivosEnDisco.includes(regManifiesto.archivo)
      : archivosEnDisco.some((f) => f.includes(doc.codigo));

    let estado = 'no_descargado';
    if (archivoExiste) {
      if (regManifiesto && regManifiesto.version && regManifiesto.version !== doc.version) {
        estado = 'desactualizado';
      } else {
        estado = 'al_dia';
      }
    }

    return {
      codigo: doc.codigo,
      titulo: doc.titulo,
      proceso: doc.proceso,
      versionPublicada: doc.version,
      fechaVigencia: doc.fechaVigencia,
      versionLocal: regManifiesto?.version || null,
      archivoLocal: regManifiesto?.archivo || null,
      estado,
      pathDescarga: doc.pathDescarga,
    };
  });

  return {
    totalEnSmart: todosEnSmart.length,
    ultimaSincronizacion: manifiesto.ultimaSincronizacion,
    alDia: reporte.filter((r) => r.estado === 'al_dia').length,
    desactualizados: reporte.filter((r) => r.estado === 'desactualizado').length,
    noDescargados: reporte.filter((r) => r.estado === 'no_descargado').length,
    formatos: reporte,
  };
}

/**
 * Ejecuta la sincronización automática de los formatos institucionales de RRHH y Gestión Documental
 */
async function sincronizarFormatos({ codigos = [], soloRelevantes = true } = {}) {
  const manifiesto = leerManifiesto();
  const todosEnSmart = await consultarDocumentosSmart({ tipo_documento: '7' });

  // Lista de formatos prioritarios de RRHH y actos de vinculación/desvinculación
  const codigosPrioritarios = [
    '2311520-FT-018', // Memorando
    '2311520-FT-019', // Oficio / Autorización notificación
    '2311520-FT-130', // Resolución de nombramiento o retiro
    '2311520-FT-244', // Hoja de control y ejecutoria
    '2311300-FT-095', // Requisitos para tomar posesión
    '2311300-FT-100', // Declaración extrajuicio deudas alimentarias REDAM
    '2311300-FT-106', // Ubicación y entrenamiento puesto de trabajo
    '2311300-FT-127', // Acta de Posesión
    '2311300-FT-219', // Entrevista y Evaluación de Retiro
    '2311300-FT-268', // Confidencialidad
    '2311300-FT-318', // Certificado Cumplimiento Requisitos Posesión
    '2311300-FT-319', // Autorización verificación títulos
    '2311300-FT-333', // Acta de informe de gestión y entrega de cargo
    '2311300-FT-436', // Entrega de cargo por ausencia temporal o retiro definitivo
  ];

  const formatosAProcesar = todosEnSmart.filter((f) => {
    if (codigos.length > 0) {
      return codigos.some((c) => f.codigo.includes(c));
    }
    if (soloRelevantes) {
      return codigosPrioritarios.some((cp) => f.codigo.includes(cp)) || f.proceso.includes('TALENTO HUMANO');
    }
    return true;
  });

  const resultados = {
    procesados: 0,
    actualizados: 0,
    nuevos: 0,
    sinCambios: 0,
    errores: 0,
    detalles: [],
  };

  const archivosEnDisco = fs.existsSync(FORMATOS_DIR) ? fs.readdirSync(FORMATOS_DIR) : [];

  for (const doc of formatosAProcesar) {
    resultados.procesados++;
    const regPrevio = manifiesto.formatos[doc.codigo];
    const yaExiste = regPrevio && archivosEnDisco.includes(regPrevio.archivo);
    const versionCambio = yaExiste && regPrevio.version !== doc.version;

    if (yaExiste && !versionCambio) {
      resultados.sinCambios++;
      resultados.detalles.push({
        codigo: doc.codigo,
        titulo: doc.titulo,
        version: doc.version,
        archivo: regPrevio.archivo,
        accion: 'al_dia',
      });
      continue;
    }

    try {
      // Pequeña pausa respetuosa de 400ms para evitar corte TLS por rate limiting del servidor SMART
      await new Promise((r) => setTimeout(r, 400));

      const extensionSugerida = doc.titulo.toLowerCase().includes('matriz') || doc.titulo.toLowerCase().includes('tabla') ? '.xlsx' : '.docx';
      const fallbackNombre = `${doc.codigo} ${doc.titulo.replace(/[/\\?%*:|"<>]/g, '')}_V${doc.version}${extensionSugerida}`;

      const descarga = await descargarArchivoSmart(doc.pathDescarga, fallbackNombre);

      manifiesto.formatos[doc.codigo] = {
        codigo: doc.codigo,
        titulo: doc.titulo,
        version: doc.version,
        fechaVigencia: doc.fechaVigencia,
        proceso: doc.proceso,
        archivo: descarga.filename,
        sizeBytes: descarga.sizeBytes,
        fechaDescarga: new Date().toISOString(),
      };

      if (versionCambio) {
        resultados.actualizados++;
        resultados.detalles.push({
          codigo: doc.codigo,
          titulo: doc.titulo,
          versionAnterior: regPrevio.version,
          versionNueva: doc.version,
          archivo: descarga.filename,
          accion: 'actualizado',
        });
      } else {
        resultados.nuevos++;
        resultados.detalles.push({
          codigo: doc.codigo,
          titulo: doc.titulo,
          version: doc.version,
          archivo: descarga.filename,
          accion: 'nuevo_descargado',
        });
      }
    } catch (err) {
      resultados.errores++;
      resultados.detalles.push({
        codigo: doc.codigo,
        titulo: doc.titulo,
        error: err.message,
        accion: 'error',
      });
    }
  }

  manifiesto.ultimaSincronizacion = new Date().toISOString();
  guardarManifiesto(manifiesto);

  return resultados;
}

module.exports = {
  consultarDocumentosSmart,
  verificarEstadoFormatos,
  sincronizarFormatos,
  FORMATOS_DIR,
};
