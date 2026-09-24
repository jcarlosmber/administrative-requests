-- ================================================================
-- MIGRACIÓN: CONTROL INTEGRAL DE VEHÍCULOS Y CELDAS DE PARQUEADERO
-- ================================================================

-- 1. Tabla de Celdas de Parqueadero
CREATE TABLE IF NOT EXISTS public.parking_spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,                                -- Código identificador ej. 'C-01', 'S1-04'
    spot_type TEXT NOT NULL DEFAULT 'libre',                  -- 'fija' o 'libre'
    status TEXT NOT NULL DEFAULT 'disponible',                -- 'disponible', 'ocupada', 'mantenimiento', 'reservada'
    assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Usuario titular si es celda fija
    assigned_user_name TEXT,                                  -- Nombre del titular para consulta rápida
    notes TEXT,                                               -- Ubicación, nivel, notas adicionales
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Asegurar campos en la tabla de vehículos
ALTER TABLE public.user_vehicles 
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pendiente',
    ADD COLUMN IF NOT EXISTS assigned_spot_id UUID REFERENCES public.parking_spots(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS charge TEXT;

-- Índice para asegurar búsqueda rápida e insensibilidad a mayúsculas en placas
CREATE INDEX IF NOT EXISTS idx_user_vehicles_plate ON public.user_vehicles (UPPER(TRIM(plate)));
CREATE INDEX IF NOT EXISTS idx_user_vehicles_user_id ON public.user_vehicles (user_id);
CREATE INDEX IF NOT EXISTS idx_parking_spots_code ON public.parking_spots (code);

-- 3. Tabla de Auditoría / Historial de Vehículos
CREATE TABLE IF NOT EXISTS public.vehicle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.user_vehicles(id) ON DELETE CASCADE,
    plate TEXT NOT NULL,
    action TEXT NOT NULL,                                     -- 'creacion', 'actualizacion', 'inactivacion', 'activacion', 'asignacion_celda', 'liberacion_celda', 'eliminacion'
    performed_by_id UUID,
    performed_by_name TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_history_vehicle_id ON public.vehicle_history (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_plate ON public.vehicle_history (UPPER(TRIM(plate)));

-- 4. Parámetro de límite máximo de vehículos por usuario
INSERT INTO public.system_settings (key, value)
VALUES ('max_vehicles_per_user', '3'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Celdas de parqueadero iniciales (si la tabla está vacía)
INSERT INTO public.parking_spots (code, spot_type, status, notes)
VALUES 
    ('C-01', 'fija', 'disponible', 'Sótano 1 - Sector Dirección'),
    ('C-02', 'fija', 'disponible', 'Sótano 1 - Sector Dirección'),
    ('C-03', 'fija', 'disponible', 'Sótano 1 - Sector Subsecretaría'),
    ('C-04', 'fija', 'disponible', 'Sótano 1 - Sector Asesores'),
    ('C-05', 'fija', 'disponible', 'Sótano 1 - Sector Planta'),
    ('C-06', 'libre', 'disponible', 'Sótano 1 - Zona Rotativa General'),
    ('C-07', 'libre', 'disponible', 'Sótano 1 - Zona Rotativa General'),
    ('C-08', 'libre', 'disponible', 'Sótano 1 - Zona Rotativa General'),
    ('C-09', 'libre', 'disponible', 'Sótano 1 - Zona Rotativa General'),
    ('C-10', 'libre', 'disponible', 'Sótano 1 - Zona Rotativa General'),
    ('C-11', 'libre', 'disponible', 'Sótano 2 - Zona Rotativa'),
    ('C-12', 'libre', 'disponible', 'Sótano 2 - Zona Rotativa')
ON CONFLICT (code) DO NOTHING;
