require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool();

async function sync() {
  await pool.query(`
    ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS id_escalera TEXT;
    ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS peldano_escalera INT;
    ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS opec TEXT;
    ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS pv TEXT;
    ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS pp_oe TEXT;
    ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS vt_lm TEXT;
    ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS vt_lnr TEXT;
    ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS manual_funciones TEXT;
    ALTER TABLE public.planta_personal_sjd ADD COLUMN IF NOT EXISTS resolucion_manual TEXT;
  `);

  const mockPath = path.resolve(__dirname, '../../frontend/lib/plantaMockData.json');
  const plazas = JSON.parse(fs.readFileSync(mockPath, 'utf8'));

  console.log('Sincronizando ' + plazas.length + ' plazas a la base de datos...');

  for (const p of plazas) {
    await pool.query(`
      INSERT INTO public.planta_personal_sjd (
        id_plaza, id_sideap, id_perno, nivel, cargo, codigo, grado,
        dependencia_cargo, dependencia_funcional, proposito, funciones,
        requisitos, asignacion_basica, estado_cargo,
        titular_cedula, titular_nombre, situacion_titular,
        tipo_vinculacion, situacion_administrativa,
        encargo_cedula, encargo_nombre, es_encargo,
        id_escalera, peldano_escalera, opec,
        tipo_funcionario, direccion, telefono, sexo,
        fondo_salud, fondo_pension, fondo_cesantias,
        tipo_nombramiento, acto_nombramiento, numero_acto_nombramiento,
        total_devengado, manual_funciones, resolucion_manual, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17,
        $18, $19,
        $20, $21, $22,
        $23, $24, $25,
        $26, $27, $28, $29,
        $30, $31, $32,
        $33, $34, $35,
        $36, $37, $38, NOW()
      )
      ON CONFLICT (id_plaza) DO UPDATE SET
        id_sideap = EXCLUDED.id_sideap,
        id_perno = EXCLUDED.id_perno,
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
        tipo_vinculacion = EXCLUDED.tipo_vinculacion,
        situacion_administrativa = EXCLUDED.situacion_administrativa,
        encargo_cedula = EXCLUDED.encargo_cedula,
        encargo_nombre = EXCLUDED.encargo_nombre,
        es_encargo = EXCLUDED.es_encargo,
        id_escalera = EXCLUDED.id_escalera,
        peldano_escalera = EXCLUDED.peldano_escalera,
        opec = EXCLUDED.opec,
        tipo_funcionario = COALESCE(EXCLUDED.tipo_funcionario, public.planta_personal_sjd.tipo_funcionario),
        direccion = COALESCE(EXCLUDED.direccion, public.planta_personal_sjd.direccion),
        telefono = COALESCE(EXCLUDED.telefono, public.planta_personal_sjd.telefono),
        sexo = COALESCE(EXCLUDED.sexo, public.planta_personal_sjd.sexo),
        fondo_salud = COALESCE(EXCLUDED.fondo_salud, public.planta_personal_sjd.fondo_salud),
        fondo_pension = COALESCE(EXCLUDED.fondo_pension, public.planta_personal_sjd.fondo_pension),
        fondo_cesantias = COALESCE(EXCLUDED.fondo_cesantias, public.planta_personal_sjd.fondo_cesantias),
        tipo_nombramiento = COALESCE(EXCLUDED.tipo_nombramiento, public.planta_personal_sjd.tipo_nombramiento),
        acto_nombramiento = COALESCE(EXCLUDED.acto_nombramiento, public.planta_personal_sjd.acto_nombramiento),
        numero_acto_nombramiento = COALESCE(EXCLUDED.numero_acto_nombramiento, public.planta_personal_sjd.numero_acto_nombramiento),
        total_devengado = COALESCE(EXCLUDED.total_devengado, public.planta_personal_sjd.total_devengado),
        manual_funciones = EXCLUDED.manual_funciones,
        resolucion_manual = EXCLUDED.resolucion_manual,
        updated_at = NOW();
    `, [
      p.id_plaza, p.id_sideap, p.id_perno, p.nivel, p.cargo, p.codigo, p.grado,
      p.dependencia_cargo, p.dependencia_funcional, p.proposito, JSON.stringify(p.funciones || []),
      p.requisitos, p.asignacion_basica || 0, p.estado_cargo || 'OCUPADO',
      p.titular_cedula, p.titular_nombre, p.situacion_titular,
      p.tipo_vinculacion, p.situacion_administrativa,
      p.encargo_cedula, p.encargo_nombre, p.es_encargo || false,
      p.id_escalera, p.peldano_escalera, p.opec,
      p.tipo_funcionario, p.direccion, p.telefono, p.sexo,
      p.fondo_salud, p.fondo_pension, p.fondo_cesantias,
      p.tipo_nombramiento, p.acto_nombramiento, p.numero_acto_nombramiento,
      p.total_devengado, p.manual_funciones || null, p.resolucion_manual || p.manual_funciones || null
    ]);
  }

  console.log('✅ Sincronización exitosa en base de datos.');

  const resE10 = await pool.query(`
    SELECT id_plaza, cargo, codigo, grado, titular_nombre, situacion_titular, encargo_nombre, id_escalera, peldano_escalera
    FROM public.planta_personal_sjd
    WHERE id_escalera = 'E10'
    ORDER BY peldano_escalera ASC
  `);
  console.log('✅ Escalera E10 en PostgreSQL:', resE10.rows);
}

sync().catch(console.error).finally(() => pool.end());
