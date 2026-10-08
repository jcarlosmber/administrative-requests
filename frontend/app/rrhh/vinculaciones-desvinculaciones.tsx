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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import mockPlazasData from '../../lib/plantaMockData.json';
import { nominaService, PlazaNomina, PersonaPerno } from '../../lib/nominaService';
import { secopService, ContratoSecop, ResultadoConsultaSecop } from '../../lib/secopService';
import { ingresosService } from '../../lib/ingresosService';

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

  roseBg: '#FFF1F2',
  roseText: '#BE123C',
  roseRing: 'rgba(225, 29, 72, 0.25)',

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
  tipoAccionEspecial?: 'SECOP' | 'INGRESOS_IA';
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
  validacionIngresoId?: string;
  estadoValidacionIA?: 'CUMPLE' | 'NO_CUMPLE' | 'REQUIERE_REVISION';
  resultadoSecop?: {
    totalActivos: number;
    tieneAlerta: boolean;
    fechaConsulta: string;
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
              { id: 'vc3_1', label: 'Identificación de servidor en encargo preferente o provisional', cumplido: true, obligatorio: true, codigoFormato: '2311520-FT-018' },
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
            subtitulo: 'Examen médico, SECOP II y Acta de Posesión',
            icono: 'ribbon-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional TH / SST',
            requisitos: [
              { id: 'vc5_1', label: 'Examen médico ocupacional de ingreso con concepto de aptitud', cumplido: false, obligatorio: true },
              { id: 'vc5_secop', label: 'Consulta de contratos activos en SECOP II (Verificación de Inhabilidades / Art. 128 C.P.)', cumplido: false, obligatorio: true, tipoAccionEspecial: 'SECOP' },
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
            titulo: 'Validación Técnica & SECOP',
            subtitulo: 'Cotejo IA FT-318 y contratos en ejecución',
            icono: 'clipboard-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            requisitos: [
              { id: 'vl2_1', label: 'Consulta de antecedentes: Policía, Procuraduría SIRI, Contraloría SIBOR, RNMC y REDAM', cumplido: true, obligatorio: true },
              { id: 'vl2_secop', label: 'Consulta de contratos en SECOP II (Verificación Inhabilidad / Art. 128 C.P.)', cumplido: false, obligatorio: true, tipoAccionEspecial: 'SECOP' },
              { id: 'vl2_2', label: 'Certificado de Cumplimiento de Requisitos (2311300-FT-318) / Validación IA', cumplido: false, obligatorio: true, codigoFormato: '2311300-FT-318', tipoAccionEspecial: 'INGRESOS_IA' },
              { id: 'vl2_3', label: 'Verificación paridad Ley de Cuotas (Decreto 455/2020 y Ley 2424/2024: 50% mujeres)', cumplido: true, obligatorio: true },
            ],
          },
          {
            id: 'v_lnr_3',
            numero: 3,
            titulo: 'SEVCOM & Publicación',
            subtitulo: 'Evaluación DASCD y 5 días web',
            icono: 'globe-outline',
            estado: 'pending',
            tiempoEstimadoDias: 5,
            responsable: 'Dirección Gestión Corporativa / DASCD',
            requisitos: [
              { id: 'vl3_1', label: 'Solicitud de evaluación de competencias gerenciales en SEVCOM DASCD (Circular 004/2019)', cumplido: false, obligatorio: true },
              { id: 'vl3_2', label: 'Aprobación de la prueba de competencias del aspirante', cumplido: false, obligatorio: true },
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
              { id: 'vp2_1', label: 'Publicación de convocatoria interna para encargo a servidores de carrera', cumplido: true, obligatorio: true },
              { id: 'vp2_2', label: 'Evaluación de solicitudes de encargo preferencial', cumplido: true, obligatorio: true },
              { id: 'vp2_3', label: 'Certificación de que ningún servidor de carrera cumple requisitos o aceptó encargo', cumplido: true, obligatorio: true },
            ],
          },
          {
            id: 'v_prov_3',
            numero: 3,
            titulo: 'Validación Candidato',
            subtitulo: 'SIDEAP, antecedentes, SECOP II y FT-318',
            icono: 'person-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 1,
            responsable: 'Profesional Universitario TH',
            requisitos: [
              { id: 'vp3_1', label: 'Recepción de Hoja de Vida del candidato y cargue en SIDEAP', cumplido: true, obligatorio: true },
              { id: 'vp3_secop', label: 'Consulta de contratos activos en SECOP II (Inhabilidades / Art. 128 C.P.)', cumplido: false, obligatorio: true, tipoAccionEspecial: 'SECOP' },
              { id: 'vp3_2', label: 'Consulta de antecedentes judiciales, disciplinarios, fiscales y REDAM', cumplido: true, obligatorio: true },
              { id: 'vp3_3', label: 'Certificación de Cumplimiento de Requisitos (2311300-FT-318) - Validación Técnica IA', cumplido: false, obligatorio: true, codigoFormato: '2311300-FT-318', tipoAccionEspecial: 'INGRESOS_IA' },
            ],
          },
          {
            id: 'v_prov_4',
            numero: 4,
            titulo: 'Acto de Nombramiento',
            subtitulo: 'Resolución de nombramiento provisional',
            icono: 'document-text-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Secretario Jurídico Distrital',
            requisitos: [
              { id: 'vp4_1', label: 'Elaboración de Resolución de Nombramiento Provisional', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-130' },
              { id: 'vp4_2', label: 'Firma de la resolución por la autoridad nominadora y numeración', cumplido: false, obligatorio: true },
              { id: 'vp4_3', label: 'Comunicación oficial al seleccionado indicando 10 días para aceptación', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-019' },
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
            subtitulo: 'Apropiación presupuestal y plazas (PR-137)',
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
            subtitulo: 'Antecedentes, SECOP II y resolución',
            icono: 'document-text-outline',
            estado: 'in_progress',
            tiempoEstimadoDias: 3,
            responsable: 'Profesional Especializado TH',
            requisitos: [
              { id: 'vj3_1', label: 'Consulta de antecedentes SIRI, SIBOR, Policía, Personería, RNMC y REDAM', cumplido: true, obligatorio: true },
              { id: 'vj3_secop', label: 'Verificación en SECOP II de ausencia de contratos incompatibles', cumplido: false, obligatorio: true, tipoAccionEspecial: 'SECOP' },
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
              { id: 'vj4_2', label: 'Solicitud y expedición de Certificado de Registro Presupuestal (CRP)', cumplido: false, obligatorio: true },
              { id: 'vj4_3', label: 'Suscripción del Acta de Inicio de práctica o judicatura', cumplido: false, obligatorio: true },
              { id: 'vj4_4', label: 'Solicitud de creación de tercero en Bogdata (Procedimiento 2311420-PR-063)', cumplido: false, obligatorio: true },
            ],
          },
          {
            id: 'v_prac_5',
            numero: 5,
            titulo: 'Inducción & Ejecución',
            subtitulo: 'Salud, tutor y seguimiento mensual',
            icono: 'ribbon-outline',
            estado: 'pending',
            tiempoEstimadoDias: 30,
            responsable: 'Tutor / Profesional SST',
            requisitos: [
              { id: 'vj5_1', label: 'Diligenciamiento de encuesta de condiciones de salud inicial', cumplido: false, obligatorio: true },
              { id: 'vj5_2', label: 'Inducción institucional y entrega de puesto de trabajo', cumplido: false, obligatorio: true },
              { id: 'vj5_3', label: 'Radicación de informes mensuales de actividades aprobados por el tutor', cumplido: false, obligatorio: true },
            ],
          },
          {
            id: 'v_prac_6',
            numero: 6,
            titulo: 'Pago & Certificación',
            subtitulo: 'Apoyo económico y certificado final',
            icono: 'checkmark-circle-outline',
            estado: 'pending',
            tiempoEstimadoDias: 1,
            responsable: 'Gestión Financiera / Dirección',
            requisitos: [
              { id: 'vj6_1', label: 'Trámite mensual de pago de apoyo de sostenimiento con soporte bancario', cumplido: false, obligatorio: true },
              { id: 'vj6_2', label: 'Expedición de Certificación Final de Práctica / Judicatura firmada por Dirección', cumplido: false, obligatorio: true },
            ],
          },
        ];
    }
  } else {
    // DESVINCULACIÓN (Procedimiento PR-074)
    const esCarrera = modalidad === 'CARRERA_ADMINISTRATIVA';
    return [
      {
        id: 'd_serv_1',
        numero: 1,
        titulo: 'Causal & Soportes',
        subtitulo: 'Recepción y verificación legal',
        icono: 'document-text-outline',
        estado: 'completed',
        tiempoEstimadoDias: 1,
        responsable: 'Profesional Universitario TH',
        requisitos: [
          { id: 'ds1_1', label: 'Recepción del documento soporte (Renuncia, Insubsistencia, Pensión, Retiro forzoso)', cumplido: true, obligatorio: true, codigoFormato: '2311520-FT-018' },
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
          { id: 'ds2_3', label: 'Comunicación formal al servidor por correo electrónico', cumplido: true, obligatorio: true, codigoFormato: '2311520-FT-019' },
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
              { id: 'ds6_3', label: 'Archivo integral en Historia Laboral (Hoja de Control 2311520-FT-244)', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-244' },
            ]
          : [
              { id: 'ds6_1_nc', label: 'Actualización y archivo de soportes en Historia Laboral (Hoja Control 2311520-FT-244)', cumplido: false, obligatorio: true, codigoFormato: '2311520-FT-244' },
              { id: 'ds6_2_nc', label: 'Constatación de entrega de copia a Control Interno si pertenecía a nivel directivo', cumplido: false, obligatorio: true },
            ],
      },
    ];
  }
}

// Casos predefinidos institucionales
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
    etapa_activa_id: 'd_serv_3',
    observaciones: 'Pensión concedida por Colpensiones. En trámite entrega de puesto.',
  },
];

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

export default function VinculacionesDesvinculacionesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isTablet = width >= 640;

  // Pestañas principales (estilo Nómina)
  const [tabActiva, setTabActiva] = useState<
    'flujos' | 'secop' | 'ingresos' | 'paz_salvo' | 'matriz_normativa'
  >('flujos');

  // Control de KPIs
  const [mostrarKpis, setMostrarKpis] = useState(true);

  // Filtros de Trámites
  const [filtroTipoProceso, setFiltroTipoProceso] = useState<
    'TODOS' | 'DESVINCULACION' | 'VINCULACION'
  >('TODOS');
  const [filtroModalidad, setFiltroModalidad] = useState<'TODAS' | ModalidadPersonal>('TODAS');
  const [busqueda, setBusqueda] = useState('');

  // Casos con flujos
  const [casos, setCasos] = useState<CasoFlujoFuncionario[]>(CASOS_BASE);
  const [casoSeleccionadoId, setCasoSeleccionadoId] = useState<string>(CASOS_BASE[0].id);

  // Modal para registrar nuevo trámite
  const [modalRegistroVisible, setModalRegistroVisible] = useState(false);
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

  // Función para ejecutar búsqueda reactiva en nómina
  const ejecutarBusquedaNomina = async (
    queryText: string,
    tipo: 'SERVIDORES' | 'PLAZAS' = nominaTipoBusqueda
  ) => {
    const q = queryText.trim();
    setNominaCargando(true);
    try {
      if (tipo === 'SERVIDORES') {
        const personas = await nominaService.getPersonalPerno({ busqueda: q });
        setNominaResultadosServidores(personas.slice(0, 8));
      } else {
        const plazas = await nominaService.getPlazas({ busqueda: q });
        setNominaResultadosPlazas(plazas.slice(0, 8));
      }
    } catch (e: any) {
      console.warn('Error al buscar en nómina:', e.message);
    } finally {
      setNominaCargando(false);
    }
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

  const ejecutarConsultaSecop = async (query?: string, criterio?: 'documento' | 'nombre') => {
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
      if (res.tieneContratosActivos) {
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
    setSecopModalVisible(true);
    ejecutarConsultaSecop(cedula, 'documento');
  };

  // ==========================================================================
  // ESTADO Y MÉTODOS DE VALIDACIÓN TÉCNICA DE INGRESOS (IA)
  // ==========================================================================
  const [ingresosCargando, setIngresosCargando] = useState(false);
  const [validacionesIngresos, setValidacionesIngresos] = useState<any[]>([]);

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

  // Alternar cumplimiento de requisito y recalcular estado
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
      fecha_inicio_tramite: new Date().toISOString().split('T')[0],
      etapas: etapasGeneradas,
      etapa_activa_id: etapasGeneradas[0]?.id,
      observaciones: 'Trámite registrado y en proceso de validaciones preliminares.',
    };

    setCasos([nuevoCaso, ...casos]);
    setCasoSeleccionadoId(nuevoId);
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
                onPress={() => setModalRegistroVisible(true)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 8,
                  backgroundColor: THEME.marca600,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Ionicons name="add-circle-outline" size={15} color={THEME.white} />
                <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '600' }}>
                  Nuevo Trámite
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
          {/* PESTAÑAS (NAVEGACIÓN ESTILO NÓMINA)                            */}
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
            {/* Pestaña 1: Censo de Trámites */}
            <Pressable
              onPress={() => setTabActiva('flujos')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'flujos' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'flujos' ? THEME.marca700 : THEME.slate500,
                }}
              >
                Censo de Trámites
              </Text>
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: THEME.slate100,
                  borderRadius: 9999,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate600 }}>
                  {casos.length}
                </Text>
              </View>
            </Pressable>

            {/* Pestaña 2: SECOP II */}
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

            {/* Pestaña 3: Validación Técnica IA */}
            <Pressable
              onPress={() => setTabActiva('ingresos')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'ingresos' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'ingresos' ? THEME.marca700 : THEME.slate500,
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

            {/* Pestaña 4: Paz y Salvo */}
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

            {/* Pestaña 5: Matriz Normativa */}
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
          {tabActiva === 'flujos' && (
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
                {/* Buscador */}
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
                  <Ionicons name="search" size={17} color={THEME.slate400} />
                  <TextInput
                    value={busqueda}
                    onChangeText={setBusqueda}
                    placeholder="Buscar por funcionario, cédula, cargo o código de trámite..."
                    placeholderTextColor={THEME.slate400}
                    style={{
                      flex: 1,
                      color: THEME.slate900,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      fontSize: 13,
                    }}
                  />
                  {busqueda ? (
                    <Pressable onPress={() => setBusqueda('')}>
                      <Ionicons name="close-circle" size={16} color={THEME.slate400} />
                    </Pressable>
                  ) : null}
                </View>

                {/* Filtro Tipo de Proceso */}
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: THEME.slate500, marginRight: 2 }}>Trámite:</Text>
                  {(['TODOS', 'VINCULACION', 'DESVINCULACION'] as const).map((t) => {
                    const sel = filtroTipoProceso === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setFiltroTipoProceso(t)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          backgroundColor: sel ? THEME.marca600 : THEME.white,
                          borderWidth: 1,
                          borderColor: sel ? THEME.marca600 : THEME.slate200,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11.5,
                            fontWeight: '600',
                            color: sel ? THEME.white : THEME.slate600,
                          }}
                        >
                          {t === 'TODOS'
                            ? 'Todos'
                            : t === 'VINCULACION'
                            ? 'Vinculación'
                            : 'Desvinculación'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Filtro Modalidad */}
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: THEME.slate500, marginRight: 2 }}>
                    Modalidad:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(
                        [
                          'TODAS',
                          'LIBRE_NOMBRAMIENTO',
                          'CARRERA_ADMINISTRATIVA',
                          'PROVISIONALIDAD',
                        ] as const
                      ).map((m) => {
                        const sel = filtroModalidad === m;
                        return (
                          <Pressable
                            key={m}
                            onPress={() => setFiltroModalidad(m)}
                            style={{
                              paddingHorizontal: 9,
                              paddingVertical: 6,
                              borderRadius: 6,
                              backgroundColor: sel ? THEME.marca700 : THEME.white,
                              borderWidth: 1,
                              borderColor: sel ? THEME.marca700 : THEME.slate200,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: sel ? THEME.white : THEME.slate600,
                              }}
                            >
                              {m === 'TODAS'
                                ? 'Todas'
                                : m === 'LIBRE_NOMBRAMIENTO'
                                ? 'Libre Nombramiento'
                                : m === 'CARRERA_ADMINISTRATIVA'
                                ? 'Carrera'
                                : 'Provisional'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* Layout de Contenido Principal: Dos Columnas */}
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 18 }}>
                {/* Columna Izquierda: Tarjetas de Trámites */}
                <View style={{ width: isDesktop ? 360 : '100%', gap: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate800 }}>
                    Trámites Registrados ({casosFiltrados.length})
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
                            alignItems: 'center',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                                  fontSize: 10,
                                  fontWeight: '700',
                                }}
                              >
                                {esVinculacion ? 'VINCULACIÓN' : 'DESVINCULACIÓN'}
                              </Text>
                            </View>
                            <Text
                              style={{ color: THEME.slate400, fontSize: 11, fontWeight: '600' }}
                            >
                              {c.id}
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: THEME.emeraldText,
                              fontSize: 11.5,
                              fontWeight: '700',
                            }}
                          >
                            {porcentaje}%
                          </Text>
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
                <View style={{ flex: 1, gap: 14 }}>
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
                      {/* Cabecera del Caso */}
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
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text
                              style={{ color: THEME.slate900, fontSize: 16, fontWeight: '700' }}
                            >
                              {casoActivo.servidor_nombre}
                            </Text>
                            <View
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 2,
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
                                  fontWeight: '700',
                                }}
                              >
                                {casoActivo.tipo_proceso}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ color: THEME.slate500, fontSize: 12, marginTop: 3 }}>
                            Cédula: {casoActivo.servidor_cedula} • {casoActivo.cargo} •{' '}
                            {casoActivo.dependencia}
                          </Text>
                        </View>

                        {/* Botones de acción del caso */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
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
                              gap: 6,
                              backgroundColor: THEME.skyBg,
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: THEME.skyRing,
                            }}
                          >
                            <Ionicons name="search" size={14} color={THEME.skyText} />
                            <Text
                              style={{ color: THEME.skyText, fontSize: 11.5, fontWeight: '600' }}
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
                                gap: 6,
                                backgroundColor: THEME.emeraldBg,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: THEME.emeraldRing,
                              }}
                            >
                              <Ionicons name="sparkles" size={14} color={THEME.emeraldText} />
                              <Text
                                style={{
                                  color: THEME.emeraldText,
                                  fontSize: 11.5,
                                  fontWeight: '600',
                                }}
                              >
                                Validación FT-318 IA
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>

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

                      {/* Lista de Requisitos de la Fase */}
                      <View style={{ gap: 12 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate900 }}>
                          Requisitos y Actividades de la Fase Actual
                        </Text>

                        {casoActivo.etapas.map((etapa) => (
                          <View
                            key={etapa.id}
                            style={{
                              backgroundColor: THEME.slate50,
                              borderRadius: 10,
                              padding: 14,
                              borderWidth: 1,
                              borderColor: THEME.slate200,
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
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name={etapa.icono} size={16} color={THEME.marca700} />
                                <Text
                                  style={{
                                    fontSize: 13,
                                    fontWeight: '700',
                                    color: THEME.slate900,
                                  }}
                                >
                                  Fase {etapa.numero}: {etapa.titulo}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                                Responsable: {etapa.responsable}
                              </Text>
                            </View>

                            {/* Items */}
                            <View style={{ gap: 8 }}>
                              {etapa.requisitos.map((req) => (
                                <Pressable
                                  key={req.id}
                                  onPress={() =>
                                    toggleRequisito(casoActivo.id, etapa.id, req.id)
                                  }
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    backgroundColor: THEME.white,
                                    padding: 10,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: req.cumplido
                                      ? THEME.emeraldRing
                                      : THEME.slate200,
                                  }}
                                >
                                  <Ionicons
                                    name={req.cumplido ? 'checkbox' : 'square-outline'}
                                    size={18}
                                    color={req.cumplido ? THEME.emeraldText : THEME.slate400}
                                    style={{ marginTop: 1 }}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={{
                                        fontSize: 12.5,
                                        color: req.cumplido ? THEME.slate500 : THEME.slate800,
                                        textDecorationLine: req.cumplido ? 'line-through' : 'none',
                                      }}
                                    >
                                      {req.label}
                                    </Text>
                                    <View
                                      style={{
                                        flexDirection: 'row',
                                        gap: 8,
                                        marginTop: 4,
                                        alignItems: 'center',
                                      }}
                                    >
                                      {req.codigoFormato && (
                                        <View
                                          style={{
                                            backgroundColor: THEME.slate100,
                                            paddingHorizontal: 6,
                                            paddingVertical: 1,
                                            borderRadius: 4,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              fontSize: 9.5,
                                              fontWeight: '600',
                                              color: THEME.slate600,
                                            }}
                                          >
                                            {req.codigoFormato}
                                          </Text>
                                        </View>
                                      )}
                                      {req.tipoAccionEspecial === 'SECOP' && (
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
                                            paddingVertical: 1,
                                            borderRadius: 4,
                                            borderColor: THEME.skyRing,
                                            borderWidth: 1,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              fontSize: 9.5,
                                              fontWeight: '700',
                                              color: THEME.skyText,
                                            }}
                                          >
                                            🔍 Consultar SECOP II
                                          </Text>
                                        </Pressable>
                                      )}
                                      {req.tipoAccionEspecial === 'INGRESOS_IA' && (
                                        <Pressable
                                          onPress={(e) => {
                                            e.stopPropagation();
                                            router.push('/ingresos/nueva');
                                          }}
                                          style={{
                                            backgroundColor: THEME.emeraldBg,
                                            paddingHorizontal: 6,
                                            paddingVertical: 1,
                                            borderRadius: 4,
                                            borderColor: THEME.emeraldRing,
                                            borderWidth: 1,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              fontSize: 9.5,
                                              fontWeight: '700',
                                              color: THEME.emeraldText,
                                            }}
                                          >
                                            ✨ Validar con IA (FT-318)
                                          </Text>
                                        </Pressable>
                                      )}
                                    </View>
                                  </View>
                                </Pressable>
                              ))}
                            </View>
                          </View>
                        ))}
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
              {secopResultado && (
                <View style={{ gap: 14 }}>
                  {/* Resumen del Dictamen */}
                  <View
                    style={{
                      backgroundColor: secopResultado.tieneContratosActivos
                        ? THEME.roseBg
                        : THEME.emeraldBg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: secopResultado.tieneContratosActivos
                        ? THEME.roseRing
                        : THEME.emeraldRing,
                      padding: 16,
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons
                        name={
                          secopResultado.tieneContratosActivos ? 'alert-circle' : 'checkmark-circle'
                        }
                        size={24}
                        color={
                          secopResultado.tieneContratosActivos
                            ? THEME.roseText
                            : THEME.emeraldText
                        }
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: secopResultado.tieneContratosActivos
                            ? THEME.roseText
                            : THEME.emeraldText,
                        }}
                      >
                        {secopResultado.tieneContratosActivos
                          ? 'ALERTA DE CONTRATOS EN EJECUCIÓN'
                          : 'ESTADO LIMPIO EN SECOP II: SIN CONTRATOS ACTIVOS'}
                      </Text>
                    </View>
                    <Text style={{ color: THEME.slate700, fontSize: 12.5, lineHeight: 18 }}>
                      {secopResultado.dictamen}
                    </Text>
                  </View>

                  {/* Listado de Contratos */}
                  <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '700' }}>
                    Contratos Registrados ({secopResultado.todosContratos.length})
                  </Text>

                  {secopResultado.todosContratos.map((c, i) => (
                    <View
                      key={i}
                      style={{
                        backgroundColor: THEME.white,
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: c.esActivo ? THEME.roseRing : THEME.slate200,
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: THEME.slate900,
                            fontSize: 13,
                            fontWeight: '700',
                            flex: 1,
                          }}
                        >
                          {c.entidad}
                        </Text>
                        <View
                          style={{
                            backgroundColor: c.esActivo ? THEME.roseBg : THEME.emeraldBg,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 9999,
                            borderColor: c.esActivo ? THEME.roseRing : THEME.emeraldRing,
                            borderWidth: 1,
                          }}
                        >
                          <Text
                            style={{
                              color: c.esActivo ? THEME.roseText : THEME.emeraldText,
                              fontSize: 10,
                              fontWeight: '700',
                            }}
                          >
                            {c.estado.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: THEME.slate600, fontSize: 12 }}>{c.objeto}</Text>
                      <Text style={{ color: THEME.slate400, fontSize: 11 }}>
                        Vigencia: {c.fechaInicio} al {c.fechaFin} • Valor: $
                        {c.valorTotal.toLocaleString('es-CO')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 3: VALIDACIÓN TÉCNICA DE INGRESOS (IA GEMINI)          */}
          {/* ============================================================== */}
          {tabActiva === 'ingresos' && (
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
                      VALIDACIÓN TÉCNICA DE REQUISITOS (FORMATO 2311300-FT-318)
                    </Text>
                    <Text
                      style={{ color: THEME.slate600, fontSize: 12, marginTop: 2, lineHeight: 18 }}
                    >
                      Cotejo de hojas de vida frente al Manual Específico de Funciones institucional.
                      El dictamen con IA calcula la experiencia relacionada y valida títulos.
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
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
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
              maxWidth: 580,
              padding: 20,
              gap: 14,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '700' }}>
                Verificación Preventiva en SECOP II
              </Text>
              <Pressable onPress={() => setSecopModalVisible(false)}>
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </Pressable>
            </View>

            <Text style={{ color: THEME.slate600, fontSize: 12.5 }}>
              Candidato: <Text style={{ fontWeight: '700' }}>{secopModalCandidato?.nombre}</Text> •
              Cédula: <Text style={{ fontWeight: '700' }}>{secopModalCandidato?.cedula}</Text>
            </Text>

            {secopCargando ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={THEME.marca600} />
              </View>
            ) : secopResultado ? (
              <View
                style={{
                  backgroundColor: secopResultado.tieneContratosActivos
                    ? THEME.roseBg
                    : THEME.emeraldBg,
                  borderRadius: 10,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: secopResultado.tieneContratosActivos
                    ? THEME.roseRing
                    : THEME.emeraldRing,
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    color: secopResultado.tieneContratosActivos
                      ? THEME.roseText
                      : THEME.emeraldText,
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {secopResultado.tieneContratosActivos
                    ? '⚠️ Alerta de Contratos en Ejecución'
                    : '✓ Sin Contratos Activos en SECOP II'}
                </Text>
                <Text style={{ color: THEME.slate700, fontSize: 12 }}>
                  {secopResultado.dictamen}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <Pressable
                onPress={() => setSecopModalVisible(false)}
                style={{
                  backgroundColor: THEME.slate100,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: THEME.slate700, fontWeight: '600', fontSize: 12 }}>
                  Cerrar
                </Text>
              </Pressable>
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
              maxWidth: 680,
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

                  {/* Barra de Búsqueda */}
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
                          ejecutarBusquedaNomina(t, nominaTipoBusqueda);
                        }}
                        placeholder={
                          nominaTipoBusqueda === 'PLAZAS'
                            ? 'Buscar por cargo, código, grado o ID plaza...'
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
                            setNominaResultadosServidores([]);
                            setNominaResultadosPlazas([]);
                          }}
                        >
                          <Ionicons name="close-circle" size={16} color={THEME.slate400} />
                        </Pressable>
                      )}
                    </View>

                    <Pressable
                      onPress={() => ejecutarBusquedaNomina(nominaQuery, nominaTipoBusqueda)}
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
                  {!nominaItemSeleccionado && nominaQuery.trim().length > 0 && (
                    <View style={{ gap: 6, maxHeight: 180 }}>
                      <Text style={{ color: THEME.slate600, fontSize: 11, fontWeight: '600' }}>
                        Resultados encontrados:
                      </Text>
                      <ScrollView
                        nestedScrollEnabled={true}
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          maxHeight: 150,
                        }}
                      >
                        {nominaTipoBusqueda === 'SERVIDORES' &&
                          nominaResultadosServidores.map((item, idx) => (
                            <Pressable
                              key={`${item.cedula}-${idx}`}
                              onPress={() => seleccionarServidorNomina(item)}
                              style={({ pressed }) => ({
                                padding: 9,
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
                                  C.C. {item.cedula} • {item.cargo || item.plaza_cargo || 'Sin cargo'}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: THEME.marca50,
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
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
                                padding: 9,
                                borderBottomWidth:
                                  idx === nominaResultadosPlazas.length - 1 ? 0 : 1,
                                borderBottomColor: THEME.slate100,
                                backgroundColor: pressed ? THEME.marca50 : THEME.white,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              })}
                            >
                              <View style={{ flex: 1, gap: 2 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                                <Text style={{ color: THEME.slate500, fontSize: 11 }}>
                                  Cód: {plaza.codigo || 'N/A'} Gr: {plaza.grado || 'N/A'} •{' '}
                                  {plaza.dependencia_cargo}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: THEME.marca50,
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
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
                          {CAUSALES_RETIRO.map((causal) => {
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
    </View>
  );
}
