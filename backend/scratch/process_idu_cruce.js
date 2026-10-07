const fs = require('fs');

const raw = fs.readFileSync('scratch/idu_text.txt', 'utf8');

// Busquemos las secciones en el texto
// Tramo 1: Res 6285/2002 para Profesional Universitario 340-03 (Pág 2-3)
// Tramo 2: Res 6285/2002 para Profesional Especializado 222-05 (Pág 4-5)
// Tramo 3: Res 1247/2006 para Profesional Especializado 222-05 (Pág 5-6)
// Tramo 4: Res 1161/2009 para Profesional Especializado 222-05 (Pág 6-7)
// Tramo 5: Res 1161/2009 para Profesional Especializado 222-05 (Pág 8)
// Tramo 6: Res 1161/2009 para Director Técnico 009-05 (Pág 9-10)

const funcionesEmpleo = [
  { num: 1, text: "Analizar, evaluar y proyectar los conceptos de mediana complejidad, que le sean asignados, entre ellos, los que definen disparidad de criterios al interior de un sector de la administración Distrital, para garantizar la línea jurídica en el Distrito Capital." },
  { num: 2, text: "Revisar, analizar y proyectar respuestas a las solicitudes de comentarios a proyectos de Acuerdo, de ley y de actos legislativos de mediana y baja complejidad, de acuerdo a la normatividad y la jurisprudencia vigente." },
  { num: 3, text: "Elaborar anteproyectos de ley, de actos legislativos, acuerdos, decretos, resoluciones y demás actos administrativos concernientes a las actividades propias de la Secretaría Jurídica Distrital, de manera oportuna." },
  { num: 4, text: "Revisar, ajustar y tramitar los proyectos de actos administrativos y demás documentos que deban expedir el/la Alcalde/sa Mayor y/o el Secretario/a Jurídico Distrital, de mediana complejidad que le sean asignados, atendiendo los parámetros señalados en la Política de Gerencia Jurídica." },
  { num: 5, text: "Revisar, tramitar, consolidar y proyectar respuesta a las proposiciones, solicitudes y derechos de petición relacionados con el ejercicio del control político, para garantizar la legalidad y constitucionalidad de las mismas." },
  { num: 6, text: "Participar en las mesas de trabajo y reuniones que le sean asignadas, presentar los informes correspondientes y proponer acciones, en caso que se requieran, para la solución de los temas jurídicos que se presenten." },
  { num: 7, text: "Desempeñar las demás funciones que le asigne el superior inmediato de acuerdo a la naturaleza del cargo." }
];

console.log('Longitud texto bruto:', raw.length);
