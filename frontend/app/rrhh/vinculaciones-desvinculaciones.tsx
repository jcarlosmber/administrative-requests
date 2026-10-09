import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { API_URL } from '../../lib/supabase';
import mockPlazasData from '../../lib/plantaMockData.json';
import { nominaService, PlazaNomina, PersonaPerno } from '../../lib/nominaService';
import {
  secopService,
  ContratoSecop,
  ResultadoConsultaSecop,
  ResumenNormativoSecop,
  ResumenFinancieroSecop,
} from '../../lib/secopService';
import { ingresosService } from '../../lib/ingresosService';
import { useMarcoRRHH } from '../../components/rrhh/MarcoRRHH';

// ============================================================================
// SISTEMA DE DISEÑO INSTITUCIONAL NAVY + SLATE (IDÉNTICO A NÓMINA)
// ============================================================================
const THEME = {
  // Colores de marca
  marca900: '#0D2A48',
  marca800: '#123A63',
  marca700: '#174A7E',
  marca600: '#1F5A96',
  marca100: '#D6E4F4',
  marca50: '#EEF4FB',
  marcaHover: 'rgba(238, 244, 251, 0.75)',

  // Escala de grises Slate
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  white: '#FFFFFF',

  // Semáforo y estados (badges institucionales)
  emeraldBg: '#ECFDF5',
  emeraldText: '#047857',
  emeraldRing: 'rgba(5, 150, 105, 0.25)',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald800: '#065F46',
  emerald100: '#D1FAE5',

  roseBg: '#FFF1F2',
  roseText: '#BE123C',
  roseRing: 'rgba(225, 29, 72, 0.25)',
  rose600: '#E11D48',
  rose700: '#BE123C',
  rose800: '#9F1239',
  rose100: '#FFE4E6',

  amberBg: '#FFFBEB',
  amberText: '#92400E',
  amberRing: 'rgba(217, 119, 6, 0.25)',

  skyBg: '#F0F9FF',
  skyText: '#0369A1',
  skyRing: 'rgba(2, 132, 199, 0.25)',

  slateBadgeBg: '#F1F5F9',
  slateBadgeText: '#475569',
  slateBadgeRing: 'rgba(100, 116, 139, 0.25)',
};

// ============================================================================
// TIPOS Y MODELOS DE DATOS (Procedimientos PR-145, PR-137 y PR-074)
// ============================================================================

export type TipoProceso = 'DESVINCULACION' | 'VINCULACION';
// ============================================================================
// CONFIGURACIÓN Y DIFERENCIACIÓN DE MODALIDADES DE VINCULACIÓN
// ============================================================================
export interface InfoModalidadConfig {
  titulo: string;
  subtitulo: string;
  badgeTexto: string;
  icono: any;
  colorTexto: string;
  colorBg: string;
  colorBorde: string;
  marcoLegal: string;
  descripcionFases: string;
  requisitoPrincipal: string;
  diferenciaClave: string;
}

export function obtenerInfoModalidad(
  m: ModalidadPersonal,
  tipo: TipoProceso = 'VINCULACION'
): InfoModalidadConfig {
  if (tipo === 'DESVINCULACION') {
    switch (m) {
      case 'CARRERA_ADMINISTRATIVA':
        return {
          titulo: 'Carrera Administrativa (Retiro)',
          subtitulo: 'Causales Taxativas de Retiro (Art. 41 Ley 909) / Reporte SIMO y Cancelación RPCA',
          badgeTexto: 'RETIRO DE CARRERA',
          icono: 'ribbon-outline',
          colorTexto: '#1e40af',
          colorBg: '#eff6ff',
          colorBorde: '#93c5fd',
          marcoLegal: 'Ley 909 de 2004, Arts. 41 y 44 • Decreto 1083 de 2015 • Ley 100 de 1993, Art. 33 • C-1037/2003 • Circular CNSC 011 de 2021',
          descripcionFases: 'Retiro por causales taxativas objetivas. Exige constatar causal idónea, inclusión previa en nómina pensional en retiro por pensión, acto motivado, entrega formal de cargo, examen médico de egreso, 4 paz y salvos, liquidación prestacional y reporte en SIMO 4.4 dentro de los 5 días con cancelación de RPCA.',
          requisitoPrincipal: 'Causal objetiva demostrada, inclusión en nómina de pensionados (si aplica) y reporte SIMO dentro de 5 días hábiles.',
          diferenciaClave: 'Servidor titular de derechos adquiridos de carrera. No procede remoción discrecional; en supresión de empleo goza de derecho preferencial a reincorporación o indemnización (Art. 44).',
        };
      case 'LIBRE_NOMBRAMIENTO':
        return {
          titulo: 'Libre Nombramiento y Remoción (Retiro)',
          subtitulo: 'Insubsistencia Discrecional / Renuncia / Entrega de Despacho (Ley 951/2005)',
          badgeTexto: 'RETIRO DIRECTIVO',
          icono: 'shield-outline',
          colorTexto: '#6b21a8',
          colorBg: '#faf5ff',
          colorBorde: '#d8b4fe',
          marcoLegal: 'Ley 909 de 2004, Art. 41 lit. a • Decreto 1083 de 2015 • Ley 951 de 2005 • Decreto Ley 1045 de 1978',
          descripcionFases: 'Retiro discrecional o por aceptación de renuncia. Exige verificar inexistencia de fuero de maternidad prevalente, resolución y comunicación formal, suscripción del Acta de Entrega de Despacho con remisión obligatoria a Control Interno dentro de 15 días hábiles (Ley 951/2005) y liquidación con prima técnica y gastos de representación.',
          requisitoPrincipal: 'Acta circunstanciada de entrega de despacho remitida a Control Interno (Ley 951/2005) y descargo patrimonial.',
          diferenciaClave: 'Remoción discrecional sin necesidad de motivación de fondo, sujeta al cumplimiento estricto del régimen de rendición de cuentas e informes de gestión.',
        };
      case 'PROVISIONALIDAD':
        return {
          titulo: 'Nombramiento Provisional (Retiro)',
          subtitulo: 'Motivación Expresa Obligatoria (SU-917/10) & Blindaje Retén Social (SU-087/22)',
          badgeTexto: 'RETIRO PROVISIONAL',
          icono: 'hourglass-outline',
          colorTexto: '#b45309',
          colorBg: '#fffbeb',
          colorBorde: '#fde68a',
          marcoLegal: 'Ley 909 de 2004, Art. 25 • Decreto 1083 de 2015, Art. 2.2.5.3.4 • Corte Constitucional: SU-917/2010, SU-440/2021 y SU-087/2022 • Circular Conjunta CNSC-DAFP 001/2020',
          descripcionFases: 'Desvinculación condicionada al mérito o causal objetiva. Exige verificación previa de retén social (prepensionados a menos de 3 años, condición de discapacidad o cabeza de familia), resolución con motivación fáctica y jurídica expresa individualizando el elegible de concurso que asume la plaza, recurso de reposición (Art. 74 CPACA), 4 paz y salvos, liquidación y cierre en SIMO.',
          requisitoPrincipal: 'Certificación técnica de verificación de retén social y motivación expresa individualizando la OPEC del concurso en la resolución.',
          diferenciaClave: 'Estabilidad laboral relativa transitoria. El retiro sin motivación expresa o desconociendo el retén social vicia el acto de nulidad y genera orden judicial de reintegro.',
        };
      case 'PRACTICANTE_JUDICANTE':
        return {
          titulo: 'Pasante / Judicante / Prácticas (Cierre)',
          subtitulo: 'Terminación Formativa / Retiro ARL / Certificación de Experiencia (Ley 2043/2020)',
          badgeTexto: 'CIERRE FORMATIVO',
          icono: 'school-outline',
          colorTexto: '#0e7490',
          colorBg: '#ecfeff',
          colorBorde: '#a5f3fc',
          marcoLegal: 'Ley 2043 de 2020, Art. 6 • Resolución 3546 de 2018 MinTrabajo • Decreto 055 de 2015 • Decreto 616 de 2021',
          descripcionFases: 'Culminación pedagógica y académica. NO genera resolución de retiro estatutario ni liquidación de prestaciones sociales. Exige informe final de actividades, evaluación aprobatoria del tutor institucional, retiro inmediato de ARL Positiva, cierre presupuestal del CRP en Bogdata y expedición de la Certificación Oficial con validez legal de experiencia profesional computable.',
          requisitoPrincipal: 'Informe final avalado por tutor, novedad de retiro de ARL y Certificación de Práctica firmada con validez de experiencia (Ley 2043/2020).',
          diferenciaClave: 'Vínculo estrictamente formativo y no laboral; no es empleado público y concluye con certificación computable como experiencia laboral/profesional.',
        };
      default:
        return {
          titulo: 'Desvinculación de Personal',
          subtitulo: 'Retiro y Cierre Administrativo',
          badgeTexto: 'DESVINCULACIÓN',
          icono: 'log-out-outline',
          colorTexto: '#1e40af',
          colorBg: '#eff6ff',
          colorBorde: '#93c5fd',
          marcoLegal: 'Ley 909 de 2004 • Decreto 1083 de 2015',
          descripcionFases: 'Procedimiento institucional de desvinculación.',
          requisitoPrincipal: 'Documento soporte y acto administrativo o constancia de cierre.',
          diferenciaClave: 'Depende del régimen constitucional de vinculación.',
        };
    }
  }

  // VINCULACIÓN (Por defecto)
  switch (m) {
    case 'CARRERA_ADMINISTRATIVA':
      return {
        titulo: 'Carrera Administrativa',
        subtitulo: 'Concurso de Méritos CNSC / Período de Prueba (6 Meses)',
        badgeTexto: 'CARRERA ADMINISTRATIVA',
        icono: 'ribbon-outline',
        colorTexto: '#1e40af', // Blue 800
        colorBg: '#eff6ff',   // Blue 50
        colorBorde: '#93c5fd', // Blue 300
        marcoLegal: 'Ley 909 de 2004, Art. 31 • Decreto 1083 de 2015, Art. 2.2.6.1 • Circular CNSC 011 de 2021',
        descripcionFases: 'Provisión definitiva obligatoria por mérito. Requiere Banco de Elegibles SIMO 4.0, autorización de Comisión de Personal, aviso a encargados, nombramiento en período de prueba por 6 meses y reporte ante la CNSC.',
        requisitoPrincipal: 'Posición meritoria en Lista de Elegibles en firme (SIMO 4.0) y autorización CNSC.',
        diferenciaClave: 'Adquiere estabilidad y derechos de carrera administrativa tras superar satisfactoriamente la evaluación del período de prueba (6 meses).',
      };
    case 'LIBRE_NOMBRAMIENTO':
      return {
        titulo: 'Libre Nombramiento y Remoción',
        subtitulo: 'Empleos de Dirección, Conducción y Confianza',
        badgeTexto: 'LIBRE NOMBRAMIENTO',
        icono: 'shield-outline',
        colorTexto: '#6b21a8', // Purple 800
        colorBg: '#faf5ff',   // Purple 50
        colorBorde: '#d8b4fe', // Purple 300
        marcoLegal: 'Ley 909 de 2004, Art. 5 • Acuerdo Distrital 782 de 2020 • Ley 2424 de 2024 (Paridad 50% Mujeres)',
        descripcionFases: 'Designación discrecional del nominador. Requiere validación técnica FT-318 IA, prueba de competencias gerenciales SEVCOM DASCD, publicación por 5 días en página web institucional y posesión con declaración Ley 2013.',
        requisitoPrincipal: 'Aprobación prueba SEVCOM DASCD, cumplimiento FT-318, 5 días de publicación en web y verificación cuota 50% mujeres.',
        diferenciaClave: 'Remoción discrecional por la autoridad nominadora sin necesidad de motivación de acto.',
      };
    case 'PROVISIONALIDAD':
      return {
        titulo: 'Nombramiento Provisional',
        subtitulo: 'Provisión Transitoria de Vacante de Carrera',
        badgeTexto: 'PROVISIONALIDAD',
        icono: 'hourglass-outline',
        colorTexto: '#b45309', // Amber 800
        colorBg: '#fffbeb',   // Amber 50
        colorBorde: '#fde68a', // Amber 300
        marcoLegal: 'Ley 909 de 2004, Art. 25 • Ley 1960 de 2019, Art. 1 • Circular Conjunta CNSC 003 de 2020',
        descripcionFases: 'Carácter estrictamente temporal. Requiere certificar ausencia de elegibles en SIMO, agotar y declarar desierto el encargo preferente a servidores con derechos de carrera, validación FT-318 y nombramiento motivado.',
        requisitoPrincipal: 'Certificación de no elegibles en SIMO y acta de encargo preferencial interno declarado desierto.',
        diferenciaClave: 'Estabilidad laboral relativa transitoria; el nombramiento cesa automáticamente cuando la CNSC provea la vacante por concurso o por calificación insatisfactoria.',
      };
    case 'PRACTICANTE_JUDICANTE':
      return {
        titulo: 'Pasante / Judicante / Prácticas',
        subtitulo: 'Formación Académica en Derecho y Áreas Afines (Ley 2043/2020)',
        badgeTexto: 'PASANTE / JUDICANTE',
        icono: 'school-outline',
        colorTexto: '#0e7490', // Cyan 800
        colorBg: '#ecfeff',   // Cyan 50
        colorBorde: '#a5f3fc', // Cyan 300
        marcoLegal: 'Ley 2043 de 2020 • Ley 552 de 1999 • Res. 3546 de 2018 MinTrabajo • Decreto 055 de 2015',
        descripcionFases: 'Modalidad pedagógica formativa. Requiere disponibilidad presupuestal (CDP), convenio con facultad de derecho/universidad, afiliación patronal a ARL, expedición de CRP en Bogdata y certificación para titulación.',
        requisitoPrincipal: 'Carta de presentación de la universidad, CDP de auxilio/ARL y tutor institucional asignado.',
        diferenciaClave: 'No genera relación laboral ni empleo público; es una vinculación formativa válida como experiencia profesional computable.',
      };
    default:
      return {
        titulo: 'Carrera Administrativa',
        subtitulo: 'Concurso de Méritos CNSC / Período de Prueba (6 Meses)',
        badgeTexto: 'CARRERA ADMINISTRATIVA',
        icono: 'ribbon-outline',
        colorTexto: '#1e40af',
        colorBg: '#eff6ff',
        colorBorde: '#93c5fd',
        marcoLegal: 'Ley 909 de 2004, Art. 31 • Decreto 1083 de 2015',
        descripcionFases: 'Provisión definitiva de empleos de carrera administrativa.',
        requisitoPrincipal: 'Posición meritoria en Lista de Elegibles en firme (SIMO 4.0).',
        diferenciaClave: 'Adquiere estabilidad y derechos de carrera tras superar período de prueba.',
      };
  }
}

export type ModalidadPersonal =
  | 'CARRERA_ADMINISTRATIVA'
  | 'LIBRE_NOMBRAMIENTO'
  | 'PROVISIONALIDAD'
  | 'PRACTICANTE_JUDICANTE';

export type EstadoEtapa = 'completed' | 'in_progress' | 'pending';

export interface DocumentoSoporteAdjunto {
  id: string;
  nombre: string;
  uri: string;
  size?: number;
  mimeType?: string;
  fechaSubida: string;
  usuario?: string;
  faseNombre?: string;
  requisitoNombre?: string;
}

export interface RequisitoEtapa {
  id: string;
  label: string;
  cumplido: boolean;
  fecha_cumplimiento?: string;
  codigoFormato?: string;
  obligatorio: boolean;
  notaNormativa?: string;
  tipoAccionEspecial?: 'SECOP' | 'INGRESOS_IA';
  norma?: string;
  textoNormativo?: string;
  detalleProcedimiento?: string;
  observaciones?: string;
  radicadoSoporte?: string;
  usuarioRegistro?: string;
  posiblesEvidencias?: string[];
}


// ============================================================================
// SISTEMA DE CRONOGRAMA, TÉRMINOS LEGALES PERENTORIOS Y SEMÁFORO DE ALERTAS
// ============================================================================
export interface HitoTerminoLegal {
  id: string;
  nombre: string;
  plazoDiasHabiles: number;
  norma: string;
  articulos: string;
  descripcion: string;
  tipoProceso: TipoProceso;
  modalidades: ModalidadPersonal[];
  requisitoAsociadoId?: string;
}

export const HITOS_TERMINOS_LEGALES: HitoTerminoLegal[] = [
  {
    id: 'tl_carr_exclusiones',
    nombre: 'Exclusiones de Lista de Elegibles ante CNSC',
    plazoDiasHabiles: 5,
    norma: 'Decreto Ley 760 de 2005',
    articulos: 'Art. 14',
    descripcion: 'Término fatal para que la Comisión de Personal solicite a la CNSC la exclusión de aspirantes de la lista.',
    tipoProceso: 'VINCULACION',
    modalidades: ['CARRERA_ADMINISTRATIVA'],
    requisitoAsociadoId: 'vc2_3',
  },
  {
    id: 'tl_vin_aceptacion',
    nombre: 'Aceptación Formal del Nombramiento',
    plazoDiasHabiles: 10,
    norma: 'Decreto 1083 de 2015',
    articulos: 'Art. 2.2.5.1.6',
    descripcion: 'Plazo legal del servidor designado para manifestar por escrito si acepta o no el nombramiento.',
    tipoProceso: 'VINCULACION',
    modalidades: ['CARRERA_ADMINISTRATIVA', 'LIBRE_NOMBRAMIENTO', 'PROVISIONALIDAD'],
    requisitoAsociadoId: 'vc4_4',
  },
  {
    id: 'tl_vin_posesion',
    nombre: 'Toma de Posesión del Cargo',
    plazoDiasHabiles: 10,
    norma: 'Decreto 1083 de 2015',
    articulos: 'Art. 2.2.5.1.7',
    descripcion: 'Plazo legal improrrogable (salvo prórroga motivada) para prestar juramento y tomar posesión tras la aceptación.',
    tipoProceso: 'VINCULACION',
    modalidades: ['CARRERA_ADMINISTRATIVA', 'LIBRE_NOMBRAMIENTO', 'PROVISIONALIDAD'],
    requisitoAsociadoId: 'vc6_2',
  },
  {
    id: 'tl_des_simo',
    nombre: 'Reporte de Vacancia Definitiva en SIMO 4.4 ante la CNSC',
    plazoDiasHabiles: 5,
    norma: 'Circular Externa CNSC 011 de 2021',
    articulos: 'Num. 2 • Ley 1960 de 2019',
    descripcion: 'Plazo perentorio de 5 días hábiles siguientes al retiro para reportar la novedad de vacancia en SIMO.',
    tipoProceso: 'DESVINCULACION',
    modalidades: ['CARRERA_ADMINISTRATIVA', 'PROVISIONALIDAD'],
    requisitoAsociadoId: 'dc6_1',
  },
  {
    id: 'tl_des_entrega_control_interno',
    nombre: 'Remisión de Acta de Entrega de Despacho a Control Interno',
    plazoDiasHabiles: 15,
    norma: 'Ley 951 de 2005',
    articulos: 'Art. 8',
    descripcion: 'Obligación legal de radicar copia auténtica del acta e informe de gestión directivo ante Control Interno dentro de 15 días hábiles.',
    tipoProceso: 'DESVINCULACION',
    modalidades: ['LIBRE_NOMBRAMIENTO'],
    requisitoAsociadoId: 'dl3_2',
  },
  {
    id: 'tl_des_arl_pasantes',
    nombre: 'Desafiliación Inmediata de ARL Positiva',
    plazoDiasHabiles: 3,
    norma: 'Decreto 055 de 2015',
    articulos: 'Art. 5',
    descripcion: 'Trámite de retiro en plataforma ARL para cesar cobros patronales y actualizar cobertura tras finalizar la práctica.',
    tipoProceso: 'DESVINCULACION',
    modalidades: ['PRACTICANTE_JUDICANTE'],
    requisitoAsociadoId: 'dpj2_2',
  },
];

export function calcularDiasHabilesTranscurridos(fechaInicioStr: string): number {
  if (!fechaInicioStr) return 0;
  const partes = fechaInicioStr.split('-');
  if (partes.length !== 3) return 0;
  const inicio = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
  const hoy = new Date();
  
  let count = 0;
  const cur = new Date(inicio);
  while (cur <= hoy) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) { // Lunes a Viernes
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(0, count - 1);
}

export interface ResultadoSemaforo {
  estado: 'CUMPLIDO' | 'EN_TERMINO' | 'PROXIMO' | 'VENCIDO';
  texto: string;
  colorTexto: string;
  colorBg: string;
  colorBorde: string;
  icono: string;
  diasRestantes: number;
  hitoNombre: string;
  norma: string;
}

export function evaluarSemaforoTramite(caso: CasoFlujoFuncionario): ResultadoSemaforo {
  // Buscar el hito legal más crítico para esta modalidad y proceso
  const hito = HITOS_TERMINOS_LEGALES.find(
    (h) => h.tipoProceso === caso.tipo_proceso && h.modalidades.includes(caso.modalidad)
  );

  if (!hito) {
    return {
      estado: 'EN_TERMINO',
      texto: 'En Término Normal',
      colorTexto: '#047857',
      colorBg: '#d1fae5',
      colorBorde: '#a7f3d0',
      icono: 'checkmark-circle-outline',
      diasRestantes: 10,
      hitoNombre: 'Trámite Ordinario',
      norma: 'Decreto 1083 de 2015',
    };
  }

  // Verificar si el requisito asociado está cumplido
  let cumplido = false;
  if (hito.requisitoAsociadoId) {
    for (const et of caso.etapas) {
      const rq = et.requisitos.find((r) => r.id === hito.requisitoAsociadoId);
      if (rq && rq.cumplido) {
        cumplido = true;
        break;
      }
    }
  }

  if (cumplido) {
    return {
      estado: 'CUMPLIDO',
      texto: `Cumplido a Tiempo (${hito.plazoDiasHabiles}d)`,
      colorTexto: '#047857',
      colorBg: '#d1fae5',
      colorBorde: '#a7f3d0',
      icono: 'checkmark-done-circle',
      diasRestantes: 0,
      hitoNombre: hito.nombre,
      norma: `${hito.norma} ${hito.articulos}`,
    };
  }

  const diasHabilesPasados = calcularDiasHabilesTranscurridos(caso.fecha_inicio_tramite);
  const diasRestantes = hito.plazoDiasHabiles - diasHabilesPasados;

  if (diasRestantes > 2) {
    return {
      estado: 'EN_TERMINO',
      texto: `En Término (${diasRestantes}d hábiles)`,
      colorTexto: '#065f46',
      colorBg: '#ecfdf5',
      colorBorde: '#a7f3d0',
      icono: 'time-outline',
      diasRestantes,
      hitoNombre: hito.nombre,
      norma: `${hito.norma} ${hito.articulos}`,
    };
  } else if (diasRestantes >= 0) {
    return {
      estado: 'PROXIMO',
      texto: `Próximo a Vencer (${diasRestantes}d hábiles)`,
      colorTexto: '#92400e',
      colorBg: '#fef3c7',
      colorBorde: '#fde68a',
      icono: 'alert-circle-outline',
      diasRestantes,
      hitoNombre: hito.nombre,
      norma: `${hito.norma} ${hito.articulos}`,
    };
  } else {
    return {
      estado: 'VENCIDO',
      texto: `Término Vencido (${Math.abs(diasRestantes)}d venc)`,
      colorTexto: '#b91c1c',
      colorBg: '#fee2e2',
      colorBorde: '#fecaca',
      icono: 'warning-outline',
      diasRestantes,
      hitoNombre: hito.nombre,
      norma: `${hito.norma} ${hito.articulos}`,
    };
  }
}

export interface EtapaFlujo {
  id: string;
  numero: number;
  titulo: string;
  subtitulo: string;
  icono: keyof typeof Ionicons.glyphMap;
  estado: EstadoEtapa;
  tiempoEstimadoDias: number;
  responsable: string;
  requisitos: RequisitoEtapa[];
  normaGeneral?: string;
  marcoJuridicoDetalle?: string;
  procedimientoDetallado?: string;
  plazoLegal?: string;
  observacionesFase?: string;
  radicadoFase?: string;
}
export interface CasoFlujoFuncionario {
  id: string;
  tipo_proceso: TipoProceso;
  modalidad: ModalidadPersonal;
  id_plaza?: number;
  servidor_nombre: string;
  servidor_cedula: string;
  cargo: string;
  codigo?: string;
  grado?: string;
  dependencia: string;
  causal?: string;
  fecha_inicio_tramite: string;
  fecha_efectiva?: string;
  acto_administrativo?: string;
  etapa_activa_id?: string;
  etapas: EtapaFlujo[];
  observaciones?: string;
  validacionIngresoId?: string;
  estadoValidacionIA?: 'CUMPLE' | 'NO_CUMPLE' | 'REQUIERE_REVISION';
  resultadoSecop?: {
    totalActivos: number;
    totalActivosVigentes?: number;
    totalActivosFinalizados?: number;
    tieneAlerta: boolean;
    fechaConsulta: string;
    fechaHoraConsulta?: string;
    totalHistoricos?: number;
    dictamen?: string;
    entidadesActivas?: string[];
    valorTotalActivo?: number;
    contratosActivos?: ContratoSecop[];
    contratosActivosFinalizados?: ContratoSecop[];
    entidadesFinalizadas?: string[];
    valorTotalActivoFinalizado?: number;
    todosContratos?: ContratoSecop[];
    resumenNormativo?: ResumenNormativoSecop;
    resumenFinanciero?: ResumenFinancieroSecop;
  };
}

// ============================================================================
// GENERADORES DE ETAPAS (Articulados con PR-145, PR-137 y SECOP II)
// ============================================================================

export function generarEtapasParaCaso(
  tipo: TipoProceso,
  modalidad: ModalidadPersonal
): EtapaFlujo[] {
  if (tipo === 'VINCULACION') {
    switch (modalidad) {
      case 'CARRERA_ADMINISTRATIVA':
        return [
          {
            id: 'v_carr_1',
            numero: 1,
            titulo: 'Consulta BNLE SIMO',
            subtitulo: 'Verificación de listas de elegibles vigentes',
            icono: 'search-outline',
            estado: 'completed',
            tiempoEstimadoDias: 5,
            responsable: 'Profesional Universitario TH',
            normaGeneral: 'Ley 909 de 2004, Art. 31; Decreto 1083 de 2015, Art. 2.2.6.1; Circular CNSC 011 de 2021',
            plazoLegal: 'Vigencia de listas: 2 años desde ejecutoria',
            procedimientoDetallado: 'Se efectúa la consulta en el Banco Nacional de Listas de Elegibles (SIMO 4.0) de la CNSC para constatar si existe lista en firme para el empleo o empleo equivalente. Si existe lista, la provisión por mérito es de carácter obligatorio e improrrogable.',
            requisitos: [
              {
                id: 'vc1_1',
                label: 'Identificación de la vacante definitiva en la OPEC institucional',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 909 de 2004, Art. 31, Num. 1 • Decreto 1083 de 2015, Art. 2.2.5.3.1',
                textoNormativo: 'El artículo 31 de la Ley 909 establece que la provisión definitiva de los empleos de carrera se hará mediante nombramiento en período de prueba con base en el orden de mérito de la lista de elegibles en firme. El Decreto 1083 ordena verificar que la plaza se encuentre formalmente vacante en forma definitiva y reportada en la OPEC institucional.',
                detalleProcedimiento: 'Verificar en el Manual Específico de Funciones y Competencias Laborales la denominación, código, grado y propósito principal del empleo reportado en la OPEC institucional.',
              
              posiblesEvidencias: [
                "Ficha técnica de la OPEC institucional generada en SIMO",
          "Certificado de vacancia definitiva expedido por Talento Humano",
          "Manual específico de funciones del empleo correspondiente",
              ],
            },
              {
                id: 'vc1_2',
                label: 'Consulta en Banco Nacional de Listas de Elegibles (BNLE SIMO 4.0)',
                cumplido: true,
                obligatorio: true,
                norma: 'Decreto Ley 760 de 2005 • Circular Conjunta CNSC 011 de 2021',
                textoNormativo: 'Las entidades públicas tienen la obligación legal ineludible de consultar prioritariamente el Banco Nacional de Listas de Elegibles (SIMO 4.0) de la CNSC. Si existe lista en firme para el empleo o empleo equivalente, su uso es preferente, vinculante y de carácter obligatorio.',
                detalleProcedimiento: 'Ingresar con el rol institucional a la plataforma SIMO de la CNSC y consultar el estado de firmeza de la lista de elegibles correspondiente a la convocatoria territorial vigente.',
              
              posiblesEvidencias: [
                "Reporte oficial de consulta en SIMO 4.0 con el estado de firme",
              ],
            },
              {
                id: 'vc1_3',
                label: 'Constatación de funciones y perfil equivalente en la OPEC',
                cumplido: true,
                obligatorio: true,
                norma: 'Decreto 1083 de 2015, Art. 2.2.6.2 • Criterio Unificado CNSC',
                textoNormativo: 'Para aplicar una lista de elegibles, el empleo vacante debe ser coincidente o equivalente en denominación, código, nivel jerárquico, grado salarial, funciones y requisitos mínimos con los ofertados en la OPEC del concurso público.',
                detalleProcedimiento: 'Comparar que los requisitos de estudio y experiencia requeridos en la vacante coincidan exactamente con la OPEC ofertada y no existan modificaciones reglamentarias sobrevinientes.',
              
              posiblesEvidencias: [
                "Cuadro comparativo técnico entre el Manual de Funciones vigente y la OPEC del acuerdo de convocatoria del concurso de méritos",
              ],
            },
            ],
          },
          {
            id: 'v_carr_2',
            numero: 2,
            titulo: 'Autorización CNSC & Comisión de Personal',
            subtitulo: 'Revisión por Comisión de Personal y orden de mérito',
            icono: 'shield-checkmark-outline',
            estado: 'completed',
            tiempoEstimadoDias: 5,
            responsable: 'Comisión de Personal / CNSC',
            normaGeneral: 'Ley 909 de 2004, Art. 16 y Art. 31; Decreto 1083 de 2015, Art. 2.2.6.21',
            plazoLegal: '5 días hábiles para pronunciamiento de Comisión de Personal',
            procedimientoDetallado: 'La Comisión de Personal de la Secretaría Jurídica Distrital revisa la elegibilidad de los primeros postulantes en estricto orden de mérito y verifica que no existan solicitudes de exclusión radicadas ante la CNSC.',
            requisitos: [
              {
                id: 'vc2_1',
                label: 'Solicitud formal a la Dirección de Administración de Carrera CNSC',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 909 de 2004, Art. 31 Numeral 4',
                textoNormativo: 'La autoridad nominadora debe remitir solicitud formal de autorización de uso de lista a la CNSC dentro de los términos reglamentarios, respetando estrictamente el orden descendente de mérito de los elegibles.',
                detalleProcedimiento: 'Radicar la comunicación oficial requiriendo el uso de lista de elegibles en firme ante la CNSC para el empleo específico.',
              
              posiblesEvidencias: [
                "Oficio o comunicación oficial con radicado de salida institucional dirigido a la CNSC solicitando autori",
              ],
            },
              {
                id: 'vc2_2',
                label: 'Recepción de lista de elegibles con orden de mérito estricto',
                cumplido: true,
                obligatorio: true,
                norma: 'Decreto Ley 760 de 2005, Art. 14 • Resolución CNSC en firme',
                textoNormativo: 'La lista de elegibles queda en firme una vez decididas las reclamaciones. El orden de mérito es inmodificable y cualquier designación que altere la prelación numérica es nula de pleno derecho conforme a la jurisprudencia constitucional.',
                detalleProcedimiento: 'Constatar la ejecutoria de la resolución que conformó la lista de elegibles y el orden inmodificable de mérito obtenido en las pruebas.',
              
              posiblesEvidencias: [
                "Resolución de la CNSC en firme que conforma y adopta la lista de elegibles",
          "Certificado de ejecutoria expedido por la CNSC",
          "Listado oficial de elegibles con puntajes y puestos",
              ],
            },
              {
                id: 'vc2_3',
                label: 'Revisión por Comisión de Personal y término preclusivo de exclusión (5 días)',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 909 de 2004, Art. 16, Lit. a • Decreto Ley 760 de 2005, Art. 14 • Decreto 1083 de 2015, Art. 2.2.6.21',
                textoNormativo: 'De conformidad con el artículo 14 del Decreto Ley 760 de 2005, dentro de los cinco (5) días hábiles siguientes a la publicación de la lista de elegibles, la Comisión de Personal podrá solicitar a la CNSC la exclusión de la persona o personas que no reúnan los requisitos o incurran en causales de exclusión legal.',
                detalleProcedimiento: 'Verificar los soportes de los primeros elegibles en estricto orden de mérito dentro del término perentorio de cinco (5) días hábiles siguientes a la firmeza de la lista, y certificar la procedencia del nombramiento ante el nominador.',
                posiblesEvidencias: [
                  'Acta de sesión de la Comisión de Personal revisando la lista de elegibles.',
                  'Constancia de no haberse presentado solicitud de exclusión dentro de los 5 días hábiles.',
                  'Comunicación formal suscrita remitida al nominador autorizando la provisión.',
                ],
              },
            ],
          },
          {
            id: 'v_carr_3',
            numero: 3,
            titulo: 'Aviso a Encargados / Provisionales',
            subtitulo: 'Notificación a provisionales / encargados y entrega de puesto',
            icono: 'notifications-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            normaGeneral: 'Ley 1960 de 2019, Art. 1; Criterio Unificado CNSC del 13 de agosto de 2019',
            plazoLegal: 'Aviso previo con mínimo 1 día hábil de antelación',
            procedimientoDetallado: 'Notificar formalmente al servidor que ocupa la plaza en encargo o en provisionalidad sobre la llegada del titular de carrera con lista de elegibles, disponiendo el inicio del trámite de entrega de puesto y empalme.',
            requisitos: [
              {
                id: 'vc3_1',
                label: 'Identificación de servidor en encargo preferente o provisional',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311520-FT-018',
                norma: 'Ley 909 de 2004, Art. 24 • Ley 1960 de 2019, Art. 1',
                textoNormativo: 'El encargo y la provisionalidad son figuras transitorias que cesan de pleno derecho cuando la plaza deba proveerse en forma definitiva por mérito. Los servidores en encargo retornan inmediatamente a sus empleos de carrera de origen.',
                detalleProcedimiento: 'Cotejar en PERNO y la matriz de planta el estado actual del funcionario que ocupa la plaza para proceder a su reubicación o desvinculación formal según corresponda.',
              
              posiblesEvidencias: [
                "Ficha de caracteri",
              ],
            },
              {
                id: 'vc3_2',
                label: 'Memorando de comunicación sobre provisión por mérito de la plaza',
                cumplido: true,
                obligatorio: true,
                norma: 'Decreto 1083 de 2015, Art. 2.2.5.3.4',
                textoNormativo: 'La administración debe comunicar formalmente la terminación del encargo o nombramiento provisional, motivando el acto en la obligación legal de nombrar al elegible que superó el concurso de méritos.',
                detalleProcedimiento: 'Remitir memorando oficial informando la provisión de la vacante por concurso de méritos, preservando garantías de especial protección si aplican (retén social, prepensionados, madres cabeza de familia).',
              
              posiblesEvidencias: [
                "Memorando oficial remitido al funcionario en encargo o provisional",
          "Constancia de radicación en CORDIS o SIGA con acuse de recibo",
              ],
            },
              {
                id: 'vc3_3',
                label: 'Fijación de fecha límite de entrega de funciones e inventarios',
                cumplido: true,
                obligatorio: true,
                norma: 'Circular Conjunta CNSC - DAFP 001 de 2020',
                textoNormativo: 'La entidad otorgará un término prudencial no inferior a 5 días ni superior a 10 para la entrega formal del despacho, bienes, expedientes e inventarios, asegurando que no se interrumpa el servicio público.',
                detalleProcedimiento: 'Establecer la fecha formal para la suscripción de las actas de entrega de cargo e inventario físico e informático.',
              
              posiblesEvidencias: [
                "Cronograma de empalme suscrito por el jefe de la dependencia",
          "Citación para entrega de archivos y bienes inventariados",
              ],
            },
            ],
          },
          {
            id: 'v_carr_4',
            numero: 4,
            titulo: 'Acto de Nombramiento en Periodo de Prueba',
            subtitulo: 'Resolución nominador (6 meses) y aceptación formal',
            icono: 'document-text-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 2,
            responsable: 'Nominador / Técnico Notificaciones',
            normaGeneral: 'Decreto 1083 de 2015, Art. 2.2.5.1.4, 2.2.5.1.6 y 2.2.6.24; Ley 909 de 2004, Art. 31',
            plazoLegal: '10 días hábiles para aceptar el nombramiento; 10 días para posesión (prorrogables hasta 90 días)',
            procedimientoDetallado: 'Proyectar y expedir la Resolución de Nombramiento en Periodo de Prueba por el término de seis (6) meses. Notificar al elegible quien cuenta con 10 días hábiles para manifestar su aceptación o declinación.',
            requisitos: [
              {
                id: 'vc4_1',
                label: 'Elaboración de Resolución de Nombramiento en Periodo de Prueba',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311520-FT-130',
                norma: 'Decreto 1083 de 2015, Arts. 2.2.5.1.4 y 2.2.6.24',
                textoNormativo: 'El nombramiento en período de prueba se expedirá mediante acto administrativo motivado del nominador, determinando el plazo legal improrrogable de seis (6) meses y la convocatoria de concurso respectiva.',
                detalleProcedimiento: 'Redactar el proyecto de resolución incluyendo antecedentes de la convocatoria, OPEC, puesto en lista y asignación salarial reglamentaria.',
              
              posiblesEvidencias: [
                "Proyecto de resolución en formato FT-130 con visto bueno jurídico",
          "Ficha de antecedentes con mención expresa del periodo de 6 meses y la convocatoria respectiva",
              ],
            },
              {
                id: 'vc4_2',
                label: 'Firma por Secretario Jurídico Distrital y numeración oficial',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 1437 de 2011, Art. 65 • Estatuto Orgánico de Bogotá',
                textoNormativo: 'Todo acto administrativo de nombramiento debe ser suscrito por la autoridad nominadora competente, radicado, numerado y fechado oficialmente para que surta plenos efectos jurídicos.',
                detalleProcedimiento: 'Someter a firma del Secretario Jurídico Distrital y posterior radicación y fechado en el sistema documental corporativo.',
              
              posiblesEvidencias: [
                "Resolución de nombramiento en periodo de prueba debidamente firmada por el Secretario Jurídico Distrital, numerada y fechada en el consecutivo oficial",
              ],
            },
              {
                id: 'vc4_3',
                label: 'Comunicación al candidato (10 días hábiles para manifestar aceptación)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311520-FT-019',
                norma: 'Decreto 1083 de 2015, Art. 2.2.5.1.6',
                textoNormativo: 'La persona nombrada dispone de un término improrrogable de diez (10) días hábiles contados a partir de la comunicación para manifestar si acepta o declina el nombramiento. De no haber aceptación expresa, se procederá a nombrar al siguiente en la lista.',
                detalleProcedimiento: 'Enviar comunicación electrónica certificada requiriendo al interesado manifestar por escrito su aceptación dentro del término perentorio de 10 días hábiles.',
              
              posiblesEvidencias: [
                "Oficio de notificación electrónica certificada en formato FT-019",
          "Acuse de recibo del correo institucional",
          "Memorial de aceptación expresa suscrito por el elegible dentro del término legal",
              ],
            },
              {
                id: 'vc4_4',
                label: 'Gestión de prórroga para posesión (hasta 90 días si aplica por fuerza mayor)',
                cumplido: false,
                obligatorio: false,
                norma: 'Decreto 1083 de 2015, Art. 2.2.5.1.7',
                textoNormativo: 'Aceptado el nombramiento, el ciudadano cuenta con diez (10) días hábiles para tomar posesión. Este plazo puede prorrogarse por justa causa debidamente acreditada hasta por noventa (90) días continuos si debe desplazarse de otra ciudad o por fuerza mayor.',
                detalleProcedimiento: 'Si el candidato alega justa causa comprobada (ej. incapacidad o renuncia en otra entidad), autorizar prórroga para posesionarse hasta por 90 días calendario adicionales.',
              
              posiblesEvidencias: [
                "Oficio formal de aceptación suscrito por el elegible",
          "Copia de documento de identidad y manifestación escrita de aceptación",
              ],
            },
            ],
          },
          {
            id: 'v_carr_5',
            numero: 5,
            titulo: 'Posesión, Exámenes & Verificación SECOP II',
            subtitulo: 'Examen médico, SECOP II, SIDEAP y Acta de Posesión',
            icono: 'ribbon-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional TH / SST',
            normaGeneral: 'Art. 128 Constitucional; Ley 80 de 1993, Art. 8; Ley 190 de 1995; Ley 2013 de 2019; Ley 2097 de 2021; Decreto 1083 de 2015, Art. 2.2.5.1.8',
            plazoLegal: 'Día de inicio del cómputo laboral oficial',
            procedimientoDetallado: 'Constatar aptitud médica, ausencia total de contratos estatales incompatibles en SECOP II, antecedentes disciplinarios, fiscales, penales y de deudores alimentarios morosos (REDAM), y formalizar el juramento en el Acta de Posesión.',
            requisitos: [
              {
                id: 'vc5_1',
                label: 'Examen médico ocupacional de ingreso con concepto de aptitud',
                cumplido: false,
                obligatorio: true,
                norma: 'Resolución 2346 de 2007 MinProtección Social • Decreto 1072 de 2015',
                textoNormativo: 'Es obligatoria la evaluación médica ocupacional pre-ingreso, a cargo de la entidad, con el fin de certificar la aptitud psicofísica y compatibilidad con las exigencias funcionales del empleo a desempeñar.',
                detalleProcedimiento: 'Verificar la expedición del certificado médico de aptitud laboral emitido por IPS con licencia en Seguridad y Salud en el Trabajo.',
              
              posiblesEvidencias: [
                "Certificado de aptitud médica ocupacional emitido por la IPS de salud en el trabajo con concepto de apto",
              ],
            },
              {
                id: 'vc5_secop',
                label: 'Consulta de contratos activos en SECOP II (Verificación de Inhabilidades / Art. 128 C.P.)',
                cumplido: false,
                obligatorio: true,
                tipoAccionEspecial: 'SECOP',
                norma: 'Constitución Política, Art. 128 • Ley 80 de 1993, Art. 8 • Ley 1952 de 2019, Art. 38',
                textoNormativo: 'El artículo 128 de la Constitución Política prescribe que nadie podrá desempeñar simultáneamente más de un empleo público ni recibir más de una asignación que provenga del tesoro público. Es obligación de Talento Humano consultar en tiempo real el SECOP II para verificar la inexistencia de contratos estatales en ejecución antes de dar posesión al aspirante.',
                detalleProcedimiento: 'Consultar en tiempo real a través de la API SECOP II de Datos Abiertos que el aspirante no figure como contratista con contratos vigentes en ejecución antes de la posesión.',
              
              posiblesEvidencias: [
                "Reporte en PDF de la consulta en la API de SECOP II de Datos Abiertos",
          "Dictamen preventivo de cero contratos vigentes en ejecución",
          "Captura de pantalla de la consulta en plataforma",
              ],
            },
              {
                id: 'vc5_2',
                label: 'Declaración de Bienes y Rentas y Conflicto de Intereses en SIDEAP/SIGEP',
                cumplido: false,
                obligatorio: true,
                norma: 'Constitución Política, Art. 128 • Ley 80 de 1993, Art. 8 • Ley 1952 de 2019, Art. 38',
                textoNormativo: 'Nadie podrá desempeñar simultáneamente más de un empleo público ni recibir más de una asignación del tesoro público. Es deber inexcusable de Talento Humano consultar SECOP II para verificar la ausencia de contratos estatales en ejecución antes de autorizar la posesión.',
                detalleProcedimiento: 'Exigir el certificado digital de radicación de la declaración de bienes y rentas y conflicto de intereses diligenciada en SIDEAP / SIGEP II.',
              
              posiblesEvidencias: [
                "Certificado digital expedido por SIDEAP/SIGEP II con radicado de ingreso",
          "Formulario de conflicto de intereses debidamente firmado electrónicamente",
              ],
            },
              {
                id: 'vc5_3',
                label: 'Consulta de antecedentes (Policía, Procuraduría SIRI, Contraloría SIBOR, REDAM)',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2013 de 2019, Arts. 2 y 3 • Decreto 830 de 2021 • Ley 190 de 1995',
                textoNormativo: 'Es requisito previo y habilitante para la posesión publicar y registrar bajo la gravedad de juramento en el SIDEAP/SIGEP II la declaración de bienes y rentas, la última declaración de renta y el registro de posibles conflictos de intereses.',
                detalleProcedimiento: 'Generar los certificados oficiales en línea de Policía Nacional, Procuraduría General de la Nación, Contraloría General de la República y Registro de Deudores Alimentarios Morosos.',
              
              posiblesEvidencias: [
                "Certificados ordinarios de antecedentes expedidos en línea por Policía Nacional, Procuraduría, Contraloría, Personería y el certificado de no deudor alimentario del REDAM",
              ],
            },
              {
                id: 'vc5_ft318',
                label: 'Certificado de Cumplimiento de Requisitos para Tomar Posesión (2311300-FT-318)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311300-FT-318',
                tipoAccionEspecial: 'INGRESOS_IA',
                norma: 'Decreto 1083 de 2015, Arts. 2.2.5.1.4 y 2.2.5.1.5 • Acuerdo de Convocatoria CNSC',
                textoNormativo: 'Antes de dar posesión, la entidad comprobará el cumplimiento de las calidades y requisitos del aspirante seleccionado en concurso de méritos mediante el formato oficial 2311300-FT-318 expedido por Talento Humano.',
                detalleProcedimiento: 'Generar y validar el archivo Excel oficial 2311300-FT-318 (Certificado de Cumplimiento de Requisitos para Tomar Posesión) en el módulo de Validación Técnica de Ingresos para certificar la idoneidad documental previa al juramento y posesión.',
                posiblesEvidencias: [
                  'Certificado institucional 2311300-FT-318 (Certificado de Cumplimiento de Requisitos para Tomar Posesión) en Excel oficial generado y suscrito.',
                  'Dictamen técnico de verificación de cumplimiento de requisitos asistido por IA.',
                  'Certificaciones laborales y títulos académicos cotejados frente al manual de funciones.',
                ],
              },
              {
                id: 'vc5_4',
                label: 'Suscripción formal del Acta de Posesión (Formato 2311300-FT-127)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311300-FT-127',
                norma: 'Ley 1952 de 2019 • Ley 610 de 2000 • Ley 1801 de 2016 • Ley 2097 de 2021, Art. 6',
                textoNormativo: 'Talento Humano verificará los antecedentes disciplinarios (SIRI Procuraduría), fiscales (SIBOR Contraloría), judiciales (Policía Nacional), medidas correctivas (RNMC) y la no inscripción en el Registro de Deudores Alimentarios Morosos (REDAM).',
                detalleProcedimiento: 'Diligenciar el acta de posesión con toma formal del juramento de rigor, firmada por el servidor y el nominador o su delegado.',
              
              posiblesEvidencias: [
                "Acta de Posesión original en formato 2311300-FT-127 con juramento constitucional, firmada por el servidor y el nominador",
              ],
            },
            ],
          },
          {
            id: 'v_carr_6',
            numero: 6,
            titulo: 'Nómina, Afiliaciones & Reporte CNSC',
            subtitulo: 'Afiliaciones, nómina PERNO, SIDEAP y cierre OPEC',
            icono: 'checkmark-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 5,
            responsable: 'Nómina / Profesional CNSC',
            normaGeneral: 'Ley 100 de 1993; Decreto 1083 de 2015, Art. 2.2.6.28; Circular CNSC 011 de 2021',
            plazoLegal: 'Afiliación ARL previa al inicio de labores; reporte SIMO dentro de los 5 días siguientes',
            procedimientoDetallado: 'Gestionar el alta en el sistema de nómina PERNO, vincular a seguridad social integral desde el día de la posesión, y reportar ante la CNSC en SIMO 4.0 la posesión efectiva para cerrar el ciclo del elegible.',
            requisitos: [
              {
                id: 'vc6_1',
                label: 'Afiliación a ARL, EPS, Fondo Pensiones, Cesantías y Caja Compensación',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 100 de 1993 • Decreto Ley 1295 de 1994 • Decreto 1072 de 2015',
                textoNormativo: 'La afiliación patronal al Sistema de Seguridad Social Integral (EPS, ARL, Fondo de Pensiones, Cesantías y Caja de Compensación) debe surtirse con fecha de inicio igual a la del día de la posesión formal.',
                detalleProcedimiento: 'Radicar formularios de afiliación ante Positiva ARL, EPS y fondo de pensiones y cesantías escogido libremente por el servidor.',
              
              posiblesEvidencias: [
                "Formularios radicados ante Positiva ARL con fecha del día de posesión",
          "Certificados de vinculación activa a EPS, AFP y Caja de Compensación (Compensar)",
              ],
            },
              {
                id: 'vc6_2',
                label: 'Inclusión en nómina institucional (Sistema PERNO)',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Distrital 101 de 2004 • Manual Distrital de Nómina',
                textoNormativo: 'Se debe registrar el alta en el sistema de nómina institucional dentro del período contable respectivo, garantizando la debida apropiación de salarios y factores prestacionales.',
                detalleProcedimiento: 'Registrar la plaza, asignación básica, cuenta bancaria para dispersión y descuentos de ley en el módulo de personal PERNO.',
              
              posiblesEvidencias: [
                "Reporte de novedades de alta en el sistema de nómina distrital PERNO",
          "Certificación bancaria del servidor",
              ],
            },
              {
                id: 'vc6_3',
                label: 'Activación del servidor en aplicativo SIDEAP Distrital',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Distrital 083 de 2001 • Directiva Distrital 001 de 2018',
                textoNormativo: 'El servidor debe ser activado y habilitado en el Sistema Distrital del Empleo y la Administración Pública (SIDEAP) para la expedición de certificaciones laborales y trámites institucionales.',
                detalleProcedimiento: 'Cambiar el estado de la vacante a provista en SIDEAP y habilitar permisos en la intranet distrital.',
              
              posiblesEvidencias: [
                "Ficha de servicio activo generada en SIDEAP",
          "Carné institucional digital activado",
              ],
            },
              {
                id: 'vc6_4',
                label: 'Reporte de posesión en aplicativo BNLE SIMO 4.0 ante la CNSC',
                cumplido: false,
                obligatorio: true,
                norma: 'Circular CNSC 011 de 2021, Num. 6 • Ley 909 de 2004, Art. 31',
                textoNormativo: 'La entidad nominadora debe reportar obligatoriamente a la CNSC a través de SIMO 4.0 la posesión del elegible en período de prueba dentro de los cinco (5) días hábiles siguientes a su ocurrencia.',
                detalleProcedimiento: 'Cargar en la plataforma SIMO de la Comisión Nacional del Servicio Civil el acta de posesión y la resolución numerada.',
              
              posiblesEvidencias: [
                "Comprobante de cargue del acta de posesión y resolución en SIMO 4.0",
          "Constancia de retiro de la posición del BNLE emitida por la plataforma de la CNSC",
              ],
            },
              {
                id: 'vc6_5',
                label: 'Inducción y entrenamiento en puesto de trabajo (Formato 2311300-FT-106)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311300-FT-106',
                norma: 'Decreto 1083 de 2015, Art. 2.2.6.25 • Acuerdo CNSC de Evaluación del Desempeño Laboral',
                textoNormativo: 'Durante los seis (6) meses del período de prueba se concertarán compromisos funcionales y comportamentales. Al superarse con calificación sobresaliente o satisfactoria, el servidor adquiere los derechos de carrera y el registro RPCA ante la CNSC.',
                detalleProcedimiento: 'Entregar cartilla de bienvenida, manual específico de funciones y concertar compromisos de evaluación del periodo de prueba.',
              
              posiblesEvidencias: [
                "Acta de inducción institucional en formato FT-106",
          "Formato oficial de concertación de compromisos funcionales y comportamentales del periodo de prueba en el aplicativo EDL de la CNSC",
              ],
            },
            ],
          },
        ];

      case 'LIBRE_NOMBRAMIENTO':
        return [
          {
            id: 'v_lnr_1',
            numero: 1,
            titulo: 'Recepción HV & SIDEAP',
            subtitulo: 'Postulación y cargue en plataforma distrital',
            icono: 'person-add-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            normaGeneral: 'Ley 909 de 2004, Art. 5; Decreto 1083 de 2015, Art. 2.2.5.1.1; Formato 2311520-FT-019',
            plazoLegal: 'Inmediato previa manifestación de interés del nominador',
            procedimientoDetallado: 'Recepción formal de la hoja de vida remitida por el Despacho del Secretario Jurídico Distrital y cargue de los soportes académicos y laborales en el sistema SIDEAP.',
            requisitos: [
              {
                id: 'vl1_1',
                label: 'Recepción de Hoja de Vida remitida por Despacho del Nominador',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 909 de 2004, Art. 5 • Decreto 1083 de 2015, Art. 2.2.5.3.3',
                textoNormativo: 'Los empleos de Libre Nombramiento y Remoción son de dirección, conducción, orientación institucional y confianza. La designación corresponde a la facultad discrecional de la autoridad nominadora.',
                detalleProcedimiento: 'Recibir expediente digital o físico remitido formalmente por el Despacho con visto bueno de postulación.',
              
              posiblesEvidencias: [
                "Memorando de postulación o remisión suscrito por el Despacho del Secretario Jurídico Distrital",
          "Expediente de hoja de vida recibido en Talento Humano",
              ],
            },
              {
                id: 'vl1_2',
                label: 'Autorización formal de notificación electrónica',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311520-FT-019',
                norma: 'Ley 1437 de 2011, Art. 53 • Ley 527 de 1999',
                textoNormativo: 'El aspirante debe suscribir la autorización expresa para ser notificado de todos los actos y requerimientos mediante la dirección electrónica institucional reportada en su hoja de vida.',
                detalleProcedimiento: 'Suscribir consentimiento expreso para surtir todas las notificaciones del trámite mediante la dirección de correo electrónico aportada.',
              
              posiblesEvidencias: [
                "Formato institucional 2311520-FT-019 debidamente firmado",
          "Constancia de autorización expresa de correo electrónico para notificaciones",
              ],
            },
              {
                id: 'vl1_3',
                label: 'Registro y cargue completo de soportes académicos y laborales en SIDEAP',
                cumplido: true,
                obligatorio: true,
                norma: 'Decreto Distrital 083 de 2001 • Directiva DASCD 001 de 2018',
                textoNormativo: 'Toda la documentación académica, tarjetas profesionales, certificaciones laborales y antecedentes deben cargarse y validarse formalmente en el sistema distrital SIDEAP antes de proferir el acto de nombramiento.',
                detalleProcedimiento: 'Digitalizar diplomas, actas de grado, tarjetas profesionales y certificados laborales con fechas exactas y funciones descritas.',
              
              posiblesEvidencias: [
                "Hoja de vida digital generada por SIDEAP",
          "Soportes digitali",
              ],
            },
            ],
          },
          {
            id: 'v_lnr_2',
            numero: 2,
            titulo: 'Validación Técnica & SECOP II',
            subtitulo: 'Cotejo IA FT-318, paridad de género y contratos activos',
            icono: 'clipboard-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            normaGeneral: 'Ley 909 de 2004, Art. 19; Decreto 1083 de 2015; Art. 128 Constitucional; Ley 2424 de 2024 (Paridad de Género)',
            plazoLegal: '1 día hábil para emisión del concepto técnico',
            procedimientoDetallado: 'Verificación rigurosa de cumplimiento de requisitos de estudio y experiencia en el formato FT-318, consulta preventiva en SECOP II de inhabilidades y constatación de la cuota legal del 50% de mujeres en cargos directivos.',
            requisitos: [
              {
                id: 'vl2_1',
                label: 'Consulta de antecedentes: Policía, Procuraduría SIRI, Contraloría SIBOR, RNMC y REDAM',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 1952 de 2019 • Ley 610 de 2000 • Ley 1801 de 2016 • Ley 2097 de 2021',
                textoNormativo: 'Es obligatorio obtener las certificaciones ordinarias y especiales de antecedentes de la Procuraduría, Contraloría, Policía Nacional, RNMC y el certificado de no reporte de deudor moroso en el REDAM.',
                detalleProcedimiento: 'Verificar ausencia de sanciones disciplinarias vigentes, fallos de responsabilidad fiscal, medidas correctivas policiales y deudores de alimentos.',
              
              posiblesEvidencias: [
                "Certificados vigentes de antecedentes disciplinarios, fiscales, policiales y REDAM sin anotaciones inhabilitantes",
              ],
            },
              {
                id: 'vl2_secop',
                label: 'Consulta de contratos en SECOP II (Verificación Inhabilidad / Art. 128 C.P.)',
                cumplido: false,
                obligatorio: true,
                tipoAccionEspecial: 'SECOP',
                norma: 'Constitución Política, Art. 128 • Ley 80 de 1993, Art. 8 • Ley 1952 de 2019, Art. 38',
                textoNormativo: 'El artículo 128 de la Constitución Política prescribe que nadie podrá desempeñar simultáneamente más de un empleo público ni recibir más de una asignación que provenga del tesoro público. Es obligación de Talento Humano consultar en tiempo real el SECOP II para verificar la inexistencia de contratos estatales en ejecución antes de dar posesión al aspirante.',
                detalleProcedimiento: 'Comprobar mediante consulta web a la API SECOP II que el aspirante no posea contratos de prestación de servicios o de obra en ejecución con entidades del Estado.',
              
              posiblesEvidencias: [
                "Reporte en PDF de consulta en tiempo real en SECOP II",
          "Dictamen de no existencia de contratos estatales en ejecución",
              ],
            },
              {
                id: 'vl2_2',
                label: 'Certificado de Cumplimiento de Requisitos para Tomar Posesión (2311300-FT-318)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311300-FT-318',
                tipoAccionEspecial: 'INGRESOS_IA',
                norma: 'Decreto 1083 de 2015, Arts. 2.2.5.1.4 y 2.2.5.1.5 • Manual Específico de Funciones y Competencias Laborales',
                textoNormativo: 'Antes de efectuar el nombramiento y autorizar la posesión, la entidad debe certificar el estricto cumplimiento de los requisitos de estudio y experiencia directiva mediante el formato institucional oficial 2311300-FT-318 "Certificado de Cumplimiento de Requisitos para Tomar Posesión", generado oficialmente en el módulo de Validación Técnica de Ingresos.',
                detalleProcedimiento: 'Generar el archivo oficial de Excel del formato 2311300-FT-318 desde el módulo de Validación Técnica de Ingresos (con IA) para acreditar el cumplimiento exacto de meses de experiencia directiva/profesional y títulos exigidos.',
                posiblesEvidencias: [
                  'Certificado institucional de cumplimiento de requisitos para tomar posesión (Formato oficial 2311300-FT-318 en Excel) firmado por Talento Humano.',
                  'Dictamen técnico de verificación de hoja de vida asistido por IA emitido desde Validación Técnica de Ingresos.',
                  'Certificaciones laborales con funciones y tiempo computado en meses acreditados.',
                ],
              },
              {
                id: 'vl2_3',
                label: 'Verificación paridad Ley de Cuotas (50% mujeres en cargos directivos)',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 581 de 2000 • Ley 2424 de 2024, Arts. 1 y 2 • Decreto 455 de 2020',
                textoNormativo: 'La Ley 2424 de 2024 establece que la participación de las mujeres en los niveles decisorios de la administración pública (máximo nivel decisorio y otros niveles decisorios) será de al menos el cincuenta por ciento (50%).',
                detalleProcedimiento: 'Revisar la matriz de participación institucional de la Secretaría Jurídica Distrital para garantizar mínimo el 50% de mujeres en el máximo nivel decisorio.',
                posiblesEvidencias: [
                  'Matriz institucional de paridad de género actualizada a la fecha.',
                  'Certificación suscrita por Talento Humano acreditando el cumplimiento del 50% de mujeres en el nivel directivo.',
                ],
              },
            ],
          },
          {
            id: 'v_lnr_3',
            numero: 3,
            titulo: 'SEVCOM & Publicación Web',
            subtitulo: 'Evaluación DASCD y 5 días hábiles web para veeduría',
            icono: 'globe-outline',
            estado: 'pending',
            tiempoEstimadoDias: 5,
            responsable: 'Dirección Gestión Corporativa / DASCD',
            normaGeneral: 'Circular Conjunta 004 de 2019 DASCD; Acuerdo Distrital 782 de 2020; Directiva 008 de 2020 Alcaldía Mayor',
            plazoLegal: 'Mínimo 5 días calendario continuos de publicación en web',
            procedimientoDetallado: 'Aplicar la prueba psicométrica de competencias gerenciales en SEVCOM administrada por el DASCD y publicar la hoja de vida durante 5 días en la página web oficial para observaciones de la ciudadanía antes del nombramiento.',
            requisitos: [
              {
                id: 'vl3_1',
                label: 'Solicitud de evaluación de competencias gerenciales en SEVCOM DASCD (Circular 004/2019)',
                cumplido: false,
                obligatorio: true,
                norma: 'Acuerdo Distrital 782 de 2020 • Circular DASCD 004 de 2019',
                textoNormativo: 'Los candidatos a cargos directivos de Libre Nombramiento y Remoción en Bogotá deben ser evaluados a través del Sistema de Evaluación de Competencias (SEVCOM) administrado por el DASCD.',
                detalleProcedimiento: 'Agendar al candidato en la plataforma SEVCOM del Departamento Administrativo del Servicio Civil Distrital.',
              
              posiblesEvidencias: [
                "Solicitud de agendamiento en la plataforma SEVCOM radicada ante el DASCD",
          "Citación electrónica al aspirante",
              ],
            },
              {
                id: 'vl3_2',
                label: 'Aprobación de la prueba de competencias del aspirante',
                cumplido: false,
                obligatorio: true,
                norma: 'Acuerdo Distrital 782 de 2020, Art. 4',
                textoNormativo: 'Para continuar con el trámite de designación en el cargo directivo, el aspirante debe obtener concepto favorable en la valoración de competencias directivas y gerenciales aplicada por el DASCD.',
                detalleProcedimiento: 'Revisar el informe de resultados remitido por el DASCD con concepto favorable en competencias directivas.',
              
              posiblesEvidencias: [
                "Informe de resultados de evaluación psicométrica emitido por el DASCD con concepto favorable de competencias gerenciales",
              ],
            },
              {
                id: 'vl3_3',
                label: 'Publicación de la Hoja de Vida por mínimo 5 días en portal web (Acuerdo 782/2020)',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto 1083 de 2015, Art. 2.2.13.2.3 • Directiva Presidencial 01 de 2020 • Acuerdo 782 de 2020',
                textoNormativo: 'La hoja de vida del candidato a empleo de Libre Nombramiento y Remoción debe publicarse obligatoriamente durante no menos de cinco (5) días calendario en la página web institucional para conocimiento y observaciones de la ciudadanía antes de la designación.',
                detalleProcedimiento: 'Subir formato de hoja de vida institucional al módulo de transparencia y verificar ausencia de objeciones ciudadanas en el buzón durante 5 días calendario.',
              
              posiblesEvidencias: [
                "Certificación de publicación en el portal web institucional por el término mínimo de 5 días calendario",
          "Captura de pantalla del enlace de transparencia con fecha inicial y final",
          "Certificado de no haberse recibido observaciones ciudadanas o informe de trámite de las recibidas",
              ],
            },
            ],
          },
          {
            id: 'v_lnr_4',
            numero: 4,
            titulo: 'Acto de Nombramiento Ordinario',
            subtitulo: 'Resolución de nombramiento y aceptación',
            icono: 'document-text-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Secretario Jurídico Distrital',
            normaGeneral: 'Decreto 1083 de 2015, Art. 2.2.5.1.4 y Art. 2.2.5.1.6; Formato 2311520-FT-130',
            plazoLegal: '10 días hábiles para aceptar el nombramiento',
            procedimientoDetallado: 'Emisión del decreto o resolución de nombramiento ordinario debidamente motivado, numerado y notificado formalmente.',
            requisitos: [
              {
                id: 'vl4_1',
                label: 'Proyección y firma de Resolución de Nombramiento Ordinario',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311520-FT-130',
                norma: 'Decreto 1083 de 2015, Art. 2.2.5.3.3 • Ley 909 de 2004, Art. 23',
                textoNormativo: 'El nombramiento ordinario en cargo de libre nombramiento se adoptará por resolución o decreto de la autoridad nominadora en ejercicio de su facultad discrecional de libre nombramiento y remoción.',
                detalleProcedimiento: 'Proyectar el acto administrativo con visto bueno del Director de Gestión Corporativa y firma del Secretario Jurídico.',
              
              posiblesEvidencias: [
                "Proyecto de acto administrativo en formato FT-130",
          "Resolución de nombramiento ordinario suscrita por el Secretario Jurídico Distrital",
              ],
            },
              {
                id: 'vl4_2',
                label: 'Numeración, fechado y comunicación al designado',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 1437 de 2011, Art. 65 • Estatuto de Bogotá',
                textoNormativo: 'El acto administrativo debe contar con numeración oficial consecutiva, fecha y comunicación formal al interesado mediante los canales electrónicos autorizados.',
                detalleProcedimiento: 'Radicar y numerar en el sistema documental, comunicando oficialmente al designado para su aceptación.',
              
              posiblesEvidencias: [
                "Radicado oficial de salida y número de resolución asignado",
          "Oficio de comunicación formal remitido al correo del designado",
              ],
            },
              {
                id: 'vl4_3',
                label: 'Aceptación formal dentro del término legal (10 días hábiles)',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto 1083 de 2015, Art. 2.2.5.1.6',
                textoNormativo: 'El designado dispone de diez (10) días hábiles siguientes a la comunicación para manifestar su aceptación o declinación formal al nombramiento.',
                detalleProcedimiento: 'Recibir memorial suscrito por el designado manifestando la aceptación del cargo dentro de los 10 días hábiles.',
              
              posiblesEvidencias: [
                "Carta o escrito firmado por el designado manifestando formalmente la aceptación del cargo dentro de los 10 días hábiles legales",
              ],
            },
            ],
          },
          {
            id: 'v_lnr_5',
            numero: 5,
            titulo: 'Posesión & Entrenamiento Gerencial',
            subtitulo: 'Acta de posesión, Ley 2013 e inducción directiva',
            icono: 'ribbon-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Talento Humano / Despacho',
            normaGeneral: 'Ley 2013 de 2019; Ley 1437 de 2011; Decreto 1083 de 2015, Art. 2.2.5.1.8',
            plazoLegal: 'Día de la posesión oficial',
            procedimientoDetallado: 'Toma de posesión formal con juramento, publicación de bienes y rentas en el portal de integridad ciudadana y entrega de protocolos directivos.',
            requisitos: [
              {
                id: 'vl5_1',
                label: 'Examen médico ocupacional de ingreso',
                cumplido: false,
                obligatorio: true,
                norma: 'Resolución 2346 de 2007 • Decreto 1072 de 2015',
                textoNormativo: 'Práctica médica de ingreso obligatoria por especialista en seguridad y salud en el trabajo, con el correspondiente concepto de aptitud psicofísica.',
                detalleProcedimiento: 'Constatar aptitud psicofísica laboral emitida por médico especialista en SST.',
              
              posiblesEvidencias: [
                "Certificado de examen médico de ingreso laboral con concepto de apto expedido por IPS especiali",
              ],
            },
              {
                id: 'vl5_2',
                label: 'Publicación proactiva Bienes y Rentas en SIDEAP/SIGEP (Ley 2013/2019)',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2013 de 2019, Arts. 2 y 3 • Decreto 830 de 2021',
                textoNormativo: 'Publicación proactiva y juramentada de bienes y rentas, declaración del impuesto de renta y registro de conflicto de intereses en la plataforma SIDEAP / SIGEP II con corte previo a la posesión.',
                detalleProcedimiento: 'Publicar el formulario proactivo de declaración jurada de bienes y conflicto de intereses en el aplicativo de la Función Pública.',
              
              posiblesEvidencias: [
                "Certificado de publicación proactiva de declaración jurada de bienes, rentas y conflicto de intereses de la Función Pública",
              ],
            },
              {
                id: 'vl5_3',
                label: 'Suscripción del Acta de Posesión (Formato 2311300-FT-127)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311300-FT-127',
                norma: 'Constitución Política, Art. 122 • Ley 4 de 1913, Art. 257 • Decreto 1083 de 2015, Art. 2.2.5.1.8',
                textoNormativo: 'Toma de juramento constitucional y suscripción formal del acta de posesión en formato 2311300-FT-127 ante el nominador o su delegado autorizado.',
                detalleProcedimiento: 'Firma formal del acta de posesión ante el Secretario Jurídico Distrital.',
              
              posiblesEvidencias: [
                "Acta de Posesión original en formato 2311300-FT-127 firmada ante el Secretario Jurídico Distrital con juramento constitucional",
              ],
            },
              {
                id: 'vl5_4',
                label: 'Entrega manual de funciones y plan de inducción gerencial (2311300-FT-106)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311300-FT-106',
                norma: 'Decreto 1083 de 2015, Art. 2.2.11.2.1 • Ley 951 de 2005 (Acta de Entrega)',
                textoNormativo: 'Entrega del manual de funciones directivas, inducción institucional y suscripción del acta formal de entrega de despacho y empalme conforme a la Ley 951 de 2005.',
                detalleProcedimiento: 'Entrega de responsabilidades misionales, equipos directivos y mapa de riesgos institucionales.',
              
              posiblesEvidencias: [
                "Formato FT-106 suscrito",
          "Acta de empalme y entrega de despacho directivo conforme a los lineamientos de la Ley 951 de 2005",
              ],
            },
            ],
          },
          {
            id: 'v_lnr_6',
            numero: 6,
            titulo: 'Alta en Nómina & SIDEAP',
            subtitulo: 'Seguridad social, asignación salarial y enrolamiento',
            icono: 'checkmark-done-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Nómina / Talento Humano',
            normaGeneral: 'Ley 100 de 1993; Decreto Distrital 580 de 2017; Sistema PERNO',
            plazoLegal: 'Mismo día de la posesión',
            procedimientoDetallado: 'Registro en el sistema de liquidación salarial, afiliaciones de ley y habilitación en los sistemas de gestión documental y firma digital.',
            requisitos: [
              {
                id: 'vl6_1',
                label: 'Afiliación a ARL, EPS, Fondo Pensiones, Cesantías y Caja Compensación',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 100 de 1993 • Decreto 1295 de 1994',
                textoNormativo: 'Afiliación patronal al Sistema de Seguridad Social Integral con vigencia retroactiva a la fecha y hora exacta de posesión del directivo.',
                detalleProcedimiento: 'Afiliar con nivel de riesgo de acuerdo a la matriz ocupacional desde la fecha exacta de posesión.',
              
              posiblesEvidencias: [
                "Radicados oficiales de afiliación ante Positiva ARL (con nivel de riesgo directivo), EPS, Fondo de Pensiones y Caja de Compensación",
              ],
            },
              {
                id: 'vl6_2',
                label: 'Inclusión en nómina institucional (PERNO)',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Distrital 101 de 2004',
                textoNormativo: 'Alta en el sistema de nómina PERNO distrital para imputación de gastos salariales y asignación de gastos de representación si aplican al nivel jerárquico.',
                detalleProcedimiento: 'Vincular cédula, datos bancarios, retención en la fuente y gastos de representación.',
              
              posiblesEvidencias: [
                "Reporte de alta en PERNO con la asignación básica y gastos de representación parametri",
              ],
            },
              {
                id: 'vl6_3',
                label: 'Activación del servidor en el módulo de Talento Humano en SIDEAP',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Distrital 083 de 2001',
                textoNormativo: 'Activación del servidor en el módulo de Talento Humano en SIDEAP habilitando el perfil directivo institucional.',
                detalleProcedimiento: 'Actualizar plaza a ocupada y emitir carné digital institucional.',
              
              posiblesEvidencias: [
                "Ficha de vinculación activa en SIDEAP",
          "Emisión de carné institucional digital y asignación de perfil directivo en el sistema documental",
              ],
            },
            ],
          },
        ];

      case 'PROVISIONALIDAD':
        return [
          {
            id: 'v_prov_1',
            numero: 1,
            titulo: 'Verificación Lista CNSC',
            subtitulo: 'Verificación mérito y constancia de inexistencia de listas',
            icono: 'search-outline',
            estado: 'completed',
            tiempoEstimadoDias: 2,
            responsable: 'Profesional Universitario TH',
            normaGeneral: 'Ley 909 de 2004, Arts. 24 y 25; Decreto 1083 de 2015, Arts. 2.2.5.3.1 y 2.2.5.3.2; Ley 1960 de 2019',
            plazoLegal: 'Verificación previa y reporte obligatorio en SIMO',
            procedimientoDetallado: 'Constatar las alternativas de provisión por mérito en el Banco Nacional de Listas de Elegibles de la CNSC y expedir constancia suscrita de no existencia de listas aplicables antes de acudir a la provisión transitoria.',
            requisitos: [
              {
                id: 'vp1_1',
                label: 'Consulta en Banco Nacional de Listas de Elegibles de la CNSC y Constancia de Inexistencia',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 909 de 2004, Arts. 24 y 25 • Decreto 1083 de 2015, Arts. 2.2.5.3.1 y 2.2.5.3.2 • Disposiciones de Listas de Elegibles',
                notaNormativa: 'Antes de efectuar un nombramiento provisional para proveer una vacante definitiva de un empleo de carrera administrativa, la entidad debe verificar las alternativas de provisión mediante el sistema de mérito, incluyendo la existencia de listas de elegibles vigentes y aplicables. Esta verificación permite establecer si procede acudir a la provisión transitoria, de conformidad con las reglas legales y reglamentarias correspondientes.',
                textoNormativo: 'Decreto 1083 de 2015, artículo 2.2.5.3.1: «Las vacantes definitivas en empleos de carrera se proveerán en periodo de prueba o en ascenso, con las personas que hayan sido seleccionadas mediante el sistema de mérito». El mismo artículo contempla la posibilidad de proveer transitoriamente los empleos de carrera que se encuentren vacantes de manera definitiva mediante encargo o nombramiento provisional, en los términos establecidos en las disposiciones aplicables.\n\nDecreto 1083 de 2015, artículo 2.2.5.3.2: establece las reglas para la provisión de vacantes temporales, incluida la aplicación de las listas de elegibles en los supuestos legalmente previstos. Su aplicación debe examinarse de acuerdo con la naturaleza de la vacante y las circunstancias particulares del empleo.',
                detalleProcedimiento: 'Consultar el Banco Nacional de Listas de Elegibles de la Comisión Nacional del Servicio Civil (CNSC) y verificar si existen listas en firme, vigentes y jurídicamente aplicables al empleo objeto de provisión, incluyendo la procedencia de su uso cuando corresponda. Dejar evidencia documental de la consulta y de su resultado. Cuando no se identifiquen listas aplicables, elaborar una constancia suscrita por el responsable competente que indique, como mínimo, la identificación del empleo, la fecha de consulta, el resultado obtenido y la conclusión sobre la existencia o inexistencia de listas aplicables. Incorporar la constancia y los soportes al expediente del trámite de provisión.',
                posiblesEvidencias: [
                  'Reporte en PDF de consulta en SIMO 4.0 / Banco Nacional de Listas de Elegibles (BNLE).',
                  'Captura de pantalla de la consulta por denominación, código y grado en SIMO con fecha y hora.',
                  'Constancia oficial de inexistencia de listas aplicables suscrita por Dirección de Gestión Corporativa.',
                  'Memorando interno de resultados radicado en el sistema de gestión documental.',
                ],
              },
              {
                id: 'vp1_3',
                label: 'Reporte previo de vacancia definitiva a la CNSC en SIMO (Ley 1960/2019)',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 1960 de 2019, Art. 1, Parágrafo 2 • Decreto 1083 de 2015, Art. 2.2.6.34 • Circular Externa CNSC 011 de 2021',
                notaNormativa: 'Las entidades deben informar a la Comisión Nacional del Servicio Civil (CNSC) la existencia de las vacantes definitivas en empleos de carrera administrativa antes de su provisión mediante encargo o nombramiento provisional. El reporte debe realizarse a través del aplicativo SIMO, conforme a los lineamientos y plazos establecidos por la CNSC, con el propósito de garantizar la adecuada administración de la Oferta Pública de Empleos de Carrera (OPEC).',
                textoNormativo: 'Ley 1960 de 2019, artículo 1, parágrafo 2: «Previo a proveer vacantes definitivas mediante encargo o nombramiento provisional, el nominador o en quien este haya delegado, informará la existencia de la vacante a la Comisión Nacional del Servicio Civil a través del medio que esta indique».\n\nCircular Externa 011 de 2021 de la CNSC: Establece que las entidades deben reportar las vacantes definitivas de empleos de carrera administrativa en el aplicativo SIMO dentro de los cinco (5) días hábiles siguientes a la ocurrencia de la novedad, de acuerdo con las instrucciones y el procedimiento definidos por la Comisión.',
                detalleProcedimiento: 'Reportar en SIMO la vacante definitiva del empleo de carrera administrativa antes de efectuar su provisión transitoria, dentro del plazo establecido por la CNSC. Verificar que la información registrada en la OPEC esté completa y actualizada, y conservar la evidencia del reporte, incluyendo el registro de la vacante y los soportes que permitan acreditar el cumplimiento de esta obligación.',
                posiblesEvidencias: [
                  'Comprobante electrónico de reporte de vacante definitiva emitido por SIMO.',
                  'Captura de pantalla del módulo OPEC institucional con la novedad registrada.',
                  'Acuse de cargue ante la CNSC dentro de los 5 días hábiles siguientes a la novedad.',
                ],
              },
            ],
          },
          {
            id: 'v_prov_2',
            numero: 2,
            titulo: 'Encargo Preferente',
            subtitulo: 'Convocatoria interna carrera (Ley 1960)',
            icono: 'swap-horizontal-outline',
            estado: 'completed',
            tiempoEstimadoDias: 3,
            responsable: 'Profesional Universitario TH',
            normaGeneral: 'Ley 1960 de 2019, Art. 1; Circular CNSC 003 de 2020',
            plazoLegal: '3 días hábiles para postulación de servidores de carrera',
            procedimientoDetallado: 'Antes de vincular a un particular en provisionalidad, la entidad debe ofrecer obligatoriamente el encargo a los empleados con derechos de carrera de la planta institucional que cumplan con el perfil y evaluación sobresaliente.',
            requisitos: [
              {
                id: 'vp2_1',
                label: 'Publicación de convocatoria interna para encargo a servidores de carrera',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 1960 de 2019, Art. 1 • Ley 909 de 2004, Art. 24 • Decreto 1083 de 2015, Art. 2.2.5.3.2',
                textoNormativo: 'Los empleados con derechos de carrera administrativa tienen derecho preferencial a ser encargados de los empleos vacantes de forma definitiva o temporal si cumplen los requisitos del cargo y no tienen sanción disciplinaria.',
                detalleProcedimiento: 'Publicar circular interna en la intranet convocando a servidores titulares de carrera con evaluación destacada.',
                posiblesEvidencias: [
                  'Circular interna numerada y fechada emitida por la Dirección de Gestión Corporativa.',
                  'Captura de pantalla de la publicación en la intranet institucional y cartelera virtual.',
                  'Constancia de envío de correo masivo a los funcionarios de carrera administrativa.',
                ],
              },
              {
                id: 'vp2_2',
                label: 'Evaluación de solicitudes de encargo preferencial',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 1960 de 2019, Art. 1 • Circular Conjunta CNSC 003 de 2020',
                textoNormativo: 'Se debe efectuar la valoración de las postulaciones de servidores de carrera para verificar su última calificación de servicios sobresaliente o satisfactoria y el cumplimiento de requisitos mínimos.',
                detalleProcedimiento: 'Cotejar requisitos del manual, antigüedad y calificación de servicios de los postulados.',
                posiblesEvidencias: [
                  'Matriz o cuadro comparativo de verificación de requisitos y calificación EDL de los postulados.',
                  'Certificados de la última Evaluación del Desempeño Laboral (EDL) sobresaliente o satisfactoria.',
                  'Certificados de antecedentes disciplinarios acreditando no registrar sanción en el último año.',
                ],
              },
              {
                id: 'vp2_3',
                label: 'Verificación del Derecho Preferencial a Encargo y Constancia de Procedencia de Provisión Transitoria',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 909 de 2004, Art. 24 (modificado por Ley 1960 de 2019, Art. 1) • Decreto 1083 de 2015, Art. 2.2.5.3.1',
                notaNormativa: 'La provisión transitoria de una vacante definitiva de carrera administrativa mediante nombramiento provisional procede excepcionalmente cuando no sea posible efectuarla mediante encargo, conforme al orden de provisión y los requisitos legales aplicables. Para ello, la entidad debe verificar el derecho preferencial de los empleados de carrera administrativa y documentar el resultado del procedimiento.',
                textoNormativo: 'Ley 909 de 2004, artículo 24, modificado por el artículo 1 de la Ley 1960 de 2019: «Mientras se surte el proceso de selección para proveer empleos de carrera administrativa, los empleados de carrera tendrán derecho a ser encargados en estos si acreditan los requisitos para su ejercicio, poseen las aptitudes y habilidades para su desempeño, no han sido sancionados disciplinariamente en el último año y su última evaluación del desempeño sea sobresaliente».',
                detalleProcedimiento: 'Verificar y documentar el cumplimiento de los requisitos para el encargo por parte de los empleados de carrera administrativa que puedan tener derecho preferencial sobre la vacante. Incorporar los soportes de la verificación, la publicación de la convocatoria interna cuando corresponda y sus resultados. Si no se identifican servidores con derecho al encargo, o se acredita que no es posible efectuarlo, dejar constancia escrita de las verificaciones realizadas y de sus resultados, como soporte para evaluar la procedencia del nombramiento provisional.',
                posiblesEvidencias: [
                  'Constancia oficial suscrita por el Nominador o Director(a) declarando desierto el encargo preferente.',
                  'Publicación oficial de resultados de la convocatoria interna en la intranet.',
                  'Comunicaciones de declinación o no aceptación voluntaria suscritas por servidores con derecho preferencial.',
                ],
              },
            ],
          },
          {
            id: 'v_prov_3',
            numero: 3,
            titulo: 'Validación Candidato & SECOP II',
            subtitulo: 'SIDEAP, antecedentes, SECOP II y FT-318 IA',
            icono: 'person-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            normaGeneral: 'Art. 128 Constitucional; Ley 80 de 1993; Decreto 1083 de 2015; Formato 2311300-FT-318',
            plazoLegal: '1 día hábil',
            procedimientoDetallado: 'Cotejo del perfil del aspirante, consulta de antecedentes, validación en SECOP II de contratos vigentes incompatibles y emisión de certificación FT-318.',
            requisitos: [
              {
                id: 'vp3_1',
                label: 'Recepción de Hoja de Vida del candidato y cargue en SIDEAP',
                cumplido: true,
                obligatorio: true,
                norma: 'Decreto Distrital 083 de 2001 • Directiva Distrital 001 de 2018',
                textoNormativo: 'Cargue riguroso y verificación de la hoja de vida y soportes del candidato externo en el aplicativo distrital SIDEAP.',
                detalleProcedimiento: 'Validar cargue completo de cédula, diplomas y soportes laborales en SIDEAP.',
              
              posiblesEvidencias: [
                "Hoja de vida de persona natural generada desde el aplicativo SIDEAP",
          "Soportes académicos foliados (diplomas, actas de grado y tarjeta profesional)",
          "Certificaciones laborales con funciones pormenorizadas y fechas ciertas",
              ],
            },
              {
                id: 'vp3_secop',
                label: 'Consulta de contratos activos en SECOP II (Inhabilidades / Art. 128 C.P.)',
                cumplido: false,
                obligatorio: true,
                tipoAccionEspecial: 'SECOP',
                norma: 'Constitución Política, Art. 128 • Ley 80 de 1993, Art. 8 • Ley 1952 de 2019, Art. 38',
                textoNormativo: 'El artículo 128 de la Constitución Política prescribe que nadie podrá desempeñar simultáneamente más de un empleo público ni recibir más de una asignación que provenga del tesoro público. Es obligación de Talento Humano consultar en tiempo real el SECOP II para verificar la inexistencia de contratos estatales en ejecución antes de dar posesión al aspirante.',
                detalleProcedimiento: 'Verificar en la API SECOP II la ausencia de contratos activos con entidades públicas.',
              
              posiblesEvidencias: [
                "Reporte de verificación preventiva expedido por el módulo SECOP II con marca temporal",
          "Declaración bajo gravedad de juramento de no registrar contratos estatales en ejecución",
              ],
            },
              {
                id: 'vp3_2',
                label: 'Consulta de antecedentes judiciales, disciplinarios, fiscales y REDAM',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 1952 de 2019 • Ley 610 de 2000 • Ley 1801 de 2016 • Ley 2097 de 2021',
                textoNormativo: 'Consulta obligatoria de antecedentes disciplinarios (SIRI Procuraduría), de responsabilidad fiscal (SIBOR Contraloría), judiciales (Policía Nacional), medidas correctivas (RNMC) y de no deudor alimentario moroso en el REDAM.',
                detalleProcedimiento: 'Descargar certificados vigentes oficiales de Policía, Procuraduría, Contraloría, Personería y REDAM con fecha del día de verificación.',
                posiblesEvidencias: [
                  'Certificado de antecedentes disciplinarios expedido por la Procuraduría General de la Nación.',
                  'Certificado de antecedentes fiscales expedido por la Contraloría General de la República.',
                  'Certificado de antecedentes judiciales de la Policía Nacional.',
                  'Certificado de no registro en el Registro de Deudores Alimentarios Morosos (REDAM).',
                ],
              },
              {
                id: 'vp3_3',
                label: 'Certificado de Cumplimiento de Requisitos para Tomar Posesión (2311300-FT-318)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311300-FT-318',
                tipoAccionEspecial: 'INGRESOS_IA',
                norma: 'Decreto 1083 de 2015, Arts. 2.2.5.1.4 y 2.2.5.1.5 • Manual Específico de Funciones y Competencias Laborales SJD',
                textoNormativo: 'Corresponde a Talento Humano verificar y expedir el formato institucional oficial 2311300-FT-318 "Certificado de Cumplimiento de Requisitos para Tomar Posesión" (generado en el módulo de Validación Técnica de Ingresos), acreditando que el aspirante cumple los requisitos de estudio y experiencia del cargo antes de expedir el nombramiento y autorizar la posesión.',
                detalleProcedimiento: 'Generar y descargar el archivo oficial de Excel del Formato 2311300-FT-318 desde el módulo de Validación Técnica de Ingresos (con IA), verificar el concepto favorable CUMPLE y suscribir la certificación formal.',
                posiblesEvidencias: [
                  'Formato institucional 2311300-FT-318 "Certificado de Cumplimiento de Requisitos para Tomar Posesión" (archivo Excel oficial descargado de Validación de Ingresos) suscrito por el responsable.',
                  'Reporte técnico de verificación de cumplimiento de requisitos asistido por IA.',
                  'Soportes académicos y laborales validados en el expediente digital.',
                ],
              },
            ],
          },
          {
            id: 'v_prov_4',
            numero: 4,
            titulo: 'Acto de Nombramiento Provisional',
            subtitulo: 'Resolución de nombramiento provisional y motivación',
            icono: 'document-text-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Secretario Jurídico Distrital',
            normaGeneral: 'Decreto 1083 de 2015, Art. 2.2.5.3.1; Formato 2311520-FT-130',
            plazoLegal: '10 días hábiles para aceptación',
            procedimientoDetallado: 'Expedición del acto administrativo con mención expresa de la condición provisional del nombramiento y de la vacancia que lo origina.',
            requisitos: [
              {
                id: 'vp4_1',
                label: 'Elaboración de Resolución de Nombramiento Provisional',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311520-FT-130',
                norma: 'Ley 909 de 2004, Art. 25 • Decreto 1083 de 2015, Art. 2.2.5.3.3',
                textoNormativo: 'La resolución de nombramiento provisional debe motivar expresamente la transitoriedad del empleo, la constancia de encargo desierto y la condición resolutoria del nombramiento hasta cuando la CNSC provea la vacante por concurso.',
                detalleProcedimiento: 'Redactar resolución indicando la naturaleza transitoria y la justificación del encargo desierto.',
              
              posiblesEvidencias: [
                "Formato oficial 2311300-FT-318 (Certificado de Cumplimiento de Requisitos para Tomar Posesión) en Excel firmado con concepto favorable CUMPLE",
          "Matriz de ponderación técnica de experiencia laboral y títulos académicos",
              ],
            },
              {
                id: 'vp4_2',
                label: 'Firma de la resolución por la autoridad nominadora y numeración',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 1437 de 2011, Art. 65 • Estatuto de Bogotá',
                textoNormativo: 'Suscripción por el nominador, radicación con número y fecha oficial en el sistema de gestión documental de la entidad.',
                detalleProcedimiento: 'Someter a firma del Secretario Jurídico Distrital y numeración en correspondencia.',
              
              posiblesEvidencias: [
                "Certificado de antecedentes de Procuraduría, Contraloría, PONAL, Personería, REDAM y RNMC",
          "Comprobante de consulta oficial en el aplicativo SEVCOM del DASCD",
              ],
            },
              {
                id: 'vp4_3',
                label: 'Comunicación oficial al seleccionado indicando 10 días para aceptación',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311520-FT-019',
                norma: 'Decreto 1083 de 2015, Art. 2.2.5.1.6',
                textoNormativo: 'Término legal de diez (10) días hábiles para la aceptación del nombramiento provisional contados desde su comunicación formal.',
                detalleProcedimiento: 'Notificar electrónicamente con plazo perentorio de aceptación formal.',
              
              posiblesEvidencias: [
                "Concepto jurídico de viabilidad suscrito por profesional de Talento Humano",
          "Constancia de verificación de no inhabilidades ni incompatibilidades sobrevinientes",
              ],
            },
            ],
          },
          {
            id: 'v_prov_5',
            numero: 5,
            titulo: 'Posesión & Exámenes Ocupacionales',
            subtitulo: 'Examen médico y Acta de Posesión FT-127',
            icono: 'ribbon-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional TH / SST',
            normaGeneral: 'Decreto 1083 de 2015, Art. 2.2.5.1.8; Formato 2311300-FT-127; Ley 2013 de 2019',
            plazoLegal: 'Fecha de posesión',
            procedimientoDetallado: 'Constatar aptitud médica ocupacional, declaración juramentada de bienes y rentas y formalización del juramento.',
            requisitos: [
              {
                id: 'vp5_1',
                label: 'Examen médico ocupacional de ingreso',
                cumplido: false,
                obligatorio: true,
                norma: 'Resolución 2346 de 2007 • Decreto 1072 de 2015',
                textoNormativo: 'Examen de ingreso de salud ocupacional obligatorio con concepto de aptitud psicofísica favorable emitido por médico especialista.',
                detalleProcedimiento: 'Verificar concepto médico apto sin restricciones impeditivas.',
              
              posiblesEvidencias: [
                "Minuta de Resolución en Formato institucional 2311520-FT-130 con visto bueno",
          "Lista de chequeo previa de requisitos aprobada por la Dirección de Gestión Corporativa",
              ],
            },
              {
                id: 'vp5_2',
                label: 'Declaración juramentada de bienes y rentas y conflicto de intereses',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2013 de 2019, Arts. 2 y 3 • Decreto 830 de 2021',
                textoNormativo: 'Publicación juramentada y obligatoria en SIDEAP / SIGEP II de la declaración de bienes y rentas y registro de conflicto de intereses previo al acto de posesión.',
                detalleProcedimiento: 'Validar radicado de SIDEAP / SIGEP marcando ingreso al servicio.',
              
              posiblesEvidencias: [
                "Resolución firmada por el Secretario Jurídico Distrital con consecutivo institucional y fecha",
          "Acto administrativo radicado oficialmente en el sistema de gestión documental",
              ],
            },
              {
                id: 'vp5_3',
                label: 'Suscripción de Acta de Posesión (Formato 2311300-FT-127)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311300-FT-127',
                norma: 'Constitución Política, Art. 122 • Ley 4 de 1913, Art. 257 • Decreto 1083 de 2015, Art. 2.2.5.1.8',
                textoNormativo: 'Juramento constitucional y formalización del acta de posesión (Formato 2311300-FT-127), asumiendo el servidor la condición de empleado público provisional.',
                detalleProcedimiento: 'Firma formal del acta de posesión y toma de juramento legal.',
              
              posiblesEvidencias: [
                "Oficio de comunicación en Formato 2311520-FT-019 con radicado de salida",
          "Constancia de notificación personal o acuse técnico de correo electrónico certificado",
              ],
            },
            ],
          },
          {
            id: 'v_prov_6',
            numero: 6,
            titulo: 'Nómina & Entrenamiento',
            subtitulo: 'Afiliaciones, nómina PERNO y puesto de trabajo',
            icono: 'checkmark-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Nómina / Talento Humano',
            normaGeneral: 'Ley 100 de 1993; Formato 2311300-FT-106; Sistema PERNO',
            plazoLegal: 'Inmediato',
            procedimientoDetallado: 'Afiliación oportuna a la seguridad social, alta en nómina distrital e inducción en el puesto asignado.',
            requisitos: [
              {
                id: 'vp6_1',
                label: 'Afiliaciones a ARL y Seguridad Social Integral',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 100 de 1993 • Decreto 1295 de 1994',
                textoNormativo: 'Afiliación patronal inmediata a ARL, EPS, Fondo de Pensiones, Cesantías y Caja de Compensación Familiar.',
                detalleProcedimiento: 'Ingresar afiliaciones a Positiva ARL, EPS y fondo de pensiones y cesantías.',
              
              posiblesEvidencias: [
                "Escrito de aceptación del nombramiento radicado dentro del término legal de 10 días",
          "Documento de identidad y manifestación formal de no tener impedimentos sobrevinientes",
              ],
            },
              {
                id: 'vp6_2',
                label: 'Inclusión en nómina (PERNO) y actualización en SIDEAP',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Distrital 101 de 2004',
                textoNormativo: 'Registro en nómina distrital PERNO y activación en el SIDEAP de la Secretaría Jurídica Distrital.',
                detalleProcedimiento: 'Registrar la plaza en nómina y cambiar el estado del servidor a activo.',
              
              posiblesEvidencias: [
                "Acta de posesión suscrita en Formato 2311520-FT-017 por el nominado y el nominador",
          "Declaración Juramentada de Bienes y Rentas descargada de SIDEAP opción Ingreso",
          "Declaración proactiva de bienes y conflictos de interés (Ley 2013 de 2019)",
              ],
            },
              {
                id: 'vp6_3',
                label: 'Inducción y entrenamiento en puesto de trabajo (Formato 2311300-FT-106)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311300-FT-106',
                norma: 'Decreto 1083 de 2015, Art. 2.2.11.2.1 • Formato 2311300-FT-106',
                textoNormativo: 'Inducción institucional, entrega formal del puesto y notificación de las obligaciones y deberes funcionales conforme a la Ley 1952 de 2019.',
                detalleProcedimiento: 'Realizar inducción y suscribir formato institucional FT-106.',
              
              posiblesEvidencias: [
                "Comprobantes de afiliación al Sistema de Seguridad Social Integral (EPS, AFP, ARL Positiva)",
          "Reporte de novedad de posesión procesado en el sistema de nómina PERNO y activación en SIDEAP",
              ],
            },
            ],
          },
        ];

      case 'PRACTICANTE_JUDICANTE':
        return [
          {
            id: 'v_prac_1',
            numero: 1,
            titulo: 'CDP & Requerimientos',
            subtitulo: 'Apropiación presupuestal y plazas (PR-137)',
            icono: 'cash-outline',
            estado: 'completed',
            tiempoEstimadoDias: 3,
            responsable: 'Gestión Financiera / Talento Humano',
            normaGeneral: 'Ley 2043 de 2020; Ley 1780 de 2016; Resolución 3546 de 2018 MinTrabajo; Ley 789 de 2002, Art. 30',
            plazoLegal: 'Vigencia del periodo presupuestal',
            procedimientoDetallado: 'Garantizar la disponibilidad presupuestal para el pago del auxilio de sostenimiento (si es remunerada) y la cobertura obligatoria de la ARL durante todo el periodo formativo.',
            requisitos: [
              {
                id: 'vj1_1',
                label: 'Solicitud y expedición de CDP para auxilio de sostenimiento / ARL en vigencia',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 2043 de 2020 • Decreto 111 de 1996 • Estatuto Orgánico de Presupuesto',
                textoNormativo: 'Antes de convocar o vincular practicantes o judicantes remunerados se debe expedir el Certificado de Disponibilidad Presupuestal (CDP) en Bogdata para amparar el auxilio de sostenimiento y el pago de aportes a ARL.',
                detalleProcedimiento: 'Expedir Certificado de Disponibilidad Presupuestal con rubro específico de prácticas o judicaturas.',
              
              posiblesEvidencias: [
                "Certificado de Disponibilidad Presupuestal (CDP) expedido en el sistema Bogdata con rubro específico de auxilio y seguridad social",
              ],
            },
              {
                id: 'vj1_2',
                label: 'Consolidación de requerimientos de dependencias y perfiles requeridos',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 2043 de 2020, Art. 4 • Procedimiento Institucional PR-137',
                textoNormativo: 'Las áreas de la entidad deben presentar las necesidades formativas justificadas para que la práctica guarde estricta relación con el plan de estudios del estudiante.',
                detalleProcedimiento: 'Recepcionar las solicitudes de estudiantes de derecho y áreas afines remitidas por las direcciones.',
              
              posiblesEvidencias: [
                "Formato PR-137 de solicitud de practicante/judicante diligenciado y justificado por las direcciones solicitantes",
              ],
            },
              {
                id: 'vj1_3',
                label: 'Registro de plazas en módulo de prácticas laborales de SIDEAP',
                cumplido: true,
                obligatorio: true,
                norma: 'Directiva Distrital 001 de 2018 • Módulo de Prácticas SIDEAP',
                textoNormativo: 'Registro de las plazas de prácticas en el módulo correspondiente de SIDEAP para garantizar la transparencia y seguimiento en el Distrito Capital.',
                detalleProcedimiento: 'Registrar la oferta institucional de prácticas en la plataforma distrital de prácticas formativas.',
              
              posiblesEvidencias: [
                "Ficha técnica de registro de la plaza formativa en el módulo de prácticas de SIDEAP",
          "Certificación institucional de cupo formativo habilitado en la Secretaría",
              ],
            },
            ],
          },
          {
            id: 'v_prac_2',
            numero: 2,
            titulo: 'Convocatoria & Selección',
            subtitulo: 'Publicación, entrevista y preselección académica',
            icono: 'people-outline',
            estado: 'completed',
            tiempoEstimadoDias: 5,
            responsable: 'DASCD / Dependencia Receptora',
            normaGeneral: 'Ley 2043 de 2020; Ley 552 de 1999; Convenio Docencia-Servicio Interinstitucional',
            plazoLegal: '5 días hábiles para postulación',
            procedimientoDetallado: 'Convocatoria abierta para estudiantes con materias terminadas y pendientes de judicatura ad-honorem o práctica profesional obligatoria.',
            requisitos: [
              {
                id: 'vj2_1',
                label: 'Publicación de convocatoria oficial en portal web institucional / DASCD',
                cumplido: true,
                obligatorio: true,
                norma: 'Resolución 3546 de 2018 MinTrabajo, Art. 7 • Portal Distrital DASCD',
                textoNormativo: 'Publicación de la convocatoria de prácticas formativas en los canales oficiales y coordinación con facultades y consultorios jurídicos acreditados.',
                detalleProcedimiento: 'Publicar los términos de la convocatoria y requisitos de postulación académica.',
              
              posiblesEvidencias: [
                "Publicación de términos de convocatoria en la web distrital",
          "Comunicaciones dirigidas a facultades de derecho y universidades con convenio",
              ],
            },
              {
                id: 'vj2_2',
                label: 'Verificación carta de presentación de la universidad y plan de práctica académica',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 552 de 1999 • Ley 2043 de 2020, Art. 3 • Res. 3546 de 2018',
                textoNormativo: 'Verificación de la carta oficial de presentación suscrita por el decano o director de consultorio jurídico de la institución de educación superior debidamente reconocida por el MEN.',
                detalleProcedimiento: 'Validar carta oficial de decanatura y plan de actividades aprobado por la facultad.',
              
              posiblesEvidencias: [
                "Carta oficial de presentación suscrita por el Decano de la Facultad o Director del Consultorio Jurídico",
          "Certificado de terminación de materias académicas",
              ],
            },
              {
                id: 'vj2_3',
                label: 'Entrevista en dependencia receptora y remisión de acta de selección final',
                cumplido: true,
                obligatorio: true,
                norma: 'Resolución 3546 de 2018 MinTrabajo, Art. 12',
                textoNormativo: 'Entrevista técnica formativa y designación formal del tutor institucional que supervisará y evaluará el desempeño del practicante o judicante.',
                detalleProcedimiento: 'Realizar entrevista técnica y remitir acta de selección del judicante seleccionado.',
              
              posiblesEvidencias: [
                "Formato de entrevista técnica de selección",
          "Acta de escogencia del estudiante suscrita por el tutor y el director de área",
              ],
            },
            ],
          },
          {
            id: 'v_prac_3',
            numero: 3,
            titulo: 'Resolución Formativa & SECOP II',
            subtitulo: 'Antecedentes, SECOP II y resolución de vinculación',
            icono: 'document-text-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 3,
            responsable: 'Profesional Especializado TH',
            normaGeneral: 'Resolución 3546 de 2018 MinTrabajo; Ley 80 de 1993; Ley 2043 de 2020',
            plazoLegal: '3 días hábiles',
            procedimientoDetallado: 'Verificación de antecedentes, constatar que no tenga contratos estatales en ejecución vía SECOP II y expedición de la resolución de vinculación formativa.',
            requisitos: [
              {
                id: 'vj3_1',
                label: 'Consulta de antecedentes SIRI, SIBOR, Policía, Personería, RNMC y REDAM',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 1952 de 2019 • Ley 610 de 2000 • Ley 1801 de 2016 • Ley 2097 de 2021',
                textoNormativo: 'Verificación preventiva de antecedentes judiciales, disciplinarios, fiscales, medidas de policía y REDAM para estudiantes aspirantes a práctica.',
                detalleProcedimiento: 'Verificar certificados disciplinarios, fiscales, policiales y REDAM sin anotaciones.',
              
              posiblesEvidencias: [
                "Certificados de antecedentes descargados en línea verificando ausencia de inhabilidades o deudas alimentarias",
              ],
            },
              {
                id: 'vj3_secop',
                label: 'Verificación en SECOP II de ausencia de contratos incompatibles',
                cumplido: false,
                obligatorio: true,
                tipoAccionEspecial: 'SECOP',
                norma: 'Constitución Política, Art. 128 • Ley 80 de 1993, Art. 8 • Ley 1952 de 2019, Art. 38',
                textoNormativo: 'El artículo 128 de la Constitución Política prescribe que nadie podrá desempeñar simultáneamente más de un empleo público ni recibir más de una asignación que provenga del tesoro público. Es obligación de Talento Humano consultar en tiempo real el SECOP II para verificar la inexistencia de contratos estatales en ejecución antes de dar posesión al aspirante.',
                detalleProcedimiento: 'Consultar en línea si el estudiante posee contratos con el estado que generen incompatibilidad.',
              
              posiblesEvidencias: [
                "Reporte técnico de consulta en SECOP II certificando ausencia de contratos estatales incompatibles con la dedicación horaria formativa",
              ],
            },
              {
                id: 'vj3_2',
                label: 'Proyección de Resolución de Vinculación Formativa',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 80 de 1993, Art. 8 • Constitución Política, Art. 128',
                textoNormativo: 'Consulta en SECOP II para corroborar que el estudiante no cuente con contratos activos incompatibles con la dedicación horaria de la práctica formativa.',
                detalleProcedimiento: 'Redactar resolución indicando plazo de práctica (mínimo 6 o 9 meses judicatura) y tutor asignado.',
              
              posiblesEvidencias: [
                "Proyecto de resolución de vinculación indicando periodo (6 o 9 meses), auxilio económico y designación del tutor institucional",
              ],
            },
              {
                id: 'vj3_3',
                label: 'Firma por Director(a) de Gestión Corporativa y notificación formal',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311520-FT-019',
                norma: 'Ley 2043 de 2020, Art. 5 • Resolución 3546 de 2018 MinTrabajo, Art. 10',
                textoNormativo: 'La vinculación formativa se formaliza mediante resolución expedida por la Dirección de Gestión Corporativa, señalando término de duración, tutor, horario y auxilio si aplica.',
                detalleProcedimiento: 'Someter a firma y notificar al estudiante y a la universidad correspondiente.',
              
              posiblesEvidencias: [
                "Resolución suscrita por la Dirección de Gestión Corporativa, numerada y con notificación oficial al estudiante y a la universidad",
              ],
            },
            ],
          },
          {
            id: 'v_prac_4',
            numero: 4,
            titulo: 'ARL & Registro CRP en Bogdata',
            subtitulo: 'Afiliación ARL y reserva presupuestal oficial',
            icono: 'shield-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Auxiliar TH / Gestión Financiera',
            normaGeneral: 'Decreto 055 de 2015 MinSalud; Procedimiento Bogdata 2311420-PR-063',
            plazoLegal: 'Previo al primer día de práctica',
            procedimientoDetallado: 'Afiliación de ley al Sistema General de Riesgos Laborales (ARL Positiva con cargo al 100% de la entidad) y generación del CRP en el sistema Bogdata.',
            requisitos: [
              {
                id: 'vj4_1',
                label: 'Afiliación obligatoria a ARL por la entidad (Resolución 3546/2018)',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto 055 de 2015 • Decreto 1072 de 2015, Art. 2.2.4.2.3.1 • Res. 3546 de 2018',
                textoNormativo: 'La entidad pública contratante tiene la obligación inexcusable de afiliar y cotizar al practicante o judicante al Sistema General de Riesgos Laborales (ARL) a través de la ARL Positiva un (1) día antes del inicio de actividades.',
                detalleProcedimiento: 'Afiliar a Positiva ARL indicando centro de trabajo y actividades formativas.',
              
              posiblesEvidencias: [
                "Formulario y radicado de afiliación a Positiva ARL con cobertura un (1) día previo al inicio efectivo de la práctica",
              ],
            },
              {
                id: 'vj4_2',
                label: 'Solicitud y expedición de Certificado de Registro Presupuestal (CRP)',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto 111 de 1996 • Procedimiento Presupuestal 2311420-PR-063',
                textoNormativo: 'Expedición del Certificado de Registro Presupuestal (CRP) en Bogdata para amparar el compromiso presupuestal del auxilio y la seguridad social.',
                detalleProcedimiento: 'Imputar el valor del auxilio al CDP expedido en el aplicativo Bogdata.',
              
              posiblesEvidencias: [
                "Certificado de Registro Presupuestal (CRP) expedido en Bogdata imputando el valor del auxilio al CDP",
              ],
            },
              {
                id: 'vj4_3',
                label: 'Suscripción del Acta de Inicio de práctica o judicatura',
                cumplido: false,
                obligatorio: true,
                norma: 'Resolución 3546 de 2018 MinTrabajo, Art. 11',
                textoNormativo: 'Suscripción del acta de inicio formal con participación del estudiante, el tutor institucional y el responsable de Talento Humano.',
                detalleProcedimiento: 'Firmar acta de inicio suscrita por el judicante, el tutor y Talento Humano.',
              
              posiblesEvidencias: [
                "Acta de Inicio original debidamente firmada por el practicante, el tutor asignado y el responsable de Talento Humano",
              ],
            },
              {
                id: 'vj4_4',
                label: 'Solicitud de creación de tercero en Bogdata (Procedimiento 2311420-PR-063)',
                cumplido: false,
                obligatorio: true,
                norma: 'Procedimiento Distrital 2311420-PR-063 en Sistema Bogdata',
                textoNormativo: 'Creación y registro formal del practicante como tercero acreedor en la plataforma Bogdata de la Secretaría Distrital de Hacienda.',
                detalleProcedimiento: 'Crear la cuenta bancaria del estudiante en la Secretaría Distrital de Hacienda.',
              
              posiblesEvidencias: [
                "Formato de creación de tercero en la Secretaría Distrital de Hacienda",
          "Certificación bancaria del estudiante",
              ],
            },
            ],
          },
          {
            id: 'v_prac_5',
            numero: 5,
            titulo: 'Inducción & Ejecución Formativa',
            subtitulo: 'Salud, tutor y seguimiento mensual con informes',
            icono: 'ribbon-outline',
            estado: 'pending',
            tiempoEstimadoDias: 30,
            responsable: 'Tutor / Profesional SST',
            normaGeneral: 'Ley 2043 de 2020 (Validez como experiencia profesional); Sistema de Gestión SST SJD',
            plazoLegal: 'Mensual durante la vigencia de la judicatura',
            procedimientoDetallado: 'Acompañamiento por el tutor institucional, control de asistencia, verificación de condiciones de salud y radicación de informes mensuales de avance.',
            requisitos: [
              {
                id: 'vj5_1',
                label: 'Diligenciamiento de encuesta de condiciones de salud inicial',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto 1072 de 2015 • SG-SST Institucional',
                textoNormativo: 'Diligenciamiento de la encuesta de condiciones de salud previa para identificación de riesgos ocupacionales y ergonomía.',
                detalleProcedimiento: 'Aplicar la encuesta de autoreporte de condiciones de salud institucional.',
              
              posiblesEvidencias: [
                "Formato de encuesta de autoreporte de condiciones de salud inicial y ergonomía revisado por SST",
              ],
            },
              {
                id: 'vj5_2',
                label: 'Inducción institucional y entrega de puesto de trabajo',
                cumplido: false,
                obligatorio: true,
                norma: 'Resolución 3546 de 2018 MinTrabajo, Art. 14',
                textoNormativo: 'Inducción al quehacer institucional, asignación del puesto físico/digital y entrega de herramientas informáticas.',
                detalleProcedimiento: 'Brindar inducción de la entidad y asignar computador y correo institucional.',
              
              posiblesEvidencias: [
                "Acta de inducción y entrega de herramientas informáticas y credenciales distritales",
              ],
            },
              {
                id: 'vj5_3',
                label: 'Radicación de informes mensuales de actividades aprobados por el tutor',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 552 de 1999 • Ley 2043 de 2020, Art. 6',
                textoNormativo: 'Presentación periódica y radicación de los informes de actividades jurídicas o administrativas debidamente aprobados por el tutor asignado.',
                detalleProcedimiento: 'Verificar la presentación mensual de informes con visto bueno del tutor asignado.',
              
              posiblesEvidencias: [
                "Informes mensuales de actividades jurídicas o administrativas radicados en el sistema documental, con visto bueno y firma del tutor institucional",
              ],
            },
            ],
          },
          {
            id: 'v_prac_6',
            numero: 6,
            titulo: 'Pago & Certificación Final',
            subtitulo: 'Apoyo económico y certificado oficial de judicatura',
            icono: 'checkmark-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Gestión Financiera / Dirección',
            normaGeneral: 'Ley 2043 de 2020, Art. 6; Ley 552 de 1999; Acuerdo Consejo Superior de la Judicatura',
            plazoLegal: 'Al término del periodo formativo',
            procedimientoDetallado: 'Tramitar el pago mensual del apoyo económico y expedir la Certificación Final con indicación de fechas, horas cumplidas y concepto favorable para su convalidación ante el CSJ o la universidad.',
            requisitos: [
              {
                id: 'vj6_1',
                label: 'Trámite mensual de pago de apoyo de sostenimiento con soporte bancario',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2043 de 2020, Art. 7 • Procedimiento Contable Bogdata',
                textoNormativo: 'Trámite mensual de desembolso del apoyo económico de sostenimiento previa certificación de cumplimiento expedida por el tutor.',
                detalleProcedimiento: 'Generar orden de giro mensual en Bogdata previa certificación del tutor.',
              
              posiblesEvidencias: [
                "Certificación mensual de cumplimiento de actividades expedida por el tutor",
          "Orden de pago y soporte de transferencia bancaria en Bogdata",
              ],
            },
              {
                id: 'vj6_2',
                label: 'Expedición de Certificación Final de Práctica / Judicatura firmada por Dirección',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2043 de 2020, Arts. 6 y 8 • Ley 552 de 1999 • Decreto 1083 de 2015',
                textoNormativo: 'Expedición formal de la Certificación de Práctica / Judicatura, la cual es válida como experiencia profesional computable para el ejercicio de la profesión y provisión de empleos públicos.',
                detalleProcedimiento: 'Expedir certificación con firmas oficiales para el trámite del título de abogado o tarjeta profesional.',
              
              posiblesEvidencias: [
                "Certificación Final original firmada por la Dirección de Gestión Corporativa acreditando periodo, horas cumplidas, modalidad y concepto favorable (válida como experiencia profesional computable según Ley 2043/2020 ante el Consejo Superior de la Judicatura)",
              ],
            },
            ],
          },
        ];
    }
  } else {
    // DESVINCULACIÓN (Procedimiento PR-074 y PR-137 diferenciado por régimen constitucional)
    switch (modalidad) {
      case 'CARRERA_ADMINISTRATIVA':
        return [
          {
            id: 'd_carr_1',
            numero: 1,
            titulo: 'Causal & Soportes Legales',
            subtitulo: 'Recepción y verificación legal de retiro de carrera',
            icono: 'document-text-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            normaGeneral: 'Ley 909 de 2004, Art. 41; Decreto 1083 de 2015, Art. 2.2.11.1.1 al 2.2.11.1.11; Formato 2311520-FT-018',
            plazoLegal: '30 días para resolver solicitudes de renuncia (Art. 2.2.11.1.2)',
            procedimientoDetallado: 'Radicar y constatar la causal jurídica de retiro del servicio de carrera (renuncia libre y espontánea, pensión de vejez/invalidez, declaratoria de insubsistencia por período de prueba o EDL no satisfactoria, retiro forzoso a los 70 años según Ley 1821 de 2016 o supresión de empleo con derechos preferenciales).',
            requisitos: [
              {
                id: 'dc1_1',
                label: 'Recepción del documento soporte de retiro de carrera (Formato 2311520-FT-018)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311520-FT-018',
                norma: 'Ley 909 de 2004, Art. 41 • Decreto 1083 de 2015, Art. 2.2.11.1.1',
                notaNormativa: 'El retiro del servicio de carrera procede taxativamente por causales legales objetivas que deben estar sustentadas documentalmente antes de proferir el acto de desvinculación.',
                textoNormativo: 'Ley 909 de 2004, artículo 41: El retiro del servicio de quienes estén desempeñando empleos de libre nombramiento y remoción y de carrera administrativa se produce por las causales consagradas taxativamente en la ley.',
                detalleProcedimiento: 'Radicar en el sistema documental el soporte formal de retiro con firma auténtica del servidor de carrera, acto administrativo pensional o constancia de calificación.',
                posiblesEvidencias: [
                  'Memorial de renuncia libre y espontánea radicado en el sistema de gestión documental.',
                  'Resolución de reconocimiento pensional expedida por Colpensiones o fondo privado.',
                  'Formato institucional 2311520-FT-018 de verificación de trámite de personal.',
                ],
              },
              {
                id: 'dc1_2',
                label: 'Verificación estricta de la causal y garantías de carrera (Art. 41 y 44 Ley 909)',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 909 de 2004, Art. 41 y Art. 44 • Decreto 1083 de 2015, Art. 2.2.11.1.1',
                notaNormativa: 'Constatación rigurosa de que la causal invocada respete la estabilidad laboral propia de los derechos de carrera administrativa y fueros especiales.',
                textoNormativo: 'Los empleados de carrera que sean retirados por supresión del empleo tienen derecho preferencial a ser reincorporados a empleos iguales o equivalentes, o a recibir la indemnización legal consagrada en el artículo 44 de la Ley 909 de 2004.',
                detalleProcedimiento: 'Constatar que la causal encuadre taxativamente en la ley y verificar que no concurran fueros de estabilidad reforzada sin trámite previo.',
                posiblesEvidencias: [
                  'Concepto de viabilidad jurídica de retiro de carrera expedido por Talento Humano.',
                  'Certificación de verificación de derechos de carrera administrativa y fueros.',
                ],
              },
              {
                id: 'dc1_3',
                label: 'Verificación de inclusión en nómina pensional o renuncia no condicionada',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 100 de 1993, Art. 33 (modificado Ley 797/2003) • Sentencia C-1037/2003 • Decreto 1083 de 2015, Art. 2.2.11.1.3',
                notaNormativa: 'Garantía constitucional de no retiro por pensión hasta tanto el servidor no figure efectivamente incorporado en la nómina de pago de la administradora de pensiones.',
                textoNormativo: 'De conformidad con la jurisprudencia constitucional unificada (C-1037 de 2003), no se podrá desvincular al servidor que cumple requisitos de pensión hasta tanto no se le notifique su inclusión en la nómina pensional correspondiente.',
                detalleProcedimiento: 'Comprobar soporte de inclusión en nómina de pensionados o cerciorarse de que la renuncia sea libre, espontánea y con fecha cierta sin fórmulas preimpresas.',
                posiblesEvidencias: [
                  'Constancia o certificación de inclusión en nómina pensional emitida por la entidad administradora.',
                  'Escrito de renuncia sin enmendaduras con manifestación inequívoca de voluntad.',
                ],
              },
            ],
          },
          {
            id: 'd_carr_2',
            numero: 2,
            titulo: 'Acto Administrativo de Retiro',
            subtitulo: 'Resolución de retiro motivada y notificación formal',
            icono: 'newspaper-outline',
            estado: 'completed',
            tiempoEstimadoDias: 2,
            responsable: 'Nominador / Técnico Notificaciones',
            normaGeneral: 'Decreto 1083 de 2015, Art. 2.2.11.1.2; Formato 2311520-FT-130; CPACA Art. 67 y 74',
            plazoLegal: 'Debe notificarse antes de la fecha de efectividad del retiro',
            procedimientoDetallado: 'Proyectar, suscribir y notificar el acto administrativo que acepta la renuncia, declara la insubsistencia motivada o retira formalmente del servicio de carrera al funcionario.',
            requisitos: [
              {
                id: 'dc2_1',
                label: 'Elaboración de Resolución de Retiro motivada (Formato 2311520-FT-130)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311520-FT-130',
                norma: 'Decreto 1083 de 2015, Art. 2.2.11.1.2 • CPACA Ley 1437 de 2011',
                textoNormativo: 'El acto administrativo de retiro de un empleado de carrera debe fundamentarse en la causal legal comprobada, expresando los motivos fácticos y jurídicos correspondientes.',
                detalleProcedimiento: 'Proyectar la resolución motivando con precisión la causal de retiro, la fecha exacta del último día laborado y la orden de liquidación de prestaciones.',
                posiblesEvidencias: [
                  'Proyecto de resolución de retiro en formato institucional 2311520-FT-130 con visto bueno jurídico.',
                ],
              },
              {
                id: 'dc2_2',
                label: 'Firma por autoridad nominadora, numeración y fechado oficial',
                cumplido: true,
                obligatorio: true,
                norma: 'Decreto Distrital 323 de 2016 • Estatuto Orgánico de Bogotá',
                textoNormativo: 'El acto de retiro debe ser suscrito por la autoridad nominadora competente, radicado, numerado y fechado oficialmente para que surta plenos efectos jurídicos.',
                detalleProcedimiento: 'Someter a firma del Secretario Jurídico Distrital y posterior radicación y numeración consecutiva en correspondencia oficial.',
                posiblesEvidencias: [
                  'Resolución de retiro suscrita por el nominador, debidamente numerada y fechada.',
                ],
              },
              {
                id: 'dc2_3',
                label: 'Notificación personal formal e indicación de recursos de ley (CPACA)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311520-FT-019',
                norma: 'Ley 1437 de 2011, Arts. 67, 69 y 74 • Decreto 1083 de 2015, Art. 2.2.11.1.2',
                textoNormativo: 'Los actos que decidan el retiro del servicio en carrera administrativa deben ser notificados personalmente al interesado; cuando procedan recursos legales, se advertirán expresamente en la diligencia.',
                detalleProcedimiento: 'Notificar personalmente o por medios electrónicos autorizados, advirtiendo los recursos procedentes si es del caso (reposición en casos de período de prueba o EDL).',
                posiblesEvidencias: [
                  'Acta de notificación personal o constancia de notificación electrónica con acuse de recibo certificado.',
                ],
              },
            ],
          },
          {
            id: 'd_carr_3',
            numero: 3,
            titulo: 'Formatos Entrega de Cargo',
            subtitulo: 'FT-333, FT-219, FT-436 y SIDEAP Retiro',
            icono: 'folder-open-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 2,
            responsable: 'Servidor saliente / Control Interno',
            normaGeneral: 'Ley 951 de 2005; Ley 2013 de 2019; Procedimiento PR-074 SJD',
            plazoLegal: 'Hasta el último día de permanencia en el cargo',
            procedimientoDetallado: 'El servidor saliente de carrera debe diligenciar los formatos de entrega de cargo, encuestas de retiro y actualizar su declaración jurada de bienes y conflicto de intereses en SIDEAP/SIGEP II marcando Retiro.',
            requisitos: [
              {
                id: 'dc3_1',
                label: 'Diligenciamiento de Evaluación de Retiro (Formato 2311300-FT-219)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311300-FT-219',
                norma: 'Procedimiento 2311420-PR-074 SJD',
                detalleProcedimiento: 'Diligenciar la encuesta estructurada de clima organizacional y motivos de retiro del servicio.',
                posiblesEvidencias: [
                  'Formato institucional 2311300-FT-219 diligenciado y firmado por el funcionario saliente.',
                ],
              },
              {
                id: 'dc3_2',
                label: 'Entrega de Cargo por Ausencia Temporal o Retiro Definitivo (2311300-FT-436)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311300-FT-436',
                norma: 'Procedimiento 2311420-PR-074 SJD',
                detalleProcedimiento: 'Detallar inventario de trámites pendientes, procesos jurídicos a cargo, claves de acceso y estado del archivo en gestión.',
                posiblesEvidencias: [
                  'Formato 2311300-FT-436 suscrito por el funcionario saliente y su jefe inmediato.',
                ],
              },
              {
                id: 'dc3_3',
                label: 'Declaración de Bienes y Rentas en SIDEAP marcando opción Retiro',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2013 de 2019, Arts. 2 y 3 • Decreto 830 de 2021',
                textoNormativo: 'Los servidores públicos deben publicar y actualizar en el SIDEAP/SIGEP II su declaración jurada de bienes y rentas al momento de su retiro del servicio.',
                detalleProcedimiento: 'Generar y radicar el certificado digital de SIDEAP de declaración de bienes actualizada al último día de labores.',
                posiblesEvidencias: [
                  'Certificado digital de declaración de bienes y rentas en SIDEAP con marcación de Retiro.',
                ],
              },
              {
                id: 'dc3_4',
                label: 'Declaración proactiva de Conflicto de Intereses seleccionando Retiro',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2013 de 2019 • Ley 1437 de 2011',
                detalleProcedimiento: 'Diligenciar en la plataforma de la Función Pública la declaración de inhabilidades e incompatibilidades posteriores al cargo.',
                posiblesEvidencias: [
                  'Formulario de conflicto de intereses con corte de retiro debidamente radicado.',
                ],
              },
            ],
          },
          {
            id: 'd_carr_4',
            numero: 4,
            titulo: 'Examen & 4 Paz y Salvos',
            subtitulo: 'Egreso SST, TIC, Almacén y Archivo',
            icono: 'checkbox-outline',
            estado: 'pending',
            tiempoEstimadoDias: 3,
            responsable: 'SST / TIC / Almacén / Archivo',
            normaGeneral: 'Resolución 2346 de 2007 MinProtección, Art. 6; Ley 594 de 2000; Procedimiento PR-074 SJD',
            plazoLegal: 'Examen médico dentro de los 5 días hábiles siguientes al retiro',
            procedimientoDetallado: 'Trámite integral de los 4 paz y salvos institucionales: entrega de equipos TIC y revocación de accesos, descargo de bienes en Almacén (FT-200), transferencia documental en Archivo y paz y salvo de Talento Humano.',
            requisitos: [
              {
                id: 'dc4_1',
                label: 'Citación y práctica de Examen Médico Ocupacional de Egreso (plazo 5 días hábiles)',
                cumplido: false,
                obligatorio: true,
                norma: 'Resolución 2346 de 2007, Art. 6 • Decreto 1072 de 2015',
                textoNormativo: 'Las evaluaciones médicas ocupacionales de egreso tienen por objetivo valorar y registrar las condiciones de salud en las que el trabajador se retira de la entidad.',
                detalleProcedimiento: 'Remitir orden médica para valoración de egreso en IPS ocupacional o archivar carta de desistimiento voluntario suscrita por el servidor.',
                posiblesEvidencias: [
                  'Certificado de examen médico ocupacional de egreso o acta de desistimiento voluntario.',
                ],
              },
              {
                id: 'dc4_2',
                label: 'Paz y Salvo TIC: Entrega de computador, periféricos, buzón y accesos',
                cumplido: false,
                obligatorio: true,
                norma: 'Política de Seguridad de la Información SJD; ISO 27001',
                detalleProcedimiento: 'Recibir hardware, desactivar buzón corporativo de correo, token VPN y perfiles de acceso a bases de datos.',
                posiblesEvidencias: [
                  'Formato de paz y salvo de la Dirección de TIC firmado.',
                ],
              },
              {
                id: 'dc4_3',
                label: 'Paz y Salvo Almacén: Devolución de bienes muebles individuales (2311500-FT-200)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311500-FT-200',
                norma: 'Procedimiento de Almacén e Inventarios SJD',
                detalleProcedimiento: 'Verificar descargo total de bienes muebles e individuales asignados al funcionario de carrera en el inventario del Almacén.',
                posiblesEvidencias: [
                  'Formato 2311500-FT-200 con firma del responsable de Almacén certificando paz y salvo.',
                ],
              },
              {
                id: 'dc4_4',
                label: 'Paz y Salvo Archivo: Transferencia de expedientes judiciales y administrativos',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 594 de 2000 Ley General de Archivos; Tablas de Retención Documental SJD',
                detalleProcedimiento: 'Constatar la transferencia formal de expedientes físicos y electrónicos conforme a las TRD institucionales.',
                posiblesEvidencias: [
                  'Paz y salvo firmado por el área de Gestión Documental y Archivo.',
                ],
              },
              {
                id: 'dc4_5',
                label: 'Paz y Salvo Talento Humano: Devolución carné institucional y firmas consolidadas',
                cumplido: false,
                obligatorio: true,
                norma: 'Procedimiento 2311420-PR-074 SJD',
                detalleProcedimiento: 'Devolución física del carné institucional y consolidación de las cuatro (4) firmas en el formato de Paz y Salvo General.',
                posiblesEvidencias: [
                  'Formato consolidado de Paz y Salvo General con las cuatro firmas institucionales.',
                ],
              },
            ],
          },
          {
            id: 'd_carr_5',
            numero: 5,
            titulo: 'Liquidación & Nómina',
            subtitulo: 'Cálculo de prestaciones sociales y ordenación de pago',
            icono: 'cash-outline',
            estado: 'pending',
            tiempoEstimadoDias: 3,
            responsable: 'Profesional Especializado Nómina',
            normaGeneral: 'Decreto Ley 1045 de 1978, Art. 45; Decreto Distrital 514 de 2006; Formato 2311520-FT-130',
            plazoLegal: 'Pago dentro de la siguiente nómina ordinaria o máximo 15 días',
            procedimientoDetallado: 'Registro de novedad de retiro en nómina PERNO, desactivación en SIDEAP, liquidación de prestaciones sociales proporcionales y expedición de la resolución de reconocimiento y ordenación de pago.',
            requisitos: [
              {
                id: 'dc5_1',
                label: 'Registro de novedad de retiro en nómina y desactivación en SIDEAP',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Distrital 083 de 2001 • Directiva DASCD 001 de 2018',
                detalleProcedimiento: 'Registrar la novedad de retiro definitivo en el sistema distrital PERNO y actualizar ficha en SIDEAP a estado retirado.',
                posiblesEvidencias: [
                  'Reporte de novedad de retiro procesado en PERNO.',
                  'Ficha de SIDEAP con estado Retirado.',
                ],
              },
              {
                id: 'dc5_2',
                label: 'Liquidación técnica de prestaciones sociales de carrera (Dec. Ley 1045/1978)',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Ley 1045 de 1978 • Decreto Distrital 514 de 2006',
                detalleProcedimiento: 'Liquidar días laborados del mes, prima de servicios, prima de navidad, cesantías consolidadas y vacaciones compensadas en dinero.',
                posiblesEvidencias: [
                  'Hoja técnica de liquidación de prestaciones sociales y factores salariales de carrera.',
                ],
              },
              {
                id: 'dc5_3',
                label: 'Elaboración de Resolución de Reconocimiento y Liquidación (2311520-FT-130)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311520-FT-130',
                norma: 'Estatuto Presupuestal Distrital • Procedimiento 2311420-PR-001',
                detalleProcedimiento: 'Proyectar el acto administrativo de liquidación económica suscrito por el ordenador del gasto competente.',
                posiblesEvidencias: [
                  'Resolución de liquidación firmada por el ordenador del gasto.',
                ],
              },
              {
                id: 'dc5_4',
                label: 'Notificación del acto de liquidación y remisión formal a Tesorería para pago',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 1437 de 2011 • Tesorería Distrital SJD',
                detalleProcedimiento: 'Notificar al exfuncionario y remitir expediente liquidatorio a Tesorería para dispersión bancaria.',
                posiblesEvidencias: [
                  'Comprobante de dispersión bancaria y orden de pago de Tesorería.',
                ],
              },
            ],
          },
          {
            id: 'd_carr_6',
            numero: 6,
            titulo: 'SIMO 4.4, RPCA & Cierre CNSC',
            subtitulo: 'Reporte obligatorio CNSC (5 días) y cancelación RPCA',
            icono: 'checkmark-done-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 5,
            responsable: 'Profesional TH / Archivo',
            normaGeneral: 'Circular CNSC 011 de 2021; Ley 909 de 2004, Arts. 14 y 31; Ley 594 de 2000',
            plazoLegal: 'Reporte CNSC dentro de los 5 días hábiles siguientes al retiro',
            procedimientoDetallado: 'Para servidores de carrera: reporte de la vacancia definitiva en SIMO 4.4 ante la CNSC dentro de los 5 días hábiles, trámite de cancelación del Registro Público de Carrera Administrativa (RPCA) y archivo de la historia laboral.',
            requisitos: [
              {
                id: 'dc6_1',
                label: 'Reporte de vacancia definitiva en SIMO 4.4 ante la CNSC (plazo 5 días hábiles)',
                cumplido: false,
                obligatorio: true,
                norma: 'Circular CNSC 011 de 2021, Num. 6 • Ley 909 de 2004, Art. 31',
                textoNormativo: 'Las entidades deben reportar a la CNSC en el aplicativo SIMO las vacantes definitivas de carrera administrativa dentro de los cinco (5) días hábiles siguientes a la ocurrencia de la novedad de retiro.',
                detalleProcedimiento: 'Cargar el acto de retiro en SIMO 4.4 para liberar y habilitar la plaza en la OPEC para futura provisión por mérito.',
                posiblesEvidencias: [
                  'Comprobante de cargue de vacancia definitiva en SIMO 4.4 emitido por la CNSC.',
                ],
              },
              {
                id: 'dc6_2',
                label: 'Cancelación del Registro Público de Carrera Administrativa (RPCA) ante la CNSC',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 909 de 2004, Art. 14 • Criterio Unificado CNSC',
                textoNormativo: 'Producido el retiro definitivo del servicio de un empleado con derechos de carrera, la entidad solicitará a la CNSC la cancelación de su inscripción en el Registro Público de Carrera.',
                detalleProcedimiento: 'Radicar la solicitud de exclusión y cancelación del registro en el RPCA ante la Dirección de Carrera de la CNSC.',
                posiblesEvidencias: [
                  'Radicado formal de solicitud de cancelación de RPCA ante la CNSC.',
                  'Certificado de actualización de registro de la CNSC.',
                ],
              },
              {
                id: 'dc6_3',
                label: 'Archivo integral en Historia Laboral (Hoja de Control 2311520-FT-244)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311520-FT-244',
                norma: 'Ley 594 de 2000; Acuerdo 004 de 2019 AGN',
                detalleProcedimiento: 'Foliar y archivar todo el expediente de retiro en la Historia Laboral con su hoja de control final.',
                posiblesEvidencias: [
                  'Hoja de control de historia laboral 2311520-FT-244 foliada y firmada.',
                ],
              },
            ],
          },
        ];

      case 'PROVISIONALIDAD':
        return [
          {
            id: 'd_prov_1',
            numero: 1,
            titulo: 'Causal Objetiva & Retén Social',
            subtitulo: 'Verificación de causal objetiva y estabilidad laboral reforzada',
            icono: 'shield-outline',
            estado: 'completed',
            tiempoEstimadoDias: 2,
            responsable: 'Profesional Universitario TH',
            normaGeneral: 'Sentencias Corte Constitucional SU-917/2010, SU-440/2021 y SU-087/2022; Circular Conjunta CNSC-DAFP 001 de 2020',
            plazoLegal: 'Verificación previa e ineludible al acto de retiro',
            procedimientoDetallado: 'Constatar la causal objetiva de desvinculación provisional (nombramiento de titular de mérito con lista ejecutoriada o encargo de carrera) y verificar de forma obligatoria los criterios de estabilidad laboral reforzada (retén social: prepensionados, discapacidad, madres/padres cabeza de familia).',
            requisitos: [
              {
                id: 'dp1_1',
                label: 'Identificación y verificación de causal legal objetiva de retiro provisional',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 909 de 2004, Art. 25 • Decreto 1083 de 2015, Art. 2.2.5.3.4 • SU-917 de 2010',
                notaNormativa: 'El retiro del empleado provisional no es discrecional; solo procede válidamente por causas objetivas legalmente consagradas, tales como la provisión de la plaza por concurso de méritos o encargo.',
                textoNormativo: 'Corte Constitucional, Sentencia SU-917 de 2010: El nombramiento provisional confiere una estabilidad laboral relativa. El retiro del empleado provisional únicamente puede fundarse en razones objetivas del servicio, principalmente la provisión del empleo con una persona seleccionada por concurso de méritos.',
                detalleProcedimiento: 'Cotejar en SIMO y la OPEC institucional que la vacante cuenta con elegible en lista en firme o servidor de carrera con derecho preferencial a encargo.',
                posiblesEvidencias: [
                  'Resolución de nombramiento en período de prueba del elegible de mérito que sustituye la plaza.',
                  'Lista de elegibles en firme expedida por la CNSC para el empleo.',
                  'Acto administrativo de sanción disciplinaria o evaluación insatisfactoria (si esa fuera la causal).',
                ],
              },
              {
                id: 'dp1_2',
                label: 'Verificación obligatoria de Estabilidad Ocupacional Reforzada / Retén Social',
                cumplido: true,
                obligatorio: true,
                norma: 'Sentencia SU-087 de 2022 • Circular Conjunta CNSC - DAFP 001 de 2020 • Ley 790 de 2002',
                notaNormativa: 'Deber ineludible de verificar si el provisional goza de especial protección constitucional (prepensionado a menos de 3 años, enfermedad catastrófica/discapacidad, o madre/padre cabeza de familia) antes de ordenar su retiro frente a otros provisionales en empleos iguales o equivalentes.',
                textoNormativo: 'Circular Conjunta CNSC-DAFP 001 de 2020: En caso de concurrir múltiples empleados provisionales en empleos de la misma denominación y perfil, la administración debe proteger preferentemente la permanencia de aquellos que acrediten la condición de prepensionados, personas con discapacidad o madres y padres cabeza de familia sin otra fuente de ingresos.',
                detalleProcedimiento: 'Revisar la historia laboral y certificaciones de semanas cotizadas (menos de 3 años de pensión), historias clínicas de SST o condición de cabeza de familia. Si hay más provisionales en cargos equivalentes, desplazar primero al que no goce de fuero.',
                posiblesEvidencias: [
                  'Matriz institucional de servidores en situación de Retén Social / Estabilidad Reforzada.',
                  'Historial de semanas cotizadas en Colpensiones/AFP (para verificación de prepensionado).',
                  'Dictamen médico laboral de SST o certificado de condición de cabeza de familia.',
                ],
              },
              {
                id: 'dp1_3',
                label: 'Constancia técnica y jurídica de ponderación de estabilidad relativa',
                cumplido: true,
                obligatorio: true,
                norma: 'Sentencia SU-087 de 2022 • Criterio Unificado CNSC',
                detalleProcedimiento: 'Elaborar y suscribir concepto técnico motivado certificando la ponderación de estabilidad ocupacional reforzada y la procedencia legal del retiro frente al mérito.',
                posiblesEvidencias: [
                  'Concepto jurídico suscrito por la Dirección de Gestión Corporativa motivando la selección del servidor para el retiro.',
                ],
              },
            ],
          },
          {
            id: 'd_prov_2',
            numero: 2,
            titulo: 'Acto de Retiro Motivado',
            subtitulo: 'Resolución expresamente motivada y notificación formal (SU-917/2010)',
            icono: 'newspaper-outline',
            estado: 'completed',
            tiempoEstimadoDias: 2,
            responsable: 'Nominador / Notificaciones',
            normaGeneral: 'Sentencias Corte Constitucional SU-917/2010 y SU-440/2021; CPACA Arts. 67, 69 y 74; Formato 2311520-FT-130',
            plazoLegal: 'Notificación formal antes de la fecha de efectividad del retiro',
            procedimientoDetallado: 'Proyectar y notificar la Resolución de terminación del nombramiento provisional con motivación expresa, fáctica y jurídica detallada (individualizando la vacante, la lista de elegibles de la CNSC y el titular de mérito). Se prohíben fórmulas genéricas.',
            requisitos: [
              {
                id: 'dp2_1',
                label: 'Elaboración de Resolución de Retiro con Motivación Expresa y Suficiente (SU-917/2010)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311520-FT-130',
                norma: 'Corte Constitucional SU-917 de 2010 y SU-440 de 2021 • Decreto 1083 de 2015, Art. 2.2.5.3.4',
                notaNormativa: 'Obligación estricta de motivación: El acto debe señalar expresamente la causal objetiva, individualizando el concurso de méritos, la lista de elegibles de la CNSC y el nombre del servidor nombrado en período de prueba.',
                textoNormativo: 'Corte Constitucional, Sentencia SU-440 de 2021: El acto de desvinculación de un funcionario en provisionalidad debe motivarse de manera clara, detallada y precisa en razones de servicio o en la provisión del empleo por quien superó el concurso. La ausencia de motivación expresa genera la nulidad del acto administrativo y la consecuente orden de reintegro o indemnización.',
                detalleProcedimiento: 'Redactar el proyecto de resolución en formato FT-130 citando la convocatoria de la CNSC, número de resolución de la lista de elegibles, elegible nombrado y fecha exacta de retiro.',
                posiblesEvidencias: [
                  'Proyecto de resolución motivada en formato 2311520-FT-130 con visto bueno jurídico.',
                ],
              },
              {
                id: 'dp2_2',
                label: 'Firma por autoridad nominadora, numeración y fechado oficial',
                cumplido: true,
                obligatorio: true,
                norma: 'Estatuto Orgánico de Bogotá • Ley 1437 de 2011, Art. 65',
                detalleProcedimiento: 'Someter a suscripción del Secretario Jurídico Distrital y posterior radicación, numeración y fechado oficial.',
                posiblesEvidencias: [
                  'Resolución de retiro provisional suscrita por el nominador con número y fecha asignados.',
                ],
              },
              {
                id: 'dp2_3',
                label: 'Notificación personal formal conforme al CPACA e información de recursos (Art. 74)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311520-FT-019',
                norma: 'Ley 1437 de 2011, Arts. 67, 69 y 74 • Decreto 1083 de 2015',
                textoNormativo: 'Contra el acto administrativo motivado que desvincula a un empleado provisional procede el recurso de reposición en los términos del artículo 74 del Código de Procedimiento Administrativo y de lo Contencioso Administrativo.',
                detalleProcedimiento: 'Notificar personalmente o mediante correo electrónico certificado al empleado provisional, indicándole que contra el acto procede el recurso de reposición dentro de los 10 días siguientes.',
                posiblesEvidencias: [
                  'Acta de notificación personal o constancia de entrega electrónica certificada con copia íntegra del acto.',
                ],
              },
            ],
          },
          {
            id: 'd_prov_3',
            numero: 3,
            titulo: 'Formatos Entrega de Cargo',
            subtitulo: 'FT-436, FT-219 y SIDEAP Retiro',
            icono: 'folder-open-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 2,
            responsable: 'Servidor saliente / TH',
            normaGeneral: 'Ley 2013 de 2019; Procedimiento PR-074 SJD',
            plazoLegal: 'Hasta el último día de labores',
            procedimientoDetallado: 'El servidor provisional debe diligenciar el formato de entrega de puesto FT-436, la encuesta de retiro FT-219 y actualizar su declaración jurada de bienes y conflicto de intereses en SIDEAP marcando Retiro.',
            requisitos: [
              {
                id: 'dp3_1',
                label: 'Diligenciamiento de Evaluación de Retiro (Formato 2311300-FT-219)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311300-FT-219',
                norma: 'Procedimiento 2311420-PR-074 SJD',
                detalleProcedimiento: 'Diligenciar el formulario institucional de percepción del clima laboral y motivos de retiro.',
                posiblesEvidencias: [
                  'Formato 2311300-FT-219 debidamente firmado.',
                ],
              },
              {
                id: 'dp3_2',
                label: 'Acta de Entrega de Cargo por Retiro Definitivo (Formato 2311300-FT-436)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311300-FT-436',
                norma: 'Procedimiento 2311420-PR-074 SJD',
                detalleProcedimiento: 'Diligenciar informe de empalme con detalle de tareas en curso, expedientes y claves asignadas para entrega al nuevo titular.',
                posiblesEvidencias: [
                  'Formato 2311300-FT-436 firmado por el servidor provisional y su jefe inmediato.',
                ],
              },
              {
                id: 'dp3_3',
                label: 'Declaración de Bienes y Rentas en SIDEAP marcando opción Retiro',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2013 de 2019, Arts. 2 y 3 • Decreto 830 de 2021',
                detalleProcedimiento: 'Generar el certificado digital de SIDEAP de declaración juramentada de bienes con corte a fecha de retiro.',
                posiblesEvidencias: [
                  'Certificado digital expedido por SIDEAP/SIGEP II con radicado de retiro.',
                ],
              },
              {
                id: 'dp3_4',
                label: 'Declaración de Conflicto de Intereses en SIDEAP / Función Pública marcando Retiro',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2013 de 2019 • Ley 1437 de 2011',
                detalleProcedimiento: 'Registrar la declaración de inhabilidades posteriores en el aplicativo distrital.',
                posiblesEvidencias: [
                  'Comprobante de cargue de declaración de conflicto de intereses con corte de retiro.',
                ],
              },
            ],
          },
          {
            id: 'd_prov_4',
            numero: 4,
            titulo: 'Examen & 4 Paz y Salvos',
            subtitulo: 'Egreso SST, TIC, Almacén y Archivo',
            icono: 'checkbox-outline',
            estado: 'pending',
            tiempoEstimadoDias: 3,
            responsable: 'SST / TIC / Almacén / Archivo',
            normaGeneral: 'Resolución 2346 de 2007 MinProtección; Procedimiento PR-074 SJD; Ley 594 de 2000',
            plazoLegal: 'Examen médico dentro de los 5 días hábiles siguientes al retiro',
            procedimientoDetallado: 'Trámite de los 4 paz y salvos institucionales: entrega de equipo y accesos en TIC, entrega de inventarios en Almacén (FT-200), transferencia en Archivo y paz y salvo de Talento Humano.',
            requisitos: [
              {
                id: 'dp4_1',
                label: 'Citación y práctica de Examen Médico Ocupacional de Egreso (plazo 5 días hábiles)',
                cumplido: false,
                obligatorio: true,
                norma: 'Resolución 2346 de 2007, Art. 6 • Decreto 1072 de 2015',
                detalleProcedimiento: 'Remitir orden médica para valoración de egreso en IPS ocupacional o archivar desistimiento voluntario.',
                posiblesEvidencias: [
                  'Certificado de examen médico de egreso de IPS o carta de desistimiento voluntario.',
                ],
              },
              {
                id: 'dp4_2',
                label: 'Paz y Salvo TIC: Entrega de hardware, periféricos y desactivación de accesos',
                cumplido: false,
                obligatorio: true,
                norma: 'Política de Seguridad de la Información SJD',
                detalleProcedimiento: 'Recibir equipos de cómputo, revocar buzón corporativo y credenciales de acceso.',
                posiblesEvidencias: [
                  'Paz y salvo firmado por el área de TIC.',
                ],
              },
              {
                id: 'dp4_3',
                label: 'Paz y Salvo Almacén: Devolución de bienes muebles individuales (2311500-FT-200)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311500-FT-200',
                norma: 'Procedimiento de Almacén e Inventarios SJD',
                detalleProcedimiento: 'Verificar descargo de bienes muebles e individuales asignados al empleado provisional.',
                posiblesEvidencias: [
                  'Formato 2311500-FT-200 firmado por el responsable de Almacén.',
                ],
              },
              {
                id: 'dp4_4',
                label: 'Paz y Salvo Archivo: Transferencia de expedientes judiciales/administrativos',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 594 de 2000; TRD SJD',
                detalleProcedimiento: 'Constatar entrega formal de expedientes según las Tablas de Retención Documental.',
                posiblesEvidencias: [
                  'Paz y salvo suscrito por Gestión Documental y Archivo.',
                ],
              },
              {
                id: 'dp4_5',
                label: 'Paz y Salvo Talento Humano: Devolución carné institucional y firmas consolidadas',
                cumplido: false,
                obligatorio: true,
                norma: 'Procedimiento 2311420-PR-074 SJD',
                detalleProcedimiento: 'Devolución de carné institucional y verificación de las 4 firmas en el Paz y Salvo general.',
                posiblesEvidencias: [
                  'Formato consolidado de Paz y Salvo General con las cuatro firmas institucionales.',
                ],
              },
            ],
          },
          {
            id: 'd_prov_5',
            numero: 5,
            titulo: 'Liquidación & Nómina',
            subtitulo: 'Cálculo de prestaciones sociales y ordenación de pago',
            icono: 'cash-outline',
            estado: 'pending',
            tiempoEstimadoDias: 3,
            responsable: 'Profesional Especializado Nómina',
            normaGeneral: 'Decreto Ley 1045 de 1978; Decreto Distrital 514 de 2006; Formato 2311520-FT-130',
            plazoLegal: 'Siguiente nómina ordinaria o máximo 15 días',
            procedimientoDetallado: 'Registro de novedad de retiro en PERNO, desactivación en SIDEAP, liquidación técnica de prestaciones proporcionales y resolución de pago.',
            requisitos: [
              {
                id: 'dp5_1',
                label: 'Registro de novedad de retiro en nómina PERNO y desactivación en SIDEAP',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Distrital 083 de 2001 • Directiva DASCD 001 de 2018',
                detalleProcedimiento: 'Registrar novedad de retiro en nómina PERNO y actualizar estado a retirado en SIDEAP.',
                posiblesEvidencias: [
                  'Pantallazo o reporte de novedad en PERNO.',
                  'Ficha en SIDEAP con estado Retirado.',
                ],
              },
              {
                id: 'dp5_2',
                label: 'Liquidación técnica de prestaciones sociales (vacaciones, primas, cesantías)',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Ley 1045 de 1978 • Decreto Distrital 514 de 2006',
                detalleProcedimiento: 'Calcular salarios pendientes, prima de servicios, prima de navidad, cesantías y compensación de vacaciones.',
                posiblesEvidencias: [
                  'Hoja técnica de liquidación de prestaciones sociales del servidor provisional.',
                ],
              },
              {
                id: 'dp5_3',
                label: 'Elaboración de Resolución de Reconocimiento y Liquidación (2311520-FT-130)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311520-FT-130',
                norma: 'Estatuto Presupuestal Distrital • Procedimiento 2311420-PR-001',
                detalleProcedimiento: 'Proyectar el acto de reconocimiento prestacional suscrito por el ordenador del gasto.',
                posiblesEvidencias: [
                  'Resolución de reconocimiento y pago de prestaciones firmada por el ordenador del gasto.',
                ],
              },
              {
                id: 'dp5_4',
                label: 'Notificación del acto liquidatorio y remisión a Tesorería para pago',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 1437 de 2011 • Tesorería Distrital SJD',
                detalleProcedimiento: 'Notificar al exservidor y remitir a Tesorería para dispersión bancaria.',
                posiblesEvidencias: [
                  'Comprobante de dispersión bancaria de Tesorería.',
                ],
              },
            ],
          },
          {
            id: 'd_prov_6',
            numero: 6,
            titulo: 'SIMO CNSC & Historia Laboral',
            subtitulo: 'Reporte de novedad ante la CNSC y archivo definitivo',
            icono: 'checkmark-done-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 2,
            responsable: 'Profesional TH / Archivo',
            normaGeneral: 'Circular Externa CNSC 011 de 2021; Ley 594 de 2000; Formato 2311520-FT-244',
            plazoLegal: 'Reporte SIMO dentro de los 5 días hábiles siguientes',
            procedimientoDetallado: 'Reportar en SIMO la finalización del nombramiento provisional y archivar todo el expediente foliado en la Historia Laboral.',
            requisitos: [
              {
                id: 'dp6_1',
                label: 'Reporte de novedad de retiro provisional en el aplicativo SIMO ante la CNSC',
                cumplido: false,
                obligatorio: true,
                norma: 'Circular Externa CNSC 011 de 2021',
                textoNormativo: 'Las entidades deben actualizar en el aplicativo SIMO el estado de ocupación de las plazas de carrera, descargando los nombramientos provisionales que hayan cesado.',
                detalleProcedimiento: 'Cargar la novedad de retiro en el módulo de personal en SIMO de la CNSC.',
                posiblesEvidencias: [
                  'Comprobante de registro de novedad de retiro en SIMO expedido por la CNSC.',
                ],
              },
              {
                id: 'dp6_2',
                label: 'Archivo integral en Historia Laboral con Hoja de Control (2311520-FT-244)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311520-FT-244',
                norma: 'Ley 594 de 2000; Acuerdo AGN 004 de 2019',
                detalleProcedimiento: 'Foliar y archivar los actos de nombramiento provisional, posesión, resolución motivada de retiro y paz y salvos en la Historia Laboral.',
                posiblesEvidencias: [
                  'Hoja de control de historia laboral 2311520-FT-244 debidamente foliada.',
                ],
              },
            ],
          },
        ];

      case 'LIBRE_NOMBRAMIENTO':
        return [
          {
            id: 'd_lnr_1',
            numero: 1,
            titulo: 'Causal de Retiro Directivo',
            subtitulo: 'Insubsistencia discrecional o aceptación de renuncia',
            icono: 'document-text-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            normaGeneral: 'Ley 909 de 2004, Art. 41 literales a y b; Decreto 1083 de 2015, Arts. 2.2.11.1.2 al 2.2.11.1.4',
            plazoLegal: 'Inmediato previa decisión del nominador',
            procedimientoDetallado: 'Recepción del memorial de renuncia libre y espontánea o manifestación del nominador de declarar la insubsistencia en ejercicio de la facultad discrecional, constatando la no configuración de fuero de maternidad o fuero biológico prevalente.',
            requisitos: [
              {
                id: 'dl1_1',
                label: 'Recepción del documento soporte de retiro (Insubsistencia o Renuncia)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311520-FT-018',
                norma: 'Ley 909 de 2004, Art. 41 literales a y b • Decreto 1083 de 2015, Art. 2.2.11.1.4',
                textoNormativo: 'En los empleos de libre nombramiento y remoción, la declaratoria de insubsistencia se efectúa en ejercicio de la facultad discrecional que tiene la autoridad nominadora, atendiendo razones de mejoramiento del servicio.',
                detalleProcedimiento: 'Radicar la decisión del nominador o la carta de renuncia del funcionario directivo o asesor.',
                posiblesEvidencias: [
                  'Oficio del Despacho disponiendo la insubsistencia o memorial de renuncia radicado.',
                  'Formato 2311520-FT-018 de verificación de trámite.',
                ],
              },
              {
                id: 'dl1_2',
                label: 'Verificación de fueros especiales (Fuero de Maternidad/Lactancia prevalente)',
                cumplido: true,
                obligatorio: true,
                norma: 'Constitución Política, Art. 43 • Sentencia SU-070 de 2013 • Decreto 1083 de 2015',
                notaNormativa: 'Incluso en empleos de libre nombramiento y remoción, el fuero de maternidad y lactancia prima sobre la facultad discrecional, prohibiendo la declaratoria de insubsistencia sin causa justa y autorización legal.',
                detalleProcedimiento: 'Verificar en registros médicos y de Talento Humano que la persona no se encuentre en embarazo ni licencia de maternidad/lactancia.',
                posiblesEvidencias: [
                  'Certificación de Talento Humano acreditando no existencia de fuero de maternidad/lactancia.',
                ],
              },
              {
                id: 'dl1_3',
                label: 'Verificación de espontaneidad y fecha cierta en caso de renuncia',
                cumplido: true,
                obligatorio: true,
                norma: 'Decreto 1083 de 2015, Art. 2.2.11.1.3 • Jurisprudencia Consejo de Estado',
                detalleProcedimiento: 'Si la causal es renuncia, cerciorarse de que sea un acto voluntario, espontáneo y sin presiones indebidas.',
                posiblesEvidencias: [
                  'Carta de renuncia con firma auténtica y fecha cierta de desvinculación.',
                ],
              },
            ],
          },
          {
            id: 'd_lnr_2',
            numero: 2,
            titulo: 'Acto de Insubsistencia / Retiro',
            subtitulo: 'Decreto o resolución del nominador y comunicación inmediata',
            icono: 'newspaper-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'Nominador / Notificaciones',
            normaGeneral: 'Decreto 1083 de 2015, Art. 2.2.11.1.4; Decreto Distrital 323 de 2016; Formato 2311520-FT-130',
            plazoLegal: 'Comunicación con efectos a partir de la fecha que señale el acto',
            procedimientoDetallado: 'Expedición del decreto o resolución de declaratoria de insubsistencia o aceptación de renuncia debidamente suscrito por el Secretario Jurídico Distrital y comunicación inmediata.',
            requisitos: [
              {
                id: 'dl2_1',
                label: 'Elaboración de Resolución de Insubsistencia o Aceptación de Renuncia (2311520-FT-130)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311520-FT-130',
                norma: 'Decreto 1083 de 2015, Art. 2.2.11.1.4 • Ley 909 de 2004, Art. 41 lit. a',
                textoNormativo: 'La declaratoria de insubsistencia no requiere de motivación formal en virtud de la facultad discrecional del nominador, pero debe expedirse mediante acto administrativo idóneo.',
                detalleProcedimiento: 'Proyectar el acto administrativo de retiro ordinario o insubsistencia con la fecha de efectividad del cese en funciones.',
                posiblesEvidencias: [
                  'Proyecto de acto administrativo en formato 2311520-FT-130 con visto bueno.',
                ],
              },
              {
                id: 'dl2_2',
                label: 'Firma por autoridad nominadora, radicación, numeración y fechado oficial',
                cumplido: true,
                obligatorio: true,
                norma: 'Estatuto Orgánico de Bogotá • Ley 1437 de 2011, Art. 65',
                detalleProcedimiento: 'Someter a firma del Secretario Jurídico Distrital y numeración en correspondencia oficial.',
                posiblesEvidencias: [
                  'Resolución suscrita por el nominador con número consecutivo y fecha oficial.',
                ],
              },
              {
                id: 'dl2_3',
                label: 'Comunicación formal o notificación inmediata al directivo cesante',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311520-FT-019',
                norma: 'Decreto 1083 de 2015, Art. 2.2.11.1.4 • CPACA Art. 65',
                detalleProcedimiento: 'Comunicar oficialmente al directivo cesante el contenido del acto administrativo de retiro.',
                posiblesEvidencias: [
                  'Oficio de comunicación en formato 2311520-FT-019 con acuse de recibo del directivo.',
                ],
              },
            ],
          },
          {
            id: 'd_lnr_3',
            numero: 3,
            titulo: 'Entrega Despacho & Control Interno',
            subtitulo: 'Acta de informe de gestión (Ley 951/2005) y SIDEAP Retiro',
            icono: 'folder-open-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 2,
            responsable: 'Directivo saliente / Control Interno',
            normaGeneral: 'Ley 951 de 2005, Art. 8; Ley 2013 de 2019; Procedimiento PR-074 SJD',
            plazoLegal: 'Informe de entrega dentro de 15 días hábiles a Control Interno (Ley 951/2005)',
            procedimientoDetallado: 'Obligación imperativa de todo servidor de nivel directivo y asesor de suscribir el Acta de Informe de Gestión (FT-333) y remitir copia a la Oficina de Control Interno dentro de los 15 días hábiles, además de diligenciar los formatos FT-436, FT-219 y la declaración de SIDEAP Retiro.',
            requisitos: [
              {
                id: 'dl3_1',
                label: 'Acta de Informe de Gestión y Entrega de Despacho (Ley 951/2005) - Formato FT-333',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311300-FT-333',
                norma: 'Ley 951 de 2005, Art. 8 • Directiva Presidencial 01 de 2018',
                notaNormativa: 'Obligación legal indelegable de rendir informe de entrega del despacho a quien lo suceda o al superior jerárquico, con copia a Control Interno dentro de los 15 días hábiles.',
                textoNormativo: 'Ley 951 de 2005, artículo 8: El servidor público saliente deberá entregar a quien lo sustituya legalmente un informe general de los asuntos a su cargo y del estado de los recursos puestos a su disposición, con copia a la Oficina de Control Interno.',
                detalleProcedimiento: 'Elaborar el informe exhaustivo del estado del despacho, metas del plan de acción, asuntos judiciales pendientes y remitir copia oficial a Control Interno.',
                posiblesEvidencias: [
                  'Acta de Informe de Gestión y Entrega en formato 2311300-FT-333 suscrita.',
                  'Radicado de entrega de copia a la Oficina de Control Interno dentro de los 15 días hábiles.',
                ],
              },
              {
                id: 'dl3_2',
                label: 'Entrega de Cargo por Retiro Definitivo (Formato 2311300-FT-436)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311300-FT-436',
                norma: 'Procedimiento 2311420-PR-074 SJD',
                detalleProcedimiento: 'Detallar inventario de claves de acceso, trámites prioritarios y expedientes del despacho.',
                posiblesEvidencias: [
                  'Formato 2311300-FT-436 firmado por el directivo saliente y el Secretario Jurídico.',
                ],
              },
              {
                id: 'dl3_3',
                label: 'Diligenciamiento de Evaluación y Encuesta de Retiro (2311300-FT-219)',
                cumplido: true,
                obligatorio: true,
                codigoFormato: '2311300-FT-219',
                norma: 'Procedimiento 2311420-PR-074 SJD',
                detalleProcedimiento: 'Diligenciar encuesta institucional de retiro directivo.',
                posiblesEvidencias: [
                  'Formato 2311300-FT-219 diligenciado.',
                ],
              },
              {
                id: 'dl3_4',
                label: 'Declaración proactiva de Bienes y Rentas en SIDEAP/SIGEP II marcando Retiro',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2013 de 2019, Arts. 2 y 3 • Decreto 830 de 2021',
                detalleProcedimiento: 'Generar el certificado digital de SIDEAP de declaración jurada de bienes y rentas con corte al último día en funciones directivas.',
                posiblesEvidencias: [
                  'Certificado digital de SIDEAP con radicado de retiro del servicio.',
                ],
              },
              {
                id: 'dl3_5',
                label: 'Declaración proactiva de Conflicto de Intereses e Inhabilidades Posteriores',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2013 de 2019 • Ley 1437 de 2011',
                detalleProcedimiento: 'Diligenciar en la plataforma de la Función Pública la declaración de no conflicto de intereses e inhabilidades posteriores para directivos.',
                posiblesEvidencias: [
                  'Comprobante digital de cargue de declaración de inhabilidades posteriores.',
                ],
              },
            ],
          },
          {
            id: 'd_lnr_4',
            numero: 4,
            titulo: 'Examen & 4 Paz y Salvos',
            subtitulo: 'Egreso SST, TIC, Almacén y Archivo',
            icono: 'checkbox-outline',
            estado: 'pending',
            tiempoEstimadoDias: 3,
            responsable: 'SST / TIC / Almacén / Archivo',
            normaGeneral: 'Resolución 2346 de 2007 MinProtección; Procedimiento PR-074 SJD; Ley 594 de 2000',
            plazoLegal: 'Examen médico dentro de los 5 días hábiles siguientes al retiro',
            procedimientoDetallado: 'Trámite de los 4 paz y salvos institucionales: entrega de computador portátil directivo, smartphone institucional y revocación de tokens de firma digital; descargo de bienes en Almacén (FT-200); transferencia de expedientes directivos en Archivo; y paz y salvo de Talento Humano.',
            requisitos: [
              {
                id: 'dl4_1',
                label: 'Citación y práctica de Examen Médico Ocupacional de Egreso (plazo 5 días hábiles)',
                cumplido: false,
                obligatorio: true,
                norma: 'Resolución 2346 de 2007, Art. 6 • Decreto 1072 de 2015',
                detalleProcedimiento: 'Remitir orden médica para valoración de egreso en IPS ocupacional o archivar desistimiento voluntario.',
                posiblesEvidencias: [
                  'Certificado de examen de egreso laboral o desistimiento voluntario suscrito.',
                ],
              },
              {
                id: 'dl4_2',
                label: 'Paz y Salvo TIC: Entrega de laptop, smartphone, token y revocación firmas digitales',
                cumplido: false,
                obligatorio: true,
                norma: 'Política de Seguridad de la Información SJD; Ley 527 de 1999',
                detalleProcedimiento: 'Recibir hardware directivo asignado, revocar buzón oficial, token VPN y cancelar certificado de firma digital institucional.',
                posiblesEvidencias: [
                  'Paz y salvo firmado por TIC con constancia de revocación de firma digital.',
                ],
              },
              {
                id: 'dl4_3',
                label: 'Paz y Salvo Almacén: Descargo de bienes muebles individuales (2311500-FT-200)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311500-FT-200',
                norma: 'Procedimiento de Almacén e Inventarios SJD',
                detalleProcedimiento: 'Verificar descargo total de bienes muebles del despacho a cargo del directivo.',
                posiblesEvidencias: [
                  'Formato 2311500-FT-200 firmado por el responsable de Almacén.',
                ],
              },
              {
                id: 'dl4_4',
                label: 'Paz y Salvo Archivo: Transferencia de expedientes directivos y del despacho',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 594 de 2000 General de Archivos; TRD SJD',
                detalleProcedimiento: 'Constatar la transferencia formal de expedientes y resoluciones de despacho a Gestión Documental.',
                posiblesEvidencias: [
                  'Paz y salvo firmado por Gestión Documental y Archivo.',
                ],
              },
              {
                id: 'dl4_5',
                label: 'Paz y Salvo Talento Humano: Devolución carné directivo y firmas consolidadas',
                cumplido: false,
                obligatorio: true,
                norma: 'Procedimiento 2311420-PR-074 SJD',
                detalleProcedimiento: 'Devolución de credenciales institucionales y consolidación de las 4 firmas en el Paz y Salvo General.',
                posiblesEvidencias: [
                  'Formato consolidado de Paz y Salvo General con las cuatro firmas institucionales.',
                ],
              },
            ],
          },
          {
            id: 'd_lnr_5',
            numero: 5,
            titulo: 'Liquidación & Gastos de Rep.',
            subtitulo: 'Prestaciones directivas, prima técnica y gastos de representación',
            icono: 'cash-outline',
            estado: 'pending',
            tiempoEstimadoDias: 3,
            responsable: 'Profesional Especializado Nómina',
            normaGeneral: 'Decreto Ley 1045 de 1978; Decreto Distrital 514 de 2006; Formato 2311520-FT-130',
            plazoLegal: 'Siguiente nómina ordinaria o máximo 15 días',
            procedimientoDetallado: 'Registro de novedad de retiro en nómina PERNO, desactivación en SIDEAP, liquidación de prestaciones directivas incluyendo prima técnica y gastos de representación proporcionales, y expedición de resolución de pago.',
            requisitos: [
              {
                id: 'dl5_1',
                label: 'Registro de novedad de retiro en nómina PERNO y desactivación de perfil en SIDEAP',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Distrital 083 de 2001 • Directiva DASCD 001 de 2018',
                detalleProcedimiento: 'Registrar la fecha definitiva de retiro en el módulo de personal PERNO y desactivar el perfil directivo en SIDEAP.',
                posiblesEvidencias: [
                  'Reporte de novedad procesada en PERNO.',
                  'Ficha en SIDEAP con perfil directivo desactivado.',
                ],
              },
              {
                id: 'dl5_2',
                label: 'Liquidación técnica de prestaciones con prima técnica y gastos de representación',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Ley 1045 de 1978 • Decretos salariales distritales anuales',
                detalleProcedimiento: 'Liquidar asignación básica, gastos de representación proporcionales, prima técnica, prima de servicios, navidad, cesantías y vacaciones compensadas.',
                posiblesEvidencias: [
                  'Hoja técnica de liquidación de prestaciones sociales del nivel directivo.',
                ],
              },
              {
                id: 'dl5_3',
                label: 'Elaboración de Resolución de Reconocimiento y Liquidación (2311520-FT-130)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311520-FT-130',
                norma: 'Estatuto Presupuestal Distrital • Procedimiento 2311420-PR-001',
                detalleProcedimiento: 'Proyectar el acto de reconocimiento prestacional firmado por el ordenador del gasto.',
                posiblesEvidencias: [
                  'Resolución de liquidación firmada por el ordenador del gasto.',
                ],
              },
              {
                id: 'dl5_4',
                label: 'Notificación del acto liquidatorio y remisión a Tesorería para pago',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 1437 de 2011 • Tesorería Distrital SJD',
                detalleProcedimiento: 'Notificar al exfuncionario y remitir el expediente a Tesorería para dispersión en cuenta bancaria.',
                posiblesEvidencias: [
                  'Comprobante de dispersión bancaria de Tesorería.',
                ],
              },
            ],
          },
          {
            id: 'd_lnr_6',
            numero: 6,
            titulo: 'Cierre & Control Interno',
            subtitulo: 'Constancia de entrega Ley 951/2005 y archivo en Historia Laboral',
            icono: 'checkmark-done-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 2,
            responsable: 'Profesional TH / Archivo',
            normaGeneral: 'Ley 951 de 2005, Art. 8; Ley 594 de 2000; Formato 2311520-FT-244',
            plazoLegal: '15 días hábiles siguientes al retiro',
            procedimientoDetallado: 'Constatar la radicación formal de la copia del Acta de Entrega en la Oficina de Control Interno y realizar la foliación y archivo definitivo del expediente directivo.',
            requisitos: [
              {
                id: 'dl6_1',
                label: 'Constatación y archivo de radicado de entrega de copia a Control Interno (Ley 951/2005)',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 951 de 2005, Art. 8',
                textoNormativo: 'De conformidad con el artículo 8 de la Ley 951 de 2005, el servidor público que se separe de su empleo en el nivel directivo o asesor deberá remitir copia formal de su informe de entrega a la Oficina de Control Interno dentro de los 15 días hábiles siguientes.',
                detalleProcedimiento: 'Verificar la existencia del radicado oficial de correspondencia de entrega del informe de gestión a la Oficina de Control Interno.',
                posiblesEvidencias: [
                  'Oficio con sello y radicado oficial de recibido de la Oficina de Control Interno.',
                ],
              },
              {
                id: 'dl6_2',
                label: 'Archivo integral y foliación final en Historia Laboral con Hoja de Control (2311520-FT-244)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2311520-FT-244',
                norma: 'Ley 594 de 2000; Hoja de Control SJD',
                detalleProcedimiento: 'Foliar y coser todo el expediente directivo en la Historia Laboral con su hoja de control final.',
                posiblesEvidencias: [
                  'Hoja de control 2311520-FT-244 foliada y archivada en archivo central.',
                ],
              },
            ],
          },
        ];

      case 'PRACTICANTE_JUDICANTE':
        return [
          {
            id: 'd_prac_1',
            numero: 1,
            titulo: 'Culminación Formativa',
            subtitulo: 'Verificación de plazo formativo o causal de terminación',
            icono: 'school-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Especializado TH',
            normaGeneral: 'Ley 2043 de 2020; Resolución 3546 de 2018 MinTrabajo; Ley 552 de 1999',
            plazoLegal: 'Al vencimiento del término pactado (6 o 9 meses de judicatura)',
            procedimientoDetallado: 'Constatar el cumplimiento efectivo del plazo de la práctica formativa o judicatura (mínimo 6 o 9 meses continuos según la modalidad) o tramitar la solicitud formal y concertada de terminación justificada con la universidad.',
            requisitos: [
              {
                id: 'dpj1_1',
                label: 'Verificación del cumplimiento del plazo pactado o causal de retiro justificado',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 2043 de 2020, Art. 4 • Resolución 3546 de 2018 MinTrabajo • Ley 552 de 1999',
                notaNormativa: 'Las prácticas y judicaturas son relaciones exclusivamente formativas de origen académico. No generan relación laboral ni estatutaria.',
                textoNormativo: 'Resolución 3546 de 2018 de MinTrabajo: La práctica laboral es una actividad formativa desarrollada por un estudiante de programas de formación profesional, tecnológica o técnica, que busca complementar sus estudios. Su terminación se rige por el cumplimiento del periodo formativo convenido.',
                detalleProcedimiento: 'Cotejar en la resolución de vinculación formativa la fecha de inicio y vencimiento del término convenido para la judicatura o práctica.',
                posiblesEvidencias: [
                  'Resolución de vinculación formativa original con las fechas de inicio y plazo pactado.',
                  'Acta de inicio de judicatura o práctica suscrita.',
                ],
              },
              {
                id: 'dpj1_2',
                label: 'Comunicación oficial a la Institución de Educación Superior sobre culminación',
                cumplido: true,
                obligatorio: true,
                norma: 'Resolución 3546 de 2018 MinTrabajo, Art. 16 • Convenio de Cooperación Académica',
                detalleProcedimiento: 'Remitir oficio formal a la Decanatura de la Facultad de Derecho o Dirección de Consultorio Jurídico informando la culminación del periodo de práctica.',
                posiblesEvidencias: [
                  'Oficio formal radicado y remitido a la universidad informando la terminación formativa.',
                ],
              },
            ],
          },
          {
            id: 'd_prac_2',
            numero: 2,
            titulo: 'Informe Final & Evaluación',
            subtitulo: 'Informe final de actividades y concepto del tutor institucional',
            icono: 'document-text-outline',
            estado: 'completed',
            tiempoEstimadoDias: 2,
            responsable: 'Tutor Institucional / Estudiante',
            normaGeneral: 'Ley 2043 de 2020, Art. 6; Ley 552 de 1999; Resolución 3546 de 2018 MinTrabajo',
            plazoLegal: 'Última semana del periodo formativo',
            procedimientoDetallado: 'El estudiante debe radicar su Informe Final de Actividades y el tutor institucional asignado debe expedir la evaluación final de competencias y el concepto favorable de cumplimiento.',
            requisitos: [
              {
                id: 'dpj2_1',
                label: 'Presentación y radicación del Informe Final de Actividades por el estudiante',
                cumplido: true,
                obligatorio: true,
                norma: 'Ley 2043 de 2020, Art. 6 • Ley 552 de 1999',
                detalleProcedimiento: 'Radicar en el sistema documental el informe global que compila las gestiones jurídicas, sustanciación de conceptos y actividades desarrolladas.',
                posiblesEvidencias: [
                  'Informe Final de Actividades de judicatura radicado en el sistema de gestión documental.',
                ],
              },
              {
                id: 'dpj2_2',
                label: 'Evaluación final y concepto favorable de cumplimiento expedido por el tutor',
                cumplido: true,
                obligatorio: true,
                norma: 'Resolución 3546 de 2018 MinTrabajo, Art. 15 • Ley 2043 de 2020',
                textoNormativo: 'El tutor institucional asignado deberá emitir la evaluación final del estudiante y certificar el cumplimiento cabal de las metas y horas convenidas en el plan de práctica.',
                detalleProcedimiento: 'El tutor institucional suscribe el formato de evaluación y concepto favorable acreditando idoneidad, asistencia y cumplimiento de las metas formativas.',
                posiblesEvidencias: [
                  'Formato de evaluación final y concepto favorable de judicatura firmado por el tutor asignado.',
                ],
              },
            ],
          },
          {
            id: 'd_prac_3',
            numero: 3,
            titulo: 'Paz y Salvo Formativo',
            subtitulo: 'Devolución de carné, equipo TIC y entrega de asuntos al tutor',
            icono: 'checkbox-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 1,
            responsable: 'Tutor / TIC / TH',
            normaGeneral: 'Procedimiento PR-137 SJD; Política de Seguridad TIC',
            plazoLegal: 'Último día de labores formativas',
            procedimientoDetallado: 'Entrega formal de expedientes y asuntos asignados al tutor o dependencia receptora, devolución física del carné de practicante, equipo de cómputo y desactivación de accesos.',
            requisitos: [
              {
                id: 'dpj3_1',
                label: 'Devolución de equipo de cómputo, accesorios y cierre de buzón institucional',
                cumplido: true,
                obligatorio: true,
                norma: 'Política de Seguridad de la Información SJD',
                detalleProcedimiento: 'Hacer entrega del equipo de cómputo portátil y accesorios en el área de TIC y suspender buzón de correo electrónico.',
                posiblesEvidencias: [
                  'Constancia de recepción de equipo suscrita por TIC.',
                ],
              },
              {
                id: 'dpj3_2',
                label: 'Entrega y empalme de expedientes y asuntos jurídicos asignados al tutor',
                cumplido: true,
                obligatorio: true,
                norma: 'Procedimiento Institucional 2311420-PR-137 SJD',
                detalleProcedimiento: 'Suscribir acta de entrega de temas jurídicos y proyectos de respuesta con el tutor institucional.',
                posiblesEvidencias: [
                  'Acta de entrega y empalme de asuntos suscrita entre el judicante y el tutor.',
                ],
              },
              {
                id: 'dpj3_3',
                label: 'Devolución física del carné de practicante y firma de Paz y Salvo Formativo',
                cumplido: false,
                obligatorio: true,
                norma: 'Procedimiento Institucional 2311420-PR-137 SJD',
                detalleProcedimiento: 'Entregar el carné físico institucional en Talento Humano y consolidar firmas en el Paz y Salvo Formativo.',
                posiblesEvidencias: [
                  'Formato institucional de Paz y Salvo Formativo con firmas del tutor, TIC y Talento Humano.',
                ],
              },
            ],
          },
          {
            id: 'd_prac_4',
            numero: 4,
            titulo: 'Desafiliación ARL & Bogdata',
            subtitulo: 'Novedad de retiro en ARL Positiva y cierre presupuestal',
            icono: 'shield-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Auxiliar TH / Gestión Financiera',
            normaGeneral: 'Decreto 055 de 2015 MinSalud; Procedimiento Bogdata 2311420-PR-063',
            plazoLegal: 'Día siguiente a la terminación de la práctica',
            procedimientoDetallado: 'Tramitar la novedad de retiro de la cobertura de riesgos laborales ante ARL Positiva, procesar el último giro del auxilio de sostenimiento sin prestaciones sociales y liberar el saldo del CRP en Bogdata.',
            requisitos: [
              {
                id: 'dpj4_1',
                label: 'Desafiliación oportuna de Positiva ARL en el Sistema General de Riesgos Laborales',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto 055 de 2015 • Decreto 1072 de 2015, Art. 2.2.4.2.3.1',
                textoNormativo: 'La entidad debe tramitar la novedad de retiro del estudiante en el Sistema de Riesgos Laborales inmediatamente culmine la práctica formativa.',
                detalleProcedimiento: 'Radicar la novedad de retiro en la plataforma web de Positiva ARL con fecha del último día de actividades.',
                posiblesEvidencias: [
                  'Certificado de novedad de retiro o desafiliación expedido por Positiva ARL.',
                ],
              },
              {
                id: 'dpj4_2',
                label: 'Trámite del último pago proporcional del auxilio de sostenimiento (sin prestaciones)',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2043 de 2020, Art. 7 • Procedimiento Presupuestal Bogdata 2311420-PR-063',
                notaNormativa: 'Al no existir vínculo laboral ni contractual, los practicantes y judicantes no tienen derecho a liquidación de cesantías, primas ni vacaciones de la Ley 1045 de 1978. Solo reciben su auxilio proporcional pactado.',
                detalleProcedimiento: 'Generar la orden de pago del auxilio proporcional de sostenimiento en Bogdata con visto bueno del tutor.',
                posiblesEvidencias: [
                  'Orden de pago y soporte de transferencia bancaria del auxilio final en Bogdata.',
                ],
              },
              {
                id: 'dpj4_3',
                label: 'Cierre y liberación del saldo del Certificado de Registro Presupuestal (CRP)',
                cumplido: false,
                obligatorio: true,
                norma: 'Estatuto Orgánico del Presupuesto • Procedimiento 2311420-PR-063',
                detalleProcedimiento: 'Liberar en Bogdata el saldo remanente no ejecutado del CRP y CDP de prácticas formativas.',
                posiblesEvidencias: [
                  'Comprobante de liberación de saldos de CRP en el sistema Bogdata de la Secretaría Distrital de Hacienda.',
                ],
              },
            ],
          },
          {
            id: 'd_prac_5',
            numero: 5,
            titulo: 'Certificación de Judicatura',
            subtitulo: 'Certificación oficial firmada por Dirección (Ley 2043/2020)',
            icono: 'ribbon-outline',
            estado: 'pending',
            tiempoEstimadoDias: 2,
            responsable: 'Dirección Gestión Corporativa',
            normaGeneral: 'Ley 2043 de 2020, Arts. 6 y 8; Ley 552 de 1999; Acuerdo Consejo Superior de la Judicatura',
            plazoLegal: 'Máximo 5 días hábiles posteriores a la culminación',
            procedimientoDetallado: 'Expedición de la Certificación Final de Judicatura o Práctica Profesional firmada por la Dirección de Gestión Corporativa, válida formalmente como experiencia profesional computable ante el Consejo Superior de la Judicatura y universidades.',
            requisitos: [
              {
                id: 'dpj5_1',
                label: 'Proyección y firma de Certificación Final de Judicatura / Práctica por Dirección',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2043 de 2020, Arts. 6 y 8 • Ley 552 de 1999',
                textoNormativo: 'Ley 2043 de 2020, artículo 6: La certificación de la práctica laboral o judicatura expedida por la entidad receptora deberá contener la fecha de inicio y terminación, las actividades desarrolladas y la constancia de cumplimiento, teniendo plena validez como experiencia profesional para todos los efectos legales.',
                detalleProcedimiento: 'Redactar y suscribir la certificación detallando fecha de inicio, fecha final, modalidad, tutor, funciones y concepto favorable.',
                posiblesEvidencias: [
                  'Certificación Final oficial suscrita por el Director(a) de Gestión Corporativa con sello institucional.',
                ],
              },
              {
                id: 'dpj5_2',
                label: 'Entrega de certificación original al judicante para trámites ante el CSJ o Universidad',
                cumplido: false,
                obligatorio: true,
                norma: 'Acuerdo Consejo Superior de la Judicatura • Ley 552 de 1999',
                detalleProcedimiento: 'Entregar el documento original con radicado oficial para el trámite de la tarjeta profesional de abogado o convalidación de grado.',
                posiblesEvidencias: [
                  'Oficio de entrega formal o acuse de recibo del judicante de la certificación original.',
                ],
              },
            ],
          },
          {
            id: 'd_prac_6',
            numero: 6,
            titulo: 'Cierre SIDEAP & Archivo',
            subtitulo: 'Cierre de la plaza en SIDEAP Prácticas y archivo del expediente',
            icono: 'checkmark-done-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Talento Humano / Archivo',
            normaGeneral: 'Directiva Distrital 001 de 2018; Ley 594 de 2000; TRD SJD',
            plazoLegal: 'Inmediato',
            procedimientoDetallado: 'Actualizar el módulo de prácticas de SIDEAP liberando o cerrando la plaza formativa y custodiar el expediente completo en la serie documental de convenios y prácticas académicas.',
            requisitos: [
              {
                id: 'dpj6_1',
                label: 'Novedad de cierre de la plaza en el módulo de prácticas laborales de SIDEAP',
                cumplido: false,
                obligatorio: true,
                norma: 'Directiva Distrital 001 de 2018 • Módulo de Prácticas SIDEAP',
                detalleProcedimiento: 'Actualizar el estado del practicante/judicante a finalizado en la plataforma distrital SIDEAP.',
                posiblesEvidencias: [
                  'Comprobante de actualización de estado finalizado en SIDEAP Prácticas.',
                ],
              },
              {
                id: 'dpj6_2',
                label: 'Archivo del expediente formativo completo en la serie documental institucional',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 594 de 2000 Ley General de Archivos; Tablas de Retención Documental SJD',
                detalleProcedimiento: 'Foliar y archivar los convenios, informes de tutor, acta de entrega y certificación en el fondo documental.',
                posiblesEvidencias: [
                  'Rótulo y hoja de foliación del expediente formativo archivado en el archivo central.',
                ],
              },
            ],
          },
        ];
    }
  }
}
export function limpiarEtapasParaNuevoTramite(etapas: EtapaFlujo[]): EtapaFlujo[] {
  return etapas.map((etapa, idx) => ({
    ...etapa,
    estado: idx === 0 ? 'in_progress' : 'pending',
    observacionesFase: undefined,
    requisitos: etapa.requisitos.map((req) => ({
      ...req,
      cumplido: false,
      fecha_cumplimiento: undefined,
      observaciones: undefined,
      radicadoSoporte: undefined,
      usuarioRegistro: undefined,
    })),
  }));
}

export function sincronizarEtapasCaso(
  etapasGuardadas: EtapaFlujo[] | undefined,
  tipoProceso: TipoProceso,
  modalidad: ModalidadPersonal
): EtapaFlujo[] {
  const etapasMaestras = generarEtapasParaCaso(tipoProceso, modalidad);
  if (!etapasGuardadas || !Array.isArray(etapasGuardadas) || etapasGuardadas.length === 0) {
    return etapasMaestras;
  }

  return etapasMaestras.map((etapaM) => {
    const etapaG = etapasGuardadas.find(
      (eg) => eg.id === etapaM.id || eg.numero === etapaM.numero
    );

    if (!etapaG) {
      return etapaM;
    }

    const requisitosSincronizados = etapaM.requisitos.map((reqM, reqIdx) => {
      let reqG = etapaG.requisitos?.find((rg) => rg.id === reqM.id);

      // Reconciliación especial para requisitos unificados (ej: vp1_1)
      if (reqM.id === 'vp1_1' && !reqG) {
        reqG = etapaG.requisitos?.find((rg) => rg.id === 'vp1_1' || rg.id === 'vp1_2');
      }

      // Reconciliación inteligente para requisitos de desvinculación provenientes del modelo genérico anterior (dsX_Y)
      if (!reqG && reqM.id.startsWith('d') && etapaG.requisitos) {
        const idGenericoEquivalente = `ds${etapaM.numero}_${reqIdx + 1}`;
        reqG = etapaG.requisitos.find((rg) => rg.id === idGenericoEquivalente);
        if (!reqG && etapaG.requisitos[reqIdx]) {
          reqG = etapaG.requisitos[reqIdx];
        }
      }

      if (reqG) {
        return {
          ...reqM,
          cumplido: reqG.cumplido,
          fecha_cumplimiento: reqG.fecha_cumplimiento || reqM.fecha_cumplimiento,
          observaciones: reqG.observaciones || reqM.observaciones,
          radicadoSoporte: reqG.radicadoSoporte || reqM.radicadoSoporte,
          usuarioRegistro: reqG.usuarioRegistro || reqM.usuarioRegistro,
        };
      }

      return reqM;
    });

    return {
      ...etapaM,
      estado: etapaG.estado || etapaM.estado,
      observacionesFase: etapaG.observacionesFase || etapaM.observacionesFase,
      radicadoFase: etapaG.radicadoFase || etapaM.radicadoFase,
      requisitos: requisitosSincronizados,
    };
  });
}

const CASOS_BASE: CasoFlujoFuncionario[] = [
  {
    id: 'TR-2026-001',
    tipo_proceso: 'DESVINCULACION',
    modalidad: 'CARRERA_ADMINISTRATIVA',
    id_plaza: 14,
    servidor_nombre: 'ZULMA ANDREA MORENO DIAZ',
    servidor_cedula: '52899412',
    cargo: 'PROFESIONAL ESPECIALIZADO',
    codigo: '222',
    grado: '24',
    dependencia: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    causal: 'Renuncia regularmente aceptada (Art. 41 lit. a)',
    acto_administrativo: 'Resolución No. 042 de 2026',
    fecha_inicio_tramite: '2026-03-20',
    fecha_efectiva: '2026-03-31',
    etapas: generarEtapasParaCaso('DESVINCULACION', 'CARRERA_ADMINISTRATIVA'),
    etapa_activa_id: 'd_carr_3',
    observaciones: 'Plaza de carrera en vacancia definitiva. Pendiente radicación en SIMO 4.4.',
  },
  {
    id: 'TR-2026-002',
    tipo_proceso: 'VINCULACION',
    modalidad: 'LIBRE_NOMBRAMIENTO',
    id_plaza: 5,
    servidor_nombre: 'MARÍA FERNANDA ROCHA GUTIÉRREZ',
    servidor_cedula: '52981442',
    cargo: 'DIRECTOR TÉCNICO',
    codigo: '009',
    grado: '05',
    dependencia: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    fecha_inicio_tramite: '2026-04-01',
    fecha_efectiva: '2026-04-15',
    etapas: generarEtapasParaCaso('VINCULACION', 'LIBRE_NOMBRAMIENTO'),
    etapa_activa_id: 'v_lnr_2',
    observaciones: 'Postulada a nivel directivo. Cumple cuota de género. Requiere verificación SECOP II.',
    estadoValidacionIA: 'CUMPLE',
  },
  {
    id: 'TR-2026-003',
    tipo_proceso: 'VINCULACION',
    modalidad: 'PRACTICANTE_JUDICANTE',
    servidor_nombre: 'JUAN PABLO BARRAGÁN LONDOÑO',
    servidor_cedula: '1018492011',
    cargo: 'JUDICANTE AD-HONOREM',
    dependencia: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    fecha_inicio_tramite: '2026-03-15',
    fecha_efectiva: '2026-04-01',
    etapas: generarEtapasParaCaso('VINCULACION', 'PRACTICANTE_JUDICANTE'),
    etapa_activa_id: 'v_prac_3',
    observaciones: 'Judicatura en derecho Universidad Nacional. Verificado CDP y antecedentes.',
  },
  {
    id: 'TR-2026-004',
    tipo_proceso: 'DESVINCULACION',
    modalidad: 'PROVISIONALIDAD',
    id_plaza: 58,
    servidor_nombre: 'CARLOS ALBERTO GIRALDO VELEZ',
    servidor_cedula: '79841203',
    cargo: 'PROFESIONAL UNIVERSITARIO',
    codigo: '219',
    grado: '18',
    dependencia: 'DIRECCIÓN DISTRITAL DE ESTUDIOS',
    causal: 'Obtención de pensión de vejez o invalidez (Art. 41 lit. b)',
    acto_administrativo: 'Resolución No. 051 de 2026',
    fecha_inicio_tramite: '2026-04-02',
    fecha_efectiva: '2026-04-18',
    etapas: generarEtapasParaCaso('DESVINCULACION', 'PROVISIONALIDAD'),
    etapa_activa_id: 'd_prov_3',
    observaciones: 'Pensión concedida por Colpensiones. En trámite entrega de puesto.',
  },
  {
    id: 'TR-2026-005',
    tipo_proceso: 'VINCULACION',
    modalidad: 'CARRERA_ADMINISTRATIVA',
    id_plaza: 14,
    servidor_nombre: 'DIEGO ALEJANDRO QUINTERO ROJAS',
    servidor_cedula: '1014234567',
    cargo: 'PROFESIONAL UNIVERSITARIO',
    codigo: '219',
    grado: '11',
    dependencia: 'DIRECCIÓN DISTRITAL DE GESTIÓN JUDICIAL',
    fecha_inicio_tramite: '2026-03-28',
    fecha_efectiva: '2026-04-15',
    etapas: generarEtapasParaCaso('VINCULACION', 'CARRERA_ADMINISTRATIVA'),
    etapa_activa_id: 'v_carr_4',
    observaciones: 'Elegible meritorio No. 1 en Lista SIMO 4.0 Convocatoria Distrito 2025. Período de prueba proyectado por 6 meses.',
    resultadoSecop: {
      totalActivos: 3,
      totalHistoricos: 2,
      tieneAlerta: true,
      fechaConsulta: '07/10/2026',
      fechaHoraConsulta: '07/10/2026, 08:35:12 p.m.',
      dictamen: '¡ATENCIÓN! La persona registra 3 contrato(s) activo(s) o en ejecución en el Estado colombiano (Entidades: UNIDAD ADMINISTRATIVA ESPECIAL MIGRACION COLOMBIA, SECRETARIA JURIDICA DISTRITAL). De conformidad con el artículo 128 de la Constitución Política y las leyes 80 de 1993 y 1952 de 2019, un servidor público no puede desempeñar simultáneamente más de un empleo público ni recibir más de una asignación del tesoro público, salvo excepciones legales expresas.',
      entidadesActivas: ['UNIDAD ADMINISTRATIVA ESPECIAL MIGRACION COLOMBIA', 'SECRETARIA JURIDICA DISTRITAL'],
      valorTotalActivo: 147500000,
      contratosActivos: [
        {
          id: 'CO1.PCONT.4829101',
          idContrato: 'CO1.PCONT.4829101',
          referencia: 'CTO-PREST-2026-089',
          numeroContrato: 'CTO-PREST-2026-089',
          procesoCompra: 'CD-UAEMC-2026-042',
          entidad: 'UNIDAD ADMINISTRATIVA ESPECIAL MIGRACION COLOMBIA',
          nitEntidad: '900482910-1',
          ordenEntidad: 'Nacional Centralizado',
          departamento: 'Bogotá D.C.',
          ciudad: 'Bogotá',
          proveedor: 'DIEGO ALEJANDRO QUINTERO ROJAS',
          documentoProveedor: '1014234567',
          tipoDocumento: 'Cédula de Ciudadanía',
          tipoContrato: 'Prestación de Servicios Profesionales',
          modalidad: 'Contratación Directa',
          objeto: 'Prestación de servicios profesionales de asesoría jurídica especializada en formulación de actos administrativos y conceptos sobre control migratorio.',
          estado: 'En Ejecución',
          esActivo: true,
          fechaFirma: '2026-01-15',
          fechaInicio: '2026-01-16',
          fechaFin: '2026-11-30',
          diasRestantes: 54,
          plazoEjecucion: '10 meses y 15 días',
          duracion: '319 días',
          valorTotal: 58500000,
          valorPagado: 32500000,
          valorPendiente: 26000000,
          porcentajeEjecucion: 56,
          urlSecop: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.4829101',
          urlProceso: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.4829101',
          supervisor: 'Subdirector de Gestión Jurídica / UAEMC',
          ordenadorGasto: 'Director General / UAEMC',
        },
        {
          id: 'CO1.PCONT.4871220',
          idContrato: 'CO1.PCONT.4871220',
          referencia: 'SJD-CPS-2026-114',
          numeroContrato: 'SJD-CPS-2026-114',
          procesoCompra: 'CD-SJD-2026-088',
          entidad: 'SECRETARIA JURIDICA DISTRITAL',
          nitEntidad: '899999061-9',
          ordenEntidad: 'Distrital',
          departamento: 'Bogotá D.C.',
          ciudad: 'Bogotá',
          proveedor: 'DIEGO ALEJANDRO QUINTERO ROJAS',
          documentoProveedor: '1014234567',
          tipoDocumento: 'Cédula de Ciudadanía',
          tipoContrato: 'Prestación de Servicios de Apoyo a la Gestión',
          modalidad: 'Contratación Directa',
          objeto: 'Servicios profesionales de apoyo jurídico para la sustanciación de acciones de tutela y defensas en litigio contencioso administrativo.',
          estado: 'En Ejecución',
          esActivo: true,
          fechaFirma: '2026-02-01',
          fechaInicio: '2026-02-02',
          fechaFin: '2026-12-15',
          diasRestantes: 69,
          plazoEjecucion: '10 meses y 13 días',
          duracion: '317 días',
          valorTotal: 49000000,
          valorPagado: 24500000,
          valorPendiente: 24500000,
          porcentajeEjecucion: 50,
          urlSecop: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.4871220',
          urlProceso: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.4871220',
          supervisor: 'Director Distrital de Doctrina y Asuntos Normativos',
          ordenadorGasto: 'Secretario Jurídico Distrital',
        },
        {
          id: 'CO1.PCONT.4910332',
          idContrato: 'CO1.PCONT.4910332',
          referencia: 'CTO-ASJ-2026-015',
          numeroContrato: 'CTO-ASJ-2026-015',
          procesoCompra: 'CD-UAEMC-2026-095',
          entidad: 'UNIDAD ADMINISTRATIVA ESPECIAL MIGRACION COLOMBIA',
          nitEntidad: '900482910-1',
          ordenEntidad: 'Nacional Centralizado',
          departamento: 'Bogotá D.C.',
          ciudad: 'Bogotá',
          proveedor: 'DIEGO ALEJANDRO QUINTERO ROJAS',
          documentoProveedor: '1014234567',
          tipoDocumento: 'Cédula de Ciudadanía',
          tipoContrato: 'Prestación de Servicios Profesionales',
          modalidad: 'Contratación Directa',
          objeto: 'Acompañamiento especializado en la estructuración de respuestas a requerimientos judiciales y procesos sancionatorios migratorios.',
          estado: 'En Ejecución',
          esActivo: true,
          fechaFirma: '2026-03-01',
          fechaInicio: '2026-03-02',
          fechaFin: '2026-10-31',
          diasRestantes: 24,
          plazoEjecucion: '8 meses',
          duracion: '244 días',
          valorTotal: 40000000,
          valorPagado: 25000000,
          valorPendiente: 15000000,
          porcentajeEjecucion: 63,
          urlSecop: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.4910332',
          urlProceso: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.4910332',
          supervisor: 'Jefe Oficina Asesora Jurídica / UAEMC',
          ordenadorGasto: 'Director General / UAEMC',
        }
      ]
    },
  },
  {
    id: 'TR-2026-006',
    tipo_proceso: 'VINCULACION',
    modalidad: 'PROVISIONALIDAD',
    id_plaza: 29,
    servidor_nombre: 'LILIANA PATRICIA VARGAS MEJÍA',
    servidor_cedula: '53094812',
    cargo: 'PROFESIONAL ESPECIALIZADO',
    codigo: '222',
    grado: '22',
    dependencia: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    fecha_inicio_tramite: '2026-04-01',
    fecha_efectiva: '2026-04-20',
    etapas: generarEtapasParaCaso('VINCULACION', 'PROVISIONALIDAD'),
    etapa_activa_id: 'vp3_1',
    observaciones: 'Vacancia de empleo de carrera. Agotado trámite de encargo preferente declarado desierto por Circular Interna No. 004/2026. Requiere verificación técnica FT-318 IA.',
    resultadoSecop: {
      totalActivos: 0,
      totalHistoricos: 3,
      tieneAlerta: false,
      fechaConsulta: '07/10/2026',
      fechaHoraConsulta: '07/10/2026, 08:40:00 p.m.',
      dictamen: 'Registro verificado: Se encontraron 3 contratos históricos en SECOP II, todos cerrados y liquidados con paz y salvo. No se evidencian contratos en ejecución actualmente. Apto preventivamente.',
      entidadesActivas: [],
      valorTotalActivo: 0,
      contratosActivos: [],
      todosContratos: [],
    },
  },
  {
    id: 'TR-2026-007',
    tipo_proceso: 'DESVINCULACION',
    modalidad: 'LIBRE_NOMBRAMIENTO',
    id_plaza: 5,
    servidor_nombre: 'DRA. ANDREA CAROLINA CAMARGO VILLAMIL',
    servidor_cedula: '52912443',
    cargo: 'SUBSECRETARIO DE DESPACHO',
    codigo: '045',
    grado: '06',
    dependencia: 'SUBSECRETARÍA JURÍDICA DISTRITAL',
    causal: 'Renuncia regularmente aceptada (Ley 909 de 2004, Art. 41 lit. d)',
    acto_administrativo: 'Resolución No. 064 de 2026',
    fecha_inicio_tramite: '2026-04-05',
    fecha_efectiva: '2026-04-18',
    etapas: generarEtapasParaCaso('DESVINCULACION', 'LIBRE_NOMBRAMIENTO'),
    etapa_activa_id: 'd_lnr_3',
    observaciones: 'Cargo directivo. Suscrita acta circunstanciada de informe y entrega de despacho. Pendiente remisión de copia a Control Interno dentro de 15 días hábiles (Ley 951 de 2005, Art. 8).',
  },
  {
    id: 'TR-2026-008',
    tipo_proceso: 'DESVINCULACION',
    modalidad: 'PRACTICANTE_JUDICANTE',
    servidor_nombre: 'VALENTINA GÓMEZ MARTÍNEZ',
    servidor_cedula: '1019284712',
    cargo: 'JUDICANTE AD-HONOREM',
    dependencia: 'DIRECCIÓN DISTRITAL DE ESTUDIOS',
    causal: 'Culminación regular del período formativo / judicatura acordada (Ley 2043 de 2020 • Res. 3546 de 2018)',
    fecha_inicio_tramite: '2026-04-08',
    fecha_efectiva: '2026-04-20',
    etapas: generarEtapasParaCaso('DESVINCULACION', 'PRACTICANTE_JUDICANTE'),
    etapa_activa_id: 'd_prac_4',
    observaciones: 'Período formativo culminado con evaluación sobresaliente del tutor. Retiro de ARL tramitado. En proyección expedición de Certificación Final con validez de experiencia profesional (Ley 2043 de 2020).',
  },
];


// ============================================================================
// CATÁLOGO DE FORMATOS OFICIALES Y PLANTILLAS DE TALENTO HUMANO
// ============================================================================
export const GOOGLE_FORMS_EVALUACION_RETIRO =
  'https://docs.google.com/forms/d/e/1FAIpQLSfvOxm8Du2CU6nGLPlN3bjLPjF7X765F8vCfaaPUlAFhtgSNg/viewform?usp=header';

export interface FormatoInstitucionalOficial {
  id: string;
  codigo: string;
  nombre: string;
  version: string;
  archivo: string;
  tipo: 'DOCX' | 'DOC' | 'XLSX' | 'PDF';
  proceso: 'VINCULACION' | 'DESVINCULACION' | 'GUIA_NORMATIVA';
  fasesRecomendadas: string[];
  descripcion: string;
  formularioGoogleUrl?: string;
  requisitosAsociados?: string[];
}

export const LISTA_FORMATOS_OFICIALES: FormatoInstitucionalOficial[] = [
  {
    id: 'FT-268',
    codigo: '2310200-FT-268',
    nombre: 'Compromiso de Confidencialidad de Información',
    version: 'V2',
    archivo: '2310200-FT-268 Compromiso de Confidencialidad de Información V2.docx',
    tipo: 'DOCX',
    proceso: 'VINCULACION',
    fasesRecomendadas: ['Inducción y Puesto de Trabajo', 'Posesión'],
    descripcion: 'Compromiso formal de estricta reserva, custodia y confidencialidad de la información y bases de datos institucionales.',
    requisitosAsociados: ['vp6_3', 'vc6_5', 'vl5_4', 'vp5_3', 'vc5_4', 'vl5_3'],
  },
  {
    id: 'FT-027',
    codigo: '2311300-FT-027',
    nombre: 'Declaración Juramentada de No Deudor Alimentario / Inhabilidades',
    version: 'V1',
    archivo: '2311300-FT-027 V1.doc',
    tipo: 'DOC',
    proceso: 'VINCULACION',
    fasesRecomendadas: ['Antecedentes y REDAM', 'Posesión'],
    descripcion: 'Declaración jurada de no figurar en el REDAM ni registrar inhabilidades o incompatibilidades legales para ejercer empleo público.',
    requisitosAsociados: ['vp3_2', 'vc5_3', 'vl2_1', 'vp5_2', 'vc5_2', 'vl5_2'],
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
    descripcion: 'Autorización formal del aspirante para que la entidad consulte y certifique autenticidad de títulos ante instituciones académicas.',
    requisitosAsociados: ['vp3_1', 'vl1_3', 'vc5_ft318', 'vp3_3', 'vl2_2'],
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
    descripcion: 'Plantilla oficial para elaborar el Acta solemne de juramento y posesión del empleo público.',
    requisitosAsociados: ['vp5_3', 'vc5_4', 'vl5_3'],
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
    descripcion: 'Acta suscrita con el jefe inmediato que documenta la inducción, entrega de funciones y responsabilidades del puesto.',
    requisitosAsociados: ['vp6_3', 'vc6_5', 'vl5_4'],
  },
  {
    id: 'GUI-POSESION-01',
    codigo: 'GUI-POSESION-01',
    nombre: 'Requisitos para Tomar Posesión del Cargo (Lista de Chequeo)',
    version: 'V5',
    archivo: 'Requisitos para tomar posesion del cargo_V5.doc',
    tipo: 'DOC',
    proceso: 'VINCULACION',
    fasesRecomendadas: ['Comunicación del Nombramiento', 'Posesión'],
    descripcion: 'Guía institucional con el listado exhaustivo de documentos que el aspirante debe recopilar y allegar antes de la posesión.',
    requisitosAsociados: ['vp4_3', 'vl4_2', 'vc4_3', 'vp5_1', 'vc5_1', 'vl5_1'],
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
    formularioGoogleUrl: GOOGLE_FORMS_EVALUACION_RETIRO,
    descripcion: 'Encuesta oficial de valoración de la experiencia laboral del servidor público saliente. Disponible en línea en Google Forms o en Excel.',
    requisitosAsociados: ['dp4_3', 'dc4_3', 'dl4_3', 'dp4_2', 'dc4_2', 'dl4_2'],
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
    descripcion: 'Matriz en Excel para relacionar inventario físico, equipos, expedientes archivísticos, procesos en trámite y claves asignadas.',
    requisitosAsociados: ['dp2_1', 'dc2_1', 'dl2_1', 'dp2_2', 'dc2_2', 'dl2_2'],
  },
  {
    id: 'ACTA-LEY-951',
    codigo: 'ACTA-GESTION-951',
    nombre: 'Acta de Informe de Gestión y Entrega de Cargo (Ley 951 de 2005)',
    version: 'V3',
    archivo: 'Acta de Informe de Gestión y Entrega de Cargo_V3 (5).docx',
    tipo: 'DOCX',
    proceso: 'DESVINCULACION',
    fasesRecomendadas: ['Control Interno (Directivos y LNR)'],
    descripcion: 'Acta formal obligatoria para radicar ante la Oficina de Control Interno dentro de los 15 días hábiles siguientes al retiro.',
    requisitosAsociados: ['dl2_3', 'dl2_1'],
  },
  {
    id: 'PR-VINC-01',
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
    id: 'PR-DESV-06',
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
    id: 'PR-PRAC-02',
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

export const CAUSALES_RETIRO_POR_MODALIDAD: Record<ModalidadPersonal, string[]> = {
  CARRERA_ADMINISTRATIVA: [
    'Renuncia libre y regularmente aceptada (Ley 909 de 2004, Art. 41 lit. d)',
    'Retiro con derecho a pensión de vejez/invalidez con inclusión en nómina (Ley 909, Art. 41 lit. e • C-1037/2003)',
    'Declaratoria de insubsistencia por Calificación No Satisfactoria en EDL (Ley 909, Art. 41 lit. b)',
    'Supresión del empleo de carrera con indemnización o reincorporación (Ley 909, Art. 41 lit. l y Art. 44)',
    'Edad de retiro forzoso - 70 años (Ley 1821 de 2016 • Ley 909, Art. 41 lit. g)',
    'Destitución como consecuencia de proceso disciplinario en firme (Ley 909, Art. 41 lit. h)',
    'Declaratoria de vacancia del empleo por abandono del cargo (Ley 909, Art. 41 lit. i)',
    'Muerte del servidor público (Ley 909, Art. 41 lit. m)',
  ],
  PROVISIONALIDAD: [
    'Provisión definitiva por elegible de mérito en período de prueba (Decreto 1083 de 2015, Art. 2.2.5.3.4 • SU-917/2010)',
    'Provisión transitoria mediante encargo preferencial a servidor de carrera (Ley 909 de 2004, Art. 24)',
    'Renuncia regularmente aceptada (Ley 909 de 2004, Art. 41 lit. d)',
    'Retiro con pensión de vejez o invalidez con inclusión en nómina (Ley 909, Art. 41 lit. e)',
    'Calificación no satisfactoria en la evaluación del desempeño de servicios (Decreto 1083, Art. 2.2.5.3.4)',
    'Edad de retiro forzoso - 70 años (Ley 1821 de 2016)',
    'Destitución disciplinaria en firme o decisión judicial (Ley 909, Art. 41 lit. h y k)',
    'Muerte del servidor público (Ley 909, Art. 41 lit. m)',
  ],
  LIBRE_NOMBRAMIENTO: [
    'Declaratoria de insubsistencia del nombramiento discrecional (Ley 909 de 2004, Art. 41 lit. a)',
    'Renuncia regularmente aceptada (Ley 909 de 2004, Art. 41 lit. d)',
    'Retiro con pensión de jubilación o vejez con inclusión en nómina (Ley 909, Art. 41 lit. e)',
    'Edad de retiro forzoso - 70 años (Ley 1821 de 2016 • Ley 909, Art. 41 lit. g)',
    'Destitución como consecuencia de proceso disciplinario (Ley 909, Art. 41 lit. h)',
    'Muerte del servidor público (Ley 909, Art. 41 lit. m)',
  ],
  PRACTICANTE_JUDICANTE: [
    'Culminación regular del período formativo / judicatura acordada (Ley 2043 de 2020 • Res. 3546 de 2018)',
    'Terminación anticipada de común acuerdo entre la entidad y la institución de educación superior',
    'Renuncia voluntaria justificada presentada por el estudiante / judicante',
    'Incumplimiento grave de obligaciones formativas o del reglamento institucional',
  ],
};

const CAUSALES_RETIRO = [
  ...CAUSALES_RETIRO_POR_MODALIDAD.CARRERA_ADMINISTRATIVA,
  ...CAUSALES_RETIRO_POR_MODALIDAD.PROVISIONALIDAD,
  ...CAUSALES_RETIRO_POR_MODALIDAD.LIBRE_NOMBRAMIENTO,
  ...CAUSALES_RETIRO_POR_MODALIDAD.PRACTICANTE_JUDICANTE,
];

export default function VinculacionesDesvinculacionesScreen({ tabInicial }: { tabInicial?: 'ingresos' | 'desvinculaciones' } = {}) {
  const router = useRouter();
  const { enMenu } = useMarcoRRHH();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isTablet = width >= 640;

  // Pestañas principales divididas en Ingresos y Desvinculaciones (estilo Nómina)
  const [tabActiva, setTabActiva] = useState<
    'ingresos' | 'desvinculaciones' | 'secop' | 'validacion_ia' | 'paz_salvo' | 'matriz_normativa'
  >(tabInicial || 'ingresos');

  // Control de KPIs
  const [mostrarKpis, setMostrarKpis] = useState(true);

  // Filtros de búsqueda específicos para Ingresos
  const [filtroModalidadIngreso, setFiltroModalidadIngreso] = useState<'TODAS' | ModalidadPersonal>('TODAS');
  const [busquedaIngresos, setBusquedaIngresos] = useState('');

  // Filtros de búsqueda específicos para Desvinculaciones
  const [filtroModalidadDesvinculacion, setFiltroModalidadDesvinculacion] = useState<'TODAS' | ModalidadPersonal>('TODAS');
  const [busquedaDesvinculaciones, setBusquedaDesvinculaciones] = useState('');

  // Claves de persistencia en almacenamiento local (Web / App)
  const STORAGE_KEY_CASOS = 'rrhh_vinculaciones_casos_v2';
  const STORAGE_KEY_CASO_ACTIVO = 'rrhh_vinculaciones_caso_activo_v2';

  const obtenerCasosIniciales = (): CasoFlujoFuncionario[] => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const guardados = window.localStorage.getItem(STORAGE_KEY_CASOS);
        if (guardados) {
          const parsed = JSON.parse(guardados);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((c: CasoFlujoFuncionario) => ({
              ...c,
              etapas: sincronizarEtapasCaso(c.etapas, c.tipo_proceso, c.modalidad),
            }));
          }
        }
      } catch (e) {
        console.warn('Error leyendo trámites de localStorage:', e);
      }
    }
    return CASOS_BASE;
  };

  const obtenerCasoActivoInicial = (): string => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const guardado = window.localStorage.getItem(STORAGE_KEY_CASO_ACTIVO);
        if (guardado) return guardado;
      } catch (e) {}
    }
    return CASOS_BASE[0]?.id || '';
  };

  // Casos con flujos inicializados con persistencia
  const [casos, setCasos] = useState<CasoFlujoFuncionario[]>(obtenerCasosIniciales);
  const [casoSeleccionadoId, setCasoSeleccionadoId] = useState<string>(obtenerCasoActivoInicial);

  // Asegurar migración de cualquier trámite previamente persistido a las normas y textos maestros vigentes
  useEffect(() => {
    setCasos((prevCasos) =>
      prevCasos.map((c) => ({
        ...c,
        etapas: sincronizarEtapasCaso(c.etapas, c.tipo_proceso, c.modalidad),
      }))
    );
  }, []);

  // Guardar en localStorage de forma reactiva ante cualquier cambio en casos
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_CASOS, JSON.stringify(casos));
      } catch (e) {
        console.warn('Error guardando trámites en localStorage:', e);
      }
    }
  }, [casos]);

  // Guardar el ID del caso activo seleccionado para preservarlo tras recargar (F5)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage && casoSeleccionadoId) {
      try {
        window.localStorage.setItem(STORAGE_KEY_CASO_ACTIVO, casoSeleccionadoId);
      } catch (e) {}
    }
  }, [casoSeleccionadoId]);

  // Modal para registrar nuevo trámite
  const [modalRegistroVisible, setModalRegistroVisible] = useState(false);
  const [modalGuiaModalidadesVisible, setModalGuiaModalidadesVisible] = useState(false);
  const [tabGuiaModalidad, setTabGuiaModalidad] = useState<ModalidadPersonal>('CARRERA_ADMINISTRATIVA');
  const [tabGuiaTipoProceso, setTabGuiaTipoProceso] = useState<TipoProceso>('VINCULACION');
  const [nuevoTipoProceso, setNuevoTipoProceso] = useState<TipoProceso>('VINCULACION');
  const [nuevaModalidad, setNuevaModalidad] = useState<ModalidadPersonal>('LIBRE_NOMBRAMIENTO');
  const [plazaSeleccionadaId, setPlazaSeleccionadaId] = useState<number | null>(null);
  const [nombreInput, setNombreInput] = useState('');
  const [cedulaInput, setCedulaInput] = useState('');
  const [cargoInput, setCargoInput] = useState('');
  const [dependenciaInput, setDependenciaInput] = useState('');
  const [causalInput, setCausalInput] = useState(CAUSALES_RETIRO[0]);

  // Estados de Búsqueda de Nómina Integrada en el Modal
  const [modalModoEntrada, setModalModoEntrada] = useState<'NOMINA' | 'MANUAL'>('NOMINA');
  const [nominaTipoBusqueda, setNominaTipoBusqueda] = useState<'SERVIDORES' | 'PLAZAS'>('PLAZAS');
  const [nominaQuery, setNominaQuery] = useState('');
  const [nominaCargando, setNominaCargando] = useState(false);
  const [nominaResultadosServidores, setNominaResultadosServidores] = useState<PersonaPerno[]>([]);
  const [nominaResultadosPlazas, setNominaResultadosPlazas] = useState<PlazaNomina[]>([]);
  const [nominaItemSeleccionado, setNominaItemSeleccionado] = useState<{
    tipo: 'SERVIDOR' | 'PLAZA';
    titulo: string;
    detalle: string;
    id?: number | string;
  } | null>(null);

  // Filtros específicos de Cargo, Grado y Dependencia para la Búsqueda de Nómina
  const [nominaFiltroCargo, setNominaFiltroCargo] = useState<string>('');
  const [nominaFiltroGrado, setNominaFiltroGrado] = useState<string>('');
  const [nominaFiltroDependencia, setNominaFiltroDependencia] = useState<string>('');
  const [modalSelectorCargoVisible, setModalSelectorCargoVisible] = useState(false);
  const [modalSelectorGradoVisible, setModalSelectorGradoVisible] = useState(false);
  const [modalSelectorDependenciaVisible, setModalSelectorDependenciaVisible] = useState(false);
  const [busquedaSelectorCargo, setBusquedaSelectorCargo] = useState('');
  const [busquedaSelectorDependencia, setBusquedaSelectorDependencia] = useState('');

  // Lista de cargos únicos disponibles en la planta para el filtro
  const listaCargosNomina = useMemo(() => {
    const plazas = (mockPlazasData as unknown as PlazaNomina[]) || [];
    const map = new Map<string, number>();
    plazas.forEach((p) => {
      const c = (p.cargo || '').trim().toUpperCase();
      if (c) map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([cargo, count]) => ({ valor: cargo, etiqueta: cargo, count }))
      .sort((a, b) => a.valor.localeCompare(b.valor));
  }, []);

  // Lista de grados únicos disponibles en la planta para el filtro
  const listaGradosNomina = useMemo(() => {
    const plazas = (mockPlazasData as unknown as PlazaNomina[]) || [];
    const map = new Map<string, number>();
    plazas.forEach((p) => {
      if (p.grado !== undefined && p.grado !== null && String(p.grado).trim() !== '') {
        const g = String(p.grado).trim();
        const gKey = g.length === 1 ? `0${g}` : g;
        map.set(gKey, (map.get(gKey) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([grado, count]) => ({ valor: grado, etiqueta: `Grado ${grado}`, count }))
      .sort((a, b) => a.valor.localeCompare(b.valor, undefined, { numeric: true }));
  }, []);

  // Lista de dependencias únicas disponibles en la planta para el filtro
  const listaDependenciasNomina = useMemo(() => {
    const plazas = (mockPlazasData as unknown as PlazaNomina[]) || [];
    const map = new Map<string, number>();
    plazas.forEach((p) => {
      const dep = (p.dependencia_cargo || p.dependencia_funcional || '').trim().toUpperCase();
      if (dep) map.set(dep, (map.get(dep) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([dep, count]) => ({ valor: dep, etiqueta: dep, count }))
      .sort((a, b) => a.valor.localeCompare(b.valor));
  }, []);

  // Función para ejecutar búsqueda reactiva en nómina con soporte de filtros de cargo, grado y dependencia
  const ejecutarBusquedaNomina = async (
    queryText: string = nominaQuery,
    tipo: 'SERVIDORES' | 'PLAZAS' = nominaTipoBusqueda,
    filtroCargoVal: string = nominaFiltroCargo,
    filtroGradoVal: string = nominaFiltroGrado,
    filtroDepVal: string = nominaFiltroDependencia
  ) => {
    const q = (queryText || '').trim();
    setNominaCargando(true);
    try {
      if (tipo === 'SERVIDORES') {
        let personas = await nominaService.getPersonalPerno({ busqueda: q });
        if (filtroCargoVal) {
          const cUpper = filtroCargoVal.toUpperCase();
          personas = personas.filter((p) => {
            const c = (p.cargo || p.plaza_cargo || '').toUpperCase();
            return c.includes(cUpper);
          });
        }
        if (filtroGradoVal) {
          const gNorm = filtroGradoVal.padStart(2, '0');
          personas = personas.filter((p) => {
            const g = String(p.grado || p.plaza_grado || '').trim();
            return g === filtroGradoVal || g.padStart(2, '0') === gNorm;
          });
        }
        if (filtroDepVal) {
          const depUpper = filtroDepVal.toUpperCase();
          personas = personas.filter((p) => {
            const dep = (p.dependencia || p.plaza_dependencia_cargo || '').toUpperCase();
            return dep.includes(depUpper);
          });
        }
        setNominaResultadosServidores(personas.slice(0, 15));
      } else {
        let plazas = await nominaService.getPlazas({ busqueda: q });
        if (filtroCargoVal) {
          const cUpper = filtroCargoVal.toUpperCase();
          plazas = plazas.filter((pl) => {
            const c = (pl.cargo || '').toUpperCase();
            return c.includes(cUpper);
          });
        }
        if (filtroGradoVal) {
          const gNorm = filtroGradoVal.padStart(2, '0');
          plazas = plazas.filter((pl) => {
            const g = String(pl.grado || '').trim();
            return g === filtroGradoVal || g.padStart(2, '0') === gNorm;
          });
        }
        if (filtroDepVal) {
          const depUpper = filtroDepVal.toUpperCase();
          plazas = plazas.filter((pl) => {
            const dep = (pl.dependencia_cargo || pl.dependencia_funcional || '').toUpperCase();
            return dep.includes(depUpper);
          });
        }
        setNominaResultadosPlazas(plazas.slice(0, 15));
      }
    } catch (e: any) {
      console.warn('Error al buscar en nómina:', e.message);
    } finally {
      setNominaCargando(false);
    }
  };

  const aplicarFiltroCargo = (cargo: string) => {
    setNominaFiltroCargo(cargo);
    setModalSelectorCargoVisible(false);
    setBusquedaSelectorCargo('');
    ejecutarBusquedaNomina(nominaQuery, nominaTipoBusqueda, cargo, nominaFiltroGrado, nominaFiltroDependencia);
  };

  const aplicarFiltroGrado = (grado: string) => {
    setNominaFiltroGrado(grado);
    setModalSelectorGradoVisible(false);
    ejecutarBusquedaNomina(nominaQuery, nominaTipoBusqueda, nominaFiltroCargo, grado, nominaFiltroDependencia);
  };

  const aplicarFiltroDependencia = (dep: string) => {
    setNominaFiltroDependencia(dep);
    setModalSelectorDependenciaVisible(false);
    setBusquedaSelectorDependencia('');
    ejecutarBusquedaNomina(nominaQuery, nominaTipoBusqueda, nominaFiltroCargo, nominaFiltroGrado, dep);
  };

  const limpiarFiltrosNomina = () => {
    setNominaFiltroCargo('');
    setNominaFiltroGrado('');
    setNominaFiltroDependencia('');
    setNominaQuery('');
    setNominaResultadosServidores([]);
    setNominaResultadosPlazas([]);
  };

  // Autocompletar formulario al seleccionar servidor de nómina
  const seleccionarServidorNomina = (p: PersonaPerno) => {
    const nombreCompleto =
      p.nombre_completo ||
      `${p.nombres || ''} ${p.primer_apellido || ''} ${p.segundo_apellido || ''}`.trim();
    setNombreInput(nombreCompleto);
    setCedulaInput(String(p.cedula || ''));
    setCargoInput(p.cargo || p.plaza_cargo || 'PROFESIONAL ESPECIALIZADO');
    setDependenciaInput(p.dependencia || p.plaza_dependencia_cargo || 'SECRETARÍA JURÍDICA DISTRITAL');

    if (p.plaza_id_plaza) {
      setPlazaSeleccionadaId(p.plaza_id_plaza);
    }

    // Deducción de modalidad
    const nomb = (p.tipo_nombramiento || p.plaza_tipo_vinculacion || '').toUpperCase();
    if (nomb.includes('CARRERA')) {
      setNuevaModalidad('CARRERA_ADMINISTRATIVA');
    } else if (nomb.includes('PROVISIONAL')) {
      setNuevaModalidad('PROVISIONALIDAD');
    } else if (nomb.includes('LIBRE') || nomb.includes('REMOCION')) {
      setNuevaModalidad('LIBRE_NOMBRAMIENTO');
    }

    setNominaItemSeleccionado({
      tipo: 'SERVIDOR',
      titulo: nombreCompleto,
      detalle: `C.C. ${p.cedula} • ${p.cargo || p.plaza_cargo || 'Sin cargo'} • ${p.dependencia || 'Entidad'}`,
      id: p.cedula,
    });
  };

  // Autocompletar formulario al seleccionar plaza de nómina
  const seleccionarPlazaNomina = (pl: PlazaNomina) => {
    setPlazaSeleccionadaId(pl.id_plaza);
    setCargoInput(
      `${pl.cargo}${pl.codigo && pl.grado ? ` (Cód: ${pl.codigo} Gr: ${pl.grado})` : ''}`
    );
    setDependenciaInput(pl.dependencia_cargo || 'SECRETARÍA JURÍDICA DISTRITAL');

    // Si la plaza tiene titular y el trámite es de desvinculación, se completa el servidor
    if (nuevoTipoProceso === 'DESVINCULACION' && pl.titular_nombre) {
      setNombreInput(pl.titular_nombre);
      setCedulaInput(String(pl.titular_cedula || ''));
    }

    // Modalidad sugerida
    const vinc = (pl.tipo_vinculacion || '').toUpperCase();
    if (vinc.includes('CARRERA')) {
      setNuevaModalidad('CARRERA_ADMINISTRATIVA');
    } else if (vinc.includes('PROVISIONAL')) {
      setNuevaModalidad('PROVISIONALIDAD');
    } else if (vinc.includes('LIBRE')) {
      setNuevaModalidad('LIBRE_NOMBRAMIENTO');
    }

    setNominaItemSeleccionado({
      tipo: 'PLAZA',
      titulo: `Plaza #${pl.id_plaza} - ${pl.cargo}`,
      detalle: `${pl.estado_cargo} • Cód: ${pl.codigo || 'N/A'} Gr: ${pl.grado || 'N/A'} • ${pl.dependencia_cargo}`,
      id: pl.id_plaza,
    });
  };

  const limpiarSeleccionNomina = () => {
    setNominaItemSeleccionado(null);
    setPlazaSeleccionadaId(null);
  };

  const resetFormularioRegistro = () => {
    setNombreInput('');
    setCedulaInput('');
    setCargoInput('');
    setDependenciaInput('');
    setPlazaSeleccionadaId(null);
    setNominaItemSeleccionado(null);
    setNominaQuery('');
    setNominaFiltroCargo('');
    setNominaFiltroGrado('');
    setNominaFiltroDependencia('');
    setNominaResultadosServidores([]);
    setNominaResultadosPlazas([]);
    setModalModoEntrada('NOMINA');
  };

  // Modal informativo estándar (Regla: Modals en vez de alerts)
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalTitulo, setInfoModalTitulo] = useState('');
  const [infoModalMensaje, setInfoModalMensaje] = useState('');
  const [infoModalTipo, setInfoModalTipo] = useState<'success' | 'info' | 'warning'>('info');

  const mostrarModal = (
    titulo: string,
    mensaje: string,
    tipo: 'success' | 'info' | 'warning' = 'info'
  ) => {
    setInfoModalTitulo(titulo);
    setInfoModalMensaje(mensaje);
    setInfoModalTipo(tipo);
    setInfoModalVisible(true);
  };

  // ==========================================================================
  // ESTADO Y MÉTODOS DE CONSULTA SECOP II
  // ==========================================================================
  const [secopBusqueda, setSecopBusqueda] = useState('');
  const [secopTipoCriterio, setSecopTipoCriterio] = useState<'documento' | 'nombre'>('documento');
  const [secopCargando, setSecopCargando] = useState(false);
  const [secopResultado, setSecopResultado] = useState<ResultadoConsultaSecop | null>(null);
  const [secopModalVisible, setSecopModalVisible] = useState(false);
  const [secopModalCandidato, setSecopModalCandidato] = useState<{
    nombre: string;
    cedula: string;
    casoId?: string;
  } | null>(null);
  const [secopFiltroTab, setSecopFiltroTab] = useState<'activos' | 'finalizados' | 'historicos' | 'todos'>('activos');
  const [secopModalFiltroTab, setSecopModalFiltroTab] = useState<'activos' | 'finalizados' | 'historicos' | 'todos'>('activos');
  const [copiadoSecop, setCopiadoSecop] = useState(false);

  const abrirUrlSecop = (url?: string | null, referencia?: string) => {
    let target = url;
    if (!target) {
      if (referencia) {
        target = `https://www.colombiacompra.gov.co/secop-ii?q=${encodeURIComponent(referencia)}`;
      } else {
        target = 'https://www.datos.gov.co/dataset/SECOP-II-Contratos-Electr-nicos/jbjy-vk9h';
      }
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(target, '_blank');
    } else {
      Linking.openURL(target).catch(() => {});
    }
  };

  const copiarDictamenSecop = (
    res: ResultadoConsultaSecop,
    candidatoNombre?: string,
    candidatoCedula?: string
  ) => {
    try {
      const texto = `--- REPORTE DE VERIFICACIÓN PREVENTIVA SECOP II ---
Entidad: Secretaría Jurídica Distrital - Talento Humano
Fecha de Auditoría: ${new Date().toLocaleString('es-CO')}
Aspirante / Servidor: ${candidatoNombre || 'Consulta Directa'}
Documento Consultado: ${candidatoCedula || res.valorBuscado || 'N/D'}

RESULTADO PREVENTIVO:
${res.dictamen}

INDICADORES CONTRACTUALES:
- Contratos Activos Vigentes: ${res.totalActivosVigentes ?? res.totalActivos}
- Contratos Activos pero Finalizados (Plazo Vencido): ${res.totalActivosFinalizados ?? 0}
- Contratos Históricos Finalizados: ${res.totalHistoricos}
- Total Contratado Activo: $${(res.resumenFinanciero?.valorTotalActivo ?? res.valorTotalActivo ?? 0).toLocaleString('es-CO')}
- Saldo Pendiente de Ejecución: $${(res.resumenFinanciero?.valorPendienteActivo ?? 0).toLocaleString('es-CO')}
- Entidades Involucradas: ${res.entidadesActivas.join(', ') || 'Ninguna'}

FUNDAMENTO NORMATIVO:
1. Artículo 128 Constitución Política: Prohibición expresa de desempeñar más de un empleo público o percibir más de una asignación del tesoro.
2. Ley 80 de 1993, Art. 8: Régimen de inhabilidades e incompatibilidades en contratación estatal.
3. Ley 1952 de 2019 / Ley 2094 de 2021: Código General Disciplinario.

INSTRUCCIÓN TALENTO HUMANO:
${res.resumenNormativo?.orientacionTalentoHumano || 'Verifique la cesión, suspensión o acta de terminación antes de formalizar la posesión.'}`;

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(texto);
      }
      setCopiadoSecop(true);
      setTimeout(() => setCopiadoSecop(false), 3000);
    } catch (e) {
      console.warn('Error al copiar dictamen:', e);
    }
  };

  const ejecutarConsultaSecop = async (
    query?: string,
    criterio?: 'documento' | 'nombre',
    esModal = false,
    casoIdOpcional?: string
  ) => {
    const term = (query || secopBusqueda).trim();
    const mode = criterio || secopTipoCriterio;

    if (!term) {
      mostrarModal(
        'Campo Requerido',
        'Por favor ingrese el número de cédula o nombre para consultar en SECOP II.',
        'warning'
      );
      return;
    }

    try {
      setSecopCargando(true);
      const res = await secopService.consultar(
        mode === 'documento' ? { documento: term } : { nombre: term }
      );
      setSecopResultado(res);

      const targetId = casoIdOpcional || secopModalCandidato?.casoId || (casoSeleccionadoId ? casoSeleccionadoId : undefined);
      if (targetId) {
        const ahora = new Date();
        const fechaHoraTexto = `${ahora.toLocaleDateString('es-CO')} ${ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;
        setCasos((prevCasos) =>
          prevCasos.map((c) => {
            if (c.id === targetId) {
              const etapasActualizadas = c.etapas.map((et) => ({
                ...et,
                requisitos: et.requisitos.map((rq) =>
                  rq.tipoAccionEspecial === 'SECOP' ? { ...rq, cumplido: true } : rq
                ),
              }));

              return {
                ...c,
                etapas: etapasActualizadas,
                resultadoSecop: {
                  totalActivos: res.totalActivos,
                  totalActivosVigentes: res.totalActivosVigentes ?? res.totalActivos,
                  totalActivosFinalizados: res.totalActivosFinalizados ?? 0,
                  totalHistoricos: res.totalHistoricos,
                  tieneAlerta: res.tieneContratosActivos,
                  fechaConsulta: ahora.toLocaleDateString('es-CO'),
                  fechaHoraConsulta: fechaHoraTexto,
                  dictamen: res.dictamen,
                  entidadesActivas: res.entidadesActivas,
                  valorTotalActivo: res.valorTotalActivo,
                  contratosActivos: res.contratosActivos,
                  contratosActivosFinalizados: res.contratosActivosFinalizados || [],
                  entidadesFinalizadas: res.entidadesFinalizadas || [],
                  todosContratos: res.todosContratos,
                  resumenNormativo: res.resumenNormativo,
                  resumenFinanciero: res.resumenFinanciero,
                },
              };
            }
            return c;
          })
        );
      }

      if (res.tieneContratosActivos) {
        setSecopFiltroTab('activos');
        setSecopModalFiltroTab('activos');
      } else if ((res.totalActivosFinalizados || 0) > 0) {
        setSecopFiltroTab('finalizados');
        setSecopModalFiltroTab('finalizados');
      } else {
        setSecopFiltroTab('todos');
        setSecopModalFiltroTab('todos');
      }

      // Solo mostramos alerta en modal general si la consulta no es el modal específico de candidato
      if (res.tieneContratosActivos && !esModal && !secopModalVisible) {
        mostrarModal(
          '⚠️ Alerta Contractual en SECOP II',
          `Se detectaron ${res.totalActivos} contrato(s) activo(s) o en ejecución. ${res.dictamen}`,
          'warning'
        );
      }
    } catch (err: any) {
      mostrarModal(
        'Error en SECOP II',
        err.message || 'No fue posible consultar la API de SECOP II.',
        'warning'
      );
    } finally {
      setSecopCargando(false);
    }
  };

  const abrirConsultaSecopParaCandidato = (nombre: string, cedula: string, casoId?: string) => {
    setSecopModalCandidato({ nombre, cedula, casoId });
    setSecopBusqueda(cedula);
    setSecopTipoCriterio('documento');
    setSecopModalFiltroTab('activos');
    setSecopModalVisible(true);
    ejecutarConsultaSecop(cedula, 'documento', true, casoId);
  };

  const renderReporteSecopDetallado = (
    res: ResultadoConsultaSecop,
    candidatoInfo?: { nombre: string; cedula: string; casoId?: string } | null,
    filtroActual: 'activos' | 'finalizados' | 'historicos' | 'todos' = 'activos',
    cambiarFiltro: (tab: 'activos' | 'finalizados' | 'historicos' | 'todos') => void = () => {},
    esModal = false
  ) => {
    const totalActivosVigentes = res.totalActivosVigentes ?? res.totalActivos;
    const totalActivosFinalizados = res.totalActivosFinalizados ?? (res.contratosActivosFinalizados ? res.contratosActivosFinalizados.length : 0);

    const contratosFiltrados =
      filtroActual === 'activos'
        ? (res.contratosActivos || [])
        : filtroActual === 'finalizados'
        ? (res.contratosActivosFinalizados || [])
        : filtroActual === 'historicos'
        ? res.contratosHistoricos
        : res.todosContratos;

    const montoTotalActivo = res.resumenFinanciero?.valorTotalActivo ?? res.valorTotalActivo ?? 0;
    const montoSaldoPendiente = res.resumenFinanciero?.valorPendienteActivo ?? 0;
    const montoPagadoActivo = res.resumenFinanciero?.valorPagadoActivo ?? 0;

    const esAlertaActivo = res.tieneContratosActivos;
    const esAlertaFinalizado = !esAlertaActivo && totalActivosFinalizados > 0;
    const esSoloHistorico = !esAlertaActivo && !esAlertaFinalizado && res.totalHistoricos > 0;

    const bannerBg = esAlertaActivo
      ? THEME.roseBg
      : esAlertaFinalizado
      ? THEME.amberBg
      : esSoloHistorico
      ? THEME.skyBg
      : THEME.emeraldBg;

    const bannerBorder = esAlertaActivo
      ? THEME.roseRing
      : esAlertaFinalizado
      ? THEME.amberRing
      : esSoloHistorico
      ? THEME.skyRing
      : THEME.emeraldRing;

    const bannerIconBg = esAlertaActivo
      ? '#FFE4E6'
      : esAlertaFinalizado
      ? '#FEF3C7'
      : esSoloHistorico
      ? '#E0F2FE'
      : '#D1FAE5';

    const bannerIconColor = esAlertaActivo
      ? THEME.roseText
      : esAlertaFinalizado
      ? THEME.amberText
      : esSoloHistorico
      ? THEME.skyText
      : THEME.emeraldText;

    const bannerIconName = esAlertaActivo
      ? 'warning'
      : esAlertaFinalizado
      ? 'time'
      : esSoloHistorico
      ? 'information-circle'
      : 'shield-checkmark';

    const bannerTitulo = esAlertaActivo
      ? '⚠️ ALERTA DE CONTRATOS EN EJECUCIÓN (POSIBLE INHABILIDAD)'
      : esAlertaFinalizado
      ? '⏱️ CONTRATOS ACTIVOS CON PLAZO VENCIDO (PENDIENTES DE CIERRE EN SECOP)'
      : esSoloHistorico
      ? '✓ REGISTRO VERIFICADO: SOLO CONTRATOS HISTÓRICOS CERRADOS'
      : '✓ ESTADO LIMPIO EN SECOP II: SIN CONTRATOS REGISTRADOS';

    return (
      <View style={{ gap: 16, width: '100%' }}>
        {/* BANNER DE SEMÁFORO Y DICTAMEN NORMATIVO */}
        <View
          style={{
            backgroundColor: bannerBg,




            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: bannerBorder,




            padding: 16,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: bannerIconBg,




                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              <Ionicons
                name={bannerIconName as any}






                size={22}
                color={bannerIconColor}






              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: bannerIconColor,
                    letterSpacing: 0.2,
                  }}
                >
                  {bannerTitulo}
                </Text>
                {res.tieneContratosActivos && (
                  <View
                    style={{
                      backgroundColor: THEME.roseText,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: THEME.white, fontSize: 10, fontWeight: '800' }}>
                      RIESGO ART. 128 C.P.
                    </Text>
                  </View>
                )}
                {esAlertaFinalizado && (
                  <View
                    style={{
                      backgroundColor: '#D97706',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: THEME.white, fontSize: 10, fontWeight: '800' }}>
                      PLAZO VENCIDO / POR LIQUIDAR
                    </Text>
                  </View>
                )}
              </View>

              <Text style={{ color: THEME.slate800, fontSize: 12.5, lineHeight: 18, marginTop: 2 }}>
                {res.dictamen}
              </Text>
            </View>
          </View>

          {/* CAJA DE FUNDAMENTACIÓN JURÍDICA Y ACCIÓN PREVENTIVA */}
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: THEME.slate200,
              padding: 12,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="book-outline" size={15} color={THEME.marca700} />
              <Text style={{ color: THEME.slate900, fontSize: 12, fontWeight: '700' }}>
                Fundamentación Constitucional y Legal Aplicable:
              </Text>
            </View>

            <View style={{ gap: 4, paddingLeft: 6 }}>
              <Text style={{ color: THEME.slate600, fontSize: 11.5, lineHeight: 16 }}>
                • <Text style={{ fontWeight: '700', color: THEME.slate800 }}>Artículo 128 Constitución Política:</Text> Nadie podrá desempeñar simultáneamente más de un empleo público ni recibir más de una asignación que provenga del tesoro público.
              </Text>
              <Text style={{ color: THEME.slate600, fontSize: 11.5, lineHeight: 16 }}>
                • <Text style={{ fontWeight: '700', color: THEME.slate800 }}>Ley 80 de 1993, Art. 8:</Text> Régimen de inhabilidades e incompatibilidades para contratar o prestar servicios con entidades estatales.
              </Text>
              <Text style={{ color: THEME.slate600, fontSize: 11.5, lineHeight: 16 }}>
                • <Text style={{ fontWeight: '700', color: THEME.slate800 }}>Ley 1952 de 2019 / Ley 2094 de 2021:</Text> Código General Disciplinario (Faltas gravísimas por conflicto temporal o contractual).
              </Text>
            </View>

            <View
              style={{
                backgroundColor: esAlertaActivo ? '#FFF1F2' : esAlertaFinalizado ? '#FFFBEB' : '#F0FDF4',
                padding: 8,
                borderRadius: 6,
                borderLeftWidth: 3,
                borderLeftColor: esAlertaActivo ? THEME.roseText : esAlertaFinalizado ? '#D97706' : THEME.emeraldText,
              }}
            >
              <Text
                style={{
                  color: esAlertaActivo ? THEME.roseText : esAlertaFinalizado ? '#92400E' : THEME.emeraldText,
                  fontSize: 11.5,
                  fontWeight: '700',
                }}
              >
                {esAlertaActivo
                  ? '📌 ACCIÓN PREVENTIVA OBLIGATORIA PARA TALENTO HUMANO / POSESIÓN:'
                  : esAlertaFinalizado
                  ? '📌 VERIFICACIÓN PREVENTIVA DE TERMINACIÓN / PAZ Y SALVO:'
                  : '📌 CONCEPTO PRELIMINAR TALENTO HUMANO:'}
              </Text>
              <Text
                style={{
                  color: esAlertaActivo ? '#881337' : esAlertaFinalizado ? '#78350F' : '#065F46',
                  fontSize: 11,
                  lineHeight: 16,
                  marginTop: 2,
                }}
              >
                {res.resumenNormativo?.orientacionTalentoHumano ||
                  'Previo a la posesión, el aspirante debe radicar el acta de terminación bilateral y liquidación con paz y salvo, o acta de suspensión temporal aprobada por el ordenador del gasto competente.'}
              </Text>
            </View>
          </View>
        </View>

        {/* MÉTRICAS / KPIS CONSOLIDADOS */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 130,
              backgroundColor: THEME.white,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: totalActivosVigentes > 0 ? THEME.roseRing : THEME.slate200,
              padding: 12,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600' }}>
              Contratos en Ejecución
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: totalActivosVigentes > 0 ? THEME.roseText : THEME.emeraldText,
              }}
            >
              {totalActivosVigentes}
            </Text>
            <Text style={{ fontSize: 10, color: THEME.slate400 }}>
              {totalActivosVigentes > 0 ? 'Con alerta de inhabilidad' : 'Sin contratos vigentes'}
            </Text>
          </View>

          {totalActivosFinalizados > 0 && (
            <View
              style={{
                flex: 1,
                minWidth: 130,
                backgroundColor: '#FFFBEB',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#FDE68A',
                padding: 12,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600' }}>
                Plazo Vencido / Sin Liquidar
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: '#D97706',
                }}
              >
                {totalActivosFinalizados}
              </Text>
              <Text style={{ fontSize: 10, color: '#B45309' }}>
                Exigir acta o paz y salvo
              </Text>
            </View>
          )}

          <View
            style={{
              flex: 1,
              minWidth: 130,
              backgroundColor: THEME.white,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: THEME.slate200,
              padding: 12,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600' }}>
              Historial Terminado
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: THEME.slate800 }}>
              {res.totalHistoricos}
            </Text>
            <Text style={{ fontSize: 10, color: THEME.slate400 }}>Contratos cerrados</Text>
          </View>

          <View
            style={{
              flex: 1,
              minWidth: 160,
              backgroundColor: THEME.white,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: THEME.slate200,
              padding: 12,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600' }}>
              Total Contratado Activo
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.marca900 }}>
              ${montoTotalActivo.toLocaleString('es-CO')}
            </Text>
            <Text style={{ fontSize: 10, color: THEME.slate400 }}>
              Comprometido en ejecución
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              minWidth: 150,
              backgroundColor: THEME.white,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: THEME.slate200,
              padding: 12,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600' }}>
              Saldo Pendiente
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.amberText }}>
              ${montoSaldoPendiente.toLocaleString('es-CO')}
            </Text>
            <Text style={{ fontSize: 10, color: THEME.slate400 }}>Por pagar / ejecutar</Text>
          </View>

          {res.entidadesActivas.length > 0 && (
            <View
              style={{
                width: '100%',
                backgroundColor: '#F8FAFC',
                borderRadius: 8,
                padding: 10,
                borderWidth: 1,
                borderColor: THEME.slate200,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="business" size={16} color={THEME.marca700} />
              <Text style={{ fontSize: 11.5, color: THEME.slate700, flex: 1 }}>
                <Text style={{ fontWeight: '700' }}>Entidades Estatales Concurrentes:</Text>{' '}
                {res.entidadesActivas.join(' • ')}
              </Text>
            </View>
          )}
        </View>

        {/* ACCIONES Y FILTROS DE PESTAÑA */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginTop: 4,
          }}
        >
          {/* Selector de Pestaña */}
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => cambiarFiltro('activos')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor:
                  filtroActual === 'activos'
                    ? totalActivosVigentes > 0
                      ? THEME.roseText
                      : THEME.marca600
                    : THEME.slate100,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text
                style={{
                  color: filtroActual === 'activos' ? THEME.white : THEME.slate700,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                En Ejecución Vigente ({totalActivosVigentes})
              </Text>
            </Pressable>

            {totalActivosFinalizados > 0 && (
              <Pressable
                onPress={() => cambiarFiltro('finalizados')}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor:
                    filtroActual === 'finalizados' ? '#D97706' : '#FEF3C7',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    color: filtroActual === 'finalizados' ? THEME.white : '#92400E',
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  Plazo Vencido ({totalActivosFinalizados})
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => cambiarFiltro('historicos')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: filtroActual === 'historicos' ? THEME.marca600 : THEME.slate100,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text
                style={{
                  color: filtroActual === 'historicos' ? THEME.white : THEME.slate700,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                Historial Terminado ({res.totalHistoricos})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => cambiarFiltro('todos')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: filtroActual === 'todos' ? THEME.marca600 : THEME.slate100,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text
                style={{
                  color: filtroActual === 'todos' ? THEME.white : THEME.slate700,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                Todos ({res.totalContratos})
              </Text>
            </Pressable>
          </View>

          {/* Botón para Copiar Dictamen */}
          <Pressable
            onPress={() => copiarDictamenSecop(res, candidatoInfo?.nombre, candidatoInfo?.cedula)}
            style={{
              backgroundColor: copiadoSecop ? THEME.emeraldBg : THEME.slate100,
              borderColor: copiadoSecop ? THEME.emeraldRing : THEME.slate200,
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Ionicons
              name={copiadoSecop ? 'checkmark-circle' : 'copy-outline'}
              size={15}
              color={copiadoSecop ? THEME.emeraldText : THEME.slate700}
            />
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '600',
                color: copiadoSecop ? THEME.emeraldText : THEME.slate700,
              }}
            >
              {copiadoSecop ? '¡Dictamen Copiado!' : 'Copiar Dictamen para Acta'}
            </Text>
          </Pressable>
        </View>

        {/* LISTADO DETALLADO DE CONTRATOS */}
        {contratosFiltrados.length === 0 ? (
          <View
            style={{
              backgroundColor: THEME.slate50,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: THEME.slate200,
              padding: 24,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="folder-open-outline" size={32} color={THEME.slate400} />
            <Text style={{ color: THEME.slate600, fontSize: 13, fontWeight: '600' }}>
              No se encontraron contratos en esta categoría ({filtroActual}).
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {contratosFiltrados.map((c, i) => {
              const esVigente = c.esActivo && !c.plazoVencido;
              const esFinalizadoActivo = c.esActivo && c.plazoVencido;

              const cardBorder = esVigente
                ? THEME.roseRing
                : esFinalizadoActivo
                ? '#FDE68A'
                : THEME.slate200;

              const cardLeftBorder = esVigente
                ? THEME.roseText
                : esFinalizadoActivo
                ? '#D97706'
                : THEME.emeraldText;

              const badgeBg = esVigente
                ? THEME.roseBg
                : esFinalizadoActivo
                ? '#FEF3C7'
                : THEME.emeraldBg;

              const badgeBorder = esVigente
                ? THEME.roseRing
                : esFinalizadoActivo
                ? '#FDE68A'
                : THEME.emeraldRing;

              const badgeColor = esVigente
                ? THEME.roseText
                : esFinalizadoActivo
                ? '#92400E'
                : THEME.emeraldText;

              const badgeIcon = esVigente
                ? 'alert-circle'
                : esFinalizadoActivo
                ? 'time'
                : 'checkmark-circle';

              const badgeTexto = esVigente
                ? c.estado.toUpperCase()
                : esFinalizadoActivo
                ? `${c.estado.toUpperCase()} (PLAZO VENCIDO)`
                : c.estado.toUpperCase();

              return (
              <View
                key={`${c.idContrato}-${i}`}
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  borderLeftWidth: 4,
                  borderLeftColor: cardLeftBorder,
                  padding: 16,
                  gap: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                {/* Cabecera del Contrato */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '800' }}>
                      {c.entidad}
                    </Text>
                    <Text style={{ color: THEME.slate500, fontSize: 11 }}>
                      NIT: {c.nitEntidad || 'N/D'} • Orden: {c.ordenEntidad || 'Nacional'} • {c.ciudad || ''} {c.departamento ? `(${c.departamento})` : ''}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: badgeBg,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderColor: badgeBorder,
                      borderWidth: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name={badgeIcon as any}
                      size={13}
                      color={badgeColor}
                    />
                    <Text
                      style={{
                        color: badgeColor,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      {badgeTexto}
                    </Text>
                  </View>
                </View>

                {/* Chips de Identificación Técnica */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <View
                    style={{
                      backgroundColor: THEME.slate100,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: THEME.slate700, fontSize: 11, fontWeight: '600' }}>
                      No. / Ref: {c.referencia}
                    </Text>
                  </View>
                  {c.procesoCompra ? (
                    <View
                      style={{
                        backgroundColor: THEME.slate100,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: THEME.slate700, fontSize: 11 }}>
                        Proceso: {c.procesoCompra}
                      </Text>
                    </View>
                  ) : null}
                  <View
                    style={{
                      backgroundColor: THEME.slate100,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: THEME.slate700, fontSize: 11 }}>
                      Tipo: {c.tipoContrato}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: THEME.slate100,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: THEME.slate700, fontSize: 11 }}>
                      Modalidad: {c.modalidad}
                    </Text>
                  </View>
                </View>

                {/* Objeto Contractual */}
                <View
                  style={{
                    backgroundColor: THEME.slate50,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 10,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: THEME.slate500, fontSize: 10, fontWeight: '700' }}>
                    OBJETO CONTRACTUAL:
                  </Text>
                  <Text
                    style={{
                      color: THEME.slate800,
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    {c.objeto}
                  </Text>
                </View>

                {/* Vigencia y Fechas */}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 12,
                    backgroundColor: '#F8FAFC',
                    padding: 10,
                    borderRadius: 8,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 100 }}>
                    <Text style={{ fontSize: 10, color: THEME.slate400, fontWeight: '600' }}>
                      Fecha Inicio
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.slate800, fontWeight: '600' }}>
                      {c.fechaInicio || 'N/D'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 100 }}>
                    <Text style={{ fontSize: 10, color: THEME.slate400, fontWeight: '600' }}>
                      Fecha Fin
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.slate800, fontWeight: '600' }}>
                      {c.fechaFin || 'N/D'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 100 }}>
                    <Text style={{ fontSize: 10, color: THEME.slate400, fontWeight: '600' }}>
                      Fecha Firma
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.slate800, fontWeight: '600' }}>
                      {c.fechaFirma || 'N/D'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 110 }}>
                    <Text style={{ fontSize: 10, color: THEME.slate400, fontWeight: '600' }}>
                      Plazo / Duración
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.slate800, fontWeight: '600' }}>
                      {c.plazoEjecucion || c.duracion || 'N/D'}
                    </Text>
                  </View>
                  {c.diasRestantes !== null && c.diasRestantes !== undefined && (
                    <View style={{ width: '100%', marginTop: 2 }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: c.diasRestantes > 0 ? THEME.amberText : THEME.roseText,
                        }}
                      >
                        {c.diasRestantes > 0
                          ? `⏱️ Vigente en tiempo real: Restan ${c.diasRestantes} días calendario para finalización.`
                          : `⏱️ Plazo contractual culminado (${Math.abs(c.diasRestantes)} días transcurridos desde fecha de fin).`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Ejecución Financiera */}
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 110 }}>
                      <Text style={{ fontSize: 10, color: THEME.slate400, fontWeight: '600' }}>
                        Valor Total Contratado
                      </Text>
                      <Text style={{ fontSize: 13, color: THEME.slate900, fontWeight: '800' }}>
                        ${c.valorTotal.toLocaleString('es-CO')}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 110 }}>
                      <Text style={{ fontSize: 10, color: THEME.slate400, fontWeight: '600' }}>
                        Valor Pagado
                      </Text>
                      <Text style={{ fontSize: 13, color: THEME.emeraldText, fontWeight: '700' }}>
                        ${c.valorPagado.toLocaleString('es-CO')}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 110 }}>
                      <Text style={{ fontSize: 10, color: THEME.slate400, fontWeight: '600' }}>
                        Saldo Pendiente
                      </Text>
                      <Text style={{ fontSize: 13, color: THEME.amberText, fontWeight: '700' }}>
                        ${c.valorPendiente.toLocaleString('es-CO')}
                      </Text>
                    </View>
                  </View>

                  {/* Barra de Progreso Financiero */}
                  {c.valorTotal > 0 && (
                    <View style={{ gap: 3 }}>
                      <View
                        style={{
                          height: 6,
                          backgroundColor: THEME.slate200,
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            width: `${c.porcentajeEjecucion || 0}%`,
                            backgroundColor: THEME.marca600,
                          }}
                        />
                      </View>
                      <Text style={{ fontSize: 10, color: THEME.slate500, textAlign: 'right' }}>
                        {c.porcentajeEjecucion || 0}% pagado institucionalmente
                      </Text>
                    </View>
                  )}
                </View>

                {/* Supervisión y Enlace a SECOP II */}
                <View
                  style={{
                    flexDirection: isTablet ? 'row' : 'column',
                    justifyContent: 'space-between',
                    alignItems: isTablet ? 'center' : 'flex-start',
                    borderTopWidth: 1,
                    borderTopColor: THEME.slate100,
                    paddingTop: 10,
                    gap: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate600 }}>
                      Supervisor: <Text style={{ fontWeight: '600', color: THEME.slate800 }}>{c.supervisor || 'No reportado'}</Text>
                      {c.ordenadorGasto ? ` • Ordenador: ${c.ordenadorGasto}` : ''}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => abrirUrlSecop(c.urlProceso, c.referencia)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: THEME.marca50,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: THEME.marca100,
                    }}
                  >
                    <Ionicons name="open-outline" size={14} color={THEME.marca700} />
                    <Text style={{ color: THEME.marca700, fontSize: 11, fontWeight: '700' }}>
                      Ver en Portal SECOP II
                    </Text>
                  </Pressable>
                </View>
              </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // ==========================================================================
  // ESTADO Y MÉTODOS DE VALIDACIÓN TÉCNICA DE INGRESOS (IA)
  // ==========================================================================
  const [ingresosCargando, setIngresosCargando] = useState(false);
  const [validacionesIngresos, setValidacionesIngresos] = useState<any[]>([]);

  const handleDescargarExcelFT318 = (idValidacion: string) => {
    try {
      const url = ingresosService.getExcelDownloadUrl(idValidacion);
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        Linking.openURL(url);
      }
    } catch (e: any) {
      console.warn('Error al abrir descarga de Excel FT-318:', e.message);
    }
  };

  const cargarValidacionesIngresos = async () => {
    try {
      setIngresosCargando(true);
      const data = await ingresosService.obtenerValidaciones();
      setValidacionesIngresos(data || []);
    } catch (e: any) {
      console.warn('Error al cargar validaciones técnicas:', e.message);
    } finally {
      setIngresosCargando(false);
    }
  };

  useEffect(() => {
    cargarValidacionesIngresos();
  }, []);

  // Lista de servidores de la planta para selección rápida
  const servidoresPlanta = useMemo(() => {
    return (mockPlazasData as any[]).filter(
      (p) => p.titular_nombre && !p.titular_nombre.includes('VACANTE')
    );
  }, []);

  // Filtrado de casos reactivo a la pestaña activa (Ingresos o Desvinculaciones)
  const casosFiltrados = useMemo(() => {
    let result = casos;
    if (tabActiva === 'desvinculaciones') {
      result = result.filter((c) => c.tipo_proceso === 'DESVINCULACION');
      if (filtroModalidadDesvinculacion !== 'TODAS') {
        result = result.filter((c) => c.modalidad === filtroModalidadDesvinculacion);
      }
      if (busquedaDesvinculaciones.trim()) {
        const q = busquedaDesvinculaciones.trim().toLowerCase();
        result = result.filter(
          (c) =>
            c.servidor_nombre.toLowerCase().includes(q) ||
            c.servidor_cedula.includes(q) ||
            c.cargo.toLowerCase().includes(q) ||
            c.dependencia.toLowerCase().includes(q) ||
            (c.causal && c.causal.toLowerCase().includes(q)) ||
            c.id.toLowerCase().includes(q)
        );
      }
    } else {
      // Pestaña de Ingresos (o por defecto)
      result = result.filter((c) => c.tipo_proceso === 'VINCULACION');
      if (filtroModalidadIngreso !== 'TODAS') {
        result = result.filter((c) => c.modalidad === filtroModalidadIngreso);
      }
      if (busquedaIngresos.trim()) {
        const q = busquedaIngresos.trim().toLowerCase();
        result = result.filter(
          (c) =>
            c.servidor_nombre.toLowerCase().includes(q) ||
            c.servidor_cedula.includes(q) ||
            c.cargo.toLowerCase().includes(q) ||
            c.dependencia.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q)
        );
      }
    }
    return result;
  }, [
    casos,
    tabActiva,
    filtroModalidadIngreso,
    busquedaIngresos,
    filtroModalidadDesvinculacion,
    busquedaDesvinculaciones,
  ]);

  // Caso actualmente seleccionado, adaptado al contexto de la pestaña activa y sincronizado con las normas maestras
  const casoActivo = useMemo(() => {
    let match: CasoFlujoFuncionario | undefined;
    if (tabActiva === 'desvinculaciones') {
      match =
        casos.find((c) => c.id === casoSeleccionadoId && c.tipo_proceso === 'DESVINCULACION') ||
        casos.find((c) => c.tipo_proceso === 'DESVINCULACION') ||
        casos[0];
    } else {
      match =
        casos.find((c) => c.id === casoSeleccionadoId && c.tipo_proceso === 'VINCULACION') ||
        casos.find((c) => c.tipo_proceso === 'VINCULACION') ||
        casos[0];
    }

    if (!match) return undefined;

    return {
      ...match,
      etapas: sincronizarEtapasCaso(match.etapas, match.tipo_proceso, match.modalidad),
    };
  }, [casos, casoSeleccionadoId, tabActiva]);

  // Alternar cumplimiento de requisito y recalcular estado
  // ==========================================================================
  // ESTADOS PARA EXPANSION DE FASES, DESPLEGABLES NORMATIVOS Y MODALES DE OBSERVACIONES
  // ==========================================================================
  const [fasesExpandidas, setFasesExpandidas] = useState<Record<string, boolean>>({
    v_carr_1: true,
    v_carr_4: true,
    v_lnr_1: true,
    v_lnr_2: true,
    v_prov_1: true,
    v_prov_3: true,
    v_prac_1: true,
    v_prac_3: true,
    d_carr_1: true,
    d_carr_3: true,
    d_prov_1: true,
    d_prov_3: true,
    d_lnr_1: true,
    d_lnr_3: true,
    d_prac_1: true,
    d_prac_3: true,
    d_serv_1: true,
    d_serv_3: true,
  });
  const [fasesNormaExpandida, setFasesNormaExpandida] = useState<Record<string, boolean>>({});
  const [reqDetalleExpandido, setReqDetalleExpandido] = useState<Record<string, boolean>>({});
  const [secopResumenExpandido, setSecopResumenExpandido] = useState<Record<string, boolean>>({});

  const toggleSecopResumen = (reqId: string) => {
    setSecopResumenExpandido((prev) => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  // Modal para Cierre / Observaciones de Requisito
  const [modalObsReqVisible, setModalObsReqVisible] = useState(false);
  // Estados para Cronograma de Términos Legales, Nómina y Exportación
  const [modalTerminosVisible, setModalTerminosVisible] = useState(false);
  const [modalSyncNominaVisible, setModalSyncNominaVisible] = useState(false);
  const [modalReporteAuditoriaVisible, setModalReporteAuditoriaVisible] = useState(false);
  const [reporteAuditoriaContenido, setReporteAuditoriaContenido] = useState<string>('');
  const [modalFormatosVisible, setModalFormatosVisible] = useState(false);
  const [filtroProcesoFormatos, setFiltroProcesoFormatos] = useState<'TODOS' | 'VINCULACION' | 'DESVINCULACION' | 'GUIA_NORMATIVA'>('TODOS');
  const [busquedaFormatos, setBusquedaFormatos] = useState('');

  const handleDescargarFormatoOficial = (nombreArchivo: string) => {
    try {
      const url = `${API_URL}/api/rrhh/formatos/descargar/${encodeURIComponent(nombreArchivo)}`;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        Linking.openURL(url);
      }
    } catch (e: any) {
      console.warn('Error al descargar formato:', e.message);
    }
  };

  const handleAbrirEvaluacionRetiroGoogleForms = () => {
    try {
      if (Platform.OS === 'web') {
        window.open(GOOGLE_FORMS_EVALUACION_RETIRO, '_blank');
      } else {
        Linking.openURL(GOOGLE_FORMS_EVALUACION_RETIRO);
      }
    } catch (e: any) {
      console.warn('Error al abrir Google Forms:', e.message);
    }
  };
  
  // Estados para gestión y carga de documentos de soporte
  const [modalExpedienteVisible, setModalExpedienteVisible] = useState(false);
  const [modalMensajeDoc, setModalMensajeDoc] = useState<{
    visible: boolean;
    titulo: string;
    mensaje: string;
    tipo?: 'exito' | 'error' | 'info';
  } | null>(null);
  const [modalEliminarDoc, setModalEliminarDoc] = useState<{
    visible: boolean;
    casoId: string;
    etapaId?: string;
    requisitoId?: string;
    docId: string;
    nombreDoc: string;
  } | null>(null);
  const [modalReqContext, setModalReqContext] = useState<{
    casoId: string;
    etapaId: string;
    etapaTitulo: string;
    etapaNumero: number;
    req: RequisitoEtapa;
  } | null>(null);
  const [obsReqTexto, setObsReqTexto] = useState('');
  const [obsReqRadicado, setObsReqRadicado] = useState('');
  const [obsReqFecha, setObsReqFecha] = useState('');
  const [obsReqMarcarCumplido, setObsReqMarcarCumplido] = useState(true);

  // Modal para Observaciones a Nivel de Fase
  const [modalObsFaseVisible, setModalObsFaseVisible] = useState(false);
  const [modalFaseContext, setModalFaseContext] = useState<{
    casoId: string;
    etapa: EtapaFlujo;
  } | null>(null);
  const [obsFaseTexto, setObsFaseTexto] = useState('');

  // Controladores de visibilidad / acordeones
  const toggleFaseExpandida = (etapaId: string) => {
    setFasesExpandidas((prev) => ({ ...prev, [etapaId]: !prev[etapaId] }));
  };

  const toggleNormaFase = (etapaId: string) => {
    setFasesNormaExpandida((prev) => ({ ...prev, [etapaId]: !prev[etapaId] }));
  };

  const toggleDetalleReq = (reqId: string) => {
    setReqDetalleExpandido((prev) => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  const expandirTodasLasFases = (expandir: boolean) => {
    if (!casoActivo) return;
    const nuevoMap: Record<string, boolean> = {};
    casoActivo.etapas.forEach((et) => {
      nuevoMap[et.id] = expandir;
    });
    setFasesExpandidas(nuevoMap);
  };

  // Abrir modal de observaciones al cerrar o inspeccionar un requisito
  const abrirModalObservacionReq = (
    casoId: string,
    etapa: EtapaFlujo,
    req: RequisitoEtapa,
    intentaCerrar: boolean = false
  ) => {
    setModalReqContext({
      casoId,
      etapaId: etapa.id,
      etapaTitulo: etapa.titulo,
      etapaNumero: etapa.numero,
      req,
    });
    setObsReqTexto(req.observaciones || '');
    setObsReqRadicado(req.radicadoSoporte || '');
    setObsReqFecha(
      req.fecha_cumplimiento || new Date().toISOString().split('T')[0]
    );
    setObsReqMarcarCumplido(intentaCerrar ? true : req.cumplido);
    setModalObsReqVisible(true);
  };

  // Guardar datos desde el modal de requisito
  const guardarObservacionRequisito = (forzarEstado?: boolean) => {
    if (!modalReqContext) return;
    const { casoId, etapaId, req } = modalReqContext;
    const nuevoCumplido =
      forzarEstado !== undefined ? forzarEstado : obsReqMarcarCumplido;

    setCasos((prevCasos) =>
      prevCasos.map((caso) => {
        if (caso.id !== casoId) return caso;

        const nuevasEtapas = caso.etapas.map((etapa) => {
          if (etapa.id !== etapaId) return etapa;

          const nuevosRequisitos = etapa.requisitos.map((r) => {
            if (r.id !== req.id) return r;
            return {
              ...r,
              cumplido: nuevoCumplido,
              fecha_cumplimiento: nuevoCumplido
                ? obsReqFecha.trim() || new Date().toISOString().split('T')[0]
                : undefined,
              observaciones: obsReqTexto.trim() || undefined,
              radicadoSoporte: obsReqRadicado.trim() || undefined,
              usuarioRegistro: 'Profesional TH (SJD)',
            };
          });

          const todosCumplidos = nuevosRequisitos
            .filter((r) => r.obligatorio)
            .every((r) => r.cumplido);
          const algunCumplido = nuevosRequisitos.some((r) => r.cumplido);

          let nuevoEstado: EstadoEtapa = 'pending';
          if (todosCumplidos) {
            nuevoEstado = 'completed';
          } else if (algunCumplido) {
            nuevoEstado = 'in_progress';
          }

          return {
            ...etapa,
            requisitos: nuevosRequisitos,
            estado: nuevoEstado,
          };
        });

        return {
          ...caso,
          etapas: nuevasEtapas,
        };
      })
    );

    setModalObsReqVisible(false);
    setModalReqContext(null);
  };

  // Abrir y guardar observaciones de fase completa
  const abrirModalObservacionFase = (casoId: string, etapa: EtapaFlujo) => {
    setModalFaseContext({ casoId, etapa });
    setObsFaseTexto(etapa.observacionesFase || '');
    setModalObsFaseVisible(true);
  };

  const guardarObservacionFase = () => {
    if (!modalFaseContext) return;
    const { casoId, etapa } = modalFaseContext;

    setCasos((prevCasos) =>
      prevCasos.map((caso) => {
        if (caso.id !== casoId) return caso;

        const nuevasEtapas = caso.etapas.map((et) => {
          if (et.id !== etapa.id) return et;
          return {
            ...et,
            observacionesFase: obsFaseTexto.trim() || undefined,
          };
        });

        return {
          ...caso,
          etapas: nuevasEtapas,
        };
      })
    );

    setModalObsFaseVisible(false);
    setModalFaseContext(null);
  };

  // Alternar cumplimiento de requisito con interceptor de modal si se va a cerrar
  const toggleRequisito = (casoId: string, etapaId: string, requisitoId: string) => {
    const caso = casos.find((c) => c.id === casoId);
    if (!caso) return;
    const etapa = caso.etapas.find((e) => e.id === etapaId);
    if (!etapa) return;
    const req = etapa.requisitos.find((r) => r.id === requisitoId);
    if (!req) return;

    // Al hacer click, si está pendiente o si el usuario quiere gestionar el cierre, abrimos el modal para capturar observaciones
    abrirModalObservacionReq(casoId, etapa, req, !req.cumplido);
  };

  const toggleRequisitoDirecto = (casoId: string, etapaId: string, requisitoId: string) => {
    setCasos((prevCasos) =>
      prevCasos.map((caso) => {
        if (caso.id !== casoId) return caso;

        const nuevasEtapas = caso.etapas.map((etapa) => {
          if (etapa.id !== etapaId) return etapa;

          const nuevosRequisitos = etapa.requisitos.map((req) => {
            if (req.id !== requisitoId) return req;
            return {
              ...req,
              cumplido: !req.cumplido,
              fecha_cumplimiento: !req.cumplido
                ? new Date().toISOString().split('T')[0]
                : undefined,
            };
          });

          const todosCumplidos = nuevosRequisitos
            .filter((r) => r.obligatorio)
            .every((r) => r.cumplido);
          const algunCumplido = nuevosRequisitos.some((r) => r.cumplido);

          let nuevoEstado: EstadoEtapa = 'pending';
          if (todosCumplidos) {
            nuevoEstado = 'completed';
          } else if (algunCumplido) {
            nuevoEstado = 'in_progress';
          }

          return {
            ...etapa,
            requisitos: nuevosRequisitos,
            estado: nuevoEstado,
          };
        });

        return {
          ...caso,
          etapas: nuevasEtapas,
        };
      })
    );
  };

  const handleCrearTramite = () => {
    if (!nombreInput.trim() || !cedulaInput.trim() || !cargoInput.trim()) {
      mostrarModal(
        'Faltan Datos',
        'Ingrese el nombre, cédula y cargo del funcionario o postulante.',
        'warning'
      );
      return;
    }

    // Calcular el consecutivo máximo existente para evitar IDs duplicados
    const numMax = casos.reduce((max, c) => {
      const match = c.id.match(/TR-\d+-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, casos.length);
    const nuevoId = `TR-${new Date().getFullYear()}-${String(numMax + 1).padStart(3, '0')}`;

    // Generar etapas totalmente en blanco para el nuevo trámite (ningún requisito pre-marcado)
    const etapasBase = generarEtapasParaCaso(nuevoTipoProceso, nuevaModalidad);
    const etapasLimpias = limpiarEtapasParaNuevoTramite(etapasBase);

    const nuevoCaso: CasoFlujoFuncionario = {
      id: nuevoId,
      tipo_proceso: nuevoTipoProceso,
      modalidad: nuevaModalidad,
      id_plaza: plazaSeleccionadaId || undefined,
      servidor_nombre: nombreInput.trim(),
      servidor_cedula: cedulaInput.trim(),
      cargo: cargoInput.trim(),
      dependencia: dependenciaInput.trim() || 'SECRETARÍA JURÍDICA DISTRITAL',
      causal: nuevoTipoProceso === 'DESVINCULACION' ? causalInput : undefined,
      fecha_inicio_tramite: new Date().toISOString().split('T')[0],
      etapas: etapasLimpias,
      etapa_activa_id: etapasLimpias[0]?.id,
      observaciones: 'Trámite registrado e iniciado. Todos los requisitos están pendientes de verificación.',
    };

    const nuevosCasos = [nuevoCaso, ...casos];
    setCasos(nuevosCasos);
    setCasoSeleccionadoId(nuevoId);

    // Guardado inmediato en localStorage para blindar contra F5 o recargas instantáneas
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('rrhh_vinculaciones_casos_v2', JSON.stringify(nuevosCasos));
        window.localStorage.setItem('rrhh_vinculaciones_caso_activo_v2', nuevoId);
      } catch (e) {
        console.warn('Error al guardar de inmediato en localStorage:', e);
      }
    }

    if (nuevoTipoProceso === 'VINCULACION') {
      setTabActiva('ingresos');
    } else {
      setTabActiva('desvinculaciones');
    }
    setModalRegistroVisible(false);
    resetFormularioRegistro();

    mostrarModal(
      'Trámite Creado',
      `Se ha registrado el trámite ${nuevoId} para ${nuevoCaso.servidor_nombre} con el procedimiento normativo respectivo.`,
      'success'
    );
  };

  // Métricas para los KPIs
  const totalVinculaciones = casos.filter((c) => c.tipo_proceso === 'VINCULACION').length;
  const totalDesvinculaciones = casos.filter((c) => c.tipo_proceso === 'DESVINCULACION').length;
  const alertasSecop = secopResultado?.totalActivos ?? 1;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.slate50 }}>
      {/* Ocultar el Header nativo del Stack para evitar el doble header */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* ============================================================== */}
        {/* CABECERA INSTITUCIONAL ÚNICA (AZUL MARCA-900, IDÉNTICA A NÓMINA)*/}
        {/* ============================================================== */}
        <View
          style={{
            backgroundColor: THEME.marca900,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            paddingHorizontal: isDesktop ? 32 : 16,
            paddingVertical: 14,
            width: '100%',
          }}
        >
          <View
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Lado izquierdo: Regresar + Título con subtítulo */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {!enMenu && (
                <>
              <Pressable
                onPress={() => router.replace('/rrhh')}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: pressed
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(255, 255, 255, 0.08)',
                })}
              >
                <Ionicons name="arrow-back" size={16} color={THEME.marca100} />
                <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '500' }}>
                  Volver al Portal
                </Text>
              </Pressable>
                </>
              )}

              <View
                style={{ width: 1, height: 26, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
              />

              <View>
                <Text
                  style={{
                    color: 'rgba(214, 228, 244, 0.65)',
                    fontSize: 10,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 1.2,
                  }}
                >
                  Secretaría Jurídica Distrital • Talento Humano
                </Text>
                <Text
                  style={{
                    color: THEME.white,
                    fontSize: 18,
                    fontWeight: '600',
                    letterSpacing: 0.2,
                    marginTop: 1,
                  }}
                >
                  Vinculaciones y Desvinculaciones
                </Text>
              </View>
            </View>

            {/* Lado derecho: Acciones rápidas (SECOP II y Nuevo Trámite) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={() => setTabActiva('secop')}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: pressed
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(255, 255, 255, 0.05)',
                })}
              >
                <Ionicons name="search-outline" size={15} color={THEME.marca100} />
                <Text style={{ color: THEME.marca100, fontSize: 12, fontWeight: '500' }}>
                  Consultar SECOP II
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setNuevoTipoProceso(tabActiva === 'desvinculaciones' ? 'DESVINCULACION' : 'VINCULACION');
                  setModalRegistroVisible(true);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 8,
                  backgroundColor: tabActiva === 'desvinculaciones' ? THEME.rose600 : THEME.marca600,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Ionicons name="add-circle-outline" size={15} color={THEME.white} />
                <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '600' }}>
                  {tabActiva === 'desvinculaciones' ? 'Nueva Desvinculación' : 'Nuevo Ingreso'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ============================================================== */}
        {/* CUERPO PRINCIPAL (USA EL 100% DEL ANCHO, IDÉNTICO A NÓMINA)    */}
        {/* ============================================================== */}
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{
            paddingHorizontal: isDesktop ? 32 : 16,
            paddingVertical: 24,
            width: '100%',
          }}
        >
          {/* TÍTULO Y SUBTÍTULO DE PÁGINA + TOGGLE KPIS */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <View>
              <Text style={{ fontSize: 22, fontWeight: '600', color: THEME.slate900 }}>
                Control de Vinculaciones y Desvinculaciones de Personal
              </Text>
              <Text style={{ fontSize: 13, color: THEME.slate500, marginTop: 4 }}>
                Seguimiento de procedimientos normativos PR-145 (Mérito), PR-137 (LNR), verificación
                en tiempo real de SECOP II (Art. 128 C.P.) y circuito de paz y salvo PR-074.
              </Text>
            </View>

            {/* Botón para ocultar / mostrar KPIs */}
            <Pressable
              onPress={() => setMostrarKpis(!mostrarKpis)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: mostrarKpis ? THEME.slate200 : THEME.marca600,
                backgroundColor: mostrarKpis
                  ? pressed
                    ? THEME.slate100
                    : THEME.white
                  : THEME.marca50,
              })}
            >
              <Ionicons
                name={mostrarKpis ? 'eye-off-outline' : 'stats-chart-outline'}
                size={15}
                color={mostrarKpis ? THEME.slate600 : THEME.marca700}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: mostrarKpis ? THEME.slate700 : THEME.marca700,
                }}
              >
                {mostrarKpis ? 'Ocultar Indicadores KPI' : 'Mostrar Indicadores KPI'}
              </Text>
            </Pressable>
          </View>

          {/* ============================================================== */}
          {/* TARJETAS KPI (CONDICIONADO A mostrarKpis, IDÉNTICO A NÓMINA)   */}
          {/* ============================================================== */}
          {mostrarKpis && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 14,
                marginBottom: 24,
                width: '100%',
              }}
            >
              {/* KPI 1: Total Trámites */}
              <View
                style={{
                  flex: 1,
                  minWidth: isTablet ? 190 : '100%',
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: THEME.slate500,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Total Trámites Activos
                </Text>
                <Text
                  style={{ fontSize: 26, fontWeight: '600', color: THEME.slate900, marginTop: 4 }}
                >
                  {casos.length}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                  En curso vigencia 2026
                </Text>
              </View>

              {/* KPI 2: Vinculaciones */}
              <View
                style={{
                  flex: 1,
                  minWidth: isTablet ? 190 : '100%',
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: THEME.slate500,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Vinculaciones en Trámite
                </Text>
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '600',
                    color: THEME.emeraldText,
                    marginTop: 4,
                  }}
                >
                  {totalVinculaciones}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                  PR-145 Mérito & PR-137 LNR
                </Text>
              </View>

              {/* KPI 3: Desvinculaciones */}
              <View
                style={{
                  flex: 1,
                  minWidth: isTablet ? 190 : '100%',
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: THEME.slate500,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Desvinculaciones / Retiros
                </Text>
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '600',
                    color: THEME.roseText,
                    marginTop: 4,
                  }}
                >
                  {totalDesvinculaciones}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                  PR-074 Circuito de Paz y Salvo
                </Text>
              </View>

              {/* KPI 4: Alertas SECOP II */}
              <View
                style={{
                  flex: 1,
                  minWidth: isTablet ? 190 : '100%',
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: THEME.slate500,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Contratos Activos SECOP II
                </Text>
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '600',
                    color: THEME.amberText,
                    marginTop: 4,
                  }}
                >
                  {alertasSecop}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                  Verificación Art. 128 C.P.
                </Text>
              </View>

              {/* KPI 5: Validaciones Técnicas IA */}
              <View
                style={{
                  flex: 1,
                  minWidth: isTablet ? 220 : '100%',
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: THEME.slate500,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Expedientes Técnicos IA
                </Text>
                <Text
                  style={{ fontSize: 26, fontWeight: '600', color: THEME.marca700, marginTop: 4 }}
                >
                  {validacionesIngresos.length}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                  Certificados Formato FT-318
                </Text>
              </View>
            </View>
          )}

          {/* ============================================================== */}
          {/* PESTAÑAS (NAVEGACIÓN ESTILO NÓMINA - DIVISIÓN INGRESOS / DESVINCULACIONES) */}
          {/* ============================================================== */}
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              borderBottomWidth: 1,
              borderBottomColor: THEME.slate200,
              marginBottom: 20,
              overflow: 'hidden',
              width: '100%',
            }}
          >
            {/* Pestaña 1: Ingresos y Vinculaciones */}
            <Pressable
              onPress={() => setTabActiva('ingresos')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'ingresos' ? THEME.emerald600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Ionicons
                name="person-add-outline"
                size={15}
                color={tabActiva === 'ingresos' ? THEME.emerald700 : THEME.slate500}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: tabActiva === 'ingresos' ? '700' : '500',
                  color: tabActiva === 'ingresos' ? THEME.emerald800 : THEME.slate600,
                }}
              >
                Ingresos / Vinculaciones
              </Text>
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: tabActiva === 'ingresos' ? THEME.emerald100 : THEME.slate100,
                  borderRadius: 9999,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: tabActiva === 'ingresos' ? THEME.emerald800 : THEME.slate600,
                  }}
                >
                  {totalVinculaciones}
                </Text>
              </View>
            </Pressable>

            {/* Pestaña 2: Desvinculaciones y Retiros */}
            <Pressable
              onPress={() => setTabActiva('desvinculaciones')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'desvinculaciones' ? THEME.rose600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Ionicons
                name="exit-outline"
                size={15}
                color={tabActiva === 'desvinculaciones' ? THEME.rose700 : THEME.slate500}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: tabActiva === 'desvinculaciones' ? '700' : '500',
                  color: tabActiva === 'desvinculaciones' ? THEME.rose800 : THEME.slate600,
                }}
              >
                Desvinculaciones / Retiros
              </Text>
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: tabActiva === 'desvinculaciones' ? THEME.rose100 : THEME.slate100,
                  borderRadius: 9999,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: tabActiva === 'desvinculaciones' ? THEME.rose800 : THEME.slate600,
                  }}
                >
                  {totalDesvinculaciones}
                </Text>
              </View>
            </Pressable>

            {/* Pestaña 3: Consulta SECOP II */}
            <Pressable
              onPress={() => setTabActiva('secop')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'secop' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Ionicons
                name="search-outline"
                size={15}
                color={tabActiva === 'secop' ? THEME.marca700 : THEME.slate500}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'secop' ? THEME.marca700 : THEME.slate500,
                }}
              >
                Consulta SECOP II
              </Text>
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: THEME.skyBg,
                  borderRadius: 9999,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderColor: THEME.skyRing,
                  borderWidth: 1,
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.skyText }}>
                  API SJD
                </Text>
              </View>
            </Pressable>

            {/* Pestaña 4: Validación Técnica IA */}
            <Pressable
              onPress={() => setTabActiva('validacion_ia')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'validacion_ia' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Ionicons
                name="sparkles-outline"
                size={15}
                color={tabActiva === 'validacion_ia' ? THEME.marca700 : THEME.slate500}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'validacion_ia' ? THEME.marca700 : THEME.slate500,
                }}
              >
                Validación Técnica IA
              </Text>
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: THEME.emeraldBg,
                  borderRadius: 9999,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderColor: THEME.emeraldRing,
                  borderWidth: 1,
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.emeraldText }}>
                  FT-318
                </Text>
              </View>
            </Pressable>

            {/* Pestaña 5: Paz y Salvo */}
            <Pressable
              onPress={() => setTabActiva('paz_salvo')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'paz_salvo' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={15}
                color={tabActiva === 'paz_salvo' ? THEME.marca700 : THEME.slate500}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'paz_salvo' ? THEME.marca700 : THEME.slate500,
                }}
              >
                Circuito de Paz y Salvo
              </Text>
            </Pressable>

            {/* Pestaña 6: Matriz Normativa */}
            <Pressable
              onPress={() => setTabActiva('matriz_normativa')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'matriz_normativa' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Ionicons
                name="book-outline"
                size={15}
                color={tabActiva === 'matriz_normativa' ? THEME.marca700 : THEME.slate500}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'matriz_normativa' ? THEME.marca700 : THEME.slate500,
                }}
              >
                Marco Normativo SJD
              </Text>
            </Pressable>
          </View>

          {/* ============================================================== */}
          {/* PESTAÑA 1: CENSO Y PIPELINE DE TRÁMITES                        */}
          {/* ============================================================== */}
          {(tabActiva === 'ingresos' || tabActiva === 'desvinculaciones') && (
            <View style={{ gap: 18, width: '100%' }}>
              {/* Barra de Filtros y Búsqueda Estilo Nómina */}
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 14,
                  flexDirection: isDesktop ? 'row' : 'column',
                  gap: 12,
                  alignItems: isDesktop ? 'center' : 'stretch',
                }}
              >
                {/* Buscador Contextual según pestaña activa */}
                <View
                  style={{
                    flex: 1,
                    minWidth: 220,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: THEME.slate50,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    paddingHorizontal: 12,
                  }}
                >
                  <Ionicons name="search" size={17} color={THEME.slate400} />
                  <TextInput
                    value={tabActiva === 'ingresos' ? busquedaIngresos : busquedaDesvinculaciones}
                    onChangeText={tabActiva === 'ingresos' ? setBusquedaIngresos : setBusquedaDesvinculaciones}
                    placeholder={
                      tabActiva === 'ingresos'
                        ? 'Buscar ingreso por aspirante, cédula, cargo o código...'
                        : 'Buscar desvinculación por funcionario, cédula, causal o código...'
                    }
                    placeholderTextColor={THEME.slate400}
                    style={{
                      flex: 1,
                      color: THEME.slate900,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      fontSize: 13,
                    }}
                  />
                  {(tabActiva === 'ingresos' ? busquedaIngresos : busquedaDesvinculaciones) ? (
                    <Pressable
                      onPress={() =>
                        tabActiva === 'ingresos'
                          ? setBusquedaIngresos('')
                          : setBusquedaDesvinculaciones('')
                      }
                    >
                      <Ionicons name="close-circle" size={16} color={THEME.slate400} />
                    </Pressable>
                  ) : null}
                </View>

                {/* Filtro Modalidad y Diferenciación de Regímenes */}
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.slate700 }}>
                    Régimen:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {(tabActiva === 'ingresos'
                        ? ([
                            { key: 'TODAS', label: 'Todos los Ingresos', icon: 'layers-outline' },
                            { key: 'CARRERA_ADMINISTRATIVA', label: 'Carrera (CNSC)', icon: 'ribbon-outline' },
                            { key: 'LIBRE_NOMBRAMIENTO', label: 'Libre Nombramiento', icon: 'shield-outline' },
                            { key: 'PROVISIONALIDAD', label: 'Provisionalidad', icon: 'hourglass-outline' },
                            { key: 'PRACTICANTE_JUDICANTE', label: 'Pasante / Judicante', icon: 'school-outline' },
                          ] as const)
                        : ([
                            { key: 'TODAS', label: 'Todos los Retiros', icon: 'layers-outline' },
                            { key: 'CARRERA_ADMINISTRATIVA', label: 'Carrera', icon: 'ribbon-outline' },
                            { key: 'LIBRE_NOMBRAMIENTO', label: 'Libre Nombramiento', icon: 'shield-outline' },
                            { key: 'PROVISIONALIDAD', label: 'Provisionalidad', icon: 'hourglass-outline' },
                          ] as const)
                      ).map((item) => {
                        const sel =
                          tabActiva === 'ingresos'
                            ? filtroModalidadIngreso === item.key
                            : filtroModalidadDesvinculacion === item.key;

                        const count = casos.filter((c) => {
                          const coincideTipo =
                            tabActiva === 'ingresos'
                              ? c.tipo_proceso === 'VINCULACION'
                              : c.tipo_proceso === 'DESVINCULACION';
                          if (!coincideTipo) return false;
                          if (item.key === 'TODAS') return true;
                          return c.modalidad === item.key;
                        }).length;

                        return (
                          <Pressable
                            key={item.key}
                            onPress={() => {
                              if (tabActiva === 'ingresos') {
                                setFiltroModalidadIngreso(item.key as any);
                              } else {
                                setFiltroModalidadDesvinculacion(item.key as any);
                              }
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 6,
                              backgroundColor: sel
                                ? tabActiva === 'ingresos'
                                  ? THEME.emerald800
                                  : THEME.rose800
                                : THEME.white,
                              borderWidth: 1,
                              borderColor: sel
                                ? tabActiva === 'ingresos'
                                  ? THEME.emerald800
                                  : THEME.rose800
                                : THEME.slate200,
                            }}
                          >
                            <Ionicons
                              name={item.icon as any}
                              size={13}
                              color={sel ? THEME.white : THEME.slate600}
                            />
                            <Text
                              style={{
                                fontSize: 11.5,
                                fontWeight: sel ? '700' : '600',
                                color: sel ? THEME.white : THEME.slate700,
                              }}
                            >
                              {item.label}
                            </Text>
                            <View
                              style={{
                                paddingHorizontal: 5,
                                paddingVertical: 1,
                                borderRadius: 999,
                                backgroundColor: sel ? 'rgba(255,255,255,0.25)' : THEME.slate100,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '800',
                                  color: sel ? THEME.white : THEME.slate600,
                                }}
                              >
                                {count}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}

                      {/* Botón para abrir Guía Comparativa de Regímenes */}
                      {tabActiva === 'ingresos' && (
                        <Pressable
                          onPress={() => setModalGuiaModalidadesVisible(true)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: THEME.marca50,
                            borderWidth: 1,
                            borderColor: THEME.marca600,
                          }}
                        >
                          <Ionicons name="book-outline" size={13} color={THEME.marca700} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca700 }}>
                            📘 Guía de Fases & Regímenes
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </ScrollView>
                </View>

                {/* Botón rápido para agregar trámite según pestaña */}
                <Pressable
                  onPress={() => {
                    setNuevoTipoProceso(
                      tabActiva === 'desvinculaciones' ? 'DESVINCULACION' : 'VINCULACION'
                    );
                    setModalRegistroVisible(true);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 6,
                    backgroundColor:
                      tabActiva === 'desvinculaciones' ? THEME.rose600 : THEME.emerald600,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Ionicons name="add" size={15} color={THEME.white} />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.white }}>
                    {tabActiva === 'desvinculaciones' ? 'Registrar Retiro' : 'Nuevo Ingreso'}
                  </Text>
                </Pressable>
              </View>

              {/* Layout de Contenido Principal: Dos Columnas */}
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 18 }}>
                {/* Columna Izquierda: Tarjetas de Trámites */}
                <View style={{ width: isDesktop ? 360 : '100%', gap: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate800 }}>
                    {tabActiva === 'ingresos'
                      ? `Trámites de Ingreso (${casosFiltrados.length})`
                      : `Trámites de Desvinculación (${casosFiltrados.length})`}
                  </Text>

                  {casosFiltrados.map((c) => {
                    const esActivo = c.id === casoActivo?.id;
                    const esVinculacion = c.tipo_proceso === 'VINCULACION';
                    const etapasCompletadas = c.etapas.filter((e) => e.estado === 'completed').length;
                    const totalEtapas = c.etapas.length;
                    const porcentaje = Math.round((etapasCompletadas / totalEtapas) * 100);

                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setCasoSeleccionadoId(c.id)}
                        style={({ pressed }) => ({
                          backgroundColor: esActivo
                            ? THEME.marca50
                            : pressed
                            ? THEME.slate50
                            : THEME.white,
                          borderRadius: 12,
                          padding: 14,
                          borderWidth: 1.5,
                          borderColor: esActivo ? THEME.marca600 : THEME.slate200,
                          gap: 8,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: esActivo ? 0.06 : 0.02,
                          shadowRadius: 2,
                        })}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <View
                              style={{
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 9999,
                                backgroundColor: esVinculacion ? THEME.emeraldBg : THEME.roseBg,
                                borderWidth: 1,
                                borderColor: esVinculacion ? THEME.emeraldRing : THEME.roseRing,
                              }}
                            >
                              <Text
                                style={{
                                  color: esVinculacion ? THEME.emeraldText : THEME.roseText,
                                  fontSize: 9.5,
                                  fontWeight: '700',
                                }}
                              >
                                {esVinculacion ? 'VINCULACIÓN' : 'DESVINCULACIÓN'}
                              </Text>
                            </View>

                            {/* Badge Específico de Modalidad */}
                            {(() => {
                              const infoM = obtenerInfoModalidad(c.modalidad);
                              return (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 3,
                                    paddingHorizontal: 6,
                                    paddingVertical: 1.5,
                                    borderRadius: 4,
                                    backgroundColor: infoM.colorBg,
                                    borderWidth: 1,
                                    borderColor: infoM.colorBorde,
                                  }}
                                >
                                  <Ionicons name={infoM.icono} size={10} color={infoM.colorTexto} />
                                  <Text
                                    style={{
                                      color: infoM.colorTexto,
                                      fontSize: 9.5,
                                      fontWeight: '800',
                                    }}
                                  >
                                    {infoM.badgeTexto}
                                  </Text>
                                </View>
                              );
                            })()}
                          </View>

                          <View style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                            <Text
                              style={{
                                color: THEME.slate400,
                                fontSize: 10,
                                fontWeight: '700',
                                letterSpacing: 0.2,
                              }}
                            >
                              {c.id}
                            </Text>
                            <View
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: 9999,
                                backgroundColor: THEME.emeraldBg,
                                borderWidth: 1,
                                borderColor: THEME.emeraldRing,
                              }}
                            >
                              <Text
                                style={{
                                  color: THEME.emeraldText,
                                  fontSize: 10.5,
                                  fontWeight: '700',
                                }}
                              >
                                {porcentaje}%
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View>
                          <Text
                            style={{
                              color: esActivo ? THEME.marca900 : THEME.slate900,
                              fontSize: 13.5,
                              fontWeight: '700',
                            }}
                          >
                            {c.servidor_nombre}
                          </Text>
                          <Text style={{ color: THEME.slate600, fontSize: 11.5, marginTop: 1 }}>
                            C.C. {c.servidor_cedula} • {c.cargo}
                          </Text>
                          <Text style={{ color: THEME.slate400, fontSize: 10.5, marginTop: 2 }}>
                            {c.dependencia}
                          </Text>
                        </View>

                        {/* Accesos directos integrados */}
                        {esVinculacion && (
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                abrirConsultaSecopParaCandidato(
                                  c.servidor_nombre,
                                  c.servidor_cedula,
                                  c.id
                                );
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                backgroundColor: THEME.skyBg,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: THEME.skyRing,
                              }}
                            >
                              <Ionicons name="search" size={11} color={THEME.skyText} />
                              <Text
                                style={{ color: THEME.skyText, fontSize: 10.5, fontWeight: '600' }}
                              >
                                SECOP II
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                router.push('/ingresos/nueva');
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                backgroundColor: THEME.emeraldBg,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: THEME.emeraldRing,
                              }}
                            >
                              <Ionicons name="sparkles" size={11} color={THEME.emeraldText} />
                              <Text
                                style={{
                                  color: THEME.emeraldText,
                                  fontSize: 10.5,
                                  fontWeight: '600',
                                }}
                              >
                                Cotejo IA
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Columna Derecha: Pipeline y Detalle del Trámite */}
                <View style={{ flex: 1, minWidth: 0, gap: 14 }}>
                  {casoActivo ? (
                    <View
                      style={{
                        backgroundColor: THEME.white,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        padding: 20,
                        gap: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.03,
                        shadowRadius: 2,
                      }}
                    >
                      {/* Cabecera Principal del Caso: Identidad y Acciones Rápidas */}
                      <View
                        style={{
                          flexDirection: isTablet ? 'row' : 'column',
                          justifyContent: 'space-between',
                          alignItems: isTablet ? 'center' : 'flex-start',
                          gap: 12,
                          paddingBottom: 14,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.slate200,
                        }}
                      >
                        <View style={{ flex: isTablet ? 1 : undefined, minWidth: 0, alignSelf: 'stretch', gap: 5 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            <Text
                              style={{
                                color: THEME.slate900,
                                fontSize: 17,
                                fontWeight: '800',
                                letterSpacing: -0.2,
                              }}
                            >
                              {casoActivo.servidor_nombre}
                            </Text>

                            <View
                              style={{
                                paddingHorizontal: 9,
                                paddingVertical: 2.5,
                                borderRadius: 9999,
                                backgroundColor:
                                  casoActivo.tipo_proceso === 'VINCULACION'
                                    ? THEME.emeraldBg
                                    : THEME.roseBg,
                                borderWidth: 1,
                                borderColor:
                                  casoActivo.tipo_proceso === 'VINCULACION'
                                    ? THEME.emeraldRing
                                    : THEME.roseRing,
                              }}
                            >
                              <Text
                                style={{
                                  color:
                                    casoActivo.tipo_proceso === 'VINCULACION'
                                      ? THEME.emeraldText
                                      : THEME.roseText,
                                  fontSize: 10.5,
                                  fontWeight: '800',
                                  letterSpacing: 0.4,
                                }}
                              >
                                {casoActivo.tipo_proceso}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="card-outline" size={13} color={THEME.slate400} />
                              <Text style={{ color: THEME.slate600, fontSize: 12, fontWeight: '600' }}>
                                Cédula: {casoActivo.servidor_cedula}
                              </Text>
                            </View>
                            <Text style={{ color: THEME.slate300, fontSize: 12 }}>•</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="briefcase-outline" size={13} color={THEME.slate400} />
                              <Text style={{ color: THEME.slate600, fontSize: 12, fontWeight: '500' }}>
                                {casoActivo.cargo}
                              </Text>
                            </View>
                            <Text style={{ color: THEME.slate300, fontSize: 12 }}>•</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="business-outline" size={13} color={THEME.slate400} />
                              <Text style={{ color: THEME.slate600, fontSize: 12, fontWeight: '500' }}>
                                {casoActivo.dependencia}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Botones de acción del caso (apilados verticalmente: consulta encima de validación) */}
                        <View
                          style={{
                            flexDirection: 'column',
                            alignItems: isTablet ? 'flex-end' : 'stretch',
                            gap: 8,
                            flexShrink: 0,
                          }}
                        >
                          <Pressable
                            onPress={() =>
                              abrirConsultaSecopParaCandidato(
                                casoActivo.servidor_nombre,
                                casoActivo.servidor_cedula,
                                casoActivo.id
                              )
                            }
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              backgroundColor: THEME.skyBg,
                              paddingHorizontal: 13,
                              paddingVertical: 7.5,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: THEME.skyRing,
                              minWidth: isTablet ? 175 : undefined,
                            }}
                          >
                            <Ionicons name="search" size={14} color={THEME.skyText} />
                            <Text
                              style={{ color: THEME.skyText, fontSize: 11.5, fontWeight: '700' }}
                            >
                              Consultar SECOP II
                            </Text>
                          </Pressable>

                          {casoActivo.tipo_proceso === 'VINCULACION' && (
                            <Pressable
                              onPress={() => router.push('/ingresos/nueva')}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                backgroundColor: THEME.emeraldBg,
                                paddingHorizontal: 13,
                                paddingVertical: 7.5,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: THEME.emeraldRing,
                                minWidth: isTablet ? 175 : undefined,
                              }}
                            >
                              <Ionicons name="sparkles" size={14} color={THEME.emeraldText} />
                              <Text
                                style={{
                                  color: THEME.emeraldText,
                                  fontSize: 11.5,
                                  fontWeight: '700',
                                }}
                              >
                                Validación FT-318 IA
                              </Text>
                            </Pressable>
                          )}

                          {/* Botón Formatos Oficiales del Proceso */}
                          <Pressable
                            onPress={() => setModalFormatosVisible(true)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              backgroundColor: '#f1f5f9',
                              paddingHorizontal: 13,
                              paddingVertical: 7.5,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#cbd5e1',
                              minWidth: isTablet ? 175 : undefined,
                            }}
                          >
                            <Ionicons name="folder-open-outline" size={14} color="#334155" />
                            <Text
                              style={{
                                color: '#1e293b',
                                fontSize: 11.5,
                                fontWeight: '700',
                              }}
                            >
                              Formatos Oficiales
                            </Text>
                          </Pressable>

                          {/* Enlace Directo a Evaluación de Retiro (Google Forms) si es Desvinculación */}
                          {casoActivo.tipo_proceso === 'DESVINCULACION' && (
                            <Pressable
                              onPress={handleAbrirEvaluacionRetiroGoogleForms}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                backgroundColor: '#ecfdf5',
                                paddingHorizontal: 13,
                                paddingVertical: 7.5,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#a7f3d0',
                                minWidth: isTablet ? 175 : undefined,
                              }}
                            >
                              <Ionicons name="clipboard-outline" size={14} color="#047857" />
                              <Text
                                style={{
                                  color: '#065f46',
                                  fontSize: 11.5,
                                  fontWeight: '700',
                                }}
                              >
                                📝 Evaluación Retiro (Forms)
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>

                      {/* Banner Informativo del Régimen y sus Fases (Ancho Completo y Estructurado) */}
                      {(() => {
                        const infoModActivo = obtenerInfoModalidad(casoActivo.modalidad);
                        return (
                          <View
                            style={{
                              backgroundColor: infoModActivo.colorBg,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: infoModActivo.colorBorde,
                              padding: 12,
                              gap: 8,
                            }}
                          >
                            {/* Fila Superior del Banner: Título, Subtítulo y Botón Ver Guía */}
                            <View
                              style={{
                                flexDirection: isTablet ? 'row' : 'column',
                                justifyContent: 'space-between',
                                alignItems: isTablet ? 'center' : 'flex-start',
                                gap: 8,
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <View
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 7,
                                    backgroundColor: infoModActivo.colorTexto,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Ionicons name={infoModActivo.icono as any} size={16} color={THEME.white} />
                                </View>

                                <View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: infoModActivo.colorTexto }}>
                                      Régimen: {infoModActivo.titulo}
                                    </Text>
                                    <View
                                      style={{
                                        backgroundColor: THEME.white,
                                        paddingHorizontal: 7,
                                        paddingVertical: 1.5,
                                        borderRadius: 9999,
                                        borderWidth: 1,
                                        borderColor: infoModActivo.colorBorde,
                                      }}
                                    >
                                      <Text style={{ fontSize: 10, fontWeight: '700', color: infoModActivo.colorTexto }}>
                                        {casoActivo.etapas.length} Fases Específicas
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={{ fontSize: 11, color: THEME.slate600 }}>
                                    {infoModActivo.subtitulo}
                                  </Text>
                                </View>
                              </View>

                              {/* Botón Ver Guía & Diferencias */}
                              <Pressable
                                onPress={() => {
                                  setTabGuiaModalidad(casoActivo.modalidad);
                                  setModalGuiaModalidadesVisible(true);
                                }}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 5,
                                  paddingHorizontal: 11,
                                  paddingVertical: 5,
                                  borderRadius: 6,
                                  backgroundColor: THEME.white,
                                  borderWidth: 1,
                                  borderColor: infoModActivo.colorBorde,
                                }}
                              >
                                <Ionicons name="information-circle-outline" size={14} color={infoModActivo.colorTexto} />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: infoModActivo.colorTexto }}>
                                  Ver Guía & Diferencias
                                </Text>
                              </Pressable>
                            </View>

                            {/* Descripción del Régimen */}
                            <Text style={{ fontSize: 11.5, color: THEME.slate700, lineHeight: 16 }}>
                              {infoModActivo.descripcionFases}
                            </Text>

                            {/* Marco Legal */}
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingTop: 4,
                                borderTopWidth: 1,
                                borderTopColor: 'rgba(0, 0, 0, 0.05)',
                              }}
                            >
                              <Text style={{ fontSize: 11 }}>⚖️</Text>
                              <Text style={{ fontSize: 10.5, color: THEME.slate600, flex: 1 }}>
                                {infoModActivo.marcoLegal}
                              </Text>
                            </View>
                          </View>
                        );
                      })()}

                      {/* Stepper Horizontal Limpio */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 8,
                            gap: 8,
                          }}
                        >
                          {casoActivo.etapas.map((etapa, idx) => {
                            const esCompletada = etapa.estado === 'completed';
                            const esEnProgreso = etapa.estado === 'in_progress';

                            return (
                              <View
                                key={etapa.id}
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                              >
                                <View
                                  style={{
                                    backgroundColor: esCompletada
                                      ? THEME.emeraldBg
                                      : esEnProgreso
                                      ? THEME.marca50
                                      : THEME.slate100,
                                    borderRadius: 8,
                                    paddingHorizontal: 10,
                                    paddingVertical: 7,
                                    borderWidth: 1,
                                    borderColor: esCompletada
                                      ? THEME.emeraldRing
                                      : esEnProgreso
                                      ? THEME.marca600
                                      : THEME.slate200,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <Ionicons
                                    name={
                                      esCompletada
                                        ? 'checkmark-circle'
                                        : esEnProgreso
                                        ? 'time-outline'
                                        : 'ellipse-outline'
                                    }
                                    size={15}
                                    color={
                                      esCompletada
                                        ? THEME.emeraldText
                                        : esEnProgreso
                                        ? THEME.marca700
                                        : THEME.slate400
                                    }
                                  />
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: '600',
                                      color: esCompletada
                                        ? THEME.emeraldText
                                        : esEnProgreso
                                        ? THEME.marca700
                                        : THEME.slate600,
                                    }}
                                  >
                                    Fase {etapa.numero}: {etapa.titulo}
                                  </Text>
                                </View>
                                {idx < casoActivo.etapas.length - 1 && (
                                  <View
                                    style={{
                                      width: 14,
                                      height: 2,
                                      backgroundColor: esCompletada
                                        ? THEME.emeraldText
                                        : THEME.slate200,
                                    }}
                                  />
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </ScrollView>

                      {/* ============================================================== */}
                      {/* FASES AMPLIADAS CON DESPLEGABLES, NORMA Y OBSERVACIONES         */}
                      {/* ============================================================== */}
                      <View style={{ gap: 14 }}>
                        {/* Cabecera y Controles de Expansión Global */}
                        <View
                          style={{
                            flexDirection: isTablet ? 'row' : 'column',
                            justifyContent: 'space-between',
                            alignItems: isTablet ? 'center' : 'flex-start',
                            gap: 10,
                            backgroundColor: THEME.white,
                            padding: 14,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: THEME.slate200,
                          }}
                        >
                          <View style={{ flex: isTablet ? 1 : undefined, minWidth: 0 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900 }}>
                              Fases del Procedimiento Administrativo ({casoActivo.etapas.length} Fases)
                            </Text>
                            <Text style={{ fontSize: 11.5, color: THEME.slate500, marginTop: 2 }}>
                              Consulte la fundamentación jurídica y registre observaciones formales para cada requisito.
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <Pressable
                              onPress={() => expandirTodasLasFases(true)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 6,
                                backgroundColor: THEME.slate100,
                                borderWidth: 1,
                                borderColor: THEME.slate300,
                              }}
                            >
                              <Ionicons name="chevron-down-circle-outline" size={14} color={THEME.slate700} />
                              <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate700 }}>
                                Expandir todas
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => expandirTodasLasFases(false)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 6,
                                backgroundColor: THEME.slate100,
                                borderWidth: 1,
                                borderColor: THEME.slate300,
                              }}
                            >
                              <Ionicons name="chevron-up-circle-outline" size={14} color={THEME.slate700} />
                              <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate700 }}>
                                Colapsar todas
                              </Text>
                            </Pressable>
                          </View>
                        </View>

                        {/* Acordeón de cada Fase */}
                        {casoActivo.etapas.map((etapa) => {
                          const estaFaseExpandida = fasesExpandidas[etapa.id] ?? false;
                          const estaNormaFaseExpandida = fasesNormaExpandida[etapa.id] ?? false;

                          const totalReq = etapa.requisitos.length;
                          const cumplidosReq = etapa.requisitos.filter((r) => r.cumplido).length;
                          const porcentajeCumplido = totalReq > 0 ? Math.round((cumplidosReq / totalReq) * 100) : 0;

                          const esCompletada = etapa.estado === 'completed';
                          const esEnProgreso = etapa.estado === 'in_progress';

                          return (
                            <View
                              key={etapa.id}
                              style={{
                                backgroundColor: THEME.white,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: esCompletada
                                  ? THEME.emeraldRing
                                  : esEnProgreso
                                  ? THEME.marca600
                                  : THEME.slate200,
                                overflow: 'hidden',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.04,
                                shadowRadius: 3,
                                elevation: 1,
                              }}
                            >
                              {/* CABECERA DE LA FASE (INTERACTIVA PARA DESPLEGAR) */}
                              <Pressable
                                onPress={() => toggleFaseExpandida(etapa.id)}
                                style={{
                                  backgroundColor: esCompletada
                                    ? THEME.emeraldBg
                                    : esEnProgreso
                                    ? THEME.marca50
                                    : THEME.slate50,
                                  padding: 14,
                                  borderBottomWidth: estaFaseExpandida ? 1 : 0,
                                  borderBottomColor: THEME.slate200,
                                  flexDirection: isTablet ? 'row' : 'column',
                                  justifyContent: 'space-between',
                                  alignItems: isTablet ? 'center' : 'flex-start',
                                  gap: 10,
                                }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                  <View
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: 8,
                                      backgroundColor: THEME.white,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderWidth: 1,
                                      borderColor: esCompletada
                                        ? THEME.emeraldRing
                                        : esEnProgreso
                                        ? THEME.marca600
                                        : THEME.slate300,
                                    }}
                                  >
                                    <Ionicons
                                      name={etapa.icono}
                                      size={18}
                                      color={
                                        esCompletada
                                          ? THEME.emeraldText
                                          : esEnProgreso
                                          ? THEME.marca700
                                          : THEME.slate600
                                      }
                                    />
                                  </View>

                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate900 }}>
                                        Fase {etapa.numero}: {etapa.titulo}
                                      </Text>

                                      {/* Badge de Estado */}
                                      <View
                                        style={{
                                          backgroundColor: esCompletada
                                            ? THEME.emeraldBg
                                            : esEnProgreso
                                            ? THEME.marca100
                                            : THEME.slate200,
                                          paddingHorizontal: 7,
                                          paddingVertical: 2,
                                          borderRadius: 4,
                                        }}
                                      >
                                        <Text
                                          style={{
                                            fontSize: 10,
                                            fontWeight: '700',
                                            color: esCompletada
                                              ? THEME.emeraldText
                                              : esEnProgreso
                                              ? THEME.marca800
                                              : THEME.slate600,
                                          }}
                                        >
                                          {esCompletada
                                            ? 'COMPLETADA'
                                            : esEnProgreso
                                            ? 'EN CURSO'
                                            : 'PENDIENTE'}
                                        </Text>
                                      </View>

                                      {/* Contador de Requisitos */}
                                      <View
                                        style={{
                                          backgroundColor: THEME.white,
                                          paddingHorizontal: 6,
                                          paddingVertical: 1.5,
                                          borderRadius: 4,
                                          borderWidth: 1,
                                          borderColor: THEME.slate300,
                                        }}
                                      >
                                        <Text style={{ fontSize: 10, fontWeight: '600', color: THEME.slate700 }}>
                                          {cumplidosReq}/{totalReq} ({porcentajeCumplido}%)
                                        </Text>
                                      </View>
                                    </View>

                                    <Text style={{ fontSize: 11.5, color: THEME.slate600, marginTop: 2 }}>
                                      {etapa.subtitulo} • Responsable: {etapa.responsable}
                                    </Text>
                                  </View>
                                </View>

                                {/* Acciones y Chevron de Expansión */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: isTablet ? 'center' : 'flex-end' }}>
                                  <Pressable
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      abrirModalObservacionFase(casoActivo.id, etapa);
                                    }}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 6,
                                      backgroundColor: etapa.observacionesFase ? THEME.amberBg : THEME.white,
                                      borderWidth: 1,
                                      borderColor: etapa.observacionesFase ? THEME.amberRing : THEME.slate300,
                                    }}
                                  >
                                    <Ionicons
                                      name={etapa.observacionesFase ? 'chatbubble-ellipses' : 'chatbubble-outline'}
                                      size={13}
                                      color={etapa.observacionesFase ? THEME.amberText : THEME.slate600}
                                    />
                                    <Text
                                      style={{
                                        fontSize: 10.5,
                                        fontWeight: '600',
                                        color: etapa.observacionesFase ? THEME.amberText : THEME.slate700,
                                      }}
                                    >
                                      {etapa.observacionesFase ? 'Ver Obs. Fase' : '+ Obs. Fase'}
                                    </Text>
                                  </Pressable>

                                  <View
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 14,
                                      backgroundColor: THEME.white,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderWidth: 1,
                                      borderColor: THEME.slate300,
                                    }}
                                  >
                                    <Ionicons
                                      name={estaFaseExpandida ? 'chevron-up' : 'chevron-down'}
                                      size={16}
                                      color={THEME.slate700}
                                    />
                                  </View>
                                </View>
                              </Pressable>

                              {/* CONTENIDO DESPLEGABLE DE LA FASE */}
                              {estaFaseExpandida && (
                                <View style={{ padding: 14, gap: 12 }}>
                                  {/* DESPLEGABLE DE FUNDAMENTO NORMATIVO Y GUÍA PROCEDIMENTAL */}
                                  <View
                                    style={{
                                      backgroundColor: THEME.slate50,
                                      borderRadius: 8,
                                      borderWidth: 1,
                                      borderColor: THEME.slate200,
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <Pressable
                                      onPress={() => toggleNormaFase(etapa.id)}
                                      style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingHorizontal: 12,
                                        paddingVertical: 9,
                                        backgroundColor: estaNormaFaseExpandida ? THEME.marca50 : THEME.slate100,
                                      }}
                                    >
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                        <Ionicons name="scale-outline" size={15} color={THEME.marca700} />
                                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.marca900 }}>
                                          Fundamentación Normativa y Guía del Procedimiento Legal
                                        </Text>
                                      </View>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={{ fontSize: 10.5, color: THEME.marca700, fontWeight: '600' }}>
                                          {estaNormaFaseExpandida ? 'Ocultar' : 'Ver detalle'}
                                        </Text>
                                        <Ionicons
                                          name={estaNormaFaseExpandida ? 'chevron-up' : 'chevron-down'}
                                          size={13}
                                          color={THEME.marca700}
                                        />
                                      </View>
                                    </Pressable>

                                    {estaNormaFaseExpandida && (
                                      <View style={{ padding: 12, gap: 8, backgroundColor: THEME.white }}>
                                        {etapa.normaGeneral && (
                                          <View style={{ flexDirection: 'row', gap: 6 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate800 }}>
                                              ⚖️ Marco Normativo:
                                            </Text>
                                            <Text style={{ fontSize: 11, color: THEME.slate700, flex: 1 }}>
                                              {etapa.normaGeneral}
                                            </Text>
                                          </View>
                                        )}

                                        {etapa.plazoLegal && (
                                          <View style={{ flexDirection: 'row', gap: 6 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate800 }}>
                                              ⏱️ Plazo / Términos de Ley:
                                            </Text>
                                            <Text style={{ fontSize: 11, color: THEME.slate700, flex: 1 }}>
                                              {etapa.plazoLegal}
                                            </Text>
                                          </View>
                                        )}

                                        {etapa.procedimientoDetallado && (
                                          <View style={{ marginTop: 2 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate800, marginBottom: 2 }}>
                                              📋 Procedimiento Institucional:
                                            </Text>
                                            <Text style={{ fontSize: 11, color: THEME.slate600, lineHeight: 16 }}>
                                              {etapa.procedimientoDetallado}
                                            </Text>
                                          </View>
                                        )}

                                        {etapa.observacionesFase && (
                                          <View
                                            style={{
                                              backgroundColor: THEME.amberBg,
                                              padding: 8,
                                              borderRadius: 6,
                                              borderWidth: 1,
                                              borderColor: THEME.amberRing,
                                              marginTop: 4,
                                            }}
                                          >
                                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.amberText }}>
                                              💬 Observaciones registradas para esta fase:
                                            </Text>
                                            <Text style={{ fontSize: 11, color: THEME.amberText, marginTop: 2 }}>
                                              {etapa.observacionesFase}
                                            </Text>
                                          </View>
                                        )}
                                      </View>
                                    )}
                                  </View>

                                  {/* LISTA DE REQUISITOS DE LA FASE */}
                                  <View style={{ gap: 8 }}>
                                    {etapa.requisitos.map((req) => {
                                      const estaReqDetalle = reqDetalleExpandido[req.id] ?? false;
                                      const estaSecopExpandido = secopResumenExpandido[req.id] ?? false;

                                      return (
                                        <View
                                          key={req.id}
                                          style={{
                                            backgroundColor: THEME.white,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            borderColor: req.cumplido ? THEME.emeraldRing : THEME.slate200,
                                            padding: 10,
                                            gap: 8,
                                          }}
                                        >
                                          {/* Fila Principal del Requisito */}
                                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                            {/* Checkbox Interactivo que abre el Modal para registrar observaciones al cerrar */}
                                            <Pressable
                                              onPress={() => toggleRequisito(casoActivo.id, etapa.id, req.id)}
                                              style={{ marginTop: 2 }}
                                            >
                                              <Ionicons
                                                name={req.cumplido ? 'checkbox' : 'square-outline'}
                                                size={20}
                                                color={req.cumplido ? THEME.emeraldText : THEME.slate400}
                                              />
                                            </Pressable>

                                            <View style={{ flex: 1, gap: 4 }}>
                                              <Pressable onPress={() => toggleRequisito(casoActivo.id, etapa.id, req.id)} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                <Text
                                                  style={{
                                                    fontSize: 12.5,
                                                    fontWeight: '600',
                                                    color: req.cumplido ? THEME.slate500 : THEME.slate900,
                                                    textDecorationLine: req.cumplido ? 'line-through' : 'none',
                                                    lineHeight: 17,
                                                  }}
                                                >
                                                  {req.label}
                                                </Text>
                                                {/* Resumen de activos junto al título si ya se consultó en SECOP II */}
                                                {req.tipoAccionEspecial === 'SECOP' && casoActivo.resultadoSecop && (() => {
                                                  const sec = casoActivo.resultadoSecop;
                                                  const vigentes = sec.totalActivosVigentes ?? sec.totalActivos;
                                                  const finalizados = sec.totalActivosFinalizados ?? 0;

                                                  if (vigentes > 0) {
                                                    return (
                                                      <View
                                                        style={{
                                                          backgroundColor: THEME.roseBg,
                                                          borderColor: THEME.roseRing,
                                                          borderWidth: 1,
                                                          paddingHorizontal: 7,
                                                          paddingVertical: 2,
                                                          borderRadius: 6,
                                                          flexDirection: 'row',
                                                          alignItems: 'center',
                                                          gap: 4,
                                                        }}
                                                      >
                                                        <Ionicons name="warning" size={11} color={THEME.roseText} />
                                                        <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.roseText }}>
                                                          ⚠️ {vigentes} Activo{vigentes > 1 ? 's' : ''} (Art. 128 C.P.)
                                                        </Text>
                                                      </View>
                                                    );
                                                  }
                                                  if (finalizados > 0) {
                                                    return (
                                                      <View
                                                        style={{
                                                          backgroundColor: '#FEF3C7',
                                                          borderColor: '#FDE68A',
                                                          borderWidth: 1,
                                                          paddingHorizontal: 7,
                                                          paddingVertical: 2,
                                                          borderRadius: 6,
                                                          flexDirection: 'row',
                                                          alignItems: 'center',
                                                          gap: 4,
                                                        }}
                                                      >
                                                        <Ionicons name="time" size={11} color="#92400E" />
                                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#92400E' }}>
                                                          ⏱️ {finalizados} Plazo Vencido
                                                        </Text>
                                                      </View>
                                                    );
                                                  }
                                                  return (
                                                    <View
                                                      style={{
                                                        backgroundColor: THEME.emeraldBg,
                                                        borderColor: THEME.emeraldRing,
                                                        borderWidth: 1,
                                                        paddingHorizontal: 7,
                                                        paddingVertical: 2,
                                                        borderRadius: 6,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                      }}
                                                    >
                                                      <Ionicons name="shield-checkmark" size={11} color={THEME.emeraldText} />
                                                      <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.emeraldText }}>
                                                        ✓ 0 Activos (Limpio)
                                                      </Text>
                                                    </View>
                                                  );
                                                })()}
                                              </Pressable>

                                              {/* Badges y Acciones Rápidas */}
                                              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                {/* Código Formato */}
                                                {req.codigoFormato && (
                                                  <View
                                                    style={{
                                                      backgroundColor: THEME.slate100,
                                                      paddingHorizontal: 6,
                                                      paddingVertical: 1.5,
                                                      borderRadius: 4,
                                                    }}
                                                  >
                                                    <Text style={{ fontSize: 9.5, fontWeight: '600', color: THEME.slate600 }}>
                                                      📄 {req.codigoFormato}
                                                    </Text>
                                                  </View>
                                                )}

                                                {/* Badge de Norma */}
                                                {req.norma && (
                                                  <View
                                                    style={{
                                                      backgroundColor: THEME.slate100,
                                                      paddingHorizontal: 6,
                                                      paddingVertical: 1.5,
                                                      borderRadius: 4,
                                                      borderWidth: 1,
                                                      borderColor: THEME.slate200,
                                                    }}
                                                  >
                                                    <Text style={{ fontSize: 9.5, fontWeight: '600', color: THEME.marca800 }}>
                                                      ⚖️ {req.norma.length > 35 ? req.norma.substring(0, 35) + '...' : req.norma}
                                                    </Text>
                                                  </View>
                                                )}

                                                {/* SECOP II: Consulta y Botón Expansible */}
                                                {req.tipoAccionEspecial === 'SECOP' && (
                                                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                                                    <Pressable
                                                      onPress={(e) => {
                                                        e.stopPropagation();
                                                        abrirConsultaSecopParaCandidato(
                                                          casoActivo.servidor_nombre,
                                                          casoActivo.servidor_cedula,
                                                          casoActivo.id
                                                        );
                                                      }}
                                                      style={{
                                                        backgroundColor: THEME.skyBg,
                                                        paddingHorizontal: 6,
                                                        paddingVertical: 1.5,
                                                        borderRadius: 4,
                                                        borderColor: THEME.skyRing,
                                                        borderWidth: 1,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 3,
                                                      }}
                                                    >
                                                      <Ionicons name="search" size={10} color={THEME.skyText} />
                                                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: THEME.skyText }}>
                                                        {casoActivo.resultadoSecop ? 'Reconsultar SECOP II' : 'Consultar SECOP II'}
                                                      </Text>
                                                    </Pressable>

                                                    {/* Botón Expansible para ver Resumen de lo Encontrado en SECOP II */}
                                                    {casoActivo.resultadoSecop && (
                                                      <Pressable
                                                        onPress={(e) => {
                                                          e.stopPropagation();
                                                          toggleSecopResumen(req.id);
                                                        }}
                                                        style={{
                                                          backgroundColor: estaSecopExpandido ? THEME.skyText : '#E0F2FE',
                                                          paddingHorizontal: 6,
                                                          paddingVertical: 1.5,
                                                          borderRadius: 4,
                                                          borderColor: THEME.skyRing,
                                                          borderWidth: 1,
                                                          flexDirection: 'row',
                                                          alignItems: 'center',
                                                          gap: 3,
                                                        }}
                                                      >
                                                        <Ionicons
                                                          name={estaSecopExpandido ? 'chevron-up' : 'document-text-outline'}
                                                          size={10}
                                                          color={estaSecopExpandido ? THEME.white : THEME.skyText}
                                                        />
                                                        <Text
                                                          style={{
                                                            fontSize: 9.5,
                                                            fontWeight: '700',
                                                            color: estaSecopExpandido ? THEME.white : THEME.skyText,
                                                          }}
                                                        >
                                                          {estaSecopExpandido ? '▲ Ocultar Resumen' : '▼ Ver Resumen'}
                                                        </Text>
                                                      </Pressable>
                                                    )}
                                                  </View>
                                                )}

                                                {/* Validar con IA y Descarga de Excel Oficial 2311300-FT-318 */}
                                                {req.tipoAccionEspecial === 'INGRESOS_IA' && (() => {
                                                  const valCoincidente = validacionesIngresos.find(
                                                    (v) =>
                                                      (casoActivo.servidor_cedula && v.candidato_documento === casoActivo.servidor_cedula) ||
                                                      (casoActivo.servidor_nombre &&
                                                        v.candidato_nombre &&
                                                        v.candidato_nombre.toLowerCase().includes(casoActivo.servidor_nombre.toLowerCase().split(' ')[0]))
                                                  );

                                                  return (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                      {valCoincidente ? (
                                                        <>
                                                          <Pressable
                                                            onPress={(e) => {
                                                              e.stopPropagation();
                                                              handleDescargarExcelFT318(valCoincidente.id);
                                                            }}
                                                            style={{
                                                              backgroundColor: '#dcfce7',
                                                              paddingHorizontal: 7,
                                                              paddingVertical: 2,
                                                              borderRadius: 4,
                                                              borderColor: '#86efac',
                                                              borderWidth: 1,
                                                              flexDirection: 'row',
                                                              alignItems: 'center',
                                                              gap: 3,
                                                            }}
                                                          >
                                                            <Ionicons name="download" size={11} color="#166534" />
                                                            <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#166534' }}>
                                                              Excel FT-318 ({valCoincidente.resultado_final || 'CUMPLE'})
                                                            </Text>
                                                          </Pressable>

                                                          <Pressable
                                                            onPress={(e) => {
                                                              e.stopPropagation();
                                                              router.push(`/ingresos/${valCoincidente.id}`);
                                                            }}
                                                            style={{
                                                              backgroundColor: THEME.emeraldBg,
                                                              paddingHorizontal: 6,
                                                              paddingVertical: 2,
                                                              borderRadius: 4,
                                                              borderColor: THEME.emeraldRing,
                                                              borderWidth: 1,
                                                            }}
                                                          >
                                                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: THEME.emeraldText }}>
                                                              Ver Dictamen
                                                            </Text>
                                                          </Pressable>
                                                        </>
                                                      ) : (
                                                        <Pressable
                                                          onPress={(e) => {
                                                            e.stopPropagation();
                                                            router.push('/ingresos/nueva');
                                                          }}
                                                          style={{
                                                            backgroundColor: THEME.emeraldBg,
                                                            paddingHorizontal: 7,
                                                            paddingVertical: 2,
                                                            borderRadius: 4,
                                                            borderColor: THEME.emeraldRing,
                                                            borderWidth: 1,
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 3,
                                                          }}
                                                        >
                                                          <Ionicons name="sparkles" size={10} color={THEME.emeraldText} />
                                                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: THEME.emeraldText }}>
                                                            Validación Técnica FT-318 (Excel)
                                                          </Text>
                                                        </Pressable>
                                                      )}
                                                    </View>
                                                  );
                                                })()}

                                                {/* Botón Desplegable para ver detalle inline */}
                                                <Pressable
                                                  onPress={() => toggleDetalleReq(req.id)}
                                                  style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 2,
                                                    paddingHorizontal: 6,
                                                    paddingVertical: 1.5,
                                                    borderRadius: 4,
                                                    backgroundColor: estaReqDetalle ? THEME.marca50 : 'transparent',
                                                  }}
                                                >
                                                  <Text style={{ fontSize: 9.5, fontWeight: '600', color: THEME.marca700 }}>
                                                    {estaReqDetalle ? '▲ Menos info' : '▼ Detalle y Norma'}
                                                  </Text>
                                                </Pressable>

                                                {/* Botón de Modal para Observaciones y Cierre */}
                                                <Pressable
                                                  onPress={() => abrirModalObservacionReq(casoActivo.id, etapa, req, false)}
                                                  style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 3,
                                                    backgroundColor: req.observaciones ? THEME.amberBg : THEME.slate100,
                                                    paddingHorizontal: 7,
                                                    paddingVertical: 2,
                                                    borderRadius: 4,
                                                    borderWidth: 1,
                                                    borderColor: req.observaciones ? THEME.amberRing : THEME.slate300,
                                                  }}
                                                >
                                                  <Ionicons
                                                    name={req.observaciones ? 'chatbox-ellipses' : 'create-outline'}
                                                    size={11}
                                                    color={req.observaciones ? THEME.amberText : THEME.slate600}
                                                  />
                                                  <Text
                                                    style={{
                                                      fontSize: 9.5,
                                                      fontWeight: '700',
                                                      color: req.observaciones ? THEME.amberText : THEME.slate700,
                                                    }}
                                                  >
                                                    {req.observaciones ? 'Ver Observación' : 'Observaciones'}
                                                  </Text>
                                                </Pressable>
                                              </View>

                                              
                                              {/* RESUMEN EXPANSIBLE SECOP II: CUANDO YA FUE CONSULTADO */}
                                              {req.tipoAccionEspecial === 'SECOP' && casoActivo.resultadoSecop && !estaSecopExpandido && (() => {
                                                const sec = casoActivo.resultadoSecop;
                                                const vigentes = sec.totalActivosVigentes ?? sec.totalActivos;
                                                const finalizados = sec.totalActivosFinalizados ?? 0;
                                                const tieneVigentes = vigentes > 0;
                                                const tieneFinalizados = finalizados > 0;

                                                const bgMin = tieneVigentes ? '#FFF1F2' : tieneFinalizados ? '#FFFBEB' : '#F0FDF4';
                                                const borderMin = tieneVigentes ? THEME.roseRing : tieneFinalizados ? '#FDE68A' : THEME.emeraldRing;
                                                const textMin = tieneVigentes ? THEME.roseText : tieneFinalizados ? '#92400E' : THEME.emeraldText;

                                                return (
                                                  <Pressable
                                                    onPress={() => toggleSecopResumen(req.id)}
                                                    style={{
                                                      backgroundColor: bgMin,
                                                      borderWidth: 1,
                                                      borderColor: borderMin,
                                                      borderRadius: 6,
                                                      paddingHorizontal: 8,
                                                      paddingVertical: 5,
                                                      marginTop: 3,
                                                      flexDirection: 'row',
                                                      alignItems: 'center',
                                                      justifyContent: 'space-between',
                                                      gap: 6,
                                                    }}
                                                  >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                                      <Ionicons
                                                        name={tieneVigentes ? 'warning' : tieneFinalizados ? 'time' : 'shield-checkmark'}
                                                        size={13}
                                                        color={textMin}
                                                      />
                                                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: textMin, flex: 1 }} numberOfLines={1}>
                                                        {tieneVigentes
                                                          ? `⚠️ Alerta: ${vigentes} contrato(s) en ejecución. Posible inhabilidad Art. 128 C.P.`
                                                          : tieneFinalizados
                                                          ? `⏱️ Verificación preventiva: ${finalizados} contrato(s) con plazo vencido pendiente liquidación.`
                                                          : '✓ Registro limpio: Sin contratos estatales en ejecución en SECOP II.'}
                                                      </Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: textMin }}>
                                                        Ver resumen
                                                      </Text>
                                                      <Ionicons name="chevron-down" size={11} color={textMin} />
                                                    </View>
                                                  </Pressable>
                                                );
                                              })()}

                                              {/* PANEL COMPLETO EXPANDIDO DE RESUMEN SECOP II */}
                                              {req.tipoAccionEspecial === 'SECOP' && casoActivo.resultadoSecop && estaSecopExpandido && (() => {
                                                const sec = casoActivo.resultadoSecop;
                                                const vigentes = sec.totalActivosVigentes ?? sec.totalActivos;
                                                const finalizados = sec.totalActivosFinalizados ?? 0;
                                                const historicos = sec.totalHistoricos ?? 0;
                                                const tieneVigentes = vigentes > 0;
                                                const tieneFinalizados = finalizados > 0;

                                                const bgResumen = tieneVigentes ? '#FFF1F2' : tieneFinalizados ? '#FFFBEB' : '#F0FDF4';
                                                const borderResumen = tieneVigentes ? THEME.roseRing : tieneFinalizados ? '#FDE68A' : THEME.emeraldRing;
                                                const textResumenColor = tieneVigentes ? THEME.roseText : tieneFinalizados ? '#92400E' : THEME.emeraldText;

                                                return (
                                                  <View
                                                    style={{
                                                      backgroundColor: bgResumen,
                                                      borderRadius: 8,
                                                      borderWidth: 1,
                                                      borderColor: borderResumen,
                                                      padding: 10,
                                                      marginTop: 4,
                                                      gap: 8,
                                                    }}
                                                  >
                                                    {/* Cabecera del Resumen */}
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                                        <Ionicons
                                                          name={tieneVigentes ? 'warning' : tieneFinalizados ? 'time' : 'shield-checkmark'}
                                                          size={16}
                                                          color={textResumenColor}
                                                        />
                                                        <View style={{ flex: 1 }}>
                                                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: textResumenColor }}>
                                                            {tieneVigentes
                                                              ? '⚠️ REGISTRA CONTRATOS ACTIVOS EN EJECUCIÓN'
                                                              : tieneFinalizados
                                                              ? '⏱️ REGISTRA CONTRATOS CON PLAZO VENCIDO (SIN LIQUIDAR)'
                                                              : '✓ ESTADO LIMPIO: SIN CONTRATOS ACTIVOS EN SECOP II'}
                                                          </Text>
                                                          <Text style={{ fontSize: 10, color: THEME.slate500, marginTop: 1 }}>
                                                            Consulta realizada: {sec.fechaHoraConsulta || sec.fechaConsulta} • Documento: {casoActivo.servidor_cedula}
                                                          </Text>
                                                        </View>
                                                      </View>

                                                      {/* Botón para abrir el Reporte Detallado Completo */}
                                                      <Pressable
                                                        onPress={() =>
                                                          abrirConsultaSecopParaCandidato(
                                                            casoActivo.servidor_nombre,
                                                            casoActivo.servidor_cedula,
                                                            casoActivo.id
                                                          )
                                                        }
                                                        style={{
                                                          backgroundColor: THEME.white,
                                                          paddingHorizontal: 8,
                                                          paddingVertical: 3,
                                                          borderRadius: 6,
                                                          borderWidth: 1,
                                                          borderColor: THEME.slate300,
                                                          flexDirection: 'row',
                                                          alignItems: 'center',
                                                          gap: 4,
                                                        }}
                                                      >
                                                        <Ionicons name="open-outline" size={11} color={THEME.marca700} />
                                                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.marca700 }}>
                                                          Ver Reporte Completo
                                                        </Text>
                                                      </Pressable>
                                                    </View>

                                                    {/* Mini KPIs del Resumen */}
                                                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                                      <View
                                                        style={{
                                                          flex: 1,
                                                          minWidth: 85,
                                                          backgroundColor: THEME.white,
                                                          paddingHorizontal: 8,
                                                          paddingVertical: 5,
                                                          borderRadius: 6,
                                                          borderWidth: 1,
                                                          borderColor: tieneVigentes ? THEME.roseRing : THEME.slate200,
                                                        }}
                                                      >
                                                        <Text style={{ fontSize: 9.5, color: THEME.slate500 }}>Vigentes</Text>
                                                        <Text style={{ fontSize: 13, fontWeight: '800', color: tieneVigentes ? THEME.roseText : THEME.emeraldText }}>
                                                          {vigentes}
                                                        </Text>
                                                      </View>

                                                      <View
                                                        style={{
                                                          flex: 1,
                                                          minWidth: 85,
                                                          backgroundColor: THEME.white,
                                                          paddingHorizontal: 8,
                                                          paddingVertical: 5,
                                                          borderRadius: 6,
                                                          borderWidth: 1,
                                                          borderColor: tieneFinalizados ? '#FDE68A' : THEME.slate200,
                                                        }}
                                                      >
                                                        <Text style={{ fontSize: 9.5, color: THEME.slate500 }}>Plazo Vencido</Text>
                                                        <Text style={{ fontSize: 13, fontWeight: '800', color: tieneFinalizados ? '#D97706' : THEME.slate700 }}>
                                                          {finalizados}
                                                        </Text>
                                                      </View>

                                                      <View
                                                        style={{
                                                          flex: 1,
                                                          minWidth: 85,
                                                          backgroundColor: THEME.white,
                                                          paddingHorizontal: 8,
                                                          paddingVertical: 5,
                                                          borderRadius: 6,
                                                          borderWidth: 1,
                                                          borderColor: THEME.slate200,
                                                        }}
                                                      >
                                                        <Text style={{ fontSize: 9.5, color: THEME.slate500 }}>Históricos</Text>
                                                        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.slate800 }}>
                                                          {historicos}
                                                        </Text>
                                                      </View>

                                                      {(sec.valorTotalActivo || 0) > 0 && (
                                                        <View
                                                          style={{
                                                            flex: 1,
                                                            minWidth: 110,
                                                            backgroundColor: THEME.white,
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 5,
                                                            borderRadius: 6,
                                                            borderWidth: 1,
                                                            borderColor: THEME.slate200,
                                                          }}
                                                        >
                                                          <Text style={{ fontSize: 9.5, color: THEME.slate500 }}>Total Activo</Text>
                                                          <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.marca900 }}>
                                                            ${(sec.valorTotalActivo || 0).toLocaleString('es-CO')}
                                                          </Text>
                                                        </View>
                                                      )}
                                                    </View>

                                                    {/* Dictamen Breve */}
                                                    {sec.dictamen && (
                                                      <View
                                                        style={{
                                                          backgroundColor: THEME.white,
                                                          padding: 8,
                                                          borderRadius: 6,
                                                          borderWidth: 1,
                                                          borderColor: THEME.slate200,
                                                        }}
                                                      >
                                                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.slate700, marginBottom: 2 }}>
                                                          📋 Dictamen Técnico Registrado:
                                                        </Text>
                                                        <Text style={{ fontSize: 10.5, color: THEME.slate800, lineHeight: 15 }} numberOfLines={3}>
                                                          {sec.dictamen}
                                                        </Text>
                                                      </View>
                                                    )}

                                                    {/* Entidades Estatales */}
                                                    {sec.entidadesActivas && sec.entidadesActivas.length > 0 && (
                                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <Ionicons name="business-outline" size={12} color={THEME.slate600} />
                                                        <Text style={{ fontSize: 10, color: THEME.slate700, flex: 1 }}>
                                                          <Text style={{ fontWeight: '700' }}>Entidades concurrentes:</Text> {sec.entidadesActivas.join(', ')}
                                                        </Text>
                                                      </View>
                                                    )}
                                                  </View>
                                                );
                                              })()}

                                              {/* Panel Expandido del Requisito con Procedimiento y Norma completa */}
                                              {estaReqDetalle && (
                                                <View
                                                  style={{
                                                    backgroundColor: THEME.slate50,
                                                    padding: 8,
                                                    borderRadius: 6,
                                                    borderWidth: 1,
                                                    borderColor: THEME.slate200,
                                                    marginTop: 4,
                                                    gap: 4,
                                                  }}
                                                >
                                                  {req.norma && (
                                                    <View style={{ gap: 4 }}>
                                                      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                                                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.marca800 }}>
                                                          ⚖️ Fundamento Legal:
                                                        </Text>
                                                        <Text style={{ fontSize: 10.5, fontWeight: '600', color: THEME.slate800, flex: 1 }}>
                                                          {req.norma}
                                                        </Text>
                                                      </View>
                                                      {req.notaNormativa && (
                                                        <View
                                                          style={{
                                                            backgroundColor: THEME.marca50,
                                                            borderLeftWidth: 3,
                                                            borderLeftColor: THEME.marca600,
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 6,
                                                            borderRadius: 4,
                                                            marginTop: 2,
                                                          }}
                                                        >
                                                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: THEME.marca800, marginBottom: 1 }}>
                                                            💡 Resumen Jurídico:
                                                          </Text>
                                                          <Text style={{ fontSize: 10, color: THEME.slate700, lineHeight: 14 }}>
                                                            {req.notaNormativa}
                                                          </Text>
                                                        </View>
                                                      )}
                                                      {req.textoNormativo && (
                                                        <View
                                                          style={{
                                                            backgroundColor: THEME.white,
                                                            borderLeftWidth: 3,
                                                            borderLeftColor: THEME.marca700,
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 6,
                                                            borderRadius: 4,
                                                            marginTop: 2,
                                                          }}
                                                        >
                                                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: THEME.marca800, marginBottom: 1 }}>
                                                            📜 Disposición Legal Incluida:
                                                          </Text>
                                                          <Text style={{ fontSize: 10, color: THEME.slate700, fontStyle: 'italic', lineHeight: 14 }}>
                                                            «{req.textoNormativo}»
                                                          </Text>
                                                        </View>
                                                      )}
                                                    </View>
                                                  )}

                                                  {req.detalleProcedimiento && (
                                                    <View style={{ marginTop: 2 }}>
                                                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.slate700 }}>
                                                        📋 Guía Procedimental:
                                                      </Text>
                                                      <Text style={{ fontSize: 10.5, color: THEME.slate600, lineHeight: 15 }}>
                                                        {req.detalleProcedimiento}
                                                      </Text>
                                                    </View>
                                                  )}

                                                  {req.posiblesEvidencias && req.posiblesEvidencias.length > 0 && (
                                                    <View
                                                      style={{
                                                        marginTop: 5,
                                                        backgroundColor: THEME.white,
                                                        padding: 7,
                                                        borderRadius: 5,
                                                        borderWidth: 1,
                                                        borderColor: THEME.slate200,
                                                        gap: 3,
                                                      }}
                                                    >
                                                      <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.slate700, marginBottom: 1 }}>
                                                        📁 Posibles Evidencias Documentales:
                                                      </Text>
                                                      {req.posiblesEvidencias.map((evidencia, evIdx) => (
                                                        <View key={evIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
                                                          <Text style={{ fontSize: 10, color: THEME.marca600, lineHeight: 14 }}>•</Text>
                                                          <Text style={{ fontSize: 10, color: THEME.slate600, flex: 1, lineHeight: 14 }}>
                                                            {evidencia}
                                                          </Text>
                                                        </View>
                                                      ))}
                                                    </View>
                                                  )}
                                                </View>
                                              )}

                                              {/* Bloque de Observaciones si ya han sido registradas */}
                                              {req.observaciones && (
                                                <View
                                                  style={{
                                                    backgroundColor: THEME.amberBg,
                                                    padding: 7,
                                                    borderRadius: 6,
                                                    borderWidth: 1,
                                                    borderColor: THEME.amberRing,
                                                    marginTop: 4,
                                                    gap: 2,
                                                  }}
                                                >
                                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.amberText }}>
                                                      💬 Observación registrada:
                                                    </Text>
                                                    {req.fecha_cumplimiento && (
                                                      <Text style={{ fontSize: 9.5, color: THEME.amberText }}>
                                                        📅 {req.fecha_cumplimiento}
                                                      </Text>
                                                    )}
                                                  </View>
                                                  <Text style={{ fontSize: 11, color: THEME.slate800, lineHeight: 15 }}>
                                                    {req.observaciones}
                                                  </Text>
                                                  {req.radicadoSoporte && (
                                                    <Text style={{ fontSize: 10, fontWeight: '600', color: THEME.slate700, marginTop: 1 }}>
                                                      🏷️ Soporte / Radicado: {req.radicadoSoporte}
                                                    </Text>
                                                  )}
                                                </View>
                                              )}
                                            </View>
                                          </View>
                                        </View>
                                      );
                                    })}
                                  </View>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 2: SECOP II (DATOS.GOV.CO EN TIEMPO REAL)              */}
          {/* ============================================================== */}
          {tabActiva === 'secop' && (
            <View style={{ gap: 16, width: '100%' }}>
              {/* Banner Informativo */}
              <View
                style={{
                  backgroundColor: THEME.skyBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.skyRing,
                  padding: 16,
                  flexDirection: isTablet ? 'row' : 'column',
                  alignItems: isTablet ? 'center' : 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      backgroundColor: THEME.white,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="search" size={22} color={THEME.skyText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: THEME.skyText, fontSize: 13, fontWeight: '700' }}>
                      CONSULTA EN LÍNEA DE CONTRATOS ELECTRÓNICOS - SECOP II (API SJD)
                    </Text>
                    <Text
                      style={{ color: THEME.slate600, fontSize: 12, marginTop: 2, lineHeight: 18 }}
                    >
                      Permite verificar de forma preventiva si los postulantes tienen contratos
                      estatales en ejecución para evitar inhabilidades o incompatibilidades según el
                      Artículo 128 de la Constitución Política y Ley 80 de 1993.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Buscador de SECOP II */}
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 18,
                  gap: 14,
                }}
              >
                <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '700' }}>
                  Buscador de Contratos en Tiempo Real (SECOP II)
                </Text>

                {/* Selector Criterio */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => setSecopTipoCriterio('documento')}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor:
                        secopTipoCriterio === 'documento' ? THEME.marca600 : THEME.slate100,
                      borderWidth: 1,
                      borderColor:
                        secopTipoCriterio === 'documento' ? THEME.marca600 : THEME.slate200,
                    }}
                  >
                    <Text
                      style={{
                        color: secopTipoCriterio === 'documento' ? THEME.white : THEME.slate600,
                        fontWeight: '600',
                        fontSize: 12,
                      }}
                    >
                      Por Cédula / Documento
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setSecopTipoCriterio('nombre')}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor:
                        secopTipoCriterio === 'nombre' ? THEME.marca600 : THEME.slate100,
                      borderWidth: 1,
                      borderColor:
                        secopTipoCriterio === 'nombre' ? THEME.marca600 : THEME.slate200,
                    }}
                  >
                    <Text
                      style={{
                        color: secopTipoCriterio === 'nombre' ? THEME.white : THEME.slate600,
                        fontWeight: '600',
                        fontSize: 12,
                      }}
                    >
                      Por Nombre Completo
                    </Text>
                  </Pressable>
                </View>

                {/* Input y Botón de Búsqueda */}
                <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 10 }}>
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: THEME.slate50,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Ionicons name="search" size={18} color={THEME.slate400} />
                    <TextInput
                      value={secopBusqueda}
                      onChangeText={setSecopBusqueda}
                      placeholder={
                        secopTipoCriterio === 'documento'
                          ? 'Ingrese número de documento (ej. 11258440)...'
                          : 'Ingrese nombre del aspirante...'
                      }
                      placeholderTextColor={THEME.slate400}
                      style={{
                        flex: 1,
                        color: THEME.slate900,
                        paddingVertical: 9,
                        paddingHorizontal: 10,
                        fontSize: 13,
                      }}
                      onSubmitEditing={() => ejecutarConsultaSecop()}
                    />
                    {secopBusqueda ? (
                      <Pressable onPress={() => setSecopBusqueda('')}>
                        <Ionicons name="close-circle" size={16} color={THEME.slate400} />
                      </Pressable>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => ejecutarConsultaSecop()}
                    disabled={secopCargando}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? THEME.marca700 : THEME.marca600,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                    })}
                  >
                    {secopCargando ? (
                      <ActivityIndicator size="small" color={THEME.white} />
                    ) : (
                      <>
                        <Ionicons name="cloud-download-outline" size={17} color={THEME.white} />
                        <Text style={{ color: THEME.white, fontWeight: '600', fontSize: 13 }}>
                          Consultar en SECOP II
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Resultados de la consulta */}
              {secopResultado &&
                renderReporteSecopDetallado(
                  secopResultado,
                  null,
                  secopFiltroTab,
                  setSecopFiltroTab,
                  false
                )}
            </View>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 3: VALIDACIÓN TÉCNICA DE INGRESOS (IA GEMINI)          */}
          {/* ============================================================== */}
          {tabActiva === 'validacion_ia' && (
            <View style={{ gap: 16, width: '100%' }}>
              <View
                style={{
                  backgroundColor: THEME.emeraldBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.emeraldRing,
                  padding: 16,
                  flexDirection: isTablet ? 'row' : 'column',
                  gap: 14,
                  alignItems: isTablet ? 'center' : 'flex-start',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: THEME.white,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="sparkles" size={24} color={THEME.emeraldText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: THEME.emeraldText, fontSize: 14, fontWeight: '700' }}>
                      VALIDACIÓN TÉCNICA DE INGRESOS — CERTIFICADO DE CUMPLIMIENTO DE REQUISITOS PARA TOMAR POSESIÓN (FORMATO 2311300-FT-318)
                    </Text>
                    <Text
                      style={{ color: THEME.slate600, fontSize: 12, marginTop: 2, lineHeight: 18 }}
                    >
                      Cotejo técnico de hojas de vida asistido por IA frente al Manual Específico de Funciones institucional.
                      Genera y certifica oficialmente el archivo Excel 2311300-FT-318 exigido por ley previo a autorizar la posesión.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => router.push('/ingresos/nueva')}
                  style={{
                    backgroundColor: THEME.emeraldText,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ionicons name="add-circle" size={17} color={THEME.white} />
                  <Text style={{ color: THEME.white, fontWeight: '600', fontSize: 12 }}>
                    Nueva Validación con IA
                  </Text>
                </Pressable>
              </View>

              {/* Lista de expedientes validados */}
              <View style={{ gap: 12 }}>
                <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '700' }}>
                  Expedientes Registrados ({validacionesIngresos.length})
                </Text>

                {validacionesIngresos.map((val) => {
                  const cumple = val.resultado_final === 'CUMPLE';
                  const revision = val.resultado_final === 'REQUIERE_REVISION';

                  return (
                    <View
                      key={val.id}
                      style={{
                        backgroundColor: THEME.white,
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: cumple
                          ? THEME.emeraldRing
                          : revision
                          ? THEME.amberRing
                          : THEME.roseRing,
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: THEME.slate900, fontSize: 13.5, fontWeight: '700' }}>
                          {val.candidato_nombre || 'Aspirante'}
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 9999,
                            backgroundColor: cumple
                              ? THEME.emeraldBg
                              : revision
                              ? THEME.amberBg
                              : THEME.roseBg,
                            borderColor: cumple
                              ? THEME.emeraldRing
                              : revision
                              ? THEME.amberRing
                              : THEME.roseRing,
                            borderWidth: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10.5,
                              fontWeight: '700',
                              color: cumple
                                ? THEME.emeraldText
                                : revision
                                ? THEME.amberText
                                : THEME.roseText,
                            }}
                          >
                            {val.resultado_final}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: THEME.slate600, fontSize: 12 }}>
                        Cargo: {val.cargo_nombre} (Cód. {val.cargo_codigo} Gr. {val.cargo_grado})
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                        <Pressable
                          onPress={() => handleDescargarExcelFT318(val.id)}
                          style={{
                            backgroundColor: '#dcfce7',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#86efac',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <Ionicons name="download-outline" size={14} color="#166534" />
                          <Text
                            style={{ color: '#166534', fontSize: 11, fontWeight: '700' }}
                          >
                            Descargar Excel (2311300-FT-318)
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => router.push(`/ingresos/${val.id}`)}
                          style={{
                            backgroundColor: THEME.marca50,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: THEME.marca100,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Ionicons name="eye-outline" size={14} color={THEME.marca700} />
                          <Text
                            style={{ color: THEME.marca700, fontSize: 11, fontWeight: '600' }}
                          >
                            Ver Dictamen
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 4: CIRCUITO DE PAZ Y SALVO (PR-074)                     */}
          {/* ============================================================== */}
          {tabActiva === 'paz_salvo' && (
            <View style={{ gap: 16, width: '100%' }}>
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 20,
                  gap: 14,
                }}
              >
                <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '700' }}>
                  Circuito Integral de Paz y Salvo Electrónico (Procedimiento PR-074)
                </Text>
                <Text style={{ color: THEME.slate600, fontSize: 12.5, lineHeight: 18 }}>
                  La desvinculación formal requiere la validación simultánea de las 4 áreas
                  responsables antes de la liquidación definitiva de prestaciones sociales:
                </Text>

                <View style={{ gap: 10 }}>
                  {[
                    {
                      area: '1. Tecnologías de la Información (TIC)',
                      items:
                        'Entrega de equipo de cómputo, teclado, mouse, monitor, revocación de cuentas de correo y VPN.',
                      icono: 'laptop-outline' as const,
                    },
                    {
                      area: '2. Gestión de Almacén e Inventarios',
                      items:
                        'Devolución de elementos de oficina, placas de inventario, sello institucional y llaves.',
                      icono: 'cube-outline' as const,
                    },
                    {
                      area: '3. Archivo Central y de Gestión',
                      items:
                        'Entrega formal de expedientes contractuales, judiciales o administrativos conforme a las Tablas de Retención Documental (TRD).',
                      icono: 'file-tray-full-outline' as const,
                    },
                    {
                      area: '4. Gestión del Talento Humano',
                      items:
                        'Devolución de carné institucional de acceso, formato de entrevista de retiro y constancia de examen médico de egreso.',
                      icono: 'person-outline' as const,
                    },
                  ].map((p, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: THEME.slate50,
                        borderRadius: 10,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        gap: 4,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={p.icono} size={16} color={THEME.marca700} />
                        <Text style={{ color: THEME.slate900, fontSize: 13, fontWeight: '700' }}>
                          {p.area}
                        </Text>
                      </View>
                      <Text style={{ color: THEME.slate600, fontSize: 12, lineHeight: 17 }}>
                        {p.items}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Formatos y Plantillas Descargables del Retiro */}
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    padding: 16,
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="folder-open" size={20} color={THEME.marca700} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900 }}>
                        Formatos Oficiales y Encuesta de Retiro (PR-074)
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setModalFormatosVisible(true)}
                      style={{
                        backgroundColor: THEME.marca50,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: THEME.marca100,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca700 }}>
                        Ver Catálogo Completo
                      </Text>
                    </Pressable>
                  </View>

                  {/* Tarjeta de Evaluación de Retiro con Google Forms */}
                  <View
                    style={{
                      backgroundColor: '#ecfdf5',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#a7f3d0',
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <View style={{ flex: 1, minWidth: 240 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#065f46' }}>
                          Evaluación de Retiro de Servidores (2311300-FT-219)
                        </Text>
                        <Text style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                          Para facilitar y agilizar el diligenciamiento, el servidor puede completarlo en línea mediante el formulario oficial de Google Forms o descargar la plantilla en Excel.
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Pressable
                          onPress={handleAbrirEvaluacionRetiroGoogleForms}
                          style={{
                            backgroundColor: '#059669',
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Ionicons name="open-outline" size={13} color="#ffffff" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                            Diligenciar en Google Forms
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => handleDescargarFormatoOficial('2311300-FT-219 Evaluación de Rétiro V2 (3).xlsx')}
                          style={{
                            backgroundColor: '#ffffff',
                            borderWidth: 1,
                            borderColor: '#86efac',
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Ionicons name="download-outline" size={13} color="#166534" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>
                            Excel FT-219
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  {/* Fila de Formatos Adicionales de Retiro */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <Pressable
                      onPress={() => handleDescargarFormatoOficial('2311300-FT-436 ENTREGA DE CARGO POR AUSENCIA TEMPORAL O RETIRO DEFINITIVO (4).xlsx')}
                      style={{
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        flex: 1,
                        minWidth: 200,
                      }}
                    >
                      <Ionicons name="cube-outline" size={16} color="#0284c7" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate800 }}>
                          Entrega de Cargo (FT-436)
                        </Text>
                        <Text style={{ fontSize: 9.5, color: THEME.slate500 }}>
                          Plantilla en Excel para inventario y pendientes
                        </Text>
                      </View>
                      <Ionicons name="download-outline" size={13} color={THEME.slate600} />
                    </Pressable>

                    <Pressable
                      onPress={() => handleDescargarFormatoOficial('Acta de Informe de Gestión y Entrega de Cargo_V3 (5).docx')}
                      style={{
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        flex: 1,
                        minWidth: 200,
                      }}
                    >
                      <Ionicons name="ribbon-outline" size={16} color="#4f46e5" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate800 }}>
                          Acta Informe de Gestión
                        </Text>
                        <Text style={{ fontSize: 9.5, color: THEME.slate500 }}>
                          Word oficial (Ley 951 - Control Interno)
                        </Text>
                      </View>
                      <Ionicons name="download-outline" size={13} color={THEME.slate600} />
                    </Pressable>

                    <Pressable
                      onPress={() => handleDescargarFormatoOficial('Desvinculación de Servidores Públicos_V6_copia_controlada (3).pdf')}
                      style={{
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        flex: 1,
                        minWidth: 200,
                      }}
                    >
                      <Ionicons name="book-outline" size={16} color="#dc2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate800 }}>
                          Manual PR-074
                        </Text>
                        <Text style={{ fontSize: 9.5, color: THEME.slate500 }}>
                          Procedimiento de Desvinculación V6 (PDF)
                        </Text>
                      </View>
                      <Ionicons name="download-outline" size={13} color={THEME.slate600} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 5: MARCO NORMATIVO SJD                                 */}
          {/* ============================================================== */}
          {tabActiva === 'matriz_normativa' && (
            <View style={{ gap: 16, width: '100%' }}>
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 20,
                  gap: 12,
                }}
              >
                <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '700' }}>
                  Matriz Normativa Distrital de Procedimientos de Personal
                </Text>
                <Text style={{ color: THEME.slate600, fontSize: 12.5, lineHeight: 18 }}>
                  Sustento reglamentario aplicable a la Secretaría Jurídica Distrital conforme al
                  Modelo Integrado de Planeación y Gestión (MIPG).
                </Text>

                <View style={{ gap: 8, marginTop: 6 }}>
                  {[
                    {
                      proc: 'PR-145: Vinculación de Servidores Públicos',
                      desc: 'Reglamenta los nombramientos en Periodo de Prueba (Mérito CNSC), Ordinarios (LNR) y Provisionales en empleos de carrera.',
                    },
                    {
                      proc: 'PR-137: Vinculación Formativa',
                      desc: 'Lineamientos para practicantes universitarios, judicantes ad-honorem y remunerados en áreas del Distrito.',
                    },
                    {
                      proc: 'PR-074: Retiro de Servidores Públicos',
                      desc: 'Causales de retiro Art. 41 Ley 909/2004, circuito de paz y salvo, liquidación y reporte obligatorio en SIMO 4.4.',
                    },
                    {
                      proc: 'Art. 128 Constitución Política & SECOP II',
                      desc: 'Prohibición de desempeñar simultáneamente más de un empleo público o percibir más de una asignación del tesoro público.',
                    },
                  ].map((norma, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: THEME.slate50,
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                      }}
                    >
                      <Text style={{ color: THEME.marca800, fontSize: 13, fontWeight: '700' }}>
                        {norma.proc}
                      </Text>
                      <Text style={{ color: THEME.slate600, fontSize: 12, marginTop: 2 }}>
                        {norma.desc}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* =================================================================== */}
      {/* MODAL PARA CONSULTA RÁPIDA SECOP II DE UN CANDIDATO                */}
      {/* =================================================================== */}
      <Modal
        visible={secopModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSecopModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isTablet ? 24 : 12,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: THEME.slate200,
              width: '100%',
              maxWidth: 960,
              maxHeight: '92%',
              padding: isTablet ? 22 : 16,
              gap: 14,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            {/* Header del Modal */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottomWidth: 1,
                borderBottomColor: THEME.slate200,
                paddingBottom: 12,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      backgroundColor: THEME.marca50,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={20} color={THEME.marca700} />
                  </View>
                  <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '800' }}>
                    Reporte de Verificación Preventiva en SECOP II
                  </Text>
                </View>
                <Text style={{ color: THEME.slate600, fontSize: 12, marginLeft: 42 }}>
                  Aspirante: <Text style={{ fontWeight: '700', color: THEME.slate900 }}>{secopModalCandidato?.nombre}</Text> • Cédula: <Text style={{ fontWeight: '700', color: THEME.slate900 }}>{secopModalCandidato?.cedula}</Text> • Fuente: <Text style={{ fontStyle: 'italic' }}>datos.gov.co (Dataset jbjy-vk9h)</Text>
                </Text>
              </View>
              <Pressable
                onPress={() => setSecopModalVisible(false)}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  backgroundColor: THEME.slate100,
                }}
              >
                <Ionicons name="close" size={20} color={THEME.slate600} />
              </Pressable>
            </View>

            {/* Contenido con Scroll */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 14, paddingBottom: 10 }}
            >
              {secopCargando ? (
                <View style={{ padding: 50, alignItems: 'center', gap: 12 }}>
                  <ActivityIndicator size="large" color={THEME.marca600} />
                  <Text style={{ color: THEME.slate700, fontSize: 13, fontWeight: '700' }}>
                    Consultando contratos electrónicos en SECOP II y datos.gov.co...
                  </Text>
                  <Text style={{ color: THEME.slate500, fontSize: 11 }}>
                    Verificando estados de ejecución, entidades estatales y ordenadores del gasto
                  </Text>
                </View>
              ) : secopResultado ? (
                renderReporteSecopDetallado(
                  secopResultado,
                  secopModalCandidato,
                  secopModalFiltroTab,
                  setSecopModalFiltroTab,
                  true
                )
              ) : (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: THEME.slate500, fontSize: 13 }}>
                    No se han cargado datos para este postulante.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Footer con Botones */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTopWidth: 1,
                borderTopColor: THEME.slate100,
                paddingTop: 12,
              }}
            >
              <Text style={{ fontSize: 11, color: THEME.slate400 }}>
                Auditoría Preventiva SASGE-RRHH • Secretaría Jurídica Distrital
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {secopResultado && (
                  <Pressable
                    onPress={() =>
                      copiarDictamenSecop(
                        secopResultado,
                        secopModalCandidato?.nombre,
                        secopModalCandidato?.cedula
                      )
                    }
                    style={{
                      backgroundColor: copiadoSecop ? THEME.emeraldBg : THEME.slate100,
                      borderColor: copiadoSecop ? THEME.emeraldRing : THEME.slate200,
                      borderWidth: 1,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name={copiadoSecop ? 'checkmark-circle' : 'copy-outline'}
                      size={15}
                      color={copiadoSecop ? THEME.emeraldText : THEME.slate700}
                    />
                    <Text
                      style={{
                        color: copiadoSecop ? THEME.emeraldText : THEME.slate700,
                        fontWeight: '600',
                        fontSize: 12,
                      }}
                    >
                      {copiadoSecop ? '¡Dictamen Copiado!' : 'Copiar Dictamen'}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setSecopModalVisible(false)}
                  style={{
                    backgroundColor: THEME.marca600,
                    paddingHorizontal: 18,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: THEME.white, fontWeight: '700', fontSize: 12 }}>
                    Cerrar Reporte
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL PARA CREAR NUEVO TRÁMITE                                      */}
      {/* =================================================================== */}
      <Modal
        visible={modalRegistroVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalRegistroVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: THEME.slate200,
              width: '100%',
              maxWidth: 920,
              maxHeight: '90%',
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, paddingBottom: 10 }}
            >
              {/* Cabecera del Modal */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: THEME.slate100,
                  paddingBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: THEME.marca50,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="person-add-outline" size={20} color={THEME.marca600} />
                  </View>
                  <View>
                    <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '700' }}>
                      Registrar Nuevo Trámite de Personal
                    </Text>
                    <Text style={{ color: THEME.slate500, fontSize: 12 }}>
                      Vinculación y Desvinculación articulada con la base de Nómina
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    resetFormularioRegistro();
                    setModalRegistroVisible(false);
                  }}
                  style={{
                    padding: 6,
                    borderRadius: 8,
                    backgroundColor: THEME.slate100,
                  }}
                >
                  <Ionicons name="close" size={20} color={THEME.slate600} />
                </Pressable>
              </View>

              {/* Selector Tipo de Trámite */}
              <View>
                <Text
                  style={{
                    color: THEME.slate700,
                    fontSize: 12,
                    fontWeight: '700',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Tipo de Proceso
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(['VINCULACION', 'DESVINCULACION'] as const).map((t) => {
                    const activo = nuevoTipoProceso === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => {
                          setNuevoTipoProceso(t);
                          if (!nominaItemSeleccionado) {
                            setNominaTipoBusqueda(t === 'DESVINCULACION' ? 'SERVIDORES' : 'PLAZAS');
                          }
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          alignItems: 'center',
                          borderRadius: 10,
                          backgroundColor: activo ? THEME.marca600 : THEME.slate100,
                          borderWidth: 1,
                          borderColor: activo ? THEME.marca700 : THEME.slate200,
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        <Ionicons
                          name={t === 'VINCULACION' ? 'log-in-outline' : 'log-out-outline'}
                          size={18}
                          color={activo ? THEME.white : THEME.slate600}
                        />
                        <Text
                          style={{
                            color: activo ? THEME.white : THEME.slate700,
                            fontSize: 13,
                            fontWeight: '600',
                          }}
                        >
                          {t === 'VINCULACION' ? 'Vinculación de Personal' : 'Desvinculación / Retiro'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Selector Modo de Origen: Búsqueda en Nómina vs Ingreso Manual */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: THEME.slate100,
                  padding: 4,
                  borderRadius: 10,
                  gap: 4,
                }}
              >
                <Pressable
                  onPress={() => setModalModoEntrada('NOMINA')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor:
                      modalModoEntrada === 'NOMINA' ? THEME.white : 'transparent',
                    shadowColor: modalModoEntrada === 'NOMINA' ? '#000' : 'transparent',
                    shadowOpacity: modalModoEntrada === 'NOMINA' ? 0.06 : 0,
                    shadowRadius: 4,
                    elevation: modalModoEntrada === 'NOMINA' ? 2 : 0,
                  }}
                >
                  <Ionicons
                    name="search-circle"
                    size={18}
                    color={modalModoEntrada === 'NOMINA' ? THEME.marca600 : THEME.slate500}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: modalModoEntrada === 'NOMINA' ? THEME.marca900 : THEME.slate600,
                    }}
                  >
                    Búsqueda en Nómina Oficial
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setModalModoEntrada('MANUAL')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor:
                      modalModoEntrada === 'MANUAL' ? THEME.white : 'transparent',
                    shadowColor: modalModoEntrada === 'MANUAL' ? '#000' : 'transparent',
                    shadowOpacity: modalModoEntrada === 'MANUAL' ? 0.06 : 0,
                    shadowRadius: 4,
                    elevation: modalModoEntrada === 'MANUAL' ? 2 : 0,
                  }}
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={modalModoEntrada === 'MANUAL' ? THEME.marca600 : THEME.slate500}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: modalModoEntrada === 'MANUAL' ? THEME.marca900 : THEME.slate600,
                    }}
                  >
                    Ingreso Manual Libre
                  </Text>
                </Pressable>
              </View>

              {/* =================================================================== */}
              {/* SECCIÓN: BÚSQUEDA EN NÓMINA (SERVIDORES O PLAZAS)                   */}
              {/* =================================================================== */}
              {modalModoEntrada === 'NOMINA' && (
                <View
                  style={{
                    backgroundColor: THEME.marca50,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: THEME.marca100,
                    padding: 14,
                    gap: 12,
                  }}
                >
                  {/* Selector de tipo de búsqueda dentro de nómina */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: THEME.marca900, fontSize: 13, fontWeight: '700' }}>
                      Consultar Base de Nómina
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable
                        onPress={() => {
                          setNominaTipoBusqueda('PLAZAS');
                          if (nominaQuery.trim()) {
                            ejecutarBusquedaNomina(nominaQuery, 'PLAZAS');
                          }
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor:
                            nominaTipoBusqueda === 'PLAZAS' ? THEME.marca600 : THEME.white,
                          borderWidth: 1,
                          borderColor:
                            nominaTipoBusqueda === 'PLAZAS' ? THEME.marca600 : THEME.slate200,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color:
                              nominaTipoBusqueda === 'PLAZAS' ? THEME.white : THEME.slate700,
                          }}
                        >
                          Plazas / Vacantes
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setNominaTipoBusqueda('SERVIDORES');
                          if (nominaQuery.trim()) {
                            ejecutarBusquedaNomina(nominaQuery, 'SERVIDORES');
                          }
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor:
                            nominaTipoBusqueda === 'SERVIDORES' ? THEME.marca600 : THEME.white,
                          borderWidth: 1,
                          borderColor:
                            nominaTipoBusqueda === 'SERVIDORES' ? THEME.marca600 : THEME.slate200,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color:
                              nominaTipoBusqueda === 'SERVIDORES' ? THEME.white : THEME.slate700,
                          }}
                        >
                          Servidores (Perno)
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Barra de Búsqueda de Texto General */}
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: THEME.white,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        paddingHorizontal: 10,
                      }}
                    >
                      <Ionicons name="search" size={16} color={THEME.slate400} />
                      <TextInput
                        value={nominaQuery}
                        onChangeText={(t) => {
                          setNominaQuery(t);
                          ejecutarBusquedaNomina(t, nominaTipoBusqueda, nominaFiltroCargo, nominaFiltroGrado, nominaFiltroDependencia);
                        }}
                        placeholder={
                          nominaTipoBusqueda === 'PLAZAS'
                            ? 'Buscar por cargo, titular, cédula, código o ID plaza...'
                            : 'Buscar por cédula o nombre del funcionario...'
                        }
                        placeholderTextColor={THEME.slate400}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          paddingHorizontal: 8,
                          fontSize: 12,
                          color: THEME.slate900,
                        }}
                      />
                      {nominaQuery.length > 0 && (
                        <Pressable
                          onPress={() => {
                            setNominaQuery('');
                            if (nominaFiltroCargo || nominaFiltroGrado || nominaFiltroDependencia) {
                              ejecutarBusquedaNomina('', nominaTipoBusqueda, nominaFiltroCargo, nominaFiltroGrado, nominaFiltroDependencia);
                            } else {
                              setNominaResultadosServidores([]);
                              setNominaResultadosPlazas([]);
                            }
                          }}
                        >
                          <Ionicons name="close-circle" size={16} color={THEME.slate400} />
                        </Pressable>
                      )}
                    </View>

                    <Pressable
                      onPress={() => ejecutarBusquedaNomina(nominaQuery, nominaTipoBusqueda, nominaFiltroCargo, nominaFiltroGrado, nominaFiltroDependencia)}
                      style={{
                        backgroundColor: THEME.marca600,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {nominaCargando ? (
                        <ActivityIndicator size="small" color={THEME.white} />
                      ) : (
                        <Ionicons name="search-outline" size={15} color={THEME.white} />
                      )}
                      <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '600' }}>
                        Buscar
                      </Text>
                    </Pressable>
                  </View>

                  {/* Filtros específicos de Cargo, Grado y Dependencia */}
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Filtro: Cargo */}
                    <Pressable
                      onPress={() => {
                        setBusquedaSelectorCargo('');
                        setModalSelectorCargoVisible(true);
                      }}
                      style={{
                        flex: 1,
                        minWidth: 150,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: nominaFiltroCargo ? THEME.marca100 : THEME.white,
                        borderWidth: 1,
                        borderColor: nominaFiltroCargo ? THEME.marca600 : THEME.slate200,
                        paddingVertical: 7,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        gap: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' }}>
                        <Ionicons
                          name="briefcase-outline"
                          size={14}
                          color={nominaFiltroCargo ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 11,
                            fontWeight: nominaFiltroCargo ? '700' : '500',
                            color: nominaFiltroCargo ? THEME.marca900 : THEME.slate600,
                          }}
                        >
                          {nominaFiltroCargo ? nominaFiltroCargo : 'Cargo: Todos'}
                        </Text>
                      </View>
                      {nominaFiltroCargo ? (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            aplicarFiltroCargo('');
                          }}
                          style={{ padding: 2 }}
                        >
                          <Ionicons name="close-circle" size={15} color={THEME.marca700} />
                        </Pressable>
                      ) : (
                        <Ionicons name="chevron-down" size={13} color={THEME.slate400} />
                      )}
                    </Pressable>

                    {/* Filtro: Grado */}
                    <Pressable
                      onPress={() => setModalSelectorGradoVisible(true)}
                      style={{
                        flex: 1,
                        minWidth: 120,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: nominaFiltroGrado ? THEME.marca100 : THEME.white,
                        borderWidth: 1,
                        borderColor: nominaFiltroGrado ? THEME.marca600 : THEME.slate200,
                        paddingVertical: 7,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        gap: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Ionicons
                          name="ribbon-outline"
                          size={14}
                          color={nominaFiltroGrado ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 11,
                            fontWeight: nominaFiltroGrado ? '700' : '500',
                            color: nominaFiltroGrado ? THEME.marca900 : THEME.slate600,
                          }}
                        >
                          {nominaFiltroGrado ? `Grado ${nominaFiltroGrado}` : 'Grado: Todos'}
                        </Text>
                      </View>
                      {nominaFiltroGrado ? (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            aplicarFiltroGrado('');
                          }}
                          style={{ padding: 2 }}
                        >
                          <Ionicons name="close-circle" size={15} color={THEME.marca700} />
                        </Pressable>
                      ) : (
                        <Ionicons name="chevron-down" size={13} color={THEME.slate400} />
                      )}
                    </Pressable>

                    {/* Filtro: Dependencia */}
                    <Pressable
                      onPress={() => {
                        setBusquedaSelectorDependencia('');
                        setModalSelectorDependenciaVisible(true);
                      }}
                      style={{
                        flex: 1.2,
                        minWidth: 160,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: nominaFiltroDependencia ? THEME.marca100 : THEME.white,
                        borderWidth: 1,
                        borderColor: nominaFiltroDependencia ? THEME.marca600 : THEME.slate200,
                        paddingVertical: 7,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        gap: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' }}>
                        <Ionicons
                          name="business-outline"
                          size={14}
                          color={nominaFiltroDependencia ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 11,
                            fontWeight: nominaFiltroDependencia ? '700' : '500',
                            color: nominaFiltroDependencia ? THEME.marca900 : THEME.slate600,
                          }}
                        >
                          {nominaFiltroDependencia ? nominaFiltroDependencia : 'Dependencia: Todas'}
                        </Text>
                      </View>
                      {nominaFiltroDependencia ? (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            aplicarFiltroDependencia('');
                          }}
                          style={{ padding: 2 }}
                        >
                          <Ionicons name="close-circle" size={15} color={THEME.marca700} />
                        </Pressable>
                      ) : (
                        <Ionicons name="chevron-down" size={13} color={THEME.slate400} />
                      )}
                    </Pressable>

                    {/* Botón para restablecer filtros activos */}
                    {(!!nominaFiltroCargo || !!nominaFiltroGrado || !!nominaFiltroDependencia || !!nominaQuery) && (
                      <Pressable
                        onPress={limpiarFiltrosNomina}
                        style={{
                          backgroundColor: THEME.slate200,
                          paddingHorizontal: 9,
                          paddingVertical: 7,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Ionicons name="refresh" size={13} color={THEME.slate700} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate700 }}>
                          Limpiar
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Indicador de ítem de nómina actualmente seleccionado */}
                  {nominaItemSeleccionado && (
                    <View
                      style={{
                        backgroundColor: THEME.emeraldBg,
                        borderWidth: 1,
                        borderColor: THEME.emeraldRing,
                        borderRadius: 8,
                        padding: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="checkmark-circle" size={16} color={THEME.emeraldText} />
                          <Text
                            style={{
                              color: THEME.emeraldText,
                              fontSize: 12,
                              fontWeight: '700',
                            }}
                          >
                            Vinculado a Nómina: {nominaItemSeleccionado.titulo}
                          </Text>
                        </View>
                        <Text style={{ color: THEME.slate600, fontSize: 11, paddingLeft: 22 }}>
                          {nominaItemSeleccionado.detalle}
                        </Text>
                      </View>
                      <Pressable
                        onPress={limpiarSeleccionNomina}
                        style={{
                          backgroundColor: THEME.white,
                          borderWidth: 1,
                          borderColor: THEME.emeraldRing,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: THEME.emeraldText, fontSize: 11, fontWeight: '600' }}>
                          Quitar
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Lista de resultados de la búsqueda */}
                  {!nominaItemSeleccionado && (nominaQuery.trim().length > 0 || !!nominaFiltroCargo || !!nominaFiltroGrado || !!nominaFiltroDependencia) && (
                    <View style={{ gap: 6, maxHeight: 240 }}>
                      <Text style={{ color: THEME.slate600, fontSize: 11, fontWeight: '600' }}>
                        Resultados encontrados ({nominaTipoBusqueda === 'SERVIDORES' ? nominaResultadosServidores.length : nominaResultadosPlazas.length}):
                      </Text>
                      <ScrollView
                        nestedScrollEnabled={true}
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          maxHeight: 210,
                        }}
                      >
                        {nominaTipoBusqueda === 'SERVIDORES' &&
                          nominaResultadosServidores.map((item, idx) => (
                            <Pressable
                              key={`${item.cedula}-${idx}`}
                              onPress={() => seleccionarServidorNomina(item)}
                              style={({ pressed }) => ({
                                padding: 10,
                                borderBottomWidth:
                                  idx === nominaResultadosServidores.length - 1 ? 0 : 1,
                                borderBottomColor: THEME.slate100,
                                backgroundColor: pressed ? THEME.marca50 : THEME.white,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              })}
                            >
                              <View style={{ flex: 1, gap: 2 }}>
                                <Text
                                  style={{ color: THEME.slate900, fontSize: 12, fontWeight: '700' }}
                                >
                                  {item.nombre_completo ||
                                    `${item.nombres || ''} ${item.primer_apellido || ''}`}
                                </Text>
                                <Text style={{ color: THEME.slate500, fontSize: 11 }}>
                                  C.C. {item.cedula} • {item.cargo || item.plaza_cargo || 'Sin cargo'} • {item.dependencia || item.plaza_dependencia_cargo || 'SJD'}
                                  {item.plaza_id_plaza ? ` • Titular Plaza #${item.plaza_id_plaza}` : ''}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: THEME.marca50,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 6,
                                }}
                              >
                                <Text
                                  style={{ color: THEME.marca700, fontSize: 10, fontWeight: '700' }}
                                >
                                  Seleccionar
                                </Text>
                              </View>
                            </Pressable>
                          ))}

                        {nominaTipoBusqueda === 'PLAZAS' &&
                          nominaResultadosPlazas.map((plaza, idx) => (
                            <Pressable
                              key={`${plaza.id_plaza}-${idx}`}
                              onPress={() => seleccionarPlazaNomina(plaza)}
                              style={({ pressed }) => ({
                                padding: 10,
                                borderBottomWidth:
                                  idx === nominaResultadosPlazas.length - 1 ? 0 : 1,
                                borderBottomColor: THEME.slate100,
                                backgroundColor: pressed ? THEME.marca50 : THEME.white,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 10,
                              })}
                            >
                              <View style={{ flex: 1, gap: 4 }}>
                                {/* Encabezado de la Plaza y Estado */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <Text
                                    style={{
                                      color: THEME.slate900,
                                      fontSize: 12,
                                      fontWeight: '700',
                                    }}
                                  >
                                    Plaza #{plaza.id_plaza}: {plaza.cargo}
                                  </Text>
                                  <View
                                    style={{
                                      backgroundColor:
                                        plaza.estado_cargo === 'VACANTE DEFINITIVA'
                                          ? THEME.roseBg
                                          : plaza.estado_cargo === 'VACANTE TEMPORAL'
                                          ? THEME.amberBg
                                          : THEME.emeraldBg,
                                      paddingHorizontal: 6,
                                      paddingVertical: 1,
                                      borderRadius: 4,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 9,
                                        fontWeight: '700',
                                        color:
                                          plaza.estado_cargo === 'VACANTE DEFINITIVA'
                                            ? THEME.roseText
                                            : plaza.estado_cargo === 'VACANTE TEMPORAL'
                                            ? THEME.amberText
                                            : THEME.emeraldText,
                                      }}
                                    >
                                      {plaza.estado_cargo}
                                    </Text>
                                  </View>
                                </View>

                                {/* Código, Grado y Dependencia */}
                                <Text style={{ color: THEME.slate500, fontSize: 11 }}>
                                  Cód: {plaza.codigo || 'N/A'} Gr: {plaza.grado || 'N/A'} • {plaza.dependencia_cargo}
                                </Text>

                                {/* TITULAR DEL CARGO EN RESULTADOS */}
                                {plaza.titular_nombre ? (
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 6,
                                      backgroundColor: THEME.slate50,
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 6,
                                    }}
                                  >
                                    <Ionicons name="person" size={13} color={THEME.marca700} />
                                    <Text style={{ color: THEME.slate800, fontSize: 11, flex: 1 }}>
                                      <Text style={{ fontWeight: '700', color: THEME.slate900 }}>Titular: </Text>
                                      {plaza.titular_nombre}
                                      {plaza.titular_cedula ? ` (C.C. ${plaza.titular_cedula})` : ''}
                                    </Text>
                                    {plaza.situacion_titular && (
                                      <View
                                        style={{
                                          backgroundColor: THEME.marca100,
                                          paddingHorizontal: 5,
                                          paddingVertical: 1,
                                          borderRadius: 4,
                                        }}
                                      >
                                        <Text style={{ fontSize: 9, fontWeight: '700', color: THEME.marca800 }}>
                                          {plaza.situacion_titular}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                ) : (
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 6,
                                      backgroundColor: THEME.roseBg,
                                      paddingHorizontal: 8,
                                      paddingVertical: 3,
                                      borderRadius: 6,
                                    }}
                                  >
                                    <Ionicons name="person-remove-outline" size={13} color={THEME.roseText} />
                                    <Text style={{ color: THEME.roseText, fontSize: 11, fontWeight: '600' }}>
                                      Sin titular asignado (Plaza vacante disponible para vinculación)
                                    </Text>
                                  </View>
                                )}

                                {/* Funcionario en Encargo (si aplica) */}
                                {plaza.es_encargo && plaza.encargo_nombre && (
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 6,
                                      backgroundColor: THEME.amberBg,
                                      paddingHorizontal: 8,
                                      paddingVertical: 3,
                                      borderRadius: 6,
                                    }}
                                  >
                                    <Ionicons name="repeat-outline" size={13} color={THEME.amberText} />
                                    <Text style={{ color: THEME.amberText, fontSize: 11, fontWeight: '600' }}>
                                      Encargo: {plaza.encargo_nombre} {plaza.encargo_cedula ? `(C.C. ${plaza.encargo_cedula})` : ''}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* Botón Seleccionar */}
                              <View
                                style={{
                                  backgroundColor: THEME.marca50,
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 6,
                                }}
                              >
                                <Text
                                  style={{ color: THEME.marca700, fontSize: 11, fontWeight: '700' }}
                                >
                                  Seleccionar
                                </Text>
                              </View>
                            </Pressable>
                          ))}

                        {((nominaTipoBusqueda === 'SERVIDORES' &&
                          nominaResultadosServidores.length === 0) ||
                          (nominaTipoBusqueda === 'PLAZAS' &&
                            nominaResultadosPlazas.length === 0)) &&
                          !nominaCargando && (
                            <View style={{ padding: 12, alignItems: 'center' }}>
                              <Text style={{ color: THEME.slate400, fontSize: 11 }}>
                                No se encontraron registros coincidentes en nómina.
                              </Text>
                            </View>
                          )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {/* =================================================================== */}
              {/* FORMULARIO DE DETALLES DEL TRÁMITE                                  */}
              {/* =================================================================== */}
              <View style={{ gap: 10 }}>
                <Text
                  style={{
                    color: THEME.slate700,
                    fontSize: 12,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Datos del Servidor y Cargo
                </Text>

                <View style={{ gap: 8 }}>
                  <View>
                    <Text style={{ color: THEME.slate600, fontSize: 11, marginBottom: 4 }}>
                      Nombre Completo del Servidor o Postulante *
                    </Text>
                    <TextInput
                      value={nombreInput}
                      onChangeText={setNombreInput}
                      placeholder="Ej. MARÍA FERNANDA RAMÍREZ..."
                      placeholderTextColor={THEME.slate400}
                      style={{
                        backgroundColor: THEME.slate50,
                        color: THEME.slate900,
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        fontSize: 13,
                      }}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: THEME.slate600, fontSize: 11, marginBottom: 4 }}>
                        Cédula de Ciudadanía *
                      </Text>
                      <TextInput
                        value={cedulaInput}
                        onChangeText={setCedulaInput}
                        keyboardType="numeric"
                        placeholder="Ej. 1018475892"
                        placeholderTextColor={THEME.slate400}
                        style={{
                          backgroundColor: THEME.slate50,
                          color: THEME.slate900,
                          padding: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          fontSize: 13,
                        }}
                      />
                    </View>

                    <View style={{ flex: 1.5 }}>
                      <Text style={{ color: THEME.slate600, fontSize: 11, marginBottom: 4 }}>
                        Denominación del Cargo *
                      </Text>
                      <TextInput
                        value={cargoInput}
                        onChangeText={setCargoInput}
                        placeholder="Ej. PROFESIONAL ESPECIALIZADO 222-19"
                        placeholderTextColor={THEME.slate400}
                        style={{
                          backgroundColor: THEME.slate50,
                          color: THEME.slate900,
                          padding: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          fontSize: 13,
                        }}
                      />
                    </View>
                  </View>

                  <View>
                    <Text style={{ color: THEME.slate600, fontSize: 11, marginBottom: 4 }}>
                      Dependencia Institucional
                    </Text>
                    <TextInput
                      value={dependenciaInput}
                      onChangeText={setDependenciaInput}
                      placeholder="Ej. DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS"
                      placeholderTextColor={THEME.slate400}
                      style={{
                        backgroundColor: THEME.slate50,
                        color: THEME.slate900,
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        fontSize: 13,
                      }}
                    />
                  </View>

                  {/* Modalidad de Personal */}
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ color: THEME.slate600, fontSize: 11, marginBottom: 6 }}>
                      Modalidad de Vinculación / Nombramiento
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {(
                        [
                          { key: 'CARRERA_ADMINISTRATIVA', label: 'Carrera Administrativa' },
                          { key: 'LIBRE_NOMBRAMIENTO', label: 'Libre Nombramiento' },
                          { key: 'PROVISIONALIDAD', label: 'Provisionalidad' },
                          { key: 'PRACTICANTE_JUDICANTE', label: 'Judicante / Practicante' },
                        ] as const
                      ).map((m) => {
                        const sel = nuevaModalidad === m.key;
                        return (
                          <Pressable
                            key={m.key}
                            onPress={() => setNuevaModalidad(m.key)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 7,
                              backgroundColor: sel ? THEME.marca100 : THEME.slate50,
                              borderWidth: 1,
                              borderColor: sel ? THEME.marca600 : THEME.slate200,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: sel ? '700' : '500',
                                color: sel ? THEME.marca900 : THEME.slate600,
                              }}
                            >
                              {m.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Causal de Retiro (Solo si es DESVINCULACIÓN) */}
                  {nuevoTipoProceso === 'DESVINCULACION' && (
                    <View style={{ marginTop: 6, gap: 4 }}>
                      <Text style={{ color: THEME.slate700, fontSize: 11, fontWeight: '700' }}>
                        Causal Normativa de Retiro (PR-145 / Ley 909 de 2004) *
                      </Text>
                      <View
                        style={{
                          backgroundColor: THEME.slate50,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          maxHeight: 120,
                        }}
                      >
                        <ScrollView nestedScrollEnabled={true} style={{ padding: 4 }}>
                          {(CAUSALES_RETIRO_POR_MODALIDAD[nuevaModalidad] || CAUSALES_RETIRO).map((causal) => {
                            const act = causalInput === causal;
                            return (
                              <Pressable
                                key={causal}
                                onPress={() => setCausalInput(causal)}
                                style={{
                                  paddingVertical: 6,
                                  paddingHorizontal: 8,
                                  borderRadius: 6,
                                  backgroundColor: act ? THEME.marca50 : 'transparent',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <Ionicons
                                  name={act ? 'radio-button-on' : 'radio-button-off'}
                                  size={14}
                                  color={act ? THEME.marca600 : THEME.slate400}
                                />
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: act ? THEME.marca900 : THEME.slate600,
                                    fontWeight: act ? '700' : '400',
                                    flex: 1,
                                  }}
                                >
                                  {causal}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Botones de Acción */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 6,
                  borderTopWidth: 1,
                  borderTopColor: THEME.slate100,
                  paddingTop: 12,
                }}
              >
                <Pressable
                  onPress={() => {
                    resetFormularioRegistro();
                    setModalRegistroVisible(false);
                  }}
                  style={{
                    backgroundColor: THEME.slate100,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: THEME.slate700, fontWeight: '600', fontSize: 12 }}>
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleCrearTramite}
                  style={{
                    backgroundColor: THEME.marca600,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ionicons name="checkmark" size={16} color={THEME.white} />
                  <Text style={{ color: THEME.white, fontWeight: '600', fontSize: 12 }}>
                    Crear Trámite
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL SELECTOR DE CARGO (REGLA: MODALS EN LUGAR DE ALERTS)          */}
      {/* =================================================================== */}
      <Modal
        visible={modalSelectorCargoVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalSelectorCargoVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: THEME.slate200,
              width: '100%',
              maxWidth: 520,
              maxHeight: '85%',
              padding: 18,
              gap: 12,
            }}
          >
            {/* Cabecera */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: THEME.slate100,
                paddingBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    backgroundColor: THEME.marca50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="briefcase" size={18} color={THEME.marca600} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900 }}>
                    Filtrar por Cargo
                  </Text>
                  <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                    Seleccione un cargo de la planta de personal
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setModalSelectorCargoVisible(false)}
                style={{ padding: 6, borderRadius: 6, backgroundColor: THEME.slate100 }}
              >
                <Ionicons name="close" size={18} color={THEME.slate600} />
              </Pressable>
            </View>

            {/* Buscador de cargos */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: THEME.slate50,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: THEME.slate200,
                paddingHorizontal: 10,
              }}
            >
              <Ionicons name="search" size={15} color={THEME.slate400} />
              <TextInput
                value={busquedaSelectorCargo}
                onChangeText={setBusquedaSelectorCargo}
                placeholder="Buscar cargo en la lista..."
                placeholderTextColor={THEME.slate400}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  paddingHorizontal: 8,
                  fontSize: 12,
                  color: THEME.slate900,
                }}
              />
              {busquedaSelectorCargo.length > 0 && (
                <Pressable onPress={() => setBusquedaSelectorCargo('')}>
                  <Ionicons name="close-circle" size={15} color={THEME.slate400} />
                </Pressable>
              )}
            </View>

            {/* Opción Todos los Cargos */}
            <Pressable
              onPress={() => aplicarFiltroCargo('')}
              style={{
                padding: 10,
                borderRadius: 8,
                backgroundColor: !nominaFiltroCargo ? THEME.marca50 : THEME.white,
                borderWidth: 1,
                borderColor: !nominaFiltroCargo ? THEME.marca600 : THEME.slate200,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={!nominaFiltroCargo ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={!nominaFiltroCargo ? THEME.marca600 : THEME.slate400}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: !nominaFiltroCargo ? '700' : '600',
                    color: !nominaFiltroCargo ? THEME.marca900 : THEME.slate700,
                  }}
                >
                  Todos los Cargos (Sin filtro)
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: THEME.slate400 }}>
                {listaCargosNomina.reduce((acc, curr) => acc + curr.count, 0)} plazas
              </Text>
            </Pressable>

            {/* Lista Scrolleable de Cargos */}
            <ScrollView
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ gap: 6 }}
            >
              {listaCargosNomina
                .filter((c) =>
                  !busquedaSelectorCargo.trim() ||
                  c.etiqueta.toLowerCase().includes(busquedaSelectorCargo.trim().toLowerCase())
                )
                .map((c) => {
                  const seleccionado = nominaFiltroCargo.toUpperCase() === c.valor.toUpperCase();
                  return (
                    <Pressable
                      key={c.valor}
                      onPress={() => aplicarFiltroCargo(c.valor)}
                      style={({ pressed }) => ({
                        padding: 9,
                        borderRadius: 8,
                        backgroundColor: seleccionado
                          ? THEME.marca50
                          : pressed
                          ? THEME.slate50
                          : THEME.white,
                        borderWidth: 1,
                        borderColor: seleccionado ? THEME.marca600 : THEME.slate100,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      })}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: seleccionado ? '700' : '600',
                            color: seleccionado ? THEME.marca900 : THEME.slate800,
                          }}
                        >
                          {c.etiqueta}
                        </Text>
                        <Text style={{ fontSize: 10, color: THEME.slate500 }}>
                          {c.count} plaza(s) asignadas en planta
                        </Text>
                      </View>
                      {seleccionado && (
                        <Ionicons name="checkmark-circle" size={18} color={THEME.marca600} />
                      )}
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL SELECTOR DE GRADO (REGLA: MODALS EN LUGAR DE ALERTS)          */}
      {/* =================================================================== */}
      <Modal
        visible={modalSelectorGradoVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalSelectorGradoVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: THEME.slate200,
              width: '100%',
              maxWidth: 480,
              maxHeight: '80%',
              padding: 18,
              gap: 12,
            }}
          >
            {/* Cabecera */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: THEME.slate100,
                paddingBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    backgroundColor: THEME.marca50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="ribbon" size={18} color={THEME.marca600} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900 }}>
                    Filtrar por Grado Salarial
                  </Text>
                  <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                    Seleccione el grado salarial del cargo
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setModalSelectorGradoVisible(false)}
                style={{ padding: 6, borderRadius: 6, backgroundColor: THEME.slate100 }}
              >
                <Ionicons name="close" size={18} color={THEME.slate600} />
              </Pressable>
            </View>

            {/* Opción Todos los Grados */}
            <Pressable
              onPress={() => aplicarFiltroGrado('')}
              style={{
                padding: 10,
                borderRadius: 8,
                backgroundColor: !nominaFiltroGrado ? THEME.marca50 : THEME.white,
                borderWidth: 1,
                borderColor: !nominaFiltroGrado ? THEME.marca600 : THEME.slate200,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={!nominaFiltroGrado ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={!nominaFiltroGrado ? THEME.marca600 : THEME.slate400}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: !nominaFiltroGrado ? '700' : '600',
                    color: !nominaFiltroGrado ? THEME.marca900 : THEME.slate700,
                  }}
                >
                  Todos los Grados (Sin filtro)
                </Text>
              </View>
            </Pressable>

            {/* Cuadrícula de Grados */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
              Grados Disponibles en Planta:
            </Text>
            <ScrollView
              style={{ maxHeight: 280 }}
              contentContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {listaGradosNomina.map((g) => {
                const seleccionado =
                  nominaFiltroGrado === g.valor ||
                  nominaFiltroGrado.padStart(2, '0') === g.valor.padStart(2, '0');
                return (
                  <Pressable
                    key={g.valor}
                    onPress={() => aplicarFiltroGrado(g.valor)}
                    style={{
                      flexBasis: '30%',
                      flexGrow: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: seleccionado ? THEME.marca600 : THEME.slate50,
                      borderWidth: 1,
                      borderColor: seleccionado ? THEME.marca700 : THEME.slate200,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: seleccionado ? THEME.white : THEME.slate800,
                      }}
                    >
                      Grado {g.valor}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: seleccionado ? THEME.marca100 : THEME.slate500,
                      }}
                    >
                      {g.count} plaza(s)
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL SELECTOR DE DEPENDENCIA (REGLA: MODALS EN LUGAR DE ALERTS)   */}
      {/* =================================================================== */}
      <Modal
        visible={modalSelectorDependenciaVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalSelectorDependenciaVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: THEME.slate200,
              width: '100%',
              maxWidth: 540,
              maxHeight: '85%',
              padding: 18,
              gap: 12,
            }}
          >
            {/* Cabecera */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: THEME.slate100,
                paddingBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    backgroundColor: THEME.marca50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="business" size={18} color={THEME.marca600} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900 }}>
                    Filtrar por Dependencia
                  </Text>
                  <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                    Seleccione un área o dependencia institucional
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setModalSelectorDependenciaVisible(false)}
                style={{ padding: 6, borderRadius: 6, backgroundColor: THEME.slate100 }}
              >
                <Ionicons name="close" size={18} color={THEME.slate600} />
              </Pressable>
            </View>

            {/* Buscador de dependencias */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: THEME.slate50,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: THEME.slate200,
                paddingHorizontal: 10,
              }}
            >
              <Ionicons name="search" size={15} color={THEME.slate400} />
              <TextInput
                value={busquedaSelectorDependencia}
                onChangeText={setBusquedaSelectorDependencia}
                placeholder="Buscar dependencia en la lista..."
                placeholderTextColor={THEME.slate400}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  paddingHorizontal: 8,
                  fontSize: 12,
                  color: THEME.slate900,
                }}
              />
              {busquedaSelectorDependencia.length > 0 && (
                <Pressable onPress={() => setBusquedaSelectorDependencia('')}>
                  <Ionicons name="close-circle" size={15} color={THEME.slate400} />
                </Pressable>
              )}
            </View>

            {/* Opción Todas las Dependencias */}
            <Pressable
              onPress={() => aplicarFiltroDependencia('')}
              style={{
                padding: 10,
                borderRadius: 8,
                backgroundColor: !nominaFiltroDependencia ? THEME.marca50 : THEME.white,
                borderWidth: 1,
                borderColor: !nominaFiltroDependencia ? THEME.marca600 : THEME.slate200,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={!nominaFiltroDependencia ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={!nominaFiltroDependencia ? THEME.marca600 : THEME.slate400}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: !nominaFiltroDependencia ? '700' : '600',
                    color: !nominaFiltroDependencia ? THEME.marca900 : THEME.slate700,
                  }}
                >
                  Todas las Dependencias (Sin filtro)
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: THEME.slate400 }}>
                {listaDependenciasNomina.reduce((acc, curr) => acc + curr.count, 0)} plazas
              </Text>
            </Pressable>

            {/* Lista Scrolleable de Dependencias */}
            <ScrollView
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ gap: 6 }}
            >
              {listaDependenciasNomina
                .filter((d) =>
                  !busquedaSelectorDependencia.trim() ||
                  d.etiqueta.toLowerCase().includes(busquedaSelectorDependencia.trim().toLowerCase())
                )
                .map((d) => {
                  const seleccionado = nominaFiltroDependencia.toUpperCase() === d.valor.toUpperCase();
                  return (
                    <Pressable
                      key={d.valor}
                      onPress={() => aplicarFiltroDependencia(d.valor)}
                      style={({ pressed }) => ({
                        padding: 9,
                        borderRadius: 8,
                        backgroundColor: seleccionado
                          ? THEME.marca50
                          : pressed
                          ? THEME.slate50
                          : THEME.white,
                        borderWidth: 1,
                        borderColor: seleccionado ? THEME.marca600 : THEME.slate100,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      })}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: seleccionado ? '700' : '600',
                            color: seleccionado ? THEME.marca900 : THEME.slate800,
                          }}
                        >
                          {d.etiqueta}
                        </Text>
                        <Text style={{ fontSize: 10, color: THEME.slate500 }}>
                          {d.count} plaza(s) asignadas
                        </Text>
                      </View>
                      {seleccionado && (
                        <Ionicons name="checkmark-circle" size={18} color={THEME.marca600} />
                      )}
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL DE CIERRE Y OBSERVACIONES DE REQUISITO                         */}
      {/* =================================================================== */}
      <Modal
        visible={modalObsReqVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalObsReqVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: THEME.slate200,
              width: '100%',
              maxWidth: 580,
              maxHeight: '90%',
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {/* Cabecera del Modal */}
            <View
              style={{
                backgroundColor: THEME.marca900,
                paddingHorizontal: 18,
                paddingVertical: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="document-text-outline" size={20} color={THEME.white} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: THEME.white, fontSize: 14, fontWeight: '700' }}>
                    {modalReqContext?.req.cumplido ? 'Detalle y Observaciones del Requisito' : 'Cierre y Registro de Observaciones'}
                  </Text>
                  <Text style={{ color: THEME.marca100, fontSize: 11, marginTop: 1 }}>
                    Fase {modalReqContext?.etapaNumero}: {modalReqContext?.etapaTitulo}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setModalObsReqVisible(false)}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={20} color={THEME.white} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
              {/* Información del Requisito */}
              <View
                style={{
                  backgroundColor: THEME.slate50,
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900, flex: 1, marginRight: 8 }}>
                    {modalReqContext?.req.label}
                  </Text>

                  <View
                    style={{
                      backgroundColor: modalReqContext?.req.cumplido ? THEME.emeraldBg : THEME.amberBg,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: modalReqContext?.req.cumplido ? THEME.emeraldText : THEME.amberText,
                      }}
                    >
                      {modalReqContext?.req.cumplido ? 'CUMPLIDO' : 'PENDIENTE'}
                    </Text>
                  </View>
                </View>

                {modalReqContext?.req.codigoFormato && (
                  <Text style={{ fontSize: 11, color: THEME.slate600, fontWeight: '600' }}>
                    📄 Formato Institucional: {modalReqContext.req.codigoFormato}
                  </Text>
                )}

                {modalReqContext?.req.norma && (
                    <View style={{ backgroundColor: THEME.marca50, padding: 9, borderRadius: 6, marginTop: 4, borderWidth: 1, borderColor: THEME.marca100 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca800 }}>
                        ⚖️ Fundamento Jurídico Aplicable: {modalReqContext.req.norma}
                      </Text>
                      {modalReqContext.req.textoNormativo ? (
                        <View
                          style={{
                            backgroundColor: THEME.white,
                            borderLeftWidth: 3,
                            borderLeftColor: THEME.marca700,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            borderRadius: 4,
                            marginTop: 5,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.marca800, marginBottom: 2 }}>
                            📜 Mandato Legal & Texto Normativo Incluido:
                          </Text>
                          <Text style={{ fontSize: 10.5, color: THEME.slate800, fontStyle: 'italic', lineHeight: 15 }}>
                            «{modalReqContext.req.textoNormativo}»
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                {modalReqContext?.req.detalleProcedimiento && (
                  <View style={{ marginTop: 2 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.slate700 }}>
                      📋 Instrucción Operativa para Talento Humano:
                    </Text>
                    <Text style={{ fontSize: 10.5, color: THEME.slate600, marginTop: 2, lineHeight: 15 }}>
                      {modalReqContext.req.detalleProcedimiento}
                    </Text>
                  </View>
                )}
              </View>

              {/* ============================================================== */}
              {/* FORMATOS INSTITUCIONALES OFICIALES APLICABLES AL REQUISITO     */}
              {/* ============================================================== */}
              {(() => {
                const reqId = modalReqContext?.req.id || '';
                const reqCodigo = modalReqContext?.req.codigoFormato || '';
                const reqLabel = (modalReqContext?.req.label || '').toLowerCase();

                // Buscar formatos relacionados
                const formatosSugeridos = LISTA_FORMATOS_OFICIALES.filter((f) => {
                  if (f.requisitosAsociados && f.requisitosAsociados.includes(reqId)) return true;
                  if (reqCodigo && f.codigo.includes(reqCodigo)) return true;
                  if (reqLabel.includes('confidencialidad') && f.id === 'FT-268') return true;
                  if (reqLabel.includes('retiro') && (f.id === 'FT-219' || f.id === 'FT-436')) return true;
                  if (reqLabel.includes('posesión') && f.id === 'FT-127') return true;
                  if (reqLabel.includes('entrenamiento') && f.id === 'FT-106') return true;
                  if (reqLabel.includes('antecedentes') && f.id === 'FT-027') return true;
                  if (reqLabel.includes('títulos') && f.id === 'FT-319') return true;
                  if (reqLabel.includes('entrega de cargo') && (f.id === 'FT-436' || f.id === 'ACTA-LEY-951')) return true;
                  return false;
                });

                const esEvaluacionRetiro = reqLabel.includes('retiro') || reqId.includes('4_3') || reqId.includes('4_2');

                return (
                  <View
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="folder-outline" size={16} color={THEME.marca700} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.slate900 }}>
                          Plantillas y Formatos Oficiales del Proceso
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setModalFormatosVisible(true)}
                        style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: THEME.marca50 }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.marca700 }}>
                          Ver Catálogo Completo
                        </Text>
                      </Pressable>
                    </View>

                    {/* Si aplica Evaluación de Retiro, botón prominente para Google Forms */}
                    {esEvaluacionRetiro && (
                      <View
                        style={{
                          backgroundColor: '#ecfdf5',
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#a7f3d0',
                          padding: 10,
                          flexDirection: isTablet ? 'row' : 'column',
                          justifyContent: 'space-between',
                          alignItems: isTablet ? 'center' : 'flex-start',
                          gap: 8,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#065f46' }}>
                            📝 Formulario de Evaluación de Retiro (En Línea)
                          </Text>
                          <Text style={{ fontSize: 10.5, color: '#047857', marginTop: 2 }}>
                            Facilita el diligenciamiento ágil para el servidor saliente mediante Google Forms oficial.
                          </Text>
                        </View>
                        <Pressable
                          onPress={handleAbrirEvaluacionRetiroGoogleForms}
                          style={{
                            backgroundColor: '#059669',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Ionicons name="open-outline" size={13} color="#ffffff" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                            Abrir Google Forms
                          </Text>
                        </Pressable>
                      </View>
                    )}

                    {formatosSugeridos.length > 0 ? (
                      <View style={{ gap: 6 }}>
                        {formatosSugeridos.map((fmt) => (
                          <View
                            key={fmt.id}
                            style={{
                              backgroundColor: THEME.white,
                              borderRadius: 6,
                              padding: 8,
                              borderWidth: 1,
                              borderColor: THEME.slate200,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <View
                                  style={{
                                    backgroundColor: fmt.tipo === 'XLSX' ? '#dcfce7' : fmt.tipo === 'PDF' ? '#fee2e2' : '#e0e7ff',
                                    paddingHorizontal: 4,
                                    paddingVertical: 1,
                                    borderRadius: 3,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      fontWeight: '800',
                                      color: fmt.tipo === 'XLSX' ? '#166534' : fmt.tipo === 'PDF' ? '#991b1b' : '#3730a3',
                                    }}
                                  >
                                    {fmt.tipo}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate800 }}>
                                  {fmt.codigo}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 10.5, color: THEME.slate600, marginTop: 1 }} numberOfLines={1}>
                                {fmt.nombre}
                              </Text>
                            </View>

                            <Pressable
                              onPress={() => handleDescargarFormatoOficial(fmt.archivo)}
                              style={{
                                backgroundColor: THEME.marca50,
                                borderWidth: 1,
                                borderColor: THEME.marca100,
                                paddingHorizontal: 9,
                                paddingVertical: 4.5,
                                borderRadius: 5,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Ionicons name="download-outline" size={12} color={THEME.marca700} />
                              <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.marca700 }}>
                                Descargar
                              </Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, color: THEME.slate500, fontStyle: 'italic' }}>
                          Descargue aquí cualquier plantilla oficial del proceso de talento humano.
                        </Text>
                        <Pressable
                          onPress={() => setModalFormatosVisible(true)}
                          style={{
                            backgroundColor: THEME.slate100,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ fontSize: 10.5, fontWeight: '600', color: THEME.slate700 }}>
                            Ver Formatos
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Formulario de Observaciones y Soporte */}
              <View style={{ gap: 12 }}>
                {/* Campo de Observaciones Multilínea */}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.slate800 }}>
                    Observaciones / Justificación / Novedad del Cierre:
                  </Text>
                  <TextInput
                    value={obsReqTexto}
                    onChangeText={setObsReqTexto}
                    placeholder="Escriba aquí los detalles, constancias, observaciones o aclaraciones sobre el cumplimiento de este requisito..."
                    placeholderTextColor={THEME.slate400}
                    multiline
                    numberOfLines={4}
                    style={{
                      backgroundColor: THEME.white,
                      borderWidth: 1,
                      borderColor: THEME.slate300,
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 12.5,
                      color: THEME.slate900,
                      textAlignVertical: 'top',
                      minHeight: 85,
                    }}
                  />
                </View>

                {/* Radicado o Documento de Soporte */}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.slate800 }}>
                    Número de Radicado, Acta o Memorando de Soporte (Opcional):
                  </Text>
                  <TextInput
                    value={obsReqRadicado}
                    onChangeText={setObsReqRadicado}
                    placeholder="Ej. Radicado 2026-ER-01948 / Acta No. 04 / Resolución 042"
                    placeholderTextColor={THEME.slate400}
                    style={{
                      backgroundColor: THEME.white,
                      borderWidth: 1,
                      borderColor: THEME.slate300,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 12.5,
                      color: THEME.slate900,
                    }}
                  />
                </View>

                {/* Fecha de Cumplimiento / Registro */}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.slate800 }}>
                    Fecha de Cumplimiento / Registro:
                  </Text>
                  <TextInput
                    value={obsReqFecha}
                    onChangeText={setObsReqFecha}
                    placeholder="AAAA-MM-DD (ej: 2026-04-05)"
                    placeholderTextColor={THEME.slate400}
                    style={{
                      backgroundColor: THEME.white,
                      borderWidth: 1,
                      borderColor: THEME.slate300,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 12.5,
                      color: THEME.slate900,
                    }}
                  />
                </View>

                {/* Checkbox selector de Cumplimiento */}
                <Pressable
                  onPress={() => setObsReqMarcarCumplido(!obsReqMarcarCumplido)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 6,
                  }}
                >
                  <Ionicons
                    name={obsReqMarcarCumplido ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={obsReqMarcarCumplido ? THEME.emeraldText : THEME.slate400}
                  />
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800 }}>
                    {obsReqMarcarCumplido
                      ? 'Marcar requisito como CUMPLIDO al guardar'
                      : 'Dejar requisito como PENDIENTE (solo registrar observación)'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>

            {/* Botones de Acción del Modal */}
            <View
              style={{
                backgroundColor: THEME.slate50,
                padding: 14,
                borderTopWidth: 1,
                borderTopColor: THEME.slate200,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {modalReqContext?.req.cumplido ? (
                <Pressable
                  onPress={() => guardarObservacionRequisito(false)}
                  style={{
                    backgroundColor: THEME.roseBg,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: THEME.roseRing,
                  }}
                >
                  <Text style={{ color: THEME.roseText, fontSize: 11.5, fontWeight: '600' }}>
                    Reabrir (Marcar Pendiente)
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setModalObsReqVisible(false)}
                  style={{
                    backgroundColor: THEME.slate100,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: THEME.slate300,
                  }}
                >
                  <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '600' }}>
                    Cancelar
                  </Text>
                </Pressable>
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => guardarObservacionRequisito()}
                  style={{
                    backgroundColor: THEME.marca600,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ionicons name="save-outline" size={15} color={THEME.white} />
                  <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '700' }}>
                    Guardar y Confirmar
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL DE OBSERVACIONES A NIVEL DE FASE                              */}
      {/* =================================================================== */}
      <Modal
        visible={modalObsFaseVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalObsFaseVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: THEME.slate200,
              width: '100%',
              maxWidth: 520,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <View
              style={{
                backgroundColor: THEME.marca900,
                paddingHorizontal: 18,
                paddingVertical: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={THEME.white} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: THEME.white, fontSize: 14, fontWeight: '700' }}>
                    Observaciones Generales de la Fase
                  </Text>
                  <Text style={{ color: THEME.marca100, fontSize: 11 }}>
                    Fase {modalFaseContext?.etapa.numero}: {modalFaseContext?.etapa.titulo}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setModalObsFaseVisible(false)}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={20} color={THEME.white} />
              </Pressable>
            </View>

            <View style={{ padding: 18, gap: 12 }}>
              <Text style={{ fontSize: 12, color: THEME.slate600 }}>
                Registre observaciones o notas consolidadas que apliquen al desarrollo general de esta fase en el expediente institucional:
              </Text>

              <TextInput
                value={obsFaseTexto}
                onChangeText={setObsFaseTexto}
                placeholder="Ej. Fase completada a satisfacción según acta de empalme / En espera de radicación externa..."
                placeholderTextColor={THEME.slate400}
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: THEME.white,
                  borderWidth: 1,
                  borderColor: THEME.slate300,
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12.5,
                  color: THEME.slate900,
                  textAlignVertical: 'top',
                  minHeight: 100,
                }}
              />
            </View>

            <View
              style={{
                backgroundColor: THEME.slate50,
                padding: 14,
                borderTopWidth: 1,
                borderTopColor: THEME.slate200,
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <Pressable
                onPress={() => setModalObsFaseVisible(false)}
                style={{
                  backgroundColor: THEME.slate100,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: THEME.slate300,
                }}
              >
                <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '600' }}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                onPress={guardarObservacionFase}
                style={{
                  backgroundColor: THEME.marca600,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="save-outline" size={14} color={THEME.white} />
                <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '700' }}>
                  Guardar Observación
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>


      {/* =================================================================== */}
      {/* MODAL INFORMATIVO ESTÁNDAR (REGLA: MODALS EN LUGAR DE ALERTS)       */}
      {/* =================================================================== */}
      <Modal
        visible={infoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: THEME.slate200,
              width: '100%',
              maxWidth: 480,
              padding: 20,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons
                name={
                  infoModalTipo === 'success'
                    ? 'checkmark-circle'
                    : infoModalTipo === 'warning'
                    ? 'warning'
                    : 'information-circle'
                }
                size={24}
                color={
                  infoModalTipo === 'success'
                    ? THEME.emeraldText
                    : infoModalTipo === 'warning'
                    ? THEME.amberText
                    : THEME.skyText
                }
              />
              <Text
                style={{ color: THEME.slate900, fontSize: 15, fontWeight: '700', flex: 1 }}
              >
                {infoModalTitulo}
              </Text>
            </View>

            <Text style={{ color: THEME.slate600, fontSize: 13, lineHeight: 19 }}>
              {infoModalMensaje}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
              <Pressable
                onPress={() => setInfoModalVisible(false)}
                style={{
                  backgroundColor: THEME.marca600,
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: THEME.white, fontWeight: '600', fontSize: 12 }}>
                  Aceptar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL GUÍA COMPARATIVA DE REGÍMENES & FASES ESPECÍFICAS            */}
      {/* =================================================================== */}
      <Modal
        visible={modalGuiaModalidadesVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalGuiaModalidadesVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 16,
              width: '100%',
              maxWidth: 960,
              maxHeight: '92%',
              borderWidth: 1,
              borderColor: THEME.slate200,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header del Modal */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 22,
                paddingVertical: 16,
                backgroundColor: THEME.marca900,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Ionicons name="book" size={20} color={THEME.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: THEME.white, fontSize: 16, fontWeight: '800' }}>
                    Guía Normativa de Regímenes & Fases Específicas
                  </Text>
                  <Text style={{ color: THEME.marca100, fontSize: 12, marginTop: 1 }}>
                    Fundamentos legales, etapas secuenciales y diferencias clave en el empleo público distrital
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setModalGuiaModalidadesVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={20} color={THEME.white} />
              </Pressable>
            </View>

            {/* Selector de Proceso en Guía: Vinculación vs Desvinculación */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: THEME.slate200,
                paddingHorizontal: 16,
                paddingVertical: 8,
                gap: 8,
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: THEME.slate300,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Proceso:
              </Text>
              {(['VINCULACION', 'DESVINCULACION'] as const).map((tp) => {
                const activo = tabGuiaTipoProceso === tp;
                return (
                  <Pressable
                    key={tp}
                    onPress={() => setTabGuiaTipoProceso(tp)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 5,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      backgroundColor: activo ? THEME.white : 'transparent',
                      borderWidth: 1,
                      borderColor: activo ? THEME.marca600 : 'transparent',
                      shadowColor: activo ? '#000' : 'transparent',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: activo ? 0.08 : 0,
                      shadowRadius: 2,
                    }}
                  >
                    <Ionicons
                      name={tp === 'VINCULACION' ? 'log-in-outline' : 'log-out-outline'}
                      size={14}
                      color={activo ? THEME.marca800 : THEME.slate600}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: activo ? '700' : '500',
                        color: activo ? THEME.marca900 : THEME.slate700,
                      }}
                    >
                      {tp === 'VINCULACION' ? 'Vinculación / Ingreso' : 'Desvinculación / Retiro'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Pestañas de Regímenes */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: THEME.slate100,
                borderBottomWidth: 1,
                borderBottomColor: THEME.slate200,
                paddingHorizontal: 12,
                gap: 6,
                paddingTop: 8,
              }}
            >
              {[
                { id: 'CARRERA_ADMINISTRATIVA' as ModalidadPersonal, label: 'Carrera Administrativa', icon: 'ribbon-outline', badge: '6 Fases' },
                { id: 'LIBRE_NOMBRAMIENTO' as ModalidadPersonal, label: 'Libre Nombramiento', icon: 'shield-outline', badge: '6 Fases' },
                { id: 'PROVISIONALIDAD' as ModalidadPersonal, label: 'Nombramiento Provisional', icon: 'hourglass-outline', badge: '6 Fases' },
                { id: 'PRACTICANTE_JUDICANTE' as ModalidadPersonal, label: 'Pasante / Judicante', icon: 'school-outline', badge: tabGuiaTipoProceso === 'VINCULACION' ? '5 Fases' : '4 Fases' },
              ].map((tab) => {
                const activo = tabGuiaModalidad === tab.id;
                const infoM = obtenerInfoModalidad(tab.id);
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setTabGuiaModalidad(tab.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 7,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                      backgroundColor: activo ? THEME.white : 'transparent',
                      borderBottomWidth: activo ? 3 : 0,
                      borderBottomColor: activo ? infoM.colorTexto : 'transparent',
                      marginBottom: activo ? -1 : 0,
                    }}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={15}
                      color={activo ? infoM.colorTexto : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: activo ? '700' : '600',
                        color: activo ? infoM.colorTexto : THEME.slate600,
                      }}
                    >
                      {tab.label}
                    </Text>
                    <View
                      style={{
                        backgroundColor: activo ? infoM.colorBg : THEME.slate200,
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        borderRadius: 10,
                        borderWidth: activo ? 1 : 0,
                        borderColor: infoM.colorBorde,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: activo ? infoM.colorTexto : THEME.slate600,
                        }}
                      >
                        {tab.badge}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Contenido Principal con Scroll */}
            <ScrollView
              style={{ flex: 1, backgroundColor: THEME.white }}
              contentContainerStyle={{ padding: 22, gap: 18 }}
            >
              {(() => {
                const infoActual = obtenerInfoModalidad(tabGuiaModalidad, tabGuiaTipoProceso);
                const etapasActuales = generarEtapasParaCaso(tabGuiaTipoProceso, tabGuiaModalidad);

                return (
                  <>
                    {/* Banner Informativo del Régimen Actual */}
                    <View
                      style={{
                        backgroundColor: infoActual.colorBg,
                        borderWidth: 1.5,
                        borderColor: infoActual.colorBorde,
                        borderRadius: 12,
                        padding: 18,
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              backgroundColor: infoActual.colorTexto,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name={infoActual.icono as any} size={20} color={THEME.white} />
                          </View>
                          <View>
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: '800',
                                color: infoActual.colorTexto,
                              }}
                            >
                              {infoActual.titulo}
                            </Text>
                            <Text style={{ fontSize: 12, color: THEME.slate600, marginTop: 1 }}>
                              {infoActual.subtitulo}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: THEME.white,
                            borderWidth: 1,
                            borderColor: infoActual.colorBorde,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '800',
                              color: infoActual.colorTexto,
                              letterSpacing: 0.5,
                            }}
                          >
                            {infoActual.badgeTexto}
                          </Text>
                        </View>
                      </View>

                      {/* Marco Legal */}
                      <View
                        style={{
                          backgroundColor: THEME.white,
                          padding: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: infoActual.colorBorde,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Ionicons name="scale-outline" size={16} color={infoActual.colorTexto} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate800 }}>
                            Marco Jurídico Aplicable:
                          </Text>
                          <Text style={{ fontSize: 11.5, color: THEME.slate700, marginTop: 2 }}>
                            {infoActual.marcoLegal}
                          </Text>
                        </View>
                      </View>

                      {/* Grid: Diferencia Clave vs Requisito Principal */}
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            minWidth: 280,
                            backgroundColor: THEME.white,
                            borderRadius: 8,
                            padding: 12,
                            borderLeftWidth: 4,
                            borderLeftColor: infoActual.colorTexto,
                            borderWidth: 1,
                            borderColor: THEME.slate200,
                            gap: 4,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="git-compare-outline" size={15} color={infoActual.colorTexto} />
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '800',
                                color: infoActual.colorTexto,
                              }}
                            >
                              Diferencia Clave & Estabilidad
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11.5, color: THEME.slate700, lineHeight: 17 }}>
                            {infoActual.diferenciaClave}
                          </Text>
                        </View>

                        <View
                          style={{
                            flex: 1,
                            minWidth: 280,
                            backgroundColor: THEME.white,
                            borderRadius: 8,
                            padding: 12,
                            borderLeftWidth: 4,
                            borderLeftColor: THEME.marca600,
                            borderWidth: 1,
                            borderColor: THEME.slate200,
                            gap: 4,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="checkbox-outline" size={15} color={THEME.marca600} />
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '800',
                                color: THEME.marca700,
                              }}
                            >
                              Requisito Habilitante Principal
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11.5, color: THEME.slate700, lineHeight: 17 }}>
                            {infoActual.requisitoPrincipal}
                          </Text>
                        </View>
                      </View>

                      {/* Flujo y Resumen Operativo */}
                      <View style={{ gap: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate600 }}>
                          Resumen del Trámite Institucional:
                        </Text>
                        <Text style={{ fontSize: 11.5, color: THEME.slate700, lineHeight: 17 }}>
                          {infoActual.descripcionFases}
                        </Text>
                      </View>
                    </View>

                    {/* Desglose de Fases Específicas */}
                    <View style={{ gap: 10, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="git-network-outline" size={18} color={THEME.slate800} />
                          <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.slate900 }}>
                            Fases del Proceso ({etapasActuales.length} Etapas Secuenciales Obligatorias)
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                          Orden técnico y legal exigido por Talento Humano
                        </Text>
                      </View>

                      <View style={{ gap: 10 }}>
                        {etapasActuales.map((etapa, idx) => (
                          <View
                            key={etapa.id || idx}
                            style={{
                              backgroundColor: THEME.slate50,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: THEME.slate200,
                              padding: 14,
                              gap: 10,
                            }}
                          >
                            {/* Cabecera de la Fase */}
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 8,
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <View
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: infoActual.colorTexto,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Text style={{ color: THEME.white, fontWeight: '800', fontSize: 12 }}>
                                    {etapa.numero}
                                  </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.slate900 }}>
                                    {etapa.titulo}
                                  </Text>
                                  <Text style={{ fontSize: 11.5, color: THEME.slate600 }}>
                                    {etapa.subtitulo}
                                  </Text>
                                </View>
                              </View>

                              {/* Badges de tiempo y responsable */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {etapa.tiempoEstimadoDias ? (
                                  <View
                                    style={{
                                      backgroundColor: THEME.white,
                                      paddingHorizontal: 8,
                                      paddingVertical: 3,
                                      borderRadius: 6,
                                      borderWidth: 1,
                                      borderColor: THEME.slate300,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <Ionicons name="time-outline" size={12} color={THEME.slate600} />
                                    <Text style={{ fontSize: 10.5, fontWeight: '600', color: THEME.slate700 }}>
                                      {etapa.tiempoEstimadoDias} {etapa.tiempoEstimadoDias === 1 ? 'día' : 'días'}
                                    </Text>
                                  </View>
                                ) : null}

                                {etapa.responsable ? (
                                  <View
                                    style={{
                                      backgroundColor: THEME.marca50,
                                      paddingHorizontal: 8,
                                      paddingVertical: 3,
                                      borderRadius: 6,
                                      borderWidth: 1,
                                      borderColor: THEME.marca100,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <Ionicons name="person-outline" size={12} color={THEME.marca700} />
                                    <Text style={{ fontSize: 10.5, fontWeight: '600', color: THEME.marca700 }}>
                                      {etapa.responsable}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>

                            {/* Procedimiento detallado y norma */}
                            {etapa.procedimientoDetallado && (
                              <Text style={{ fontSize: 11.5, color: THEME.slate700, lineHeight: 16 }}>
                                {etapa.procedimientoDetallado}
                              </Text>
                            )}

                            {etapa.normaGeneral && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Ionicons name="bookmark-outline" size={12} color={THEME.slate500} />
                                <Text style={{ fontSize: 10.5, color: THEME.slate500, fontStyle: 'italic' }}>
                                  {etapa.normaGeneral} {etapa.plazoLegal ? `• Plazo: ${etapa.plazoLegal}` : ''}
                                </Text>
                              </View>
                            )}

                            {/* Requisitos de la Fase */}
                            {etapa.requisitos && etapa.requisitos.length > 0 && (
                              <View
                                style={{
                                  backgroundColor: THEME.white,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: THEME.slate200,
                                  padding: 10,
                                  gap: 6,
                                }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.slate600, textTransform: 'uppercase' }}>
                                  Requisitos & Validaciones de la Fase:
                                </Text>

                                {etapa.requisitos.map((req, rIdx) => (
                                  <View
                                    key={req.id || rIdx}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'flex-start',
                                      gap: 8,
                                      paddingVertical: 4,
                                      borderTopWidth: rIdx > 0 ? 1 : 0,
                                      borderTopColor: THEME.slate100,
                                    }}
                                  >
                                    <Ionicons
                                      name={req.cumplido ? 'checkmark-circle' : 'ellipse-outline'}
                                      size={14}
                                      color={req.cumplido ? THEME.emerald600 : THEME.slate400}
                                      style={{ marginTop: 2 }}
                                    />
                                    <View style={{ flex: 1, gap: 2 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <Text style={{ fontSize: 11.5, fontWeight: '600', color: THEME.slate800, flex: 1 }}>
                                          {req.label}
                                        </Text>
                                        {req.codigoFormato && (
                                          <View
                                            style={{
                                              backgroundColor: THEME.slate100,
                                              paddingHorizontal: 5,
                                              paddingVertical: 1.5,
                                              borderRadius: 4,
                                              borderWidth: 1,
                                              borderColor: THEME.slate300,
                                            }}
                                          >
                                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: THEME.slate700 }}>
                                              {req.codigoFormato}
                                            </Text>
                                          </View>
                                        )}
                                        {req.tipoAccionEspecial === 'SECOP' && (
                                          <View
                                            style={{
                                              backgroundColor: THEME.skyBg,
                                              paddingHorizontal: 5,
                                              paddingVertical: 1.5,
                                              borderRadius: 4,
                                            }}
                                          >
                                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: THEME.skyText }}>
                                              API SECOP II
                                            </Text>
                                          </View>
                                        )}
                                        {req.tipoAccionEspecial === 'INGRESOS_IA' && (
                                          <View
                                            style={{
                                              backgroundColor: '#faf5ff',
                                              paddingHorizontal: 5,
                                              paddingVertical: 1.5,
                                              borderRadius: 4,
                                            }}
                                          >
                                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#6b21a8' }}>
                                              IA FT-318
                                            </Text>
                                          </View>
                                        )}
                                      </View>
                                      {req.norma && (
                                        <Text style={{ fontSize: 10, color: THEME.slate500 }}>
                                          {req.norma}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Matriz Comparativa Resumida entre Regímenes */}
                    <View
                      style={{
                        backgroundColor: THEME.slate50,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        padding: 16,
                        gap: 12,
                        marginTop: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="swap-horizontal" size={18} color={THEME.marca700} />
                        <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.slate900 }}>
                          Matriz Comparativa Rápida entre los 4 Regímenes
                        </Text>
                      </View>

                      <View
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Cabecera de la tabla */}
                        <View
                          style={{
                            flexDirection: 'row',
                            backgroundColor: THEME.slate100,
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: THEME.slate200,
                          }}
                        >
                          <Text style={{ flex: 1.2, fontSize: 10.5, fontWeight: '800', color: THEME.slate700 }}>
                            Régimen
                          </Text>
                          <Text style={{ flex: 1.5, fontSize: 10.5, fontWeight: '800', color: THEME.slate700 }}>
                            Vía de Provisión
                          </Text>
                          <Text style={{ flex: 1.8, fontSize: 10.5, fontWeight: '800', color: THEME.slate700 }}>
                            Estabilidad Laboral
                          </Text>
                          <Text style={{ flex: 1.5, fontSize: 10.5, fontWeight: '800', color: THEME.slate700 }}>
                            Causa de Retiro
                          </Text>
                        </View>

                        {/* Fila Carrera */}
                        <View
                          style={{
                            flexDirection: 'row',
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: THEME.slate100,
                            backgroundColor: tabGuiaModalidad === 'CARRERA_ADMINISTRATIVA' ? '#eff6ff' : THEME.white,
                          }}
                        >
                          <Text style={{ flex: 1.2, fontSize: 10.5, fontWeight: '700', color: '#1e40af' }}>
                            Carrera Adm.
                          </Text>
                          <Text style={{ flex: 1.5, fontSize: 10.5, color: THEME.slate700 }}>
                            Concurso Méritos (CNSC)
                          </Text>
                          <Text style={{ flex: 1.8, fontSize: 10.5, color: THEME.slate700 }}>
                            Plena (Derechos de Carrera tras 6 meses)
                          </Text>
                          <Text style={{ flex: 1.5, fontSize: 10.5, color: THEME.slate700 }}>
                            Evaluación insatisfactoria o sanción
                          </Text>
                        </View>

                        {/* Fila Libre Nombramiento */}
                        <View
                          style={{
                            flexDirection: 'row',
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: THEME.slate100,
                            backgroundColor: tabGuiaModalidad === 'LIBRE_NOMBRAMIENTO' ? '#faf5ff' : THEME.white,
                          }}
                        >
                          <Text style={{ flex: 1.2, fontSize: 10.5, fontWeight: '700', color: '#6b21a8' }}>
                            Libre Nombramiento
                          </Text>
                          <Text style={{ flex: 1.5, fontSize: 10.5, color: THEME.slate700 }}>
                            Discrecional del Nominador (SEVCOM + Web)
                          </Text>
                          <Text style={{ flex: 1.8, fontSize: 10.5, color: THEME.slate700 }}>
                            Precaria / Sin estabilidad relativa
                          </Text>
                          <Text style={{ flex: 1.5, fontSize: 10.5, color: THEME.slate700 }}>
                            Declaratoria de insubsistencia discrecional
                          </Text>
                        </View>

                        {/* Fila Provisionalidad */}
                        <View
                          style={{
                            flexDirection: 'row',
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: THEME.slate100,
                            backgroundColor: tabGuiaModalidad === 'PROVISIONALIDAD' ? '#fffbeb' : THEME.white,
                          }}
                        >
                          <Text style={{ flex: 1.2, fontSize: 10.5, fontWeight: '700', color: '#b45309' }}>
                            Provisionalidad
                          </Text>
                          <Text style={{ flex: 1.5, fontSize: 10.5, color: THEME.slate700 }}>
                            Transitoria (Sin lista CNSC + Encargo desierto)
                          </Text>
                          <Text style={{ flex: 1.8, fontSize: 10.5, color: THEME.slate700 }}>
                            Relativa intermedia (Hasta que la CNSC provea por mérito)
                          </Text>
                          <Text style={{ flex: 1.5, fontSize: 10.5, color: THEME.slate700 }}>
                            Llegada de elegible o encargo de titular
                          </Text>
                        </View>

                        {/* Fila Pasante */}
                        <View
                          style={{
                            flexDirection: 'row',
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            backgroundColor: tabGuiaModalidad === 'PRACTICANTE_JUDICANTE' ? '#ecfeff' : THEME.white,
                          }}
                        >
                          <Text style={{ flex: 1.2, fontSize: 10.5, fontWeight: '700', color: '#0e7490' }}>
                            Pasante / Judicante
                          </Text>
                          <Text style={{ flex: 1.5, fontSize: 10.5, color: THEME.slate700 }}>
                            Convenio Universitario / Ley 2043/2020
                          </Text>
                          <Text style={{ flex: 1.8, fontSize: 10.5, color: THEME.slate700 }}>
                            No laboral (Formación académica y cómputo de experiencia)
                          </Text>
                          <Text style={{ flex: 1.5, fontSize: 10.5, color: THEME.slate700 }}>
                            Culminación de horas/término convenido
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                );
              })()}
            </ScrollView>

            {/* Footer del Modal */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 22,
                paddingVertical: 14,
                backgroundColor: THEME.slate50,
                borderTopWidth: 1,
                borderTopColor: THEME.slate200,
              }}
            >
              <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                Sistema Integrado de Gestión RRHH • Subdirección de Talento Humano
              </Text>

              <Pressable
                onPress={() => setModalGuiaModalidadesVisible(false)}
                style={{
                  backgroundColor: THEME.marca600,
                  paddingHorizontal: 20,
                  paddingVertical: 9,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: THEME.white, fontWeight: '700', fontSize: 12.5 }}>
                  Entendido / Cerrar Guía
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL INSTITUCIONAL: BANCO DE FORMATOS OFICIALES Y PLANTILLAS RRHH  */}
      {/* =================================================================== */}
      <Modal
        visible={modalFormatosVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalFormatosVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: THEME.slate200,
              width: '100%',
              maxWidth: 760,
              maxHeight: '92%',
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {/* Cabecera */}
            <View
              style={{
                backgroundColor: THEME.marca900,
                paddingHorizontal: 20,
                paddingVertical: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="folder-open" size={20} color={THEME.white} />
                </View>
                <View>
                  <Text style={{ color: THEME.white, fontSize: 14.5, fontWeight: '800' }}>
                    Banco de Formatos Oficiales y Plantillas de RRHH
                  </Text>
                  <Text style={{ color: THEME.marca100, fontSize: 11 }}>
                    Secretaría Jurídica Distrital — Dirección de Gestión Corporativa / Talento Humano
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setModalFormatosVisible(false)}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={22} color={THEME.white} />
              </Pressable>
            </View>

            {/* Barra de Búsqueda y Filtros */}
            <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: THEME.slate200 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: THEME.slate50,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: THEME.slate300,
                  gap: 6,
                }}
              >
                <Ionicons name="search" size={16} color={THEME.slate400} />
                <TextInput
                  value={busquedaFormatos}
                  onChangeText={setBusquedaFormatos}
                  placeholder="Buscar formato por código, denominación o palabra clave..."
                  placeholderTextColor={THEME.slate400}
                  style={{ flex: 1, fontSize: 12.5, color: THEME.slate900 }}
                />
                {busquedaFormatos ? (
                  <Pressable onPress={() => setBusquedaFormatos('')}>
                    <Ionicons name="close-circle" size={16} color={THEME.slate400} />
                  </Pressable>
                ) : null}
              </View>

              {/* Pestañas de Filtro */}
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'VINCULACION', label: 'Vinculación' },
                  { id: 'DESVINCULACION', label: 'Desvinculación' },
                  { id: 'GUIA_NORMATIVA', label: 'Manuales y Calidad' },
                ].map((f) => {
                  const sel = filtroProcesoFormatos === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => setFiltroProcesoFormatos(f.id as any)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: sel ? THEME.marca800 : THEME.slate100,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: sel ? '700' : '500',
                          color: sel ? THEME.white : THEME.slate700,
                        }}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Listado de Formatos */}
            <ScrollView contentContainerStyle={{ padding: 18, gap: 10 }}>
              {/* Tarjeta destacada del Google Form de Evaluación de Retiro */}
              {(filtroProcesoFormatos === 'TODOS' || filtroProcesoFormatos === 'DESVINCULACION') && (
                <View
                  style={{
                    backgroundColor: '#ecfdf5',
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: '#6ee7b7',
                    padding: 14,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
                      <View style={{ backgroundColor: '#10b981', padding: 8, borderRadius: 8 }}>
                        <Ionicons name="clipboard" size={18} color="#ffffff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#065f46' }}>
                          Formulario de Evaluación de Retiro (Google Forms Oficial)
                        </Text>
                        <Text style={{ fontSize: 11, color: '#047857' }}>
                          Formulario en la nube para el diligenciamiento ágil y directo del servidor público saliente
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={handleAbrirEvaluacionRetiroGoogleForms}
                      style={{
                        backgroundColor: '#059669',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 7,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Ionicons name="open-outline" size={14} color="#ffffff" />
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#ffffff' }}>
                        Diligenciar en Línea
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={{ fontSize: 11, color: '#047857', lineHeight: 15 }}>
                    Permite capturar de manera digital e inmediata la percepción de clima organizacional, motivos de retiro y aportes de mejora institucional.
                  </Text>
                </View>
              )}

              {/* Formatos filtrados */}
              {(() => {
                let filtrados = LISTA_FORMATOS_OFICIALES;
                if (filtroProcesoFormatos !== 'TODOS') {
                  filtrados = filtrados.filter((f) => f.proceso === filtroProcesoFormatos);
                }
                if (busquedaFormatos.trim()) {
                  const q = busquedaFormatos.trim().toLowerCase();
                  filtrados = filtrados.filter(
                    (f) =>
                      f.codigo.toLowerCase().includes(q) ||
                      f.nombre.toLowerCase().includes(q) ||
                      f.descripcion.toLowerCase().includes(q)
                  );
                }

                if (filtrados.length === 0) {
                  return (
                    <View style={{ padding: 30, alignItems: 'center', gap: 6 }}>
                      <Ionicons name="search-outline" size={32} color={THEME.slate300} />
                      <Text style={{ color: THEME.slate600, fontSize: 13, fontWeight: '600' }}>
                        No se encontraron formatos coincidentes
                      </Text>
                    </View>
                  );
                }

                return filtrados.map((fmt) => {
                  const esExcel = fmt.tipo === 'XLSX';
                  const esPdf = fmt.tipo === 'PDF';
                  const esWord = fmt.tipo === 'DOCX' || fmt.tipo === 'DOC';

                  return (
                    <View
                      key={fmt.id}
                      style={{
                        backgroundColor: THEME.white,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        padding: 13,
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View
                              style={{
                                backgroundColor: esExcel ? '#dcfce7' : esPdf ? '#fee2e2' : '#e0e7ff',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '800',
                                  color: esExcel ? '#166534' : esPdf ? '#991b1b' : '#3730a3',
                                }}
                              >
                                {fmt.tipo}
                              </Text>
                            </View>

                            <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.slate900 }}>
                              {fmt.codigo}
                            </Text>

                            <View
                              style={{
                                backgroundColor: THEME.slate100,
                                paddingHorizontal: 6,
                                paddingVertical: 1.5,
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{ fontSize: 9.5, fontWeight: '600', color: THEME.slate600 }}>
                                {fmt.version}
                              </Text>
                            </View>
                          </View>

                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca800, marginTop: 4 }}>
                            {fmt.nombre}
                          </Text>

                          <Text style={{ fontSize: 11, color: THEME.slate600, marginTop: 3, lineHeight: 16 }}>
                            {fmt.descripcion}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.slate500 }}>
                              Fases sugeridas:
                            </Text>
                            {fmt.fasesRecomendadas.map((fs, idx) => (
                              <View
                                key={idx}
                                style={{
                                  backgroundColor: THEME.slate50,
                                  paddingHorizontal: 6,
                                  paddingVertical: 1.5,
                                  borderRadius: 4,
                                  borderWidth: 1,
                                  borderColor: THEME.slate200,
                                }}
                              >
                                <Text style={{ fontSize: 9.5, color: THEME.slate600 }}>
                                  {fs}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        {/* Botones de Acción */}
                        <View style={{ flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                          <Pressable
                            onPress={() => handleDescargarFormatoOficial(fmt.archivo)}
                            style={{
                              backgroundColor: esExcel ? '#166534' : esPdf ? '#991b1b' : THEME.marca700,
                              paddingHorizontal: 12,
                              paddingVertical: 6.5,
                              borderRadius: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <Ionicons name="download-outline" size={13} color={THEME.white} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.white }}>
                              Descargar
                            </Text>
                          </Pressable>

                          {fmt.formularioGoogleUrl && (
                            <Pressable
                              onPress={handleAbrirEvaluacionRetiroGoogleForms}
                              style={{
                                backgroundColor: '#ecfdf5',
                                borderWidth: 1,
                                borderColor: '#a7f3d0',
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 6,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Ionicons name="open-outline" size={12} color="#047857" />
                              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#047857' }}>
                                Google Forms
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>

            {/* Pie del modal */}
            <View
              style={{
                backgroundColor: THEME.slate50,
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: THEME.slate200,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                {LISTA_FORMATOS_OFICIALES.length} formatos oficiales y guías registradas
              </Text>
              <Pressable
                onPress={() => setModalFormatosVisible(false)}
                style={{
                  backgroundColor: THEME.slate200,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate800 }}>
                  Cerrar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

