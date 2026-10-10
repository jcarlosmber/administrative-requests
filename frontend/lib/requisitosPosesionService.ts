// ============================================================================
// SERVICIO Y DATOS MAESTROS DEL FORMATO 2311300-FT-095 V05
// REQUISITOS PARA TOMAR POSESIÓN DEL CARGO - SECRETARÍA JURÍDICA DISTRITAL
// ============================================================================

export interface RequisitoPosesionFT095Item {
  numero: number;
  nombre: string;
  normaODetalle?: string;
  categoria:
    | 'IDENTIFICACION_ESTUDIOS'
    | 'ACTO_ADMINISTRATIVO'
    | 'ANTECEDENTES_VERIFICACION'
    | 'BIENES_CONFLICTOS_SIDEAP'
    | 'FORMATOS_INSTITUCIONALES'
    | 'SEGURIDAD_SOCIAL'
    | 'LNR_COMPETENCIAS';
  aplicaLnr: boolean;
  aplicaCarrera: boolean;
  aplicaProvisional: boolean;
}

export const LISTA_32_REQUISITOS_FT095: RequisitoPosesionFT095Item[] = [
  {
    numero: 1,
    nombre: 'CERTIFICADO DE CUMPLIMIENTO DE REQUISITOS PARA TOMAR POSESIÓN FORMATO 2311300-FT-318',
    normaODetalle: 'Manual de Funciones Res. 020 de 2019 • Generado en Validación Técnica de Ingresos',
    categoria: 'FORMATOS_INSTITUCIONALES',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 2,
    nombre: 'RESOLUCIÓN DE NOMBRAMIENTO Y COMUNICACIÓN DEL NOMBRAMIENTO',
    normaODetalle: 'Acto administrativo formal expedido por el nominador y constancia de notificación/comunicación oficial',
    categoria: 'ACTO_ADMINISTRATIVO',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 3,
    nombre: 'ACEPTACIÓN DEL EMPLEO',
    normaODetalle: 'Escrito formal de aceptación radicado dentro de los términos legales (Art. 2.2.5.1.6 Dec. 1083/2015)',
    categoria: 'ACTO_ADMINISTRATIVO',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 4,
    nombre: 'COMUNICACIÓN DE LA FECHA, LUGAR Y HORA DE LA POSESIÓN',
    normaODetalle: 'Citación oficial expedida por la Dirección de Gestión Corporativa / Talento Humano',
    categoria: 'ACTO_ADMINISTRATIVO',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 5,
    nombre: 'ANTECEDENTES - REQUERIMIENTOS JUDICIALES EXPEDIDO POR LA POLICÍA NACIONAL',
    normaODetalle: 'Certificado de antecedentes judiciales en línea Policía Nacional de Colombia',
    categoria: 'ANTECEDENTES_VERIFICACION',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 6,
    nombre: 'CERTIFICADO VIGENTE NO INCLUSIÓN BOLETÍN RESPONSABILIDAD FISCAL CONTRALORÍA',
    normaODetalle: 'Ley 610 de 2000, Art. 60 • Contraloría General de la República',
    categoria: 'ANTECEDENTES_VERIFICACION',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 7,
    nombre: 'REGISTRO NACIONAL DE MEDIDAS CORRECTIVAS (RNMC), EXPEDIDO POR LA POLICÍA NACIONAL',
    normaODetalle: 'Ley 1801 de 2016 • Código Nacional de Policía y Convivencia Ciudadana',
    categoria: 'ANTECEDENTES_VERIFICACION',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 8,
    nombre: 'ANTECEDENTES DISCIPLINARIOS PERSONERÍA DE BOGOTÁ D.C.',
    normaODetalle: 'Constancia distrital expedida por la Personería de Bogotá',
    categoria: 'ANTECEDENTES_VERIFICACION',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 9,
    nombre: 'ANTECEDENTES DISCIPLINARIOS PROCURADURÍA GENERAL DE LA NACIÓN',
    normaODetalle: 'Certificado ordinario / especial de antecedentes disciplinarios PGN',
    categoria: 'ANTECEDENTES_VERIFICACION',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 10,
    nombre: 'REGISTRO DE DEUDORES ALIMENTARIOS MOROSOS - REDAM',
    normaODetalle: 'Ley 2097 de 2021 • Certificado oficial expedido por www.redam.gov.co (Vigencia máxima 3 meses)',
    categoria: 'ANTECEDENTES_VERIFICACION',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 11,
    nombre: 'FORMATO ÚNICO DE HOJA DE VIDA, VALIDADA EN SIDEAP',
    normaODetalle: 'Diligenciamiento e impresión de la Hoja de Vida aprobada en SIDEAP con soportes',
    categoria: 'BIENES_CONFLICTOS_SIDEAP',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 12,
    nombre: 'VERIFICAR LA FIRMA DEL FORMATO ÚNICO DE HOJA DE VIDA DEL SIDEAP POR EL DIRECTOR DE GESTIÓN CORPORATIVA',
    normaODetalle: 'Circular 10 Veeduría Distrital del 09/07/2014',
    categoria: 'BIENES_CONFLICTOS_SIDEAP',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 13,
    nombre: 'FORMATO DECLARACIÓN DE BIENES Y RENTAS SIDEAP',
    normaODetalle: 'Declaración periódica o de ingreso formalizada y firmada en el sistema distrital SIDEAP',
    categoria: 'BIENES_CONFLICTOS_SIDEAP',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 14,
    nombre: 'FORMATO DECLARACIÓN GENERAL DE CONFLICTOS DE INTERÉS SIDEAP',
    normaODetalle: 'Diligenciamiento obligatorio en SIDEAP de declaración de posibles conflictos',
    categoria: 'BIENES_CONFLICTOS_SIDEAP',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 15,
    nombre: 'FORMATO DE PUBLICACIÓN PROACTIVA DECLARACIÓN DE BIENES Y RENTAS Y REGISTRO DE CONFLICTOS DE INTERÉS',
    normaODetalle: 'Ley 2013 de 2019, Ley 1437 de 2011 • Aplicativo por la Integridad Pública (https://www.funcionpublica.gov.co/fdci/)',
    categoria: 'BIENES_CONFLICTOS_SIDEAP',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 16,
    nombre: 'FOTOCOPIA DE LA CÉDULA DE CIUDADANÍA',
    normaODetalle: 'Documento de identidad legible ampliado al 150%',
    categoria: 'IDENTIFICACION_ESTUDIOS',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 17,
    nombre: 'DIPLOMAS, ACTAS DE GRADO - CERTIFICADOS DE ESTUDIOS',
    normaODetalle: 'Copia auténtica de títulos académicos requeridos según Manual Específico de Funciones Res. 020 de 2019',
    categoria: 'IDENTIFICACION_ESTUDIOS',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 18,
    nombre: 'CERTIFICADOS LABORALES',
    normaODetalle: 'Deben indicar expresamente: Entidad, Tiempo Laborado (fecha inicio y fin) y Cargo Desempeñado / Funciones',
    categoria: 'IDENTIFICACION_ESTUDIOS',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 19,
    nombre: 'COPIA TARJETA, MATRÍCULA O REGISTRO PROFESIONAL',
    normaODetalle: 'O certificación oficial de que se encuentra en trámite (Decreto 785 de 2005, Art. 7)',
    categoria: 'IDENTIFICACION_ESTUDIOS',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 20,
    nombre: 'CERTIFICADO DE ANTECEDENTES DISCIPLINARIOS EXPEDIDO POR LA ENTIDAD COMPETENTE PARA CADA PROFESIÓN',
    normaODetalle: 'Consejo Superior de la Judicatura / CPNAA / COPNIA / Junta Central de Contadores / etc. (Si aplica)',
    categoria: 'ANTECEDENTES_VERIFICACION',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 21,
    nombre: 'FORMATO DE AUTORIZACIÓN VERIFICACIÓN DE TÍTULOS FORMATO 2311300-FT-319',
    normaODetalle: 'Formato institucional suscrito autorizando la consulta ante instituciones educativas',
    categoria: 'FORMATOS_INSTITUCIONALES',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 22,
    nombre: 'DECLARACIÓN JURAMENTADA FORMATO 2311300-FT-027',
    normaODetalle: 'Formato de manifestación de no inhabilidades, incompatibilidades ni antecedentes penales',
    categoria: 'FORMATOS_INSTITUCIONALES',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 23,
    nombre: 'COMPROMISO DE CONFIDENCIALIDAD DE INFORMACIÓN FORMATO: 2310200-FT-268',
    normaODetalle: 'Formato suscrito de custodia y reserva de información confidencial y reservada',
    categoria: 'FORMATOS_INSTITUCIONALES',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 24,
    nombre: 'CERTIFICACIÓN DE CUENTA BANCARIA',
    normaODetalle: 'Certificación bancaria no mayor a 30 días para nómina institucional',
    categoria: 'SEGURIDAD_SOCIAL',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 25,
    nombre: 'CERTIFICACIÓN DE AFILIACIÓN ADMINISTRADORA DE PENSIONES',
    normaODetalle: 'Certificado de afiliación vigente a fondo de pensiones (Colpensiones o Fondo Privado)',
    categoria: 'SEGURIDAD_SOCIAL',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 26,
    nombre: 'CERTIFICACIÓN DE AFILIACIÓN ADMINISTRADORA DE CESANTÍAS',
    normaODetalle: 'Certificado de afiliación vigente a fondo de cesantías (FNA o Fondo Privado)',
    categoria: 'SEGURIDAD_SOCIAL',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 27,
    nombre: 'FORMULARIO RADICADO O SOPORTE DE AFILIACIÓN EMPRESA PROMOTORA DE SALUD (EPS)',
    normaODetalle: 'Formulario de traslado/afiliación o constancia de afiliación activa al sistema de salud',
    categoria: 'SEGURIDAD_SOCIAL',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 28,
    nombre: 'FORMULARIO RADICADO O SOPORTE DE AFILIACIÓN A LA CAJA DE COMPENSACIÓN FAMILIAR',
    normaODetalle: 'Formulario de afiliación suscrito a Compensar (Caja distrital asignada)',
    categoria: 'SEGURIDAD_SOCIAL',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 29,
    nombre: 'AFILIACIÓN ARL (ADMINISTRADORA RIESGOS LABORALES) SEGURIDAD Y SALUD EN EL TRABAJO',
    normaODetalle: 'Constancia de reporte y afiliación previa en Positiva Compañía de Seguros S.A.',
    categoria: 'SEGURIDAD_SOCIAL',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 30,
    nombre: 'EXAMEN MÉDICO DE INGRESO - SEGURIDAD Y SALUD EN EL TRABAJO',
    normaODetalle: 'Concepto de aptitud laboral emitido por el centro médico ocupacional autorizado',
    categoria: 'SEGURIDAD_SOCIAL',
    aplicaLnr: true,
    aplicaCarrera: true,
    aplicaProvisional: true,
  },
  {
    numero: 31,
    nombre: 'EVALUACIÓN DE COMPETENCIAS COMPORTAMENTALES EXPEDIDO POR EL DASCD',
    normaODetalle: 'Prueba psicotécnica SEVCOM DASCD aprobada (Solo aplica para cargos de Libre Nombramiento y Remoción LNR)',
    categoria: 'LNR_COMPETENCIAS',
    aplicaLnr: true,
    aplicaCarrera: false,
    aplicaProvisional: false,
  },
  {
    numero: 32,
    nombre: 'SOPORTE DE PUBLICACIÓN DE HOJA DE VIDA EN LA PÁGINA WEB DEL DASCD',
    normaODetalle: 'Publicación previa durante 5 días hábiles (Decreto 1083/2015 y Acuerdos Distritales, solo para LNR)',
    categoria: 'LNR_COMPETENCIAS',
    aplicaLnr: true,
    aplicaCarrera: false,
    aplicaProvisional: false,
  },
];

export type EstadoItemFT095 = 'CUMPLE' | 'PENDIENTE' | 'NO_APLICA';

export interface EvaluacionItemFT095 {
  numero: number;
  estado: EstadoItemFT095;
  observaciones?: string;
}

export interface DatosFormatoFT095Diligenciado {
  nombresApellidos: string;
  nombreIdentitario?: string;
  documentoIdentidad: string;
  cargo: string;
  codigo: string;
  grado: string;
  dependencia: string;
  tipoVinculacion: string; // Libre Nombramiento y Remoción, Carrera Administrativa, Provisionalidad
  fechaVerificacion: string;
  items: Record<number, EvaluacionItemFT095>;
  observacionesGenerales?: string;
  verificadorVinculaciones: {
    nombre: string;
    cargo: string;
    fecha: string;
  };
  verificadorArchivoHojasVida: {
    nombre: string;
    cargo: string;
    fecha: string;
  };
}

export const requisitosPosesionService = {
  /**
   * Inicializa la estructura del formato FT-095 con valores por defecto a partir de los datos del funcionario.
   */
  crearEstadoInicial(
    datosServidor: {
      nombre: string;
      cedula: string;
      cargo: string;
      codigo?: string;
      grado?: string;
      dependencia: string;
      modalidad?: string;
      fecha?: string;
    }
  ): DatosFormatoFT095Diligenciado {
    const esLnr = (datosServidor.modalidad || '').toUpperCase().includes('LIBRE');
    const items: Record<number, EvaluacionItemFT095> = {};

    LISTA_32_REQUISITOS_FT095.forEach((req) => {
      let estadoDefault: EstadoItemFT095 = 'CUMPLE';
      if ((req.numero === 31 || req.numero === 32) && !esLnr) {
        estadoDefault = 'NO_APLICA';
      }
      items[req.numero] = {
        numero: req.numero,
        estado: estadoDefault,
        observaciones: '',
      };
    });

    const fechaHoy = datosServidor.fecha || new Date().toISOString().split('T')[0];

    return {
      nombresApellidos: datosServidor.nombre,
      nombreIdentitario: '',
      documentoIdentidad: datosServidor.cedula,
      cargo: datosServidor.cargo,
      codigo: datosServidor.codigo || '000',
      grado: datosServidor.grado || '00',
      dependencia: datosServidor.dependencia,
      tipoVinculacion: esLnr
        ? 'Libre Nombramiento y Remoción'
        : (datosServidor.modalidad || '').toUpperCase().includes('PROV')
        ? 'Provisionalidad'
        : 'Carrera Administrativa',
      fechaVerificacion: fechaHoy,
      items,
      observacionesGenerales:
        'Documentación verificada conforme a las directrices de la Dirección de Gestión Corporativa y manuales de funciones vigentes (Res. 020 de 2019).',
      verificadorVinculaciones: {
        nombre: 'PROFESIONAL DE VINCULACIONES - TALENTO HUMANO',
        cargo: 'Profesional Especializado - Dirección de Gestión Corporativa',
        fecha: fechaHoy,
      },
      verificadorArchivoHojasVida: {
        nombre: 'ENCARGADO DE ARCHIVO DE HISTORIAS LABORALES',
        cargo: 'Técnico Operativo - Archivo de Hojas de Vida',
        fecha: fechaHoy,
      },
    };
  },

  /**
   * Calcula el total de ítems cumplidos, pendientes y porcentaje.
   */
  calcularResumen(datos: DatosFormatoFT095Diligenciado) {
    let cumplidos = 0;
    let pendientes = 0;
    let noAplica = 0;
    let aplicables = 0;

    LISTA_32_REQUISITOS_FT095.forEach((req) => {
      const it = datos.items[req.numero];
      const est = it ? it.estado : 'PENDIENTE';
      if (est === 'CUMPLE') {
        cumplidos++;
        aplicables++;
      } else if (est === 'PENDIENTE') {
        pendientes++;
        aplicables++;
      } else {
        noAplica++;
      }
    });

    const porcentaje = aplicables > 0 ? Math.round((cumplidos / aplicables) * 100) : 0;
    const esApto = pendientes === 0 && cumplidos > 0;

    return {
      total: 32,
      cumplidos,
      pendientes,
      noAplica,
      aplicables,
      porcentaje,
      esApto,
    };
  },

  /**
   * Genera el contenido HTML con formato oficial de Word (.doc) que reproduce con exactitud
   * el diseño institucional del Formato 2311300-FT-095 Versión 05.
   */
  generarDocumentoDocHTML(datos: DatosFormatoFT095Diligenciado): string {
    const resumen = this.calcularResumen(datos);

    const filasHTML = LISTA_32_REQUISITOS_FT095.map((req) => {
      const it = datos.items[req.numero] || { estado: 'PENDIENTE', observaciones: '' };
      const esCumple = it.estado === 'CUMPLE';
      const esPendiente = it.estado === 'PENDIENTE';
      const esNoAplica = it.estado === 'NO_APLICA';

      const checkCumple = esCumple ? '<b>X</b>' : '&nbsp;';
      const checkNoCumple = esPendiente ? '<b>X</b>' : '&nbsp;';
      const checkNA = esNoAplica ? '<b>X</b>' : '&nbsp;';

      const obsTexto = it.observaciones || '';

      return `
        <tr style="font-size: 8.5pt;">
          <td style="border: 1px solid #333333; text-align: center; padding: 4px; font-weight: bold; width: 4%;">${req.numero}</td>
          <td style="border: 1px solid #333333; padding: 4px; width: 66%;">
            <div style="font-weight: bold; color: #0F172A;">${req.nombre}</div>
            ${req.normaODetalle ? `<div style="font-size: 7.5pt; color: #475569; margin-top: 2px;"><i>${req.normaODetalle}</i></div>` : ''}
          </td>
          <td style="border: 1px solid #333333; text-align: center; padding: 4px; font-size: 10pt; width: 5%; background-color: ${esCumple ? '#ecfdf5' : '#ffffff'};">${checkCumple}</td>
          <td style="border: 1px solid #333333; text-align: center; padding: 4px; font-size: 10pt; width: 5%; background-color: ${esPendiente ? '#fffbeb' : '#ffffff'};">${checkNoCumple}</td>
          <td style="border: 1px solid #333333; text-align: center; padding: 4px; font-size: 10pt; width: 5%; background-color: ${esNoAplica ? '#f1f5f9' : '#ffffff'};">${checkNA}</td>
          <td style="border: 1px solid #333333; padding: 4px; width: 15%; font-size: 8pt; color: #334155;">${obsTexto || '-'}</td>
        </tr>
      `;
    }).join('');

    return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>2311300-FT-095 Requisitos para tomar posesion del cargo</title>
        <style>
          @page {
            size: letter;
            margin: 1.5cm 1.5cm 1.5cm 1.5cm;
            mso-header-margin: 1cm;
            mso-footer-margin: 1cm;
          }
          body {
            font-family: Arial, sans-serif;
            color: #1e293b;
            line-height: 1.25;
            margin: 0;
            padding: 0;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        <!-- ENCABEZADO INSTITUCIONAL OFICIAL SJD -->
        <table style="width: 100%; border: 1.5px solid #000000; margin-bottom: 12px;">
          <tr>
            <td style="width: 25%; border-right: 1px solid #000000; text-align: center; padding: 8px; vertical-align: middle;">
              <div style="font-size: 12pt; font-weight: bold; color: #0D2A48;">ALCALDÍA MAYOR<br>DE BOGOTÁ D.C.</div>
              <div style="font-size: 7.5pt; color: #334155; margin-top: 4px;">SECRETARÍA JURÍDICA DISTRITAL</div>
            </td>
            <td style="width: 50%; border-right: 1px solid #000000; text-align: center; padding: 8px; vertical-align: middle;">
              <div style="font-size: 11pt; font-weight: bold; color: #0D2A48;">REQUISITOS PARA TOMAR POSESIÓN DEL CARGO</div>
              <div style="font-size: 8.5pt; font-weight: bold; color: #1e293b; margin-top: 4px;">DIRECCIÓN DE GESTIÓN CORPORATIVA</div>
              <div style="font-size: 7.5pt; color: #475569; margin-top: 3px;">CLASIFICACIÓN DE LA INFORMACIÓN: PÚBLICA CLASIFICADA</div>
            </td>
            <td style="width: 25%; text-align: center; padding: 6px; vertical-align: middle; font-size: 8pt;">
              <div style="font-weight: bold;">Código: 2311300-FT-095</div>
              <div style="margin-top: 2px;">Versión: 05</div>
              <div style="margin-top: 2px;">Fecha de Vigencia: 2026</div>
              <div style="margin-top: 3px; font-size: 7pt; color: #059669; font-weight: bold;">ESTADO: ${resumen.esApto ? 'DOCUMENTACIÓN COMPLETA' : 'EN TRÁMITE'}</div>
            </td>
          </tr>
        </table>

        <!-- DATOS DEL SERVIDOR PÚBLICO -->
        <table style="width: 100%; border: 1px solid #000000; margin-bottom: 10px; font-size: 8.5pt;">
          <tr style="background-color: #f1f5f9;">
            <td colspan="4" style="padding: 4px 8px; font-weight: bold; border-bottom: 1px solid #000000; text-transform: uppercase; color: #0D2A48;">
              I. IDENTIFICACIÓN DEL ASPIRANTE / SERVIDOR PÚBLICO
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #333333; padding: 4px 6px; width: 22%; font-weight: bold; background-color: #fafafa;">NOMBRES Y APELLIDOS:</td>
            <td style="border: 1px solid #333333; padding: 4px 6px; width: 40%; font-weight: bold; color: #0F172A;">${datos.nombresApellidos || '-'}</td>
            <td style="border: 1px solid #333333; padding: 4px 6px; width: 18%; font-weight: bold; background-color: #fafafa;">DOCUMENTO DE IDENTIDAD:</td>
            <td style="border: 1px solid #333333; padding: 4px 6px; width: 20%; font-weight: bold;">${datos.documentoIdentidad || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #333333; padding: 4px 6px; font-weight: bold; background-color: #fafafa;">NOMBRE IDENTITARIO (Trans):</td>
            <td style="border: 1px solid #333333; padding: 4px 6px;">${datos.nombreIdentitario || 'NO APLICA / NO REGISTRA'}</td>
            <td style="border: 1px solid #333333; padding: 4px 6px; font-weight: bold; background-color: #fafafa;">TIPO DE VINCULACIÓN:</td>
            <td style="border: 1px solid #333333; padding: 4px 6px; font-weight: bold; color: #0D2A48;">${datos.tipoVinculacion || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #333333; padding: 4px 6px; font-weight: bold; background-color: #fafafa;">CARGO:</td>
            <td style="border: 1px solid #333333; padding: 4px 6px;">${datos.cargo || '-'}</td>
            <td style="border: 1px solid #333333; padding: 4px 6px; font-weight: bold; background-color: #fafafa;">CÓDIGO Y GRADO:</td>
            <td style="border: 1px solid #333333; padding: 4px 6px;">${datos.codigo || '000'} - ${datos.grado || '00'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #333333; padding: 4px 6px; font-weight: bold; background-color: #fafafa;">DEPENDENCIA ASIGNADA:</td>
            <td style="border: 1px solid #333333; padding: 4px 6px;">${datos.dependencia || '-'}</td>
            <td style="border: 1px solid #333333; padding: 4px 6px; font-weight: bold; background-color: #fafafa;">FECHA DE VERIFICACIÓN:</td>
            <td style="border: 1px solid #333333; padding: 4px 6px;">${datos.fechaVerificacion || '-'}</td>
          </tr>
        </table>

        <!-- TABLA PRINCIPAL DE 32 REQUISITOS -->
        <table style="width: 100%; border: 1.5px solid #000000; margin-bottom: 12px;">
          <thead>
            <tr style="background-color: #0D2A48; color: #ffffff; font-size: 8.5pt;">
              <th style="border: 1px solid #000000; padding: 5px; width: 4%;">No.</th>
              <th style="border: 1px solid #000000; padding: 5px; width: 66%; text-align: left;">REQUISITO / DOCUMENTACIÓN EXIGIDA PARA POSESIÓN</th>
              <th style="border: 1px solid #000000; padding: 5px; width: 5%; text-align: center;">CUMPLE</th>
              <th style="border: 1px solid #000000; padding: 5px; width: 5%; text-align: center;">PENDIENTE</th>
              <th style="border: 1px solid #000000; padding: 5px; width: 5%; text-align: center;">N/A</th>
              <th style="border: 1px solid #000000; padding: 5px; width: 15%; text-align: left;">OBSERVACIONES</th>
            </tr>
          </thead>
          <tbody>
            ${filasHTML}
          </tbody>
        </table>

        <!-- OBSERVACIONES GENERALES -->
        <table style="width: 100%; border: 1px solid #000000; margin-bottom: 12px; font-size: 8.5pt;">
          <tr style="background-color: #f1f5f9;">
            <td style="padding: 4px 8px; font-weight: bold; border-bottom: 1px solid #000000; color: #0D2A48;">
              OBSERVACIONES GENERALES DEL PROCESO DE POSESIÓN:
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; min-height: 45px; line-height: 1.4; color: #1e293b;">
              ${datos.observacionesGenerales || 'Sin observaciones adicionales registradas.'}
              <br><br>
              <i>Resumen de Verificación Técnica: Cumplidos: ${resumen.cumplidos} / 32 | Pendientes: ${resumen.pendientes} | No Aplica: ${resumen.noAplica} | Avance: ${resumen.porcentaje}% (${resumen.esApto ? 'APTO PARA TOMA DE POSESIÓN' : 'DOCUMENTACIÓN EN REVISIÓN'}).</i>
            </td>
          </tr>
        </table>

        <!-- ENCARGADOS DE VERIFICAR LA DOCUMENTACIÓN -->
        <table style="width: 100%; border: 1px solid #000000; font-size: 8.5pt;">
          <tr style="background-color: #f1f5f9;">
            <td colspan="5" style="padding: 4px 8px; font-weight: bold; border-bottom: 1px solid #000000; text-transform: uppercase; color: #0D2A48;">
              ENCARGADOS DE VERIFICAR LA DOCUMENTACIÓN
            </td>
          </tr>
          <tr style="background-color: #fafafa; font-weight: bold; text-align: center;">
            <td style="border: 1px solid #333333; padding: 4px; width: 22%;">RESPONSABLE</td>
            <td style="border: 1px solid #333333; padding: 4px; width: 28%;">NOMBRES COMPLETOS</td>
            <td style="border: 1px solid #333333; padding: 4px; width: 25%;">CARGO</td>
            <td style="border: 1px solid #333333; padding: 4px; width: 13%;">FIRMA</td>
            <td style="border: 1px solid #333333; padding: 4px; width: 12%;">FECHA</td>
          </tr>
          <tr>
            <td style="border: 1px solid #333333; padding: 8px 6px; font-weight: bold;">Encargado de vinculaciones</td>
            <td style="border: 1px solid #333333; padding: 8px 6px;">${datos.verificadorVinculaciones.nombre}</td>
            <td style="border: 1px solid #333333; padding: 8px 6px;">${datos.verificadorVinculaciones.cargo}</td>
            <td style="border: 1px solid #333333; padding: 8px 6px; text-align: center; color: #64748b; font-style: italic;">[Firma Digital SJD]</td>
            <td style="border: 1px solid #333333; padding: 8px 6px; text-align: center;">${datos.verificadorVinculaciones.fecha}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #333333; padding: 8px 6px; font-weight: bold;">Encargado de archivo de hojas de vida</td>
            <td style="border: 1px solid #333333; padding: 8px 6px;">${datos.verificadorArchivoHojasVida.nombre}</td>
            <td style="border: 1px solid #333333; padding: 8px 6px;">${datos.verificadorArchivoHojasVida.cargo}</td>
            <td style="border: 1px solid #333333; padding: 8px 6px; text-align: center; color: #64748b; font-style: italic;">[Firma Digital SJD]</td>
            <td style="border: 1px solid #333333; padding: 8px 6px; text-align: center;">${datos.verificadorArchivoHojasVida.fecha}</td>
          </tr>
        </table>

        <div style="margin-top: 10px; font-size: 7.5pt; color: #64748b; font-style: italic; text-align: right;">
          Nota: Los documentos deben ser verificados y ordenados para su archivo en la historia laboral correspondiente conforme a la Ley 594 de 2000.
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Ejecuta la descarga directa en el navegador del archivo .doc generado con la tabla oficial.
   */
  descargarDocumentoDoc(datos: DatosFormatoFT095Diligenciado) {
    const html = this.generarDocumentoDocHTML(datos);
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const seguroNombre = (datos.nombresApellidos || 'Servidor').replace(/[^a-zA-Z0-9]/g, '_');
    link.href = url;
    link.download = `2311300-FT-095_Requisitos_Posesion_${seguroNombre}_V5.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Abre una ventana emergente limpia lista para imprimir o guardar como PDF oficial.
   */
  imprimirOPdf(datos: DatosFormatoFT095Diligenciado) {
    const html = this.generarDocumentoDocHTML(datos);
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
      }, 500);
    }
  },
};
