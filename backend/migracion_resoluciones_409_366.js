/**
 * Script de migración y actualización oficial para Resoluciones de Teletrabajo y Trabajo en Casa:
 * - Resolución No. 117 de 2026 (Política Marco de Teletrabajo)
 * - Resolución No. 201 de 2026 (Efectos Suspendidos por Res. 409)
 * - Resolución No. 366 de 2026 (Teletrabajo Autónomo - Rosa Isabel Sierra Laborde)
 * - Resolución No. 409 de 2026 (Suspensión Res. 201, Trabajo en Casa 5x5 y Teletrabajo Híbrido)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER || 'sasge',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'sasge_db',
  password: process.env.PGPASSWORD || '.Secjur-2026**',
  port: parseInt(process.env.PGPORT || '5432', 10),
});

const limpiarDoc = (doc) => String(doc || '').replace(/[\.\s]/g, '').trim();

// Datos del Artículo 2: Habilitación de Trabajo en Casa (5*5) del 15-sep-2026 al 14-dic-2026
const TRABAJO_EN_CASA_5X5 = [
  { nombre: 'LUZ ESTELLA MORENO PÉREZ', cedula: '52868519', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DESPACHO SECRETARÍA JURÍDICA' },
  { nombre: 'GLORIA SALCEDO TAMAYO', cedula: '28963444', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '24', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'HUGO HERNANDO AGUIRRE CORRALES', cedula: '75093516', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'ANGELA MARCELA RODRIGUEZ DIAZ', cedula: '42161948', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '26', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'ALEJANDRA NATALY CASALLAS MARTINEZ', cedula: '1015425376', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '10', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'DORA BELÉN GUTIERREZ HERNÁNDEZ', cedula: '51649014', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '21', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'JUAN CARLOS MARTINEZ BERNAL', cedula: '1032448684', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '10', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'LUZ DARY CORREDOR MORENO', cedula: '52174173', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'ADRIANA PATRICIA GUZMÁN CONTRERAS', cedula: '52282454', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'NELSON JULIAN SALAZAR URRUTIA', cedula: '79569642', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'YOMAIRA AMPARO ALARCÓN ACERO', cedula: '52391785', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '21', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'BRICEIDA ALVARADO ROJAS', cedula: '60348229', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'PEDRO ALFONSO MEJIA SIERRA', cedula: '79575101', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'SAMUEL ARTURO HERNANDEZ MURCIA', cedula: '80022321', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '21', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'JHON ALEXANDER TIBADUIZA CASTAÑEDA', cedula: '79894605', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '01', dep: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA' },
  { nombre: 'SONIA TERESA ROA SILVA', cedula: '1018435583', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '22', dep: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA' },
  { nombre: 'DIANA MARIA MORENO VARGAS', cedula: '53001416', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA' },
  { nombre: 'CRISTHIAM DAVID JIMENEZ VASQUEZ', cedula: '1110573560', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA' },
  { nombre: 'MARY DAYANA SANCHEZ ROJAS', cedula: '37625914', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '13', dep: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA' },
  { nombre: 'ROSA ISABEL SIERRA LABORDE', cedula: '22446641', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '03', dep: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA' },
  { nombre: 'ALEXANDRA AVILA MARIN', cedula: '30333406', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '01', dep: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA' },
  { nombre: 'JOAN SEBASTIAN FLECHAS ALONSO', cedula: '1010176886', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '15', dep: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA' },
  { nombre: 'ELVIRA LILIANA HERNANDEZ LIBREROS', cedula: '52363895', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'MARIA CAMILA COTAMO JAIMES', cedula: '52146157', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'LINA MARCELA MELO RODRIGUEZ', cedula: '52033530', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'ZULMA ROJAS SUAREZ', cedula: '24179106', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'LUZ ANDREA CUBILLOS GUALDRON', cedula: '52430229', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '24', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'JOHANA PATRICIA GAMEZ GOMEZ', cedula: '53015269', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '24', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'DIEGO ALEJANDRO SOLANO FERNANDEZ', cedula: '1019058729', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '24', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'MARIA XIMENA CUBIDES AMAYA', cedula: '52818411', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '21', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'ANGELICA DIAZ RINCON', cedula: '52258032', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '19', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'CLAUDIA MARCELA CAMARGO CASTRO', cedula: '52486713', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'CARLOS JULIO RAMIREZ MUÑOZ', cedula: '80267904', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'DUVAN SANDOVAL RODRIGUEZ', cedula: '93371977', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { nombre: 'JORGE ELIECER HERNANDEZ ALBARRACIN', cedula: '19347862', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'MARTHA LILIANA BARRERA DIAZ', cedula: '51937185', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'YUDY ZULEYMA RODRIGUEZ BLANCO', cedula: '52380066', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'OCTAVIO QUINTERO LARA', cedula: '19444915', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'CAMILO ANDRES RODRIGUEZ RODRÍGUEZ', cedula: '79954654', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '25', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'JOSE ORLANDO ALVARADO HERREÑO', cedula: '79316619', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '24', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'LUZ DARY MERCHAN LARA', cedula: '52176512', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '21', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'LEIDY VANESSA NIETO ROJAS', cedula: '1010213468', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '19', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'HUGO ALFONSO CABARCAS AYOLA', cedula: '8980601', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'MONICA JULIANA SANMIGUEL ROJAS', cedula: '1013608357', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'MIGUEL PINTO SEGURA', cedula: '79584810', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'FERNAN ENRIQUE PEREZ FORTICH', cedula: '73155098', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'IVAN DAVID RAMIREZ VALENCIA', cedula: '16077540', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'SANDRA NICOLASA ORGANISTA BUILES', cedula: '52646082', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'ANDRES FABIAN NOSSA GUZMAN', cedula: '80826518', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'JUAN CAMILO RUIZ ZAMUDIO', cedula: '80154878', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '15', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'ELIANA STEPHANIE ASTAIZA CHAVES', cedula: '1085273461', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '15', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'MAGDA PATRICIA PUENTES PARDO', cedula: '52519358', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '15', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'DAVID ALEJANDRO MORA BERMUDEZ', cedula: '1032479676', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '01', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'JOSE JAVIER PINTO CASTAÑEDA', cedula: '79296576', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '01', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'NICOLAS SANTIAGO SOTO ALBA', cedula: '1020837889', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '01', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'DALIDA VILLANUEVA SANCHEZ', cedula: '52151785', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '01', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL' },
  { nombre: 'LUIS ALFONSO CASTIBLANCO URQUIJO', cedula: '3085860', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'ALVARO ARDILA MORA', cedula: '79709902', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'ALVARO CAMILO BERNATE NAVARRO', cedula: '79802044', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'MARTHA YANETH ORTIZ LEON', cedula: '46677766', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'MAGDA EDITH GUERRERO BONILLA', cedula: '23582747', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'FERNANDO PACHON PIÑEROS', cedula: '79567977', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '26', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'HENRY ALBERTO GONZALEZ MOLINA', cedula: '79450267', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '21', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'CARLOS ANDRES NIÑO SOCHA', cedula: '6765913', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '20', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'EURANIO JOSE MANOTAS MALDONADO', cedula: '8526853', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '20', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'LUISA FERNANDA GARCIA AVILA', cedula: '53122985', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'SANDRA LISETTE NOVOA DUEÑAS', cedula: '1049619617', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'KATHERINE PAOLA ARAGON CASTIBLANCO', cedula: '1030577699', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'NELCY TORRES MARTINEZ', cedula: '40011063', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'LEIDY JOHANNA ALONSO GUTIERREZ', cedula: '1032489040', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'CAROLINA ANAYA SARMIENTO', cedula: '28488940', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '01', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'JUAN DIEGO ACOSTA TORRES', cedula: '1085338624', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '15', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'JEFFERSON JOSE OSUNA BERRIO', cedula: '1005488395', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '15', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'ESTEBAN RAMIREZ CARDENAS', cedula: '1015438831', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '15', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'DIANA YURANY MARTINEZ MARTINEZ', cedula: '1001170136', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '15', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'ALVARO FELIPE ALEJO CASTIBLANCO', cedula: '1024566898', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '09', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'CHEILA ALEXANDRA ALVARADO ROJAS', cedula: '52337438', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '21', dep: 'OFICINA ASESORA DE PLANEACIÓN' },
  { nombre: 'MARIA TERESA VALDERRAMA PEREIRA', cedula: '41059054', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'OFICINA ASESORA DE PLANEACIÓN' },
  { nombre: 'ESTHER PINILLA SERRANO', cedula: '28496885', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'SUBSECRETARÍA JURÍDICA DISTRITAL' },
  { nombre: 'RUBEN DARIO GALLEGO GONZALEZ', cedula: '80850931', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'SUBSECRETARÍA JURÍDICA DISTRITAL' },
  { nombre: 'ALEX CORTES SALGADO', cedula: '79138328', cargo: 'AUXILIAR ADMINISTRATIVO', codigo: '407', grado: '20', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL' },
  { nombre: 'JUAN ANDRÉS GUERRERO RAMOS', cedula: '1014976247', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '15', dep: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA' },
  { nombre: 'OSCAR ERNESTO LOPEZ ACUÑA', cedula: '79262614', cargo: 'AUXILIAR ADMINISTRATIVO', codigo: '407', grado: '14', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' },
  { nombre: 'LUIS CARLOS GAONA FARIAS', cedula: '1022362951', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '08', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA' }
];

// Datos del Artículo 3: Autorización de Teletrabajo Híbrido del 15-sep-2026 al 14-dic-2026
const TELETRABAJO_HIBRIDO = [
  { nombre: 'GIOVANNY ALEXANDER CORTES PACHON', cedula: '79967554', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '18', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA', esquema: 'CANTIDAD_LIBRE', diasSemana: 4, obs: 'Esquema 1*4 (1 día en oficina, 4 días de teletrabajo).' },
  { nombre: 'MARTHA RUBIELA CRUZ PARDO', cedula: '52277284', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '20', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA', esquema: 'CANTIDAD_LIBRE', diasSemana: 3, obs: 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).' },
  { nombre: 'ANDREA DEL PILAR CARDENAS SARMIENTO', cedula: '52429411', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '19', dep: 'DIRECCIÓN DISTRITAL DE ASUNTOS DISCIPLINARIOS', esquema: 'CANTIDAD_LIBRE', diasSemana: 3, obs: 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).' },
  { nombre: 'DANIELA RODRIGUEZ NARVAEZ', cedula: '1018482333', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '15', dep: 'DIRECCIÓN DISTRITAL DE ASUNTOS DISCIPLINARIOS', esquema: 'CANTIDAD_LIBRE', diasSemana: 3, obs: 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).' },
  { nombre: 'CAROLINA LOZANO ARDILA', cedula: '52454621', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '24', dep: 'OFICINA DE CONTROL INTERNO', esquema: 'CANTIDAD_LIBRE', diasSemana: 3, obs: 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).' },
  { nombre: 'VICTOR HERNANDO MURILLO HURTADO', cedula: '79361343', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '13', dep: 'OFICINA DE CONTROL INTERNO', esquema: 'CANTIDAD_LIBRE', diasSemana: 3, obs: 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).' },
  { nombre: 'GLORIA INES MARTINEZ ORTIZ', cedula: '52171949', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '10', dep: 'OFICINA DE CONTROL INTERNO', esquema: 'CANTIDAD_LIBRE', diasSemana: 3, obs: 'Esquema 2*3 (2 días en oficina, 3 días de teletrabajo).' },
  { nombre: 'ZULY NATALIA NANDAR CASTAÑEDA', cedula: '33368317', cargo: 'SECRETARIO', codigo: '440', grado: '09', dep: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA', esquema: 'CANTIDAD_LIBRE', diasSemana: 2, obs: 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).' },
  { nombre: 'AZULA URIBE CABALLERO', cedula: '51961579', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '20', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA', esquema: 'CANTIDAD_LIBRE', diasSemana: 2, obs: 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).' },
  { nombre: 'IAM ALEXANDER OJEDA CARDENAS', cedula: '86058268', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '24', dep: 'OFICINA DE LAS TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES', esquema: 'CANTIDAD_LIBRE', diasSemana: 2, obs: 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).' },
  { nombre: 'JEIMMY JOHANNA PAEZ GIL', cedula: '1136880003', cargo: 'PROFESIONAL UNIVERSITARIO', codigo: '219', grado: '08', dep: 'OFICINA DE LAS TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES', esquema: 'CANTIDAD_LIBRE', diasSemana: 2, obs: 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).' },
  { nombre: 'DEYSI YANIRA MORENO GUERRERO', cedula: '52236487', cargo: 'PROFESIONAL ESPECIALIZADO', codigo: '222', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE ASUNTOS DISCIPLINARIOS', esquema: 'CANTIDAD_LIBRE', diasSemana: 2, obs: 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).' },
  { nombre: 'OLGA LILIANA LONDOÑO GARCIA', cedula: '1012339868', cargo: 'AUXILIAR ADMINISTRATIVO', codigo: '407', grado: '26', dep: 'DIRECCIÓN DISTRITAL DE ASUNTOS DISCIPLINARIOS', esquema: 'CANTIDAD_LIBRE', diasSemana: 2, obs: 'Esquema 3*2 (3 días en oficina, 2 días de teletrabajo).' },
  { nombre: 'ADRIANA PATRICIA RAMIREZ BAUTISTA', cedula: '52542976', cargo: 'SECRETARIO EJECUTIVO', codigo: '425', grado: '24', dep: 'OFICINA DE LAS TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES', esquema: 'CANTIDAD_LIBRE', diasSemana: 1, obs: 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).' },
  { nombre: 'MILDRED PAOLA ARDILA VERGARA', cedula: '52235989', cargo: 'AUXILIAR ADMINISTRATIVO', codigo: '407', grado: '27', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA', esquema: 'CANTIDAD_LIBRE', diasSemana: 1, obs: 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).' },
  { nombre: 'EDGAR ANDRES GARCIA GARAVITO', cedula: '79468462', cargo: 'AUXILIAR ADMINISTRATIVO', codigo: '407', grado: '11', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA', esquema: 'CANTIDAD_LIBRE', diasSemana: 1, obs: 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).' },
  { nombre: 'CLAUDIA BEATRIZ CASTILLA OLAYA', cedula: '20699098', cargo: 'AUXILIAR ADMINISTRATIVO', codigo: '407', grado: '15', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA', esquema: 'CANTIDAD_LIBRE', diasSemana: 1, obs: 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).' },
  { nombre: 'KATHERYN YOLANDA RODGERS QUIROGA', cedula: '52146196', cargo: 'SECRETARIO EJECUTIVO', codigo: '425', grado: '27', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL', esquema: 'CANTIDAD_LIBRE', diasSemana: 1, obs: 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).' },
  { nombre: 'JEFFER FRANK VELANDIA LOPEZ', cedula: '80842817', cargo: 'SECRETARIO', codigo: '440', grado: '19', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL', esquema: 'CANTIDAD_LIBRE', diasSemana: 1, obs: 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).' },
  { nombre: 'MIGUEL ANGEL VARGAS CORDERO', cedula: '1121816584', cargo: 'AUXILIAR ADMINISTRATIVO', codigo: '407', grado: '15', dep: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL', esquema: 'CANTIDAD_LIBRE', diasSemana: 1, obs: 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).' },
  { nombre: 'ACENETH TORRES ROJAS', cedula: '51732443', cargo: 'AUXILIAR ADMINISTRATIVO', codigo: '407', grado: '15', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA', esquema: 'CANTIDAD_LIBRE', diasSemana: 1, obs: 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).' },
  { nombre: 'LIZETH MAYERLY VILLARRAGA ROJAS', cedula: '1015409873', cargo: 'AUXILIAR ADMINISTRATIVO', codigo: '407', grado: '16', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA', esquema: 'CANTIDAD_LIBRE', diasSemana: 1, obs: 'Esquema 4*1 (4 días en oficina, 1 día de teletrabajo).' },
  { nombre: 'BETTY ESPERANZA MONTAÑA MORA', cedula: '52124597', cargo: 'SECRETARIO EJECUTIVO', codigo: '425', grado: '21', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', esquema: 'DIAS_IMPARES', diasSemana: 2, obs: 'Esquema IMPAR (asistencia presencial en fechas impares según programación de la dependencia).' },
  { nombre: 'ANA JULIETH GIL HERRERA', cedula: '52281297', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '20', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', esquema: 'DIAS_IMPARES', diasSemana: 2, obs: 'Esquema IMPAR (asistencia presencial en fechas impares según programación de la dependencia).' },
  { nombre: 'WENDY PAOLA LEON CITA', cedula: '1073159399', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '20', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', esquema: 'DIAS_IMPARES', diasSemana: 2, obs: 'Esquema IMPAR (asistencia presencial en fechas impares según programación de la dependencia).' },
  { nombre: 'MARIA VICTORIA TORRES BECERRA', cedula: '53100696', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '20', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', esquema: 'DIAS_PARES', diasSemana: 2, obs: 'Esquema PAR (asistencia presencial en fechas pares según programación de la dependencia).' },
  { nombre: 'JENNIFER LIZBETH GÓMEZ ARÉVALO', cedula: '1030618681', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '20', dep: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL', esquema: 'DIAS_PARES', diasSemana: 2, obs: 'Esquema PAR (asistencia presencial en fechas pares según programación de la dependencia).' },
  { nombre: 'DORA RAQUEL BARRERA PALACIO', cedula: '1030597508', cargo: 'SECRETARIO', codigo: '440', grado: '09', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA', esquema: 'CANTIDAD_LIBRE', diasSemana: 2, obs: 'Dos días en Alternancia (2 días en oficina, 2 días de teletrabajo).' },
  { nombre: 'DANIEL FERNANDO BUITRAGO DIAZ', cedula: '1072493406', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '21', dep: 'DIRECCIÓN DE GESTIÓN CORPORATIVA', esquema: 'CANTIDAD_LIBRE', diasSemana: 2, obs: 'Dos días en Alternancia (2 días en oficina, 2 días de teletrabajo).' },
  { nombre: 'RODRIGO DIDIER MUÑOZ CONTRERAS', cedula: '79994178', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '20', dep: 'OFICINA DE LAS TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES', esquema: 'CANTIDAD_LIBRE', diasSemana: 5, obs: 'Una semana en alternancia (1 semana presencial, 1 semana teletrabajo).' },
  { nombre: 'WILLIAM FONSECA APERADOR', cedula: '79538698', cargo: 'TÉCNICO OPERATIVO', codigo: '314', grado: '20', dep: 'OFICINA DE LAS TECNOLOGÍAS DE LA INFORMACIÓN Y LAS COMUNICACIONES', esquema: 'CANTIDAD_LIBRE', diasSemana: 5, obs: 'Una semana en alternancia (1 semana presencial, 1 semana teletrabajo).' }
];

// Cédulas del Artículo 4: Prestación Presencial (deben quedar sin teletrabajo activo)
const PRESENCIALES_CEDULAS = [
  '51882380', '79048737', '79417068', '79769334', '80100027',
  '1075256570', '41732503', '53165390', '79431243', '1030548160',
  '1033718483', '79349710', '52827794', '42163264', '35415925',
  '1015419295', '1193101660', '1098632731', '1030572725', '52176286'
];

async function migrar() {
  const client = await pool.connect();
  try {
    console.log('--- INICIANDO ACTUALIZACIÓN OFICIAL DE RESOLUCIONES ---');

    // 0. Pre-cargar mapa de planta_personal_sjd si existe (fuera de la transacción para no abortarla ante inconsistencias)
    const plantaMap = new Map();
    try {
      const resPlanta = await client.query(`
        SELECT id_plaza, cargo, codigo, grado, dependencia_cargo, titular_nombre, titular_cedula
        FROM public.planta_personal_sjd
        WHERE titular_cedula IS NOT NULL
      `);
      for (const row of resPlanta.rows) {
        const cleanCed = limpiarDoc(row.titular_cedula);
        if (cleanCed) {
          plantaMap.set(cleanCed, row);
        }
      }
      console.log(`✓ Cargados ${plantaMap.size} registros de planta para enriquecer asignaciones.`);
    } catch (errPlanta) {
      console.log('Nota: planta_personal_sjd no disponible o vacía (' + errPlanta.message + '). Se usarán datos de las resoluciones.');
    }

    function obtenerDatosPersona(cedula, fallbackNombre, fallbackCargo, fallbackCod, fallbackGrado, fallbackDep) {
      const clean = limpiarDoc(cedula);
      const p = plantaMap.get(clean);
      if (p) {
        return {
          id_plaza: p.id_plaza || null,
          nombre: p.titular_nombre || fallbackNombre,
          cargo: p.cargo || fallbackCargo,
          codigo: p.codigo || fallbackCod,
          grado: p.grado || fallbackGrado,
          dependencia: p.dependencia_cargo || fallbackDep
        };
      }
      return {
        id_plaza: null,
        nombre: fallbackNombre,
        cargo: fallbackCargo,
        codigo: fallbackCod,
        grado: fallbackGrado,
        dependencia: fallbackDep
      };
    }

    await client.query('BEGIN');

    // 1. Asegurar tablas requeridas del módulo de Teletrabajo
    await client.query(`

      CREATE TABLE IF NOT EXISTS public.teletrabajo_resoluciones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          numero_resolucion TEXT NOT NULL,
          anio INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
          fecha_expedicion DATE NOT NULL,
          fecha_inicio_vigencia DATE NOT NULL,
          fecha_fin_vigencia DATE NOT NULL,
          descripcion TEXT,
          modalidad_principal TEXT CHECK (modalidad_principal IN ('TELETRABAJO', 'TRABAJO_EN_CASA', 'MIXTA')) DEFAULT 'TELETRABAJO',
          archivo_pdf_url TEXT,
          nombre_archivo TEXT,
          estado TEXT CHECK (estado IN ('VIGENTE', 'DEROGADA', 'FINALIZADA')) DEFAULT 'VIGENTE',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.teletrabajo_asignaciones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          servidor_cedula TEXT NOT NULL,
          servidor_nombre TEXT NOT NULL,
          id_plaza INT,
          cargo_actual TEXT NOT NULL,
          codigo_cargo TEXT,
          grado_cargo TEXT,
          dependencia TEXT,
          modalidad TEXT NOT NULL CHECK (modalidad IN ('TELETRABAJO', 'TRABAJO_EN_CASA', 'TELETRABAJO_AUTONOMO', 'AUTONOMO')),
          submodalidad TEXT DEFAULT 'SUPLEMENTARIO',
          resolucion_id UUID REFERENCES public.teletrabajo_resoluciones(id) ON DELETE SET NULL,
          numero_resolucion_display TEXT,
          fecha_inicio DATE NOT NULL,
          fecha_fin DATE NOT NULL,
          cargo_es_teletrabajable BOOLEAN DEFAULT TRUE,
          excepcion_jefe_aprobada BOOLEAN DEFAULT FALSE,
          motivo_excepcion_jefe TEXT,
          esquema_dias_tipo TEXT NOT NULL CHECK (esquema_dias_tipo IN ('DIAS_FIJOS', 'DIAS_PARES', 'DIAS_IMPARES', 'CANTIDAD_LIBRE', 'TODOS')),
          dias_por_semana INT DEFAULT 2 CHECK (dias_por_semana BETWEEN 1 AND 5),
          dias_semana_fijos JSONB DEFAULT '[]'::jsonb,
          estado TEXT CHECK (estado IN ('ACTIVO', 'VENCIDO', 'SUSPENDIDO', 'REVOCADO')) DEFAULT 'ACTIVO',
          observaciones TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Registrar o Actualizar las Resoluciones Marco
    const resolucionesAInsertar = [
      {
        num: 'Resolución No. 117 de 2026',
        anio: 2026,
        exp: '2026-03-10',
        ini: '2026-03-10',
        fin: '2027-03-10',
        desc: 'Por la cual se adopta la política interna de teletrabajo en la Secretaría Jurídica Distrital.',
        mod: 'TELETRABAJO',
        est: 'VIGENTE'
      },
      {
        num: 'Resolución No. 201 de 2026',
        anio: 2026,
        exp: '2026-05-04',
        ini: '2026-05-04',
        fin: '2026-09-14',
        desc: 'Por la cual se autoriza la modalidad de teletrabajo a unos/as servidores/as públicos/as de la Secretaría Jurídica Distrital (Efectos suspendidos por Resolución No. 409 de 2026).',
        mod: 'TELETRABAJO',
        est: 'DEROGADA'
      },
      {
        num: 'Resolución No. 366 de 2026',
        anio: 2026,
        exp: '2026-08-20',
        ini: '2026-08-20',
        fin: '2027-02-20',
        desc: 'Por la cual se autoriza la Modalidad de Teletrabajo Autónomo a la servidora pública Rosa Isabel Sierra Laborde de la Dirección Distrital de Política Jurídica por el término de seis (6) meses.',
        mod: 'TELETRABAJO',
        est: 'VIGENTE'
      },
      {
        num: 'Resolución No. 409 de 2026',
        anio: 2026,
        exp: '2026-09-14',
        ini: '2026-09-15',
        fin: '2026-12-14',
        desc: 'Por la cual se suspende temporalmente la Resolución No. 201 de 2026, se habilita temporalmente el trabajo en casa (5x5) a servidores/as públicos/as con ocasión de las obras en el Edificio Bicentenario II, y se autoriza la modalidad de teletrabajo híbrido a servidores/as públicos/as de la entidad.',
        mod: 'MIXTA',
        est: 'VIGENTE'
      }
    ];

    const mapResoluciones = {};
    for (const r of resolucionesAInsertar) {
      const q = `
        INSERT INTO public.teletrabajo_resoluciones 
          (numero_resolucion, anio, fecha_expedicion, fecha_inicio_vigencia, fecha_fin_vigencia, descripcion, modalidad_principal, estado, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (numero_resolucion) DO UPDATE 
        SET anio = EXCLUDED.anio,
            fecha_expedicion = EXCLUDED.fecha_expedicion,
            fecha_inicio_vigencia = EXCLUDED.fecha_inicio_vigencia,
            fecha_fin_vigencia = EXCLUDED.fecha_fin_vigencia,
            descripcion = EXCLUDED.descripcion,
            modalidad_principal = EXCLUDED.modalidad_principal,
            estado = EXCLUDED.estado,
            updated_at = NOW()
        RETURNING id, numero_resolucion;
      `;
      // Check if unique index on numero_resolucion exists, otherwise select or insert
      const resExistente = await client.query('SELECT id FROM public.teletrabajo_resoluciones WHERE numero_resolucion = $1', [r.num]);
      if (resExistente.rows.length > 0) {
        await client.query(`
          UPDATE public.teletrabajo_resoluciones
          SET anio = $1, fecha_expedicion = $2, fecha_inicio_vigencia = $3, fecha_fin_vigencia = $4,
              descripcion = $5, modalidad_principal = $6, estado = $7, updated_at = NOW()
          WHERE id = $8
        `, [r.anio, r.exp, r.ini, r.fin, r.desc, r.mod, r.est, resExistente.rows[0].id]);
        mapResoluciones[r.num] = resExistente.rows[0].id;
      } else {
        const ins = await client.query(`
          INSERT INTO public.teletrabajo_resoluciones
            (numero_resolucion, anio, fecha_expedicion, fecha_inicio_vigencia, fecha_fin_vigencia, descripcion, modalidad_principal, estado)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [r.num, r.anio, r.exp, r.ini, r.fin, r.desc, r.mod, r.est]);
        mapResoluciones[r.num] = ins.rows[0].id;
      }
    }
    console.log('Resoluciones registradas con éxito:', mapResoluciones);

    const res409Id = mapResoluciones['Resolución No. 409 de 2026'];
    const res366Id = mapResoluciones['Resolución No. 366 de 2026'];

    // 3. Suspender / Revocar asignaciones previas de la Resolución 201
    await client.query(`
      UPDATE public.teletrabajo_asignaciones 
      SET estado = 'REVOCADO', 
          observaciones = COALESCE(observaciones, '') || ' [Suspendida a partir del 15-sep-2026 en cumplimiento del Art. 1 de la Resolución No. 409 de 2026]',
          updated_at = NOW()
      WHERE estado = 'ACTIVO' AND numero_resolucion_display LIKE '%201%';
    `);


    // 4. Asignar Trabajo en Casa 5x5 (84 servidores)
    console.log(`Procesando ${TRABAJO_EN_CASA_5X5.length} servidores de Trabajo en Casa (5x5)...`);
    for (const p of TRABAJO_EN_CASA_5X5) {
      const datos = await obtenerDatosPersona(p.cedula, p.nombre, p.cargo, p.codigo, p.grado, p.dep);

      // Desactivar cualquier asignación previa activa
      await client.query(`
        UPDATE public.teletrabajo_asignaciones 
        SET estado = 'REVOCADO', updated_at = NOW() 
        WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = $1 AND estado = 'ACTIVO'
      `, [limpiarDoc(p.cedula)]);

      // Insertar asignación activa
      await client.query(`
        INSERT INTO public.teletrabajo_asignaciones (
          servidor_cedula, servidor_nombre, id_plaza, cargo_actual, codigo_cargo, grado_cargo,
          dependencia, modalidad, submodalidad, resolucion_id, numero_resolucion_display,
          fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
          estado, observaciones
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 'TRABAJO_EN_CASA', 'EXCEPCIONAL', $8, 'Resolución No. 409 de 2026',
          '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
          'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409 de 2026).'
        )
      `, [p.cedula, datos.nombre, datos.id_plaza, datos.cargo, datos.codigo, datos.grado, datos.dependencia, res409Id]);
    }

    // 5. Asignar Teletrabajo Híbrido (31 servidores)
    console.log(`Procesando ${TELETRABAJO_HIBRIDO.length} servidores de Teletrabajo Híbrido...`);
    for (const p of TELETRABAJO_HIBRIDO) {
      const datos = await obtenerDatosPersona(p.cedula, p.nombre, p.cargo, p.codigo, p.grado, p.dep);

      // Desactivar asignación previa
      await client.query(`
        UPDATE public.teletrabajo_asignaciones 
        SET estado = 'REVOCADO', updated_at = NOW() 
        WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = $1 AND estado = 'ACTIVO'
      `, [limpiarDoc(p.cedula)]);

      // Insertar asignación activa
      await client.query(`
        INSERT INTO public.teletrabajo_asignaciones (
          servidor_cedula, servidor_nombre, id_plaza, cargo_actual, codigo_cargo, grado_cargo,
          dependencia, modalidad, submodalidad, resolucion_id, numero_resolucion_display,
          fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
          estado, observaciones
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 'TELETRABAJO', 'SUPLEMENTARIO', $8, 'Resolución No. 409 de 2026',
          '2026-09-15', '2026-12-14', $9, $10, '[]'::jsonb,
          'ACTIVO', $11
        )
      `, [p.cedula, datos.nombre, datos.id_plaza, datos.cargo, datos.codigo, datos.grado, datos.dependencia, res409Id, p.esquema, p.diasSemana, p.obs]);
    }

    // 6. Configurar Servidores Presenciales (Art. 4 Res. 409)
    console.log(`Asegurando ${PRESENCIALES_CEDULAS.length} servidores presenciales (sin modalidad remota)...`);
    for (const ced of PRESENCIALES_CEDULAS) {
      await client.query(`
        UPDATE public.teletrabajo_asignaciones 
        SET estado = 'REVOCADO', 
            observaciones = COALESCE(observaciones, '') || ' [Prestación presencial del servicio obligatoria conforme al Art. 4 de la Resolución No. 409 de 2026]',
            updated_at = NOW() 
        WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = $1 AND estado = 'ACTIVO'
      `, [limpiarDoc(ced)]);
    }

    await client.query('COMMIT');
    console.log('--- ACTUALIZACIÓN COMPLETADA CON ÉXITO ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error durante la actualización:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrar().then(() => process.exit(0)).catch(() => process.exit(1));
