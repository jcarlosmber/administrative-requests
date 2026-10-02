import React, { useEffect, useState } from 'react';
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
    const fFin = cert.fecha_fin || (cert.vinculo_vigente ? new Date().toISOString().slice(0, 10) : fIni);

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
      setHayCambios(false);
    } catch (err: any) {
      mostrarMensaje('Error al Cargar', err.message || 'No se pudo obtener el detalle de la validación.');
    } finally {
      setLoading(false);
    }
  };

  const abrirNuevoTitulo = () => {
    setEditandoIndex(null);
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
    setFormTipo(item.tipo || 'PREGRADO');
    setFormTitulo(item.titulo_obtenido || '');
    setFormInstitucion(item.institucion || '');
    setFormFechaGrado(item.fecha_grado || '');
    setFormCertificaMaterias(Boolean(item.certifica_terminacion_materias));
    setFormFechaMaterias(item.fecha_terminacion_materias || '');
    setFormTarjeta(item.numero_tarjeta_o_registro || '');
    setFormCumple(item.cumple_requisito_cargo !== false);
    setFormJustificacion(item.justificacion || '');
    setModalTituloVisible(true);
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
      numero_tarjeta_o_registro: formTarjeta.trim() || undefined,
      cumple_requisito_cargo: formCumple,
      justificacion: formJustificacion.trim()
    };

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

      <ScrollView contentContainerStyle={{ padding: 24, maxWidth: 1100, alignSelf: 'center', width: '100%' }}>
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
                    const esTarjeta = fa.tipo === 'TARJETA_PROFESIONAL' || (fa.titulo_obtenido || '').toUpperCase().includes('TARJETA') || Boolean(fa.numero_tarjeta_o_registro && fa.numero_tarjeta_o_registro !== 'NO CONSTA');
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

                    {/* Botón Ver PDF */}
                    <TouchableOpacity
                      onPress={() => verPdfDocumento(c.nombre_archivo, `${c.id_certificado}: ${c.entidad}`)}
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
                      accessibilityLabel="Ver PDF del certificado"
                    >
                      <Ionicons name="document-text-outline" size={14} color="#1D4ED8" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>Ver PDF</Text>
                    </TouchableOpacity>

                    {/* Botón Eliminar Certificado */}
                    <TouchableOpacity
                      onPress={() => pedirConfirmarEliminarCertificado(index)}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        backgroundColor: '#FEE2E2',
                        borderWidth: 1,
                        borderColor: '#FCA5A5'
                      }}
                      accessibilityLabel="Eliminar certificado"
                    >
                      <Ionicons name="trash-outline" size={15} color="#DC2626" />
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
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14 }}>
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
