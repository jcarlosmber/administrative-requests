const fs = require('fs');
const path = require('path');
require('dotenv').config();
const geminiIngresosService = require('../services/geminiIngresosService');

const pdfPath = 'C:/Users/jcarl/.gemini/antigravity-ide/brain/bb614117-9efa-4ff0-a4f5-791ad70df487/.user_uploaded/media_1791340533365.pdf';

const cargoData = {
  nombre: 'PROFESIONAL ESPECIALIZADO',
  codigo: '222',
  grado: '24',
  dependencia: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
  requisito_experiencia_meses: 54,
  requisitos_formacion: 'Título profesional en Derecho y afines. Título de posgrado en áreas relacionadas con las funciones del cargo. Tarjeta profesional.',
  funciones_cargo: [
    '1. Analizar, evaluar y proyectar los conceptos de mediana complejidad, que le sean asignados, entre ellos, los que definen disparidad de criterios al interior de un sector de la administración Distrital, para garantizar la línea jurídica en el Distrito Capital.',
    '2. Revisar, analizar y proyectar respuestas a las solicitudes de comentarios a proyectos de Acuerdo, de ley y de actos legislativos de mediana y baja complejidad, de acuerdo a la normatividad y la jurisprudencia vigente.',
    '3. Elaborar anteproyectos de ley, de actos legislativos, acuerdos, decretos, resoluciones y demás actos administrativos concernientes a las actividades propias de la Secretaría Jurídica Distrital, de manera oportuna.',
    '4. Revisar, ajustar y tramitar los proyectos de actos administrativos y demás documentos que deban expedir el/la Alcalde/sa Mayor y/o el Secretario/a Jurídico Distrital, de mediana complejidad que le sean asignados, atendiendo los parámetros señalados en la Política de Gerencia Jurídica.',
    '5. Revisar, tramitar, consolidar y proyectar respuesta a las proposiciones, solicitudes y derechos de petición relacionados con el ejercicio del control político, para garantizar la legalidad y constitucionalidad de las mismas.',
    '6. Participar en las mesas de trabajo y reuniones que le sean asignadas, presentar los informes correspondientes y proponer acciones, en caso que se requieran, para la solución de los temas jurídicos que se presenten.',
    '7. Desempeñar las demás funciones que le asigne el superior inmediato de acuerdo a la naturaleza del cargo.'
  ]
};

const candidatoData = {
  nombre: 'Gustavo Adolfo Sánchez Monroy',
  documento: '79906841'
};

async function test() {
  const fileBuf = fs.readFileSync(pdfPath);
  const base64 = fileBuf.toString('base64');
  const files = [{
    name: 'CERTIFICACION_LABORAL_IDU_GUSTAVO_SANCHEZ.pdf',
    base64: base64,
    mimeType: 'application/pdf'
  }];

  console.log('Iniciando análisis con Gemini...');
  const res = await geminiIngresosService.analizarDocumentosConGemini(files, cargoData, candidatoData);
  console.log('Análisis completado exitosamente!');
  fs.writeFileSync('C:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/backend/scratch/gemini_result.json', JSON.stringify(res, null, 2));
  console.log('Resultado guardado en scratch/gemini_result.json');
  console.log('Cantidad de certificados detectados:', res.certificados?.length);
  res.certificados?.forEach((c, idx) => {
    console.log(`\n--- CERT ${idx+1}: ${c.id_certificado} ---`);
    console.log(`Cargo: ${c.cargo_certificado}`);
    console.log(`Periodo: ${c.fecha_inicio} a ${c.fecha_fin}`);
    console.log(`Clasificación: ${c.clasificacion_experiencia}`);
    console.log(`Total funciones: ${c.funciones_certificadas?.length || 0}`);
    console.log(`Observaciones (resumen):`, c.observaciones?.[0] || 'N/A');
    console.log(`Cotejo detallado (primeros 2):`, (c.experiencia_relacionada?.funciones_cruzadas || []).slice(0, 2));
  });
}

test().catch(console.error);
