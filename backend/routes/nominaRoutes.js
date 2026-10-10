const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const excelHelper = require('../nominaExcelHelper');

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
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS manual_funciones TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS resolucion_manual TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS edad INT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS fecha_vacancia DATE;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS fecha_reporte_simo DATE;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS proceso_seleccion_simo TEXT;
        ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS notas_peticion TEXT;

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

        -- Garantizar la presencia de todas las columnas en personal_perno_sjd
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS libreta_militar TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS clase_libreta TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS distrito_militar TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS tipo_sangre TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS rh TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS fecha_ingreso_nacion DATE;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS codigo_eps TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS codigo_fondo_pensiones TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS codigo_fondo_cesantias TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS dependencia_cod TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS dependencia TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS cargo_cod TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS grado TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS asignacion_basica NUMERIC(14, 2);
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS cargo TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS posicion_planta INT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS sede_cod TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS sede TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS fecha_efectiva_nombramiento DATE;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS fecha_efectiva_encargo DATE;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS numero_acto_encargo TEXT;
        ALTER TABLE public.personal_perno_sjd ADD COLUMN IF NOT EXISTS fecha_acto_encargo DATE;

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
      const {
        busqueda,
        nivel,
        estado,
        dependencia,
        cargo,
        id_sieap,
        id_sideap,
        codigo_grado,
        codigo,
        grado,
        situacion,
        situacion_titular,
        id_perno,
        solo_encargo,
      } = req.query;

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
          dependencia_funcional ILIKE $${idx} OR
          codigo ILIKE $${idx} OR
          grado ILIKE $${idx} OR
          (COALESCE(codigo, '') || '-' || COALESCE(grado, '')) ILIKE $${idx} OR
          id_plaza::text ILIKE $${idx} OR
          id_sideap::text ILIKE $${idx} OR
          id_perno::text ILIKE $${idx} OR
          situacion_administrativa ILIKE $${idx} OR
          situacion_titular ILIKE $${idx} OR
          tipo_vinculacion ILIKE $${idx}
        )`;
      }

      if (nivel && nivel !== 'TODOS') {
        params.push(nivel.trim());
        const idx = params.length;
        query += ` AND (
          UPPER(nivel) = UPPER($${idx}) OR 
          REPLACE(REPLACE(UPPER(nivel), 'É', 'E'), 'Í', 'I') = UPPER($${idx})
        )`;
      }

      if (estado && estado !== 'TODOS') {
        params.push(estado.trim());
        const idx = params.length;
        query += ` AND UPPER(estado_cargo) = UPPER($${idx})`;
      }

      if (dependencia && dependencia !== 'TODAS') {
        const rawDeps = dependencia.includes(',')
          ? dependencia.split(',').map((s) => s.trim()).filter(Boolean)
          : [dependencia.trim()];
        if (rawDeps.length > 0) {
          const depClauses = [];
          for (const depItem of rawDeps) {
            params.push(%%);
            const idx = params.length;
            depClauses.push((dependencia_cargo ILIKE {idx} OR dependencia_funcional ILIKE {idx}));
          }
          query +=  AND ();
        }
      }

      if (cargo && cargo !== 'TODOS') {
        const rawCargos = cargo.includes(',')
          ? cargo.split(',').map((s) => s.trim()).filter(Boolean)
          : [cargo.trim()];
        if (rawCargos.length > 0) {
          const cargoClauses = [];
          for (const carItem of rawCargos) {
            params.push(carItem);
            const idx = params.length;
            cargoClauses.push(TRIM(cargo) ILIKE TRIM({idx}));
          }
          query +=  AND ();
        }
      }   }

      // Filtro de Código y Grado (soporta lista separada por comas '219-01, 222-24', 'COD-GRA', solo código o solo grado, con normalización de ceros)
      if (codigo_grado && codigo_grado.trim() && codigo_grado !== 'TODOS') {
        const rawItems = codigo_grado.includes(',')
          ? codigo_grado.split(',').map((s) => s.trim()).filter(Boolean)
          : [codigo_grado.trim()];

        if (rawItems.length > 0) {
          const orClauses = [];
          for (const item of rawItems) {
            if (item.includes('-')) {
              const parts = item.split('-');
              const codPart = parts[0].trim();
              const graPart = parts[1].trim();
              const codLtrim = codPart.replace(/^0+/, '') || '0';
              const graLtrim = graPart.replace(/^0+/, '') || '0';

              params.push(codPart, codLtrim, graPart, graLtrim);
              const iCod = params.length - 3;
              const iCodL = params.length - 2;
              const iGra = params.length - 1;
              const iGraL = params.length;

              orClauses.push(`(
                (TRIM(codigo) ILIKE TRIM($${iCod}) OR LTRIM(TRIM(codigo), '0') = $${iCodL})
                AND
                (TRIM(grado) ILIKE TRIM($${iGra}) OR LTRIM(TRIM(grado), '0') = $${iGraL})
              )`);
            } else {
              const ltrimVal = item.replace(/^0+/, '') || '0';
              params.push(item, ltrimVal);
              const iVal = params.length - 1;
              const iValL = params.length;
              orClauses.push(`(
                TRIM(codigo) ILIKE TRIM($${iVal}) OR LTRIM(TRIM(codigo), '0') = $${iValL} OR
                TRIM(grado) ILIKE TRIM($${iVal}) OR LTRIM(TRIM(grado), '0') = $${iValL} OR
                (COALESCE(codigo, '') || '-' || COALESCE(grado, '')) ILIKE $${iVal}
              )`);
            }
          }
          if (orClauses.length > 0) {
            query += ` AND (${orClauses.join(' OR ')})`;
          }
        }
      }

      if (codigo && codigo.trim() && codigo !== 'TODOS') {
        const codVal = codigo.trim();
        const codLtrim = codVal.replace(/^0+/, '') || '0';
        params.push(codVal, codLtrim);
        const iCod = params.length - 1;
        const iCodL = params.length;
        query += ` AND (TRIM(codigo) ILIKE TRIM($${iCod}) OR LTRIM(TRIM(codigo), '0') = $${iCodL})`;
      }

      if (grado && grado.trim() && grado !== 'TODOS') {
        const graVal = grado.trim();
        const graLtrim = graVal.replace(/^0+/, '') || '0';
        params.push(graVal, graLtrim);
        const iGra = params.length - 1;
        const iGraL = params.length;
        query += ` AND (TRIM(grado) ILIKE TRIM($${iGra}) OR LTRIM(TRIM(grado), '0') = $${iGraL})`;
      }

      // Filtro de TIPO DE VINCULACIÓN AL CARGO/ SIDEAP (Columna 7)
      if (situacion && situacion.trim() && situacion !== 'TODAS') {
        const rawSits = situacion.includes(',')
          ? situacion.split(',').map((s) => s.trim()).filter(Boolean)
          : [situacion.trim()];
        if (rawSits.length > 0) {
          const sitClauses = [];
          for (const sitItem of rawSits) {
            const upperSit = sitItem.toUpperCase();
            if (upperSit === 'VACANTE DEFINITIVA') {
              params.push('VACANTE DEFINITIVA');
              const idx = params.length;
              sitClauses.push(`(UPPER(tipo_vinculacion) = $${idx} OR UPPER(estado_cargo) = $${idx})`);
            } else if (upperSit === 'VACANTE TEMPORAL') {
              params.push('VACANTE TEMPORAL');
              const idx = params.length;
              sitClauses.push(`(UPPER(tipo_vinculacion) = $${idx} OR UPPER(estado_cargo) = $${idx})`);
            } else {
              params.push(`%${sitItem}%`);
              const idx = params.length;
              sitClauses.push(`(tipo_vinculacion ILIKE $${idx} OR situacion_administrativa ILIKE $${idx})`);
            }
          }
          query += ` AND (${sitClauses.join(' OR ')})`;
        }
      }

      // Filtro de SITUACIÓN ADMINISTRATIVA TITULAR DEL CARGO (Columna 13)
      if (situacion_titular && situacion_titular.trim() && situacion_titular !== 'TODAS') {
        const rawSitsTit = situacion_titular.includes(',')
          ? situacion_titular.split(',').map((s) => s.trim()).filter(Boolean)
          : [situacion_titular.trim()];
        if (rawSitsTit.length > 0) {
          const sitTitClauses = [];
          for (const sitItem of rawSitsTit) {
            params.push(`%${sitItem}%`);
            const idx = params.length;
            sitTitClauses.push(`situacion_titular ILIKE $${idx}`);
          }
          query += ` AND (${sitTitClauses.join(' OR ')})`;
        }
      }

      // Filtro por ID SIDEAP
      const sieapVal = id_sieap || id_sideap;
      if (sieapVal && sieapVal !== 'TODOS') {
        const sieapNum = parseInt(sieapVal, 10);
        if (!isNaN(sieapNum)) {
          params.push(sieapNum);
          query += ` AND id_sideap = $${params.length}`;
        }
      }

      // Filtro por ID PERNO
      if (id_perno && id_perno !== 'TODOS') {
        const pernoNum = parseInt(id_perno, 10);
        if (!isNaN(pernoNum)) {
          params.push(pernoNum);
          query += ` AND id_perno = $${params.length}`;
        }
      }

      // Filtro Solo Encargos
      if (solo_encargo === 'true' || solo_encargo === true) {
        query += ` AND (es_encargo = TRUE OR (encargo_cedula IS NOT NULL AND TRIM(encargo_cedula) <> ''))`;
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

  // =========================================================================
  // MÓDULO: ASISTENTE DE DERECHOS DE PETICIÓN - OPEC Y EMPLEOS EQUIVALENTES
  // =========================================================================

  // 2.A Listar OPECs registradas en la planta para autocompletado y catálogo
  router.get('/peticiones-opec/lista-opecs', async (req, res) => {
    try {
      await ensureTables();
      const result = await pool.query(`
        SELECT 
          opec,
          cargo,
          codigo,
          grado,
          nivel,
          COUNT(*) as total_plazas,
          COUNT(CASE WHEN estado_cargo = 'VACANTE DEFINITIVA' THEN 1 END) as vacantes_definitivas,
          COUNT(CASE WHEN estado_cargo = 'OCUPADO' THEN 1 END) as ocupadas
        FROM public.planta_personal_sjd
        WHERE opec IS NOT NULL AND TRIM(opec) <> ''
        GROUP BY opec, cargo, codigo, grado, nivel
        ORDER BY opec ASC
      `);

      // También obtener lista única de combinaciones cargo/codigo/grado para búsquedas por cargo
      const cargosResult = await pool.query(`
        SELECT 
          cargo,
          codigo,
          grado,
          nivel,
          COUNT(*) as total_plazas,
          COUNT(CASE WHEN estado_cargo = 'VACANTE DEFINITIVA' THEN 1 END) as vacantes_definitivas,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT opec), NULL) as opecs_asociadas
        FROM public.planta_personal_sjd
        GROUP BY cargo, codigo, grado, nivel
        ORDER BY cargo ASC, codigo ASC, grado ASC
      `);

      res.json({
        success: true,
        opecs: result.rows,
        cargos_planta: cargosResult.rows,
      });
    } catch (error) {
      console.error('Error al listar OPECs para peticiones:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2.B Consulta de empleos iguales/equivalentes y generación de literales (a-i) + Oficio formal
  router.get('/peticiones-opec/consultar', async (req, res) => {
    try {
      await ensureTables();
      const { opec, codigo, grado, cargo, peticionario = 'Peticionario(a)', radicado = 'Sin radicado registrado' } = req.query;

      const opecQuery = opec ? String(opec).trim() : '';
      const codigoQuery = codigo ? String(codigo).trim() : '';
      const gradoQuery = grado ? String(grado).trim() : '';
      const cargoQuery = cargo ? String(cargo).trim() : '';

      if (!opecQuery && !codigoQuery && !cargoQuery) {
        return res.status(400).json({
          success: false,
          error: 'Debe especificar al menos un número de OPEC, código de empleo o denominación del cargo.',
        });
      }

      let cargoReferencia = null;
      let codigoReferencia = null;
      let gradoReferencia = null;
      let nivelReferencia = null;
      let opecEncontradaEnPlanta = false;

      // 1. Si enviaron OPEC, buscarla primero en la planta
      if (opecQuery) {
        const opecPlaza = await pool.query(
          `SELECT * FROM public.planta_personal_sjd WHERE opec = $1 ORDER BY id_plaza ASC LIMIT 1`,
          [opecQuery]
        );

        if (opecPlaza.rows.length > 0) {
          const p = opecPlaza.rows[0];
          cargoReferencia = p.cargo;
          codigoReferencia = p.codigo;
          gradoReferencia = p.grado;
          nivelReferencia = p.nivel;
          opecEncontradaEnPlanta = true;
        }
      }

      // 2. Si no se halló por OPEC directa, tomar los parámetros explícitos
      if (!cargoReferencia && codigoQuery && gradoQuery) {
        const porCodGra = await pool.query(
          `SELECT cargo, nivel FROM public.planta_personal_sjd WHERE codigo = $1 AND grado = $2 LIMIT 1`,
          [codigoQuery, gradoQuery]
        );
        codigoReferencia = codigoQuery;
        gradoReferencia = gradoQuery;
        if (porCodGra.rows.length > 0) {
          cargoReferencia = porCodGra.rows[0].cargo;
          nivelReferencia = porCodGra.rows[0].nivel;
        } else if (cargoQuery) {
          cargoReferencia = cargoQuery.toUpperCase();
        }
      } else if (!cargoReferencia && cargoQuery) {
        const porCargo = await pool.query(
          `SELECT cargo, codigo, grado, nivel FROM public.planta_personal_sjd WHERE cargo ILIKE $1 LIMIT 1`,
          [`%${cargoQuery}%`]
        );
        if (porCargo.rows.length > 0) {
          cargoReferencia = porCargo.rows[0].cargo;
          codigoReferencia = porCargo.rows[0].codigo;
          gradoReferencia = porCargo.rows[0].grado;
          nivelReferencia = porCargo.rows[0].nivel;
        }
      }

      // Si aún no encontramos referencia mínima
      if (!cargoReferencia && !codigoReferencia) {
        return res.json({
          success: true,
          encontrado: false,
          mensaje: `No se encontraron empleos en la planta asociados a la búsqueda (OPEC: ${opecQuery || 'N/A'}).`,
          opec_buscada: opecQuery,
          plazas: [],
        });
      }

      // 3. Consultar TODOS los empleos iguales o equivalentes (mismo cargo, código y grado)
      let queryEquivalentes = `
        SELECT * FROM public.planta_personal_sjd 
        WHERE 1=1
      `;
      const paramsEquiv = [];

      if (codigoReferencia && gradoReferencia) {
        paramsEquiv.push(codigoReferencia, gradoReferencia);
        queryEquivalentes += ` AND codigo = $1 AND grado = $2`;
        if (cargoReferencia) {
          paramsEquiv.push(cargoReferencia);
          queryEquivalentes += ` AND cargo = $3`;
        }
      } else if (cargoReferencia) {
        paramsEquiv.push(cargoReferencia);
        queryEquivalentes += ` AND cargo = $1`;
      }

      queryEquivalentes += ` ORDER BY id_plaza ASC`;

      const equivResult = await pool.query(queryEquivalentes, paramsEquiv);
      const plazas = equivResult.rows;

      if (plazas.length === 0) {
        return res.json({
          success: true,
          encontrado: false,
          mensaje: 'No se encontraron plazas existentes para la denominación solicitada en la planta de personal.',
          opec_buscada: opecQuery,
          plazas: [],
        });
      }

      // Si no teníamos nivel, tomar del primer registro
      if (!nivelReferencia && plazas.length > 0) {
        nivelReferencia = plazas[0].nivel;
      }
      if (!cargoReferencia && plazas.length > 0) {
        cargoReferencia = plazas[0].cargo;
      }
      if (!codigoReferencia && plazas.length > 0) {
        codigoReferencia = plazas[0].codigo;
      }
      if (!gradoReferencia && plazas.length > 0) {
        gradoReferencia = plazas[0].grado;
      }

      // 4. Analizar estadísticas y literales a-i
      const totalEmpleos = plazas.length;

      // Dependencias
      const dependenciasMap = {};
      plazas.forEach(p => {
        const dep = p.dependencia_cargo || p.dependencia_funcional || 'Dependencia no especificada';
        dependenciasMap[dep] = (dependenciasMap[dep] || 0) + 1;
      });
      const desgloseDependencias = Object.entries(dependenciasMap).map(([dep, cant]) => ({
        dependencia: dep,
        cantidad: cant,
      }));

      // Vacantes temporales vs definitivas
      const plazasVacTemporal = plazas.filter(p => {
        const est = (p.estado_cargo || '').toUpperCase();
        const sit = (p.situacion_administrativa || '').toUpperCase();
        const tit = (p.titular_nombre || '').toUpperCase();
        const sitTit = (p.situacion_titular || '').toUpperCase();
        return est === 'VACANTE TEMPORAL' || sit === 'VACANTE TEMPORAL' || tit === 'VACANTE TEMPORAL' || sitTit.includes('TEMPORAL');
      });
      const totalVacTemporales = plazasVacTemporal.length;

      const plazasVacDefinitiva = plazas.filter(p => {
        if (plazasVacTemporal.includes(p)) return false;
        const est = (p.estado_cargo || '').toUpperCase();
        const sit = (p.situacion_administrativa || '').toUpperCase();
        const tit = (p.titular_nombre || '').toUpperCase();
        return est === 'VACANTE DEFINITIVA' || sit === 'VACANTE DEFINITIVA' || tit === 'VACANTE DEFINITIVA';
      });
      const totalVacDefinitivas = plazasVacDefinitiva.length;

      // Situaciones administrativas / modalidades de vinculación
      let conteoCarrera = 0;
      let conteoPeriodoPrueba = 0;
      let conteoEncargo = 0;
      let conteoProvisional = 0;
      let conteoLibreNombramiento = 0;

      plazas.forEach(p => {
        const vinc = (p.tipo_vinculacion || '').toUpperCase();
        const sit = (p.situacion_administrativa || '').toUpperCase();
        const esEnc = p.es_encargo === true || !!p.encargo_nombre;

        if (vinc.includes('PERIODO DE PRUEBA') || sit.includes('PERIODO DE PRUEBA')) {
          conteoPeriodoPrueba++;
        } else if (vinc.includes('CARRERA') || sit.includes('PROPIEDAD') || vinc.includes('PROPIEDAD')) {
          conteoCarrera++;
        } else if (esEnc || vinc.includes('ENCARGO') || sit.includes('ENCARGO')) {
          conteoEncargo++;
        } else if (vinc.includes('PROVISIONAL') || sit.includes('PROVISIONAL')) {
          conteoProvisional++;
        } else if (vinc.includes('LIBRE') || sit.includes('LIBRE')) {
          conteoLibreNombramiento++;
        }
      });

      // Fechas de vacancia definitiva
      const fechasVacancia = plazasVacDefinitiva.map(p => ({
        id_plaza: p.id_plaza,
        dependencia: p.dependencia_cargo,
        fecha_vacancia: p.fecha_vacancia || p.fecha_acto_nombramiento || null,
        acto: p.acto_nombramiento || p.numero_acto_nombramiento || 'En validación en archivo',
      }));

      // Reporte en SIMO
      const plazasReportadasSIMO = plazas.filter(p => p.opec && String(p.opec).trim() !== '');

      // Generar números en letras sencillos para redacción formal
      const numeroALetras = (n) => {
        const map = {
          0: 'cero', 1: 'un', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
          6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez',
          11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
          16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte'
        };
        return map[n] || String(n);
      };

      // Estructuración de los Literales a - i
      const literalA = cargoReferencia || 'No especificado';
      const literalB = codigoReferencia || 'No especificado';
      const literalC = gradoReferencia || 'No especificado';
      
      const literalD_texto = desgloseDependencias.map(d => `• ${d.dependencia}: ${d.cantidad} ${d.cantidad === 1 ? 'empleo' : 'empleos'}`).join('\n');
      
      const literalE_texto = `En la planta global de personal de la entidad existen actualmente un total de ${totalEmpleos} (${numeroALetras(totalEmpleos)}) empleos con dicha denominación, código y grado.`;

      let literalF_texto = '';
      if (totalVacDefinitivas === 0) {
        literalF_texto = `Cero (0) vacantes definitivas. La totalidad de los ${totalEmpleos} empleos equivalentes se encuentran provistos formalmente en la planta de personal.`;
      } else {
        literalF_texto = `Se identifican actualmente ${totalVacDefinitivas} (${numeroALetras(totalVacDefinitivas)}) ${totalVacDefinitivas === 1 ? 'vacante definitiva' : 'vacantes definitivas'} en la planta de personal.`;
      }

      let literalG_texto = '';
      if (totalVacDefinitivas === 0) {
        literalG_texto = `No aplica a la fecha de expedición de la presente respuesta, habida cuenta de que no existen vacantes definitivas para el empleo consultado.`;
      } else {
        literalG_texto = fechasVacancia.map(f => {
          const fStr = f.fecha_vacancia ? new Date(f.fecha_vacancia).toLocaleDateString('es-CO') : 'Fecha en proceso de verificación en hoja de vida / archivo';
          return `• Plaza No. ${f.id_plaza} (${f.dependencia}): Vacancia producida el ${fStr} (Acto/Novedad: ${f.acto}).`;
        }).join('\n');
      }

      const literalH_desglose = plazas.map(p => {
        let situacionDesc = p.tipo_vinculacion || p.situacion_administrativa || 'Provisto';
        if (p.estado_cargo === 'VACANTE DEFINITIVA') {
          situacionDesc = 'VACANCIA DEFINITIVA';
        } else if (p.es_encargo || (p.encargo_nombre && p.encargo_nombre.trim())) {
          situacionDesc = `Encargo transitorio (Titular plaza: ${p.titular_nombre || 'N/A'}, Encargado: ${p.encargo_nombre})`;
        } else if (p.tipo_vinculacion?.includes('PERIODO DE PRUEBA')) {
          situacionDesc = `Nombramiento en Período de Prueba (Concurso de Méritos CNSC)`;
        } else if (p.tipo_vinculacion?.includes('CARRERA') || p.situacion_administrativa?.includes('PROPIEDAD')) {
          situacionDesc = `Titular con Derechos de Carrera Administrativa (En Propiedad)`;
        } else if (p.tipo_vinculacion?.includes('PROVISIONAL')) {
          situacionDesc = `Nombramiento Provisional`;
        }
        return `• Plaza No. ${p.id_plaza} - Dependencia: ${p.dependencia_cargo} | Titular/Ocupante: ${p.titular_nombre || 'Vacante'} | Situación: ${situacionDesc}`;
      }).join('\n');

      let literalI_texto = '';
      if (plazasReportadasSIMO.length === 0) {
        literalI_texto = `Ninguna de las plazas consultadas registra reporte activo directo en SIMO bajo la OPEC consultada, encontrándose provistas o con titular de carrera.`;
      } else {
        const reportesDetalle = plazasReportadasSIMO.map(p => {
          const fRep = p.fecha_reporte_simo ? new Date(p.fecha_reporte_simo).toLocaleDateString('es-CO') : 'Reporte consolidado en oferta pública';
          const conv = p.proceso_seleccion_simo || 'Proceso de Selección Distrito Capital';
          return `• Plaza No. ${p.id_plaza}: Reportada en SIMO con OPEC No. ${p.opec} (${conv}). Fecha/Estado reporte: ${fRep}.`;
        }).join('\n');
        const noReportadas = plazas.filter(p => !p.opec);
        let extraNoRep = '';
        if (noReportadas.length > 0) {
          extraNoRep = `\nLas restantes ${noReportadas.length} plaza(s) no fueron ofertadas en dicha OPEC por encontrarse provistas mediante nombramiento en propiedad con derechos de carrera o en trámite de provisión reglamentaria.`;
        }
        literalI_texto = reportesDetalle + extraNoRep;
      }

      // Borrador de oficio institucional formal
      const fechaHoy = new Date().toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const oficioBorrador = `Bogotá D.C., ${fechaHoy}

Señor(a):
${peticionario}
Ciudad

Asunto: Respuesta a Derecho de Petición - Información sobre empleo OPEC No. ${opecQuery || 'S/N'} y empleos iguales o equivalentes en la Planta de Personal
Radicado: ${radicado}

Respetado(a) Señor(a):

En atención a su derecho de petición formulado ante esta entidad, mediante el cual solicita información detallada sobre los empleos iguales o equivalentes al identificado con la OPEC No. ${opecQuery || '[OPEC]'}, nos permitimos dar respuesta formal, de conformidad con lo preceptuado en el artículo 23 de la Constitución Política, la Ley 1755 de 2015, la Ley 909 de 2004, el Decreto 1083 de 2015 y los Acuerdos de la Comisión Nacional del Servicio Civil (CNSC), en los siguientes términos:

1. IDENTIFICACIÓN DEL EMPLEO BASE Y EQUIVALENCIAS:
En la planta global de personal de la Secretaría Jurídica Distrital, el empleo base consultado corresponde a:
- Denominación: ${literalA}
- Código: ${literalB}
- Grado: ${literalC}
- Nivel Jerárquico: ${nivelReferencia || 'PROFESIONAL'}

De conformidad con el manual de funciones y competencias laborales vigente y las normas de carrera administrativa, los empleos iguales o equivalentes corresponden a aquellos que ostentan la misma denominación, código y grado.

2. RESPUESTA PUNTUAL A LOS INTERROGANTES FORMULADOS:

a. Denominación:
${literalA}

b. Código:
${literalB}

c. Grado:
${literalC}

d. Dependencia(s):
Los empleos iguales o equivalentes se encuentran asignados en las siguientes dependencias de la entidad:
${literalD_texto}

e. Número de empleos existentes:
${literalE_texto}

f. Número de vacantes definitivas:
${literalF_texto}

g. Fecha en que se produjo, si aplica, la vacancia definitiva:
${literalG_texto}

h. Situación administrativa actual de cada empleo:
${literalH_desglose}

i. Si la vacante fue reportada en SIMO y fecha del reporte:
${literalI_texto}

Se anexa a la presente comunicación la matriz técnica en la cual se detalla la situación jurídica y administrativa de cada una de las plazas identificadas.

Cordialmente,

DIRECCIÓN DE GESTIÓN CORPORATIVA
Subdirección de Talento Humano
Secretaría Jurídica Distrital
`;

      res.json({
        success: true,
        encontrado: true,
        opec_buscada: opecQuery,
        opec_encontrada_en_planta: opecEncontradaEnPlanta,
        identificacion: {
          cargo: cargoReferencia,
          codigo: codigoReferencia,
          grado: gradoReferencia,
          nivel: nivelReferencia,
        },
        conteo: {
          total_empleos: totalEmpleos,
          vacantes_definitivas: totalVacDefinitivas,
          vacantes_temporales: totalVacTemporales,
          carrera: conteoCarrera,
          periodo_prueba: conteoPeriodoPrueba,
          encargo: conteoEncargo,
          provisional: conteoProvisional,
          libre_nombramiento: conteoLibreNombramiento,
        },
        literales: {
          a_denominacion: literalA,
          b_codigo: literalB,
          c_grado: literalC,
          d_dependencias: literalD_texto,
          d_dependencias_array: desgloseDependencias,
          e_numero_empleos: literalE_texto,
          f_vacantes_definitivas: literalF_texto,
          g_fecha_vacancia: literalG_texto,
          h_situacion_administrativa: literalH_desglose,
          i_reporte_simo: literalI_texto,
        },
        oficio_borrador: oficioBorrador,
        plazas: plazas.map(p => ({
          id_plaza: p.id_plaza,
          id_sideap: p.id_sideap,
          cargo: p.cargo,
          codigo: p.codigo,
          grado: p.grado,
          nivel: p.nivel,
          dependencia_cargo: p.dependencia_cargo,
          dependencia_funcional: p.dependencia_funcional,
          estado_cargo: p.estado_cargo,
          titular_cedula: p.titular_cedula,
          titular_nombre: p.titular_nombre,
          tipo_vinculacion: p.tipo_vinculacion,
          situacion_administrativa: p.situacion_administrativa,
          es_encargo: p.es_encargo,
          encargo_nombre: p.encargo_nombre,
          encargo_cedula: p.encargo_cedula,
          opec: p.opec,
          fecha_vacancia: p.fecha_vacancia,
          fecha_reporte_simo: p.fecha_reporte_simo,
          proceso_seleccion_simo: p.proceso_seleccion_simo,
          notas_peticion: p.notas_peticion,
        })),
      });
    } catch (error) {
      console.error('Error al consultar empleos para peticiones OPEC:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2.C Actualizar datos complementarios de una plaza para peticiones / reporte SIMO
  router.put('/peticiones-opec/plaza/:id_plaza', async (req, res) => {
    try {
      await ensureTables();
      const idPlaza = parseInt(req.params.id_plaza, 10);
      if (isNaN(idPlaza)) {
        return res.status(400).json({ success: false, error: 'ID de plaza inválido' });
      }

      const {
        fecha_vacancia,
        fecha_reporte_simo,
        proceso_seleccion_simo,
        opec,
        notas_peticion,
      } = req.body;

      const result = await pool.query(
        `UPDATE public.planta_personal_sjd 
         SET 
           fecha_vacancia = COALESCE($1, fecha_vacancia),
           fecha_reporte_simo = COALESCE($2, fecha_reporte_simo),
           proceso_seleccion_simo = COALESCE($3, proceso_seleccion_simo),
           opec = COALESCE($4, opec),
           notas_peticion = COALESCE($5, notas_peticion),
           updated_at = NOW()
         WHERE id_plaza = $6
         RETURNING id_plaza, cargo, codigo, grado, opec, fecha_vacancia, fecha_reporte_simo, proceso_seleccion_simo, notas_peticion`,
        [
          fecha_vacancia || null,
          fecha_reporte_simo || null,
          proceso_seleccion_simo || null,
          opec || null,
          notas_peticion || null,
          idPlaza,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Plaza no encontrada' });
      }

      res.json({
        success: true,
        mensaje: 'Plaza actualizada exitosamente con información de vacancia / reporte SIMO',
        plaza: result.rows[0],
      });
    } catch (error) {
      console.error('Error al actualizar datos de plaza para peticiones:', error);
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
        LEFT JOIN LATERAL (
          SELECT * FROM public.planta_personal_sjd pl
          WHERE pl.encargo_cedula = per.cedula 
             OR pl.titular_cedula = per.cedula 
             OR (per.posicion_planta IS NOT NULL AND pl.id_perno = per.posicion_planta)
          ORDER BY 
            CASE 
              WHEN pl.encargo_cedula = per.cedula THEN 1
              WHEN pl.titular_cedula = per.cedula THEN 2
              ELSE 3
            END,
            pl.id_plaza ASC
          LIMIT 1
        ) pl ON true
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

  // 3. Procesar Carga Unificada: Libro Completo de Nómina (Extrae PLANTA SJD y PLANTA PERNO)
  router.post('/upload-completo', upload.single('archivo'), async (req, res) => {
    try {
      await ensureTables();
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se envió ningún archivo para procesar.' });
      }

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
          error: 'No se pudo leer el archivo Excel. Asegúrate de que no esté dañado ni protegido con contraseña.'
        });
      }

      const sheetPlanta = excelHelper.obtenerHojaPlanta(workbook);
      const sheetPerno = excelHelper.obtenerHojaPerno(workbook);

      if (!sheetPlanta && !sheetPerno) {
        return res.status(400).json({
          success: false,
          error: 'El archivo Excel no contiene la hoja PLANTA SJD ni la hoja PLANTA PERNO.'
        });
      }

      let resPlanta = null;
      let resPerno = null;

      if (sheetPlanta) {
        resPlanta = await excelHelper.procesarExtraccionPlanta(sheetPlanta, workbook, pool);
      }

      if (sheetPerno) {
        resPerno = await excelHelper.procesarExtraccionPerno(sheetPerno, pool);
      }

      await pool.query(`
        INSERT INTO public.nomina_import_logs (tipo_archivo, nombre_archivo, registros_procesados, registros_actualizados, detalles)
        VALUES ('LIBRO_COMPLETO', $1, $2, $3, $4)
      `, [
        nombreOrig,
        (resPlanta?.procesados || 0) + (resPerno?.procesados || 0),
        (resPlanta?.actualizados || 0) + (resPerno?.actualizados || 0),
        JSON.stringify({ planta: resPlanta, perno: resPerno })
      ]);

      const msgs = [];
      if (resPlanta) {
        msgs.push(`Planta Oficial (${resPlanta.sheetName}, Fila ${resPlanta.rowHeader}): ${resPlanta.actualizados} plazas sincronizadas`);
      }
      if (resPerno) {
        msgs.push(`Planta Perno (${resPerno.sheetName}, Fila ${resPerno.rowHeader}): ${resPerno.procesados} registros procesados, ${resPerno.actualizados} funcionarios vinculados`);
      }

      const advertenciasTotal = [
        ...(resPlanta?.advertencias || []),
        ...(resPerno?.advertencias || [])
      ];

      res.json({
        success: true,
        mensaje: `Libro de Nómina procesado con éxito. ${msgs.join('. ')}.`,
        planta: resPlanta,
        perno: resPerno,
        registros_procesados: (resPlanta?.procesados || 0) + (resPerno?.procesados || 0),
        registros_actualizados: (resPlanta?.actualizados || 0) + (resPerno?.actualizados || 0),
        advertencias: advertenciasTotal.slice(0, 10),
        total_advertencias: advertenciasTotal.length
      });
    } catch (error) {
      console.error('Error procesando libro completo de nómina:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. Procesar Carga de Archivo 1: Planta de Personal (con detección de libro completo)
  router.post('/upload-planta', upload.single('archivo'), async (req, res) => {
    try {
      await ensureTables();
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se envió ningún archivo para procesar.' });
      }

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

      const sheetPlanta = excelHelper.obtenerHojaPlanta(workbook);
      const sheetPerno = excelHelper.obtenerHojaPerno(workbook);

      if (!sheetPlanta) {
        return res.status(400).json({
          success: false,
          error: 'No se encontró la hoja PLANTA SJD en el archivo subido.'
        });
      }

      const resPlanta = await excelHelper.procesarExtraccionPlanta(sheetPlanta, workbook, pool);
      let resPerno = null;

      if (sheetPerno) {
        resPerno = await excelHelper.procesarExtraccionPerno(sheetPerno, pool);
      }

      await pool.query(`
        INSERT INTO public.nomina_import_logs (tipo_archivo, nombre_archivo, registros_procesados, registros_actualizados, detalles)
        VALUES ('PLANTA', $1, $2, $3, $4)
      `, [
        nombreOrig,
        resPlanta.procesados + (resPerno?.procesados || 0),
        resPlanta.actualizados + (resPerno?.actualizados || 0),
        JSON.stringify({ planta: resPlanta, perno: resPerno })
      ]);

      let mensajeExito = `Archivo de Planta procesado exitosamente (${resPlanta.sheetName}, Fila ${resPlanta.rowHeader}): ${resPlanta.actualizados} plazas sincronizadas.`;
      if (resPerno) {
        mensajeExito += ` Además, se detectó y sincronizó automáticamente la hoja ${resPerno.sheetName} (Fila ${resPerno.rowHeader}) con ${resPerno.procesados} registros de nómina.`;
      }

      const advertenciasTotal = [
        ...resPlanta.advertencias,
        ...(resPerno?.advertencias || [])
      ];

      res.json({
        success: true,
        mensaje: mensajeExito,
        planta: resPlanta,
        perno: resPerno,
        registros_procesados: resPlanta.procesados + (resPerno?.procesados || 0),
        registros_actualizados: resPlanta.actualizados + (resPerno?.actualizados || 0),
        filas_omitidas: resPlanta.filasOmitidas,
        advertencias: advertenciasTotal.slice(0, 10),
        total_advertencias: advertenciasTotal.length
      });
    } catch (error) {
      console.error('Error procesando archivo de planta:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Procesar Carga de Archivo 2: Planta Perno (con detección de libro completo)
  router.post('/upload-perno', upload.single('archivo'), async (req, res) => {
    try {
      await ensureTables();
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se envió ningún archivo para procesar.' });
      }

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

      const sheetPlanta = excelHelper.obtenerHojaPlanta(workbook);
      const sheetPerno = excelHelper.obtenerHojaPerno(workbook);

      if (!sheetPerno) {
        return res.status(400).json({
          success: false,
          error: 'No se encontró la hoja PLANTA PERNO en el archivo subido.'
        });
      }

      let resPlanta = null;
      if (sheetPlanta) {
        resPlanta = await excelHelper.procesarExtraccionPlanta(sheetPlanta, workbook, pool);
      }

      const resPerno = await excelHelper.procesarExtraccionPerno(sheetPerno, pool);

      await pool.query(`
        INSERT INTO public.nomina_import_logs (tipo_archivo, nombre_archivo, registros_procesados, registros_actualizados, detalles)
        VALUES ('PERNO', $1, $2, $3, $4)
      `, [
        nombreOrig,
        resPerno.procesados + (resPlanta?.procesados || 0),
        resPerno.actualizados + (resPlanta?.actualizados || 0),
        JSON.stringify({ planta: resPlanta, perno: resPerno })
      ]);

      let mensajeExito = `Archivo Planta Perno procesado exitosamente (${resPerno.sheetName}, Fila ${resPerno.rowHeader}): ${resPerno.actualizados} funcionarios vinculados y ${resPerno.procesados} registros en histórico.`;
      if (resPlanta) {
        mensajeExito += ` Además, se sincronizaron ${resPlanta.actualizados} plazas desde la hoja ${resPlanta.sheetName} (Fila ${resPlanta.rowHeader}).`;
      }

      res.json({
        success: true,
        mensaje: mensajeExito,
        planta: resPlanta,
        perno: resPerno,
        registros_procesados: resPerno.procesados + (resPlanta?.procesados || 0),
        registros_actualizados: resPerno.actualizados + (resPlanta?.actualizados || 0),
        registros_retirados_o_sin_plaza: resPerno.retiradosOSinPlaza,
        advertencias: resPerno.advertencias.slice(0, 10),
        total_advertencias: resPerno.advertencias.length
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

          // Columna 4 y 5: Ocupante actual
          const ocupanteCedula = cleanDoc(getVal(row.getCell(4)));
          const ocupanteNombre = cleanText(getVal(row.getCell(5)));

          // Columna 6 y 7: Vinculación
          const vincEntidad = cleanText(getVal(row.getCell(6)));
          const tipoVinculacion = cleanText(getVal(row.getCell(7))) || vincEntidad;

          // Columna 12 y 13: Situaciones administrativas
          const situacionAdmin = cleanText(getVal(row.getCell(12)));
          const situacionTitular = cleanText(getVal(row.getCell(13)));

          // Columna 14 y 15: Titular propio de la plaza (o VACANTE DEFINITIVA)
          const rawTitularCedula = cleanDoc(getVal(row.getCell(14)));
          const rawTitularNombre = cleanText(getVal(row.getCell(15)));

          // Columna 16 y 17: Escalera de Encargos
          const idE = cleanText(getVal(row.getCell(16))) || null;
          const n = parseInt(getVal(row.getCell(17)), 10) || null;
          const idEscalera = idE ? idE.toUpperCase() : null;
          const peldanoEscalera = n;

          // Columna 22: OPEC
          const opec = cleanText(getVal(row.getCell(22))) || null;

          // Columna 23: Estado del cargo
          let estadoCargo = cleanText(getVal(row.getCell(23))).toUpperCase();
          if (!estadoCargo || estadoCargo.includes('IF(') || estadoCargo.includes('[OBJECT')) {
            if (rawTitularNombre === 'VACANTE DEFINITIVA' || situacionTitular === 'VACANTE DEFINITIVA') {
              estadoCargo = 'VACANTE DEFINITIVA';
            } else if (ocupanteNombre === 'VACANTE TEMPORAL' || situacionAdmin === 'VACANTE TEMPORAL' || tipoVinculacion === 'VACANTE TEMPORAL') {
              estadoCargo = 'VACANTE TEMPORAL';
            } else if (ocupanteNombre) {
              estadoCargo = 'OCUPADO';
            } else {
              estadoCargo = 'VACANTE DEFINITIVA';
            }
          }

          // Columna 24 a 27: Estructura del cargo
          const nivel = cleanText(getVal(row.getCell(24))).toUpperCase();
          const cargoNom = cleanText(getVal(row.getCell(25))).toUpperCase();
          const codigo = cleanText(getVal(row.getCell(26)));
          const grado = cleanText(getVal(row.getCell(27)));

          // Columna 29 y 30: Dependencias
          const depCargo = cleanDependencia(getVal(row.getCell(29)));
          const depFuncional = cleanDependencia(getVal(row.getCell(30))) || depCargo;

          // Columna 10 y 11: Sexo y edad de la planta oficial
          const sexoPlanta = cleanText(getVal(row.getCell(10)));
          const edadPlanta = parseInt(getVal(row.getCell(11)), 10) || null;

          // Columna 31: Propósito
          const proposito = cleanText(getVal(row.getCell(31)));

          // Columna 32: Funciones
          const funcionesRaw = String(getVal(row.getCell(32)) || '');

          // Columna 33: Requisitos
          const requisitos = cleanText(getVal(row.getCell(33)));

          // Columna 34: Páginas Manual de Funciones / Resolución del Archivo de Planta Oficial
          const manualFuncionesRaw = cleanText(getVal(row.getCell(34))) || null;

          // Columna 35: Asignación básica
          const asignacion = cleanMoney(getVal(row.getCell(35)));

          // Determinar Titular
          let titularCedula = rawTitularCedula;
          let titularNombre = rawTitularNombre;
          if (!titularNombre || titularNombre === 'VACANTE DEFINITIVA' || situacionTitular === 'VACANTE DEFINITIVA') {
            titularNombre = 'VACANTE DEFINITIVA';
            titularCedula = null;
          } else if (!titularNombre && ocupanteNombre && ocupanteNombre !== 'VACANTE TEMPORAL') {
            titularNombre = ocupanteNombre;
            titularCedula = ocupanteCedula;
          }

          // Encargo / Ocupante de la Plaza
          const esEncargo = Boolean(
            idEscalera ||
            tipoVinculacion.toUpperCase().includes('ENCARGO') ||
            situacionAdmin.toUpperCase().includes('ENCARGO') ||
            situacionTitular.toUpperCase().includes('ENCARGO') ||
            (ocupanteCedula && titularCedula && ocupanteCedula !== titularCedula) ||
            (ocupanteNombre === 'VACANTE TEMPORAL')
          );

          let encargoCedula = null;
          let encargoNombre = null;
          if (esEncargo) {
            if (ocupanteNombre === 'VACANTE TEMPORAL') {
              encargoCedula = null;
              encargoNombre = 'VACANTE TEMPORAL';
            } else if (ocupanteNombre && ocupanteNombre !== 'VACANTE DEFINITIVA') {
              encargoCedula = ocupanteCedula;
              encargoNombre = ocupanteNombre;
            }
          }

          await pool.query(`
            INSERT INTO public.planta_personal_sjd (
              id_plaza, id_sideap, id_perno, nivel, cargo, codigo, grado,
              dependencia_cargo, dependencia_funcional, proposito, funciones,
              requisitos, asignacion_basica, estado_cargo, titular_cedula,
              titular_nombre, tipo_vinculacion, situacion_administrativa,
              situacion_titular, encargo_cedula, encargo_nombre, es_encargo,
              opec, id_escalera, peldano_escalera, manual_funciones, resolucion_manual, edad, sexo, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
              $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW()
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
              manual_funciones = EXCLUDED.manual_funciones,
              resolucion_manual = EXCLUDED.resolucion_manual,
              edad = COALESCE(EXCLUDED.edad, public.planta_personal_sjd.edad),
              sexo = COALESCE(EXCLUDED.sexo, public.planta_personal_sjd.sexo),
              updated_at = NOW();
          `, [
            idPlaza, parseInt(getVal(row.getCell(2)), 10) || null, parseInt(getVal(row.getCell(3)), 10) || null,
            nivel, cargoNom, codigo, grado, depCargo, depFuncional, proposito,
            JSON.stringify(parseFunctions(funcionesRaw)), requisitos, asignacion,
            estadoCargo, titularCedula, titularNombre, tipoVinculacion, situacionAdmin,
            situacionTitular || (titularNombre === 'VACANTE DEFINITIVA' ? 'VACANTE DEFINITIVA' : 'EN PROPIEDAD'),
            encargoCedula, encargoNombre, esEncargo,
            opec, idEscalera, peldanoEscalera,
            manualFuncionesRaw, manualFuncionesRaw, edadPlanta, sexoPlanta
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

          const fechaNac = cleanDate(getVal(row.getCell(6)));
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
              fecha_nacimiento = COALESCE($13, fecha_nacimiento),
              updated_at = NOW()
            WHERE titular_cedula = $12 OR encargo_cedula = $12
          `, [tipoFunc, dir, tel, sexo, eps, pension, cesantias, tipoNomb, actoNomb, numActo, totalDevengado, cedula, fechaNac]);

          if (u.rowCount > 0) countPerno += u.rowCount;
        }
      }

      // Asegurar que las plazas reflejen únicamente a los funcionarios activos y no a retirados
      await pool.query(`
        UPDATE public.planta_personal_sjd pl
        SET 
          titular_cedula = act.cedula,
          titular_nombre = act.nombre_completo,
          tipo_funcionario = COALESCE(act.tipo_funcionario, pl.tipo_funcionario),
          direccion = COALESCE(act.direccion, pl.direccion),
          telefono = COALESCE(act.telefono, pl.telefono),
          sexo = COALESCE(act.sexo, pl.sexo),
          fondo_salud = COALESCE(act.fondo_salud, pl.fondo_salud),
          fondo_pension = COALESCE(act.fondo_pension, pl.fondo_pension),
          fondo_cesantias = COALESCE(act.fondo_cesantias, pl.fondo_cesantias),
          tipo_nombramiento = COALESCE(act.tipo_nombramiento, pl.tipo_nombramiento),
          acto_nombramiento = COALESCE(act.acto_nombramiento, pl.acto_nombramiento),
          numero_acto_nombramiento = COALESCE(act.numero_acto_nombramiento, pl.numero_acto_nombramiento),
          estado_cargo = 'OCUPADO',
          situacion_titular = COALESCE(pl.situacion_titular, 'EN PROPIEDAD'),
          updated_at = NOW()
        FROM public.personal_perno_sjd act
        WHERE pl.id_perno = act.posicion_planta
          AND act.estado_funcionario = 'A'
          AND act.fecha_retiro IS NULL
          AND (
            pl.titular_cedula IN (
              SELECT cedula FROM public.personal_perno_sjd WHERE estado_funcionario = 'R' OR fecha_retiro IS NOT NULL
            )
            OR pl.titular_cedula IS NULL
            OR pl.titular_cedula != act.cedula
          );

        UPDATE public.planta_personal_sjd pl
        SET 
          titular_cedula = NULL,
          titular_nombre = 'VACANTE DEFINITIVA',
          estado_cargo = 'VACANTE DEFINITIVA',
          situacion_titular = 'VACANTE DEFINITIVA',
          updated_at = NOW()
        WHERE pl.titular_cedula IN (
          SELECT cedula FROM public.personal_perno_sjd WHERE estado_funcionario = 'R' OR fecha_retiro IS NOT NULL
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.personal_perno_sjd act 
          WHERE act.posicion_planta = pl.id_perno AND act.estado_funcionario = 'A' AND act.fecha_retiro IS NULL
        );
      `);

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
