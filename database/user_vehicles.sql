-- Tabla para registrar los vehículos de los usuarios
CREATE TABLE IF NOT EXISTS public.user_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plate TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.user_vehicles ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para que el usuario gestione sus propios vehículos
CREATE POLICY "Users can view their own vehicles" 
ON public.user_vehicles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicles" 
ON public.user_vehicles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles" 
ON public.user_vehicles FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicles" 
ON public.user_vehicles FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para mantener actualizado updated_at
CREATE TRIGGER update_user_vehicles_modtime 
    BEFORE UPDATE ON public.user_vehicles 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_modified_column();
