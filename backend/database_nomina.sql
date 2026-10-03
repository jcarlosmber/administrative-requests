-- ====================================================================
-- Script de Base de Datos para el Módulo 4: Gestión de Planta y Nómina
-- Soporta carga masiva de Archivo 1 (Planta) y Archivo 2 (Planta Perno)
-- ====================================================================

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
    -- Datos complementarios de Nómina / Planta Perno
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

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE public.planta_personal_sjd
  ADD COLUMN IF NOT EXISTS estado_cargo TEXT DEFAULT 'OCUPADO',
  ADD COLUMN IF NOT EXISTS encargo_cedula TEXT,
  ADD COLUMN IF NOT EXISTS encargo_nombre TEXT,
  ADD COLUMN IF NOT EXISTS tipo_funcionario TEXT,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS telefono TEXT,
  ADD COLUMN IF NOT EXISTS sexo TEXT,
  ADD COLUMN IF NOT EXISTS fondo_salud TEXT,
  ADD COLUMN IF NOT EXISTS fondo_pension TEXT,
  ADD COLUMN IF NOT EXISTS fondo_cesantias TEXT,
  ADD COLUMN IF NOT EXISTS fecha_ingreso_entidad DATE,
  ADD COLUMN IF NOT EXISTS fecha_ingreso_distrito DATE,
  ADD COLUMN IF NOT EXISTS tipo_nombramiento TEXT,
  ADD COLUMN IF NOT EXISTS acto_nombramiento TEXT,
  ADD COLUMN IF NOT EXISTS numero_acto_nombramiento TEXT,
  ADD COLUMN IF NOT EXISTS fecha_acto_nombramiento DATE,
  ADD COLUMN IF NOT EXISTS total_devengado NUMERIC(14, 2);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_planta_cargo ON public.planta_personal_sjd(cargo);
CREATE INDEX IF NOT EXISTS idx_planta_nivel ON public.planta_personal_sjd(nivel);
CREATE INDEX IF NOT EXISTS idx_planta_titular_cedula ON public.planta_personal_sjd(titular_cedula);
CREATE INDEX IF NOT EXISTS idx_planta_estado ON public.planta_personal_sjd(estado_cargo);
CREATE INDEX IF NOT EXISTS idx_planta_dependencia ON public.planta_personal_sjd(dependencia_cargo);

-- Tabla de historial de sincronizaciones / cargas de archivos de nómina
CREATE TABLE IF NOT EXISTS public.nomina_import_logs (
    id SERIAL PRIMARY KEY,
    tipo_archivo TEXT NOT NULL, -- 'PLANTA' o 'PLANTA_PERNO'
    nombre_archivo TEXT NOT NULL,
    registros_procesados INT DEFAULT 0,
    registros_actualizados INT DEFAULT 0,
    detalles JSONB DEFAULT '{}'::jsonb,
    usuario_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
