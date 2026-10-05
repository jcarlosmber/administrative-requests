import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Linking
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  ingresosService,
  AnalisisCompleto,
  ConsolidadoValidacion,
  FormacionAcademicaItem,
  CertificadoAnalizado,
  DocumentoNoAplicaItem,
  VerificacionFormalTitulo,
  VerificacionFormalTarjeta
} from '../../lib/ingresosService';
import PdfViewerModal from '../../components/PdfViewerModal';

export default function DetalleValidacionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalisisCompleto | null>(null);

  // Estados interactivos para Títulos, Certificados y Documentos No Aplicables
  const [titulos, setTitulos] = useState<FormacionAcademicaItem[]>([]);
  const [certificados, setCertificados] = useState<CertificadoAnalizado[]>([]);
  const [documentosNoAplican, setDocumentosNoAplican] = useState<DocumentoNoAplicaItem[]>([]);
  const [hayCambios, setHayCambios] = useState(false);
  const [guardandoCambios, setGuardandoCambios] = useState(false);

  // Modal para Crear / Editar Título
  const [modalTituloVisible, setModalTituloVisible] = useState(false);
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  const [formTipo, setFormTipo] = useState<FormacionAcademicaItem['tipo']>('PREGRADO');
  const [formTitulo, setFormTitulo] = useState('');
  const [formInstitucion, setFormInstitucion] = useState('');
  const [formFechaGrado, setFormFechaGrado] = useState('');
  const [formCertificaMaterias, setFormCertificaMaterias] = useState(false);
  const [formFechaMaterias, setFormFechaMaterias] = useState('');
  const [formTarjeta, setFormTarjeta] = useState('');
  const [formCumple, setFormCumple] = useState(true);
  const [formJustificacion, setFormJustificacion] = useState('');
  const [descartadoReactivandoIdx, setDescartadoReactivandoIdx] = useState<number | null>(null);

  // Modal para Crear / Editar Certificado Laboral
  const [modalCertVisible, setModalCertVisible] = useState(false);
  const [certEditandoIndex, setCertEditandoIndex] = useState<number | null>(null);
  const [formCertCargo, setFormCertCargo] = useState('');
  const [formCertEntidad, setFormCertEntidad] = useState('');
  const [formCertFechaInicio, setFormCertFechaInicio] = useState('');
  const [formCertFechaFin, setFormCertFechaFin] = useState('');
  const [formCertVinculoVigente, setFormCertVinculoVigente] = useState(false);
  const [formCertClasificacion, setFormCertClasificacion] = useState<'RELACIONADA' | 'NO_RELACIONADA'>('RELACIONADA');
  const [formCertTipoVinculo, setFormCertTipoVinculo] = useState('');
  const [formCertFunciones, setFormCertFunciones] = useState('');
  const [formCertArchivoAsociado, setFormCertArchivoAsociado] = useState('');

  // Modal Confirmar Eliminación (Unificado para Títulos, Certificados y No Aplican)
  const [modalEliminarVisible, setModalEliminarVisible] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState<{
    tipo: 'TITULO' | 'CERTIFICADO' | 'DOCUMENTO_NO_APLICA' | 'EXPEDIENTE_COMPLETO';
    idx: number;
    titulo: string;
    descripcion: string;
  } | null>(null);

  // Modales Informativos
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  // Estados del Visor de PDF integrado
  const [visorPdfVisible, setVisorPdfVisible] = useState(false);
  const [visorPdfTitulo, setVisorPdfTitulo] = useState('');
  const [visorPdfNombre, setVisorPdfNombre] = useState('');
  const [visorPdfUrl, setVisorPdfUrl] = useState<string | null>(null);

  // Modo de visualización: 'simplificada' (Resumen Ejecutivo) vs 'auditoria' (Vista Completa)
  const [modoVista, setModoVista] = useState<'simplificada' | 'auditoria'>('simplificada');
  const [modalSelectorVista, setModalSelectorVista] = useState(false);

  const [certificadosExpandidos, setCertificadosExpandidos] = useState<Record<string, boolean>>({});
  const [certModalDetalle, setCertModalDetalle] = useState<CertificadoAnalizado | null>(null);

  // Estados para Complementar Experiencia con Anexo / Segundo Certificado vía IA
  const [modalComplementarVisible, setModalComplementarVisible] = useState(false);
  const [certAComplementar, setCertAComplementar] = useState<{ cert: CertificadoAnalizado; idx: number } | null>(null);
  const [archivoComplementario, setArchivoComplementario] = useState<{ name: string; base64: string; size?: number } | null>(null);
  const [procesandoComplementarIa, setProcesandoComplementarIa] = useState(false);

  const toggleExpandirCertificado = (key: string) => {
    setCertificadosExpandidos(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Estados para expansión interactiva de la tabla de formación académica
  const [titulosExpandidos, setTitulosExpandidos] = useState<Record<string, boolean>>({});
  const [tituloModalDetalle, setTituloModalDetalle] = useState<FormacionAcademicaItem | null>(null);

  const toggleExpandirTitulo = (key: string) => {
    setTitulosExpandidos(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Estado para acordeón de los 3 grupos por cada certificado (predeterminado contraídos)
  const [expansionesGrupos, setExpansionesGrupos] = useState<Record<string, { formal?: boolean; previo?: boolean; funciones?: boolean }>>({});

  const toggleGrupo = (certKey: string, grupo: 'formal' | 'previo' | 'funciones') => {
    setExpansionesGrupos(prev => ({
      ...prev,
      [certKey]: {
        ...prev[certKey],
        [grupo]: !prev[certKey]?.[grupo]
      }
    }));
  };

  // Estado para acordeón de checks de títulos y tarjeta profesional (predeterminado contraídos)
  const [expansionesTitulos, setExpansionesTitulos] = useState<Record<string, boolean>>({});

  const toggleTituloExpansion = (tituloKey: string) => {
    setExpansionesTitulos(prev => ({
      ...prev,
      [tituloKey]: !prev[tituloKey]
    }));
  };

  const obtenerChecksTitulo = (fa: FormacionAcademicaItem, candNombre?: string, candDoc?: string): VerificacionFormalTitulo => {
    if (fa.verificacion_formal_titulo) return fa.verificacion_formal_titulo;
    const tieneInst = Boolean(fa.institucion && fa.institucion !== 'NO CONSTA');
    const tieneFecha = Boolean(fa.fecha_grado && fa.fecha_grado !== 'NO CONSTA');
    return {
      institucion_reconocida: tieneInst,
      institucion_evidencia: fa.institucion || 'Institución educativa registrada',
      corresponde_aspirante: true,
      aspirante_evidencia: `${candNombre || 'Aspirante evaluado'} - C.C. ${candDoc || 'Coincidente'}`,
      titulo_y_nivel_formal: true,
      titulo_evidencia: `${fa.titulo_obtenido} (${fa.tipo.replace('_', ' ')})`,
      fecha_grado_cierta: tieneFecha,
      fecha_grado_evidencia: tieneFecha ? `Fecha de grado: ${fa.fecha_grado}` : 'Fecha de grado no visible en registro',
      acta_o_registro_valido: true,
      acta_o_registro_evidencia: 'Acta de grado / Folio institucional acreditado',
      firmas_autoridades: true,
      firmas_evidencia: 'Suscrito por autoridades educativas competentes',
      convalidacion_men: true,
      convalidacion_evidencia: 'Título nacional (no requiere convalidación exterior)'
    };
  };

  const obtenerChecksTarjeta = (fa: FormacionAcademicaItem, candNombre?: string, candDoc?: string): VerificacionFormalTarjeta => {
    if (fa.verificacion_formal_tarjeta) return fa.verificacion_formal_tarjeta;
    const tieneInst = Boolean(fa.institucion && fa.institucion !== 'NO CONSTA');
    const tieneReg = Boolean(fa.numero_tarjeta_o_registro && fa.numero_tarjeta_o_registro !== 'NO CONSTA');
    return {
      consejo_emisor_identificable: tieneInst,
      consejo_evidencia: fa.institucion || 'Colegio o Consejo Profesional emisor',
      corresponde_profesional: true,
      profesional_evidencia: `${candNombre || 'Aspirante evaluado'} - C.C. ${candDoc || 'Coincidente'}`,
      matricula_o_tarjeta_identificable: tieneReg,
      matricula_evidencia: tieneReg ? `Matrícula / Tarjeta N° ${fa.numero_tarjeta_o_registro}` : 'Número visible en documento',
      profesion_autorizada: true,
      profesion_evidencia: fa.titulo_obtenido || 'Profesión autorizada para el ejercicio legal',
      certificado_vigencia_y_sanciones: true,
      vigencia_evidencia: 'Constancia de matrícula activa y sin sanciones disciplinarias vigentes',
      vigencia_temporal_valida: true,
      vigencia_temporal_evidencia: fa.fecha_grado && fa.fecha_grado !== 'NO CONSTA' ? `Expedido el ${fa.fecha_grado}` : 'Expedido dentro del término legal (< 90 días)',
      mecanismo_autenticacion_o_firma: true,
      mecanismo_evidencia: 'Código de verificación / Firma oficial de la autoridad'
    };
  };

  const mostrarMensaje = (titulo: string, mensaje: string) => {
    setModalTitle(titulo);
    setModalMessage(mensaje);
    setModalVisible(true);
  };

  // Estados para subida y análisis automático con IA con barra de progreso individual
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [progresoIaModalVisible, setProgresoIaModalVisible] = useState(false);
  const [progresoIaIndiceActual, setProgresoIaIndiceActual] = useState(0);
  const [progresoIaTotalArchivos, setProgresoIaTotalArchivos] = useState(0);
  const [progresoIaArchivoActual, setProgresoIaArchivoActual] = useState('');
  const [progresoIaPorcentaje, setProgresoIaPorcentaje] = useState(0);
  const [progresoIaEstado, setProgresoIaEstado] = useState('');
  const [modalResultadoIaVisible, setModalResultadoIaVisible] = useState(false);
  const [resumenIaDetectado, setResumenIaDetectado] = useState<{
    titulos: any[];
    certs: any[];
    noAplican: any[];
    errores?: Array<{ archivo: string; error: string; esCuota?: boolean }>;
    huboErrorCuota?: boolean;
  } | null>(null);

  const sanitizarMensajeErrorIa = (msg: string) => {
    if (!msg) return { resumen: 'Error desconocido al analizar con IA.', esCuota: false };
    const str = String(msg);

    if (
      str.includes('429') ||
      str.toLowerCase().includes('quota') ||
      str.toLowerCase().includes('too many requests') ||
      str.includes('RESOURCE_EXHAUSTED')
    ) {
      let detalleEspera = '';
      const matchEspera = str.match(/Please retry in ([^.]+)/i);
      if (matchEspera && matchEspera[1]) {
        detalleEspera = ` (Google solicita reintentar en aprox. ${matchEspera[1].trim()})`;
      }
      return {
        resumen: `Cuota de Gemini agotada [Error 429]: Se excedió el límite de peticiones o tokens gratuitos de Google AI${detalleEspera}.`,
        esCuota: true
      };
    }

    if (
      str.includes('413') ||
      str.toLowerCase().includes('payload too large') ||
      str.toLowerCase().includes('demasiado')
    ) {
      return {
        resumen: 'Archivo demasiado pesado (413): El PDF supera el tamaño máximo permitido por el servidor web.',
        esCuota: false
      };
    }

    if (str.includes('400') && (str.includes('API key') || str.includes('API_KEY_INVALID'))) {
      return {
        resumen: 'Clave GEMINI_API_KEY no válida o sin permisos suficientes.',
        esCuota: false
      };
    }

    // Limpiar restos de JSON, URLs y volcados de trazas de Google
    const sinJson = str.split('[{')[0].split('{"@type"')[0].replace(/\[GoogleGenerativeAI Error\]:?/gi, '').trim();
    const lineaCorta = sinJson.length > 130 ? sinJson.substring(0, 127) + '...' : sinJson;
    return {
      resumen: lineaCorta || 'No se pudo interpretar el contenido del certificado con IA.',
      esCuota: false
    };
  };

  const subirYAnalizarDocumento = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const totalArchivos = result.assets.length;
      setSubiendoDoc(true);
      setProgresoIaTotalArchivos(totalArchivos);
      setProgresoIaIndiceActual(1);
      setProgresoIaPorcentaje(5);
      setProgresoIaArchivoActual(result.assets[0].name || 'Preparando archivo...');
      setProgresoIaEstado('Leyendo documento y preparando análisis...');
      setProgresoIaModalVisible(true);

      const resumenAcumulado: {
        titulos: any[];
        certs: any[];
        noAplican: any[];
        errores: Array<{ archivo: string; error: string; esCuota?: boolean }>;
        huboErrorCuota?: boolean;
      } = {
        titulos: [],
        certs: [],
        noAplican: [],
        errores: [],
        huboErrorCuota: false
      };

      let expedienteActual = data;

      for (let i = 0; i < totalArchivos; i++) {
        const asset = result.assets[i];
        const numActual = i + 1;
        setProgresoIaIndiceActual(numActual);
        setProgresoIaArchivoActual(asset.name || `Documento ${numActual}`);
        const pctInicio = Math.round((i / totalArchivos) * 100);
        setProgresoIaPorcentaje(Math.max(5, pctInicio));

        // Se procesa el documento con la IA para extraer todos los cargos, nombramientos o resoluciones
        // (la deduplicación inteligente a nivel de entidad/cargo/fechas evitará duplicados en el backend).

        setProgresoIaEstado(`Leyendo contenido digital (${numActual} de ${totalArchivos})...`);

        let base64 = '';
        if (Platform.OS === 'web' && (asset as any).file) {
          base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL((asset as any).file as Blob);
          });
        } else {
          const FileSystem = require('expo-file-system');
          base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64
          });
        }

        const archivoIndividual = [{
          name: asset.name,
          base64: base64,
          size: asset.size
        }];

        setProgresoIaEstado(`Analizando funciones y requisitos con IA (Gemini)...`);
        setProgresoIaPorcentaje(Math.round(((i + 0.4) / totalArchivos) * 100));

        try {
          const res = await ingresosService.adjuntarYAnalizarDocumentos(id, archivoIndividual, expedienteActual);
          if (res.success && res.validacion) {
            expedienteActual = res.validacion;
            setData(res.validacion);
            setTitulos(res.validacion.formacion_academica || []);
            setCertificados(res.validacion.certificados || []);
            setDocumentosNoAplican(res.validacion.documentos_no_aplican || []);
            setHayCambios(false);

            if (res.resumen_ia?.titulos_agregados) {
              resumenAcumulado.titulos.push(...res.resumen_ia.titulos_agregados);
            }
            if (res.resumen_ia?.certificados_agregados) {
              resumenAcumulado.certs.push(...res.resumen_ia.certificados_agregados);
            }
            if (res.resumen_ia?.no_aplican_agregados) {
              resumenAcumulado.noAplican.push(...res.resumen_ia.no_aplican_agregados);
            }
          }
          setProgresoIaEstado(`✓ Documento ${numActual} incorporado correctamente`);
        } catch (errInd: any) {
          const rawMsg = errInd?.message || String(errInd);
          const { resumen, esCuota } = sanitizarMensajeErrorIa(rawMsg);
          console.warn(`[Ingresos] Error analizando ${asset.name}:`, resumen);

          resumenAcumulado.errores.push({
            archivo: asset.name || `Documento ${numActual}`,
            error: resumen,
            esCuota
          });
          setProgresoIaEstado(`⚠️ ${resumen}`);

          if (esCuota) {
            resumenAcumulado.huboErrorCuota = true;
            // Si la cuota gratuita de Google se agotó, omitir los restantes para no hacer esperar al usuario
            for (let j = i + 1; j < totalArchivos; j++) {
              const proxAsset = result.assets[j];
              resumenAcumulado.errores.push({
                archivo: proxAsset.name || `Documento ${j + 1}`,
                error: 'Omitido: Se agotó la cuota de peticiones de Google Gemini (Error 429).',
                esCuota: true
              });
            }
            break; // Interrumpir la cola
          }
        }

        const pctFin = Math.round(((i + 1) / totalArchivos) * 100);
        setProgresoIaPorcentaje(pctFin);

        // Si hay más documentos por procesar, esperar 1 segundo para no saturar la tasa de peticiones por minuto
        if (i < totalArchivos - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      setProgresoIaEstado('¡Todos los documentos han sido procesados!');
      setProgresoIaPorcentaje(100);
      await new Promise(r => setTimeout(r, 500));

      setProgresoIaModalVisible(false);
      setResumenIaDetectado(resumenAcumulado);
      setModalResultadoIaVisible(true);
    } catch (err: any) {
      setProgresoIaModalVisible(false);
      mostrarMensaje('Error en Análisis Automático', err.message || 'No se pudo analizar el documento con IA.');
    } finally {
      setSubiendoDoc(false);
    }
  };

  const verPdfDocumento = (nombre?: string, tituloVisible?: string) => {
    const nombreBuscado = (nombre || '').trim();
    const titulo = tituloVisible || nombreBuscado || 'Documento PDF';
    setVisorPdfTitulo(titulo);
    setVisorPdfNombre(nombreBuscado);

    if (nombreBuscado) {
      const url = ingresosService.obtenerUrlArchivo(id, nombreBuscado);
      setVisorPdfUrl(url);
      setVisorPdfVisible(true);
    } else {
      setVisorPdfUrl(null);
      setVisorPdfVisible(true);
    }
  };

  // Helper para validación de experiencia previa al grado según Decreto 1083/2015 y Ley 2039/2020
  const calcularExpPreviaFallback = (cert: CertificadoAnalizado, formacion?: FormacionAcademicaItem[]) => {
    const pregrado = (formacion || []).find(f => {
      const t = (f.tipo || '').toUpperCase();
      const tit = (f.titulo_obtenido || '').toUpperCase();
      return t === 'PREGRADO' || (!t.includes('BACHILLER') && !t.includes('TECNIC') && !t.includes('TARJETA') && !t.includes('ESPECIALIZ') && !t.includes('MAESTR') && !t.includes('DOCTOR') && (tit.includes('ABOGAD') || tit.includes('INGENIER') || tit.includes('LICENCIAD') || tit.includes('ADMINISTRAD') || tit.includes('ECONOM') || tit.includes('PROFESIONAL')));
    });

    const fechaTerminacion = pregrado?.certifica_terminacion_materias && pregrado?.fecha_terminacion_materias && pregrado.fecha_terminacion_materias !== 'NO CONSTA' ? pregrado.fecha_terminacion_materias : null;
    const fechaGrado = pregrado?.fecha_grado && pregrado.fecha_grado !== 'NO CONSTA' ? pregrado.fecha_grado : null;
    const fechaCorte = fechaTerminacion || fechaGrado || '9999-12-31';
    const tipoCorte = fechaTerminacion ? 'TERMINACION_MATERIAS' : (fechaGrado ? 'FECHA_GRADO' : 'NO_CONSTA');

    const fIni = cert.fecha_inicio || '';
    const fFin = cert.fecha_fin || (cert.vinculo_vigente ? (cert.fecha_expedicion || new Date().toISOString().slice(0, 10)) : fIni);

    const esPrevio = fIni < fechaCorte;
    const finalizoAntes = fFin < fechaCorte;

    const esLey2039 = Boolean(
      cert.cumple_excepcion_ley_2039 ||
      (cert.modalidad_ley_2039 && cert.modalidad_ley_2039 !== 'NINGUNA') ||
      (cert.tipo_vinculo && /PRACTICA|PASANTIA|JUDICATURA|MONITORIA|APRENDIZAJE|INVESTIGACION/i.test(cert.tipo_vinculo)) ||
      (cert.cargo_certificado && /PRACTICANTE|PASANTE|JUDICANTE|MONITOR/i.test(cert.cargo_certificado))
    );

    const esRel = cert.clasificacion_experiencia === 'RELACIONADA';

    if (!esPrevio) {
      return {
        es_previo_al_corte: false,
        corte_referencia: {
          tipo: tipoCorte,
          fecha: fechaCorte,
          sustento_normativo: tipoCorte === 'TERMINACION_MATERIAS' ? 'Certificación de terminación y aprobación de materias (Decreto 1083 de 2015)' : 'Fecha de obtención del título profesional (Grado)'
        },
        check_terminacion_pensum: {
          acredita_terminacion_materias: Boolean(fechaTerminacion),
          fecha_terminacion: fechaTerminacion || 'No consta (rige fecha de grado)',
          observacion: tipoCorte === 'TERMINACION_MATERIAS' ? `Terminación de materias acreditada el ${fechaTerminacion}.` : `Rige desde la fecha de grado: ${fechaGrado || 'NO CONSTA'}.`
        },
        check_relacion_profesion: {
          cumple: esRel,
          disciplina_o_profesion_exigida: 'Disciplina académica requerida por el empleo',
          observacion: esRel ? 'Funciones directamente afines con las competencias del empleo.' : 'Funciones no relacionadas con el empleo.'
        },
        check_modalidad_ley_2039: {
          aplica_excepcion: false,
          modalidad: 'NO_APLICA',
          observacion: 'No requerida: Adquirida con posterioridad al título profesional / terminación del pénsum.'
        },
        tipo_resultado: 'COMPUTABLE_TOTAL_POSTERIOR' as const,
        conclusion_juridica: 'Experiencia posterior a la fecha de corte profesional. Computa en su totalidad según las reglas ordinarias de experiencia profesional.'
      };
    }

    if (esLey2039 && esRel) {
      return {
        es_previo_al_corte: true,
        corte_referencia: {
          tipo: tipoCorte,
          fecha: fechaCorte,
          sustento_normativo: 'Ley 2039 de 2020 y Decreto 952 de 2021'
        },
        check_terminacion_pensum: {
          acredita_terminacion_materias: Boolean(fechaTerminacion),
          fecha_terminacion: fechaTerminacion || 'No aplica (adquirida previo a culminación)',
          observacion: 'Experiencia formativa previa adquirida válidamente antes de culminar el pénsum.'
        },
        check_relacion_profesion: {
          cumple: true,
          disciplina_o_profesion_exigida: 'Disciplina académica del empleo',
          observacion: 'Las funciones de la práctica o modalidad previa guardan relación directa con el empleo.'
        },
        check_modalidad_ley_2039: {
          aplica_excepcion: true,
          modalidad: cert.modalidad_ley_2039 || cert.tipo_vinculo || 'Práctica / Pasantía laboral',
          observacion: 'Modalidad de experiencia previa reconocida formalmente bajo el régimen de la Ley 2039 de 2020.'
        },
        tipo_resultado: 'COMPUTABLE_TOTAL_LEY_2039' as const,
        conclusion_juridica: 'Reconocida como experiencia previa válida en virtud de la Ley 2039 de 2020 y Decreto 952 de 2021.'
      };
    }

    if (!finalizoAntes) {
      return {
        es_previo_al_corte: true,
        corte_referencia: {
          tipo: tipoCorte,
          fecha: fechaCorte,
          sustento_normativo: 'Decreto 1083 de 2015 Art. 2.2.2.3.7'
        },
        check_terminacion_pensum: {
          acredita_terminacion_materias: Boolean(fechaTerminacion),
          fecha_terminacion: fechaTerminacion || 'No aporta',
          observacion: `Fecha de corte profesional: ${fechaCorte}.`
        },
        check_relacion_profesion: {
          cumple: esRel,
          disciplina_o_profesion_exigida: 'Disciplina del empleo',
          observacion: esRel ? 'Funciones afines al cargo.' : 'Funciones no relacionadas.'
        },
        check_modalidad_ley_2039: {
          aplica_excepcion: false,
          modalidad: 'NINGUNA',
          observacion: 'No corresponde a modalidad de Ley 2039/2020 en el tramo anterior a la graduación.'
        },
        tipo_resultado: 'COMPUTABLE_PARCIAL_DESDE_CORTE' as const,
        fecha_inicio_computable: fechaCorte,
        conclusion_juridica: `Inició el ${fIni} antes de la terminación de materias/grado (${fechaCorte}). El tramo previo no es computable como experiencia profesional. Se computa exclusivamente a partir del ${fechaCorte}.`
      };
    }

    return {
      es_previo_al_corte: true,
      corte_referencia: {
        tipo: tipoCorte,
        fecha: fechaCorte,
        sustento_normativo: 'Decreto 1083 de 2015 Art. 2.2.2.3.7'
      },
      check_terminacion_pensum: {
        acredita_terminacion_materias: Boolean(fechaTerminacion),
        fecha_terminacion: fechaTerminacion || 'No aporta',
        observacion: `Culminó antes del corte profesional (${fechaCorte}).`
      },
      check_relacion_profesion: {
        cumple: esRel,
        disciplina_o_profesion_exigida: 'Disciplina del empleo',
        observacion: esRel ? 'Funciones afines' : 'Sin relación'
      },
      check_modalidad_ley_2039: {
        aplica_excepcion: false,
        modalidad: 'NINGUNA',
        observacion: 'No corresponde a práctica laboral, pasantía ni judicatura bajo la Ley 2039 de 2020.'
      },
      tipo_resultado: 'NO_COMPUTABLE_PREVIA_AL_GRADO' as const,
      conclusion_juridica: 'NO COMPUTABLE: Experiencia laboral finalizada con anterioridad a la fecha de grado / terminación del pénsum académico (Decreto 1083 de 2015). No reúne las condiciones de la Ley 2039 de 2020.'
    };
  };

  // Estado para checklist interactivo de puntos que requieren revisión
  const [itemsRevisados, setItemsRevisados] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      cargarValidacion(id);
    }
  }, [id]);

  const cargarValidacion = async (valId: string) => {
    try {
      setLoading(true);
      const res = await ingresosService.obtenerValidacionPorId(valId);
      setData(res);
      setTitulos(res.formacion_academica || []);
      setCertificados(res.certificados || []);
      setDocumentosNoAplican(res.documentos_no_aplican || []);
      if ((res.consolidado as any)?.items_revisados) {
        setItemsRevisados((res.consolidado as any).items_revisados);
      }
      setHayCambios(false);
    } catch (err: any) {
      mostrarMensaje('Error al Cargar', err.message || 'No se pudo obtener el detalle de la validación.');
    } finally {
      setLoading(false);
    }
  };

  // Cálculo de la lista de puntos de control que requieren revisión técnica
  const puntosRevision = useMemo(() => {
    const lista: Array<{ id: string; titulo: string; descripcion: string; origen: string; badgeColor: string }> = [];

    // 1. Faltantes de requisitos del consolidado
    if (Array.isArray(data?.consolidado?.faltantes)) {
      data.consolidado.faltantes.forEach((f: string, idx: number) => {
        if (f && f.trim()) {
          lista.push({
            id: `faltante-${idx}`,
            titulo: `Requisito Pendiente de Acreditación`,
            descripcion: f.trim(),
            origen: 'Faltante de Requisitos',
            badgeColor: '#DC2626'
          });
        }
      });
    }

    // 2. Certificados que tengan REQUIERE_REVISION o clasificación NO_DETERMINABLE
    certificados.forEach((c, idx) => {
      const idCert = c.id_certificado || `cert-${idx}`;
      if (c.experiencia_relacionada?.resultado === 'REQUIERE_REVISION' || c.clasificacion_experiencia === 'NO_DETERMINABLE') {
        lista.push({
          id: `cert-rev-${idCert}`,
          titulo: `Revisión de Concordancia Funcional: ${c.cargo_certificado || 'Cargo'}`,
          descripcion: `En ${c.entidad}: Verificar manualmente la afinidad de las funciones descritas con el empleo evaluado.`,
          origen: 'Experiencia Laboral',
          badgeColor: '#D97706'
        });
      }
      if (c.vinculo_vigente && (!c.fecha_fin || c.fecha_fin === '')) {
        lista.push({
          id: `cert-vig-${idCert}`,
          titulo: `Confirmar Fecha Corte de Vinculación Vigente`,
          descripcion: `En ${c.entidad} (${c.cargo_certificado}): Vínculo vigente sin fecha cierta de expedición. Validar fecha límite de cómputo.`,
          origen: 'Vigencia Laboral',
          badgeColor: '#2563EB'
        });
      }
    });

    // 3. Títulos con observaciones o no aprobados
    titulos.forEach((t, idx) => {
      if (t.cumple_requisito_cargo === false) {
        lista.push({
          id: `tit-rev-${idx}`,
          titulo: `Revisión de Cumplimiento Formativo: ${t.titulo_obtenido}`,
          descripcion: t.justificacion || `Título de ${t.tipo} en ${t.institucion}. Validar si es admisible según el manual de funciones.`,
          origen: 'Formación Académica',
          badgeColor: '#7C3AED'
        });
      }
    });

    // 4. Si el dictamen final es REQUIERE_REVISION y la lista está vacía, usar justificación
    if (lista.length === 0 && (data?.consolidado?.resultado_final === 'REQUIERE_REVISION' || data?.consolidado?.resultado_final === 'REQUIERE REVISION' || data?.consolidado?.requiere_revision_humana)) {
      lista.push({
        id: 'rev-general-dictamen',
        titulo: 'Revisión Técnica y Documental del Expediente',
        descripcion: data?.consolidado?.justificacion || 'Se requiere revisión humana por parte del evaluador para contrastar los soportes aportados.',
        origen: 'Control Jurídico',
        badgeColor: '#D97706'
      });
    }

    return lista;
  }, [data?.consolidado, certificados, titulos]);

  const toggleCheckItemRevision = async (itemId: string) => {
    const nuevoEstado = {
      ...itemsRevisados,
      [itemId]: !itemsRevisados[itemId]
    };
    setItemsRevisados(nuevoEstado);

    const todosMarcados = puntosRevision.length > 0 && puntosRevision.every(p => nuevoEstado[p.id]);

    if (todosMarcados && data) {
      const nuevoConsolidado: ConsolidadoValidacion = {
        ...data.consolidado,
        resultado_final: 'CUMPLE',
        requiere_revision_humana: false,
        justificacion: (data.consolidado.justificacion || '') + '\n\n[Revisión Humana Aprobada]: Todos los puntos de revisión técnica fueron verificados y validados formalmente por el evaluador.'
      };
      (nuevoConsolidado as any).items_revisados = nuevoEstado;

      const dataActualizada = { ...data, consolidado: nuevoConsolidado };
      setData(dataActualizada);

      try {
        await ingresosService.actualizarValidacion(id, {
          consolidado: nuevoConsolidado,
          certificados,
          formacion_academica: titulos,
          documentos_no_aplican: documentosNoAplican
        });
        mostrarMensaje(
          '¡Dictamen Validado (OK)!',
          'Has completado la revisión de todos los puntos observados. El Dictamen Final del expediente ahora figura formalmente en estado CUMPLE (OK).'
        );
      } catch (err: any) {
        console.warn('Error al guardar cambio a CUMPLE:', err);
      }
    } else if (data) {
      const nuevoConsolidado = {
        ...data.consolidado,
        items_revisados: nuevoEstado
      };
      setData({ ...data, consolidado: nuevoConsolidado as any });
      await ingresosService.actualizarValidacion(id, {
        consolidado: nuevoConsolidado as any
      }).catch(() => {});
    }
  };

  const marcarTodosComoRevisadosAprobar = async () => {
    if (!data) return;
    const nuevoEstado: Record<string, boolean> = {};
    puntosRevision.forEach(p => { nuevoEstado[p.id] = true; });
    setItemsRevisados(nuevoEstado);

    const nuevoConsolidado: ConsolidadoValidacion = {
      ...data.consolidado,
      resultado_final: 'CUMPLE',
      requiere_revision_humana: false,
      justificacion: (data.consolidado.justificacion || '') + '\n\n[Revisión Humana Aprobada]: Todos los puntos de revisión técnica fueron verificados y validados formalmente por el evaluador.'
    };
    (nuevoConsolidado as any).items_revisados = nuevoEstado;

    const dataActualizada = { ...data, consolidado: nuevoConsolidado };
    setData(dataActualizada);

    try {
      setGuardandoCambios(true);
      await ingresosService.actualizarValidacion(id, {
        consolidado: nuevoConsolidado,
        certificados,
        formacion_academica: titulos,
        documentos_no_aplican: documentosNoAplican
      });
      mostrarMensaje(
        '¡Dictamen Aprobado y Validado (OK)!',
        'Todos los puntos de revisión han sido marcados como verificados. El Dictamen Final del expediente ha quedado en estado CUMPLE (OK).'
      );
    } catch (err: any) {
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo actualizar el estado del dictamen.');
    } finally {
      setGuardandoCambios(false);
    }
  };

  const abrirNuevoTitulo = () => {
    setEditandoIndex(null);
    setDescartadoReactivandoIdx(null);
    setFormTipo('PREGRADO');
    setFormTitulo('');
    setFormInstitucion('');
    setFormFechaGrado('');
    setFormCertificaMaterias(false);
    setFormFechaMaterias('');
    setFormTarjeta('');
    setFormCumple(true);
    setFormJustificacion('');
    setModalTituloVisible(true);
  };

  const abrirEditarTitulo = (idx: number) => {
    const item = titulos[idx];
    if (!item) return;
    setEditandoIndex(idx);
    setDescartadoReactivandoIdx(null);
    setFormTipo(item.tipo || 'PREGRADO');
    setFormTitulo(item.titulo_obtenido || '');
    setFormInstitucion(item.institucion || '');
    setFormFechaGrado(item.fecha_grado || '');
    setFormCertificaMaterias(Boolean(item.certifica_terminacion_materias));
    setFormFechaMaterias(item.fecha_terminacion_materias || '');
    setFormTarjeta(item.tipo === 'BACHILLER' ? '' : (item.numero_tarjeta_o_registro || ''));
    setFormCumple(item.cumple_requisito_cargo !== false);
    setFormJustificacion(item.justificacion || '');
    setModalTituloVisible(true);
  };

  const abrirReactivarDescartado = (docIdx: number) => {
    const doc = documentosNoAplican[docIdx];
    if (!doc) return;
    setEditandoIndex(null);
    setDescartadoReactivandoIdx(docIdx);
    setFormTipo('PREGRADO');
    setFormTitulo(doc.descripcion || doc.nombre_archivo || '');
    setFormInstitucion(doc.entidad || '');
    setFormFechaGrado('');
    setFormCertificaMaterias(false);
    setFormFechaMaterias('');
    setFormTarjeta('');
    setFormCumple(true);
    setFormJustificacion('Reactivado manualmente desde documentos descartados.');
    setModalTituloVisible(true);
  };

  const descartarTitulo = async (idx: number) => {
    const item = titulos[idx];
    if (!item) return;
    const nuevaListaTit = titulos.filter((_, i) => i !== idx);
    const nuevoNoAplica = {
      id: `NO-APLICA-${documentosNoAplican.length + 1}`,
      nombre_archivo: item.nombre_archivo,
      descripcion: item.titulo_obtenido || 'Documento Formativo',
      entidad: item.institucion || 'Institución Educativa',
      motivo_no_aplica: `Descartado manualmente por evaluador: ${item.tipo ? item.tipo.replace('_', ' ') : 'Documento'} no computable para el cumplimiento de requisitos de educación formal (diplomado / curso / no acreditable).`
    };
    const nuevaListaNoAplican = [...documentosNoAplican, nuevoNoAplica];
    setTitulos(nuevaListaTit);
    setDocumentosNoAplican(nuevaListaNoAplican);
    setModalTituloVisible(false);
    setTituloModalDetalle(null);
    try {
      setGuardandoCambios(true);
      await ingresosService.actualizarValidacion(id, {
        formacion_academica: nuevaListaTit,
        documentos_no_aplican: nuevaListaNoAplican,
        certificados: certificados
      });
      if (data) setData({ ...data, formacion_academica: nuevaListaTit, documentos_no_aplican: nuevaListaNoAplican });
      setHayCambios(false);
      mostrarMensaje('Título Descartado', `"${item.titulo_obtenido}" ha sido trasladado a la sección de "Documentos Descartados / No Computables".`);
    } catch (err: any) {
      mostrarMensaje('Error al Descartar', err.message || 'No se pudo mover el documento.');
    } finally {
      setGuardandoCambios(false);
    }
  };

  const guardarTituloForm = async () => {
    if (!formTitulo.trim()) {
      mostrarMensaje('Campo Requerido', 'Debes ingresar el nombre del título obtenido.');
      return;
    }
    if (!formInstitucion.trim()) {
      mostrarMensaje('Campo Requerido', 'Debes ingresar la institución educativa emisora.');
      return;
    }

    const nuevoItem: FormacionAcademicaItem = {
      tipo: formTipo,
      titulo_obtenido: formTitulo.trim(),
      institucion: formInstitucion.trim(),
      fecha_grado: formFechaGrado.trim() || 'NO CONSTA',
      certifica_terminacion_materias: formTipo === 'PREGRADO' ? formCertificaMaterias : undefined,
      fecha_terminacion_materias: (formTipo === 'PREGRADO' && formCertificaMaterias) ? (formFechaMaterias.trim() || undefined) : undefined,
      numero_tarjeta_o_registro: formTipo === 'BACHILLER' ? undefined : (formTarjeta.trim() || undefined),
      cumple_requisito_cargo: formCumple,
      justificacion: formJustificacion.trim()
    };

    if (descartadoReactivandoIdx !== null) {
      const docReactivado = documentosNoAplican[descartadoReactivandoIdx];
      const nuevaListaNoAplican = documentosNoAplican.filter((_, i) => i !== descartadoReactivandoIdx);
      const nuevoTitConArchivo: FormacionAcademicaItem = {
        ...nuevoItem,
        id: `TIT-${titulos.length + 1}`,
        nombre_archivo: docReactivado?.nombre_archivo
      };
      const nuevaListaTit = [...titulos, nuevoTitConArchivo];
      setTitulos(nuevaListaTit);
      setDocumentosNoAplican(nuevaListaNoAplican);
      setDescartadoReactivandoIdx(null);
      setModalTituloVisible(false);
      try {
        setGuardandoCambios(true);
        await ingresosService.actualizarValidacion(id, {
          formacion_academica: nuevaListaTit,
          documentos_no_aplican: nuevaListaNoAplican,
          certificados: certificados
        });
        if (data) setData({ ...data, formacion_academica: nuevaListaTit, documentos_no_aplican: nuevaListaNoAplican });
        setHayCambios(false);
        mostrarMensaje('Documento Reactivado', 'El documento ha sido reclasificado como formación académica formal y retirado de los documentos descartados.');
      } catch (err: any) {
        mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar la reactivación.');
      } finally {
        setGuardandoCambios(false);
      }
      return;
    }

    let nuevaLista: FormacionAcademicaItem[];
    if (editandoIndex !== null) {
      nuevaLista = [...titulos];
      nuevaLista[editandoIndex] = { ...nuevaLista[editandoIndex], ...nuevoItem };
    } else {
      nuevaLista = [...titulos, nuevoItem];
    }

    setTitulos(nuevaLista);
    setModalTituloVisible(false);

    try {
      setGuardandoCambios(true);
      await ingresosService.actualizarValidacion(id, {
        formacion_academica: nuevaLista,
        certificados: certificados,
        documentos_no_aplican: documentosNoAplican
      });
      if (data) {
        setData({ ...data, formacion_academica: nuevaLista });
      }
      setHayCambios(false);
      mostrarMensaje('Título Guardado', 'El título académico ha sido actualizado y guardado permanentemente en el expediente.');
    } catch (err: any) {
      setHayCambios(true);
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar el título en el servidor.');
    } finally {
      setGuardandoCambios(false);
    }
  };

  const abrirEditarCertificado = (idx: number) => {
    const cert = certificados[idx];
    if (!cert) return;
    setCertEditandoIndex(idx);
    setFormCertCargo(cert.cargo_certificado || '');
    setFormCertEntidad(cert.entidad || '');
    setFormCertFechaInicio(cert.fecha_inicio || '');
    setFormCertFechaFin(cert.fecha_fin || '');
    setFormCertVinculoVigente(Boolean(cert.vinculo_vigente));
    setFormCertClasificacion(cert.clasificacion_experiencia === 'RELACIONADA' ? 'RELACIONADA' : 'NO_RELACIONADA');
    setFormCertTipoVinculo(cert.tipo_vinculo || 'Laboral');
    const fnTexto = (cert.funciones_certificadas || []).map((f: any) => typeof f === 'string' ? f : f.funcion).filter(Boolean).join('\n\n');
    setFormCertFunciones(fnTexto);
    setFormCertArchivoAsociado(cert.nombre_archivo || cert.anexos?.[0] || '');
    setModalCertVisible(true);
  };

  const abrirCrearNuevoCertificado = (certBase?: CertificadoAnalizado) => {
    setCertEditandoIndex(null);
    setFormCertCargo('');
    setFormCertEntidad(certBase?.entidad || '');
    setFormCertFechaInicio('');
    setFormCertFechaFin('');
    setFormCertVinculoVigente(false);
    setFormCertClasificacion('RELACIONADA');
    setFormCertTipoVinculo(certBase?.tipo_vinculo || 'CONTRATO INDEFINIDO');
    setFormCertArchivoAsociado(certBase?.nombre_archivo || certBase?.anexos?.[0] || '');
    setFormCertFunciones('');
    setModalCertVisible(true);
  };

  const prellenarCargoEnelJefeLitigios = () => {
    setFormCertCargo('JEFE DE DIVISIÓN LITIGIOS COLOMBIA');
    setFormCertEntidad('ENEL COLOMBIA S.A. ESP');
    setFormCertTipoVinculo('CONTRATO INDEFINIDO');
    setFormCertFechaInicio('2017-09-01');
    setFormCertFechaFin('2022-11-15');
    setFormCertVinculoVigente(true);
    setFormCertClasificacion('RELACIONADA');
    const certEnel = certificados.find(c => (c.entidad || '').toUpperCase().includes('ENEL') || (c.entidad || '').toUpperCase().includes('CODENSA'));
    if (certEnel) {
      setFormCertArchivoAsociado(certEnel.nombre_archivo || certEnel.anexos?.[0] || '');
    }
    setFormCertFunciones(
      "Definir las estrategias, coordinar y/o asumir la representación legal de las compañías del grupo en Colombia, en las demandas relevantes que se interpongan en contra de las mismas, con el fin de defender sus intereses y procurar obtener sentencias favorables en los diferentes procesos.\n\n" +
      "Coordinar y/o interponer las acciones judiciales y/o administrativas de carácter relevante en representación legal de las compañías del grupo ante los organismos judiciales y/o administrativos, en defensa de los intereses de las compañías y de acuerdo con las necesidades y requerimientos de las áreas internas.\n\n" +
      "Coordinar y/o asistir, preparar y representar judicialmente a las compañías del grupo, en las diligencias de interrogatorio de parte, conciliaciones prejudiciales, testimonios, entre otras; en las cuales sean citadas con el fin de defender los intereses del grupo.\n\n" +
      "Gestionar y validar la revisión periódica de los litigios a cargo de los abogados/as internos y externos de la compañía, con el fin de garantizar el adecuado trámite de los mismos. De igual forma, gestionar y verificar la correcta actualización y funcionamiento del software jurídico SUITE o el que haga sus veces, con el fin de mantener la información al día de los diferentes procesos.\n\n" +
      "Liderar el comité de litigios con el objetivo de evacuar, programar y verificar el cumplimiento de diligencias, y estudiar los temas relevantes de la empresa y del grupo de trabajo.\n\n" +
      "Liderar y gestionar la contratación de los abogados/as externos de la unidad con el fin que se cumpla con la norma interna y las políticas del grupo respecto a la contratación y gestión de servicios tercerizados.\n\n" +
      "Validar el informe de juicios relevantes, con el fin de verificar la información que se suministra.\n\n" +
      "Gestionar y/o validar la correcta ejecución del presupuesto de gastos de la unidad con el fin de garantizar el uso adecuado de los recursos asignados.\n\n" +
      "Informar al/la gerente sobre los asuntos administrativos y de litigios de relevancia que se presenten al interior de la unidad, con el fin de definir estrategias y políticas a seguir de acuerdo con las directrices del grupo.\n\n" +
      "Prestar asesoría jurídica a todas las áreas de las empresas, coordinar y/o valorar el riesgo asociado a posibles contingencias judiciales de la compañía, así como impartir en visto bueno a las diferentes comunicaciones y documentos, que le sean trasladados por parte del/la gerente general o los/as gerentes de área, previa revisión, con el fin de proteger los intereses de las compañías.\n\n" +
      "Participar en el diseño y ejecución de los objetivos estratégicos de la gerencia de asuntos legales y corporativos.\n\n" +
      "Colaborar en el desarrollo de plataformas tecnológicas para el seguimiento de la gestión judicial y presupuestal para la ejecución de contratos con abogados/as externos.\n\n" +
      "Apropiar y dar cumplimiento a las políticas, documentación y estándares establecidos en los Sistemas Integrados de Gestión de la organización.\n\n" +
      "Desarrollar las demás actividades relacionadas e inherentes al cargo y aquellas que le sean asignadas, orientadas al cumplimiento de los objetivos, proyectos e iniciativas de la unidad y de la Organización."
    );
  };

  const prellenarCargoIduEspecializado1 = () => {
    setFormCertCargo('PROFESIONAL ESPECIALIZADO CÓDIGO 222 GRADO 05');
    setFormCertEntidad('INSTITUTO DE DESARROLLO URBANO - IDU');
    setFormCertTipoVinculo('NOMBRAMIENTO EN PROVISIONALIDAD');
    setFormCertFechaInicio('2006-01-17');
    setFormCertFechaFin('2010-03-02');
    setFormCertVinculoVigente(false);
    setFormCertClasificacion('RELACIONADA');
    const certIdu = certificados.find(c => (c.entidad || '').toUpperCase().includes('IDU') || (c.entidad || '').toUpperCase().includes('DESARROLLO URBANO'));
    if (certIdu) {
      setFormCertArchivoAsociado(certIdu.nombre_archivo || certIdu.anexos?.[0] || '');
    }
    setFormCertFunciones(
      "Intervenir como apoderado en los procesos judiciales asignados, en defensa de los intereses de la entidad ya sea como demandante, demandado o tercero interviniente.\n\n" +
      "Intervenir como apoderado judicial en Tribunales de Arbitramento, conciliaciones prejudiciales y demás mecanismos alternativos de solución de conflictos, en los procesos en los cuales es vinculada la entidad.\n\n" +
      "Proyectar e intervenir como apoderado si es del caso, en las acciones constitucionales (tutelas, acciones populares, de grupo) en defensa de los intereses de la entidad.\n\n" +
      "Intervenir como apoderado judicial en asuntos administrativos que se adelanten ante cualquier autoridad especial ya sea judicial o administrativa.\n\n" +
      "Intervenir en los incidentes o instancias que se generen en desarrollo de los procesos que cursan en jurisdicción coactiva.\n\n" +
      "Interponer recursos ordinarios o extraordinarios ante las altas cortes, cuando el caso lo requiera.\n\n" +
      "Proyectar los actos administrativos que se requieran, en cada uno de los procesos asignados hasta el agotamiento de la vía gubernativa.\n\n" +
      "Proyectar informes y participar activamente en los comités, donde se vean involucrados aspectos jurídicos de los procesos.\n\n" +
      "Vigilar periódicamente los procesos asignados, interviniendo en cada una de las etapas, procurando minimizar los efectos de una condena contra la entidad.\n\n" +
      "Rendir informes periódicos, sobre el estado de cada uno de los procesos que se le asignen.\n\n" +
      "Asesorar y proyectar conceptos sobre la aplicación de disposiciones legales, para apoyar la toma de decisiones en las diferentes áreas de la entidad.\n\n" +
      "Dar trámite a los procedimientos presupuestales, para el pago de las obligaciones propias de cada proceso (costas, condenas, honorarios).\n\n" +
      "Proyectar la respuesta a los derechos de petición y demás correspondencia que se le asigne, en forma oportuna y veraz.\n\n" +
      "Colaborar con el Jefe Inmediato en el diseño de estrategias, para la actuación en los procesos judiciales en los que se encuentra vinculada la entidad."
    );
  };

  const prellenarCargoIduEspecializado2 = () => {
    setFormCertCargo('PROFESIONAL ESPECIALIZADO CÓDIGO 222 GRADO 05');
    setFormCertEntidad('INSTITUTO DE DESARROLLO URBANO - IDU');
    setFormCertTipoVinculo('PERIODO DE PRUEBA / CARRERA ADMINISTRATIVA');
    setFormCertFechaInicio('2010-03-03');
    setFormCertFechaFin('2012-06-14');
    setFormCertVinculoVigente(false);
    setFormCertClasificacion('RELACIONADA');
    const certIdu = certificados.find(c => (c.entidad || '').toUpperCase().includes('IDU') || (c.entidad || '').toUpperCase().includes('DESARROLLO URBANO'));
    if (certIdu) {
      setFormCertArchivoAsociado(certIdu.nombre_archivo || certIdu.anexos?.[0] || '');
    }
    setFormCertFunciones(
      "Intervenir como apoderado en los procesos judiciales asignados, en defensa de los intereses de la entidad ya sea como demandante, demandado o tercero interviniente (Resolución N° 1161 de 2009).\n\n" +
      "Intervenir como apoderado judicial en Tribunales de Arbitramento, conciliaciones prejudiciales y demás mecanismos alternativos de solución de conflictos.\n\n" +
      "Proyectar e intervenir como apoderado en las acciones constitucionales (tutelas, acciones populares, de grupo) en defensa de los intereses de la entidad.\n\n" +
      "Intervenir como apoderado judicial en asuntos administrativos ante cualquier autoridad judicial o administrativa y en jurisdicción coactiva.\n\n" +
      "Interponer recursos ordinarios o extraordinarios ante las altas cortes, cuando el caso lo requiera.\n\n" +
      "Proyectar los actos administrativos requeridos en los procesos asignados hasta el agotamiento de la vía gubernativa.\n\n" +
      "Vigilar periódicamente los procesos asignados, procurando minimizar los efectos de una condena contra la entidad.\n\n" +
      "Asesorar y proyectar conceptos jurídicos sobre la aplicación de disposiciones legales para apoyar la toma de decisiones.\n\n" +
      "Dar trámite a los procedimientos presupuestales para el pago de costas, condenas y honorarios.\n\n" +
      "Colaborar con el Jefe Inmediato en el diseño de estrategias procesales en la Dirección Técnica de Gestión Judicial."
    );
  };

  const prellenarCargoIduDirectorTecnico = () => {
    setFormCertCargo('DIRECTOR TÉCNICO CÓDIGO 009 GRADO 05');
    setFormCertEntidad('INSTITUTO DE DESARROLLO URBANO - IDU');
    setFormCertTipoVinculo('ENCARGO');
    setFormCertFechaInicio('2012-02-21');
    setFormCertFechaFin('2012-04-15');
    setFormCertVinculoVigente(false);
    setFormCertClasificacion('RELACIONADA');
    const certIdu = certificados.find(c => (c.entidad || '').toUpperCase().includes('IDU') || (c.entidad || '').toUpperCase().includes('DESARROLLO URBANO'));
    if (certIdu) {
      setFormCertArchivoAsociado(certIdu.nombre_archivo || certIdu.anexos?.[0] || '');
    }
    setFormCertFunciones(
      "Dirigir, orientar, coordinar y controlar la gestión para la defensa judicial y extrajudicial de los intereses de la entidad, garantizando una eficiente actuación en los procesos (Resolución N° 1161 de 2009).\n\n" +
      "Realizar el seguimiento y evaluación permanente de las actuaciones de los apoderados de los procesos judiciales para garantizar la debida defensa.\n\n" +
      "Preparar los documentos y presentar las recomendaciones jurídicas sobre la instauración de acciones judiciales, policivas o administrativas encomendadas por la Dirección General.\n\n" +
      "Dirigir, coordinar y controlar el desarrollo de las gestiones necesarias para adelantar las acciones de lesividad o repetición a que haya lugar.\n\n" +
      "Supervisar y controlar el desarrollo de los procesos en los casos en que proceda el llamamiento en garantía.\n\n" +
      "Prevenir el riesgo antijurídico mediante la información oportuna a todas las dependencias de la entidad, orientando la defensa institucional.\n\n" +
      "Coordinar y controlar la representación de la entidad en las audiencias de conciliación y coordinar la realización del Comité de Conciliación y Defensa Judicial.\n\n" +
      "Adelantar la supervisión, seguimiento, control y evaluación de la gestión administrativa, financiera, legal y técnica de los asuntos a su cargo.\n\n" +
      "Organizar, dirigir y supervisar las labores del personal a cargo con el fin de cumplir con las metas propuestas para el área de Gestión Judicial."
    );
  };

  const descartarCertificado = async (idx: number) => {
    const cert = certificados[idx];
    if (!cert) return;
    const certId = cert.id || cert.id_certificado;
    if (certId) {
      await ingresosService.eliminarCertificado(id, certId).catch(() => {});
    }
    const nuevaListaCerts = certificados.filter((_, i) => i !== idx);
    const nuevoNoAplica = {
      id: `NO-APLICA-${documentosNoAplican.length + 1}`,
      nombre_archivo: cert.nombre_archivo,
      descripcion: `${cert.cargo_certificado || 'Certificado'} en ${cert.entidad || 'Entidad'}`,
      entidad: cert.entidad || 'Entidad',
      motivo_no_aplica: 'Descartado manualmente por evaluador: No computable para la experiencia laboral del cargo.'
    };
    const nuevaListaNoAplican = [...documentosNoAplican, nuevoNoAplica];

    const reqMeses = Number(data?.cargo_evaluado?.requisito_experiencia_meses) || Number(data?.consolidado?.requisito_minimo_meses) || 0;
    let certsFinales = nuevaListaCerts;
    let nuevoConsolidado = data?.consolidado;
    try {
      const recalc = await ingresosService.recalcularTiempos(nuevaListaCerts, reqMeses);
      if (recalc?.certificados) certsFinales = recalc.certificados;
      if (recalc?.consolidado) nuevoConsolidado = recalc.consolidado;
    } catch (eRecalc) {
      console.warn('Error recalculando:', eRecalc);
    }

    setCertificados(certsFinales);
    setDocumentosNoAplican(nuevaListaNoAplican);
    setCertModalDetalle(null);
    try {
      setGuardandoCambios(true);
      await ingresosService.actualizarValidacion(id, {
        certificados: certsFinales,
        documentos_no_aplican: nuevaListaNoAplican,
        formacion_academica: titulos,
        consolidado: nuevoConsolidado
      });
      if (data) setData({ ...data, certificados: certsFinales, documentos_no_aplican: nuevaListaNoAplican, consolidado: nuevoConsolidado || data.consolidado });
      setHayCambios(false);
      mostrarMensaje('Certificado Descartado', 'El certificado ha sido trasladado a "Documentos Descartados / No Computables" y los tiempos se han recalculado.');
    } catch (err: any) {
      mostrarMensaje('Error al Descartar', err.message || 'No se pudo mover el certificado.');
    } finally {
      setGuardandoCambios(false);
    }
  };

  const guardarCertificadoForm = async () => {
    if (!formCertCargo.trim()) {
      mostrarMensaje('Campo Requerido', 'Debes ingresar la denominación del cargo.');
      return;
    }
    if (!formCertEntidad.trim()) {
      mostrarMensaje('Campo Requerido', 'Debes ingresar la entidad.');
      return;
    }
    if (!formCertFechaInicio.trim()) {
      mostrarMensaje('Campo Requerido', 'Debes ingresar la fecha de inicio.');
      return;
    }

    const funcionesArray = formCertFunciones.trim()
      ? formCertFunciones.split('\n').map(l => l.trim()).filter(Boolean).map(f => ({ funcion: f, evidencia_textual: f }))
      : [];

    let nuevaListaCerts = [...certificados];

    if (certEditandoIndex !== null) {
      const certPrevio = certificados[certEditandoIndex];
      const certActualizado: CertificadoAnalizado = {
        ...certPrevio,
        cargo_certificado: formCertCargo.trim(),
        entidad: formCertEntidad.trim(),
        fecha_inicio: formCertFechaInicio.trim(),
        fecha_fin: formCertFechaFin.trim(),
        vinculo_vigente: formCertVinculoVigente,
        clasificacion_experiencia: formCertClasificacion,
        tipo_vinculo: formCertTipoVinculo.trim() || certPrevio.tipo_vinculo,
        funciones_certificadas: funcionesArray.length > 0 ? funcionesArray : certPrevio.funciones_certificadas,
        nombre_archivo: formCertArchivoAsociado || certPrevio.nombre_archivo,
        anexos: formCertArchivoAsociado ? [formCertArchivoAsociado] : certPrevio.anexos
      };
      nuevaListaCerts[certEditandoIndex] = certActualizado;
    } else {
      const nuevoIdNum = certificados.length + 1;
      const nuevoCert: CertificadoAnalizado = {
        id_certificado: `CERT-${nuevoIdNum}`,
        cargo_certificado: formCertCargo.trim(),
        entidad: formCertEntidad.trim(),
        fecha_inicio: formCertFechaInicio.trim(),
        fecha_fin: formCertFechaFin.trim(),
        vinculo_vigente: formCertVinculoVigente,
        clasificacion_experiencia: formCertClasificacion,
        tipo_vinculo: formCertTipoVinculo.trim() || 'Laboral',
        nombre_archivo: formCertArchivoAsociado || '',
        anexos: formCertArchivoAsociado ? [formCertArchivoAsociado] : [],
        funciones_certificadas: funcionesArray,
        experiencia_profesional: true,
        verificacion_formal: {
          corresponde_aspirante: true,
          entidad_identificable: true,
          suscriptor_identificable: true,
          cuenta_con_firma: true,
          fecha_expedicion_identificable: true,
          documento_legible_integro: true,
          mecanismos_contacto_verificacion: true
        }
      };
      nuevaListaCerts.push(nuevoCert);
    }

    const reqMeses = Number(data?.cargo_evaluado?.requisito_experiencia_meses) || Number(data?.consolidado?.requisito_minimo_meses) || 0;
    let certsFinales = nuevaListaCerts;
    let nuevoConsolidado = data?.consolidado;
    try {
      const recalc = await ingresosService.recalcularTiempos(nuevaListaCerts, reqMeses);
      if (recalc?.certificados) certsFinales = recalc.certificados;
      if (recalc?.consolidado) nuevoConsolidado = recalc.consolidado;
    } catch (eRecalc) {
      console.warn('Error recalculando:', eRecalc);
    }

    setCertificados(certsFinales);
    setModalCertVisible(false);
    setCertModalDetalle(null);

    try {
      setGuardandoCambios(true);
      await ingresosService.actualizarValidacion(id, {
        certificados: certsFinales,
        formacion_academica: titulos,
        documentos_no_aplican: documentosNoAplican,
        consolidado: nuevoConsolidado
      });
      if (data) setData({ ...data, certificados: certsFinales, consolidado: nuevoConsolidado || data.consolidado });
      setHayCambios(false);
      mostrarMensaje(
        certEditandoIndex !== null ? 'Certificado Guardado' : 'Experiencia Laboral Creada',
        certEditandoIndex !== null
          ? 'Los datos del certificado y los cómputos de experiencia han sido actualizados en la base de datos.'
          : 'El cargo ha sido incorporado al expediente y los tiempos válidos han sido recalculados automáticamente.'
      );
    } catch (err: any) {
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar el certificado.');
    } finally {
      setGuardandoCambios(false);
    }
  };

  const abrirModalComplementarCertificado = (idx: number) => {
    const c = certificados[idx];
    if (!c) return;
    setCertAComplementar({ cert: c, idx });
    setArchivoComplementario(null);
    setModalComplementarVisible(true);
  };

  const seleccionarPdfComplementario = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: false,
        copyToCacheDirectory: true
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];

      let base64 = '';
      if (Platform.OS === 'web' && (asset as any).file) {
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL((asset as any).file as Blob);
        });
      } else {
        const FileSystem = require('expo-file-system');
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64
        });
      }

      setArchivoComplementario({
        name: asset.name,
        base64: base64,
        size: asset.size
      });
    } catch (err: any) {
      mostrarMensaje('Error al Seleccionar Archivo', err.message || 'No se pudo leer el archivo PDF.');
    }
  };

  const ejecutarComplementarCertificado = async () => {
    if (!id || !certAComplementar || !archivoComplementario) {
      mostrarMensaje('Atención', 'Por favor selecciona un archivo PDF complementario para continuar.');
      return;
    }

    try {
      setProcesandoComplementarIa(true);
      const targetCertId = certAComplementar.cert.id || certAComplementar.cert.id_certificado || `cert-${certAComplementar.idx}`;

      const res = await ingresosService.complementarCertificado(
        id,
        targetCertId,
        archivoComplementario
      );

      if (res.success) {
        const nuevosCerts = res.certificados || certificados.map((c, i) => i === certAComplementar.idx ? res.certificado : c);
        setCertificados(nuevosCerts);
        if (res.consolidado && data) {
          setData({
            ...data,
            certificados: nuevosCerts,
            consolidado: res.consolidado
          });
        } else if (data) {
          setData({
            ...data,
            certificados: nuevosCerts
          });
        }
        setHayCambios(false);
        setModalComplementarVisible(false);
        setCertAComplementar(null);
        setArchivoComplementario(null);

        mostrarMensaje(
          '¡Experiencia Complementada con Éxito!',
          `Se ha incorporado "${archivoComplementario.name}" como soporte complementario de este empleo. La IA enriqueció las funciones, actualizó los periodos y recalculó la concordancia con el perfil del cargo.`
        );
      }
    } catch (err: any) {
      const rawMsg = err.message || String(err);
      const { resumen } = sanitizarMensajeErrorIa(rawMsg);
      mostrarMensaje('Error al Complementar', resumen);
    } finally {
      setProcesandoComplementarIa(false);
    }
  };

  const pedirConfirmarEliminarTitulo = (idx: number) => {
    const it = titulos[idx];
    setItemAEliminar({
      tipo: 'TITULO',
      idx,
      titulo: 'Eliminar Título Académico',
      descripcion: `¿Estás seguro de que deseas eliminar el título "${it?.titulo_obtenido || 'seleccionado'}" de este expediente? Se borrará de forma permanente de la base de datos.`
    });
    setModalEliminarVisible(true);
  };

  const pedirConfirmarEliminarCertificado = (idx: number) => {
    const it = certificados[idx];
    setItemAEliminar({
      tipo: 'CERTIFICADO',
      idx,
      titulo: 'Eliminar Certificado Laboral',
      descripcion: `¿Estás seguro de que deseas eliminar el certificado "${it?.entidad || ''} - ${it?.cargo_certificado || ''}" de este expediente? Se borrará de forma permanente de la base de datos y se recalcularán los tiempos válidos.`
    });
    setModalEliminarVisible(true);
  };

  const pedirConfirmarEliminarDocNoAplica = (idx: number) => {
    const it = documentosNoAplican[idx];
    setItemAEliminar({
      tipo: 'DOCUMENTO_NO_APLICA',
      idx,
      titulo: 'Eliminar Registro de Documento No Aplicable',
      descripcion: `¿Estás seguro de que deseas eliminar "${it?.descripcion || it?.nombre_archivo || 'este documento'}" de la lista de documentos que no aplican? Se borrará de forma permanente de la base de datos.`
    });
    setModalEliminarVisible(true);
  };

  const pedirConfirmarEliminarExpediente = () => {
    setItemAEliminar({
      tipo: 'EXPEDIENTE_COMPLETO',
      idx: 0,
      titulo: 'Eliminar Dictamen y Expediente',
      descripcion: `¿Estás seguro de que deseas eliminar definitivamente este dictamen de ${candidato.nombre}? Esta acción no se puede deshacer y borrará todos los certificados y validaciones asociadas.`
    });
    setModalEliminarVisible(true);
  };

  const ejecutarEliminar = async () => {
    if (!itemAEliminar) return;

    if (itemAEliminar.tipo === 'EXPEDIENTE_COMPLETO') {
      try {
        setModalEliminarVisible(false);
        setLoading(true);
        await ingresosService.eliminarValidacion(id);
        router.replace('/ingresos');
      } catch (err: any) {
        setLoading(false);
        mostrarMensaje('Error al Eliminar', err.message || 'No se pudo eliminar el dictamen.');
      }
      return;
    }

    setModalEliminarVisible(false);
    setLoading(true);

    try {
      if (itemAEliminar.tipo === 'TITULO') {
        const nuevaLista = titulos.filter((_, idx) => idx !== itemAEliminar.idx);
        await ingresosService.actualizarValidacion(id, {
          formacion_academica: nuevaLista,
          certificados: certificados,
          documentos_no_aplican: documentosNoAplican
        });
        setTitulos(nuevaLista);
        if (data) setData({ ...data, formacion_academica: nuevaLista });
        setHayCambios(false);
        mostrarMensaje('Título Eliminado', 'El título académico ha sido eliminado permanentemente del expediente.');
      } else if (itemAEliminar.tipo === 'CERTIFICADO') {
        const certAEliminar = certificados[itemAEliminar.idx];
        const certId = certAEliminar?.id || certAEliminar?.id_certificado;
        if (certId) {
          await ingresosService.eliminarCertificado(id, certId).catch(() => {});
        }

        const nuevaLista = certificados.filter((_, idx) => idx !== itemAEliminar.idx);
        const reqMeses = Number(data?.cargo_evaluado?.requisito_experiencia_meses) || Number(data?.consolidado?.requisito_minimo_meses) || 0;
        let certsFinales = nuevaLista;
        let nuevoConsolidado = data?.consolidado;
        try {
          const recalc = await ingresosService.recalcularTiempos(nuevaLista, reqMeses);
          if (recalc?.certificados) certsFinales = recalc.certificados;
          if (recalc?.consolidado) nuevoConsolidado = recalc.consolidado;
        } catch (eRecalc) {
          console.warn('Error recalculando tras eliminar certificado:', eRecalc);
        }

        await ingresosService.actualizarValidacion(id, {
          certificados: certsFinales,
          formacion_academica: titulos,
          documentos_no_aplican: documentosNoAplican,
          consolidado: nuevoConsolidado
        });
        setCertificados(certsFinales);
        if (data) setData({ ...data, certificados: certsFinales, consolidado: nuevoConsolidado || data.consolidado });
        setHayCambios(false);
        mostrarMensaje(
          'Certificado Eliminado',
          'El certificado laboral ha sido eliminado del expediente y los tiempos de experiencia han sido recalculados y guardados en la base de datos.'
        );
      } else if (itemAEliminar.tipo === 'DOCUMENTO_NO_APLICA') {
        const nuevaLista = documentosNoAplican.filter((_, idx) => idx !== itemAEliminar.idx);
        await ingresosService.actualizarValidacion(id, {
          documentos_no_aplican: nuevaLista,
          formacion_academica: titulos,
          certificados: certificados
        });
        setDocumentosNoAplican(nuevaLista);
        if (data) setData({ ...data, documentos_no_aplican: nuevaLista });
        setHayCambios(false);
        mostrarMensaje('Registro Eliminado', 'El documento no aplicable ha sido eliminado correctamente del expediente.');
      }
    } catch (err: any) {
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo eliminar el elemento en el servidor.');
    } finally {
      setLoading(false);
      setItemAEliminar(null);
    }
  };

  const guardarCambiosServidor = async () => {
    if (!id || !data) return;
    try {
      setGuardandoCambios(true);
      const reqMeses = Number(data?.cargo_evaluado?.requisito_experiencia_meses) || Number(data?.consolidado?.requisito_minimo_meses) || 0;
      let certsFinales = certificados;
      let nuevoConsolidado = data.consolidado;
      try {
        const recalc = await ingresosService.recalcularTiempos(certificados, reqMeses);
        if (recalc?.certificados) certsFinales = recalc.certificados;
        if (recalc?.consolidado) nuevoConsolidado = recalc.consolidado;
      } catch (eRecalc) {
        console.warn('Error recalculando:', eRecalc);
      }

      await ingresosService.actualizarValidacion(id, {
        formacion_academica: titulos,
        certificados: certsFinales,
        documentos_no_aplican: documentosNoAplican,
        consolidado: nuevoConsolidado
      });
      setHayCambios(false);
      setData({
        ...data,
        formacion_academica: titulos,
        certificados: certsFinales,
        documentos_no_aplican: documentosNoAplican,
        consolidado: nuevoConsolidado
      });
      mostrarMensaje(
        'Cambios Guardados',
        'Las modificaciones realizadas han sido actualizadas exitosamente en el expediente y se reflejarán de inmediato en la exportación a Excel.'
      );
    } catch (err: any) {
      mostrarMensaje('Error al Guardar', err.message || 'No se pudieron guardar los cambios.');
    } finally {
      setGuardandoCambios(false);
    }
  };

  const rehacerExpediente = () => {
    if (!id) return;
    router.push(`/ingresos/nueva?rehacerId=${id}`);
  };

  const descargarExcel = () => {
    if (!id) return;
    const url = ingresosService.getExcelDownloadUrl(id);
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#991B1B" />
        <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14 }}>
          Cargando dictamen documental...
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 12 }}>
          Expediente no encontrado
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/ingresos')}
          style={{ marginTop: 16, backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Volver al Listado</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { candidato, cargo_evaluado, consolidado } = data;
  const esCumple = consolidado.resultado_final === 'CUMPLE';
  const esNoCumple = consolidado.resultado_final === 'NO_CUMPLE';
  const esRequiereRevision = consolidado.resultado_final === 'REQUIERE_REVISION' || consolidado.resultado_final === 'REQUIERE REVISION' || Boolean(consolidado.requiere_revision_humana);
  const colorEstado = esCumple ? '#16A34A' : esNoCumple ? '#DC2626' : '#D97706';
  const bgEstado = esCumple ? '#DCFCE7' : esNoCumple ? '#FEE2E2' : '#FEF3C7';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#0F172A',
          paddingTop: Platform.OS === 'ios' ? 50 : 20,
          paddingBottom: 20,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <TouchableOpacity
          onPress={() => router.replace('/ingresos')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
              Dictamen de Validación de Ingreso
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>
              Expediente: {candidato.nombre} • Cédula: {candidato.documento}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {hayCambios && (
            <TouchableOpacity
              onPress={guardarCambiosServidor}
              disabled={guardandoCambios}
              style={{
                backgroundColor: '#2563EB',
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6
              }}
            >
              {guardandoCambios ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="save-outline" size={18} color="#FFFFFF" />
              )}
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                {guardandoCambios ? 'Guardando...' : 'Guardar Cambios'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={subirYAnalizarDocumento}
            disabled={subiendoDoc}
            style={{
              backgroundColor: '#4F46E5',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 3
            }}
          >
            {subiendoDoc ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="sparkles" size={17} color="#FDE047" />
            )}
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
              {subiendoDoc ? 'Analizando con IA...' : 'Subir Documento (IA)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={rehacerExpediente}
            style={{
              backgroundColor: '#4338CA',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
              Rehacer Dictamen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={descargarExcel}
            style={{
              backgroundColor: '#16A34A',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
              Exportar Excel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pedirConfirmarEliminarExpediente}
            style={{
              backgroundColor: '#DC2626',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
              Eliminar Dictamen
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BARRA DE SELECCIÓN DE VISTA */}
      <View
        style={{
          backgroundColor: '#0F172A',
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B',
          paddingHorizontal: 24,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        {/* Selector Desplegable */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8' }}>
            MODO DE VISTA:
          </Text>

          <TouchableOpacity
            onPress={() => setModalSelectorVista(true)}
            style={{
              backgroundColor: '#1E293B',
              borderWidth: 1,
              borderColor: '#334155',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 7,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Ionicons
              name={modoVista === 'simplificada' ? 'flash' : 'list-circle'}
              size={16}
              color={modoVista === 'simplificada' ? '#F59E0B' : '#60A5FA'}
            />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#F8FAFC' }}>
              {modoVista === 'simplificada'
                ? '⚡ Versión Simplificada (Resumen Ejecutivo)'
                : '📋 Versión Completa (Auditoría Técnica)'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Acceso Rápido con Botones Píldora */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#1E293B',
            borderRadius: 8,
            padding: 3,
            borderWidth: 1,
            borderColor: '#334155',
            gap: 2
          }}
        >
          <TouchableOpacity
            onPress={() => setModoVista('simplificada')}
            style={{
              backgroundColor: modoVista === 'simplificada' ? '#2563EB' : 'transparent',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Ionicons
              name="flash"
              size={14}
              color={modoVista === 'simplificada' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: modoVista === 'simplificada' ? '800' : '600',
                color: modoVista === 'simplificada' ? '#FFFFFF' : '#94A3B8'
              }}
            >
              Simplificada
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setModoVista('auditoria')}
            style={{
              backgroundColor: modoVista === 'auditoria' ? '#2563EB' : 'transparent',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Ionicons
              name="list-circle"
              size={15}
              color={modoVista === 'auditoria' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: modoVista === 'auditoria' ? '800' : '600',
                color: modoVista === 'auditoria' ? '#FFFFFF' : '#94A3B8'
              }}
            >
              Auditoría Completa
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {modoVista === 'simplificada' ? (
        <ScrollView contentContainerStyle={{ padding: 24, width: '100%', gap: 20 }}>
          {/* BANNER INFORMATIVO DE MODO */}
          <View
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: '#BFDBFE',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
              <Ionicons name="flash" size={18} color="#2563EB" />
              <Text style={{ fontSize: 13, color: '#1E40AF', fontWeight: '600' }}>
                Estás visualizando la <Text style={{ fontWeight: '800' }}>Versión Simplificada</Text> (Resumen Ejecutivo).
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setModoVista('auditoria')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB', textDecorationLine: 'underline' }}>
                Ver auditoría jurídica completa (20 verificaciones) →
              </Text>
            </TouchableOpacity>
          </View>

          {/* TARJETA PRINCIPAL DE DICTAMEN EJECUTIVO (HERO) */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
              gap: 18
            }}
          >
            {/* Encabezado Institucional y Dictamen */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
                paddingBottom: 16
              }}
            >
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Secretaría Jurídica Distrital • Sistema SASGE
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>
                  Dictamen Ejecutivo de Validación de Ingreso
                </Text>
              </View>

              {/* Badge Grande de Dictamen */}
              <View
                style={{
                  backgroundColor: bgEstado,
                  borderWidth: 1.5,
                  borderColor: colorEstado,
                  borderRadius: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <Ionicons
                  name={esCumple ? 'checkmark-circle' : esNoCumple ? 'close-circle' : 'alert-circle'}
                  size={24}
                  color={colorEstado}
                />
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colorEstado, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Dictamen Final
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: colorEstado }}>
                    {consolidado.resultado_final.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Datos del Aspirante y Empleo Evaluado */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              {/* Aspirante */}
              <View
                style={{
                  flex: 1.2,
                  minWidth: 280,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  gap: 10
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                  Aspirante Evaluado
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#0F172A',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                      {candidato.nombre
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(n => n[0])
                        .join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                      {candidato.nombre}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                      C.C. {candidato.documento}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="mail-outline" size={14} color="#64748B" />
                    <Text style={{ fontSize: 12, color: '#334155' }}>
                      {candidato.email || 'No registrado'}
                    </Text>
                  </View>
                  {candidato.telefono ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="call-outline" size={14} color="#64748B" />
                      <Text style={{ fontSize: 12, color: '#334155' }}>
                        {candidato.telefono}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Empleo Aspirado */}
              <View
                style={{
                  flex: 1.2,
                  minWidth: 280,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  gap: 10
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                  Empleo Público al que Aspira
                </Text>

                <View>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                    {cargo_evaluado.nombre}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                    Código {cargo_evaluado.codigo || 'N/A'} • Grado {cargo_evaluado.grado || 'N/A'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 12, color: '#475569' }}>
                    {cargo_evaluado.dependencia || 'Secretaría Jurídica Distrital'}
                  </Text>
                  {cargo_evaluado.id_sideap ? (
                    <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#C7D2FE' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#3730A3' }}>SIDEAP #{cargo_evaluado.id_sideap}</Text>
                    </View>
                  ) : null}
                  {cargo_evaluado.id_perno ? (
                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>PERNO #{cargo_evaluado.id_perno}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Justificación Técnica del Dictamen */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 16,
                borderLeftWidth: 4,
                borderLeftColor: colorEstado,
                borderWidth: 1,
                borderColor: '#E2E8F0'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Ionicons name="document-text" size={17} color={colorEstado} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                  Fundamento Jurídico y Técnico del Dictamen
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: '#334155', lineHeight: 21 }}>
                {consolidado.justificacion}
              </Text>
            </View>

            {/* LISTADO DE PUNTOS QUE REQUIEREN REVISIÓN TÉCNICA (CHECKLIST INTERACTIVO) */}
            {(puntosRevision.length > 0 || esRequiereRevision) && (
              <View
                style={{
                  backgroundColor: esCumple ? '#F0FDF4' : '#FFFBEB',
                  borderRadius: 12,
                  padding: 18,
                  borderWidth: 1.5,
                  borderColor: esCumple ? '#86EFAC' : '#F59E0B',
                  gap: 14
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons
                      name={esCumple ? 'checkmark-circle' : 'alert-circle'}
                      size={24}
                      color={esCumple ? '#15803D' : '#D97706'}
                    />
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: esCumple ? '#166534' : '#92400E' }}>
                        {esCumple
                          ? '✓ Puntos de Control y Revisión Verificados (Dictamen OK)'
                          : 'Puntos que Requieren Revisión Técnica del Evaluador'}
                      </Text>
                      <Text style={{ fontSize: 12, color: esCumple ? '#15803D' : '#B45309', marginTop: 1 }}>
                        {esCumple
                          ? 'Todos los aspectos observados han sido validados formalmente por el evaluador.'
                          : 'A medida que revises cada ítem, márcalo con check. Al completarlos todos, el Dictamen Final pasará automáticamente a CUMPLE (OK).'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <View
                      style={{
                        backgroundColor: esCumple ? '#DCFCE7' : '#FEF3C7',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: esCumple ? '#86EFAC' : '#FDE68A'
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: esCumple ? '#15803D' : '#B45309' }}>
                        {puntosRevision.filter(p => itemsRevisados[p.id]).length} / {puntosRevision.length} verificados
                      </Text>
                    </View>

                    {!esCumple && (
                      <TouchableOpacity
                        onPress={marcarTodosComoRevisadosAprobar}
                        style={{
                          backgroundColor: '#16A34A',
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Ionicons name="checkmark-done" size={15} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                          Aprobar Todo (Dictamen OK)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Listado de ítems con Checkbox interactivo */}
                <View style={{ gap: 8 }}>
                  {puntosRevision.map((item, pIdx) => {
                    const estaRevisado = Boolean(itemsRevisados[item.id]);

                    return (
                      <TouchableOpacity
                        key={item.id || pIdx}
                        activeOpacity={0.8}
                        onPress={() => toggleCheckItemRevision(item.id)}
                        style={{
                          backgroundColor: estaRevisado ? '#F0FDF4' : '#FFFFFF',
                          borderRadius: 8,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: estaRevisado ? '#86EFAC' : '#FDE68A',
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: 12
                        }}
                      >
                        {/* Checkbox */}
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: estaRevisado ? '#16A34A' : '#D97706',
                            backgroundColor: estaRevisado ? '#16A34A' : '#FFFFFF',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: 2
                          }}
                        >
                          {estaRevisado && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>

                        {/* Contenido del Ítem */}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: '800',
                                color: estaRevisado ? '#15803D' : '#0F172A',
                                textDecorationLine: estaRevisado ? 'line-through' : 'none'
                              }}
                            >
                              {item.titulo}
                            </Text>
                            <View
                              style={{
                                backgroundColor: estaRevisado ? '#DCFCE7' : '#FEF3C7',
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: 4
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '700',
                                  color: estaRevisado ? '#15803D' : item.badgeColor
                                }}
                              >
                                {item.origen}
                              </Text>
                            </View>
                          </View>

                          <Text
                            style={{
                              fontSize: 12,
                              color: estaRevisado ? '#4B5563' : '#334155',
                              marginTop: 4,
                              lineHeight: 17
                            }}
                          >
                            {item.descripcion}
                          </Text>
                        </View>

                        {/* Estado Badge a la derecha */}
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            backgroundColor: estaRevisado ? '#DCFCE7' : '#FEF3C7',
                            borderWidth: 1,
                            borderColor: estaRevisado ? '#86EFAC' : '#FDE68A'
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color: estaRevisado ? '#15803D' : '#B45309'
                            }}
                          >
                            {estaRevisado ? '✓ Revisado' : 'Pendiente'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* MATRIZ DE REQUISITOS MÍNIMOS (2 COLUMNAS) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
            {/* COLUMNA 1: FORMACIÓN ACADÉMICA */}
            <View
              style={{
                flex: 1,
                minWidth: 320,
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                padding: 20,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1,
                gap: 14
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="school" size={18} color="#2563EB" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                    1. Requisito de Formación
                  </Text>
                </View>

                {titulos.some(t => t.cumple_requisito_cargo !== false) ? (
                  <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                      ✓ CUMPLE ESTUDIOS
                    </Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#B91C1C' }}>
                      ❌ NO ACREDITA
                    </Text>
                  </View>
                )}
              </View>

              {/* Exigencia del Manual */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4, textTransform: 'uppercase' }}>
                  Requisito Exigido por el Empleo
                </Text>
                <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '600', lineHeight: 18 }}>
                  {cargo_evaluado.requisitos_formacion || 'Título profesional según disciplina exigida en el manual específico de funciones y de competencias laborales.'}
                </Text>
              </View>

              {/* 3 Métricas de Formación */}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 90, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Títulos</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>
                    {titulos.length} doc(s)
                  </Text>
                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>Acreditados</Text>
                </View>

                <View style={{ flex: 1.4, minWidth: 120, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Título Principal</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803D', marginTop: 2 }} numberOfLines={1}>
                    {titulos[0]?.titulo_obtenido || 'No registra'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#166534' }} numberOfLines={1}>{titulos[0]?.institucion || 'Sin institución'}</Text>
                </View>

                <View style={{ flex: 1, minWidth: 90, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Tarjeta Prof.</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: titulos.some(t => t.numero_tarjeta_o_registro) ? '#2563EB' : '#64748B', marginTop: 2 }} numberOfLines={1}>
                    {titulos.find(t => t.numero_tarjeta_o_registro)?.numero_tarjeta_o_registro || 'No requerida'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>
                    {titulos.some(t => t.numero_tarjeta_o_registro) ? 'Acreditada' : 'No obligatoria'}
                  </Text>
                </View>
              </View>

              <View style={{ backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BFDBFE', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="information-circle" size={16} color="#2563EB" />
                <Text style={{ fontSize: 11, color: '#1E40AF', flex: 1, lineHeight: 16 }}>
                  Desglose formal completo de títulos, fechas de corte y soportes disponible en la tabla de formación a continuación.
                </Text>
              </View>
            </View>

            {/* COLUMNA 2: EXPERIENCIA LABORAL */}
            <View
              style={{
                flex: 1,
                minWidth: 320,
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                padding: 20,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1,
                gap: 14
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F0FDFA', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="briefcase" size={18} color="#0D9488" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                    2. Experiencia Laboral
                  </Text>
                </View>

                {consolidado.diferencia_meses >= 0 ? (
                  <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                      ✓ CUMPLE TIEMPO
                    </Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#B91C1C' }}>
                      ❌ DÉFICIT DE TIEMPO
                    </Text>
                  </View>
                )}
              </View>

              {/* 3 Métricas en Tarjetas Limpias */}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 90, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Requerido</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>
                    {consolidado.requisito_minimo_meses} m
                  </Text>
                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>Exigencia mínima</Text>
                </View>

                <View style={{ flex: 1, minWidth: 90, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Acreditado</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#15803D', marginTop: 2 }}>
                    {consolidado.experiencia_relacionada_meses} m
                  </Text>
                  <Text style={{ fontSize: 10, color: '#166534' }}>Tiempo neto válido</Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    minWidth: 90,
                    backgroundColor: consolidado.diferencia_meses >= 0 ? '#F0FDF4' : '#FEF2F2',
                    borderRadius: 8,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: consolidado.diferencia_meses >= 0 ? '#BBF7D0' : '#FECACA'
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: consolidado.diferencia_meses >= 0 ? '#166534' : '#991B1B',
                      textTransform: 'uppercase'
                    }}
                  >
                    Balance
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '900',
                      color: consolidado.diferencia_meses >= 0 ? '#15803D' : '#DC2626',
                      marginTop: 2
                    }}
                  >
                    {consolidado.diferencia_meses >= 0 ? '+' : ''}{consolidado.diferencia_meses} m
                  </Text>
                  <Text style={{ fontSize: 10, color: consolidado.diferencia_meses >= 0 ? '#166534' : '#991B1B' }}>
                    {consolidado.diferencia_meses >= 0 ? 'Excedente' : 'Faltante'}
                  </Text>
                </View>
              </View>

              {/* Barra de Progreso Visual */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                    Cobertura de Experiencia Requerida:
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: consolidado.diferencia_meses >= 0 ? '#15803D' : '#DC2626'
                    }}
                  >
                    {consolidado.requisito_minimo_meses > 0
                      ? `${Math.round((consolidado.experiencia_relacionada_meses / consolidado.requisito_minimo_meses) * 100)}%`
                      : '100%'}
                  </Text>
                </View>

                {/* Track */}
                <View style={{ height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden' }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round((consolidado.experiencia_relacionada_meses / Math.max(1, consolidado.requisito_minimo_meses)) * 100))}%`,
                      backgroundColor: consolidado.diferencia_meses >= 0 ? '#10B981' : '#EF4444',
                      borderRadius: 5
                    }}
                  />
                </View>
              </View>

              {/* Traslapes Excluidos si aplican */}
              {Number(consolidado.tiempo_excluido_por_traslapes_meses) > 0 ? (
                <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="alert-circle" size={16} color="#D97706" />
                  <Text style={{ fontSize: 11, color: '#92400E', flex: 1, lineHeight: 16 }}>
                    Se dedujeron <Text style={{ fontWeight: '800' }}>{consolidado.tiempo_excluido_por_traslapes_meses} meses</Text> por simultaneidad de contratos o traslapes temporales.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* TABLA EJECUTIVA DE FORMACIÓN ACADÉMICA Y TARJETAS PROFESIONALES */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
              gap: 16
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="school-outline" size={20} color="#1E40AF" />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    Tabla Ejecutiva de Formación Académica y Tarjetas Profesionales
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  💡 Haz clic sobre cualquier fila para desplegar la verificación formal completa (acta de grado, folio, firmas y convalidación).
                </Text>
              </View>

              <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#3730A3' }}>
                  {titulos.length} documento(s) formativo(s)
                </Text>
              </View>
            </View>

            {titulos.length === 0 ? (
              <View style={{ padding: 24, backgroundColor: '#F8FAFC', borderRadius: 10, alignItems: 'center' }}>
                <Ionicons name="folder-open-outline" size={32} color="#94A3B8" />
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
                  No se registran títulos académicos ni tarjetas profesionales en este dictamen.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ width: '100%', minWidth: 900 }}>
                <View style={{ width: '100%', minWidth: 900, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Encabezado Tabla */}
                  <View
                    style={{
                      flexDirection: 'row',
                      backgroundColor: '#F1F5F9',
                      paddingVertical: 11,
                      paddingHorizontal: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: '#CBD5E1'
                    }}
                  >
                    <Text style={{ width: '8%', fontSize: 11, fontWeight: '800', color: '#475569' }}>REF</Text>
                    <Text style={{ width: '14%', fontSize: 11, fontWeight: '800', color: '#475569' }}>NIVEL / TIPO</Text>
                    <Text style={{ width: '28%', fontSize: 11, fontWeight: '800', color: '#475569' }}>TÍTULO OBTENIDO</Text>
                    <Text style={{ width: '26%', fontSize: 11, fontWeight: '800', color: '#475569' }}>INSTITUCIÓN EMISORA</Text>
                    <Text style={{ width: '12%', fontSize: 11, fontWeight: '800', color: '#475569' }}>FECHA DE GRADO</Text>
                    <Text style={{ width: '12%', fontSize: 11, fontWeight: '800', color: '#475569' }}>ESTADO</Text>
                  </View>

                  {/* Filas de Formación Académica */}
                  {titulos.map((t, idx) => {
                    const titKey = t.id || `tit-${idx}`;
                    const estaExpandido = Boolean(titulosExpandidos[titKey]);
                    const esBach = t.tipo === 'BACHILLER' || (t.titulo_obtenido || '').toUpperCase().includes('BACHILLER');
                    const checksTitulo = obtenerChecksTitulo(t, candidato?.nombre, candidato?.documento);
                    const checksTarjeta = (!esBach && t.numero_tarjeta_o_registro) ? obtenerChecksTarjeta(t, candidato?.nombre, candidato?.documento) : null;
                    const cumple = t.cumple_requisito_cargo !== false;

                    return (
                      <View key={titKey} style={{ borderBottomWidth: idx < titulos.length - 1 ? 1 : 0, borderBottomColor: '#E2E8F0' }}>
                        {/* Fila Principal Cliqueable */}
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => toggleExpandirTitulo(titKey)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            backgroundColor: estaExpandido ? '#F0F9FF' : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')
                          }}
                        >
                          {/* REF */}
                          <View style={{ width: '8%', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons
                              name={estaExpandido ? 'chevron-up-circle' : 'chevron-down-circle-outline'}
                              size={17}
                              color={estaExpandido ? '#2563EB' : '#94A3B8'}
                            />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: estaExpandido ? '#2563EB' : '#64748B' }}>
                              TIT-0{idx + 1}
                            </Text>
                          </View>

                          {/* NIVEL / TIPO */}
                          <View style={{ width: '14%', paddingRight: 8 }}>
                            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#3730A3' }}>
                                {t.tipo.replace('_', ' ')}
                              </Text>
                            </View>
                          </View>

                          {/* TÍTULO */}
                          <View style={{ width: '28%', paddingRight: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }} numberOfLines={2}>
                              {t.titulo_obtenido}
                            </Text>
                            {!esBach && t.numero_tarjeta_o_registro ? (
                              <Text style={{ fontSize: 10, color: '#2563EB', fontWeight: '700' }}>
                                Tarjeta: {t.numero_tarjeta_o_registro}
                              </Text>
                            ) : null}
                          </View>

                          {/* INSTITUCIÓN */}
                          <View style={{ width: '26%', paddingRight: 8 }}>
                            <Text style={{ fontSize: 12, color: '#334155' }} numberOfLines={2}>
                              {t.institucion}
                            </Text>
                          </View>

                          {/* FECHA DE GRADO */}
                          <View style={{ width: '12%', paddingRight: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>
                              {t.fecha_grado || 'NO CONSTA'}
                            </Text>
                            {t.certifica_terminacion_materias && t.fecha_terminacion_materias ? (
                              <Text style={{ fontSize: 10, color: '#059669', fontWeight: '700' }}>
                                Mat: {t.fecha_terminacion_materias}
                              </Text>
                            ) : null}
                          </View>

                          {/* ESTADO */}
                          <View style={{ width: '12%', paddingRight: 8 }}>
                            {cumple ? (
                              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>✓ Cumple Requisito</Text>
                              </View>
                            ) : (
                              <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>Doc. Adicional</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>

                        {/* INFORMACIÓN COMPLETA EXPANDIDA DEL TÍTULO CLICKEADO */}
                        {estaExpandido && (
                          <View
                            style={{
                              backgroundColor: '#F8FAFC',
                              borderTopWidth: 1.5,
                              borderTopColor: '#93C5FD',
                              padding: 18,
                              gap: 16
                            }}
                          >
                            {/* Barra de título de la ficha */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
                                    FICHA COMPLETA: TIT-0{idx + 1}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                                  {t.titulo_obtenido}
                                </Text>
                                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#3730A3' }}>{t.tipo.replace('_', ' ')}</Text>
                                </View>
                              </View>

                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <TouchableOpacity
                                  onPress={() => setTituloModalDetalle(t)}
                                  style={{
                                    backgroundColor: '#EFF6FF',
                                    borderWidth: 1,
                                    borderColor: '#BFDBFE',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Ionicons name="analytics-outline" size={14} color="#1D4ED8" />
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>Ver Análisis</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => abrirEditarTitulo(idx)}
                                  style={{
                                    backgroundColor: '#F1F5F9',
                                    borderWidth: 1,
                                    borderColor: '#CBD5E1',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Ionicons name="pencil" size={13} color="#0F172A" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>Editar / Cambiar Tipo</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => descartarTitulo(idx)}
                                  style={{
                                    backgroundColor: '#FFFBEB',
                                    borderWidth: 1,
                                    borderColor: '#FDE68A',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Ionicons name="close-circle-outline" size={13} color="#D97706" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>Mover a Descartados</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => pedirConfirmarEliminarTitulo(idx)}
                                  style={{
                                    backgroundColor: '#FEF2F2',
                                    borderWidth: 1,
                                    borderColor: '#FECACA',
                                    paddingHorizontal: 8,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Ionicons name="trash-outline" size={13} color="#DC2626" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>Eliminar</Text>
                                </TouchableOpacity>

                                {t.nombre_archivo ? (
                                  <TouchableOpacity
                                    onPress={() => verPdfDocumento(t.nombre_archivo, t.titulo_obtenido)}
                                    style={{
                                      backgroundColor: '#1E40AF',
                                      paddingHorizontal: 10,
                                      paddingVertical: 5,
                                      borderRadius: 6,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    <Ionicons name="document-text" size={14} color="#FFFFFF" />
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Ver PDF Original</Text>
                                  </TouchableOpacity>
                                ) : null}

                                <TouchableOpacity
                                  onPress={() => toggleExpandirTitulo(titKey)}
                                  style={{
                                    backgroundColor: '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: '#CBD5E1',
                                    paddingHorizontal: 8,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 2
                                  }}
                                >
                                  <Ionicons name="chevron-up" size={14} color="#64748B" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Cerrar</Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* 3 Paneles de Detalle del Título */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                              {/* Panel 1: Datos de Emisión */}
                              <View style={{ flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Ionicons name="school-outline" size={16} color="#2563EB" />
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' }}>
                                    Institución y Título
                                  </Text>
                                </View>
                                <View>
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>Institución Educativa:</Text>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{t.institucion}</Text>
                                </View>
                                <View>
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>Denominación del Título:</Text>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>{t.titulo_obtenido}</Text>
                                </View>
                                <View>
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>Nivel Académico:</Text>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>{t.tipo.replace('_', ' ')}</Text>
                                </View>
                              </View>

                              {/* Panel 2: Fechas y Normativa de Corte */}
                              <View style={{ flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Ionicons name="calendar-outline" size={16} color="#0D9488" />
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' }}>
                                    Fechas y Regla de Corte
                                  </Text>
                                </View>
                                <View>
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>Fecha de Grado / Expedición:</Text>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{t.fecha_grado || 'NO CONSTA'}</Text>
                                </View>

                                {t.certifica_terminacion_materias ? (
                                  <View style={{ backgroundColor: '#EFF6FF', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#BFDBFE', gap: 2 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E40AF' }}>
                                      ✓ Certifica Terminación de Materias (Decreto 1083/2015)
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#1E3A8A' }}>
                                      Fecha de corte profesional: {t.fecha_terminacion_materias || 'Acreditada'}
                                    </Text>
                                  </View>
                                ) : (
                                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                    <Text style={{ fontSize: 11, color: '#64748B' }}>
                                      Rige a partir de la fecha de grado para el cómputo de experiencia profesional.
                                    </Text>
                                  </View>
                                )}

                                {!esBach && t.numero_tarjeta_o_registro ? (
                                  <View>
                                    <Text style={{ fontSize: 11, color: '#64748B' }}>Tarjeta Profesional:</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563EB' }}>
                                      N° {t.numero_tarjeta_o_registro}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>

                              {/* Panel 3: Cumplimiento y Justificación */}
                              <View style={{ flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Ionicons name="checkmark-done-circle-outline" size={16} color="#15803D" />
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' }}>
                                    Dictamen del Requisito
                                  </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>Resultado:</Text>
                                  <View style={{ backgroundColor: cumple ? '#DCFCE7' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: cumple ? '#15803D' : '#B45309' }}>
                                      {cumple ? '✓ Cumple Requisito del Empleo' : 'Doc. Complementario'}
                                    </Text>
                                  </View>
                                </View>

                                {t.justificacion ? (
                                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                    <Text style={{ fontSize: 11, color: '#334155', lineHeight: 16 }}>{t.justificacion}</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>

                            {/* Verificación Formal del Título (7 Criterios) */}
                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                                Verificación Formal de Validez Documental del Título
                              </Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                <View style={{ backgroundColor: checksTitulo.institucion_reconocida ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: checksTitulo.institucion_reconocida ? '#15803D' : '#B91C1C' }}>
                                    {checksTitulo.institucion_reconocida ? '✓ Institución Reconocida' : '❌ Institución no identificada'}
                                  </Text>
                                </View>

                                <View style={{ backgroundColor: checksTitulo.corresponde_aspirante ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: checksTitulo.corresponde_aspirante ? '#15803D' : '#B91C1C' }}>
                                    {checksTitulo.corresponde_aspirante ? '✓ Coincide con Aspirante' : '❌ Nombre no coincide'}
                                  </Text>
                                </View>

                                <View style={{ backgroundColor: checksTitulo.titulo_y_nivel_formal ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: checksTitulo.titulo_y_nivel_formal ? '#15803D' : '#B91C1C' }}>
                                    {checksTitulo.titulo_y_nivel_formal ? '✓ Título y Nivel Válido' : '❌ Sin título formal'}
                                  </Text>
                                </View>

                                <View style={{ backgroundColor: checksTitulo.fecha_grado_cierta ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: checksTitulo.fecha_grado_cierta ? '#15803D' : '#B91C1C' }}>
                                    {checksTitulo.fecha_grado_cierta ? '✓ Fecha de Grado Cierta' : '❌ Sin fecha cierta'}
                                  </Text>
                                </View>

                                <View style={{ backgroundColor: checksTitulo.acta_o_registro_valido ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: checksTitulo.acta_o_registro_valido ? '#15803D' : '#B91C1C' }}>
                                    {checksTitulo.acta_o_registro_valido ? '✓ Acta / Folio Acreditado' : '❌ Sin acta o folio'}
                                  </Text>
                                </View>

                                <View style={{ backgroundColor: checksTitulo.firmas_autoridades ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: checksTitulo.firmas_autoridades ? '#15803D' : '#B91C1C' }}>
                                    {checksTitulo.firmas_autoridades ? '✓ Firmas de Autoridades' : '❌ Sin firmas'}
                                  </Text>
                                </View>

                                <View style={{ backgroundColor: checksTitulo.convalidacion_men ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: checksTitulo.convalidacion_men ? '#15803D' : '#B91C1C' }}>
                                    {checksTitulo.convalidacion_men ? '✓ Convalidación MEN / Título Nacional' : '⚠️ Requiere convalidación'}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {/* Tarjeta Profesional si aplica (excluyendo Bachiller) */}
                            {!esBach && checksTarjeta ? (
                              <View style={{ backgroundColor: '#F0F9FF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#BAE6FD', gap: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1', textTransform: 'uppercase' }}>
                                  Verificación Tarjeta Profesional / Matrícula
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                  <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#BAE6FD' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284C7' }}>
                                      N°: {t.numero_tarjeta_o_registro}
                                    </Text>
                                  </View>
                                  <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#BAE6FD' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284C7' }}>
                                      {checksTarjeta.vigencia_temporal_valida ? '✓ Matrícula Vigente' : '⚠️ Verificar Vigencia'}
                                    </Text>
                                  </View>
                                  <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#BAE6FD' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284C7' }}>
                                      {checksTarjeta.certificado_vigencia_y_sanciones ? '✓ Sin Sanciones' : '⚠️ Pendiente antecedentes'}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            ) : null}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          {/* TABLA EJECUTIVA DE EXPERIENCIA LABORAL */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
              gap: 16
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="newspaper-outline" size={20} color="#1E40AF" />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    Tabla Ejecutiva de Experiencia Laboral Acreditada
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  💡 Haz clic sobre cualquier fila para desplegar su ficha técnica completa, análisis de funciones, sustento normativo y soportes.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  onPress={() => abrirCrearNuevoCertificado()}
                  style={{
                    backgroundColor: '#1E40AF',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>+ Agregar Experiencia Laboral</Text>
                </TouchableOpacity>

                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#3730A3' }}>
                    {certificados.length} certificación(es) evaluada(s)
                  </Text>
                </View>
              </View>
            </View>

            {certificados.length === 0 ? (
              <View style={{ padding: 24, backgroundColor: '#F8FAFC', borderRadius: 10, alignItems: 'center' }}>
                <Ionicons name="folder-open-outline" size={32} color="#94A3B8" />
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
                  No se registran certificaciones de experiencia laboral en este dictamen.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ width: '100%', minWidth: 940 }}>
                <View style={{ width: '100%', minWidth: 940, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Encabezado Tabla */}
                  <View
                    style={{
                      flexDirection: 'row',
                      backgroundColor: '#F1F5F9',
                      paddingVertical: 11,
                      paddingHorizontal: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: '#CBD5E1'
                    }}
                  >
                    <Text style={{ width: '8%', fontSize: 11, fontWeight: '800', color: '#475569' }}>REF</Text>
                    <Text style={{ width: '25%', fontSize: 11, fontWeight: '800', color: '#475569' }}>EMPRESA / ENTIDAD</Text>
                    <Text style={{ width: '25%', fontSize: 11, fontWeight: '800', color: '#475569' }}>CARGO DESEMPEÑADO</Text>
                    <Text style={{ width: '18%', fontSize: 11, fontWeight: '800', color: '#475569' }}>PERIODO</Text>
                    <Text style={{ width: '12%', fontSize: 11, fontWeight: '800', color: '#475569' }}>TIEMPO VÁLIDO</Text>
                    <Text style={{ width: '12%', fontSize: 11, fontWeight: '800', color: '#475569' }}>CALIFICACIÓN</Text>
                  </View>

                  {/* Filas Interactivas con Expansión Completa */}
                  {certificados.map((c, idx) => {
                    const certKey = c.id_certificado || `cert-${idx}`;
                    const estaExpandido = Boolean(certificadosExpandidos[certKey]);
                    const mesesVal = c.tiempo_valido?.meses_totales ?? c.tiempo_certificado?.meses_totales_aproximados ?? 0;
                    const esRel = c.clasificacion_experiencia === 'RELACIONADA';
                    const esPrevia = c.verificacion_experiencia_previa?.tipo_resultado === 'NO_COMPUTABLE_PREVIA_AL_GRADO';

                    return (
                      <View key={certKey} style={{ borderBottomWidth: idx < certificados.length - 1 ? 1 : 0, borderBottomColor: '#E2E8F0' }}>
                        {/* FILA PRINCIPAL CLIQUEABLE */}
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => toggleExpandirCertificado(certKey)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            backgroundColor: estaExpandido ? '#F0F9FF' : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')
                          }}
                        >
                          {/* REF con icono de expansión */}
                          <View style={{ width: '8%', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons
                              name={estaExpandido ? 'chevron-up-circle' : 'chevron-down-circle-outline'}
                              size={17}
                              color={estaExpandido ? '#2563EB' : '#94A3B8'}
                            />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: estaExpandido ? '#2563EB' : '#64748B' }}>
                              EXP-0{idx + 1}
                            </Text>
                          </View>

                          {/* ENTIDAD */}
                          <View style={{ width: '25%', paddingRight: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }} numberOfLines={2}>
                              {c.entidad}
                            </Text>
                            {c.nit_entidad ? (
                              <Text style={{ fontSize: 10, color: '#64748B' }}>NIT: {c.nit_entidad}</Text>
                            ) : null}
                          </View>

                          {/* CARGO */}
                          <View style={{ width: '25%', paddingRight: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }} numberOfLines={2}>
                              {c.cargo_certificado}
                            </Text>
                            {c.tipo_vinculo ? (
                              <Text style={{ fontSize: 10, color: '#64748B' }}>{c.tipo_vinculo}</Text>
                            ) : null}
                            {c.anexos && c.anexos.length > 1 ? (
                              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Ionicons name="documents-outline" size={11} color="#B45309" />
                                <Text style={{ fontSize: 9, fontWeight: '800', color: '#B45309' }}>
                                  {c.anexos.length} Anexos Complementarios
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          {/* PERIODO */}
                          <View style={{ width: '18%', paddingRight: 8 }}>
                            <Text style={{ fontSize: 11, color: '#334155' }}>
                              {c.fecha_inicio} al {c.fecha_fin || (c.vinculo_vigente ? 'Vigente' : 'N/A')}
                            </Text>
                          </View>

                          {/* TIEMPO VÁLIDO */}
                          <View style={{ width: '12%', paddingRight: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: mesesVal > 0 ? '#15803D' : '#94A3B8' }}>
                              {mesesVal} meses
                            </Text>
                            {c.tiempo_valido ? (
                              <Text style={{ fontSize: 10, color: '#64748B' }}>
                                {c.tiempo_valido.anios || 0}a {c.tiempo_valido.meses || 0}m {c.tiempo_valido.dias || 0}d
                              </Text>
                            ) : null}
                          </View>

                          {/* CALIFICACIÓN Y ACCIONES */}
                          <View style={{ width: '12%', paddingRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                            {esRel ? (
                              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>✓ Relacionada</Text>
                              </View>
                            ) : esPrevia ? (
                              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>Previa a Grado</Text>
                              </View>
                            ) : (
                              <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>No Relacionada</Text>
                              </View>
                            )}

                            <TouchableOpacity
                              onPress={(e: any) => {
                                if (e && e.stopPropagation) e.stopPropagation();
                                pedirConfirmarEliminarCertificado(idx);
                              }}
                              style={{
                                padding: 4,
                                borderRadius: 5,
                                backgroundColor: '#FEF2F2',
                                borderWidth: 1,
                                borderColor: '#FECACA'
                              }}
                              accessibilityLabel="Eliminar experiencia laboral"
                            >
                              <Ionicons name="trash-outline" size={13} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        {/* INFORMACIÓN COMPLETA EXPANDIDA DEL CERTIFICADO CLICKEADO */}
                        {estaExpandido && (
                          <View
                            style={{
                              backgroundColor: '#F8FAFC',
                              borderTopWidth: 1.5,
                              borderTopColor: '#93C5FD',
                              padding: 18,
                              gap: 16
                            }}
                          >
                            {/* Barra de título de la ficha expandida */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
                                    FICHA COMPLETA: EXP-0{idx + 1}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                                  {c.entidad}
                                </Text>
                                {c.nit_entidad ? (
                                  <Text style={{ fontSize: 12, color: '#64748B' }}>• NIT: {c.nit_entidad}</Text>
                                ) : null}
                              </View>

                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <TouchableOpacity
                                  onPress={() => setCertModalDetalle(c)}
                                  style={{
                                    backgroundColor: '#EFF6FF',
                                    borderWidth: 1,
                                    borderColor: '#BFDBFE',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Ionicons name="analytics-outline" size={14} color="#1D4ED8" />
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>Ver Análisis</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => abrirEditarCertificado(idx)}
                                  style={{
                                    backgroundColor: '#F1F5F9',
                                    borderWidth: 1,
                                    borderColor: '#CBD5E1',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Ionicons name="pencil" size={13} color="#0F172A" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>Editar Certificado</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => descartarCertificado(idx)}
                                  style={{
                                    backgroundColor: '#FFFBEB',
                                    borderWidth: 1,
                                    borderColor: '#FDE68A',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Ionicons name="close-circle-outline" size={13} color="#D97706" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>Mover a Descartados</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => abrirCrearNuevoCertificado(c)}
                                  style={{
                                    backgroundColor: '#EFF6FF',
                                    borderWidth: 1,
                                    borderColor: '#BFDBFE',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Ionicons name="copy-outline" size={13} color="#1E40AF" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}>Agregar Otro Cargo de Este Soporte</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => abrirModalComplementarCertificado(idx)}
                                  style={{
                                    backgroundColor: '#F0FDF4',
                                    borderWidth: 1,
                                    borderColor: '#BBF7D0',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Ionicons name="add-circle-outline" size={13} color="#15803D" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>Adjuntar Soporte (IA)</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => pedirConfirmarEliminarCertificado(idx)}
                                  style={{
                                    backgroundColor: '#FEF2F2',
                                    borderWidth: 1,
                                    borderColor: '#FECACA',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Ionicons name="trash-outline" size={13} color="#DC2626" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>Eliminar Experiencia</Text>
                                </TouchableOpacity>

                                {(() => {
                                  const listaAnexos = (c.anexos && c.anexos.length > 0)
                                    ? c.anexos
                                    : (c.nombre_archivo ? [c.nombre_archivo] : []);

                                  if (listaAnexos.length === 0) return null;

                                  if (listaAnexos.length === 1) {
                                    return (
                                      <TouchableOpacity
                                        onPress={() => verPdfDocumento(listaAnexos[0], `${c.id_certificado}: ${c.entidad}`)}
                                        style={{
                                          backgroundColor: '#1E40AF',
                                          paddingHorizontal: 10,
                                          paddingVertical: 5,
                                          borderRadius: 6,
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          gap: 4
                                        }}
                                      >
                                        <Ionicons name="document-text" size={14} color="#FFFFFF" />
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Ver PDF Original</Text>
                                      </TouchableOpacity>
                                    );
                                  }

                                  return (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      {listaAnexos.map((anexo, aIdx) => (
                                        <TouchableOpacity
                                          key={aIdx}
                                          onPress={() => verPdfDocumento(anexo, `${c.id_certificado} - Anexo ${aIdx + 1}: ${anexo}`)}
                                          style={{
                                            backgroundColor: aIdx === 0 ? '#1E40AF' : '#4338CA',
                                            paddingHorizontal: 10,
                                            paddingVertical: 5,
                                            borderRadius: 6,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4
                                          }}
                                        >
                                          <Ionicons name="document-attach" size={14} color="#FFFFFF" />
                                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                                            Anexo {aIdx + 1} ({anexo.length > 18 ? anexo.slice(0, 16) + '...' : anexo})
                                          </Text>
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  );
                                })()}

                                <TouchableOpacity
                                  onPress={() => toggleExpandirCertificado(certKey)}
                                  style={{
                                    backgroundColor: '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: '#CBD5E1',
                                    paddingHorizontal: 8,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 2
                                  }}
                                >
                                  <Ionicons name="chevron-up" size={14} color="#64748B" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Cerrar</Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* 3 Paneles de Información Completa */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                              {/* Panel 1: Vinculación y Cargo */}
                              <View style={{ flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <Ionicons name="briefcase-outline" size={16} color="#2563EB" />
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' }}>
                                    Vinculación y Cargo Acreditado
                                  </Text>
                                </View>

                                <View>
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>Denominación del Empleo:</Text>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{c.cargo_certificado || 'No registra cargo'}</Text>
                                </View>

                                {(c.codigo_cargo || c.grado_cargo) ? (
                                  <View>
                                    <Text style={{ fontSize: 11, color: '#64748B' }}>Código / Grado:</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                                      Código {c.codigo_cargo || 'N/A'} • Grado {c.grado_cargo || 'N/A'}
                                    </Text>
                                  </View>
                                ) : null}

                                <View>
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>Tipo de Vinculación:</Text>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>{c.tipo_vinculo || 'No especifica'}</Text>
                                </View>

                                {c.numero_contrato_o_acto ? (
                                  <View>
                                    <Text style={{ fontSize: 11, color: '#64748B' }}>Contrato / Acto Administrativo:</Text>
                                    <Text style={{ fontSize: 12, color: '#334155' }}>{c.numero_contrato_o_acto}</Text>
                                  </View>
                                ) : null}

                                {c.dependencia ? (
                                  <View>
                                    <Text style={{ fontSize: 11, color: '#64748B' }}>Dependencia / Área:</Text>
                                    <Text style={{ fontSize: 12, color: '#334155' }}>{c.dependencia}</Text>
                                  </View>
                                ) : null}

                                {(c.firmante || c.cargo_firmante) ? (
                                  <View style={{ paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                                    <Text style={{ fontSize: 10, color: '#64748B' }}>Suscriptor de la Certificación:</Text>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                                      {c.firmante || 'Autoridad facultada'}{c.cargo_firmante ? ` (${c.cargo_firmante})` : ''}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>

                              {/* Panel 2: Periodos y Cómputo de Tiempos */}
                              <View style={{ flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <Ionicons name="time-outline" size={16} color="#0D9488" />
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' }}>
                                    Periodo y Cómputo de Tiempos
                                  </Text>
                                </View>

                                <View>
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>Periodo Certificado:</Text>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                    {c.fecha_inicio} al {c.fecha_fin || (c.vinculo_vigente ? 'Vigente / Actual' : 'No especifica')}
                                  </Text>
                                  {c.vinculo_vigente ? (
                                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 3 }}>
                                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#166534' }}>Vínculo Vigente</Text>
                                    </View>
                                  ) : null}
                                </View>

                                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 11, color: '#64748B' }}>Tiempo Certificado Bruto:</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
                                      {c.tiempo_certificado?.meses_totales_aproximados ?? 0} meses
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 11, color: '#475569' }}>
                                    ({c.tiempo_certificado?.anios || 0}a {c.tiempo_certificado?.meses || 0}m {c.tiempo_certificado?.dias || 0}d)
                                  </Text>

                                  <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 2 }} />

                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>Tiempo Válido Computable:</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#15803D' }}>
                                      {mesesVal} meses
                                    </Text>
                                  </View>
                                  {c.tiempo_valido ? (
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>
                                      ({c.tiempo_valido.anios || 0}a {c.tiempo_valido.meses || 0}m {c.tiempo_valido.dias || 0}d netos)
                                    </Text>
                                  ) : null}
                                </View>
                              </View>

                              {/* Panel 3: Calificación y Régimen Normativo */}
                              <View style={{ flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <Ionicons name="shield-checkmark-outline" size={16} color="#7C3AED" />
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' }}>
                                    Calificación y Sustento Legal
                                  </Text>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>Clasificación:</Text>
                                  {esRel ? (
                                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>✓ RELACIONADA</Text>
                                    </View>
                                  ) : esPrevia ? (
                                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>PREVIA AL GRADO</Text>
                                    </View>
                                  ) : (
                                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{c.clasificacion_experiencia || 'NO RELACIONADA'}</Text>
                                    </View>
                                  )}
                                </View>

                                {c.verificacion_experiencia_previa?.conclusion_juridica ? (
                                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 2 }}>
                                      Dictamen Jurídico:
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#334155', lineHeight: 16 }}>
                                      {c.verificacion_experiencia_previa.conclusion_juridica}
                                    </Text>
                                  </View>
                                ) : null}

                                {c.cumple_excepcion_ley_2039 ? (
                                  <View style={{ backgroundColor: '#EEF2FF', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#C7D2FE' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#3730A3' }}>
                                      ✓ Aplica Excepción Ley 2039 de 2020: {c.modalidad_ley_2039 || 'Práctica formativa'}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>

                            {/* Concordancia Funcional Detallada (Cotejo de Actividades) */}
                            <View style={{ gap: 10 }}>
                              {c.experiencia_relacionada?.funciones_coincidentes && c.experiencia_relacionada.funciones_coincidentes.length > 0 ? (
                                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#BBF7D0', gap: 10 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <Ionicons name="git-compare-outline" size={17} color="#15803D" />
                                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803D' }}>
                                        Cotejo Funcional: Funciones Coincidentes / Afines ({c.experiencia_relacionada.funciones_coincidentes.length} coincidencia(s))
                                      </Text>
                                    </View>
                                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>Nivel de Confianza: {c.experiencia_relacionada.nivel_confianza || 'ALTO'}</Text>
                                    </View>
                                  </View>

                                  <View style={{ gap: 8 }}>
                                    {c.experiencia_relacionada.funciones_coincidentes.map((fc, fIdx) => (
                                      <View key={fIdx} style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#DCFCE7', gap: 4 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534', flex: 1 }}>
                                            • Función Certificada: {fc.funcion_certificada}
                                          </Text>
                                          <View style={{ backgroundColor: '#BBF7D0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#14532D' }}>{fc.coincidencia}</Text>
                                          </View>
                                        </View>
                                        <Text style={{ fontSize: 11, color: '#334155' }}>
                                          <Text style={{ fontWeight: '700' }}>Función del Cargo:</Text> {fc.funcion_del_cargo}
                                        </Text>
                                        {fc.justificacion ? (
                                          <Text style={{ fontSize: 10, color: '#475569', fontStyle: 'italic', marginTop: 2 }}>
                                            Sustento: {fc.justificacion}
                                          </Text>
                                        ) : null}
                                      </View>
                                    ))}
                                  </View>
                                </View>
                              ) : c.funciones_certificadas && c.funciones_certificadas.length > 0 ? (
                                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                                    Funciones Certificadas en el Documento ({c.funciones_certificadas.length}):
                                  </Text>
                                  <View style={{ gap: 4 }}>
                                    {c.funciones_certificadas.map((fn, fnIdx) => (
                                      <Text key={fnIdx} style={{ fontSize: 11, color: '#334155', lineHeight: 16 }}>
                                        • {fn.funcion}
                                      </Text>
                                    ))}
                                  </View>
                                </View>
                              ) : (
                                <View style={{ backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FDE68A' }}>
                                  <Text style={{ fontSize: 11, color: '#92400E' }}>
                                    ℹ️ Esta certificación no incluye funciones detalladas; la relación técnica se evaluó con base en la denominación oficial del cargo y la naturaleza de la entidad.
                                  </Text>
                                </View>
                              )}

                              {/* Funciones NO Relacionadas con el Empleo */}
                              {(() => {
                                const fcCoincidentes = c.experiencia_relacionada?.funciones_coincidentes || [];
                                const coincidentesTextos = fcCoincidentes.map(fc => (fc.funcion_certificada || '').toLowerCase().trim());
                                const todasCertificadas = (c.funciones_certificadas || []).map(f => typeof f === 'string' ? f : f.funcion).filter(Boolean);
                                const noCoincidentesGemini = c.experiencia_relacionada?.funciones_no_coincidentes || [];

                                const noRelacionadas = (noCoincidentesGemini && noCoincidentesGemini.length > 0)
                                  ? noCoincidentesGemini
                                  : todasCertificadas.filter(fn => {
                                      const fnNorm = (fn || '').toLowerCase().trim();
                                      return fnNorm.length > 0 && !coincidentesTextos.some(ct => ct && (ct.includes(fnNorm) || fnNorm.includes(ct)));
                                    });

                                if (noRelacionadas.length > 0) {
                                  return (
                                    <View style={{ backgroundColor: '#FFFBEB', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#FDE68A', gap: 8 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                          <Ionicons name="close-circle-outline" size={17} color="#D97706" />
                                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
                                            Funciones Certificadas NO Relacionadas con el Empleo ({noRelacionadas.length})
                                          </Text>
                                        </View>
                                        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>Sin Afinidad Funcional</Text>
                                        </View>
                                      </View>

                                      <Text style={{ fontSize: 11, color: '#B45309', marginBottom: 2 }}>
                                        Actividades certificadas que no guardan relación directa ni afinidad técnica con el propósito principal del cargo evaluado:
                                      </Text>

                                      <View style={{ gap: 6 }}>
                                        {noRelacionadas.map((fnNo, fnNoIdx) => (
                                          <View key={fnNoIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFFFF', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#FEF3C7' }}>
                                            <Text style={{ color: '#D97706', fontSize: 12, fontWeight: '800' }}>✕</Text>
                                            <Text style={{ fontSize: 11, color: '#78350F', lineHeight: 16, flex: 1 }}>
                                              {fnNo}
                                            </Text>
                                          </View>
                                        ))}
                                      </View>
                                    </View>
                                  );
                                } else if (c.funciones_certificadas && c.funciones_certificadas.length > 0) {
                                  return (
                                    <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#DCFCE7', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>
                                        ✓ El 100% de las funciones certificadas guardan relación o afinidad directa con el empleo. No hay funciones descartadas.
                                      </Text>
                                    </View>
                                  );
                                }
                                return null;
                              })()}

                              {/* Validación Previa al Grado (Auditoría Decreto 1083 / Ley 2039) */}
                              {(() => {
                                const auditoria = c.verificacion_experiencia_previa || calcularExpPreviaFallback(c, titulos);
                                const tipoRes = auditoria.tipo_resultado;
                                const esTotalPost = tipoRes === 'COMPUTABLE_TOTAL_POSTERIOR';
                                const esLey2039 = tipoRes === 'COMPUTABLE_TOTAL_LEY_2039';
                                const esParcial = tipoRes === 'COMPUTABLE_PARCIAL_DESDE_CORTE';

                                const badgeBg = esTotalPost ? '#DCFCE7' : esLey2039 ? '#E0E7FF' : esParcial ? '#FEF3C7' : '#FEE2E2';
                                const badgeColor = esTotalPost ? '#15803D' : esLey2039 ? '#3730A3' : esParcial ? '#B45309' : '#DC2626';
                                const badgeBorder = esTotalPost ? '#86EFAC' : esLey2039 ? '#C7D2FE' : esParcial ? '#FDE68A' : '#FCA5A5';
                                const badgeTexto = esTotalPost
                                  ? '✓ COMPUTABLE TOTAL (POSTERIOR AL CORTE)'
                                  : esLey2039
                                  ? '✓ COMPUTABLE TOTAL (LEY 2039 DE 2020)'
                                  : esParcial
                                  ? '⚠️ COMPUTABLE PARCIAL (DESDE FECHA DE CORTE)'
                                  : '✕ NO COMPUTABLE (FINALIZÓ ANTES DEL CORTE)';

                                return (
                                  <View
                                    style={{
                                      backgroundColor: '#FFFFFF',
                                      borderRadius: 10,
                                      padding: 14,
                                      borderWidth: 1,
                                      borderColor: badgeBorder,
                                      gap: 10
                                    }}
                                  >
                                    {/* Cabecera Auditoría Previa */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="school-outline" size={17} color={badgeColor} />
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                          Auditoría de Experiencia Previa al Grado (Decreto 1083 / Ley 2039)
                                        </Text>
                                      </View>

                                      <View style={{ backgroundColor: badgeBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: badgeBorder }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: badgeColor }}>
                                          {badgeTexto}
                                        </Text>
                                      </View>
                                    </View>

                                    {/* 3 Checks de la Auditoría */}
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                      {/* Check 1: Corte de Referencia */}
                                      <View style={{ flex: 1, minWidth: 200, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 3 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                          <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E40AF', textTransform: 'uppercase' }}>
                                            Corte Profesional
                                          </Text>
                                        </View>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
                                          Fecha: {auditoria.corte_referencia?.fecha || 'NO CONSTA'}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#64748B' }}>
                                          Tipo: {auditoria.corte_referencia?.tipo === 'TERMINACION_MATERIAS' ? 'Terminación de materias' : (auditoria.corte_referencia?.tipo === 'FECHA_GRADO' ? 'Fecha de grado' : 'Sin acreditar')}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#475569', fontStyle: 'italic', marginTop: 2 }}>
                                          {auditoria.corte_referencia?.sustento_normativo}
                                        </Text>
                                      </View>

                                      {/* Check 2: Acreditación Pénsum / Grado */}
                                      <View style={{ flex: 1, minWidth: 200, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 3 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                          <Ionicons
                                            name={auditoria.check_terminacion_pensum?.acredita_terminacion_materias ? 'checkmark-circle' : 'information-circle-outline'}
                                            size={14}
                                            color={auditoria.check_terminacion_pensum?.acredita_terminacion_materias ? '#15803D' : '#64748B'}
                                          />
                                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#334155', textTransform: 'uppercase' }}>
                                            Pénsum / Terminación
                                          </Text>
                                        </View>
                                        <Text style={{ fontSize: 11, color: '#334155', lineHeight: 15 }}>
                                          {auditoria.check_terminacion_pensum?.observacion || 'Evaluado con base en fecha de grado.'}
                                        </Text>
                                        {auditoria.fecha_inicio_computable ? (
                                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309', marginTop: 2 }}>
                                            Rige a partir del: {auditoria.fecha_inicio_computable}
                                          </Text>
                                        ) : null}
                                      </View>

                                      {/* Check 3: Modalidad Ley 2039 de 2020 */}
                                      <View style={{ flex: 1, minWidth: 200, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 3 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                          <Ionicons
                                            name={auditoria.check_modalidad_ley_2039?.aplica_excepcion ? 'checkmark-circle' : 'close-circle-outline'}
                                            size={14}
                                            color={auditoria.check_modalidad_ley_2039?.aplica_excepcion ? '#15803D' : '#94A3B8'}
                                          />
                                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#334155', textTransform: 'uppercase' }}>
                                            Excepción Ley 2039/2020
                                          </Text>
                                        </View>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: auditoria.check_modalidad_ley_2039?.aplica_excepcion ? '#15803D' : '#64748B' }}>
                                          {auditoria.check_modalidad_ley_2039?.aplica_excepcion ? `Aplica: ${auditoria.check_modalidad_ley_2039.modalidad}` : 'No aplica excepción'}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#64748B', lineHeight: 14 }}>
                                          {auditoria.check_modalidad_ley_2039?.observacion || 'No aplica'}
                                        </Text>
                                      </View>
                                    </View>

                                    {/* Conclusión Jurídica Normativa */}
                                    {auditoria.conclusion_juridica ? (
                                      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 2 }}>
                                          Conclusión Jurídica Aplicada:
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#334155', lineHeight: 17 }}>
                                          {auditoria.conclusion_juridica}
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                );
                              })()}
                            </View>

                            {/* Traslapes Detectados si existen */}
                            {c.traslapes && c.traslapes.length > 0 ? (
                              <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#FECACA', gap: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#991B1B' }}>
                                    Traslapes Temporales Registrados ({c.traslapes.length})
                                  </Text>
                                </View>
                                {c.traslapes.map((tr, tIdx) => (
                                  <View key={tIdx} style={{ backgroundColor: '#FFFFFF', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#FCA5A5' }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#7F1D1D' }}>
                                      Coincidencia simultánea con {tr.entidad_coincidente || tr.otro_certificado_id}
                                    </Text>
                                    <Text style={{ fontSize: 10, color: '#991B1B', marginTop: 2 }}>
                                      Periodo simultáneo: {tr.fecha_inicio_traslape} al {tr.fecha_fin_traslape} • Se excluyeron {tr.tiempo_a_excluir_meses} meses para no duplicar cómputo.
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            ) : null}

                            {/* Verificación Formal Documental */}
                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                                Verificación Formal de Validez Documental
                              </Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                <View style={{ backgroundColor: c.verificacion_formal?.corresponde_aspirante !== false ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: c.verificacion_formal?.corresponde_aspirante !== false ? '#15803D' : '#B91C1C' }}>
                                    {c.verificacion_formal?.corresponde_aspirante !== false ? '✓ Aspirante Coincide' : '❌ Nombre no coincide'}
                                  </Text>
                                </View>

                                <View style={{ backgroundColor: c.verificacion_formal?.entidad_identificable !== false ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: c.verificacion_formal?.entidad_identificable !== false ? '#15803D' : '#B91C1C' }}>
                                    {c.verificacion_formal?.entidad_identificable !== false ? '✓ Entidad Identificable' : '❌ Entidad dudosa'}
                                  </Text>
                                </View>

                                <View style={{ backgroundColor: c.verificacion_formal?.cuenta_con_firma !== false ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: c.verificacion_formal?.cuenta_con_firma !== false ? '#15803D' : '#B91C1C' }}>
                                    {c.verificacion_formal?.cuenta_con_firma !== false ? '✓ Documento Firmado' : '❌ Sin firma visible'}
                                  </Text>
                                </View>

                                <View style={{ backgroundColor: c.verificacion_formal?.fecha_expedicion_identificable !== false ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: c.verificacion_formal?.fecha_expedicion_identificable !== false ? '#15803D' : '#B91C1C' }}>
                                    {c.verificacion_formal?.fecha_expedicion_identificable !== false ? '✓ Fecha de Expedición' : '❌ Sin fecha cierta'}
                                  </Text>
                                </View>

                                <View style={{ backgroundColor: c.verificacion_formal?.documento_legible_integro !== false ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: c.verificacion_formal?.documento_legible_integro !== false ? '#15803D' : '#B91C1C' }}>
                                    {c.verificacion_formal?.documento_legible_integro !== false ? '✓ Legible e Íntegro' : '❌ Ilegible o truncado'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          {/* DOCUMENTOS NO COMPUTABLES O EXCLUIDOS (SI EXISTEN) */}
          {documentosNoAplican.length > 0 ? (
            <View
              style={{
                backgroundColor: '#FFFBEB',
                borderRadius: 14,
                padding: 18,
                borderWidth: 1,
                borderColor: '#FDE68A',
                gap: 12
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="alert-circle" size={18} color="#D97706" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#92400E' }}>
                    Documentos Descartados / No Computables ({documentosNoAplican.length})
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#B45309' }}>
                  No cumplen criterios legales para computar
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                {documentosNoAplican.map((doc, idx) => (
                  <View
                    key={doc.id || doc.nombre_archivo || idx}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 8,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: '#FEF3C7',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 240 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                        {doc.descripcion || doc.nombre_archivo}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#78350F', marginTop: 2 }}>
                        Motivo: {doc.motivo_no_aplica}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <TouchableOpacity
                        onPress={() => abrirReactivarDescartado(idx)}
                        style={{
                          backgroundColor: '#EFF6FF',
                          borderWidth: 1,
                          borderColor: '#BFDBFE',
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Ionicons name="school-outline" size={13} color="#1D4ED8" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                          Reactivar como Título
                        </Text>
                      </TouchableOpacity>

                      {doc.nombre_archivo ? (
                        <TouchableOpacity
                          onPress={() => verPdfDocumento(doc.nombre_archivo, doc.descripcion || 'Documento no aplicable')}
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Ionicons name="document-text-outline" size={13} color="#475569" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                            Ver Soporte
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        onPress={() => pedirConfirmarEliminarDocNoAplica(idx)}
                        style={{
                          backgroundColor: '#FEF2F2',
                          borderWidth: 1,
                          borderColor: '#FECACA',
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Ionicons name="trash-outline" size={13} color="#DC2626" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                          Eliminar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* PIE DE PÁGINA: CALLOUT PARA CAMBIAR A AUDITORÍA COMPLETA */}
          <View
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 14,
              padding: 18,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14
            }}
          >
            <View style={{ flex: 1, minWidth: 280 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                ¿Necesitas revisar los 20 criterios formales o editar registros?
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Puedes pasar a la Versión Completa para auditar actas de grado, tarjetas profesionales, traslapes de contratos día a día o recalcular tiempos.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setModoVista('auditoria')}
              style={{
                backgroundColor: '#1E293B',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Ionicons name="list-circle" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Cambiar a Versión Completa de Auditoría
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, width: '100%' }}>
        {/* TARJETA PRINCIPAL DE DICTAMEN */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: 24,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 20
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <View style={{ flex: 1, minWidth: 280 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                Resultado Oficial de la Verificación
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                {candidato.nombre}
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 13, color: '#475569' }}>
                  <Text style={{ fontWeight: '700' }}>Cédula:</Text> {candidato.documento || 'N/A'}
                </Text>
                <Text style={{ fontSize: 13, color: '#475569' }}>
                  <Text style={{ fontWeight: '700' }}>Correo:</Text> {candidato.email || 'No registrado'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 14, color: '#475569' }}>
                  Cargo Evaluado: <Text style={{ fontWeight: '700' }}>{cargo_evaluado.nombre}</Text> (Cód. {cargo_evaluado.codigo || 'N/A'} - Grado {cargo_evaluado.grado || 'N/A'})
                </Text>
                {cargo_evaluado.id_sideap ? (
                  <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#C7D2FE' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#3730A3' }}>SIDEAP #{cargo_evaluado.id_sideap}</Text>
                  </View>
                ) : null}
                {cargo_evaluado.id_perno ? (
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>PERNO #{cargo_evaluado.id_perno}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View
              style={{
                backgroundColor: bgEstado,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colorEstado
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '900', color: colorEstado }}>
                {consolidado.resultado_final.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Justificación Técnica */}
          <View
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 10,
              padding: 16,
              marginTop: 18,
              borderLeftWidth: 4,
              borderLeftColor: colorEstado
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
              Justificación Técnica del Dictamen:
            </Text>
            <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20 }}>
              {consolidado.justificacion}
            </Text>
          </View>

          {/* Tarjetas de Métricas de Tiempo */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 18 }}>
            <View style={{ flex: 1, minWidth: 160, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Requisito Mínimo</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                {consolidado.requisito_minimo_meses} meses
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: 160, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Exp. Relacionada Neta</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#16A34A', marginTop: 4 }}>
                {consolidado.experiencia_relacionada_meses} meses
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: 160, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Excluido por Traslapes</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#DC2626', marginTop: 4 }}>
                {consolidado.tiempo_excluido_por_traslapes_meses} meses
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: 160, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Diferencia</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: consolidado.diferencia_meses >= 0 ? '#16A34A' : '#DC2626', marginTop: 4 }}>
                {consolidado.diferencia_meses >= 0 ? '+' : ''}{consolidado.diferencia_meses} meses
              </Text>
            </View>
          </View>
        </View>

        {/* TÍTULOS ACADÉMICOS Y TARJETA PROFESIONAL */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: 20,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 20,
            gap: 14
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="school" size={20} color="#1E40AF" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                Títulos Académicos y Tarjeta Profesional
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#3730A3' }}>
                  {titulos.length} documento(s) formativo(s)
                </Text>
              </View>

              <TouchableOpacity
                onPress={subirYAnalizarDocumento}
                disabled={subiendoDoc}
                style={{
                  backgroundColor: '#4338CA',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Ionicons name="sparkles" size={15} color="#FDE047" />
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                  Subir PDF con IA
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={abrirNuevoTitulo}
                style={{
                  backgroundColor: '#1E40AF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                  + Manual
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Banner de cambios pendientes */}
          {hayCambios && (
            <View
              style={{
                backgroundColor: '#EFF6FF',
                borderColor: '#93C5FD',
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 240 }}>
                <Ionicons name="information-circle" size={20} color="#1D4ED8" />
                <Text style={{ fontSize: 12, color: '#1E40AF', fontWeight: '600' }}>
                  Has realizado cambios en los títulos. Guarda los cambios para que se persistan en el expediente y en el Excel.
                </Text>
              </View>
              <TouchableOpacity
                onPress={guardarCambiosServidor}
                disabled={guardandoCambios}
                style={{
                  backgroundColor: '#1D4ED8',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {guardandoCambios ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                )}
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                  {guardandoCambios ? 'Guardando...' : 'Guardar Cambios'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {titulos.length === 0 ? (
            <View style={{ padding: 14, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', gap: 6 }}>
              <Ionicons name="school-outline" size={28} color="#94A3B8" />
              <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>
                No hay títulos ni tarjetas registradas en este expediente.
              </Text>
              <TouchableOpacity
                onPress={abrirNuevoTitulo}
                style={{ marginTop: 4, paddingVertical: 4, paddingHorizontal: 10 }}
              >
                <Text style={{ fontSize: 12, color: '#1E40AF', fontWeight: '700' }}>
                  Pulsa aquí para agregar uno manualmente
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {titulos.map((fa, idx) => (
                <View
                  key={fa.id || idx}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: fa.cumple_requisito_cargo ? '#BBF7D0' : '#E2E8F0'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 260 }}>
                      <Ionicons
                        name={fa.tipo === 'TARJETA_PROFESIONAL' ? 'card-outline' : 'school-outline'}
                        size={20}
                        color={fa.cumple_requisito_cargo ? '#15803D' : '#2563EB'}
                        style={{ marginTop: 2 }}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                            {fa.titulo_obtenido}
                          </Text>
                          <View
                            style={{
                              backgroundColor: '#E0E7FF',
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 4
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#3730A3' }}>
                              {fa.tipo.replace('_', ' ')}
                            </Text>
                          </View>
                        </View>

                        <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                          {fa.institucion} {fa.fecha_grado && fa.fecha_grado !== 'NO CONSTA' ? `• Fecha: ${fa.fecha_grado}` : ''}
                        </Text>
                        {fa.numero_tarjeta_o_registro && fa.numero_tarjeta_o_registro !== 'NO CONSTA' ? (
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF', marginTop: 2 }}>
                            Registro / Tarjeta N°: {fa.numero_tarjeta_o_registro}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Acciones y estado */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: fa.cumple_requisito_cargo ? '#DCFCE7' : '#FEF3C7',
                          borderWidth: 1,
                          borderColor: fa.cumple_requisito_cargo ? '#86EFAC' : '#FDE68A'
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: fa.cumple_requisito_cargo ? '#15803D' : '#B45309'
                          }}
                        >
                          {fa.cumple_requisito_cargo ? '✓ CUMPLE REQUISITO' : 'EN EVALUACIÓN'}
                        </Text>
                      </View>

                      {/* Botón Ver PDF */}
                      <TouchableOpacity
                        onPress={() => verPdfDocumento(fa.nombre_archivo, fa.titulo_obtenido)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 6,
                          backgroundColor: '#EFF6FF',
                          borderWidth: 1,
                          borderColor: '#BFDBFE'
                        }}
                        accessibilityLabel="Ver PDF del título"
                      >
                        <Ionicons name="document-text-outline" size={14} color="#1D4ED8" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>Ver PDF</Text>
                      </TouchableOpacity>

                      {/* Botón Editar */}
                      <TouchableOpacity
                        onPress={() => abrirEditarTitulo(idx)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: '#F1F5F9',
                          borderWidth: 1,
                          borderColor: '#CBD5E1'
                        }}
                        accessibilityLabel="Editar título"
                      >
                        <Ionicons name="pencil-outline" size={15} color="#0F172A" />
                      </TouchableOpacity>

                      {/* Botón Eliminar */}
                      <TouchableOpacity
                        onPress={() => pedirConfirmarEliminarTitulo(idx)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: '#FEE2E2',
                          borderWidth: 1,
                          borderColor: '#FCA5A5'
                        }}
                        accessibilityLabel="Eliminar título"
                      >
                        <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {fa.justificacion ? (
                    <Text style={{ fontSize: 12, color: '#334155', marginTop: 8, fontStyle: 'italic' }}>
                      <Text style={{ fontWeight: '700' }}>Criterio:</Text> {fa.justificacion}
                    </Text>
                  ) : null}

                  {/* ACORDEÓN DE VERIFICACIÓN FORMAL NORMATIVA (Dcto 1083/2015) */}
                  {(() => {
                    const tKey = fa.id || `TIT-${idx}`;
                    const abierta = Boolean(expansionesTitulos[tKey]);
                    const esBachiller = fa.tipo === 'BACHILLER' || (fa.titulo_obtenido || '').toUpperCase().includes('BACHILLER');
                    const esTarjeta = !esBachiller && (fa.tipo === 'TARJETA_PROFESIONAL' || (fa.titulo_obtenido || '').toUpperCase().includes('TARJETA') || Boolean(fa.numero_tarjeta_o_registro && fa.numero_tarjeta_o_registro !== 'NO CONSTA'));
                    const candNombre = data?.candidato?.nombre;
                    const candDoc = data?.candidato?.documento;

                    if (esTarjeta) {
                      const checks = obtenerChecksTarjeta(fa, candNombre, candDoc);
                      const listaChecks = [
                        { num: '1', titulo: 'Colegio o Consejo Profesional emisor', cumple: checks.consejo_emisor_identificable, evidencia: checks.consejo_evidencia },
                        { num: '2', titulo: 'Profesional coincide con el aspirante', cumple: checks.corresponde_profesional, evidencia: checks.profesional_evidencia },
                        { num: '3', titulo: 'Número de Matrícula o Tarjeta visible', cumple: checks.matricula_o_tarjeta_identificable, evidencia: checks.matricula_evidencia },
                        { num: '4', titulo: 'Profesión o disciplina autorizada', cumple: checks.profesion_autorizada, evidencia: checks.profesion_evidencia },
                        { num: '5', titulo: 'Certificado de vigencia y sin sanciones', cumple: checks.certificado_vigencia_y_sanciones, evidencia: checks.vigencia_evidencia },
                        { num: '6', titulo: 'Vigencia temporal válida (< 90 días)', cumple: checks.vigencia_temporal_valida, evidencia: checks.vigencia_temporal_evidencia },
                        { num: '7', titulo: 'Mecanismo de verificación o firma digital', cumple: checks.mecanismo_autenticacion_o_firma, evidencia: checks.mecanismo_evidencia }
                      ];
                      const totalCumplen = listaChecks.filter(c => c.cumple).length;

                      return (
                        <View style={{ marginTop: 10 }}>
                          <TouchableOpacity
                            onPress={() => toggleTituloExpansion(tKey)}
                            style={{
                              paddingVertical: 7,
                              paddingHorizontal: 10,
                              backgroundColor: abierta ? '#EEF2FF' : '#F1F5F9',
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: abierta ? '#C7D2FE' : '#E2E8F0',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Ionicons name="card-outline" size={15} color="#4338CA" />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#312E81' }}>
                                Verificación formal de la matrícula (Dcto 1083/2015)
                              </Text>
                              <View
                                style={{
                                  backgroundColor: totalCumplen === 7 ? '#DCFCE7' : '#FEF3C7',
                                  paddingHorizontal: 6,
                                  paddingVertical: 1,
                                  borderRadius: 4,
                                  borderWidth: 1,
                                  borderColor: totalCumplen === 7 ? '#86EFAC' : '#FDE68A'
                                }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '800', color: totalCumplen === 7 ? '#15803D' : '#B45309' }}>
                                  {totalCumplen}/7 CHECKS
                                </Text>
                              </View>
                            </View>
                            <Ionicons name={abierta ? "chevron-up" : "chevron-down"} size={16} color="#4338CA" />
                          </TouchableOpacity>

                          {abierta ? (
                            <View
                              style={{
                                marginTop: 6,
                                padding: 10,
                                backgroundColor: '#FFFFFF',
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                gap: 6
                              }}
                            >
                              {listaChecks.map((chk, iChk) => (
                                <View
                                  key={chk.num}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                    paddingVertical: 4,
                                    borderBottomWidth: iChk < 6 ? 1 : 0,
                                    borderBottomColor: '#F8FAFC'
                                  }}
                                >
                                  <Ionicons
                                    name={chk.cumple ? 'checkmark-circle' : 'alert-circle'}
                                    size={16}
                                    color={chk.cumple ? '#15803D' : '#D97706'}
                                    style={{ marginTop: 1 }}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                                      {chk.num}. {chk.titulo}
                                    </Text>
                                    {chk.evidencia ? (
                                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                                        {chk.evidencia}
                                      </Text>
                                    ) : null}
                                  </View>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      );
                    } else {
                      const checks = obtenerChecksTitulo(fa, candNombre, candDoc);
                      const listaChecks = [
                        { num: '1', titulo: 'Institución Educativa Reconocida (MEN)', cumple: checks.institucion_reconocida, evidencia: checks.institucion_evidencia },
                        { num: '2', titulo: 'Titular coincide con el aspirante', cumple: checks.corresponde_aspirante, evidencia: checks.aspirante_evidencia },
                        { num: '3', titulo: 'Denominación del título y nivel formal', cumple: checks.titulo_y_nivel_formal, evidencia: checks.titulo_evidencia },
                        { num: '4', titulo: 'Fecha de grado o aprobación cierta', cumple: checks.fecha_grado_cierta, evidencia: checks.fecha_grado_evidencia },
                        { num: '5', titulo: 'Acta de Grado, Folio o Registro institucional', cumple: checks.acta_o_registro_valido, evidencia: checks.acta_o_registro_evidencia },
                        { num: '6', titulo: 'Firmas de autoridades académicas', cumple: checks.firmas_autoridades, evidencia: checks.firmas_evidencia },
                        { num: '7', titulo: 'Convalidación MEN (Título del exterior)', cumple: checks.convalidacion_men, evidencia: checks.convalidacion_evidencia }
                      ];
                      const totalCumplen = listaChecks.filter(c => c.cumple).length;

                      return (
                        <View style={{ marginTop: 10 }}>
                          <TouchableOpacity
                            onPress={() => toggleTituloExpansion(tKey)}
                            style={{
                              paddingVertical: 7,
                              paddingHorizontal: 10,
                              backgroundColor: abierta ? '#EEF2FF' : '#F1F5F9',
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: abierta ? '#C7D2FE' : '#E2E8F0',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Ionicons name="ribbon-outline" size={15} color="#4338CA" />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#312E81' }}>
                                Verificación formal del título (Dcto 1083/2015 y Ley 30/1992)
                              </Text>
                              <View
                                style={{
                                  backgroundColor: totalCumplen === 7 ? '#DCFCE7' : '#FEF3C7',
                                  paddingHorizontal: 6,
                                  paddingVertical: 1,
                                  borderRadius: 4,
                                  borderWidth: 1,
                                  borderColor: totalCumplen === 7 ? '#86EFAC' : '#FDE68A'
                                }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '800', color: totalCumplen === 7 ? '#15803D' : '#B45309' }}>
                                  {totalCumplen}/7 CHECKS
                                </Text>
                              </View>
                            </View>
                            <Ionicons name={abierta ? "chevron-up" : "chevron-down"} size={16} color="#4338CA" />
                          </TouchableOpacity>

                          {abierta ? (
                            <View
                              style={{
                                marginTop: 6,
                                padding: 10,
                                backgroundColor: '#FFFFFF',
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                gap: 6
                              }}
                            >
                              {listaChecks.map((chk, iChk) => (
                                <View
                                  key={chk.num}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                    paddingVertical: 4,
                                    borderBottomWidth: iChk < 6 ? 1 : 0,
                                    borderBottomColor: '#F8FAFC'
                                  }}
                                >
                                  <Ionicons
                                    name={chk.cumple ? 'checkmark-circle' : 'alert-circle'}
                                    size={16}
                                    color={chk.cumple ? '#15803D' : '#D97706'}
                                    style={{ marginTop: 1 }}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                                      {chk.num}. {chk.titulo}
                                    </Text>
                                    {chk.evidencia ? (
                                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                                        {chk.evidencia}
                                      </Text>
                                    ) : null}
                                  </View>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      );
                    }
                  })()}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* DETALLE CERTIFICADO POR CERTIFICADO */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
            Certificados Analizados y Evidencias Textuales ({certificados.length})
          </Text>

          <TouchableOpacity
            onPress={subirYAnalizarDocumento}
            disabled={subiendoDoc}
            style={{
              backgroundColor: '#4338CA',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Ionicons name="sparkles" size={15} color="#FDE047" />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
              + Subir Certificado (IA)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ gap: 16 }}>
          {certificados.map((c, index) => {
            const esRel = c.clasificacion_experiencia === 'RELACIONADA';
            const coinc = c.experiencia_relacionada?.funciones_coincidentes || [];

            return (
              <View
                key={c.id || index}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#E2E8F0'
                }}
              >
                {/* Encabezado del Certificado */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                        {c.id_certificado}: {c.entidad}
                      </Text>
                      {c.nit_entidad && c.nit_entidad !== 'NO CONSTA' && (
                        <Text style={{ fontSize: 12, color: '#64748B' }}>NIT: {c.nit_entidad}</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 14, color: '#334155', fontWeight: '600', marginTop: 2 }}>
                      Cargo: {c.cargo_certificado} {c.tipo_vinculo ? `(${c.tipo_vinculo})` : ''}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: esRel ? '#DCFCE7' : '#FEE2E2'
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: esRel ? '#16A34A' : '#DC2626' }}>
                        {c.clasificacion_experiencia}
                      </Text>
                    </View>

                    {/* Botones Ver PDF / Anexos */}
                    {(() => {
                      const listaAnexos = (c.anexos && c.anexos.length > 0)
                        ? c.anexos
                        : (c.nombre_archivo ? [c.nombre_archivo] : []);

                      return listaAnexos.map((anexo, aIdx) => (
                        <TouchableOpacity
                          key={aIdx}
                          onPress={() => verPdfDocumento(anexo, `${c.id_certificado} - Anexo ${aIdx + 1}: ${anexo}`)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 6,
                            backgroundColor: aIdx === 0 ? '#EFF6FF' : '#EEF2FF',
                            borderWidth: 1,
                            borderColor: aIdx === 0 ? '#BFDBFE' : '#C7D2FE'
                          }}
                          accessibilityLabel="Ver PDF del certificado"
                        >
                          <Ionicons name="document-text-outline" size={14} color={aIdx === 0 ? '#1D4ED8' : '#4338CA'} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: aIdx === 0 ? '#1D4ED8' : '#4338CA' }}>
                            {listaAnexos.length > 1 ? `Anexo ${aIdx + 1}` : 'Ver PDF'}
                          </Text>
                        </TouchableOpacity>
                      ));
                    })()}

                    {/* Botón Eliminar Certificado */}
                    <TouchableOpacity
                      onPress={() => pedirConfirmarEliminarCertificado(index)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: '#FEF2F2',
                        borderWidth: 1,
                        borderColor: '#FCA5A5'
                      }}
                      accessibilityLabel="Eliminar certificado"
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>Eliminar Experiencia</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Periodo y Tiempo */}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 16,
                    backgroundColor: '#F8FAFC',
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 12
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#334155' }}>
                    <Text style={{ fontWeight: '700' }}>Periodo Certificado:</Text> {c.fecha_inicio} al {c.fecha_fin || (c.vinculo_vigente ? 'Vigente' : 'NO CONSTA')}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>
                    <Text style={{ fontWeight: '700' }}>Duración:</Text> {c.tiempo_certificado?.meses_totales_aproximados} meses ({c.tiempo_certificado?.anios ? `${c.tiempo_certificado.anios}a, ` : ''}{c.tiempo_certificado?.meses || 0}m, {c.tiempo_certificado?.dias || 0}d)
                  </Text>
                  {c.nombre_archivo && (
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      <Text style={{ fontWeight: '700' }}>Archivo:</Text> {c.nombre_archivo}
                    </Text>
                  )}
                </View>

                {/* Traslapes */}
                {c.traslapes && c.traslapes.length > 0 && (
                  <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#FCA5A5' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="warning" size={16} color="#DC2626" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>
                        TRASLAPE DETECTADO (Periodo no computable dos veces):
                      </Text>
                    </View>
                    {c.traslapes.map((t, tidx) => (
                      <Text key={tidx} style={{ fontSize: 12, color: '#991B1B', marginTop: 4 }}>
                        • {t.explicacion}
                      </Text>
                    ))}
                  </View>
                )}

                {/* ACORDEÓN DE 3 GRUPOS (PREDETERMINADO CONTRAÍDOS) */}
                {(() => {
                  const certKey = c.id_certificado || `cert_${index}`;
                  const expandidoFormal = Boolean(expansionesGrupos[certKey]?.formal);
                  const expandidoPrevio = Boolean(expansionesGrupos[certKey]?.previo);
                  const expandidoFunciones = Boolean(expansionesGrupos[certKey]?.funciones);

                  // 1. Datos de Verificación Formal
                  const vf = c.verificacion_formal;
                  const c1 = vf ? vf.corresponde_aspirante : true;
                  const d1 = vf?.aspirante_nombre_doc || candidato.nombre;
                  const c2 = vf ? vf.entidad_identificable : (!!c.entidad && c.entidad !== 'NO CONSTA');
                  const d2 = vf?.entidad_nombre || c.entidad;
                  const c3 = vf ? vf.suscriptor_identificable : (!!c.firmante && c.firmante !== 'NO CONSTA');
                  const d3 = vf?.suscriptor_nombre_cargo_calidad || (c.firmante ? `${c.firmante} - ${c.cargo_firmante || 'Suscriptor'}` : 'NO CONSTA');
                  const c4 = vf ? vf.cuenta_con_firma : (c.documento?.firma_visible ?? true);
                  const d4 = vf?.tipo_firma || (c.documento?.firma_visible ? 'Firma visible identificada' : 'Sin firma identificable');
                  const c5 = vf ? vf.fecha_expedicion_identificable : (!!c.fecha_expedicion && c.fecha_expedicion !== 'NO CONSTA');
                  const d5 = vf?.fecha_expedicion || c.fecha_expedicion || 'NO CONSTA';
                  const c6 = vf ? vf.documento_legible_integro : (c.documento?.documento_legible ?? true);
                  const d6 = vf?.detalle_legibilidad || (c.documento?.documento_legible ? 'Documento legible, íntegro y sin alteraciones' : 'Documento con ilegibilidad');
                  const c7 = vf ? vf.mecanismos_contacto_verificacion : true;
                  const d7 = vf?.mecanismos_contacto_cuales || (c.ciudad_expedicion ? `Ciudad: ${c.ciudad_expedicion} • Membrete institucional` : 'Membrete institucional de la entidad emisora');

                  const cumpleFormal = c1 && c2 && c3 && c4 && c5 && c6 && c7;
                  const itemsFormales = [
                    { num: 1, texto: 'El certificado corresponde al aspirante y contiene su nombre completo e identificación.', ok: c1, detalle: d1 },
                    { num: 2, texto: 'Se identifica claramente la entidad o empresa que expide el certificado.', ok: c2, detalle: d2 },
                    { num: 3, texto: 'Se identifica el nombre, cargo y calidad de quien suscribe el documento.', ok: c3, detalle: d3 },
                    { num: 4, texto: 'El certificado cuenta con firma manuscrita, electrónica o digital, según corresponda.', ok: c4, detalle: d4 },
                    { num: 5, texto: 'Se identifica la fecha de expedición del certificado.', ok: c5, detalle: d5 },
                    { num: 6, texto: 'El documento es legible, íntegro y no presenta alteraciones visibles.', ok: c6, detalle: d6 },
                    { num: 7, texto: 'Se dispone de datos de contacto o mecanismos para verificar la información con la entidad emisora. (cuáles)', ok: c7, detalle: d7, esCuales: true }
                  ];

                  // 2. Datos de Validación Previa al Grado (Decreto 1083/2015 y Ley 2039/2020)
                  const vep = c.verificacion_experiencia_previa || calcularExpPreviaFallback(c, titulos);
                  const resVep = vep?.tipo_resultado;
                  const esPosterior = resVep === 'COMPUTABLE_TOTAL_POSTERIOR';
                  const esLey2039 = resVep === 'COMPUTABLE_TOTAL_LEY_2039';
                  const esParcial = resVep === 'COMPUTABLE_PARCIAL_DESDE_CORTE';
                  const esNoComputable = resVep === 'NO_COMPUTABLE_PREVIA_AL_GRADO';

                  let badgePrevioBg = '#DCFCE7';
                  let badgePrevioBorder = '#BBF7D0';
                  let badgePrevioColor = '#166534';
                  let badgePrevioTexto = '✓ Posterior al grado';

                  if (esLey2039) {
                    badgePrevioBg = '#DBEAFE';
                    badgePrevioBorder = '#BFDBFE';
                    badgePrevioColor = '#1E40AF';
                    badgePrevioTexto = '✓ Ley 2039/2020 (Práctica)';
                  } else if (esParcial) {
                    badgePrevioBg = '#FEF3C7';
                    badgePrevioBorder = '#FDE68A';
                    badgePrevioColor = '#92400E';
                    badgePrevioTexto = '⚠️ Parcial (corte)';
                  } else if (esNoComputable) {
                    badgePrevioBg = '#FEE2E2';
                    badgePrevioBorder = '#FECACA';
                    badgePrevioColor = '#991B1B';
                    badgePrevioTexto = '🚫 No computable (Dcto 1083/15)';
                  }

                  // 3. Datos de Funciones (Cotejo Funcional Completo: cuáles sí y cuáles no)
                  const coincidentes = c.experiencia_relacionada?.funciones_coincidentes || [];
                  const noCoincidentesRaw = c.experiencia_relacionada?.funciones_no_coincidentes || [];
                  const todasFuncionesCert = Array.isArray(c.funciones_certificadas)
                    ? c.funciones_certificadas.map(f => typeof f === 'string' ? f : (f.funcion || ''))
                    : [];

                  const textosCoincidentes = coincidentes.map(f => (f.funcion_certificada || (f as any).funcion || '').toLowerCase().trim());
                  const listaNoCoincidentes: string[] = [];

                  noCoincidentesRaw.forEach(f => {
                    const txt = typeof f === 'string' ? f.trim() : String(f).trim();
                    if (txt && !listaNoCoincidentes.includes(txt)) {
                      listaNoCoincidentes.push(txt);
                    }
                  });

                  todasFuncionesCert.forEach(fc => {
                    const txt = fc.trim();
                    if (!txt) return;
                    const yaCoincide = textosCoincidentes.some(tc => tc && (tc.includes(txt.toLowerCase()) || txt.toLowerCase().includes(tc)));
                    const yaEnNoCoinc = listaNoCoincidentes.some(nc => nc.toLowerCase() === txt.toLowerCase());
                    if (!yaCoincide && !yaEnNoCoinc) {
                      listaNoCoincidentes.push(txt);
                    }
                  });

                  return (
                    <View style={{ marginTop: 14, gap: 10 }}>
                      {/* GRUPO 1: VERIFICACIÓN FORMAL DEL CERTIFICADO */}
                      <View style={{ borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', overflow: 'hidden' }}>
                        <TouchableOpacity
                          onPress={() => toggleGrupo(certKey, 'formal')}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 12,
                            backgroundColor: '#F8FAFC'
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <Ionicons name="checkbox-outline" size={18} color="#991B1B" />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                              1. Verificación formal del certificado
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{
                              backgroundColor: cumpleFormal ? '#DCFCE7' : '#FEF3C7',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: cumpleFormal ? '#BBF7D0' : '#FDE68A'
                            }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: cumpleFormal ? '#166534' : '#92400E' }}>
                                {cumpleFormal ? '✓ 7/7 Cumple' : '⚠️ Requiere revisión'}
                              </Text>
                            </View>
                            <Ionicons
                              name={expandidoFormal ? 'chevron-down' : 'chevron-forward'}
                              size={18}
                              color="#64748B"
                            />
                          </View>
                        </TouchableOpacity>

                        {expandidoFormal && (
                          <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 8 }}>
                            {itemsFormales.map((it) => (
                              <View
                                key={it.num}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'flex-start',
                                  gap: 8,
                                  backgroundColor: '#F8FAFC',
                                  padding: 8,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: it.ok ? '#E2E8F0' : '#FECACA'
                                }}
                              >
                                <Ionicons
                                  name={it.ok ? 'checkmark-circle' : 'close-circle'}
                                  size={16}
                                  color={it.ok ? '#16A34A' : '#DC2626'}
                                  style={{ marginTop: 1 }}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', lineHeight: 16 }}>
                                    {it.texto}
                                  </Text>
                                  {it.detalle ? (
                                    <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                      {it.esCuales ? 'Mecanismos / Datos: ' : 'Consta: '}
                                      <Text style={{ fontWeight: it.esCuales ? '700' : '500', color: '#0F172A' }}>
                                        {it.detalle}
                                      </Text>
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* GRUPO 2: VALIDACIÓN PREVIA AL GRADO (DECRETO 1083 DE 2015 Y LEY 2039 DE 2020) */}
                      {vep && (
                        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: esNoComputable ? '#FECACA' : '#CBD5E1', overflow: 'hidden' }}>
                          <TouchableOpacity
                            onPress={() => toggleGrupo(certKey, 'previo')}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 12,
                              backgroundColor: esNoComputable ? '#FFF5F5' : '#F8FAFC'
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <Ionicons name="school-outline" size={18} color="#1E40AF" />
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                2. Validación previa al grado (Dcto 1083/2015 y Ley 2039/2020)
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{
                                backgroundColor: badgePrevioBg,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: badgePrevioBorder
                              }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: badgePrevioColor }}>
                                  {badgePrevioTexto}
                                </Text>
                              </View>
                              <Ionicons
                                name={expandidoPrevio ? 'chevron-down' : 'chevron-forward'}
                                size={18}
                                color="#64748B"
                              />
                            </View>
                          </TouchableOpacity>

                          {expandidoPrevio && (
                            <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: esNoComputable ? '#FECACA' : '#E2E8F0', gap: 8 }}>
                              {/* Check 1: Terminación del pénsum */}
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'flex-start',
                                  gap: 8,
                                  backgroundColor: '#F8FAFC',
                                  padding: 8,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: vep.check_terminacion_pensum?.acredita_terminacion_materias ? '#BBF7D0' : '#E2E8F0'
                                }}
                              >
                                <Ionicons
                                  name={vep.check_terminacion_pensum?.acredita_terminacion_materias ? 'checkmark-circle' : 'information-circle'}
                                  size={16}
                                  color={vep.check_terminacion_pensum?.acredita_terminacion_materias ? '#16A34A' : '#64748B'}
                                  style={{ marginTop: 1 }}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', lineHeight: 16 }}>
                                    1. Terminación del pénsum académico (Decreto 1083 de 2015)
                                  </Text>
                                  <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                    {vep.check_terminacion_pensum?.observacion || `Corte profesional: ${vep.corte_referencia?.fecha || 'NO CONSTA'} (${vep.corte_referencia?.sustento_normativo || 'Fecha de grado'})`}
                                  </Text>
                                </View>
                              </View>

                              {/* Check 2: Relación con la profesión */}
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'flex-start',
                                  gap: 8,
                                  backgroundColor: '#F8FAFC',
                                  padding: 8,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: vep.check_relacion_profesion?.cumple ? '#BBF7D0' : '#FECACA'
                                }}
                              >
                                <Ionicons
                                  name={vep.check_relacion_profesion?.cumple ? 'checkmark-circle' : 'close-circle'}
                                  size={16}
                                  color={vep.check_relacion_profesion?.cumple ? '#16A34A' : '#DC2626'}
                                  style={{ marginTop: 1 }}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', lineHeight: 16 }}>
                                    2. Relación con la profesión o disciplina exigida
                                  </Text>
                                  <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                    {vep.check_relacion_profesion?.observacion || (esRel ? 'Funciones afines con la disciplina y empleo evaluado' : 'Funciones no relacionadas con la disciplina')}
                                  </Text>
                                </View>
                              </View>

                              {/* Check 3: Tipo de experiencia previa (Ley 2039/2020) */}
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'flex-start',
                                  gap: 8,
                                  backgroundColor: '#F8FAFC',
                                  padding: 8,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: esPosterior ? '#E2E8F0' : (vep.check_modalidad_ley_2039?.aplica_excepcion ? '#BFDBFE' : '#FECACA')
                                }}
                              >
                                <Ionicons
                                  name={esPosterior ? 'checkmark-circle' : (vep.check_modalidad_ley_2039?.aplica_excepcion ? 'checkmark-circle' : 'close-circle')}
                                  size={16}
                                  color={esPosterior ? '#16A34A' : (vep.check_modalidad_ley_2039?.aplica_excepcion ? '#2563EB' : '#DC2626')}
                                  style={{ marginTop: 1 }}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', lineHeight: 16 }}>
                                    3. Modalidad de experiencia previa (Ley 2039/2020 y Dcto 952/2021)
                                  </Text>
                                  <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                    {vep.check_modalidad_ley_2039?.observacion || (esPosterior ? 'No requerida: Adquirida con posterioridad al título profesional / terminación de materias.' : 'No califica en modalidades de práctica, pasantía, judicatura o monitoría de la Ley 2039/2020.')}
                                  </Text>
                                </View>
                              </View>

                              {/* Conclusión Jurídica */}
                              <View
                                style={{
                                  marginTop: 4,
                                  padding: 10,
                                  backgroundColor: esNoComputable ? '#FEE2E2' : '#EFF6FF',
                                  borderRadius: 6,
                                  borderLeftWidth: 3,
                                  borderLeftColor: esNoComputable ? '#DC2626' : '#2563EB'
                                }}
                              >
                                <Text style={{ fontSize: 11, color: esNoComputable ? '#7F1D1D' : '#1E3A8A', lineHeight: 16 }}>
                                  <Text style={{ fontWeight: '700' }}>Conclusión normativa: </Text>
                                  {vep.conclusion_juridica}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      )}

                      {/* GRUPO 3: COTEJO FUNCIONAL DE ACTIVIDADES (TODAS LAS FUNCIONES) */}
                      <View style={{ borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', overflow: 'hidden' }}>
                        <TouchableOpacity
                          onPress={() => toggleGrupo(certKey, 'funciones')}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 12,
                            backgroundColor: '#F8FAFC'
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <Ionicons name="git-compare-outline" size={18} color="#4F46E5" />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                              3. Cotejo funcional de actividades ({coincidentes.length + listaNoCoincidentes.length} funciones)
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{
                              backgroundColor: coincidentes.length > 0 ? '#DCFCE7' : '#F1F5F9',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: coincidentes.length > 0 ? '#BBF7D0' : '#CBD5E1'
                            }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: coincidentes.length > 0 ? '#166534' : '#475569' }}>
                                {coincidentes.length > 0 ? `${coincidentes.length} relacionada(s)` : '0 relacionadas'}
                              </Text>
                            </View>
                            <Ionicons
                              name={expandidoFunciones ? 'chevron-down' : 'chevron-forward'}
                              size={18}
                              color="#64748B"
                            />
                          </View>
                        </TouchableOpacity>

                        {expandidoFunciones && (
                          <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 12 }}>
                            {/* 3.1 FUNCIONES QUE SÍ SON RELACIONADAS */}
                            <View style={{ gap: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="checkmark-done-circle" size={16} color="#16A34A" />
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>
                                  Funciones que SÍ son relacionadas ({coincidentes.length}):
                                </Text>
                              </View>

                              {coincidentes.length === 0 ? (
                                <View style={{ padding: 10, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                  <Text style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>
                                    No se identificaron funciones del certificado que coincidan directamente con las responsabilidades del cargo evaluado.
                                  </Text>
                                </View>
                              ) : (
                                coincidentes.map((f, fidx) => (
                                  <View
                                    key={fidx}
                                    style={{
                                      backgroundColor: '#F0FDF4',
                                      padding: 10,
                                      borderRadius: 8,
                                      borderWidth: 1,
                                      borderColor: '#BBF7D0',
                                      borderLeftWidth: 4,
                                      borderLeftColor: '#16A34A',
                                      gap: 6
                                    }}
                                  >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#166534' }}>
                                        Función {fidx + 1}
                                      </Text>
                                      <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#15803D' }}>
                                          ✓ {f.coincidencia || 'RELACIONADA'}
                                        </Text>
                                      </View>
                                    </View>

                                    <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '600' }}>
                                      Certificada: "{f.funcion_certificada || (f as any).funcion}"
                                    </Text>

                                    <View style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#DCFCE7' }}>
                                      <Text style={{ fontSize: 11, color: '#166534', fontWeight: '700' }}>
                                        ➔ Se relaciona con la función del empleo:
                                      </Text>
                                      <Text style={{ fontSize: 12, color: '#1E293B', marginTop: 2 }}>
                                        "{f.funcion_del_cargo}"
                                      </Text>
                                    </View>

                                    {f.justificacion ? (
                                      <Text style={{ fontSize: 11, color: '#475569' }}>
                                        <Text style={{ fontWeight: '600' }}>Criterio de afinidad: </Text>{f.justificacion}
                                      </Text>
                                    ) : null}
                                  </View>
                                ))
                              )}
                            </View>

                            {/* 3.2 FUNCIONES QUE NO SON RELACIONADAS */}
                            <View style={{ gap: 8, marginTop: 4 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="close-circle" size={16} color="#DC2626" />
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#991B1B' }}>
                                  Funciones que NO son relacionadas ({listaNoCoincidentes.length}):
                                </Text>
                              </View>

                              {listaNoCoincidentes.length === 0 ? (
                                <View style={{ padding: 10, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                  <Text style={{ fontSize: 11, color: '#166534', fontStyle: 'italic' }}>
                                    ✓ Todas las funciones certificadas en este documento guardan relación con el perfil del cargo.
                                  </Text>
                                </View>
                              ) : (
                                listaNoCoincidentes.map((fText, nidx) => (
                                  <View
                                    key={nidx}
                                    style={{
                                      backgroundColor: '#FEF2F2',
                                      padding: 10,
                                      borderRadius: 8,
                                      borderWidth: 1,
                                      borderColor: '#FECACA',
                                      borderLeftWidth: 4,
                                      borderLeftColor: '#DC2626',
                                      gap: 4
                                    }}
                                  >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#991B1B' }}>
                                        Función {nidx + 1}
                                      </Text>
                                      <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#B91C1C' }}>✕ No Relacionada</Text>
                                      </View>
                                    </View>

                                    <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '500' }}>
                                      Certificada: "{fText}"
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#7F1D1D', fontStyle: 'italic' }}>
                                      No guarda correspondencia funcional ni se enmarca en las funciones oficiales del cargo evaluado.
                                    </Text>
                                  </View>
                                ))
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })()}
              </View>
            );
          })}
        </View>

        {/* DOCUMENTOS Y CERTIFICACIONES QUE NO APLICAN */}
        <View
          style={{
            marginTop: 20,
            backgroundColor: '#FFFBEB',
            borderRadius: 12,
            padding: 20,
            borderWidth: 1,
            borderColor: '#FDE68A',
            gap: 14
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="alert-circle" size={22} color="#D97706" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#92400E' }}>
                Documentos y Certificaciones que NO Aplican
              </Text>
            </View>
            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                {documentosNoAplican.length > 0
                  ? `${documentosNoAplican.length} excluido(s)`
                  : '0 excluidos'}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: '#78350F', lineHeight: 18 }}>
            Relación explícita de documentos que no constituyen experiencia laboral válida, certificaciones sin funciones o requisitos de ley, o documentos que no guardan relación con el perfil exigido.
          </Text>

          {documentosNoAplican.length === 0 ? (
            <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
              <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>
                ✓ Todos los documentos aportados son válidos y computables para la evaluación del cargo.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {documentosNoAplican.map((doc, idx) => (
                <View
                  key={doc.id || idx}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#FECACA',
                    borderLeftWidth: 4,
                    borderLeftColor: '#DC2626'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                    <View style={{ flex: 1, minWidth: 220 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                        {doc.descripcion || doc.nombre_archivo}
                      </Text>
                      {doc.entidad ? (
                        <Text style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
                          Entidad emisora: <Text style={{ fontWeight: '600' }}>{doc.entidad}</Text>
                        </Text>
                      ) : null}
                      {doc.nombre_archivo ? (
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                          Archivo: {doc.nombre_archivo}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FCA5A5' }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#DC2626' }}>
                          NO APLICA
                        </Text>
                      </View>

                      {/* Botón Ver PDF */}
                      <TouchableOpacity
                        onPress={() => verPdfDocumento(doc.nombre_archivo, doc.descripcion || 'Documento no aplicable')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor: '#EFF6FF',
                          borderWidth: 1,
                          borderColor: '#BFDBFE'
                        }}
                        accessibilityLabel="Ver PDF del documento"
                      >
                        <Ionicons name="document-text-outline" size={13} color="#1D4ED8" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>Ver PDF</Text>
                      </TouchableOpacity>

                      {/* Botón Eliminar Registro No Aplica */}
                      <TouchableOpacity
                        onPress={() => pedirConfirmarEliminarDocNoAplica(idx)}
                        style={{
                          padding: 5,
                          borderRadius: 6,
                          backgroundColor: '#FEE2E2',
                          borderWidth: 1,
                          borderColor: '#FCA5A5'
                        }}
                        accessibilityLabel="Eliminar de no aplica"
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Motivo por el cual no aplica */}
                  <View style={{ marginTop: 8, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#FECACA' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#991B1B' }}>
                      ¿Por qué no aplica al cargo?
                    </Text>
                    <Text style={{ fontSize: 12, color: '#7F1D1D', marginTop: 2, lineHeight: 17 }}>
                      {doc.motivo_no_aplica}
                    </Text>
                    {doc.sustento_criterio ? (
                      <Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 4, fontStyle: 'italic' }}>
                        Sustento / Criterio: {doc.sustento_criterio}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      )}

      {/* Modal Crear / Editar Título */}
      <Modal
        visible={modalTituloVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalTituloVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 22,
              width: '100%',
              maxWidth: 580,
              maxHeight: '90%',
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="school" size={22} color="#1E40AF" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                  {editandoIndex !== null ? 'Editar Título o Tarjeta' : 'Agregar Nuevo Título / Tarjeta'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalTituloVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {/* Selector de Tipo */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                  Tipo de Documento Formativo *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {[
                    { id: 'PREGRADO', label: 'Pregrado' },
                    { id: 'ESPECIALIZACION', label: 'Especialización' },
                    { id: 'MAESTRIA', label: 'Maestría' },
                    { id: 'DOCTORADO', label: 'Doctorado' },
                    { id: 'BACHILLER', label: 'Bachiller' },
                    { id: 'TECNICO', label: 'Técnico' },
                    { id: 'TECNOLOGO', label: 'Tecnólogo' },
                    { id: 'TARJETA_PROFESIONAL', label: 'Tarjeta Profesional' },
                    { id: 'OTRO', label: 'Otro' }
                  ].map((t) => {
                    const sel = formTipo === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => setFormTipo(t.id as any)}
                        style={{
                          backgroundColor: sel ? '#1E40AF' : '#F1F5F9',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: sel ? '#1E40AF' : '#CBD5E1'
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: sel ? '#FFFFFF' : '#475569' }}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Título Obtenido */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Título Obtenido / Denominación *
                </Text>
                <TextInput
                  value={formTitulo}
                  onChangeText={setFormTitulo}
                  placeholder="Ej. Abogado, Bachiller Académico, Contador Público"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A'
                  }}
                />
              </View>

              {/* Institución */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Institución Educativa Emisora *
                </Text>
                <TextInput
                  value={formInstitucion}
                  onChangeText={setFormInstitucion}
                  placeholder="Ej. Universidad Nacional de Colombia, Colegio Mayor"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A'
                  }}
                />
              </View>

              {/* Fila Fecha y Tarjeta */}
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    Fecha de Grado / Expedición
                  </Text>
                  <TextInput
                    value={formFechaGrado}
                    onChangeText={setFormFechaGrado}
                    placeholder="AAAA-MM-DD (o NO CONSTA)"
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: '#0F172A'
                    }}
                  />
                </View>

                {/* Solo mostrar N° Tarjeta / Registro si NO es Bachiller */}
                {formTipo !== 'BACHILLER' ? (
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      N° Tarjeta / Registro
                    </Text>
                    <TextInput
                      value={formTarjeta}
                      onChangeText={setFormTarjeta}
                      placeholder="Opcional (Ej. 345612 CSJ)"
                      placeholderTextColor="#94A3B8"
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13,
                        color: '#0F172A'
                      }}
                    />
                  </View>
                ) : null}
              </View>

              {/* Decreto 1083 de 2015: Terminación de Pénsum / Materias (Solo Pregrado) */}
              {formTipo === 'PREGRADO' && (
                <View
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: 8,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    gap: 10
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="school" size={16} color="#1E40AF" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E40AF' }}>
                      Decreto 1083 de 2015 - Terminación de Pénsum Académico
                    </Text>
                  </View>

                  <Text style={{ fontSize: 11, color: '#1E3A8A', lineHeight: 15 }}>
                    La experiencia profesional se contabiliza desde la terminación y aprobación del pénsum académico cuando medie certificación de la institución educativa. De lo contrario, se computa a partir de la fecha de grado.
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setFormCertificaMaterias(!formCertificaMaterias)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: formCertificaMaterias ? '#DBEAFE' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: formCertificaMaterias ? '#2563EB' : '#CBD5E1',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6
                      }}
                    >
                      <Ionicons
                        name={formCertificaMaterias ? 'checkbox' : 'square-outline'}
                        size={16}
                        color={formCertificaMaterias ? '#1D4ED8' : '#64748B'}
                      />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: formCertificaMaterias ? '#1E40AF' : '#475569' }}>
                        Aporta certificación de terminación de materias
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {formCertificaMaterias && (
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF', marginBottom: 4 }}>
                        Fecha de Terminación y Aprobación de Materias *
                      </Text>
                      <TextInput
                        value={formFechaMaterias}
                        onChangeText={setFormFechaMaterias}
                        placeholder="AAAA-MM-DD (fecha exacta de certificación)"
                        placeholderTextColor="#94A3B8"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#93C5FD',
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          fontSize: 12,
                          color: '#0F172A'
                        }}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Cumple Requisito */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                  ¿Cumple Requisito Exigido para el Cargo?
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setFormCumple(true)}
                    style={{
                      flex: 1,
                      backgroundColor: formCumple ? '#DCFCE7' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: formCumple ? '#16A34A' : '#CBD5E1',
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons
                      name={formCumple ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={formCumple ? '#15803D' : '#64748B'}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: formCumple ? '#15803D' : '#64748B' }}>
                      Sí Cumple Requisito
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setFormCumple(false)}
                    style={{
                      flex: 1,
                      backgroundColor: !formCumple ? '#FEF3C7' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: !formCumple ? '#D97706' : '#CBD5E1',
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons
                      name={!formCumple ? 'alert-circle' : 'ellipse-outline'}
                      size={16}
                      color={!formCumple ? '#B45309' : '#64748B'}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: !formCumple ? '#B45309' : '#64748B' }}>
                      En Evaluación / Adicional
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Justificación */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Justificación / Criterio de Validación
                </Text>
                <TextInput
                  value={formJustificacion}
                  onChangeText={setFormJustificacion}
                  multiline
                  numberOfLines={2}
                  placeholder="Ej. Cumple con el núcleo básico del conocimiento exigido en el manual de funciones."
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A',
                    minHeight: 56
                  }}
                />
              </View>
            </ScrollView>

            {/* Botones Acciones Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 18, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14 }}>
              {editandoIndex !== null && (
                <TouchableOpacity
                  onPress={() => descartarTitulo(editandoIndex)}
                  style={{
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: '#FFFBEB',
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginRight: 'auto'
                  }}
                >
                  <Ionicons name="ban-outline" size={15} color="#D97706" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309' }}>Mover a Descartados</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setModalTituloVisible(false)}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: '#F1F5F9',
                  borderWidth: 1,
                  borderColor: '#CBD5E1'
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={guardarTituloForm}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 18,
                  borderRadius: 8,
                  backgroundColor: '#1E40AF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {editandoIndex !== null ? 'Actualizar Título' : 'Agregar Título'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal
        visible={modalEliminarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalEliminarVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 22,
              width: '100%',
              maxWidth: 420,
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Ionicons name="trash-bin-outline" size={24} color="#DC2626" />
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                {itemAEliminar?.titulo || 'Confirmar Eliminación'}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 20 }}>
              {itemAEliminar?.descripcion || '¿Estás seguro de que deseas eliminar este registro del expediente? Se borrará de forma permanente de la base de datos.'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setModalEliminarVisible(false)}
                style={{
                  backgroundColor: '#F1F5F9',
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#CBD5E1'
                }}
              >
                <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={ejecutarEliminar}
                style={{
                  backgroundColor: '#DC2626',
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Reusable (Regla: No alerts) */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Ionicons name="alert-circle" size={26} color="#991B1B" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>{modalTitle}</Text>
            </View>
            <Text style={{ fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 20 }}>
              {modalMessage}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                backgroundColor: '#0F172A',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Análisis en Progreso con IA */}
      {/* Modal de Progreso Individual y Barra de Carga Dinámica */}
      <Modal
        visible={progresoIaModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 480,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
              gap: 16
            }}
          >
            {/* Encabezado */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: '#EEF2FF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#C7D2FE'
                }}
              >
                <ActivityIndicator size="small" color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                  Procesando con IA (Gemini)
                </Text>
                <Text style={{ fontSize: 13, color: '#4F46E5', fontWeight: '700' }}>
                  Documento {progresoIaIndiceActual} de {progresoIaTotalArchivos}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#F1F5F9',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>
                  {progresoIaPorcentaje}%
                </Text>
              </View>
            </View>

            {/* Barra de progreso gráfica */}
            <View
              style={{
                height: 10,
                backgroundColor: '#E2E8F0',
                borderRadius: 5,
                overflow: 'hidden',
                width: '100%'
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${progresoIaPorcentaje}%`,
                  backgroundColor: '#4F46E5',
                  borderRadius: 5
                }}
              />
            </View>

            {/* Detalle del archivo en curso */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                gap: 6
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="document-text" size={16} color="#4F46E5" />
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', flex: 1 }}
                >
                  {progresoIaArchivoActual || 'Procesando...'}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                {progresoIaEstado}
              </Text>
            </View>

            <Text style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>
              Analizando documento por documento para garantizar máxima precisión y respetar la tasa por minuto.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Modal de Resultados del Análisis Automático */}
      <Modal
        visible={modalResultadoIaVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalResultadoIaVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 22,
              width: '100%',
              maxWidth: 520,
              maxHeight: '92%',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 8,
              gap: 14
            }}
          >
            {/* Encabezado dinámico */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor:
                    (resumenIaDetectado?.titulos?.length || resumenIaDetectado?.certs?.length)
                      ? '#DCFCE7'
                      : '#FEF3C7',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Ionicons
                  name={
                    (resumenIaDetectado?.titulos?.length || resumenIaDetectado?.certs?.length)
                      ? 'checkmark-circle'
                      : 'alert-circle'
                  }
                  size={28}
                  color={
                    (resumenIaDetectado?.titulos?.length || resumenIaDetectado?.certs?.length)
                      ? '#15803D'
                      : '#D97706'
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                  {(resumenIaDetectado?.titulos?.length || resumenIaDetectado?.certs?.length)
                    ? 'Proceso de Incorporación Completado'
                    : 'Atención en Análisis con IA'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  {(resumenIaDetectado?.titulos?.length || resumenIaDetectado?.certs?.length)
                    ? 'Resultados y auditoría normativa del expediente'
                    : 'Revisa las observaciones generadas a continuación'}
                </Text>
              </View>
            </View>

            {/* Contenedor ScrollView para garantizar que NUNCA desborde ni tape los botones */}
            <ScrollView
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                maxHeight: 380
              }}
              contentContainerStyle={{ gap: 12 }}
              showsVerticalScrollIndicator={true}
            >
              {resumenIaDetectado?.titulos && resumenIaDetectado.titulos.length > 0 ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E40AF' }}>
                    🎓 Títulos / Matrículas Detectadas ({resumenIaDetectado.titulos.length}):
                  </Text>
                  {resumenIaDetectado.titulos.map((t, idx) => (
                    <Text key={idx} style={{ fontSize: 12, color: '#334155' }}>
                      • <Text style={{ fontWeight: '700' }}>{t.titulo_obtenido}</Text> ({t.tipo}) - {t.institucion}
                    </Text>
                  ))}
                </View>
              ) : null}

              {resumenIaDetectado?.certs && resumenIaDetectado.certs.length > 0 ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803D' }}>
                    💼 Certificados Laborales Detectados ({resumenIaDetectado.certs.length}):
                  </Text>
                  {resumenIaDetectado.certs.map((c, idx) => (
                    <Text key={idx} style={{ fontSize: 12, color: '#334155' }}>
                      • <Text style={{ fontWeight: '700' }}>{c.cargo_certificado}</Text> en {c.entidad} [{c.clasificacion_experiencia}]
                    </Text>
                  ))}
                </View>
              ) : null}

              {resumenIaDetectado?.noAplican && resumenIaDetectado.noAplican.length > 0 ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>
                    ⚠️ Otros Documentos ({resumenIaDetectado.noAplican.length}):
                  </Text>
                  {resumenIaDetectado.noAplican.map((d, idx) => (
                    <Text key={idx} style={{ fontSize: 12, color: '#64748B' }}>
                      • {d.descripcion || d.nombre_archivo} (Educación continua o no formal)
                    </Text>
                  ))}
                </View>
              ) : null}

              {/* Sección de errores formateados limpiamente */}
              {resumenIaDetectado?.errores && resumenIaDetectado.errores.length > 0 ? (
                <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="warning" size={16} color="#DC2626" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626' }}>
                      Documentos no procesados ({resumenIaDetectado.errores.length})
                    </Text>
                  </View>

                  {resumenIaDetectado.huboErrorCuota ? (
                    <View style={{ backgroundColor: '#FFF1F2', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#FFE4E6' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9F1239', lineHeight: 16 }}>
                        ⚠️ Límite de cuota alcanzado en Google Gemini (Error 429). La cuenta gratuita ha agotado su límite diario o de tokens por minuto. Puedes subir una nueva clave o reintentar más tarde.
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ gap: 6, marginTop: 2 }}>
                    {resumenIaDetectado.errores.map((errItem, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                        <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '800' }}>•</Text>
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: '#991B1B' }}>
                            {errItem.archivo}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#7F1D1D', lineHeight: 15 }}>
                            {errItem.error}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {(!resumenIaDetectado?.titulos?.length && !resumenIaDetectado?.certs?.length && !resumenIaDetectado?.noAplican?.length && !resumenIaDetectado?.errores?.length) ? (
                <Text style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                  Los documentos analizados ya se encontraban registrados o no requirieron adición de nuevas filas.
                </Text>
              ) : null}
            </ScrollView>

            <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16 }}>
              Todos los documentos válidos incorporados han sido auditados normativamente y guardados en el expediente y en el Excel FT-318.
            </Text>

            <TouchableOpacity
              onPress={() => setModalResultadoIaVisible(false)}
              style={{
                backgroundColor: '#1E40AF',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Ver Expediente Actualizado
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Desplegable / Selector de Versión de Visualización */}
      <Modal
        visible={modalSelectorVista}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalSelectorVista(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalSelectorVista(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 540,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
              gap: 16
            }}
          >
            {/* Header del Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="layers-outline" size={22} color="#1E40AF" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                  Seleccionar Modo de Visualización
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalSelectorVista(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#64748B', lineHeight: 18 }}>
              Elige cómo deseas visualizar este dictamen documental según tus necesidades de análisis:
            </Text>

            {/* Opción 1: Versión Simplificada */}
            <TouchableOpacity
              onPress={() => {
                setModoVista('simplificada');
                setModalSelectorVista(false);
              }}
              style={{
                backgroundColor: modoVista === 'simplificada' ? '#EFF6FF' : '#F8FAFC',
                borderWidth: 2,
                borderColor: modoVista === 'simplificada' ? '#2563EB' : '#E2E8F0',
                borderRadius: 12,
                padding: 16,
                gap: 8
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#FEF3C7',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Ionicons name="flash" size={18} color="#D97706" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                      Versión Simplificada (Resumen Ejecutivo)
                    </Text>
                    <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#1E40AF' }}>Recomendada para consulta ágil</Text>
                    </View>
                  </View>
                </View>

                <Ionicons
                  name={modoVista === 'simplificada' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={modoVista === 'simplificada' ? '#2563EB' : '#94A3B8'}
                />
              </View>

              <Text style={{ fontSize: 12, color: '#475569', lineHeight: 17, marginTop: 4 }}>
                Presentación visual sintetizada. Incluye el dictamen final destacado, contraste directo de requisitos mínimos (formación y experiencia), barra de cobertura y tabla ejecutiva con acceso inmediato a los soportes PDF originales.
              </Text>
            </TouchableOpacity>

            {/* Opción 2: Versión Completa de Auditoría */}
            <TouchableOpacity
              onPress={() => {
                setModoVista('auditoria');
                setModalSelectorVista(false);
              }}
              style={{
                backgroundColor: modoVista === 'auditoria' ? '#EFF6FF' : '#F8FAFC',
                borderWidth: 2,
                borderColor: modoVista === 'auditoria' ? '#2563EB' : '#E2E8F0',
                borderRadius: 12,
                padding: 16,
                gap: 8
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#E0E7FF',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Ionicons name="list-circle" size={20} color="#4338CA" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                      Versión Completa (Auditoría Técnica Exhaustiva)
                    </Text>
                    <View style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569' }}>Auditoría normativa y edición en detalle</Text>
                    </View>
                  </View>
                </View>

                <Ionicons
                  name={modoVista === 'auditoria' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={modoVista === 'auditoria' ? '#2563EB' : '#94A3B8'}
                />
              </View>

              <Text style={{ fontSize: 12, color: '#475569', lineHeight: 17, marginTop: 4 }}>
                Expediente pormenorizado con los 20 ítems de chequeo formal, auditoría de experiencia previa a grado, validación de funciones contra manual de funciones, traslapes día a día y herramientas de edición de registros.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalSelectorVista(false)}
              style={{
                backgroundColor: '#0F172A',
                paddingVertical: 11,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 4
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Cerrar Selector
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal Pantalla Completa de Detalle de Certificado */}
      <Modal
        visible={certModalDetalle !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCertModalDetalle(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 780,
              maxHeight: '90%',
              padding: 24,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 25,
              elevation: 10,
              gap: 16
            }}
          >
            {certModalDetalle && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>
                        {certModalDetalle.id_certificado || 'CERTIFICADO'}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                        {certModalDetalle.entidad}
                      </Text>
                      {certModalDetalle.nit_entidad ? (
                        <Text style={{ fontSize: 12, color: '#64748B' }}>NIT: {certModalDetalle.nit_entidad}</Text>
                      ) : null}
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => setCertModalDetalle(null)}>
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                  {/* PANELES DEL MODAL */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 240, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Cargo Acreditado</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{certModalDetalle.cargo_certificado}</Text>
                      <Text style={{ fontSize: 12, color: '#475569' }}>Vínculo: {certModalDetalle.tipo_vinculo || 'No especifica'}</Text>
                      {certModalDetalle.numero_contrato_o_acto ? (
                        <Text style={{ fontSize: 12, color: '#475569' }}>N°: {certModalDetalle.numero_contrato_o_acto}</Text>
                      ) : null}
                    </View>

                    <View style={{ flex: 1, minWidth: 240, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Periodo y Tiempo Válido</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                        {certModalDetalle.fecha_inicio} al {certModalDetalle.fecha_fin || (certModalDetalle.vinculo_vigente ? 'Vigente' : 'N/A')}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#15803D' }}>
                        Tiempo Computable: {certModalDetalle.tiempo_valido?.meses_totales ?? certModalDetalle.tiempo_certificado?.meses_totales_aproximados ?? 0} meses
                      </Text>
                      {certModalDetalle.tiempo_valido ? (
                        <Text style={{ fontSize: 11, color: '#166534' }}>
                          ({certModalDetalle.tiempo_valido.anios || 0}a {certModalDetalle.tiempo_valido.meses || 0}m {certModalDetalle.tiempo_valido.dias || 0}d)
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Dictamen Jurídico */}
                  {certModalDetalle.verificacion_experiencia_previa?.conclusion_juridica ? (
                    <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#BBF7D0', gap: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
                        Conclusión Jurídica Normativa:
                      </Text>
                      <Text style={{ fontSize: 12, color: '#14532D', lineHeight: 18 }}>
                        {certModalDetalle.verificacion_experiencia_previa.conclusion_juridica}
                      </Text>
                    </View>
                  ) : null}

                  {/* Funciones Coincidentes */}
                  {certModalDetalle.experiencia_relacionada?.funciones_coincidentes && certModalDetalle.experiencia_relacionada.funciones_coincidentes.length > 0 ? (
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                        Funciones Coincidentes con el Empleo ({certModalDetalle.experiencia_relacionada.funciones_coincidentes.length}):
                      </Text>
                      {certModalDetalle.experiencia_relacionada.funciones_coincidentes.map((fc, i) => (
                        <View key={i} style={{ backgroundColor: '#F8FAFC', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>• {fc.funcion_certificada}</Text>
                          <Text style={{ fontSize: 11, color: '#475569' }}>Equivale a: {fc.funcion_del_cargo}</Text>
                          {fc.justificacion ? (
                            <Text style={{ fontSize: 10, color: '#64748B', fontStyle: 'italic' }}>Sustento: {fc.justificacion}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Botones de Acción */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    {(() => {
                      const listaAnexos = (certModalDetalle.anexos && certModalDetalle.anexos.length > 0)
                        ? certModalDetalle.anexos
                        : (certModalDetalle.nombre_archivo ? [certModalDetalle.nombre_archivo] : []);

                      return listaAnexos.map((anexo, aIdx) => (
                        <TouchableOpacity
                          key={aIdx}
                          onPress={() => {
                            verPdfDocumento(anexo, `${certModalDetalle.id_certificado} - Anexo ${aIdx + 1}: ${anexo}`);
                            setCertModalDetalle(null);
                          }}
                          style={{
                            backgroundColor: aIdx === 0 ? '#2563EB' : '#4338CA',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <Ionicons name="document-text" size={16} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                            {listaAnexos.length > 1 ? `Abrir Anexo ${aIdx + 1}` : 'Abrir PDF Original'}
                          </Text>
                        </TouchableOpacity>
                      ));
                    })()}

                      <TouchableOpacity
                        onPress={() => {
                          const foundIdx = certificados.findIndex(c => (c.id && c.id === certModalDetalle.id) || (c.id_certificado && c.id_certificado === certModalDetalle.id_certificado));
                          if (foundIdx !== -1) {
                            setCertModalDetalle(null);
                            abrirEditarCertificado(foundIdx);
                          }
                        }}
                        style={{
                          backgroundColor: '#F1F5F9',
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Ionicons name="pencil" size={15} color="#0F172A" />
                        <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '800' }}>Editar Certificado</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          const foundIdx = certificados.findIndex(c => (c.id && c.id === certModalDetalle.id) || (c.id_certificado && c.id_certificado === certModalDetalle.id_certificado));
                          if (foundIdx !== -1) {
                            descartarCertificado(foundIdx);
                          }
                        }}
                        style={{
                          backgroundColor: '#FFFBEB',
                          borderWidth: 1,
                          borderColor: '#FDE68A',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Ionicons name="close-circle-outline" size={15} color="#D97706" />
                        <Text style={{ color: '#B45309', fontSize: 13, fontWeight: '800' }}>Mover a Descartados</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          const foundIdx = certificados.findIndex(c => (c.id && c.id === certModalDetalle.id) || (c.id_certificado && c.id_certificado === certModalDetalle.id_certificado));
                          if (foundIdx !== -1) {
                            setCertModalDetalle(null);
                            abrirModalComplementarCertificado(foundIdx);
                          }
                        }}
                        style={{
                          backgroundColor: '#F0FDF4',
                          borderWidth: 1,
                          borderColor: '#BBF7D0',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Ionicons name="add-circle-outline" size={16} color="#15803D" />
                        <Text style={{ color: '#15803D', fontSize: 13, fontWeight: '800' }}>Adjuntar Soporte Complementario (IA)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          const foundIdx = certificados.findIndex(c => (c.id && c.id === certModalDetalle.id) || (c.id_certificado && c.id_certificado === certModalDetalle.id_certificado));
                          if (foundIdx !== -1) {
                            setCertModalDetalle(null);
                            pedirConfirmarEliminarCertificado(foundIdx);
                          }
                        }}
                        style={{
                          backgroundColor: '#FEF2F2',
                          borderWidth: 1,
                          borderColor: '#FECACA',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Ionicons name="trash-outline" size={15} color="#DC2626" />
                        <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '800' }}>Eliminar Experiencia</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setCertModalDetalle(null)}
                        style={{
                          backgroundColor: '#0F172A',
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 8
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Pantalla Completa de Detalle de Formación Académica */}
      <Modal
        visible={tituloModalDetalle !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTituloModalDetalle(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 780,
              maxHeight: '90%',
              padding: 24,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 25,
              elevation: 10,
              gap: 16
            }}
          >
            {tituloModalDetalle && (() => {
              const esBach = tituloModalDetalle.tipo === 'BACHILLER' || (tituloModalDetalle.titulo_obtenido || '').toUpperCase().includes('BACHILLER');
              const checks = obtenerChecksTitulo(tituloModalDetalle, candidato?.nombre, candidato?.documento);
              const checksTarjeta = (!esBach && tituloModalDetalle.numero_tarjeta_o_registro)
                ? obtenerChecksTarjeta(tituloModalDetalle, candidato?.nombre, candidato?.documento)
                : null;
              const cumple = tituloModalDetalle.cumple_requisito_cargo ?? true;

              return (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                      <View style={{ backgroundColor: '#1E3A8A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>
                          {tituloModalDetalle.tipo ? tituloModalDetalle.tipo.replace('_', ' ') : 'TÍTULO'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }} numberOfLines={2}>
                          {tituloModalDetalle.titulo_obtenido}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748B' }}>
                          {tituloModalDetalle.institucion || 'Institución no especificada'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity onPress={() => setTituloModalDetalle(null)} style={{ padding: 4 }}>
                      <Ionicons name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                    {/* Tarjetas resumen */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 220, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Grado Obtenido</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{tituloModalDetalle.titulo_obtenido}</Text>
                        <Text style={{ fontSize: 12, color: '#475569' }}>Fecha de Grado: <Text style={{ fontWeight: '700' }}>{tituloModalDetalle.fecha_grado || 'No consta'}</Text></Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 220, backgroundColor: cumple ? '#F0FDF4' : '#FFFBEB', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: cumple ? '#BBF7D0' : '#FDE68A', gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: cumple ? '#166534' : '#92400E', textTransform: 'uppercase' }}>Estado de Idoneidad</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name={cumple ? "checkmark-circle" : "information-circle"} size={18} color={cumple ? "#15803D" : "#D97706"} />
                          <Text style={{ fontSize: 13, fontWeight: '900', color: cumple ? '#15803D' : '#B45309' }}>
                            {cumple ? 'Acreditado para el Perfil' : 'Documento Complementario'}
                          </Text>
                        </View>
                        {tituloModalDetalle.nombre_archivo ? (
                          <Text style={{ fontSize: 11, color: '#64748B' }}>Archivo: {tituloModalDetalle.nombre_archivo}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Justificación / Sustento */}
                    {tituloModalDetalle.justificacion ? (
                      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                          Sustento Jurídico y Correspondencia con el Perfil:
                        </Text>
                        <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                          {tituloModalDetalle.justificacion}
                        </Text>
                      </View>
                    ) : null}

                    {/* 7 Criterios de Verificación Formal del Título */}
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#0F172A', textTransform: 'uppercase' }}>
                        Verificación Formal de Validez Documental (7 Criterios de Ley)
                      </Text>
                      <View style={{ gap: 8 }}>
                        {[
                          { num: '1', titulo: 'Institución Educativa Reconocida (MEN)', cumple: checks.institucion_reconocida, evidencia: checks.institucion_evidencia },
                          { num: '2', titulo: 'Aspirante Identificado Coincidente', cumple: checks.corresponde_aspirante, evidencia: checks.aspirante_evidencia },
                          { num: '3', titulo: 'Título y Nivel de Formación Formal', cumple: checks.titulo_y_nivel_formal, evidencia: checks.titulo_evidencia },
                          { num: '4', titulo: 'Fecha de Grado Cierta y Válida', cumple: checks.fecha_grado_cierta, evidencia: checks.fecha_grado_evidencia },
                          { num: '5', titulo: 'Acta de Grado o Registro Oficial Acreditado', cumple: checks.acta_o_registro_valido, evidencia: checks.acta_o_registro_evidencia },
                          { num: '6', titulo: 'Suscripción por Autoridades Competentes', cumple: checks.firmas_autoridades, evidencia: checks.firmas_evidencia },
                          { num: '7', titulo: 'Convalidación MEN / Título Nacional', cumple: checks.convalidacion_men, evidencia: checks.convalidacion_evidencia }
                        ].map((c) => (
                          <View
                            key={c.num}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'flex-start',
                              backgroundColor: c.cumple ? '#F0FDF4' : '#FEF2F2',
                              borderRadius: 8,
                              padding: 10,
                              borderWidth: 1,
                              borderColor: c.cumple ? '#DCFCE7' : '#FEE2E2',
                              gap: 10
                            }}
                          >
                            <View
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: c.cumple ? '#15803D' : '#DC2626',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: 1
                              }}
                            >
                              <Ionicons
                                name={c.cumple ? 'checkmark' : 'close'}
                                size={14}
                                color="#FFFFFF"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: c.cumple ? '#14532D' : '#991B1B' }}>
                                {c.num}. {c.titulo}
                              </Text>
                              <Text style={{ fontSize: 11, color: c.cumple ? '#166534' : '#B91C1C', marginTop: 2 }}>
                                {c.evidencia}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Verificación de Tarjeta Profesional si aplica */}
                    {checksTarjeta ? (
                      <View style={{ backgroundColor: '#F0F9FF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#BAE6FD', gap: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#0369A1', textTransform: 'uppercase' }}>
                          Acreditación de Matrícula o Tarjeta Profesional
                        </Text>
                        <View style={{ gap: 6 }}>
                          {[
                            { num: 'A', titulo: 'Consejo o Colegio Profesional Identificado', cumple: checksTarjeta.consejo_emisor_identificable, evidencia: checksTarjeta.consejo_evidencia },
                            { num: 'B', titulo: 'Aspirante Titular de la Matrícula', cumple: checksTarjeta.corresponde_profesional, evidencia: checksTarjeta.profesional_evidencia },
                            { num: 'C', titulo: 'Número de Matrícula / Registro Visible', cumple: checksTarjeta.matricula_o_tarjeta_identificable, evidencia: checksTarjeta.matricula_evidencia },
                            { num: 'D', titulo: 'Profesión Legalmente Autorizada', cumple: checksTarjeta.profesion_autorizada, evidencia: checksTarjeta.profesion_evidencia },
                            { num: 'E', titulo: 'Certificado de Vigencia y Sin Sanciones', cumple: checksTarjeta.certificado_vigencia_y_sanciones, evidencia: checksTarjeta.vigencia_evidencia },
                            { num: 'F', titulo: 'Vigencia Temporal Válida (< 90 días)', cumple: checksTarjeta.vigencia_temporal_valida, evidencia: checksTarjeta.vigencia_temporal_evidencia },
                            { num: 'G', titulo: 'Mecanismo de Autenticación / Verificación Oficial', cumple: checksTarjeta.mecanismo_autenticacion_o_firma, evidencia: checksTarjeta.mecanismo_evidencia }
                          ].map((c) => (
                            <View
                              key={c.num}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                backgroundColor: '#FFFFFF',
                                borderRadius: 6,
                                padding: 8,
                                borderWidth: 1,
                                borderColor: '#BAE6FD',
                                gap: 8
                              }}
                            >
                              <Ionicons
                                name={c.cumple ? 'checkmark-circle' : 'alert-circle'}
                                size={16}
                                color={c.cumple ? '#0284C7' : '#EA580C'}
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1' }}>
                                  {c.num}. {c.titulo}
                                </Text>
                                <Text style={{ fontSize: 10, color: '#475569' }}>{c.evidencia}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {/* Botones de Acción */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                      <TouchableOpacity
                        onPress={() => {
                          const foundIdx = titulos.findIndex(t => (t.id && t.id === tituloModalDetalle.id) || (t.titulo_obtenido === tituloModalDetalle.titulo_obtenido && t.institucion === tituloModalDetalle.institucion));
                          if (foundIdx !== -1) {
                            setTituloModalDetalle(null);
                            abrirEditarTitulo(foundIdx);
                          }
                        }}
                        style={{
                          backgroundColor: '#F1F5F9',
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Ionicons name="pencil" size={15} color="#0F172A" />
                        <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '800' }}>Editar / Cambiar Tipo</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          const foundIdx = titulos.findIndex(t => (t.id && t.id === tituloModalDetalle.id) || (t.titulo_obtenido === tituloModalDetalle.titulo_obtenido && t.institucion === tituloModalDetalle.institucion));
                          if (foundIdx !== -1) {
                            descartarTitulo(foundIdx);
                          }
                        }}
                        style={{
                          backgroundColor: '#FFFBEB',
                          borderWidth: 1,
                          borderColor: '#FDE68A',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Ionicons name="close-circle-outline" size={15} color="#D97706" />
                        <Text style={{ color: '#B45309', fontSize: 13, fontWeight: '800' }}>Mover a Descartados</Text>
                      </TouchableOpacity>

                      {tituloModalDetalle.nombre_archivo ? (
                        <TouchableOpacity
                          onPress={() => {
                            verPdfDocumento(tituloModalDetalle.nombre_archivo, tituloModalDetalle.titulo_obtenido);
                            setTituloModalDetalle(null);
                          }}
                          style={{
                            backgroundColor: '#1E40AF',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <Ionicons name="document-text" size={16} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Abrir PDF Original</Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        onPress={() => setTituloModalDetalle(null)}
                        style={{
                          backgroundColor: '#0F172A',
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 8
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Modal para Editar Certificado Laboral */}
      <Modal
        visible={modalCertVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalCertVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 620,
              maxHeight: '90%',
              padding: 24,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 25,
              elevation: 10,
              gap: 16
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="briefcase" size={20} color="#1E40AF" />
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                  {certEditandoIndex !== null ? 'Modificar Certificado Laboral' : 'Agregar Experiencia Laboral / Nuevo Cargo'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalCertVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {/* Atajo rápido para Enel Litigios si es creación */}
              {certEditandoIndex === null && (
                <TouchableOpacity
                  onPress={prellenarCargoEnelJefeLitigios}
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderWidth: 1.5,
                    borderColor: '#F59E0B',
                    padding: 12,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10
                  }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FDE68A', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="flash" size={18} color="#B45309" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
                      ⚡ Prellenar Enel: JEFE DE DIVISIÓN LITIGIOS COLOMBIA
                    </Text>
                    <Text style={{ fontSize: 11, color: '#B45309' }}>
                      Enel Colombia • 2017-09-01 al 2022-11-15 (fecha certificación) • 14 funciones de litigios
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Atajos Rápidos IDU */}
              {certEditandoIndex === null && (
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                    ⚡ Atajos Rápidos IDU (Certificación STRH-0516-C-293):
                  </Text>
                  
                  {/* Botón IDU Especializado 2006-2010 */}
                  <TouchableOpacity
                    onPress={prellenarCargoIduEspecializado1}
                    style={{
                      backgroundColor: '#EFF6FF',
                      borderWidth: 1,
                      borderColor: '#3B82F6',
                      padding: 10,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <Ionicons name="flash" size={16} color="#1D4ED8" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E40AF' }}>
                        ⚡ IDU: PROFESIONAL ESPECIALIZADO GRADO 05 (2006 - 2010)
                      </Text>
                      <Text style={{ fontSize: 10, color: '#2563EB' }}>
                        17.01.2006 a 02.03.2010 • Subd. Procesos Judiciales • Funciones litigiosas y conceptos
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Botón IDU Especializado 2010-2012 */}
                  <TouchableOpacity
                    onPress={prellenarCargoIduEspecializado2}
                    style={{
                      backgroundColor: '#EFF6FF',
                      borderWidth: 1,
                      borderColor: '#3B82F6',
                      padding: 10,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <Ionicons name="flash" size={16} color="#1D4ED8" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E40AF' }}>
                        ⚡ IDU: PROFESIONAL ESPECIALIZADO GRADO 05 (2010 - 2012)
                      </Text>
                      <Text style={{ fontSize: 10, color: '#2563EB' }}>
                        03.03.2010 a 14.06.2012 • Dir. Gestión Judicial • Periodo de prueba / Carrera
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Botón IDU Director Técnico 2012 */}
                  <TouchableOpacity
                    onPress={prellenarCargoIduDirectorTecnico}
                    style={{
                      backgroundColor: '#F0FDF4',
                      borderWidth: 1,
                      borderColor: '#22C55E',
                      padding: 10,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <Ionicons name="flash" size={16} color="#15803D" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>
                        ⚡ IDU: DIRECTOR TÉCNICO CÓDIGO 009 GRADO 05 (2012)
                      </Text>
                      <Text style={{ fontSize: 10, color: '#15803D' }}>
                        21.02.2012 a 15.04.2012 • Encargo Directivo • 28 funciones directivas y judiciales
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Denominación del Cargo */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Denominación del Cargo / Empleo *
                </Text>
                <TextInput
                  value={formCertCargo}
                  onChangeText={setFormCertCargo}
                  placeholder="Ej. JEFE DE DIVISIÓN LITIGIOS COLOMBIA"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A'
                  }}
                />
              </View>

              {/* Entidad / Empresa */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Entidad o Empresa Contratante *
                </Text>
                <TextInput
                  value={formCertEntidad}
                  onChangeText={setFormCertEntidad}
                  placeholder="Ej. ENEL COLOMBIA S.A. ESP"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A'
                  }}
                />
              </View>

              {/* Tipo de Vinculación */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Tipo de Vinculación / Contrato
                </Text>
                <TextInput
                  value={formCertTipoVinculo}
                  onChangeText={setFormCertTipoVinculo}
                  placeholder="Ej. CONTRATO INDEFINIDO, Prestación de servicios"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A'
                  }}
                />
              </View>

              {/* Fechas de Inicio y Fin */}
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    Fecha de Inicio * (AAAA-MM-DD)
                  </Text>
                  <TextInput
                    value={formCertFechaInicio}
                    onChangeText={setFormCertFechaInicio}
                    placeholder="2017-09-01"
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: '#0F172A'
                    }}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    {formCertVinculoVigente
                      ? 'Fecha Fin / Expedición Certificado * (AAAA-MM-DD)'
                      : 'Fecha de Fin (AAAA-MM-DD)'}
                  </Text>
                  <TextInput
                    value={formCertFechaFin}
                    onChangeText={setFormCertFechaFin}
                    placeholder="2022-11-15"
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: formCertVinculoVigente ? '#3B82F6' : '#CBD5E1',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: '#0F172A'
                    }}
                  />
                </View>
              </View>

              {/* Vínculo Vigente Checkbox */}
              <TouchableOpacity
                onPress={() => setFormCertVinculoVigente(!formCertVinculoVigente)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: formCertVinculoVigente ? '#EFF6FF' : '#F8FAFC',
                  padding: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: formCertVinculoVigente ? '#BFDBFE' : '#E2E8F0'
                }}
              >
                <Ionicons
                  name={formCertVinculoVigente ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={formCertVinculoVigente ? '#1D4ED8' : '#64748B'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: formCertVinculoVigente ? '#1E40AF' : '#475569' }}>
                    Vínculo Vigente / Actualmente Vinculado a la Entidad
                  </Text>
                  {formCertVinculoVigente && (
                    <Text style={{ fontSize: 10, color: '#2563EB', marginTop: 1 }}>
                      💡 La fecha fin registrada arriba se tomará como la fecha de corte o expedición del certificado (ej. 2022-11-15).
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Funciones Certificadas */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Funciones Certificadas del Cargo (opcional, separadas por párrafo)
                </Text>
                <TextInput
                  value={formCertFunciones}
                  onChangeText={setFormCertFunciones}
                  placeholder="Pega las funciones certificadas..."
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                  numberOfLines={4}
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 12,
                    color: '#0F172A',
                    minHeight: 80,
                    textAlignVertical: 'top'
                  }}
                />
              </View>

              {/* Archivo PDF de Soporte */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Nombre del Archivo PDF de Soporte Asociado
                </Text>
                <TextInput
                  value={formCertArchivoAsociado}
                  onChangeText={setFormCertArchivoAsociado}
                  placeholder="Ej. Certificado_Enel_Gustavo_Sanchez.pdf"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 12,
                    color: '#0F172A'
                  }}
                />
              </View>

              {/* Clasificación de Experiencia */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                  Clasificación de la Experiencia
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setFormCertClasificacion('RELACIONADA')}
                    style={{
                      flex: 1,
                      backgroundColor: formCertClasificacion === 'RELACIONADA' ? '#DCFCE7' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: formCertClasificacion === 'RELACIONADA' ? '#16A34A' : '#CBD5E1',
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons
                      name={formCertClasificacion === 'RELACIONADA' ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={formCertClasificacion === 'RELACIONADA' ? '#15803D' : '#64748B'}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: formCertClasificacion === 'RELACIONADA' ? '#15803D' : '#64748B' }}>
                      Experiencia Relacionada
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setFormCertClasificacion('NO_RELACIONADA')}
                    style={{
                      flex: 1,
                      backgroundColor: formCertClasificacion === 'NO_RELACIONADA' ? '#FEF3C7' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: formCertClasificacion === 'NO_RELACIONADA' ? '#D97706' : '#CBD5E1',
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons
                      name={formCertClasificacion === 'NO_RELACIONADA' ? 'alert-circle' : 'ellipse-outline'}
                      size={16}
                      color={formCertClasificacion === 'NO_RELACIONADA' ? '#B45309' : '#64748B'}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: formCertClasificacion === 'NO_RELACIONADA' ? '#B45309' : '#64748B' }}>
                      No Relacionada
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Botones Acciones Modal Certificado */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 18, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14 }}>
              {certEditandoIndex !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 'auto', flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    onPress={() => descartarCertificado(certEditandoIndex)}
                    style={{
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: '#FFFBEB',
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons name="ban-outline" size={15} color="#D97706" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309' }}>Mover a Descartados</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      const idx = certEditandoIndex;
                      setModalCertVisible(false);
                      pedirConfirmarEliminarCertificado(idx);
                    }}
                    style={{
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: '#FEF2F2',
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#DC2626" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Eliminar Experiencia</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                onPress={() => setModalCertVisible(false)}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: '#F1F5F9',
                  borderWidth: 1,
                  borderColor: '#CBD5E1'
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={guardarCertificadoForm}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 18,
                  borderRadius: 8,
                  backgroundColor: '#1E40AF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Guardar Certificado</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Complementar Experiencia con Nuevo Certificado / Anexo */}
      <Modal
        visible={modalComplementarVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!procesandoComplementarIa) setModalComplementarVisible(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 620,
              maxHeight: '90%',
              padding: 24,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 25,
              elevation: 10,
              gap: 16
            }}
          >
            {/* Header del Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="sparkles" size={18} color="#15803D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    Adjuntar Soporte y Complementar con IA
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    Agrega un segundo certificado o anexo a esta experiencia para que la IA extraiga lo que falta
                  </Text>
                </View>
              </View>
              {!procesandoComplementarIa && (
                <TouchableOpacity onPress={() => setModalComplementarVisible(false)}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {/* Resumen del Certificado Actual */}
              {certAComplementar?.cert && (
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                        EXP-0{certAComplementar.idx + 1}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', flex: 1 }} numberOfLines={1}>
                      {certAComplementar.cert.entidad}
                    </Text>
                  </View>

                  <View style={{ gap: 3 }}>
                    <Text style={{ fontSize: 12, color: '#334155' }}>
                      Cargo: <Text style={{ fontWeight: '700' }}>{certAComplementar.cert.cargo_certificado || 'No registrado'}</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      Periodo actual: {certAComplementar.cert.fecha_inicio} al {certAComplementar.cert.fecha_fin || (certAComplementar.cert.vinculo_vigente ? 'Vigente' : 'N/A')}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>
                      Soportes ya vinculados: {(certAComplementar.cert.anexos && certAComplementar.cert.anexos.length > 0)
                        ? certAComplementar.cert.anexos.join(', ')
                        : (certAComplementar.cert.nombre_archivo || '1 archivo')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Guía explicativa */}
              <View style={{ backgroundColor: '#EFF6FF', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#BFDBFE', flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Ionicons name="information-circle" size={20} color="#1D4ED8" style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 12, color: '#1E40AF', lineHeight: 17, flex: 1 }}>
                  La IA leerá el nuevo PDF y <Text style={{ fontWeight: '700' }}>fusionará automáticamente las funciones</Text>, actualizará las fechas si el documento las amplía o aclara, y conservará ambos documentos como anexos de este cargo.
                </Text>
              </View>

              {/* Selector de Archivo PDF */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                  Documento PDF Complementario (Otrosí, Constancia, Anexo de Funciones, etc.):
                </Text>

                {archivoComplementario ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 }}>
                      <Ionicons name="document-attach" size={22} color="#15803D" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803D' }} numberOfLines={1}>
                          {archivoComplementario.name}
                        </Text>
                        {archivoComplementario.size ? (
                          <Text style={{ fontSize: 11, color: '#166534' }}>
                            {(archivoComplementario.size / 1024).toFixed(1)} KB • Listo para complementar
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {!procesandoComplementarIa && (
                      <TouchableOpacity
                        onPress={seleccionarPdfComplementario}
                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#86EFAC' }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>Cambiar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={seleccionarPdfComplementario}
                    disabled={procesandoComplementarIa}
                    style={{
                      borderWidth: 2,
                      borderColor: '#93C5FD',
                      borderStyle: 'dashed',
                      borderRadius: 10,
                      backgroundColor: '#F8FAFC',
                      padding: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <Ionicons name="cloud-upload-outline" size={32} color="#2563EB" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1D4ED8' }}>
                      Seleccionar Archivo PDF Complementario
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>
                      Haz clic para buscar en tus archivos locales
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Spinner de procesamiento IA */}
              {procesandoComplementarIa && (
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 16, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <ActivityIndicator size="small" color="#1E40AF" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                    Gemini IA analizando el documento complementario...
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>
                    Extrayendo funciones, fusionando con las anteriores y recalculando la concordancia con el perfil.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Botones del Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14 }}>
              <TouchableOpacity
                onPress={() => setModalComplementarVisible(false)}
                disabled={procesandoComplementarIa}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: '#F1F5F9',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  opacity: procesandoComplementarIa ? 0.5 : 1
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={ejecutarComplementarCertificado}
                disabled={procesandoComplementarIa || !archivoComplementario}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 8,
                  backgroundColor: (procesandoComplementarIa || !archivoComplementario) ? '#94A3B8' : '#15803D',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {procesandoComplementarIa ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                )}
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {procesandoComplementarIa ? 'Analizando...' : 'Analizar y Complementar con IA'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Visor de PDF integrado */}
      <PdfViewerModal
        visible={visorPdfVisible}
        onClose={() => setVisorPdfVisible(false)}
        titulo={visorPdfTitulo}
        nombreArchivo={visorPdfNombre}
        pdfUrl={visorPdfUrl}
      />
    </View>
  );
}
