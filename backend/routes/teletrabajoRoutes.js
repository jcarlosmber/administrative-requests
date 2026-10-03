const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Directorios para almacenamiento de archivos
const BASE_UPLOADS = path.join(__dirname, '../uploads/teletrabajo');
const DIRS = {
  resoluciones: path.join(BASE_UPLOADS, 'resoluciones'),
  acuerdos: path.join(BASE_UPLOADS, 'acuerdos'),
  seguimientos: path.join(BASE_UPLOADS, 'seguimientos'),
};

Object.values(DIRS).forEach((d) => {
  if (!fs.existsSync(d)) {
    try {
      fs.mkdirSync(d, { recursive: true });
    } catch (e) {
      console.error(`[Teletrabajo] Error creando directorio ${d}:`, e.message);
    }
  }
});

const guardarArchivoBase64 = (folder, nombre, base64Data) => {
  try {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    const cleanBase64 = base64Data.includes(';base64,')
      ? base64Data.split(';base64,')[1]
      : base64Data;
    const safeName = `${Date.now()}_${path.basename(nombre)}`;
    const destPath = path.join(folder, safeName);
    fs.writeFileSync(destPath, Buffer.from(cleanBase64, 'base64'));
    return { destPath, safeName };
  } catch (e) {
    console.error(`[Teletrabajo] Error guardando archivo ${nombre}:`, e.message);
    return null;
  }
};

module.exports = function (pool) {
  // =========================================================================
  // 1. CENSO INTEGRAL DE PERSONAS Y PLANTA
  // =========================================================================
  router.get('/personas', async (req, res) => {
    try {
      const q = `
        SELECT 
          p.id_plaza,
          p.id_sideap,
          p.nivel,
          p.cargo,
          p.codigo,
          p.grado,
          p.dependencia_cargo,
          p.dependencia_funcional,
          p.titular_cedula,
          p.titular_nombre,
          p.tipo_vinculacion,
          p.situacion_administrativa,
          -- Viabilidad del cargo
          COALESCE(cfg.es_teletrabajable, TRUE) as cargo_es_teletrabajable,
          COALESCE(cfg.max_dias_semana, 2) as cargo_max_dias,
          -- Asignación activa si existe
          a.id as asignacion_id,
          a.modalidad,
          a.submodalidad,
          a.resolucion_id,
          a.numero_resolucion_display,
          a.fecha_inicio as asignacion_desde,
          a.fecha_fin as asignacion_hasta,
          a.esquema_dias_tipo,
          a.dias_por_semana,
          a.dias_semana_fijos,
          a.excepcion_jefe_aprobada,
          a.motivo_excepcion_jefe,
          a.estado as asignacion_estado,
          -- Información de acuerdo de compromiso
          ac.id as acuerdo_id,
          ac.cargo_al_momento as acuerdo_cargo,
          ac.fecha_suscripcion as acuerdo_fecha,
          ac.archivo_acuerdo_url as acuerdo_archivo_url,
          ac.nombre_archivo as acuerdo_nombre_archivo,
          CASE 
            WHEN a.id IS NOT NULL AND ac.id IS NULL THEN TRUE
            WHEN a.id IS NOT NULL AND ac.id IS NOT NULL AND LOWER(TRIM(ac.cargo_al_momento)) != LOWER(TRIM(p.cargo)) THEN TRUE
            ELSE FALSE
          END as requiere_nuevo_acuerdo
        FROM public.planta_personal_sjd p
        LEFT JOIN public.teletrabajo_cargos_config cfg 
          ON cfg.cargo_nombre = p.cargo AND cfg.codigo = p.codigo AND cfg.grado = p.grado
        LEFT JOIN public.teletrabajo_asignaciones a 
          ON a.servidor_cedula = p.titular_cedula AND a.estado = 'ACTIVO'
        LEFT JOIN LATERAL (
          SELECT * FROM public.teletrabajo_acuerdos 
          WHERE servidor_cedula = p.titular_cedula 
          ORDER BY fecha_suscripcion DESC, created_at DESC 
          LIMIT 1
        ) ac ON TRUE
        WHERE p.titular_cedula IS NOT NULL AND p.titular_cedula != ''
        ORDER BY p.dependencia_cargo ASC, p.titular_nombre ASC;
      `;
      const result = await pool.query(q);
      res.json(result.rows);
    } catch (err) {
      console.error('[Teletrabajo] Error en /personas:', err);
      res.status(500).json({ error: 'Error al obtener personal de la entidad: ' + err.message });
    }
  });

  // =========================================================================
  // 2. GESTIÓN DE RESOLUCIONES GENERALES
  // =========================================================================
  router.get('/resoluciones', async (req, res) => {
    try {
      const q = `
        SELECT 
          r.*,
          COUNT(a.id) FILTER (WHERE a.estado = 'ACTIVO') as total_personas_activas,
          COUNT(a.id) as total_personas_historico
        FROM public.teletrabajo_resoluciones r
        LEFT JOIN public.teletrabajo_asignaciones a ON a.resolucion_id = r.id
        GROUP BY r.id
        ORDER BY r.fecha_expedicion DESC, r.created_at DESC;
      `;
      const result = await pool.query(q);
      res.json(result.rows);
    } catch (err) {
      console.error('[Teletrabajo] Error en /resoluciones:', err);
      res.status(500).json({ error: 'Error al listar resoluciones: ' + err.message });
    }
  });

  router.post('/resoluciones', async (req, res) => {
    try {
      const {
        numero_resolucion,
        anio,
        fecha_expedicion,
        fecha_inicio_vigencia,
        fecha_fin_vigencia,
        descripcion,
        modalidad_principal,
        archivo_base64,
        nombre_archivo,
      } = req.body;

      if (!numero_resolucion || !fecha_expedicion || !fecha_inicio_vigencia || !fecha_fin_vigencia) {
        return res.status(400).json({ error: 'Los campos número, fecha de expedición y fechas de vigencia son obligatorios.' });
      }

      let archivo_url = null;
      let final_nombre_archivo = nombre_archivo || null;

      if (archivo_base64 && nombre_archivo) {
        const saved = guardarArchivoBase64(DIRS.resoluciones, nombre_archivo, archivo_base64);
        if (saved) {
          final_nombre_archivo = saved.safeName;
          archivo_url = `/api/teletrabajo/resoluciones/archivo/${encodeURIComponent(saved.safeName)}`;
        }
      }

      const q = `
        INSERT INTO public.teletrabajo_resoluciones (
          numero_resolucion, anio, fecha_expedicion, fecha_inicio_vigencia, fecha_fin_vigencia,
          descripcion, modalidad_principal, archivo_pdf_url, nombre_archivo, estado, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'VIGENTE', NOW())
        RETURNING *;
      `;

      const values = [
        numero_resolucion.trim(),
        parseInt(anio, 10) || new Date(fecha_expedicion).getFullYear() || new Date().getFullYear(),
        fecha_expedicion,
        fecha_inicio_vigencia,
        fecha_fin_vigencia,
        descripcion || '',
        modalidad_principal || 'TELETRABAJO',
        archivo_url,
        final_nombre_archivo,
      ];

      const result = await pool.query(q, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[Teletrabajo] Error creando resolución:', err);
      res.status(500).json({ error: 'Error al guardar resolución: ' + err.message });
    }
  });

  router.get('/resoluciones/archivo/:nombre', (req, res) => {
    try {
      const filename = path.basename(req.params.nombre);
      const filePath = path.join(DIRS.resoluciones, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo de resolución no encontrado' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(filePath);
    } catch (err) {
      res.status(500).json({ error: 'Error al servir archivo: ' + err.message });
    }
  });

  router.put('/resoluciones/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        numero_resolucion,
        anio,
        fecha_expedicion,
        fecha_inicio_vigencia,
        fecha_fin_vigencia,
        descripcion,
        modalidad_principal,
        estado,
        archivo_base64,
        nombre_archivo,
      } = req.body;

      let archivoUpdateClause = '';
      const params = [
        numero_resolucion,
        parseInt(anio, 10),
        fecha_expedicion,
        fecha_inicio_vigencia,
        fecha_fin_vigencia,
        descripcion,
        modalidad_principal,
        estado,
        id,
      ];

      if (archivo_base64 && nombre_archivo) {
        const saved = guardarArchivoBase64(DIRS.resoluciones, nombre_archivo, archivo_base64);
        if (saved) {
          archivoUpdateClause = `, archivo_pdf_url = '/api/teletrabajo/resoluciones/archivo/${encodeURIComponent(saved.safeName)}', nombre_archivo = '${saved.safeName}'`;
        }
      }

      const q = `
        UPDATE public.teletrabajo_resoluciones
        SET 
          numero_resolucion = $1,
          anio = $2,
          fecha_expedicion = $3,
          fecha_inicio_vigencia = $4,
          fecha_fin_vigencia = $5,
          descripcion = $6,
          modalidad_principal = $7,
          estado = $8,
          updated_at = NOW()
          ${archivoUpdateClause}
        WHERE id = $9
        RETURNING *;
      `;

      const result = await pool.query(q, params);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Resolución no encontrada' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('[Teletrabajo] Error actualizando resolución:', err);
      res.status(500).json({ error: 'Error al actualizar resolución: ' + err.message });
    }
  });

  // =========================================================================
  // 3. CONFIGURACIÓN DE CARGOS TELETRABAJABLES
  // =========================================================================
  router.get('/cargos', async (req, res) => {
    try {
      const q = `
        SELECT 
          cfg.*,
          COUNT(p.id_plaza) as total_titulares_cargo
        FROM public.teletrabajo_cargos_config cfg
        LEFT JOIN public.planta_personal_sjd p 
          ON p.cargo = cfg.cargo_nombre AND p.codigo = cfg.codigo AND p.grado = cfg.grado
        GROUP BY cfg.id
        ORDER BY cfg.es_teletrabajable DESC, cfg.cargo_nombre ASC;
      `;
      const result = await pool.query(q);
      res.json(result.rows);
    } catch (err) {
      console.error('[Teletrabajo] Error en /cargos:', err);
      res.status(500).json({ error: 'Error al listar cargos: ' + err.message });
    }
  });

  router.put('/cargos/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { es_teletrabajable, max_dias_semana, justificacion_estudio } = req.body;

      const q = `
        UPDATE public.teletrabajo_cargos_config
        SET 
          es_teletrabajable = $1,
          max_dias_semana = $2,
          justificacion_estudio = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *;
      `;
      const result = await pool.query(q, [es_teletrabajable, max_dias_semana, justificacion_estudio, id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cargo no encontrado' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('[Teletrabajo] Error actualizando cargo:', err);
      res.status(500).json({ error: 'Error al actualizar viabilidad de cargo: ' + err.message });
    }
  });

  // =========================================================================
  // 4. ASIGNACIONES DE TELETRABAJO Y TRABAJO EN CASA POR SERVIDOR
  // =========================================================================
  router.get('/asignaciones', async (req, res) => {
    try {
      const q = `
        SELECT 
          a.*,
          r.numero_resolucion,
          r.archivo_pdf_url as resolucion_pdf_url,
          ac.id as acuerdo_id,
          ac.fecha_suscripcion as acuerdo_fecha,
          ac.archivo_acuerdo_url
        FROM public.teletrabajo_asignaciones a
        LEFT JOIN public.teletrabajo_resoluciones r ON r.id = a.resolucion_id
        LEFT JOIN LATERAL (
          SELECT * FROM public.teletrabajo_acuerdos 
          WHERE asignacion_id = a.id 
          ORDER BY fecha_suscripcion DESC 
          LIMIT 1
        ) ac ON TRUE
        ORDER BY a.created_at DESC;
      `;
      const result = await pool.query(q);
      res.json(result.rows);
    } catch (err) {
      console.error('[Teletrabajo] Error en /asignaciones:', err);
      res.status(500).json({ error: 'Error al listar asignaciones: ' + err.message });
    }
  });

  router.post('/asignaciones', async (req, res) => {
    try {
      const {
        servidor_cedula,
        servidor_nombre,
        id_plaza,
        cargo_actual,
        codigo_cargo,
        grado_cargo,
        dependencia,
        modalidad,
        submodalidad,
        resolucion_id,
        fecha_inicio,
        fecha_fin,
        cargo_es_teletrabajable,
        excepcion_jefe_aprobada,
        motivo_excepcion_jefe,
        esquema_dias_tipo,
        dias_por_semana,
        dias_semana_fijos,
        observaciones,
      } = req.body;

      if (!servidor_cedula || !servidor_nombre || !cargo_actual || !modalidad || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Datos incompletos para registrar la asignación de modalidad.' });
      }

      // Regla de Negocio: Si el cargo no es teletrabajable y es modalidad de teletrabajo, requiere aval del jefe
      const esCualquierTeletrabajo = modalidad === 'TELETRABAJO' || modalidad === 'TELETRABAJO_AUTONOMO' || modalidad === 'AUTONOMO';
      if (esCualquierTeletrabajo && !cargo_es_teletrabajable && !excepcion_jefe_aprobada) {
        return res.status(400).json({
          error: 'El cargo actual no figura como teletrabajable en el manual. Para habilitarlo se requiere marcar la Aprobación Excepcional de la Jefatura con su respectiva justificación.',
        });
      }

      // Obtener display de resolución si se seleccionó
      let numero_resolucion_display = '';
      if (resolucion_id) {
        const resRes = await pool.query('SELECT numero_resolucion FROM public.teletrabajo_resoluciones WHERE id = $1', [resolucion_id]);
        if (resRes.rows.length > 0) {
          numero_resolucion_display = resRes.rows[0].numero_resolucion;
        }
      }

      // Desactivar asignaciones activas previas del mismo servidor
      await pool.query(
        `UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE servidor_cedula = $1 AND estado = 'ACTIVO'`,
        [servidor_cedula]
      );

      const q = `
        INSERT INTO public.teletrabajo_asignaciones (
          servidor_cedula, servidor_nombre, id_plaza, cargo_actual, codigo_cargo, grado_cargo,
          dependencia, modalidad, submodalidad, resolucion_id, numero_resolucion_display,
          fecha_inicio, fecha_fin, cargo_es_teletrabajable, excepcion_jefe_aprobada,
          motivo_excepcion_jefe, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
          estado, observaciones, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'ACTIVO', $20, NOW()
        )
        RETURNING *;
      `;

      const values = [
        servidor_cedula.trim(),
        servidor_nombre.trim(),
        id_plaza ? parseInt(id_plaza, 10) : null,
        cargo_actual.trim(),
        codigo_cargo || '',
        grado_cargo || '',
        dependencia || '',
        modalidad, // 'TELETRABAJO' o 'TRABAJO_EN_CASA'
        submodalidad || 'SUPLEMENTARIO',
        resolucion_id || null,
        numero_resolucion_display,
        fecha_inicio,
        fecha_fin,
        cargo_es_teletrabajable !== undefined ? cargo_es_teletrabajable : true,
        excepcion_jefe_aprobada || false,
        motivo_excepcion_jefe || null,
        esquema_dias_tipo || 'DIAS_FIJOS', // 'DIAS_FIJOS', 'DIAS_PARES', 'DIAS_IMPARES', 'CANTIDAD_LIBRE'
        parseInt(dias_por_semana, 10) || 2,
        JSON.stringify(Array.isArray(dias_semana_fijos) ? dias_semana_fijos : []),
        observaciones || '',
      ];

      const result = await pool.query(q, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[Teletrabajo] Error guardando asignación:', err);
      res.status(500).json({ error: 'Error al crear asignación: ' + err.message });
    }
  });

  router.put('/asignaciones/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        modalidad,
        submodalidad,
        resolucion_id,
        fecha_inicio,
        fecha_fin,
        cargo_es_teletrabajable,
        excepcion_jefe_aprobada,
        motivo_excepcion_jefe,
        esquema_dias_tipo,
        dias_por_semana,
        dias_semana_fijos,
        estado,
        observaciones,
      } = req.body;

      let numero_resolucion_display = null;
      if (resolucion_id) {
        const resRes = await pool.query('SELECT numero_resolucion FROM public.teletrabajo_resoluciones WHERE id = $1', [resolucion_id]);
        if (resRes.rows.length > 0) {
          numero_resolucion_display = resRes.rows[0].numero_resolucion;
        }
      }

      const q = `
        UPDATE public.teletrabajo_asignaciones
        SET 
          modalidad = COALESCE($1, modalidad),
          submodalidad = COALESCE($2, submodalidad),
          resolucion_id = $3,
          numero_resolucion_display = COALESCE($4, numero_resolucion_display),
          fecha_inicio = COALESCE($5, fecha_inicio),
          fecha_fin = COALESCE($6, fecha_fin),
          cargo_es_teletrabajable = COALESCE($7, cargo_es_teletrabajable),
          excepcion_jefe_aprobada = COALESCE($8, excepcion_jefe_aprobada),
          motivo_excepcion_jefe = $9,
          esquema_dias_tipo = COALESCE($10, esquema_dias_tipo),
          dias_por_semana = COALESCE($11, dias_por_semana),
          dias_semana_fijos = COALESCE($12, dias_semana_fijos),
          estado = COALESCE($13, estado),
          observaciones = $14,
          updated_at = NOW()
        WHERE id = $15
        RETURNING *;
      `;

      const values = [
        modalidad,
        submodalidad,
        resolucion_id || null,
        numero_resolucion_display,
        fecha_inicio,
        fecha_fin,
        cargo_es_teletrabajable,
        excepcion_jefe_aprobada,
        motivo_excepcion_jefe,
        esquema_dias_tipo,
        dias_por_semana,
        dias_semana_fijos ? JSON.stringify(dias_semana_fijos) : null,
        estado,
        observaciones,
        id,
      ];

      const result = await pool.query(q, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Asignación no encontrada' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('[Teletrabajo] Error actualizando asignación:', err);
      res.status(500).json({ error: 'Error al actualizar asignación: ' + err.message });
    }
  });

  // =========================================================================
  // 5. ACUERDOS DE COMPROMISO
  // =========================================================================
  router.get('/acuerdos', async (req, res) => {
    try {
      const q = `
        SELECT ac.*, p.dependencia_cargo, p.tipo_vinculacion
        FROM public.teletrabajo_acuerdos ac
        LEFT JOIN public.planta_personal_sjd p ON p.titular_cedula = ac.servidor_cedula
        ORDER BY ac.fecha_suscripcion DESC, ac.created_at DESC;
      `;
      const result = await pool.query(q);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Error al listar acuerdos: ' + err.message });
    }
  });

  router.post('/acuerdos', async (req, res) => {
    try {
      const {
        asignacion_id,
        servidor_cedula,
        servidor_nombre,
        cargo_al_momento,
        fecha_suscripcion,
        periodo_vigencia,
        archivo_base64,
        nombre_archivo,
        observaciones,
      } = req.body;

      if (!servidor_cedula || !servidor_nombre || !cargo_al_momento) {
        return res.status(400).json({ error: 'Cédula, nombre y cargo son requeridos para el acuerdo.' });
      }

      let archivo_url = null;
      let final_nombre_archivo = nombre_archivo || null;

      if (archivo_base64 && nombre_archivo) {
        const saved = guardarArchivoBase64(DIRS.acuerdos, nombre_archivo, archivo_base64);
        if (saved) {
          final_nombre_archivo = saved.safeName;
          archivo_url = `/api/teletrabajo/acuerdos/archivo/${encodeURIComponent(saved.safeName)}`;
        }
      }

      const q = `
        INSERT INTO public.teletrabajo_acuerdos (
          asignacion_id, servidor_cedula, servidor_nombre, cargo_al_momento,
          fecha_suscripcion, periodo_vigencia, archivo_acuerdo_url, nombre_archivo, es_vigente, observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
        RETURNING *;
      `;

      const values = [
        asignacion_id || null,
        servidor_cedula.trim(),
        servidor_nombre.trim(),
        cargo_al_momento.trim(),
        fecha_suscripcion || new Date().toISOString().split('T')[0],
        periodo_vigencia || 'ANUAL',
        archivo_url,
        final_nombre_archivo,
        observaciones || '',
      ];

      const result = await pool.query(q, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[Teletrabajo] Error guardando acuerdo:', err);
      res.status(500).json({ error: 'Error al registrar acuerdo de compromiso: ' + err.message });
    }
  });

  router.get('/acuerdos/archivo/:nombre', (req, res) => {
    try {
      const filename = path.basename(req.params.nombre);
      const filePath = path.join(DIRS.acuerdos, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo de acuerdo no encontrado' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(filePath);
    } catch (err) {
      res.status(500).json({ error: 'Error al servir archivo: ' + err.message });
    }
  });

  // =========================================================================
  // 6. SEGUIMIENTOS PERIÓDICOS POR RANGO DE FECHAS
  // =========================================================================
  router.get('/seguimientos', async (req, res) => {
    try {
      const { cedula, desde, hasta } = req.query;
      let conditions = [];
      let params = [];

      if (cedula) {
        params.push(cedula);
        conditions.push(`s.servidor_cedula = $${params.length}`);
      }
      if (desde) {
        params.push(desde);
        conditions.push(`s.fecha_corte_hasta >= $${params.length}`);
      }
      if (hasta) {
        params.push(hasta);
        conditions.push(`s.fecha_corte_desde <= $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const q = `
        SELECT s.*, p.cargo, p.dependencia_cargo
        FROM public.teletrabajo_seguimientos s
        LEFT JOIN public.planta_personal_sjd p ON p.titular_cedula = s.servidor_cedula
        ${whereClause}
        ORDER BY s.fecha_corte_hasta DESC, s.created_at DESC;
      `;
      const result = await pool.query(q, params);
      res.json(result.rows);
    } catch (err) {
      console.error('[Teletrabajo] Error en /seguimientos:', err);
      res.status(500).json({ error: 'Error al listar seguimientos: ' + err.message });
    }
  });

  router.post('/seguimientos', async (req, res) => {
    try {
      const {
        asignacion_id,
        servidor_cedula,
        servidor_nombre,
        fecha_corte_desde,
        fecha_corte_hasta,
        evaluador_nombre,
        evaluador_cargo,
        cumplimiento_nivel,
        calificacion_porcentaje,
        actividades_reportadas,
        archivo_base64,
        nombre_archivo,
        concepto_recomendacion,
        observaciones,
      } = req.body;

      if (!servidor_cedula || !fecha_corte_desde || !fecha_corte_hasta) {
        return res.status(400).json({ error: 'La cédula y el rango de fechas (desde y hasta) son obligatorios.' });
      }

      let soporte_url = null;
      let final_nombre_archivo = nombre_archivo || null;

      if (archivo_base64 && nombre_archivo) {
        const saved = guardarArchivoBase64(DIRS.seguimientos, nombre_archivo, archivo_base64);
        if (saved) {
          final_nombre_archivo = saved.safeName;
          soporte_url = `/api/teletrabajo/seguimientos/archivo/${encodeURIComponent(saved.safeName)}`;
        }
      }

      const q = `
        INSERT INTO public.teletrabajo_seguimientos (
          asignacion_id, servidor_cedula, servidor_nombre, fecha_corte_desde, fecha_corte_hasta,
          evaluador_nombre, evaluador_cargo, cumplimiento_nivel, calificacion_porcentaje,
          actividades_reportadas, soporte_evidencias_url, nombre_archivo_soporte,
          concepto_recomendacion, observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
      `;

      const values = [
        asignacion_id || null,
        servidor_cedula.trim(),
        servidor_nombre ? servidor_nombre.trim() : '',
        fecha_corte_desde,
        fecha_corte_hasta,
        evaluador_nombre || '',
        evaluador_cargo || '',
        cumplimiento_nivel || 'SATISFACTORIO',
        parseFloat(calificacion_porcentaje) || 100.0,
        actividades_reportadas || '',
        soporte_url,
        final_nombre_archivo,
        concepto_recomendacion || 'CONTINUAR',
        observaciones || '',
      ];

      const result = await pool.query(q, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[Teletrabajo] Error guardando seguimiento:', err);
      res.status(500).json({ error: 'Error al registrar seguimiento: ' + err.message });
    }
  });

  router.get('/seguimientos/archivo/:nombre', (req, res) => {
    try {
      const filename = path.basename(req.params.nombre);
      const filePath = path.join(DIRS.seguimientos, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo de seguimiento no encontrado' });
      }
      res.sendFile(filePath);
    } catch (err) {
      res.status(500).json({ error: 'Error al servir archivo: ' + err.message });
    }
  });

  // =========================================================================
  // 7. MÉTRICAS Y DASHBOARD CONSOLIDADO
  // =========================================================================
  router.get('/estadisticas', async (req, res) => {
    try {
      const totalPlantaQ = await pool.query('SELECT COUNT(*) FROM public.planta_personal_sjd WHERE titular_cedula IS NOT NULL AND titular_cedula != \'\'');
      const activasQ = await pool.query(`
        SELECT 
          COUNT(*) as total_activas,
          COUNT(*) FILTER (WHERE modalidad IN ('TELETRABAJO', 'TELETRABAJO_AUTONOMO', 'AUTONOMO')) as en_teletrabajo,
          COUNT(*) FILTER (WHERE modalidad = 'TRABAJO_EN_CASA') as en_trabajo_en_casa,
          COUNT(*) FILTER (WHERE excepcion_jefe_aprobada = TRUE) as con_excepcion_jefe,
          COUNT(*) FILTER (WHERE esquema_dias_tipo = 'DIAS_PARES') as dias_pares,
          COUNT(*) FILTER (WHERE esquema_dias_tipo = 'DIAS_IMPARES') as dias_impares
        FROM public.teletrabajo_asignaciones
        WHERE estado = 'ACTIVO';
      `);
      const resolucionesQ = await pool.query(`SELECT COUNT(*) FROM public.teletrabajo_resoluciones WHERE estado = 'VIGENTE'`);
      const acuerdosQ = await pool.query(`SELECT COUNT(*) FROM public.teletrabajo_acuerdos WHERE es_vigente = TRUE`);

      res.json({
        total_personal_planta: parseInt(totalPlantaQ.rows[0].count, 10),
        activas: activasQ.rows[0],
        total_resoluciones_vigentes: parseInt(resolucionesQ.rows[0].count, 10),
        total_acuerdos_firmados: parseInt(acuerdosQ.rows[0].count, 10),
      });
    } catch (err) {
      console.error('[Teletrabajo] Error en /estadisticas:', err);
      res.status(500).json({ error: 'Error al calcular estadísticas: ' + err.message });
    }
  });

  return router;
};
