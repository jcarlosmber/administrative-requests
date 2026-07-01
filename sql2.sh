cat << 'EOF' > /tmp/update_others.sql
TRUNCATE TABLE public.drivers CASCADE;
INSERT INTO public.drivers (id, name, phone, is_active) VALUES
  ('11111111-2222-3333-4444-666666666661', 'Carlos Mendoza', '3104567890', true),
  ('11111111-2222-3333-4444-666666666662', 'Alfonso Guerrero', '3157890123', true),
  ('11111111-2222-3333-4444-666666666663', 'Martha Lucia Gómez', '3203456789', true);

TRUNCATE TABLE public.service_emails CASCADE;
INSERT INTO public.service_emails (id, service_type, email) VALUES
  ('11111111-2222-3333-4444-777777777771', 'maintenance', 'mantenimiento.sg@SJD.gov.co'),
  ('11111111-2222-3333-4444-777777777772', 'visitors', 'visitantes.sg@SJD.gov.co'),
  ('11111111-2222-3333-4444-777777777773', 'rooms_special', 'eventos.sg@SJD.gov.co'),
  ('11111111-2222-3333-4444-777777777774', 'parking', 'porteria.sg@SJD.gov.co');
EOF
export PGPASSWORD='.Secjur-2026**'
psql -h localhost -U sasge -d sasge_db -f /tmp/update_others.sql
