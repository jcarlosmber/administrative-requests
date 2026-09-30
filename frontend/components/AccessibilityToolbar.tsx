import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Platform,
  Dimensions,
  useWindowDimensions,
  Image,
  PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

// Portal seguro para Web (garantiza renderizar el intérprete LSC encima de cualquier Modal)
let ReactDOMPortal: any = null;
if (Platform.OS === 'web') {
  try {
    ReactDOMPortal = require('react-dom');
  } catch (e) {
    ReactDOMPortal = null;
  }
}
// Tipos y gestos diferenciados para Lengua de Señas Colombiana (LSC)
export type LSCGestureType =
  | 'steering_wheel'
  | 'walking_legs'
  | 'wrench_repair'
  | 'table_booking'
  | 'parking_p'
  | 'speech_waves'
  | 'camera_photo'
  | 'star_rating'
  | 'checkmark_approve'
  | 'cross_reject'
  | 'bell_alert'
  | 'folder_stamp'
  | 'login_key'
  | 'hands_fan'
  | 'rotating_gears'
  | 'fist_support'
  | 'magnifier_track'
  | 'official_badge'
  | 'capacity_limit'
  | 'secret_lock'
  | 'question_gesture'
  | 'chart_growth';

// Interfaz de término en Lengua de Señas Colombiana (LSC)
export interface LSCTerm {
  id: string;
  title: string;
  lscWords: string;
  definition: string;
  videoHint: string;
  gestureType: LSCGestureType;
  gestureCategory: string;
  keywords: string[];
  videoUrl?: string;
}

// Catálogo completo de términos con interpretación y gestos específicos en Lengua de Señas Colombiana (LSC)
export const LSC_DICTIONARY: LSCTerm[] = [
  {
    id: 'transport',
    title: 'Transporte Institucional',
    lscWords: 'TRANSPORTE - VEHÍCULO - OFICIAL',
    gestureType: 'steering_wheel',
    gestureCategory: '🚗 Conducción Vehicular (Volante)',
    definition: 'Solicitud de vehículo oficial para desplazamientos laborales y misiones de la entidad.',
    videoHint: 'Gesto: Ambas manos cerradas a la altura del pecho simulando sujetar un volante y girarlo en curva.',
    keywords: ['transporte institucional', 'transporte', 'vehículo oficial', 'vehiculo oficial', 'vehículo', 'vehiculo', 'carro', 'traslado', 'conductor', 'placa', 'viaje', 'desplazamiento'],
    videoUrl: ''
  },
  {
    id: 'visitors',
    title: 'Ingreso Visitantes',
    lscWords: 'VISITANTE - ENTRADA - REGISTRO',
    gestureType: 'walking_legs',
    gestureCategory: '👥 Caminata de Ingreso (Dedos V)',
    definition: 'Registro de entrada y control de acceso seguro de personas externas a las sedes.',
    videoHint: 'Gesto: Dedos índice y medio en V invertida simulando una persona caminando hacia adelante e ingresando por una puerta.',
    keywords: ['ingreso visitantes', 'ingreso visitante', 'visitantes', 'visitante', 'registro visitantes', 'control de acceso', 'cédula', 'cedula', 'recepción', 'recepcion'],
    videoUrl: ''
  },
  {
    id: 'maintenance',
    title: 'Mantenimiento Locativo',
    lscWords: 'MANTENIMIENTO - REPARAR - DAÑO',
    gestureType: 'wrench_repair',
    gestureCategory: '🛠️ Ajuste con Herramienta (Llave)',
    definition: 'Reporte de arreglos locativos o fallas físicas en la infraestructura de la sede.',
    videoHint: 'Gesto: Mano derecha en forma de garra o llave inglesa girando sobre el puño izquierdo simulando apretar o reparar.',
    keywords: ['mantenimiento', 'mantenimiento locativo', 'reparación', 'reparacion', 'daño', 'daños', 'arreglos', 'falla', 'eléctrico', 'electrico', 'plomería', 'pintura', 'tubería'],
    videoUrl: ''
  },
  {
    id: 'rooms',
    title: 'Reserva de Salas',
    lscWords: 'RESERVA - SALA - JUNTAS',
    gestureType: 'table_booking',
    gestureCategory: '📅 Trazo de Mesa y Sello de Reserva',
    definition: 'Apartar salas de juntas o auditorios para reuniones de trabajo institucionales.',
    videoHint: 'Gesto: Manos extendidas trazando el contorno de una mesa rectangular y bajando el puño derecho como sello de reserva.',
    keywords: ['reserva de salas', 'reserva salas', 'salas de juntas', 'salas', 'sala', 'auditorio', 'auditorios', 'juntas', 'reunión', 'reunion', 'reuniones', 'espacio'],
    videoUrl: ''
  },
  {
    id: 'parking',
    title: 'Parqueadero Institucional',
    lscWords: 'PARQUEADERO - ESTACIONAR',
    gestureType: 'parking_p',
    gestureCategory: '🅿️ Estacionar Letra P sobre Palma',
    definition: 'Asignación de cupo de estacionamiento vehicular para funcionarios autorizados.',
    videoHint: 'Gesto: Mano derecha formando la letra P con dedos extendidos sobre la palma izquierda horizontal simulando estacionar.',
    keywords: ['parqueadero institucional', 'parqueadero', 'parqueaderos', 'cupo parqueadero', 'estacionamiento', 'estacionar', 'cupo vehicular', 'parquear'],
    videoUrl: ''
  },
  {
    id: 'chatbot',
    title: 'Asistente Virtual',
    lscWords: 'ASISTENTE - VIRTUAL - COMPUTADOR',
    gestureType: 'speech_waves',
    gestureCategory: '🤖 Ondas de Conversación Digital',
    definition: 'Herramienta de atención interactiva en línea para resolver preguntas frecuentes y guiar trámites.',
    videoHint: 'Gesto: Mano frente a la boca emitiendo ondas hacia la pantalla simulando conversación y asistencia digital.',
    keywords: ['asistente virtual', 'chatbot', 'chat', 'asesor virtual', 'asesor en línea', 'bot', 'ayuda virtual'],
    videoUrl: ''
  },
  {
    id: 'evidencias',
    title: 'Evidencias Fotográficas',
    lscWords: 'FOTOS - EVIDENCIAS - ADJUNTAR',
    gestureType: 'camera_photo',
    gestureCategory: '📷 Visor de Cámara y Obturador',
    definition: 'Carga de fotografías o documentos de soporte que certifiquen el estado o solicitud radicada.',
    videoHint: 'Gesto: Manos formando el visor rectangular de una cámara fotográfica presionando el obturador con destello.',
    keywords: ['evidencias fotográficas', 'evidencias fotograficas', 'subir evidencias', 'evidencias', 'fotos', 'adjuntar fotos', 'fotografías', 'fotografias', 'adjuntos', 'adjuntar archivo', 'soporte fotográfico'],
    videoUrl: ''
  },
  {
    id: 'calificacion',
    title: 'Calificación del Servicio',
    lscWords: 'CALIFICACIÓN - EVALUAR - SATISFACCIÓN',
    gestureType: 'star_rating',
    gestureCategory: '⭐ Trazo de Estrella y Pulgares Arriba',
    definition: 'Encuesta de evaluación y nivel de satisfacción del colaborador con respecto al servicio prestado.',
    videoHint: 'Gesto: Manos trazando una estrella dorada en el aire y finalizando con pulgares arriba de excelencia.',
    keywords: ['calificación', 'calificacion', 'calificar', 'encuesta', 'evaluar servicio', 'satisfacción', 'satisfaccion', 'estrellas', 'puntuación', 'puntuacion'],
    videoUrl: ''
  },
  {
    id: 'aprobacion',
    title: 'Aprobación de Solicitud',
    lscWords: 'APROBADO - AUTORIZAR - VISTO BUENO',
    gestureType: 'checkmark_approve',
    gestureCategory: '✅ Trazo de Visto Bueno (Check)',
    definition: 'Autorización oficial del jefe o coordinador para dar curso y cumplimiento a la solicitud.',
    videoHint: 'Gesto: Mano derecha trazando un checkmark verde en el aire con movimiento ascendente de aprobación.',
    keywords: ['aprobar', 'aprobado', 'aprobada', 'aprobación', 'aprobacion', 'autorizar', 'autorizado', 'visto bueno'],
    videoUrl: ''
  },
  {
    id: 'rechazo',
    title: 'Rechazo de Solicitud',
    lscWords: 'RECHAZADO - NO - DENEGADO',
    gestureType: 'cross_reject',
    gestureCategory: '❌ Cruce de Manos en Negativa',
    definition: 'Solicitud que no cumple requisitos o no cuenta con disponibilidad y requiere corrección o cierre.',
    videoHint: 'Gesto: Antebrazos o dedos índices cruzándose firmemente en X con movimiento enfático de cabeza.',
    keywords: ['rechazar', 'rechazado', 'rechazada', 'rechazo', 'denegar', 'denegado', 'cancelar', 'anular'],
    videoUrl: ''
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones y Alertas',
    lscWords: 'AVISO - NOTIFICACIÓN - ALERTA',
    gestureType: 'bell_alert',
    gestureCategory: '🔔 Campana de Aviso con Ondas',
    definition: 'Mensajes y novedades automáticas sobre el cambio de estado de sus trámites.',
    videoHint: 'Gesto: Manos oscilando como campana institucional con ondas circulares de aviso.',
    keywords: ['notificaciones', 'notificacion', 'notificación', 'alertas', 'alerta', 'avisos', 'campana', 'mensajes'],
    videoUrl: ''
  },
  {
    id: 'radicar',
    title: 'Radicar Solicitud',
    lscWords: 'RADICAR - REGISTRAR - ENVIAR',
    gestureType: 'folder_stamp',
    gestureCategory: '📁 Documento en Carpeta y Sello',
    definition: 'Envío oficial del formulario para iniciar el proceso de revisión y asignación de recursos.',
    videoHint: 'Gesto: Mano deslizando hoja en carpeta virtual y aplicando sello de radicación con número.',
    keywords: ['radicar', 'crear solicitud', 'nueva solicitud', 'enviar solicitud', 'guardar solicitud', 'radicado', 'enviar', 'guardar'],
    videoUrl: ''
  },
  {
    id: 'login',
    title: 'Ingresar al sistema',
    lscWords: 'INGRESAR - SISTEMA',
    gestureType: 'login_key',
    gestureCategory: '🔑 Tecleo en Teclado y Entrada',
    definition: 'Acceso seguro al portal mediante usuario y contraseña de la entidad.',
    videoHint: 'Gesto: Mano abierta empuja hacia adelante en dirección a la pantalla y los dedos simulan teclear credenciales de acceso.',
    keywords: ['ingresar al sistema', 'ingresar', 'iniciar sesión', 'iniciar sesion', 'login', 'acceder al sistema', 'acceder', 'entrar'],
    videoUrl: ''
  },
  {
    id: 'services',
    title: 'Ver Servicios',
    lscWords: 'SERVICIOS - ADMINISTRATIVOS',
    gestureType: 'hands_fan',
    gestureCategory: '📋 Palmas Abiertas en Abanico',
    definition: 'Catálogo de solicitudes administrativas disponibles en la plataforma institucional.',
    videoHint: 'Gesto: Ambas manos abiertas con palmas hacia arriba abriéndose en abanico horizontal mostrando múltiples opciones.',
    keywords: ['ver servicios', 'servicios administrativos', 'servicios disponibles', 'servicios', 'catálogo de servicios', 'tramites', 'trámites'],
    videoUrl: ''
  },
  {
    id: 'flow',
    title: 'Cómo funciona',
    lscWords: 'CÓMO - FUNCIONA - PROCESO',
    gestureType: 'rotating_gears',
    gestureCategory: '⚙️ Engranajes en Rotación Alternada',
    definition: 'Guía paso a paso para radicar, gestionar y consultar solicitudes.',
    videoHint: 'Gesto: Puños cerrados frente al pecho rotando alternadamente en círculos continuos indicando funcionamiento.',
    keywords: ['cómo funciona', 'como funciona', 'proceso', 'pasos', 'flujo'],
    videoUrl: ''
  },
  {
    id: 'support',
    title: 'Soporte y Ayuda',
    lscWords: 'SOPORTE - AYUDA',
    gestureType: 'fist_support',
    gestureCategory: '🤝 Puño con Palma de Soporte',
    definition: 'Canal de atención para resolución de inquietudes, ayuda técnica y preguntas frecuentes.',
    videoHint: 'Gesto: Puño derecho cerrado apoyado sobre la palma izquierda abierta empujando hacia arriba en señal de respaldo.',
    keywords: ['soporte y ayuda', 'soporte', 'ayuda', 'atención', 'atencion'],
    videoUrl: ''
  },
  {
    id: 'faq_services',
    title: 'Preguntas Frecuentes',
    lscWords: 'PREGUNTA - SERVICIOS - CUÁLES',
    gestureType: 'question_gesture',
    gestureCategory: '❓ Signo de Interrogación y Pregunta',
    definition: 'Respuestas a las dudas más comunes de los colaboradores de la entidad.',
    videoHint: 'Gesto: Dedo índice dibujando un signo de interrogación en el aire y palmas abiertas en consulta.',
    keywords: ['preguntas frecuentes', 'faq', 'dudas frecuentes', 'qué tipos de servicios puedo solicitar', 'que tipos de servicios puedo solicitar', 'tipos de servicios'],
    videoUrl: ''
  },
  {
    id: 'faq_tracking',
    title: 'Seguimiento de Trámites',
    lscWords: 'CÓMO - SEGUIMIENTO - REVISAR',
    gestureType: 'magnifier_track',
    gestureCategory: '🔍 Lupa sobre Línea de Tiempo',
    definition: 'Consulte el estado, historial y respuestas de su trámite desde el panel del funcionario.',
    videoHint: 'Gesto: Mano en forma de lente sobre documento avanzando en línea horizontal revisando avance.',
    keywords: ['cómo hago seguimiento a mi solicitud', 'como hago seguimiento a mi solicitud', 'seguimiento a mi solicitud', 'seguimiento', 'trazabilidad', 'historial'],
    videoUrl: ''
  },
  {
    id: 'gestion',
    title: 'Gestión Institucional',
    lscWords: 'GESTIÓN - CLARA - MEDIBLE',
    gestureType: 'chart_growth',
    gestureCategory: '📈 Gráfica de Crecimiento y Control',
    definition: 'Trámites transparentes con trazabilidad total y seguimiento permanente.',
    videoHint: 'Gesto: Manos abiertas hacia el frente trazando línea limpia + pulgares arriba + trazo ascendente de gráfica.',
    keywords: ['gestión simple, visible y medible', 'gestion simple', 'medible', 'gestion', 'gestión', 'indicadores', 'reportes'],
    videoUrl: ''
  },
  {
    id: 'mision',
    title: 'Misión Oficial',
    lscWords: 'MISIÓN - OFICIAL - TRABAJO',
    gestureType: 'official_badge',
    gestureCategory: '👔 Carné Institucional y Avance',
    definition: 'Salida autorizada de la sede institucional para cumplir funciones públicas.',
    videoHint: 'Gesto: Mano en el pecho señalando credencial oficial y avanzando hacia adelante con determinación.',
    keywords: ['misión oficial', 'mision oficial', 'comisión', 'comision'],
    videoUrl: ''
  },
  {
    id: 'aforo',
    title: 'Aforo de Espacios',
    lscWords: 'AFORO - LÍMITE - PERSONAS',
    gestureType: 'capacity_limit',
    gestureCategory: '👥 Límite Superior de Capacidad',
    definition: 'Capacidad máxima de personas autorizadas en un auditorio o sala simultáneamente.',
    videoHint: 'Gesto: Grupo de personas indicado con dedos juntos + mano extendida en tope horizontal indicando límite.',
    keywords: ['aforo', 'capacidad', 'cupo máximo', 'cupo maximo'],
    videoUrl: ''
  },
  {
    id: 'password',
    title: 'Contraseña de Acceso',
    lscWords: 'CONTRASEÑA - SECRETO - CLAVE',
    gestureType: 'secret_lock',
    gestureCategory: '🔒 Candado Cerrado y Clave',
    definition: 'Clave personal y confidencial para autenticación en la plataforma.',
    videoHint: 'Gesto: Pulgar e índice cerrando candado imaginario frente a la boca y luego tecleo reservado.',
    keywords: ['misma contraseña del correo', 'contraseña', 'contrasena', 'clave', 'password'],
    videoUrl: ''
  },
  {
    id: 'dependencia',
    title: 'Dependencia / Área Solicitante',
    lscWords: 'OFICINA - DEPENDENCIA - SECTOR',
    gestureType: 'official_badge',
    gestureCategory: '🏛️ Dependencia y Área Solicitante',
    definition: 'Subdirección, gerencia o área administrativa a la que pertenece el funcionario que radica la solicitud.',
    videoHint: 'Gesto: Manos trazando columnas institucionales y señalando el sector interno de trabajo.',
    keywords: ['dependencia solicitante', 'dependencia anfitriona', 'dependencia', 'dependencias', 'área solicitante', 'area solicitante', 'subdirección', 'subdireccion', 'oficina'],
    videoUrl: ''
  },
  {
    id: 'justificacion',
    title: 'Justificación / Motivo',
    lscWords: 'POR QUÉ - MOTIVO - RAZÓN',
    gestureType: 'folder_stamp',
    gestureCategory: '📝 Justificación y Motivo de Solicitud',
    definition: 'Descripción clara de la necesidad laboral o institucional que sustenta la solicitud.',
    videoHint: 'Gesto: Dedo índice en la sien en pensamiento y luego extendiendo la mano explicando el motivo.',
    keywords: ['justificación', 'justificacion', 'motivo', 'justificación de la visita', 'justificacion de la visita', 'motivo de la visita', 'justificación de la misión oficial', 'justificacion de la mision oficial', 'descripción detallada', 'descripcion detallada'],
    videoUrl: ''
  },
  {
    id: 'cedula',
    title: 'Documento de Identidad',
    lscWords: 'CÉDULA - DOCUMENTO - IDENTIFICACIÓN',
    gestureType: 'official_badge',
    gestureCategory: '🪪 Documento de Identidad y Cédula',
    definition: 'Cédula de ciudadanía o documento oficial requerido para el control de acceso, registro y validación.',
    videoHint: 'Gesto: Pulgar e índice formando un rectángulo plano frente al pecho simulando el documento de identidad.',
    keywords: ['documento de identidad', 'cédula', 'cedula', 'identificación', 'identificacion', 'número de documento', 'numero de documento', 'cédula o documento de identidad'],
    videoUrl: ''
  },
  {
    id: 'horario',
    title: 'Fecha y Horario Programado',
    lscWords: 'FECHA - HORA - CALENDARIO',
    gestureType: 'table_booking',
    gestureCategory: '🕒 Fecha y Horario Programado',
    definition: 'Día, hora de inicio y hora de finalización requerida para el servicio o reserva de espacio.',
    videoHint: 'Gesto: Dedo índice señalando la muñeca izquierda (reloj) y luego marcando cuadrícula de calendario.',
    keywords: ['hora de inicio', 'hora de finalización', 'hora de finalizacion', 'hora de recogida', 'fecha de la visita', 'fecha de la reunión', 'fecha de la reunion', 'horario', 'fecha'],
    videoUrl: ''
  },
  {
    id: 'prioridad',
    title: 'Prioridad del Requerimiento',
    lscWords: 'NIVEL - URGENCIA - PRIORIDAD',
    gestureType: 'chart_growth',
    gestureCategory: '⚡ Nivel de Urgencia y Prioridad',
    definition: 'Nivel de criticidad asignado a la solicitud (Alta, Media o Baja) para su pronta atención.',
    videoHint: 'Gesto: Palma horizontal que asciende rápidamente indicando urgencia o nivel prioritario.',
    keywords: ['prioridad del mantenimiento', 'prioridad', 'urgencia', 'alta prioridad', 'prioridad alta', 'prioridad media', 'prioridad baja', 'urgente'],
    videoUrl: ''
  },
  {
    id: 'funcionario',
    title: 'Funcionario / Servidor Público',
    lscWords: 'TRABAJADOR - ESTADO - SERVIDOR',
    gestureType: 'official_badge',
    gestureCategory: '👔 Servidor Público Institucional',
    definition: 'Colaborador vinculado a la Secretaría Jurídica Distrital autorizado para gestionar trámites.',
    videoHint: 'Gesto: Mano derecha en diagonal sobre el pecho simbolizando servicio público y compromiso.',
    keywords: ['nombre completo del funcionario', 'funcionario', 'funcionarios', 'servidor público', 'servidor publico', 'colaborador', 'empleado'],
    videoUrl: ''
  },
  {
    id: 'en_proceso',
    title: 'En Trámite / En Proceso',
    lscWords: 'PROCESO - TRÁMITE - EN CURSO',
    gestureType: 'rotating_gears',
    gestureCategory: '🔄 Estado En Trámite o En Curso',
    definition: 'Estado que indica que la solicitud está en revisión y ejecución activa por el área designada.',
    videoHint: 'Gesto: Manos en movimiento fluido hacia adelante indicando avance constante del trámite.',
    keywords: ['en trámite', 'en tramite', 'en proceso', 'en curso', 'pendiente', 'en revisión', 'en revision'],
    videoUrl: ''
  },
  {
    id: 'logout',
    title: 'Cerrar Sesión',
    lscWords: 'SALIR - TERMINAR - CERRAR',
    gestureType: 'login_key',
    gestureCategory: '🚪 Cierre de Sesión y Salida',
    definition: 'Desconexión segura del portal institucional para resguardar la privacidad del usuario.',
    videoHint: 'Gesto: Manos cerrándose hacia el cuerpo y deslizando hacia el exterior indicando fin de jornada.',
    keywords: ['cerrar sesión', 'cerrar sesion', 'salir del sistema', 'salir', 'desconectar'],
    videoUrl: ''
  },
  {
    id: 'pasajeros',
    title: 'Pasajeros y Cupos',
    lscWords: 'PASAJEROS - PERSONAS - CUPO',
    gestureType: 'capacity_limit',
    gestureCategory: '👥 Cantidad de Pasajeros y Cupos',
    definition: 'Número de funcionarios que se desplazarán en el vehículo de transporte institucional.',
    videoHint: 'Gesto: Dedos contando cantidad de personas e ingresando ordenadamente a un vehículo.',
    keywords: ['número de pasajeros', 'numero de pasajeros', 'número de pasajeros requeridos', 'pasajeros', 'cupos', 'cantidad estimada de asistentes', 'asistentes'],
    videoUrl: ''
  },
  {
    id: 'cancelar',
    title: 'Cancelar Solicitud',
    lscWords: 'CANCELAR - ANULAR - FRENAR',
    gestureType: 'cross_reject',
    gestureCategory: '🛑 Cancelación o Anulación',
    definition: 'Acción para revocar una solicitud radicada previamente antes de su asignación o atención.',
    videoHint: 'Gesto: Manos cruzándose con corte horizontal indicando detención o suspensión total.',
    keywords: ['cancelar solicitud', 'anular solicitud', 'descartar', 'anular', 'cancelar'],
    videoUrl: ''
  },
  {
    id: 'auditorio',
    title: 'Auditorios y Salones',
    lscWords: 'AUDITORIO - SALÓN - REUNIÓN',
    gestureType: 'table_booking',
    gestureCategory: '🏛️ Auditorio Barule y Huitaca',
    definition: 'Espacios institucionales de gran capacidad como Auditorio Barule 1 y 2, o Auditorio Huitaca.',
    videoHint: 'Gesto: Manos abriéndose en semicírculo amplio simulando la gradería y escenario de un auditorio.',
    keywords: ['auditorio barule', 'auditorio huitaca', 'auditorio', 'auditorios', 'salón 308', 'salon 308', 'sala de juntas principal'],
    videoUrl: ''
  },
  {
    id: 'recordarme',
    title: 'Recordar Sesión',
    lscWords: 'RECORDAR - MEMORIA - GUARDAR',
    gestureType: 'secret_lock',
    gestureCategory: '💾 Recordar Credenciales en Equipo',
    definition: 'Opción para mantener la sesión iniciada en equipos de uso personal y de confianza.',
    videoHint: 'Gesto: Dedo índice en la frente y luego cerrando palma en el pecho indicando retener memoria.',
    keywords: ['recordarme', 'recordar usuario', 'mantener sesión', 'mantener sesion'],
    videoUrl: ''
  }
];

// Función utilitaria para escape de caracteres en expresiones regulares
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Pre-cálculo optimizado de términos con palabras clave normalizadas (sin tildes, minúsculas, ordenadas por longitud)
const PREPARED_LSC_TERMS = LSC_DICTIONARY.map(t => ({
  ...t,
  normKeywords: t.keywords
    .map(kw => kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim())
    .sort((a, b) => b.length - a.length),
}));

// Catálogo completo para el Modal Glosario de Personas Sordas generado dinámicamente con todos los términos enriquecidos
export const DICTIONARY_TERMS = LSC_DICTIONARY.map(t => ({
  term: t.title,
  definition: t.definition,
  lscHint: `${t.gestureCategory} (${t.videoHint.replace('Gesto: ', '')})`,
  id: t.id,
}));

// Compatibilidad hacia atrás
export const LSC_SECTIONS = LSC_DICTIONARY;

// Función de dibujo cinemático de gestos LSC diferenciados
const drawLscGestureFrame = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  term: LSCTerm,
  frame: number
) => {
  // 1. Fondo de estudio LSC con iluminación cenital
  ctx.fillStyle = '#0B1120';
  ctx.fillRect(0, 0, width, height);

  const grad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width * 0.7);
  grad.addColorStop(0, '#1E293B');
  grad.addColorStop(1, '#0B1120');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Marco de grabación de estudio
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  // HUD Superior: REC + Código de Tiempo + Categoría del Gesto
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(20, 20, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('LSC VIVO', 30, 24);

  // Categoría específica del gesto con ícono único
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(term.gestureCategory, width / 2, 24);
  ctx.textAlign = 'left';

  // Código de tiempo
  const sec = Math.floor((frame % 180) / 30);
  const cent = Math.floor(((frame % 30) / 30) * 100);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.fillText(`00:0${sec}:${cent < 10 ? '0' + cent : cent}`, width - 68, 24);

  // Tiempo armónico
  const t = frame * 0.07;
  const wave = Math.sin(t);
  const cosWave = Math.cos(t);

  const centerX = width / 2; // 180
  const headY = 66 + wave * 1.2;

  // 2. Avatar: Cabeza con expresión deíctica
  ctx.fillStyle = '#E0F2FE';
  ctx.beginPath();
  ctx.arc(centerX, headY, 20, 0, Math.PI * 2);
  ctx.fill();

  // Rostro / Mirada según el gesto
  ctx.fillStyle = '#0369A1';
  ctx.beginPath();
  ctx.arc(centerX - 6, headY - 2, 2.2, 0, Math.PI * 2);
  ctx.arc(centerX + 6, headY - 2, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Sonrisa o expresión neutra comunicativa
  ctx.strokeStyle = '#0369A1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (term.gestureType === 'question_gesture') {
    ctx.arc(centerX, headY + 8, 3.5, 0, Math.PI * 2); // Boca en 'O' de interrogación
  } else {
    ctx.arc(centerX, headY + 5, 4.5, 0, Math.PI);
  }
  ctx.stroke();

  // Torso profesional de intérprete (ropa oscura uniforme)
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.ellipse(centerX, 132, 36, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 3. RENDERIZADO CINEMÁTICO SEGÚN EL TIPO ESPECÍFICO DE GESTO
  const gType = term.gestureType || 'hands_fan';

  if (gType === 'steering_wheel') {
    // 🚗 CONDUCCIÓN VEHICULAR: Volante rotatorio con manos sujetando ambos lados
    const angle = Math.sin(t * 1.5) * 0.45;
    const wheelY = 112;
    const wheelR = 34;

    // Aro del volante
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(centerX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    // Radios del volante
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX, wheelY);
    ctx.lineTo(centerX - Math.cos(angle) * wheelR, wheelY - Math.sin(angle) * wheelR);
    ctx.moveTo(centerX, wheelY);
    ctx.lineTo(centerX + Math.cos(angle) * wheelR, wheelY + Math.sin(angle) * wheelR);
    ctx.moveTo(centerX, wheelY);
    ctx.lineTo(centerX + Math.sin(angle) * wheelR, wheelY + Math.cos(angle) * wheelR);
    ctx.stroke();

    // Manos sujetando volante
    const leftX = centerX - Math.cos(angle) * wheelR;
    const leftY = wheelY - Math.sin(angle) * wheelR;
    const rightX = centerX + Math.cos(angle) * wheelR;
    const rightY = wheelY + Math.sin(angle) * wheelR;

    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(centerX - 24, 110);
    ctx.lineTo(leftX, leftY);
    ctx.moveTo(centerX + 24, 110);
    ctx.lineTo(rightX, rightY);
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(leftX, leftY, 7.5, 0, Math.PI * 2);
    ctx.arc(rightX, rightY, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Flechas curvas de giro
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(centerX, wheelY, wheelR + 10, angle - 0.4, angle + 0.4);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (gType === 'walking_legs') {
    // 👥 INGRESO VISITANTES: Dedos V invertida caminando hacia marco de puerta
    const doorX = centerX - 45;
    // Marco de puerta
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.strokeRect(doorX - 16, 75, 32, 65);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fillRect(doorX - 16, 75, 32, 65);

    // Brazo derecho guiando
    const handX = centerX + 15 + ((frame % 60) * 0.45);
    const leg1Y = 120 + Math.sin(t * 3) * 8;
    const leg2Y = 120 - Math.sin(t * 3) * 8;

    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(centerX + 20, 105);
    ctx.lineTo(handX, 108);
    // Dedos V caminando
    ctx.lineTo(handX - 10, leg1Y);
    ctx.moveTo(handX, 108);
    ctx.lineTo(handX + 6, leg2Y);
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(handX - 10, leg1Y, 4, 0, Math.PI * 2);
    ctx.arc(handX + 6, leg2Y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Huellas de pasos
    ctx.fillStyle = 'rgba(250, 204, 21, 0.6)';
    ctx.beginPath();
    ctx.arc(handX - 22, 122, 2.5, 0, Math.PI * 2);
    ctx.arc(handX - 34, 122, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (gType === 'wrench_repair') {
    // 🛠️ MANTENIMIENTO: Tuerca/tubo central y llave inglesa rotando con chispas
    const boltX = centerX;
    const boltY = 115;
    const rot = Math.sin(t * 1.8) * 0.7;

    // Tuerca central
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.arc(boltX, boltY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(boltX, boltY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Llave girando
    ctx.save();
    ctx.translate(boltX, boltY);
    ctx.rotate(rot);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(45, 0);
    ctx.stroke();
    // Boca de llave
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, 0, 15, Math.PI * 0.3, Math.PI * 1.7, false);
    ctx.fill();
    ctx.restore();

    // Puño izquierdo sosteniendo la base
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(boltX - 15, boltY + 12, 8, 0, Math.PI * 2);
    ctx.fill();

    // Chispas de reparación
    if (Math.abs(wave) > 0.6) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(boltX + 16, boltY - 10, 2.5, 0, Math.PI * 2);
      ctx.arc(boltX - 10, boltY - 14, 2, 0, Math.PI * 2);
      ctx.arc(boltX + 8, boltY + 16, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (gType === 'table_booking') {
    // 📅 RESERVA DE SALAS: Trazo de mesa rectangular y sello firme de confirmación
    const phase = (frame % 80);
    const tableProgress = Math.min(1, phase / 40);

    // Trazo de mesa en perspectiva
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 45 * tableProgress, 125);
    ctx.lineTo(centerX + 45 * tableProgress, 125);
    ctx.lineTo(centerX + 32 * tableProgress, 142);
    ctx.lineTo(centerX - 32 * tableProgress, 142);
    ctx.closePath();
    ctx.stroke();

    // Sello de confirmación descendiendo
    if (phase > 40) {
      const stampProgress = (phase - 40) / 40;
      const stampY = 85 + Math.min(35, stampProgress * 70);

      // Puño con sello
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(centerX, stampY, 10, 0, Math.PI * 2);
      ctx.fill();

      // Onda de impacto
      if (stampProgress > 0.5) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, 125, (stampProgress - 0.5) * 40, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } else if (gType === 'parking_p') {
    // 🅿️ PARQUEADERO: Palma plana horizontal (bahía) y mano formando P descendiendo
    // Palma izquierda horizontal
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(centerX - 40, 130);
    ctx.lineTo(centerX + 10, 130);
    ctx.stroke();
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(centerX + 12, 130, 7, 0, Math.PI * 2);
    ctx.fill();

    // Letra P descendiendo a parquear
    const parkY = 90 + Math.min(30, (frame % 70) * 0.5);
    ctx.fillStyle = '#2563EB';
    ctx.fillRect(centerX - 2, parkY - 14, 26, 26);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('P', centerX + 5, parkY + 6);

    // Mano derecha formando letra P
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(centerX - 4, parkY - 2, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (gType === 'camera_photo') {
    // 📷 EVIDENCIAS: Encuadre de manos formando cámara y flash de obturador
    const camW = 60 + Math.sin(t) * 4;
    const camH = 42 + Math.sin(t) * 3;
    const camX = centerX - camW / 2;
    const camY = 100 - camH / 2;

    // Visor de cámara
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(camX, camY, camW, camH);

    // Cruz de enfoque
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, 100);
    ctx.lineTo(centerX + 8, 100);
    ctx.moveTo(centerX, 92);
    ctx.lineTo(centerX, 108);
    ctx.stroke();

    // Manos en las esquinas
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(camX, camY, 6, 0, Math.PI * 2);
    ctx.arc(camX + camW, camY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Destello de obturador periódico
    if ((frame % 60) > 50) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(centerX, 100, 28, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (gType === 'speech_waves') {
    // 🤖 ASISTENTE VIRTUAL: Mano en la boca emitiendo ondas digitales hacia adelante
    const mouthX = centerX + 18;
    const mouthY = headY + 6;

    // Mano en la boca
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(mouthX + 6, mouthY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Ondas concéntricas de voz y datos
    for (let i = 1; i <= 3; i++) {
      const r = ((frame * 1.8 + i * 16) % 55);
      const alpha = Math.max(0, 1 - r / 55);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(mouthX + 10, mouthY, r, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
    }
  } else if (gType === 'star_rating') {
    // ⭐ CALIFICACIÓN: Estrella dorada pulsante y doble pulgar arriba
    const starR = 20 + Math.sin(t * 2) * 3;
    ctx.save();
    ctx.translate(centerX, 105);
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * starR, -Math.sin((18 + i * 72) * Math.PI / 180) * starR);
      ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (starR * 0.5), -Math.sin((54 + i * 72) * Math.PI / 180) * (starR * 0.5));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Pulgares arriba a ambos lados
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(centerX - 42, 105 + wave * 4, 7, 0, Math.PI * 2);
    ctx.arc(centerX + 42, 105 + wave * 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 42, 105 + wave * 4);
    ctx.lineTo(centerX - 42, 95 + wave * 4);
    ctx.moveTo(centerX + 42, 105 + wave * 4);
    ctx.lineTo(centerX + 42, 95 + wave * 4);
    ctx.stroke();
  } else if (gType === 'checkmark_approve') {
    // ✅ APROBACIÓN: Trazo de visto bueno dinámico verde
    const progress = (frame % 50) / 50;
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX - 24, 110);
    if (progress > 0.3) {
      ctx.lineTo(centerX - 6, 124);
    }
    if (progress > 0.6) {
      ctx.lineTo(centerX + 26, 92);
    }
    ctx.stroke();

    // Mano trazando
    const handX = progress < 0.3 ? centerX - 24 : (progress < 0.6 ? centerX - 6 : centerX + 26);
    const handY = progress < 0.3 ? 110 : (progress < 0.6 ? 124 : 92);
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(handX, handY, 7.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (gType === 'cross_reject') {
    // ❌ RECHAZO: Cruce de antebrazos en X firme
    const swing = Math.sin(t * 2) * 6;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(centerX - 28 + swing, 95);
    ctx.lineTo(centerX + 28 - swing, 135);
    ctx.moveTo(centerX + 28 - swing, 95);
    ctx.lineTo(centerX - 28 + swing, 135);
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(centerX - 28 + swing, 95, 6, 0, Math.PI * 2);
    ctx.arc(centerX + 28 - swing, 95, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (gType === 'bell_alert') {
    // 🔔 NOTIFICACIONES: Campana oscilante con ondas de alerta
    const bellAngle = Math.sin(t * 2.5) * 0.35;
    ctx.save();
    ctx.translate(centerX, 90);
    ctx.rotate(bellAngle);
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, 0, 16, Math.PI, 0, false);
    ctx.lineTo(18, 22);
    ctx.lineTo(-18, 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(0, 24, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Manos simulando sonido
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(centerX - 36, 115 + cosWave * 5, 7, 0, Math.PI * 2);
    ctx.arc(centerX + 36, 115 - cosWave * 5, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (gType === 'folder_stamp') {
    // 📁 RADICAR: Hoja en carpeta y sello oficial
    // Carpeta abierta
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX - 32, 105, 64, 38);
    // Hoja ingresando
    const paperY = 88 + Math.min(22, (frame % 60) * 0.4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(centerX - 20, paperY, 40, 24);

    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(centerX + 18, paperY + 6, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (gType === 'question_gesture') {
    // ❓ PREGUNTAS FRECUENTES: Dedo trazando '?' en el aire
    const phase = (frame % 60) / 60;
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, 98, 14, Math.PI * 1.2, Math.PI * 0.1, false);
    ctx.lineTo(centerX, 116);
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(centerX, 126, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Dedo índice trazando
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(centerX + Math.cos(phase * Math.PI * 2) * 14, 98 + Math.sin(phase * Math.PI * 2) * 14, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (gType === 'chart_growth') {
    // 📈 GESTIÓN: Gráfica de barras ascendente y flecha
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(centerX - 36, 125, 12, 16);
    ctx.fillRect(centerX - 18, 115, 12, 26);
    ctx.fillRect(centerX, 105, 12, 36);
    ctx.fillRect(centerX + 18, 92, 12, 49);

    // Flecha ascendente
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 36, 125);
    ctx.lineTo(centerX + 30, 88);
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(centerX + 30, 88, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 📋 PALMAS EN ABANICO (Servicios, flujos y catálogo)
    const leftX = centerX - 32 - Math.abs(wave) * 22;
    const rightX = centerX + 32 + Math.abs(wave) * 22;
    const handY = 118 + cosWave * 8;

    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(centerX - 20, 110);
    ctx.lineTo(leftX, handY);
    ctx.moveTo(centerX + 20, 110);
    ctx.lineTo(rightX, handY);
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.arc(leftX, handY, 7.5, 0, Math.PI * 2);
    ctx.arc(rightX, handY, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Estela de opciones
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(centerX, 118, 30 + Math.abs(wave) * 16, 0, Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 4. Cintillo inferior de Glosa LSC de alta visibilidad
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fillRect(8, height - 32, width - 16, 24);
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, height - 32, width - 16, 24);

  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`SEÑA LSC: ${term.lscWords}`, width / 2, height - 16);
  ctx.textAlign = 'left';
};

// Componente interactivo de Video LSC con Canvas HD y Controles de Pausa/Replay
export const LSCVideoPlayer: React.FC<{ term: LSCTerm }> = ({ term }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const frameRef = useRef(0);
  const isPlayingRef = useRef(true);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    frameRef.current = 0;
    setIsPlaying(true);
  }, [term]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (term.videoUrl) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (isPlayingRef.current) {
        frameRef.current++;
      }
      drawLscGestureFrame(ctx, canvas.width, canvas.height, term, frameRef.current);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [term]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const handleRestart = () => {
    frameRef.current = 0;
    setIsPlaying(true);
  };

  if (term.videoUrl) {
    return (
      <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden' }}>
        <video
          src={term.videoUrl}
          autoPlay
          loop
          muted
          playsInline
          controls
          style={{ width: '100%', height: 185, backgroundColor: '#0F172A', display: 'block', borderRadius: 12 }}
        />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#0B1120' }}>
      <canvas
        ref={canvasRef}
        width={360}
        height={210}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }}
      />
      {/* Barra de control interactiva para la persona sorda (Pausar o reiniciar) */}
      <div style={{
        position: 'absolute',
        bottom: 7,
        left: 10,
        right: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={togglePlay}
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              color: '#FFFFFF',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title={isPlaying ? 'Pausar seña para ver detalle' : 'Reanudar video'}
          >
            {isPlaying ? '⏸ Pausa' : '▶ Play'}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid rgba(148, 163, 184, 0.5)',
              color: '#CBD5E1',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Reiniciar seña desde el paso 1"
          >
            ↺ Repetir
          </button>
        </div>
        <span style={{ color: '#94A3B8', fontSize: 9.5, fontWeight: 700, fontFamily: 'monospace' }}>
          LSC • HD
        </span>
      </div>
    </div>
  );
};

interface AccessibilityToolbarProps {
  onApplySettings?: (settings: {
    fontSizeMultiplier: number;
    colorMode: string;
    underlineLinks: boolean;
    dyslexiaMode: boolean;
  }) => void;
}

export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({ onApplySettings }) => {
  const router = useRouter();
  const rawPathname = usePathname();
  const pathname = rawPathname || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 1024;
  const isSmallScreen = windowWidth < 500 || windowHeight < 650;
  const [panelOpen, setOpenPanel] = useState(false);
  const [bannerMinimized, setBannerMinimized] = useState(false);

  // Perfiles de discapacidad
  const [activeProfile, setActiveProfile] = useState<'none' | 'deaf' | 'blind' | 'colorblind' | 'dyslexia'>('none');

  // Opciones visuales
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  const [colorMode, setColorMode] = useState<'normal' | 'grayscale' | 'dark' | 'light'>('normal');
  const [underlineLinks, setUnderlineLinks] = useState(false);
  const [dyslexiaMode, setDyslexiaMode] = useState(false);

  // Escalas progresivas de zoom visual de toda la página
  const ZOOM_LEVELS = [1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

  // LSC (Lengua de Señas)
  const [lscActive, setLscActive] = useState(false);
  const [lscCurrentSection, setLscCurrentSection] = useState('welcome');
  const [dictionaryVisible, setDictionaryVisible] = useState(false);
  const [lscPopover, setLscPopover] = useState<{
    visible: boolean;
    term: LSCTerm | null;
    top: number;
    left: number;
  }>({
    visible: false,
    term: null,
    top: 0,
    left: 0,
  });
  const hideLscTimerRef = useRef<any>(null);

  // Lector de voz y micrófono continuo para ciegos
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState('');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [interactiveReaderEnabled, setInteractiveReaderEnabled] = useState<boolean>(false);
  const lastPathnameRef = useRef(pathname);
  const recognitionRef = useRef<any>(null);
  const voiceActiveRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const restartVoiceTimeoutRef = useRef<any>(null);
  const lastActiveInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const currentFormNavIndexRef = useRef<number>(-1);

  // Reiniciar el índice secuencial de campos al cambiar de formulario
  useEffect(() => {
    currentFormNavIndexRef.current = -1;
  }, [pathname]);

  // Notificación de estado
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Estado de hover para opacidad suave en el botón flotante
  const [isBtnHovered, setIsBtnHovered] = useState(false);

  // Bandera para diferenciar arrastre (drag) de clic simple y evitar abrir el modal al soltar el mouse
  const isDraggingBtnRef = useRef(false);

  // Movimiento libre / Drag & Drop para el botón flotante de Accesibilidad
  const buttonPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const buttonPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const moved = Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
        if (moved) isDraggingBtnRef.current = true;
        return moved;
      },
      onPanResponderGrant: () => {
        isDraggingBtnRef.current = false;
        buttonPan.extractOffset();
      },
      onPanResponderMove: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4) {
          isDraggingBtnRef.current = true;
        }
        buttonPan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (e, gestureState) => {
        buttonPan.flattenOffset();
        const wasDragged = Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
        if (wasDragged) {
          isDraggingBtnRef.current = true;
          // Mantener la bandera activa brevemente para bloquear el evento de clic del navegador tras soltar el mouse
          setTimeout(() => {
            isDraggingBtnRef.current = false;
          }, 250);
        } else {
          isDraggingBtnRef.current = false;
        }
        const { width, height } = Dimensions.get('window');
        
        // Coordenadas acumuladas
        const currentX = (buttonPan.x as any)._value;
        const currentY = (buttonPan.y as any)._value;

        // Tamaño y posición base (alargado en pantallas anchas)
        const btnWidth = isSmallScreen ? 50 : 138;
        const btnHeight = isSmallScreen ? 50 : 46;
        const baseRight = isSmallScreen ? 16 : 24;
        const baseBottom = isSmallScreen ? 145 : 100;

        // Límites en pantalla completa
        const maxLeft = -(width - btnWidth - baseRight - 16); 
        const maxUp = -(height - btnHeight - baseBottom - 40); 
        const maxDown = baseBottom - 20;

        let targetX = currentX;
        let targetY = currentY;

        // Snap magnético al borde más cercano (izquierda o derecha)
        const middleX = maxLeft / 2;
        if (currentX < middleX) {
          targetX = maxLeft;
        } else {
          targetX = 0;
        }

        // Limitar posición en Y dentro de la pantalla
        if (currentY < maxUp) {
          targetY = maxUp;
        } else if (currentY > maxDown) {
          targetY = maxDown;
        }

        Animated.parallel([
          Animated.spring(buttonPan.x, {
            toValue: targetX,
            useNativeDriver: false,
            tension: 40,
            friction: 6,
          }),
          Animated.spring(buttonPan.y, {
            toValue: targetY,
            useNativeDriver: false,
            tension: 40,
            friction: 6,
          }),
        ]).start();
      },
    })
  ).current;

  // Aplicación directa en el DOM para Web (Zoom de toda la página, Colores, Daltonismo, Dislexia, Subrayado)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // 1. Zoom de toda la página (textos, botones, imágenes, tablas y menús)
      // Guardar en localStorage para persistencia al navegar
      try {
        localStorage.setItem('sasge_zoom_scale', String(fontSizeMultiplier));
        localStorage.setItem('sasge_color_mode', colorMode);
      } catch (e) {}

      // Aplicar zoom sobre html y body manteniendo responsive sin desbordamiento
      document.documentElement.style.fontSize = `${16 * fontSizeMultiplier}px`;
      const rootDiv = document.getElementById('root') || document.body;
      if (fontSizeMultiplier !== 1) {
        // En navegadores web, 'zoom' aplica ampliación proporcional a toda la interfaz
        (document.body.style as any).zoom = `${fontSizeMultiplier}`;
        document.body.style.transformOrigin = 'top left';
      } else {
        (document.body.style as any).zoom = '1';
      }

      // 2. Modos de color / Tema Claro / Tema Oscuro Global para Toda la Página
      let themeStyleEl = document.getElementById('sasge-global-theme-style') as HTMLStyleElement | null;
      if (!themeStyleEl) {
        themeStyleEl = document.createElement('style');
        themeStyleEl.id = 'sasge-global-theme-style';
        document.head.appendChild(themeStyleEl);
      }

      if (colorMode === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.style.colorScheme = 'dark';
        document.documentElement.style.filter = 'none';
        document.body.style.backgroundColor = '#0A0E17';
        document.body.style.color = '#FFFFFF';

        themeStyleEl.textContent = `
          /* === MODO OSCURO GLOBAL SASGE (CONTRASTE ELEVADO EN FORMULARIOS) === */
          html[data-theme="dark"],
          html[data-theme="dark"] body,
          html[data-theme="dark"] #root {
            background-color: #0A0E17 !important;
            color: #FFFFFF !important;
          }

          /* 1. Contenedores, secciones, tarjetas, paneles y cards */
          html[data-theme="dark"] .r-backgroundColor-14lw9ot,
          html[data-theme="dark"] .r-backgroundColor-11j01x2,
          html[data-theme="dark"] .r-backgroundColor-1jh0li6,
          html[data-theme="dark"] [data-theme-bg="light"],
          html[data-theme="dark"] div:not([role="switch"]):not([role="switch"] *)[style*="background-color: rgb(255, 255, 255)"],
          html[data-theme="dark"] div:not([role="switch"]):not([role="switch"] *)[style*="background-color: #FFFFFF"],
          html[data-theme="dark"] div:not([role="switch"]):not([role="switch"] *)[style*="background-color: #ffffff"],
          html[data-theme="dark"] div:not([role="switch"]):not([role="switch"] *)[style*="background-color: rgb(248, 250, 252)"],
          html[data-theme="dark"] div:not([role="switch"]):not([role="switch"] *)[style*="background-color: #F8FAFC"],
          html[data-theme="dark"] div:not([role="switch"]):not([role="switch"] *)[style*="background-color: #f8fafc"],
          html[data-theme="dark"] div:not([role="switch"]):not([role="switch"] *)[style*="background-color: rgb(241, 245, 249)"],
          html[data-theme="dark"] div:not([role="switch"]):not([role="switch"] *)[style*="background-color: #F1F5F9"],
          html[data-theme="dark"] div:not([role="switch"]):not([role="switch"] *)[style*="background-color: #f1f5f9"] {
            background-color: #161F30 !important;
            border-color: #2D3A54 !important;
            color: #F8FAFC !important;
          }

          /* Fondos secundarios suaves, blurviews y paneles de resumen */
          html[data-theme="dark"] div[style*="background-color: rgba(255, 255, 255"],
          html[data-theme="dark"] div[style*="background-color: rgba(248, 250, 252"],
          html[data-theme="dark"] div[style*="background-color: rgba(0, 0, 0, 0.02)"],
          html[data-theme="dark"] div[style*="background-color: rgba(0,0,0,0.02)"],
          html[data-theme="dark"] div[style*="background-color: #FFF5F3"],
          html[data-theme="dark"] div[style*="background-color: #fff5f3"] {
            background-color: rgba(22, 31, 48, 0.95) !important;
            border-color: #2D3A54 !important;
          }

          /* Tarjetas de Accesos Rápidos y gradientes blancos */
          html[data-theme="dark"] [data-service-card],
          html[data-theme="dark"] .r-borderColor-1wr2p1e {
            background-color: #161F30 !important;
            border-color: #2D3A54 !important;
          }

          html[data-theme="dark"] [data-service-card] > div:first-child,
          html[data-theme="dark"] [data-theme-gradient="light"],
          html[data-theme="dark"] div[style*="linear-gradient"][style*="255, 255, 255"],
          html[data-theme="dark"] div[style*="linear-gradient"][style*="248, 250, 252"],
          html[data-theme="dark"] div[style*="linear-gradient"][style*="#FFFFFF"],
          html[data-theme="dark"] div[style*="linear-gradient"][style*="#ffffff"] {
            background-image: linear-gradient(180deg, #1E293B 0%, #0F172A 100%) !important;
            opacity: 0.95 !important;
          }

          /* 2. Textos principales oscuros pasan a blanco nítido (WCAG AAA) */
          html[data-theme="dark"] .r-color-18zdu8c,
          html[data-theme="dark"] .r-color-1rcpcwj,
          html[data-theme="dark"] [data-theme-color="dark"],
          html[data-theme="dark"] *[style*="color: rgb(15, 23, 42)"],
          html[data-theme="dark"] *[style*="color: #0F172A"],
          html[data-theme="dark"] *[style*="color: #0f172a"],
          html[data-theme="dark"] *[style*="color: rgb(30, 41, 59)"],
          html[data-theme="dark"] *[style*="color: #1E293B"],
          html[data-theme="dark"] *[style*="color: #1e293b"],
          html[data-theme="dark"] *[style*="color: rgb(17, 24, 39)"],
          html[data-theme="dark"] *[style*="color: #111827"] {
            color: #FFFFFF !important;
          }

          /* 3. Textos secundarios oscuros pasan a gris claro de alto contraste */
          html[data-theme="dark"] .r-color-1s7ct43,
          html[data-theme="dark"] [data-theme-color="muted"],
          html[data-theme="dark"] *[style*="color: rgb(100, 116, 139)"],
          html[data-theme="dark"] *[style*="color: #64748B"],
          html[data-theme="dark"] *[style*="color: #64748b"],
          html[data-theme="dark"] *[style*="color: rgb(71, 85, 105)"],
          html[data-theme="dark"] *[style*="color: #475569"],
          html[data-theme="dark"] *[style*="color: #475569"],
          html[data-theme="dark"] *[style*="color: rgb(51, 65, 85)"],
          html[data-theme="dark"] *[style*="color: #334155"],
          html[data-theme="dark"] *[style*="color: #334155"] {
            color: #CBD5E1 !important;
          }

          /* 4. Bordes claros y líneas separadoras */
          html[data-theme="dark"] .r-borderColor-1wr2p1e,
          html[data-theme="dark"] [data-theme-border="light"],
          html[data-theme="dark"] *[style*="border-color: rgb(226, 232, 240)"],
          html[data-theme="dark"] *[style*="border-color: #E2E8F0"],
          html[data-theme="dark"] *[style*="border-color: #e2e8f0"],
          html[data-theme="dark"] *[style*="border-color: #CBD5E1"],
          html[data-theme="dark"] *[style*="border-color: #cbd5e1"] {
            border-color: #2D3A54 !important;
          }

          html[data-theme="dark"] .r-backgroundColor-182zmgx,
          html[data-theme="dark"] div[style*="background-color: rgb(226, 232, 240)"][style*="height: 1px"],
          html[data-theme="dark"] div[style*="background-color: #E2E8F0"][style*="height: 1px"],
          html[data-theme="dark"] div[style*="background-color: #e2e8f0"][style*="height: 1px"],
          html[data-theme="dark"] div[style*="background-color: #F1F5F9"][style*="height: 1px"] {
            background-color: #2D3A54 !important;
          }

          /* 5. Inputs, selects, textareas y wrappers de selección (dropdowns) */
          html[data-theme="dark"] input:not([type="checkbox"]):not([type="radio"]),
          html[data-theme="dark"] textarea,
          html[data-theme="dark"] select,
          html[data-theme="dark"] .css-textinput-11aywtz {
            background-color: #161F30 !important;
            color: #FFFFFF !important;
            border-color: #3B4D6E !important;
          }
          html[data-theme="dark"] input::placeholder,
          html[data-theme="dark"] textarea::placeholder {
            color: #94A3B8 !important;
          }

          /* Evitar que inputs transparentes nativos de Switches y checkboxes se pinten de oscuro sólido tapando el botón */
          html[data-theme="dark"] input[type="checkbox"],
          html[data-theme="dark"] input[type="radio"],
          html[data-theme="dark"] input[role="switch"] {
            background: transparent !important;
            background-color: transparent !important;
            border-color: transparent !important;
          }

          /* Wrappers interactivos de formulario (fecha, dependencia, hora, checbox) */
          html[data-theme="dark"] div[style*="border-radius: 16px"][style*="background-color"],
          html[data-theme="dark"] div[style*="border-radius: 8px"][style*="border-width: 2px"] {
            background-color: #161F30 !important;
            border-color: #3B4D6E !important;
          }

          /* 6. Cajas de Aviso, Notas de Parqueadero y Lineamientos (Amarillo / Ámbar) */
          html[data-theme="dark"] div[style*="background-color: rgb(255, 251, 235)"],
          html[data-theme="dark"] div[style*="background-color: #FFFBEB"],
          html[data-theme="dark"] div[style*="background-color: #fffbeb"],
          html[data-theme="dark"] div[style*="background-color: rgb(255, 247, 237)"],
          html[data-theme="dark"] div[style*="background-color: #FFF7ED"],
          html[data-theme="dark"] div[style*="background-color: #fff7ed"],
          html[data-theme="dark"] div[style*="background-color: #FEF3C7"],
          html[data-theme="dark"] div[style*="background-color: #fef3c7"] {
            background-color: rgba(245, 158, 11, 0.15) !important;
            border-color: rgba(245, 158, 11, 0.45) !important;
          }
          html[data-theme="dark"] div[style*="background-color: rgb(255, 251, 235)"] *,
          html[data-theme="dark"] div[style*="background-color: #FFFBEB"] *,
          html[data-theme="dark"] div[style*="background-color: #fffbeb"] *,
          html[data-theme="dark"] div[style*="background-color: rgb(255, 247, 237)"] *,
          html[data-theme="dark"] div[style*="background-color: #FFF7ED"] *,
          html[data-theme="dark"] div[style*="background-color: #fff7ed"] *,
          html[data-theme="dark"] div[style*="background-color: #FEF3C7"] * {
            color: #FDE68A !important;
          }

          /* 7. Cajas Informativas Azules y Advertencias de Parqueadero */
          html[data-theme="dark"] div[style*="background-color: rgb(239, 246, 255)"],
          html[data-theme="dark"] div[style*="background-color: #EFF6FF"],
          html[data-theme="dark"] div[style*="background-color: #eff6ff"],
          html[data-theme="dark"] div[style*="background-color: #DBEAFE"],
          html[data-theme="dark"] div[style*="background-color: #dbeafe"] {
            background-color: rgba(37, 99, 235, 0.15) !important;
            border-color: rgba(59, 130, 246, 0.45) !important;
          }
          html[data-theme="dark"] div[style*="background-color: rgb(239, 246, 255)"] *,
          html[data-theme="dark"] div[style*="background-color: #EFF6FF"] *,
          html[data-theme="dark"] div[style*="background-color: #eff6ff"] *,
          html[data-theme="dark"] div[style*="background-color: #DBEAFE"] *,
          html[data-theme="dark"] div[style*="background-color: #dbeafe"] * {
            color: #93C5FD !important;
          }

          /* 8. Cajas de Error y Bloqueos */
          html[data-theme="dark"] div[style*="background-color: rgb(254, 242, 242)"],
          html[data-theme="dark"] div[style*="background-color: #FEF2F2"],
          html[data-theme="dark"] div[style*="background-color: #fef2f2"],
          html[data-theme="dark"] div[style*="background-color: #FEE2E2"],
          html[data-theme="dark"] div[style*="background-color: #fee2e2"] {
            background-color: rgba(239, 68, 68, 0.18) !important;
            border-color: rgba(239, 68, 68, 0.45) !important;
          }
          html[data-theme="dark"] div[style*="background-color: rgb(254, 242, 242)"] *,
          html[data-theme="dark"] div[style*="background-color: #FEF2F2"] *,
          html[data-theme="dark"] div[style*="background-color: #fef2f2"] *,
          html[data-theme="dark"] div[style*="background-color: #FEE2E2"] *,
          html[data-theme="dark"] div[style*="background-color: #fee2e2"] * {
            color: #FECACA !important;
          }

          /* 9. Aulas Barulé y Auditorio Huitaca (Manual de Salas) */
          html[data-theme="dark"] div[style*="background-color: rgb(240, 249, 255)"],
          html[data-theme="dark"] div[style*="background-color: #F0F9FF"],
          html[data-theme="dark"] div[style*="background-color: #f0f9ff"] {
            background-color: rgba(2, 132, 199, 0.15) !important;
            border-color: rgba(56, 189, 248, 0.4) !important;
          }
          html[data-theme="dark"] div[style*="background-color: #F0F9FF"] *,
          html[data-theme="dark"] div[style*="background-color: #f0f9ff"] *,
          html[data-theme="dark"] *[style*="color: #0C4A6E"],
          html[data-theme="dark"] *[style*="color: rgb(12, 74, 110)"] {
            color: #E0F2FE !important;
          }
          html[data-theme="dark"] *[style*="color: #0369A1"],
          html[data-theme="dark"] *[style*="color: rgb(3, 105, 161)"] {
            color: #38BDF8 !important;
          }

          /* 10. Botones de Prioridad en Mantenimiento (Baja, Media, Alta) */
          html[data-theme="dark"] div[style*="background-color: #EBFDF5"],
          html[data-theme="dark"] div[style*="background-color: #ebfdf5"] {
            background-color: rgba(16, 185, 129, 0.2) !important;
            border-color: #10B981 !important;
          }
          html[data-theme="dark"] div[style*="background-color: #EBFDF5"] * {
            color: #34D399 !important;
          }

          /* 11. Cuadrícula de Salas: Celdas ocupadas, celdas pasadas, celdas seleccionadas y chips */
          html[data-theme="dark"] div[style*="background-color: rgb(255, 241, 242)"],
          html[data-theme="dark"] div[style*="background-color: #FFF1F2"],
          html[data-theme="dark"] div[style*="background-color: #fff1f2"] {
            background-color: rgba(239, 68, 68, 0.18) !important;
          }
          html[data-theme="dark"] div[style*="background-color: #FDA4AF"],
          html[data-theme="dark"] div[style*="background-color: rgb(253, 164, 175)"] {
            background-color: rgba(244, 63, 94, 0.35) !important;
          }
          html[data-theme="dark"] div[style*="background-color: #FDA4AF"] *,
          html[data-theme="dark"] *[style*="color: #9F1239"],
          html[data-theme="dark"] *[style*="color: rgb(159, 18, 57)"] {
            color: #FECDD3 !important;
          }
          /* Celdas inactivas pasadas del calendario */
          html[data-theme="dark"] div[style*="background-color: rgb(226, 232, 240)"],
          html[data-theme="dark"] div[style*="background-color: #E2E8F0"] {
            background-color: rgba(30, 41, 59, 0.6) !important;
          }
          /* Chips de servicios adicionales */
          html[data-theme="dark"] div[style*="background-color: #F3E8FF"],
          html[data-theme="dark"] div[style*="background-color: #f3e8ff"] {
            background-color: rgba(139, 92, 246, 0.2) !important;
            border-color: #8B5CF6 !important;
          }
          html[data-theme="dark"] div[style*="background-color: #F3E8FF"] *,
          html[data-theme="dark"] *[style*="color: #7209B7"],
          html[data-theme="dark"] *[style*="color: rgb(114, 9, 183)"] {
            color: #DDD6FE !important;
          }

          /* 12. Botones de acción, contadores (+/-), botones de volver y badges */
          html[data-theme="dark"] div[style*="background-color: #FFFFFF"][style*="border-radius: 12px"],
          html[data-theme="dark"] div[style*="background-color: #ffffff"][style*="border-radius: 12px"],
          html[data-theme="dark"] div[style*="background-color: #FFFFFF"][style*="border-radius: 10px"],
          html[data-theme="dark"] div[style*="background-color: #ffffff"][style*="border-radius: 10px"],
          html[data-theme="dark"] div[style*="border-radius: 18px"][style*="background-color"] {
            background-color: #1E293B !important;
            border-color: #3B4D6E !important;
          }
          html[data-theme="dark"] div[style*="border-radius: 18px"][style*="background-color"] * {
            color: #FFFFFF !important;
          }

          /* Iconos y textos de botones de acción en tarjetas de vehículos */
          html[data-theme="dark"] *[style*="color: #334155"],
          html[data-theme="dark"] *[style*="color: rgb(51, 65, 85)"] {
            color: #E2E8F0 !important;
          }
          html[data-theme="dark"] *[style*="color: #1D4ED8"],
          html[data-theme="dark"] *[style*="color: rgb(29, 78, 216)"] {
            color: #93C5FD !important;
          }
          html[data-theme="dark"] *[style*="color: #A9301E"],
          html[data-theme="dark"] *[style*="color: #a9301e"] {
            color: #F87171 !important;
          }

          /* 13. Exclusión Sagrada: Placa Oficial Colombiana Amarilla */
          html[data-theme="dark"] div[style*="background-color: #FDE047"],
          html[data-theme="dark"] div[style*="background-color: rgb(253, 224, 71)"],
          html[data-theme="dark"] [data-colombia-plate] {
            background-color: #FDE047 !important;
            border-color: #000000 !important;
          }
          html[data-theme="dark"] div[style*="background-color: #FDE047"] *,
          html[data-theme="dark"] div[style*="background-color: rgb(253, 224, 71)"] *,
          html[data-theme="dark"] [data-colombia-plate] * {
            color: #000000 !important;
          }

          /* 14. Tablas y listas */
          html[data-theme="dark"] table,
          html[data-theme="dark"] tr,
          html[data-theme="dark"] td,
          html[data-theme="dark"] th {
            background-color: #161F30 !important;
            color: #FFFFFF !important;
            border-color: #2D3A54 !important;
          }

          /* 15. Modales, diálogos y hojas emergentes */
          html[data-theme="dark"] [role="dialog"],
          html[data-theme="dark"] div[style*="background-color: white"],
          html[data-theme="dark"] div[style*="background-color: #fff"] {
            background-color: #161F30 !important;
            color: #FFFFFF !important;
            border-color: #2D3A54 !important;
          }

          /* 16. Enlaces y acentos */
          html[data-theme="dark"] a {
            color: #60A5FA !important;
          }

          /* 17. Preservar imágenes, videos, logos e iconos */
          html[data-theme="dark"] img,
          html[data-theme="dark"] video,
          html[data-theme="dark"] canvas,
          html[data-theme="dark"] svg {
            filter: none !important;
          }

          /* 18. BOTONES SWITCH (MÁXIMA VISIBILIDAD EN MODO OSCURO) */
          /* Contenedor del interruptor */
          html[data-theme="dark"] [role="switch"],
          html[data-theme="dark"] div[role="switch"],
          html[data-theme="dark"] .r-cursor-1loqt21[role="switch"] {
            opacity: 1 !important;
            visibility: visible !important;
            filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.5)) !important;
          }

          /* Pista / Track cuando el Switch está APAGADO (false / inactivo) */
          html[data-theme="dark"] [role="switch"]:not([aria-checked="true"]) > div:first-child,
          html[data-theme="dark"] [role="switch"][aria-checked="false"] > div:first-child,
          html[data-theme="dark"] div[role="switch"]:not([aria-checked="true"]) > div:first-child,
          html[data-theme="dark"] div[role="switch"][aria-checked="false"] > div:first-child {
            background-color: #334155 !important;
            border: 2px solid #64748B !important;
            opacity: 1 !important;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6) !important;
          }

          /* Pista / Track cuando el Switch está ENCENDIDO (true / activo) */
          html[data-theme="dark"] [role="switch"][aria-checked="true"] > div:first-child,
          html[data-theme="dark"] div[role="switch"][aria-checked="true"] > div:first-child {
            background-color: #2563EB !important;
            border: 2px solid #93C5FD !important;
            opacity: 1 !important;
            box-shadow: 0 0 12px rgba(37, 99, 235, 0.6) !important;
          }

          /* Bolita / Thumb del switch (SIEMPRE 100% BLANCO PURO Y DESTACADO) */
          html[data-theme="dark"] [role="switch"] > div:nth-child(2),
          html[data-theme="dark"] [role="switch"] div[style*="border-radius: 9999px"]:not(:first-child),
          html[data-theme="dark"] [role="switch"] div[style*="transform"],
          html[data-theme="dark"] [role="switch"] div[style*="translate"],
          html[data-theme="dark"] div[role="switch"] > div:nth-child(2),
          html[data-theme="dark"] div[role="switch"] div[style*="transform"],
          html[data-theme="dark"] div[role="switch"] div[style*="translate"] {
            background-color: #FFFFFF !important;
            border: 1px solid rgba(255, 255, 255, 0.9) !important;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.8), 0 0 4px rgba(255, 255, 255, 0.8) !important;
            opacity: 1 !important;
            z-index: 5 !important;
          }

          /* Checkbox tipo switch o inputs nativos de switch */
          html[data-theme="dark"] input[type="checkbox"][role="switch"] {
            accent-color: #2563EB !important;
            opacity: 1 !important;
          }
        `;
      } else if (colorMode === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.style.colorScheme = 'light';
        document.documentElement.style.filter = 'none';
        document.body.style.backgroundColor = '#FFFFFF';
        document.body.style.color = '#0F172A';

        themeStyleEl.textContent = `
          /* === TEMA CLARO GLOBAL PARA TODA LA PÁGINA === */
          html[data-theme="light"],
          html[data-theme="light"] body,
          html[data-theme="light"] #root {
            background-color: #FFFFFF !important;
            color: #0F172A !important;
          }
          /* Fondos oscuros del hero se adaptan a paleta clara */
          html[data-theme="light"] div[style*="background-color: rgb(33, 7, 6)"],
          html[data-theme="light"] div[style*="background-color: #210706"] {
            background-color: #FFF5F4 !important;
          }
          html[data-theme="light"] input,
          html[data-theme="light"] textarea,
          html[data-theme="light"] select {
            background-color: #FFFFFF !important;
            color: #0F172A !important;
            border-color: #CBD5E1 !important;
          }
        `;
      } else if (colorMode === 'grayscale') {
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.colorScheme = '';
        document.documentElement.style.filter = 'grayscale(100%)';
        document.body.style.backgroundColor = '#F8FAFC';
        document.body.style.color = '#0F172A';
        themeStyleEl.textContent = '';
      } else {
        // Normal / Original
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.colorScheme = '';
        document.documentElement.style.filter = 'none';
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
        themeStyleEl.textContent = '';
      }

      // 3. Fuente para Dislexia
      if (dyslexiaMode) {
        document.body.style.fontFamily = 'Comic Sans MS, Arial, sans-serif';
        document.body.style.letterSpacing = '1.8px';
        document.body.style.lineHeight = '1.8';
      } else {
        document.body.style.fontFamily = '';
        document.body.style.letterSpacing = '';
        document.body.style.lineHeight = '';
      }

      // 4. Subrayar enlaces
      const links = document.querySelectorAll('a, button, [role="button"]');
      links.forEach((el: any) => {
        el.style.textDecoration = underlineLinks ? 'underline' : '';
      });
    }
  }, [fontSizeMultiplier, colorMode, underlineLinks, dyslexiaMode]);

  // Cargar preferencias guardadas al iniciar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedZoom = localStorage.getItem('sasge_zoom_scale');
        if (savedZoom) {
          const val = parseFloat(savedZoom);
          if (!isNaN(val) && val >= 1.0 && val <= 3.0) {
            setFontSizeMultiplier(val);
          }
        }
        const savedTheme = localStorage.getItem('sasge_color_mode');
        if (savedTheme && ['light', 'dark', 'grayscale', 'normal'].includes(savedTheme)) {
          setColorMode(savedTheme as any);
        }
      } catch (e) {}
    }
  }, []);

  // Escuchador dinámico y observador de mutaciones para Modo Oscuro en tiempo real (estilo teléfono celular)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (colorMode !== 'dark') {
      // Limpiar marcas dinámicas al volver a Modo Claro u Original
      document.querySelectorAll('[data-theme-bg], [data-theme-color], [data-theme-border], [data-theme-gradient]').forEach(el => {
        el.removeAttribute('data-theme-bg');
        el.removeAttribute('data-theme-color');
        el.removeAttribute('data-theme-border');
        el.removeAttribute('data-theme-gradient');
      });
      return;
    }

    const applyLiveDarkTheme = () => {
      document.querySelectorAll('*').forEach(el => {
        if (el.closest && (el.closest('[data-acc-panel]') || el.closest('[data-lsc-popover]'))) return;
        const tag = el.tagName?.toLowerCase();
        if (tag === 'img' || tag === 'video' || tag === 'canvas' || tag === 'svg' || tag === 'path') return;

        // Proteger placa colombiana amarilla (#FDE047) y sus textos internos
        const styleAttr = el.getAttribute('style') || '';
        if (styleAttr.includes('#FDE047') || styleAttr.includes('253, 224, 71') || (el.closest && el.closest('[data-colombia-plate]'))) {
          return;
        }

        const st = window.getComputedStyle(el);

        // Fondos claros se marcan para aplicar superficie oscura
        const bg = st.backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
          const m = bg.match(/\d+/g);
          if (m && m.length >= 3) {
            const r = +m[0], g = +m[1], b = +m[2];
            const saturation = Math.max(r, g, b) - Math.min(r, g, b);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            // Solo fondos neutrales claros (blancos y grises) se marcan con data-theme-bg
            if (brightness > 165 && saturation <= 40) {
              el.setAttribute('data-theme-bg', 'light');
            }
          }
        }

        // Gradientes claros (como LinearGradient en tarjetas de servicios)
        const bi = st.backgroundImage;
        if (bi && bi !== 'none' && (bi.includes('255, 255, 255') || bi.includes('248, 250, 252') || bi.includes('white'))) {
          el.setAttribute('data-theme-gradient', 'light');
        }

        // Textos oscuros se marcan para aplicar blanco o gris claro
        const col = st.color;
        if (col && col !== 'transparent' && col !== 'rgba(0, 0, 0, 0)') {
          const m = col.match(/\d+/g);
          if (m && m.length >= 3) {
            const r = +m[0], g = +m[1], b = +m[2];
            const saturation = Math.max(r, g, b) - Math.min(r, g, b);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;

            // Solo textos neutrales oscuros (slate, negro, gris)
            if (saturation <= 45) {
              if (brightness < 115) {
                el.setAttribute('data-theme-color', 'dark');
              } else if (brightness >= 115 && brightness < 160) {
                el.setAttribute('data-theme-color', 'muted');
              }
            }
          }
        }

        // Bordes claros
        const bcol = st.borderColor;
        if (bcol && bcol !== 'transparent' && bcol !== 'rgba(0, 0, 0, 0)') {
          const m = bcol.match(/\d+/g);
          if (m && m.length >= 3) {
            const brightness = (+m[0] * 299 + +m[1] * 587 + +m[2] * 114) / 1000;
            if (brightness > 175) {
              el.setAttribute('data-theme-border', 'light');
            }
          }
        }
      });
    };

    applyLiveDarkTheme();

    // Observar inserción de nuevos elementos (modales, navegación entre páginas, acordeones)
    const observer = new MutationObserver(() => {
      applyLiveDarkTheme();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => {
      observer.disconnect();
    };
  }, [colorMode, pathname]);

  // Activar Perfil Sordera / LSC
  const toggleDeafProfile = () => {
    if (activeProfile === 'deaf' || lscActive) {
      setActiveProfile('none');
      setLscActive(false);
      setLscPopover({ visible: false, term: null, top: 0, left: 0 });
      showToast('Perfil Discapacidad Auditiva: DESACTIVADO');
    } else {
      setActiveProfile('deaf');
      setLscActive(true);
      setOpenPanel(false); // Cierra la ventana del panel para dejar la pantalla limpia
      showToast('Perfil Discapacidad Auditiva (LSC): ACTIVADO');
    }
  };

  // Escuchador global de alta sensibilidad para Detección de Hover, Focus, Click y Touch de Lengua de Señas Colombiana (LSC)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!lscActive) {
      setLscPopover(prev => ({ ...prev, visible: false }));
      return;
    }

    // Función inteligente de detección de palabras y términos LSC en el DOM
    const findMatch = (el: HTMLElement | null): LSCTerm | null => {
      // 1. Verificación prioritaria de texto seleccionado por el usuario en pantalla
      if (typeof window !== 'undefined' && window.getSelection) {
        const selObj = window.getSelection();
        const selText = selObj ? selObj.toString().trim() : '';
        if (selText && selText.length > 0) {
          const cleanSel = selText
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

          // Buscar si lo seleccionado contiene explícitamente algún término del diccionario
          for (const term of PREPARED_LSC_TERMS) {
            for (const kw of term.normKeywords) {
              const regex = new RegExp(`(^|\\W)${escapeRegex(kw)}($|\\W)`);
              if (cleanSel === kw || regex.test(cleanSel)) {
                return term;
              }
            }
          }

          // REGLA DEL USUARIO: Si hay texto seleccionado pero ninguna palabra del glosario coincide, ¡NO ABRIR!
          return null;
        }
      }

      let curr = el;
      let depth = 0;
      while (curr && depth < 6) {
        if (curr.hasAttribute && curr.hasAttribute('data-lsc-popover')) return null;
        if (curr.hasAttribute && curr.hasAttribute('data-acc-panel')) return null;

        const lscId = curr.getAttribute ? curr.getAttribute('data-lsc-id') : null;
        if (lscId) {
          const found = LSC_DICTIONARY.find(t => t.id === lscId);
          if (found) return found;
        }

        // Recolectar textos de múltiples fuentes posibles (aria-label, placeholder, title, alt, innerText, textContent, value)
        const candidates: string[] = [];
        if (curr.getAttribute) {
          const ariaLabel = curr.getAttribute('aria-label');
          if (ariaLabel) candidates.push(ariaLabel);
          const title = curr.getAttribute('title');
          if (title) candidates.push(title);
          const placeholder = curr.getAttribute('placeholder');
          if (placeholder) candidates.push(placeholder);
          const alt = curr.getAttribute('alt');
          if (alt) candidates.push(alt);
        }
        if ((curr as any).value && typeof (curr as any).value === 'string') {
          candidates.push((curr as any).value);
        }
        if (curr.innerText) candidates.push(curr.innerText);
        if (curr.textContent) candidates.push(curr.textContent);

        for (const raw of candidates) {
          if (!raw) continue;
          // Normalización estricta: elimina tildes, mayúsculas y espacios duplicados
          const clean = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
          if (!clean || clean.length === 0) continue;
          // Ignorar bloques extensos de texto general (párrafos de más de 75 caracteres) para evitar falsos positivos
          if (clean.length > 75 && !curr.getAttribute('data-lsc-id')) continue;

          // Buscar coincidencia en diccionario con límites de palabra precisos
          for (const term of PREPARED_LSC_TERMS) {
            for (const kw of term.normKeywords) {
              const regex = new RegExp(`(^|\\W)${escapeRegex(kw)}($|\\W)`);
              if (clean === kw || regex.test(clean)) {
                return term;
              }
            }
          }
        }

        curr = curr.parentElement;
        depth++;
      }
      return null;
    };

    const showForElement = (el: HTMLElement) => {
      const match = findMatch(el);
      if (!match) return;

      if (hideLscTimerRef.current) {
        clearTimeout(hideLscTimerRef.current);
        hideLscTimerRef.current = null;
      }

      const rect = el.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = 390;

      let top = rect.bottom + 8;
      let left = Math.max(12, Math.min(rect.left, window.innerWidth - popoverWidth - 16));

      // Si no cabe abajo, ubicarlo encima del elemento
      if (top + popoverHeight > window.innerHeight) {
        top = Math.max(12, rect.top - popoverHeight - 8);
      }
      if (top < 10) {
        top = 10;
      }

      setLscPopover({
        visible: true,
        term: match,
        top,
        left,
      });

      // Permanencia generosa de 45 segundos para que la persona sorda pueda observar con calma
      hideLscTimerRef.current = setTimeout(() => {
        setLscPopover(p => ({ ...p, visible: false }));
      }, 45000);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.closest && target.closest('[data-lsc-popover]')) {
        if (hideLscTimerRef.current) {
          clearTimeout(hideLscTimerRef.current);
          hideLscTimerRef.current = null;
        }
        return;
      }
      showForElement(target);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      // No cerrar de inmediato al mover el ratón; el usuario aparta el cursor para ver el video sin obstáculos.
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target) {
        if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && !target.closest('#accessibility-toolbar-modal')) {
          lastActiveInputRef.current = target as (HTMLInputElement | HTMLTextAreaElement);
        }
        showForElement(target);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.closest && target.closest('[data-lsc-popover]')) return;
      showForElement(target);
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.closest && target.closest('[data-lsc-popover]')) return;
      showForElement(target);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hideLscTimerRef.current) clearTimeout(hideLscTimerRef.current);
        setLscPopover(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('touchstart', handleTouchStart as any, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      if (hideLscTimerRef.current) clearTimeout(hideLscTimerRef.current);
    };
  }, [lscActive]);

  // Obtener descripción hablada y guiada según la pantalla actual
  const getPageDescription = (currentPath: string): string => {
    const path = currentPath || '/';

    if (path === '/' || path === '' || path === '/index') {
      return (
        'Bienvenido al Sistema de Administración de Servicios Generales 2.0 de la Secretaría Jurídica Distrital. ' +
        'Gestiona tus solicitudes con claridad total. Transporte, infraestructura, salas, parqueadero y requerimientos internos desde un solo lugar. ' +
        'Opciones principales de navegación: Ingresar al sistema, Ver servicios, Cómo funciona, y Soporte. ' +
        'Catálogo de servicios disponibles: ' +
        'Número uno: Ingreso Visitantes. Gestione el ingreso de personal externo con seguridad y control de acceso. ' +
        'Número dos: Transporte Institucional. Solicite traslados para misiones oficiales y recorridos de la entidad. ' +
        'Número tres: Mantenimiento. Reporte fallas locativas en infraestructura y servicios generales. ' +
        'Número cuatro: Reserva de Salas. Reserve salas de juntas, auditorios y espacios institucionales. ' +
        'Número cinco: Parqueadero. Solicite cupos de parqueadero institucional. ' +
        'Beneficios institucionales: Gestión simple, visible y medible. Trazabilidad cien por ciento. Cinco servicios en línea. Seguimiento veinticuatro siete. ' +
        'Preguntas frecuentes: Puede consultar sobre radicación de trámites, uso de vehículos y reserva de auditorios. ' +
        'Para ingresar al sistema puede decir en voz alta: Ingresar al sistema, o presionar la tecla V para control por voz.'
      );
    }

    if (path.includes('/login')) {
      return (
        'Pantalla de Ingreso Institucional. ' +
        'Acceda con su usuario o correo institucional y su contraseña. ' +
        'Campos del formulario: ' +
        'Campo uno: Usuario o correo institucional. ' +
        'Campo dos: Contraseña. ' +
        'Opción: Recordarme. ' +
        'Enlace: Política de tratamiento de datos personales. ' +
        'Botón principal: Ingresar al sistema. ' +
        'Si utiliza el asistente de voz, diga: Usuario admin, luego Contraseña admin123, y finalmente Ingresar.'
      );
    }

    if (path.includes('/dashboard/requests')) {
      return (
        'Bandeja de Solicitudes Administrativas de la Secretaría Jurídica Distrital. ' +
        'Aquí puede consultar y gestionar el estado de todos sus trámites radicados. ' +
        'Comandos de voz adaptados: ' +
        'Diga: Resumen o Estado, para escuchar cuántas solicitudes pendientes, en curso o resueltas tiene. ' +
        'Diga: Filtrar pendientes, Filtrar aprobadas, o Filtrar por servicio como Transporte o Visitantes. ' +
        'Diga: Buscar, seguido de una palabra clave. ' +
        'Diga: Leer solicitudes, para escuchar los trámites de la lista. ' +
        'Diga: Ver primera solicitud, para abrir su detalle. ' +
        'Diga: Nueva solicitud, para radicar un nuevo trámite. ' +
        'O diga: Inicio, para volver al panel principal.'
      );
    }

    if (path.includes('/dashboard')) {
      return (
        'Portal del Funcionario del Sistema de Administración de Servicios Generales 2.0 de la Secretaría Jurídica Distrital. ' +
        'Bienvenido, Administrador Temporal. Rol Administrador. ' +
        'Centralización de trámites y solicitudes administrativas. ' +
        'Módulos y servicios disponibles para radicar: ' +
        'Número uno: Ingreso Visitantes. Registro y control de personas externas. ' +
        'Número dos: Transporte Institucional. Vehículos oficiales para diligencias y comisiones. ' +
        'Número tres: Mantenimiento Locativo. Reportes de infraestructura y reparaciones. ' +
        'Número cuatro: Reserva de Salas. Agenda de salas de reuniones y auditorios. ' +
        'Número cinco: Parqueadero Institucional. Cupos de estacionamiento para funcionarios. ' +
        'También puede decir: Ver solicitudes, para consultar sus trámites radicados. ' +
        'Diga en voz alta el nombre del servicio al que desea ingresar.'
      );
    }

    if (path.includes('/requests/visitors')) {
      return (
        'Formulario de Solicitud de Ingreso de Visitantes de la Secretaría Jurídica Distrital. ' +
        'Permite registrar la entrada de personas externas a las instalaciones. ' +
        'Comandos adaptados por voz: ' +
        'Diga: Nombre, seguido del nombre del visitante. ' +
        'Diga: Documento o Cédula, seguido del número. ' +
        'Diga: Con vehículo o Sin vehículo. Si ingresa vehículo, diga: Placa, y Marca. ' +
        'Diga: Funcionario, seguido del nombre de quien autoriza. ' +
        'Diga: Motivo, seguido de la justificación. ' +
        'Diga: Acepto términos, para autorizar el tratamiento de datos. ' +
        'Diga: Registrar ingreso o Radicar, para guardar la solicitud. ' +
        'Diga: Leer formulario, para revisar los campos, o Volver, para salir.'
      );
    }

    if (path.includes('/requests/transport')) {
      return (
        'Formulario de Solicitud de Transporte Institucional. ' +
        'Permite solicitar un vehículo oficial para comisiones laborales. ' +
        'Comandos adaptados por voz: ' +
        'Diga: Nombre, seguido del pasajero. ' +
        'Diga: Teléfono, seguido del número de contacto. ' +
        'Diga: Origen o Salida, seguido de la dirección de partida. ' +
        'Diga: Destino, seguido de la dirección de llegada. ' +
        'Diga: Pasajeros, seguido de la cantidad. ' +
        'Diga: Motivo, seguido de la justificación. ' +
        'Diga: Enviar solicitud o Radicar, para guardar el trámite. ' +
        'Diga: Leer formulario, para verificar los datos, o Volver, para salir.'
      );
    }

    if (path.includes('/requests/maintenance')) {
      return (
        'Formulario de Solicitud de Mantenimiento Locativo e Infraestructura. ' +
        'Permite reportar daños y averías en la sede. ' +
        'Comandos adaptados por voz: ' +
        'Diga: Título o Daño, seguido de un resumen de la falla. ' +
        'Diga: Ubicación o Piso, indicando el piso o zona. ' +
        'Diga: Oficina o Espacio, indicando el número o nombre del espacio. ' +
        'Diga: Descripción, detallando el problema. ' +
        'Diga: Prioridad alta, media o baja. ' +
        'Diga: Enviar reporte o Radicar, para guardar la solicitud. ' +
        'Diga: Leer formulario, para verificar los campos, o Volver, para salir.'
      );
    }

    if (path.includes('/requests/rooms')) {
      return (
        'Formulario de Reserva de Salas y Auditorios. ' +
        'Permite agendar salas de juntas o auditorios como Barulé o Huitaca. ' +
        'Comandos adaptados por voz: ' +
        'Diga: Asunto o Título, seguido del tema de la reunión. ' +
        'Diga: Asistentes, seguido de la cantidad de personas. ' +
        'Diga: Presencial o Virtual. ' +
        'Diga: Confirmar reserva o Radicar, para agendar el espacio. ' +
        'Diga: Leer formulario, para verificar los campos, o Volver, para salir.'
      );
    }

    if (path.includes('/requests/parking')) {
      return (
        'Formulario de Cupo de Parqueadero Institucional. ' +
        'Permite solicitar estacionamiento y registrar vehículos para funcionarios. ' +
        'Comandos adaptados por voz: ' +
        'Diga: Nombre, seguido de su nombre. ' +
        'Diga: Documento o Cédula, seguido del número. ' +
        'Diga: Placa, seguido de la placa vehicular. ' +
        'Diga: Marca, seguido de la marca. ' +
        'Diga: Color, seguido del color. ' +
        'Diga: Carro o Moto, según el tipo. ' +
        'Diga: Radicar solicitud, para enviar. ' +
        'Diga: Leer formulario, para verificar los datos, o Volver, para salir.'
      );
    }

    return (
      'Sistema de Administración de Servicios Generales 2.0. ' +
      'Usted se encuentra en la pantalla: ' + path + '. ' +
      'Diga en voz alta: Inicio, Ingresar, Visitantes, Transporte, Mantenimiento, Salas o Parqueadero.'
    );
  };

  // Síntesis de voz Web con control de velocidad
  const speakText = (text: string, onEnd?: () => void) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-CO';
      utterance.rate = speechRate;
      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (voiceActiveRef.current) {
          setVoiceStatusText('🎙️ Te escucho...');
        }
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };
      window.speechSynthesis.speak(utterance);
    } else {
      showToast('Lectura por voz no soportada en este navegador');
    }
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  };

  const readCurrentPage = () => {
    const textToRead = getPageDescription(pathname);
    speakText(textToRead);
  };

  // Detener el Asistente de Voz y limpiar reconocimiento
  const stopVoiceAssistant = () => {
    voiceActiveRef.current = false;
    if (restartVoiceTimeoutRef.current) {
      clearTimeout(restartVoiceTimeoutRef.current);
      restartVoiceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setVoiceStatusText('');
  };

  // Alternar Asistente de Voz y Lector de Pantalla para personas ciegas
  const toggleVoiceAssistant = () => {
    if (interactiveReaderEnabled || activeProfile === 'blind') {
      setInteractiveReaderEnabled(false);
      setActiveProfile('none');
      setColorMode('normal');
      setFontSizeMultiplier(1);
      setUnderlineLinks(false);
      stopSpeech();
      stopVoiceAssistant();
      showToast('Lector de voz y Asistente: DESACTIVADO');
      speakText('Lector de voz y asistente desactivados.');
    } else {
      setInteractiveReaderEnabled(true);
      setActiveProfile('blind');
      setColorMode('dark');
      setFontSizeMultiplier(1.25);
      setUnderlineLinks(true);
      setOpenPanel(false);
      showToast('Lector de voz y Asistente: ACTIVADO');
      const intro = 'Lector de pantalla por voz y asistente activados. Tema oscuro habilitado. El micrófono permanecerá escuchando continuamente en modo manos libres. Diga cualquier comando o pulse la tecla M para pausar.';
      speakText(intro, () => {
        startVoiceAssistant();
      });
    }
  };

  // Activar Perfil Ceguera desde el panel
  const toggleBlindProfile = () => {
    toggleVoiceAssistant();
  };

  // Activar Perfil Daltonismo
  const toggleColorblindProfile = () => {
    if (activeProfile === 'colorblind') {
      setActiveProfile('none');
      setColorMode('normal');
      showToast('Perfil Daltonismo: DESACTIVADO');
    } else {
      setActiveProfile('colorblind');
      setColorMode('grayscale');
      showToast('Perfil Daltonismo: ACTIVADO (Escala de Grises)');
    }
  };

  // Activar Perfil Dislexia
  const toggleDyslexiaProfile = () => {
    if (activeProfile === 'dyslexia') {
      setActiveProfile('none');
      setDyslexiaMode(false);
      showToast('Perfil Dislexia: DESACTIVADO');
    } else {
      setActiveProfile('dyslexia');
      setDyslexiaMode(true);
      showToast('Perfil Dislexia: ACTIVADO (Tipografía de Lectura Fácil)');
    }
  };

  // Helper para asignar valores en inputs de React Native Web de manera confiable
  const setNativeDomInputValue = (inputEl: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    lastActiveInputRef.current = inputEl;
    const isTextArea = inputEl.tagName === 'TEXTAREA';
    const prototype = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(inputEl, value);
    } else {
      inputEl.value = value;
    }
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    inputEl.focus();
  };

  // Helper para buscar y llenar un input por palabras clave en placeholder, aria-label o etiqueta
  const fillInputByKeywords = (keywords: string[], value: string): boolean => {
    if (typeof document === 'undefined') return false;
    const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea')) as (HTMLInputElement | HTMLTextAreaElement)[];
    const cleanKws = keywords.map(k => k.toLowerCase().trim());

    // 1. Coincidencia por placeholder, aria-label o name
    for (const input of allInputs) {
      const ph = (input.placeholder || '').toLowerCase();
      const aria = (input.getAttribute('aria-label') || '').toLowerCase();
      const name = (input.name || '').toLowerCase();

      for (const kw of cleanKws) {
        if (ph.includes(kw) || aria.includes(kw) || name.includes(kw)) {
          setNativeDomInputValue(input, value);
          return true;
        }
      }
    }

    // 2. Coincidencia por texto contenedor o etiqueta (Label padre / hermano)
    for (const input of allInputs) {
      const parent = input.closest('div, label, section') as HTMLElement;
      const text = (parent?.innerText || parent?.parentElement?.innerText || '').toLowerCase();
      for (const kw of cleanKws) {
        if (text.includes(kw)) {
          setNativeDomInputValue(input, value);
          return true;
        }
      }
    }

    return false;
  };

  // Helper para hacer clic en botones por texto o aria-label
  const clickButtonByKeywords = (keywords: string[]): boolean => {
    if (typeof document === 'undefined') return false;
    const cleanKws = keywords.map(k => k.toLowerCase().trim());
    const elements = Array.from(document.querySelectorAll('button, [role="button"], a, div')) as HTMLElement[];

    for (const el of elements) {
      const text = (el.innerText || el.getAttribute('aria-label') || '').toLowerCase().trim();
      if (!text || text.length > 70) continue;
      for (const kw of cleanKws) {
        if (text === kw || (text.includes(kw) && text.length < 50)) {
          el.click();
          return true;
        }
      }
    }
    return false;
  };

  // Helper para limpiar el valor dictado eliminando verbos de acción y muletillas comunes
  const cleanDictatedValue = (raw: string): string => {
    if (!raw) return '';
    let cleaned = raw.trim();
    // Quitar verbos y palabras de relleno iniciales
    cleaned = cleaned.replace(
      /^(coloque|colocar|pon|poner|escriba|escribe|escribir|digite|digitar|ingrese|ingresar|asigne|asignar|que\s+sea|sea|es|como)\s+/i,
      ''
    );
    // Quitar artículos iniciales si quedan sueltos
    cleaned = cleaned.replace(/^(un|una)\s+/i, '');
    // Quitar puntuación final producida por el reconocedor de voz
    cleaned = cleaned.replace(/[.,;:]+$/, '').trim();
    return cleaned;
  };

  // Helper avanzado para extraer el valor dictado en frases naturales en español
  // Soporta:
  // "en nombre coloque Juan Carlos"
  // "en el formulario en nombre coloque Juan Carlos"
  // "coloque en nombre Juan Carlos"
  // "coloque Juan Carlos en nombre"
  // "nombre Juan Carlos"
  const extractFieldValue = (fullText: string, fieldKeywords: string[]): string => {
    let text = fullText.trim();
    // Quitar prefijos comunes de contexto como "en el formulario (de ...)", "en el campo", etc.
    text = text.replace(/^en\s+el\s+formulario(?:\s+de\s+[a-záéíóúñ]+)?\s*/i, '');

    for (const kw of fieldKeywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Patrón 1 (Directo): "en [campo] (coloque|pon|...) [VALOR]" o "[campo] [VALOR]"
      const patternForward = new RegExp(
        `(?:^|\\b)(?:en\\s+(?:el\\s+campo\\s+|el\\s+|la\\s+)?)?${escaped}(?:\\s+(?:coloque|colocar|pon|poner|escriba|escribe|escribir|digite|digitar|ingrese|ingresar|asigne|asignar|es|son|de|para|con|sea))?\\s+(.+)`,
        'i'
      );
      const matchForward = text.match(patternForward);
      if (matchForward && matchForward[1]) {
        const val = cleanDictatedValue(matchForward[1]);
        if (val && !fieldKeywords.some(k => k.toLowerCase() === val.toLowerCase())) {
          return val;
        }
      }

      // Patrón 2 (Invertido): "(coloque|pon|escriba|ingrese) [VALOR] en (el campo)? [campo]"
      const patternReverse = new RegExp(
        `(?:^|\\b)(?:coloque|colocar|pon|poner|escriba|escribe|escribir|digite|digitar|ingrese|ingresar)\\s+(.+?)\\s+en\\s+(?:el\\s+campo\\s+|el\\s+|la\\s+)?${escaped}(?:\\b|$)`,
        'i'
      );
      const matchReverse = text.match(patternReverse);
      if (matchReverse && matchReverse[1]) {
        const val = cleanDictatedValue(matchReverse[1]);
        if (val) return val;
      }

      // Patrón 3 (Verbo antes del campo): "(coloque|pon|escriba) en (el campo)? [campo] [VALOR]"
      const patternVerbFirst = new RegExp(
        `(?:^|\\b)(?:coloque|colocar|pon|poner|escriba|escribe|escribir|digite|digitar|ingrese|ingresar|asigne|asignar)\\s+en\\s+(?:el\\s+campo\\s+|el\\s+|la\\s+)?${escaped}\\s+(.+)`,
        'i'
      );
      const matchVerbFirst = text.match(patternVerbFirst);
      if (matchVerbFirst && matchVerbFirst[1]) {
        const val = cleanDictatedValue(matchVerbFirst[1]);
        if (val) return val;
      }
    }

    return '';
  };

  // Helper para mantener compatibilidad
  const extractValueAfter = (fullText: string, prefixes: string[]): string => {
    return extractFieldValue(fullText, prefixes);
  };

  // Helper para obtener la etiqueta descriptiva de un campo
  const getFieldLabel = (inputEl: HTMLElement): string => {
    const aria = inputEl.getAttribute('aria-label');
    if (aria) return aria.trim();
    const ph = (inputEl as HTMLInputElement).placeholder;
    if (ph) return ph.trim();
    const parent = inputEl.closest('div, label, section') as HTMLElement;
    const parentText = parent?.innerText?.split('\n').map(t => t.trim()).filter(Boolean)[0];
    if (parentText && parentText.length < 50) return parentText;
    return (inputEl as HTMLInputElement).name || 'Campo';
  };

  // Helper integral para obtener TODOS los controles interactivos del formulario (inputs, selects, checkboxes, switches)
  const getVisibleFormControls = (): {
    id: string;
    element: HTMLElement;
    type: 'input' | 'textarea' | 'select' | 'checkbox' | 'switch';
    label: string;
    value: string;
    isFilled: boolean;
  }[] => {
    if (typeof document === 'undefined') return [];

    const results: {
      id: string;
      element: HTMLElement;
      type: 'input' | 'textarea' | 'select' | 'checkbox' | 'switch';
      label: string;
      value: string;
      isFilled: boolean;
    }[] = [];

    const seenElements = new Set<HTMLElement>();

    // 1. Inputs y Textareas estándar de texto, números, etc.
    const textEls = Array.from(
      document.querySelectorAll(
        'input:not([type="hidden"]):not([disabled]):not([type="checkbox"]):not([role="switch"]), textarea:not([disabled])'
      )
    ) as (HTMLInputElement | HTMLTextAreaElement)[];

    for (const el of textEls) {
      if (el.closest('#accessibility-toolbar-modal') || el.closest('#accessibility-voice-widget')) continue;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0 || style.display === 'none' || style.visibility === 'hidden') continue;

      const label = getFieldLabel(el);
      const val = el.value?.trim() || '';
      results.push({
        id: el.id || label,
        element: el,
        type: el.tagName === 'TEXTAREA' ? 'textarea' : 'input',
        label,
        value: val,
        isFilled: val.length > 0,
      });
      seenElements.add(el);
    }

    // 2. Switches / Interruptores (AccesibleSwitch o switch nativo)
    const switchEls = Array.from(
      document.querySelectorAll('[role="switch"]')
    ) as HTMLElement[];

    for (const el of switchEls) {
      if (el.closest('#accessibility-toolbar-modal') || el.closest('#accessibility-voice-widget')) continue;
      const container = (el.tagName === 'INPUT' ? el.parentElement : el) as HTMLElement;
      if (!container || seenElements.has(container)) continue;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const parentCard = container.closest('div[style*="border-radius"], div[style*="padding"]') as HTMLElement;
      let label = 'Interruptor';
      if (parentCard) {
        const textNodes = parentCard.innerText?.split('\n').map(t => t.trim()).filter(Boolean) || [];
        label = textNodes[0] || 'Interruptor';
      }
      const isChecked = container.getAttribute('aria-checked') === 'true' || 
                        container.innerText?.includes('SÍ') || 
                        container.querySelector('input')?.checked;

      results.push({
        id: label,
        element: container,
        type: 'switch',
        label,
        value: isChecked ? 'Activado' : 'Desactivado',
        isFilled: true,
      });
      seenElements.add(container);
    }

    // 3. Selectores desplegables personalizados y pickers (Dependencia, Fechas, Horas)
    // 4. Casillas de Verificación / Checkboxes (ej. Aceptación de Términos Ley 1581)
    const clickables = Array.from(
      document.querySelectorAll('div[style*="cursor: pointer"], div[role="button"], button')
    ) as HTMLElement[];

    for (const el of clickables) {
      if (el.closest('#accessibility-toolbar-modal') || el.closest('#accessibility-voice-widget')) continue;
      if (seenElements.has(el)) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const text = (el.innerText || '').trim();
      const parent = el.closest('div, label, section') as HTMLElement;
      const labelText = parent ? (parent.querySelector('label, text, span, div')?.textContent || '').trim() : '';

      // Casilla de verificación / Checkbox
      const isCheckbox = (
        el.getAttribute('role') === 'checkbox' ||
        text.toLowerCase().includes('autorizo el tratamiento') ||
        text.toLowerCase().includes('ley 1581') ||
        text.toLowerCase().includes('términos y condiciones') ||
        text.toLowerCase().includes('manifestación expresa')
      );

      if (isCheckbox) {
        const isChecked = el.getAttribute('aria-checked') === 'true' || 
                          el.querySelector('[style*="background-color: rgb(230, 57, 70)"]') !== null ||
                          el.querySelector('svg, i') !== null;
        const cbLabel = text.length > 60 ? text.slice(0, 50) + '...' : text;
        results.push({
          id: 'terminos',
          element: el,
          type: 'checkbox',
          label: cbLabel || 'Términos y condiciones',
          value: isChecked ? 'Aceptado' : 'Pendiente',
          isFilled: isChecked,
        });
        seenElements.add(el);
        continue;
      }

      // Selector de Dependencia, Fecha o Hora
      const isSelectorWrap = (
        (text.includes('Seleccionar') || text.includes('Dependencia') || text.includes('202') || text.includes(':')) &&
        (el.querySelector('svg, i') || text.includes('Seleccionar') || el.style.borderWidth)
      ) || (labelText.toLowerCase().includes('dependencia') || labelText.toLowerCase().includes('fecha') || labelText.toLowerCase().includes('hora'));

      if (isSelectorWrap && rect.height >= 30 && rect.width >= 60) {
        let fieldLabel = labelText;
        if (!fieldLabel || fieldLabel === text) {
          const prev = el.previousElementSibling as HTMLElement;
          fieldLabel = prev?.innerText?.trim() || 'Selector';
        }
        if (fieldLabel.length > 40) fieldLabel = fieldLabel.slice(0, 40);

        const val = text !== 'Seleccionar' ? text : '';
        results.push({
          id: fieldLabel,
          element: el,
          type: 'select',
          label: fieldLabel || 'Selector desplegable',
          value: val,
          isFilled: val.length > 0 && val !== 'Seleccionar',
        });
        seenElements.add(el);
      }
    }

    // Ordenar de arriba a abajo y de izquierda a derecha según posición visual en pantalla
    results.sort((a, b) => {
      const rectA = a.element.getBoundingClientRect();
      const rectB = b.element.getBoundingClientRect();
      if (Math.abs(rectA.top - rectB.top) > 15) {
        return rectA.top - rectB.top;
      }
      return rectA.left - rectB.left;
    });

    return results;
  };

  // Helper para mantener compatibilidad con búsquedas de inputs puros
  const getVisibleFormInputs = (): (HTMLInputElement | HTMLTextAreaElement)[] => {
    const controls = getVisibleFormControls();
    return controls
      .filter(c => c.type === 'input' || c.type === 'textarea')
      .map(c => c.element as (HTMLInputElement | HTMLTextAreaElement));
  };

  // Helper para navegar secuencialmente de control en control ("siguiente", "anterior")
  const navigateFormControls = (direction: 'next' | 'prev'): boolean => {
    if (typeof document === 'undefined') return false;
    const controls = getVisibleFormControls();
    if (controls.length === 0) {
      speakText('No se encontraron campos en este formulario.');
      return false;
    }

    let nextIndex = 0;
    if (direction === 'next') {
      if (currentFormNavIndexRef.current === -1) {
        nextIndex = 0;
      } else if (currentFormNavIndexRef.current < controls.length - 1) {
        nextIndex = currentFormNavIndexRef.current + 1;
      } else {
        speakText('Ha llegado al final del formulario. Diga: Radicar solicitud para enviar, o diga siguiente para volver al primer campo.');
        currentFormNavIndexRef.current = -1;
        return true;
      }
    } else {
      if (currentFormNavIndexRef.current <= 0) {
        nextIndex = 0;
        speakText(`Ya está en el primer campo: ${controls[0].label}.`);
      } else {
        nextIndex = currentFormNavIndexRef.current - 1;
      }
    }

    currentFormNavIndexRef.current = nextIndex;
    const item = controls[nextIndex];
    lastActiveInputRef.current = item.element as any;

    try {
      item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {}

    if (item.type === 'input' || item.type === 'textarea') {
      (item.element as HTMLElement).focus();
      speakText(`Campo: ${item.label}.${item.value ? ` Valor actual: ${item.value}.` : ' Está vacío.'} Diga lo que desea ingresar, o diga siguiente.`);
    } else if (item.type === 'switch') {
      speakText(`Interruptor: ${item.label}. Estado: ${item.value}. Diga cambiar o alternar, o diga siguiente.`);
    } else if (item.type === 'checkbox') {
      speakText(`Casilla: ${item.label}. Estado: ${item.value}. Diga marcar o aceptar, o diga siguiente.`);
    } else if (item.type === 'select') {
      speakText(`Selector de: ${item.label}.${item.value ? ` Selección actual: ${item.value}.` : ' Sin seleccionar.'} Diga abrir o seleccionar para ver opciones, o diga siguiente.`);
    }

    return true;
  };

  const navigateFormFields = navigateFormControls;

  // Helper para repetir dictado si el usuario se equivocó ("repetir", "repetir campo", "me equivoqué")
  const repeatCurrentField = () => {
    if (typeof document === 'undefined') return;
    const controls = getVisibleFormControls();
    if (controls.length === 0) {
      speakText('No se encontraron campos en este formulario.');
      return;
    }

    const currentIndex = currentFormNavIndexRef.current >= 0 && currentFormNavIndexRef.current < controls.length
      ? currentFormNavIndexRef.current
      : 0;
    const currentItem = controls[currentIndex];

    if (!currentItem) return;

    if (currentItem.type === 'input' || currentItem.type === 'textarea') {
      const inputEl = currentItem.element as (HTMLInputElement | HTMLTextAreaElement);
      setNativeDomInputValue(inputEl, '');
      inputEl.focus();
      try {
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {}
      speakText(`Campo ${currentItem.label} borrado. Puede repetir su dictado ahora. Le escucho.`);
    } else if (currentItem.type === 'switch' || currentItem.type === 'checkbox') {
      currentItem.element.click();
      speakText(`${currentItem.label} restablecido. Puede repetir la acción.`);
    } else if (currentItem.type === 'select') {
      currentItem.element.click();
      speakText(`Selector ${currentItem.label} abierto para repetir selección.`);
    }
  };

  // Helper para corregir el campo actual ("corregir", "corregir campo")
  const correctCurrentField = () => {
    if (typeof document === 'undefined') return;
    const controls = getVisibleFormControls();
    if (controls.length === 0) {
      speakText('No se encontraron campos para corregir.');
      return;
    }

    const currentIndex = currentFormNavIndexRef.current >= 0 && currentFormNavIndexRef.current < controls.length
      ? currentFormNavIndexRef.current
      : 0;
    const currentItem = controls[currentIndex];

    if (!currentItem) return;

    if (currentItem.type === 'input' || currentItem.type === 'textarea') {
      const inputEl = currentItem.element as (HTMLInputElement | HTMLTextAreaElement);
      setNativeDomInputValue(inputEl, '');
      inputEl.focus();
      try {
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {}
      speakText(`Modo corrección activado para el campo ${currentItem.label}. Dicte el valor correcto.`);
    } else if (currentItem.type === 'switch' || currentItem.type === 'checkbox') {
      currentItem.element.click();
      speakText(`Modo corrección: ${currentItem.label} cambiado.`);
    } else if (currentItem.type === 'select') {
      currentItem.element.click();
      speakText(`Modo corrección: Selector ${currentItem.label} abierto. Diga la nueva opción deseada.`);
    }
  };

  // Helper para alternar/cambiar el control actual (switch, checkbox o abrir select)
  const toggleOrActivateCurrentField = () => {
    if (typeof document === 'undefined') return;
    const controls = getVisibleFormControls();
    if (controls.length === 0) {
      speakText('No hay controles interactivos disponibles.');
      return;
    }

    const currentIndex = currentFormNavIndexRef.current >= 0 && currentFormNavIndexRef.current < controls.length
      ? currentFormNavIndexRef.current
      : 0;
    const currentItem = controls[currentIndex];

    if (!currentItem) return;

    if (currentItem.type === 'switch') {
      currentItem.element.click();
      setTimeout(() => {
        const isNowOn = currentItem.element.getAttribute('aria-checked') === 'true' || 
                        currentItem.element.innerText?.includes('SÍ');
        speakText(`Interruptor ${currentItem.label}: ${isNowOn ? 'Activado' : 'Desactivado'}. Diga siguiente para continuar.`);
      }, 100);
      return;
    }

    if (currentItem.type === 'checkbox') {
      currentItem.element.click();
      setTimeout(() => {
        speakText(`Casilla ${currentItem.label} alternada. Diga siguiente para continuar.`);
      }, 100);
      return;
    }

    if (currentItem.type === 'select') {
      currentItem.element.click();
      speakText(`Selector ${currentItem.label} abierto. Diga el nombre de la opción para seleccionarla, o diga siguiente.`);
      return;
    }

    if (currentItem.type === 'input' || currentItem.type === 'textarea') {
      (currentItem.element as HTMLElement).focus();
      speakText(`Campo de texto ${currentItem.label}. Dicte el valor que desea escribir, o diga borrar o repetir.`);
      return;
    }
  };

  // Helper para detectar campos faltantes por llenar ("¿qué falta?", "campos faltantes", "falta llenar")
  const checkMissingFields = () => {
    if (typeof document === 'undefined') return;
    const controls = getVisibleFormControls();
    if (controls.length === 0) {
      speakText('No se encontraron campos de formulario en esta página.');
      return;
    }

    const missingControls = controls.filter(c => !c.isFilled);

    if (missingControls.length === 0) {
      speakText('¡Excelente! Todos los campos del formulario están completos. Diga: Acepto términos, o diga: Radicar solicitud para enviar.');
      return;
    }

    const targetItem = missingControls[0];
    const targetIdx = controls.indexOf(targetItem);
    if (targetIdx !== -1) {
      currentFormNavIndexRef.current = targetIdx;
    }

    try {
      targetItem.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {}

    const missingLabels = missingControls.map(c => c.label);
    const firstLabel = targetItem.label;
    const restText = missingControls.length > 1
      ? `Faltan ${missingControls.length} campos por completar: ${missingLabels.slice(0, 3).join(', ')}. `
      : `Falta 1 campo por completar. `;

    if (targetItem.type === 'input' || targetItem.type === 'textarea') {
      (targetItem.element as HTMLElement).focus();
      speakText(`${restText}Posicionado en: ${firstLabel}. Dicte lo que desea ingresar, o diga siguiente.`);
    } else if (targetItem.type === 'checkbox') {
      speakText(`${restText}Posicionado en la casilla: ${firstLabel}. Diga marcar o aceptar, o diga siguiente.`);
    } else if (targetItem.type === 'select') {
      speakText(`${restText}Posicionado en el selector: ${firstLabel}. Diga abrir o seleccionar, o diga siguiente.`);
    } else {
      speakText(`${restText}Posicionado en: ${firstLabel}.`);
    }
  };

  // Helper para leer los campos del formulario actual
  const readFormSummary = () => {
    if (typeof document === 'undefined') return;
    const allControls = getVisibleFormControls();
    const summaryList: string[] = [];
    allControls.forEach((c) => {
      const cleanLabel = c.label.slice(0, 30);
      summaryList.push(`${cleanLabel}: ${c.value ? c.value : 'vacío'}`);
    });
    if (summaryList.length === 0) {
      speakText('No se encontraron campos de formulario editables en esta pantalla.');
    } else {
      speakText('Resumen de los campos del formulario: ' + summaryList.slice(0, 8).join('. '));
    }
  };

  // Procesamiento de comandos de voz para ciegos y manos libres continuo
  const handleVoiceTranscript = (speechResult: string) => {
    const text = speechResult.toLowerCase().trim();
    setVoiceStatusText(`Escuchó: "${text}"`);
    console.log('🎙️ Comando de voz recibido:', text);

    // 0. Desactivar / Apagar asistente por voz
    if (
      text.includes('apagar asistente') ||
      text.includes('cerrar asistente') ||
      text.includes('detener asistente') ||
      text.includes('desactivar asistente') ||
      text.includes('desactivar microfono') ||
      text.includes('desactivar micrófono') ||
      text.includes('apagar microfono') ||
      text.includes('apagar micrófono') ||
      text.includes('silencio') ||
      text.includes('adiós') ||
      text.includes('adios') ||
      text.includes('terminar asistente')
    ) {
      stopVoiceAssistant();
      showToast('Asistente de voz: DESACTIVADO');
      speakText('Asistente por voz desactivado. Puede reactivarlo cuando desee pulsando la tecla M.');
      return;
    }

    // 1. Ayuda contextual por pantalla
    if (text.includes('ayuda') || text.includes('comandos') || text.includes('opciones') || text.includes('qué puedo decir')) {
      if (pathname.includes('/dashboard/requests')) {
        speakText('En la bandeja de solicitudes puede decir: Resumen, Filtrar pendientes, Filtrar aprobadas, Filtrar transporte o visitantes, Buscar una palabra, Leer solicitudes, Ver primera solicitud, o Nueva solicitud.');
        return;
      }
      if (pathname.includes('/requests/visitors')) {
        speakText('En este formulario puede decir Siguiente para avanzar de campo, Repetir si se equivocó dictando, Qué falta para ir a campos vacíos, o dictar directamente: En nombre coloque Juan Carlos, En documento 102030, Con vehículo o Sin vehículo, En placa ABC 123, En motivo reunión de trabajo, Acepto términos, o Registrar ingreso.');
        return;
      }
      if (pathname.includes('/requests/transport')) {
        speakText('En transporte puede decir Siguiente para avanzar, Repetir si se equivocó, Qué falta para saltar a campos vacíos, o dictar: En nombre Juan Carlos, En teléfono 3101234567, En origen sede central, En destino fiscalía, En motivo justificación, Acepto términos, o Enviar solicitud.');
        return;
      }
      if (pathname.includes('/requests/maintenance')) {
        speakText('En mantenimiento puede decir Siguiente para avanzar, Repetir para corregir, Qué falta para ver campos vacíos, o dictar: En título daño de luz, En ubicación piso tres, En descripción detalle de la falla, Prioridad alta, Acepto términos, o Enviar reporte.');
        return;
      }
      if (pathname.includes('/requests/rooms')) {
        speakText('En salas puede decir Siguiente para avanzar, Repetir si se equivocó, Qué falta para campos vacíos, o dictar: En asunto reunión directiva, En asistentes cuatro, Modalidad presencial o virtual, Acepto términos, o Confirmar reserva.');
        return;
      }
      if (pathname.includes('/requests/parking')) {
        speakText('En parqueadero puede decir Siguiente para avanzar, Repetir si se equivocó, Qué falta para campos vacíos, o dictar: En nombre Juan Carlos, En placa ABC 123, En marca Chevrolet, En color gris, Carro o Moto, Acepto términos, o Radicar solicitud.');
        return;
      }
      if (pathname.includes('/login')) {
        speakText('En la pantalla de ingreso puede decir: Usuario admin, luego Contraseña admin123, y finalmente Ingresar.');
        return;
      }
      speakText('Comandos disponibles: Diga Visitantes, Transporte, Mantenimiento, Salas, Parqueadero, Ver solicitudes, Inicio, o Leer página.');
      return;
    }

    // 2. Leer página o leer formulario
    if (text.includes('leer formulario') || text.includes('revisar formulario') || text.includes('qué campos tengo') || text.includes('revisar campos')) {
      readFormSummary();
      return;
    }
    if (text.includes('leer') || text.includes('qué dice') || text.includes('repetir') || text.includes('escuchar')) {
      readCurrentPage();
      return;
    }

    // 3. Login
    if (pathname.includes('/login')) {
      if (text.includes('ingresar') || text.includes('login') || text.includes('entrar') || text.includes('acceder')) {
        speakText('Procesando ingreso al sistema...');
        setTimeout(() => {
          if (typeof document !== 'undefined') {
            const allEls = Array.from(document.querySelectorAll('*'));
            const submitBtn = allEls.find((el: any) => el.innerText && el.innerText.trim().toLowerCase() === 'ingresar al sistema') as HTMLElement;
            if (submitBtn) {
              submitBtn.click();
              setTimeout(() => {
                const acceptBtn = Array.from(document.querySelectorAll('*')).find((el: any) => el.innerText && el.innerText.trim().toLowerCase() === 'aceptar y continuar') as HTMLElement;
                if (acceptBtn) acceptBtn.click();
              }, 700);
            }
          }
        }, 800);
        return;
      }
      if (text.includes('admin') || text.includes('usuario')) {
        const val = extractValueAfter(text, ['usuario', 'user']) || 'admin';
        const ok = fillInputByKeywords(['usuario', 'correo', 'email'], val);
        if (ok) {
          speakText(`Usuario ${val} establecido. Diga: Contraseña admin123, o diga: Ingresar.`);
        }
        return;
      }
      if (text.includes('contraseña') || text.includes('admin123') || text.includes('clave')) {
        const val = extractValueAfter(text, ['contraseña', 'clave', 'password']) || 'admin123';
        const ok = fillInputByKeywords(['contraseña', 'clave', 'password'], val);
        if (ok) {
          speakText('Contraseña ingresada. Diga: Ingresar para iniciar sesión.');
        }
        return;
      }
    }

    // 4. Adaptación para Bandeja de Solicitudes (/dashboard/requests)
    const isRequestsPage = pathname.includes('/dashboard/requests');

    // Navegación directa hacia Solicitudes desde cualquier pantalla
    if ((text.includes('solicitud') || text.includes('solicitudes') || text.includes('bandeja')) && !isRequestsPage) {
      if (text.includes('mis solicitudes') || text.includes('ver solicitudes') || text.includes('ir a solicitudes') || text.includes('bandeja') || text === 'solicitudes') {
        speakText('Abriendo la Bandeja de Solicitudes Administrativas.');
        setTimeout(() => router.push('/dashboard/requests'), 1200);
        return;
      }
    }

    if (isRequestsPage) {
      const voiceBridge = typeof window !== 'undefined' ? (window as any).__sasgeRequestsVoice : null;

      // 4.1 Resumen y estadísticas de solicitudes
      if (text.includes('resumen') || text.includes('estadística') || text.includes('estadistica') || text.includes('cuántas') || text.includes('cuantas') || text.includes('estado general')) {
        if (voiceBridge && voiceBridge.getSummary) {
          const summary = voiceBridge.getSummary();
          const { stats, total } = summary;
          speakText(`Resumen de solicitudes: ${stats.pendientes} pendientes, ${stats.enCurso} en proceso o en curso, y ${stats.aprobadas} resueltas o aprobadas. Total visible en lista: ${total} trámites.`);
        } else {
          speakText('Consultando estado de solicitudes. Por favor revise los paneles de resumen en pantalla.');
        }
        return;
      }

      // 4.2 Filtros por Estado
      if (text.includes('pendiente') || text.includes('pendientes')) {
        if (voiceBridge) voiceBridge.setStatusFilter('Pendiente');
        else clickButtonByKeywords(['pendiente']);
        speakText('Filtro aplicado: mostrando solicitudes pendientes.');
        return;
      }
      if (text.includes('en proceso') || text.includes('en curso')) {
        if (voiceBridge) voiceBridge.setStatusFilter('En proceso');
        else clickButtonByKeywords(['en proceso']);
        speakText('Filtro aplicado: mostrando solicitudes en proceso.');
        return;
      }
      if (text.includes('aprobada') || text.includes('aprobadas') || text.includes('resuelta') || text.includes('resueltas')) {
        if (voiceBridge) voiceBridge.setStatusFilter('Aprobada');
        else clickButtonByKeywords(['aprobada', 'resuelta']);
        speakText('Filtro aplicado: mostrando solicitudes aprobadas y resueltas.');
        return;
      }
      if (text.includes('rechazada') || text.includes('rechazadas')) {
        if (voiceBridge) voiceBridge.setStatusFilter('Rechazada');
        else clickButtonByKeywords(['rechazada']);
        speakText('Filtro aplicado: mostrando solicitudes rechazadas.');
        return;
      }
      if (text.includes('todos los estados') || text.includes('quitar filtro de estado') || text === 'todas las solicitudes') {
        if (voiceBridge) voiceBridge.setStatusFilter('Todos');
        else clickButtonByKeywords(['todos']);
        speakText('Mostrando solicitudes en todos los estados.');
        return;
      }

      // 4.3 Filtros por Servicio
      if (text.includes('filtrar visitante') || text.includes('servicio visitante')) {
        if (voiceBridge) voiceBridge.setServiceFilter('Visitantes');
        else clickButtonByKeywords(['visitantes']);
        speakText('Filtrado por servicio de Visitantes.');
        return;
      }
      if (text.includes('filtrar transporte') || text.includes('servicio transporte')) {
        if (voiceBridge) voiceBridge.setServiceFilter('Transporte');
        else clickButtonByKeywords(['transporte']);
        speakText('Filtrado por servicio de Transporte.');
        return;
      }
      if (text.includes('filtrar mantenimiento') || text.includes('servicio mantenimiento')) {
        if (voiceBridge) voiceBridge.setServiceFilter('Mantenimiento');
        else clickButtonByKeywords(['mantenimiento']);
        speakText('Filtrado por servicio de Mantenimiento.');
        return;
      }
      if (text.includes('filtrar sala') || text.includes('servicio sala')) {
        if (voiceBridge) voiceBridge.setServiceFilter('Salas');
        else clickButtonByKeywords(['salas']);
        speakText('Filtrado por servicio de Reserva de Salas.');
        return;
      }
      if (text.includes('filtrar parqueadero') || text.includes('servicio parqueadero')) {
        if (voiceBridge) voiceBridge.setServiceFilter('Parqueadero');
        else clickButtonByKeywords(['parqueadero']);
        speakText('Filtrado por servicio de Parqueadero.');
        return;
      }
      if (text.includes('todos los servicios') || text.includes('todas las categorías') || text.includes('todas las categorias')) {
        if (voiceBridge) voiceBridge.setServiceFilter('Todas');
        else clickButtonByKeywords(['todas']);
        speakText('Mostrando todos los servicios.');
        return;
      }

      // 4.4 Búsqueda de trámites
      if (text.startsWith('buscar ') || text.includes('buscar por ') || text.includes('filtro ')) {
        const query = extractValueAfter(text, ['buscar por', 'buscar', 'filtro']) || text.replace(/^buscar\s+/i, '');
        if (query) {
          if (voiceBridge) voiceBridge.setSearchQuery(query);
          else fillInputByKeywords(['buscar', 'título'], query);
          speakText(`Buscando solicitudes con el término: ${query}`);
          return;
        }
      }
      if (text.includes('limpiar búsqueda') || text.includes('borrar búsqueda') || text.includes('quitar búsqueda')) {
        if (voiceBridge) voiceBridge.setSearchQuery('');
        speakText('Búsqueda restablecida.');
        return;
      }

      // 4.5 Leer solicitudes visibles
      if (text.includes('leer solicitudes') || text.includes('listar solicitudes') || text.includes('qué solicitudes hay')) {
        if (voiceBridge && voiceBridge.getSummary) {
          const { items, total } = voiceBridge.getSummary();
          if (!items || items.length === 0) {
            speakText('No hay solicitudes visibles con los filtros actuales.');
          } else {
            const listSpoken = items.map((it: any, idx: number) => `Solicitud ${idx + 1}: ${it.title}. Servicio: ${it.category}. Estado: ${it.status}. Fecha: ${it.date}`).join('. ');
            speakText(`Se muestran ${items.length} de ${total} solicitudes. ${listSpoken}`);
          }
        } else {
          speakText('Mostrando lista de solicitudes.');
        }
        return;
      }

      // 4.6 Abrir detalle o primera solicitud
      if (text.includes('primera solicitud') || text.includes('ver primera') || text.includes('abrir solicitud') || text.includes('detalle')) {
        if (voiceBridge && voiceBridge.openFirstRequest) {
          const req = voiceBridge.openFirstRequest();
          if (req) {
            speakText(`Abriendo detalle de la solicitud: ${req.title}. Estado actual: ${req.status}.`);
          } else {
            speakText('No hay solicitudes disponibles para abrir.');
          }
        }
        return;
      }

      // 4.7 Cerrar detalle / modal
      if (text.includes('cerrar detalle') || text.includes('cerrar modal') || text.includes('cerrar ventana')) {
        if (voiceBridge && voiceBridge.closeModal) voiceBridge.closeModal();
        speakText('Ventana cerrada.');
        return;
      }

      // 4.8 Crear nueva solicitud
      if (text.includes('nueva solicitud') || text.includes('crear solicitud') || text.includes('radicar nueva')) {
        if (voiceBridge && voiceBridge.openNewRequestModal) voiceBridge.openNewRequestModal();
        else clickButtonByKeywords(['crear nueva solicitud', 'nueva solicitud', '+']);
        speakText('Menú de nueva solicitud abierto. Diga: Visitantes, Transporte, Mantenimiento, Salas o Parqueadero.');
        return;
      }
    }

    // 5. Adaptación para Formularios (/requests/*)
    const isFormPage = pathname.includes('/requests/');
    if (isFormPage) {
      // 5.0 Navegación secuencial de campos ("siguiente", "anterior", "repetir", "corregir", "cambiar", "qué falta", "borrar")
      if (
        text === 'siguiente' ||
        text === 'siguiente campo' ||
        text === 'campo siguiente' ||
        text === 'avanzar' ||
        text === 'continuar' ||
        text === 'pasa al siguiente' ||
        text === 'pasar al siguiente' ||
        text === 'siguiente por favor' ||
        text === 'ir al siguiente' ||
        text === 'próximo' ||
        text === 'proximo' ||
        text === 'próximo campo' ||
        text === 'proximo campo' ||
        text.startsWith('siguiente')
      ) {
        navigateFormControls('next');
        return;
      }

      if (
        text === 'anterior' ||
        text === 'campo anterior' ||
        text === 'anterior campo' ||
        text === 'retroceder' ||
        text === 'atrás' ||
        text === 'atras' ||
        text === 'volver al campo anterior'
      ) {
        navigateFormControls('prev');
        return;
      }

      // Repetir dictado si hubo equivocación
      if (
        text === 'repetir' ||
        text === 'repetir campo' ||
        text === 'repetir dictado' ||
        text === 'volver a dictar' ||
        text === 'me equivoque' ||
        text === 'me equivoqué' ||
        text === 'me equivoque dictando' ||
        text === 'me equivoqué dictando' ||
        text === 'reintentar' ||
        text === 'borrar y repetir' ||
        text.includes('me equivoque') ||
        text.includes('me equivoqué') ||
        text.startsWith('repetir')
      ) {
        repeatCurrentField();
        return;
      }

      // Corregir campo
      if (
        text === 'corregir' ||
        text === 'corregir campo' ||
        text === 'corrección' ||
        text === 'correccion' ||
        text.startsWith('corregir')
      ) {
        correctCurrentField();
        return;
      }

      // Alternar / Cambiar / Marcar checkbox o switch o abrir select box
      if (
        text === 'cambiar' ||
        text === 'alternar' ||
        text === 'marcar' ||
        text === 'desmarcar' ||
        text === 'activar' ||
        text === 'desactivar' ||
        text === 'abrir' ||
        text === 'seleccionar' ||
        text === 'abrir opciones' ||
        text === 'ver opciones'
      ) {
        toggleOrActivateCurrentField();
        return;
      }

      // Selección directa si hay un modal de opciones desplegado (ej. Dependencias, Salas)
      if (typeof document !== 'undefined') {
        const openModal = document.querySelector('[role="dialog"]') as HTMLElement;
        if (openModal) {
          const options = Array.from(openModal.querySelectorAll('div[role="button"], button, [style*="cursor: pointer"]')) as HTMLElement[];
          const found = options.find(opt => {
            const optText = (opt.innerText || '').toLowerCase().trim();
            return optText && (optText.includes(text) || text.includes(optText)) && optText.length < 80;
          });
          if (found) {
            found.click();
            speakText(`Opción seleccionada: ${found.innerText?.trim()}. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // Detectar y saltar a campos faltantes por llenar
      if (
        text === 'qué falta' ||
        text === 'que falta' ||
        text === 'qué falta llenar' ||
        text === 'que falta llenar' ||
        text === 'campos faltantes' ||
        text === 'campo faltante' ||
        text === 'falta llenar' ||
        text === 'falta algún campo' ||
        text === 'falta algun campo' ||
        text === 'qué campos faltan' ||
        text === 'que campos faltan' ||
        text === 'revisar campos' ||
        text === 'verificar campos' ||
        text === 'ir al faltante' ||
        text.includes('que falta') ||
        text.includes('qué falta') ||
        text.includes('campos faltantes')
      ) {
        checkMissingFields();
        return;
      }

      if (text === 'borrar campo' || text === 'limpiar campo' || text === 'borrar valor' || text === 'borrar' || text === 'limpiar') {
        repeatCurrentField();
        return;
      }

      // 5.1 Enviar / Radicar / Guardar el formulario
      if (
        text.includes('radicar') ||
        text.includes('enviar') ||
        text.includes('registrar ingreso') ||
        text.includes('enviar solicitud') ||
        text.includes('enviar reporte') ||
        text.includes('confirmar reserva') ||
        text.includes('guardar solicitud')
      ) {
        speakText('Procesando el envío de la solicitud. Por favor espere.');
        setTimeout(() => {
          const clicked = clickButtonByKeywords([
            'registrar ingreso',
            'enviar solicitud',
            'enviar reporte',
            'confirmar reserva',
            'radicar solicitud',
            'radicar',
            'enviar'
          ]);
          if (!clicked) {
            speakText('No se encontró el botón de envío o falta completar campos obligatorios como autorizar términos.');
          }
        }, 600);
        return;
      }

      // 5.2 Aceptar términos / Ley 1581
      if (text.includes('término') || text.includes('termino') || text.includes('autorizo') || text.includes('política') || text.includes('politica')) {
        if (typeof document !== 'undefined') {
          const allEls = Array.from(document.querySelectorAll('*')) as HTMLElement[];
          const termsEl = allEls.find(el => {
            const t = (el.innerText || '').toLowerCase();
            return t.includes('autorizo el tratamiento') || t.includes('ley 1581') || t.includes('términos');
          });
          if (termsEl) {
            termsEl.click();
            speakText('Términos y autorización de datos marcados correctamente. Diga Radicar solicitud para enviar.');
            return;
          }
        }
      }

      // 5.3 Control de Vehículo en Visitantes
      if (text.includes('con vehículo') || text.includes('con vehiculo') || text.includes('ingresa con vehículo') || text.includes('tiene carro') || text.includes('tiene moto')) {
        if (typeof document !== 'undefined') {
          const switchEl = document.querySelector('[role="switch"], input[type="checkbox"]') as HTMLElement;
          if (switchEl) switchEl.click();
          speakText('Acceso con vehículo habilitado. Ahora puede decir: Placa y Marca.');
          return;
        }
      }
      if (text.includes('sin vehículo') || text.includes('sin vehiculo') || text.includes('a pie') || text.includes('peatonal')) {
        speakText('Acceso vehicular deshabilitado.');
        return;
      }

      // 5.4 Prioridad en Mantenimiento
      if (text.includes('prioridad')) {
        if (text.includes('alta')) {
          clickButtonByKeywords(['alta']);
          speakText('Prioridad alta seleccionada. Diga siguiente para continuar.');
          return;
        }
        if (text.includes('media')) {
          clickButtonByKeywords(['media']);
          speakText('Prioridad media seleccionada. Diga siguiente para continuar.');
          return;
        }
        if (text.includes('baja')) {
          clickButtonByKeywords(['baja']);
          speakText('Prioridad baja seleccionada. Diga siguiente para continuar.');
          return;
        }
      }

      // 5.5 Tipo de reunión en Salas
      if (text.includes('presencial')) {
        clickButtonByKeywords(['presencial']);
        speakText('Tipo de reunión: Presencial. Diga siguiente para continuar.');
        return;
      }
      if (text.includes('virtual')) {
        clickButtonByKeywords(['virtual']);
        speakText('Tipo de reunión: Virtual. Diga siguiente para continuar.');
        return;
      }

      // 5.6 Placa vehicular
      if (text.includes('placa')) {
        const val = extractFieldValue(text, ['placa']);
        if (val) {
          const cleanPlate = val.toUpperCase().replace(/\s+/g, '').slice(0, 6);
          const ok = fillInputByKeywords(['placa', 'abc123'], cleanPlate);
          if (ok) {
            speakText(`Placa ${cleanPlate} ingresada. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.7 Marca vehicular
      if (text.includes('marca')) {
        const val = extractFieldValue(text, ['marca']);
        if (val) {
          const ok = fillInputByKeywords(['marca', 'mazda', 'chevrolet'], val);
          if (ok) {
            speakText(`Marca ${val} ingresada. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.8 Color de vehículo
      if (text.includes('color')) {
        const val = extractFieldValue(text, ['color']);
        if (val) {
          const ok = fillInputByKeywords(['color', 'gris', 'blanco', 'negro'], val);
          if (ok) {
            speakText(`Color ${val} ingresado. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.8b Modelo de vehículo
      if (text.includes('modelo')) {
        const val = extractFieldValue(text, ['modelo']);
        if (val) {
          const ok = fillInputByKeywords(['modelo', '2020', '2024'], val);
          if (ok) {
            speakText(`Modelo ${val} ingresado. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.9 Cédula / Documento
      if (text.includes('cédula') || text.includes('cedula') || text.includes('documento') || text.includes('identificación') || text.includes('identificacion') || text.includes('cc')) {
        const val = extractFieldValue(text, ['cédula', 'cedula', 'documento', 'identificación', 'identificacion', 'cc', 'número de identificación', 'numero de identificacion']);
        if (val) {
          const cleanDoc = val.replace(/\s+/g, '').replace(/\D/g, '') || val;
          const ok = fillInputByKeywords(['documento', 'cédula', 'cedula', 'identificación', 'cc / ce', 'identificacion'], cleanDoc);
          if (ok) {
            speakText(`Documento ${cleanDoc} ingresado. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.10 Teléfono / Celular / Extensión
      if (text.includes('teléfono') || text.includes('telefono') || text.includes('celular') || text.includes('extensión') || text.includes('ext')) {
        const val = extractFieldValue(text, ['teléfono', 'telefono', 'celular', 'extensión', 'ext']);
        if (val) {
          const cleanPhone = val.replace(/\s+/g, '');
          const ok = fillInputByKeywords(['teléfono', 'telefono', 'ext', 'celular', '1234'], cleanPhone);
          if (ok) {
            speakText(`Teléfono ${cleanPhone} ingresado. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.11 Origen / Salida / Recogida (Transporte)
      if (text.includes('origen') || text.includes('salida') || text.includes('desde') || text.includes('recogida')) {
        const val = extractFieldValue(text, ['origen', 'salida', 'desde', 'recogida']);
        if (val) {
          const ok = fillInputByKeywords(['origen', 'salida', 'sede principal'], val);
          if (ok) {
            speakText(`Lugar de origen ${val} ingresado. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.12 Destino / Llegada (Transporte)
      if (text.includes('destino') || text.includes('hacia') || text.includes('llegada')) {
        const val = extractFieldValue(text, ['destino', 'hacia', 'llegada']);
        if (val) {
          const ok = fillInputByKeywords(['destino', 'tribunal', 'llegada'], val);
          if (ok) {
            speakText(`Destino ${val} ingresado. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.13 Motivo / Razón / Justificación
      if (text.includes('motivo') || text.includes('razón') || text.includes('razon') || text.includes('justificación') || text.includes('justificacion')) {
        const val = extractFieldValue(text, ['motivo', 'razón', 'razon', 'justificación', 'justificacion']);
        if (val) {
          const ok = fillInputByKeywords(['motivo', 'reunión técnica', 'audiencia', 'justificación'], val);
          if (ok) {
            speakText('Motivo ingresado correctamente. Diga siguiente para continuar.');
            return;
          }
        }
      }

      // 5.14 Título / Asunto / Daño / Evento
      if (text.includes('título') || text.includes('titulo') || text.includes('asunto') || text.includes('daño') || text.includes('dano') || text.includes('falla') || text.includes('evento')) {
        const val = extractFieldValue(text, ['título', 'titulo', 'asunto', 'daño', 'dano', 'falla', 'evento']);
        if (val) {
          const ok = fillInputByKeywords(['título', 'titulo', 'asunto', 'comité', 'gotera', 'daño'], val);
          if (ok) {
            speakText(`Título ${val} ingresado. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.15 Ubicación / Piso
      if (text.includes('ubicación') || text.includes('ubicacion') || text.includes('piso')) {
        const val = extractFieldValue(text, ['ubicación', 'ubicacion', 'piso']);
        if (val) {
          const ok = fillInputByKeywords(['ubicación', 'ubicacion', 'edificio liévano', 'piso'], val);
          if (ok) {
            speakText(`Ubicación ${val} ingresada. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.16 Oficina / Espacio / Salón
      if (text.includes('oficina') || text.includes('espacio') || text.includes('salón') || text.includes('salon')) {
        const val = extractFieldValue(text, ['oficina', 'espacio', 'salón', 'salon']);
        if (val) {
          const ok = fillInputByKeywords(['espacio', 'oficina', '304'], val);
          if (ok) {
            speakText(`Espacio ${val} ingresado. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.17 Descripción detallada
      if (text.includes('descripción') || text.includes('descripcion') || text.includes('detalle')) {
        const val = extractFieldValue(text, ['descripción', 'descripcion', 'detalle', 'detalles']);
        if (val) {
          const ok = fillInputByKeywords(['descripción', 'descripcion', 'describe la falla', 'detalle'], val);
          if (ok) {
            speakText('Descripción detallada ingresada. Diga siguiente para continuar.');
            return;
          }
        }
      }

      // 5.18 Pasajeros / Asistentes / Cantidad
      if (text.includes('pasajero') || text.includes('asistente') || text.includes('cantidad') || text.includes('cupo') || text.includes('aforo')) {
        const val = extractFieldValue(text, ['pasajeros', 'asistentes', 'cantidad', 'cupos', 'aforo', 'personas']);
        const num = (val || text).replace(/\D/g, '');
        if (num) {
          const ok = fillInputByKeywords(['pasajeros', 'asistentes', 'aforo', '1', '4', '6'], num);
          if (ok) {
            speakText(`Cantidad establecida en ${num}. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.19 Funcionario / Responsable
      if (text.includes('funcionario') || text.includes('responsable') || text.includes('autoriza')) {
        const val = extractFieldValue(text, ['funcionario', 'responsable', 'autoriza']);
        if (val) {
          const capitalized = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const ok = fillInputByKeywords(['funcionario', 'responsable', 'autoriza'], capitalized);
          if (ok) {
            speakText(`Funcionario responsable ${capitalized} ingresado. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.19b Dependencia / Dirección / Área
      if (text.includes('dependencia') || text.includes('dirección') || text.includes('direccion') || text.includes('área') || text.includes('area')) {
        const val = extractFieldValue(text, ['dependencia', 'dirección', 'direccion', 'área', 'area']);
        if (val) {
          const ok = fillInputByKeywords(['dependencia', 'dirección', 'area', 'gestión'], val);
          if (ok) {
            speakText(`Dependencia ${val} ingresada. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.20 Nombre / Visitante / Pasajero / Solicitante
      if (
        text.includes('nombre') ||
        text.includes('solicitante') ||
        (text.includes('visitante') && !text.includes('formulario') && !text.includes('agregar')) ||
        text.includes('pasajero')
      ) {
        const val = extractFieldValue(text, ['nombre completo', 'nombre', 'solicitante', 'visitante', 'pasajero']);
        if (val) {
          const capitalized = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const ok = fillInputByKeywords(['nombre completo', 'nombre', 'juan pérez', 'solicitante', 'viaja'], capitalized);
          if (ok) {
            speakText(`Nombre ${capitalized} ingresado. Diga siguiente para continuar.`);
            return;
          }
        }
      }

      // 5.21 Agregar elementos adicionales
      if (text.includes('agregar visitante') || text.includes('otro visitante')) {
        clickButtonByKeywords(['agregar otro visitante']);
        speakText('Nuevo visitante agregado.');
        return;
      }
      if (text.includes('agregar vehículo') || text.includes('agregar vehiculo') || text.includes('otro vehículo')) {
        clickButtonByKeywords(['agregar otro vehículo', 'agregar vehículo']);
        speakText('Nuevo vehículo agregado.');
        return;
      }

      // 5.22 Dictado directo sobre el campo actualmente enfocado (al usar "siguiente" o haber seleccionado el input)
      const activeEl = typeof document !== 'undefined' ? (document.activeElement as HTMLInputElement | HTMLTextAreaElement) : null;
      const targetInput = (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && !activeEl.closest('#accessibility-toolbar-modal'))
        ? activeEl
        : (lastActiveInputRef.current && typeof document !== 'undefined' && document.body.contains(lastActiveInputRef.current) ? lastActiveInputRef.current : null);

      if (targetInput) {
        const cleanedValue = cleanDictatedValue(text);
        if (cleanedValue && cleanedValue.length >= 1) {
          const fieldLabel = getFieldLabel(targetInput);
          let finalVal = cleanedValue;
          if (fieldLabel.toLowerCase().includes('documento') || fieldLabel.toLowerCase().includes('cédula')) {
            finalVal = cleanedValue.replace(/\s+/g, '').replace(/\D/g, '') || cleanedValue;
          } else if (fieldLabel.toLowerCase().includes('placa')) {
            finalVal = cleanedValue.toUpperCase().replace(/\s+/g, '').slice(0, 6);
          } else if (fieldLabel.toLowerCase().includes('nombre') || fieldLabel.toLowerCase().includes('funcionario')) {
            finalVal = cleanedValue.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          }
          setNativeDomInputValue(targetInput, finalVal);
          speakText(`Ingresado ${finalVal} en ${fieldLabel}. Diga siguiente para continuar, o repetir si se equivocó.`);
          return;
        }
      }
    }

    // 6. Navegación a módulos de servicios (solo si no estamos ya en ese formulario)
    if ((text.includes('visitante') || text.includes('formulario de visitantes') || text.includes('ingreso de visitantes')) && !pathname.includes('/requests/visitors')) {
      speakText('Abriendo formulario de Ingreso de Visitantes.');
      setTimeout(() => router.push('/requests/visitors'), 1000);
      return;
    }

    if ((text.includes('transporte') || text.includes('formulario de transporte') || text.includes('solicitar transporte')) && !pathname.includes('/requests/transport')) {
      speakText('Abriendo formulario de Transporte Institucional.');
      setTimeout(() => router.push('/requests/transport'), 1000);
      return;
    }

    if ((text.includes('mantenimiento') || text.includes('formulario de mantenimiento') || text.includes('reportar daño')) && !pathname.includes('/requests/maintenance')) {
      speakText('Abriendo formulario de Mantenimiento Locativo.');
      setTimeout(() => router.push('/requests/maintenance'), 1000);
      return;
    }

    if ((text.includes('sala') || text.includes('auditorio') || text.includes('formulario de salas') || text.includes('reservar sala')) && !pathname.includes('/requests/rooms')) {
      speakText('Abriendo formulario de Reserva de Salas y Auditorios.');
      setTimeout(() => router.push('/requests/rooms'), 1000);
      return;
    }

    if ((text.includes('parqueadero') || text.includes('estacionamiento') || text.includes('formulario de parqueadero')) && !pathname.includes('/requests/parking')) {
      speakText('Abriendo formulario de Parqueadero Institucional.');
      setTimeout(() => router.push('/requests/parking'), 1000);
      return;
    }

    if (text.includes('inicio') || text.includes('portal') || text.includes('dashboard') || text.includes('volver') || text.includes('regresar') || text.includes('menú principal')) {
      speakText('Regresando al Portal del Funcionario.');
      setTimeout(() => router.push('/dashboard'), 1000);
      return;
    }

    if (text.includes('salir') || text.includes('cerrar sesion') || text.includes('cerrar sesión')) {
      speakText('Cerrando sesión del sistema.');
      setTimeout(() => router.push('/'), 1000);
      return;
    }

    speakText(`Usted dijo: ${speechResult}. Diga la palabra ayuda para escuchar los comandos disponibles.`);
  };

  // Control por Micrófono Continuo (Asistente por Voz para ciegos en modo manos libres)
  const startVoiceAssistant = () => {
    stopSpeech();
    voiceActiveRef.current = true;
    setIsListening(true);
    setVoiceStatusText('🎙️ Micrófono activado. Te escucho...');

    if (typeof window === 'undefined' || (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window))) {
      fallbackVoicePrompt();
      return;
    }

    const initOrRestartRecognition = () => {
      if (!voiceActiveRef.current) return;

      // Si la síntesis de voz está hablando, posponer el reinicio del micrófono para no escucharse a sí misma
      if (isSpeakingRef.current) {
        if (restartVoiceTimeoutRef.current) clearTimeout(restartVoiceTimeoutRef.current);
        restartVoiceTimeoutRef.current = setTimeout(initOrRestartRecognition, 350);
        return;
      }

      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // Limpiar instancia previa
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onstart = null;
            recognitionRef.current.onresult = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.abort();
          } catch (e) {}
          recognitionRef.current = null;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-CO';
        recognition.continuous = true; // Escucha continua sin cerrarse tras una sola frase
        recognition.interimResults = true; // Feedback en tiempo real mientras el usuario habla
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          if (!voiceActiveRef.current) {
            try { recognition.abort(); } catch (e) {}
            return;
          }
          setIsListening(true);
          setVoiceStatusText('🎙️ Escuchando continuo. Te escucho...');
        };

        recognition.onresult = (event: any) => {
          if (!voiceActiveRef.current || isSpeakingRef.current) return;

          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          if (interim) {
            setVoiceStatusText(`Escuchando: "${interim.trim()}"`);
          }

          if (final.trim()) {
            const captured = final.trim();
            setVoiceStatusText(`Comando: "${captured}"`);
            handleVoiceTranscript(captured);
          }
        };

        recognition.onerror = (event: any) => {
          console.log('Speech recognition status:', event?.error);

          // Si el usuario ya desactivó el asistente, silenciar
          if (!voiceActiveRef.current) {
            setIsListening(false);
            return;
          }

          // Error de permisos denegados en el navegador
          if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
            voiceActiveRef.current = false;
            setIsListening(false);
            setVoiceStatusText('Permiso de micrófono no otorgado');
            showToast('Permiso de micrófono no otorgado en el navegador');
            speakText('No se otorgó permiso de acceso al micrófono en su navegador.');
            return;
          }

          // Silencio o timeout natural del navegador: auto-reiniciar invisiblemente
          if (event?.error === 'no-speech' || event?.error === 'network' || event?.error === 'aborted') {
            if (voiceActiveRef.current && !isSpeakingRef.current) {
              if (restartVoiceTimeoutRef.current) clearTimeout(restartVoiceTimeoutRef.current);
              restartVoiceTimeoutRef.current = setTimeout(initOrRestartRecognition, 300);
            }
            return;
          }

          // Otros errores transitorios
          if (voiceActiveRef.current) {
            if (restartVoiceTimeoutRef.current) clearTimeout(restartVoiceTimeoutRef.current);
            restartVoiceTimeoutRef.current = setTimeout(initOrRestartRecognition, 500);
          }
        };

        recognition.onend = () => {
          // El navegador finaliza recognition tras un tiempo de silencio o rotación de buffers.
          // SI EL ASISTENTE ESTÁ ACTIVO: auto-reiniciar de inmediato para mantenerlo activo permanentemente.
          if (voiceActiveRef.current) {
            setIsListening(true);
            if (!isSpeakingRef.current) {
              setVoiceStatusText('🎙️ Micrófono abierto...');
            }
            if (restartVoiceTimeoutRef.current) clearTimeout(restartVoiceTimeoutRef.current);
            restartVoiceTimeoutRef.current = setTimeout(initOrRestartRecognition, 200);
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn('Error al iniciar reconocimiento continuo:', err);
        if (voiceActiveRef.current) {
          if (restartVoiceTimeoutRef.current) clearTimeout(restartVoiceTimeoutRef.current);
          restartVoiceTimeoutRef.current = setTimeout(initOrRestartRecognition, 800);
        }
      }
    };

    initOrRestartRecognition();
  };

  const fallbackVoicePrompt = () => {
    speakText('El reconocimiento de voz por micrófono no está disponible en este navegador. Puede utilizar los controles del lector de pantalla o atajos de teclado.');
  };

  // Escuchador global de clics para lector de pantalla interactivo
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleDocumentClick = (e: MouseEvent) => {
      if (!interactiveReaderEnabled && activeProfile !== 'blind') return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // No interferir con los controles internos del panel de accesibilidad
      if (target.closest && (target.closest('.acc-panel-container') || target.closest('[data-acc-panel]'))) {
        return;
      }

      let textToSpeak = '';

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const fieldName = target.getAttribute('aria-label') || target.placeholder || target.name || 'Campo de texto';
        const val = target.value ? `con valor: ${target.value}` : 'vacío';
        textToSpeak = `Campo: ${fieldName}, ${val}`;
      } else {
        const interactiveParent = target.closest('button, [role="button"], a, h1, h2, h3, h4, p, span');
        const el = interactiveParent || target;

        const role = el.getAttribute('role') || (el.tagName === 'BUTTON' ? 'botón' : el.tagName.startsWith('H') ? 'título' : '');
        const ariaLabel = el.getAttribute('aria-label');
        const rawText = ariaLabel || (el as HTMLElement).innerText || el.textContent || '';
        const cleaned = rawText.replace(/\s+/g, ' ').trim();
        if (cleaned) {
          const shortText = cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned;
          textToSpeak = role ? `${role}: ${shortText}` : shortText;
        }
      }

      if (textToSpeak) {
        speakText(textToSpeak);
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [interactiveReaderEnabled, activeProfile, speechRate]);

  // Escuchador global de teclado para ciegos (Tecla 'V' = Voz, Tecla 'M' = Micrófono, Esc = Silencio)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
      );

      // Tecla Escape: Silenciar inmediatamente y apagar asistente
      if (e.key === 'Escape') {
        stopSpeech();
        stopVoiceAssistant();
        return;
      }

      // Tecla 'V' (o Alt + V): Alternar Lector de Voz
      if ((e.key === 'v' || e.key === 'V' || (e.altKey && (e.key === 'v' || e.key === 'V'))) && !isInput) {
        e.preventDefault();
        toggleVoiceAssistant();
        return;
      }

      // Tecla 'M' (o Alt + M): Alternar Micrófono / Asistente por Voz
      if ((e.key === 'm' || e.key === 'M' || (e.altKey && (e.key === 'm' || e.key === 'M'))) && !isInput) {
        e.preventDefault();
        if (voiceActiveRef.current) {
          stopVoiceAssistant();
          stopSpeech();
          showToast('Asistente por voz: DESACTIVADO');
          speakText('Asistente por voz desactivado.');
        } else {
          showToast('Asistente por voz: ACTIVADO');
          startVoiceAssistant();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeProfile, pathname, interactiveReaderEnabled, isSpeaking, speechRate]);

  // Anunciar nueva pantalla cuando cambia la ruta si el lector o el asistente de voz continuo está activo
  useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname;
      if (interactiveReaderEnabled || activeProfile === 'blind' || voiceActiveRef.current) {
        setTimeout(() => {
          readCurrentPage();
        }, 500);
      }
    }
  }, [pathname, interactiveReaderEnabled, activeProfile, isListening]);

  return (
    <>
      {/* Banner Accesible Superior para personas con Discapacidad Visual / Ciegos */}
      <View style={[
        styles.accessibleScreenReaderBanner,
        isMobile && styles.accessibleScreenReaderBannerMobile
      ]}>
        {isMobile && bannerMinimized ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Expandir lector de voz"
            style={[
              styles.accessibleBannerBtnMinimized,
              (interactiveReaderEnabled || activeProfile === 'blind') && styles.accessibleBannerBtnActive
            ]}
            onPress={() => setBannerMinimized(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="volume-high" size={13} color="#FACC15" />
            <Text style={styles.accessibleBannerTextMinimized}>
              {(interactiveReaderEnabled || activeProfile === 'blind') ? 'Voz On' : 'Voz'}
            </Text>
            <Ionicons name="chevron-down" size={11} color="#94A3B8" />
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.accessibleBannerBtn,
              isMobile && styles.accessibleBannerBtnMobile,
              (interactiveReaderEnabled || activeProfile === 'blind') && styles.accessibleBannerBtnActive
            ]}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                (interactiveReaderEnabled || activeProfile === 'blind')
                  ? 'Lector de voz activo. Presione para pausar'
                  : 'Activar asistente de voz y lector de pantalla para personas con discapacidad visual'
              }
              accessibilityHint={isMobile ? 'Toca para encender o pausar la voz' : 'Presione la tecla V en cualquier momento para activar o pausar'}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}
              onPress={toggleVoiceAssistant}
              activeOpacity={0.8}
            >
              <Ionicons name="volume-high" size={isMobile ? 14 : 16} color="#FFFFFF" />
              <Text
                style={[
                  styles.accessibleBannerText,
                  isMobile && styles.accessibleBannerTextMobile
                ]}
                numberOfLines={1}
              >
                {isMobile
                  ? ((interactiveReaderEnabled || activeProfile === 'blind')
                    ? '🔊 Voz Activa'
                    : '🔊 Voz / Lector')
                  : ((interactiveReaderEnabled || activeProfile === 'blind')
                    ? '🔊 VOZ ACTIVA (Pulse tecla V para pausar)'
                    : '🔊 VOZ Y LECTOR PARA CIEGOS (Pulse tecla V o clic aquí)')
                }
              </Text>
            </TouchableOpacity>

            {/* En móvil: Botón para minimizar y despejar la vista de atrás */}
            {isMobile && (
              <TouchableOpacity
                onPress={() => setBannerMinimized(true)}
                style={styles.bannerMinimizeBtn}
                accessibilityRole="button"
                accessibilityLabel="Minimizar barra de voz para ver pantalla"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={13} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Botón flotante lateral movible de Accesibilidad (Drag & Drop tipo burbuja flotante como el chat) */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: isSmallScreen ? 145 : 100,
          right: isSmallScreen ? 16 : 24,
          zIndex: 9999,
          transform: [{ translateX: buttonPan.x }, { translateY: buttonPan.y }],
        }}
        pointerEvents="box-none"
        {...buttonPanResponder.panHandlers}
      >
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          onPress={(e: any) => {
            if (isDraggingBtnRef.current) {
              if (e && e.preventDefault) e.preventDefault();
              return;
            }
            setOpenPanel(true);
          }}
          // @ts-ignore
          onClick={(e: any) => {
            if (isDraggingBtnRef.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          accessibilityLabel="Abrir menú de accesibilidad"
          activeOpacity={0.88}
          // @ts-ignore
          onMouseEnter={() => setIsBtnHovered(true)}
          // @ts-ignore
          onMouseLeave={() => setIsBtnHovered(false)}
          style={{
            backgroundColor: '#1E40AF',
            opacity: isBtnHovered ? 1.0 : 0.68,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isSmallScreen ? 0 : 8,
            paddingHorizontal: isSmallScreen ? 0 : 16,
            paddingVertical: isSmallScreen ? 0 : 10,
            width: isSmallScreen ? 50 : undefined,
            height: isSmallScreen ? 50 : 46,
            borderRadius: isSmallScreen ? 25 : 23,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isBtnHovered ? 0.45 : 0.25,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            ...(Platform.OS === 'web' ? {
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'opacity 0.25s ease, box-shadow 0.2s ease, transform 0.2s ease',
            } as any : {}),
          }}
        >
          <Ionicons name="accessibility" size={isSmallScreen ? 24 : 22} color="#FFFFFF" />
          {!isSmallScreen && (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: '900',
                letterSpacing: 0.3,
              }}
            >
              Accesibilidad
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Toast informativo de estado */}
      {toastMessage ? (
        <View style={styles.toastContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Popover Flotante de Lengua de Señas Colombiana (LSC) - Renderizado vía Portal para estar siempre encima de cualquier modal */}
      {(() => {
        if (!lscActive || !lscPopover.visible || !lscPopover.term) return null;

        const popoverElement = (
          <View
            style={[
              styles.lscFloatingPopover,
              {
                top: lscPopover.top,
                left: lscPopover.left,
                zIndex: 2147483647,
              }
            ]}
            // @ts-ignore
            dataSet={{ lscPopover: 'true' }}
            onMouseEnter={() => {
              if (hideLscTimerRef.current) {
                clearTimeout(hideLscTimerRef.current);
                hideLscTimerRef.current = null;
              }
            }}
            onMouseLeave={() => {
              if (hideLscTimerRef.current) clearTimeout(hideLscTimerRef.current);
              hideLscTimerRef.current = setTimeout(() => {
                setLscPopover(p => ({ ...p, visible: false }));
              }, 20000); // 20 segundos tras apartar el ratón
            }}
          >
            {/* Header */}
            <View style={styles.lscPopoverHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Text style={{ fontSize: 16 }}>🖐️</Text>
                <Text style={styles.lscPopoverTitle} numberOfLines={1}>
                  {lscPopover.term.title}
                </Text>
              </View>
              {/* Botón Cerrar (se retiró el fijado a solicitud del usuario) */}
              <TouchableOpacity
                onPress={() => {
                  if (hideLscTimerRef.current) clearTimeout(hideLscTimerRef.current);
                  setLscPopover(prev => ({ ...prev, visible: false }));
                }}
                style={styles.lscPopoverCloseBtn}
                accessibilityLabel="Cerrar video de señas"
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Video Player con animación cinética y props diferenciados para cada término */}
            <View style={styles.lscPopoverVideoBox}>
              {Platform.OS === 'web' && <LSCVideoPlayer term={lscPopover.term} />}
            </View>

            {/* Info LSC */}
            <View style={styles.lscPopoverDetails}>
              <View style={styles.lscGlosaBadge}>
                <Text style={styles.lscGlosaTitle}>Gramática LSC (Glosa):</Text>
                <Text style={styles.lscGlosaText}>{lscPopover.term.lscWords}</Text>
              </View>

              <Text style={styles.lscGestureText}>
                {lscPopover.term.videoHint}
              </Text>

              <Text style={styles.lscDefText}>
                {lscPopover.term.definition}
              </Text>
            </View>
          </View>
        );

        if (Platform.OS === 'web' && ReactDOMPortal && typeof document !== 'undefined' && document.body) {
          return ReactDOMPortal.createPortal(popoverElement, document.body);
        }
        return popoverElement;
      })()}

      {/* Barra de Estado LSC Activo en la parte inferior */}
      {lscActive && (
        <View style={styles.lscActiveDock}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={styles.lscDockPulseDot} />
            <View>
              <Text style={styles.lscDockTitle}>🖐️ Intérprete LSC Activo</Text>
              <Text style={styles.lscDockSub}>Pasa el cursor o toca cualquier opción para ver la seña en video</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.lscDockGlossaryBtn}
              onPress={() => setDictionaryVisible(true)}
            >
              <Ionicons name="book-outline" size={15} color="#FFFFFF" />
              <Text style={styles.lscDockGlossaryText}>Glosario</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.lscDockCloseBtn}
              onPress={() => {
                setLscActive(false);
                setActiveProfile('none');
                setLscPopover({ visible: false, term: null, top: 0, left: 0 });
                showToast('Perfil Discapacidad Auditiva: DESACTIVADO');
              }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Widget Asistente de Voz Activo para Ciegos (Modo Manos Libres Continuo) */}
      {(() => {
        if (!isListening && !voiceActiveRef.current) return null;

        const widgetElement = (
          <View style={styles.voiceAssistantWidget}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.voiceMicPulse}>
                  <Ionicons name="mic" size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.voiceAssistantTitle}>Asistente de Voz Continuo</Text>
                  <Text style={styles.voiceAssistantBadge}>🎙️ MANOS LIBRES ACTIVO</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.voiceCloseBtn}
                onPress={stopVoiceAssistant}
                accessibilityLabel="Desactivar asistente de voz"
              >
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.voiceStatusBox}>
              <Text style={styles.voiceAssistantSub} numberOfLines={2}>
                {voiceStatusText || 'Te escucho... Diga cualquier comando'}
              </Text>
            </View>

            <View style={styles.voiceHintsRow}>
              {(pathname.includes('/requests/')
                ? [
                    { label: '⏭️ Siguiente', cmd: 'siguiente' },
                    { label: '🔄 Repetir', cmd: 'repetir' },
                    { label: '✏️ Corregir', cmd: 'corregir' },
                    { label: '🔘 Cambiar / Marcar', cmd: 'cambiar' },
                    { label: '⚠️ ¿Qué falta?', cmd: 'qué falta' },
                    { label: '✍️ En nombre...', cmd: 'en nombre juan carlos' },
                    { label: '✅ Acepto términos', cmd: 'acepto términos' },
                    { label: '🚀 Radicar', cmd: 'radicar solicitud' },
                    { label: '❓ Ayuda', cmd: 'ayuda' }
                  ]
                : pathname.includes('/dashboard/requests')
                ? [
                    { label: 'Pendientes', cmd: 'filtrar pendientes' },
                    { label: 'Aprobadas', cmd: 'filtrar aprobadas' },
                    { label: 'Resumen', cmd: 'resumen' },
                    { label: 'Nueva solicitud', cmd: 'nueva solicitud' },
                    { label: 'Ayuda', cmd: 'ayuda' }
                  ]
                : [
                    { label: 'Visitantes', cmd: 'visitantes' },
                    { label: 'Transporte', cmd: 'transporte' },
                    { label: 'Salas', cmd: 'salas' },
                    { label: 'Mantenimiento', cmd: 'mantenimiento' },
                    { label: 'Ayuda', cmd: 'ayuda' }
                  ]
              ).map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.voiceHintChip}
                  onPress={() => handleVoiceTranscript(item.cmd)}
                >
                  <Text style={styles.voiceHintChipText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 2 }}>
              <Text style={styles.voiceKeyboardHint}>
                Atajo: Presione M para pausar • Esc para silenciar
              </Text>
              <TouchableOpacity style={styles.stopVoiceBtn} onPress={stopVoiceAssistant}>
                <Text style={styles.stopVoiceText}>Apagar</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

        if (Platform.OS === 'web' && ReactDOMPortal && typeof document !== 'undefined' && document.body) {
          return ReactDOMPortal.createPortal(widgetElement, document.body);
        }
        return widgetElement;
      })()}

      {/* Modal / Panel Principal de Accesibilidad */}
      <Modal visible={panelOpen} transparent animationType="slide" onRequestClose={() => setOpenPanel(false)}>
        <View style={[styles.modalOverlay, isMobile && styles.modalOverlayMobile]}>
          <View style={[styles.panelSheet, isMobile && styles.panelSheetMobile]}>
            {/* Header */}
            <View style={[styles.panelHeader, isMobile && styles.panelHeaderMobile]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: isMobile ? 8 : 10, flex: 1, marginRight: 8 }}>
                <View style={[styles.panelIconBg, isMobile && styles.panelIconBgMobile]}>
                  <Ionicons name="accessibility" size={isMobile ? 20 : 24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.panelTitle, isMobile && styles.panelTitleMobile]} numberOfLines={1}>
                    Barra de Accesibilidad
                  </Text>
                  <Text style={[styles.panelSub, isMobile && styles.panelSubMobile]} numberOfLines={1}>
                    Ajustes de Inclusión y Discapacidad
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setOpenPanel(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={isMobile ? 24 : 26} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.panelBody, isMobile && styles.panelBodyMobile]} showsVerticalScrollIndicator={false}>
              {/* SECCIÓN 1: PERFILES DE DISCAPACIDAD */}
              <Text style={styles.sectionHeaderTitle}>1. PERFILES DE ACCESIBILIDAD</Text>

              {/* Perfil Auditivo / Sordera */}
              <TouchableOpacity
                style={[styles.profileCard, activeProfile === 'deaf' && styles.profileCardActive]}
                onPress={toggleDeafProfile}
              >
                <View style={[styles.profileRow, isMobile && styles.profileRowMobile]}>
                  <View style={[styles.profileIconBox, isMobile && styles.profileIconBoxMobile, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="ear-outline" size={isMobile ? 20 : 24} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.profileName, isMobile && styles.profileNameMobile]}>Discapacidad Auditiva / Sordera</Text>
                    <Text style={[styles.profileDesc, isMobile && styles.profileDescMobile]}>Activa el intérprete en Lengua de Señas Colombiana (LSC) y el glosario de términos.</Text>
                  </View>
                  <View style={[styles.toggleBadge, isMobile && styles.toggleBadgeMobile, activeProfile === 'deaf' ? styles.toggleBadgeOn : styles.toggleBadgeOff]}>
                    <Text style={[styles.toggleBadgeText, isMobile && styles.toggleBadgeTextMobile]}>
                      {activeProfile === 'deaf' ? (isMobile ? 'ACTIVO' : 'ACTIVADO') : (isMobile ? 'INACTIVO' : 'DESACTIVADO')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Perfil Ceguera / Visual */}
              <TouchableOpacity
                style={[styles.profileCard, activeProfile === 'blind' && styles.profileCardActive]}
                onPress={toggleBlindProfile}
              >
                <View style={[styles.profileRow, isMobile && styles.profileRowMobile]}>
                  <View style={[styles.profileIconBox, isMobile && styles.profileIconBoxMobile, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="eye-outline" size={isMobile ? 20 : 24} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.profileName, isMobile && styles.profileNameMobile]}>Ceguera / Discapacidad Visual</Text>
                    <Text style={[styles.profileDesc, isMobile && styles.profileDescMobile]}>Lector de pantalla por voz, alto contraste, aumento de letra y comandos por voz.</Text>
                  </View>
                  <View style={[styles.toggleBadge, isMobile && styles.toggleBadgeMobile, activeProfile === 'blind' ? styles.toggleBadgeOn : styles.toggleBadgeOff]}>
                    <Text style={[styles.toggleBadgeText, isMobile && styles.toggleBadgeTextMobile]}>
                      {activeProfile === 'blind' ? (isMobile ? 'ACTIVO' : 'ACTIVADO') : (isMobile ? 'INACTIVO' : 'DESACTIVADO')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Perfil Daltonismo */}
              <TouchableOpacity
                style={[styles.profileCard, activeProfile === 'colorblind' && styles.profileCardActive]}
                onPress={toggleColorblindProfile}
              >
                <View style={[styles.profileRow, isMobile && styles.profileRowMobile]}>
                  <View style={[styles.profileIconBox, isMobile && styles.profileIconBoxMobile, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="color-palette-outline" size={isMobile ? 20 : 24} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.profileName, isMobile && styles.profileNameMobile]}>Daltonismo</Text>
                    <Text style={[styles.profileDesc, isMobile && styles.profileDescMobile]}>Aplica filtro monocromo / escala de grises para mejorar diferenciación de colores.</Text>
                  </View>
                  <View style={[styles.toggleBadge, isMobile && styles.toggleBadgeMobile, activeProfile === 'colorblind' ? styles.toggleBadgeOn : styles.toggleBadgeOff]}>
                    <Text style={[styles.toggleBadgeText, isMobile && styles.toggleBadgeTextMobile]}>
                      {activeProfile === 'colorblind' ? (isMobile ? 'ACTIVO' : 'ACTIVADO') : (isMobile ? 'INACTIVO' : 'DESACTIVADO')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Perfil Dislexia */}
              <TouchableOpacity
                style={[styles.profileCard, activeProfile === 'dyslexia' && styles.profileCardActive]}
                onPress={toggleDyslexiaProfile}
              >
                <View style={[styles.profileRow, isMobile && styles.profileRowMobile]}>
                  <View style={[styles.profileIconBox, isMobile && styles.profileIconBoxMobile, { backgroundColor: '#F5F3FF' }]}>
                    <Ionicons name="text-outline" size={isMobile ? 20 : 24} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.profileName, isMobile && styles.profileNameMobile]}>Dislexia</Text>
                    <Text style={[styles.profileDesc, isMobile && styles.profileDescMobile]}>Habilita fuente de fácil lectura con interlineado y espacio entre letras optimizado.</Text>
                  </View>
                  <View style={[styles.toggleBadge, isMobile && styles.toggleBadgeMobile, activeProfile === 'dyslexia' ? styles.toggleBadgeOn : styles.toggleBadgeOff]}>
                    <Text style={[styles.toggleBadgeText, isMobile && styles.toggleBadgeTextMobile]}>
                      {activeProfile === 'dyslexia' ? (isMobile ? 'ACTIVO' : 'ACTIVADO') : (isMobile ? 'INACTIVO' : 'DESACTIVADO')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* SECCIÓN 2: HERRAMIENTAS VISUALES Y SONORAS */}
              <Text style={styles.sectionHeaderTitle}>2. AJUSTES VISUALES Y LECTOR DE VOZ</Text>

              {/* Controles de Lector de Voz / Micrófono */}
              <View style={styles.toolsGroupCard}>
                <Text style={styles.toolsGroupTitle}>🔊 Lectores y Comandos de Voz para Ciegos</Text>
                <Text style={styles.toolsGroupSubtitle}>
                  {isMobile ? 'Pulsa Escuchar Pantalla para leer el contenido o usa el Asistente por Voz.' : 'Atajo rápido: Presione la tecla V en su teclado para encender o pausar la voz sin necesidad de buscar botones.'}
                </Text>

                <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, isSpeaking && styles.actionBtnActive, isMobile && { width: '100%' }]}
                    onPress={isSpeaking ? stopSpeech : readCurrentPage}
                    accessibilityRole="button"
                    accessibilityLabel="Escuchar página completa"
                  >
                    <Ionicons name={isSpeaking ? "stop" : "volume-high"} size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>{isSpeaking ? "Detener Lectura" : "Escuchar Pantalla"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      isListening && styles.actionBtnActive,
                      { backgroundColor: isListening ? '#DC2626' : '#2563EB' },
                      isMobile && { width: '100%' }
                    ]}
                    onPress={isListening ? stopVoiceAssistant : startVoiceAssistant}
                    accessibilityRole="button"
                    accessibilityLabel="Asistente por voz con micrófono continuo"
                  >
                    <Ionicons name={isListening ? "mic-off" : "mic"} size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>{isListening ? "Apagar Asistente" : "Asistente por Voz"}</Text>
                  </TouchableOpacity>
                </View>

                {/* Opción: Lector Interactivo por Clic en Letras/Textos */}
                <TouchableOpacity
                  style={[styles.checkOptionRow, { marginTop: 12 }]}
                  onPress={() => {
                    const next = !interactiveReaderEnabled;
                    setInteractiveReaderEnabled(next);
                    if (next) {
                      showToast('Lector interactivo por clic: ACTIVADO');
                      speakText('Lector interactivo activado. Haga clic sobre cualquier texto, botón o letra para escucharlo.');
                    } else {
                      showToast('Lector interactivo por clic: DESACTIVADO');
                      stopSpeech();
                    }
                  }}
                >
                  <Ionicons name={interactiveReaderEnabled ? "checkbox" : "square-outline"} size={22} color="#1E40AF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkOptionText}>Lector interactivo al hacer clic o tocar letras y textos</Text>
                    <Text style={styles.checkOptionSub}>Al pulsar cualquier palabra, título o botón, la voz leerá lo que dice.</Text>
                  </View>
                </TouchableOpacity>

                {/* Selector de Velocidad de Voz */}
                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    Velocidad de Lectura: {speechRate === 0.85 ? 'Lenta (0.8x)' : speechRate === 1.2 ? 'Rápida (1.2x)' : 'Normal (1.0x)'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.zoomBtn, speechRate === 0.85 && styles.zoomBtnActive]}
                      onPress={() => setSpeechRate(0.85)}
                    >
                      <Text style={[styles.zoomBtnText, speechRate === 0.85 && styles.zoomBtnTextActive]}>Lenta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.zoomBtn, speechRate === 1.0 && styles.zoomBtnActive]}
                      onPress={() => setSpeechRate(1.0)}
                    >
                      <Text style={[styles.zoomBtnText, speechRate === 1.0 && styles.zoomBtnTextActive]}>Normal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.zoomBtn, speechRate === 1.2 && styles.zoomBtnActive]}
                      onPress={() => setSpeechRate(1.2)}
                    >
                      <Text style={[styles.zoomBtnText, speechRate === 1.2 && styles.zoomBtnTextActive]}>Rápida</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Controles de Zoom, Ampliación Visual y Lupa de Pantalla */}
              <View style={styles.toolsGroupCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.toolsGroupTitle}>🔤 Tipografía y Zoom de Toda la Página</Text>
                  <View style={styles.zoomBadge}>
                    <Text style={styles.zoomBadgeText}>{Math.round(fontSizeMultiplier * 100)}%</Text>
                  </View>
                </View>
                <Text style={styles.toolsGroupSubtitle}>
                  Ampliación progresiva de toda la interfaz (textos, botones, imágenes y formularios) sin romper el diseño.
                </Text>

                {/* Botones Progresivos A-, 100%, +A */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <Text style={{ fontSize: 13, color: '#334155', fontWeight: '700' }}>
                    Escala: {Math.round(fontSizeMultiplier * 100)}%
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.zoomBtn, fontSizeMultiplier <= 1.0 && styles.zoomBtnDisabled]}
                      onPress={() => {
                        const currentIdx = ZOOM_LEVELS.findIndex(z => Math.abs(z - fontSizeMultiplier) < 0.05);
                        const nextIdx = currentIdx > 0 ? currentIdx - 1 : 0;
                        setFontSizeMultiplier(ZOOM_LEVELS[nextIdx]);
                      }}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Disminuir tamaño del texto"
                      accessibilityHint="Disminuye el tamaño de toda la página"
                    >
                      <Text style={styles.zoomBtnText}>A -</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.zoomBtn, fontSizeMultiplier === 1.0 && styles.zoomBtnActive]}
                      onPress={() => setFontSizeMultiplier(1.0)}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Restablecer tamaño"
                      accessibilityHint="Regresa la página al tamaño estándar 100%"
                    >
                      <Text style={[styles.zoomBtnText, fontSizeMultiplier === 1.0 && styles.zoomBtnTextActive]}>100%</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.zoomBtn, fontSizeMultiplier >= 3.0 && styles.zoomBtnDisabled]}
                      onPress={() => {
                        const currentIdx = ZOOM_LEVELS.findIndex(z => Math.abs(z - fontSizeMultiplier) < 0.05);
                        const nextIdx = currentIdx !== -1 && currentIdx < ZOOM_LEVELS.length - 1 ? currentIdx + 1 : (currentIdx === -1 ? 1 : currentIdx);
                        setFontSizeMultiplier(ZOOM_LEVELS[nextIdx]);
                      }}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Aumentar tamaño del texto"
                      accessibilityHint="Aumenta progresivamente el tamaño de toda la página"
                    >
                      <Text style={styles.zoomBtnText}>+ A</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Escalas Rápidas en Chips: 100%, 110%, 125%, 150%, 175%, 200%, 250%, 300% */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 2 }}>
                    {ZOOM_LEVELS.map((scale) => (
                      <TouchableOpacity
                        key={scale}
                        style={[
                          styles.scaleChip,
                          Math.abs(fontSizeMultiplier - scale) < 0.02 && styles.scaleChipActive
                        ]}
                        onPress={() => setFontSizeMultiplier(scale)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Escalar página a ${Math.round(scale * 100)}%`}
                      >
                        <Text style={[
                          styles.scaleChipText,
                          Math.abs(fontSizeMultiplier - scale) < 0.02 && styles.scaleChipTextActive
                        ]}>
                          {Math.round(scale * 100)}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Selector de Tema Claro / Tema Oscuro para Toda la Página */}
              <View style={styles.toolsGroupCard}>
                <Text style={styles.toolsGroupTitle}>🎨 Paleta de Color y Tema (Claro / Oscuro)</Text>
                <Text style={styles.toolsGroupSubtitle}>
                  Selecciona el tema visual para toda la página web según tu preferencia de iluminación.
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.colorModeChip, colorMode === 'light' && styles.colorModeChipActive]}
                    onPress={() => {
                      setColorMode('light');
                      showToast('☀️ Modo claro activado');
                    }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Modo claro"
                    accessibilityHint="Aplica el tema claro a toda la página"
                  >
                    <Text style={[styles.colorModeText, colorMode === 'light' && styles.colorModeTextActive]}>
                      ☀️ Modo claro
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.colorModeChip, colorMode === 'dark' && styles.colorModeChipActive]}
                    onPress={() => {
                      setColorMode('dark');
                      showToast('🌙 Modo oscuro activado');
                    }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Modo oscuro"
                    accessibilityHint="Aplica el tema oscuro a toda la página"
                  >
                    <Text style={[styles.colorModeText, colorMode === 'dark' && styles.colorModeTextActive]}>
                      🌙 Modo oscuro
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.colorModeChip, colorMode === 'grayscale' && styles.colorModeChipActive]}
                    onPress={() => {
                      setColorMode('grayscale');
                      showToast('Escala de grises activada');
                    }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Escala de grises"
                    accessibilityHint="Aplica escala de grises para daltonismo"
                  >
                    <Text style={[styles.colorModeText, colorMode === 'grayscale' && styles.colorModeTextActive]}>
                      Escala de Grises
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.colorModeChip, colorMode === 'normal' && styles.colorModeChipActive]}
                    onPress={() => {
                      setColorMode('normal');
                      showToast('Tema original restablecido');
                    }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Tema original"
                    accessibilityHint="Restablece la paleta original de la página"
                  >
                    <Text style={[styles.colorModeText, colorMode === 'normal' && styles.colorModeTextActive]}>
                      Original
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Subrayar Enlaces */}
              <TouchableOpacity
                style={styles.checkOptionRow}
                onPress={() => setUnderlineLinks(!underlineLinks)}
              >
                <Ionicons name={underlineLinks ? "checkbox" : "square-outline"} size={22} color="#2563EB" />
                <Text style={styles.checkOptionText}>Subrayar todos los enlaces y botones interactivos</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.panelFooter, isMobile && styles.panelFooterMobile]}>
              <TouchableOpacity
                style={[styles.resetBtn, isMobile && styles.footerBtnMobile]}
                onPress={() => {
                  setActiveProfile('none');
                  setFontSizeMultiplier(1);
                  setColorMode('normal');
                  setUnderlineLinks(false);
                  setDyslexiaMode(false);
                  setLscActive(false);
                  stopSpeech();
                  try {
                    localStorage.removeItem('sasge_zoom_scale');
                    localStorage.removeItem('sasge_color_mode');
                  } catch (e) {}
                  showToast('Configuración de accesibilidad restablecida');
                }}
              >
                <Ionicons name="refresh" size={16} color="#64748B" />
                <Text style={styles.resetBtnText}>{isMobile ? 'Restablecer' : 'Restablecer Todo'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                style={[styles.closeBtn, isMobile && styles.footerBtnMobile]}
                onPress={() => setOpenPanel(false)}
                accessibilityLabel="Aplicar y Cerrar"
              >
                <Text style={styles.closeBtnText}>Aplicar y Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Diccionario de Términos para Personas Sordas (LSC) */}
      <Modal visible={dictionaryVisible} transparent animationType="fade" onRequestClose={() => setDictionaryVisible(false)}>
        <View style={[styles.dictionaryOverlay, isMobile && styles.dictionaryOverlayMobile]}>
          <View style={[styles.dictionarySheet, isMobile && styles.dictionarySheetMobile]}>
            <View style={[styles.dictionaryHeader, isMobile && styles.dictionaryHeaderMobile]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: isMobile ? 20 : 24 }}>📖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dictionaryTitle, isMobile && styles.dictionaryTitleMobile]} numberOfLines={1}>
                    Glosario Personas Sordas
                  </Text>
                  <Text style={[styles.dictionarySub, isMobile && styles.dictionarySubMobile]} numberOfLines={1}>
                    Definiciones y señas LSC
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDictionaryVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={isMobile ? 22 : 24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: isMobile ? 12 : 18, gap: isMobile ? 10 : 14 }}>
              {DICTIONARY_TERMS.map((item, idx) => (
                <View key={idx} style={[styles.termCard, isMobile && styles.termCardMobile]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.termName, isMobile && styles.termNameMobile, { flex: 1 }]}>{item.term}</Text>
                    <TouchableOpacity
                      style={[styles.termPlayBtn, isMobile && styles.termPlayBtnMobile]}
                      onPress={() => {
                        const matched = LSC_DICTIONARY.find(t => t.title.toLowerCase().includes(item.term.toLowerCase()) || item.term.toLowerCase().includes(t.title.toLowerCase())) || LSC_DICTIONARY[0];
                        setLscPopover({
                          visible: true,
                          term: matched,
                          top: 80,
                          left: Math.max(16, (typeof window !== 'undefined' ? window.innerWidth / 2 - 160 : 20)),
                        });
                        setDictionaryVisible(false);
                      }}
                    >
                      <Ionicons name="play" size={isMobile ? 10 : 12} color="#FFFFFF" />
                      <Text style={[styles.termPlayBtnText, isMobile && styles.termPlayBtnTextMobile]}>Ver Seña</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.termDef, isMobile && styles.termDefMobile]}>{item.definition}</Text>
                  <View style={[styles.termLscHintBox, isMobile && styles.termLscHintBoxMobile]}>
                    <Text style={[styles.termLscHintText, isMobile && styles.termLscHintTextMobile]}>{item.lscHint}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.dictionaryCloseBtn, isMobile && styles.dictionaryCloseBtnMobile]} onPress={() => setDictionaryVisible(false)}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: isMobile ? 13 : 14 }}>Entendido / Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    zIndex: 10000,
    backgroundColor: '#0F172A',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  lscFloatingPopover: {
    position: 'fixed' as any,
    zIndex: 2147483647,
    width: 320,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
  },
  lscPopoverHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lscPopoverTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  lscPopoverCloseBtn: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  lscPopoverVideoBox: {
    padding: 10,
    backgroundColor: '#0A0F1D',
  },
  lscPopoverDetails: {
    padding: 12,
    backgroundColor: '#0F172A',
    gap: 8,
  },
  lscGlosaBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.4)',
  },
  lscGlosaTitle: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  lscGlosaText: {
    color: '#FACC15',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  lscGestureText: {
    color: '#E2E8F0',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  lscDefText: {
    color: '#93C5FD',
    fontSize: 10,
    lineHeight: 14,
  },
  lscActiveDock: {
    position: 'fixed' as any,
    bottom: 16,
    left: 16,
    zIndex: 99999,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  lscDockPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  lscDockTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  lscDockSub: {
    color: '#94A3B8',
    fontSize: 10,
  },
  lscDockGlossaryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lscDockGlossaryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  lscDockCloseBtn: {
    padding: 2,
  },
  voiceAssistantWidget: {
    position: 'fixed' as any,
    top: 20,
    left: 16,
    right: 16,
    maxWidth: 420,
    marginHorizontal: 'auto',
    alignSelf: 'center',
    zIndex: 2147483647,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  voiceMicPulse: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  voiceAssistantTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  voiceAssistantBadge: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  voiceCloseBtn: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
  },
  voiceStatusBox: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  voiceAssistantSub: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  voiceHintsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    width: '100%',
  },
  voiceHintChip: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  voiceHintChipText: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '700',
  },
  voiceKeyboardHint: {
    color: '#94A3B8',
    fontSize: 9.5,
    flex: 1,
    fontWeight: '600',
  },
  stopVoiceBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  stopVoiceText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  panelSheet: {
    width: Platform.OS === 'web' ? 460 : '90%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  panelHeader: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  panelSub: {
    fontSize: 11,
    color: '#64748B',
  },
  panelBody: {
    padding: 20,
    gap: 16,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#1E40AF',
    marginTop: 6,
  },
  profileCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  profileCardActive: {
    borderColor: '#1E40AF',
    backgroundColor: '#EFF6FF',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  profileDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  toggleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toggleBadgeOn: {
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  toggleBadgeOff: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
  },
  toggleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  toolsGroupCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toolsGroupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#A9301E',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnActive: {
    backgroundColor: '#DC2626',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  zoomBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  zoomBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  colorModeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  colorModeChipActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  colorModeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  colorModeTextActive: {
    color: '#FFFFFF',
  },
  checkOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checkOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  panelFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  dictionaryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dictionarySheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  dictionaryHeader: {
    padding: 18,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dictionaryTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  dictionarySub: {
    fontSize: 11,
    color: '#64748B',
  },
  termCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  termName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E40AF',
  },
  termDef: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  termLscHintBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 8,
    marginTop: 4,
  },
  termLscHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  termPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  termPlayBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  dictionaryCloseBtn: {
    backgroundColor: '#1E40AF',
    paddingVertical: 14,
    alignItems: 'center',
  },
  accessibleScreenReaderBanner: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    pointerEvents: 'box-none',
  },
  accessibleBannerBtn: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#FACC15',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  accessibleBannerBtnActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#38BDF8',
  },
  accessibleBannerText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  toolsGroupSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  checkOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  zoomBtnActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  zoomBtnTextActive: {
    color: '#FFFFFF',
  },
  zoomBadge: {
    backgroundColor: '#1E40AF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  zoomBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  zoomBtnDisabled: {
    opacity: 0.35,
  },
  scaleChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleChipActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  scaleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  scaleChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  modalOverlayMobile: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 0,
  },
  panelSheetMobile: {
    width: '100%',
    maxWidth: '100%',
    height: '94%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  panelHeaderMobile: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  panelIconBgMobile: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  panelTitleMobile: {
    fontSize: 15,
  },
  panelSubMobile: {
    fontSize: 10.5,
  },
  panelBodyMobile: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    paddingBottom: 30,
  },
  profileRowMobile: {
    gap: 10,
  },
  profileIconBoxMobile: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  profileNameMobile: {
    fontSize: 13,
  },
  profileDescMobile: {
    fontSize: 10.5,
    lineHeight: 15,
  },
  toggleBadgeMobile: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  toggleBadgeTextMobile: {
    fontSize: 9,
  },
  panelFooterMobile: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  footerBtnMobile: {
    paddingVertical: 10,
  },
  dictionaryOverlayMobile: {
    padding: 8,
  },
  dictionarySheetMobile: {
    maxHeight: '92%',
    borderRadius: 18,
  },
  dictionaryHeaderMobile: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dictionaryTitleMobile: {
    fontSize: 15,
  },
  dictionarySubMobile: {
    fontSize: 10.5,
  },
  termCardMobile: {
    padding: 10,
  },
  termNameMobile: {
    fontSize: 14,
  },
  termDefMobile: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  termLscHintBoxMobile: {
    padding: 6,
  },
  termLscHintTextMobile: {
    fontSize: 10.5,
  },
  termPlayBtnMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  termPlayBtnTextMobile: {
    fontSize: 10,
  },
  dictionaryCloseBtnMobile: {
    paddingVertical: 11,
  },
  accessibleScreenReaderBannerMobile: {
    top: 8,
    paddingHorizontal: 10,
  },
  accessibleBannerBtnMobile: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    gap: 6,
    maxWidth: '92%',
  },
  accessibleBannerTextMobile: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  bannerMinimizeBtn: {
    padding: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    marginLeft: 4,
  },
  accessibleBannerBtnMinimized: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#FACC15',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  accessibleBannerTextMinimized: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10,
  },
});
