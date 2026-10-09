const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const geminiIngresosService = require('../services/geminiIngresosService');
const timeCalculatorService = require('../services/timeCalculatorService');
const excelReportService = require('../services/excelReportService');
const iduTramosService = require('../services/iduTramosService');

// Directorio base para almacenamiento de archivos PDF de ingresos
const UPLOADS_DIR = path.join(__dirname, '../uploads/ingresos');
if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) {}
}
const CACHE_DIR = path.join(UPLOADS_DIR, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
  try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (e) {}
}

const guardarArchivoEnDisco = (folder, nombre, base64Data) => {
  try {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    const cleanBase64 = base64Data.includes(';base64,') ? base64Data.split(';base64,')[1] : base64Data;
    const safeName = path.basename(nombre);
    const destPath = path.join(folder, safeName);
    fs.writeFileSync(destPath, Buffer.from(cleanBase64, 'base64'));
    return destPath;
  } catch (e) {
    console.error(`[Ingresos] Error guardando archivo ${nombre}:`, e.message);
    return null;
  }
};

const sanitizarDocumentosNoAplican = (noAplican, certs, formacion) => {
  if (!Array.isArray(noAplican) || noAplican.length === 0) return [];
  const certFiles = new Set((certs || []).map(c => (c.nombre_archivo || '').toLowerCase().trim()).filter(Boolean));
  const certIds = new Set((certs || []).map(c => (c.id_certificado || '').toUpperCase().trim()).filter(Boolean));
  const acadFiles = new Set((formacion || []).map(f => (f.nombre_archivo || '').toLowerCase().trim()).filter(Boolean));

  return noAplican.filter(item => {
    const nom = (item.nombre_archivo || '').toLowerCase().trim();
    const idItem = (item.id || '').toUpperCase().trim();
    const desc = (item.descripcion || '').toUpperCase();
    const ent = (item.entidad || '').toUpperCase();

    // Excepción vital: Diplomados, cursos y educación continuada SIEMPRE se conservan en noAplican
    const motivo = (item.motivo_no_aplica || '').toUpperCase();
    if (desc.includes('DIPLOMAD') || desc.includes('CURSO') || desc.includes('SEMINARIO') || motivo.includes('DIPLOMAD') || motivo.includes('NO FORMAL')) {
      return true;
    }

    // 1. Si coincide por nombre de archivo con un certificado o título formal activo
    if (nom && (certFiles.has(nom) || acadFiles.has(nom))) return false;

    // 2. Si el ID o la descripción hace referencia a un CERT-X existente
    for (const cId of certIds) {
      if (idItem.includes(cId) || desc.includes(cId)) return false;
    }

    // 3. Si coincide con entidad y cargo de algún certificado
    const coincideCert = (certs || []).some(c => {
      const cEnt = (c.entidad || '').toUpperCase();
      const cCargo = (c.cargo_certificado || '').toUpperCase();
      return (cEnt && ent && (cEnt === ent || cEnt.includes(ent) || ent.includes(cEnt))) &&
             (cCargo && (desc.includes(cCargo) || (item.cargo || '').toUpperCase().includes(cCargo)));
    });
    if (coincideCert) return false;

    return true;
  });
};

module.exports = function(pool) {

  // Inicializar tablas automáticamente al montar el router si no existen
  const initTables = async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.ingreso_cargos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre TEXT NOT NULL,
            codigo TEXT,
            grado TEXT,
            dependencia TEXT,
            requisito_experiencia_meses NUMERIC(6, 2) DEFAULT 0,
            requisitos_formacion TEXT,
            funciones_cargo JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS public.ingreso_candidatos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre TEXT NOT NULL,
            documento TEXT NOT NULL,
            email TEXT,
            telefono TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS public.ingreso_validaciones (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            candidato_id UUID REFERENCES public.ingreso_candidatos(id) ON DELETE CASCADE,
            cargo_id UUID REFERENCES public.ingreso_cargos(id) ON DELETE SET NULL,
            cargo_nombre TEXT,
            cargo_codigo TEXT,
            cargo_grado TEXT,
            requisito_minimo_meses NUMERIC(6, 2) DEFAULT 0,
            experiencia_relacionada_meses NUMERIC(6, 2) DEFAULT 0,
            experiencia_no_relacionada_meses NUMERIC(6, 2) DEFAULT 0,
            tiempo_excluido_traslapes_meses NUMERIC(6, 2) DEFAULT 0,
            diferencia_meses NUMERIC(6, 2) DEFAULT 0,
            resultado_final TEXT CHECK (resultado_final IN ('CUMPLE', 'NO_CUMPLE', 'REQUIERE_REVISION')) DEFAULT 'REQUIERE_REVISION',
            justificacion_final TEXT,
            requiere_revision_humana BOOLEAN DEFAULT TRUE,
            observaciones TEXT,
            evaluador_email TEXT,
            estado TEXT DEFAULT 'EVALUADO',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS public.ingreso_certificados (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            validacion_id UUID REFERENCES public.ingreso_validaciones(id) ON DELETE CASCADE,
            id_certificado TEXT,
            entidad TEXT,
            nit_entidad TEXT,
            ciudad_expedicion TEXT,
            fecha_expedicion TEXT,
            firmante TEXT,
            cargo_firmante TEXT,
            tipo_vinculo TEXT,
            cargo_certificado TEXT,
            codigo_cargo TEXT,
            grado_cargo TEXT,
            dependencia TEXT,
            numero_contrato_o_acto TEXT,
            fecha_inicio TEXT,
            fecha_fin TEXT,
            vinculo_vigente BOOLEAN DEFAULT FALSE,
            funciones_certificadas JSONB DEFAULT '[]'::jsonb,
            experiencia_profesional BOOLEAN DEFAULT TRUE,
            clasificacion_experiencia TEXT DEFAULT 'RELACIONADA',
            experiencia_relacionada_json JSONB DEFAULT '{}'::jsonb,
            tiempo_certificado_json JSONB DEFAULT '{}'::jsonb,
            meses_certificados NUMERIC(6, 2) DEFAULT 0,
            traslapes_json JSONB DEFAULT '[]'::jsonb,
            tiempo_valido_meses NUMERIC(6, 2) DEFAULT 0,
            documento_json JSONB DEFAULT '{}'::jsonb,
            observaciones_json JSONB DEFAULT '[]'::jsonb,
            nombre_archivo TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS public.ingreso_archivos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            validacion_id UUID REFERENCES public.ingreso_validaciones(id) ON DELETE CASCADE,
            nombre_archivo TEXT NOT NULL,
            mime_type TEXT DEFAULT 'application/pdf',
            archivo_base64 TEXT,
            tamano_bytes BIGINT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ingreso_archivos_val ON public.ingreso_archivos(validacion_id);

        ALTER TABLE public.ingreso_cargos ADD COLUMN IF NOT EXISTS id_sideap INT, ADD COLUMN IF NOT EXISTS id_perno INT;
        ALTER TABLE public.ingreso_validaciones
          ADD COLUMN IF NOT EXISTS id_sideap INT,
          ADD COLUMN IF NOT EXISTS id_perno INT,
          ADD COLUMN IF NOT EXISTS id_plaza INT,
          ADD COLUMN IF NOT EXISTS cargo_dependencia TEXT,
          ADD COLUMN IF NOT EXISTS requisitos_formacion TEXT,
          ADD COLUMN IF NOT EXISTS formacion_academica JSONB DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS documentos_no_aplican JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.ingreso_certificados ADD COLUMN IF NOT EXISTS verificacion_formal JSONB;
      `);
      console.log('✓ Tablas del módulo de ingresos verificadas.');
    } catch (err) {
      console.error('Error al inicializar tablas de ingresos:', err.message);
    }
  };
  initTables();

  /**
   * 0. GET /api/ingresos/planta - Lista las 170 plazas de la planta oficial SJD
   */
  router.get('/planta', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT id_plaza, id_sideap, id_perno, nivel, cargo, codigo, grado,
               dependencia_cargo, dependencia_funcional, proposito, funciones,
               requisitos, asignacion_basica, titular_cedula, titular_nombre,
               tipo_vinculacion, situacion_administrativa
        FROM planta_personal_sjd
        ORDER BY id_plaza ASC;
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Error al consultar planta de personal: ' + err.message });
    }
  });

  /**
   * 1. GET /api/ingresos/cargos - Lista los cargos configurados
   */
  router.get('/cargos', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM ingreso_cargos ORDER BY nombre ASC');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener cargos: ' + err.message });
    }
  });

  /**
   * 2. POST /api/ingresos/cargos - Registra o actualiza un cargo
   */
  router.post('/cargos', async (req, res) => {
    try {
      const { id, nombre, codigo, grado, dependencia, requisito_experiencia_meses, requisitos_formacion, funciones_cargo } = req.body;
      if (!nombre) return res.status(400).json({ error: 'El nombre del cargo es obligatorio.' });

      if (id) {
        const updateQuery = `
          UPDATE ingreso_cargos
          SET nombre = $1, codigo = $2, grado = $3, dependencia = $4,
              requisito_experiencia_meses = $5, requisitos_formacion = $6,
              funciones_cargo = $7, updated_at = NOW()
          WHERE id = $8
          RETURNING *;
        `;
        const updateValues = [
          nombre,
          codigo || '',
          grado || '',
          dependencia || '',
          Number(requisito_experiencia_meses) || 0,
          requisitos_formacion || '',
          JSON.stringify(funciones_cargo || []),
          id
        ];
        const updateResult = await pool.query(updateQuery, updateValues);
        if (updateResult.rows.length > 0) {
          return res.json(updateResult.rows[0]);
        }
      }

      const query = `
        INSERT INTO ingreso_cargos (nombre, codigo, grado, dependencia, requisito_experiencia_meses, requisitos_formacion, funciones_cargo)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const values = [
        nombre,
        codigo || '',
        grado || '',
        dependencia || '',
        Number(requisito_experiencia_meses) || 0,
        requisitos_formacion || '',
        JSON.stringify(funciones_cargo || [])
      ];
      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Error al registrar o actualizar cargo: ' + err.message });
    }
  });

  /**
   * 2.1 PUT /api/ingresos/cargos/:id - Actualiza un cargo existente
   */
  router.put('/cargos/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, codigo, grado, dependencia, requisito_experiencia_meses, requisitos_formacion, funciones_cargo } = req.body;
      if (!nombre) return res.status(400).json({ error: 'El nombre del cargo es obligatorio.' });

      const query = `
        UPDATE ingreso_cargos
        SET nombre = $1, codigo = $2, grado = $3, dependencia = $4,
            requisito_experiencia_meses = $5, requisitos_formacion = $6,
            funciones_cargo = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING *;
      `;
      const values = [
        nombre,
        codigo || '',
        grado || '',
        dependencia || '',
        Number(requisito_experiencia_meses) || 0,
        requisitos_formacion || '',
        JSON.stringify(funciones_cargo || []),
        id
      ];
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cargo no encontrado.' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Error al actualizar cargo: ' + err.message });
    }
  });

  /**
   * 2.2 DELETE /api/ingresos/cargos/:id - Elimina un cargo
   */
  router.delete('/cargos/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM ingreso_cargos WHERE id = $1', [id]);
      res.json({ success: true, message: 'Cargo eliminado correctamente.' });
    } catch (err) {
      res.status(500).json({ error: 'Error al eliminar cargo: ' + err.message });
    }
  });

  /**
   * 3.0 GET /api/ingresos/analizar - Manejador de advertencia si se invoca con GET
   */
  router.get('/analizar', (req, res) => {
    res.status(405).json({
      error: 'El método GET no está permitido para /api/ingresos/analizar. El análisis de documentos requiere una petición POST con los certificados en formato PDF.'
    });
  });

  /**
   * 3. POST /api/ingresos/analizar - Analiza PDFs con Gemini e IA
   */
  router.post('/analizar', async (req, res) => {
    try {
      const { archivos, cargo, candidato } = req.body;

      if (!archivos || !Array.isArray(archivos) || archivos.length === 0) {
        return res.status(400).json({ error: 'Debes enviar al menos un archivo PDF de certificado laboral.' });
      }

      if (!cargo || !cargo.nombre) {
        return res.status(400).json({ error: 'Faltan los datos del cargo a evaluar.' });
      }

      console.log(`[Ingresos] Iniciando análisis de ${archivos.length} archivos para el cargo: ${cargo.nombre}`);

      // Almacenar en CACHE_DIR para previsualización inmediata en modal
      try {
        for (const arch of archivos) {
          if (arch.name && arch.base64) {
            guardarArchivoEnDisco(CACHE_DIR, arch.name, arch.base64);
          }
        }
      } catch (eArch) {
        console.warn('[Ingresos] Error guardando archivos en cache:', eArch.message);
      }

      const analisis = await geminiIngresosService.analizarDocumentosConGemini(
        archivos,
        cargo,
        candidato || {}
      );

      res.json({
        success: true,
        data: analisis
      });
    } catch (err) {
      console.error('[Ingresos] Error en /analizar:', err);
      res.status(500).json({ error: 'Error durante el análisis con IA: ' + err.message });
    }
  });

  /**
   * 4. POST /api/ingresos/recalcular - Recalcula tiempos y traslapes si el usuario edita
   */
  router.post('/recalcular', async (req, res) => {
    try {
      const { certificados, requisito_minimo_meses } = req.body;
      const result = timeCalculatorService.auditCertificatesAndCalculateTotals(
        certificados || [],
        Number(requisito_minimo_meses) || 54
      );
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Error al recalcular: ' + err.message });
    }
  });

  /**
   * 5. POST /api/ingresos/guardar - Guarda la validación y certificados en la base de datos
   */
  router.post('/guardar', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { candidato, cargo_evaluado, certificados, consolidado, evaluador_email, formacion_academica, documentos_no_aplican, archivos } = req.body;

      // 1. Insertar o actualizar candidato
      let candId = null;
      if (candidato && candidato.documento) {
        const findCand = await client.query('SELECT id FROM ingreso_candidatos WHERE documento = $1', [candidato.documento]);
        if (findCand.rows.length > 0) {
          candId = findCand.rows[0].id;
          await client.query(
            'UPDATE ingreso_candidatos SET nombre = $1, email = $2, telefono = $3 WHERE id = $4',
            [candidato.nombre, candidato.email || null, candidato.telefono || null, candId]
          );
        } else {
          const newCand = await client.query(
            'INSERT INTO ingreso_candidatos (nombre, documento, email, telefono) VALUES ($1, $2, $3, $4) RETURNING id',
            [candidato.nombre, candidato.documento, candidato.email || null, candidato.telefono || null]
          );
          candId = newCand.rows[0].id;
        }
      }

      // 2. Insertar validación
      const valQuery = `
        INSERT INTO ingreso_validaciones (
          candidato_id, cargo_id, cargo_nombre, cargo_codigo, cargo_grado, cargo_dependencia,
          requisitos_formacion, requisito_minimo_meses, experiencia_relacionada_meses,
          experiencia_no_relacionada_meses, tiempo_excluido_traslapes_meses, diferencia_meses,
          resultado_final, justificacion_final, requiere_revision_humana, evaluador_email, estado,
          id_sideap, id_perno, id_plaza, formacion_academica, documentos_no_aplican
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING id;
      `;
      const valValues = [
        candId,
        cargo_evaluado.id || null,
        cargo_evaluado.nombre || 'N/A',
        cargo_evaluado.codigo || '',
        cargo_evaluado.grado || '',
        cargo_evaluado.dependencia || 'Secretaría Jurídica Distrital',
        cargo_evaluado.requisitos_formacion || cargo_evaluado.requisitos || '',
        consolidado.requisito_minimo_meses || 0,
        consolidado.experiencia_relacionada_meses || 0,
        consolidado.experiencia_no_relacionada_meses || 0,
        consolidado.tiempo_excluido_por_traslapes_meses || 0,
        consolidado.diferencia_meses || 0,
        consolidado.resultado_final || 'REQUIERE_REVISION',
        consolidado.justificacion || '',
        consolidado.requiere_revision_humana || false,
        evaluador_email || 'talento_humano@secjuridica.gov.co',
        'EVALUADO',
        cargo_evaluado.id_sideap || null,
        cargo_evaluado.id_perno || null,
        cargo_evaluado.id_plaza || null,
        JSON.stringify(formacion_academica || []),
        JSON.stringify(documentos_no_aplican || [])
      ];
      const valRes = await client.query(valQuery, valValues);
      const validacionId = valRes.rows[0].id;

      // 3. Insertar cada certificado
      if (Array.isArray(certificados)) {
        for (const cert of certificados) {
          const certQuery = `
            INSERT INTO ingreso_certificados (
              validacion_id, id_certificado, entidad, nit_entidad, ciudad_expedicion, fecha_expedicion,
              firmante, cargo_firmante, tipo_vinculo, cargo_certificado, codigo_cargo, grado_cargo,
              dependencia, numero_contrato_o_acto, fecha_inicio, fecha_fin, vinculo_vigente,
              funciones_certificadas, experiencia_profesional, clasificacion_experiencia,
              experiencia_relacionada_json, tiempo_certificado_json, meses_certificados,
              traslapes_json, tiempo_valido_meses, documento_json, observaciones_json, nombre_archivo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28);
          `;
          const certValues = [
            validacionId,
            cert.id_certificado || 'CERT-1',
            cert.entidad || 'N/A',
            cert.nit_entidad || null,
            cert.ciudad_expedicion || null,
            cert.fecha_expedicion || null,
            cert.firmante || null,
            cert.cargo_firmante || null,
            cert.tipo_vinculo || null,
            cert.cargo_certificado || 'N/A',
            cert.codigo_cargo || null,
            cert.grado_cargo || null,
            cert.dependencia || null,
            cert.numero_contrato_o_acto || null,
            cert.fecha_inicio || null,
            cert.fecha_fin || null,
            cert.vinculo_vigente || false,
            JSON.stringify(cert.funciones_certificadas || []),
            cert.experiencia_profesional !== false,
            cert.clasificacion_experiencia || 'RELACIONADA',
            JSON.stringify(cert.experiencia_relacionada || {}),
            JSON.stringify(cert.tiempo_certificado || {}),
            cert.tiempo_certificado?.meses_totales_aproximados || 0,
            JSON.stringify(cert.traslapes || []),
            cert.tiempo_valido?.meses_totales || cert.tiempo_certificado?.meses_totales_aproximados || 0,
            JSON.stringify({ ...(cert.documento || {}), verificacion_formal: cert.verificacion_formal || {} }),
            JSON.stringify(cert.observaciones || []),
            cert.nombre_archivo || null
          ];
          await client.query(certQuery, certValues);
        }
      }

      // 4. Guardar archivos PDF en disco y registrar en ingreso_archivos
      const valFolder = path.join(UPLOADS_DIR, validacionId);
      if (archivos && Array.isArray(archivos) && archivos.length > 0) {
        for (const arch of archivos) {
          if (arch.name && arch.base64) {
            guardarArchivoEnDisco(valFolder, arch.name, arch.base64);
            try {
              const cleanBase64 = arch.base64.includes(';base64,') ? arch.base64.split(';base64,')[1] : arch.base64;
              await client.query(`
                INSERT INTO ingreso_archivos (validacion_id, nombre_archivo, mime_type, archivo_base64, tamano_bytes)
                VALUES ($1, $2, $3, $4, $5)
              `, [validacionId, path.basename(arch.name), arch.mimeType || 'application/pdf', cleanBase64, arch.size || cleanBase64.length]);
            } catch (errDb) {
              console.warn('[Ingresos] Advertencia guardando archivo en DB:', errDb.message);
            }
          }
        }
      } else {
        // Copiar desde CACHE_DIR si existen
        try {
          if (fs.existsSync(CACHE_DIR)) {
            const cacheFiles = fs.readdirSync(CACHE_DIR);
            for (const cf of cacheFiles) {
              const src = path.join(CACHE_DIR, cf);
              const dst = path.join(valFolder, cf);
              if (!fs.existsSync(valFolder)) fs.mkdirSync(valFolder, { recursive: true });
              fs.copyFileSync(src, dst);
            }
          }
        } catch (eCopy) {
          console.warn('[Ingresos] Error al copiar de cache:', eCopy.message);
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, id: validacionId, mensaje: 'Validación guardada exitosamente.' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Ingresos] Error en /guardar:', err);
      res.status(500).json({ error: 'Error al guardar la validación: ' + err.message });
    } finally {
      client.release();
    }
  });

  /**
   * 6. GET /api/ingresos/validaciones - Lista todas las validaciones
   */
  router.get('/validaciones', async (req, res) => {
    try {
      const query = `
        SELECT v.*, c.nombre as candidato_nombre, c.documento as candidato_documento, c.email as candidato_email
        FROM ingreso_validaciones v
        LEFT JOIN ingreso_candidatos c ON v.candidato_id = c.id
        ORDER BY v.created_at DESC;
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Error al consultar validaciones: ' + err.message });
    }
  });

  /**
   * 7. GET /api/ingresos/validaciones/:id - Detalle completo de una validación
   */
  router.get('/validaciones/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const valQuery = `
        SELECT v.*, c.nombre as candidato_nombre, c.documento as candidato_documento, c.email as candidato_email, c.telefono as candidato_telefono,
               COALESCE(v.requisitos_formacion, p.requisitos, ic.requisitos_formacion, '') as requisitos_formacion_resuelto,
               COALESCE(v.cargo_dependencia, p.dependencia_cargo, ic.dependencia, 'Secretaría Jurídica Distrital') as cargo_dependencia_resuelto
        FROM ingreso_validaciones v
        LEFT JOIN ingreso_candidatos c ON v.candidato_id = c.id
        LEFT JOIN LATERAL (
          SELECT p.dependencia_cargo, p.requisitos
          FROM planta_personal_sjd p
          WHERE (v.id_plaza IS NOT NULL AND p.id_plaza = v.id_plaza)
             OR (v.id_sideap IS NOT NULL AND p.id_sideap = v.id_sideap)
             OR (v.id_perno IS NOT NULL AND p.id_perno = v.id_perno)
             OR (v.id_plaza IS NULL AND v.id_sideap IS NULL AND v.id_perno IS NULL AND p.codigo = v.cargo_codigo AND p.grado = v.cargo_grado)
          ORDER BY 
            CASE WHEN v.id_plaza IS NOT NULL AND p.id_plaza = v.id_plaza THEN 1
                 WHEN v.id_sideap IS NOT NULL AND p.id_sideap = v.id_sideap THEN 2
                 WHEN v.id_perno IS NOT NULL AND p.id_perno = v.id_perno THEN 3
                 ELSE 4 END
          LIMIT 1
        ) p ON true
        LEFT JOIN LATERAL (
          SELECT ic.dependencia, ic.requisitos_formacion
          FROM ingreso_cargos ic
          WHERE (v.cargo_id IS NOT NULL AND ic.id = v.cargo_id)
             OR (v.cargo_nombre IS NOT NULL AND ic.nombre ILIKE v.cargo_nombre)
          LIMIT 1
        ) ic ON true
        WHERE v.id = $1;
      `;
      const valRes = await pool.query(valQuery, [id]);
      if (valRes.rows.length === 0) {
        return res.status(404).json({ error: 'Validación no encontrada.' });
      }

      const certsQuery = `
        SELECT * FROM ingreso_certificados
        WHERE validacion_id = $1
        ORDER BY fecha_inicio ASC;
      `;
      const certsRes = await pool.query(certsQuery, [id]);

      const val = valRes.rows[0];
      const responseData = {
        id: val.id,
        candidato: {
          nombre: val.candidato_nombre,
          documento: val.candidato_documento,
          email: val.candidato_email,
          telefono: val.candidato_telefono
        },
        cargo_evaluado: {
          id: val.cargo_id,
          id_sideap: val.id_sideap,
          id_perno: val.id_perno,
          id_plaza: val.id_plaza,
          nombre: val.cargo_nombre,
          codigo: val.cargo_codigo,
          grado: val.cargo_grado,
          dependencia: val.cargo_dependencia_resuelto || val.cargo_dependencia || 'Secretaría Jurídica Distrital',
          requisito_experiencia_meses: Number(val.requisito_minimo_meses),
          requisitos_formacion: val.requisitos_formacion_resuelto || val.requisitos_formacion || ''
        },
        consolidado: {
          requisito_minimo_meses: Number(val.requisito_minimo_meses),
          experiencia_relacionada_meses: Number(val.experiencia_relacionada_meses),
          experiencia_no_relacionada_meses: Number(val.experiencia_no_relacionada_meses),
          tiempo_excluido_por_traslapes_meses: Number(val.tiempo_excluido_traslapes_meses),
          diferencia_meses: Number(val.diferencia_meses),
          resultado_final: val.resultado_final,
          justificacion: val.justificacion_final,
          requiere_revision_humana: val.requiere_revision_humana
        },
        certificados: certsRes.rows.map(r => ({
          id: r.id,
          id_certificado: r.id_certificado,
          entidad: r.entidad,
          nit_entidad: r.nit_entidad,
          ciudad_expedicion: r.ciudad_expedicion,
          fecha_expedicion: r.fecha_expedicion,
          firmante: r.firmante,
          cargo_firmante: r.cargo_firmante,
          tipo_vinculo: r.tipo_vinculo,
          cargo_certificado: r.cargo_certificado,
          codigo_cargo: r.codigo_cargo,
          grado_cargo: r.grado_cargo,
          dependencia: r.dependencia,
          numero_contrato_o_acto: r.numero_contrato_o_acto,
          fecha_inicio: r.fecha_inicio,
          fecha_fin: r.fecha_fin,
          vinculo_vigente: r.vinculo_vigente,
          funciones_certificadas: r.funciones_certificadas,
          experiencia_profesional: r.experiencia_profesional,
          clasificacion_experiencia: r.clasificacion_experiencia,
          experiencia_relacionada: r.experiencia_relacionada_json,
          tiempo_certificado: (() => {
            const dIni = timeCalculatorService.parseDate(r.fecha_inicio);
            let dFin = timeCalculatorService.parseDate(r.fecha_fin);
            if (!dFin && r.vinculo_vigente) {
              dFin = timeCalculatorService.parseDate(r.fecha_expedicion) || new Date();
            }
            if (dIni && dFin) {
              const cp = timeCalculatorService.calculatePeriod(dIni, dFin);
              return {
                anios: cp.anios,
                meses: cp.meses,
                dias: cp.dias,
                meses_totales_aproximados: cp.meses_totales,
                metodo_calculo: 'DATEDIF_EXCEL_Y_CONVENCION_30_DIAS'
              };
            }
            return r.tiempo_certificado_json || { anios: 0, meses: 0, dias: 0, meses_totales_aproximados: 0 };
          })(),
          traslapes: r.traslapes_json,
          tiempo_valido: { meses_totales: Number(r.tiempo_valido_meses) },
          documento: r.documento_json,
          verificacion_formal: r.documento_json?.verificacion_formal || r.verificacion_formal || null,
          observaciones: r.observaciones_json,
          nombre_archivo: r.nombre_archivo
        })),
        formacion_academica: val.formacion_academica || [],
        documentos_no_aplican: sanitizarDocumentosNoAplican(val.documentos_no_aplican || [], certsRes.rows, val.formacion_academica || []),
        created_at: val.created_at
      };

      res.json(responseData);
    } catch (err) {
      res.status(500).json({ error: 'Error al consultar validación: ' + err.message });
    }
  });

  /**
   * 7.1 PUT /api/ingresos/validaciones/:id y POST /validaciones/:id/update
   */
  const handlerActualizarValidacion = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { formacion_academica, documentos_no_aplican, consolidado, certificados, cargo_evaluado, candidato } = req.body;

      await client.query('BEGIN');

      const checkVal = await client.query('SELECT * FROM ingreso_validaciones WHERE id = $1', [id]);
      if (checkVal.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Validación no encontrada.' });
      }

      const valRow = checkVal.rows[0];

      // Actualizar candidato si vino
      if (candidato && valRow.candidato_id) {
        await client.query(
          `UPDATE ingreso_candidatos 
           SET nombre = COALESCE($1, nombre), documento = COALESCE($2, documento),
               email = COALESCE($3, email), telefono = COALESCE($4, telefono)
           WHERE id = $5`,
          [candidato.nombre, candidato.documento, candidato.email, candidato.telefono, valRow.candidato_id]
        );
      }

      // Preparar campos de actualización de validación
      const updates = [];
      const values = [];
      let pIdx = 1;

      if (formacion_academica !== undefined) {
        updates.push(`formacion_academica = $${pIdx++}`);
        values.push(JSON.stringify(formacion_academica));
      }
      if (documentos_no_aplican !== undefined) {
        const noAplicanLimpio = sanitizarDocumentosNoAplican(documentos_no_aplican, certificados, formacion_academica);
        updates.push(`documentos_no_aplican = $${pIdx++}`);
        values.push(JSON.stringify(noAplicanLimpio));
      }
      if (consolidado) {
        if (consolidado.resultado_final !== undefined) {
          updates.push(`resultado_final = $${pIdx++}`);
          values.push(consolidado.resultado_final);
        }
        if (consolidado.justificacion !== undefined) {
          updates.push(`justificacion_final = $${pIdx++}`);
          values.push(consolidado.justificacion);
        }
        if (consolidado.requisito_minimo_meses !== undefined) {
          updates.push(`requisito_minimo_meses = $${pIdx++}`);
          values.push(Number(consolidado.requisito_minimo_meses) || 0);
        }
        if (consolidado.experiencia_relacionada_meses !== undefined) {
          updates.push(`experiencia_relacionada_meses = $${pIdx++}`);
          values.push(Number(consolidado.experiencia_relacionada_meses) || 0);
        }
        if (consolidado.experiencia_no_relacionada_meses !== undefined) {
          updates.push(`experiencia_no_relacionada_meses = $${pIdx++}`);
          values.push(Number(consolidado.experiencia_no_relacionada_meses) || 0);
        }
        if (consolidado.tiempo_excluido_por_traslapes_meses !== undefined) {
          updates.push(`tiempo_excluido_traslapes_meses = $${pIdx++}`);
          values.push(Number(consolidado.tiempo_excluido_por_traslapes_meses) || 0);
        }
        if (consolidado.diferencia_meses !== undefined) {
          updates.push(`diferencia_meses = $${pIdx++}`);
          values.push(Number(consolidado.diferencia_meses) || 0);
        }
        if (consolidado.requiere_revision_humana !== undefined) {
          updates.push(`requiere_revision_humana = $${pIdx++}`);
          values.push(Boolean(consolidado.requiere_revision_humana));
        }
      }

      if (cargo_evaluado) {
        if (cargo_evaluado.nombre) {
          updates.push(`cargo_nombre = $${pIdx++}`);
          values.push(cargo_evaluado.nombre);
        }
        if (cargo_evaluado.codigo) {
          updates.push(`cargo_codigo = $${pIdx++}`);
          values.push(cargo_evaluado.codigo);
        }
        if (cargo_evaluado.grado) {
          updates.push(`cargo_grado = $${pIdx++}`);
          values.push(cargo_evaluado.grado);
        }
        if (cargo_evaluado.dependencia !== undefined) {
          updates.push(`cargo_dependencia = $${pIdx++}`);
          values.push(cargo_evaluado.dependencia || 'Secretaría Jurídica Distrital');
        }
        if (cargo_evaluado.requisitos_formacion !== undefined) {
          updates.push(`requisitos_formacion = $${pIdx++}`);
          values.push(cargo_evaluado.requisitos_formacion || null);
        }
        if (cargo_evaluado.id_sideap !== undefined) {
          updates.push(`id_sideap = $${pIdx++}`);
          values.push(cargo_evaluado.id_sideap || null);
        }
        if (cargo_evaluado.id_perno !== undefined) {
          updates.push(`id_perno = $${pIdx++}`);
          values.push(cargo_evaluado.id_perno || null);
        }
        if (cargo_evaluado.id_plaza !== undefined) {
          updates.push(`id_plaza = $${pIdx++}`);
          values.push(cargo_evaluado.id_plaza || null);
        }
      }

      updates.push(`updated_at = NOW()`);

      if (updates.length > 0) {
        values.push(id);
        const updateValQuery = `UPDATE ingreso_validaciones SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *;`;
        await client.query(updateValQuery, values);
      }

      // Actualizar candidato si viene
      if (candidato) {
        const candIdRes = await client.query('SELECT candidato_id FROM ingreso_validaciones WHERE id = $1', [id]);
        if (candIdRes.rows.length > 0 && candIdRes.rows[0].candidato_id) {
          const cId = candIdRes.rows[0].candidato_id;
          await client.query(
            'UPDATE ingreso_candidatos SET nombre = COALESCE($1, nombre), documento = COALESCE($2, documento), email = COALESCE($3, email), telefono = COALESCE($4, telefono) WHERE id = $5',
            [candidato.nombre || null, candidato.documento || null, candidato.email || null, candidato.telefono || null, cId]
          );
        }
      }

      // Si vienen certificados actualizados (incluso si la lista está vacía)
      if (Array.isArray(certificados)) {
        await client.query('DELETE FROM ingreso_certificados WHERE validacion_id = $1', [id]);
        for (const cert of certificados) {
          const certQuery = `
            INSERT INTO ingreso_certificados (
              validacion_id, id_certificado, entidad, nit_entidad, ciudad_expedicion, fecha_expedicion,
              firmante, cargo_firmante, tipo_vinculo, cargo_certificado, codigo_cargo, grado_cargo,
              dependencia, numero_contrato_o_acto, fecha_inicio, fecha_fin, vinculo_vigente,
              funciones_certificadas, experiencia_profesional, clasificacion_experiencia,
              experiencia_relacionada_json, tiempo_certificado_json, meses_certificados,
              traslapes_json, tiempo_valido_meses, documento_json, observaciones_json, nombre_archivo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28);
          `;
          const certValues = [
            id,
            cert.id_certificado || 'CERT-1',
            cert.entidad || 'N/A',
            cert.nit_entidad || null,
            cert.ciudad_expedicion || null,
            cert.fecha_expedicion || null,
            cert.firmante || null,
            cert.cargo_firmante || null,
            cert.tipo_vinculo || null,
            cert.cargo_certificado || 'N/A',
            cert.codigo_cargo || null,
            cert.grado_cargo || null,
            cert.dependencia || null,
            cert.numero_contrato_o_acto || null,
            cert.fecha_inicio || null,
            cert.fecha_fin || null,
            cert.vinculo_vigente || false,
            JSON.stringify(cert.funciones_certificadas || []),
            cert.experiencia_profesional !== false,
            cert.clasificacion_experiencia || 'RELACIONADA',
            JSON.stringify(cert.experiencia_relacionada || {}),
            JSON.stringify(cert.tiempo_certificado || {}),
            cert.tiempo_certificado?.meses_totales_aproximados || 0,
            JSON.stringify(cert.traslapes || []),
            cert.tiempo_valido?.meses_totales || cert.tiempo_certificado?.meses_totales_aproximados || 0,
            JSON.stringify({ ...(cert.documento || {}), verificacion_formal: cert.verificacion_formal || {} }),
            JSON.stringify(cert.observaciones || []),
            cert.nombre_archivo || null
          ];
          await client.query(certQuery, certValues);
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, mensaje: 'Validación actualizada exitosamente.' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Ingresos] Error en PUT/POST update /validaciones/:id:', err);
      res.status(500).json({ error: 'Error al actualizar la validación: ' + err.message });
    } finally {
      client.release();
    }
  };

  router.put('/validaciones/:id', handlerActualizarValidacion);
  router.put('/validaciones/:id/update', handlerActualizarValidacion);
  router.post('/validaciones/:id/update', handlerActualizarValidacion);
  router.post('/validaciones/:id', (req, res, next) => {
    if ((req.headers['x-http-method-override'] || '').toUpperCase() === 'DELETE') {
      return handlerEliminarValidacion(req, res, next);
    }
    return handlerActualizarValidacion(req, res, next);
  });

  /**
   * 7.2 DELETE /api/ingresos/validaciones/:id - Elimina una validación (soporta DELETE y POST /delete para WAF)
   */
  const handlerEliminarValidacion = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      await client.query('BEGIN');
      await client.query('DELETE FROM ingreso_certificados WHERE validacion_id = $1', [id]);
      await client.query('DELETE FROM ingreso_archivos WHERE validacion_id = $1', [id]);
      await client.query('DELETE FROM ingreso_validaciones WHERE id = $1', [id]);
      await client.query('COMMIT');

      try {
        const valFolder = path.join(UPLOADS_DIR, id);
        if (fs.existsSync(valFolder)) {
          fs.rmSync(valFolder, { recursive: true, force: true });
        }
      } catch (eFolder) {}

      res.json({ success: true, mensaje: 'Validación eliminada correctamente.' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Ingresos] Error en DELETE /validaciones/:id:', err);
      res.status(500).json({ error: 'Error al eliminar la validación: ' + err.message });
    } finally {
      client.release();
    }
  };

  router.delete('/validaciones/:id', handlerEliminarValidacion);
  router.delete('/validaciones/:id/delete', handlerEliminarValidacion);
  router.post('/validaciones/:id/delete', handlerEliminarValidacion);

  /**
   * 7.2.1 DELETE /api/ingresos/validaciones/:id/certificados/:certId - Elimina un certificado específico
   */
  const handlerEliminarCertificadoIndividual = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id, certId } = req.params;
      await client.query('BEGIN');
      await client.query(
        'DELETE FROM ingreso_certificados WHERE validacion_id = $1 AND (id::text = $2 OR id_certificado = $2)',
        [id, certId]
      );
      await client.query('COMMIT');
      res.json({ success: true, mensaje: 'Certificado eliminado correctamente.' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Ingresos] Error al eliminar certificado individual:', err);
      res.status(500).json({ error: 'Error al eliminar certificado: ' + err.message });
    } finally {
      client.release();
    }
  };

  /**
   * 7.2.2 POST /api/ingresos/validaciones/:id/certificados/:certId/complementar
   * Adjunta un nuevo PDF a un certificado laboral existente, extrae con IA lo que falta,
   * fusiona funciones y fechas, actualiza los anexos y recalcula la idoneidad y tiempos.
   */
  const handlerComplementarCertificado = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id, certId } = req.params;
      const { archivo, nuevoArchivo } = req.body;
      const arch = nuevoArchivo || archivo;

      if (!arch || !arch.base64 || !arch.name) {
        return res.status(400).json({ error: 'Debes proporcionar el archivo PDF complementario (name y base64).' });
      }

      // 1. Obtener validación actual, cargo y candidato
      const valQuery = `
        SELECT v.*, c.nombre as candidato_nombre, c.documento as candidato_documento, c.email as candidato_email, c.telefono as candidato_telefono,
               COALESCE(v.requisitos_formacion, p.requisitos, ic.requisitos_formacion, '') as requisitos_formacion_resuelto,
               COALESCE(v.cargo_dependencia, p.dependencia_cargo, ic.dependencia, 'Secretaría Jurídica Distrital') as cargo_dependencia_resuelto,
               COALESCE(p.funciones, ic.funciones_cargo, '[]'::jsonb) as funciones_cargo_resuelto
        FROM ingreso_validaciones v
        LEFT JOIN ingreso_candidatos c ON v.candidato_id = c.id
        LEFT JOIN LATERAL (
          SELECT p.dependencia_cargo, p.requisitos, p.funciones
          FROM planta_personal_sjd p
          WHERE (v.id_plaza IS NOT NULL AND p.id_plaza = v.id_plaza)
             OR (v.id_sideap IS NOT NULL AND p.id_sideap = v.id_sideap)
             OR (v.id_perno IS NOT NULL AND p.id_perno = v.id_perno)
             OR (v.id_plaza IS NULL AND v.id_sideap IS NULL AND v.id_perno IS NULL AND p.codigo = v.cargo_codigo AND p.grado = v.cargo_grado)
          ORDER BY 
            CASE WHEN v.id_plaza IS NOT NULL AND p.id_plaza = v.id_plaza THEN 1
                 WHEN v.id_sideap IS NOT NULL AND p.id_sideap = v.id_sideap THEN 2
                 WHEN v.id_perno IS NOT NULL AND p.id_perno = v.id_perno THEN 3
                 ELSE 4 END
          LIMIT 1
        ) p ON true
        LEFT JOIN LATERAL (
          SELECT ic.dependencia, ic.requisitos_formacion, ic.funciones_cargo
          FROM ingreso_cargos ic
          WHERE (v.cargo_id IS NOT NULL AND ic.id = v.cargo_id)
             OR (v.cargo_nombre IS NOT NULL AND ic.nombre ILIKE v.cargo_nombre)
          LIMIT 1
        ) ic ON true
        WHERE v.id = $1;
      `;
      const valRes = await client.query(valQuery, [id]);
      if (valRes.rows.length === 0) {
        return res.status(404).json({ error: 'Validación no encontrada.' });
      }
      const val = valRes.rows[0];

      // 2. Buscar el certificado existente
      const certRes = await client.query(
        'SELECT * FROM ingreso_certificados WHERE validacion_id = $1 AND (id::text = $2 OR id_certificado = $2) LIMIT 1',
        [id, certId]
      );
      if (certRes.rows.length === 0) {
        return res.status(404).json({ error: 'Certificado no encontrado en esta validación.' });
      }
      const certDb = certRes.rows[0];

      // Convertir a estructura de certificado
      const certActual = {
        id: certDb.id,
        id_certificado: certDb.id_certificado,
        entidad: certDb.entidad,
        nit_entidad: certDb.nit_entidad,
        ciudad_expedicion: certDb.ciudad_expedicion,
        fecha_expedicion: certDb.fecha_expedicion,
        firmante: certDb.firmante,
        cargo_firmante: certDb.cargo_firmante,
        tipo_vinculo: certDb.tipo_vinculo,
        cargo_certificado: certDb.cargo_certificado,
        codigo_cargo: certDb.codigo_cargo,
        grado_cargo: certDb.grado_cargo,
        dependencia: certDb.dependencia,
        numero_contrato_o_acto: certDb.numero_contrato_o_acto,
        fecha_inicio: certDb.fecha_inicio,
        fecha_fin: certDb.fecha_fin,
        vinculo_vigente: certDb.vinculo_vigente,
        funciones_certificadas: certDb.funciones_certificadas || [],
        experiencia_profesional: certDb.experiencia_profesional,
        clasificacion_experiencia: certDb.clasificacion_experiencia,
        experiencia_relacionada: certDb.experiencia_relacionada_json || {},
        anexos: (certDb.documento_json && Array.isArray(certDb.documento_json.anexos) && certDb.documento_json.anexos.length > 0)
          ? certDb.documento_json.anexos
          : (certDb.nombre_archivo ? [certDb.nombre_archivo] : []),
        nombre_archivo: certDb.nombre_archivo
      };

      // 3. Guardar el nuevo archivo en disco y en BD
      const valFolder = path.join(UPLOADS_DIR, id);
      guardarArchivoEnDisco(valFolder, arch.name, arch.base64);
      try {
        const cleanBase64 = arch.base64.includes(';base64,') ? arch.base64.split(';base64,')[1] : arch.base64;
        await client.query(`
          INSERT INTO ingreso_archivos (validacion_id, nombre_archivo, mime_type, archivo_base64, tamano_bytes)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [id, path.basename(arch.name), arch.mimeType || 'application/pdf', cleanBase64, arch.size || cleanBase64.length]);
      } catch (eArch) {
        console.warn('[Ingresos] Error insertando anexo en BD:', eArch.message);
      }

      // 4. Preparar datos del cargo para Gemini
      let funcionesCargo = [];
      if (Array.isArray(val.funciones_cargo_resuelto)) {
        funcionesCargo = val.funciones_cargo_resuelto;
      } else if (typeof val.funciones_cargo_resuelto === 'string') {
        try { funcionesCargo = JSON.parse(val.funciones_cargo_resuelto); } catch (_) {}
      }

      const cargoData = {
        id: val.cargo_id,
        nombre: val.cargo_nombre,
        codigo: val.cargo_codigo,
        grado: val.cargo_grado,
        dependencia: val.cargo_dependencia_resuelto || val.cargo_dependencia,
        requisito_experiencia_meses: Number(val.requisito_minimo_meses) || 54,
        requisitos_formacion: val.requisitos_formacion_resuelto || val.requisitos_formacion,
        funciones_cargo: funcionesCargo
      };

      const candidatoData = {
        nombre: val.candidato_nombre,
        documento: val.candidato_documento
      };

      // 5. Analizar y complementar con Gemini
      console.log(`[Ingresos] Complementando certificado ${certActual.id_certificado} (${certActual.entidad}) con archivo ${arch.name}...`);
      const certComplementado = await geminiIngresosService.complementarCertificadoConGemini(
        certActual,
        arch,
        cargoData,
        candidatoData
      );

      // 6. Calcular periodos y tiempos del certificado actualizado
      const dIni = timeCalculatorService.parseDate(certComplementado.fecha_inicio || certActual.fecha_inicio);
      let dFin = timeCalculatorService.parseDate(certComplementado.fecha_fin || certActual.fecha_fin);
      if (!dFin && (certComplementado.vinculo_vigente || certActual.vinculo_vigente)) {
        dFin = timeCalculatorService.parseDate(certComplementado.fecha_expedicion) || new Date();
      }

      let tiempoCalculado = certDb.tiempo_certificado_json || { anios: 0, meses: 0, dias: 0, meses_totales_aproximados: 0 };
      if (dIni && dFin) {
        const cp = timeCalculatorService.calculatePeriod(dIni, dFin);
        tiempoCalculado = {
          anios: cp.anios,
          meses: cp.meses,
          dias: cp.dias,
          meses_totales_aproximados: cp.meses_totales,
          metodo_calculo: 'DATEDIF_EXCEL_Y_CONVENCION_30_DIAS'
        };
      }

      // Actualizar en base de datos
      await client.query('BEGIN');

      const docJsonFinal = {
        ...(certDb.documento_json || {}),
        anexos: certComplementado.anexos,
        verificacion_formal: certComplementado.verificacion_formal || certDb.documento_json?.verificacion_formal || {}
      };

      const updateCertSql = `
        UPDATE ingreso_certificados
        SET entidad = COALESCE($1, entidad),
            nit_entidad = COALESCE($2, nit_entidad),
            ciudad_expedicion = COALESCE($3, ciudad_expedicion),
            fecha_expedicion = COALESCE($4, fecha_expedicion),
            firmante = COALESCE($5, firmante),
            cargo_firmante = COALESCE($6, cargo_firmante),
            tipo_vinculo = COALESCE($7, tipo_vinculo),
            cargo_certificado = COALESCE($8, cargo_certificado),
            codigo_cargo = COALESCE($9, codigo_cargo),
            grado_cargo = COALESCE($10, grado_cargo),
            dependencia = COALESCE($11, dependencia),
            numero_contrato_o_acto = COALESCE($12, numero_contrato_o_acto),
            fecha_inicio = COALESCE($13, fecha_inicio),
            fecha_fin = $14,
            vinculo_vigente = $15,
            funciones_certificadas = $16,
            clasificacion_experiencia = $17,
            experiencia_relacionada_json = $18,
            tiempo_certificado_json = $19,
            meses_certificados = $20,
            documento_json = $21,
            verificacion_formal = $22,
            observaciones_json = $23
        WHERE id = $24
        RETURNING *;
      `;
      const updateValues = [
        certComplementado.entidad || certActual.entidad,
        certComplementado.nit_entidad || certActual.nit_entidad || null,
        certComplementado.ciudad_expedicion || certActual.ciudad_expedicion || null,
        certComplementado.fecha_expedicion || certActual.fecha_expedicion || null,
        certComplementado.firmante || certActual.firmante || null,
        certComplementado.cargo_firmante || certActual.cargo_firmante || null,
        certComplementado.tipo_vinculo || certActual.tipo_vinculo || null,
        certComplementado.cargo_certificado || certActual.cargo_certificado,
        certComplementado.codigo_cargo || certActual.codigo_cargo || null,
        certComplementado.grado_cargo || certActual.grado_cargo || null,
        certComplementado.dependencia || certActual.dependencia || null,
        certComplementado.numero_contrato_o_acto || certActual.numero_contrato_o_acto || null,
        certComplementado.fecha_inicio || certActual.fecha_inicio,
        certComplementado.fecha_fin || certActual.fecha_fin || null,
        Boolean(certComplementado.vinculo_vigente),
        JSON.stringify(certComplementado.funciones_certificadas || certActual.funciones_certificadas || []),
        certComplementado.clasificacion_experiencia || certActual.clasificacion_experiencia || 'RELACIONADA',
        JSON.stringify(certComplementado.experiencia_relacionada || {}),
        JSON.stringify(tiempoCalculado),
        tiempoCalculado.meses_totales_aproximados || 0,
        JSON.stringify(docJsonFinal),
        JSON.stringify(certComplementado.verificacion_formal || {}),
        JSON.stringify(certComplementado.observaciones || []),
        certDb.id
      ];
      await client.query(updateCertSql, updateValues);

      // 7. Cargar todos los certificados para recalcular experiencia consolidada y traslapes
      const todosCertsRes = await client.query(
        'SELECT * FROM ingreso_certificados WHERE validacion_id = $1 ORDER BY fecha_inicio ASC',
        [id]
      );
      const todosCerts = todosCertsRes.rows.map(r => ({
        id: r.id,
        id_certificado: r.id_certificado,
        entidad: r.entidad,
        nit_entidad: r.nit_entidad,
        cargo_certificado: r.cargo_certificado,
        codigo_cargo: r.codigo_cargo,
        grado_cargo: r.grado_cargo,
        dependencia: r.dependencia,
        tipo_vinculo: r.tipo_vinculo,
        numero_contrato_o_acto: r.numero_contrato_o_acto,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        vinculo_vigente: r.vinculo_vigente,
        clasificacion_experiencia: r.clasificacion_experiencia,
        funciones_certificadas: r.funciones_certificadas,
        experiencia_relacionada: r.experiencia_relacionada_json,
        tiempo_certificado: r.tiempo_certificado_json,
        tiempo_valido: { meses_totales: Number(r.tiempo_valido_meses) },
        anexos: r.documento_json?.anexos || (r.nombre_archivo ? [r.nombre_archivo] : []),
        nombre_archivo: r.nombre_archivo,
        verificacion_formal: r.documento_json?.verificacion_formal || r.verificacion_formal || null,
        observaciones: r.observaciones_json
      }));

      const reqMeses = Number(val.requisito_minimo_meses) || 0;
      let certsAuditados = todosCerts;
      let nuevoConsolidado = null;

      try {
        const recalc = timeCalculatorService.auditCertificatesAndCalculateTotals(todosCerts, reqMeses);
        if (recalc?.certificados) certsAuditados = recalc.certificados;
        if (recalc?.consolidado) nuevoConsolidado = recalc.consolidado;

        for (const ca of certsAuditados) {
          await client.query(`
            UPDATE ingreso_certificados
            SET tiempo_valido_meses = $1,
                traslapes_json = $2
            WHERE id = $3
          `, [ca.tiempo_valido?.meses_totales || 0, JSON.stringify(ca.traslapes || []), ca.id]);
        }

        if (nuevoConsolidado) {
          await client.query(`
            UPDATE ingreso_validaciones
            SET experiencia_relacionada_meses = $1,
                experiencia_no_relacionada_meses = $2,
                tiempo_excluido_traslapes_meses = $3,
                diferencia_meses = $4,
                resultado_final = $5,
                updated_at = NOW()
            WHERE id = $6
          `, [
            nuevoConsolidado.experiencia_relacionada_meses || 0,
            nuevoConsolidado.experiencia_no_relacionada_meses || 0,
            nuevoConsolidado.tiempo_excluido_por_traslapes_meses || 0,
            nuevoConsolidado.diferencia_meses || 0,
            (nuevoConsolidado.diferencia_meses >= 0 ? 'CUMPLE' : 'NO_CUMPLE'),
            id
          ]);
        }
      } catch (eRecalc) {
        console.warn('[Ingresos] Advertencia recalculando tras complementar certificado:', eRecalc.message);
      }

      await client.query('COMMIT');

      const certRetornado = certsAuditados.find(c => c.id === certDb.id) || certComplementado;
      certRetornado.anexos = docJsonFinal.anexos;
      certRetornado.verificacion_formal = certComplementado.verificacion_formal;

      res.json({
        success: true,
        mensaje: `Certificado ${certActual.id_certificado} complementado exitosamente con "${arch.name}".`,
        certificado: certRetornado,
        certificados: certsAuditados,
        consolidado: nuevoConsolidado
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[Ingresos] Error en complementar certificado:', err);
      res.status(500).json({ error: 'Error al complementar certificado: ' + err.message });
    } finally {
      client.release();
    }
  };

  router.post('/validaciones/:id/certificados/:certId/complementar', handlerComplementarCertificado);
  router.put('/validaciones/:id/certificados/:certId/complementar', handlerComplementarCertificado);
  router.post('/validaciones/:id/certificados/:certId/anexo', handlerComplementarCertificado);

  router.delete('/validaciones/:id/certificados/:certId', handlerEliminarCertificadoIndividual);
  router.delete('/validaciones/:id/certificados/:certId/delete', handlerEliminarCertificadoIndividual);
  router.post('/validaciones/:id/certificados/:certId/delete', handlerEliminarCertificadoIndividual);
  router.post('/validaciones/:id/certificados/:certId', handlerEliminarCertificadoIndividual);

  /**
   * 7.2.3 GET /api/ingresos/idu-6-tramos-oficiales
   * Retorna los 6 tramos oficiales con todas sus funciones y el cruce funcional detallado
   */
  router.get('/idu-6-tramos-oficiales', (req, res) => {
    try {
      const tramos = iduTramosService.obtenerTramosIDUOficiales();
      res.json(tramos);
    } catch (err) {
      res.status(500).json({ error: 'Error obteniendo tramos IDU: ' + err.message });
    }
  });

  /**
   * 7.2.4 POST /api/ingresos/validaciones/:id/ajustar-idu-6-tramos
   * Aplica los 6 tramos oficiales del IDU con su cruce funcional a la validación especificada
   */
  router.post('/validaciones/:id/ajustar-idu-6-tramos', async (req, res) => {
    try {
      const { id } = req.params;
      const resultado = await iduTramosService.aplicarTramosIDUAValidacion(pool, id);
      res.json(resultado);
    } catch (err) {
      res.status(500).json({ error: 'Error ajustando tramos IDU: ' + err.message });
    }
  });

  /**
   * 7.2.5 POST /api/ingresos/ajustar-idu-6-tramos
   * Busca la validación por documento o ID y le aplica los 6 tramos con el cruce
   */
  router.post('/ajustar-idu-6-tramos', async (req, res) => {
    try {
      const { validacionId, documento } = req.body || {};
      let targetId = validacionId;

      if (!targetId) {
        const docBuscar = documento || '79906841';
        const busq = await pool.query(`
          SELECT v.id FROM public.ingreso_validaciones v
          JOIN public.ingreso_candidatos c ON v.candidato_id = c.id
          WHERE c.documento ILIKE $1 OR c.nombre ILIKE '%Gustavo%Sanchez%'
          ORDER BY v.created_at DESC LIMIT 1
        `, [`%${docBuscar}%`]);

        if (busq.rows.length === 0) {
          return res.status(404).json({ error: 'No se encontró validación para el aspirante con documento ' + docBuscar });
        }
        targetId = busq.rows[0].id;
      }

      const resultado = await iduTramosService.aplicarTramosIDUAValidacion(pool, targetId);
      res.json({ ...resultado, validacion_id: targetId });
    } catch (err) {
      res.status(500).json({ error: 'Error ajustando tramos IDU: ' + err.message });
    }
  });

  /**
   * 7.3 GET /api/ingresos/validaciones/:id/archivos - Lista archivos de la validación
   */
  router.get('/validaciones/:id/archivos', async (req, res) => {
    try {
      const { id } = req.params;
      const valFolder = path.join(UPLOADS_DIR, id);
      let archivosDisponibles = [];
      if (fs.existsSync(valFolder)) {
        archivosDisponibles = fs.readdirSync(valFolder);
      }
      const dbRes = await pool.query('SELECT nombre_archivo FROM ingreso_archivos WHERE validacion_id = $1', [id]);
      const dbFiles = dbRes.rows.map(r => r.nombre_archivo);
      const combinados = Array.from(new Set([...archivosDisponibles, ...dbFiles]));
      res.json({ archivos: combinados });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * 7.4 GET /api/ingresos/validaciones/:id/archivo/:nombre - Visualizar PDF inline
   */
  router.get('/validaciones/:id/archivo/:nombre', async (req, res) => {
    try {
      const { id, nombre } = req.params;
      const targetName = decodeURIComponent(nombre).trim();
      const safeName = path.basename(targetName);
      const valFolder = path.join(UPLOADS_DIR, id);

      const resolverRutaArchivo = (folder, target) => {
        if (!fs.existsSync(folder)) return null;
        const files = fs.readdirSync(folder);
        if (files.length === 0) return null;

        const cleanTarget = target.trim().toLowerCase();
        const targetNoExt = cleanTarget.replace(/\.pdf$/i, '');
        
        // 1. Coincidencia EXACTA (con o sin .pdf)
        const exact = files.find(f => {
          const fLower = f.toLowerCase();
          return fLower === cleanTarget || fLower === `${targetNoExt}.pdf`;
        });
        if (exact) return path.join(folder, exact);

        // 2. Coincidencia normalizada exacta (removiendo tildes y caracteres no alfanuméricos)
        const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetNorm = norm(targetNoExt);
        const exactNorm = files.find(f => norm(f.replace(/\.pdf$/i, '')) === targetNorm);
        if (exactNorm) return path.join(folder, exactNorm);

        // 3. Coincidencia con número: si target tiene números (ej. Gobierno5, Gobierno2, etc.),
        // los dígitos del archivo deben coincidir exactamente para no abrir Gobierno o Gobierno2
        const targetNum = targetNoExt.match(/\d+/g)?.join('') || '';
        if (targetNum) {
          const matchNum = files.find(f => {
            const fNoExt = f.toLowerCase().replace(/\.pdf$/i, '');
            const fNum = fNoExt.match(/\d+/g)?.join('') || '';
            if (fNum === targetNum) {
              return norm(fNoExt).includes(targetNorm) || targetNorm.includes(norm(fNoExt));
            }
            return false;
          });
          if (matchNum) return path.join(folder, matchNum);
        }

        // 4. Coincidencia difusa SOLO si ninguno de los dos tiene números que colisionen
        const matchFuzzy = files.find(f => {
          const fNoExt = f.toLowerCase().replace(/\.pdf$/i, '');
          const fNum = fNoExt.match(/\d+/g)?.join('') || '';
          if (targetNum !== fNum) return false;
          return norm(fNoExt).includes(targetNorm) || targetNorm.includes(norm(fNoExt));
        });
        if (matchFuzzy) return path.join(folder, matchFuzzy);

        return null;
      };

      // 1. Buscar en carpeta de validación
      let foundPath = resolverRutaArchivo(valFolder, safeName);

      // 2. Buscar en carpeta cache
      if (!foundPath) {
        foundPath = resolverRutaArchivo(CACHE_DIR, safeName);
      }

      // 3. Buscar en la base de datos
      if (!foundPath) {
        let dbRes = await pool.query(`
          SELECT archivo_base64, mime_type, nombre_archivo 
          FROM ingreso_archivos 
          WHERE validacion_id = $1 AND LOWER(nombre_archivo) = LOWER($2)
          LIMIT 1
        `, [id, safeName]);

        if (dbRes.rows.length === 0) {
          const targetNum = safeName.replace(/\.pdf$/i, '').match(/\d+/g)?.join('') || '';
          if (targetNum) {
            dbRes = await pool.query(`
              SELECT archivo_base64, mime_type, nombre_archivo 
              FROM ingreso_archivos 
              WHERE validacion_id = $1 
                AND LOWER(nombre_archivo) LIKE $2
                AND nombre_archivo ~ $3
              LIMIT 1
            `, [id, `%${safeName.replace(/\d+/g, '').replace(/\.pdf$/i, '').trim()}%`, targetNum]);
          } else {
            dbRes = await pool.query(`
              SELECT archivo_base64, mime_type, nombre_archivo 
              FROM ingreso_archivos 
              WHERE validacion_id = $1 AND LOWER(nombre_archivo) LIKE LOWER($2)
              LIMIT 1
            `, [id, `%${safeName.replace(/\.pdf$/i, '')}%`]);
          }
        }

        if (dbRes.rows.length > 0 && dbRes.rows[0].archivo_base64) {
          const row = dbRes.rows[0];
          const cleanBase64 = row.archivo_base64.replace(/^data:.*?;base64,/, '');
          const buffer = Buffer.from(cleanBase64, 'base64');
          res.setHeader('Content-Type', row.mime_type || 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.nombre_archivo)}"`);
          return res.send(buffer);
        }
      }

      if (foundPath && fs.existsSync(foundPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(foundPath))}"`);
        return res.sendFile(foundPath);
      }

      return res.status(404).json({ error: `El archivo "${safeName}" no fue encontrado en el servidor.` });
    } catch (err) {
      console.error('[Ingresos] Error al servir archivo PDF:', err);
      res.status(500).json({ error: 'Error al obtener el archivo: ' + err.message });
    }
  });

  /**
   * 7.4.1 POST /api/ingresos/validaciones/:id/adjuntar-y-analizar
   * Sube uno o más documentos PDF a una validación existente, los analiza con IA (Gemini),
   * los clasifica automáticamente (título, tarjeta profesional, certificado laboral o no aplica),
   * recalcula determinísticamente los tiempos y traslapes y persiste todo en el expediente.
   */
  router.post('/validaciones/:id/adjuntar-y-analizar', async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { archivos } = req.body;

      if (!archivos || !Array.isArray(archivos) || archivos.length === 0) {
        return res.status(400).json({ error: 'Debes enviar al menos un archivo PDF para analizar.' });
      }

      // 1. Obtener validación actual, cargo y candidato
      const valQuery = `
        SELECT v.*, c.nombre as candidato_nombre, c.documento as candidato_documento, c.email as candidato_email, c.telefono as candidato_telefono,
               COALESCE(v.requisitos_formacion, p.requisitos, ic.requisitos_formacion, '') as requisitos_formacion_resuelto,
               COALESCE(v.cargo_dependencia, p.dependencia_cargo, ic.dependencia, 'Secretaría Jurídica Distrital') as cargo_dependencia_resuelto,
               COALESCE(p.funciones, ic.funciones_cargo, '[]'::jsonb) as funciones_cargo_resuelto
        FROM ingreso_validaciones v
        LEFT JOIN ingreso_candidatos c ON v.candidato_id = c.id
        LEFT JOIN LATERAL (
          SELECT p.dependencia_cargo, p.requisitos, p.funciones
          FROM planta_personal_sjd p
          WHERE (v.id_plaza IS NOT NULL AND p.id_plaza = v.id_plaza)
             OR (v.id_sideap IS NOT NULL AND p.id_sideap = v.id_sideap)
             OR (v.id_perno IS NOT NULL AND p.id_perno = v.id_perno)
             OR (v.id_plaza IS NULL AND v.id_sideap IS NULL AND v.id_perno IS NULL AND p.codigo = v.cargo_codigo AND p.grado = v.cargo_grado)
          ORDER BY 
            CASE WHEN v.id_plaza IS NOT NULL AND p.id_plaza = v.id_plaza THEN 1
                 WHEN v.id_sideap IS NOT NULL AND p.id_sideap = v.id_sideap THEN 2
                 WHEN v.id_perno IS NOT NULL AND p.id_perno = v.id_perno THEN 3
                 ELSE 4 END
          LIMIT 1
        ) p ON true
        LEFT JOIN LATERAL (
          SELECT ic.dependencia, ic.requisitos_formacion, ic.funciones_cargo
          FROM ingreso_cargos ic
          WHERE (v.cargo_id IS NOT NULL AND ic.id = v.cargo_id)
             OR (v.cargo_nombre IS NOT NULL AND ic.nombre ILIKE v.cargo_nombre)
          LIMIT 1
        ) ic ON true
        WHERE v.id = $1;
      `;
      const valRes = await pool.query(valQuery, [id]);
      if (valRes.rows.length === 0) {
        return res.status(404).json({ error: 'Validación no encontrada.' });
      }

      const val = valRes.rows[0];

      // Certificados actuales
      const certsQuery = await pool.query('SELECT * FROM ingreso_certificados WHERE validacion_id = $1 ORDER BY fecha_inicio ASC', [id]);
      const certificadosExistentes = certsQuery.rows.map(r => ({
        id: r.id,
        id_certificado: r.id_certificado,
        entidad: r.entidad,
        nit_entidad: r.nit_entidad,
        ciudad_expedicion: r.ciudad_expedicion,
        fecha_expedicion: r.fecha_expedicion,
        firmante: r.firmante,
        cargo_firmante: r.cargo_firmante,
        tipo_vinculo: r.tipo_vinculo,
        cargo_certificado: r.cargo_certificado,
        codigo_cargo: r.codigo_cargo,
        grado_cargo: r.grado_cargo,
        dependencia: r.dependencia,
        numero_contrato_o_acto: r.numero_contrato_o_acto,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        vinculo_vigente: r.vinculo_vigente,
        funciones_certificadas: r.funciones_certificadas,
        experiencia_profesional: r.experiencia_profesional,
        clasificacion_experiencia: r.clasificacion_experiencia,
        experiencia_relacionada: r.experiencia_relacionada_json,
        tiempo_certificado: r.tiempo_certificado_json,
        traslapes: r.traslapes_json,
        tiempo_valido: { meses_totales: Number(r.tiempo_valido_meses) },
        documento: r.documento_json,
        verificacion_formal: r.documento_json?.verificacion_formal || r.verificacion_formal || null,
        observaciones: r.observaciones_json,
        nombre_archivo: r.nombre_archivo
      }));

      const formacionExistente = Array.isArray(val.formacion_academica) ? [...val.formacion_academica] : [];
      const noAplicanExistente = Array.isArray(val.documentos_no_aplican) ? [...val.documentos_no_aplican] : [];

      // 2. Guardar archivos en disco y en BD
      const valFolder = path.join(UPLOADS_DIR, id);
      for (const arch of archivos) {
        if (arch.name && arch.base64) {
          guardarArchivoEnDisco(valFolder, arch.name, arch.base64);
          try {
            const cleanBase64 = arch.base64.includes(';base64,') ? arch.base64.split(';base64,')[1] : arch.base64;
            await pool.query(`
              INSERT INTO ingreso_archivos (validacion_id, nombre_archivo, mime_type, archivo_base64, tamano_bytes)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT DO NOTHING
            `, [id, path.basename(arch.name), arch.mimeType || 'application/pdf', cleanBase64, arch.size || cleanBase64.length]);
          } catch (eArchDb) {
            console.warn('[Ingresos] Error insertando archivo adjunto en DB:', eArchDb.message);
          }
        }
      }

      // 3. Preparar datos del cargo para Gemini
      let funcionesCargo = [];
      if (Array.isArray(val.funciones_cargo_resuelto)) {
        funcionesCargo = val.funciones_cargo_resuelto;
      } else if (typeof val.funciones_cargo_resuelto === 'string') {
        try { funcionesCargo = JSON.parse(val.funciones_cargo_resuelto); } catch (_) {}
      }

      const cargoData = {
        id: val.cargo_id,
        nombre: val.cargo_nombre,
        codigo: val.cargo_codigo,
        grado: val.cargo_grado,
        dependencia: val.cargo_dependencia_resuelto || val.cargo_dependencia,
        requisito_experiencia_meses: Number(val.requisito_minimo_meses) || 54,
        requisitos_formacion: val.requisitos_formacion_resuelto || val.requisitos_formacion,
        funciones_cargo: funcionesCargo
      };

      const candidatoData = {
        nombre: val.candidato_nombre,
        documento: val.candidato_documento,
        email: val.candidato_email,
        telefono: val.candidato_telefono
      };

      // 4. Preparar archivos para análisis: Se analizan todos los documentos adjuntos
      // para permitir extraer cargos faltantes o resoluciones múltiples de un mismo documento.
      const archivosParaAnalizar = [...archivos];

      const titulosAgregados = [];
      const certsAgregados = [];
      const noAplicanAgregados = [];

      let maxCertNum = 0;
      certificadosExistentes.forEach(c => {
        const m = (c.id_certificado || '').match(/CERT-(\d+)/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxCertNum) maxCertNum = num;
        }
      });

      console.log(`[Ingresos] Analizando con IA ${archivosParaAnalizar.length} archivo(s) para validación ${id}`);

      for (let i = 0; i < archivosParaAnalizar.length; i++) {
        const arch = archivosParaAnalizar[i];
        console.log(`[Ingresos] Procesando archivo ${i + 1} de ${archivosParaAnalizar.length}: ${arch.name}`);
        try {
          const analisisNuevo = await geminiIngresosService.analizarDocumentosConGemini(
            [arch],
            cargoData,
            candidatoData
          );

          // 5. Integrar Formación Académica
          const nuevosTitulos = analisisNuevo.formacion_academica || [];
          nuevosTitulos.forEach((nt) => {
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

          // 6. Integrar Certificados Laborales con protección anti-duplicados inteligente
          const normStr = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').trim();
          const nuevosCerts = analisisNuevo.certificados || [];
          nuevosCerts.forEach(nc => {
            const existe = certificadosExistentes.some(ce => {
              const ent1 = normStr(ce.entidad);
              const ent2 = normStr(nc.entidad);
              const mismaEntidad = ent1 && ent2 && (ent1 === ent2 || ent1.includes(ent2) || ent2.includes(ent1));

              const cargo1 = normStr(ce.cargo_certificado || ce.cargo);
              const cargo2 = normStr(nc.cargo_certificado || nc.cargo);
              const mismoCargo = cargo1 && cargo2 && cargo1 === cargo2;

              const fIni1 = String(ce.fecha_inicio || '').trim();
              const fIni2 = String(nc.fecha_inicio || '').trim();
              const fFin1 = String(ce.fecha_fin || '').trim();
              const fFin2 = String(nc.fecha_fin || '').trim();

              const mismaFecha = (fIni1 && fIni2 && fIni1 === fIni2) || (fFin1 && fFin2 && fFin1 === fFin2);

              return mismaEntidad && mismoCargo && mismaFecha;
            });
            if (!existe) {
              maxCertNum++;
              nc.id_certificado = `CERT-${maxCertNum}`;
              certificadosExistentes.push(nc);
              certsAgregados.push(nc);
            }
          });

          // 7. Integrar Documentos No Aplican
          const nuevosNoAplican = analisisNuevo.documentos_no_aplican || [];
          nuevosNoAplican.forEach(na => {
            const existe = noAplicanExistente.some(ne => 
              (ne.nombre_archivo && na.nombre_archivo && ne.nombre_archivo.toLowerCase() === na.nombre_archivo.toLowerCase())
            );
            if (!existe) {
              na.id = `NO-APLICA-${noAplicanExistente.length + 1}`;
              noAplicanExistente.push(na);
              noAplicanAgregados.push(na);
            }
          });
        } catch (errArch) {
          console.error(`[Ingresos] Error analizando archivo ${arch.name}:`, errArch.message);
          if (archivos.length === 1) {
            throw errArch;
          }
        }

        // Breve pausa preventiva entre llamadas para proteger la cuota por minuto de Gemini
        if (i < archivos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      // 8. Recalcular determinísticamente tiempos y traslapes de TODOS los certificados
      const auditResult = timeCalculatorService.auditCertificatesAndCalculateTotals(
        certificadosExistentes,
        cargoData.requisito_experiencia_meses || 54,
        formacionExistente
      );

      const certificadosFinales = auditResult.certificados || certificadosExistentes;
      const consolidadoFinal = auditResult.consolidado || {
        requisito_minimo_meses: cargoData.requisito_experiencia_meses || 54,
        experiencia_relacionada_meses: 0,
        experiencia_no_relacionada_meses: 0,
        tiempo_excluido_por_traslapes_meses: 0,
        diferencia_meses: 0,
        resultado_final: 'REQUIERE_REVISION',
        justificacion: '',
        requiere_revision_humana: true
      };

      // 9. Persistir cambios en la BD
      await client.query('BEGIN');

      const updateValQuery = `
        UPDATE ingreso_validaciones
        SET formacion_academica = $1,
            documentos_no_aplican = $2,
            experiencia_relacionada_meses = $3,
            experiencia_no_relacionada_meses = $4,
            tiempo_excluido_traslapes_meses = $5,
            diferencia_meses = $6,
            resultado_final = $7,
            justificacion_final = $8,
            requiere_revision_humana = $9,
            updated_at = NOW()
        WHERE id = $10;
      `;
      const noAplicanFinal = sanitizarDocumentosNoAplican(noAplicanExistente, certificadosFinales, formacionExistente);

      await client.query(updateValQuery, [
        JSON.stringify(formacionExistente),
        JSON.stringify(noAplicanFinal),
        Number(consolidadoFinal.experiencia_relacionada_meses) || 0,
        Number(consolidadoFinal.experiencia_no_relacionada_meses) || 0,
        Number(consolidadoFinal.tiempo_excluido_por_traslapes_meses) || 0,
        Number(consolidadoFinal.diferencia_meses) || 0,
        consolidadoFinal.resultado_final || 'REQUIERE_REVISION',
        consolidadoFinal.justificacion || '',
        Boolean(consolidadoFinal.requiere_revision_humana),
        id
      ]);

      // Reemplazar certificados en ingreso_certificados
      await client.query('DELETE FROM ingreso_certificados WHERE validacion_id = $1', [id]);
      for (const cert of certificadosFinales) {
        const certQuery = `
          INSERT INTO ingreso_certificados (
            validacion_id, id_certificado, entidad, nit_entidad, ciudad_expedicion, fecha_expedicion,
            firmante, cargo_firmante, tipo_vinculo, cargo_certificado, codigo_cargo, grado_cargo,
            dependencia, numero_contrato_o_acto, fecha_inicio, fecha_fin, vinculo_vigente,
            funciones_certificadas, experiencia_profesional, clasificacion_experiencia,
            experiencia_relacionada_json, tiempo_certificado_json, meses_certificados,
            traslapes_json, tiempo_valido_meses, documento_json, observaciones_json, nombre_archivo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28);
        `;
        const certValues = [
          id,
          cert.id_certificado || 'CERT-1',
          cert.entidad || 'N/A',
          cert.nit_entidad || null,
          cert.ciudad_expedicion || null,
          cert.fecha_expedicion || null,
          cert.firmante || null,
          cert.cargo_firmante || null,
          cert.tipo_vinculo || null,
          cert.cargo_certificado || 'N/A',
          cert.codigo_cargo || null,
          cert.grado_cargo || null,
          cert.dependencia || null,
          cert.numero_contrato_o_acto || null,
          cert.fecha_inicio || null,
          cert.fecha_fin || null,
          cert.vinculo_vigente || false,
          JSON.stringify(cert.funciones_certificadas || []),
          cert.experiencia_profesional !== false,
          cert.clasificacion_experiencia || 'RELACIONADA',
          JSON.stringify(cert.experiencia_relacionada || {}),
          JSON.stringify(cert.tiempo_certificado || {}),
          cert.tiempo_certificado?.meses_totales_aproximados || 0,
          JSON.stringify(cert.traslapes || []),
          cert.tiempo_valido?.meses_totales || cert.tiempo_certificado?.meses_totales_aproximados || 0,
          JSON.stringify({ ...(cert.documento || {}), verificacion_formal: cert.verificacion_formal || {} }),
          JSON.stringify(cert.observaciones || []),
          cert.nombre_archivo || null
        ];
        await client.query(certQuery, certValues);
      }

      await client.query('COMMIT');

      // 10. Devolver la respuesta completa
      const respuestaValidacion = {
        id: val.id,
        candidato: candidatoData,
        cargo_evaluado: cargoData,
        consolidado: consolidadoFinal,
        certificados: certificadosFinales,
        formacion_academica: formacionExistente,
        documentos_no_aplican: noAplicanFinal,
        created_at: val.created_at
      };

      res.json({
        success: true,
        mensaje: 'Documento(s) analizado(s) e incorporado(s) exitosamente al expediente.',
        resumen_ia: {
          titulos_agregados: titulosAgregados,
          certificados_agregados: certsAgregados,
          no_aplican_agregados: noAplicanAgregados,
          archivos_omitidos_duplicados: archivosYaExistentes
        },
        validacion: respuestaValidacion
      });

    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[Ingresos] Error en /adjuntar-y-analizar:', err);
      res.status(500).json({ error: 'Error al adjuntar y analizar documentos: ' + err.message });
    } finally {
      client.release();
    }
  });

  /**
   * 7.5 GET /api/ingresos/archivos/:nombre - Buscar archivo globalmente o en cache
   */
  router.get('/archivos/:nombre', async (req, res) => {
    try {
      const { nombre } = req.params;
      const targetName = decodeURIComponent(nombre).trim();
      const safeName = path.basename(targetName);

      // Buscar en cache
      if (fs.existsSync(CACHE_DIR)) {
        const files = fs.readdirSync(CACHE_DIR);
        const match = files.find(f => 
          f.toLowerCase() === safeName.toLowerCase() ||
          f.toLowerCase() === `${safeName.toLowerCase()}.pdf` ||
          f.toLowerCase().includes(safeName.toLowerCase().replace(/\.pdf$/i, '')) ||
          safeName.toLowerCase().includes(f.toLowerCase().replace(/\.pdf$/i, ''))
        );
        if (match) {
          const foundPath = path.join(CACHE_DIR, match);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(foundPath))}"`);
          return res.sendFile(foundPath);
        }
      }

      // Buscar en base de datos global
      const dbRes = await pool.query(`
        SELECT archivo_base64, mime_type, nombre_archivo 
        FROM ingreso_archivos 
        WHERE LOWER(nombre_archivo) = LOWER($1) OR LOWER(nombre_archivo) LIKE LOWER($2)
        ORDER BY created_at DESC LIMIT 1
      `, [safeName, `%${safeName.replace(/\.pdf$/i, '')}%`]);

      if (dbRes.rows.length > 0 && dbRes.rows[0].archivo_base64) {
        const row = dbRes.rows[0];
        const cleanBase64 = row.archivo_base64.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        res.setHeader('Content-Type', row.mime_type || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.nombre_archivo)}"`);
        return res.send(buffer);
      }

      return res.status(404).json({ error: `Archivo "${safeName}" no encontrado.` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * 8. GET /api/ingresos/validaciones/:id/excel - Descarga del dictamen en Excel
   */
  router.get('/validaciones/:id/excel', async (req, res) => {
    try {
      const { id } = req.params;
      const { genero, genero_director, es_encargado, nombre, nombre_director } = req.query;

      // Obtener data completa con candidatos, formación y documentos no aplicables
      const valQuery = `
        SELECT v.*, c.nombre as candidato_nombre, c.documento as candidato_documento,
               c.email as candidato_email, c.telefono as candidato_telefono,
               COALESCE(v.requisitos_formacion, p.requisitos, ic.requisitos_formacion, '') as requisitos_formacion_resuelto,
               COALESCE(v.cargo_dependencia, p.dependencia_cargo, ic.dependencia, 'Secretaría Jurídica Distrital') as cargo_dependencia_resuelto,
               COALESCE(p.funciones, ic.funciones_cargo, '[]'::jsonb) as funciones_cargo_resuelto
        FROM ingreso_validaciones v
        LEFT JOIN ingreso_candidatos c ON v.candidato_id = c.id
        LEFT JOIN LATERAL (
          SELECT p.dependencia_cargo, p.requisitos, p.funciones
          FROM planta_personal_sjd p
          WHERE (v.id_plaza IS NOT NULL AND p.id_plaza = v.id_plaza)
             OR (v.id_sideap IS NOT NULL AND p.id_sideap = v.id_sideap)
             OR (v.id_perno IS NOT NULL AND p.id_perno = v.id_perno)
             OR (v.id_plaza IS NULL AND v.id_sideap IS NULL AND v.id_perno IS NULL AND p.codigo = v.cargo_codigo AND p.grado = v.cargo_grado)
          ORDER BY 
            CASE WHEN v.id_plaza IS NOT NULL AND p.id_plaza = v.id_plaza THEN 1
                 WHEN v.id_sideap IS NOT NULL AND p.id_sideap = v.id_sideap THEN 2
                 WHEN v.id_perno IS NOT NULL AND p.id_perno = v.id_perno THEN 3
                 ELSE 4 END
          LIMIT 1
        ) p ON true
        LEFT JOIN LATERAL (
          SELECT ic.dependencia, ic.requisitos_formacion, ic.funciones_cargo
          FROM ingreso_cargos ic
          WHERE (v.cargo_id IS NOT NULL AND ic.id = v.cargo_id)
             OR (v.cargo_nombre IS NOT NULL AND ic.nombre ILIKE v.cargo_nombre)
          LIMIT 1
        ) ic ON true
        WHERE v.id = $1;
      `;
      const valRes = await pool.query(valQuery, [id]);
      if (valRes.rows.length === 0) {
        return res.status(404).json({ error: 'Validación no encontrada.' });
      }

      const certsQuery = 'SELECT * FROM ingreso_certificados WHERE validacion_id = $1 ORDER BY fecha_inicio ASC;';
      const certsRes = await pool.query(certsQuery, [id]);

      const val = valRes.rows[0];

      let funcionesCargo = [];
      if (Array.isArray(val.funciones_cargo_resuelto)) {
        funcionesCargo = val.funciones_cargo_resuelto;
      } else if (typeof val.funciones_cargo_resuelto === 'string') {
        try { funcionesCargo = JSON.parse(val.funciones_cargo_resuelto); } catch (_) {}
      }

      const payloadData = {
        config_director: {
          genero: (genero || genero_director || 'MASCULINO').toUpperCase(),
          es_encargado: es_encargado !== undefined ? (String(es_encargado) === 'true' || es_encargado === true || es_encargado === '1') : true,
          nombre: nombre || nombre_director || ''
        },
        candidato: {
          nombre: val.candidato_nombre,
          documento: val.candidato_documento,
          email: val.candidato_email,
          telefono: val.candidato_telefono
        },
        cargo_evaluado: {
          id: val.cargo_id,
          id_sideap: val.id_sideap,
          id_perno: val.id_perno,
          id_plaza: val.id_plaza,
          nombre: val.cargo_nombre,
          codigo: val.cargo_codigo,
          grado: val.cargo_grado,
          dependencia: val.cargo_dependencia_resuelto || val.cargo_dependencia || 'Secretaría Jurídica Distrital',
          requisito_experiencia_meses: Number(val.requisito_minimo_meses),
          requisitos_formacion: val.requisitos_formacion_resuelto || val.requisitos_formacion || '',
          funciones_cargo: funcionesCargo
        },
        consolidado: {
          requisito_minimo_meses: Number(val.requisito_minimo_meses),
          experiencia_relacionada_meses: Number(val.experiencia_relacionada_meses),
          tiempo_excluido_por_traslapes_meses: Number(val.tiempo_excluido_traslapes_meses),
          diferencia_meses: Number(val.diferencia_meses),
          resultado_final: val.resultado_final,
          justificacion: val.justificacion_final
        },
        formacion_academica: val.formacion_academica || [],
        documentos_no_aplican: val.documentos_no_aplican || [],
        evaluador: val.evaluador_email || 'Profesional Universitario DGC',
        certificados: certsRes.rows.map(r => ({
          id_certificado: r.id_certificado,
          entidad: r.entidad,
          cargo_certificado: r.cargo_certificado,
          numero_contrato_o_acto: r.numero_contrato_o_acto || (r.documento_json?.numero_contrato_o_acto) || null,
          tipo_vinculo: r.tipo_vinculo,
          fecha_inicio: r.fecha_inicio,
          fecha_fin: r.fecha_fin,
          vinculo_vigente: r.vinculo_vigente,
          clasificacion_experiencia: r.clasificacion_experiencia,
          tiempo_certificado: r.tiempo_certificado_json,
          traslapes: r.traslapes_json,
          experiencia_relacionada: r.experiencia_relacionada_json,
          documento: r.documento_json,
          verificacion_formal: r.verificacion_formal
        }))
      };

      const buffer = await excelReportService.generarReporteExcelValidacion(payloadData);

      const nombreLimpio = (val.candidato_nombre || 'Candidato').replace(/\s+/g, '_');
      const codCargo = (val.cargo_codigo || 'Cargo').replace(/\s+/g, '_');
      const filename = `2311300-FT-318_Certificado_Cumplimiento_Requisitos_${nombreLimpio}_${codCargo}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      console.error('[Ingresos] Error al exportar Excel:', err);
      res.status(500).json({ error: 'Error al generar Excel: ' + err.message });
    }
  });

  return router;
};
