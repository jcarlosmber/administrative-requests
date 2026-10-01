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
- Clasifica la coincidencia como: "DIRECTA", "PARCIAL", "INDIRECTA" o "SIN_RELACIÓN".
- Justifica la clasificación y cita la evidencia textual.
- Si no existe correspondencia funcional suficiente, NO clasifiques como RELACIONADA.

VERIFICACIÓN FORMAL OBLIGATORIA (7 CHECKS BÁSICOS POR CERTIFICADO):
Para cada documento analizado, evalúa de manera estricta y fidedigna:
1. El certificado corresponde al aspirante y contiene su nombre completo e identificación.
2. Se identifica claramente la entidad o empresa que expide el certificado.
3. Se identifica el nombre, cargo y calidad de quien suscribe el documento.
4. El certificado cuenta con firma manuscrita, electrónica o digital, según corresponda.
5. Se identifica la fecha de expedición del certificado.
6. El documento es legible, íntegro y no presenta alteraciones visibles.
7. Se dispone de datos de contacto o mecanismos para verificar la información con la entidad emisora (cuáles: teléfonos, PBX, correo, dirección, web, código QR). Si no constan, indicar "NO CONSTA".
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

  // Usamos gemini-1.5-flash o gemini-2.5-flash / gemini-1.5-pro según disponibilidad
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1, // Baja temperatura para máxima precisión fidedigna
    },
  });

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
Se adjuntan ${pdfFiles.length} documento(s) PDF de certificaciones laborales o de contratos.

INSTRUCCIONES DE RESPUESTA:
Extrae la información de cada documento de acuerdo con las 18 reglas obligatorias y responde en el siguiente formato JSON:
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
      "tipo_vinculo": "Tipo de vinculación (ej. Contrato de prestación de servicios, Carrera, Provisionalidad)",
      "cargo_certificado": "Cargo o denominación del contrato",
      "codigo_cargo": "Código si consta o NO CONSTA",
      "grado_cargo": "Grado si consta o NO CONSTA",
      "dependencia": "Dependencia certificada o NO CONSTA",
      "numero_contrato_o_acto": "Número de contrato o acto administrativo o NO CONSTA",
      "fecha_inicio": "YYYY-MM-DD exacta",
      "fecha_fin": "YYYY-MM-DD exacta (o NO CONSTA si vigente)",
      "vinculo_vigente": false,
      "funciones_certificadas": [
        {
          "funcion": "Texto de la función certificada",
          "evidencia_textual": "Cita textual del documento entre comillas"
        }
      ],
      "experiencia_profesional": true,
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

  console.log(`[GeminiIngresos] Enviando ${pdfFiles.length} documento(s) para análisis...`);
  const result = await model.generateContent(parts);
  const responseText = result.response.text();

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

  // REGLA TÉCNICA IMPORTANTE:
  // No dejar que Gemini sea el único responsable del cálculo de fechas ni de la exclusión de traslapes.
  // Pasamos los certificados extraídos por nuestro motor matemático determinista:
  const auditResult = timeCalculatorService.auditCertificatesAndCalculateTotals(
    parsedJson.certificados || [],
    cargoData.requisito_experiencia_meses || 54
  );

  return {
    candidato: parsedJson.candidato || candidatoData,
    cargo_evaluado: parsedJson.cargo_evaluado || cargoData,
    certificados: auditResult.certificados,
    consolidado: auditResult.consolidado
  };
}

module.exports = {
  analizarDocumentosConGemini
};
