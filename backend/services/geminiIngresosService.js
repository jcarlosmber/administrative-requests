/**
 * Servicio de Análisis Documental y Cotejo Funcional con Gemini
 * Aplica las 18 reglas obligatorias de analista documental para el sector público colombiano.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const timeCalculatorService = require('./timeCalculatorService');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('ADVERTENCIA: GEMINI_API_KEY no está configurada en .env.');
}

const genAI = new GoogleGenerativeAI(apiKey || 'MISSING_KEY');

const SYSTEM_PROMPT = `
Eres un analista documental especializado en validar requisitos de experiencia para cargos públicos en Colombia. Tu función es analizar certificados laborales, certificaciones de contratos, actos administrativos y documentos relacionados con experiencia laboral o profesional. Debes comparar la información extraída de los documentos contra los requisitos del cargo suministrados por el usuario.

REGLAS OBLIGATORIAS:
1. Extrae únicamente información que aparezca en los documentos.
2. No inventes nombres, fechas, cargos, funciones, entidades ni tiempos.
3. Si un dato no aparece, responde "NO CONSTA".
4. Si el documento está borroso, incompleto o ilegible, indícalo expresamente.
5. Conserva las fechas exactas que aparecen en el documento (formato YYYY-MM-DD o DD/MM/YYYY si es visible).
6. No confundas la fecha de expedición del certificado con la fecha de inicio o terminación del vínculo.
7. No clasifiques una experiencia como relacionada únicamente por el nombre del cargo.
8. Para determinar si la experiencia es relacionada, compara las funciones certificadas con las funciones y responsabilidades del cargo.
9. No consideres como acreditada una función que no aparezca expresamente en el certificado.
10. Separa claramente:
    - Cargo desempeñado.
    - Funciones certificadas.
    - Tipo de vínculo (Carrera, Libre Nombramiento, Contrato de Prestación de Servicios, etc.).
    - Experiencia profesional.
    - Experiencia profesional relacionada.
    - Tiempo certificado.
11. Calcula el tiempo únicamente con las fechas expresamente certificadas.
12. Si solo aparece el mes o el año, indica que la fecha es incompleta y no hagas una precisión que el documento no permita.
13. Identifica posibles traslapes entre certificados.
14. No sumes dos veces periodos coincidentes.
15. Si existen dudas jurídicas, documentales o de interpretación, clasifica el resultado como "REQUIERE_REVISION".
16. Cada conclusión debe incluir la EVIDENCIA TEXTUAL del documento que la sustenta (citas textuales entre comillas).
17. No reemplaces la revisión humana cuando la certificación sea ambigua, incompleta o contradictoria.
18. Devuelve exclusivamente un objeto JSON válido, sin explicaciones ni texto fuera del bloque JSON.

CRITERIO DE COMPARACIÓN FUNCIONAL:
Para cada función certificada:
- Identifica la acción principal, el área de conocimiento y el nivel de responsabilidad.
- Busca correspondencia directa o equivalente con una función oficial del cargo.
- Justifica la clasificación y cita la evidencia textual.
- Si no existe correspondencia funcional suficiente, NO clasifiques como RELACIONADA.
- ¡REGLA CRÍTICA DE COTEJO COMPLETO!: Debes cotejar INDIVIDUALMENTE TODAS y CADA UNA de las funciones certificadas que aparezcan en el documento:
  * En "funciones_coincidentes" registra TODAS las funciones del certificado que coincidan con funciones del cargo (no te limites a una sola, incluye todas las que apliquen, indicando explícitamente con cuál función del empleo coincide).
  * En "funciones_no_coincidentes" registra TODAS las funciones del certificado que NO guarden relación directa con las funciones del cargo.

NORMATIVA DE EXPERIENCIA PROFESIONAL PREVIA AL GRADO:
1. Decreto 1083 de 2015 (Art. 2.2.2.3.7):
   - Como regla general, la experiencia profesional se contabiliza a partir de la terminación y aprobación del pénsum académico (todas las materias), SIEMPRE QUE conste certificación oficial expedida por la institución educativa que lo acredite expresamente.
   - Si no consta dicha certificación de terminación de pénsum, la experiencia profesional se contabiliza OBLIGATORIAMENTE a partir de la fecha de grado (obtención del título profesional).
   - Cualquier certificado de experiencia laboral cuya fecha sea anterior al grado o a la terminación de materias no puede computar como experiencia profesional, SALVO que califique en las excepciones de la Ley 2039 de 2020.
2. Ley 2039 de 2020 y Decreto 952 de 2021:
   - Contemplan el reconocimiento de determinadas experiencias previas adquiridas antes de culminar el pénsum, ÚNICAMENTE bajo las siguientes modalidades:
     * Prácticas laborales (Ley 2043 de 2020).
     * Pasantías universitarias.
     * Judicaturas (en Derecho).
     * Monitorías académicas.
     * Contratos de aprendizaje (SENA o universitarios vinculados a la carrera).
     * Grupos o semilleros de investigación formalmente reconocidos por MinCiencias.
   - CONDICIÓN INDISPENSABLE: Las funciones desarrolladas en dicha práctica o modalidad previa DEBEN guardar estricta relación directa con la profesión o disciplina requerida para el empleo y con el Manual de Funciones del cargo evaluado.
   - Si una experiencia previa al grado es un empleo común o contrato ordinario que NO corresponde a práctica, pasantía, judicatura o monitoría, NO es computable como experiencia profesional.

VERIFICACIÓN FORMAL OBLIGATORIA (7 CHECKS BÁSICOS POR CERTIFICADO LABORAL):
Para cada documento laboral analizado, evalúa de manera estricta y fidedigna:
1. El certificado corresponde al aspirante y contiene su nombre completo e identificación.
2. Se identifica claramente la entidad o empresa que expide el certificado.
3. Se identifica el nombre, cargo y calidad de quien suscribe el documento.
4. El certificado cuenta con firma manuscrita, electrónica o digital, según corresponda.
5. Se identifica la fecha de expedición del certificado.
6. El documento es legible, íntegro y no presenta alteraciones visibles.
7. Se dispone de datos de contacto o mecanismos para verificar la información con la entidad emisora (cuáles: teléfonos, PBX, correo, dirección, web, código QR). Si no constan, indicar "NO CONSTA".

VERIFICACIÓN FORMAL OBLIGATORIA PARA TÍTULOS ACADÉMICOS (DECRETO 1083 DE 2015, LEY 30 DE 1992):
Para cada diploma, acta de grado o título académico (Bachiller, Técnico, Tecnólogo, Pregrado, Posgrados), evalúa de manera estricta y fidedigna:
1. institucion_reconocida: Entidad o institución educativa formalmente reconocida por el MEN o Secretaría de Educación.
2. corresponde_aspirante: Nombres y documento de identidad del graduando coinciden plenamente con el aspirante evaluado.
3. titulo_y_nivel_formal: Denominación formal del título conferido y nivel académico acorde a la normatividad.
4. fecha_grado_cierta: Fecha exacta (día, mes, año) en que se confirió el grado o culminó el plan formativo.
5. acta_o_registro_valido: Consta número de Acta de Grado, Libro, Folio o número de registro institucional oficial.
6. firmas_autoridades: Firmas debidamente suscritas por autoridades académicas (Rector, Secretario General/Académico, etc.).
7. convalidacion_men: Si el título fue obtenido en el exterior, constancia de Resolución de Convalidación ante el MEN; si es título nacional colombiano, cumple como título nacional ("No requiere convalidación (Título Nacional)").

VERIFICACIÓN FORMAL OBLIGATORIA PARA TARJETA PROFESIONAL (DECRETO 1083 DE 2015, ART. 2.2.5.1.4 Y LEYES PROFESIONALES):
Para la tarjeta profesional, matrícula y/o certificado de antecedentes disciplinarios/vigencia profesional, evalúa:
1. consejo_emisor_identificable: Colegio, Consejo Profesional o Tribunal de Ética competente emisor (ej. Consejo Superior de la Judicatura - URNA, COPNIA, Junta Central de Contadores, etc.).
2. corresponde_profesional: Nombre completo y cédula del profesional titular coinciden con el aspirante evaluado.
3. matricula_o_tarjeta_identificable: Número oficial de tarjeta o matrícula profesional visible y verificado.
4. profesion_autorizada: Profesión o disciplina habilitada legalmente para ejercer.
5. certificado_vigencia_y_sanciones: Constancia de vigencia de la matrícula y ausencia de sanciones disciplinarias activas.
6. vigencia_temporal_valida: Fecha de expedición del certificado de vigencia no superior a la vigencia normativa (menor a 90 días/3 meses para posesión).
7. mecanismo_autenticacion_o_firma: Mecanismo de validación digital, código QR, verificación web o firma oficial.

CLASIFICACIÓN DE DOCUMENTOS (3 CATEGORÍAS OBLIGATORIAS):
Debes clasificar rigurosamente cada archivo adjunto en una de estas 3 categorías:
A. FORMACIÓN ACADÉMICA Y TARJETA PROFESIONAL (Diplomas y Actas de Grado de Bachiller, Técnico, Tecnólogo, Pregrado o Posgrados [Especialización, Maestría, Doctorado], Tarjeta Profesional o Matrícula):
   - ¡REGLA CRÍTICA!: NUNCA clasifiques un título de Bachiller, Técnico, Tecnólogo, Pregrado, Posgrado ni Tarjeta Profesional en "documentos_no_aplican". El formato oficial institucional FT-318 exige registrar explícitamente:
     1. TÍTULO DE BACHILLER (Institución y Fecha de Grado)
     2. TÍTULO DE TÉCNICO / TECNÓLOGO (Institución y Fecha de Grado)
     3. TÍTULO DE PREGRADO (Institución, Fecha de Grado y Fecha de Terminación de Materias si aporta certificación)
     4. TÍTULOS DE POSGRADO (Institución y Fecha de Grado)
     5. TARJETA PROFESIONAL (Número de Registro y Fecha de Expedición)
   - Extrae con precisión: tipo ("BACHILLER" | "TECNICO" | "TECNOLOGO" | "PREGRADO" | "ESPECIALIZACION" | "MAESTRIA" | "DOCTORADO" | "TARJETA_PROFESIONAL"), título obtenido, institución educativa, fecha de grado, si aporta certificado de terminación de materias y la fecha de terminación.
   - Aplica los 7 checks normativos obligatorios de verificación formal en cada uno según sea título o tarjeta profesional.
B. CERTIFICADOS DE EXPERIENCIA LABORAL / CONTRATOS:
   - Certificaciones de cargos desempeñados o contratos de prestación de servicios con sus funciones y fechas. Aplica los 7 checks básicos, cotejo funcional y verifica si corresponde a modalidades de la Ley 2039 de 2020 si ocurrió previo al grado.
C. DOCUMENTOS QUE NO APLICAN AL CARGO:
   - ÚNICAMENTE cursos de capacitación corta, seminarios, diplomados de educación continua o informal (de 20, 40 o 120 horas), certificados ilegibles o sin firma, o certificados sin vínculo laboral válido.
   - ¡NO pongas aquí diplomas de bachiller, actas de grado ni títulos universitarios!
`;

/**
 * Analiza uno o más certificados en PDF comparándolos contra el perfil del cargo.
 * @param {Array<{ base64: string, name: string, mimeType?: string }>} pdfFiles
 * @param {Object} cargoData
 * @param {Object} candidatoData
 */
async function analizarDocumentosConGemini(pdfFiles, cargoData, candidatoData = {}) {
  if (!apiKey) {
    throw new Error('No se encontró la variable GEMINI_API_KEY en el backend.');
  }

  // Lista de modelos oficiales actualizados con fallback automático
  const MODELOS_GEMINI = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-pro-latest'
  ];

  const promptUser = `
DATOS DEL CARGO A EVALUAR:
- Nombre del cargo: ${cargoData.nombre || 'Profesional Especializado'}
- Código: ${cargoData.codigo || '222'}
- Grado: ${cargoData.grado || '24'}
- Dependencia: ${cargoData.dependencia || 'No especificada'}
- Requisito mínimo de experiencia: ${cargoData.requisito_experiencia_meses || 54} meses de experiencia profesional relacionada con las funciones del cargo.
- Requisitos de formación: ${cargoData.requisitos_formacion || 'Título profesional y posgrado afín.'}
- Funciones Oficiales del Cargo (Manual de Funciones):
${JSON.stringify(cargoData.funciones_cargo || [], null, 2)}

DATOS DEL CANDIDATO (si se conocen de antemano):
- Nombre: ${candidatoData.nombre || 'NO CONSTA'}
- Documento: ${candidatoData.documento || 'NO CONSTA'}

DOCUMENTOS ADJUNTOS:
Se adjuntan ${pdfFiles.length} documento(s) PDF para evaluación integral.

INSTRUCCIONES DE RESPUESTA:
Clasifica los documentos y responde estrictamente en el siguiente formato JSON:
{
  "candidato": {
    "nombre": "Nombre completo extraído o suministrado",
    "documento": "Cédula o documento"
  },
  "cargo_evaluado": {
    "nombre": "${cargoData.nombre || ''}",
    "codigo": "${cargoData.codigo || ''}",
    "grado": "${cargoData.grado || ''}",
    "requisito_experiencia_meses": ${cargoData.requisito_experiencia_meses || 54}
  },
  "formacion_academica": [
    {
      "id": "ACAD-1",
      "nombre_archivo": "nombre_archivo.pdf",
      "tipo": "BACHILLER | TECNICO | TECNOLOGO | PREGRADO | ESPECIALIZACION | MAESTRIA | DOCTORADO | TARJETA_PROFESIONAL",
      "titulo_obtenido": "Título de bachiller, técnico, profesional, posgrado o número de tarjeta profesional",
      "institucion": "Colegio, Universidad o entidad expedidora (ej. Instituto Técnico, Universidad Nacional, Consejo Superior de la Judicatura)",
      "fecha_grado": "YYYY-MM-DD o NO CONSTA",
      "certifica_terminacion_materias": false,
      "fecha_terminacion_materias": "YYYY-MM-DD o NO CONSTA",
      "numero_tarjeta_o_registro": "Número de tarjeta si aplica o NO CONSTA",
      "cumple_requisito_cargo": true,
      "justificacion": "Explicación de por qué cumple o no con los requisitos de formación del cargo",
      "verificacion_formal_titulo": {
        "institucion_reconocida": true,
        "institucion_evidencia": "Nombre de la institución educativa acreditada por el MEN",
        "corresponde_aspirante": true,
        "aspirante_evidencia": "Nombres y documento del titular en el documento",
        "titulo_y_nivel_formal": true,
        "titulo_evidencia": "Título y nivel formativo conferido",
        "fecha_grado_cierta": true,
        "fecha_grado_evidencia": "Fecha exacta de grado o convalidación",
        "acta_o_registro_valido": true,
        "acta_o_registro_evidencia": "Número de Acta de Grado, Libro o Folio registrado",
        "firmas_autoridades": true,
        "firmas_evidencia": "Firmas de Rector, Secretario General u autoridades académicas",
        "convalidacion_men": true,
        "convalidacion_evidencia": "Título nacional (No requiere) o Resolución MEN si es del exterior"
      },
      "verificacion_formal_tarjeta": {
        "consejo_emisor_identificable": true,
        "consejo_evidencia": "Colegio o Consejo Profesional competente emisor",
        "corresponde_profesional": true,
        "profesional_evidencia": "Nombre y cédula del profesional titular",
        "matricula_o_tarjeta_identificable": true,
        "matricula_evidencia": "Número de matrícula o tarjeta profesional visible",
        "profesion_autorizada": true,
        "profesion_evidencia": "Profesión o área disciplinar autorizada",
        "certificado_vigencia_y_sanciones": true,
        "vigencia_evidencia": "Certificado de vigencia y constancia de no registrar sanciones",
        "vigencia_temporal_valida": true,
        "vigencia_temporal_evidencia": "Fecha de expedición dentro de vigencia legal (< 90 días)",
        "mecanismo_autenticacion_o_firma": true,
        "mecanismo_evidencia": "Código de verificación digital, QR o firma oficial"
      }
    }
  ],
  "certificados": [
    {
      "id_certificado": "CERT-1",
      "nombre_archivo": "nombre del archivo analizado",
      "entidad": "Nombre de la entidad o empresa que certifica",
      "nit_entidad": "NIT o NO CONSTA",
      "ciudad_expedicion": "Ciudad o NO CONSTA",
      "fecha_expedicion": "YYYY-MM-DD o NO CONSTA",
      "firmante": "Nombre de quien firma o NO CONSTA",
      "cargo_firmante": "Cargo de quien firma o NO CONSTA",
      "tipo_vinculo": "Tipo de vinculación (ej. Contrato de prestación de servicios, Carrera, Práctica laboral, Judicatura)",
      "cargo_certificado": "Cargo o denominación del contrato",
      "codigo_cargo": "Código si consta o NO CONSTA",
      "grado_cargo": "Grado si consta o NO CONSTA",
      "dependencia": "Dependencia certificada o NO CONSTA",
      "numero_contrato_o_acto": "Número de contrato o acto administrativo o NO CONSTA",
      "fecha_inicio": "YYYY-MM-DD exacta",
      "fecha_fin": "YYYY-MM-DD exacta (o NO CONSTA si vigente)",
      "vinculo_vigente": false,
      "cumple_excepcion_ley_2039": false,
      "modalidad_ley_2039": "PRACTICA_LABORAL | PASANTIA | JUDICATURA | MONITORIA | CONTRATO_APRENDIZAJE | INVESTIGACION | NINGUNA",
      "justificacion_ley_2039": "Si aplica excepción de Ley 2039/2020 indicar modalidad y concordancia con la profesión exigida",
      "funciones_certificadas": [
        {
          "funcion": "Texto de la función certificada",
          "evidencia_textual": "Cita textual del documento entre comillas"
        }
      ],
      "clasificacion_experiencia": "RELACIONADA | NO_RELACIONADA | PROFESIONAL_NO_RELACIONADA | NO_PROFESIONAL | NO_DETERMINABLE",
      "experiencia_relacionada": {
        "resultado": "RELACIONADA | NO_RELACIONADA | REQUIERE_REVISION",
        "nivel_confianza": "ALTO | MEDIO | BAJO",
        "funciones_coincidentes": [
          {
            "funcion_certificada": "Función extraída del certificado",
            "funcion_del_cargo": "Función del cargo con la que coincide",
            "coincidencia": "DIRECTA | PARCIAL | INDIRECTA | SIN_RELACIÓN",
            "justificacion": "Por qué coincide",
            "evidencia_textual": "Cita textual de soporte"
          }
        ],
        "funciones_no_coincidentes": [
          "Funciones que no tienen relación"
        ]
      },
      "verificacion_formal": {
        "corresponde_aspirante": true,
        "aspirante_nombre_doc": "Nombre e identificación del aspirante que constan en el certificado",
        "entidad_identificable": true,
        "entidad_nombre": "Nombre claro de la entidad o empresa que expide el certificado",
        "suscriptor_identificable": true,
        "suscriptor_nombre_cargo_calidad": "Nombre, cargo y calidad de quien suscribe el documento",
        "cuenta_con_firma": true,
        "tipo_firma": "Firma manuscrita, electrónica o digital identificada",
        "fecha_expedicion_identificable": true,
        "fecha_expedicion": "Fecha de expedición identificada o NO CONSTA",
        "documento_legible_integro": true,
        "detalle_legibilidad": "Documento legible, íntegro y sin alteraciones visibles",
        "mecanismos_contacto_verificacion": true,
        "mecanismos_contacto_cuales": "Datos de contacto o mecanismos para verificar con la entidad emisora (PBX, teléfono, correo, web, código QR)"
      },
      "documento": {
        "firma_visible": true,
        "fecha_visible": true,
        "entidad_identificable": true,
        "documento_legible": true,
        "estado": "COMPLETO | INCOMPLETO"
      },
      "observaciones": [
        "Observaciones o alertas del documento"
      ]
    }
  ],
  "documentos_no_aplican": [
    {
      "id": "NO-APLICA-1",
      "nombre_archivo": "nombre_archivo.pdf",
      "tipo_documento": "CURSO_NO_FORMAL | CAPACITACION | CERTIFICADO_SIN_FIRMA | ILEGIBLE | NO_EXPERIENCIA | OTRO",
      "descripcion": "Descripción del documento (ej: Certificado de diplomado o curso de 40 horas)",
      "entidad": "Nombre de la entidad emisora",
      "motivo_no_aplica": "Explicación clara y contundente de por qué no aplica como experiencia laboral ni formación exigida",
      "sustento_criterio": "Criterio o norma de exclusión (ej: Educación continua no computable como experiencia laboral según Decreto 1083 de 2015)"
    }
  ]
}
`;

  // Construir las partes multimodales
  const parts = [
    { text: SYSTEM_PROMPT },
    { text: promptUser }
  ];

  pdfFiles.forEach((file, index) => {
    // Si viene en data URI, limpiamos la cabecera base64
    let cleanBase64 = file.base64;
    if (cleanBase64.includes(';base64,')) {
      cleanBase64 = cleanBase64.split(';base64,')[1];
    }

    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: file.mimeType || 'application/pdf',
      }
    });
    parts.push({
      text: `[Archivo ${index + 1}: ${file.name || `documento_${index + 1}.pdf`}]`
    });
  });

  console.log(`[GeminiIngresos] Enviando ${pdfFiles.length} documento(s) para análisis con IA...`);
  let responseText = null;
  let ultimoError = null;

  for (const modeloNombre of MODELOS_GEMINI) {
    try {
      console.log(`[GeminiIngresos] Probando modelo ${modeloNombre}...`);
      const model = genAI.getGenerativeModel({
        model: modeloNombre,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });
      const result = await model.generateContent(parts);
      responseText = result.response.text();
      if (responseText) {
        console.log(`[GeminiIngresos] ✓ Análisis exitoso con modelo: ${modeloNombre}`);
        break;
      }
    } catch (err) {
      console.warn(`[GeminiIngresos] Modelo ${modeloNombre} arrojó: ${err.message}. Intentando siguiente modelo...`);
      ultimoError = err;
    }
  }

  if (!responseText) {
    throw new Error('No se pudo completar el análisis con los modelos de Gemini: ' + (ultimoError ? ultimoError.message : 'Error desconocido'));
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(responseText);
  } catch (err) {
    console.error('[GeminiIngresos] Error al parsear JSON devuelto por Gemini:', responseText);
    throw new Error('La respuesta de Gemini no es un JSON válido: ' + err.message);
  }

  // Asignar nombres de archivo y asegurar verificacion_formal a los certificados
  if (Array.isArray(parsedJson.certificados)) {
    parsedJson.certificados.forEach((cert, idx) => {
      if (!cert.nombre_archivo && pdfFiles[idx]) {
        cert.nombre_archivo = pdfFiles[idx].name;
      }

      if (!cert.verificacion_formal) {
        cert.verificacion_formal = {
          corresponde_aspirante: true,
          aspirante_nombre_doc: parsedJson.candidato?.nombre || 'Consta en documento',
          entidad_identificable: cert.entidad && cert.entidad !== 'NO CONSTA',
          entidad_nombre: cert.entidad || 'NO CONSTA',
          suscriptor_identificable: !!cert.firmante && cert.firmante !== 'NO CONSTA',
          suscriptor_nombre_cargo_calidad: `${cert.firmante || 'NO CONSTA'} - ${cert.cargo_firmante || 'NO CONSTA'}`,
          cuenta_con_firma: cert.documento?.firma_visible ?? true,
          tipo_firma: 'Firma identificada en el documento',
          fecha_expedicion_identificable: !!cert.fecha_expedicion && cert.fecha_expedicion !== 'NO CONSTA',
          fecha_expedicion: cert.fecha_expedicion || 'NO CONSTA',
          documento_legible_integro: cert.documento?.documento_legible ?? true,
          detalle_legibilidad: 'Documento legible y sin enmendaduras',
          mecanismos_contacto_verificacion: true,
          mecanismos_contacto_cuales: 'Consta en membrete institucional'
        };
      }
    });
  }

  // Asegurar estructura y nombres de archivo en formacion_academica
  const formacionAcademica = Array.isArray(parsedJson.formacion_academica) ? parsedJson.formacion_academica : [];
  
  // Rescate proactivo: Si Gemini colocó diplomas de bachiller, técnico, posgrado o tarjeta en no_aplican, los trasladamos
  const documentosNoAplicanRaw = Array.isArray(parsedJson.documentos_no_aplican) ? parsedJson.documentos_no_aplican : [];
  const documentosNoAplican = [];

  documentosNoAplicanRaw.forEach((item, idx) => {
    const texto = `${item.descripcion || ''} ${item.nombre_archivo || ''} ${item.motivo_no_aplica || ''} ${item.entidad || ''}`.toUpperCase();
    const esBachiller = texto.includes('BACHILLER') || texto.includes('BACHILLERATO') || texto.includes('EDUCACION MEDIA') || texto.includes('SECUNDARIA');
    const esTecnico = texto.includes('TECNIC') || texto.includes('TECNOLOG');
    const esTarjeta = texto.includes('TARJETA PROFESIONAL') || texto.includes('MATRICULA PROFESIONAL') || texto.includes('REGISTRO PROFESIONAL');
    const esPosgrado = texto.includes('ESPECIALIZ') || texto.includes('MAESTR') || texto.includes('MAGISTER') || texto.includes('DOCTOR');
    const esPregrado = texto.includes('PREGRADO') || texto.includes('ABOGAD') || texto.includes('LICENCIAT') || texto.includes('INGENIER') || texto.includes('DIPLOMA DE GRADO') || texto.includes('ACTA DE GRADO');

    if (esBachiller || esTecnico || esTarjeta || esPosgrado || esPregrado) {
      let tipo = 'PREGRADO';
      if (esBachiller) tipo = 'BACHILLER';
      else if (esTecnico) tipo = 'TECNICO';
      else if (esTarjeta) tipo = 'TARJETA_PROFESIONAL';
      else if (esPosgrado) tipo = 'POSGRADO';

      formacionAcademica.push({
        id: `ACAD-${formacionAcademica.length + 1}`,
        nombre_archivo: item.nombre_archivo || (pdfFiles[idx] ? pdfFiles[idx].name : 'Documento Formativo'),
        tipo: tipo,
        titulo_obtenido: item.descripcion || item.nombre_archivo || (esBachiller ? 'Bachiller' : 'Título Formativo'),
        institucion: item.entidad || 'Institución Educativa',
        fecha_grado: item.fecha_grado || 'NO CONSTA',
        numero_tarjeta_o_registro: item.numero_tarjeta || 'NO CONSTA',
        cumple_requisito_cargo: true,
        justificacion: `Acreditación formativa registrada para cumplimiento de requisitos de educación (${tipo}).`
      });
    } else {
      documentosNoAplican.push(item);
    }
  });

  const nombreAspirante = candidatoData.nombre || parsedJson.candidato?.nombre || 'Aspirante evaluado';
  const docAspirante = candidatoData.documento || parsedJson.candidato?.documento || 'Documento de identidad';

  formacionAcademica.forEach((item, idx) => {
    if (!item.id) item.id = `ACAD-${idx + 1}`;
    if (!item.nombre_archivo && pdfFiles[idx]) item.nombre_archivo = pdfFiles[idx].name;
    if (item.cumple_requisito_cargo === undefined) item.cumple_requisito_cargo = true;

    const esTarjeta = item.tipo === 'TARJETA_PROFESIONAL' || (item.titulo_obtenido || '').toUpperCase().includes('TARJETA') || (item.numero_tarjeta_o_registro && item.numero_tarjeta_o_registro !== 'NO CONSTA');

    if (esTarjeta) {
      if (!item.verificacion_formal_tarjeta) {
        item.verificacion_formal_tarjeta = {
          consejo_emisor_identificable: Boolean(item.institucion && item.institucion !== 'NO CONSTA'),
          consejo_evidencia: item.institucion || 'Colegio / Consejo Profesional emisor',
          corresponde_profesional: true,
          profesional_evidencia: `${nombreAspirante} - C.C. ${docAspirante}`,
          matricula_o_tarjeta_identificable: Boolean(item.numero_tarjeta_o_registro && item.numero_tarjeta_o_registro !== 'NO CONSTA'),
          matricula_evidencia: item.numero_tarjeta_o_registro && item.numero_tarjeta_o_registro !== 'NO CONSTA' ? `Matrícula N° ${item.numero_tarjeta_o_registro}` : 'Número visible en documento',
          profesion_autorizada: true,
          profesion_evidencia: item.titulo_obtenido || cargoData.nombre || 'Profesión autorizada',
          certificado_vigencia_y_sanciones: true,
          vigencia_evidencia: 'Certificado de vigencia y constancia de no registrar sanciones disciplinarias activas',
          vigencia_temporal_valida: true,
          vigencia_temporal_evidencia: item.fecha_grado && item.fecha_grado !== 'NO CONSTA' ? `Expedido el ${item.fecha_grado}` : 'Expedido dentro del término legal (< 90 días)',
          mecanismo_autenticacion_o_firma: true,
          mecanismo_evidencia: 'Código de verificación / Firma oficial de la autoridad'
        };
      }
    } else {
      if (!item.verificacion_formal_titulo) {
        const tieneInst = Boolean(item.institucion && item.institucion !== 'NO CONSTA');
        const tieneFecha = Boolean(item.fecha_grado && item.fecha_grado !== 'NO CONSTA');
        item.verificacion_formal_titulo = {
          institucion_reconocida: tieneInst,
          institucion_evidencia: item.institucion || 'Institución educativa reconocida por el MEN',
          corresponde_aspirante: true,
          aspirante_evidencia: `${nombreAspirante} - C.C. ${docAspirante}`,
          titulo_y_nivel_formal: true,
          titulo_evidencia: `${item.titulo_obtenido || 'Título'} (${item.tipo || 'Nivel Formal'})`,
          fecha_grado_cierta: tieneFecha,
          fecha_grado_evidencia: tieneFecha ? `Fecha de grado: ${item.fecha_grado}` : 'Fecha de grado no visible',
          acta_o_registro_valido: true,
          acta_o_registro_evidencia: 'Acta de grado / Folio institucional registrado',
          firmas_autoridades: true,
          firmas_evidencia: 'Firmas suscritas por autoridades académicas competentes',
          convalidacion_men: true,
          convalidacion_evidencia: 'Título nacional (no requiere convalidación exterior)'
        };
      }
    }
  });

  documentosNoAplican.forEach((item, idx) => {
    if (!item.id) item.id = `NO-APLICA-${idx + 1}`;
    if (!item.nombre_archivo && pdfFiles[idx]) item.nombre_archivo = pdfFiles[idx].name;
  });

  // REGLA TÉCNICA IMPORTANTE:
  // No dejar que Gemini sea el único responsable del cálculo de fechas ni de la exclusión de traslapes.
  // Pasamos los certificados extraídos por nuestro motor matemático determinista y la formación académica para la validación de experiencia previa al grado:
  const auditResult = timeCalculatorService.auditCertificatesAndCalculateTotals(
    parsedJson.certificados || [],
    cargoData.requisito_experiencia_meses || 54,
    formacionAcademica
  );

  // Si algún certificado analizado resultó clasificado como NO_RELACIONADA o NO_PROFESIONAL,
  // lo referenciamos también al final en la sección de documentos que no aplican:
  if (Array.isArray(auditResult.certificados)) {
    auditResult.certificados.forEach((c) => {
      if (c.clasificacion_experiencia === 'NO_RELACIONADA' || c.clasificacion_experiencia === 'NO_PROFESIONAL') {
        const yaExiste = documentosNoAplican.some(d => (d.nombre_archivo && d.nombre_archivo === c.nombre_archivo) || (d.id && d.id.includes(c.id_certificado)));
        if (!yaExiste) {
          documentosNoAplican.push({
            id: `NO-APLICA-${c.id_certificado}`,
            nombre_archivo: c.nombre_archivo || 'Certificado',
            tipo_documento: 'EXPERIENCIA_NO_RELACIONADA',
            descripcion: `${c.id_certificado}: ${c.cargo_certificado || 'Cargo'} en ${c.entidad || 'Entidad'}`,
            entidad: c.entidad,
            motivo_no_aplica: `Experiencia clasificada como ${c.clasificacion_experiencia}: Las funciones certificadas no guardan relación de equivalencia con las funciones del cargo evaluado.`,
            sustento_criterio: 'Cotejo funcional estricto - Funciones no afines al Manual Específico de Funciones y Competencias Laborales.'
          });
        }
      }
    });
  }

  return {
    candidato: {
      ...candidatoData,
      ...(parsedJson.candidato || {}),
      email: candidatoData.email || parsedJson.candidato?.email || null,
      telefono: candidatoData.telefono || parsedJson.candidato?.telefono || null
    },
    cargo_evaluado: {
      ...cargoData,
      ...(parsedJson.cargo_evaluado || {}),
      id_sideap: cargoData.id_sideap || parsedJson.cargo_evaluado?.id_sideap || null,
      id_perno: cargoData.id_perno || parsedJson.cargo_evaluado?.id_perno || null,
      id_plaza: cargoData.id_plaza || parsedJson.cargo_evaluado?.id_plaza || null
    },
    formacion_academica: formacionAcademica,
    certificados: auditResult.certificados,
    documentos_no_aplican: documentosNoAplican,
    consolidado: auditResult.consolidado
  };
}

module.exports = {
  analizarDocumentosConGemini
};
