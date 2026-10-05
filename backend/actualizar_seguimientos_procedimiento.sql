-- Migración para actualizar tabla teletrabajo_seguimientos conforme al Procedimiento 2311300-PR-117 v06
-- Puntos implementados:
-- 1. Registro de días efectivamente teletrabajados, memorando FT-018 y término de radicación.
-- 3. Control de condiciones SST y TIC (reporte de cambio de domicilio y vigencia de visita técnica).
-- 4. Puntos de control y reporte para el Comité Institucional de Gestión y Desempeño.

ALTER TABLE public.teletrabajo_seguimientos 
    ADD COLUMN IF NOT EXISTS dias_efectivos_teletrabajo INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS radicado_memorando_ft018 TEXT,
    ADD COLUMN IF NOT EXISTS fecha_radicacion_memorando DATE,
    ADD COLUMN IF NOT EXISTS tipo_seguimiento TEXT DEFAULT 'MENSUAL_ORDINARIO',
    ADD COLUMN IF NOT EXISTS aplica_auxilio_servicios BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS estrato_socioeconomico INTEGER,
    ADD COLUMN IF NOT EXISTS novedad_cambio_domicilio BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS observaciones_cambio_domicilio TEXT,
    ADD COLUMN IF NOT EXISTS estado_visita_sst_tic TEXT DEFAULT 'VIGENTE';

-- Índices para reportes del Comité Institucional
CREATE INDEX IF NOT EXISTS idx_teletrabajo_seguimientos_memorando ON public.teletrabajo_seguimientos(radicado_memorando_ft018);
CREATE INDEX IF NOT EXISTS idx_teletrabajo_seguimientos_domicilio ON public.teletrabajo_seguimientos(novedad_cambio_domicilio);
CREATE INDEX IF NOT EXISTS idx_teletrabajo_seguimientos_sst_tic ON public.teletrabajo_seguimientos(estado_visita_sst_tic);
