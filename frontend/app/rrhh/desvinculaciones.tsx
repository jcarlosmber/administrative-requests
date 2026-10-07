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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import mockPlazasData from '../../lib/plantaMockData.json';

// ============================================================================
// TIPOS Y MODELOS DE DATOS (Basados en PR-074, PR-145 y PR-137)
// ============================================================================

export type TipoProceso = 'DESVINCULACION' | 'VINCULACION';
export type ModalidadPersonal =
  | 'CARRERA_ADMINISTRATIVA'
  | 'LIBRE_NOMBRAMIENTO'
  | 'PROVISIONALIDAD'
  | 'PRACTICANTE_JUDICANTE';

export type EstadoEtapa = 'completed' | 'in_progress' | 'pending';

export interface RequisitoEtapa {
  id: string;
  label: string;
  cumplido: boolean;
  fecha_cumplimiento?: string;
  codigoFormato?: string;
  obligatorio: boolean;
  notaNormativa?: string;
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
}

// ============================================================================
// SISTEMA DE TEMAS: OSCURO (ACTUAL) Y CLARO (ACCESIBILIDAD)
// ============================================================================

const DARK_THEME = {
  isDark: true,
  primary: '#BE1F2D',
  primaryHover: '#9B1623',
  darkBg: '#0B1724',
  cardBg: '#13283B',
  cardBgHover: '#1B354D',
  cardBgLight: '#18324A',
  cardSecondaryBg: '#0C1B2A',
  border: 'rgba(255, 255, 255, 0.12)',
  borderLight: 'rgba(255, 255, 255, 0.08)',
  textLight: '#F8FAFC',
  textMuted: '#94A3B8',
  textSecondary: '#CBD5E1',
  textTitle: '#FFFFFF',
  blueAccent: '#38BDF8',
  amberAccent: '#F59E0B',
  purpleAccent: '#A78BFA',
  purpleDark: '#7C3AED',
  emeraldAccent: '#10B981',
  danger: '#EF4444',
  headerBg: '#0F2133',
  tabBarBg: '#0C1B2A',
  tabActiveBorder: '#A78BFA',
  tabActiveText: '#FFFFFF',
  tabInactiveText: '#94A3B8',
  badgePurpleBg: 'rgba(167, 139, 250, 0.16)',
  badgePurpleText: '#C4B5FD',
  badgePurpleBorder: '#7C3AED',
  chipActiveBg: '#7C3AED',
  chipActiveText: '#FFFFFF',
  chipInactiveBg: 'rgba(255, 255, 255, 0.05)',
  chipInactiveText: '#94A3B8',
  chipInactiveBorder: 'rgba(255, 255, 255, 0.12)',
  inputBg: '#0C1B2A',
  inputText: '#FFFFFF',
  inputBorder: 'rgba(255, 255, 255, 0.12)',
  inputPlaceholder: '#94A3B8',
  bannerBg: 'rgba(245, 158, 11, 0.1)',
  bannerBorder: 'rgba(245, 158, 11, 0.35)',
  bannerIconBg: 'rgba(245, 158, 11, 0.2)',
  bannerTitle: '#FCD34D',
  bannerText: '#CBD5E1',
  bannerButtonBg: 'rgba(255, 255, 255, 0.08)',
  bannerButtonText: '#FFFFFF',
  cardBorderCompleted: 'rgba(16, 185, 129, 0.45)',
  cardBorderInProgress: 'rgba(124, 58, 237, 0.45)',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
  modalCardBg: '#112233',
  modalHeaderBg: '#0F2133',
  modalFooterBg: '#0F2133',
  modalCloseColor: '#FFFFFF',
  modalSubtitle: '#A78BFA',
  modalSelectBg: '#0C1B2A',
  modalSelectActiveBg: 'rgba(124, 58, 237, 0.25)',
  modalSelectActiveText: '#C4B5FD',
  modalItemBorder: 'rgba(255, 255, 255, 0.05)',
  btnCancelBg: 'rgba(255, 255, 255, 0.08)',
  btnCancelText: '#FFFFFF',
  btnPrimaryBg: '#7C3AED',
  btnPrimaryHover: '#6D28D9',
  btnPrimaryText: '#FFFFFF',
  stepperLinePending: 'rgba(255, 255, 255, 0.12)',
  stepperLineDone: '#10B981',
  stepperNodePendingBg: '#0C1B2A',
  stepperNodePendingBorder: 'rgba(255, 255, 255, 0.2)',
  stepperNodePendingText: '#94A3B8',
  stepperNodeActiveBg: '#7C3AED',
  stepperNodeActiveBorder: '#C4B5FD',
  stepperNodeDoneBg: '#10B981',
  stepperNodeDoneBorder: '#34D399',
  progressBarBg: 'rgba(255, 255, 255, 0.08)',
  progressBarFill: '#10B981',
};

const LIGHT_THEME = {
  isDark: false,
  primary: '#BE1F2D',
  primaryHover: '#9B1623',
  darkBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  cardBgHover: '#F8FAFC',
  cardBgLight: '#F1F5F9',
  cardSecondaryBg: '#F8FAFC',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  textLight: '#0F172A',
  textMuted: '#64748B',
  textSecondary: '#475569',
  textTitle: '#0F172A',
  blueAccent: '#0284C7',
  amberAccent: '#D97706',
  purpleAccent: '#7C3AED',
  purpleDark: '#6D28D9',
  emeraldAccent: '#059669',
  danger: '#DC2626',
  headerBg: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabActiveBorder: '#7C3AED',
  tabActiveText: '#6D28D9',
  tabInactiveText: '#64748B',
  badgePurpleBg: '#F3E8FF',
  badgePurpleText: '#6D28D9',
  badgePurpleBorder: '#DDD6FE',
  chipActiveBg: '#7C3AED',
  chipActiveText: '#FFFFFF',
  chipInactiveBg: '#F1F5F9',
  chipInactiveText: '#64748B',
  chipInactiveBorder: '#CBD5E1',
  inputBg: '#FFFFFF',
  inputText: '#0F172A',
  inputBorder: '#CBD5E1',
  inputPlaceholder: '#94A3B8',
  bannerBg: '#FFFBEB',
  bannerBorder: '#FCD34D',
  bannerIconBg: '#FEF3C7',
  bannerTitle: '#B45309',
  bannerText: '#78350F',
  bannerButtonBg: '#FEF3C7',
  bannerButtonText: '#92400E',
  cardBorderCompleted: '#A7F3D0',
  cardBorderInProgress: '#DDD6FE',
  modalOverlay: 'rgba(15, 23, 42, 0.6)',
  modalCardBg: '#FFFFFF',
  modalHeaderBg: '#F8FAFC',
  modalFooterBg: '#F8FAFC',
  modalCloseColor: '#475569',
  modalSubtitle: '#6D28D9',
  modalSelectBg: '#F8FAFC',
  modalSelectActiveBg: '#EDE9FE',
  modalSelectActiveText: '#6D28D9',
  modalItemBorder: '#E2E8F0',
  btnCancelBg: '#E2E8F0',
  btnCancelText: '#334155',
  btnPrimaryBg: '#7C3AED',
  btnPrimaryHover: '#6D28D9',
  btnPrimaryText: '#FFFFFF',
  stepperLinePending: '#E2E8F0',
  stepperLineDone: '#10B981',
  stepperNodePendingBg: '#F1F5F9',
  stepperNodePendingBorder: '#CBD5E1',
  stepperNodePendingText: '#64748B',
  stepperNodeActiveBg: '#7C3AED',
  stepperNodeActiveBorder: '#C4B5FD',
  stepperNodeDoneBg: '#10B981',
  stepperNodeDoneBorder: '#059669',
  progressBarBg: '#E2E8F0',
  progressBarFill: '#10B981',
};

// ============================================================================
// GENERADORES DE ETAPAS Y REQUISITOS NORMATIVOS OFICIALES
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
            requisitos: [
              { id: 'vc1_1', label: 'Identificación de la vacante definitiva en la OPEC institucional', cumplido: true, obligatorio: true },
              { id: 'vc1_2', label: 'Consulta en Banco Nacional de Listas de Elegibles (BNLE SIMO 4.0)', cumplido: true, obligatorio: true },
              { id: 'vc1_3', label: 'Constatación de funciones y perfil equivalente en la OPEC', cumplido: true, obligatorio: true },
            ],
          },
          {
            id: 'v_carr_2',
            numero: 2,
            titulo: 'Autorización CNSC',
            subtitulo: 'Revisión por Comisión de Personal',
            icono: 'shield-checkmark-outline',
            estado: 'completed',
            tiempoEstimadoDias: 5,
            responsable: 'Comisión de Personal / CNSC',
            requisitos: [
              { id: 'vc2_1', label: 'Solicitud formal a la Dirección de Administración de Carrera CNSC', cumplido: true, obligatorio: true },
              { id: 'vc2_2', label: 'Recepción de lista de elegibles con orden de mérito estricto', cumplido: true, obligatorio: true },
              { id: 'vc2_3', label: 'Revisión de soportes de los 3 primeros elegibles por Comisión de Personal', cumplido: true, obligatorio: true },
            ],
          },
          {
            id: 'v_carr_3',
            numero: 3,
            titulo: 'Aviso a Encargados',
            subtitulo: 'Notificación a provisionales / encargados',
            icono: 'notifications-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            requisitos: [
              { id: 'vc3_1', label: 'Identificación de servidor en encargo preferente o nombramiento provisional', cumplido: true, obligatorio: true, codigoFormato: '2311520-FT-018' },
              { id: 'vc3_2', label: 'Memorando de comunicación sobre provisión por mérito de la plaza', cumplido: true, obligatorio: true },
              { id: 'vc3_3', label: 'Fijación de fecha límite de entrega de funciones', cumplido: true, obligatorio: true },
            ],
          },
          {
            id: 'v_carr_4',
            numero: 4,
            titulo: 'Acto de Nombramiento',
            subtitulo: 'Periodo de prueba (6 meses) y aceptación',
            icono: 'document-text-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 2,
            responsable: 'Nominador / Técnico Notificaciones',
            requisitos: [
              { id: 'vc4_1', label: 'Elaboración de Resolución de Nombramiento en Periodo de Prueba', cumplido: true, obligatorio: true, codigoFormato: '2311520-FT-130' },
              { id: 'vc4_2', label: 'Firma por Secretario Jurídico Distrital y numeración oficial', cumplido: true, obligatorio: true },
              { id: 'vc4_3', label: 'Comunicación al candidato (10 días hábiles para manifestar aceptación)', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-019' },
              { id: 'vc4_4', label: 'Gestión de prórroga para posesión (hasta 90 días si aplica)', cumplido: false, obligatorio: false },
            ],
          },
          {
            id: 'v_carr_5',
            numero: 5,
            titulo: 'Posesión & Exámenes',
            subtitulo: 'Examen médico y Acta de Posesión',
            icono: 'ribbon-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional TH / SST',
            requisitos: [
              { id: 'vc5_1', label: 'Examen médico ocupacional de ingreso con concepto de aptitud', cumplido: false, obligatorio: true },
              { id: 'vc5_2', label: 'Declaración de Bienes y Rentas y Conflicto de Intereses en SIDEAP/SIGEP', cumplido: false, obligatorio: true },
              { id: 'vc5_3', label: 'Consulta de antecedentes (Policía, Procuraduría, Contraloría, REDAM)', cumplido: false, obligatorio: true },
              { id: 'vc5_4', label: 'Suscripción formal del Acta de Posesión (Formato 2311300-FT-127)', cumplido: false, obligatorio: true, codigoFormato: '2311300-FT-127' },
            ],
          },
          {
            id: 'v_carr_6',
            numero: 6,
            titulo: 'Nómina & Reporte CNSC',
            subtitulo: 'Afiliaciones, nómina y cierre OPEC',
            icono: 'checkmark-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 5,
            responsable: 'Nómina / Profesional CNSC',
            requisitos: [
              { id: 'vc6_1', label: 'Afiliación a ARL, EPS, Fondo Pensiones, Cesantías y Caja Compensación', cumplido: false, obligatorio: true },
              { id: 'vc6_2', label: 'Inclusión en nómina institucional (Sistema PERNO)', cumplido: false, obligatorio: true },
              { id: 'vc6_3', label: 'Activación del servidor en aplicativo SIDEAP Distrital', cumplido: false, obligatorio: true },
              { id: 'vc6_4', label: 'Reporte de posesión en aplicativo BNLE SIMO 4.0 ante la CNSC', cumplido: false, obligatorio: true },
              { id: 'vc6_5', label: 'Inducción y entrenamiento en puesto de trabajo (Formato 2311300-FT-106)', cumplido: false, obligatorio: true, codigoFormato: '2311300-FT-106' },
            ],
          },
        ];

      case 'LIBRE_NOMBRAMIENTO':
        return [
          {
            id: 'v_lnr_1',
            numero: 1,
            titulo: 'Recepción HV & SIDEAP',
            subtitulo: 'Postulación y cargue en plataforma',
            icono: 'person-add-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            requisitos: [
              { id: 'vl1_1', label: 'Recepción de Hoja de Vida remitida por Despacho del Nominador', cumplido: true, obligatorio: true },
              { id: 'vl1_2', label: 'Autorización formal de notificación electrónica', cumplido: true, obligatorio: true, codigoFormato: '2311520-FT-019' },
              { id: 'vl1_3', label: 'Registro y cargue completo de soportes académicos y laborales en SIDEAP', cumplido: true, obligatorio: true },
            ],
          },
          {
            id: 'v_lnr_2',
            numero: 2,
            titulo: 'Antecedentes & Requisitos',
            subtitulo: 'Verificación legal y Ley de Cuotas',
            icono: 'clipboard-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            requisitos: [
              { id: 'vl2_1', label: 'Consulta de antecedentes: Policía, Procuraduría SIRI, Contraloría SIBOR, RNMC y REDAM', cumplido: true, obligatorio: true },
              { id: 'vl2_2', label: 'Elaboración de Certificado de Cumplimiento de Requisitos (2311300-FT-318)', cumplido: true, obligatorio: true, codigoFormato: '2311300-FT-318' },
              { id: 'vl2_3', label: 'Verificación paridad Ley de Cuotas (Decreto 455/2020 y Ley 2424/2024: 50% mujeres)', cumplido: true, obligatorio: true },
            ],
          },
          {
            id: 'v_lnr_3',
            numero: 3,
            titulo: 'SEVCOM & Publicación',
            subtitulo: 'Evaluación DASCD y 5 días web',
            icono: 'globe-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 5,
            responsable: 'Dirección Gestión Corporativa / DASCD',
            requisitos: [
              { id: 'vl3_1', label: 'Solicitud de evaluación de competencias gerenciales en SEVCOM DASCD (Circular 004/2019)', cumplido: true, obligatorio: true },
              { id: 'vl3_2', label: 'Aprobación de la prueba de competencias del aspirante', cumplido: true, obligatorio: true },
              { id: 'vl3_3', label: 'Publicación de la Hoja de Vida por mínimo 5 días en portal web (Acuerdo 782/2020)', cumplido: false, obligatorio: true },
            ],
          },
          {
            id: 'v_lnr_4',
            numero: 4,
            titulo: 'Acto de Nombramiento',
            subtitulo: 'Resolución nominador y aceptación',
            icono: 'document-text-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Secretario Jurídico Distrital',
            requisitos: [
              { id: 'vl4_1', label: 'Proyección y firma de Resolución de Nombramiento Ordinario', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-130' },
              { id: 'vl4_2', label: 'Numeración, fechado y comunicación al designado', cumplido: false, obligatorio: true },
              { id: 'vl4_3', label: 'Aceptación formal dentro del término legal (10 días hábiles)', cumplido: false, obligatorio: true },
            ],
          },
          {
            id: 'v_lnr_5',
            numero: 5,
            titulo: 'Posesión & Entrenamiento',
            subtitulo: 'Acta de posesión e inducción directa',
            icono: 'ribbon-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Talento Humano / Despacho',
            requisitos: [
              { id: 'vl5_1', label: 'Examen médico ocupacional de ingreso', cumplido: false, obligatorio: true },
              { id: 'vl5_2', label: 'Publicación proactiva Bienes y Rentas en SIDEAP/SIGEP (Ley 2013/2019)', cumplido: false, obligatorio: true },
              { id: 'vl5_3', label: 'Suscripción del Acta de Posesión (Formato 2311300-FT-127)', cumplido: false, obligatorio: true, codigoFormato: '2311300-FT-127' },
              { id: 'vl5_4', label: 'Entrega manual de funciones y plan de inducción gerencial (2311300-FT-106)', cumplido: false, obligatorio: true, codigoFormato: '2311300-FT-106' },
            ],
          },
          {
            id: 'v_lnr_6',
            numero: 6,
            titulo: 'Alta en Nómina & SIDEAP',
            subtitulo: 'Seguridad social e inicio de funciones',
            icono: 'checkmark-done-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Nómina / Talento Humano',
            requisitos: [
              { id: 'vl6_1', label: 'Afiliación a ARL, EPS, Fondo Pensiones, Cesantías y Caja Compensación', cumplido: false, obligatorio: true },
              { id: 'vl6_2', label: 'Inclusión en nómina institucional (PERNO)', cumplido: false, obligatorio: true },
              { id: 'vl6_3', label: 'Activación del servidor en el módulo de Talento Humano en SIDEAP', cumplido: false, obligatorio: true },
            ],
          },
        ];

      case 'PROVISIONALIDAD':
        return [
          {
            id: 'v_prov_1',
            numero: 1,
            titulo: 'Verificación Lista CNSC',
            subtitulo: 'Certificar ausencia de elegibles',
            icono: 'search-outline',
            estado: 'completed',
            tiempoEstimadoDias: 2,
            responsable: 'Profesional Universitario TH',
            requisitos: [
              { id: 'vp1_1', label: 'Consulta en Banco Nacional de Listas de Elegibles de la CNSC para el empleo', cumplido: true, obligatorio: true },
              { id: 'vp1_2', label: 'Constancia de no existencia de lista de elegibles disponible para periodo de prueba', cumplido: true, obligatorio: true },
              { id: 'vp1_3', label: 'Reporte previo de vacancia definitiva a la CNSC (Ley 1960/2019 parágrafo 2)', cumplido: true, obligatorio: true },
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
            requisitos: [
              { id: 'vp2_1', label: 'Publicación de convocatoria interna para encargo a servidores de carrera con evaluación Sobresaliente', cumplido: true, obligatorio: true },
              { id: 'vp2_2', label: 'Evaluación de solicitudes de encargo preferencial', cumplido: true, obligatorio: true },
              { id: 'vp2_3', label: 'Certificación de que ningún servidor de carrera cumple requisitos o aceptó encargo', cumplido: true, obligatorio: true },
            ],
          },
          {
            id: 'v_prov_3',
            numero: 3,
            titulo: 'Validación Candidato',
            subtitulo: 'SIDEAP, antecedentes y perfil',
            icono: 'person-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            requisitos: [
              { id: 'vp3_1', label: 'Recepción de Hoja de Vida del candidato y cargue en SIDEAP', cumplido: true, obligatorio: true },
              { id: 'vp3_2', label: 'Consulta de antecedentes judiciales, disciplinarios, fiscales y REDAM', cumplido: true, obligatorio: true },
              { id: 'vp3_3', label: 'Diligenciamiento de Certificación de Cumplimiento de Requisitos (2311300-FT-318)', cumplido: false, obligatorio: true, codigoFormato: '2311300-FT-318' },
            ],
          },
          {
            id: 'v_prov_4',
            numero: 4,
            titulo: 'Acto de Nombramiento',
            subtitulo: 'Resolución transitoria (máx. 6 meses)',
            icono: 'document-text-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Nominador / Técnico Notificaciones',
            requisitos: [
              { id: 'vp4_1', label: 'Resolución de Nombramiento Provisional motivada (Decreto 648/2017)', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-130' },
              { id: 'vp4_2', label: 'Notificación oficial y aceptación dentro de los 10 días hábiles', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-019' },
            ],
          },
          {
            id: 'v_prov_5',
            numero: 5,
            titulo: 'Posesión & Exámenes',
            subtitulo: 'Examen médico y Acta de Posesión',
            icono: 'ribbon-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional TH / SST',
            requisitos: [
              { id: 'vp5_1', label: 'Examen médico ocupacional de ingreso', cumplido: false, obligatorio: true },
              { id: 'vp5_2', label: 'Declaración juramentada de bienes y rentas y conflicto de intereses', cumplido: false, obligatorio: true },
              { id: 'vp5_3', label: 'Suscripción de Acta de Posesión (Formato 2311300-FT-127)', cumplido: false, obligatorio: true, codigoFormato: '2311300-FT-127' },
            ],
          },
          {
            id: 'v_prov_6',
            numero: 6,
            titulo: 'Nómina & Entrenamiento',
            subtitulo: 'Afiliaciones, nómina y puesto de trabajo',
            icono: 'checkmark-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Nómina / Talento Humano',
            requisitos: [
              { id: 'vp6_1', label: 'Afiliaciones a ARL y Seguridad Social Integral', cumplido: false, obligatorio: true },
              { id: 'vp6_2', label: 'Inclusión en nómina (PERNO) y actualización en SIDEAP', cumplido: false, obligatorio: true },
              { id: 'vp6_3', label: 'Inducción y entrenamiento en puesto de trabajo (Formato 2311300-FT-106)', cumplido: false, obligatorio: true, codigoFormato: '2311300-FT-106' },
            ],
          },
        ];

      case 'PRACTICANTE_JUDICANTE':
        return [
          {
            id: 'v_prac_1',
            numero: 1,
            titulo: 'CDP & Requerimientos',
            subtitulo: 'Apropiación presupuestal y plazas',
            icono: 'cash-outline',
            estado: 'completed',
            tiempoEstimadoDias: 3,
            responsable: 'Gestión Financiera / Talento Humano',
            requisitos: [
              { id: 'vj1_1', label: 'Solicitud y expedición de CDP para auxilio de sostenimiento / ARL en vigencia', cumplido: true, obligatorio: true },
              { id: 'vj1_2', label: 'Consolidación de requerimientos de dependencias y perfiles requeridos', cumplido: true, obligatorio: true },
              { id: 'vj1_3', label: 'Registro de plazas en módulo de prácticas laborales de SIDEAP', cumplido: true, obligatorio: true },
            ],
          },
          {
            id: 'v_prac_2',
            numero: 2,
            titulo: 'Convocatoria & Selección',
            subtitulo: 'Publicación, entrevista y preselección',
            icono: 'people-outline',
            estado: 'completed',
            tiempoEstimadoDias: 5,
            responsable: 'DASCD / Dependencia Receptora',
            requisitos: [
              { id: 'vj2_1', label: 'Publicación de convocatoria oficial en portal web institucional / DASCD', cumplido: true, obligatorio: true },
              { id: 'vj2_2', label: 'Verificación carta de presentación de la universidad y plan de práctica académica', cumplido: true, obligatorio: true },
              { id: 'vj2_3', label: 'Entrevista en dependencia receptora y remisión de acta de selección final', cumplido: true, obligatorio: true },
            ],
          },
          {
            id: 'v_prac_3',
            numero: 3,
            titulo: 'Resolución Formativa',
            subtitulo: 'Antecedentes y acto administrativo',
            icono: 'document-text-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 3,
            responsable: 'Profesional Especializado TH',
            requisitos: [
              { id: 'vj3_1', label: 'Consulta de antecedentes SIRI, SIBOR, Policía, Personería, RNMC y REDAM', cumplido: true, obligatorio: true },
              { id: 'vj3_2', label: 'Proyección de Resolución de Vinculación Formativa', cumplido: true, obligatorio: true },
              { id: 'vj3_3', label: 'Firma por Director(a) de Gestión Corporativa y notificación formal', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-019' },
            ],
          },
          {
            id: 'v_prac_4',
            numero: 4,
            titulo: 'ARL & Registro CRP',
            subtitulo: 'Afiliación ARL y reserva presupuestal',
            icono: 'shield-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Auxiliar TH / Gestión Financiera',
            requisitos: [
              { id: 'vj4_1', label: 'Afiliación obligatoria a ARL por la entidad (Resolución 3546/2018)', cumplido: false, obligatorio: true },
              { id: 'vj4_2', label: 'Expedición de Certificado de Registro Presupuestal (CRP) por el valor total de la práctica', cumplido: false, obligatorio: true },
              { id: 'vj4_3', label: 'Suscripción del Compromiso de Confidencialidad de la Información (2310200-FT-268)', cumplido: false, obligatorio: true, codigoFormato: '2310200-FT-268' },
            ],
          },
          {
            id: 'v_prac_5',
            numero: 5,
            titulo: 'Acta Inicio & BogData',
            subtitulo: 'Firma tripartita y creación tercero',
            icono: 'create-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional TH / Contabilidad',
            requisitos: [
              { id: 'vj5_1', label: 'Suscripción del Acta de Inicio de práctica (Estudiante, Tutor SJD, Monitor Universidad)', cumplido: false, obligatorio: true },
              { id: 'vj5_2', label: 'Solicitud y creación de tercero en sistema financiero BogData / Contabilidad', cumplido: false, obligatorio: true },
              { id: 'vj5_3', label: 'Diligenciamiento de encuesta de condiciones de salud', cumplido: false, obligatorio: true },
            ],
          },
          {
            id: 'v_prac_6',
            numero: 6,
            titulo: 'Inducción & Ejecución',
            subtitulo: 'Puesto de trabajo e informes mensuales',
            icono: 'school-outline',
            estado: 'pending',
            tiempoEstimadoDias: 30,
            responsable: 'Tutor / Gestión Financiera',
            requisitos: [
              { id: 'vj6_1', label: 'Inducción en puesto de trabajo y entrega de elementos logísticos', cumplido: false, obligatorio: true },
              { id: 'vj6_2', label: 'Informes mensuales de ejecución de actividades aprobados por el tutor', cumplido: false, obligatorio: true },
              { id: 'vj6_3', label: 'Trámite mensual de auxilio de sostenimiento ante Gestión Financiera', cumplido: false, obligatorio: true },
            ],
          },
        ];
    }
  } else {
    // DESVINCULACIÓN (PR-074 y PR-137)
    if (modalidad === 'PRACTICANTE_JUDICANTE') {
      return [
        {
          id: 'd_prac_1',
          numero: 1,
          titulo: 'Culminación Período',
          subtitulo: 'Cumplimiento o retiro anticipado',
          icono: 'flag-outline',
          estado: 'completed',
          tiempoEstimadoDias: 1,
          responsable: 'Tutor / Estudiante',
          requisitos: [
            { id: 'dp1_1', label: 'Cumplimiento del tiempo establecido en el acuerdo o manifestación de retiro', cumplido: true, obligatorio: true },
            { id: 'dp1_2', label: 'Aviso formal a la institución de educación superior', cumplido: true, obligatorio: true },
          ],
        },
        {
          id: 'd_prac_2',
          numero: 2,
          titulo: 'Informe Final',
          subtitulo: 'Balance y aprobación del tutor',
          icono: 'document-text-outline',
          estado: 'in_progress',
          tiempoEstimadoDias: 2,
          responsable: 'Tutor / Jefe Dependencia',
          requisitos: [
            { id: 'dp2_1', label: 'Radicación del Informe Final de ejecución de actividades formativas', cumplido: true, obligatorio: true },
            { id: 'dp2_2', label: 'Visto bueno y concepto favorable del tutor institucional', cumplido: false, obligatorio: true },
          ],
        },
        {
          id: 'd_prac_3',
          numero: 3,
          titulo: 'Devolución de Bienes',
          subtitulo: 'TIC, carné y puesto de trabajo',
          icono: 'cube-outline',
          estado: 'pending',
          tiempoEstimadoDias: 1,
          responsable: 'TIC / Almacén / TH',
          requisitos: [
            { id: 'dp3_1', label: 'Entrega de equipo, token y cancelación de accesos en TIC', cumplido: false, obligatorio: true },
            { id: 'dp3_2', label: 'Devolución de carné y paz y salvo de la dependencia', cumplido: false, obligatorio: true },
          ],
        },
        {
          id: 'd_prac_4',
          numero: 4,
          titulo: 'Pago Final Auxilio',
          subtitulo: 'Liquidación último periodo',
          icono: 'cash-outline',
          estado: 'pending',
          tiempoEstimadoDias: 2,
          responsable: 'Gestión Financiera',
          requisitos: [
            { id: 'dp4_1', label: 'Certificación final de cumplimiento para pago proporcional', cumplido: false, obligatorio: true },
            { id: 'dp4_2', label: 'Memorando de trámite de pago ante Contabilidad', cumplido: false, obligatorio: true },
          ],
        },
        {
          id: 'd_prac_5',
          numero: 5,
          titulo: 'Certificación Oficial',
          subtitulo: 'Expedición certificado de judicatura/práctica',
          icono: 'ribbon-outline',
          estado: 'pending',
          tiempoEstimadoDias: 2,
          responsable: 'Dirección Gestión Corporativa',
          requisitos: [
            { id: 'dp5_1', label: 'Elaboración de Certificación con número de resolución, horas y tutor', cumplido: false, obligatorio: true },
            { id: 'dp5_2', label: 'Firma por Director(a) de Gestión Corporativa y entrega al estudiante', cumplido: false, obligatorio: true },
          ],
        },
      ];
    } else {
      // SERVIDORES (Carrera, LNR, Provisionalidad) según PR-074
      const esCarrera = modalidad === 'CARRERA_ADMINISTRATIVA';
      return [
        {
          id: 'd_serv_1',
          numero: 1,
          titulo: 'Causal de Retiro',
          subtitulo: 'Recepción y verificación legal',
          icono: 'document-text-outline',
          estado: 'completed',
          tiempoEstimadoDias: 1,
          responsable: 'Profesional Universitario TH',
          requisitos: [
            { id: 'ds1_1', label: 'Recepción del documento soporte (Renuncia escrita, Insubsistencia, Pensión, Retiro forzoso)', cumplido: true, obligatorio: true, codigoFormato: '2311520-FT-018' },
            { id: 'ds1_2', label: 'Verificación de la causal conforme al Art. 41 de la Ley 909 de 2004', cumplido: true, obligatorio: true },
            { id: 'ds1_3', label: 'Verificación de no renuncia en blanco o bajo coacción (Art. 2.2.11.1.3 Dec. 1083)', cumplido: true, obligatorio: true },
          ],
        },
        {
          id: 'd_serv_2',
          numero: 2,
          titulo: 'Acto de Desvinculación',
          subtitulo: 'Resolución de retiro oficial',
          icono: 'newspaper-outline',
          estado: 'completed',
          tiempoEstimadoDias: 2,
          responsable: 'Nominador / Técnico Notificaciones',
          requisitos: [
            { id: 'ds2_1', label: 'Elaboración de Resolución de desvinculación (Formato 2311520-FT-130)', cumplido: true, obligatorio: true, codigoFormato: '2311520-FT-130' },
            { id: 'ds2_2', label: 'Firma por autoridad nominadora, numeración y fechado', cumplido: true, obligatorio: true },
            { id: 'ds2_3', label: 'Comunicación formal al servidor por correo certificado o electrónico', cumplido: true, obligatorio: true, codigoFormato: '2311520-FT-019' },
          ],
        },
        {
          id: 'd_serv_3',
          numero: 3,
          titulo: 'Formatos Entrega Empleo',
          subtitulo: 'FT-333, FT-219, FT-436 y SIDEAP',
          icono: 'folder-open-outline',
          estado: 'in_progress',
          tiempoEstimadoDias: 2,
          responsable: 'Servidor saliente / Control Interno',
          requisitos: [
            { id: 'ds3_1', label: 'Diligenciamiento de Evaluación de Retiro (Formato 2311300-FT-219)', cumplido: true, obligatorio: true, codigoFormato: '2311300-FT-219' },
            { id: 'ds3_2', label: 'Entrega de Cargo por Ausencia Temporal o Retiro Definitivo (2311300-FT-436)', cumplido: true, obligatorio: true, codigoFormato: '2311300-FT-436' },
            { id: 'ds3_3', label: 'Acta de Informe de Gestión y Entrega del Cargo (2311300-FT-333)', cumplido: false, obligatorio: true, codigoFormato: '2311300-FT-333', notaNormativa: 'Si es directivo, copia obligatoria a Control Interno Ley 951/2005' },
            { id: 'ds3_4', label: 'Declaración de Bienes y Rentas en SIDEAP marcando opción Retiro', cumplido: false, obligatorio: true },
            { id: 'ds3_5', label: 'Declaración de Conflicto de Intereses seleccionando Retiro del Servicio', cumplido: false, obligatorio: true },
          ],
        },
        {
          id: 'd_serv_4',
          numero: 4,
          titulo: 'Examen & 4 Paz y Salvos',
          subtitulo: 'Egreso SST, TIC, Almacén y Archivo',
          icono: 'checkbox-outline',
          estado: 'pending',
          tiempoEstimadoDias: 3,
          responsable: 'SST / TIC / Almacén / Archivo',
          requisitos: [
            { id: 'ds4_1', label: 'Citación y práctica de Examen Médico Ocupacional de Egreso (plazo 5 días hábiles)', cumplido: false, obligatorio: true },
            { id: 'ds4_2', label: 'Paz y Salvo TIC: Entrega de computador, periféricos, cierre correo y accesos', cumplido: false, obligatorio: true },
            { id: 'ds4_3', label: 'Paz y Salvo Almacén: Devolución de bienes muebles individuales (2311500-FT-200)', cumplido: false, obligatorio: true, codigoFormato: '2311500-FT-200' },
            { id: 'ds4_4', label: 'Paz y Salvo Archivo: Transferencia de expedientes judiciales/administrativos', cumplido: false, obligatorio: true },
            { id: 'ds4_5', label: 'Paz y Salvo Talento Humano: Devolución carné institucional y firmas completas', cumplido: false, obligatorio: true },
          ],
        },
        {
          id: 'd_serv_5',
          numero: 5,
          titulo: 'Liquidación & Nómina',
          subtitulo: 'Cálculo de prestaciones y pago',
          icono: 'cash-outline',
          estado: 'pending',
          tiempoEstimadoDias: 3,
          responsable: 'Profesional Especializado Nómina',
          requisitos: [
            { id: 'ds5_1', label: 'Registro de novedad de retiro en nómina y desactivación en SIDEAP', cumplido: false, obligatorio: true },
            { id: 'ds5_2', label: 'Liquidación técnica de prestaciones (vacaciones, cesantías, primas y salarios)', cumplido: false, obligatorio: true },
            { id: 'ds5_3', label: 'Elaboración de Resolución de Reconocimiento y Liquidación de Prestaciones', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-130' },
            { id: 'ds5_4', label: 'Notificación del acto de liquidación y remisión formal a Nómina para pago', cumplido: false, obligatorio: true },
          ],
        },
        {
          id: 'd_serv_6',
          numero: 6,
          titulo: esCarrera ? 'SIMO 4.4, RPCA & Cierre' : 'Cierre Historia Laboral',
          subtitulo: esCarrera ? 'Reporte obligatorio CNSC (5 días) y RPCA' : 'Archivo definitivo en Historia Laboral',
          icono: 'checkmark-done-circle-outline',
          estado: 'pending',
          tiempoEstimadoDias: esCarrera ? 5 : 1,
          responsable: 'Profesional TH / Archivo',
          requisitos: esCarrera
            ? [
                { id: 'ds6_1', label: 'Reporte de vacancia definitiva en SIMO 4.4 ante la CNSC (plazo 5 días hábiles Circular 011/2021)', cumplido: false, obligatorio: true },
                { id: 'ds6_2', label: 'Cancelación del Registro Público de Carrera Administrativa (RPCA) ante la CNSC', cumplido: false, obligatorio: true },
                { id: 'ds6_3', label: 'Archivo integral en Historia Laboral física y electrónica (Hoja de Control 2311520-FT-244)', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-244' },
              ]
            : [
                { id: 'ds6_1_nc', label: 'Actualización y archivo de soportes en Historia Laboral (Hoja Control 2311520-FT-244)', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-244' },
                { id: 'ds6_2_nc', label: 'Constatación de entrega de copia a Control Interno si pertenecía a nivel directivo', cumplido: false, obligatorio: true },
              ],
        },
      ];
    }
  }
}

// Casos predefinidos para demostración inmediata
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
    etapa_activa_id: 'd_serv_3',
    observaciones: 'Plaza de carrera administrativa en vacancia definitiva. Pendiente radicación en SIMO 4.4.',
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
    etapa_activa_id: 'v_lnr_3',
    observaciones: 'Postulada a nivel directivo. Cumple cuota de género. En publicación web de 5 días.',
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
    etapa_activa_id: 'd_serv_3',
    observaciones: 'Pensión concedida por Colpensiones. En trámite entrega de puesto.',
  },
];

// Causales legales de retiro
const CAUSALES_RETIRO = [
  'Renuncia regularmente aceptada (Art. 41 lit. a)',
  'Obtención de pensión de vejez o invalidez (Art. 41 lit. b)',
  'Declaratoria de insubsistencia - Libre Nombramiento y Remoción (Art. 41 lit. c)',
  'Revocatoria / Insubsistencia de Nombramiento Provisional',
  'Destitución como consecuencia de proceso disciplinario (Art. 41 lit. d)',
  'Declaratoria de insubsistencia por Calificación No Satisfactoria (Art. 41 lit. e)',
  'Supresión del empleo de carrera con indemnización o reincorporación (Art. 41 lit. f)',
  'Edad de retiro forzoso - 70 años (Ley 1821 de 2016 / Art. 41 lit. g)',
  'Declaratoria de vacancia del empleo por abandono del mismo (Art. 41 lit. i)',
  'Muerte del servidor (Art. 41 lit. n)',
];

export default function DesvinculacionesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isTablet = width >= 640;

  // Estado del tema: 'dark' (versión actual predeterminada) o 'light' (versión clara de accesibilidad)
  const [colorMode, setColorMode] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedTheme = localStorage.getItem('sasge_color_mode');
      const docTheme = document.documentElement.getAttribute('data-theme');
      if (savedTheme === 'light' || docTheme === 'light') {
        setColorMode('light');
      } else {
        setColorMode('dark');
      }
    } catch (e) {}

    const handleThemeChange = (e: any) => {
      const mode = e?.detail;
      if (mode === 'light') {
        setColorMode('light');
      } else if (mode === 'dark' || mode === 'normal' || mode === 'grayscale') {
        setColorMode('dark');
      }
    };
    window.addEventListener('sasge_color_mode_change', handleThemeChange);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          const theme = document.documentElement.getAttribute('data-theme');
          if (theme === 'light') {
            setColorMode('light');
          } else {
            setColorMode('dark');
          }
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      window.removeEventListener('sasge_color_mode_change', handleThemeChange);
      observer.disconnect();
    };
  }, []);

  const isDark = colorMode === 'dark';
  const COLORS = isDark ? DARK_THEME : LIGHT_THEME;

  const alternarTema = () => {
    const nuevo = isDark ? 'light' : 'dark';
    setColorMode(nuevo);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        localStorage.setItem('sasge_color_mode', nuevo);
        document.documentElement.setAttribute('data-theme', nuevo);
        window.dispatchEvent(new CustomEvent('sasge_color_mode_change', { detail: nuevo }));
      } catch (e) {}
    }
  };

  // Pestañas principales
  const [tabActiva, setTabActiva] = useState<'flujos' | 'matriz_normativa' | 'paz_salvo'>('flujos');

  // Filtros de Trámites
  const [filtroTipoProceso, setFiltroTipoProceso] = useState<'TODOS' | 'DESVINCULACION' | 'VINCULACION'>('TODOS');
  const [filtroModalidad, setFiltroModalidad] = useState<'TODAS' | ModalidadPersonal>('TODAS');
  const [busqueda, setBusqueda] = useState('');

  // Casos con flujos
  const [casos, setCasos] = useState<CasoFlujoFuncionario[]>(CASOS_BASE);

  // Caso enfocado para detalle y edición de requisitos
  const [casoSeleccionadoId, setCasoSeleccionadoId] = useState<string>(CASOS_BASE[0].id);

  // Modal para registrar nuevo trámite
  const [modalRegistroVisible, setModalRegistroVisible] = useState(false);
  const [nuevoTipoProceso, setNuevoTipoProceso] = useState<TipoProceso>('DESVINCULACION');
  const [nuevaModalidad, setNuevaModalidad] = useState<ModalidadPersonal>('CARRERA_ADMINISTRATIVA');
  const [plazaSeleccionadaId, setPlazaSeleccionadaId] = useState<number | null>(null);
  const [nombreInput, setNombreInput] = useState('');
  const [cedulaInput, setCedulaInput] = useState('');
  const [cargoInput, setCargoInput] = useState('');
  const [dependenciaInput, setDependenciaInput] = useState('');
  const [causalInput, setCausalInput] = useState(CAUSALES_RETIRO[0]);
  const [actoAdminInput, setActoAdminInput] = useState('');
  const [fechaEfectivaInput, setFechaEfectivaInput] = useState('');

  // Modal informativo (Regla: Modals en vez de alerts)
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalTitulo, setInfoModalTitulo] = useState('');
  const [infoModalMensaje, setInfoModalMensaje] = useState('');
  const [infoModalTipo, setInfoModalTipo] = useState<'success' | 'info' | 'warning'>('info');

  const mostrarModal = (titulo: string, mensaje: string, tipo: 'success' | 'info' | 'warning' = 'info') => {
    setInfoModalTitulo(titulo);
    setInfoModalMensaje(mensaje);
    setInfoModalTipo(tipo);
    setInfoModalVisible(true);
  };

  // Lista de servidores de la planta para selección rápida
  const servidoresPlanta = useMemo(() => {
    return (mockPlazasData as any[]).filter(
      (p) => p.titular_nombre && !p.titular_nombre.includes('VACANTE')
    );
  }, []);

  // Filtrado de casos
  const casosFiltrados = useMemo(() => {
    let result = casos;
    if (filtroTipoProceso !== 'TODOS') {
      result = result.filter((c) => c.tipo_proceso === filtroTipoProceso);
    }
    if (filtroModalidad !== 'TODAS') {
      result = result.filter((c) => c.modalidad === filtroModalidad);
    }
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.servidor_nombre.toLowerCase().includes(q) ||
          c.servidor_cedula.includes(q) ||
          c.cargo.toLowerCase().includes(q) ||
          c.dependencia.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [casos, filtroTipoProceso, filtroModalidad, busqueda]);

  // Caso actualmente seleccionado
  const casoActivo = useMemo(() => {
    return casos.find((c) => c.id === casoSeleccionadoId) || casos[0];
  }, [casos, casoSeleccionadoId]);

  // Alternar cumplimiento de requisito y recalcular estado de la etapa
  const toggleRequisito = (casoId: string, etapaId: string, requisitoId: string) => {
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
              fecha_cumplimiento: !req.cumplido ? new Date().toISOString().split('T')[0] : undefined,
            };
          });

          // Si todos los requisitos obligatorios están cumplidos -> ETAPA COMPLETADA (VERDE)
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

        // Asegurar que si una etapa se completa, la siguiente no completada pase a 'in_progress'
        let siguienteHabilitada = false;
        for (let i = 0; i < nuevasEtapas.length; i++) {
          if (nuevasEtapas[i].estado === 'completed') {
            continue;
          }
          if (!siguienteHabilitada) {
            if (nuevasEtapas[i].estado === 'pending') {
              nuevasEtapas[i].estado = 'in_progress';
            }
            siguienteHabilitada = true;
          }
        }

        return {
          ...caso,
          etapas: nuevasEtapas,
        };
      })
    );
  };

  // Marcar toda una etapa como completada
  const completarEtapaCompleta = (casoId: string, etapaId: string) => {
    setCasos((prevCasos) =>
      prevCasos.map((caso) => {
        if (caso.id !== casoId) return caso;

        let indexModificado = -1;
        const nuevasEtapas = caso.etapas.map((etapa, idx) => {
          if (etapa.id !== etapaId) return etapa;
          indexModificado = idx;
          return {
            ...etapa,
            estado: 'completed' as EstadoEtapa,
            requisitos: etapa.requisitos.map((r) => ({
              ...r,
              cumplido: true,
              fecha_cumplimiento: r.fecha_cumplimiento || new Date().toISOString().split('T')[0],
            })),
          };
        });

        // Activar la siguiente etapa si estaba pendiente
        if (indexModificado >= 0 && indexModificado + 1 < nuevasEtapas.length) {
          if (nuevasEtapas[indexModificado + 1].estado === 'pending') {
            nuevasEtapas[indexModificado + 1].estado = 'in_progress';
          }
        }

        return { ...caso, etapas: nuevasEtapas };
      })
    );

    mostrarModal(
      'Etapa Completada',
      'Todos los requisitos de esta fase han sido registrados satisfactoriamente. El flujo se ha actualizado a verde.',
      'success'
    );
  };

  // Crear nuevo caso de trámite
  const handleCrearTramite = () => {
    if (!nombreInput.trim() || !cedulaInput.trim() || !cargoInput.trim()) {
      mostrarModal('Faltan Datos', 'Ingrese el nombre, cédula y cargo del funcionario.', 'warning');
      return;
    }

    const nuevoId = `TR-${new Date().getFullYear()}-${String(casos.length + 1).padStart(3, '0')}`;
    const etapasGeneradas = generarEtapasParaCaso(nuevoTipoProceso, nuevaModalidad);

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
      acto_administrativo: actoAdminInput.trim() || undefined,
      fecha_inicio_tramite: new Date().toISOString().split('T')[0],
      fecha_efectiva: fechaEfectivaInput.trim() || undefined,
      etapas: etapasGeneradas,
      etapa_activa_id: etapasGeneradas[0].id,
    };

    setCasos([nuevoCaso, ...casos]);
    setCasoSeleccionadoId(nuevoId);
    setModalRegistroVisible(false);

    // Limpiar formulario
    setNombreInput('');
    setCedulaInput('');
    setCargoInput('');
    setDependenciaInput('');
    setPlazaSeleccionadaId(null);
    setActoAdminInput('');
    setFechaEfectivaInput('');

    mostrarModal(
      'Trámite Creado Exitosamente',
      `Se generó el flujo interactivo ${nuevoId} para ${nuevoCaso.servidor_nombre} con sus etapas y requisitos normativos específicos.`,
      'success'
    );
  };

  // Helper para etiqueta de modalidad
  const obtenerLabelModalidad = (mod: ModalidadPersonal) => {
    switch (mod) {
      case 'CARRERA_ADMINISTRATIVA':
        return 'Carrera Administrativa';
      case 'LIBRE_NOMBRAMIENTO':
        return 'Libre Nombramiento y Remoción';
      case 'PROVISIONALIDAD':
        return 'Provisionalidad';
      case 'PRACTICANTE_JUDICANTE':
        return 'Practicante / Judicante';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.darkBg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* ================================================================= */}
        {/* CABECERA SUPERIOR INSTITUCIONAL CON ACCIONES Y TEMA               */}
        {/* ================================================================= */}
        <View
          style={{
            backgroundColor: COLORS.headerBg,
            paddingTop: Platform.OS === 'ios' ? 14 : 12,
            paddingBottom: 14,
            paddingHorizontal: isDesktop ? 36 : 18,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pressable
              onPress={() => router.replace('/rrhh')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: pressed
                  ? (isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0')
                  : (isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9'),
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              })}
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.textTitle} />
              <Text style={{ color: COLORS.textTitle, fontSize: 13, fontWeight: '700' }}>
                Módulos RRHH
              </Text>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#F3E8FF',
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(167, 139, 250, 0.4)' : '#DDD6FE',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="git-network-outline" size={24} color={COLORS.purpleAccent} />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: COLORS.textTitle, fontSize: 20, fontWeight: '900', letterSpacing: 0.3 }}>
                    Vinculación, Desvinculación & Etapas
                  </Text>
                  <View
                    style={{
                      backgroundColor: COLORS.badgePurpleBg,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: COLORS.badgePurpleBorder,
                    }}
                  >
                    <Text style={{ color: COLORS.badgePurpleText, fontSize: 10, fontWeight: '800' }}>
                      PR-074 • PR-145 • PR-137
                    </Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                  Flujos Horizontales por Funcionario: Carrera, LNR, Provisionales y Practicantes
                </Text>
              </View>
            </View>
          </View>

          {/* Botones de acción rápida */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Conmutador de Tema (Sincronizado con Barra de Accesibilidad) */}
            <Pressable
              onPress={alternarTema}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={isDark ? "Cambiar a versión clara" : "Cambiar a versión oscura"}
              accessibilityHint="Alterna entre el modo oscuro actual y el modo claro institucional"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                backgroundColor: pressed
                  ? (isDark ? 'rgba(255, 255, 255, 0.16)' : '#E2E8F0')
                  : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'),
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : '#CBD5E1',
              })}
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={17}
                color={isDark ? '#FCD34D' : '#6D28D9'}
              />
              <Text
                style={{
                  color: isDark ? '#FFFFFF' : '#1E293B',
                  fontSize: 12.5,
                  fontWeight: '700',
                }}
              >
                {isDark ? '☀️ Versión Clara' : '🌙 Versión Oscura'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setModalRegistroVisible(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: pressed ? COLORS.btnPrimaryHover : COLORS.btnPrimaryBg,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.35)',
              })}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Nuevo Trámite de Personal
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ================================================================= */}
        {/* PESTAÑAS PRINCIPALES DE NAVEGACIÓN                                */}
        {/* ================================================================= */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: COLORS.tabBarBg,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            paddingHorizontal: isDesktop ? 36 : 18,
          }}
        >
          <Pressable
            onPress={() => setTabActiva('flujos')}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 3,
              borderBottomColor: tabActiva === 'flujos' ? COLORS.tabActiveBorder : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="git-commit-outline"
              size={18}
              color={tabActiva === 'flujos' ? COLORS.tabActiveBorder : COLORS.tabInactiveText}
            />
            <Text
              style={{
                color: tabActiva === 'flujos' ? COLORS.tabActiveText : COLORS.tabInactiveText,
                fontWeight: tabActiva === 'flujos' ? '800' : '600',
                fontSize: 14,
              }}
            >
              Flujos por Funcionario ({casos.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTabActiva('matriz_normativa')}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 3,
              borderBottomColor: tabActiva === 'matriz_normativa' ? COLORS.tabActiveBorder : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="book-outline"
              size={18}
              color={tabActiva === 'matriz_normativa' ? COLORS.tabActiveBorder : COLORS.tabInactiveText}
            />
            <Text
              style={{
                color: tabActiva === 'matriz_normativa' ? COLORS.tabActiveText : COLORS.tabInactiveText,
                fontWeight: tabActiva === 'matriz_normativa' ? '800' : '600',
                fontSize: 14,
              }}
            >
              Guía de Procedimientos (PR-074, PR-145 & PR-137)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTabActiva('paz_salvo')}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 3,
              borderBottomColor: tabActiva === 'paz_salvo' ? COLORS.tabActiveBorder : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="checkmark-done-circle-outline"
              size={18}
              color={tabActiva === 'paz_salvo' ? COLORS.tabActiveBorder : COLORS.tabInactiveText}
            />
            <Text
              style={{
                color: tabActiva === 'paz_salvo' ? COLORS.tabActiveText : COLORS.tabInactiveText,
                fontWeight: tabActiva === 'paz_salvo' ? '800' : '600',
                fontSize: 14,
              }}
            >
              Circuito de Paz y Salvo Digital
            </Text>
          </Pressable>
        </View>

        {/* ================================================================= */}
        {/* PESTAÑA 1: FLUJOS POR FUNCIONARIO (HORIZONTAL PIPELINE)           */}
        {/* ================================================================= */}
        {tabActiva === 'flujos' && (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: isDesktop ? 36 : 18,
              paddingTop: 16,
              paddingBottom: 40,
              gap: 16,
            }}
          >
            {/* Banner Informativo de Circular CNSC y Plazos de Ley */}
            <View
              style={{
                backgroundColor: COLORS.bannerBg,
                borderWidth: 1.5,
                borderColor: COLORS.bannerBorder,
                borderRadius: 14,
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
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: COLORS.bannerIconBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="hourglass-outline" size={22} color={COLORS.amberAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.bannerTitle, fontSize: 13, fontWeight: '800' }}>
                    SISTEMA DE GESTIÓN POR ETAPAS SEGÚN PROCEDIMIENTOS SJD
                  </Text>
                  <Text style={{ color: COLORS.bannerText, fontSize: 12, marginTop: 2, lineHeight: 18 }}>
                    A medida que se llenen los requisitos de cada fase, el nodo se iluminará en{' '}
                    <Text style={{ color: '#10B981', fontWeight: '800' }}>color verde</Text> de completo.{' '}
                    Recuerde que en desvinculaciones de carrera aplica el plazo de{' '}
                    <Text style={{ color: COLORS.bannerTitle, fontWeight: '800' }}>5 días hábiles</Text> para reporte en SIMO 4.4 (Circular 011/2021).
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setTabActiva('matriz_normativa')}
                style={{
                  backgroundColor: COLORS.bannerButtonBg,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.bannerBorder,
                }}
              >
                <Text style={{ color: COLORS.bannerButtonText, fontSize: 12, fontWeight: '700' }}>
                  Ver Normatividad
                </Text>
              </Pressable>
            </View>

            {/* Barra de Filtros: Tipo de Proceso, Modalidad y Búsqueda */}
            <View
              style={{
                backgroundColor: COLORS.cardBg,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 12,
                boxShadow: isDark ? undefined : '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {/* Buscador */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.inputBg,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Ionicons name="search" size={18} color={COLORS.textMuted} />
                <TextInput
                  value={busqueda}
                  onChangeText={setBusqueda}
                  placeholder="Buscar por funcionario, cédula, cargo o código de trámite..."
                  placeholderTextColor={COLORS.inputPlaceholder}
                  style={{
                    flex: 1,
                    color: COLORS.inputText,
                    paddingVertical: 9,
                    paddingHorizontal: 8,
                    fontSize: 13,
                  }}
                />
              </View>

              {/* Filtros por Chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>Proceso:</Text>
                {(['TODOS', 'VINCULACION', 'DESVINCULACION'] as const).map((tipo) => {
                  const sel = filtroTipoProceso === tipo;
                  return (
                    <Pressable
                      key={tipo}
                      onPress={() => setFiltroTipoProceso(tipo)}
                      style={{
                        backgroundColor: sel ? COLORS.chipActiveBg : COLORS.chipInactiveBg,
                        paddingHorizontal: 11,
                        paddingVertical: 5,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: sel ? COLORS.chipActiveBg : COLORS.chipInactiveBorder,
                      }}
                    >
                      <Text
                        style={{
                          color: sel ? COLORS.chipActiveText : COLORS.chipInactiveText,
                          fontSize: 11.5,
                          fontWeight: sel ? '800' : '600',
                        }}
                      >
                        {tipo === 'TODOS'
                          ? 'Todos'
                          : tipo === 'VINCULACION'
                          ? '🟢 Vinculación (Ingreso)'
                          : '🔴 Desvinculación (Retiro)'}
                      </Text>
                    </Pressable>
                  );
                })}

                <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700', marginLeft: 8 }}>
                  Modalidad:
                </Text>
                {(
                  [
                    'TODAS',
                    'CARRERA_ADMINISTRATIVA',
                    'LIBRE_NOMBRAMIENTO',
                    'PROVISIONALIDAD',
                    'PRACTICANTE_JUDICANTE',
                  ] as const
                ).map((mod) => {
                  const sel = filtroModalidad === mod;
                  return (
                    <Pressable
                      key={mod}
                      onPress={() => setFiltroModalidad(mod)}
                      style={{
                        backgroundColor: sel ? COLORS.chipActiveBg : COLORS.chipInactiveBg,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: sel ? COLORS.chipActiveBg : COLORS.chipInactiveBorder,
                      }}
                    >
                      <Text
                        style={{
                          color: sel ? COLORS.chipActiveText : COLORS.chipInactiveText,
                          fontSize: 11.5,
                          fontWeight: sel ? '800' : '600',
                        }}
                      >
                        {mod === 'TODAS'
                          ? 'Todas'
                          : mod === 'CARRERA_ADMINISTRATIVA'
                          ? 'Carrera'
                          : mod === 'LIBRE_NOMBRAMIENTO'
                          ? 'LNR'
                          : mod === 'PROVISIONALIDAD'
                          ? 'Provisional'
                          : 'Practicante'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Listado de Casos y sus Pipelines Horizontales */}
            {casosFiltrados.length === 0 ? (
              <View
                style={{
                  backgroundColor: COLORS.cardBg,
                  borderRadius: 14,
                  padding: 40,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
                <Text style={{ color: COLORS.textTitle, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
                  No se encontraron trámites con los filtros seleccionados
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>
                  Utilice el botón "Nuevo Trámite de Personal" para crear un flujo.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 20 }}>
                {casosFiltrados.map((caso) => {
                  const etapasCompletadas = caso.etapas.filter((e) => e.estado === 'completed').length;
                  const totalEtapas = caso.etapas.length;
                  const porcentaje = Math.round((etapasCompletadas / totalEtapas) * 100);
                  const estaEnfocado = caso.id === casoActivo?.id;

                  // Etapa activa o seleccionada para desplegar requisitos
                  const etapaSeleccionada =
                    caso.etapas.find((e) => e.id === caso.etapa_activa_id) ||
                    caso.etapas.find((e) => e.estado === 'in_progress') ||
                    caso.etapas[0];

                  return (
                    <View
                      key={caso.id}
                      style={{
                        backgroundColor: COLORS.cardBg,
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor:
                          porcentaje === 100
                            ? COLORS.cardBorderCompleted
                            : estaEnfocado
                            ? COLORS.cardBorderInProgress
                            : COLORS.border,
                        padding: 20,
                        gap: 16,
                        boxShadow: isDark ? undefined : '0 4px 14px rgba(0,0,0,0.05)',
                      }}
                    >
                      {/* Cabecera del Caso */}
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <View style={{ gap: 4, flex: 1, minWidth: 260 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            {/* Badge de Tipo de Proceso */}
                            <View
                              style={{
                                backgroundColor:
                                  caso.tipo_proceso === 'VINCULACION'
                                    ? (isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5')
                                    : (isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2'),
                                paddingHorizontal: 9,
                                paddingVertical: 3,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor:
                                  caso.tipo_proceso === 'VINCULACION'
                                    ? (isDark ? '#10B981' : '#A7F3D0')
                                    : (isDark ? '#EF4444' : '#FECACA'),
                              }}
                            >
                              <Text
                                style={{
                                  color:
                                    caso.tipo_proceso === 'VINCULACION'
                                      ? (isDark ? '#34D399' : '#065F46')
                                      : (isDark ? '#F87171' : '#991B1B'),
                                  fontSize: 11,
                                  fontWeight: '800',
                                }}
                              >
                                {caso.tipo_proceso === 'VINCULACION' ? '🟢 VINCULACIÓN' : '🔴 DESVINCULACIÓN'}
                              </Text>
                            </View>

                            {/* Badge de Modalidad */}
                            <View
                              style={{
                                backgroundColor: COLORS.badgePurpleBg,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ color: COLORS.badgePurpleText, fontSize: 11, fontWeight: '800' }}>
                                {obtenerLabelModalidad(caso.modalidad)}
                              </Text>
                            </View>

                            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                              Trámite: <Text style={{ color: COLORS.textTitle, fontWeight: '700' }}>{caso.id}</Text>
                            </Text>
                          </View>

                          <Text style={{ color: COLORS.textTitle, fontSize: 17, fontWeight: '900', marginTop: 4 }}>
                            {caso.servidor_nombre}
                          </Text>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            <Text style={{ color: COLORS.textMuted, fontSize: 12.5 }}>
                              C.C. <Text style={{ color: COLORS.textTitle }}>{caso.servidor_cedula}</Text>
                            </Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 12.5 }}>•</Text>
                            <Text style={{ color: isDark ? '#E2E8F0' : '#1E293B', fontSize: 12.5, fontWeight: '700' }}>
                              {caso.cargo} {caso.codigo ? `(${caso.codigo}-${caso.grado})` : ''}
                            </Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 12.5 }}>•</Text>
                            <Text style={{ color: COLORS.textSecondary, fontSize: 12.5 }}>
                              {caso.dependencia}
                            </Text>
                          </View>

                          {caso.causal && (
                            <Text style={{ color: COLORS.amberAccent, fontSize: 12, marginTop: 2 }}>
                              Causal: <Text style={{ color: COLORS.textSecondary }}>{caso.causal}</Text>
                            </Text>
                          )}
                        </View>

                        {/* Barra de Progreso Acumulada */}
                        <View style={{ alignItems: isTablet ? 'flex-end' : 'flex-start', minWidth: 200, gap: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text
                              style={{
                                color: porcentaje === 100 ? '#10B981' : COLORS.textTitle,
                                fontSize: 14,
                                fontWeight: '900',
                              }}
                            >
                              {porcentaje}% COMPLETADO
                            </Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                              ({etapasCompletadas}/{totalEtapas} etapas)
                            </Text>
                          </View>

                          <View
                            style={{
                              width: 190,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: COLORS.progressBarBg,
                              overflow: 'hidden',
                            }}
                          >
                            <View
                              style={{
                                width: `${porcentaje}%`,
                                height: '100%',
                                backgroundColor: COLORS.progressBarFill,
                                borderRadius: 4,
                              }}
                            />
                          </View>

                          <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>
                            Inicio: {caso.fecha_inicio_tramite}
                            {caso.fecha_efectiva ? ` • Efectivo: ${caso.fecha_efectiva}` : ''}
                          </Text>
                        </View>
                      </View>

                      {/* ======================================================= */}
                      {/* PIPELINE HORIZONTAL INTERACTIVO (HORIZONTAL STEPPER)     */}
                      {/* ======================================================= */}
                      <View style={{ marginTop: 6 }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.5, marginBottom: 10 }}>
                          LÍNEA DE TIEMPO HORIZONTAL DEL TRÁMITE (Toca una etapa para ver sus requisitos):
                        </Text>

                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{
                            alignItems: 'center',
                            paddingVertical: 10,
                            paddingHorizontal: 4,
                          }}
                        >
                          {caso.etapas.map((etapa, idx) => {
                            const esUltima = idx === caso.etapas.length - 1;
                            const estaCompleta = etapa.estado === 'completed';
                            const estaEnCurso = etapa.estado === 'in_progress';
                            const estaSeleccionada = etapa.id === etapaSeleccionada.id;

                            return (
                              <React.Fragment key={etapa.id}>
                                {/* Nodo de la Etapa */}
                                <Pressable
                                  onPress={() => {
                                    setCasoSeleccionadoId(caso.id);
                                    setCasos((prev) =>
                                      prev.map((c) =>
                                        c.id === caso.id ? { ...c, etapa_activa_id: etapa.id } : c
                                      )
                                    );
                                  }}
                                  style={{
                                    alignItems: 'center',
                                    width: 145,
                                    cursor: 'pointer' as any,
                                  }}
                                >
                                  {/* Círculo indicador */}
                                  <View
                                    style={{
                                      width: 44,
                                      height: 44,
                                      borderRadius: 22,
                                      backgroundColor: estaCompleta
                                        ? COLORS.stepperNodeDoneBg
                                        : estaEnCurso
                                        ? COLORS.stepperNodeActiveBg
                                        : COLORS.stepperNodePendingBg,
                                      borderWidth: estaSeleccionada ? 3 : 2,
                                      borderColor: estaCompleta
                                        ? COLORS.stepperNodeDoneBorder
                                        : estaEnCurso
                                        ? COLORS.stepperNodeActiveBorder
                                        : COLORS.stepperNodePendingBorder,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: estaCompleta
                                        ? '0 2px 10px rgba(16, 185, 129, 0.4)'
                                        : estaEnCurso
                                        ? '0 2px 10px rgba(124, 58, 237, 0.4)'
                                        : undefined,
                                    }}
                                  >
                                    {estaCompleta ? (
                                      <Ionicons name="checkmark-sharp" size={24} color="#FFFFFF" />
                                    ) : (
                                      <Ionicons
                                        name={etapa.icono}
                                        size={20}
                                        color={estaEnCurso ? '#FFFFFF' : COLORS.stepperNodePendingText}
                                      />
                                    )}
                                  </View>

                                  {/* Etiqueta de la Etapa */}
                                  <Text
                                    numberOfLines={1}
                                    style={{
                                      color: estaCompleta
                                        ? '#10B981'
                                        : estaEnCurso
                                        ? (isDark ? '#C4B5FD' : '#7C3AED')
                                        : COLORS.textMuted,
                                      fontSize: 12,
                                      fontWeight: estaSeleccionada ? '900' : '700',
                                      marginTop: 8,
                                      textAlign: 'center',
                                      maxWidth: 130,
                                    }}
                                  >
                                    {etapa.numero}. {etapa.titulo}
                                  </Text>

                                  {/* Badge de Estado */}
                                  <View
                                    style={{
                                      marginTop: 4,
                                      backgroundColor: estaCompleta
                                        ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5')
                                        : estaEnCurso
                                        ? (isDark ? 'rgba(124, 58, 237, 0.25)' : '#EDE9FE')
                                        : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9'),
                                      paddingHorizontal: 7,
                                      paddingVertical: 2,
                                      borderRadius: 10,
                                      borderWidth: 1,
                                      borderColor: estaCompleta
                                        ? '#10B981'
                                        : estaEnCurso
                                        ? '#7C3AED'
                                        : COLORS.border,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color: estaCompleta
                                          ? '#10B981'
                                          : estaEnCurso
                                          ? (isDark ? '#C4B5FD' : '#6D28D9')
                                          : COLORS.textMuted,
                                        fontSize: 9.5,
                                        fontWeight: '800',
                                      }}
                                    >
                                      {estaCompleta
                                        ? '✓ COMPLETO'
                                        : estaEnCurso
                                        ? '⚙️ EN CURSO'
                                        : 'PENDIENTE'}
                                    </Text>
                                  </View>
                                </Pressable>

                                {/* Línea Conectora Horizontal */}
                                {!esUltima && (
                                  <View
                                    style={{
                                      width: 48,
                                      height: 3,
                                      backgroundColor: estaCompleta
                                        ? COLORS.stepperLineDone
                                        : COLORS.stepperLinePending,
                                      marginBottom: 34,
                                    }}
                                  />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </ScrollView>
                      </View>

                      {/* ======================================================= */}
                      {/* PANEL DE DETALLE Y REQUISITOS DE LA ETAPA SELECCIONADA   */}
                      {/* ======================================================= */}
                      <View
                        style={{
                          backgroundColor: COLORS.cardSecondaryBg,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor:
                            etapaSeleccionada.estado === 'completed'
                              ? '#10B981'
                              : estaEnfocado
                              ? COLORS.purpleAccent
                              : COLORS.border,
                          padding: 16,
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
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor:
                                  etapaSeleccionada.estado === 'completed' ? '#10B981' : COLORS.purpleDark,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Ionicons
                                name={etapaSeleccionada.estado === 'completed' ? 'checkmark' : etapaSeleccionada.icono}
                                size={18}
                                color="#FFFFFF"
                              />
                            </View>
                            <View>
                              <Text style={{ color: COLORS.textTitle, fontSize: 14.5, fontWeight: '800' }}>
                                Etapa {etapaSeleccionada.numero}: {etapaSeleccionada.titulo}
                              </Text>
                              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                                {etapaSeleccionada.subtitulo} • Responsable: {etapaSeleccionada.responsable}
                              </Text>
                            </View>
                          </View>

                          {/* Botón Acción Rápida: Completar Todos los Requisitos de la Etapa */}
                          {etapaSeleccionada.estado !== 'completed' && (
                            <Pressable
                              onPress={() => completarEtapaCompleta(caso.id, etapaSeleccionada.id)}
                              style={({ pressed }) => ({
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: pressed ? '#059669' : '#10B981',
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                borderRadius: 8,
                              })}
                            >
                              <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                                Marcar Etapa Completa
                              </Text>
                            </Pressable>
                          )}
                        </View>

                        {/* Lista Interactiva de Requisitos */}
                        <View style={{ gap: 8, marginTop: 4 }}>
                          {etapaSeleccionada.requisitos.map((req) => {
                            return (
                              <Pressable
                                key={req.id}
                                onPress={() => toggleRequisito(caso.id, etapaSeleccionada.id, req.id)}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 10,
                                  backgroundColor: req.cumplido
                                    ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5')
                                    : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF'),
                                  padding: 10,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: req.cumplido
                                    ? (isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0')
                                    : COLORS.border,
                                }}
                              >
                                <Ionicons
                                  name={req.cumplido ? 'checkbox' : 'square-outline'}
                                  size={20}
                                  color={req.cumplido ? '#10B981' : COLORS.textMuted}
                                />

                                <View style={{ flex: 1, gap: 2 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                    <Text
                                      style={{
                                        color: req.cumplido ? (isDark ? '#34D399' : '#065F46') : COLORS.textTitle,
                                        fontSize: 12.5,
                                        fontWeight: req.cumplido ? '700' : '500',
                                        textDecorationLine: req.cumplido ? 'line-through' : 'none',
                                      }}
                                    >
                                      {req.label}
                                    </Text>

                                    {req.codigoFormato && (
                                      <View
                                        style={{
                                          backgroundColor: isDark ? 'rgba(124, 58, 237, 0.25)' : '#EDE9FE',
                                          paddingHorizontal: 6,
                                          paddingVertical: 1,
                                          borderRadius: 4,
                                          borderWidth: 1,
                                          borderColor: isDark ? '#7C3AED' : '#C4B5FD',
                                        }}
                                      >
                                        <Text
                                          style={{
                                            color: isDark ? '#C4B5FD' : '#6D28D9',
                                            fontSize: 10,
                                            fontWeight: '800',
                                          }}
                                        >
                                          {req.codigoFormato}
                                        </Text>
                                      </View>
                                    )}
                                  </View>

                                  {req.notaNormativa && (
                                    <Text style={{ color: COLORS.amberAccent, fontSize: 11 }}>
                                      ⚠️ {req.notaNormativa}
                                    </Text>
                                  )}
                                </View>

                                {req.fecha_cumplimiento && (
                                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>
                                    ✓ {req.fecha_cumplimiento}
                                  </Text>
                                )}
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* ================================================================= */}
        {/* PESTAÑA 2: GUÍA DE PROCEDIMIENTOS (PR-074, PR-145 Y PR-137)       */}
        {/* ================================================================= */}
        {tabActiva === 'matriz_normativa' && (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: isDesktop ? 36 : 18,
              paddingTop: 16,
              paddingBottom: 40,
              gap: 20,
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.cardBg,
                borderRadius: 14,
                padding: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 10,
                boxShadow: isDark ? undefined : '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="book" size={24} color={COLORS.purpleAccent} />
                <Text style={{ color: COLORS.textTitle, fontSize: 18, fontWeight: '800' }}>
                  Manuales y Procedimientos Oficiales de la Secretaría Jurídica Distrital
                </Text>
              </View>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 }}>
                El ciclo laboral de talento humano en la SJD se encuentra normado por tres procedimientos maestros
                del Sistema Integrado de Gestión:
              </Text>
            </View>

            {/* 3 Procedimientos en Tarjetas */}
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
              {/* 1. PR-145 */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.cardBg,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0',
                  padding: 18,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="enter-outline" size={24} color={COLORS.emeraldAccent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.emeraldAccent, fontSize: 11, fontWeight: '800' }}>
                      CÓDIGO 2311300-PR-145
                    </Text>
                    <Text style={{ color: COLORS.textTitle, fontSize: 15, fontWeight: '800' }}>
                      Vinculación de Servidores/as
                    </Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 }}>
                  Aplica a Periodo de prueba (Carrera), Libre Nombramiento y Provisionales. Inicia con identificación
                  de vacante y culmina con archivo en historia laboral y reporte formal a la CNSC.
                </Text>
              </View>

              {/* 2. PR-074 */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.cardBg,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
                  padding: 18,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="exit-outline" size={24} color={COLORS.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '800' }}>
                      CÓDIGO 2311300-PR-074
                    </Text>
                    <Text style={{ color: COLORS.textTitle, fontSize: 15, fontWeight: '800' }}>
                      Desvinculación de Servidores/as
                    </Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 }}>
                  Regula causales del Art. 41 Ley 909/04, entrega de puesto, informe de gestión (FT-333), 4 paz y salvos,
                  liquidación de prestaciones sociales y reporte obligatorio en SIMO 4.4 dentro de los 5 días hábiles.
                </Text>
              </View>

              {/* 3. PR-137 */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.cardBg,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(124, 58, 237, 0.4)' : '#DDD6FE',
                  padding: 18,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="school-outline" size={24} color={COLORS.purpleAccent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.purpleAccent, fontSize: 11, fontWeight: '800' }}>
                      CÓDIGO 2311300-PR-137
                    </Text>
                    <Text style={{ color: COLORS.textTitle, fontSize: 15, fontWeight: '800' }}>
                      Pasantes, Practicantes & Judicantes
                    </Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 }}>
                  Relación formativa sin vínculo laboral. Requiere CDP presupuestal, registro de plazas en SIDEAP,
                  afiliación obligatoria a ARL, suscripción de acta de inicio, creación de tercero en BogData y certificación.
                </Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* ================================================================= */}
        {/* PESTAÑA 3: CIRCUITO DE PAZ Y SALVO DIGITAL                        */}
        {/* ================================================================= */}
        {tabActiva === 'paz_salvo' && (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: isDesktop ? 36 : 18,
              paddingTop: 16,
              paddingBottom: 40,
              gap: 20,
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.cardBg,
                borderRadius: 14,
                padding: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 8,
              }}
            >
              <Text style={{ color: COLORS.textTitle, fontSize: 18, fontWeight: '800' }}>
                Circuito de Paz y Salvo Institucional (SJD - Formato 2311500-FT-200)
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 }}>
                Para formalizar la desvinculación y proceder con la liquidación definitiva en Nómina, el servidor saliente debe contar con el paz y salvo aprobado por cada una de las 4 dependencias responsables:
              </Text>
            </View>

            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
              {[
                {
                  area: 'Tecnologías de la Información (TIC)',
                  icono: 'laptop-outline',
                  items: [
                    'Entrega de equipo portátil / computador institucional',
                    'Devolución de periféricos, token y cargador',
                    'Cierre y bloqueo de cuenta de correo institucional',
                    'Inactivación de accesos a VPN, SASGE y carpetas compartidas',
                  ],
                },
                {
                  area: 'Almacén e Inventarios',
                  icono: 'cube-outline',
                  items: [
                    'Verificación de bienes muebles en el inventario individual',
                    'Traspaso o reintegro de elementos de oficina al almacén',
                    'Firma del formato de reintegro de elementos (2311500-FT-200)',
                  ],
                },
                {
                  area: 'Gestión Documental & Archivo',
                  icono: 'folder-outline',
                  items: [
                    'Entrega de tablas de retención y archivo de gestión',
                    'Transferencia de expedientes digitales y físicos al sucesor',
                    'No adeudar expedientes judiciales o administrativos',
                  ],
                },
                {
                  area: 'Talento Humano',
                  icono: 'id-card-outline',
                  items: [
                    'Devolución de carné institucional',
                    'Acta formal de entrega de puesto firmada con el jefe',
                    'Verificación de reporte en SIMO 4.4 y consulta BNLE',
                    'Pase a nómina para liquidación de prestaciones',
                  ],
                },
              ].map((c, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.cardBg,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 18,
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name={c.icono as any} size={22} color={COLORS.purpleAccent} />
                    <Text style={{ color: COLORS.textTitle, fontSize: 14, fontWeight: '800', flex: 1 }}>
                      {c.area}
                    </Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    {c.items.map((it, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={14} color={COLORS.emeraldAccent} style={{ marginTop: 2 }} />
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12, flex: 1, lineHeight: 17 }}>
                          {it}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ================================================================= */}
        {/* MODAL REGISTRO DE NUEVO TRÁMITE DE PERSONAL                       */}
        {/* ================================================================= */}
        <Modal
          visible={modalRegistroVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalRegistroVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: COLORS.modalOverlay,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.modalCardBg,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                width: '100%',
                maxWidth: 720,
                maxHeight: '92%',
                overflow: 'hidden',
                boxShadow: isDark ? undefined : '0 10px 30px rgba(0,0,0,0.15)',
              }}
            >
              {/* Cabecera del Modal */}
              <View
                style={{
                  backgroundColor: COLORS.modalHeaderBg,
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text style={{ color: COLORS.modalSubtitle, fontSize: 11, fontWeight: '800' }}>
                    TALENTO HUMANO • SECRETARÍA JURÍDICA DISTRITAL
                  </Text>
                  <Text style={{ color: COLORS.textTitle, fontSize: 17, fontWeight: '800', marginTop: 2 }}>
                    Registrar Nuevo Trámite con Flujo de Etapas
                  </Text>
                </View>
                <Pressable onPress={() => setModalRegistroVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.modalCloseColor} />
                </Pressable>
              </View>

              {/* Formulario */}
              <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
                {/* 1. Selección de Tipo de Proceso */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>
                    1. TIPO DE PROCESO LABORAL:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => setNuevoTipoProceso('VINCULACION')}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor:
                          nuevoTipoProceso === 'VINCULACION'
                            ? (isDark ? 'rgba(16, 185, 129, 0.25)' : '#ECFDF5')
                            : COLORS.inputBg,
                        borderWidth: 1.5,
                        borderColor: nuevoTipoProceso === 'VINCULACION' ? '#10B981' : COLORS.border,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: nuevoTipoProceso === 'VINCULACION' ? '#10B981' : COLORS.textTitle,
                          fontWeight: '800',
                          fontSize: 13,
                        }}
                      >
                        🟢 Vinculación (Ingreso / Posesión)
                      </Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                        Procedimiento 2311300-PR-145
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setNuevoTipoProceso('DESVINCULACION')}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor:
                          nuevoTipoProceso === 'DESVINCULACION'
                            ? (isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2')
                            : COLORS.inputBg,
                        borderWidth: 1.5,
                        borderColor: nuevoTipoProceso === 'DESVINCULACION' ? '#EF4444' : COLORS.border,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: nuevoTipoProceso === 'DESVINCULACION' ? '#EF4444' : COLORS.textTitle,
                          fontWeight: '800',
                          fontSize: 13,
                        }}
                      >
                        🔴 Desvinculación (Retiro del Servicio)
                      </Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                        Procedimiento 2311300-PR-074
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* 2. Modalidad de Personal */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>
                    2. MODALIDAD DE VINCULACIÓN:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(
                      [
                        { id: 'CARRERA_ADMINISTRATIVA', label: 'Carrera Administrativa', desc: 'Mérito CNSC' },
                        { id: 'LIBRE_NOMBRAMIENTO', label: 'Libre Nombramiento (LNR)', desc: 'Directivo / Asesor' },
                        { id: 'PROVISIONALIDAD', label: 'Provisionalidad', desc: 'Encargo preferente' },
                        { id: 'PRACTICANTE_JUDICANTE', label: 'Practicante / Judicante', desc: 'PR-137 Formativa' },
                      ] as const
                    ).map((m) => {
                      const sel = nuevaModalidad === m.id;
                      return (
                        <Pressable
                          key={m.id}
                          onPress={() => setNuevaModalidad(m.id)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: sel ? COLORS.modalSelectActiveBg : COLORS.inputBg,
                            borderWidth: 1.5,
                            borderColor: sel ? COLORS.purpleAccent : COLORS.border,
                          }}
                        >
                          <Text
                            style={{
                              color: sel ? COLORS.modalSelectActiveText : COLORS.textTitle,
                              fontSize: 12,
                              fontWeight: sel ? '800' : '600',
                            }}
                          >
                            {m.label}
                          </Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>{m.desc}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 3. Selección rápida desde Planta Oficial (opcional) */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>
                    3. SELECCIONAR SERVIDOR DE PLANTA (O INGRESAR MANUALMENTE):
                  </Text>
                  <ScrollView
                    style={{
                      maxHeight: 110,
                      backgroundColor: COLORS.modalSelectBg,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                    nestedScrollEnabled
                  >
                    {servidoresPlanta.slice(0, 20).map((serv) => {
                      const sel = plazaSeleccionadaId === serv.id_plaza;
                      return (
                        <Pressable
                          key={serv.id_plaza}
                          onPress={() => {
                            setPlazaSeleccionadaId(serv.id_plaza);
                            setNombreInput(serv.titular_nombre);
                            setCedulaInput(serv.titular_cedula);
                            setCargoInput(serv.cargo);
                            setDependenciaInput(serv.dependencia_cargo);
                          }}
                          style={{
                            padding: 8,
                            backgroundColor: sel ? COLORS.modalSelectActiveBg : 'transparent',
                            borderBottomWidth: 1,
                            borderBottomColor: COLORS.modalItemBorder,
                          }}
                        >
                          <Text style={{ color: sel ? COLORS.modalSelectActiveText : COLORS.textTitle, fontSize: 12, fontWeight: '700' }}>
                            {serv.titular_nombre} (C.C. {serv.titular_cedula})
                          </Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 10.5 }}>
                            Plaza #{serv.id_plaza} • {serv.cargo} • {serv.dependencia_cargo}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 4. Datos del Funcionario */}
                <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                      NOMBRE COMPLETO:
                    </Text>
                    <TextInput
                      value={nombreInput}
                      onChangeText={setNombreInput}
                      placeholder="Nombre del servidor o practicante"
                      placeholderTextColor={COLORS.inputPlaceholder}
                      style={{
                        backgroundColor: COLORS.inputBg,
                        color: COLORS.inputText,
                        borderRadius: 8,
                        padding: 9,
                        borderWidth: 1,
                        borderColor: COLORS.inputBorder,
                        fontSize: 13,
                      }}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                      DOCUMENTO DE IDENTIDAD (C.C.):
                    </Text>
                    <TextInput
                      value={cedulaInput}
                      onChangeText={setCedulaInput}
                      placeholder="Número de cédula"
                      placeholderTextColor={COLORS.inputPlaceholder}
                      style={{
                        backgroundColor: COLORS.inputBg,
                        color: COLORS.inputText,
                        borderRadius: 8,
                        padding: 9,
                        borderWidth: 1,
                        borderColor: COLORS.inputBorder,
                        fontSize: 13,
                      }}
                    />
                  </View>
                </View>

                {/* Cargo y Dependencia */}
                <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                      CARGO O TÍTULO DE PRÁCTICA:
                    </Text>
                    <TextInput
                      value={cargoInput}
                      onChangeText={setCargoInput}
                      placeholder="Ej: PROFESIONAL ESPECIALIZADO / JUDICANTE"
                      placeholderTextColor={COLORS.inputPlaceholder}
                      style={{
                        backgroundColor: COLORS.inputBg,
                        color: COLORS.inputText,
                        borderRadius: 8,
                        padding: 9,
                        borderWidth: 1,
                        borderColor: COLORS.inputBorder,
                        fontSize: 13,
                      }}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                      DEPENDENCIA ASIGNADA:
                    </Text>
                    <TextInput
                      value={dependenciaInput}
                      onChangeText={setDependenciaInput}
                      placeholder="Ej: DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA"
                      placeholderTextColor={COLORS.inputPlaceholder}
                      style={{
                        backgroundColor: COLORS.inputBg,
                        color: COLORS.inputText,
                        borderRadius: 8,
                        padding: 9,
                        borderWidth: 1,
                        borderColor: COLORS.inputBorder,
                        fontSize: 13,
                      }}
                    />
                  </View>
                </View>

                {/* Si es desvinculación: Causal legal */}
                {nuevoTipoProceso === 'DESVINCULACION' && (
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                      CAUSAL LEGAL DE RETIRO (Art. 41 Ley 909 de 2004):
                    </Text>
                    <ScrollView
                      style={{
                        maxHeight: 90,
                        backgroundColor: COLORS.modalSelectBg,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                      nestedScrollEnabled
                    >
                      {CAUSALES_RETIRO.map((c) => {
                        const sel = causalInput === c;
                        return (
                          <Pressable
                            key={c}
                            onPress={() => setCausalInput(c)}
                            style={{
                              padding: 7,
                              backgroundColor: sel ? COLORS.modalSelectActiveBg : 'transparent',
                              borderBottomWidth: 1,
                              borderBottomColor: COLORS.modalItemBorder,
                            }}
                          >
                            <Text style={{ color: sel ? COLORS.modalSelectActiveText : COLORS.textTitle, fontSize: 11.5, fontWeight: sel ? '700' : '400' }}>
                              {c}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Acto Administrativo y Fecha */}
                <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                      ACTO ADMINISTRATIVO (SI EXISTE):
                    </Text>
                    <TextInput
                      value={actoAdminInput}
                      onChangeText={setActoAdminInput}
                      placeholder="Ej: Resolución No. 102 de 2026"
                      placeholderTextColor={COLORS.inputPlaceholder}
                      style={{
                        backgroundColor: COLORS.inputBg,
                        color: COLORS.inputText,
                        borderRadius: 8,
                        padding: 9,
                        borderWidth: 1,
                        borderColor: COLORS.inputBorder,
                        fontSize: 13,
                      }}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                      FECHA EFECTIVA (AAAA-MM-DD):
                    </Text>
                    <TextInput
                      value={fechaEfectivaInput}
                      onChangeText={setFechaEfectivaInput}
                      placeholder="Ej: 2026-05-01"
                      placeholderTextColor={COLORS.inputPlaceholder}
                      style={{
                        backgroundColor: COLORS.inputBg,
                        color: COLORS.inputText,
                        borderRadius: 8,
                        padding: 9,
                        borderWidth: 1,
                        borderColor: COLORS.inputBorder,
                        fontSize: 13,
                      }}
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Pie del Modal */}
              <View
                style={{
                  backgroundColor: COLORS.modalFooterBg,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: COLORS.border,
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <Pressable
                  onPress={() => setModalRegistroVisible(false)}
                  style={{
                    backgroundColor: COLORS.btnCancelBg,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: COLORS.btnCancelText, fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleCrearTramite}
                  style={{
                    backgroundColor: COLORS.btnPrimaryBg,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: COLORS.btnPrimaryText, fontSize: 13, fontWeight: '800' }}>
                    Crear Flujo Horizontal
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ================================================================= */}
        {/* MODAL INFORMATIVO GENERAL (Regla: Modals en vez de alerts)        */}
        {/* ================================================================= */}
        <Modal
          visible={infoModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setInfoModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: COLORS.modalOverlay,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.modalCardBg,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                width: '100%',
                maxWidth: 480,
                padding: 22,
                gap: 14,
                boxShadow: isDark ? undefined : '0 10px 30px rgba(0,0,0,0.15)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor:
                      infoModalTipo === 'success'
                        ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5')
                        : infoModalTipo === 'warning'
                        ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7')
                        : (isDark ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE'),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={
                      infoModalTipo === 'success'
                        ? 'checkmark-circle'
                        : infoModalTipo === 'warning'
                        ? 'alert-circle'
                        : 'information-circle'
                    }
                    size={24}
                    color={
                      infoModalTipo === 'success'
                        ? COLORS.emeraldAccent
                        : infoModalTipo === 'warning'
                        ? COLORS.amberAccent
                        : COLORS.blueAccent
                    }
                  />
                </View>
                <Text style={{ color: COLORS.textTitle, fontSize: 17, fontWeight: '800', flex: 1 }}>
                  {infoModalTitulo}
                </Text>
              </View>

              <Text style={{ color: COLORS.textSecondary, fontSize: 13.5, lineHeight: 20 }}>
                {infoModalMensaje}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                <Pressable
                  onPress={() => setInfoModalVisible(false)}
                  style={{
                    backgroundColor: COLORS.btnPrimaryBg,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: COLORS.btnPrimaryText, fontSize: 13, fontWeight: '800' }}>Entendido</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
