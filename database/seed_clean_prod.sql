-- ====================================================================
-- MIGRACIÓN LIMPIA Y ROBUSTA: CELDAS, VEHÍCULOS Y CONDUCTORES EN PRODUCCIÓN
-- Base de datos destino: sasge_db (Secretaría Jurídica Distrital)
-- Fecha: 2026-09-25T00:06:04.139Z
-- ====================================================================

BEGIN;

-- 1. Estructura y restricciones
CREATE TABLE IF NOT EXISTS public.parking_spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    spot_type TEXT NOT NULL DEFAULT 'libre',
    status TEXT NOT NULL DEFAULT 'disponible',
    assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_user_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_vehicles 
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pendiente',
    ADD COLUMN IF NOT EXISTS assigned_spot_id UUID REFERENCES public.parking_spots(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS charge TEXT;

-- Asegurar restricción UNIQUE en plate
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_vehicles_plate_key'
    ) THEN
        ALTER TABLE public.user_vehicles ADD CONSTRAINT user_vehicles_plate_key UNIQUE (plate);
    END IF;
END $$;

-- 2. Conductores oficiales
INSERT INTO public.drivers (name, phone, is_active)
VALUES ('EDUARDO ALEJANDRO URREGO BECERRA', '80100027', TRUE)
ON CONFLICT DO NOTHING;
INSERT INTO public.drivers (name, phone, is_active)
VALUES ('JAUMI MANFRED MARROQUIN', '79769334', TRUE)
ON CONFLICT DO NOTHING;
INSERT INTO public.drivers (name, phone, is_active)
VALUES ('LUIS DAUVINY DUARTE ROA', '79417068', TRUE)
ON CONFLICT DO NOTHING;

-- 3. Usuarios institucionales y funcionarios beneficiarios
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('aardila@secretariajuridica.gov.co', 'aardila', 'ALVARO ARDILA MORA', 'ALVARO ARDILA MORA', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', '1662', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('acbernaten@secretariajuridica.gov.co', 'acbernaten', 'ALVARO CAMILO BERNATE NAVARRO', 'ALVARO CAMILO BERNATE NAVARRO', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', '1648', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('acortes@secretariajuridica.gov.co', 'acortes', 'ALEX CORTES SALGADO', 'ALEX CORTES SALGADO', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', '1581', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('adpilarc@secretariajuridica.gov.co', 'adpilarc', 'ANDREA DEL PILAR CARDENAS SARMIENTO', 'ANDREA DEL PILAR CARDENAS SARMIENTO', 'DIRECCIÓN DE ASUNTOS DISCIPLINARIOS', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('afabian@secretariajuridica.gov.co', 'afabian', 'ANDRES FABIAN NOSSA', 'ANDRES FABIAN NOSSA', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('ajcalac@secretariajuridica.gov.co', 'ajcalac', 'ADDILY JOHANNA CALA CASTRO', 'ADDILY JOHANNA CALA CASTRO', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', '1568', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('amortizm@secretariajuridica.gov.co', 'amortizm', 'Andres Mauricio Ortiz Maya', 'Andres Mauricio Ortiz Maya', 'Dirección Distrital de Gestión Judicial', 'directivo', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('apramirezb@secretariajuridica.gov.co', 'apramirezb', 'ADRIANA PATRICIA RAMIREZ BAUTISTA', 'ADRIANA PATRICIA RAMIREZ BAUTISTA', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', '1630', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('apuentesd@secretariajuridica.gov.co', 'apuentesd', 'Andres Felipe Puentes Diaz', 'Andres Felipe Puentes Diaz', 'Dirección Distrital de Doctrina', 'directivo', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('arramosm@secretariajuridica.gov.co', 'arramosm', 'ALMA ROSA RAMOS MARIA', 'ALMA ROSA RAMOS MARIA', 'DIRECCIÓN DISTRITAL DE POLITICA E INFORMATICA', 'funcionario', '1771', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('balvarado@secretariajuridica.gov.co', 'balvarado', 'BRICEIDA ALVARADO ROJAS', 'BRICEIDA ALVARADO ROJAS', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', '1567', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('caalvarador@secretariajuridica.gov.co', 'caalvarador', 'CHEILA ALEXANDRA ALVARADO ROJAS', 'CHEILA ALEXANDRA ALVARADO ROJAS', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', '1569', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('caguarinp@secretariajuridica.gov.co', 'caguarinp', 'Camilo Alfonso Guarin Prieto', 'Camilo Alfonso Guarin Prieto', 'Dirección Distrital de Inspección, Vigilancia y Control', 'directivo', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('carodriguezr@secretariajuridica.gov.co', 'carodriguezr', 'CAMILO ANDRES RODRIGUEZ RODRIGUEZ', 'CAMILO ANDRES RODRIGUEZ RODRIGUEZ', 'DIRECCIÓN DISTRITAL DE POLITICA E INFORMATICA', 'funcionario', '1768', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('cdjimenezv@secretariajuridica.gov.co', 'cdjimenezv', 'CRISTHIAM DAVID JIMENEZ VASQUEZ', 'CRISTHIAM DAVID JIMENEZ VASQUEZ', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', '1647', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('cjramirezm@secretariajuridica.gov.co', 'cjramirezm', 'CARLOS JULIO RAMIREZ MUÑOZ', 'CARLOS JULIO RAMIREZ MUÑOZ', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('clozano@secretariajuridica.gov.co', 'clozano', 'CAROLINA LOZANO ARDILA', 'CAROLINA LOZANO ARDILA', 'OFICINA DE CONTROL INTERNO', 'funcionario', '1622', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('dahernandez@secretariajuridica.gov.co', 'dahernandez', 'Daniel Andrés Hernández', 'Daniel Andrés Hernández', 'Despacho Secretaría Jurídica', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('dalejandro@secretariajuridica.gov.co', 'dalejandro', 'DIEGO ALEJANDRO SOLANO', 'DIEGO ALEJANDRO SOLANO', 'Dirección Defensa', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('damorab@secretariajuridica.gov.co', 'damorab', 'DAVID ALEJANDRO MORA BERMUDEZ', 'DAVID ALEJANDRO MORA BERMUDEZ', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', '1759', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('dbgutierrezh@secretariajuridica.gov.co', 'dbgutierrezh', 'DORA BELEN GUTIERREZ HERNANDEZ', 'DORA BELEN GUTIERREZ HERNANDEZ', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', '1577', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('dfbuitragod@secretariajuridica.gov.co', 'dfbuitragod', 'DANIEL FERNANDO BUITRAGO DIAZ', 'DANIEL FERNANDO BUITRAGO DIAZ', 'Dirección de Doctrina', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('dfernando@secretariajuridica.gov.co', 'dfernando', 'DAVID FERNANDO VELASQUEZ', 'DAVID FERNANDO VELASQUEZ', 'Contrato 472 (Mensajería / Correspondencia)', 'contratista', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('drbarrerap@secretariajuridica.gov.co', 'drbarrerap', 'DORA RAQUEL BARRERA PALACIO', 'DORA RAQUEL BARRERA PALACIO', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', '1563', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('dsandoval@secretariajuridica.gov.co', 'dsandoval', 'DUVAN SANDOVAL RODRIGUEZ', 'DUVAN SANDOVAL RODRIGUEZ', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'funcionario', '1688', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('dsilva@secretariajuridica.gov.co', 'dsilva', 'DORIS SILVA GARCIA', 'DORIS SILVA GARCIA', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', '1667', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('dyzabaletat@secretariajuridica.gov.co', 'dyzabaletat', 'DONALDO YAMITH ZABALETA TABOADA', 'DONALDO YAMITH ZABALETA TABOADA', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', '1648', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('eaurregob@secretariajuridica.gov.co', 'eaurregob', 'Eduardo Alejandro Urrego Becerra', 'Eduardo Alejandro Urrego Becerra', 'Dirección de Gestión Corporativa', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('ejmanotasm@secretariajuridica.gov.co', 'ejmanotasm', 'EURANIO JOSE MANOTAS MALDINADO', 'EURANIO JOSE MANOTAS MALDINADO', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('fejaimesc@secretariajuridica.gov.co', 'fejaimesc', 'FREDY ESTEBAN JAIMES CASTILLO', 'FREDY ESTEBAN JAIMES CASTILLO', 'Oficina Asesora de Planeación', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('fpachon@secretariajuridica.gov.co', 'fpachon', 'FERNANDO PACHON PIÑEROS', 'FERNANDO PACHON PIÑEROS', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'funcionario', '1689', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('galberto@secretariajuridica.gov.co', 'galberto', 'GERMAN ALBERTO PULIDO', 'GERMAN ALBERTO PULIDO', 'Subsecretaría Jurídica Distrital', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('gesalcedot@secretariajuridica.gov.co', 'gesalcedot', 'GLORIA ESTHER SALCEDO TAMAYO', 'GLORIA ESTHER SALCEDO TAMAYO', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('gimartinezo@secretariajuridica.gov.co', 'gimartinezo', 'GLORIA INES MARTINEZ ORTIZ', 'GLORIA INES MARTINEZ ORTIZ', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', '1573', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('hagonzalezm@secretariajuridica.gov.co', 'hagonzalezm', 'HENRY ALBERTO GONZALEZ MOLINA', 'HENRY ALBERTO GONZALEZ MOLINA', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', '1656', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('hhaguirrec@secretariajuridica.gov.co', 'hhaguirrec', 'Hugo Hernando Aguirre Corrales', 'Hugo Hernando Aguirre Corrales', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('hmmoram@secretariajuridica.gov.co', 'hmmoram', 'HELVERT MANUEL MORA MONTOYA', 'HELVERT MANUEL MORA MONTOYA', 'Dirección Defensa', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('idramirezv@secretariajuridica.gov.co', 'idramirezv', 'IVAN DAVID RAMIREZ VALENCIA', 'IVAN DAVID RAMIREZ VALENCIA', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', '1758', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('jarojasp@secretariajuridica.gov.co', 'jarojasp', 'JORGE ANDRÉS ROJAS PEÑA', 'JORGE ANDRÉS ROJAS PEÑA', 'Dirección de Gestión Corporativa', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('jatibaduisac@secretariajuridica.gov.co', 'jatibaduisac', 'JHON ALEXANDER TIBADUISA CASTAÑEDA', 'JHON ALEXANDER TIBADUISA CASTAÑEDA', 'Dirección Distrital de Política e Informática Jurídica', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('jcmartinezb@secretariajuridica.gov.co', 'jcmartinezb', 'Juan Carlos Martínez', 'Juan Carlos Martínez', 'Subdirección de Informática', 'admin', '1610', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('jdacostat@secretariajuridica.gov.co', 'jdacostat', 'JUAN DIEGO ACOSTA TORRES', 'JUAN DIEGO ACOSTA TORRES', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', '1645', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('jeliecer@secretariajuridica.gov.co', 'jeliecer', 'JORGE ELIECER CAMACHO', 'JORGE ELIECER CAMACHO', 'Contrato 472 (Mensajería / Correspondencia)', 'contratista', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('jgutierrez@secretariajuridica.gov.co', 'jgutierrez', 'JENIFFER GUTIERREZ GUTIERREZ', 'JENIFFER GUTIERREZ GUTIERREZ', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', '1758', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('jlgomeza@secretariajuridica.gov.co', 'jlgomeza', 'JENNIFER LIZBETH GOMEZ AREVALO', 'JENNIFER LIZBETH GOMEZ AREVALO', 'Dirección Defensa', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('joalvaradoh@secretariajuridica.gov.co', 'joalvaradoh', 'JOSE ORLANDO ALVARADO HERREÑO', 'JOSE ORLANDO ALVARADO HERREÑO', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', '1753', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('jpgamezg@secretariajuridica.gov.co', 'jpgamezg', 'JOHANA PATRICIA GAMEZ GOMEZ', 'JOHANA PATRICIA GAMEZ GOMEZ', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'funcionario', '1685', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('jprieto@secretariajuridica.gov.co', 'jprieto', 'JAINER PRIETO GONZALEZ', 'JAINER PRIETO GONZALEZ', 'Contrato 472 (Mensajería / Correspondencia)', 'contratista', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('jsflechasa@secretariajuridica.gov.co', 'jsflechasa', 'JOAN SEBASTIAN FLECHAS ALONSO', 'JOAN SEBASTIAN FLECHAS ALONSO', 'Dirección Distrital de Política e Informática Jurídica', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('lacastiblancou@secretariajuridica.gov.co', 'lacastiblancou', 'LUIS ALFONSO CASTIBLANCO URQUIJO', 'LUIS ALFONSO CASTIBLANCO URQUIJO', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', '1673', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('lcgaonaf@secretariajuridica.gov.co', 'lcgaonaf', 'LUIS CARLOS GAONA FARIAS', 'LUIS CARLOS GAONA FARIAS', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', '1575', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('ldmerchanl@secretariajuridica.gov.co', 'ldmerchanl', 'LUZ DARY MERCHAN LARA', 'LUZ DARY MERCHAN LARA', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', '1770', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('legarciac@secretariajuridica.gov.co', 'legarciac', 'LUZ ESPERANZA GARCIA CARDONA', 'LUZ ESPERANZA GARCIA CARDONA', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('lemorenop@secretariajuridica.gov.co', 'lemorenop', 'LUZ ESTELLA MORENO PEREZ', 'LUZ ESTELLA MORENO PEREZ', 'DESPACHO SECRETARIA JURIDICA', 'funcionario', '1500', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('ljuliana@secretariajuridica.gov.co', 'ljuliana', 'LAURA JULIANA ARIZA', 'LAURA JULIANA ARIZA', 'DESPACHO SECRETARIA JURIDICA', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('lmmelor@secretariajuridica.gov.co', 'lmmelor', 'LINA MARCELA MELO RODRIGUEZ', 'LINA MARCELA MELO RODRIGUEZ', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'funcionario', '1687', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('lmvillarragar@secretariajuridica.gov.co', 'lmvillarragar', 'LIZETH MAYERLY VILLARRAGA ROJAS', 'LIZETH MAYERLY VILLARRAGA ROJAS', 'Subsecretaría Jurídica Distrital', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('lyperear@secretariajuridica.gov.co', 'lyperear', 'Leidy Yulieth Pera Ramirez', 'Leidy Yulieth Pera Ramirez', 'Oficina de Control Interno', 'directivo', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('mavargasc@secretariajuridica.gov.co', 'mavargasc', 'MIGUEL ANGEL VARGAS CORDERO', 'MIGUEL ANGEL VARGAS CORDERO', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', '1660', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('meguerrerob@secretariajuridica.gov.co', 'meguerrerob', 'MAGDA EDITH GUERRERO BONILLA', 'MAGDA EDITH GUERRERO BONILLA', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('mlbarrerad@secretariajuridica.gov.co', 'mlbarrerad', 'MARTHA LILIANA BARRERA DIAZ', 'MARTHA LILIANA BARRERA DIAZ', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', '1579', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('mpatricia@secretariajuridica.gov.co', 'mpatricia', 'MAGDA PATRICIA PUENTES', 'MAGDA PATRICIA PUENTES', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('mpinto@secretariajuridica.gov.co', 'mpinto', 'MIGUEL PINTO SEGURA', 'MIGUEL PINTO SEGURA', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', '1763', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('mteresa@secretariajuridica.gov.co', 'mteresa', 'MARIA TERESA VALDERRAMA', 'MARIA TERESA VALDERRAMA', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', '1749', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('mtmejiar@secretariajuridica.gov.co', 'mtmejiar', 'Maria Tatiana Mejia', 'Maria Tatiana Mejia', 'Despacho Secretaría Jurídica', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('mxcubidesa@secretariajuridica.gov.co', 'mxcubidesa', 'MARIA XIMENA CUBIDES AMAYA', 'MARIA XIMENA CUBIDES AMAYA', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'funcionario', '1685', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('myrojasl@secretariajuridica.gov.co', 'myrojasl', 'MARLY YULY ROJAS LAIDEO', 'MARLY YULY ROJAS LAIDEO', 'Dirección de Gestión Corporativa', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('njsalazaru@secretariajuridica.gov.co', 'njsalazaru', 'NELSON JULIAN SALAZAR URRUTIA', 'NELSON JULIAN SALAZAR URRUTIA', 'OFICINA ASESORA DE PLANEACIÓN', 'funcionario', '1517', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('nsantiago@secretariajuridica.gov.co', 'nsantiago', 'NICOLAS SANTIAGO SOTO', 'NICOLAS SANTIAGO SOTO', 'Dirección Distrital de Inspección, Vigilancia y Control', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('ntorres@secretariajuridica.gov.co', 'ntorres', 'NELCY TORRES MARTINEZ', 'NELCY TORRES MARTINEZ', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', '1645', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('ofcelisb@secretariajuridica.gov.co', 'ofcelisb', 'OSCAR FRANCISCO CELIS BERNA', 'OSCAR FRANCISCO CELIS BERNA', 'Oficina de Control Interno', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('ojsuarez@secretariajuridica.gov.co', 'ojsuarez', 'Oscar Javier Suarez Ramos', 'Oscar Javier Suarez Ramos', 'Oficina de las Tecnologías de la Información y las Comunicaciones', 'directivo', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('ollondonog@secretariajuridica.gov.co', 'ollondonog', 'OLGA LILIANA LONDOÑO GARCIA', 'OLGA LILIANA LONDOÑO GARCIA', 'Dirección de Gestión Corporativa', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('oquintero@secretariajuridica.gov.co', 'oquintero', 'OCTAVIO QUINTERO LARA', 'OCTAVIO QUINTERO LARA', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', '1752', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('pamejias@secretariajuridica.gov.co', 'pamejias', 'PEDRO ALFONSO MEJIA SIERRA', 'PEDRO ALFONSO MEJIA SIERRA', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', '1566', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('pgomezm@secretariajuridica.gov.co', 'pgomezm', 'Paola Gómez Martinez', 'Paola Gómez Martinez', 'Dirección de Gestión Corporativa', 'directivo', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('sahernandezm@secretariajuridica.gov.co', 'sahernandezm', 'SAMUEL ARTURO HERNANDEZ MURCIA', 'SAMUEL ARTURO HERNANDEZ MURCIA', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'funcionario', '1572', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('snorganistab@secretariajuridica.gov.co', 'snorganistab', 'SANDRA NICOLASA ORGANISTA BUILES', 'SANDRA NICOLASA ORGANISTA BUILES', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('stroas@secretariajuridica.gov.co', 'stroas', 'SONIA TERESA ROA SILVA', 'SONIA TERESA ROA SILVA', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'funcionario', '1657', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('vhernando@secretariajuridica.gov.co', 'vhernando', 'VICTOR HERNANDO MURILLO', 'VICTOR HERNANDO MURILLO', 'OFICINA DE CONTROL INTERNO', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('waburgos@secretariajuridica.gov.co', 'waburgos', 'William Alexander Burgos', 'William Alexander Burgos', 'Subsecretaría Jurídica Distrital', 'funcionario', NULL, TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);
INSERT INTO public.users (email, username, name, full_name, dependency, role, phone, ldap_enabled, is_active)
VALUES ('yzrodriguezb@secretariajuridica.gov.co', 'yzrodriguezb', 'YUDY ZULEIMA RODRIGUEZ BLANCO', 'YUDY ZULEIMA RODRIGUEZ BLANCO', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'funcionario', '1756', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET 
    name = COALESCE(public.users.name, EXCLUDED.name),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    dependency = COALESCE(public.users.dependency, EXCLUDED.dependency),
    phone = COALESCE(public.users.phone, EXCLUDED.phone);

-- 4. Celdas de parqueadero (13 Fijas Oficiales + 18 Rotativas Carro + 13 Rotativas Moto)
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('107', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('108', 'fija', 'ocupada', 'ANDRES FELIPE PUENTES DIAZ / MARINA LUZ ORTEGA MONTERO', 'Sótano 2 - Dirección Distrital de Doctrina / Asuntos Disciplinarios', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('apuentesd@secretariajuridica.gov.co') LIMIT 1))
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('109', 'fija', 'ocupada', 'Conductor: EDUARDO ALEJANDRO URREGO BECERRA (Dirección de Gestión Corporativa)', 'Sótano 2 - Dirección de Gestión Corporativa (Vehículo Oficial)', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('eaurregob@secretariajuridica.gov.co') LIMIT 1))
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('110', 'fija', 'ocupada', 'Conductor: LUIS DAUVINY DUARTE ROA (Subsecretaría Jurídica Distrital)', 'Sótano 2 - Subsecretaría Jurídica Distrital (Vehículo Oficial)', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('waburgos@secretariajuridica.gov.co') LIMIT 1))
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('33', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('34', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('35', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('36', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('37', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('38', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('39', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('40', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('41', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('42', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('63', 'fija', 'ocupada', 'Conductor: JAUMI MANFRED MARROQUIN (Despacho Secretaría Jurídica)', 'Sótano 1 - Despacho Secretaría Jurídica (Vehículo Oficial)', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('dahernandez@secretariajuridica.gov.co') LIMIT 1))
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('68', 'fija', 'reservada', 'Dirección de Política e Informática Jurídica', 'Sótano 2 - Asignada a Dirección de Política e Informática Jurídica', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('69', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('70', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('71', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('72', 'fija', 'ocupada', 'ANDRES MAURICIO ORTIZ MAYA', 'Sótano 2 - Dirección Distrital de Gestión Judicial', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('amortizm@secretariajuridica.gov.co') LIMIT 1))
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('73', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('74', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('75', 'fija', 'reservada', 'Oficina Asesora de Planeación', 'Sótano 2 - Oficina Asesora de Planeación', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('76', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('77', 'libre', 'disponible', NULL, 'Sótano 2 - Celda Rotativa (No Fija)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('78', 'fija', 'ocupada', 'CAMILO ALFONSO GUARIN PRIETO', 'Sótano 2 - Dirección Distrital de Inspección, Vigilancia y Control', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('caguarinp@secretariajuridica.gov.co') LIMIT 1))
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('79', 'fija', 'ocupada', 'LEIDY YULIETH PERA RAMIREZ', 'Sótano 2 - Oficina de Control Interno', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('lyperear@secretariajuridica.gov.co') LIMIT 1))
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('80', 'fija', 'ocupada', 'MARIA TATIANA MEJIA', 'Sótano 2 - Despacho Secretaría Jurídica (Personal)', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('mtmejiar@secretariajuridica.gov.co') LIMIT 1))
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('81', 'fija', 'ocupada', 'OSCAR JAVIER SUAREZ RAMOS', 'Sótano 2 - Oficina de Tecnologías de la Información y las Comunicaciones (Motos BMW)', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('ojsuarez@secretariajuridica.gov.co') LIMIT 1))
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('82', 'fija', 'reservada', 'Despacho Secretaría Jurídica - Subsecretaría', 'Sótano 2 - Despacho Subsecretaría', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('83', 'fija', 'ocupada', 'PAOLA GÓMEZ MARTINEZ', 'Sótano 2 - Dirección de Gestión Corporativa', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('pgomezm@secretariajuridica.gov.co') LIMIT 1))
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-01', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 1 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-02', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 2 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-03', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 3 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-04', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 4 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-05', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 5 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-06', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 6 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-07', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 7 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-08', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 8 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-09', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 9 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-10', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 10 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-11', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 11 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-12', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 12 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();
INSERT INTO public.parking_spots (code, spot_type, status, assigned_user_name, notes, assigned_user_id)
VALUES ('M-13', 'libre', 'disponible', NULL, 'Zona de Motos - Cupo Rotativo 13 (No Fijo)', NULL)
ON CONFLICT (code) DO UPDATE SET 
    spot_type = EXCLUDED.spot_type,
    status = EXCLUDED.status,
    assigned_user_name = EXCLUDED.assigned_user_name,
    notes = EXCLUDED.notes,
    assigned_user_id = EXCLUDED.assigned_user_id,
    updated_at = NOW();

-- 5. Vehículos (87 vehículos: oficiales, carros rotativos y motocicletas)
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('AVI-479', 'KIA', 'SORENTO RADICAL', 'Particular', 'LEIDY YULIETH PERA RAMIREZ', '1075208323', 'Oficina de Control Interno', 'Directivo', TRUE, 'aprobado', 'Vehículo Personal 1', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('lyperear@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('79')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('BGE89H', 'Suzuki', 'Gixxer 250', 'Azul mate', 'JORGE ANDRÉS ROJAS PEÑA', '1015393324', 'Dirección de Gestión Corporativa', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección de Gestión Corporativa', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('jarojasp@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('BND 516', 'RENAULT', 'MEGANE', 'GRIS', 'FERNANDO PACHON PIÑEROS', '79567977', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1689', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('fpachon@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('BZP 82H', 'Yamaha', 'Moto', 'Particular', 'JHON ALEXANDER TIBADUISA CASTAÑEDA', '79894605', 'Dirección Distrital de Política e Informática Jurídica', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección Distrital de Política e Informática Jurídica', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('jatibaduisac@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('CCY-467', 'CHEVROLET', 'ZAFIRA', 'Particular', 'JOHANA PATRICIA GAMEZ GOMEZ', '59015269', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1685', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('jpgamezg@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('CXU666', 'Particular', 'Automóvil', 'Particular', 'VICTOR HERNANDO MURILLO', '79361343', 'OFICINA DE CONTROL INTERNO', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('vhernando@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('DBR-147', 'CHEVROLET', 'Automóvil', 'VERDE', 'ALEX CORTES SALGADO', '79138328', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1581', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('acortes@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('DMZ 200', 'CHEVROLET', 'TRACKER', 'ROJO', 'DORA BELEN GUTIERREZ HERNANDEZ', '51649014', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1577', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('dbgutierrezh@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('DOS 520', 'SSANGYONG', 'KORANDO', 'GRIS', 'MAGDA EDITH GUERRERO BONILLA', '23582747', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('meguerrerob@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('DVL-205', 'SUZUKI', 'S-CROSS', 'GRIS', 'LAURA JULIANA ARIZA', NULL, 'DESPACHO SECRETARIA JURIDICA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('ljuliana@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('EJP-399', 'SUZUKI', 'BALENO', 'GRIS', 'ALMA ROSA RAMOS MARIA', '64586540', 'DIRECCIÓN DISTRITAL DE POLITICA E INFORMATICA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1771', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('arramosm@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('EJU-269', 'VOLKSWAGEN', 'Automóvil', 'PLATA', 'SAMUEL ARTURO HERNANDEZ MURCIA', '80022321', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1572', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('sahernandezm@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('EJU 400', 'NISSAN', 'VERSA', 'ROJO', 'DUVAN SANDOVAL RODRIGUEZ', '93371977', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1688', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('dsandoval@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('EMR 672', 'VOLKSWAGEN', 'GOL', 'GRIS', 'NELSON JULIAN SALAZAR URRUTIA', '79569642', 'OFICINA ASESORA DE PLANEACIÓN', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1517', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('njsalazaru@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('EOK311', 'RENAULT', 'LOGAN LITE', 'GRIS', 'MIGUEL ANGEL VARGAS CORDERO', '1121816584', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1660', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('mavargasc@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('FMW 18C', 'Honda', 'CBF 125', 'Particular', 'HELVERT MANUEL MORA MONTOYA', '1015419295', 'Dirección Defensa', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección Defensa', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('hmmoram@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('FYP 969', 'MAZDA', 'Automóvil', 'Particular', 'CAMILO ALFONSO GUARIN PRIETO', '80197320', 'Dirección Distrital de Inspección, Vigilancia y Control', 'Directivo', TRUE, 'aprobado', 'Vehículo Personal 1', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('caguarinp@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('78')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('GBR61F', 'Moto', 'Particular', 'Particular', 'JAINER PRIETO GONZALEZ', '79719290', 'Contrato 472 (Mensajería / Correspondencia)', 'Contratista', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Contrato 472 (Mensajería / Correspondencia)', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('jprieto@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('GBT-893', 'MITSUBISHI', 'Automóvil', 'PLATA', 'DORA RAQUEL BARRERA PALACIO', '1030597508', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1563', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('drbarrerap@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('GDR-992', 'TOYOTA', 'Automóvil', 'Particular', 'ANDRES MAURICIO ORTIZ MAYA', '1015406682', 'Dirección Distrital de Gestión Judicial', 'Directivo', TRUE, 'aprobado', 'Vehículo Personal', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('amortizm@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('72')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('GLW-023', 'BMW', 'X3', 'BLANCO', 'ALVARO ARDILA MORA', '79709902', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1662', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('aardila@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('GWM368', 'VOLKSWAGEN', 'Automóvil', 'GRIS', 'JUAN CARLOS MARTINEZ BERNAL', '1032448684', 'OFICINA ASESORA DE PLANEACIÓN', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1610', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('jcmartinezb@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('HDT-513', 'CHEVROLET', 'TRACKER', 'VINO TINTO', 'MIGUEL PINTO SEGURA', '79584810', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1763', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('mpinto@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('HIS 646', 'RENAULT', 'Automóvil', 'GRIS', 'ANDREA DEL PILAR CARDENAS SARMIENTO', NULL, 'DIRECCIÓN DE ASUNTOS DISCIPLINARIOS', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('adpilarc@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('HKX 468', 'CHEVROLET', 'CAPTIVA', 'NEGRO', 'CARLOS JULIO RAMIREZ MUÑOZ', '80267904', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('cjramirezm@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('IJA 74G', 'VICTORY', 'Moto', 'Particular', 'FREDY ESTEBAN JAIMES CASTILLO', '1030548160', 'Oficina Asesora de Planeación', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Oficina Asesora de Planeación', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('fejaimesc@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('IMT 758', 'RENAULT', 'SANDERO', 'ROJO', 'LUZ ESPERANZA GARCIA CARDONA', '52768137', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('legarciac@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('IPZ 211', 'KIA', 'Automóvil', 'Particular', 'MAGDA PATRICIA PUENTES', '52519358', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('mpatricia@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('IQK-17G', 'Victory', 'Moto', 'Azul', 'MARLY YULY ROJAS LAIDEO', '1098632731', 'Dirección de Gestión Corporativa', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección de Gestión Corporativa', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('myrojasl@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('IXI 27G', 'BMW', 'Moto', 'Particular', 'OSCAR JAVIER SUAREZ RAMOS', '2968815', 'Oficina de las Tecnologías de la Información y las Comunicaciones', 'Directivo', TRUE, 'aprobado', 'Moto BMW 2', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('ojsuarez@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('81')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('IZC 45E', 'Suzuki', 'Gixxer 150', 'Azul', 'ANDRES FABIAN NOSSA GUZMAN', '80826518', 'Dirección Distrital de Inspección, Vigilancia y Control', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección Distrital de Inspección, Vigilancia y Control', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('afabian@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('JBX-115', 'FORD', 'EDGE', 'GRIS', 'CAMILO ANDRES RODRIGUEZ RODRIGUEZ', '79954654', 'DIRECCIÓN DISTRITAL DE POLITICA E INFORMATICA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1768', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('carodriguezr@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('JDR733', 'CHEVROLET', 'TRACKER', 'NEGRO', 'LINA MARCELA MELO RODRIGUEZ', '52033530', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1687', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('lmmelor@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('JFW-870', 'VOLKSWAGEN', 'GOL', 'PLATA', 'GLORIA ESTHER SALCEDO TAMAYO', '28963444', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('gesalcedot@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('JMW-507', 'HYUNDAI', 'ACCENT', 'GRIS', 'SONIA TERESA ROA SILVA', '1018435583', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1657', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('stroas@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('JVR-551', 'Particular', 'Automóvil', 'Particular', 'PAOLA GÓMEZ MARTINEZ', '53082812', 'Dirección de Gestión Corporativa', 'Directivo', TRUE, 'aprobado', 'Vehículo Personal 2', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('pgomezm@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('83')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('JWW545', 'SUZUKI', 'ESPRESSO', 'GRIS', 'MARIA TERESA VALDERRAMA', '41059054', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1749', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('mteresa@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('KXV215', 'MAZDA', 'HIBRIDO', 'ROJO', 'ALVARO CAMILO BERNATE NAVARRO', '79802044', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1648', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('acbernaten@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('KZY186', 'MAZDA', 'CX30', 'ROJO', 'JOSE ORLANDO ALVARADO HERREÑO', '79316619', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1753', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('joalvaradoh@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('LIS-222', 'TOYOTA', 'Camioneta', 'Particular', 'MARIA TATIANA MEJIA', '1121857540', 'Despacho Secretaría Jurídica', 'Funcionario', TRUE, 'aprobado', 'Vehículo Personal', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('mtmejiar@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('80')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('LMS655', 'SUZUKI', 'SWIFT', 'AZUL Y NEGRO', 'CAROLINA LOZANO ARDILA', '52454621', 'OFICINA DE CONTROL INTERNO', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1622', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('clozano@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('LOP-093', 'NISSAN', 'VERSA 2024', 'NEGRO', 'NELCY TORRES MARTINEZ', '40011063', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1645', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('ntorres@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('LOR-941', 'MAZDA', 'HIBRIDO', 'ROJO', 'LUZ ESTELLA MORENO PEREZ', '52868519', 'DESPACHO SECRETARIA JURIDICA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1500', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('lemorenop@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('LOY-864', 'TOYOTA', 'Automóvil', 'GRIS', 'JENIFFER GUTIERREZ GUTIERREZ', '53066719', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1758', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('jgutierrez@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('LYM260', 'TOYOTA', 'Automóvil', 'GRIS', 'EURANIO JOSE MANOTAS MALDINADO', '8526853', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('ejmanotasm@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('MBQ-121', 'NISSAN', 'MARCH', 'ROJO', 'IVAN DAVID RAMIREZ VALENCIA', '16077540', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1758', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('idramirezv@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('MFA 54E', 'Yamaha', 'Moto', 'Gris Blanca', 'DANIEL FERNANDO BUITRAGO DIAZ', '1072493406', 'Dirección de Doctrina', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección de Doctrina', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('dfbuitragod@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('MGZ841', 'HYUNDAI', 'Automóvil', 'NEGRO', 'DONALDO YAMITH ZABALETA TABOADA', '1064976255', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1648', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('dyzabaletat@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('MKV835', 'BMW', 'Automóvil', 'BLANCO', 'MARIA XIMENA CUBIDES AMAYA', '52818411', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1685', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('mxcubidesa@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('MKY-153', 'RENAULT', 'SANDERO', 'BEIGE', 'CHEILA ALEXANDRA ALVARADO ROJAS', '52337438', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1569', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('caalvarador@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('MKZ381', 'KIA', 'SPORTAGE', 'AZUL', 'YUDY ZULEIMA RODRIGUEZ BLANCO', '52380066', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1756', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('yzrodriguezb@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('MLK69C', 'Yamaha', 'Moto', 'Negro', 'EDUARDO ALEJANDRO URREGO BECERRA', '80100027', 'Dirección de Gestión Corporativa', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección de Gestión Corporativa', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('eaurregob@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('MTZ 60E', 'BMW', 'Moto', 'Particular', 'OSCAR JAVIER SUAREZ RAMOS', '2968815', 'Oficina de las Tecnologías de la Información y las Comunicaciones', 'Directivo', TRUE, 'aprobado', 'Moto BMW 1', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('ojsuarez@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('81')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('MYN-584', 'MAZDA', '2', 'ROJO', 'JUAN DIEGO ACOSTA TORRES', '1085338624', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1645', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('jdacostat@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('NCT 246', 'CHEVROLET', 'SPARK GT', 'PLATA', 'DORIS SILVA GARCIA', '52557124', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1667', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('dsilva@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('NEM-455', 'VOLKSWAGEN', 'JETTA', 'GRIS', 'LUIS CARLOS GAONA FARIAS', '1022362951', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1575', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('lcgaonaf@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('NPV58G', 'Yamaha', 'Moto', 'Negro', 'JOAN SEBASTIAN FLECHAS ALONSO', '1010176886', 'Dirección Distrital de Política e Informática Jurídica', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección Distrital de Política e Informática Jurídica', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('jsflechasa@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('NPZ-730', 'BYD', 'HIBRIDO', 'ROJO', 'BRICEIDA ALVARADO ROJAS', '60348229', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1567', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('balvarado@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('NSQ061', 'TOYOTA', 'Automóvil', 'BLANCO', 'CRISTHIAM DAVID JIMENEZ VASQUEZ', '1110573560', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1647', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('cdjimenezv@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('NXN65G', 'Husqvarna', 'Moto', 'Particular', 'DIEGO ALEJANDRO SOLANO', '1010058729', 'Dirección Defensa', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección Defensa', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('dalejandro@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('OLO 452', 'Nissan', 'Kicks', 'Oficial', 'Conductor: JAUMI MANFRED MARROQUIN', '79769334', 'Despacho Secretaría Jurídica', 'Vehículo Oficial', TRUE, 'aprobado', 'Vehículo Oficial Secretaría Jurídica', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('dahernandez@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('63')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('OLO 453', 'Nissan', 'Kicks', 'Oficial', 'Conductor: EDUARDO ALEJANDRO URREGO BECERRA', '80100027', 'Dirección de Gestión Corporativa', 'Vehículo Oficial', TRUE, 'aprobado', 'Vehículo Oficial Gestión Corporativa', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('eaurregob@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('109')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('OLO 454', 'Nissan', 'Kicks', 'Oficial', 'Conductor: LUIS DAUVINY DUARTE ROA', '79417068', 'Subsecretaría Jurídica Distrital', 'Vehículo Oficial', TRUE, 'aprobado', 'Vehículo Oficial Subsecretaría', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('waburgos@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('110')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('OPG19C', 'SUZUKI', 'Moto', 'Negro', 'OSCAR FRANCISCO CELIS BERNA', '11446004', 'Oficina de Control Interno', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Oficina de Control Interno', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('ofcelisb@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('PDW-097', 'MG', 'Automóvil', 'PLATA', 'HENRY ALBERTO GONZALEZ MOLINA', '79450267', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1656', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('hagonzalezm@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('PGM-621', 'ELECTRICO', 'Automóvil', 'BLANCO', 'PEDRO ALFONSO MEJIA SIERRA', '79575101', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1566', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('pamejias@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('PHO-169', 'BYD', 'ELECTRICO', 'BLANCO', 'MARTHA LILIANA BARRERA DIAZ', '51937185', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1579', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('mlbarrerad@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('PXN 655', 'RENAULT', 'Blanco', 'Blanco', 'ANDRES FELIPE PUENTES DIAZ', '1098810694', 'Dirección Distrital de Doctrina', 'Directivo', TRUE, 'aprobado', 'Vehículo Personal - Dirección de Doctrina', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('apuentesd@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('108')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('PZN-763', 'TOYOTA', 'Automóvil', 'BLANCO', 'LUZ DARY MERCHAN LARA', '52176512', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1770', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('ldmerchanl@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('QPT 002', 'Particular', 'Automóvil', 'Particular', 'LEIDY YULIETH PERA RAMIREZ', '1075208323', 'Oficina de Control Interno', 'Directivo', TRUE, 'aprobado', 'Vehículo Personal 2', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('lyperear@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('79')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('QPT 481', 'Particular', 'Automóvil', 'Particular', 'CAMILO ALFONSO GUARIN PRIETO', '80197320', 'Dirección Distrital de Inspección, Vigilancia y Control', 'Directivo', TRUE, 'aprobado', 'Vehículo Personal 2', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('caguarinp@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('78')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('RCN 822', 'KIA', 'RIO XCITE', 'GRIS', 'ADRIANA PATRICIA RAMIREZ BAUTISTA', '52542976', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1630', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('apramirezb@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('RCT-278', 'NISSAN', 'TIIDA', 'BEIGE', 'GLORIA INES MARTINEZ ORTIZ', '52171949', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1573', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('gimartinezo@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('RGQ 584', 'PEUGEOT', 'Automóvil', 'NEGRO', 'OCTAVIO QUINTERO LARA', '19444915', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1752', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('oquintero@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('RKQ-273', 'CHEVROLET', 'SPARK GT', 'NEGRO', 'DAVID ALEJANDRO MORA BERMUDEZ', '1032479676', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1759', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('damorab@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('SXW24F', 'Moto', 'Particular', 'Particular', 'JORGE ELIECER CAMACHO', '79622479', 'Contrato 472 (Mensajería / Correspondencia)', 'Contratista', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Contrato 472 (Mensajería / Correspondencia)', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('jeliecer@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('TVV30E', 'KYMCO', 'Moto', 'Particular', 'OLGA LILIANA LONDOÑO GARCIA', '1012339868', 'Dirección de Gestión Corporativa', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección de Gestión Corporativa', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('ollondonog@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('URS-165', 'RENAULT', 'DUSTER', 'NEGRO', 'LUIS ALFONSO CASTIBLANCO URQUIJO', '3085860', 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1673', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('lacastiblancou@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('URT165', 'MAZDA', '3', 'Rojo', 'Hugo Hernando Aguirre Corrales', '75093516', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('hhaguirrec@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('VPQ-17E', 'Suzuki', 'Gixxer 150', 'Azul', 'LIZETH MAYERLY VILLARRAGA ROJAS', '1015409873', 'Subsecretaría Jurídica Distrital', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Subsecretaría Jurídica Distrital', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('lmvillarragar@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('XDW81F', 'AUTECO', 'Moto', 'Particular', 'JENNIFER LIZBETH GOMEZ AREVALO', '1030618681', 'Dirección Defensa', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección Defensa', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('jlgomeza@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('YDT03F', 'Moto', 'Particular', 'Particular', 'DAVID FERNANDO VELASQUEZ', '1010224644', 'Contrato 472 (Mensajería / Correspondencia)', 'Contratista', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Contrato 472 (Mensajería / Correspondencia)', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('dfernando@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('YPW52H', 'Yamaha', 'Moto', 'Gris-negro', 'NICOLAS SANTIAGO SOTO', '1020837889', 'Dirección Distrital de Inspección, Vigilancia y Control', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Dirección Distrital de Inspección, Vigilancia y Control', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('nsantiago@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('ZDA63G', 'Bajaj', 'Moto', 'Gris piedra', 'GERMAN ALBERTO PULIDO', '80222680', 'Subsecretaría Jurídica Distrital', 'Funcionario', TRUE, 'aprobado', 'Moto Rotativa / No Fija - Subsecretaría Jurídica Distrital', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('galberto@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('ZYO 048', 'CHEVROLET', 'TRACKER', 'GRIS', 'ADDILY JOHANNA CALA CASTRO', '53166058', 'DIRECCIÓN DE GESTIÓN CORPORATIVA', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo - Ext: 1568', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('ajcalac@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('ZZK-608', 'FORD', 'Camioneta', 'Particular', 'PAOLA GÓMEZ MARTINEZ', '53082812', 'Dirección de Gestión Corporativa', 'Directivo', TRUE, 'aprobado', 'Vehículo Personal 1', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('pgomezm@secretariajuridica.gov.co') LIMIT 1), (SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM('83')) LIMIT 1))
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();
INSERT INTO public.user_vehicles (plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, notes, user_id, assigned_spot_id)
VALUES ('ZZM-146', 'CHEVROLET', 'Automóvil', 'NEGRO', 'SANDRA NICOLASA ORGANISTA BUILES', '52646082', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', 'Funcionario', TRUE, 'aprobado', 'Parqueadero Rotativo / No Fijo', (SELECT id FROM public.users WHERE LOWER(email) = LOWER('snorganistab@secretariajuridica.gov.co') LIMIT 1), NULL)
ON CONFLICT (plate) DO UPDATE SET 
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    name = EXCLUDED.name,
    doc = EXCLUDED.doc,
    dependency = EXCLUDED.dependency,
    charge = EXCLUDED.charge,
    is_active = TRUE,
    approval_status = 'aprobado',
    notes = EXCLUDED.notes,
    user_id = COALESCE(EXCLUDED.user_id, public.user_vehicles.user_id),
    assigned_spot_id = EXCLUDED.assigned_spot_id,
    updated_at = NOW();

COMMIT;

