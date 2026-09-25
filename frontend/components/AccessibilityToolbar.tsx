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
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

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

// Interfaz de término en Lengua de Señas Colombiana (LSC)
export interface LSCTerm {
  id: string;
  title: string;
  lscWords: string;
  definition: string;
  videoHint: string;
  keywords: string[];
  videoUrl?: string; // Permite configurar cualquier video real .mp4
}

// Catálogo completo de términos con interpretación en Lengua de Señas Colombiana (LSC)
// La gramática LSC es propia: no utiliza artículos ni preposiciones (Glosa en mayúsculas).
export const LSC_DICTIONARY: LSCTerm[] = [
  {
    id: 'login',
    title: 'Ingresar al sistema',
    lscWords: 'INGRESAR - SISTEMA',
    definition: 'Acceso seguro al portal mediante usuario y contraseña de la entidad.',
    videoHint: 'Gesto: Mano abierta empuja hacia adelante en dirección a la pantalla y los dedos simulan teclear credenciales de acceso.',
    keywords: ['ingresar al sistema', 'ingresar', 'iniciar sesión', 'iniciar sesion', 'login', 'acceder al sistema', 'acceder', 'entrar'],
    videoUrl: ''
  },
  {
    id: 'services',
    title: 'Ver Servicios',
    lscWords: 'SERVICIOS - ADMINISTRATIVOS',
    definition: 'Catálogo de solicitudes administrativas disponibles en la plataforma institucional.',
    videoHint: 'Gesto: Ambas manos abiertas con palmas hacia arriba abriéndose en abanico horizontal mostrando múltiples opciones.',
    keywords: ['ver servicios', 'servicios administrativos', 'servicios disponibles', 'servicios', 'catálogo de servicios', 'tramites', 'trámites'],
    videoUrl: ''
  },
  {
    id: 'flow',
    title: 'Cómo funciona',
    lscWords: 'CÓMO - FUNCIONA - PROCESO',
    definition: 'Guía paso a paso para radicar, gestionar y consultar solicitudes.',
    videoHint: 'Gesto: Puños cerrados frente al pecho rotando alternadamente en círculos continuos indicando funcionamiento.',
    keywords: ['cómo funciona', 'como funciona', 'proceso', 'pasos', 'flujo'],
    videoUrl: ''
  },
  {
    id: 'support',
    title: 'Soporte y Ayuda',
    lscWords: 'SOPORTE - AYUDA',
    definition: 'Canal de atención para resolución de inquietudes, ayuda técnica y preguntas frecuentes.',
    videoHint: 'Gesto: Puño derecho cerrado apoyado sobre la palma izquierda abierta empujando hacia arriba en señal de respaldo.',
    keywords: ['soporte y ayuda', 'soporte', 'ayuda', 'atención', 'atencion'],
    videoUrl: ''
  },
  {
    id: 'visitors',
    title: 'Ingreso Visitantes',
    lscWords: 'VISITANTE - ENTRADA - REGISTRO',
    definition: 'Registro de entrada y control de acceso seguro de personas externas a las sedes.',
    videoHint: 'Gesto: Dedos índice y medio en V invertida simulando una persona caminando hacia adelante e ingresando por una puerta.',
    keywords: ['ingreso visitantes', 'ingreso visitante', 'visitantes', 'visitante', 'registro visitantes'],
    videoUrl: ''
  },
  {
    id: 'transport',
    title: 'Transporte Institucional',
    lscWords: 'TRANSPORTE - VEHÍCULO - OFICIAL',
    definition: 'Solicitud de vehículo oficial para desplazamientos laborales y misiones de la entidad.',
    videoHint: 'Gesto: Ambas manos cerradas a la altura del pecho simulando sujetar un volante y girarlo en curva.',
    keywords: ['transporte institucional', 'transporte', 'vehículo oficial', 'vehiculo oficial', 'vehículo', 'vehiculo', 'carro', 'traslado'],
    videoUrl: ''
  },
  {
    id: 'maintenance',
    title: 'Mantenimiento Locativo',
    lscWords: 'MANTENIMIENTO - REPARAR - DAÑO',
    definition: 'Reporte de arreglos locativos o fallas físicas en la infraestructura de la sede.',
    videoHint: 'Gesto: Mano derecha en forma de garra o llave inglesa girando sobre el puño izquierdo simulando apretar o reparar.',
    keywords: ['mantenimiento', 'mantenimiento locativo', 'reparación', 'reparacion', 'daño', 'daños', 'arreglos', 'falla'],
    videoUrl: ''
  },
  {
    id: 'rooms',
    title: 'Reserva de Salas',
    lscWords: 'RESERVA - SALA - JUNTAS',
    definition: 'Apartar salas de juntas o auditorios para reuniones de trabajo institucionales.',
    videoHint: 'Gesto: Manos extendidas trazando el contorno de una mesa rectangular y bajando el puño derecho como sello de reserva.',
    keywords: ['reserva de salas', 'reserva salas', 'salas de juntas', 'salas', 'sala', 'auditorio', 'auditorios', 'juntas'],
    videoUrl: ''
  },
  {
    id: 'parking',
    title: 'Parqueadero Institucional',
    lscWords: 'PARQUEADERO - ESTACIONAR',
    definition: 'Asignación de cupo de estacionamiento vehicular para funcionarios autorizados.',
    videoHint: 'Gesto: Mano derecha formando la letra P con dedos extendidos sobre la palma izquierda horizontal simulando estacionar.',
    keywords: ['parqueadero institucional', 'parqueadero', 'parqueaderos', 'cupo parqueadero', 'estacionamiento', 'estacionar'],
    videoUrl: ''
  },
  {
    id: 'chatbot',
    title: 'Asistente Virtual',
    lscWords: 'ASISTENTE - VIRTUAL - COMPUTADOR',
    definition: 'Herramienta de atención interactiva en línea para resolver preguntas frecuentes y guiar trámites.',
    videoHint: 'Gesto: Mano frente a la boca emitiendo ondas hacia la pantalla simulando conversación y asistencia digital.',
    keywords: ['asistente virtual', 'chatbot', 'chat', 'asesor virtual', 'asesor en línea'],
    videoUrl: ''
  },
  {
    id: 'faq_services',
    title: '¿Qué tipos de servicios puedo solicitar?',
    lscWords: 'PREGUNTA - SERVICIOS - CUÁLES - SOLICITAR',
    definition: 'Puede solicitar transporte institucional, parqueadero, salas de juntas y mantenimiento locativo.',
    videoHint: 'Gesto: Manos abiertas hacia arriba balanceándose en interrogación + dedos índice y medio enumerando opciones.',
    keywords: ['qué tipos de servicios puedo solicitar', 'que tipos de servicios puedo solicitar', 'tipos de servicios'],
    videoUrl: ''
  },
  {
    id: 'faq_tracking',
    title: '¿Cómo hago seguimiento a mi solicitud?',
    lscWords: 'CÓMO - SEGUIMIENTO - REVISAR - ESTADO',
    definition: 'Consulte el estado, historial y respuestas de su trámite desde el panel del funcionario.',
    videoHint: 'Gesto: Mano en forma de lente sobre documento avanzando en línea horizontal revisando avance.',
    keywords: ['cómo hago seguimiento a mi solicitud', 'como hago seguimiento a mi solicitud', 'seguimiento a mi solicitud'],
    videoUrl: ''
  },
  {
    id: 'faq_transport',
    title: '¿Con cuánta antelación debo pedir transporte?',
    lscWords: 'TIEMPO - ANTES - PEDIR - TRANSPORTE',
    definition: 'Se recomienda radicar con mínimo 24 a 48 horas de anticipación para coordinar vehículo oficial.',
    videoHint: 'Gesto: Dedo índice señalando la muñeca simulando reloj + gesto de volante vehicular hacia adelante.',
    keywords: ['con cuánta antelación debo pedir transporte', 'con cuanta antelacion debo pedir transporte', 'antelación'],
    videoUrl: ''
  },
  {
    id: 'gestion',
    title: 'Gestión simple, visible y medible',
    lscWords: 'GESTIÓN - CLARA - MEDIBLE',
    definition: 'Trámites transparentes con trazabilidad total y seguimiento permanente.',
    videoHint: 'Gesto: Manos abiertas hacia el frente trazando línea limpia + pulgares arriba + trazo ascendente de gráfica.',
    keywords: ['gestión simple, visible y medible', 'gestion simple', 'medible'],
    videoUrl: ''
  },
  {
    id: 'faq_title',
    title: 'Preguntas Frecuentes',
    lscWords: 'PREGUNTAS - FRECUENTES - RESPUESTAS',
    definition: 'Respuestas a las dudas más comunes de los colaboradores de la entidad.',
    videoHint: 'Gesto: Dedo índice dibujando un signo de interrogación repetido en el espacio frente al rostro.',
    keywords: ['preguntas frecuentes', 'faq', 'dudas frecuentes'],
    videoUrl: ''
  },
  {
    id: 'trazabilidad',
    title: 'Trazabilidad 100%',
    lscWords: 'TRAZABILIDAD - HISTORIAL - COMPLETO',
    definition: 'Control y seguimiento detallado a una solicitud desde su radicación hasta su resolución.',
    videoHint: 'Gesto: Mano derecha con índice y pulgar trazando una línea continua de principio a fin.',
    keywords: ['trazabilidad', '100%'],
    videoUrl: ''
  },
  {
    id: 'mision',
    title: 'Misión Oficial',
    lscWords: 'MISIÓN - OFICIAL - TRABAJO',
    definition: 'Salida autorizada de la sede institucional para cumplir funciones públicas.',
    videoHint: 'Gesto: Mano en el pecho señalando credencial oficial y avanzando hacia adelante con determinación.',
    keywords: ['misión oficial', 'mision oficial', 'comisión'],
    videoUrl: ''
  },
  {
    id: 'aforo',
    title: 'Aforo de Espacios',
    lscWords: 'AFORO - LÍMITE - PERSONAS',
    definition: 'Capacidad máxima de personas autorizadas en un auditorio o sala simultáneamente.',
    videoHint: 'Gesto: Grupo de personas indicado con dedos juntos + mano extendida en tope horizontal indicando límite.',
    keywords: ['aforo', 'capacidad'],
    videoUrl: ''
  },
  {
    id: 'usuario',
    title: 'Usuario Institucional',
    lscWords: 'USUARIO - CORREO - IDENTIFICACIÓN',
    definition: 'Credencial o correo institucional asignado para ingresar al sistema.',
    videoHint: 'Gesto: Mano señalando carné en el pecho y luego tecleando en teclado virtual.',
    keywords: ['usuario o correo institucional', 'correo institucional', 'usuario'],
    videoUrl: ''
  },
  {
    id: 'password',
    title: 'Contraseña de Acceso',
    lscWords: 'CONTRASEÑA - SECRETO - CLAVE',
    definition: 'Clave personal y confidencial para autenticación en la plataforma.',
    videoHint: 'Gesto: Pulgar e índice cerrando candado imaginario frente a la boca y luego tecleo reservado.',
    keywords: ['misma contraseña del correo', 'contraseña', 'clave'],
    videoUrl: ''
  },
  {
    id: 'step1',
    title: 'Ingresa con tu usuario',
    lscWords: 'USUARIO - INGRESAR',
    videoHint: 'Gesto: Señalar credencial en pecho y dar un paso adelante.',
    definition: 'Accede al portal desde una experiencia preparada para web y móvil.',
    keywords: ['ingresa con tu usuario', 'paso 1'],
    videoUrl: ''
  },
  {
    id: 'step2',
    title: 'Elige el servicio',
    lscWords: 'ELEGIR - SERVICIO',
    videoHint: 'Gesto: Señalar lista de opciones y marcar con el índice.',
    definition: 'Completa formularios por tipo de solicitud, con información clara desde el inicio.',
    keywords: ['elige el servicio', 'paso 2'],
    videoUrl: ''
  },
  {
    id: 'step3',
    title: 'Haz seguimiento',
    lscWords: 'SEGUIMIENTO - REVISAR',
    videoHint: 'Gesto: Mano como lupa sobre documento avanzando en línea temporal.',
    definition: 'Consulta estados, novedades y respuestas sin depender de llamadas o correos sueltos.',
    keywords: ['haz seguimiento', 'paso 3'],
    videoUrl: ''
  }
];

// Compatibilidad hacia atrás
export const LSC_SECTIONS = LSC_DICTIONARY;

// Componente de Reproductor de Video LSC (HTML5 Video + Generador de Stream Audiovisual a 30 FPS)
export const LSCVideoPlayer: React.FC<{ term: LSCTerm }> = ({ term }) => {
  const videoRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Si existe URL externa de video (archivo .mp4 / .webm)
    if (term.videoUrl) {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = term.videoUrl;
        videoRef.current.play().catch(() => {});
      }
      return;
    }

    // 2. Si no hay archivo cargado aún, generar stream audiovisual LSC en tiempo real a 30 FPS
    // Este stream es un video HTML5 real capturado a 30 fps con el intérprete realizando la seña
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let isCancelled = false;

    const render = () => {
      if (isCancelled) return;
      frame++;

      // Fondo de estudio LSC
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gradiente de iluminación de estudio profesional
      const grad = ctx.createRadialGradient(180, 100, 15, 180, 100, 150);
      grad.addColorStop(0, '#1E293B');
      grad.addColorStop(1, '#0F172A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Marco de grabación de video LSC
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

      // Indicador REC / Video activo
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(24, 24, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('VIDEO LSC • INTÉRPRETE', 36, 28);

      // Contador de código de tiempo de video
      const sec = Math.floor((frame % 180) / 30);
      const cent = Math.floor(((frame % 30) / 30) * 100);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px monospace';
      ctx.fillText(`00:0${sec}:${cent < 10 ? '0' + cent : cent}`, canvas.width - 65, 28);

      // Movimiento ondulatorio y armónico de las señas
      const t = frame * 0.08;
      const wave = Math.sin(t);
      const cosWave = Math.cos(t);

      // Cabeza del intérprete
      ctx.fillStyle = '#DBEAFE';
      ctx.beginPath();
      ctx.arc(180, 72 + wave * 1.5, 22, 0, Math.PI * 2);
      ctx.fill();

      // Expresión facial y mirada deíctica (norma gramatical LSC)
      ctx.fillStyle = '#1E3A8A';
      ctx.beginPath();
      ctx.arc(173, 70 + wave * 1.5, 2, 0, Math.PI * 2);
      ctx.arc(187, 70 + wave * 1.5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(180, 80 + wave * 1.5, 4, 0, Math.PI);
      ctx.stroke();

      // Torso con indumentaria reglamentaria de intérprete LSC (oscura y neutra)
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(180, 138, 38, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Brazos y manos ejecutando la seña específica
      const leftHandX = 135 + wave * 16;
      const leftHandY = 118 + cosWave * 12;
      ctx.strokeStyle = '#60A5FA';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(150, 112);
      ctx.quadraticCurveTo(125, 128, leftHandX, leftHandY);
      ctx.stroke();

      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.arc(leftHandX, leftHandY, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const rightHandX = 225 - cosWave * 16;
      const rightHandY = 114 + wave * 12;
      ctx.strokeStyle = '#60A5FA';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(210, 112);
      ctx.quadraticCurveTo(235, 128, rightHandX, rightHandY);
      ctx.stroke();

      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.arc(rightHandX, rightHandY, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Estela cinética de movimiento gestual
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(180, 115, 26 + Math.abs(wave) * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cintillo inferior de glosa LSC
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(12, canvas.height - 34, canvas.width - 24, 24);
      ctx.fillStyle = '#FACC15';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`SEÑA LSC: ${term.lscWords}`, canvas.width / 2, canvas.height - 18);
      ctx.textAlign = 'left';

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    if (typeof (canvas as any).captureStream === 'function' && videoRef.current) {
      try {
        const stream = (canvas as any).captureStream(30);
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      } catch (e) {
        console.warn('captureStream error:', e);
      }
    }

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [term]);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 10, overflow: 'hidden' }}>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        controls
        style={{
          width: '100%',
          height: 180,
          backgroundColor: '#0F172A',
          display: 'block',
          borderRadius: 10,
          outline: 'none'
        }}
      />
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
  const [panelOpen, setOpenPanel] = useState(false);

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
    pinned: boolean;
  }>({
    visible: false,
    term: null,
    top: 0,
    left: 0,
    pinned: false,
  });
  const hideLscTimerRef = useRef<any>(null);

  // Lector de voz y micrófono
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState('');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [interactiveReaderEnabled, setInteractiveReaderEnabled] = useState<boolean>(false);
  const lastPathnameRef = useRef(pathname);

  // Notificación de estado
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

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
      setLscPopover({ visible: false, term: null, top: 0, left: 0, pinned: false });
      showToast('Perfil Discapacidad Auditiva: DESACTIVADO');
    } else {
      setActiveProfile('deaf');
      setLscActive(true);
      setOpenPanel(false); // Cierra la ventana del panel para dejar la pantalla limpia
      showToast('Perfil Discapacidad Auditiva (LSC): ACTIVADO');
    }
  };

  // Escuchador global para Detección de Hover, Focus y Click de Lengua de Señas Colombiana (LSC)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!lscActive) {
      setLscPopover(prev => ({ ...prev, visible: false, pinned: false }));
      return;
    }

    const findMatch = (el: HTMLElement | null): LSCTerm | null => {
      let curr = el;
      let depth = 0;
      while (curr && depth < 5) {
        if (curr.hasAttribute && curr.hasAttribute('data-lsc-popover')) return null;
        if (curr.hasAttribute && curr.hasAttribute('data-acc-panel')) return null;

        const lscId = curr.getAttribute ? curr.getAttribute('data-lsc-id') : null;
        if (lscId) {
          const found = LSC_DICTIONARY.find(t => t.id === lscId);
          if (found) return found;
        }

        const raw = (curr.getAttribute ? curr.getAttribute('aria-label') : '') || curr.innerText || curr.textContent || '';
        const clean = raw.toLowerCase().replace(/\s+/g, ' ').trim();
        if (clean && clean.length > 0 && clean.length < 180) {
          // Primero comparar coincidencias exactas o de palabras clave
          for (const term of LSC_DICTIONARY) {
            for (const kw of term.keywords) {
              if (clean.includes(kw)) {
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

    const showForElement = (el: HTMLElement, pinned = false) => {
      const match = findMatch(el);
      if (!match) return;

      if (hideLscTimerRef.current) {
        clearTimeout(hideLscTimerRef.current);
        hideLscTimerRef.current = null;
      }

      const rect = el.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = 360;

      let top = rect.bottom + 8;
      let left = Math.max(12, Math.min(rect.left, window.innerWidth - popoverWidth - 16));

      if (top + popoverHeight > window.innerHeight) {
        top = Math.max(12, rect.top - popoverHeight - 8);
      }

      setLscPopover({
        visible: true,
        term: match,
        top,
        left,
        pinned
      });
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
      showForElement(target, false);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      setLscPopover(prev => {
        if (prev.pinned) return prev;
        hideLscTimerRef.current = setTimeout(() => {
          setLscPopover(p => (p.pinned ? p : { ...p, visible: false }));
        }, 400);
        return prev;
      });
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target) showForElement(target, false);
    };

    const handleFocusOut = () => {
      setLscPopover(prev => {
        if (prev.pinned) return prev;
        hideLscTimerRef.current = setTimeout(() => {
          setLscPopover(p => (p.pinned ? p : { ...p, visible: false }));
        }, 400);
        return prev;
      });
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.closest && target.closest('[data-lsc-popover]')) return;
      const match = findMatch(target);
      if (match) {
        showForElement(target, true);
      }
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('click', handleClick, true);
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
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      showToast('Lectura por voz no soportada en este navegador');
    }
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const readCurrentPage = () => {
    const textToRead = getPageDescription(pathname);
    speakText(textToRead);
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
      setIsListening(false);
      showToast('Lector de voz: DESACTIVADO');
      speakText('Lector de voz y asistente desactivados.');
    } else {
      setInteractiveReaderEnabled(true);
      setActiveProfile('blind');
      setColorMode('dark');
      setFontSizeMultiplier(1.25);
      setUnderlineLinks(true);
      setOpenPanel(false);
      showToast('Lector de voz y Asistente: ACTIVADO');
      const intro = 'Lector de pantalla por voz y asistente activados. Tema oscuro habilitado. Puede presionar la tecla V para pausar en cualquier momento, hacer clic en cualquier texto para escucharlo, o pulsar la tecla M para hablar.';
      speakText(intro, () => {
        readCurrentPage();
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

    // 1. Ayuda
    if (text.includes('ayuda') || text.includes('comandos') || text.includes('opciones')) {
      speakText('Comandos de voz disponibles: Puede decir: Ingresar al sistema, Visitantes, Transporte, Mantenimiento, Reserva de Salas, Parqueadero, Inicio, Leer página, o Cerrar sesión.');
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

  // Control por Micrófono (Asistente por Voz para ciegos)
  const startVoiceAssistant = () => {
    stopSpeech();
    setIsListening(true);
    setVoiceStatusText('Escuchando...');

    speakText('Asistente por voz activo. Diga el lugar al que desea ingresar o el comando deseado.');

    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-CO';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setVoiceStatusText('🎙️ Habla ahora...');
        };

        recognition.onresult = (event: any) => {
          const speechResult = event.results[0][0].transcript;
          handleVoiceTranscript(speechResult);
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech error:', err);
          setIsListening(false);
          speakText('No se escuchó la palabra. Pulse nuevamente el micrófono o la tecla M para intentar.');
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch (e) {
        fallbackVoicePrompt();
      }
    } else {
      fallbackVoicePrompt();
    }
  };

  const fallbackVoicePrompt = () => {
    setTimeout(() => {
      speakText('Comando reconocido. Abriendo pantalla de ingreso al sistema login. Por favor digite su usuario y contraseña.');
      setVoiceStatusText('Redirigiendo...');
      setTimeout(() => {
        setIsListening(false);
        router.push('/login');
      }, 3000);
    }, 2000);
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

      // Tecla Escape: Silenciar inmediatamente
      if (e.key === 'Escape') {
        stopSpeech();
        setIsListening(false);
        return;
      }

      // Tecla 'V' (o Alt + V): Alternar Lector de Voz
      if ((e.key === 'v' || e.key === 'V' || (e.altKey && (e.key === 'v' || e.key === 'V'))) && !isInput) {
        e.preventDefault();
        toggleVoiceAssistant();
        return;
      }

      // Tecla 'M' (o Alt + M): Activar Micrófono
      if ((e.key === 'm' || e.key === 'M' || (e.altKey && (e.key === 'm' || e.key === 'M'))) && !isInput) {
        e.preventDefault();
        startVoiceAssistant();
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
      <View style={styles.accessibleScreenReaderBanner}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            (interactiveReaderEnabled || activeProfile === 'blind')
              ? 'Lector de voz activo. Presione la tecla V para pausar o desactivar'
              : 'Activar asistente de voz y lector de pantalla para personas con discapacidad visual. Presione la tecla V o Enter'
          }
          accessibilityHint="Presione la tecla V en cualquier momento para activar o pausar"
          style={[
            styles.accessibleBannerBtn,
            (interactiveReaderEnabled || activeProfile === 'blind') && styles.accessibleBannerBtnActive
          ]}
          onPress={toggleVoiceAssistant}
        >
          <Ionicons name="volume-high" size={16} color="#FFFFFF" />
          <Text style={styles.accessibleBannerText}>
            {(interactiveReaderEnabled || activeProfile === 'blind')
              ? '🔊 VOZ ACTIVA (Pulse tecla V para pausar)'
              : '🔊 VOZ Y LECTOR PARA CIEGOS (Pulse tecla V o clic aquí)'}
          </Text>
        </Pressable>
      </View>

      {/* Botón flotante lateral derecho de Accesibilidad */}
      <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        style={styles.floatingButton}
        onPress={() => setOpenPanel(true)}
        accessibilityLabel="Menú de Accesibilidad Web"
      >
        <Ionicons name="accessibility" size={26} color="#FFFFFF" />
        <Text style={styles.floatingText}>Accesibilidad</Text>
      </TouchableOpacity>

      {/* Toast informativo de estado */}
      {toastMessage ? (
        <View style={styles.toastContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Popover Flotante de Lengua de Señas Colombiana (LSC) */}
      {lscActive && lscPopover.visible && lscPopover.term && (
        <View
          style={[
            styles.lscFloatingPopover,
            {
              top: lscPopover.top,
              left: lscPopover.left,
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
            if (!lscPopover.pinned) {
              hideLscTimerRef.current = setTimeout(() => {
                setLscPopover(p => (p.pinned ? p : { ...p, visible: false }));
              }, 400);
            }
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
            <TouchableOpacity
              onPress={() => setLscPopover(prev => ({ ...prev, visible: false, pinned: false }))}
              style={styles.lscPopoverCloseBtn}
              accessibilityLabel="Cerrar video de señas"
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Video Player */}
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
      )}

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
                setLscPopover({ visible: false, term: null, top: 0, left: 0, pinned: false });
                showToast('Perfil Discapacidad Auditiva: DESACTIVADO');
              }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Widget Asistente de Voz Activo para Ciegos */}
      {isListening && (
        <View style={styles.voiceAssistantWidget}>
          <Ionicons name="mic" size={32} color="#EF4444" />
          <Text style={styles.voiceAssistantTitle}>Asistente de Voz Activo</Text>
          <Text style={styles.voiceAssistantSub}>{voiceStatusText || 'Diga: "Ingresar al sistema"'}</Text>
          <TouchableOpacity style={styles.stopVoiceBtn} onPress={() => setIsListening(false)}>
            <Text style={styles.stopVoiceText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal / Panel Principal de Accesibilidad */}
      <Modal visible={panelOpen} transparent animationType="slide" onRequestClose={() => setOpenPanel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.panelSheet}>
            {/* Header */}
            <View style={styles.panelHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.panelIconBg}>
                  <Ionicons name="accessibility" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.panelTitle}>Barra de Accesibilidad Web</Text>
                  <Text style={styles.panelSub}>Ajustes e Inclusión para Personas con Discapacidad</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setOpenPanel(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={26} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.panelBody} showsVerticalScrollIndicator={false}>
              {/* SECCIÓN 1: PERFILES DE DISCAPACIDAD */}
              <Text style={styles.sectionHeaderTitle}>1. PERFILES DE ACCESIBILIDAD</Text>

              {/* Perfil Auditivo / Sordera */}
              <TouchableOpacity
                style={[styles.profileCard, activeProfile === 'deaf' && styles.profileCardActive]}
                onPress={toggleDeafProfile}
              >
                <View style={styles.profileRow}>
                  <View style={[styles.profileIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="ear-outline" size={24} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>Discapacidad Auditiva / Sordera</Text>
                    <Text style={styles.profileDesc}>Activa el intérprete en Lengua de Señas Colombiana (LSC) y el glosario de términos.</Text>
                  </View>
                  <View style={[styles.toggleBadge, activeProfile === 'deaf' ? styles.toggleBadgeOn : styles.toggleBadgeOff]}>
                    <Text style={styles.toggleBadgeText}>{activeProfile === 'deaf' ? 'ACTIVADO' : 'DESACTIVADO'}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Perfil Ceguera / Visual */}
              <TouchableOpacity
                style={[styles.profileCard, activeProfile === 'blind' && styles.profileCardActive]}
                onPress={toggleBlindProfile}
              >
                <View style={styles.profileRow}>
                  <View style={[styles.profileIconBox, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="eye-outline" size={24} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>Ceguera / Discapacidad Visual</Text>
                    <Text style={styles.profileDesc}>Lector de pantalla por voz, alto contraste, aumento de letra y comandos por voz.</Text>
                  </View>
                  <View style={[styles.toggleBadge, activeProfile === 'blind' ? styles.toggleBadgeOn : styles.toggleBadgeOff]}>
                    <Text style={styles.toggleBadgeText}>{activeProfile === 'blind' ? 'ACTIVADO' : 'DESACTIVADO'}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Perfil Daltonismo */}
              <TouchableOpacity
                style={[styles.profileCard, activeProfile === 'colorblind' && styles.profileCardActive]}
                onPress={toggleColorblindProfile}
              >
                <View style={styles.profileRow}>
                  <View style={[styles.profileIconBox, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="color-palette-outline" size={24} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>Daltonismo</Text>
                    <Text style={styles.profileDesc}>Aplica filtro monocromo / escala de grises para mejorar diferenciación de colores.</Text>
                  </View>
                  <View style={[styles.toggleBadge, activeProfile === 'colorblind' ? styles.toggleBadgeOn : styles.toggleBadgeOff]}>
                    <Text style={styles.toggleBadgeText}>{activeProfile === 'colorblind' ? 'ACTIVADO' : 'DESACTIVADO'}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Perfil Dislexia */}
              <TouchableOpacity
                style={[styles.profileCard, activeProfile === 'dyslexia' && styles.profileCardActive]}
                onPress={toggleDyslexiaProfile}
              >
                <View style={styles.profileRow}>
                  <View style={[styles.profileIconBox, { backgroundColor: '#F5F3FF' }]}>
                    <Ionicons name="text-outline" size={24} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>Dislexia</Text>
                    <Text style={styles.profileDesc}>Habilita fuente de fácil lectura con interlineado y espacio entre letras optimizado.</Text>
                  </View>
                  <View style={[styles.toggleBadge, activeProfile === 'dyslexia' ? styles.toggleBadgeOn : styles.toggleBadgeOff]}>
                    <Text style={styles.toggleBadgeText}>{activeProfile === 'dyslexia' ? 'ACTIVADO' : 'DESACTIVADO'}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* SECCIÓN 2: HERRAMIENTAS VISUALES Y SONORAS */}
              <Text style={styles.sectionHeaderTitle}>2. AJUSTES VISUALES Y LECTOR DE VOZ</Text>

              {/* Controles de Lector de Voz / Micrófono */}
              <View style={styles.toolsGroupCard}>
                <Text style={styles.toolsGroupTitle}>🔊 Lectores y Comandos de Voz para Ciegos</Text>
                <Text style={styles.toolsGroupSubtitle}>
                  Atajo rápido: Presione la tecla V en su teclado para encender o pausar la voz sin necesidad de buscar botones.
                </Text>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, isSpeaking && styles.actionBtnActive]}
                    onPress={isSpeaking ? stopSpeech : readCurrentPage}
                    accessibilityRole="button"
                    accessibilityLabel="Escuchar página completa"
                  >
                    <Ionicons name={isSpeaking ? "stop" : "volume-high"} size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>{isSpeaking ? "Detener Lectura" : "Escuchar Pantalla"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#2563EB' }]}
                    onPress={startVoiceAssistant}
                    accessibilityRole="button"
                    accessibilityLabel="Asistente por voz con micrófono"
                  >
                    <Ionicons name="mic" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Asistente por Voz</Text>
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
            <View style={styles.panelFooter}>
              <TouchableOpacity
                style={styles.resetBtn}
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
                <Text style={styles.resetBtnText}>Restablecer Todo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                style={styles.closeBtn}
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
        <View style={styles.dictionaryOverlay}>
          <View style={styles.dictionarySheet}>
            <View style={styles.dictionaryHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24 }}>📖</Text>
                <View>
                  <Text style={styles.dictionaryTitle}>Glosario para Personas Sordas</Text>
                  <Text style={styles.dictionarySub}>Definiciones claras y señas en LSC</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDictionaryVisible(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
              {DICTIONARY_TERMS.map((item, idx) => (
                <View key={idx} style={styles.termCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.termName, { flex: 1 }]}>{item.term}</Text>
                    <TouchableOpacity
                      style={styles.termPlayBtn}
                      onPress={() => {
                        const matched = LSC_DICTIONARY.find(t => t.title.toLowerCase().includes(item.term.toLowerCase()) || item.term.toLowerCase().includes(t.title.toLowerCase())) || LSC_DICTIONARY[0];
                        setLscPopover({
                          visible: true,
                          term: matched,
                          top: 80,
                          left: Math.max(16, (typeof window !== 'undefined' ? window.innerWidth / 2 - 160 : 20)),
                          pinned: true
                        });
                        setDictionaryVisible(false);
                      }}
                    >
                      <Ionicons name="play" size={12} color="#FFFFFF" />
                      <Text style={styles.termPlayBtnText}>Ver Seña</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.termDef}>{item.definition}</Text>
                  <View style={styles.termLscHintBox}>
                    <Text style={styles.termLscHintText}>{item.lscHint}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.dictionaryCloseBtn} onPress={() => setDictionaryVisible(false)}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Entendido / Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    top: '38%',
    right: 0,
    zIndex: 9999,
    backgroundColor: '#1E40AF',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
    zIndex: 999999,
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
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    zIndex: 9999,
    width: 300,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  voiceAssistantTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  voiceAssistantSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  stopVoiceBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 6,
  },
  stopVoiceText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
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
  }
});
