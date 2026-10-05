const fs = require('fs');
const path = require('path');

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

let sql = `-- ==============================================================================
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
`;

for (const p of TRABAJO_EN_CASA_5X5) {
  const ced = p.cedula.replace(/'/g, "''");
  const nom = p.nombre.replace(/'/g, "''");
  const car = p.cargo.replace(/'/g, "''");
  const dep = p.dep.replace(/'/g, "''");

  sql += `
-- ${nom} (${ced})
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '${ced}' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '${ced}', '${nom}', '${car}', '${p.codigo}', '${p.grado}', '${dep}',
    'TRABAJO_EN_CASA', 'EXCEPCIONAL', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', 'TODOS', 5, '["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]'::jsonb,
    'ACTIVO', 'Habilitación de trabajo en casa 5x5 por contingencia de obras en Edificio Bicentenario II (Art. 2 Res. 409/2026).'
);
`;
}

sql += `\n-- 5. INSERTAR ASIGNACIONES DE TELETRABAJO HÍBRIDO (ART. 3 RES. 409)\n`;

for (const p of TELETRABAJO_HIBRIDO) {
  const ced = p.cedula.replace(/'/g, "''");
  const nom = p.nombre.replace(/'/g, "''");
  const car = p.cargo.replace(/'/g, "''");
  const dep = p.dep.replace(/'/g, "''");
  const obs = p.obs.replace(/'/g, "''");

  sql += `
-- ${nom} (${ced})
UPDATE public.teletrabajo_asignaciones SET estado = 'REVOCADO', updated_at = NOW() WHERE REPLACE(REPLACE(servidor_cedula, '.', ''), ' ', '') = '${ced}' AND estado = 'ACTIVO';
INSERT INTO public.teletrabajo_asignaciones (
    servidor_cedula, servidor_nombre, cargo_actual, codigo_cargo, grado_cargo, dependencia,
    modalidad, submodalidad, resolucion_id, numero_resolucion_display,
    fecha_inicio, fecha_fin, esquema_dias_tipo, dias_por_semana, dias_semana_fijos,
    estado, observaciones
) VALUES (
    '${ced}', '${nom}', '${car}', '${p.codigo}', '${p.grado}', '${dep}',
    'TELETRABAJO', 'SUPLEMENTARIO', '40900000-0000-0000-0000-000000002026', 'Resolución No. 409 de 2026',
    '2026-09-15', '2026-12-14', '${p.esquema}', ${p.diasSemana}, '[]'::jsonb,
    'ACTIVO', '${obs}'
);
`;
}

sql += `\nCOMMIT;\n`;

fs.writeFileSync(path.join(__dirname, 'actualizar_resoluciones_409_366.sql'), sql, 'utf8');
console.log('Archivo SQL generado exitosamente: actualizar_resoluciones_409_366.sql');
