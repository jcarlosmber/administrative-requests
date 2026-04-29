-- 1. Habilitar la extensión para hacer peticiones HTTP desde Postgres
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

-- 2. Crear una función que dispare el Webhook hacia nuestra Edge Function
CREATE OR REPLACE FUNCTION public.on_new_administrative_request()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://qttvsaonebquasfaxecs.supabase.co/functions/v1/notify-admin',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::jsonb->>'anon_key' -- Nota: En producción usa una clave de servicio secreta
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el Trigger
DROP TRIGGER IF EXISTS tr_notify_admin_on_insert ON public.administrative_requests;
CREATE TRIGGER tr_notify_admin_on_insert
AFTER INSERT ON public.administrative_requests
FOR EACH ROW EXECUTE FUNCTION public.on_new_administrative_request();
