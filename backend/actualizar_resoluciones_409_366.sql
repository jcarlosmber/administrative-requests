-- ==============================================================================
-- ACTUALIZACIÓN OFICIAL DE RESOLUCIONES Y ASIGNACIONES (SASGE 2.0)
-- Generado a partir de:
-- - Resolución No. 117 de 2026 (Política Marco)
-- - Resolución No. 201 de 2026 (Suspendida)
-- - Resolución No. 366 de 2026 (Teletrabajo Autónomo)
-- - Resolución No. 409 de 2026 (Trabajo en Casa 5x5 y Teletrabajo Híbrido)
-- ==============================================================================

BEGIN;

-- 1. REGISTRAR O ACTUALIZAR LAS 4 RESOLUCIONES
INSERT INTO public.teletrabajo_resoluciones (
    id, numero_resolucion, anio, fecha_expedicion, fecha_inicio_vigencia, fecha_fin_vigencia, 
    descripcion, modalidad_principal, estado, created_at, updated_at
) VALUES 
('11700000-0000-0000-0000-000000002026', 'Resolución No. 117 de 2026', 2026, '2026-03-10', '2026-03-10', '2027-03-10', 'Por la cual se adopta la política interna de teletrabajo en la Secretaría Jurídica Distrital.', 'TELETRABAJO', 'VIGENTE', NOW(), NOW()),
('20100000-0000-0000-0000-000000002026', 'Resolución No. 201 de 2026', 2026, '2026-05-04', '2026-05-04', '2026-09-14', 'Por la cual se autoriza la modalidad de teletrabajo a unos/as servidores/as públicos/as de la Secretaría Jurídica Distrital (Efectos suspendidos por Resolución No. 409 de 2026).', 'TELETRABAJO', 'DEROGADA', NOW(), NOW()),
('36600000-0000-0000-0000-000000002026', 'Resolución No. 366 de 2026', 2026, '2026-08-20', '2026-08-20', '2027-02-20', 'Por la cual se autoriza la modalidad de teletrabajo autónomo a la servidora pública Rosa Isabel Sierra Laborde de la Dirección Distrital de Política Jurídica por el término de seis (6) meses.', 'TELETRABAJO', 'VIGENTE', NOW(), NOW()),
('40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026', 2026, '2026-09-14', '2026-09-15', '2026-12-14', 'Por la cual se suspende temporalmente la Resolución No. 201 de 2026, se habilita temporalmente el trabajo en casa (5x5) a servidores/as públicos/as con ocasión de las obras en el Edificio Bicentenario II, y se autoriza la modalidad de teletrabajo híbrido a servidores/as públicos/as de la entidad.', 'TRABAJO_EN_CASA', 'VIGENTE', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    numero_resolucion = EXCLUDED.numero_resolucion,
    fecha_expedicion = EXCLUDED.fecha_expedicion,
    fecha_inicio_vigencia = EXCLUDED.fecha_inicio_vigencia,
    fecha_fin_vigencia = EXCLUDED.fecha_fin_vigencia,
    descripcion = EXCLUDED.descripcion,
    modalidad_principal = EXCLUDED.modalidad_principal,
    estado = EXCLUDED.estado,
    updated_at = NOW();

-- 2. SUSPENDER / REVOCAR EFECTOS DE LA RESOLUCIÓN 201 DE 2026
UPDATE public.teletrabajo_asignaciones 
SET estado = 'REVOCADO', 
    observaciones = COALESCE(observaciones, '') || ' [Suspendida a partir del 15-sep-2026 por Art. 1 Res. 409/2026]',
    updated_at = NOW()
WHERE estado = 'ACTIVO' AND (numero_resolucion_display LIKE '%201%' OR resolucion_id = '20100000-0000-0000-0000-000000002026');

-- 3. REVOCAR ASIGNACIONES PREVIAS DE SERVIDORES ESTRICTAMENTE PRESENCIALES (ART. 4 RES. 409)
UPDATE public.teletrabajo_asignaciones 
SET estado = 'REVOCADO', 
    observaciones = COALESCE(observaciones, '') || ' [Prestación presencial obligatoria conforme al Art. 4 de la Resolución No. 409 de 2026]',
    updated_at = NOW()
WHERE estado = 'ACTIVO' AND REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') IN (
    '51882380', '79048737', '79417068', '79769334', '80100027',
    '1075256570', '41732503', '53165390', '79431243', '1030548160',
    '1033718483', '79349710', '52827794', '42163264', '35415925',
    '1015419295', '1193101660', '1098632731', '1030572725', '52176286'
);

-- 4. INSERTAR ASIGNACIONES DE TRABAJO EN CASA 5X5 (ART. 2 RES. 409)

-- LUZ ESTELLA MORENO PÉREZ (52868519)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52868519' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52868519', 'LUZ ESTELLA MORENO PÉREZ', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DESPACHO SECRETARÍA JURÍDICA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- GLORIA SALCEDO TAMAYO (28963444)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '28963444' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '28963444', 'GLORIA SALCEDO TAMAYO', 'PROFESIONAL ESPECIALIZADO', '222', '24', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- HUGO HERNANDO AGUIRRE CORRALES (75093516)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '75093516' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '75093516', 'HUGO HERNANDO AGUIRRE CORRALES', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ANGELA MARCELA RODRIGUEZ DIAZ (42161948)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '42161948' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '42161948', 'ANGELA MARCELA RODRIGUEZ DIAZ', 'PROFESIONAL ESPECIALIZADO', '222', '26', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ALEJANDRA NATALY CASALLAS MARTINEZ (1015425376)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1015425376' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1015425376', 'ALEJANDRA NATALY CASALLAS MARTINEZ', 'PROFESIONAL UNIVERSITARIO', '219', '10', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- DORA BELÉN GUTIERREZ HERNÁNDEZ (51649014)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '51649014' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '51649014', 'DORA BELÉN GUTIERREZ HERNÁNDEZ', 'PROFESIONAL ESPECIALIZADO', '222', '21', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- JUAN CARLOS MARTINEZ BERNAL (1032448684)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1032448684' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1032448684', 'JUAN CARLOS MARTINEZ BERNAL', 'PROFESIONAL UNIVERSITARIO', '219', '10', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- LUZ DARY CORREDOR MORENO (52174173)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52174173' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52174173', 'LUZ DARY CORREDOR MORENO', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ADRIANA PATRICIA GUZMÁN CONTRERAS (52282454)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52282454' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52282454', 'ADRIANA PATRICIA GUZMÁN CONTRERAS', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- NELSON JULIAN SALAZAR URRUTIA (79569642)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79569642' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79569642', 'NELSON JULIAN SALAZAR URRUTIA', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- YOMAIRA AMPARO ALARCÓN ACERO (52391785)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52391785' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52391785', 'YOMAIRA AMPARO ALARCÓN ACERO', 'PROFESIONAL ESPECIALIZADO', '222', '21', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- BRICEIDA ALVARADO ROJAS (60348229)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '60348229' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '60348229', 'BRICEIDA ALVARADO ROJAS', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- PEDRO ALFONSO MEJIA SIERRA (79575101)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79575101' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79575101', 'PEDRO ALFONSO MEJIA SIERRA', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- SAMUEL ARTURO HERNANDEZ MURCIA (80022321)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '80022321' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '80022321', 'SAMUEL ARTURO HERNANDEZ MURCIA', 'PROFESIONAL ESPECIALIZADO', '222', '21', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- JHON ALEXANDER TIBADUIZA CASTAÑEDA (79894605)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79894605' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79894605', 'JHON ALEXANDER TIBADUIZA CASTAÑEDA', 'PROFESIONAL UNIVERSITARIO', '219', '01', 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- SONIA TERESA ROA SILVA (1018435583)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1018435583' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1018435583', 'SONIA TERESA ROA SILVA', 'PROFESIONAL ESPECIALIZADO', '222', '22', 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- DIANA MARIA MORENO VARGAS (53001416)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '53001416' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '53001416', 'DIANA MARIA MORENO VARGAS', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- CRISTHIAM DAVID JIMENEZ VASQUEZ (1110573560)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1110573560' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1110573560', 'CRISTHIAM DAVID JIMENEZ VASQUEZ', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- MARY DAYANA SANCHEZ ROJAS (37625914)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '37625914' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '37625914', 'MARY DAYANA SANCHEZ ROJAS', 'PROFESIONAL UNIVERSITARIO', '219', '13', 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ROSA ISABEL SIERRA LABORDE (22446641)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '22446641' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '22446641', 'ROSA ISABEL SIERRA LABORDE', 'PROFESIONAL UNIVERSITARIO', '219', '03', 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ALEXANDRA AVILA MARIN (30333406)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '30333406' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '30333406', 'ALEXANDRA AVILA MARIN', 'PROFESIONAL UNIVERSITARIO', '219', '01', 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- JOAN SEBASTIAN FLECHAS ALONSO (1010176886)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1010176886' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1010176886', 'JOAN SEBASTIAN FLECHAS ALONSO', 'TÉCNICO OPERATIVO', '314', '15', 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ELVIRA LILIANA HERNANDEZ LIBREROS (52363895)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52363895' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52363895', 'ELVIRA LILIANA HERNANDEZ LIBREROS', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- MARIA CAMILA COTAMO JAIMES (52146157)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52146157' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52146157', 'MARIA CAMILA COTAMO JAIMES', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- LINA MARCELA MELO RODRIGUEZ (52033530)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52033530' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52033530', 'LINA MARCELA MELO RODRIGUEZ', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ZULMA ROJAS SUAREZ (24179106)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '24179106' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '24179106', 'ZULMA ROJAS SUAREZ', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- LUZ ANDREA CUBILLOS GUALDRON (52430229)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52430229' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52430229', 'LUZ ANDREA CUBILLOS GUALDRON', 'PROFESIONAL ESPECIALIZADO', '222', '24', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- JOHANA PATRICIA GAMEZ GOMEZ (53015269)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '53015269' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '53015269', 'JOHANA PATRICIA GAMEZ GOMEZ', 'PROFESIONAL ESPECIALIZADO', '222', '24', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- DIEGO ALEJANDRO SOLANO FERNANDEZ (1019058729)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1019058729' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1019058729', 'DIEGO ALEJANDRO SOLANO FERNANDEZ', 'PROFESIONAL ESPECIALIZADO', '222', '24', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- MARIA XIMENA CUBIDES AMAYA (52818411)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52818411' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52818411', 'MARIA XIMENA CUBIDES AMAYA', 'PROFESIONAL ESPECIALIZADO', '222', '21', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ANGELICA DIAZ RINCON (52258032)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52258032' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52258032', 'ANGELICA DIAZ RINCON', 'PROFESIONAL ESPECIALIZADO', '222', '19', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- CLAUDIA MARCELA CAMARGO CASTRO (52486713)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52486713' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52486713', 'CLAUDIA MARCELA CAMARGO CASTRO', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- CARLOS JULIO RAMIREZ MUÑOZ (80267904)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '80267904' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '80267904', 'CARLOS JULIO RAMIREZ MUÑOZ', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- DUVAN SANDOVAL RODRIGUEZ (93371977)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '93371977' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '93371977', 'DUVAN SANDOVAL RODRIGUEZ', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- JORGE ELIECER HERNANDEZ ALBARRACIN (19347862)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '19347862' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '19347862', 'JORGE ELIECER HERNANDEZ ALBARRACIN', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- MARTHA LILIANA BARRERA DIAZ (51937185)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '51937185' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '51937185', 'MARTHA LILIANA BARRERA DIAZ', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- YUDY ZULEYMA RODRIGUEZ BLANCO (52380066)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52380066' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52380066', 'YUDY ZULEYMA RODRIGUEZ BLANCO', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- OCTAVIO QUINTERO LARA (19444915)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '19444915' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '19444915', 'OCTAVIO QUINTERO LARA', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- CAMILO ANDRES RODRIGUEZ RODRÍGUEZ (79954654)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79954654' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79954654', 'CAMILO ANDRES RODRIGUEZ RODRÍGUEZ', 'PROFESIONAL ESPECIALIZADO', '222', '25', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- JOSE ORLANDO ALVARADO HERREÑO (79316619)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79316619' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79316619', 'JOSE ORLANDO ALVARADO HERREÑO', 'PROFESIONAL ESPECIALIZADO', '222', '24', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- LUZ DARY MERCHAN LARA (52176512)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52176512' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52176512', 'LUZ DARY MERCHAN LARA', 'PROFESIONAL ESPECIALIZADO', '222', '21', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- LEIDY VANESSA NIETO ROJAS (1010213468)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1010213468' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1010213468', 'LEIDY VANESSA NIETO ROJAS', 'PROFESIONAL ESPECIALIZADO', '222', '19', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- HUGO ALFONSO CABARCAS AYOLA (8980601)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '8980601' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '8980601', 'HUGO ALFONSO CABARCAS AYOLA', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- MONICA JULIANA SANMIGUEL ROJAS (1013608357)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1013608357' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1013608357', 'MONICA JULIANA SANMIGUEL ROJAS', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- MIGUEL PINTO SEGURA (79584810)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79584810' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79584810', 'MIGUEL PINTO SEGURA', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- FERNAN ENRIQUE PEREZ FORTICH (73155098)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '73155098' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '73155098', 'FERNAN ENRIQUE PEREZ FORTICH', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- IVAN DAVID RAMIREZ VALENCIA (16077540)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '16077540' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '16077540', 'IVAN DAVID RAMIREZ VALENCIA', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- SANDRA NICOLASA ORGANISTA BUILES (52646082)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52646082' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52646082', 'SANDRA NICOLASA ORGANISTA BUILES', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ANDRES FABIAN NOSSA GUZMAN (80826518)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '80826518' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '80826518', 'ANDRES FABIAN NOSSA GUZMAN', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- JUAN CAMILO RUIZ ZAMUDIO (80154878)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '80154878' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '80154878', 'JUAN CAMILO RUIZ ZAMUDIO', 'PROFESIONAL UNIVERSITARIO', '219', '15', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ELIANA STEPHANIE ASTAIZA CHAVES (1085273461)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1085273461' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1085273461', 'ELIANA STEPHANIE ASTAIZA CHAVES', 'PROFESIONAL UNIVERSITARIO', '219', '15', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- MAGDA PATRICIA PUENTES PARDO (52519358)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52519358' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52519358', 'MAGDA PATRICIA PUENTES PARDO', 'PROFESIONAL UNIVERSITARIO', '219', '15', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- DAVID ALEJANDRO MORA BERMUDEZ (1032479676)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1032479676' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1032479676', 'DAVID ALEJANDRO MORA BERMUDEZ', 'PROFESIONAL UNIVERSITARIO', '219', '01', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- JOSE JAVIER PINTO CASTAÑEDA (79296576)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79296576' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79296576', 'JOSE JAVIER PINTO CASTAÑEDA', 'PROFESIONAL UNIVERSITARIO', '219', '01', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- NICOLAS SANTIAGO SOTO ALBA (1020837889)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1020837889' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1020837889', 'NICOLAS SANTIAGO SOTO ALBA', 'PROFESIONAL UNIVERSITARIO', '219', '01', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- DALIDA VILLANUEVA SANCHEZ (52151785)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52151785' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52151785', 'DALIDA VILLANUEVA SANCHEZ', 'PROFESIONAL UNIVERSITARIO', '219', '01', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- LUIS ALFONSO CASTIBLANCO URQUIJO (3085860)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '3085860' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '3085860', 'LUIS ALFONSO CASTIBLANCO URQUIJO', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ALVARO ARDILA MORA (79709902)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79709902' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79709902', 'ALVARO ARDILA MORA', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ALVARO CAMILO BERNATE NAVARRO (79802044)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79802044' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79802044', 'ALVARO CAMILO BERNATE NAVARRO', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- MARTHA YANETH ORTIZ LEON (46677766)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '46677766' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '46677766', 'MARTHA YANETH ORTIZ LEON', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- MAGDA EDITH GUERRERO BONILLA (23582747)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '23582747' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '23582747', 'MAGDA EDITH GUERRERO BONILLA', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- FERNANDO PACHON PIÑEROS (79567977)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79567977' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79567977', 'FERNANDO PACHON PIÑEROS', 'PROFESIONAL ESPECIALIZADO', '222', '26', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- HENRY ALBERTO GONZALEZ MOLINA (79450267)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79450267' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79450267', 'HENRY ALBERTO GONZALEZ MOLINA', 'PROFESIONAL ESPECIALIZADO', '222', '21', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- CARLOS ANDRES NIÑO SOCHA (6765913)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '6765913' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '6765913', 'CARLOS ANDRES NIÑO SOCHA', 'PROFESIONAL ESPECIALIZADO', '222', '20', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- EURANIO JOSE MANOTAS MALDONADO (8526853)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '8526853' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '8526853', 'EURANIO JOSE MANOTAS MALDONADO', 'PROFESIONAL ESPECIALIZADO', '222', '20', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- LUISA FERNANDA GARCIA AVILA (53122985)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '53122985' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '53122985', 'LUISA FERNANDA GARCIA AVILA', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- SANDRA LISETTE NOVOA DUEÑAS (1049619617)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1049619617' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1049619617', 'SANDRA LISETTE NOVOA DUEÑAS', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- KATHERINE PAOLA ARAGON CASTIBLANCO (1030577699)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1030577699' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1030577699', 'KATHERINE PAOLA ARAGON CASTIBLANCO', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- NELCY TORRES MARTINEZ (40011063)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '40011063' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '40011063', 'NELCY TORRES MARTINEZ', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- LEIDY JOHANNA ALONSO GUTIERREZ (1032489040)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1032489040' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1032489040', 'LEIDY JOHANNA ALONSO GUTIERREZ', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- CAROLINA ANAYA SARMIENTO (28488940)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '28488940' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '28488940', 'CAROLINA ANAYA SARMIENTO', 'PROFESIONAL UNIVERSITARIO', '219', '01', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- JUAN DIEGO ACOSTA TORRES (1085338624)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1085338624' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1085338624', 'JUAN DIEGO ACOSTA TORRES', 'TÉCNICO OPERATIVO', '314', '15', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- JEFFERSON JOSE OSUNA BERRIO (1005488395)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1005488395' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1005488395', 'JEFFERSON JOSE OSUNA BERRIO', 'TÉCNICO OPERATIVO', '314', '15', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ESTEBAN RAMIREZ CARDENAS (1015438831)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1015438831' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1015438831', 'ESTEBAN RAMIREZ CARDENAS', 'TÉCNICO OPERATIVO', '314', '15', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- DIANA YURANY MARTINEZ MARTINEZ (1001170136)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1001170136' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1001170136', 'DIANA YURANY MARTINEZ MARTINEZ', 'TÉCNICO OPERATIVO', '314', '15', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ALVARO FELIPE ALEJO CASTIBLANCO (1024566898)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1024566898' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1024566898', 'ALVARO FELIPE ALEJO CASTIBLANCO', 'TÉCNICO OPERATIVO', '314', '09', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- CHEILA ALEXANDRA ALVARADO ROJAS (52337438)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52337438' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52337438', 'CHEILA ALEXANDRA ALVARADO ROJAS', 'PROFESIONAL ESPECIALIZADO', '222', '21', 'OFICINA ASESORA DE PLANEACIÓN',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- MARIA TERESA VALDERRAMA PEREIRA (41059054)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '41059054' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '41059054', 'MARIA TERESA VALDERRAMA PEREIRA', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'OFICINA ASESORA DE PLANEACIÓN',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ESTHER PINILLA SERRANO (28496885)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '28496885' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '28496885', 'ESTHER PINILLA SERRANO', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'SUBSECRETARÍA JURÍDICA DISTRITAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- RUBEN DARIO GALLEGO GONZALEZ (80850931)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '80850931' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '80850931', 'RUBEN DARIO GALLEGO GONZALEZ', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'SUBSECRETARÍA JURÍDICA DISTRITAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- ALEX CORTES SALGADO (79138328)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79138328' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79138328', 'ALEX CORTES SALGADO', 'AUXILIAR ADMINISTRATIVO', '407', '20', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- JUAN ANDRÉS GUERRERO RAMOS (1014976247)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1014976247' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1014976247', 'JUAN ANDRÉS GUERRERO RAMOS', 'TÉCNICO OPERATIVO', '314', '15', 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- OSCAR ERNESTO LOPEZ ACUÑA (79262614)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79262614' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79262614', 'OSCAR ERNESTO LOPEZ ACUÑA', 'AUXILIAR ADMINISTRATIVO', '407', '14', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- LUIS CARLOS GAONA FARIAS (1022362951)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1022362951' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1022362951', 'LUIS CARLOS GAONA FARIAS', 'PROFESIONAL UNIVERSITARIO', '219', '08', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);

-- 5. INSERTAR ASIGNACIONES DE TELETRABAJO HÍBRIDO (ART. 3 RES. 409)

-- GIOVANNY ALEXANDER CORTES PACHON (79967554)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79967554' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79967554', 'GIOVANNY ALEXANDER CORTES PACHON', 'PROFESIONAL UNIVERSITARIO', '219', '18', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 4, '[]'::jsonb,
    'ACTIVO', 'Esquema 1*4 (1 día en oficina, 4 días de teletrabajo).'
);

-- MARTHA RUBIELA CRUZ PARDO (52277284)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52277284' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52277284', 'MARTHA RUBIELA CRUZ PARDO', 'TÉCNICO OPERATIVO', '314', '20', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 3, '[]'::jsonb,
    'ACTIVO', 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).'
);

-- ANDREA DEL PILAR CARDENAS SARMIENTO (52429411)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52429411' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52429411', 'ANDREA DEL PILAR CARDENAS SARMIENTO', 'PROFESIONAL ESPECIALIZADO', '222', '19', 'DIRECCIÓN DISTRITAL DE ASUNTOS DISCIPLINARIOS',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 3, '[]'::jsonb,
    'ACTIVO', 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).'
);

-- DANIELA RODRIGUEZ NARVAEZ (1018482333)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1018482333' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1018482333', 'DANIELA RODRIGUEZ NARVAEZ', 'PROFESIONAL UNIVERSITARIO', '219', '15', 'DIRECCIÓN DISTRITAL DE ASUNTOS DISCIPLINARIOS',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 3, '[]'::jsonb,
    'ACTIVO', 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).'
);

-- CAROLINA LOZANO ARDILA (52454621)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52454621' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52454621', 'CAROLINA LOZANO ARDILA', 'PROFESIONAL ESPECIALIZADO', '222', '24', 'OFICINA DE CONTROL INTERNO',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 3, '[]'::jsonb,
    'ACTIVO', 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).'
);

-- VICTOR HERNANDO MURILLO HURTADO (79361343)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79361343' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79361343', 'VICTOR HERNANDO MURILLO HURTADO', 'PROFESIONAL UNIVERSITARIO', '219', '13', 'OFICINA DE CONTROL INTERNO',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 3, '[]'::jsonb,
    'ACTIVO', 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).'
);

-- GLORIA INES MARTINEZ ORTIZ (52171949)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52171949' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52171949', 'GLORIA INES MARTINEZ ORTIZ', 'PROFESIONAL UNIVERSITARIO', '219', '10', 'OFICINA DE CONTROL INTERNO',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 3, '[]'::jsonb,
    'ACTIVO', 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).'
);

-- ZULY NATALIA NANDAR CASTAÑEDA (33368317)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '33368317' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '33368317', 'ZULY NATALIA NANDAR CASTAÑEDA', 'SECRETARIO', '440', '09', 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 2, '[]'::jsonb,
    'ACTIVO', 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).'
);

-- AZULA URIBE CABALLERO (51961579)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '51961579' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '51961579', 'AZULA URIBE CABALLERO', 'TÉCNICO OPERATIVO', '314', '20', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 2, '[]'::jsonb,
    'ACTIVO', 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).'
);

-- IAM ALEXANDER OJEDA CARDENAS (86058268)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '86058268' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '86058268', 'IAM ALEXANDER OJEDA CARDENAS', 'PROFESIONAL ESPECIALIZADO', '222', '24', 'OFICINA DE LAS TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 2, '[]'::jsonb,
    'ACTIVO', 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).'
);

-- JEIMMY JOHANNA PAEZ GIL (1136880003)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1136880003' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1136880003', 'JEIMMY JOHANNA PAEZ GIL', 'PROFESIONAL UNIVERSITARIO', '219', '08', 'OFICINA DE LAS TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 2, '[]'::jsonb,
    'ACTIVO', 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).'
);

-- DEYSI YANIRA MORENO GUERRERO (52236487)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52236487' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52236487', 'DEYSI YANIRA MORENO GUERRERO', 'PROFESIONAL ESPECIALIZADO', '222', '27', 'DIRECCIÓN DISTRITAL DE ASUNTOS DISCIPLINARIOS',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 2, '[]'::jsonb,
    'ACTIVO', 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).'
);

-- OLGA LILIANA LONDOÑO GARCIA (1012339868)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1012339868' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1012339868', 'OLGA LILIANA LONDOÑO GARCIA', 'AUXILIAR ADMINISTRATIVO', '407', '26', 'DIRECCIÓN DISTRITAL DE ASUNTOS DISCIPLINARIOS',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 2, '[]'::jsonb,
    'ACTIVO', 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).'
);

-- ADRIANA PATRICIA RAMIREZ BAUTISTA (52542976)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52542976' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52542976', 'ADRIANA PATRICIA RAMIREZ BAUTISTA', 'SECRETARIO EJECUTIVO', '425', '24', 'OFICINA DE LAS TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 1, '[]'::jsonb,
    'ACTIVO', 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).'
);

-- MILDRED PAOLA ARDILA VERGARA (52235989)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52235989' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52235989', 'MILDRED PAOLA ARDILA VERGARA', 'AUXILIAR ADMINISTRATIVO', '407', '27', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 1, '[]'::jsonb,
    'ACTIVO', 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).'
);

-- EDGAR ANDRES GARCIA GARAVITO (79468462)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79468462' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79468462', 'EDGAR ANDRES GARCIA GARAVITO', 'AUXILIAR ADMINISTRATIVO', '407', '11', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 1, '[]'::jsonb,
    'ACTIVO', 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).'
);

-- CLAUDIA BEATRIZ CASTILLA OLAYA (20699098)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '20699098' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '20699098', 'CLAUDIA BEATRIZ CASTILLA OLAYA', 'AUXILIAR ADMINISTRATIVO', '407', '15', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 1, '[]'::jsonb,
    'ACTIVO', 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).'
);

-- KATHERYN YOLANDA RODGERS QUIROGA (52146196)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52146196' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52146196', 'KATHERYN YOLANDA RODGERS QUIROGA', 'SECRETARIO EJECUTIVO', '425', '27', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 1, '[]'::jsonb,
    'ACTIVO', 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).'
);

-- JEFFER FRANK VELANDIA LOPEZ (80842817)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '80842817' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '80842817', 'JEFFER FRANK VELANDIA LOPEZ', 'SECRETARIO', '440', '19', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 1, '[]'::jsonb,
    'ACTIVO', 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).'
);

-- MIGUEL ANGEL VARGAS CORDERO (1121816584)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1121816584' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1121816584', 'MIGUEL ANGEL VARGAS CORDERO', 'AUXILIAR ADMINISTRATIVO', '407', '15', 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 1, '[]'::jsonb,
    'ACTIVO', 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).'
);

-- ACENETH TORRES ROJAS (51732443)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '51732443' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '51732443', 'ACENETH TORRES ROJAS', 'AUXILIAR ADMINISTRATIVO', '407', '15', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 1, '[]'::jsonb,
    'ACTIVO', 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).'
);

-- LIZETH MAYERLY VILLARRAGA ROJAS (1015409873)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1015409873' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1015409873', 'LIZETH MAYERLY VILLARRAGA ROJAS', 'AUXILIAR ADMINISTRATIVO', '407', '16', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 1, '[]'::jsonb,
    'ACTIVO', 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).'
);

-- BETTY ESPERANZA MONTAÑA MORA (52124597)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52124597' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52124597', 'BETTY ESPERANZA MONTAÑA MORA', 'SECRETARIO EJECUTIVO', '425', '21', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'DIAS_IMPARES', 2, '[]'::jsonb,
    'ACTIVO', 'Esquema IMPAR (asistencia presencial en fechas impares según programación de la dependencia).'
);

-- ANA JULIETH GIL HERRERA (52281297)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '52281297' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '52281297', 'ANA JULIETH GIL HERRERA', 'TÉCNICO OPERATIVO', '314', '20', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'DIAS_IMPARES', 2, '[]'::jsonb,
    'ACTIVO', 'Esquema IMPAR (asistencia presencial en fechas impares según programación de la dependencia).'
);

-- WENDY PAOLA LEON CITA (1073159399)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1073159399' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1073159399', 'WENDY PAOLA LEON CITA', 'TÉCNICO OPERATIVO', '314', '20', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'DIAS_IMPARES', 2, '[]'::jsonb,
    'ACTIVO', 'Esquema IMPAR (asistencia presencial en fechas impares según programación de la dependencia).'
);

-- MARIA VICTORIA TORRES BECERRA (53100696)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '53100696' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '53100696', 'MARIA VICTORIA TORRES BECERRA', 'TÉCNICO OPERATIVO', '314', '20', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'DIAS_PARES', 2, '[]'::jsonb,
    'ACTIVO', 'Esquema PAR (asistencia presencial en fechas pares según programación de la dependencia).'
);

-- JENNIFER LIZBETH GÓMEZ ARÉVALO (1030618681)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1030618681' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1030618681', 'JENNIFER LIZBETH GÓMEZ ARÉVALO', 'TÉCNICO OPERATIVO', '314', '20', 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'DIAS_PARES', 2, '[]'::jsonb,
    'ACTIVO', 'Esquema PAR (asistencia presencial en fechas pares según programación de la dependencia).'
);

-- DORA RAQUEL BARRERA PALACIO (1030597508)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1030597508' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1030597508', 'DORA RAQUEL BARRERA PALACIO', 'SECRETARIO', '440', '09', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 2, '[]'::jsonb,
    'ACTIVO', 'Dos días en Alternancia (2 días en oficina, 2 días de teletrabajo).'
);

-- DANIEL FERNANDO BUITRAGO DIAZ (1072493406)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '1072493406' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '1072493406', 'DANIEL FERNANDO BUITRAGO DIAZ', 'TÉCNICO OPERATIVO', '314', '21', 'DIRECCIÓN DE GESTIÓN CORPORATIVA',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 2, '[]'::jsonb,
    'ACTIVO', 'Dos días en Alternancia (2 días en oficina, 2 días de teletrabajo).'
);

-- RODRIGO DIDIER MUÑOZ CONTRERAS (79994178)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79994178' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79994178', 'RODRIGO DIDIER MUÑOZ CONTRERAS', 'TÉCNICO OPERATIVO', '314', '20', 'OFICINA DE LAS TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 5, '[]'::jsonb,
    'ACTIVO', 'Una semana en alternancia (1 semana presencial, 1 semana teletrabajo).'
);

-- WILLIAM FONSECA APERADOR (79538698)
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '79538698' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '79538698', 'WILLIAM FONSECA APERADOR', 'TÉCNICO OPERATIVO', '314', '20', 'OFICINA DE LAS TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'CANTIDAD_LIBRE', 5, '[]'::jsonb,
    'ACTIVO', 'Una semana en alternancia (1 semana presencial, 1 semana teletrabajo).'
);

COMMIT;
