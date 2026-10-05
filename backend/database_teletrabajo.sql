-- ==============================================================================
-- MÓDULO DE TELETRABAJO Y TRABAJO EN CASA (TALENTO HUMANO - SASGE 2.0)
-- ==============================================================================

-- 1. Tabla de Resoluciones Generales de Teletrabajo / Trabajo en Casa
CREATE TABLE IF NOT EXISTS public.teletrabajo_resoluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_resolucion TEXT NOT NULL,
    anio INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    fecha_expedicion DATE NOT NULL,
    fecha_inicio_vigencia DATE NOT NULL,
    fecha_fin_vigencia DATE NOT NULL,
    descripcion TEXT,
    modalidad_principal TEXT CHECK (modalidad_principal IN ('TELETRABAJO', 'TRABAJO_EN_CASA', 'MIXTA')) DEFAULT 'TELETRABAJO',
    archivo_pdf_url TEXT,
    nombre_archivo TEXT,
    estado TEXT CHECK (estado IN ('VIGENTE', 'DEROGADA', 'FINALIZADA')) DEFAULT 'VIGENTE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Configuración de Cargos Teletrabajables
CREATE TABLE IF NOT EXISTS public.teletrabajo_cargos_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargo_nombre TEXT NOT NULL,
    codigo TEXT,
    grado TEXT,
    dependencia TEXT,
    es_teletrabajable BOOLEAN DEFAULT TRUE,
    max_dias_semana INT DEFAULT 2 CHECK (max_dias_semana BETWEEN 1 AND 5),
    justificacion_estudio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_cargo_cod_grado UNIQUE (cargo_nombre, codigo, grado)
);

-- 3. Tabla Principal de Asignaciones de Teletrabajo / Trabajo en Casa por Servidor
CREATE TABLE IF NOT EXISTS public.teletrabajo_asignaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    servidor_cedula TEXT NOT NULL,
    servidor_nombre TEXT NOT NULL,
    id_plaza INT,
    cargo_actual TEXT NOT NULL,
    codigo_cargo TEXT,
    grado_cargo TEXT,
    dependencia TEXT,
    modalidad TEXT NOT NULL CHECK (modalidad IN ('TELETRABAJO', 'TRABAJO_EN_CASA', 'TELETRABAJO_AUTONOMO', 'AUTONOMO')),
    submodalidad TEXT DEFAULT 'SUPLEMENTARIO', -- SUPLEMENTARIO, AUTONOMO, MOVIL, EXCEPCIONAL
    resolucion_id UUID REFERENCES public.teletrabajo_resoluciones(id) ON DELETE SET NULL,
    numero_resolucion_display TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    cargo_es_teletrabajable BOOLEAN DEFAULT TRUE,
    excepcion_jefe_aprobada BOOLEAN DEFAULT FALSE,
    motivo_excepcion_jefe TEXT,
    esquema_dias_tipo TEXT NOT NULL CHECK (esquema_dias_tipo IN ('DIAS_FIJOS', 'DIAS_PARES', 'DIAS_IMPARES', 'CANTIDAD_LIBRE', 'TODOS')),
    dias_por_semana INT DEFAULT 2 CHECK (dias_por_semana BETWEEN 1 AND 5),
    dias_semana_fijos JSONB DEFAULT '[]'::jsonb, -- ej: ["LUNES", "MIERCOLES"]
    estado TEXT CHECK (estado IN ('ACTIVO', 'VENCIDO', 'SUSPENDIDO', 'REVOCADO')) DEFAULT 'ACTIVO',
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Acuerdos de Compromiso de Teletrabajo
CREATE TABLE IF NOT EXISTS public.teletrabajo_acuerdos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asignacion_id UUID REFERENCES public.teletrabajo_asignaciones(id) ON DELETE CASCADE,
    servidor_cedula TEXT NOT NULL,
    servidor_nombre TEXT NOT NULL,
    cargo_al_momento TEXT NOT NULL,
    fecha_suscripcion DATE NOT NULL DEFAULT CURRENT_DATE,
    periodo_vigencia TEXT,
    archivo_acuerdo_url TEXT,
    nombre_archivo TEXT,
    es_vigente BOOLEAN DEFAULT TRUE,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Seguimiento Periódico de Teletrabajo
CREATE TABLE IF NOT EXISTS public.teletrabajo_seguimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asignacion_id UUID REFERENCES public.teletrabajo_asignaciones(id) ON DELETE CASCADE,
    servidor_cedula TEXT NOT NULL,
    servidor_nombre TEXT NOT NULL,
    fecha_corte_desde DATE NOT NULL,
    fecha_corte_hasta DATE NOT NULL,
    evaluador_nombre TEXT,
    evaluador_cargo TEXT,
    cumplimiento_nivel TEXT CHECK (cumplimiento_nivel IN ('SOBRESALIENTE', 'SATISFACTORIO', 'PARCIAL', 'NO_CUMPLE')) DEFAULT 'SATISFACTORIO',
    calificacion_porcentaje NUMERIC(5, 2) DEFAULT 100.00,
    actividades_reportadas TEXT,
    soporte_evidencias_url TEXT,
    nombre_archivo_soporte TEXT,
    concepto_recomendacion TEXT CHECK (concepto_recomendacion IN ('CONTINUAR', 'AJUSTAR_DIAS', 'REVERSION_PRESENCIAL')) DEFAULT 'CONTINUAR',
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_teletrabajo_asignaciones_cedula ON public.teletrabajo_asignaciones(servidor_cedula);
CREATE INDEX IF NOT EXISTS idx_teletrabajo_asignaciones_modalidad ON public.teletrabajo_asignaciones(modalidad);
CREATE INDEX IF NOT EXISTS idx_teletrabajo_asignaciones_estado ON public.teletrabajo_asignaciones(estado);
CREATE INDEX IF NOT EXISTS idx_teletrabajo_acuerdos_cedula ON public.teletrabajo_acuerdos(servidor_cedula);
CREATE INDEX IF NOT EXISTS idx_teletrabajo_seguimientos_fechas ON public.teletrabajo_seguimientos(fecha_corte_desde, fecha_corte_hasta);

-- 6. Poblar cargos iniciales desde ingreso_cargos / planta_personal_sjd si no existen
INSERT INTO public.teletrabajo_cargos_config (cargo_nombre, codigo, grado, dependencia, es_teletrabajable, max_dias_semana, justificacion_estudio)
SELECT DISTINCT 
    p.cargo,
    COALESCE(p.codigo, '000'),
    COALESCE(p.grado, '00'),
    COALESCE(p.dependencia_cargo, 'Secretaría Jurídica Distrital'),
    CASE 
        WHEN LOWER(p.cargo) LIKE '%conductor%' OR LOWER(p.cargo) LIKE '%operativo%' OR LOWER(p.cargo) LIKE '%servicios generales%' THEN FALSE
        ELSE TRUE
    END AS es_teletrabajable,
    CASE 
        WHEN LOWER(p.cargo) LIKE '%directivo%' OR LOWER(p.cargo) LIKE '%director%' OR LOWER(p.cargo) LIKE '%secretario%' THEN 1
        ELSE 2
    END AS max_dias_semana,
    'Clasificación inicial según estudio técnico institucional del manual de funciones.'
FROM public.planta_personal_sjd p
WHERE p.cargo IS NOT NULL
ON CONFLICT (cargo_nombre, codigo, grado) DO NOTHING;

-- 7. Poblar Resoluciones Oficiales Marco
INSERT INTO public.teletrabajo_resoluciones (
    id, numero_resolucion, anio, fecha_expedicion, fecha_inicio_vigencia, fecha_fin_vigencia, 
    descripcion, modalidad_principal, estado, created_at, updated_at
) VALUES 
('11700000-0000-0000-0000-000000002026', 'Resolución No. 117 de 2026', 2026, '2026-03-10', '2026-03-10', '2027-03-10', 'Por la cual se adopta la política interna de teletrabajo en la Secretaría Jurídica Distrital.', 'TELETRABAJO', 'VIGENTE', NOW(), NOW()),
('20100000-0000-0000-0000-000000002026', 'Resolución No. 201 de 2026', 2026, '2026-05-04', '2026-05-04', '2026-09-14', 'Por la cual se autoriza la modalidad de teletrabajo a unos/as servidores/as públicos/as de la Secretaría Jurídica Distrital (Efectos suspendidos por Resolución No. 409 de 2026).', 'TELETRABAJO', 'DEROGADA', NOW(), NOW()),
('36600000-0000-0000-0000-000000002026', 'Resolución No. 366 de 2026', 2026, '2026-08-20', '2026-08-20', '2027-02-20', 'Por la cual se autoriza la modalidad de teletrabajo autónomo a la servidora pública Rosa Isabel Sierra Laborde de la Dirección Distrital de Política Jurídica por el término de seis (6) meses.', 'TELETRABAJO', 'VIGENTE', NOW(), NOW()),
('40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026', 2026, '2026-09-14', '2026-09-15', '2026-12-14', 'Por la cual se suspende temporalmente la Resolución No. 201 de 2026, se habilita temporalmente el trabajo en casa (5x5) a servidores/as públicos/as con ocasión de las obras en el Edificio Bicentenario II, y se autoriza la modalidad de teletrabajo híbrido a servidores/as públicos/as de la entidad.', 'TRABAJO_EN_CASA', 'VIGENTE', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    numero_resolucion = EXCLUDED.numero_resolucion,
    fecha_expedicion = EXCLUDED.fecha_expedicion,
    fecha_inicio_vigencia = EXCLUDED.fecha_inicio_vigencia,
    fecha_fin_vigencia = EXCLUDED.fecha_fin_vigencia,
    descripcion = EXCLUDED.descripcion,
    modalidad_principal = EXCLUDED.modalidad_principal,
    estado = EXCLUDED.estado,
    updated_at = NOW();

