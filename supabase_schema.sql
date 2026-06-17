-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Dependencias
CREATE TABLE IF NOT EXISTS public.dependencies (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar dependencias iniciales
INSERT INTO public.dependencies (name) VALUES 
('Secretaría Jurídica Distrital'),
('Dirección de Gestión Corporativa'),
('Subdirección de Informática'),
('Dirección Distrital de Asuntos Penales'),
('Oficina Asesora de Planeación')
ON CONFLICT (name) DO NOTHING;

-- Tabla de Perfiles (Extensión de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    username TEXT,
    phone TEXT,
    entity TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'security')),
    dependency_id uuid REFERENCES public.dependencies(id),
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    ldap_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS username TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS entity TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE,
    ADD COLUMN IF NOT EXISTS ldap_enabled BOOLEAN DEFAULT FALSE;

-- Tabla de Salas (para el módulo de Rooms)
CREATE TABLE IF NOT EXISTS public.rooms (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    floor TEXT,
    info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar salas iniciales
INSERT INTO public.rooms (name, capacity, floor, info) VALUES 
('Sala Innovación', 12, 'Piso 2', 'Ala Norte'),
('Sala de Juntas B', 8, 'Piso 1', 'Cerca a Recepción'),
('Focus Room 4', 2, 'Piso 3', 'Zona Silenciosa'),
('Auditorio Principal', 50, 'PB', 'Salón Principal');

-- Tabla Principal de Solicitudes Administrativas
CREATE TABLE IF NOT EXISTS public.administrative_requests (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'visitors', 'maintenance', 'parking', 'transport', 'rooms'
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'resuelto', 'rechazado')),
    priority TEXT DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta')),
    admin_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- Aquí guardaremos los campos específicos de cada módulo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de Seguridad (RLS)
ALTER TABLE public.dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_requests ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para Solicitudes
CREATE POLICY "Users can view their own requests" ON public.administrative_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own requests" ON public.administrative_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all requests" ON public.administrative_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all requests" ON public.administrative_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_requests_modtime BEFORE UPDATE ON public.administrative_requests FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ==========================================
-- NUEVOS MÓDULOS DE CONDUCTORES Y AJUSTES
-- ==========================================

-- Tabla de Conductores (Transporte)
CREATE TABLE IF NOT EXISTS public.drivers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Correos Destino de Secretaría General
CREATE TABLE IF NOT EXISTS public.service_emails (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_type TEXT NOT NULL, -- 'maintenance', 'visitors', 'rooms_special', 'parking'
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para nuevas tablas
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_emails ENABLE ROW LEVEL SECURITY;

-- Políticas para Drivers
CREATE POLICY "Permitir lectura a usuarios autenticados" ON public.drivers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir gestión completa solo a administradores" ON public.drivers
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Políticas para Service Emails
CREATE POLICY "Permitir lectura de correos a usuarios autenticados" ON public.service_emails
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir gestión de correos a administradores" ON public.service_emails
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

