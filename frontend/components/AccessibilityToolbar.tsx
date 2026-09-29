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

// Términos para el diccionario de lengua de señas
const DICTIONARY_TERMS = [
  {
    term: 'Ingresar al sistema',
    definition: 'Acceso seguro al portal mediante usuario y contraseña de la entidad.',
    lscHint: '🔑 INGRESAR SISTEMA (Gesto: Mano empujada hacia adelante + teclear usuario).'
  },
  {
    term: 'Ver Servicios',
    definition: 'Catálogo de solicitudes administrativas disponibles en la plataforma.',
    lscHint: '📋 SERVICIOS (Gesto: Manos abiertas hacia arriba mostrando opciones).'
  },
  {
    term: 'Cómo funciona',
    definition: 'Guía en tres pasos para radicar y consultar solicitudes.',
    lscHint: '� CÓMO FUNCIONA (Gesto: Círculos giratorios alternados con las manos).'
  },
  {
    term: 'Soporte y Ayuda',
    definition: 'Atención de inquietudes, ayuda técnica y preguntas frecuentes.',
    lscHint: '❓ SOPORTE Y AYUDA (Gesto: Puño sobre palma abierta apoyando).'
  },
  {
    term: 'Ingreso visitantes',
    definition: 'Registro de entrada y control de acceso de personas externas a las sedes.',
    lscHint: '👥 VISITANTE INGRESAR (Gesto: Dos dedos simulando pasos de persona).'
  },
  {
    term: 'Transporte Institucional',
    definition: 'Solicitud de vehículo oficial para desplazamientos y misiones institucionales.',
    lscHint: '🚗 TRANSPORTE VEHÍCULO (Gesto: Manos en forma de volante).'
  },
  {
    term: 'Mantenimiento',
    definition: 'Reporte de arreglos o fallas en la infraestructura física de la sede.',
    lscHint: '🛠️ MANTENIMIENTO REPARAR (Gesto: Llave inglesa girando).'
  },
  {
    term: 'Reserva de Salas',
    definition: 'Apartar salas de juntas o auditorios para reuniones de trabajo.',
    lscHint: '📅 RESERVA SALA (Gesto: Trazo de mesa rectangular y sello).'
  },
  {
    term: 'Parqueadero',
    definition: 'Asignación de cupo de estacionamiento para vehículos institucionales.',
    lscHint: '🅿️ PARQUEADERO ESTACIONAR (Gesto: Letra P con dedos sobre superficie).'
  },
  {
    term: 'Ingresa con tu usuario',
    definition: 'Paso 1: Accede al portal desde una experiencia preparada para web y móvil.',
    lscHint: '👤 USUARIO INGRESAR (Gesto: Señalar credencial y entrar).'
  },
  {
    term: 'Elige el servicio',
    definition: 'Paso 2: Completa formularios por tipo de solicitud, con información clara desde el inicio.',
    lscHint: '👉 ELEGIR SERVICIO (Gesto: Señalar lista de opciones).'
  },
  {
    term: 'Haz seguimiento',
    definition: 'Paso 3: Consulta estados, novedades y respuestas sin depender de llamadas o correos sueltos.',
    lscHint: '� SEGUIMIENTO REVISAR (Gesto: Mano como lupa sobre documento).'
  },
  {
    term: 'Trazabilidad',
    definition: 'Seguimiento completo a una solicitud desde que se crea hasta que se resuelve.',
    lscHint: '🖐️ TRAZABILIDAD (Gesto: Línea continua con índice y pulgar).'
  },
  {
    term: 'Misión Oficial',
    definition: 'Salida de la entidad autorizada para cumplir labores institucionales.',
    lscHint: '🚗 MISIÓN OFICIAL (Gesto: Automóvil + credencial de trabajo).'
  },
  {
    term: 'Aforo',
    definition: 'Número máximo de personas autorizadas para estar en un salón simultáneamente.',
    lscHint: '👥 AFORO (Gesto: Grupo de personas + límite de mano extendida).'
  }
];

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
  }
];

// Pre-cálculo optimizado de términos con palabras clave normalizadas (sin tildes, minúsculas, ordenadas por longitud)
const PREPARED_LSC_TERMS = LSC_DICTIONARY.map(t => ({
  ...t,
  normKeywords: t.keywords
    .map(kw => kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim())
    .sort((a, b) => b.length - a.length),
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

  // Notificación de estado
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Movimiento libre / Drag & Drop para el botón flotante de Accesibilidad
  const buttonPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const buttonPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        buttonPan.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: buttonPan.x, dy: buttonPan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        buttonPan.flattenOffset();
        const { width, height } = Dimensions.get('window');
        
        // Coordenadas acumuladas
        const currentX = (buttonPan.x as any)._value;
        const currentY = (buttonPan.y as any)._value;

        // Tamaño y posición base (alineado en la esquina inferior derecha encima del chat)
        const btnSize = isSmallScreen ? 50 : 64;
        const baseRight = isSmallScreen ? 16 : 24;
        const baseBottom = isSmallScreen ? 145 : 100;

        // Límites en pantalla completa
        const maxLeft = -(width - btnSize - baseRight - 16); 
        const maxUp = -(height - btnSize - baseBottom - 40); 
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
          /* === MODO OSCURO AUTOMÁTICO PARA TODA LA PÁGINA (ESTILO CELULAR) === */
          html[data-theme="dark"],
          html[data-theme="dark"] body,
          html[data-theme="dark"] #root {
            background-color: #0A0E17 !important;
            color: #FFFFFF !important;
          }

          /* 1. Contenedores, secciones, tarjetas y paneles en modo oscuro */
          html[data-theme="dark"] .r-backgroundColor-14lw9ot,
          html[data-theme="dark"] .r-backgroundColor-11j01x2,
          html[data-theme="dark"] .r-backgroundColor-1jh0li6,
          html[data-theme="dark"] [data-theme-bg="light"],
          html[data-theme="dark"] div[style*="background-color: rgb(255, 255, 255)"],
          html[data-theme="dark"] div[style*="background-color: #FFFFFF"],
          html[data-theme="dark"] div[style*="background-color: #ffffff"],
          html[data-theme="dark"] div[style*="background-color: rgb(248, 250, 252)"],
          html[data-theme="dark"] div[style*="background-color: #F8FAFC"],
          html[data-theme="dark"] div[style*="background-color: rgb(241, 245, 249)"],
          html[data-theme="dark"] div[style*="background-color: #F1F5F9"] {
            background-color: #161F30 !important;
            border-color: #2D3A54 !important;
            color: #F8FAFC !important;
          }

          /* Fondos secundarios suaves y translúcidos */
          html[data-theme="dark"] div[style*="background-color: rgba(255, 255, 255"],
          html[data-theme="dark"] div[style*="background-color: rgba(248, 250, 252"] {
            background-color: rgba(22, 31, 48, 0.95) !important;
            border-color: #2D3A54 !important;
          }

          /* 2. Textos principales oscuros pasan a blanco */
          html[data-theme="dark"] .r-color-18zdu8c,
          html[data-theme="dark"] .r-color-1rcpcwj,
          html[data-theme="dark"] [data-theme-color="dark"],
          html[data-theme="dark"] div[style*="color: rgb(15, 23, 42)"],
          html[data-theme="dark"] div[style*="color: #0F172A"],
          html[data-theme="dark"] div[style*="color: rgb(30, 41, 59)"],
          html[data-theme="dark"] div[style*="color: #1E293B"],
          html[data-theme="dark"] div[style*="color: rgb(17, 24, 39)"],
          html[data-theme="dark"] div[style*="color: #111827"] {
            color: #FFFFFF !important;
          }

          /* 3. Textos secundarios oscuros pasan a gris claro legible */
          html[data-theme="dark"] .r-color-1s7ct43,
          html[data-theme="dark"] [data-theme-color="muted"],
          html[data-theme="dark"] div[style*="color: rgb(100, 116, 139)"],
          html[data-theme="dark"] div[style*="color: #64748B"],
          html[data-theme="dark"] div[style*="color: rgb(71, 85, 105)"],
          html[data-theme="dark"] div[style*="color: #475569"],
          html[data-theme="dark"] div[style*="color: rgb(51, 65, 85)"],
          html[data-theme="dark"] div[style*="color: #334155"] {
            color: #CBD5E1 !important;
          }

          /* 4. Bordes claros y separadores */
          html[data-theme="dark"] .r-borderColor-1wr2p1e,
          html[data-theme="dark"] .r-backgroundColor-182zmgx,
          html[data-theme="dark"] [data-theme-border="light"],
          html[data-theme="dark"] div[style*="border-color: rgb(226, 232, 240)"],
          html[data-theme="dark"] div[style*="border-color: #E2E8F0"] {
            border-color: #2D3A54 !important;
            background-color: #2D3A54 !important;
          }

          /* 5. Formularios e inputs oscuros con texto blanco */
          html[data-theme="dark"] input,
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

          /* 6. Tablas y listas */
          html[data-theme="dark"] table,
          html[data-theme="dark"] tr,
          html[data-theme="dark"] td,
          html[data-theme="dark"] th {
            background-color: #161F30 !important;
            color: #FFFFFF !important;
            border-color: #2D3A54 !important;
          }

          /* 7. Modales y ventanas emergentes */
          html[data-theme="dark"] [role="dialog"],
          html[data-theme="dark"] div[style*="background-color: white"] {
            background-color: #161F30 !important;
            color: #FFFFFF !important;
          }

          /* 8. Enlaces */
          html[data-theme="dark"] a {
            color: #60A5FA !important;
          }

          /* 9. Preservar imágenes, videos, logos e iconos */
          html[data-theme="dark"] img,
          html[data-theme="dark"] video,
          html[data-theme="dark"] canvas,
          html[data-theme="dark"] svg {
            filter: none !important;
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
      document.querySelectorAll('[data-theme-bg], [data-theme-color], [data-theme-border]').forEach(el => {
        el.removeAttribute('data-theme-bg');
        el.removeAttribute('data-theme-color');
        el.removeAttribute('data-theme-border');
      });
      return;
    }

    const applyLiveDarkTheme = () => {
      document.querySelectorAll('*').forEach(el => {
        if (el.closest && (el.closest('[data-acc-panel]') || el.closest('[data-lsc-popover]'))) return;
        const tag = el.tagName?.toLowerCase();
        if (tag === 'img' || tag === 'video' || tag === 'canvas' || tag === 'svg' || tag === 'path') return;

        const st = window.getComputedStyle(el);

        // Fondos claros se marcan para aplicar superficie oscura
        const bg = st.backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
          const m = bg.match(/\d+/g);
          if (m && m.length >= 3) {
            const brightness = (+m[0] * 299 + +m[1] * 587 + +m[2] * 114) / 1000;
            if (brightness > 165) {
              el.setAttribute('data-theme-bg', 'light');
            }
          }
        }

        // Textos oscuros se marcan para aplicar blanco o gris claro
        const col = st.color;
        if (col && col !== 'transparent' && col !== 'rgba(0, 0, 0, 0)') {
          const m = col.match(/\d+/g);
          if (m && m.length >= 3) {
            const brightness = (+m[0] * 299 + +m[1] * 587 + +m[2] * 114) / 1000;
            if (brightness < 115) {
              el.setAttribute('data-theme-color', 'dark');
            } else if (brightness >= 115 && brightness < 155) {
              el.setAttribute('data-theme-color', 'muted');
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

          // Buscar coincidencia en diccionario (las palabras clave más largas primero)
          for (const term of PREPARED_LSC_TERMS) {
            for (const kw of term.normKeywords) {
              if (clean === kw || clean.includes(kw)) {
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
      if (target) showForElement(target);
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
        'Diga en voz alta el nombre del servicio al que desea ingresar, por ejemplo: Visitantes, Transporte, Mantenimiento, Salas o Parqueadero.'
      );
    }

    if (path.includes('/requests/visitors')) {
      return (
        'Formulario de Solicitud de Ingreso de Visitantes. Secretaría Jurídica Distrital. ' +
        'Este formulario permite registrar la entrada de personas externas a las instalaciones. ' +
        'Campos del formulario: ' +
        'Campo uno: Dependencia anfitriona. ' +
        'Campo dos: Nombre completo del visitante. ' +
        'Campo tres: Cédula o documento de identidad. ' +
        'Opción: ¿Ingresa con vehículo? Si marca sí, se solicitará placa y marca del vehículo. ' +
        'Campo cuatro: Fecha de la visita. ' +
        'Campo cinco: Motivo o justificación de la visita. ' +
        'Botón principal: Radicar solicitud de visitantes. ' +
        'Botón secundario: Volver al menú principal.'
      );
    }

    if (path.includes('/requests/transport')) {
      return (
        'Formulario de Solicitud de Transporte Institucional. ' +
        'Permite solicitar un vehículo oficial para comisiones y desplazamientos laborales. ' +
        'Campos requeridos: ' +
        'Campo uno: Dependencia solicitante. ' +
        'Campo dos: Dirección o lugar de salida u origen. ' +
        'Campo tres: Dirección de destino. ' +
        'Campo cuatro: Número de pasajeros requeridos. ' +
        'Campo cinco: Fecha y hora de recogida. ' +
        'Campo seis: Justificación de la misión oficial. ' +
        'Botón principal: Enviar solicitud de transporte.'
      );
    }

    if (path.includes('/requests/maintenance')) {
      return (
        'Formulario de Solicitud de Mantenimiento Locativo e Infraestructura. ' +
        'Permite reportar daños y averías en la sede. ' +
        'Campos requeridos: ' +
        'Campo uno: Título o resumen de la avería. ' +
        'Campo dos: Dependencia. ' +
        'Campo tres: Ubicación física, piso o salón afectado. ' +
        'Campo cuatro: Descripción detallada del daño. ' +
        'Campo cinco: Prioridad del mantenimiento. ' +
        'Opción para adjuntar fotografías del daño. ' +
        'Botón principal: Enviar reporte de mantenimiento.'
      );
    }

    if (path.includes('/requests/rooms')) {
      return (
        'Formulario de Reserva de Salas y Auditorios. ' +
        'Salas disponibles: Sala 308, Sala 310, Sala 311, Sala 312, Sala de Juntas Principal, Auditorio Barule 1 y 2, Auditorio Huitaca y Sala Archivista Central. ' +
        'Campos requeridos: ' +
        'Campo uno: Selección de la sala según su aforo. ' +
        'Campo dos: Fecha de la reunión. ' +
        'Campo tres: Hora de inicio y hora de finalización. ' +
        'Campo cuatro: Asunto o propósito del evento. ' +
        'Campo cinco: Cantidad estimada de asistentes. ' +
        'Botón principal: Confirmar reserva de sala.'
      );
    }

    if (path.includes('/requests/parking')) {
      return (
        'Formulario de Cupo de Parqueadero Institucional. ' +
        'Aplica para funcionarios con vehículo o motocicleta. ' +
        'Campos requeridos: ' +
        'Campo uno: Nombre completo del funcionario. ' +
        'Campo dos: Documento de identidad. ' +
        'Campo tres: Dependencia y cargo. ' +
        'Campo cuatro: Placa y tipo de vehículo. ' +
        'Campo cinco: Sede institucional solicitada. ' +
        'Botón principal: Radicar solicitud de parqueadero.'
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

  // Procesamiento de comandos de voz para ciegos
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

    // 1. Ayuda
    if (text.includes('ayuda') || text.includes('comandos') || text.includes('opciones')) {
      speakText('Comandos disponibles: Puede decir: Ingresar al sistema, Visitantes, Transporte, Mantenimiento, Reserva de Salas, Parqueadero, Inicio, Leer página, o Apagar asistente.');
      return;
    }

    // 2. Leer página actual
    if (text.includes('leer') || text.includes('qué dice') || text.includes('repetir') || text.includes('escuchar')) {
      readCurrentPage();
      return;
    }

    // 3. Ingresar al sistema / Login
    if (text.includes('ingresar') || text.includes('login') || text.includes('entrar') || text.includes('acceder')) {
      if (pathname.includes('/login')) {
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
      } else {
        speakText('Redirigiendo a la pantalla de ingreso institucional. Por favor espere.');
        setTimeout(() => router.push('/login'), 1500);
      }
      return;
    }

    // 4. Llenar usuario por voz en login
    if (pathname.includes('/login') && (text.includes('admin') || text.includes('usuario'))) {
      if (typeof document !== 'undefined') {
        const allInputs = Array.from(document.querySelectorAll('input'));
        const userInput = allInputs.find((i: any) => i.placeholder && i.placeholder.toLowerCase().includes('usuario')) as HTMLInputElement;
        if (userInput) {
          userInput.focus();
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(userInput, 'admin');
            userInput.dispatchEvent(new Event('input', { bubbles: true }));
            userInput.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            userInput.value = 'admin';
          }
          speakText('Usuario admin establecido. Por favor diga: Contraseña admin123, o diga: Ingresar.');
          return;
        }
      }
    }

    // 5. Llenar contraseña por voz en login
    if (pathname.includes('/login') && (text.includes('contraseña') || text.includes('admin123') || text.includes('clave'))) {
      if (typeof document !== 'undefined') {
        const passInputs = Array.from(document.querySelectorAll('input[type="password"]')) as HTMLInputElement[];
        const passInput = passInputs[0];
        if (passInput) {
          passInput.focus();
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(passInput, 'admin123');
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            passInput.value = 'admin123';
          }
          speakText('Contraseña admin123 ingresada. Diga la palabra: Ingresar para iniciar sesión.');
          return;
        }
      }
    }

    // 6. Navegación a módulos de servicios
    if (text.includes('visitante')) {
      speakText('Abriendo formulario de Ingreso de Visitantes.');
      setTimeout(() => router.push('/requests/visitors'), 1200);
      return;
    }

    if (text.includes('transporte') || text.includes('carro') || text.includes('vehiculo') || text.includes('vehículo')) {
      speakText('Abriendo formulario de Transporte Institucional.');
      setTimeout(() => router.push('/requests/transport'), 1200);
      return;
    }

    if (text.includes('mantenimiento') || text.includes('daño') || text.includes('arreglo') || text.includes('reparar')) {
      speakText('Abriendo formulario de Mantenimiento Locativo.');
      setTimeout(() => router.push('/requests/maintenance'), 1200);
      return;
    }

    if (text.includes('sala') || text.includes('auditorio') || text.includes('reunión') || text.includes('reunion')) {
      speakText('Abriendo formulario de Reserva de Salas y Auditorios.');
      setTimeout(() => router.push('/requests/rooms'), 1200);
      return;
    }

    if (text.includes('parqueadero') || text.includes('estacionamiento')) {
      speakText('Abriendo formulario de Parqueadero Institucional.');
      setTimeout(() => router.push('/requests/parking'), 1200);
      return;
    }

    if (text.includes('inicio') || text.includes('portal') || text.includes('dashboard')) {
      speakText('Regresando al Portal del Funcionario.');
      setTimeout(() => router.push('/dashboard'), 1200);
      return;
    }

    if (text.includes('salir') || text.includes('cerrar sesion') || text.includes('cerrar sesión')) {
      speakText('Cerrando sesión del sistema.');
      setTimeout(() => router.push('/'), 1200);
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

  // Anunciar nueva pantalla cuando cambia la ruta si el lector está activo
  useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname;
      if (interactiveReaderEnabled || activeProfile === 'blind') {
        setTimeout(() => {
          readCurrentPage();
        }, 600);
      }
    }
  }, [pathname, interactiveReaderEnabled, activeProfile]);

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
          onPress={() => setOpenPanel(true)}
          accessibilityLabel="Abrir menú de accesibilidad"
          activeOpacity={0.88}
          style={{
            backgroundColor: '#1E40AF',
            width: isSmallScreen ? 50 : 64,
            height: isSmallScreen ? 50 : 64,
            borderRadius: isSmallScreen ? 25 : 32,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 8,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.25)',
            ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' } as any : {}),
          }}
        >
          <Ionicons name="accessibility" size={isSmallScreen ? 24 : 30} color="#FFFFFF" />
          {!isSmallScreen && (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 8.5,
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                marginTop: 1,
              }}
            >
              Accesible
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
              {['Visitantes', 'Transporte', 'Salas', 'Mantenimiento', 'Ayuda'].map((cmd) => (
                <TouchableOpacity
                  key={cmd}
                  style={styles.voiceHintChip}
                  onPress={() => handleVoiceTranscript(cmd.toLowerCase())}
                >
                  <Text style={styles.voiceHintChipText}>{cmd}</Text>
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
    maxWidth: 380,
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
  },
  toggleBadgeOff: {
    backgroundColor: '#E2E8F0',
  },
  toggleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
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
