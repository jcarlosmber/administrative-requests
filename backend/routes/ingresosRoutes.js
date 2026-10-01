const express = require('express');
const router = express.Router();
const geminiIngresosService = require('../services/geminiIngresosService');
const timeCalculatorService = require('../services/timeCalculatorService');
const excelReportService = require('../services/excelReportService');

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

        -- Garantizar columnas de ID SIDEAP, ID PERNO e ID PLAZA y nuevas secciones
        ALTER TABLE public.ingreso_cargos ADD COLUMN IF NOT EXISTS id_sideap INT, ADD COLUMN IF NOT EXISTS id_perno INT;
        ALTER TABLE public.ingreso_validaciones ADD COLUMN IF NOT EXISTS id_sideap INT, ADD COLUMN IF NOT EXISTS id_perno INT, ADD COLUMN IF NOT EXISTS id_plaza INT, ADD COLUMN IF NOT EXISTS formacion_academica JSONB DEFAULT '[]'::jsonb, ADD COLUMN IF NOT EXISTS documentos_no_aplican JSONB DEFAULT '[]'::jsonb;
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
      const { candidato, cargo_evaluado, certificados, consolidado, evaluador_email, formacion_academica, documentos_no_aplican } = req.body;

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
          candidato_id, cargo_id, cargo_nombre, cargo_codigo, cargo_grado,
          requisito_minimo_meses, experiencia_relacionada_meses, experiencia_no_relacionada_meses,
          tiempo_excluido_traslapes_meses, diferencia_meses, resultado_final,
          justificacion_final, requiere_revision_humana, evaluador_email, estado,
          id_sideap, id_perno, id_plaza, formacion_academica, documentos_no_aplican
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING id;
      `;
      const valValues = [
        candId,
        cargo_evaluado.id || null,
        cargo_evaluado.nombre || 'N/A',
        cargo_evaluado.codigo || '',
        cargo_evaluado.grado || '',
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
        SELECT v.*, c.nombre as candidato_nombre, c.documento as candidato_documento, c.email as candidato_email, c.telefono as candidato_telefono
        FROM ingreso_validaciones v
        LEFT JOIN ingreso_candidatos c ON v.candidato_id = c.id
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
          dependencia: val.cargo_dependencia || null,
          requisito_experiencia_meses: Number(val.requisito_minimo_meses)
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
          tiempo_certificado: r.tiempo_certificado_json,
          traslapes: r.traslapes_json,
          tiempo_valido: { meses_totales: Number(r.tiempo_valido_meses) },
          documento: r.documento_json,
          verificacion_formal: r.documento_json?.verificacion_formal || r.verificacion_formal || null,
          observaciones: r.observaciones_json,
          nombre_archivo: r.nombre_archivo
        })),
        formacion_academica: val.formacion_academica || [],
        documentos_no_aplican: val.documentos_no_aplican || [],
        created_at: val.created_at
      };

      res.json(responseData);
    } catch (err) {
      res.status(500).json({ error: 'Error al consultar validación: ' + err.message });
    }
  });

  /**
   * 7.1 PUT /api/ingresos/validaciones/:id - Actualiza formación académica, certificados y consolidado
   */
  router.put('/validaciones/:id', async (req, res) => {
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
        updates.push(`documentos_no_aplican = $${pIdx++}`);
        values.push(JSON.stringify(documentos_no_aplican));
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

      if (updates.length > 1) {
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

      // Si vienen certificados actualizados
      if (Array.isArray(certificados) && certificados.length > 0) {
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
  router.post('/validaciones/:id/update', handlerActualizarValidacion);

  /**
   * 7.2 DELETE /api/ingresos/validaciones/:id - Elimina una validación (soporta DELETE y POST /delete para WAF)
   */
  const handlerEliminarValidacion = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      await client.query('BEGIN');
      await client.query('DELETE FROM ingreso_certificados WHERE validacion_id = $1', [id]);
      await client.query('DELETE FROM ingreso_validaciones WHERE id = $1', [id]);
      await client.query('COMMIT');
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
  router.post('/validaciones/:id/delete', handlerEliminarValidacion);

  /**
   * 8. GET /api/ingresos/validaciones/:id/excel - Descarga del dictamen en Excel
   */
  router.get('/validaciones/:id/excel', async (req, res) => {
    try {
      const { id } = req.params;

      // Obtener data completa con candidatos, formación y documentos no aplicables
      const valQuery = `
        SELECT v.*, c.nombre as candidato_nombre, c.documento as candidato_documento,
               c.email as candidato_email, c.telefono as candidato_telefono
        FROM ingreso_validaciones v
        LEFT JOIN ingreso_candidatos c ON v.candidato_id = c.id
        WHERE v.id = $1;
      `;
      const valRes = await pool.query(valQuery, [id]);
      if (valRes.rows.length === 0) {
        return res.status(404).json({ error: 'Validación no encontrada.' });
      }

      const certsQuery = 'SELECT * FROM ingreso_certificados WHERE validacion_id = $1 ORDER BY fecha_inicio ASC;';
      const certsRes = await pool.query(certsQuery, [id]);

      const val = valRes.rows[0];
      const payloadData = {
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
          dependencia: val.cargo_dependencia || 'Secretaría Jurídica Distrital',
          requisito_experiencia_meses: Number(val.requisito_minimo_meses)
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

      const filename = `Dictamen_${(val.candidato_nombre || 'Candidato').replace(/\s+/g, '_')}_${val.cargo_codigo || 'Cargo'}.xlsx`;

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
