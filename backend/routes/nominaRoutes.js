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
      if ('result' in v) return v.result;
      if ('text' in v) return v.text;
    }
    return v;
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

  // Asegurar tabla creada
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
            tipo_vinculacion TEXT,
            situacion_administrativa TEXT,
            encargo_cedula TEXT,
            encargo_nombre TEXT,
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
      `);
    } catch (e) {
      console.warn('Advertencia al verificar tablas de nómina:', e.message);
    }
  }

  // 1. Obtener listado de plazas y cargos
  router.get('/plazas', async (req, res) => {
    try {
      await ensureTables();
      const { busqueda, nivel, estado, dependencia } = req.query;

      let query = 'SELECT * FROM public.planta_personal_sjd WHERE 1=1';
      const params = [];

      if (busqueda && busqueda.trim()) {
        params.push(`%${busqueda.trim()}%`);
        const idx = params.length;
        query += ` AND (
          cargo ILIKE $${idx} OR 
          titular_nombre ILIKE $${idx} OR 
          titular_cedula ILIKE $${idx} OR 
          dependencia_cargo ILIKE $${idx} OR 
          codigo ILIKE $${idx}
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

  // 3. Procesar Carga de Archivo 1: Planta de Personal (Imagen 1)
  router.post('/upload-planta', upload.single('archivo'), async (req, res) => {
    try {
      await ensureTables();
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se envió ningún archivo.' });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      let sheet = workbook.getWorksheet('PLANTA SJD (2)') || 
                  workbook.getWorksheet('PLANTA SJD') || 
                  workbook.worksheets[0];

      if (!sheet) {
        return res.status(400).json({ success: false, error: 'La hoja de cálculo está vacía.' });
      }

      let rowHeader = 4;
      // Buscar la fila de encabezados si no es 4
      for (let r = 1; r <= 10; r++) {
        const text = String(sheet.getRow(r).getCell(4).value || '') + String(sheet.getRow(r).getCell(5).value || '');
        if (text.includes('CEDULA') || text.includes('APELLIDOS') || text.includes('NOMENCLATURA')) {
          rowHeader = r;
          break;
        }
      }

      let procesados = 0;
      let actualizados = 0;

      for (let r = rowHeader + 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const idPlaza = parseInt(getVal(row.getCell(1)), 10);
        if (!idPlaza) continue;

        const idSideap = parseInt(getVal(row.getCell(2)), 10) || null;
        const idPerno = parseInt(getVal(row.getCell(3)), 10) || null;
        const titularCedula = String(getVal(row.getCell(4)) || '').trim();
        const titularNombre = String(getVal(row.getCell(5)) || '').trim();
        const tipoVinculacion = String(getVal(row.getCell(6)) || '').trim();
        const situacionAdmin = String(getVal(row.getCell(13)) || getVal(row.getCell(14)) || '').trim();
        
        let estadoCargo = String(getVal(row.getCell(25)) || '').trim().toUpperCase();
        if (!estadoCargo) {
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

        const funcionesArr = parseFunctions(funcionesRaw);

        await pool.query(`
          INSERT INTO public.planta_personal_sjd (
            id_plaza, id_sideap, id_perno, nivel, cargo, codigo, grado,
            dependencia_cargo, dependencia_funcional, proposito, funciones,
            requisitos, asignacion_basica, estado_cargo, titular_cedula,
            titular_nombre, tipo_vinculacion, situacion_administrativa, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
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
            tipo_vinculacion = EXCLUDED.tipo_vinculacion,
            situacion_administrativa = EXCLUDED.situacion_administrativa,
            updated_at = NOW();
        `, [
          idPlaza, idSideap, idPerno, nivel, cargoNom, codigo, grado,
          depCargo, depFuncional, proposito, JSON.stringify(funcionesArr),
          requisitos, asignacion, estadoCargo, titularCedula,
          titularNombre, tipoVinculacion, situacionAdmin
        ]);

        procesados++;
        actualizados++;
      }

      await pool.query(`
        INSERT INTO public.nomina_import_logs (tipo_archivo, nombre_archivo, registros_procesados, registros_actualizados)
        VALUES ('PLANTA', $1, $2, $3)
      `, [req.file.originalname, procesados, actualizados]);

      res.json({
        success: true,
        mensaje: `Archivo de Planta procesado exitosamente. Se sincronizaron ${actualizados} plazas.`,
        registros_procesados: procesados,
        registros_actualizados: actualizados,
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
        return res.status(400).json({ success: false, error: 'No se envió ningún archivo.' });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      let sheet = workbook.getWorksheet('PLANTA PERNO') || 
                  workbook.worksheets[0];

      if (!sheet) {
        return res.status(400).json({ success: false, error: 'La hoja de cálculo está vacía.' });
      }

      let rowHeader = 9;
      // Buscar la fila de encabezados si no es 9
      for (let r = 1; r <= 15; r++) {
        const text = String(sheet.getRow(r).getCell(1).value || '') + String(sheet.getRow(r).getCell(2).value || '');
        if (text.includes('NUMERO_IDENTIFICACION') || text.includes('PRIMER_APELLIDO')) {
          rowHeader = r;
          break;
        }
      }

      let procesados = 0;
      let actualizados = 0;

      for (let r = rowHeader + 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const cedula = String(getVal(row.getCell(1)) || '').trim();
        if (!cedula) continue;

        const ape1 = String(getVal(row.getCell(2)) || '').trim();
        const ape2 = String(getVal(row.getCell(3)) || '').trim();
        const nombres = String(getVal(row.getCell(4)) || '').trim();
        const nombreCompleto = `${nombres} ${ape1} ${ape2}`.trim();

        const direccion = String(getVal(row.getCell(7)) || '').trim();
        const telefono = String(getVal(row.getCell(8)) || '').trim();
        const sexo = String(getVal(row.getCell(9)) || '').trim();
        const tipoFuncionario = String(getVal(row.getCell(15)) || '').trim();
        const ingresoEntidad = getVal(row.getCell(16));
        const fondoSalud = String(getVal(row.getCell(20)) || '').trim();
        const fondoPension = String(getVal(row.getCell(22)) || '').trim();
        const fondoCesantias = String(getVal(row.getCell(24)) || '').trim();
        const tipoNomb = String(getVal(row.getCell(34)) || '').trim();
        const actoNomb = String(getVal(row.getCell(35)) || '').trim();
        const numActo = String(getVal(row.getCell(37)) || '').trim();
        const totalDevengado = parseFloat(getVal(row.getCell(43))) || null;

        // Actualizar la persona en la plaza de la entidad vinculando por cédula
        const updateRes = await pool.query(`
          UPDATE public.planta_personal_sjd SET
            tipo_funcionario = $1,
            direccion = $2,
            telefono = $3,
            sexo = $4,
            fondo_salud = $5,
            fondo_pension = $6,
            fondo_cesantias = $7,
            tipo_nombramiento = $8,
            acto_nombramiento = $9,
            numero_acto_nombramiento = $10,
            total_devengado = COALESCE($11, total_devengado),
            updated_at = NOW()
          WHERE titular_cedula = $12 OR titular_cedula = $13
        `, [
          tipoFuncionario, direccion, telefono, sexo, fondoSalud, fondoPension,
          fondoCesantias, tipoNomb, actoNomb, numActo, totalDevengado,
          cedula, String(parseInt(cedula, 10) || '')
        ]);

        procesados++;
        if (updateRes.rowCount > 0) {
          actualizados += updateRes.rowCount;
        }
      }

      await pool.query(`
        INSERT INTO public.nomina_import_logs (tipo_archivo, nombre_archivo, registros_procesados, registros_actualizados)
        VALUES ('PLANTA_PERNO', $1, $2, $3)
      `, [req.file.originalname, procesados, actualizados]);

      res.json({
        success: true,
        mensaje: `Archivo de Planta Perno procesado exitosamente. Se enriquecieron datos de ${actualizados} funcionarios en sus cargos.`,
        registros_procesados: procesados,
        registros_actualizados: actualizados,
      });
    } catch (error) {
      console.error('Error procesando archivo de planta perno:', error);
      res.status(500).json({ success: false, error: error.message });
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

          await pool.query(`
            INSERT INTO public.planta_personal_sjd (
              id_plaza, id_sideap, id_perno, nivel, cargo, codigo, grado,
              dependencia_cargo, dependencia_funcional, proposito, funciones,
              requisitos, asignacion_basica, estado_cargo, titular_cedula,
              titular_nombre, tipo_vinculacion, situacion_administrativa, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
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
              updated_at = NOW();
          `, [
            idPlaza, parseInt(getVal(row.getCell(2)), 10) || null, parseInt(getVal(row.getCell(3)), 10) || null,
            nivel, cargoNom, codigo, grado, depCargo, depFuncional, proposito,
            JSON.stringify(parseFunctions(funcionesRaw)), requisitos, asignacion,
            estadoCargo, titularCedula, titularNombre, tipoVinculacion, situacionAdmin
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

  return router;
};
