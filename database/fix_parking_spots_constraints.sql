-- ====================================================================
-- MIGRACIÓN DE REPARACIÓN: INTEGRIDAD DE CELDAS Y CLAVES FORÁNEAS
-- Base de datos: sasge_db (Secretaría Jurídica Distrital)
-- ====================================================================

BEGIN;

-- 1. Asegurar funciones de triggers para evitar errores al actualizar user_vehicles
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Asegurar que las columnas existan en user_vehicles
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pendiente';
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS assigned_spot_id UUID;
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS charge TEXT;

-- 3. Limpiar referencias inválidas de celdas que ya no existan en parking_spots
UPDATE public.user_vehicles
SET assigned_spot_id = NULL
WHERE assigned_spot_id IS NOT NULL 
  AND assigned_spot_id NOT IN (SELECT id FROM public.parking_spots);

-- 4. Reemplazar la restricción de clave foránea con ON DELETE SET NULL
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Eliminar cualquier foreign key existente entre user_vehicles y parking_spots
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.user_vehicles'::regclass 
          AND confrelid = 'public.parking_spots'::regclass
    ) LOOP
        EXECUTE 'ALTER TABLE public.user_vehicles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Crear la foreign key definitiva con ON DELETE SET NULL
ALTER TABLE public.user_vehicles 
    ADD CONSTRAINT user_vehicles_assigned_spot_id_fkey 
    FOREIGN KEY (assigned_spot_id) 
    REFERENCES public.parking_spots(id) 
    ON DELETE SET NULL;

-- 5. Crear índices para optimizar búsquedas y borrados
CREATE INDEX IF NOT EXISTS idx_user_vehicles_assigned_spot_id ON public.user_vehicles(assigned_spot_id);
CREATE INDEX IF NOT EXISTS idx_parking_spots_assigned_user_id ON public.parking_spots(assigned_user_id);

COMMIT;
