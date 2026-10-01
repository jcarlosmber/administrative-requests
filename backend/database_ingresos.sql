-- ==============================================================================
-- MÓDULO DE VALIDACIÓN DE INGRESOS Y EXPERIENCIA (SECTOR PÚBLICO)
-- Tablas independientes sin afectar módulos de solicitudes administrativas
-- ==============================================================================

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

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_ingreso_validaciones_candidato ON public.ingreso_validaciones(candidato_id);
CREATE INDEX IF NOT EXISTS idx_ingreso_certificados_validacion ON public.ingreso_certificados(validacion_id);

-- Cargo de prueba inicial oficial de ejemplo
INSERT INTO public.ingreso_cargos (
    nombre, codigo, grado, dependencia, requisito_experiencia_meses, requisitos_formacion, funciones_cargo
) VALUES (
    'Profesional Especializado',
    '222',
    '24',
    'Dirección Distrital de Doctrina y Asuntos Normativos',
    54.00,
    'Título profesional en Derecho o áreas afines. Título de posgrado en áreas afines a las funciones del cargo. Tarjeta profesional vigente.',
    '[
        "1. Proyectar conceptos jurídicos sobre temas de doctrina distrital y asuntos normativos de competencia de la entidad.",
        "2. Analizar y revisar proyectos de actos administrativos, decretos, resoluciones y proyectos de acuerdo distritales.",
        "3. Sustanciar respuestas a consultas y derechos de petición formulados por entidades públicas o ciudadanos en materia jurídica.",
        "4. Participar en la formulación, seguimiento y evaluación de políticas jurídicas de alcance distrital.",
        "5. Asistir técnicamente a los organismos distritales en la correcta aplicación e interpretación de la normatividad vigente."
    ]'::jsonb
) ON CONFLICT DO NOTHING;
