const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const smartSyncService = require('../services/smartSyncService');

const FORMATOS_DIR = path.join(__dirname, '../templates/formatos_rrhh');

// Catálogo institucional de formatos y guías del proceso de RRHH
// NOTA: El formato 2311300-FT-318 no se incluye como plantilla estática vacía
// porque se genera de manera dinámica con IA en el módulo de Validación Técnica de Ingresos.
const CATALOGO_FORMATOS = [
  {
    id: 'FT-268',
    codigo: '2310200-FT-268',
    nombre: 'Compromiso de Confidencialidad de Información',
    version: 'V2',
    archivo: '2310200-FT-268 Compromiso de Confidencialidad de Información V2.docx',
    tipo: 'DOCX',
    proceso: 'VINCULACION',
    fasesRecomendadas: ['Inducción y Puesto de Trabajo', 'Posesión'],
    descripcion: 'Compromiso formal de reserva, custodia y confidencialidad de la información institucional, sistemas y datos personales tratados por el servidor público.',
  },
  {
    id: 'FT-027',
    codigo: '2311300-FT-027',
    nombre: 'Declaración Juramentada de No Deudor Alimentario / Inhabilidades',
    version: 'V1',
    archivo: '2311300-FT-027 V1.doc',
    tipo: 'DOC',
    proceso: 'VINCULACION',
    fasesRecomendadas: ['Validación Candidato & Antecedentes', 'Posesión'],
    descripcion: 'Manifestación expresa bajo gravedad de juramento de no encontrarse reportado en el Registro de Deudores Alimentarios Morosos (REDAM) ni presentar inhabilidades.',
  },
  {
    id: 'FT-319',
    codigo: '2311300-FT-319',
    nombre: 'Autorización para Verificación de Títulos Académicos',
    version: 'V1',
    archivo: '2311300-FT-319 Autorización para Verificación de Títulos.doc',
    tipo: 'DOC',
    proceso: 'VINCULACION',
    fasesRecomendadas: ['Recepción Hoja de Vida', 'Validación Técnica'],
    descripcion: 'Autorización suscrita por el aspirante facultando a la Dirección de Gestión Corporativa para solicitar verificación y autenticidad de títulos y certificaciones.',
  },
  {
    id: 'FT-127',
    codigo: '2311300-FT-127',
    nombre: 'Acta de Posesión (Plantilla Oficial)',
    version: 'V2',
    archivo: 'Acta de Posesión_V2.docx',
    tipo: 'DOCX',
    proceso: 'VINCULACION',
    fasesRecomendadas: ['Posesión & Exámenes'],
    descripcion: 'Acta solemne de investidura y juramento constitucional de rigor para empleados públicos (Carrera, LNR y Provisionales).',
  },
  {
    id: 'FT-106',
    codigo: '2311300-FT-106',
    nombre: 'Acta de Ubicación y Entrenamiento en Puesto de Trabajo',
    version: 'V4',
    archivo: 'Ubicación y entrenamiento puesto de trabajo_V4.docx',
    tipo: 'DOCX',
    proceso: 'VINCULACION',
    fasesRecomendadas: ['Nómina & Entrenamiento / Inducción'],
    descripcion: 'Formato suscrito con el jefe inmediato que documenta la inducción al puesto, entrega de responsabilidades, metas y recursos asignados.',
  },
  {
    id: 'REQ-POSESION',
    codigo: 'GUI-POSESION-01',
    nombre: 'Instructivo y Lista de Chequeo: Requisitos para Tomar Posesión del Cargo',
    version: 'V5',
    archivo: 'Requisitos para tomar posesion del cargo_V5.doc',
    tipo: 'DOC',
    proceso: 'VINCULACION',
    fasesRecomendadas: ['Comunicación del Nombramiento', 'Posesión'],
    descripcion: 'Guía oficial para el ciudadano con el inventario detallado de documentos, certificados médicos, antecedentes y declaraciones previas al día de posesión.',
  },
  {
    id: 'FT-219',
    codigo: '2311300-FT-219',
    nombre: 'Evaluación de Retiro de Servidores Públicos',
    version: 'V2',
    archivo: '2311300-FT-219 Evaluación de Rétiro V2 (3).xlsx',
    tipo: 'XLSX',
    proceso: 'DESVINCULACION',
    fasesRecomendadas: ['Circuito de Paz y Salvo', 'Cierre y Liquidación'],
    formularioGoogleUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfvOxm8Du2CU6nGLPlN3bjLPjF7X765F8vCfaaPUlAFhtgSNg/viewform?usp=header',
    descripcion: 'Encuesta institucional y valoración de la experiencia laboral del servidor público saliente. Disponible para diligenciamiento digital en línea vía Google Forms o en plantilla Excel.',
  },
  {
    id: 'FT-436',
    codigo: '2311300-FT-436',
    nombre: 'Entrega de Cargo por Ausencia Temporal o Retiro Definitivo',
    version: 'V1',
    archivo: '2311300-FT-436 ENTREGA DE CARGO POR AUSENCIA TEMPORAL O RETIRO DEFINITIVO (4).xlsx',
    tipo: 'XLSX',
    proceso: 'DESVINCULACION',
    fasesRecomendadas: ['Entrega de Cargo y Bienes', 'Paz y Salvo Dependencia'],
    descripcion: 'Matriz en Excel para relacionar inventario físico, equipos, expedientes archivísticos, procesos en trámite y claves a transferir al relevo funcional.',
  },
  {
    id: 'FT-018',
    codigo: '2311520-FT-018',
    nombre: 'Memorando de Retiro / Solicitud de Personal (Formato 2311520-FT-018)',
    version: 'V3',
    archivo: '2311520-FT-018 Memorando V3.doc',
    tipo: 'DOC',
    proceso: 'DESVINCULACION',
    fasesRecomendadas: ['Causal & Soportes Legales', 'Recepción Documento Soporte'],
    descripcion: 'Formato institucional oficial de memorando para el soporte, verificación y radicación del retiro del servicio.',
  },
  {
    id: 'FT-019',
    codigo: '2311520-FT-019',
    nombre: 'Autorización formal de notificación electrónica / Oficio',
    version: 'V2',
    archivo: '2311520-FT-019 Oficio V2.doc',
    tipo: 'DOC',
    proceso: 'VINCULACION',
    fasesRecomendadas: ['Recepción Documentos Candidato', 'Notificación Formal de Actos'],
    descripcion: 'Formato institucional oficial de oficio / autorización formal para notificación electrónica personal de conformidad con la Ley 1437 de 2011 (CPACA).',
  },
  {
    id: 'FT-130',
    codigo: '2311520-FT-130',
    nombre: 'Proyecto de Resolución Oficial (Nombramiento / Retiro / Insubsistencia)',
    version: 'V2',
    archivo: 'Resolución _V2.doc',
    tipo: 'DOC',
    proceso: 'DESVINCULACION',
    fasesRecomendadas: ['Expedición Acto Administrativo', 'Resolución de Retiro'],
    descripcion: 'Plantilla estructurada institucional de resolución motivada de personal expedida por la Secretaría Jurídica Distrital.',
  },
  {
    id: 'FT-244',
    codigo: '2311520-FT-244',
    nombre: 'Hoja de Control y Constancia de Ejecutoria del Acto Administrativo',
    version: 'V2',
    archivo: '2311520-FT-244 Hoja de Control V2.xlsx',
    tipo: 'XLSX',
    proceso: 'DESVINCULACION',
    fasesRecomendadas: ['Notificación & Recursos', 'Constancia de Firmeza y Ejecutoria'],
    descripcion: 'Matriz oficial de control de trámite, términos preclusivos y certificación de firmeza del acto administrativo según el CPACA.',
  },
  {
    id: 'FT-100',
    codigo: '2311300-FT-100',
    nombre: 'Declaración extrajuicio sobre obligaciones alimentarias pendientes (REDAM)',
    version: 'V2',
    archivo: 'Declaración extrajuicio sobre obligaciones alimentarias pendientes_V2.doc',
    tipo: 'DOC',
    proceso: 'VINCULACION',
    fasesRecomendadas: ['Validación Candidato & Antecedentes', 'Posesión'],
    descripcion: 'Declaración jurada obligatoria de no encontrarse reportado en el Registro de Deudores Alimentarios Morosos (REDAM) de conformidad con la Ley 2097 de 2021.',
  },
  {
    id: 'ACTA-ENTREGA-LEY951',
    codigo: 'ACTA-GESTION-951',
    nombre: 'Acta de Informe de Gestión y Entrega de Cargo (Ley 951 de 2005)',
    version: 'V3',
    archivo: 'Acta de Informe de Gestión y Entrega de Cargo_V3 (5).docx',
    tipo: 'DOCX',
    proceso: 'DESVINCULACION',
    fasesRecomendadas: ['Formatos Entrega de Cargo', 'Entrega Despacho Control Interno'],
    descripcion: 'Estatuto legal obligatorio de entrega de gestión ante la Oficina de Control Interno dentro de los 15 días hábiles siguientes al retiro (Ley 951 de 2005).',
  },
  {
    id: 'PROC-VINCULACION',
    codigo: 'PR-VINC-01',
    nombre: 'Procedimiento Vinculación de Servidores Públicos (Copia Controlada)',
    version: 'V1',
    archivo: 'VINCULACIÓN DE SERVIDORES PÚBLICOS_V1_copia_controlada.pdf',
    tipo: 'PDF',
    proceso: 'GUIA_NORMATIVA',
    fasesRecomendadas: ['Consulta General de Proceso'],
    descripcion: 'Manual de procedimiento oficial documentado del sistema de gestión de calidad distrital para el ingreso de personal.',
  },
  {
    id: 'PROC-DESVINCULACION',
    codigo: 'PR-DESV-06',
    nombre: 'Procedimiento Desvinculación de Servidores Públicos (Copia Controlada)',
    version: 'V6',
    archivo: 'Desvinculación de Servidores Públicos_V6_copia_controlada (3).pdf',
    tipo: 'PDF',
    proceso: 'GUIA_NORMATIVA',
    fasesRecomendadas: ['Consulta General de Proceso'],
    descripcion: 'Manual oficial del procedimiento PR-074 para retiro, entrega de puesto, circuito de paz y salvo y liquidación.',
  },
  {
    id: 'PROC-PRACTICANTES',
    codigo: 'PR-PRAC-02',
    nombre: 'Procedimiento Vinculación de Practicantes y Judicantes (Copia Controlada)',
    version: 'V2',
    archivo: 'Vinculación de Practicantes_V2_copia_controlada (2).pdf',
    tipo: 'PDF',
    proceso: 'GUIA_NORMATIVA',
    fasesRecomendadas: ['Consulta General de Proceso'],
    descripcion: 'Manual oficial que reglamenta la vinculación formativa de practicantes y judicantes en la Secretaría Jurídica Distrital.',
  },
];

/**
 * GET /api/rrhh/formatos
 * Listado consolidado de formatos institucionales disponibles para descarga
 */
router.get('/formatos', (req, res) => {
  try {
    const { proceso } = req.query;
    let formatos = CATALOGO_FORMATOS;
    if (proceso && proceso !== 'TODOS') {
      formatos = formatos.filter(f => f.proceso === proceso);
    }
    res.json({
      total: formatos.length,
      formatos: formatos.map(f => ({
        ...f,
        urlDescarga: `/api/rrhh/formatos/descargar/${encodeURIComponent(f.archivo)}`,
        existeArchivo: fs.existsSync(path.join(FORMATOS_DIR, f.archivo))
      }))
    });
  } catch (err) {
    console.error('[RRHH] Error al listar formatos:', err);
    res.status(500).json({ error: 'Error al consultar formatos: ' + err.message });
  }
});

/**
 * GET /api/rrhh/formatos/descargar/:nombreArchivo
 * Descarga del archivo oficial del formato
 */
router.get('/formatos/descargar/:nombreArchivo', (req, res) => {
  try {
    const nombreArchivo = decodeURIComponent(req.params.nombreArchivo);
    // Validación de seguridad para path traversal
    const safeName = path.basename(nombreArchivo);
    const filePath = path.join(FORMATOS_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo de formato no encontrado en el servidor.' });
    }

    res.download(filePath, safeName, (err) => {
      if (err && !res.headersSent) {
        console.error('[RRHH] Error al enviar archivo de formato:', err);
        res.status(500).json({ error: 'Error al descargar archivo: ' + err.message });
      }
    });
  } catch (err) {
    console.error('[RRHH] Error en descarga de formato:', err);
    res.status(500).json({ error: 'Error al procesar descarga: ' + err.message });
  }
});

/**
 * GET /api/rrhh/formatos/smart/estado
 * Consulta en vivo el estado de formatos en SMART SJD y verifica versiones
 */
router.get('/formatos/smart/estado', async (req, res) => {
  try {
    const estado = await smartSyncService.verificarEstadoFormatos();
    res.json({
      exito: true,
      data: estado
    });
  } catch (err) {
    console.error('[RRHH] Error al consultar estado SMART:', err);
    res.status(500).json({ exito: false, error: 'Error consultando SMART SJD: ' + err.message });
  }
});

/**
 * POST /api/rrhh/formatos/smart/sincronizar
 * Descarga y actualiza automáticamente las versiones más recientes desde SMART SJD
 */
router.post('/formatos/smart/sincronizar', async (req, res) => {
  try {
    const { codigos, soloRelevantes } = req.body || {};
    const resultado = await smartSyncService.sincronizarFormatos({ codigos, soloRelevantes });
    res.json({
      exito: true,
      mensaje: `Sincronización finalizada: ${resultado.nuevos} nuevos, ${resultado.actualizados} actualizados, ${resultado.sinCambios} al día.`,
      resultado
    });
  } catch (err) {
    console.error('[RRHH] Error al sincronizar con SMART:', err);
    res.status(500).json({ exito: false, error: 'Error al sincronizar con SMART: ' + err.message });
  }
});

module.exports = router;
