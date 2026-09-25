-- ====================================================================
-- MIGRACIÓN DE REPARACIÓN: INTEGRIDAD DE CELDAS, VEHÍCULOS Y AUDITORÍA
-- Base de datos: sasge_db (Secretaría Jurídica Distrital)
-- ====================================================================

BEGIN;

-- 1. Asegurar funciones de triggers para evitar errores al actualizar o modificar user_vehicles
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

-- 2. Asegurar que las columnas existan en user_vehicles y parking_spots
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pendiente';
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS assigned_spot_id UUID;
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS charge TEXT;
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'carro';
ALTER TABLE public.user_vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.parking_spots ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'carro';
ALTER TABLE public.parking_spots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Auto-clasificar vehículos existentes como moto si su modelo, notas o formato de placa corresponden a motocicleta
UPDATE public.user_vehicles
SET vehicle_type = 'moto'
WHERE (vehicle_type IS NULL OR vehicle_type = 'carro')
  AND (
    model ILIKE '%moto%' 
    OR notes ILIKE '%moto%' 
    OR brand ILIKE '%yamaha%' 
    OR brand ILIKE '%suzuki%' 
    OR brand ILIKE '%honda%' 
    OR brand ILIKE '%victory%' 
    OR brand ILIKE '%kawasaki%' 
    OR brand ILIKE '%bajaj%' 
    OR brand ILIKE '%ktm%' 
    OR brand ILIKE '%akt%' 
    OR (brand ILIKE '%bmw%' AND model ILIKE '%moto%')
    OR UPPER(REGEXP_REPLACE(plate, '[^A-Za-z0-9]', '', 'g')) ~ '^[A-Z]{3}[0-9]{2}[A-Z]$'
  );

-- Auto-clasificar celdas de moto existentes (M-01 a M-13 o notas alusivas)
UPDATE public.parking_spots
SET vehicle_type = 'moto'
WHERE (vehicle_type IS NULL OR vehicle_type = 'carro')
  AND (
    code ILIKE 'M-%' 
    OR notes ILIKE '%moto%'
  );

-- 3. Limpiar referencias inválidas de celdas que ya no existan en parking_spots
UPDATE public.user_vehicles
SET assigned_spot_id = NULL
WHERE assigned_spot_id IS NOT NULL 
  AND assigned_spot_id NOT IN (SELECT id FROM public.parking_spots);

-- 4. Reemplazar la restricción de clave foránea en user_vehicles con ON DELETE SET NULL
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

-- 5. Asegurar integridad en vehicle_history: permitir eliminar vehículos sin violar claves foráneas
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Eliminar cualquier foreign key restrictiva entre vehicle_history y user_vehicles
    FOR r IN (
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'vehicle_history' 
          AND kcu.column_name = 'vehicle_id' 
          AND tc.constraint_type = 'FOREIGN KEY'
    ) LOOP
        EXECUTE 'ALTER TABLE public.vehicle_history DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- Permitir que el historial conserve la auditoría con vehicle_id en NULL al eliminar el vehículo
ALTER TABLE public.vehicle_history ALTER COLUMN vehicle_id DROP NOT NULL;
ALTER TABLE public.vehicle_history 
    ADD CONSTRAINT vehicle_history_vehicle_id_fkey 
    FOREIGN KEY (vehicle_id) 
    REFERENCES public.user_vehicles(id) 
    ON DELETE SET NULL;

-- 6. Crear índices para optimizar búsquedas y borrados
CREATE INDEX IF NOT EXISTS idx_user_vehicles_assigned_spot_id ON public.user_vehicles(assigned_spot_id);
CREATE INDEX IF NOT EXISTS idx_parking_spots_assigned_user_id ON public.parking_spots(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_vehicle_id ON public.vehicle_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_plate ON public.vehicle_history(plate);

COMMIT;
