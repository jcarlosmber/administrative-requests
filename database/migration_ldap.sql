-- Modificación de tabla de usuarios para soporte LDAP
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ldap_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dependency TEXT;
