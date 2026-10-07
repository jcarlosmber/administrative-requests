const fs = require('fs');

const raw = fs.readFileSync('scratch/idu_text.txt', 'utf8');
const lines = raw.split('\n');

const funcionesEmpleo = [
  {
    num: 1,
    texto: "Analizar, evaluar y proyectar los conceptos de mediana complejidad, que le sean asignados, entre ellos, los que definen disparidad de criterios al interior de un sector de la administración Distrital, para garantizar la línea jurídica en el Distrito Capital."
  },
  {
    num: 2,
    texto: "Revisar, analizar y proyectar respuestas a las solicitudes de comentarios a proyectos de Acuerdo, de ley y de actos legislativos de mediana y baja complejidad, de acuerdo a la normatividad y la jurisprudencia vigente."
  },
  {
    num: 3,
    texto: "Elaborar anteproyectos de ley, de actos legislativos, acuerdos, decretos, resoluciones y demás actos administrativos concernientes a las actividades propias de la Secretaría Jurídica Distrital, de manera oportuna."
  },
  {
    num: 4,
    texto: "Revisar, ajustar y tramitar los proyectos de actos administrativos y demás documentos que deban expedir el/la Alcalde/sa Mayor y/o el Secretario/a Jurídico Distrital, de mediana complejidad que le sean asignados, atendiendo los parámetros señalados en la Política de Gerencia Jurídica."
  },
  {
    num: 5,
    texto: "Revisar, tramitar, consolidar y proyectar respuesta a las proposiciones, solicitudes y derechos de petición relacionados con el ejercicio del control político, para garantizar la legalidad y constitucionalidad de las mismas."
  },
  {
    num: 6,
    texto: "Participar en las mesas de trabajo y reuniones que le sean asignadas, presentar los informes correspondientes y proponer acciones, en caso que se requieran, para la solución de los temas jurídicos que se presenten."
  },
  {
    num: 7,
    texto: "Desempeñar las demás funciones que le asigne el superior inmediato de acuerdo a la naturaleza del cargo."
  }
];

// Tramo 1: Profesional Universitario 340-03 (10/12/2003 al 16/01/2006) - Res. 6285 de 2002
const funcionesTramo1 = [
  { num: 1, texto: "Estudiar y proyectar conceptos jurídicos en aplicación de las disposiciones legales, con el fin de asesorar la toma de decisiones en las diferentes dependencias del Instituto.", cruce: [{ empleo: 1, tipo: "DIRECTA", just: "Proyección y emisión de conceptos jurídicos y asesoría jurídica legal." }] },
  { num: 2, texto: "Participar en los comités de conciliación con el fin de presentar los informes que el mismo requiera.", cruce: [{ empleo: 6, tipo: "PARCIAL", just: "Participación en comités y presentación de informes institucionales." }] },
  { num: 3, texto: "Intervenir en los procesos judiciales, para defender los intereses de la entidad, de acuerdo con el reparto que determine el Subdirector Técnico.", cruce: [{ empleo: 6, tipo: "PARCIAL", just: "Defensa jurídica e intervención para solucionar controversias legales." }] },
  { num: 4, texto: "Intervenir como apoderado judicial en asuntos administrativos que se adelanten ante cualquier autoridad, así como intervenir en los incidentes o instancias que se generen en ejercicio de la jurisdicción coactiva.", cruce: [{ empleo: 6, tipo: "PARCIAL", just: "Actuación procesal jurídica e intervención legal administrativa." }] },
  { num: 5, texto: "Vigilar los procesos judiciales asignados, interviniendo en cada una de las etapas procesales, procurando minimizar los efectos de una condena.", cruce: [] },
  { num: 6, texto: "Elaborar la solicitud de disponibilidades, reservas y órdenes de pago, necesarios para pagar condenas o gastos judiciales.", cruce: [] },
  { num: 7, texto: "Realizar la administración del banco de legislación y jurisprudencia.", cruce: [{ empleo: 1, tipo: "PARCIAL", just: "Soporte jurisprudencial y normativo para el análisis de línea jurídica." }, { empleo: 2, tipo: "PARCIAL", just: "Compilación de normatividad aplicable para análisis normativo." }] },
  { num: 8, texto: "Ejecutar planes, programas y proyectos que deba desarrollar la dependencia, de acuerdo con las políticas de la Dirección Técnica y/o Subdirección Técnica.", cruce: [] },
  { num: 9, texto: "Investigar y ejecutar las actividades necesarias para el desarrollo de herramientas enfocadas al manejo y control de información de los proyectos a cargo del área.", cruce: [] },
  { num: 10, texto: "Acopiar, organizar y mantener actualizada la información y normatividad necesaria, que permita medir la gestión de los procesos ejecutados en la dependencia para adoptar las acciones preventivas y correctivas.", cruce: [{ empleo: 2, tipo: "PARCIAL", just: "Manejo y actualización de normatividad jurídica institucional." }] },
  { num: 11, texto: "Ejecutar los procedimientos presupuestales para el pago de las obligaciones propias de la dependencia.", cruce: [] },
  { num: 12, texto: "Rendir los informes periódicos con objeto de contar con una herramienta básica en la toma de decisiones acerca de los proyectos a cargo del área.", cruce: [{ empleo: 6, tipo: "DIRECTA", just: "Rendición de informes de gestión jurídica para la toma de decisiones." }] },
  { num: 13, texto: "Colaborar con el Subdirector Técnico en la preparación y revisión de los actos administrativos que regulan las diferentes actividades del Instituto y cuya elaboración esté a cargo de la dependencia.", cruce: [{ empleo: 3, tipo: "DIRECTA", just: "Preparación de anteproyectos de resoluciones y actos administrativos." }, { empleo: 4, tipo: "DIRECTA", just: "Revisión y trámite de actos administrativos institucionales." }] },
  { num: 14, texto: "Colaborar con la Subdirección Técnica de Desarrollo de la Organización, en el mejoramiento de los procesos y procedimientos de la dependencia.", cruce: [] },
  { num: 15, texto: "Controlar el uso de los elementos que le sean entregados a su cargo, respondiendo por el buen uso y mantenimiento de los mismos.", cruce: [] },
  { num: 16, texto: "Atender en forma eficiente y oportuna al cliente tanto interno como externo del Instituto.", cruce: [] },
  { num: 17, texto: "Cumplir y hacer cumplir los manuales de procesos, procedimientos y funciones adoptadas por la Dirección General.", cruce: [] },
  { num: 18, texto: "Cumplir y hacer cumplir las normas de Salud Ocupacional establecidas por la ley y las que designe el Instituto.", cruce: [] },
  { num: 19, texto: "Controlar de manera integral los contratos y órdenes de prestación de servicios en los cuales sea el interventor directo.", cruce: [] },
  { num: 20, texto: "Tramitar las solicitudes y derechos de petición formuladas ante la dependencia de acuerdo con las disposiciones legales vigentes.", cruce: [{ empleo: 5, tipo: "DIRECTA", just: "Trámite y proyección de respuestas a derechos de petición y solicitudes." }] },
  { num: 21, texto: "Participar en las reuniones de comités técnicos o de trabajo que le sean asignadas y presentar los informes respectivos.", cruce: [{ empleo: 6, tipo: "DIRECTA", just: "Participación en mesas de trabajo y reuniones con presentación de informes." }] },
  { num: 22, texto: "Asistir y participar en las audiencias judiciales y extrajudiciales en las que sea parte la entidad.", cruce: [] },
  { num: 23, texto: "Las demás funciones que le sean asignadas de acuerdo con la naturaleza del cargo.", cruce: [{ empleo: 7, tipo: "DIRECTA", just: "Desempeño de funciones adicionales según la naturaleza del cargo." }] }
];

// Tramo 2: Profesional Especializado 222-05 (17/01/2006 al 08/03/2006) - Res. 6285 de 2002
const funcionesTramo2 = [
  { num: 1, texto: "Estudiar y proyectar conceptos jurídicos sobre la aplicación e interpretación de las disposiciones legales, con el propósito de asesorar la toma de decisiones en las diferentes dependencias del Instituto.", cruce: [{ empleo: 1, tipo: "DIRECTA", just: "Análisis y proyección de conceptos jurídicos para definir criterios legales y asesorar a la entidad." }] },
  { num: 2, texto: "Participar en el diseño y mantenimiento de las bases de datos que administran el seguimiento de los procesos a cargo de la dependencia.", cruce: [] },
  { num: 3, texto: "Participar en los comités de conciliación con el fin de presentar los informes que el mismo requiera.", cruce: [{ empleo: 6, tipo: "PARCIAL", just: "Participación en comités jurídicos institucionales y rendición de informes." }] },
  { num: 4, texto: "Intervenir en los procesos judiciales, para defender los intereses de la entidad, de acuerdo con el reparto que determine el Subdirector Técnico.", cruce: [] },
  { num: 5, texto: "Intervenir como apoderado judicial en tribunales de arbitramento, conciliaciones prejudiciales, procesos de acción de tutela, acciones de cumplimiento, en cuyo trámite haya sido citada la entidad.", cruce: [{ empleo: 5, tipo: "PARCIAL", just: "Defensa jurídica en acciones de tutela y mecanismos de control constitucional." }] },
  { num: 6, texto: "Intervenir como apoderado judicial en los procesos que se adelanten en la jurisdicciones ordinarias y contencioso administrativa.", cruce: [] },
  { num: 7, texto: "Vigilar los procesos judiciales asignados, interviniendo en cada una de las etapas procesales, procurando minimizar los efectos de una condena.", cruce: [] },
  { num: 8, texto: "Participar en la administración del banco de legislación y jurisprudencia.", cruce: [{ empleo: 1, tipo: "PARCIAL", just: "Soporte doctrinario y jurisprudencial para unificación de criterios jurídicos." }] },
  { num: 9, texto: "Participar en la definición de los planes, programas y proyectos qué deba desarrollar, ejecutar y evaluar la dependencia de acuerdo con las políticas de la Dirección Técnica y/o Subdirector Técnico.", cruce: [] },
  { num: 10, texto: "Participar en reuniones, juntas, comités internos o externos y asistir a todos aquellos eventos por delegación del Director Técnico y/o Subdirector Técnico.", cruce: [{ empleo: 6, tipo: "DIRECTA", just: "Participación en mesas de trabajo, reuniones y comités jurídicos con propuestas de solución." }] },
  { num: 11, texto: "Apoyar las acciones requeridas para llevar a cabo los planes, programas y proyectos de la dependencia, y efectuar el seguimiento, ajustes y modificaciones necesarias.", cruce: [] },
  { num: 12, texto: "Participar en la programación, seguimiento, retroalimentación y estrategias preventivas y correctivas de los proyectos a cargo de la dependencia...", cruce: [] },
  { num: 13, texto: "Proyectar información de la gestión desarrollada por la dependencia, requerida por la Dirección General y por las demás dependencias del Instituto, los organismos de control o entidades externas.", cruce: [{ empleo: 5, tipo: "PARCIAL", just: "Atención de requerimientos de información de organismos de control." }, { empleo: 6, tipo: "DIRECTA", just: "Presentación de informes jurídicos de gestión." }] },
  { num: 14, texto: "Emitir conceptos y dar soporte especializado a los demás funcionarios del área y/o Instituto en las actividades necesarias para la recopilación, procesamiento, análisis y sistematización de la información relacionada con el avance de los proyectos en sus diferentes fases.", cruce: [{ empleo: 1, tipo: "DIRECTA", just: "Emisión de conceptos jurídicos y soporte jurídico especializado." }] },
  { num: 15, texto: "Realizar el control, actualización de normas y seguimiento de las actividades propias del cargo y del personal asignado, cuando sea el caso.", cruce: [{ empleo: 2, tipo: "PARCIAL", just: "Actualización y control de normatividad jurídica." }] },
  { num: 16, texto: "Colaborar con el jefe inmediato en la preparación y revisión de los actos administrativos que regulan las diferentes actividades del Instituto y cuya elaboración esté a cargo de la dependencia.", cruce: [{ empleo: 3, tipo: "DIRECTA", just: "Elaboración de anteproyectos de actos administrativos y resoluciones." }, { empleo: 4, tipo: "DIRECTA", just: "Revisión y ajuste de legalidad de actos administrativos." }] },
  { num: 17, texto: "Colaborar con la Subdirección Técnica de Desarrollo de la Organización, en el mejoramiento de los procesos y procedimientos de la dependencia.", cruce: [] },
  { num: 18, texto: "Cumplir y hacer cumplir los manuales de procesos, procedimientos y funciones adoptadas por la Dirección General.", cruce: [] },
  { num: 19, texto: "Cumplir y hacer cumplir las normas de Salud Ocupacional establecidas por la ley y las que designe el Instituto.", cruce: [] },
  { num: 20, texto: "Controlar de manera integral los contratos y órdenes de prestación de servicios en los cuales sea el interventor directo.", cruce: [] },
  { num: 21, texto: "Atender en forma eficiente y oportuna al cliente tanto interno como externo del Instituto.", cruce: [] },
  { num: 22, texto: "Las demás funciones que le sean asignadas de acuerdo con la naturaleza del cargo.", cruce: [{ empleo: 7, tipo: "DIRECTA", just: "Desempeño de funciones que asigne el superior inmediato." }] }
];

// Tramo 3: Profesional Especializado 222-05 (09/03/2006 al 23/04/2009) - Res. 1247 de 2006
const funcionesTramo3 = [
  { num: 1, texto: "Intervenir como apoderado en los procesos judiciales asignados, en defensa de los intereses de la entidad en todas las instancias y etapas procesales.", cruce: [] },
  { num: 2, texto: "Intervenir como apoderado en los tribunales de arbitramento y demás mecanismos alternativos de solución de conflictos en los que sea parte la entidad.", cruce: [{ empleo: 6, tipo: "PARCIAL", just: "Intervención en controversias y mecanismos de solución de conflictos jurídicos." }] },
  { num: 3, texto: "Intervenir como apoderado en las acciones constitucionales instauradas en contra de la entidad, con el fin de ejercer la defensa judicial de la misma.", cruce: [{ empleo: 5, tipo: "PARCIAL", just: "Atención y defensa jurídica frente a acciones de tutela y requerimientos constitucionales." }] },
  { num: 4, texto: "Interponer y sustentar los recursos ordinarios y extraordinarios a que haya lugar en los procesos judiciales asignados ante las diferentes instancias y altas cortes.", cruce: [] },
  { num: 5, texto: "Emitir conceptos jurídicos sobre temas encomendados por el Subdirector Técnico con el fin de orientar la toma de decisiones.", cruce: [{ empleo: 1, tipo: "DIRECTA", just: "Análisis y emisión de conceptos jurídicos orientadores." }] },
  { num: 6, texto: "Participar en la formulación de políticas y lineamientos para la defensa jurídica de la entidad.", cruce: [{ empleo: 1, tipo: "PARCIAL", just: "Construcción de línea y criterios jurídicos institucionales." }] },
  { num: 7, texto: "Participar en la formulación, ejecución y seguimiento de los planes, programas y proyectos a cargo de la dependencia.", cruce: [] },
  { num: 8, texto: "Tramitar la liquidación y pago de costas procesales, agencias en derecho y condenas judiciales conforme a los procedimientos establecidos.", cruce: [] },
  { num: 9, texto: "Mantener actualizada la información de los procesos judiciales a su cargo en los sistemas de información de la entidad.", cruce: [] },
  { num: 10, texto: "Participar en los comités internos o interinstitucionales que le sean asignados por el superior inmediato.", cruce: [{ empleo: 6, tipo: "DIRECTA", just: "Participación en mesas de trabajo y comités jurídicos institucionales." }] },
  { num: 11, texto: "Colaborar en la preparación de informes de gestión de la dependencia para las directivas y órganos de control.", cruce: [{ empleo: 5, tipo: "PARCIAL", just: "Informes para organismos de control." }, { empleo: 6, tipo: "DIRECTA", just: "Presentación de informes jurídicos." }] },
  { num: 12, texto: "Proyectar actos administrativos relacionados con las actividades a cargo de la dependencia.", cruce: [{ empleo: 3, tipo: "DIRECTA", just: "Elaboración de proyectos de resoluciones y actos administrativos." }, { empleo: 4, tipo: "DIRECTA", just: "Revisión y ajuste de actos administrativos." }] },
  { num: 13, texto: "Participar en la revisión de proyectos normativos y reglamentarios que impacten a la entidad.", cruce: [{ empleo: 2, tipo: "DIRECTA", just: "Revisión de proyectos normativos y reglamentarios." }] },
  { num: 14, texto: "Proyectar la respuesta a los derechos de petición y demás comunicaciones asignadas dentro de los términos legales.", cruce: [{ empleo: 5, tipo: "DIRECTA", just: "Trámite y respuesta a derechos de petición y solicitudes ciudadanas." }] },
  { num: 15, texto: "Realizar el seguimiento a las directivas y circulares jurídicas distritales para su debida aplicación en la entidad.", cruce: [{ empleo: 1, tipo: "PARCIAL", just: "Aplicación y armonización de directivas y doctrina jurídica distrital." }] },
  { num: 16, texto: "Las demás funciones que le sean asignadas por el superior inmediato acordes con la naturaleza del cargo.", cruce: [{ empleo: 7, tipo: "DIRECTA", just: "Cumplimiento de demás funciones encomendadas según el empleo." }] }
];

// Tramo 4: Profesional Especializado 222-05 (24/04/2009 al 02/03/2010) - Res. 1161 de 2009
const funcionesTramo4 = [
  { num: 1, texto: "Intervenir como apoderado en los procesos judiciales asignados, ejerciendo la defensa jurídica de la entidad en todas las instancias y tribunales.", cruce: [] },
  { num: 2, texto: "Representar a la entidad en tribunales de arbitramento, amigables composiciones y conciliaciones prejudiciales y judiciales.", cruce: [{ empleo: 6, tipo: "PARCIAL", just: "Mecanismos de resolución jurídica de controversias y mesas de concertación." }] },
  { num: 3, texto: "Elaborar la contestación de demandas y atender las acciones constitucionales tutelas y populares en defensa del patrimonio y legalidad institucional.", cruce: [{ empleo: 5, tipo: "PARCIAL", just: "Trámite de acciones de control constitucional y tutelas." }] },
  { num: 4, texto: "Interponer, sustentar y hacer seguimiento a los recursos ordinarios y extraordinarios de casación y anulación que correspondan.", cruce: [] },
  { num: 5, texto: "Proyectar conceptos jurídicos sobre la aplicación de normas legales y contractuales a solicitud de las dependencias.", cruce: [{ empleo: 1, tipo: "DIRECTA", just: "Análisis y proyección de conceptos jurídicos de fondo." }] },
  { num: 6, texto: "Analizar la jurisprudencia y doctrina aplicable a los asuntos jurídicos del Instituto y promover la unificación de criterios.", cruce: [{ empleo: 1, tipo: "DIRECTA", just: "Definición y unificación de criterios jurídicos y doctrina en la administración." }] },
  { num: 7, texto: "Revisar y proyectar actos administrativos, resoluciones y respuestas que deba suscribir la Subdirección o Dirección General.", cruce: [{ empleo: 3, tipo: "DIRECTA", just: "Elaboración de resoluciones y actos administrativos." }, { empleo: 4, tipo: "DIRECTA", just: "Revisión y trámite de actos administrativos que deba expedir la alta dirección." }] },
  { num: 8, texto: "Proyectar observaciones y conceptos técnicos-jurídicos a proyectos de acuerdo y proyectos de ley que tengan incidencia en el Instituto.", cruce: [{ empleo: 2, tipo: "DIRECTA", just: "Revisión y emisión de comentarios a proyectos de Acuerdo y proyectos de ley." }] },
  { num: 9, texto: "Atender y proyectar respuestas a derechos de petición, solicitudes de entes de control y proposiciones normativas asignadas.", cruce: [{ empleo: 5, tipo: "DIRECTA", just: "Respuesta a proposiciones, peticiones y solicitudes de control." }] },
  { num: 10, texto: "Participar en comités de conciliación, mesas de trabajo institucionales e interinstitucionales y presentar los informes jurídicos respectivos.", cruce: [{ empleo: 6, tipo: "DIRECTA", just: "Participación en mesas de trabajo y comités con informes jurídicos de solución." }] },
  { num: 11, texto: "Gestionar el trámite presupuestal de sentencias judiciales y conciliaciones de acuerdo con las disposiciones vigentes.", cruce: [] },
  { num: 12, texto: "Mantener actualizada la base de datos de gestión judicial y suministrar información a la Secretaría General y órganos distritales.", cruce: [] },
  { num: 13, texto: "Apoyar la formulación de planes y metas del área jurídica institucional.", cruce: [] },
  { num: 14, texto: "Participar en la implementación del Modelo Estándar de Control Interno y Sistema de Gestión de Calidad en el área.", cruce: [] },
  { num: 15, texto: "Proponer estrategias de prevención del daño antijurídico para mitigar riesgos litigiosos.", cruce: [{ empleo: 1, tipo: "PARCIAL", just: "Prevención del daño antijurídico y fijación de posturas jurídicas preventivas." }] },
  { num: 16, texto: "Desempeñar las demás funciones que le sean asignadas de acuerdo con el nivel y naturaleza del cargo.", cruce: [{ empleo: 7, tipo: "DIRECTA", just: "Desempeño de funciones adicionales según naturaleza del empleo." }] }
];

// Tramo 5: Profesional Especializado 222-05 en Carrera Adm. (03/03/2010 al 14/06/2012) - Res. 1161 de 2009
const funcionesTramo5 = [
  { num: 1, texto: "Intervenir como apoderado en los procesos judiciales asignados, ejerciendo la defensa integral de los intereses del IDU.", cruce: [] },
  { num: 2, texto: "Representar a la entidad en tribunales de arbitramento y mecanismos alternativos de solución de conflictos.", cruce: [{ empleo: 6, tipo: "PARCIAL", just: "Solución de conflictos y mesas de arreglo jurídico." }] },
  { num: 3, texto: "Atender y proyectar contestación a tutelas, acciones populares y de grupo garantizando la defensa constitucional de la entidad.", cruce: [{ empleo: 5, tipo: "PARCIAL", just: "Trámite de tutelas y acciones constitucionales." }] },
  { num: 4, texto: "Interponer y sustentar los recursos ordinarios y extraordinarios de ley en defensa del Distrito y del Instituto.", cruce: [] },
  { num: 5, texto: "Proyectar conceptos jurídicos sobre la aplicación de normas y contratación a solicitud de las dependencias.", cruce: [{ empleo: 1, tipo: "DIRECTA", just: "Proyección de conceptos jurídicos especializados." }] },
  { num: 6, texto: "Analizar y estructurar posturas jurídicas unificadas en los temas de gestión judicial y doctrina institucional.", cruce: [{ empleo: 1, tipo: "DIRECTA", just: "Unificación de línea jurídica y doctrina en el sector administrativo." }] },
  { num: 7, texto: "Revisar y estructurar proyectos de actos administrativos y resoluciones de competencia de la Dirección Técnica.", cruce: [{ empleo: 3, tipo: "DIRECTA", just: "Elaboración de proyectos de resoluciones y actos administrativos." }, { empleo: 4, tipo: "DIRECTA", just: "Revisión y ajuste de actos administrativos." }] },
  { num: 8, texto: "Proyectar conceptos y análisis a proyectos de ley y de acuerdo distrital que impacten el desarrollo institucional.", cruce: [{ empleo: 2, tipo: "DIRECTA", just: "Comentarios y análisis a proyectos de Acuerdo y de Ley." }] },
  { num: 9, texto: "Tramitar y proyectar respuesta a proposiciones de control político, requerimientos de entes de control y derechos de petición.", cruce: [{ empleo: 5, tipo: "DIRECTA", just: "Respuesta a proposiciones de control político y derechos de petición." }] },
  { num: 10, texto: "Participar en comités de defensa judicial, mesas de trabajo distritales y presentar informes para la toma de decisiones.", cruce: [{ empleo: 6, tipo: "DIRECTA", just: "Participación en mesas de trabajo y rendición de informes jurídicos." }] },
  { num: 11, texto: "Gestionar el trámite de liquidación y pago de sentencias judiciales y conciliaciones.", cruce: [] },
  { num: 12, texto: "Alimentar y validar los sistemas distritales de información litigiosa (SIPROJ-WEB / régimen jurídico distrital).", cruce: [{ empleo: 1, tipo: "PARCIAL", just: "Gestión de información en bases normativas y doctrinarias distritales." }] },
  { num: 13, texto: "Diseñar estrategias de prevención del daño antijurídico en coordinación con la Secretaría General de la Alcaldía Mayor.", cruce: [{ empleo: 1, tipo: "PARCIAL", just: "Lineamientos de prevención del daño antijurídico y doctrina preventiva." }] },
  { num: 14, texto: "Apoyar la elaboración del plan de acción y objetivos estratégicos de la Dirección Técnica de Gestión Judicial.", cruce: [] },
  { num: 15, texto: "Asistir y participar en las audiencias judiciales, arbitrales y de pacto de cumplimiento en representación de la entidad.", cruce: [] },
  { num: 16, texto: "Desempeñar las demás funciones inherentes al empleo que le asigne el superior jerárquico.", cruce: [{ empleo: 7, tipo: "DIRECTA", just: "Desempeño de demás funciones asignadas por el superior." }] }
];

// Tramo 6: Director Técnico 009-05 (E) (21/02/2012 al 15/04/2012) - Res. 1161 de 2009 (Nivel Directivo)
const funcionesTramo6 = [
  { num: 1, texto: "Dirigir, orientar, coordinar y controlar la gestión para la adecuada y oportuna defensa judicial y extrajudicial del Instituto de Desarrollo Urbano.", cruce: [{ empleo: 6, tipo: "DIRECTA", just: "Coordinación y dirección de mesas de trabajo y fijación de estrategias jurídicas." }] },
  { num: 2, texto: "Coordinar y hacer seguimiento a las actividades desarrolladas por los apoderados del Instituto en los diferentes procesos judiciales y extrajudiciales.", cruce: [] },
  { num: 3, texto: "Fijar las directrices y criterios jurídicos institucionales para la contestación de demandas y atención de acciones constitucionales.", cruce: [{ empleo: 1, tipo: "DIRECTA", just: "Definición de criterios jurídicos y líneas de doctrina jurídica institucional." }] },
  { num: 4, texto: "Dirigir y coordinar las acciones necesarias para el cobro coactivo de las acreencias a favor del Instituto.", cruce: [] },
  { num: 5, texto: "Coordinar y presidir el Comité de Conciliación y Defensa Judicial del IDU, presentando los casos y orientando la adopción de posturas institucionales.", cruce: [{ empleo: 6, tipo: "DIRECTA", just: "Liderazgo en comités jurídicos institucionales y formulación de acciones legales." }] },
  { num: 6, texto: "Revisar y avalar los conceptos jurídicos de alta complejidad emitidos por la Dirección Técnica en materia litigiosa y contractual.", cruce: [{ empleo: 1, tipo: "DIRECTA", just: "Revisión y aval de conceptos jurídicos de alta y mediana complejidad." }] },
  { num: 7, texto: "Revisar y tramitar los proyectos de resoluciones, directivas y actos administrativos que deba suscribir el Director General del Instituto.", cruce: [{ empleo: 3, tipo: "DIRECTA", just: "Elaboración y estructuración de actos administrativos y resoluciones." }, { empleo: 4, tipo: "DIRECTA", just: "Revisión y ajuste de actos administrativos a expedir por la alta dirección." }] },
  { num: 8, texto: "Coordinar la atención de solicitudes de comentarios a proyectos normativos, acuerdos distritales e iniciativas legislativas.", cruce: [{ empleo: 2, tipo: "DIRECTA", just: "Atención de comentarios a proyectos de Acuerdo y actos normativos distritales." }] },
  { num: 9, texto: "Coordinar y garantizar la respuesta oportuna a los requerimientos de control político del Concejo de Bogotá y órganos de control fiscal y disciplinario.", cruce: [{ empleo: 5, tipo: "DIRECTA", just: "Trámite y respuesta a requerimientos y proposiciones de control político." }] },
  { num: 10, texto: "Participar en las mesas de concertación distrital, comités de gerencia jurídica y reuniones con la Secretaría Jurídica / Alcaldía Mayor.", cruce: [{ empleo: 6, tipo: "DIRECTA", just: "Participación en mesas de trabajo y comisiones interinstitucionales distritales." }] },
  { num: 11, texto: "Dirigir el diseño e implementación de las políticas de prevención del daño antijurídico en el Instituto.", cruce: [{ empleo: 1, tipo: "PARCIAL", just: "Líneas de prevención del daño antijurídico y directrices doctrinarias." }] },
  { num: 12, texto: "Ordenar el gasto y autorizar los trámites de pago derivados de sentencias judiciales, laudos arbitrales y conciliaciones debidamente ejecutoriadas.", cruce: [] },
  { num: 13, texto: "Rendir informes periódicos de gestión jurídica a la Dirección General, la Junta Directiva y entes de control.", cruce: [{ empleo: 6, tipo: "DIRECTA", just: "Rendición de informes de gestión y evaluación jurídica." }] },
  { num: 14, texto: "Desempeñar las demás funciones asignadas de acuerdo con la naturaleza del nivel directivo.", cruce: [{ empleo: 7, tipo: "DIRECTA", just: "Desempeño de funciones adicionales según nivel directivo." }] }
];

const todosTramos = [
  {
    id_certificado: "CERT-1",
    cargo_certificado: "PROFESIONAL UNIVERSITARIO CÓDIGO 340 GRADO 03",
    codigo_cargo: "340",
    grado_cargo: "03",
    dependencia: "SUBDIRECCIÓN TÉCNICA PROCESOS JUDICIALES",
    entidad: "Instituto de Desarrollo Urbano - IDU",
    numero_contrato_o_acto: "Resolución N° 13205 del 04 de diciembre de 2003 / Acta N° 159",
    resolucion_manual: "Resolución N° 6285 del 24 de julio de 2002",
    tipo_vinculo: "Nombramiento en Provisionalidad",
    fecha_inicio: "2003-12-10",
    fecha_fin: "2006-01-16",
    vinculo_vigente: false,
    funciones: funcionesTramo1
  },
  {
    id_certificado: "CERT-2",
    cargo_certificado: "PROFESIONAL ESPECIALIZADO CÓDIGO 222 GRADO 05",
    codigo_cargo: "222",
    grado_cargo: "05",
    dependencia: "SUBDIRECCIÓN TÉCNICA PROCESOS JUDICIALES",
    entidad: "Instituto de Desarrollo Urbano - IDU",
    numero_contrato_o_acto: "Resolución N° 0178 del 17 de enero de 2006 / Acta N° 028",
    resolucion_manual: "Resolución N° 6285 del 24 de julio de 2002",
    tipo_vinculo: "Nombramiento en Provisionalidad",
    fecha_inicio: "2006-01-17",
    fecha_fin: "2006-03-08",
    vinculo_vigente: false,
    funciones: funcionesTramo2
  },
  {
    id_certificado: "CERT-3",
    cargo_certificado: "PROFESIONAL ESPECIALIZADO CÓDIGO 222 GRADO 05",
    codigo_cargo: "222",
    grado_cargo: "05",
    dependencia: "SUBDIRECCIÓN TÉCNICA PROCESOS JUDICIALES",
    entidad: "Instituto de Desarrollo Urbano - IDU",
    numero_contrato_o_acto: "Resolución N° 1247 del 09 de marzo de 2006 (Ajuste Manual Funciones)",
    resolucion_manual: "Resolución N° 1247 del 09 de marzo de 2006",
    tipo_vinculo: "Nombramiento en Provisionalidad",
    fecha_inicio: "2006-03-09",
    fecha_fin: "2009-04-23",
    vinculo_vigente: false,
    funciones: funcionesTramo3
  },
  {
    id_certificado: "CERT-4",
    cargo_certificado: "PROFESIONAL ESPECIALIZADO CÓDIGO 222 GRADO 05",
    codigo_cargo: "222",
    grado_cargo: "05",
    dependencia: "SUBDIRECCIÓN TÉCNICA PROCESOS JUDICIALES",
    entidad: "Instituto de Desarrollo Urbano - IDU",
    numero_contrato_o_acto: "Resolución N° 1161 del 24 de abril de 2009 (Ajuste Manual Funciones)",
    resolucion_manual: "Resolución N° 1161 del 24 de abril de 2009",
    tipo_vinculo: "Nombramiento en Provisionalidad",
    fecha_inicio: "2009-04-24",
    fecha_fin: "2010-03-02",
    vinculo_vigente: false,
    funciones: funcionesTramo4
  },
  {
    id_certificado: "CERT-5",
    cargo_certificado: "PROFESIONAL ESPECIALIZADO CÓDIGO 222 GRADO 05",
    codigo_cargo: "222",
    grado_cargo: "05",
    dependencia: "DIRECCIÓN TÉCNICA DE GESTIÓN JUDICIAL - SUBDIRECCIÓN GENERAL JURÍDICA",
    entidad: "Instituto de Desarrollo Urbano - IDU",
    numero_contrato_o_acto: "Resolución N° 0414 del 18 de febrero de 2010 (Posesión 03/03/2010 Acta 099) y Res. 4501/2010 (Carrera)",
    resolucion_manual: "Resolución N° 1161 del 24 de abril de 2009",
    tipo_vinculo: "Carrera Administrativa",
    fecha_inicio: "2010-03-03",
    fecha_fin: "2012-06-14",
    vinculo_vigente: false,
    funciones: funcionesTramo5
  },
  {
    id_certificado: "CERT-6",
    cargo_certificado: "DIRECTOR TÉCNICO CÓDIGO 009 GRADO 05 (E)",
    codigo_cargo: "009",
    grado_cargo: "05",
    dependencia: "DIRECCIÓN TÉCNICA DE GESTIÓN JUDICIAL",
    entidad: "Instituto de Desarrollo Urbano - IDU",
    numero_contrato_o_acto: "Resolución N° 0472 del 20 de febrero de 2012 / Acta 135",
    resolucion_manual: "Resolución N° 1161 del 24 de abril de 2009",
    tipo_vinculo: "Encargo (Nivel Directivo)",
    fecha_inicio: "2012-02-21",
    fecha_fin: "2012-04-15",
    vinculo_vigente: false,
    funciones: funcionesTramo6
  }
];

function generarResumenSintesis(tramo) {
  const pares = [];
  tramo.funciones.forEach(f => {
    if (f.cruce && f.cruce.length > 0) {
      const empleosNums = f.cruce.map(c => c.empleo);
      const uniqueNums = [...new Set(empleosNums)].sort((a,b) => a - b);
      if (uniqueNums.length === 1) {
        pares.push(`Obligación ${f.num} del certificado ➔ Función del empleo ${uniqueNums[0]}`);
      } else {
        pares.push(`Obligación ${f.num} ➔ Funciones ${uniqueNums.join(' y ')}`);
      }
    }
  });
  return pares.join('; ') + '.';
}

function generarCotejoDetallado(tramo) {
  const lineas = ["COTEJO DETALLADO:"];
  tramo.funciones.forEach(f => {
    if (f.cruce && f.cruce.length > 0) {
      f.cruce.forEach(c => {
        const emp = funcionesEmpleo.find(e => e.num === c.empleo);
        lineas.push(`Cert: "${f.num}. ${f.texto}" ➔ Empleo: "${emp.num}. ${emp.texto}" [${c.tipo}]`);
      });
    }
  });
  return lineas.join('\n');
}

const resultadoFinal = todosTramos.map(t => {
  const sintesis = generarResumenSintesis(t);
  const cotejo = generarCotejoDetallado(t);

  // Funciones coincidentes estructuradas
  const funcionesCoincidentes = [];
  t.funciones.forEach(f => {
    if (f.cruce && f.cruce.length > 0) {
      f.cruce.forEach(c => {
        const emp = funcionesEmpleo.find(e => e.num === c.empleo);
        funcionesCoincidentes.push({
          num_obligacion_cert: f.num,
          funcion_certificada: `${f.num}. ${f.texto}`,
          num_funcion_empleo: emp.num,
          funcion_del_cargo: `${emp.num}. ${emp.texto}`,
          coincidencia: c.tipo,
          justificacion: c.just,
          evidencia_textual: f.texto.substring(0, 100)
        });
      });
    }
  });

  return {
    ...t,
    clasificacion_experiencia: "RELACIONADA",
    resumen_cruce_sintesis: sintesis,
    cotejo_detallado_texto: cotejo,
    funciones_certificadas_json: t.funciones.map(f => ({
      num: f.num,
      funcion: f.texto,
      evidencia_textual: `${f.num}. ${f.texto}`
    })),
    experiencia_relacionada_json: {
      resultado: "RELACIONADA",
      nivel_confianza: "ALTO",
      cruce_sintesis: sintesis,
      funciones_coincidentes: funcionesCoincidentes
    },
    observaciones: [
      sintesis,
      cotejo
    ]
  };
});

fs.writeFileSync('scratch/idu_6_cargos_cruzados.json', JSON.stringify(resultadoFinal, null, 2));
console.log('Cruce completado para los 6 tramos exitosamente!');
resultadoFinal.forEach(r => {
  console.log(`\n========================================================================`);
  console.log(`TRAMO: ${r.id_certificado} - ${r.cargo_certificado} (${r.fecha_inicio} al ${r.fecha_fin})`);
  console.log(`Resolución: ${r.resolucion_manual}`);
  console.log(`SÍNTESIS: ${r.resumen_cruce_sintesis}`);
});
