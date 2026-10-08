const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

module.exports = function (pool) {
  const router = express.Router();

  // Helper para obtener valor de celda en ExcelJS
  function getVal(cell) {
    if (!cell) return null;
    const v = cell.value;
    if (v === null || v === undefined) return null;
    if (typeof v === 'object') {
      if (v.result !== undefined && v.result !== null) {
        const res = typeof v.result === 'object' ? (v.result.text || '') : v.result;
        return String(res).toLowerCase().includes('[object object]') ? '' : res;
      }
      if (v.text !== undefined && v.text !== null) {
        const txt = String(v.text).trim();
        return txt.toLowerCase().includes('[object object]') ? '' : txt;
      }
      if (Array.isArray(v.richText)) {
        return v.richText.map(t => t.text || '').join('');
      }
      if (cell.text !== undefined && cell.text !== null) {
        const ct = String(cell.text).trim();
        return ct.toLowerCase().includes('[object object]') ? '' : ct;
      }
      return '';
    }
    const strVal = String(v).trim();
    if (strVal.toLowerCase().includes('[object object]')) return '';
    return v;
  }

  // Helper para limpiar documentos/cédulas (quitar puntos, comas, guiones, espacios)
  function cleanDoc(val) {
    if (val === null || val === undefined) return null;
    let str = String(val).trim();
    if (str.includes('.') && !isNaN(str) && Number(str) % 1 === 0) {
      str = String(Math.floor(Number(str)));
    }
    str = str.replace(/[\.,\s-]/g, '').trim();
    return str || null;
  }

  // Helper para limpiar montos monetarios o salarios
  function cleanMoney(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let str = String(val).replace(/[\$,\s]/g, '').trim();
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Helper para convertir cualquier formato de fecha (serial numérico de Excel ej. 31103, Date nativo o String)
  function cleanDate(val) {
    if (val === null || val === undefined || val === '') return null;

    // 1. Si ya es objeto Date nativo de JS
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      return val.toISOString().split('T')[0];
    }

    // 2. Si viene como número serial de Excel (ej: 31103 o 44927)
    let num = null;
    if (typeof val === 'number') {
      num = val;
    } else if (typeof val === 'string' && /^\d{4,6}(\.\d+)?$/.test(val.trim())) {
      num = parseFloat(val.trim());
    }

    if (num !== null && !isNaN(num) && num > 1000 && num < 100000) {
      // Excel epoch estándar: 1899-12-30 (compensa el año 1900 no bisiesto de Lotus)
      const msPerDay = 86400000;
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const jsDate = new Date(excelEpoch.getTime() + Math.round(num * msPerDay));
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString().split('T')[0];
      }
    }

    // 3. Si viene como cadena de texto
    const str = String(val).trim();
    if (!str) return null;

    // Formato ISO YYYY-MM-DD o YYYY/MM/DD
    const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, '0');
      const d = isoMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Formato latinoamericano DD/MM/YYYY o DD-MM-YYYY
    const latMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (latMatch) {
      const d = latMatch[1].padStart(2, '0');
      const m = latMatch[2].padStart(2, '0');
      const y = latMatch[3];
      return `${y}-${m}-${d}`;
    }

    // Intento general
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }

  // Helper para reparar texto con problemas de codificación (Mojibake UTF-8 vs Latin1 / Windows-1252)
  function cleanText(val) {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    if (!str || str.toLowerCase().includes('[object object]')) return '';

    // Si tiene secuencias típicas de mojibake (ej: DIRECCIÃ“N, SECRETARÃA)
    if (/[ÃÂâ]/.test(str)) {
      try {
        const decoded = Buffer.from(str, 'binary').toString('utf8');
        if (!decoded.includes('') && !/[ÃÂ]/.test(decoded)) {
          str = decoded;
        }
      } catch (e) {}
    }

    // Diccionario de correcciones de mojibake frecuentes en exportaciones de SIDEAP/PERNO
    str = str
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã/g, 'Á')
      .replace(/Ã‰/g, 'É')
      .replace(/Ã/g, 'Í')
      .replace(/Ã“/g, 'Ó')
      .replace(/Ã”/g, 'Ô')
      .replace(/Ãš/g, 'Ú')
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã‘/g, 'Ñ')
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€“/g, '-')
      .replace(/â€”/g, '—')
      .replace(/SECRETARÃA/gi, 'SECRETARÍA')
      .replace(/JURÃDICA/gi, 'JURÍDICA')
      .replace(/JURÃDICO/gi, 'JURÍDICO')
      .replace(/DIRECCIÃN/gi, 'DIRECCIÓN')
      .replace(/ADMINISTRACIÃN/gi, 'ADMINISTRACIÓN')
      .replace(/GESTIÃN/gi, 'GESTIÓN')
      .replace(/PLANEACIÃN/gi, 'PLANEACIÓN')
      .replace(/INSPECCIÃN/gi, 'INSPECCIÓN')
      .replace(/COMISIÃN/gi, 'COMISIÓN')
      .replace(/DISCIPLINARIÃ/gi, 'DISCIPLINARIA')
      .replace(/VINCULACIÃN/gi, 'VINCULACIÓN')
      .replace(/SITUACIÃN/gi, 'SITUACIÓN')
      .replace(/ASIGNACIÃN/gi, 'ASIGNACIÓN')
      .replace(/ÃA/g, 'ÍA')
      .replace(/Ãa/g, 'ía')
      .replace(/ÃO/g, 'ÍO')
      .replace(/Ão/g, 'ío');

    return str.replace(/\s+/g, ' ').trim();
  }

  // Helper especializado para normalizar dependencias de la Secretaría Jurídica Distrital
  function cleanDependencia(val) {
    let dep = cleanText(val).toUpperCase();
    if (!dep) return '';

    // Normalizaciones canónicas exactas de la entidad
    if (dep.includes('DOCTRINA') && dep.includes('NORMATIV')) {
      return 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS';
    }
    if (dep.includes('DESPACHO') && (dep.includes('SECRETAR') || dep.includes('JURIDIC') || dep.includes('JURÍDIC'))) {
      return 'DESPACHO SECRETARÍA JURÍDICA DISTRITAL';
    }
    if (dep.includes('GESTION JUDICIAL') || dep.includes('GESTIÓN JUDICIAL')) {
      return 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL';
    }
    if (dep.includes('POLITICA JURIDICA') || dep.includes('POLÍTICA JURÍDICA')) {
      return 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA';
    }
    if (dep.includes('DEFENSA JUDICIAL') || dep.includes('DAÑO ANTIJURIDICO') || dep.includes('DAÑO ANTIJURÍDICO')) {
      return 'DIRECCIÓN DISTRITAL DE DEFENSA JUDICIAL Y PREVENCIÓN DEL DAÑO ANTIJURÍDICO';
    }
    if (dep.includes('INSPECCION') || dep.includes('INSPECCIÓN') || dep.includes('VIGILANCIA') || dep.includes('SIN ANIMO') || dep.includes('SIN ÁNIMO')) {
      return 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL DE PERSONAS JURÍDICAS SIN ÁNIMO DE LUCRO';
    }
    if (dep.includes('PLANEACION') || dep.includes('PLANEACIÓN')) {
      return 'OFICINA ASESORA DE PLANEACIÓN';
    }
    if (dep.includes('CONTROL INTERNO') && !dep.includes('DISCIPLINARI')) {
      return 'OFICINA DE CONTROL INTERNO';
    }
    if (dep.includes('DISCIPLINARI')) {
      return 'OFICINA DE CONTROL DISCIPLINARIO INTERNO';
    }
    if (dep.includes('TECNOLOG') || dep.includes('TIC') || dep.includes('INFORMACION') || dep.includes('INFORMACIÓN')) {
      return 'OFICINA DE TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES';
    }
    if (dep.includes('CORPORATIVA') || dep.includes('GESTION CORPORATIVA') || dep.includes('GESTIÓN CORPORATIVA')) {
      return 'SUBDIRECCIÓN DE GESTIÓN CORPORATIVA';
    }

    return dep;
  }

  // Parseador de funciones
  function parseFunctions(funcionesText) {
    if (!funcionesText || typeof funcionesText !== 'string') return [];
    const lines = funcionesText.split(/\n+/);
    const result = [];
    let current = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^\d+[\.\)]\s*/.test(trimmed)) {
        if (current) result.push(current);
        current = trimmed;
      } else {
        if (current) {
          current += ' ' + trimmed;
        } else {
          current = trimmed;
        }
      }
    }
    if (current) result.push(current);
    return result.length > 0 ? result : [funcionesText.trim()];
  }

  // Asegurar tabla creada y columnas existentes
  async function ensureTables() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.planta_personal_sjd (
            id_plaza INT PRIMARY KEY,
            id_sideap INT,
            id_perno INT,
            nivel TEXT,
            cargo TEXT NOT NULL,
            codigo TEXT,
            grado TEXT,
            dependencia_cargo TEXT,
            dependencia_funcional TEXT,
            proposito TEXT,
            funciones JSONB DEFAULT '[]'::jsonb,
            requisitos TEXT,
            asignacion_basica NUMERIC(14, 2) DEFAULT 0,
            estado_cargo TEXT DEFAULT 'OCUPADO',
            titular_cedula TEXT,
            titular_nombre TEXT,
            situacion_titular TEXT,
            tipo_vinculacion TEXT,
            situacion_administrativa TEXT,
            encargo_cedula TEXT,
            encargo_nombre TEXT,
            es_encargo BOOLEAN DEFAULT FALSE,
            opec TEXT,
            tipo_funcionario TEXT,
            fecha_nacimiento DATE,
            direccion TEXT,
            telefono TEXT,
            sexo TEXT,
            fondo_salud TEXT,
            fondo_pension TEXT,
            fondo_cesantias TEXT,
            fecha_ingreso_entidad DATE,
            fecha_ingreso_distrito DATE,
            tipo_nombramiento TEXT,
            acto_nombramiento TEXT,
            numero_acto_nombramiento TEXT,
            fecha_acto_nombramiento DATE,
            total_devengado NUMERIC(14, 2),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Garantizar la presencia de todas las columnas si la tabla ya existía con un esquema previo
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS situacion_titular TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS es_encargo BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS opec TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS tipo_vinculacion TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS situacion_administrativa TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS encargo_cedula TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS encargo_nombre TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS tipo_funcionario TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS direccion TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS telefono TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS sexo TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS fondo_salud TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS fondo_pension TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS fondo_cesantias TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS tipo_nombramiento TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS acto_nombramiento TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS numero_acto_nombramiento TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS fecha_acto_nombramiento DATE;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS total_devengado NUMERIC(14, 2);
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS dependencia_funcional TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS proposito TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS funciones JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS requisitos TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS asignacion_basica NUMERIC(14, 2) DEFAULT 0;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS estado_cargo TEXT DEFAULT 'OCUPADO';
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS id_escalera TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS peldano_escalera INT;

        CREATE TABLE IF NOT EXISTS public.nomina_import_logs (
            id SERIAL PRIMARY KEY,
            tipo_archivo TEXT NOT NULL,
            nombre_archivo TEXT NOT NULL,
            registros_procesados INT DEFAULT 0,
            registros_actualizados INT DEFAULT 0,
            detalles JSONB DEFAULT '{}'::jsonb,
            usuario_email TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS public.personal_perno_sjd (
            cedula TEXT PRIMARY KEY,
            primer_apellido TEXT,
            segundo_apellido TEXT,
            nombres TEXT,
            nombre_completo TEXT,
            estado_funcionario TEXT DEFAULT 'A',
            estado_descripcion TEXT,
            fecha_nacimiento DATE,
            direccion TEXT,
            telefono TEXT,
            sexo TEXT,
            libreta_militar TEXT,
            clase_libreta TEXT,
            distrito_militar TEXT,
            tipo_sangre TEXT,
            rh TEXT,
            tipo_funcionario TEXT,
            fecha_ingreso_entidad DATE,
            fecha_ingreso_distrito DATE,
            fecha_ingreso_nacion DATE,
            codigo_eps TEXT,
            fondo_salud TEXT,
            codigo_fondo_pensiones TEXT,
            fondo_pension TEXT,
            codigo_fondo_cesantias TEXT,
            fondo_cesantias TEXT,
            dependencia_cod TEXT,
            dependencia TEXT,
            cargo_cod TEXT,
            grado TEXT,
            asignacion_basica NUMERIC(14, 2),
            cargo TEXT,
            posicion_planta INT,
            sede_cod TEXT,
            sede TEXT,
            tipo_nombramiento TEXT,
            acto_nombramiento TEXT,
            fecha_efectiva_nombramiento DATE,
            numero_acto_nombramiento TEXT,
            fecha_acto_nombramiento DATE,
            fecha_efectiva_encargo DATE,
            numero_acto_encargo TEXT,
            fecha_acto_encargo DATE,
            fecha_retiro DATE,
            total_devengado NUMERIC(14, 2),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Corregir mojibake en registros existentes de la tabla
        UPDATE public.planta_personal_sjd SET
          dependencia_cargo = REPLACE(REPLACE(REPLACE(dependencia_cargo, 'DIRECCIÃ“N', 'DIRECCIÓN'), 'SECRETARÃA', 'SECRETARÍA'), 'JURÃDICA', 'JURÍDICA'),
          dependencia_funcional = REPLACE(REPLACE(REPLACE(dependencia_funcional, 'DIRECCIÃ“N', 'DIRECCIÓN'), 'SECRETARÃA', 'SECRETARÍA'), 'JURÃDICA', 'JURÍDICA'),
          cargo = REPLACE(REPLACE(REPLACE(cargo, 'DIRECCIÃ“N', 'DIRECCIÓN'), 'SECRETARÃA', 'SECRETARÍA'), 'JURÃDICA', 'JURÍDICA'),
          titular_nombre = REPLACE(REPLACE(REPLACE(titular_nombre, 'DIRECCIÃ“N', 'DIRECCIÓN'), 'SECRETARÃA', 'SECRETARÍA'), 'JURÃDICA', 'JURÍDICA')
        WHERE dependencia_cargo LIKE '%Ã%' OR dependencia_funcional LIKE '%Ã%' OR cargo LIKE '%Ã%' OR titular_nombre LIKE '%Ã%';
      `);
    } catch (e) {
      console.warn('Advertencia al verificar tablas de nómina:', e.message);
    }
  }

  // 1. Obtener listado de plazas y cargos
  router.get('/plazas', async (req, res) => {
    try {
      await ensureTables();
      const { busqueda, nivel, estado, dependencia, cargo, id_sieap, id_sideap, solo_encargo } = req.query;

      let query = 'SELECT * FROM public.planta_personal_sjd WHERE 1=1';
      const params = [];

      if (busqueda && busqueda.trim()) {
        params.push(`%${busqueda.trim()}%`);
        const idx = params.length;
        query += ` AND (
          cargo ILIKE $${idx} OR 
          titular_nombre ILIKE $${idx} OR 
          titular_cedula ILIKE $${idx} OR 
          encargo_nombre ILIKE $${idx} OR 
          encargo_cedula ILIKE $${idx} OR 
          dependencia_cargo ILIKE $${idx} OR 
          codigo ILIKE $${idx} OR
          id_plaza::text ILIKE $${idx} OR
          id_sideap::text ILIKE $${idx}
        )`;
      }

      if (nivel && nivel !== 'TODOS') {
        params.push(nivel);
        query += ` AND nivel = $${params.length}`;
      }

      if (estado && estado !== 'TODOS') {
        params.push(estado);
        query += ` AND estado_cargo = $${params.length}`;
      }

      if (dependencia && dependencia !== 'TODAS') {
        params.push(dependencia);
        query += ` AND dependencia_cargo = $${params.length}`;
      }

      if (cargo && cargo !== 'TODOS') {
        params.push(cargo);
        query += ` AND cargo = $${params.length}`;
      }

      const sieapVal = id_sieap || id_sideap;
      if (sieapVal && sieapVal !== 'TODOS') {
        const sieapNum = parseInt(sieapVal, 10);
        if (!isNaN(sieapNum)) {
          params.push(sieapNum);
          query += ` AND id_sideap = $${params.length}`;
        }
      }

      if (solo_encargo === 'true' || solo_encargo === true) {
        query += ` AND es_encargo = TRUE`;
      }

      query += ' ORDER BY id_plaza ASC';

      const result = await pool.query(query, params);
      res.json({ success: true, total: result.rows.length, plazas: result.rows });
    } catch (error) {
      console.error('Error al listar plazas de nómina:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Obtener estadísticas de nómina
  router.get('/estadisticas', async (req, res) => {
    try {
      await ensureTables();
      const countRes = await pool.query(`
        SELECT 
          COUNT(*) as total_plazas,
          COUNT(CASE WHEN estado_cargo = 'OCUPADO' THEN 1 END) as ocupadas,
          COUNT(CASE WHEN estado_cargo = 'VACANTE DEFINITIVA' THEN 1 END) as vacantes_definitivas,
          COUNT(CASE WHEN estado_cargo = 'VACANTE TEMPORAL' THEN 1 END) as vacantes_temporales,
          COUNT(CASE WHEN estado_cargo = 'ENCARGO' THEN 1 END) as encargos,
          COALESCE(SUM(asignacion_basica), 0) as masa_salarial_mensual
        FROM public.planta_personal_sjd
      `);

      const nivelesRes = await pool.query(`
        SELECT nivel, COUNT(*) as cantidad
        FROM public.planta_personal_sjd
        WHERE nivel IS NOT NULL
        GROUP BY nivel
        ORDER BY cantidad DESC
      `);

      const dependenciasRes = await pool.query(`
        SELECT dependencia_cargo, COUNT(*) as cantidad
        FROM public.planta_personal_sjd
        WHERE dependencia_cargo IS NOT NULL
        GROUP BY dependencia_cargo
        ORDER BY cantidad DESC
      `);

      res.json({
        success: true,
        estadisticas: countRes.rows[0],
        por_nivel: nivelesRes.rows,
        por_dependencia: dependenciasRes.rows,
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de nómina:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2.1 Obtener todas las escaleras de encargo agrupadas
  router.get('/escaleras', async (req, res) => {
    try {
      await ensureTables();
      const result = await pool.query(`
        SELECT 
          id_escalera,
          COUNT(*) as total_peldanos,
          json_agg(
            json_build_object(
              'id_plaza', id_plaza,
              'id_sideap', id_sideap,
              'id_perno', id_perno,
              'peldano_escalera', peldano_escalera,
              'cargo', cargo,
              'codigo', codigo,
              'grado', grado,
              'dependencia_cargo', dependencia_cargo,
              'titular_cedula', titular_cedula,
              'titular_nombre', titular_nombre,
              'situacion_titular', situacion_titular,
              'encargo_cedula', encargo_cedula,
              'encargo_nombre', encargo_nombre,
              'situacion_administrativa', situacion_administrativa,
              'asignacion_basica', asignacion_basica,
              'estado_cargo', estado_cargo
            ) ORDER BY COALESCE(peldano_escalera, 999) ASC, id_plaza ASC
          ) as peldanos
        FROM public.planta_personal_sjd
        WHERE id_escalera IS NOT NULL AND TRIM(id_escalera) != ''
        GROUP BY id_escalera
        ORDER BY id_escalera ASC
      `);

      if (result.rows.length > 0) {
        return res.json({ success: true, total: result.rows.length, escaleras: result.rows });
      }
    } catch (e) {
      console.warn('Advertencia en consulta de base de datos para /escaleras, usando fallback:', e.message);
    }

    // Fallback a plantaMockData.json
    try {
      const mockPlazasPath = path.resolve(__dirname, '../../frontend/lib/plantaMockData.json');
      if (fs.existsSync(mockPlazasPath)) {
        const plazas = JSON.parse(fs.readFileSync(mockPlazasPath, 'utf8'));
        const map = new Map();
        plazas.forEach((p) => {
          if (p.id_escalera && String(p.id_escalera).trim()) {
            const k = String(p.id_escalera).trim().toUpperCase();
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(p);
          }
        });

        const escalerasList = [];
        map.forEach((peldanos, id_escalera) => {
          peldanos.sort((a, b) => (Number(a.peldano_escalera) || 999) - (Number(b.peldano_escalera) || 999));
          escalerasList.push({
            id_escalera,
            total_peldanos: peldanos.length,
            peldanos,
          });
        });

        escalerasList.sort((a, b) => a.id_escalera.localeCompare(b.id_escalera, undefined, { numeric: true }));
        return res.json({ success: true, total: escalerasList.length, escaleras: escalerasList });
      }
    } catch (errMock) {
      console.error('Error en fallback de escaleras:', errMock);
    }

    res.json({ success: true, total: 0, escaleras: [] });
  });

  // 2.2 Obtener detalle de una escalera de encargo específica
  router.get('/escaleras/:id', async (req, res) => {
    try {
      await ensureTables();
      const { id } = req.params;
      const result = await pool.query(`
        SELECT *
        FROM public.planta_personal_sjd
        WHERE UPPER(TRIM(id_escalera)) = UPPER(TRIM($1))
        ORDER BY COALESCE(peldano_escalera, 999) ASC, id_plaza ASC
      `, [id]);

      if (result.rows.length > 0) {
        return res.json({ success: true, id_escalera: id, total: result.rows.length, peldanos: result.rows });
      }
    } catch (e) {
      console.warn('Advertencia en consulta de base de datos para /escaleras/:id:', e.message);
    }

    try {
      const mockPlazasPath = path.resolve(__dirname, '../../frontend/lib/plantaMockData.json');
      if (fs.existsSync(mockPlazasPath)) {
        const plazas = JSON.parse(fs.readFileSync(mockPlazasPath, 'utf8'));
        const idTarget = String(req.params.id).trim().toUpperCase();
        const peldanos = plazas
          .filter((p) => p.id_escalera && String(p.id_escalera).trim().toUpperCase() === idTarget)
          .sort((a, b) => (Number(a.peldano_escalera) || 999) - (Number(b.peldano_escalera) || 999));
        return res.json({ success: true, id_escalera: req.params.id, total: peldanos.length, peldanos });
      }
    } catch (errMock) {
      console.error('Error en fallback de detalle escalera:', errMock);
    }

    res.json({ success: true, id_escalera: req.params.id, total: 0, peldanos: [] });
  });

  // 2.3 Obtener listado de personal integral (PLANTA PERNO - Activos y Desvinculados con cruce a Planta)
  router.get('/perno', async (req, res) => {
    try {
      await ensureTables();
      const { busqueda, estado, solo_plaza } = req.query;

      // Verificar si la tabla de personal_perno_sjd está poblada
      const checkCount = await pool.query('SELECT COUNT(*) FROM public.personal_perno_sjd');
      const count = parseInt(checkCount.rows[0].count, 10);

      if (count === 0) {
        // Intentar poblar desde el archivo JSON precargado o Excel
        const mockPernoPath = path.resolve(__dirname, '../../frontend/lib/pernoMockData.json');
        if (fs.existsSync(mockPernoPath)) {
          const rawPerno = JSON.parse(fs.readFileSync(mockPernoPath, 'utf8'));
          for (const item of rawPerno) {
            try {
              await pool.query(`
                INSERT INTO public.personal_perno_sjd (
                  cedula, primer_apellido, segundo_apellido, nombres, nombre_completo,
                  estado_funcionario, estado_descripcion, fecha_nacimiento, direccion,
                  telefono, sexo, libreta_militar, clase_libreta, distrito_militar,
                  tipo_sangre, rh, tipo_funcionario, fecha_ingreso_entidad, fecha_ingreso_distrito,
                  fecha_ingreso_nacion, codigo_eps, fondo_salud, codigo_fondo_pensiones,
                  fondo_pension, codigo_fondo_cesantias, fondo_cesantias, dependencia_cod,
                  dependencia, cargo_cod, grado, asignacion_basica, cargo, posicion_planta,
                  sede_cod, sede, tipo_nombramiento, acto_nombramiento, fecha_efectiva_nombramiento,
                  numero_acto_nombramiento, fecha_acto_nombramiento, fecha_efectiva_encargo,
                  numero_acto_encargo, fecha_acto_encargo, fecha_retiro, total_devengado, updated_at
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
                  $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36,
                  $37, $38, $39, $40, $41, $42, $43, $44, $45, NOW()
                ) ON CONFLICT (cedula) DO NOTHING
              `, [
                item.cedula, item.primer_apellido, item.segundo_apellido, item.nombres, item.nombre_completo,
                item.estado_funcionario || 'A', item.estado_descripcion, item.fecha_nacimiento || null, item.direccion,
                item.telefono, item.sexo, item.libreta_militar, item.clase_libreta, item.distrito_militar,
                item.tipo_sangre, item.rh, item.tipo_funcionario, item.fecha_ingreso_entidad || null, item.fecha_ingreso_distrito || null,
                item.fecha_ingreso_nacion || null, item.codigo_eps, item.fondo_salud, item.codigo_fondo_pensiones,
                item.fondo_pension, item.codigo_fondo_cesantias, item.fondo_cesantias, item.dependencia_cod,
                item.dependencia, item.cargo_cod, item.grado, item.asignacion_basica || 0, item.cargo, item.posicion_planta,
                item.sede_cod, item.sede, item.tipo_nombramiento, item.acto_nombramiento, item.fecha_efectiva_nombramiento || null,
                item.numero_acto_nombramiento, item.fecha_acto_nombramiento || null, item.fecha_efectiva_encargo || null,
                item.numero_acto_encargo, item.fecha_acto_encargo || null, item.fecha_retiro || null, item.total_devengado || null
              ]);
            } catch (errIns) {
              // Continuar con los demás
            }
          }
        }
      }

      let query = `
        SELECT 
          per.*,
          pl.id_plaza AS plaza_id_plaza,
          pl.id_sideap AS plaza_id_sideap,
          pl.nivel AS plaza_nivel,
          pl.cargo AS plaza_cargo,
          pl.codigo AS plaza_codigo,
          pl.grado AS plaza_grado,
          pl.dependencia_cargo AS plaza_dependencia_cargo,
          pl.dependencia_funcional AS plaza_dependencia_funcional,
          pl.proposito AS plaza_proposito,
          pl.funciones AS plaza_funciones,
          pl.requisitos AS plaza_requisitos,
          pl.estado_cargo AS plaza_estado_cargo,
          pl.situacion_titular AS plaza_situacion_titular,
          pl.tipo_vinculacion AS plaza_tipo_vinculacion,
          pl.situacion_administrativa AS plaza_situacion_administrativa,
          pl.encargo_cedula AS plaza_encargo_cedula,
          pl.encargo_nombre AS plaza_encargo_nombre,
          pl.es_encargo AS plaza_es_encargo,
          pl.opec AS plaza_opec,
          pl.id_escalera AS plaza_id_escalera,
          pl.peldano_escalera AS plaza_peldano_escalera
        FROM public.personal_perno_sjd per
        LEFT JOIN public.planta_personal_sjd pl 
          ON (per.cedula = pl.titular_cedula OR per.cedula = pl.encargo_cedula)
        WHERE 1=1
      `;
      const params = [];

      if (busqueda && busqueda.trim()) {
        params.push(`%${busqueda.trim()}%`);
        const idx = params.length;
        query += ` AND (
          per.nombre_completo ILIKE $${idx} OR 
          per.cedula ILIKE $${idx} OR 
          per.cargo ILIKE $${idx} OR 
          per.dependencia ILIKE $${idx} OR
          per.fondo_salud ILIKE $${idx} OR
          per.fondo_pension ILIKE $${idx}
        )`;
      }

      if (estado === 'ACTIVO' || estado === 'A') {
        query += ` AND per.estado_funcionario = 'A' AND per.fecha_retiro IS NULL`;
      } else if (estado === 'RETIRADO' || estado === 'DESVINCULADO' || estado === 'R') {
        query += ` AND (per.estado_funcionario = 'R' OR per.fecha_retiro IS NOT NULL)`;
      }

      if (solo_plaza === 'true') {
        query += ` AND pl.id_plaza IS NOT NULL`;
      }

      query += ` ORDER BY CASE WHEN per.estado_funcionario = 'A' AND per.fecha_retiro IS NULL THEN 0 ELSE 1 END, per.primer_apellido ASC, per.nombres ASC`;

      const result = await pool.query(query, params);
      return res.json({ success: true, total: result.rows.length, personal: result.rows });
    } catch (e) {
      console.warn('Error en consulta de base de datos para /perno, usando fallback:', e.message);
      // Fallback a pernoMockData.json
      try {
        const mockPernoPath = path.resolve(__dirname, '../../frontend/lib/pernoMockData.json');
        const mockPlazaPath = path.resolve(__dirname, '../../frontend/lib/plantaMockData.json');
        if (fs.existsSync(mockPernoPath)) {
          const listPerno = JSON.parse(fs.readFileSync(mockPernoPath, 'utf8'));
          let listPlazas = [];
          if (fs.existsSync(mockPlazaPath)) {
            listPlazas = JSON.parse(fs.readFileSync(mockPlazaPath, 'utf8'));
          }
          const enriched = listPerno.map(per => {
            const match = listPlazas.find(pl => String(pl.titular_cedula) === String(per.cedula) || String(pl.encargo_cedula) === String(per.cedula));
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
              plaza_peldano_escalera: match.peldano_escalera
            };
          });
          return res.json({ success: true, total: enriched.length, personal: enriched });
        }
      } catch (errFallback) {
        console.error('Error en fallback de perno:', errFallback);
      }
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 3. Procesar Carga de Archivo 1: Planta de Personal (Imagen 1)
  router.post('/upload-planta', upload.single('archivo'), async (req, res) => {
    try {
      await ensureTables();
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se envió ningún archivo para procesar.' });
      }

      // 1. Comprobación de formato de archivo
      const nombreOrig = req.file.originalname || '';
      if (!nombreOrig.match(/\.(xlsx|xls)$/i)) {
        return res.status(400).json({
          success: false,
          error: 'Formato no compatible. Por favor sube un archivo de Microsoft Excel (.xlsx o .xls).'
        });
      }

      const workbook = new ExcelJS.Workbook();
      try {
        await workbook.xlsx.load(req.file.buffer);
      } catch (errBuffer) {
        return res.status(400).json({
          success: false,
          error: 'No se pudo leer el archivo Excel. Asegúrate de que no esté protegido con contraseña o dañado.'
        });
      }

      let sheet = workbook.getWorksheet('PLANTA SJD (2)') || 
                  workbook.getWorksheet('PLANTA SJD') || 
                  workbook.worksheets[0];

      if (!sheet || sheet.rowCount < 2) {
        return res.status(400).json({
          success: false,
          error: 'La hoja de cálculo está vacía o no contiene registros suficientes para procesar.'
        });
      }

      // 2. Localizar fila de encabezados
      let rowHeader = 4;
      let encabezadosTexto = '';
      for (let r = 1; r <= 15; r++) {
        const row = sheet.getRow(r);
        let rowText = '';
        row.eachCell((c) => { rowText += ' ' + String(c.value || '').toUpperCase(); });
        if (rowText.includes('CEDULA') || rowText.includes('APELLIDOS') || rowText.includes('NOMENCLATURA') || rowText.includes('ID SIDEAP')) {
          rowHeader = r;
          encabezadosTexto = rowText;
          break;
        }
      }

      // 3. Comprobación de confusión de archivo: ¿Es en realidad un archivo de Planta Perno?
      const esPernoEnPlanta = (
        encabezadosTexto.includes('NUMERO_IDENTIFICACION') ||
        encabezadosTexto.includes('PRIMER_APELLIDO') ||
        encabezadosTexto.includes('FONDO_SALUD') ||
        encabezadosTexto.includes('TIPO_FUNCIONARIO')
      ) && !encabezadosTexto.includes('ID_SIDEAP') && !encabezadosTexto.includes('NOMENCLATURA');

      if (esPernoEnPlanta) {
        return res.status(400).json({
          success: false,
          error: 'Atención: Has intentado subir el archivo de "Planta Perno / Nómina" en la sección de "Planta Oficial". Por favor selecciona el archivo correcto de Planta Oficial o súbelo en el botón de Planta Perno.'
        });
      }

      // 4. Indexar en memoria hojas complementarias del mismo libro si existen (PLANTA PERNO y SIDEAP)
      // para resolver fórmulas VLOOKUP congeladas o nombres actualizados por cédula/ID
      const mapaPernoPorCedula = new Map();
      const mapaPernoPorId = new Map();
      const mapaSideapPorId = new Map();

      const sheetPernoAux = workbook.getWorksheet('PLANTA PERNO');
      if (sheetPernoAux && sheetPernoAux.rowCount > 2) {
        for (let rp = 2; rp <= sheetPernoAux.rowCount; rp++) {
          const rowP = sheetPernoAux.getRow(rp);
          const cRaw = cleanDoc(getVal(rowP.getCell(1)));
          if (!cRaw) continue;

          const ape1 = cleanText(getVal(rowP.getCell(2)) || '').toUpperCase();
          const ape2 = cleanText(getVal(rowP.getCell(3)) || '').toUpperCase();
          const nom = cleanText(getVal(rowP.getCell(4)) || '').toUpperCase();
          const nomComp = [nom, ape1, ape2].filter(Boolean).join(' ').trim();

          const infoPerno = {
            cedula: cRaw,
            nombreCompleto: nomComp,
            direccion: cleanText(getVal(rowP.getCell(7)) || '').toUpperCase(),
            telefono: cleanText(getVal(rowP.getCell(8)) || ''),
            sexo: cleanText(getVal(rowP.getCell(9)) || '').toUpperCase(),
            tipoFuncionario: cleanText(getVal(rowP.getCell(15)) || '').toUpperCase(),
            fondoSalud: cleanText(getVal(rowP.getCell(20)) || '').toUpperCase(),
            fondoPension: cleanText(getVal(rowP.getCell(22)) || '').toUpperCase(),
            fondoCesantias: cleanText(getVal(rowP.getCell(24)) || '').toUpperCase(),
            idPerno: parseInt(String(getVal(rowP.getCell(31)) || ''), 10) || null,
            tipoNomb: cleanText(getVal(rowP.getCell(34)) || '').toUpperCase(),
            totalDevengado: cleanMoney(getVal(rowP.getCell(29))) || null,
          };

          mapaPernoPorCedula.set(cRaw, infoPerno);
          if (infoPerno.idPerno) {
            mapaPernoPorId.set(infoPerno.idPerno, infoPerno);
          }
        }
      }

      const sheetSideapAux = workbook.getWorksheet('SIDEAP');
      if (sheetSideapAux && sheetSideapAux.rowCount > 2) {
        for (let rs = 2; rs <= sheetSideapAux.rowCount; rs++) {
          const rowS = sheetSideapAux.getRow(rs);
          const idS = parseInt(String(getVal(rowS.getCell(1)) || ''), 10);
          const nomS = cleanText(getVal(rowS.getCell(3)) || '').toUpperCase();
          const cedS = cleanDoc(getVal(rowS.getCell(4)));
          if (idS && (nomS || cedS)) {
            mapaSideapPorId.set(idS, { idSideap: idS, nombre: nomS, cedula: cedS });
          }
        }
      }

      // 5. Mapear encabezados dinámicamente de la hoja de Planta
      function normH(val) {
        return String(val || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
          .trim();
      }

      const headerRow = sheet.getRow(rowHeader);
      const colMap = {};
      headerRow.eachCell((c, colNum) => {
        const raw = normH(c.value);
        if (raw === 'ID' || raw === 'ID_PLAZA' || raw === 'ID PLAZA' || raw === 'PLAZA') {
          colMap.id = colNum;
        } else if (raw === 'ID SIDEAP' || raw === 'ID_SIDEAP' || (raw.includes('SIDEAP') && !raw.includes('VINCULAC') && !raw.includes('CARGO/'))) {
          colMap.id_sideap = colNum;
        } else if (raw === 'ID PERNO' || raw === 'ID_PERNO' || (raw.includes('PERNO') && !raw.includes('VINCULAC'))) {
          colMap.id_perno = colNum;
        } else if (raw.includes('SITUACION') && (raw.includes('TITULAR') || raw.includes('DEL CARGO'))) {
          colMap.situacion_titular = colNum; // Col 14 (N)
        } else if (raw === 'SITUACION ADMINISTRATIVA' || raw === 'SITUACION' || (raw.includes('SITUACION') && !raw.includes('TITULAR'))) {
          colMap.situacion_admin = colNum; // Col 13 (M)
        } else if (raw.includes('TITULAR') && (raw.includes('CEDULA') || raw.includes('DOCUMENTO') || raw.includes('C.C'))) {
          colMap.titular_cedula = colNum; // Col 15 (O)
        } else if (raw.includes('TITULAR') && (raw.includes('CARGO') || raw.includes('NOMBRE') || raw.includes('SERVIDOR') || raw.includes('EMPLEO'))) {
          colMap.titular_nombre = colNum; // Col 16 (P)
        } else if (raw === 'CEDULA' || raw === 'DOCUMENTO') {
          if (!colMap.cedula_actual) {
            colMap.cedula_actual = colNum; // Col 4 (D): Ocupante actual
          } else if (!colMap.titular_cedula) {
            colMap.titular_cedula = colNum; // Col 15 (O): Titular
          }
        } else if ((raw.includes('APELLIDOS') || raw.includes('NOMBRES')) && !colMap.nombre_actual) {
          colMap.nombre_actual = colNum; // Col 5 (E)
        } else if (raw === 'ID-E' || raw === 'IDE' || raw === 'ID_E' || raw.includes('ID-E') || raw.includes('ID ESCALERA') || raw === 'ESCALERA') {
          colMap.id_escalera = colNum; // Col 17 (Q)
        } else if ((raw === 'N' || raw.includes('PELDANO') || raw.includes('PELDAÑO')) && !colMap.peldano_escalera) {
          colMap.peldano_escalera = colNum; // Col 18 (R)
        } else if (raw.includes('VINCULACION A LA ENTIDAD') || raw.includes('TIPO DE VINCULACION')) {
          colMap.tipo_vinculacion = colNum; // Col 6 (F)
        } else if (raw.includes('OPEC')) {
          colMap.opec = colNum;
        } else if (raw.includes('ESTADO DEL CARGO') || raw.includes('ESTADO CARGO')) {
          colMap.estado_cargo = colNum; // Col 25 (Y)
        } else if (raw === 'NIVEL') {
          colMap.nivel = colNum; // Col 26 (Z)
        } else if (raw.includes('NOMENCLATURA') || raw === 'CARGO' || raw.includes('DENOMINACION')) {
          colMap.cargo = colNum; // Col 27 (AA)
        } else if (raw.includes('CODIGO')) {
          colMap.codigo = colNum; // Col 28 (AB)
        } else if (raw.includes('GRADO')) {
          colMap.grado = colNum; // Col 29 (AC)
        } else if (raw.includes('DEPENDENCIA DEL CARGO') || raw === 'DEPENDENCIA') {
          colMap.dep_cargo = colNum; // Col 31 (AE)
        } else if (raw.includes('DEPENDENCIA FUNCIONAL')) {
          colMap.dep_funcional = colNum; // Col 32 (AF)
        } else if (raw.includes('PROPOSITO')) {
          colMap.proposito = colNum; // Col 33 (AG)
        } else if (raw === 'FUNCIONES' || raw === 'FUNCIONES ESENCIALES' || raw.includes('FUNCIONES ESENCIALES') || (raw.includes('FUNCIONES') && !raw.includes('RES') && !raw.includes('RESOLUC'))) {
          if (!colMap.funciones) colMap.funciones = colNum; // Col 34 (AH)
        } else if (raw.includes('REQUISITOS')) {
          colMap.requisitos = colNum; // Col 35 (AI)
        } else if (raw.includes('ASIGNACION BASICA') || raw.includes('SUELDO BASICO') || raw.includes('ASIGNACION')) {
          colMap.asignacion = colNum; // Col 37 (AK)
        }
      });

      // 6. Comprobación de columnas obligatorias
      if (!colMap.id) {
        return res.status(400).json({
          success: false,
          error: 'No se encontró la columna requerida "ID" (identificador numérico de cada plaza) en la fila de encabezados.'
        });
      }

      if (!colMap.cargo && !colMap.codigo) {
        return res.status(400).json({
          success: false,
          error: 'No se encontró la columna de "CARGO / NOMENCLATURA" en el archivo.'
        });
      }

      let procesados = 0;
      let actualizados = 0;
      let filasOmitidas = 0;
      const advertencias = [];
      const plazasVistas = new Set();

      for (let r = rowHeader + 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const idCellVal = getVal(row.getCell(colMap.id || 1));
        
        // Comprobar si la fila está completamente vacía
        if (idCellVal === null || idCellVal === undefined || String(idCellVal).trim() === '') {
          let tieneContenido = false;
          row.eachCell(() => { tieneContenido = true; });
          if (tieneContenido) {
            filasOmitidas++;
            if (advertencias.length < 10) {
              advertencias.push(`Fila ${r}: Omitida porque no contiene un ID de plaza.`);
            }
          }
          continue;
        }

        const idPlaza = parseInt(String(idCellVal).trim(), 10);
        if (isNaN(idPlaza) || idPlaza <= 0) {
          filasOmitidas++;
          if (advertencias.length < 10) {
            advertencias.push(`Fila ${r}: Omitida porque el ID '${idCellVal}' no es un número entero válido.`);
          }
          continue;
        }

        if (plazasVistas.has(idPlaza)) {
          if (advertencias.length < 10) {
            advertencias.push(`Fila ${r}: El ID de plaza ${idPlaza} aparece duplicado en el archivo (se actualizará con este registro).`);
          }
        }
        plazasVistas.add(idPlaza);

        const idSideap = parseInt(getVal(row.getCell(colMap.id_sideap || 2)), 10) || null;
        const idPerno = parseInt(getVal(row.getCell(colMap.id_perno || 3)), 10) || null;
        
        // Columnas D y E: Ocupante / Encargo actual en el puesto
        let cedulaActual = cleanDoc(getVal(row.getCell(colMap.cedula_actual || 4)));
        let nombreActual = cleanText(getVal(row.getCell(colMap.nombre_actual || 5)) || '').toUpperCase();
        let tipoVinculacion = cleanText(getVal(row.getCell(colMap.tipo_vinculacion || 6)) || '').toUpperCase();
        
        // Columnas M y N: Situaciones administrativas
        let situacionAdmin = cleanText(getVal(row.getCell(colMap.situacion_admin || 13)) || '').toUpperCase();
        let situacionTitular = cleanText(getVal(row.getCell(colMap.situacion_titular || 14)) || '').toUpperCase();

        // Columnas O y P: Titular oficial de la plaza
        let titularCedula = cleanDoc(getVal(row.getCell(colMap.titular_cedula || 15)));
        let titularNombre = cleanText(getVal(row.getCell(colMap.titular_nombre || 16)) || '').toUpperCase();

        // Resolución inteligente de VLOOKUP en memoria con PLANTA PERNO y SIDEAP
        if (cedulaActual && mapaPernoPorCedula.has(cedulaActual)) {
          const pernoInfo = mapaPernoPorCedula.get(cedulaActual);
          if (pernoInfo.nombreCompleto) {
            nombreActual = pernoInfo.nombreCompleto;
          }
          if (!tipoVinculacion && pernoInfo.tipoFuncionario) {
            tipoVinculacion = pernoInfo.tipoFuncionario;
          }
        } else if (idSideap && mapaSideapPorId.has(idSideap)) {
          const sideapInfo = mapaSideapPorId.get(idSideap);
          if (sideapInfo.nombre && (!nombreActual || nombreActual.includes('VACANTE') || nombreActual.includes('IF('))) {
            nombreActual = sideapInfo.nombre;
            if (!cedulaActual && sideapInfo.cedula) cedulaActual = sideapInfo.cedula;
          }
        }

        if (titularCedula && mapaPernoPorCedula.has(titularCedula)) {
          const pernoInfo = mapaPernoPorCedula.get(titularCedula);
          if (pernoInfo.nombreCompleto) {
            titularNombre = pernoInfo.nombreCompleto;
          }
        }

        const normActual = nombreActual.toUpperCase();
        const normTitular = titularNombre.toUpperCase();
        const actualEsVacante = !normActual || normActual.includes('VACANTE') || normActual.includes('VACANCIA');
        const titularEsVacante = !normTitular || normTitular.includes('VACANTE') || normTitular.includes('VACANCIA');
        const esEncargoPorSituacion = situacionAdmin.includes('ENCARGO') || situacionTitular.includes('ENCARGO');

        // Determinación de Titular del empleo
        if (!titularEsVacante) {
          // El titular oficial es el registrado en Col O y P
        } else {
          // Si la columna de Titular dice VACANTE o está vacía:
          if (esEncargoPorSituacion) {
            titularNombre = situacionTitular || 'VACANTE TEMPORAL';
            titularCedula = null;
          } else if (!actualEsVacante) {
            // Si Col D/E tiene un servidor vinculado (en propiedad o periodo de prueba), esa persona es el titular
            titularNombre = nombreActual;
            titularCedula = cedulaActual;
            if (!situacionTitular || situacionTitular.includes('VACANTE')) {
              situacionTitular = situacionAdmin || 'EN PROPIEDAD';
            }
          } else {
            titularNombre = 'VACANTE DEFINITIVA';
            titularCedula = null;
          }
        }

        // Determinación de Servidor en Encargo (Columnas D y E)
        let esEncargo = false;
        let encargoNombre = null;
        let encargoCedula = null;

        if (!actualEsVacante) {
          const hayDiferencia = titularCedula && cedulaActual 
            ? (titularCedula !== cedulaActual) 
            : (titularNombre && normActual !== normTitular);

          if (esEncargoPorSituacion || hayDiferencia) {
            esEncargo = true;
            encargoNombre = nombreActual;
            encargoCedula = cedulaActual;
          }
        }

        titularCedula = titularCedula ? titularCedula : null;
        encargoCedula = encargoCedula ? encargoCedula : null;

        let estadoCargo = String(getVal(row.getCell(colMap.estado_cargo || 25)) || '').trim().toUpperCase();
        if (!estadoCargo || estadoCargo.includes('IF(') || estadoCargo.includes('[OBJECT')) {
          if (actualEsVacante && titularEsVacante) {
            estadoCargo = 'VACANTE DEFINITIVA';
          } else if (normActual.includes('TEMPORAL') || normTitular.includes('TEMPORAL') || situacionAdmin.includes('TEMPORAL') || situacionTitular.includes('TEMPORAL')) {
            estadoCargo = 'VACANTE TEMPORAL';
          } else if (!actualEsVacante || !titularEsVacante) {
            estadoCargo = 'OCUPADO';
          } else {
            estadoCargo = 'VACANTE DEFINITIVA';
          }
        }

        let nivel = String(getVal(row.getCell(colMap.nivel || 26)) || getVal(row.getCell(26)) || getVal(row.getCell(25)) || '').trim().toUpperCase();
        if (nivel.includes('DIRECTIV')) nivel = 'DIRECTIVO';
        else if (nivel.includes('ASESOR')) nivel = 'ASESOR';
        else if (nivel.includes('PROFESIONAL')) nivel = 'PROFESIONAL';
        else if (nivel.includes('TECNIC') || nivel.includes('TÉCNIC')) nivel = 'TECNICO';
        else if (nivel.includes('ASISTENCIAL')) nivel = 'ASISTENCIAL';

        const cargoNom = cleanText(getVal(row.getCell(colMap.cargo || 27)) || getVal(row.getCell(27)) || '').toUpperCase();
        const codigo = cleanText(getVal(row.getCell(colMap.codigo || 28)) || getVal(row.getCell(28)) || '');
        const grado = cleanText(getVal(row.getCell(colMap.grado || 29)) || getVal(row.getCell(29)) || '');
        const opec = cleanText(getVal(row.getCell(colMap.opec || 24)) || '');
        const depCargo = cleanDependencia(getVal(row.getCell(colMap.dep_cargo || 31)) || getVal(row.getCell(31)) || '');
        const depFuncional = cleanDependencia(getVal(row.getCell(colMap.dep_funcional || 32)) || getVal(row.getCell(32)) || depCargo);
        const proposito = cleanText(getVal(row.getCell(colMap.proposito || 33)) || getVal(row.getCell(33)) || '');
        const funcionesRaw = cleanText(getVal(row.getCell(colMap.funciones || 34)) || getVal(row.getCell(34)) || '');
        const requisitos = cleanText(getVal(row.getCell(colMap.requisitos || 35)) || getVal(row.getCell(35)) || '');
        const asignacion = cleanMoney(getVal(row.getCell(colMap.asignacion || 37)) || getVal(row.getCell(37)));

        // Columnas Q y R: Escaleras de encargo (ID-E y N)
        let idEscalera = cleanText(getVal(row.getCell(colMap.id_escalera || 17)) || '').trim();
        if (idEscalera === '-' || idEscalera === '0' || idEscalera.toLowerCase().includes('[object')) idEscalera = '';

        let peldanoRaw = getVal(row.getCell(colMap.peldano_escalera || 18));
        let peldanoEscalera = null;
        if (peldanoRaw !== null && peldanoRaw !== undefined && String(peldanoRaw).trim() !== '') {
          const pNum = parseInt(String(peldanoRaw).trim(), 10);
          if (!isNaN(pNum) && pNum > 0) {
            peldanoEscalera = pNum;
          }
        }

        if (!idEscalera) {
          idEscalera = null;
          peldanoEscalera = null;
        }

        const funcionesArr = parseFunctions(funcionesRaw);

        // Datos complementarios de seguridad social desde el mapa en memoria si aplica
        const personaMatch = (titularCedula && mapaPernoPorCedula.get(titularCedula)) || 
                             (cedulaActual && mapaPernoPorCedula.get(cedulaActual)) || null;

        await pool.query(`
          INSERT INTO public.planta_personal_sjd (
            id_plaza, id_sideap, id_perno, nivel, cargo, codigo, grado,
            dependencia_cargo, dependencia_funcional, proposito, funciones,
            requisitos, asignacion_basica, estado_cargo,
            titular_cedula, titular_nombre, situacion_titular,
            encargo_cedula, encargo_nombre, es_encargo,
            tipo_vinculacion, situacion_administrativa, opec,
            id_escalera, peldano_escalera,
            fondo_salud, fondo_pension, fondo_cesantias, telefono, direccion, sexo,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16, $17,
            $18, $19, $20,
            $21, $22, $23,
            $24, $25,
            $26, $27, $28, $29, $30, $31,
            NOW()
          )
          ON CONFLICT (id_plaza) DO UPDATE SET
            id_sideap = COALESCE(EXCLUDED.id_sideap, public.planta_personal_sjd.id_sideap),
            id_perno = COALESCE(EXCLUDED.id_perno, public.planta_personal_sjd.id_perno),
            nivel = EXCLUDED.nivel,
            cargo = EXCLUDED.cargo,
            codigo = EXCLUDED.codigo,
            grado = EXCLUDED.grado,
            dependencia_cargo = EXCLUDED.dependencia_cargo,
            dependencia_funcional = EXCLUDED.dependencia_funcional,
            proposito = EXCLUDED.proposito,
            funciones = EXCLUDED.funciones,
            requisitos = EXCLUDED.requisitos,
            asignacion_basica = EXCLUDED.asignacion_basica,
            estado_cargo = EXCLUDED.estado_cargo,
            titular_cedula = EXCLUDED.titular_cedula,
            titular_nombre = EXCLUDED.titular_nombre,
            situacion_titular = EXCLUDED.situacion_titular,
            encargo_cedula = EXCLUDED.encargo_cedula,
            encargo_nombre = EXCLUDED.encargo_nombre,
            es_encargo = EXCLUDED.es_encargo,
            tipo_vinculacion = EXCLUDED.tipo_vinculacion,
            situacion_administrativa = EXCLUDED.situacion_administrativa,
            opec = EXCLUDED.opec,
            id_escalera = EXCLUDED.id_escalera,
            peldano_escalera = EXCLUDED.peldano_escalera,
            fondo_salud = COALESCE(EXCLUDED.fondo_salud, public.planta_personal_sjd.fondo_salud),
            fondo_pension = COALESCE(EXCLUDED.fondo_pension, public.planta_personal_sjd.fondo_pension),
            fondo_cesantias = COALESCE(EXCLUDED.fondo_cesantias, public.planta_personal_sjd.fondo_cesantias),
            telefono = COALESCE(EXCLUDED.telefono, public.planta_personal_sjd.telefono),
            direccion = COALESCE(EXCLUDED.direccion, public.planta_personal_sjd.direccion),
            sexo = COALESCE(EXCLUDED.sexo, public.planta_personal_sjd.sexo),
            updated_at = NOW();
        `, [
          idPlaza, idSideap, idPerno, nivel, cargoNom, codigo, grado,
          depCargo, depFuncional, proposito, JSON.stringify(funcionesArr),
          requisitos, asignacion, estadoCargo,
          titularCedula, titularNombre, situacionTitular,
          encargoCedula, encargoNombre, esEncargo,
          tipoVinculacion, situacionAdmin, opec,
          idEscalera, peldanoEscalera,
          personaMatch?.fondoSalud || null,
          personaMatch?.fondoPension || null,
          personaMatch?.fondoCesantias || null,
          personaMatch?.telefono || null,
          personaMatch?.direccion || null,
          personaMatch?.sexo || null
        ]);

        procesados++;
        actualizados++;
      }

      await pool.query(`
        INSERT INTO public.nomina_import_logs (tipo_archivo, nombre_archivo, registros_procesados, registros_actualizados)
        VALUES ('PLANTA', $1, $2, $3)
      `, [req.file.originalname, procesados, actualizados]);

      const detalleAdv = advertencias.length > 0 
        ? ` (${advertencias.length} advertencia${advertencias.length > 1 ? 's' : ''})` 
        : '';

      res.json({
        success: true,
        mensaje: `Archivo de Planta procesado exitosamente. Se sincronizaron ${actualizados} plazas en el sistema.${detalleAdv}`,
        registros_procesados: procesados,
        registros_actualizados: actualizados,
        filas_omitidas: filasOmitidas,
        advertencias: advertencias.slice(0, 10),
        total_advertencias: advertencias.length
      });
    } catch (error) {
      console.error('Error procesando archivo de planta:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. Procesar Carga de Archivo 2: Planta Perno / Nómina (Imagen 2)
  router.post('/upload-perno', upload.single('archivo'), async (req, res) => {
    try {
      await ensureTables();
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se envió ningún archivo para procesar.' });
      }

      // 1. Comprobación de formato de archivo
      const nombreOrig = req.file.originalname || '';
      if (!nombreOrig.match(/\.(xlsx|xls)$/i)) {
        return res.status(400).json({
          success: false,
          error: 'Formato no compatible. Por favor sube un archivo de Microsoft Excel (.xlsx o .xls).'
        });
      }

      const workbook = new ExcelJS.Workbook();
      try {
        await workbook.xlsx.load(req.file.buffer);
      } catch (errBuffer) {
        return res.status(400).json({
          success: false,
          error: 'No se pudo leer el archivo Excel. Asegúrate de que no esté dañado ni protegido.'
        });
      }

      let sheet = workbook.getWorksheet('PLANTA PERNO') || 
                  workbook.worksheets[0];

      if (!sheet || sheet.rowCount < 2) {
        return res.status(400).json({
          success: false,
          error: 'La hoja de cálculo está vacía o no contiene registros suficientes para procesar.'
        });
      }

      // 2. Buscar fila de encabezados
      let rowHeader = 9;
      let encabezadosTexto = '';
      for (let r = 1; r <= 15; r++) {
        const row = sheet.getRow(r);
        let rowText = '';
        row.eachCell((c) => { rowText += ' ' + String(c.value || '').toUpperCase(); });
        if (rowText.includes('NUMERO_IDENTIFICACION') || rowText.includes('PRIMER_APELLIDO') || rowText.includes('IDENTIFICACION')) {
          rowHeader = r;
          encabezadosTexto = rowText;
          break;
        }
      }

      // 3. Comprobación de confusión de archivo: ¿Es en realidad un archivo de Planta Oficial?
      const esPlantaEnPerno = (
        encabezadosTexto.includes('ID_SIDEAP') ||
        encabezadosTexto.includes('NOMENCLATURA') ||
        encabezadosTexto.includes('SITUACIÓN ADMINISTRATIVA')
      ) && !encabezadosTexto.includes('NUMERO_IDENTIFICACION');

      if (esPlantaEnPerno) {
        return res.status(400).json({
          success: false,
          error: 'Atención: Has intentado subir el archivo de "Planta Oficial" en la sección de "Planta Perno / Nómina". Por favor sube el archivo correspondiente.'
        });
      }

      // 4. Mapear encabezados dinámicamente
      const headerRow = sheet.getRow(rowHeader);
      const colMap = {};
      headerRow.eachCell((c, colNum) => {
        const rawTxt = String(c.value || '').toUpperCase();
        const txt = rawTxt.replace(/[\r\n_]+/g, ' ').trim();
        const norm = txt.replace(/\s+/g, '');

        // 1. Cédula del funcionario: buscar con prioridad estricta para evitar confusión con LIBRETA_MILITAR u otras
        if (!colMap.cedula) {
          if (
            (norm.includes('NUMEROIDENTIFICA') || norm.includes('IDENTIFICACION') || norm === 'CEDULA' || norm === 'CÉDULA' || colNum === 1) &&
            !norm.includes('MILITAR') && !norm.includes('TRIBUTAR') && !norm.includes('FISCAL')
          ) {
            colMap.cedula = colNum;
            return;
          }
        }

        if (!colMap.ape1 && txt.includes('PRIMER APELLIDO')) colMap.ape1 = colNum;
        else if (!colMap.ape2 && txt.includes('SEGUNDO APELLIDO')) colMap.ape2 = colNum;
        else if (!colMap.nombres && (txt === 'NOMBRE' || txt.includes('NOMBRES'))) colMap.nombres = colNum;
        else if (!colMap.direccion && txt.includes('DIRECCION')) colMap.direccion = colNum;
        else if (!colMap.telefono && txt.includes('TELEFONO')) colMap.telefono = colNum;
        else if (!colMap.sexo && (txt === 'SEXO' || txt.includes('GENERO'))) colMap.sexo = colNum;
        else if (!colMap.tipo_funcionario && txt.includes('TIPO FUNCIONARIO')) colMap.tipo_funcionario = colNum;
        else if (!colMap.fondo_salud && (txt.includes('FONDO SALUD') || txt === 'EPS')) colMap.fondo_salud = colNum;
        else if (!colMap.fondo_pension && (txt.includes('FONDO PENSION') || txt === 'PENSION')) colMap.fondo_pension = colNum;
        else if (!colMap.fondo_cesantias && (txt.includes('FONDO CESANTIAS') || txt === 'CESANTIAS')) colMap.fondo_cesantias = colNum;
        else if (!colMap.id_perno && (txt.includes('ID PERNO') || txt === 'ID_PERNO' || txt === 'PERNO')) colMap.id_perno = colNum;
        else if (!colMap.tipo_nomb && txt.includes('TIPO NOMB')) colMap.tipo_nomb = colNum;
        else if (!colMap.acto_nomb && txt.includes('ACTO NOMB') && !txt.includes('NUMERO') && !txt.includes('FECHA')) colMap.acto_nomb = colNum;
        else if (!colMap.num_acto && (txt.includes('NUMERO ACTO NOMB') || txt.includes('NUM ACTO'))) colMap.num_acto = colNum;
        else if (!colMap.devengado && txt.includes('DEVENGADO')) colMap.devengado = colNum;
        else if (!colMap.fecha_nacimiento && txt.includes('FECHA NACIMIENTO')) colMap.fecha_nacimiento = colNum;
        else if (!colMap.fecha_ingreso_entidad && txt.includes('FECHA INGRESO ENTIDAD')) colMap.fecha_ingreso_entidad = colNum;
        else if (!colMap.fecha_ingreso_distrito && txt.includes('FECHA INGRESO DISTRITO')) colMap.fecha_ingreso_distrito = colNum;
        else if (!colMap.fecha_acto_nomb && txt.includes('FECHA ACTO NOMB')) colMap.fecha_acto_nomb = colNum;
      });

      // Si no se asignó cédula por encabezado, tomar por defecto columna 1
      if (!colMap.cedula) {
        colMap.cedula = 1;
      }

      let procesados = 0;
      let actualizados = 0;
      let retiradosOSinPlaza = 0;
      const advertencias = [];

      for (let r = rowHeader + 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const cedulaRaw = getVal(row.getCell(colMap.cedula || 1));
        const cedula = cleanDoc(cedulaRaw);
        if (!cedula) continue;

        const idPerno = parseInt(String(getVal(row.getCell(colMap.id_perno || 31)) || ''), 10) || null;
        const ape1 = cleanText(getVal(row.getCell(colMap.ape1 || 2)) || '').toUpperCase();
        const ape2 = cleanText(getVal(row.getCell(colMap.ape2 || 3)) || '').toUpperCase();
        const nom = cleanText(getVal(row.getCell(colMap.nombres || 4)) || '').toUpperCase();
        const nomComp = [nom, ape1, ape2].filter(Boolean).join(' ').trim();

        const direccion = cleanText(getVal(row.getCell(colMap.direccion || 7)) || '').toUpperCase();
        const telefono = cleanText(getVal(row.getCell(colMap.telefono || 8)) || '');
        const sexo = cleanText(getVal(row.getCell(colMap.sexo || 9)) || '').toUpperCase();
        const tipoFuncionario = cleanText(getVal(row.getCell(colMap.tipo_funcionario || 15)) || '').toUpperCase();
        const fondoSalud = cleanText(getVal(row.getCell(colMap.fondo_salud || 20)) || '').toUpperCase();
        const fondoPension = cleanText(getVal(row.getCell(colMap.fondo_pension || 22)) || '').toUpperCase();
        const fondoCesantias = cleanText(getVal(row.getCell(colMap.fondo_cesantias || 24)) || '').toUpperCase();
        const tipoNomb = cleanText(getVal(row.getCell(colMap.tipo_nomb || 34)) || '').toUpperCase();
        const actoNomb = cleanText(getVal(row.getCell(colMap.acto_nomb || 35)) || '').toUpperCase();
        const numActo = cleanText(getVal(row.getCell(colMap.num_acto || 37)) || '');
        const totalDevengado = cleanMoney(getVal(row.getCell(colMap.devengado || 43))) || null;

        // Limpieza y soporte de fechas tanto en serial numérico (ej. 31103) como en fecha formateada
        const fechaNacimiento = cleanDate(getVal(row.getCell(colMap.fecha_nacimiento || 6)));
        const fechaIngresoEntidad = cleanDate(getVal(row.getCell(colMap.fecha_ingreso_entidad || 16)));
        const fechaIngresoDistrito = cleanDate(getVal(row.getCell(colMap.fecha_ingreso_distrito || 17)));
        const fechaActoNomb = cleanDate(getVal(row.getCell(colMap.fecha_acto_nomb || 38)));

        // Actualizar la persona en la plaza vinculando por cédula (titular o encargo)
        const updateRes = await pool.query(`
          UPDATE public.planta_personal_sjd SET
            tipo_funcionario = COALESCE(NULLIF($1, ''), tipo_funcionario),
            direccion = COALESCE(NULLIF($2, ''), direccion),
            telefono = COALESCE(NULLIF($3, ''), telefono),
            sexo = COALESCE(NULLIF($4, ''), sexo),
            fondo_salud = COALESCE(NULLIF($5, ''), fondo_salud),
            fondo_pension = COALESCE(NULLIF($6, ''), fondo_pension),
            fondo_cesantias = COALESCE(NULLIF($7, ''), fondo_cesantias),
            tipo_nombramiento = COALESCE(NULLIF($8, ''), tipo_nombramiento),
            acto_nombramiento = COALESCE(NULLIF($9, ''), acto_nombramiento),
            numero_acto_nombramiento = COALESCE(NULLIF($10, ''), numero_acto_nombramiento),
            total_devengado = COALESCE($11, total_devengado),
            fecha_nacimiento = COALESCE($12::date, fecha_nacimiento),
            fecha_ingreso_entidad = COALESCE($13::date, fecha_ingreso_entidad),
            fecha_ingreso_distrito = COALESCE($14::date, fecha_ingreso_distrito),
            fecha_acto_nombramiento = COALESCE($15::date, fecha_acto_nombramiento),
            updated_at = NOW()
          WHERE titular_cedula = $16 OR encargo_cedula = $16 OR titular_cedula = $17 OR encargo_cedula = $17
        `, [
          tipoFuncionario, direccion, telefono, sexo, fondoSalud, fondoPension,
          fondoCesantias, tipoNomb, actoNomb, numActo, totalDevengado,
          fechaNacimiento, fechaIngresoEntidad, fechaIngresoDistrito, fechaActoNomb,
          cedula, String(parseInt(cedula, 10) || '')
        ]);

        procesados++;
        if (updateRes.rowCount > 0) {
          actualizados += updateRes.rowCount;
        } else if (idPerno && nomComp) {
          // Si no coincidió la cédula pero existe el ID PERNO, actualizar la plaza con el nuevo titular oficial
          const updatePernoId = await pool.query(`
            UPDATE public.planta_personal_sjd SET
              titular_cedula = $1,
              titular_nombre = $2,
              tipo_funcionario = COALESCE(NULLIF($3, ''), tipo_funcionario),
              direccion = COALESCE(NULLIF($4, ''), direccion),
              telefono = COALESCE(NULLIF($5, ''), telefono),
              sexo = COALESCE(NULLIF($6, ''), sexo),
              fondo_salud = COALESCE(NULLIF($7, ''), fondo_salud),
              fondo_pension = COALESCE(NULLIF($8, ''), fondo_pension),
              fondo_cesantias = COALESCE(NULLIF($9, ''), fondo_cesantias),
              tipo_nombramiento = COALESCE(NULLIF($10, ''), tipo_nombramiento),
              acto_nombramiento = COALESCE(NULLIF($11, ''), acto_nombramiento),
              numero_acto_nombramiento = COALESCE(NULLIF($12, ''), numero_acto_nombramiento),
              total_devengado = COALESCE($13, total_devengado),
              fecha_nacimiento = COALESCE($14::date, fecha_nacimiento),
              fecha_ingreso_entidad = COALESCE($15::date, fecha_ingreso_entidad),
              fecha_ingreso_distrito = COALESCE($16::date, fecha_ingreso_distrito),
              fecha_acto_nombramiento = COALESCE($17::date, fecha_acto_nombramiento),
              estado_cargo = 'OCUPADO',
              updated_at = NOW()
            WHERE id_perno = $18
          `, [
            cedula, nomComp, tipoFuncionario, direccion, telefono, sexo,
            fondoSalud, fondoPension, fondoCesantias, tipoNomb, actoNomb,
            numActo, totalDevengado, fechaNacimiento, fechaIngresoEntidad,
            fechaIngresoDistrito, fechaActoNomb, idPerno
          ]);

          if (updatePernoId.rowCount > 0) {
            actualizados += updatePernoId.rowCount;
          } else {
            retiradosOSinPlaza++;
          }
        } else {
          retiradosOSinPlaza++;
        }
      }

      await pool.query(`
        INSERT INTO public.nomina_import_logs (tipo_archivo, nombre_archivo, registros_procesados, registros_actualizados)
        VALUES ('PLANTA_PERNO', $1, $2, $3)
      `, [req.file.originalname, procesados, actualizados]);

      const detalleRetirados = retiradosOSinPlaza > 0 
        ? ` (${retiradosOSinPlaza} registros corresponden a personal histórico o retirado sin cargo activo en la planta).` 
        : '.';

      res.json({
        success: true,
        mensaje: `Archivo de Planta Perno procesado exitosamente. Se sincronizaron datos de ${actualizados} funcionarios con cargo activo${detalleRetirados}`,
        registros_procesados: procesados,
        registros_actualizados: actualizados,
        registros_retirados_o_sin_plaza: retiradosOSinPlaza,
        advertencias: [],
        total_advertencias: 0
      });
    } catch (error) {
      console.error('Error procesando archivo de planta perno:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Endpoints para descargar Plantillas Oficiales en Excel (.xlsx)
  router.get('/plantilla/planta', async (req, res) => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Secretaría Jurídica Distrital';
      const ws = wb.addWorksheet('PLANTA SJD (2)', { views: [{ state: 'frozen', ySplit: 4 }] });

      // Encabezados descriptivos
      ws.mergeCells('A1:K1');
      ws.getCell('A1').value = 'SECRETARÍA JURÍDICA DISTRITAL - PLANTILLA OFICIAL DE PLANTA DE PERSONAL';
      ws.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2A48' } };
      ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(1).height = 28;

      ws.mergeCells('A2:K2');
      ws.getCell('A2').value = 'Instrucciones: Encabezados en Fila 4. Registros a partir de la Fila 5. La columna A (ID) es el consecutivo único de la plaza.';
      ws.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF334155' } };

      // Encabezados ajustados: una sola columna OPEC (sin OPEC DIST_6).
      const headersPlanta = [
        'ID', 'ID SIDEAP', 'ID PERNO', 'CEDULA', 'APELLIDOS Y NOMBRES',
        'TIPO DE VINCULACIÓN A LA ENTIDAD', 'TIPO DE VINCULACIÓN AL CARGO/ SIDEAP',
        'FECHA INGRESO A LA ENTIDAD', 'FECHA INGRESO AL DISTRITO', 'SEXO', 'EDAD',
        'SITUACIÓN ADMINISTRATIVA', 'SITUACIÓN ADMINISTRATIVA TITULAR DEL CARGO',
        'CEDULA', 'TITULAR CARGO', 'ID-E', 'N', 'PV', 'PP OE', 'VT LM', 'VT LNR', 'OPEC',
        'ESTADO DEL CARGO', 'NIVEL', 'NOMENCLATURA_ADMIN', 'CÓDIGO', 'GRADO', 'U',
        'DEPENDENCIA DEL CARGO', 'DEPENDENCIA FUNCIONAL', 'PROPOSITO', 'FUNCIONES', 'REQUISITOS',
        'Páginas Manual de Funciones', 'ASIGNACIÓN BÁSICA 2025'
      ];

      const row4 = ws.getRow(4);
      row4.values = headersPlanta;
      row4.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      row4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF174A7E' } };
      row4.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      row4.height = 36;

      // Filas de ejemplo real (ajustadas con una sola columna OPEC)
      const ejemplo1 = [
        1, 4998, 11, '36697863', 'ANA MARTA MIRANDA CORRALES',
        'LIBRE NOMBRAMIENTO Y REMOCIÓN', 'NOMBRAMIENTO ORDINARIO',
        '2025-11-06', '2025-11-06', 'MUJER', 45,
        'EN PROPIEDAD', 'EN PROPIEDAD', '36697863', 'ANA MARTA MIRANDA CORRALES',
        '', '', '', '', '', '', '',
        'OCUPADO', 'ASESOR', 'JEFE DE OFICINA ASESORA', '115', '6', '115-6',
        'OFICINA ASESORA DE PLANEACIÓN', 'OFICINA ASESORA DE PLANEACIÓN',
        'Asesorar en el diseño de planes y estrategias de planeación.',
        '1. Formular proyectos de inversión. 2. Dirigir plan estratégico.',
        'Título profesional en Administración, Economía o afines. Posgrado.',
        '34-37 RES. 085 de 2020', 10208469.82
      ];

      const ejemplo2 = [
        2, 5005, 172, '', 'VACANTE DEFINITIVA',
        'CARRERA ADMINISTRATIVA', '',
        '', '', '', '',
        'VACANCIA', 'VACANTE DEFINITIVA', '', 'VACANTE DEFINITIVA',
        '', '', '', '', '', '', '',
        'VACANTE DEFINITIVA', 'PROFESIONAL', 'PROFESIONAL ESPECIALIZADO', '222', '24', '222-24',
        'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
        'Sustanciar y proyectar conceptos jurídicos institucionales.',
        '1. Emitir conceptos. 2. Elaborar proyectos normativos.',
        'Título profesional en Derecho y título de posgrado en área jurídica.',
        'Res. 085 de 2020', 8750000.00
      ];

      ws.addRow(ejemplo1);
      ws.addRow(ejemplo2);

      // Autoancho de columnas
      ws.columns.forEach((col, idx) => {
        if (idx === 32 || idx === 33 || idx === 31) {
          col.width = 40;
        } else if (idx === 4 || idx === 14 || idx === 29 || idx === 30) {
          col.width = 30;
        } else {
          col.width = 18;
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Plantilla_Planta_Oficial_SJD.xlsx"');
      await wb.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Error generando plantilla de planta:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/plantilla/perno', async (req, res) => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Secretaría Jurídica Distrital';
      const ws = wb.addWorksheet('PLANTA PERNO', { views: [{ state: 'frozen', ySplit: 9 }] });

      ws.mergeCells('A1:J1');
      ws.getCell('A1').value = 'SECRETARÍA JURÍDICA DISTRITAL - PLANTILLA DE PLANTA PERNO (NÓMINA Y SEGURIDAD SOCIAL)';
      ws.getCell('A1').font = { size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2A48' } };
      ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(1).height = 28;

      ws.mergeCells('A2:J2');
      ws.getCell('A2').value = 'Instrucciones: Encabezados en Fila 9. Registros a partir de la Fila 10. La columna A (NUMERO_IDENTIFICACION) debe coincidir con la cédula del funcionario.';
      ws.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF334155' } };

      const headersPerno = [
        'NUMERO_IDENTIFICACION', 'PRIMER_APELLIDO', 'SEGUNDO_APELLIDO', 'NOMBRE', 'ESTADO_FUNCIONARIO',
        'FECHA_NACIMIENTO', 'DIRECCION', 'TELEFONO', 'SEXO', 'LIBRETA_MILITAR',
        'CLASE_LIBRETA', 'DISTRITO_MILITAR', 'TIPO_SANGRE', 'RH', 'TIPO_FUNCIONARIO',
        'FECHA_INGRESO_ENTIDAD', 'FECHA_INGRESO_DISTRITO', 'FECHA_INGRESO_NACION', 'CODIGO_EPS', 'FONDO_SALUD',
        'CODIGO_FONDO_PENSIONES', 'FONDO_PENSION', 'CODIGO_FONDO_CESANTIAS', 'FONDO_CESANTIAS', 'DEPENDENCIA',
        'DESC_DEPENDENCIA', 'CARGO', 'GRADO', 'ASIGNACION', 'DESCRIPCION',
        'POSICION_PLANTA', 'CODSEDE', 'SEDE', 'TIPO_NOMB', 'ACTO_NOMB',
        'FECHA_EFECTIVA_NOMB', 'NUMERO_ACTO_NOMB', 'FECHA_ACTO_NOMB', 'FECHA_EFECTIVA_ENC', 'NUMERO_ACTO_ENC',
        'FECHA_ACTO_ENC', 'FECHA_RETIRO', 'TOTAL DEVENGADOS MENSUAL'
      ];

      const row9 = ws.getRow(9);
      row9.values = headersPerno;
      row9.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      row9.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      row9.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      row9.height = 34;

      const ejPerno1 = [
        '52171949', 'MARTINEZ', 'ORTIZ', 'GLORIA INES', 'A',
        '1973-04-22', 'CARRERA 98 A 22 K 00', '4754435', 'F', '',
        '', '', 'O', 'P', 'EMPLEADO DE PLANTA',
        '2021-07-12', '2021-07-12', '', '2', 'SALUD TOTAL S.A. E.P.S.',
        '11', 'COLPENSIONES', '3', 'FONDO NACIONAL DEL AHORRO', '2310300',
        'OFICINA DE CONTROL INTERNO', '219', '10', 4938935, 'PROFESIONAL UNIVERSITARIO',
        '103', 'Sede', 'Sin Definir', 'CARRERA ADMINISTRATIVA', 'Nombramiento',
        '2021-07-12', '107', '2021-07-04', '', '',
        '', '', 4938935
      ];

      const ejPerno2 = [
        '36697863', 'MIRANDA', 'CORRALES', 'ANA MARTA', 'A',
        '1980-05-15', 'CALLE 127 # 15-40', '3157890123', 'F', '',
        '', '', 'O', 'P', 'EMPLEADO DE PLANTA',
        '2025-11-06', '2025-11-06', '', '1', 'SANITAS EPS',
        '12', 'PORVENIR S.A.', '1', 'FONDO NACIONAL DEL AHORRO', '2310100',
        'OFICINA ASESORA DE PLANEACIÓN', '115', '6', 10208469.82, 'JEFE DE OFICINA ASESORA',
        '1', 'Sede Central', 'Sede Principal', 'LIBRE NOMBRAMIENTO Y REMOCIÓN', 'Resolución',
        '2025-11-06', '204', '2025-11-01', '', '',
        '', '', 10208469.82
      ];

      ws.addRow(ejPerno1);
      ws.addRow(ejPerno2);

      ws.columns.forEach((col, idx) => {
        if (idx === 19 || idx === 21 || idx === 23 || idx === 25) {
          col.width = 28;
        } else if (idx === 6 || idx === 29) {
          col.width = 26;
        } else {
          col.width = 18;
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Plantilla_Planta_Perno_SJD.xlsx"');
      await wb.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Error generando plantilla de perno:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Sincronizar desde Scratch/PLANTA.xlsx (para inicializar automáticamente)
  router.post('/sync-local', async (req, res) => {
    try {
      await ensureTables();
      let filePath = path.resolve(__dirname, '../../Scratch/PLANTA.xlsx');
      if (!fs.existsSync(filePath)) {
        filePath = path.resolve(__dirname, '../Scratch/PLANTA.xlsx');
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'No se encontró Scratch/PLANTA.xlsx en el servidor.' });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const sheetPlanta = workbook.getWorksheet('PLANTA SJD (2)');
      const sheetPerno = workbook.getWorksheet('PLANTA PERNO');

      let countPlanta = 0;
      if (sheetPlanta) {
        for (let r = 5; r <= 174; r++) {
          const row = sheetPlanta.getRow(r);
          const idPlaza = parseInt(getVal(row.getCell(1)), 10);
          if (!idPlaza) continue;

          const titularCedula = String(getVal(row.getCell(4)) || '').trim();
          const titularNombre = String(getVal(row.getCell(5)) || '').trim();
          const tipoVinculacion = String(getVal(row.getCell(6)) || '').trim();
          const situacionAdmin = String(getVal(row.getCell(13)) || getVal(row.getCell(14)) || '').trim();
          
          const situacionTitular = String(getVal(row.getCell(14)) || '').trim();

          // Encargo y Escalera (Cols 15, 16, 17, 18)
          const encargoCedula = String(getVal(row.getCell(15)) || '').trim() || null;
          const encargoNombre = cleanText(getVal(row.getCell(16))) || null;
          const idE = cleanText(getVal(row.getCell(17))) || null;
          const idEscalera = idE ? idE.toUpperCase() : null;
          const peldanoEscalera = parseInt(getVal(row.getCell(18)), 10) || null;
          const opec = cleanText(getVal(row.getCell(23))) || null;

          let estadoCargo = String(getVal(row.getCell(25)) || '').trim().toUpperCase();
          if (!estadoCargo || estadoCargo.includes('IF(')) {
            if (titularNombre.includes('VACANTE DEFINITIVA')) {
              estadoCargo = 'VACANTE DEFINITIVA';
            } else if (titularNombre.includes('VACANTE TEMPORAL')) {
              estadoCargo = 'VACANTE TEMPORAL';
            } else if (titularNombre) {
              estadoCargo = 'OCUPADO';
            } else {
              estadoCargo = 'VACANTE DEFINITIVA';
            }
          }

          const nivel = String(getVal(row.getCell(26)) || '').trim().toUpperCase();
          const cargoNom = String(getVal(row.getCell(27)) || '').trim().toUpperCase();
          const codigo = String(getVal(row.getCell(28)) || '').trim();
          const grado = String(getVal(row.getCell(29)) || '').trim();
          const depCargo = String(getVal(row.getCell(31)) || '').trim().toUpperCase();
          const depFuncional = String(getVal(row.getCell(32)) || depCargo).trim().toUpperCase();
          const proposito = String(getVal(row.getCell(33)) || '').trim();
          const funcionesRaw = String(getVal(row.getCell(34)) || '').trim();
          const requisitos = String(getVal(row.getCell(35)) || '').trim();
          const asignacion = parseFloat(getVal(row.getCell(37))) || 0;

          const esEncargo = Boolean(idEscalera || encargoCedula || (encargoNombre && !encargoNombre.includes('VACANTE')) || situacionAdmin.includes('ENCARGO'));

          await pool.query(`
            INSERT INTO public.planta_personal_sjd (
              id_plaza, id_sideap, id_perno, nivel, cargo, codigo, grado,
              dependencia_cargo, dependencia_funcional, proposito, funciones,
              requisitos, asignacion_basica, estado_cargo, titular_cedula,
              titular_nombre, tipo_vinculacion, situacion_administrativa,
              situacion_titular, encargo_cedula, encargo_nombre, es_encargo,
              opec, id_escalera, peldano_escalera, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
              $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW()
            )
            ON CONFLICT (id_plaza) DO UPDATE SET
              nivel = EXCLUDED.nivel,
              cargo = EXCLUDED.cargo,
              codigo = EXCLUDED.codigo,
              grado = EXCLUDED.grado,
              dependencia_cargo = EXCLUDED.dependencia_cargo,
              dependencia_funcional = EXCLUDED.dependencia_funcional,
              proposito = EXCLUDED.proposito,
              funciones = EXCLUDED.funciones,
              requisitos = EXCLUDED.requisitos,
              asignacion_basica = EXCLUDED.asignacion_basica,
              estado_cargo = EXCLUDED.estado_cargo,
              titular_cedula = EXCLUDED.titular_cedula,
              titular_nombre = EXCLUDED.titular_nombre,
              tipo_vinculacion = EXCLUDED.tipo_vinculacion,
              situacion_administrativa = EXCLUDED.situacion_administrativa,
              situacion_titular = EXCLUDED.situacion_titular,
              encargo_cedula = EXCLUDED.encargo_cedula,
              encargo_nombre = EXCLUDED.encargo_nombre,
              es_encargo = EXCLUDED.es_encargo,
              opec = EXCLUDED.opec,
              id_escalera = EXCLUDED.id_escalera,
              peldano_escalera = EXCLUDED.peldano_escalera,
              updated_at = NOW();
          `, [
            idPlaza, parseInt(getVal(row.getCell(2)), 10) || null, parseInt(getVal(row.getCell(3)), 10) || null,
            nivel, cargoNom, codigo, grado, depCargo, depFuncional, proposito,
            JSON.stringify(parseFunctions(funcionesRaw)), requisitos, asignacion,
            estadoCargo, titularCedula, titularNombre, tipoVinculacion, situacionAdmin,
            situacionTitular, encargoCedula, encargoNombre, esEncargo,
            opec, idEscalera, peldanoEscalera
          ]);
          countPlanta++;
        }
      }

      let countPerno = 0;
      if (sheetPerno) {
        for (let r = 10; r <= sheetPerno.rowCount; r++) {
          const row = sheetPerno.getRow(r);
          const cedula = String(getVal(row.getCell(1)) || '').trim();
          if (!cedula) continue;

          const tipoFunc = String(getVal(row.getCell(15)) || '').trim();
          const dir = String(getVal(row.getCell(7)) || '').trim();
          const tel = String(getVal(row.getCell(8)) || '').trim();
          const sexo = String(getVal(row.getCell(9)) || '').trim();
          const eps = String(getVal(row.getCell(20)) || '').trim();
          const pension = String(getVal(row.getCell(22)) || '').trim();
          const cesantias = String(getVal(row.getCell(24)) || '').trim();
          const tipoNomb = String(getVal(row.getCell(34)) || '').trim();
          const actoNomb = String(getVal(row.getCell(35)) || '').trim();
          const numActo = String(getVal(row.getCell(37)) || '').trim();
          const totalDevengado = parseFloat(getVal(row.getCell(43))) || null;

          const u = await pool.query(`
            UPDATE public.planta_personal_sjd SET
              tipo_funcionario = $1, direccion = $2, telefono = $3, sexo = $4,
              fondo_salud = $5, fondo_pension = $6, fondo_cesantias = $7,
              tipo_nombramiento = $8, acto_nombramiento = $9, numero_acto_nombramiento = $10,
              total_devengado = COALESCE($11, total_devengado),
              updated_at = NOW()
            WHERE titular_cedula = $12
          `, [tipoFunc, dir, tel, sexo, eps, pension, cesantias, tipoNomb, actoNomb, numActo, totalDevengado, cedula]);

          if (u.rowCount > 0) countPerno += u.rowCount;
        }
      }

      res.json({
        success: true,
        mensaje: `Sincronización completada. Plazas procesadas: ${countPlanta}. Registros enriquecidos con Nómina Perno: ${countPerno}.`,
      });
    } catch (error) {
      console.error('Error sincronizando archivo local:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // ENDPOINT: LISTADO Y DETALLE DE ESCALERAS DE ENCARGO (CNSC / SJD)
  // =========================================================================
  router.get('/escaleras', async (req, res) => {
    try {
      await ensureTables();
      const q = req.query.busqueda ? req.query.busqueda.trim().toLowerCase() : null;
      let rows = [];
      try {
        const result = await pool.query(`
          SELECT * FROM public.planta_personal_sjd
          WHERE id_escalera IS NOT NULL AND TRIM(id_escalera) != ''
          ORDER BY id_escalera ASC, peldano_escalera ASC NULLS LAST, id_plaza ASC
        `);
        rows = result.rows || [];
      } catch (err) {
        console.warn('Error consultando tabla para escaleras:', err.message);
      }

      if (rows.length === 0) {
        try {
          const mockPath = path.resolve(__dirname, '../../frontend/lib/plantaMockData.json');
          if (fs.existsSync(mockPath)) {
            const mock = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
            rows = mock.filter(p => p.id_escalera);
          }
        } catch (e) {}
      }

      const map = new Map();
      rows.forEach(p => {
        const idEsc = String(p.id_escalera).trim().toUpperCase();
        if (!map.has(idEsc)) map.set(idEsc, []);
        map.get(idEsc).push(p);
      });

      let escaleras = [];
      map.forEach((peldanos, idEsc) => {
        peldanos.sort((a, b) => (Number(a.peldano_escalera) || 999) - (Number(b.peldano_escalera) || 999));
        escaleras.push({
          id_escalera: idEsc,
          total_peldanos: peldanos.length,
          peldanos
        });
      });

      escaleras.sort((a, b) => a.id_escalera.localeCompare(b.id_escalera, undefined, { numeric: true }));

      if (q) {
        escaleras = escaleras.filter(e =>
          e.id_escalera.toLowerCase().includes(q) ||
          e.peldanos.some(p =>
            (p.cargo && p.cargo.toLowerCase().includes(q)) ||
            (p.titular_nombre && p.titular_nombre.toLowerCase().includes(q)) ||
            (p.encargo_nombre && p.encargo_nombre.toLowerCase().includes(q)) ||
            (p.dependencia_cargo && p.dependencia_cargo.toLowerCase().includes(q))
          )
        );
      }

      res.json({ success: true, escaleras, total: escaleras.length });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/escaleras/:id', async (req, res) => {
    try {
      const idEsc = req.params.id.trim().toUpperCase();
      let peldanos = [];
      try {
        const result = await pool.query(`
          SELECT * FROM public.planta_personal_sjd
          WHERE UPPER(TRIM(id_escalera)) = $1
          ORDER BY peldano_escalera ASC NULLS LAST, id_plaza ASC
        `, [idEsc]);
        peldanos = result.rows || [];
      } catch (err) {}

      if (peldanos.length === 0) {
        try {
          const mockPath = path.resolve(__dirname, '../../frontend/lib/plantaMockData.json');
          if (fs.existsSync(mockPath)) {
            const mock = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
            peldanos = mock.filter(p => p.id_escalera && String(p.id_escalera).trim().toUpperCase() === idEsc);
          }
        } catch (e) {}
      }

      peldanos.sort((a, b) => (Number(a.peldano_escalera) || 999) - (Number(b.peldano_escalera) || 999));

      res.json({
        success: true,
        id_escalera: idEsc,
        total_peldanos: peldanos.length,
        peldanos
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
};
