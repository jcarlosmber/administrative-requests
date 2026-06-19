-- Crear extensión para generar UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tipos enumerados personalizados para status y prioridad si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('pendiente', 'en_progreso', 'resuelto', 'rechazado');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_priority') THEN
        CREATE TYPE request_priority AS ENUM ('baja', 'media', 'alta');
    END IF;
END$$;

-- 1. Crear la tabla de usuarios local
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'funcionario',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear la tabla de solicitudes administrativas
CREATE TABLE IF NOT EXISTS public.administrative_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status request_status DEFAULT 'pendiente',
    priority request_priority DEFAULT 'media',
    admin_notes TEXT,
    attachments TEXT[], -- Array de URLs de adjuntos
    metadata JSONB DEFAULT '{}'::jsonb -- Metadatos del tipo de solicitud
);

-- 3. Crear la tabla de vehículos de usuarios
CREATE TABLE IF NOT EXISTS public.user_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    plate TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT,
    color TEXT,
    name TEXT,
    doc TEXT,
    dependency TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers de actualización
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_administrative_requests_updated_at ON public.administrative_requests;
CREATE TRIGGER update_administrative_requests_updated_at
    BEFORE UPDATE ON public.administrative_requests
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_vehicles_updated_at ON public.user_vehicles;
CREATE TRIGGER update_user_vehicles_updated_at
    BEFORE UPDATE ON public.user_vehicles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
