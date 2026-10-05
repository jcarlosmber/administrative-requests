import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  teletrabajoService,
  PersonaPlanta,
  ResolucionTeletrabajo,
  CargoConfig,
  AsignacionModalidad,
  AcuerdoCompromiso,
  SeguimientoTeletrabajo,
  EstadisticasTeletrabajo,
} from '../../lib/teletrabajoService';

// Sistema de diseño institucional versión clara basado en supervision-prueba (Marca Navy + Slate)
const THEME = {
  // Colores de marca (Marca 50 - 900)
  marca900: '#0D2A48',
  marca800: '#123A63',
  marca700: '#174A7E',
  marca600: '#1F5A96',
  marca200: '#BFD7F0',
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

  // Semáforo y estados (badges con ring-1 sutil)
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

  purpleBg: '#FAF5FF',
  purpleText: '#6B21A8',
  purpleRing: 'rgba(147, 51, 234, 0.25)',

  slateBadgeBg: '#F1F5F9',
  slateBadgeText: '#475569',
  slateBadgeRing: 'rgba(100, 116, 139, 0.25)',

  badges: {
    emerald: {
      bg: '#ECFDF5',
      text: '#047857',
      border: 'rgba(5, 150, 105, 0.25)',
    },
    rose: {
      bg: '#FFF1F2',
      text: '#BE123C',
      border: 'rgba(225, 29, 72, 0.25)',
    },
    amber: {
      bg: '#FFFBEB',
      text: '#92400E',
      border: 'rgba(217, 119, 6, 0.25)',
    },
    sky: {
      bg: '#F0F9FF',
      text: '#0369A1',
      border: 'rgba(2, 132, 199, 0.25)',
    },
    purple: {
      bg: '#FAF5FF',
      text: '#6B21A8',
      border: 'rgba(147, 51, 234, 0.25)',
    },
    slate: {
      bg: '#F1F5F9',
      text: '#475569',
      border: 'rgba(100, 116, 139, 0.25)',
    },
  },
};

const COLORS = {
  primary: '#BE1F2D',
  primaryHover: '#9B1623',
  darkBg: THEME.slate50,
  cardBg: THEME.white,
  cardBgLight: THEME.slate50,
  border: THEME.slate200,
  textWhite: THEME.slate900,
  textLight: THEME.slate900,
  textMuted: THEME.slate500,
  blueAccent: '#1F5A96',
  cyanBadge: '#0284C7',
  greenSuccess: '#047857',
  amberWarning: '#92400E',
  purpleAccent: '#6B21A8',
  inputBg: THEME.slate50,
};

const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

const limpiarFecha = (fecha?: string | null): string => {
  if (!fecha) return '';
  return fecha.split('T')[0].trim();
};

export default function TeletrabajoScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  // Pestañas principales
  const [tabActiva, setTabActiva] = useState<
    'censo' | 'resoluciones' | 'procedimiento' | 'cargos' | 'acuerdos' | 'seguimientos'
  >('censo');

  // Estados específicos de la Política y Procedimiento (Resolución 117 de 2026 - PR-117)
  const [faseProcedimiento, setFaseProcedimiento] = useState<'4.1' | '4.2' | '4.3' | '4.4'>('4.1');
  const [modalPdfVisorVisible, setModalPdfVisorVisible] = useState(false);
  const urlPdfPolitica117 = teletrabajoService.getResolucionUrl('Resolucion_117_de_2026_Politica_Teletrabajo.pdf');

  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [personas, setPersonas] = useState<PersonaPlanta[]>([]);
  const [resoluciones, setResoluciones] = useState<ResolucionTeletrabajo[]>([]);
  const [cargos, setCargos] = useState<CargoConfig[]>([]);
  const [acuerdos, setAcuerdos] = useState<AcuerdoCompromiso[]>([]);
  const [seguimientos, setSeguimientos] = useState<SeguimientoTeletrabajo[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasTeletrabajo | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState<string>('TODOS');
  const [filtroDependencia, setFiltroDependencia] = useState<string>('TODOS');
  const [modoVistaCenso, setModoVistaCenso] = useState<'cards' | 'tabla'>('cards');
  const [modoVistaResoluciones, setModoVistaResoluciones] = useState<'cards' | 'tabla'>('tabla');
  const [modoVistaAcuerdos, setModoVistaAcuerdos] = useState<'cards' | 'tabla'>('tabla');
  const [modoVistaSeguimientos, setModoVistaSeguimientos] = useState<'cards' | 'tabla'>('tabla');
  const [busquedaResoluciones, setBusquedaResoluciones] = useState('');
  const [busquedaAcuerdos, setBusquedaAcuerdos] = useState('');
  const [busquedaSeguimientos, setBusquedaSeguimientos] = useState('');

  // Estado para gestión y redimensionamiento dinámico de columnas de la tabla
  const ANCHOS_COLUMNAS_DEFAULT: Record<string, number> = {
    plaza: 95,
    servidor: 230,
    cargo: 220,
    dependencia: 210,
    modalidad: 145,
    esquema: 170,
    vigencia: 155,
    resolucion: 120,
    acciones: 195,
  };

  const [anchosColumnas, setAnchosColumnas] = useState<Record<string, number>>(ANCHOS_COLUMNAS_DEFAULT);
  const [ajustarAPantalla, setAjustarAPantalla] = useState(true);
  const [anchoContenedorTabla, setAnchoContenedorTabla] = useState<number>(0);

  const anchoTotalBase = Object.values(ANCHOS_COLUMNAS_DEFAULT).reduce((a, b) => a + b, 0);

  const anchoEfectivo = (colKey: string): number => {
    const baseCol = anchosColumnas[colKey] || ANCHOS_COLUMNAS_DEFAULT[colKey];
    if (!ajustarAPantalla || anchoContenedorTabla <= 0) {
      return baseCol;
    }
    const espacioDisponible = Math.max(anchoContenedorTabla - 34, 1050);
    const proporcion = (ANCHOS_COLUMNAS_DEFAULT[colKey] || baseCol) / anchoTotalBase;
    const anchoProporcional = Math.round(espacioDisponible * proporcion);
    const minCol = colKey === 'plaza' ? 85 : colKey === 'acciones' ? 160 : colKey === 'resolucion' ? 95 : 120;
    return Math.max(minCol, anchoProporcional);
  };

  const iniciarRedimension = (colKey: string, e: any) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    e.preventDefault?.();
    e.stopPropagation?.();

    setAjustarAPantalla(false);

    const startX = e.clientX;
    const startWidth = anchoEfectivo(colKey);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const minPermitido = colKey === 'plaza' ? 75 : 90;
      const nuevoAncho = Math.max(minPermitido, startWidth + delta);
      setAnchosColumnas((prev) => ({
        ...prev,
        [colKey]: nuevoAncho,
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const restablecerColumnas = () => {
    setAnchosColumnas({ ...ANCHOS_COLUMNAS_DEFAULT });
    setAjustarAPantalla(true);
  };

  // Modal de Notificación / Mensajes (Regla: no alerts)
  const [notifModal, setNotifModal] = useState<{
    visible: boolean;
    titulo: string;
    mensaje: string;
    tipo: 'success' | 'error' | 'info';
  }>({ visible: false, titulo: '', mensaje: '', tipo: 'info' });

  const mostrarMensaje = (titulo: string, mensaje: string, tipo: 'success' | 'error' | 'info' = 'info') => {
    setNotifModal({ visible: true, titulo, mensaje, tipo });
  };

  // =========================================================================
  // CARGA DE DATOS
  // =========================================================================
  const cargarTodo = async () => {
    try {
      setLoading(true);
      const [pData, rData, cData, aData, sData, stats] = await Promise.all([
        teletrabajoService.obtenerPersonas(),
        teletrabajoService.obtenerResoluciones(),
        teletrabajoService.obtenerCargos(),
        teletrabajoService.obtenerAcuerdos(),
        teletrabajoService.obtenerSeguimientos(),
        teletrabajoService.obtenerEstadisticas(),
      ]);
      setPersonas(pData || []);
      setResoluciones(rData || []);
      setCargos(cData || []);
      setAcuerdos(aData || []);
      setSeguimientos(sData || []);
      setEstadisticas(stats || null);
    } catch (err: any) {
      mostrarMensaje('Error de Carga', err.message || 'No se pudieron sincronizar los datos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // =========================================================================
  // MODAL 1: ASIGNACIÓN / CONFIGURACIÓN DE MODALIDAD POR PERSONA
  // =========================================================================
  const [modalAsignacionVisible, setModalAsignacionVisible] = useState(false);
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);
  const [formAsignacion, setFormAsignacion] = useState<{
    persona: PersonaPlanta | null;
    modalidad: 'TELETRABAJO' | 'TRABAJO_EN_CASA' | 'TELETRABAJO_AUTONOMO';
    submodalidad: string;
    resolucion_id: string;
    fecha_inicio: string;
    fecha_fin: string;
    fechas_editadas_manualmente: boolean;
    cargo_es_teletrabajable: boolean;
    excepcion_jefe_aprobada: boolean;
    motivo_excepcion_jefe: string;
    esquema_dias_tipo: 'DIAS_FIJOS' | 'DIAS_PARES' | 'DIAS_IMPARES' | 'CANTIDAD_LIBRE' | 'TODOS';
    dias_por_semana: number;
    dias_semana_fijos: string[];
    observaciones: string;
  }>({
    persona: null,
    modalidad: 'TELETRABAJO',
    submodalidad: 'SUPLEMENTARIO',
    resolucion_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    fechas_editadas_manualmente: false,
    cargo_es_teletrabajable: true,
    excepcion_jefe_aprobada: false,
    motivo_excepcion_jefe: '',
    esquema_dias_tipo: 'DIAS_FIJOS',
    dias_por_semana: 2,
    dias_semana_fijos: ['LUNES', 'MIERCOLES'],
    observaciones: '',
  });

  const abrirModalAsignacion = (persona: PersonaPlanta) => {
    const resVigente = resoluciones.find((r) => r.estado === 'VIGENTE') || resoluciones[0];
    const fechaIni = limpiarFecha(persona.asignacion_desde) || limpiarFecha(resVigente?.fecha_inicio_vigencia) || new Date().toISOString().split('T')[0];
    const fechaFin = limpiarFecha(persona.asignacion_hasta) || limpiarFecha(resVigente?.fecha_fin_vigencia) || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    const modInicial = (persona.modalidad as any) || 'TELETRABAJO';
    const esqInicial = persona.esquema_dias_tipo || (modInicial === 'TELETRABAJO_AUTONOMO' ? 'TODOS' : 'DIAS_FIJOS');

    setFormAsignacion({
      persona,
      modalidad: modInicial,
      submodalidad: persona.submodalidad || (modInicial === 'TELETRABAJO_AUTONOMO' ? 'AUTONOMO' : 'SUPLEMENTARIO'),
      resolucion_id: persona.resolucion_id || resVigente?.id || '',
      fecha_inicio: fechaIni,
      fecha_fin: fechaFin,
      fechas_editadas_manualmente: !!persona.asignacion_id,
      cargo_es_teletrabajable: persona.cargo_es_teletrabajable !== undefined ? persona.cargo_es_teletrabajable : true,
      excepcion_jefe_aprobada: persona.excepcion_jefe_aprobada || false,
      motivo_excepcion_jefe: persona.motivo_excepcion_jefe || '',
      esquema_dias_tipo: esqInicial,
      dias_por_semana: persona.dias_por_semana || (modInicial === 'TELETRABAJO_AUTONOMO' ? 5 : 2),
      dias_semana_fijos: Array.isArray(persona.dias_semana_fijos) && persona.dias_semana_fijos.length > 0
        ? persona.dias_semana_fijos
        : modInicial === 'TELETRABAJO_AUTONOMO'
        ? [...DIAS_SEMANA]
        : ['LUNES', 'MIERCOLES'],
      observaciones: '',
    });
    setModalAsignacionVisible(true);
  };

  const alCambiarResolucion = (resId: string) => {
    const resSel = resoluciones.find((r) => r.id === resId);
    setFormAsignacion((prev) => ({
      ...prev,
      resolucion_id: resId,
      // Si el usuario no ha editado manualmente las fechas, hereda automáticamente las de la resolución limpia
      fecha_inicio: !prev.fechas_editadas_manualmente && resSel ? limpiarFecha(resSel.fecha_inicio_vigencia) : prev.fecha_inicio,
      fecha_fin: !prev.fechas_editadas_manualmente && resSel ? limpiarFecha(resSel.fecha_fin_vigencia) : prev.fecha_fin,
    }));
  };

  const toggleDiaSemana = (dia: string) => {
    setFormAsignacion((prev) => {
      const existe = prev.dias_semana_fijos.includes(dia);
      const nuevos = existe
        ? prev.dias_semana_fijos.filter((d) => d !== dia)
        : [...prev.dias_semana_fijos, dia];
      return {
        ...prev,
        dias_semana_fijos: nuevos,
        dias_por_semana: nuevos.length,
        esquema_dias_tipo: nuevos.length === 5 ? 'TODOS' : 'DIAS_FIJOS',
      };
    });
  };

  const seleccionarTodosLosDias = () => {
    setFormAsignacion((prev) => ({
      ...prev,
      esquema_dias_tipo: 'TODOS',
      dias_por_semana: 5,
      dias_semana_fijos: [...DIAS_SEMANA],
    }));
  };

  const guardarAsignacion = async () => {
    if (!formAsignacion.persona) return;
    if (!formAsignacion.fecha_inicio || !formAsignacion.fecha_fin) {
      mostrarMensaje('Fechas Incompletas', 'Debes definir la fecha de inicio y de fin de la autorización.', 'error');
      return;
    }

    const esCualquierTeletrabajo =
      formAsignacion.modalidad === 'TELETRABAJO' || formAsignacion.modalidad === 'TELETRABAJO_AUTONOMO';

    if (
      esCualquierTeletrabajo &&
      !formAsignacion.cargo_es_teletrabajable &&
      !formAsignacion.excepcion_jefe_aprobada
    ) {
      mostrarMensaje(
        'Cargo No Teletrabajable',
        'El cargo actual no figura como teletrabajable. Para otorgar la modalidad se requiere activar la Aprobación Excepcional de la Jefatura con su respectiva justificación.',
        'error'
      );
      return;
    }

    try {
      setGuardandoAsignacion(true);
      await teletrabajoService.guardarAsignacion({
        servidor_cedula: formAsignacion.persona.titular_cedula,
        servidor_nombre: formAsignacion.persona.titular_nombre,
        id_plaza: formAsignacion.persona.id_plaza,
        cargo_actual: formAsignacion.persona.cargo,
        codigo_cargo: formAsignacion.persona.codigo,
        grado_cargo: formAsignacion.persona.grado,
        dependencia: formAsignacion.persona.dependencia_cargo,
        modalidad: formAsignacion.modalidad,
        submodalidad:
          formAsignacion.modalidad === 'TELETRABAJO_AUTONOMO'
            ? 'AUTONOMO'
            : formAsignacion.submodalidad,
        resolucion_id: formAsignacion.resolucion_id || null,
        fecha_inicio: limpiarFecha(formAsignacion.fecha_inicio),
        fecha_fin: limpiarFecha(formAsignacion.fecha_fin),
        cargo_es_teletrabajable: formAsignacion.cargo_es_teletrabajable,
        excepcion_jefe_aprobada: formAsignacion.excepcion_jefe_aprobada,
        motivo_excepcion_jefe: formAsignacion.motivo_excepcion_jefe,
        esquema_dias_tipo: formAsignacion.esquema_dias_tipo,
        dias_por_semana: formAsignacion.dias_por_semana,
        dias_semana_fijos: formAsignacion.dias_semana_fijos,
        observaciones: formAsignacion.observaciones,
      });

      setModalAsignacionVisible(false);
      await cargarTodo();
      const nombreMod =
        formAsignacion.modalidad === 'TELETRABAJO_AUTONOMO'
          ? 'Teletrabajo Autónomo'
          : formAsignacion.modalidad === 'TELETRABAJO'
          ? 'Teletrabajo Suplementario'
          : 'Trabajo en Casa';
      mostrarMensaje(
        'Modalidad Registrada',
        `Se ha configurado exitosamente la modalidad de ${nombreMod} para ${formAsignacion.persona.titular_nombre}.`,
        'success'
      );
    } catch (err: any) {
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar la asignación.', 'error');
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  // =========================================================================
  // MODAL 2: SUBIR / EDITAR RESOLUCIÓN INSTITUCIONAL
  // =========================================================================
  const [modalResVisible, setModalResVisible] = useState(false);
  const [guardandoRes, setGuardandoRes] = useState(false);
  const [formRes, setFormRes] = useState<{
    id?: string;
    numero_resolucion: string;
    anio: string;
    fecha_expedicion: string;
    fecha_inicio_vigencia: string;
    fecha_fin_vigencia: string;
    descripcion: string;
    modalidad_principal: 'TELETRABAJO' | 'TRABAJO_EN_CASA' | 'MIXTA';
    estado: 'VIGENTE' | 'DEROGADA' | 'FINALIZADA';
    archivo_base64: string;
    nombre_archivo: string;
    archivo_pdf_url?: string;
  }>({
    id: undefined,
    numero_resolucion: '',
    anio: new Date().getFullYear().toString(),
    fecha_expedicion: new Date().toISOString().split('T')[0],
    fecha_inicio_vigencia: new Date().toISOString().split('T')[0],
    fecha_fin_vigencia: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    descripcion: '',
    modalidad_principal: 'TELETRABAJO',
    estado: 'VIGENTE',
    archivo_base64: '',
    nombre_archivo: '',
    archivo_pdf_url: undefined,
  });

  const abrirModalNuevaRes = () => {
    setFormRes({
      id: undefined,
      numero_resolucion: 'Resolución No. ',
      anio: new Date().getFullYear().toString(),
      fecha_expedicion: new Date().toISOString().split('T')[0],
      fecha_inicio_vigencia: new Date().toISOString().split('T')[0],
      fecha_fin_vigencia: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      descripcion: 'Por la cual se confiere la modalidad de teletrabajo a servidores públicos de la Secretaría Jurídica Distrital.',
      modalidad_principal: 'TELETRABAJO',
      estado: 'VIGENTE',
      archivo_base64: '',
      nombre_archivo: '',
      archivo_pdf_url: undefined,
    });
    setModalResVisible(true);
  };

  const abrirModalEditarRes = (r: ResolucionTeletrabajo) => {
    setFormRes({
      id: r.id,
      numero_resolucion: r.numero_resolucion || '',
      anio: (r.anio || new Date().getFullYear()).toString(),
      fecha_expedicion: r.fecha_expedicion ? r.fecha_expedicion.split('T')[0] : '',
      fecha_inicio_vigencia: r.fecha_inicio_vigencia ? r.fecha_inicio_vigencia.split('T')[0] : '',
      fecha_fin_vigencia: r.fecha_fin_vigencia ? r.fecha_fin_vigencia.split('T')[0] : '',
      descripcion: r.descripcion || '',
      modalidad_principal: r.modalidad_principal || 'TELETRABAJO',
      estado: r.estado || 'VIGENTE',
      archivo_base64: '',
      nombre_archivo: r.nombre_archivo || '',
      archivo_pdf_url: r.archivo_pdf_url || undefined,
    });
    setModalResVisible(true);
  };

  const handleSeleccionarArchivoResolucion = (e: any) => {
    if (Platform.OS === 'web' && e?.target?.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        setFormRes((prev) => ({
          ...prev,
          archivo_base64: event.target.result,
          nombre_archivo: file.name,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const guardarResolucion = async () => {
    if (!formRes.numero_resolucion.trim() || !formRes.fecha_expedicion) {
      mostrarMensaje('Datos Obligatorios', 'Por favor ingresa el número y la fecha de la resolución.', 'error');
      return;
    }
    const esEdicion = !!formRes.id;
    try {
      setGuardandoRes(true);
      await teletrabajoService.guardarResolucion({
        id: formRes.id,
        numero_resolucion: formRes.numero_resolucion.trim(),
        anio: parseInt(formRes.anio, 10) || new Date().getFullYear(),
        fecha_expedicion: formRes.fecha_expedicion,
        fecha_inicio_vigencia: formRes.fecha_inicio_vigencia,
        fecha_fin_vigencia: formRes.fecha_fin_vigencia,
        descripcion: formRes.descripcion,
        modalidad_principal: formRes.modalidad_principal,
        estado: formRes.estado,
        archivo_base64: formRes.archivo_base64 || undefined,
        nombre_archivo: formRes.nombre_archivo || undefined,
      });
      setModalResVisible(false);
      await cargarTodo();
      mostrarMensaje(
        esEdicion ? 'Resolución Actualizada' : 'Resolución Registrada',
        esEdicion
          ? 'Los cambios en el acto administrativo se han guardado exitosamente.'
          : 'El acto administrativo ha sido cargado con éxito en el catálogo general.',
        'success'
      );
    } catch (err: any) {
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar la resolución.', 'error');
    } finally {
      setGuardandoRes(false);
    }
  };

  // =========================================================================
  // MODAL 3: ACUERDO DE COMPROMISO
  // =========================================================================
  const [modalAcuerdoVisible, setModalAcuerdoVisible] = useState(false);
  const [guardandoAcuerdo, setGuardandoAcuerdo] = useState(false);
  const [formAcuerdo, setFormAcuerdo] = useState<{
    persona: PersonaPlanta | null;
    fecha_suscripcion: string;
    archivo_base64: string;
    nombre_archivo: string;
    observaciones: string;
  }>({
    persona: null,
    fecha_suscripcion: new Date().toISOString().split('T')[0],
    archivo_base64: '',
    nombre_archivo: '',
    observaciones: '',
  });

  const abrirModalAcuerdo = (persona: PersonaPlanta) => {
    setFormAcuerdo({
      persona,
      fecha_suscripcion: new Date().toISOString().split('T')[0],
      archivo_base64: '',
      nombre_archivo: '',
      observaciones: persona.requiere_nuevo_acuerdo
        ? 'Nuevo acuerdo generado por actualización o cambio de cargo.'
        : '',
    });
    setModalAcuerdoVisible(true);
  };

  const handleSeleccionarArchivoAcuerdo = (e: any) => {
    if (Platform.OS === 'web' && e?.target?.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        setFormAcuerdo((prev) => ({
          ...prev,
          archivo_base64: event.target.result,
          nombre_archivo: file.name,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const guardarAcuerdoCompromiso = async () => {
    if (!formAcuerdo.persona) return;
    try {
      setGuardandoAcuerdo(true);
      await teletrabajoService.guardarAcuerdo({
        asignacion_id: formAcuerdo.persona.asignacion_id || undefined,
        servidor_cedula: formAcuerdo.persona.titular_cedula,
        servidor_nombre: formAcuerdo.persona.titular_nombre,
        cargo_al_momento: formAcuerdo.persona.cargo,
        fecha_suscripcion: formAcuerdo.fecha_suscripcion,
        archivo_base64: formAcuerdo.archivo_base64 || undefined,
        nombre_archivo: formAcuerdo.nombre_archivo || undefined,
        observaciones: formAcuerdo.observaciones,
      });
      setModalAcuerdoVisible(false);
      await cargarTodo();
      mostrarMensaje('Acuerdo Suscrito', 'El acuerdo de compromiso de teletrabajo ha sido registrado y archivado exitosamente.', 'success');
    } catch (err: any) {
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar el acuerdo.', 'error');
    } finally {
      setGuardandoAcuerdo(false);
    }
  };

  // =========================================================================
  // MODAL 4: SEGUIMIENTO PERIÓDICO POR RANGO DE FECHAS
  // =========================================================================
  const [modalSegVisible, setModalSegVisible] = useState(false);
  const [modalInformeComiteVisible, setModalInformeComiteVisible] = useState(false);

  // =========================================================================
  // MODAL 5: TERMINAL WEB PARA EJECUTAR SEED / MIGRACIONES
  // =========================================================================
  const [modalTerminalVisible, setModalTerminalVisible] = useState(false);
  const [terminalEjecutando, setTerminalEjecutando] = useState(false);
  const [terminalComando, setTerminalComando] = useState('npm run seed:teletrabajo');
  const [terminalLogs, setTerminalLogs] = useState<
    Array<{ tipo: 'info' | 'cmd' | 'stdout' | 'stderr' | 'success' | 'error'; texto: string; timestamp: string }>
  >([
    {
      tipo: 'info',
      texto: 'SASGE Teletrabajo Terminal Engine v1.0.0 listo.\nServidor Node.js backend conectado.\nComando preparado: npm run seed:teletrabajo\nPresiona "▶ Ejecutar" para sembrar y actualizar la base de datos.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const ejecutarComandoTerminal = async (cmd?: string) => {
    const comandoAEjecutar = (cmd || terminalComando).trim();
    if (!comandoAEjecutar) return;

    setTerminalEjecutando(true);
    const ahora = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [
      ...prev,
      {
        tipo: 'cmd',
        texto: `$ ${comandoAEjecutar}`,
        timestamp: ahora,
      },
      {
        tipo: 'info',
        texto: 'Ejecutando script de migración en el backend...',
        timestamp: ahora,
      },
    ]);

    try {
      const resp = await teletrabajoService.ejecutarSeed(comandoAEjecutar);
      if (resp.stdout) {
        setTerminalLogs((prev) => [
          ...prev,
          {
            tipo: 'stdout',
            texto: resp.stdout,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
      if (resp.stderr) {
        setTerminalLogs((prev) => [
          ...prev,
          {
            tipo: 'stderr',
            texto: resp.stderr,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }

      if (resp.ok) {
        setTerminalLogs((prev) => [
          ...prev,
          {
            tipo: 'success',
            texto: `✓ Proceso terminado con éxito (código 0) en ${resp.durationMs || 0}ms. Recargando datos...`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        // Recargar datos para que todo se actualice de inmediato
        await cargarTodo();
      } else {
        setTerminalLogs((prev) => [
          ...prev,
          {
            tipo: 'error',
            texto: `✗ Error en ejecución: ${resp.error || 'Código de salida distinto de 0'}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (err: any) {
      setTerminalLogs((prev) => [
        ...prev,
        {
          tipo: 'error',
          texto: `✗ Error de conexión o ejecución: ${err.message || 'Error desconocido'}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setTerminalEjecutando(false);
    }
  };

  const limpiarConsola = () => {
    setTerminalLogs([
      {
        tipo: 'info',
        texto: 'Terminal despejada. Listo para ejecutar.',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const [guardandoSeg, setGuardandoSeg] = useState(false);
  const [formSeg, setFormSeg] = useState<{
    persona: PersonaPlanta | null;
    fecha_corte_desde: string;
    fecha_corte_hasta: string;
    evaluador_nombre: string;
    evaluador_cargo: string;
    cumplimiento_nivel: 'SOBRESALIENTE' | 'SATISFACTORIO' | 'PARCIAL' | 'NO_CUMPLE';
    calificacion_porcentaje: string;
    actividades_reportadas: string;
    concepto_recomendacion: 'CONTINUAR' | 'AJUSTAR_DIAS' | 'REVERSION_PRESENCIAL';
    archivo_base64: string;
    nombre_archivo: string;
    observaciones: string;
    // Campos Procedimiento PR-117 v06
    dias_efectivos_teletrabajo: string;
    radicado_memorando_ft018: string;
    fecha_radicacion_memorando: string;
    tipo_seguimiento: 'MENSUAL_ORDINARIO' | 'EVALUACION_PR012' | 'EXTRAORDINARIO';
    aplica_auxilio_servicios: boolean;
    estrato_socioeconomico: string;
    novedad_cambio_domicilio: boolean;
    observaciones_cambio_domicilio: string;
    estado_visita_sst_tic: 'VIGENTE' | 'PENDIENTE_INSPECCION_ANUAL' | 'REQUIERE_NUEVA_VISITA_POR_CAMBIO_DOMICILIO';
  }>({
    persona: null,
    fecha_corte_desde: '',
    fecha_corte_hasta: new Date().toISOString().split('T')[0],
    evaluador_nombre: 'Jefe Inmediato / Líder de Área',
    evaluador_cargo: 'Director(a) Técnico(a)',
    cumplimiento_nivel: 'SATISFACTORIO',
    calificacion_porcentaje: '100',
    actividades_reportadas: '',
    concepto_recomendacion: 'CONTINUAR',
    archivo_base64: '',
    nombre_archivo: '',
    observaciones: '',
    dias_efectivos_teletrabajo: '8',
    radicado_memorando_ft018: '',
    fecha_radicacion_memorando: new Date().toISOString().split('T')[0],
    tipo_seguimiento: 'MENSUAL_ORDINARIO',
    aplica_auxilio_servicios: true,
    estrato_socioeconomico: '3',
    novedad_cambio_domicilio: false,
    observaciones_cambio_domicilio: '',
    estado_visita_sst_tic: 'VIGENTE',
  });

  const abrirModalSeguimiento = (persona: PersonaPlanta) => {
    // Calcular por defecto el mes anterior o rango del último corte
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().split('T')[0];
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 0).toISOString().split('T')[0];

    // Días estimados según modalidad (híbrido ~8 a 12 días al mes)
    const diasSugeridos = (persona.dias_por_semana ? persona.dias_por_semana * 4 : 8).toString();

    setFormSeg({
      persona,
      fecha_corte_desde: primerDiaMes,
      fecha_corte_hasta: ultimoDiaMes,
      evaluador_nombre: 'Jefe Inmediato',
      evaluador_cargo: 'Líder de Dependencia',
      cumplimiento_nivel: 'SATISFACTORIO',
      calificacion_porcentaje: '100',
      actividades_reportadas: 'Cumplimiento oportuno de compromisos concertados en matriz de metas semanales.',
      concepto_recomendacion: 'CONTINUAR',
      archivo_base64: '',
      nombre_archivo: '',
      observaciones: '',
      dias_efectivos_teletrabajo: diasSugeridos,
      radicado_memorando_ft018: `2311520-FT-018-${hoy.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      fecha_radicacion_memorando: new Date().toISOString().split('T')[0],
      tipo_seguimiento: 'MENSUAL_ORDINARIO',
      aplica_auxilio_servicios: true,
      estrato_socioeconomico: '3',
      novedad_cambio_domicilio: false,
      observaciones_cambio_domicilio: '',
      estado_visita_sst_tic: 'VIGENTE',
    });
    setModalSegVisible(true);
  };

  const handleSeleccionarArchivoSeguimiento = (e: any) => {
    if (Platform.OS === 'web' && e?.target?.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        setFormSeg((prev) => ({
          ...prev,
          archivo_base64: event.target.result,
          nombre_archivo: file.name,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const guardarSeguimiento = async () => {
    if (!formSeg.persona) return;
    if (!formSeg.fecha_corte_desde || !formSeg.fecha_corte_hasta) {
      mostrarMensaje('Rango Incompleto', 'Debe especificar la fecha de inicio y fin del periodo de seguimiento.', 'error');
      return;
    }
    try {
      setGuardandoSeg(true);
      await teletrabajoService.guardarSeguimiento({
        asignacion_id: formSeg.persona.asignacion_id || undefined,
        servidor_cedula: formSeg.persona.titular_cedula,
        servidor_nombre: formSeg.persona.titular_nombre,
        fecha_corte_desde: formSeg.fecha_corte_desde,
        fecha_corte_hasta: formSeg.fecha_corte_hasta,
        evaluador_nombre: formSeg.evaluador_nombre,
        evaluador_cargo: formSeg.evaluador_cargo,
        cumplimiento_nivel: formSeg.cumplimiento_nivel,
        calificacion_porcentaje: parseFloat(formSeg.calificacion_porcentaje) || 100,
        actividades_reportadas: formSeg.actividades_reportadas,
        concepto_recomendacion: formSeg.concepto_recomendacion,
        archivo_base64: formSeg.archivo_base64 || undefined,
        nombre_archivo: formSeg.nombre_archivo || undefined,
        observaciones: formSeg.observaciones,
        // Procedimiento 2311300-PR-117 v06
        dias_efectivos_teletrabajo: parseInt(formSeg.dias_efectivos_teletrabajo, 10) || 0,
        radicado_memorando_ft018: formSeg.radicado_memorando_ft018,
        fecha_radicacion_memorando: formSeg.fecha_radicacion_memorando,
        tipo_seguimiento: formSeg.tipo_seguimiento,
        aplica_auxilio_servicios: formSeg.aplica_auxilio_servicios,
        estrato_socioeconomico: parseInt(formSeg.estrato_socioeconomico, 10) || 3,
        novedad_cambio_domicilio: formSeg.novedad_cambio_domicilio,
        observaciones_cambio_domicilio: formSeg.observaciones_cambio_domicilio,
        estado_visita_sst_tic: formSeg.novedad_cambio_domicilio
          ? 'REQUIERE_NUEVA_VISITA_POR_CAMBIO_DOMICILIO'
          : formSeg.estado_visita_sst_tic,
      });
      setModalSegVisible(false);
      await cargarTodo();
      mostrarMensaje(
        'Seguimiento Consignado',
        `El corte de seguimiento (${formSeg.fecha_corte_desde} al ${formSeg.fecha_corte_hasta}) con ${formSeg.dias_efectivos_teletrabajo} días certificados fue registrado satisfactoriamente.${
          formSeg.novedad_cambio_domicilio
            ? ' Se ha generado la alerta técnica de visita prioritaria SST (FT-261) y TIC (FT-400) por cambio de domicilio.'
            : ''
        }`,
        'success'
      );
    } catch (err: any) {
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar el seguimiento.', 'error');
    } finally {
      setGuardandoSeg(false);
    }
  };

  // =========================================================================
  // FILTRADO DE PERSONAS
  // =========================================================================
  const dependenciasDisponibles = Array.from(
    new Set(personas.map((p) => p.dependencia_cargo).filter(Boolean))
  ) as string[];

  const personasFiltradas = personas.filter((p) => {
    const q = busqueda.toLowerCase().trim();
    const coincideTexto =
      !q ||
      p.titular_nombre.toLowerCase().includes(q) ||
      p.titular_cedula.includes(q) ||
      p.cargo.toLowerCase().includes(q) ||
      (p.dependencia_cargo && p.dependencia_cargo.toLowerCase().includes(q));

    const coincideModalidad =
      filtroModalidad === 'TODOS' ||
      (filtroModalidad === 'TELETRABAJO' && p.modalidad === 'TELETRABAJO' && p.asignacion_estado === 'ACTIVO') ||
      (filtroModalidad === 'TRABAJO_EN_CASA' && p.modalidad === 'TRABAJO_EN_CASA' && p.asignacion_estado === 'ACTIVO') ||
      (filtroModalidad === 'SIN_MODALIDAD' && (!p.modalidad || p.asignacion_estado !== 'ACTIVO')) ||
      (filtroModalidad === 'NUEVO_ACUERDO' && p.requiere_nuevo_acuerdo);

    const coincideDep =
      filtroDependencia === 'TODOS' || p.dependencia_cargo === filtroDependencia;

    return coincideTexto && coincideModalidad && coincideDep;
  });

  const resolucionesFiltradas = resoluciones.filter((r) => {
    const q = busquedaResoluciones.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.numero_resolucion && r.numero_resolucion.toLowerCase().includes(q)) ||
      (r.descripcion && r.descripcion.toLowerCase().includes(q)) ||
      (r.estado && r.estado.toLowerCase().includes(q)) ||
      (r.modalidad_principal && r.modalidad_principal.toLowerCase().includes(q)) ||
      (r.anio ? r.anio.toString() : '').includes(q)
    );
  });

  const acuerdosFiltrados = acuerdos.filter((ac) => {
    const q = busquedaAcuerdos.toLowerCase().trim();
    if (!q) return true;
    return (
      (ac.servidor_nombre && ac.servidor_nombre.toLowerCase().includes(q)) ||
      (ac.servidor_cedula && ac.servidor_cedula.includes(q)) ||
      (ac.cargo_al_momento && ac.cargo_al_momento.toLowerCase().includes(q)) ||
      (ac.periodo_vigencia && ac.periodo_vigencia.toLowerCase().includes(q))
    );
  });

  const seguimientosFiltrados = seguimientos.filter((s) => {
    const q = busquedaSeguimientos.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.servidor_nombre && s.servidor_nombre.toLowerCase().includes(q)) ||
      (s.servidor_cedula && s.servidor_cedula.includes(q)) ||
      (s.actividades_reportadas && s.actividades_reportadas.toLowerCase().includes(q)) ||
      (s.cumplimiento_nivel && s.cumplimiento_nivel.toLowerCase().includes(q)) ||
      (s.concepto_recomendacion && s.concepto_recomendacion.toLowerCase().includes(q))
    );
  });

  // Métricas Consolidadas de Seguimiento (Punto de Control Semestral - PR-117 v06)
  const { promedioCumplimiento, totalDiasTeletrabajados, totalAlertasCambioDomicilio } = useMemo(() => {
    const totalRegistros = seguimientos.length;
    const sumCalificaciones = seguimientos.reduce((a, s) => a + (Number(s.calificacion_porcentaje) || 0), 0);
    const prom = totalRegistros > 0 ? (sumCalificaciones / totalRegistros).toFixed(1) : '100.0';
    const dias = seguimientos.reduce((a, s) => a + (Number(s.dias_efectivos_teletrabajo) || 0), 0);
    const alertas = seguimientos.filter(
      (s) => s.novedad_cambio_domicilio || s.estado_visita_sst_tic === 'REQUIERE_NUEVA_VISITA_POR_CAMBIO_DOMICILIO'
    ).length;
    return {
      promedioCumplimiento: prom,
      totalDiasTeletrabajados: dias,
      totalAlertasCambioDomicilio: alertas,
    };
  }, [seguimientos]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.darkBg }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* ================================================================= */}
        {/* CABECERA INSTITUCIONAL (bg-marca-900 estilo supervision)         */}
        {/* ================================================================= */}
        <View
          style={{
            backgroundColor: THEME.marca900,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            paddingHorizontal: isDesktop ? 32 : 16,
            paddingVertical: 14,
          }}
        >
          <View
            style={{
              maxWidth: 1440,
              width: '100%',
              marginHorizontal: 'auto',
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
                  backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                })}
              >
                <Ionicons name="arrow-back" size={16} color={THEME.marca100} />
                <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '500' }}>
                  Volver al Portal
                </Text>
              </Pressable>

              <View style={{ width: 1, height: 26, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

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
                  Gestión y Censo de Teletrabajo
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Botón Terminal Web para ejecutar migraciones y seed */}
              <Pressable
                onPress={() => setModalTerminalVisible(true)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#0F172A',
                  borderColor: '#38BDF8',
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  opacity: pressed ? 0.85 : 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                })}
              >
                <Ionicons name="terminal" size={15} color="#38BDF8" />
                <Text style={{ color: '#F8FAFC', fontSize: 12, fontWeight: '700' }}>
                  Terminal Seed DB
                </Text>
              </Pressable>

              <Pressable
                onPress={() => abrirModalNuevaRes()}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: THEME.marca600,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 8,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Ionicons name="document-attach-outline" size={16} color={THEME.white} />
                <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '600' }}>
                  Nueva Resolución
                </Text>
              </Pressable>

              <Pressable
                onPress={() => cargarTodo()}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                })}
                accessibilityLabel="Refrescar datos"
              >
                <Ionicons name="refresh-outline" size={16} color={THEME.marca100} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ================================================================= */}
        {/* BANNER DE MÉTRICAS RÁPIDAS (Estilo tarjetas blancas Ri)           */}
        {/* ================================================================= */}
        <View
          style={{
            backgroundColor: THEME.white,
            borderBottomWidth: 1,
            borderBottomColor: THEME.slate200,
            paddingHorizontal: isDesktop ? 32 : 16,
            paddingVertical: 12,
          }}
        >
          <View
            style={{
              maxWidth: 1440,
              width: '100%',
              marginHorizontal: 'auto',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 16,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="people" size={16} color={THEME.slate500} />
                <Text style={{ color: THEME.slate500, fontSize: 12, fontWeight: '500' }}>Planta Total:</Text>
                <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '700' }}>
                  {estadisticas?.total_personal_planta || personas.length}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="laptop" size={16} color={THEME.skyText} />
                <Text style={{ color: THEME.skyText, fontSize: 12, fontWeight: '500' }}>Teletrabajo Activo:</Text>
                <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '700' }}>
                  {estadisticas?.activas?.en_teletrabajo || 0}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="home" size={16} color={THEME.purpleText} />
                <Text style={{ color: THEME.purpleText, fontSize: 12, fontWeight: '500' }}>Trabajo en Casa:</Text>
                <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '700' }}>
                  {estadisticas?.activas?.en_trabajo_en_casa || 0}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar" size={16} color={THEME.amberText} />
                <Text style={{ color: THEME.amberText, fontSize: 12, fontWeight: '500' }}>Pares / Impares:</Text>
                <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '700' }}>
                  {estadisticas?.activas?.dias_pares || 0} / {estadisticas?.activas?.dias_impares || 0}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="shield-half" size={16} color={THEME.roseText} />
                <Text style={{ color: THEME.roseText, fontSize: 12, fontWeight: '500' }}>Excepción Jefe:</Text>
                <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '700' }}>
                  {estadisticas?.activas?.con_excepcion_jefe || 0}
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: THEME.emeraldBg,
                borderColor: THEME.emeraldRing,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 9999,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Ionicons name="newspaper-outline" size={13} color={THEME.emeraldText} />
              <Text style={{ color: THEME.emeraldText, fontSize: 11, fontWeight: '600' }}>
                Resoluciones Vigentes: {resoluciones.filter((r) => r.estado === 'VIGENTE').length}
              </Text>
            </View>
          </View>
        </View>

        {/* ================================================================= */}
        {/* BARRA DE PESTAÑAS (Estilo Underline de supervision-prueba)        */}
        {/* ================================================================= */}
        <View
          style={{
            backgroundColor: THEME.white,
            borderBottomWidth: 1,
            borderBottomColor: THEME.slate200,
            paddingHorizontal: isDesktop ? 32 : 16,
          }}
        >
          <View
            style={{
              maxWidth: 1440,
              width: '100%',
              marginHorizontal: 'auto',
              flexDirection: 'row',
              gap: 8,
              overflow: 'hidden',
            }}
          >
            {[
              { id: 'censo', label: 'Censo y Asignaciones', icon: 'people-outline', count: personas.length },
              { id: 'resoluciones', label: 'Resoluciones Oficiales', icon: 'document-text-outline', count: resoluciones.length },
              { id: 'procedimiento', label: 'Política y Procedimiento (PR-117)', icon: 'book-outline', badge: 'v06' },
              { id: 'cargos', label: 'Cargos Teletrabajables', icon: 'briefcase-outline', count: cargos.length },
              { id: 'acuerdos', label: 'Acuerdos de Voluntariedad', icon: 'ribbon-outline', count: acuerdos.length },
              { id: 'seguimientos', label: 'Seguimientos por Fechas', icon: 'calendar-outline', count: seguimientos.length },
            ].map((tab) => {
              const isSel = tabActiva === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setTabActiva(tab.id as any)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderBottomWidth: 2,
                    borderBottomColor: isSel ? THEME.marca600 : 'transparent',
                    marginBottom: -1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={isSel ? THEME.marca700 : THEME.slate400}
                  />
                  <Text
                    style={{
                      color: isSel ? THEME.marca700 : THEME.slate500,
                      fontSize: 13,
                      fontWeight: isSel ? '600' : '500',
                    }}
                  >
                    {tab.label}
                  </Text>
                  {tab.count !== undefined && (
                    <View
                      style={{
                        backgroundColor: isSel ? THEME.marca50 : THEME.slate100,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 9999,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: isSel ? THEME.marca700 : THEME.slate600,
                        }}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  )}
                  {tab.badge && (
                    <View
                      style={{
                        backgroundColor: isSel ? THEME.badges.emerald.bg : THEME.slate100,
                        borderColor: isSel ? THEME.badges.emerald.border : THEME.slate300,
                        borderWidth: 1,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 9999,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: isSel ? THEME.badges.emerald.text : THEME.slate600,
                        }}
                      >
                        {tab.badge}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ================================================================= */}
        {/* CONTENIDO PRINCIPAL POR PESTAÑA */}
        {/* ================================================================= */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>Cargando módulo de teletrabajo...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: isDesktop ? 36 : 18,
              paddingVertical: 20,
              gap: 20,
            }}
          >
            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 1: CENSO Y ASIGNACIÓN DE MODALIDADES                   */}
            {/* ------------------------------------------------------------- */}
            {tabActiva === 'censo' && (
              <View style={{ gap: 16 }}>
                {/* Barra de Filtros */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 16,
                    flexDirection: isDesktop ? 'row' : 'column',
                    gap: 12,
                    alignItems: isDesktop ? 'center' : 'stretch',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.03,
                    shadowRadius: 2,
                  }}
                >
                  <View
                    style={{
                      flex: 2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: THEME.slate50,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      paddingHorizontal: 12,
                      height: 40,
                    }}
                  >
                    <Ionicons name="search" size={17} color={THEME.slate400} style={{ marginRight: 8 }} />
                    <TextInput
                      value={busqueda}
                      onChangeText={setBusqueda}
                      placeholder="Buscar por cédula, nombre, cargo o dependencia..."
                      placeholderTextColor={THEME.slate400}
                      style={{ flex: 1, color: THEME.slate900, fontSize: 13, outlineStyle: 'none' as never }}
                    />
                    {busqueda.length > 0 && (
                      <Pressable onPress={() => setBusqueda('')}>
                        <Ionicons name="close-circle" size={16} color={THEME.slate400} />
                      </Pressable>
                    )}
                  </View>

                  {/* Filtro por Modalidad */}
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { id: 'TODOS', label: 'Todos' },
                      { id: 'TELETRABAJO', label: 'Teletrabajo' },
                      { id: 'TELETRABAJO_AUTONOMO', label: 'Autónomo' },
                      { id: 'TRABAJO_EN_CASA', label: 'Trabajo en Casa' },
                      { id: 'SIN_MODALIDAD', label: 'Presencial' },
                      { id: 'NUEVO_ACUERDO', label: '⚠️ Requiere Acuerdo' },
                    ].map((f) => {
                      const sel = filtroModalidad === f.id;
                      return (
                        <Pressable
                          key={f.id}
                          onPress={() => setFiltroModalidad(f.id)}
                          style={{
                            backgroundColor: sel ? THEME.marca50 : THEME.white,
                            paddingHorizontal: 11,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: sel ? THEME.marca600 : THEME.slate200,
                          }}
                        >
                          <Text
                            style={{
                              color: sel ? THEME.marca700 : THEME.slate600,
                              fontSize: 11.5,
                              fontWeight: sel ? '600' : '500',
                            }}
                          >
                            {f.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Barra de visualización y conteo */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <Text style={{ color: THEME.slate600, fontSize: 13, fontWeight: '600' }}>
                    Mostrando {personasFiltradas.length} servidores de planta
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Botones de ajuste de columnas cuando la tabla está activa */}
                    {modoVistaCenso === 'tabla' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Pressable
                          onPress={() => setAjustarAPantalla(!ajustarAPantalla)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: ajustarAPantalla ? THEME.marca50 : THEME.white,
                            borderColor: ajustarAPantalla ? THEME.marca600 : THEME.slate200,
                            borderWidth: 1,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                          }}
                        >
                          <Ionicons
                            name={ajustarAPantalla ? 'contract-outline' : 'expand-outline'}
                            size={14}
                            color={ajustarAPantalla ? THEME.marca700 : THEME.slate600}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '600',
                              color: ajustarAPantalla ? THEME.marca700 : THEME.slate600,
                            }}
                          >
                            {ajustarAPantalla ? 'Ajustado a Pantalla (100%)' : 'Ajustar a Pantalla'}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={restablecerColumnas}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: THEME.white,
                            borderColor: THEME.slate200,
                            borderWidth: 1,
                            paddingHorizontal: 9,
                            paddingVertical: 6,
                            borderRadius: 6,
                          }}
                        >
                          <Ionicons name="refresh-outline" size={13} color={THEME.slate600} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate600 }}>
                            Restablecer
                          </Text>
                        </Pressable>
                      </View>
                    )}

                    {/* Selector de modo de vista: Tarjetas vs Tabla */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: THEME.slate100,
                        borderRadius: 8,
                        padding: 3,
                      }}
                    >
                      <Pressable
                        onPress={() => setModoVistaCenso('tabla')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: modoVistaCenso === 'tabla' ? THEME.white : 'transparent',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6,
                          shadowColor: modoVistaCenso === 'tabla' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                        }}
                      >
                        <Ionicons
                          name="list"
                          size={15}
                          color={modoVistaCenso === 'tabla' ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          style={{
                            color: modoVistaCenso === 'tabla' ? THEME.marca700 : THEME.slate500,
                            fontSize: 12,
                            fontWeight: modoVistaCenso === 'tabla' ? '600' : '500',
                          }}
                        >
                          Tabla
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setModoVistaCenso('cards')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: modoVistaCenso === 'cards' ? THEME.white : 'transparent',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6,
                          shadowColor: modoVistaCenso === 'cards' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                        }}
                      >
                        <Ionicons
                          name="grid"
                          size={15}
                          color={modoVistaCenso === 'cards' ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          style={{
                            color: modoVistaCenso === 'cards' ? THEME.marca700 : THEME.slate500,
                            fontSize: 12,
                            fontWeight: modoVistaCenso === 'cards' ? '600' : '500',
                          }}
                        >
                          Tarjetas
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {modoVistaCenso === 'tabla' && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Ionicons name="information-circle-outline" size={16} color={THEME.marca700} />
                      <Text style={{ color: THEME.slate600, fontSize: 11.5, flex: 1 }}>
                        💡 Haz clic en cualquier fila para <Text style={{ fontWeight: '700', color: THEME.slate900 }}>abrir el modal de cambios</Text>. Arrastra los divisores de cabecera con el ratón para ajustar el ancho de las columnas.
                      </Text>
                    </View>
                    <View style={{ backgroundColor: THEME.slate100, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: THEME.slate600, fontSize: 10.5, fontWeight: '700' }}>
                        {ajustarAPantalla ? 'Ajuste 100% Pantalla' : 'Ancho Manual'}
                      </Text>
                    </View>
                  </View>
                )}

                {modoVistaCenso === 'tabla' ? (
                  /* VISTA 2: TABLA DE CENSO DE TELETRABAJO */
                  <View
                    onLayout={(e) => {
                      const w = e.nativeEvent.layout.width;
                      if (w > 0 && Math.abs(w - anchoContenedorTabla) > 5) {
                        setAnchoContenedorTabla(w);
                      }
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: THEME.white,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                    }}
                  >
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator
                      contentContainerStyle={{
                        minWidth: '100%',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Encabezado de la tabla */}
                      <View
                        style={{
                          flexDirection: 'row',
                          backgroundColor: THEME.slate50,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.slate200,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          alignItems: 'center',
                        }}
                      >
                        {[
                          { key: 'plaza', label: 'PLAZA / C.C.' },
                          { key: 'servidor', label: 'SERVIDOR PÚBLICO' },
                          { key: 'cargo', label: 'CARGO & GRADO' },
                          { key: 'dependencia', label: 'DEPENDENCIA' },
                          { key: 'modalidad', label: 'MODALIDAD ACTUAL' },
                          { key: 'esquema', label: 'ESQUEMA / DÍAS' },
                          { key: 'vigencia', label: 'VIGENCIA' },
                          { key: 'resolucion', label: 'RESOLUCIÓN' },
                          { key: 'acciones', label: 'ACCIONES' },
                        ].map((col) => {
                          const w = anchoEfectivo(col.key);
                          return (
                            <View
                              key={col.key}
                              style={{
                                width: w,
                                position: 'relative',
                                paddingRight: 10,
                                justifyContent: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  color: THEME.slate600,
                                  fontSize: 11,
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                  textAlign: col.key === 'acciones' ? 'center' : 'left',
                                }}
                                numberOfLines={1}
                              >
                                {col.label}
                              </Text>

                              {/* Separador arrastrable para ajustar columnas */}
                              <View
                                // @ts-ignore
                                onMouseDown={(e: any) => iniciarRedimension(col.key, e)}
                                style={{
                                  position: 'absolute',
                                  right: 2,
                                  top: -8,
                                  bottom: -8,
                                  width: 10,
                                  // @ts-ignore
                                  cursor: 'col-resize' as any,
                                  zIndex: 10,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <View style={{ width: 1.5, height: 16, backgroundColor: THEME.slate300, borderRadius: 1 }} />
                              </View>
                            </View>
                          );
                        })}
                      </View>

                      {/* Cuerpo con Scroll vertical */}
                      <ScrollView style={{ maxHeight: 650 }} showsVerticalScrollIndicator>
                        {personasFiltradas.map((p, index) => {
                          const tieneModalidad = p.modalidad && p.asignacion_estado === 'ACTIVO';
                          const esAutonomo = p.modalidad === 'TELETRABAJO_AUTONOMO';
                          const esTeletrabajo = p.modalidad === 'TELETRABAJO' || esAutonomo;
                          const esPar = index % 2 === 0;

                          return (
                            <TouchableOpacity
                              key={p.id_plaza}
                              activeOpacity={0.7}
                              onPress={() => abrirModalAsignacion(p)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                backgroundColor: esPar ? THEME.white : '#FAFCFF',
                                borderBottomWidth: 1,
                                borderBottomColor: THEME.slate100,
                                // @ts-ignore
                                cursor: 'pointer',
                              }}
                            >
                              {/* Columna Plaza y Cédula */}
                              <View style={{ width: anchoEfectivo('plaza'), gap: 2, paddingRight: 8 }}>
                                <View
                                  style={{
                                    backgroundColor: THEME.slate100,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 4,
                                    alignSelf: 'flex-start',
                                    borderWidth: 1,
                                    borderColor: THEME.slate200,
                                  }}
                                >
                                  <Text style={{ color: THEME.slate700, fontSize: 11, fontWeight: '700' }}>
                                    #{p.id_plaza}
                                  </Text>
                                </View>
                                <Text style={{ color: THEME.slate500, fontSize: 11 }}>
                                  {p.titular_cedula}
                                </Text>
                              </View>

                              {/* Columna Servidor */}
                              <View style={{ width: anchoEfectivo('servidor'), paddingRight: 10 }}>
                                <Text style={{ color: THEME.slate900, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                                  {p.titular_nombre}
                                </Text>
                                {p.requiere_nuevo_acuerdo && (
                                  <Text style={{ color: THEME.amberText, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                                    ⚠️ Requiere Nuevo Acuerdo
                                  </Text>
                                )}
                              </View>

                              {/* Columna Cargo */}
                              <View style={{ width: anchoEfectivo('cargo'), paddingRight: 10 }}>
                                <Text style={{ color: THEME.marca800, fontSize: 12.5, fontWeight: '600' }} numberOfLines={2}>
                                  {p.cargo} {p.codigo ? `(${p.codigo}-${p.grado})` : ''}
                                </Text>
                                {!p.cargo_es_teletrabajable && (
                                  <Text style={{ color: THEME.roseText, fontSize: 10, marginTop: 1 }}>
                                    {p.excepcion_jefe_aprobada ? 'Excepción aprobada' : 'No teletrabajable'}
                                  </Text>
                                )}
                              </View>

                              {/* Columna Dependencia */}
                              <View style={{ width: anchoEfectivo('dependencia'), paddingRight: 10 }}>
                                <Text style={{ color: THEME.slate600, fontSize: 11.5 }} numberOfLines={2}>
                                  {p.dependencia_cargo}
                                </Text>
                              </View>

                              {/* Columna Modalidad */}
                              <View style={{ width: anchoEfectivo('modalidad'), paddingRight: 8 }}>
                                {tieneModalidad ? (
                                  <View
                                    style={{
                                      backgroundColor: esAutonomo
                                        ? THEME.skyBg
                                        : esTeletrabajo
                                        ? THEME.emeraldBg
                                        : THEME.purpleBg,
                                      borderColor: esAutonomo
                                        ? THEME.skyRing
                                        : esTeletrabajo
                                        ? THEME.emeraldRing
                                        : THEME.purpleRing,
                                      borderWidth: 1,
                                      paddingHorizontal: 8,
                                      paddingVertical: 2.5,
                                      borderRadius: 9999,
                                      alignSelf: 'flex-start',
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color: esAutonomo
                                          ? THEME.skyText
                                          : esTeletrabajo
                                          ? THEME.emeraldText
                                          : THEME.purpleText,
                                        fontSize: 11,
                                        fontWeight: '700',
                                      }}
                                    >
                                      {esAutonomo
                                        ? 'Autónomo'
                                        : esTeletrabajo
                                        ? 'Teletrabajo'
                                        : 'Trabajo Casa'}
                                    </Text>
                                  </View>
                                ) : (
                                  <View
                                    style={{
                                      backgroundColor: THEME.slateBadgeBg,
                                      borderColor: THEME.slateBadgeRing,
                                      borderWidth: 1,
                                      paddingHorizontal: 8,
                                      paddingVertical: 2.5,
                                      borderRadius: 9999,
                                      alignSelf: 'flex-start',
                                    }}
                                  >
                                    <Text style={{ color: THEME.slateBadgeText, fontSize: 11, fontWeight: '600' }}>
                                      Presencial
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* Columna Esquema / Días */}
                              <View style={{ width: anchoEfectivo('esquema'), paddingRight: 8 }}>
                                {tieneModalidad ? (
                                  <Text style={{ color: THEME.slate800, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                                    {p.esquema_dias_tipo === 'TODOS'
                                      ? 'Todos los días (L-V)'
                                      : p.esquema_dias_tipo === 'DIAS_PARES'
                                      ? 'Días Pares'
                                      : p.esquema_dias_tipo === 'DIAS_IMPARES'
                                      ? 'Días Impares'
                                      : Array.isArray(p.dias_semana_fijos) && p.dias_semana_fijos.length > 0
                                      ? p.dias_semana_fijos.join(', ')
                                      : `${p.dias_por_semana || 2} días/sem`}
                                  </Text>
                                ) : (
                                  <Text style={{ color: THEME.slate400, fontSize: 11 }}>5 días presenciales</Text>
                                )}
                              </View>

                              {/* Columna Vigencia */}
                              <View style={{ width: anchoEfectivo('vigencia'), paddingRight: 8 }}>
                                {tieneModalidad && p.asignacion_desde ? (
                                  <Text style={{ color: THEME.slate600, fontSize: 11 }}>
                                    {limpiarFecha(p.asignacion_desde)} al {limpiarFecha(p.asignacion_hasta) || 'indef.'}
                                  </Text>
                                ) : (
                                  <Text style={{ color: THEME.slate400, fontSize: 11 }}>-</Text>
                                )}
                              </View>

                              {/* Columna Resolución */}
                              <View style={{ width: anchoEfectivo('resolucion'), paddingRight: 8 }}>
                                <Text style={{ color: p.numero_resolucion_display ? THEME.emeraldText : THEME.slate400, fontSize: 11, fontWeight: '600' }}>
                                  {p.numero_resolucion_display || '-'}
                                </Text>
                              </View>

                              {/* Columna Acciones */}
                              <View style={{ width: anchoEfectivo('acciones'), flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    abrirModalAsignacion(p);
                                  }}
                                  style={{
                                    backgroundColor: THEME.marca700,
                                    paddingHorizontal: 9,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Ionicons name="options-outline" size={13} color={THEME.white} />
                                  <Text style={{ color: THEME.white, fontSize: 11, fontWeight: '600' }}>
                                    {tieneModalidad ? 'Editar' : 'Asignar'}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    abrirModalAcuerdo(p);
                                  }}
                                  style={{
                                    backgroundColor: p.requiere_nuevo_acuerdo ? THEME.amberBg : THEME.slate100,
                                    borderColor: p.requiere_nuevo_acuerdo ? THEME.amberRing : THEME.slate200,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 3,
                                  }}
                                >
                                  <Ionicons
                                    name="ribbon-outline"
                                    size={13}
                                    color={p.requiere_nuevo_acuerdo ? THEME.amberText : THEME.slate600}
                                  />
                                  <Text style={{ color: p.requiere_nuevo_acuerdo ? THEME.amberText : THEME.slate700, fontSize: 11, fontWeight: '600' }}>
                                    Acuerdo
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    abrirModalSeguimiento(p);
                                  }}
                                  style={{
                                    backgroundColor: THEME.marca50,
                                    borderWidth: 1,
                                    borderColor: THEME.marca100,
                                    paddingHorizontal: 8,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 3,
                                  }}
                                >
                                  <Ionicons name="calendar-outline" size={13} color={THEME.marca700} />
                                  <Text style={{ color: THEME.marca700, fontSize: 11, fontWeight: '600' }}>
                                    Seg.
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </ScrollView>
                  </View>
                ) : (
                  /* VISTA 1: TARJETAS (CARDS) MEJORADAS EN FONDO CLARO */
                  <View style={{ gap: 12 }}>
                    {personasFiltradas.map((p) => {
                      const tieneModalidad = p.modalidad && p.asignacion_estado === 'ACTIVO';
                      const esAutonomo = p.modalidad === 'TELETRABAJO_AUTONOMO';
                      const esTeletrabajo = p.modalidad === 'TELETRABAJO' || esAutonomo;

                      return (
                        <View
                          key={p.id_plaza}
                          style={{
                            backgroundColor: THEME.white,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: tieneModalidad
                              ? esAutonomo
                                ? THEME.skyRing
                                : esTeletrabajo
                                ? THEME.emeraldRing
                                : THEME.purpleRing
                              : THEME.slate200,
                            padding: 18,
                            flexDirection: isDesktop ? 'row' : 'column',
                            justifyContent: 'space-between',
                            alignItems: isDesktop ? 'center' : 'stretch',
                            gap: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.04,
                            shadowRadius: 6,
                            elevation: 2,
                          }}
                        >
                          <View style={{ flex: 1, gap: 8 }}>
                            {/* Cabecera Tarjeta: Plaza, Nombre, Cédula, Badges */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <View
                                style={{
                                  backgroundColor: THEME.slate100,
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  borderRadius: 5,
                                  borderWidth: 1,
                                  borderColor: THEME.slate200,
                                }}
                              >
                                <Text style={{ color: THEME.slate700, fontSize: 11, fontWeight: '700' }}>
                                  #{p.id_plaza}
                                </Text>
                              </View>

                              <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '800' }}>
                                {p.titular_nombre}
                              </Text>

                              <Text style={{ color: THEME.slate500, fontSize: 12.5, fontWeight: '600' }}>
                                C.C. {p.titular_cedula}
                              </Text>

                              {/* Badge Modalidad */}
                              {tieneModalidad ? (
                                <View
                                  style={{
                                    backgroundColor: esAutonomo
                                      ? THEME.skyBg
                                      : esTeletrabajo
                                      ? THEME.emeraldBg
                                      : THEME.purpleBg,
                                    borderColor: esAutonomo
                                      ? THEME.skyRing
                                      : esTeletrabajo
                                      ? THEME.emeraldRing
                                      : THEME.purpleRing,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: esAutonomo
                                        ? THEME.skyText
                                        : esTeletrabajo
                                        ? THEME.emeraldText
                                        : THEME.purpleText,
                                      fontSize: 11,
                                      fontWeight: '800',
                                    }}
                                  >
                                    {esAutonomo
                                      ? 'TELETRABAJO AUTÓNOMO'
                                      : esTeletrabajo
                                      ? 'TELETRABAJO'
                                      : 'TRABAJO EN CASA'}
                                  </Text>
                                </View>
                              ) : (
                                <View
                                  style={{
                                    backgroundColor: THEME.slate100,
                                    borderColor: THEME.slate200,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text style={{ color: THEME.slate700, fontSize: 11, fontWeight: '700' }}>
                                    PRESENCIAL
                                  </Text>
                                </View>
                              )}

                              {/* Alerta de acuerdo por cambio de cargo */}
                              {p.requiere_nuevo_acuerdo && (
                                <View
                                  style={{
                                    backgroundColor: THEME.amberBg,
                                    borderColor: THEME.amberRing,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text style={{ color: THEME.amberText, fontSize: 11, fontWeight: '800' }}>
                                    ⚠️ Requiere Nuevo Acuerdo
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Cargo y Dependencia */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Ionicons name="briefcase" size={14} color={THEME.marca600} />
                              <Text style={{ color: THEME.marca800, fontSize: 13, fontWeight: '700' }}>
                                {p.cargo} {p.codigo ? `(${p.codigo}-${p.grado})` : ''}
                              </Text>
                              <Text style={{ color: THEME.slate400 }}>•</Text>
                              <Text style={{ color: THEME.slate600, fontSize: 12 }}>
                                {p.dependencia_cargo}
                              </Text>

                              {/* Indicador de cargo teletrabajable */}
                              {!p.cargo_es_teletrabajable && (
                                <View
                                  style={{
                                    backgroundColor: THEME.roseBg,
                                    borderColor: THEME.roseRing,
                                    borderWidth: 1,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 4,
                                  }}
                                >
                                  <Text style={{ color: THEME.roseText, fontSize: 10.5, fontWeight: '700' }}>
                                    {p.excepcion_jefe_aprobada ? 'Excepción Jefe Aprobada' : 'Cargo No Teletrabajable'}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Detalle de Asignación si existe */}
                            {tieneModalidad && (
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 14,
                                  flexWrap: 'wrap',
                                  marginTop: 4,
                                  paddingTop: 8,
                                  borderTopWidth: 1,
                                  borderTopColor: THEME.slate100,
                                }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <Ionicons name="calendar-outline" size={14} color={THEME.marca600} />
                                  <Text style={{ color: THEME.slate600, fontSize: 12 }}>
                                    Esquema:{' '}
                                    <Text style={{ fontWeight: '800', color: THEME.slate900 }}>
                                      {p.esquema_dias_tipo === 'TODOS'
                                        ? 'Todos los días (L-V)'
                                        : p.esquema_dias_tipo === 'DIAS_PARES'
                                        ? 'Días Pares'
                                        : p.esquema_dias_tipo === 'DIAS_IMPARES'
                                        ? 'Días Impares'
                                        : Array.isArray(p.dias_semana_fijos) && p.dias_semana_fijos.length > 0
                                        ? p.dias_semana_fijos.join(', ')
                                        : `${p.dias_por_semana || 2} días`}
                                    </Text>
                                  </Text>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <Ionicons name="time-outline" size={14} color={THEME.slate500} />
                                  <Text style={{ color: THEME.slate600, fontSize: 12 }}>
                                    Vigencia:{' '}
                                    <Text style={{ color: THEME.slate800, fontWeight: '700' }}>
                                      {limpiarFecha(p.asignacion_desde) || 'N/A'} al {limpiarFecha(p.asignacion_hasta) || 'N/A'}
                                    </Text>
                                  </Text>
                                </View>

                                {p.numero_resolucion_display && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    <Ionicons name="document-text" size={14} color={THEME.emeraldText} />
                                    <Text style={{ color: THEME.emeraldText, fontSize: 12, fontWeight: '700' }}>
                                      {p.numero_resolucion_display}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>

                          {/* Botones de Acción */}
                          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <TouchableOpacity
                              onPress={() => abrirModalAsignacion(p)}
                              style={{
                                backgroundColor: THEME.marca700,
                                paddingHorizontal: 14,
                                paddingVertical: 9,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Ionicons name="options-outline" size={16} color={THEME.white} />
                              <Text style={{ color: THEME.white, fontSize: 12.5, fontWeight: '800' }}>
                                {tieneModalidad ? 'Editar Modalidad' : 'Asignar Modalidad'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => abrirModalAcuerdo(p)}
                              style={{
                                backgroundColor: p.requiere_nuevo_acuerdo ? THEME.amberBg : THEME.slate100,
                                borderColor: p.requiere_nuevo_acuerdo ? THEME.amberRing : THEME.slate200,
                                borderWidth: 1,
                                paddingHorizontal: 12,
                                paddingVertical: 9,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Ionicons
                                name="ribbon-outline"
                                size={16}
                                color={p.requiere_nuevo_acuerdo ? THEME.amberText : THEME.slate600}
                              />
                              <Text
                                style={{
                                  color: p.requiere_nuevo_acuerdo ? THEME.amberText : THEME.slate700,
                                  fontSize: 12,
                                  fontWeight: '700',
                                }}
                              >
                                Acuerdo
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => abrirModalSeguimiento(p)}
                              style={{
                                backgroundColor: THEME.marca50,
                                borderColor: THEME.marca100,
                                borderWidth: 1,
                                paddingHorizontal: 12,
                                paddingVertical: 9,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Ionicons name="calendar-outline" size={16} color={THEME.marca700} />
                              <Text style={{ color: THEME.marca700, fontSize: 12, fontWeight: '700' }}>
                                Seguimiento
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
            </View>
          )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 2: RESOLUCIONES GENERALES                            */}
            {/* ------------------------------------------------------------- */}
            {tabActiva === 'resoluciones' && (
              <View style={{ gap: 16 }}>
                <View
                  style={{
                    flexDirection: isDesktop ? 'row' : 'column',
                    justifyContent: 'space-between',
                    alignItems: isDesktop ? 'center' : 'stretch',
                    gap: 12,
                  }}
                >
                  <View>
                    <Text style={{ color: THEME.slate900, fontSize: 18, fontWeight: '800' }}>
                      Catálogo de Resoluciones Institucionales
                    </Text>
                    <Text style={{ color: THEME.slate500, fontSize: 13, marginTop: 2 }}>
                      Actos administrativos marco que confieren teletrabajo o trabajo en casa a la planta
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Buscador de Resoluciones */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: THEME.white,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        height: 38,
                        width: isDesktop ? 260 : '100%',
                        gap: 6,
                      }}
                    >
                      <Ionicons name="search" size={15} color={THEME.slate400} />
                      <TextInput
                        value={busquedaResoluciones}
                        onChangeText={setBusquedaResoluciones}
                        placeholder="Buscar resolución, año, objeto..."
                        placeholderTextColor={THEME.slate400}
                        style={{ flex: 1, color: THEME.slate900, fontSize: 12, outlineStyle: 'none' as never }}
                      />
                      {busquedaResoluciones.length > 0 && (
                        <Pressable onPress={() => setBusquedaResoluciones('')}>
                          <Ionicons name="close-circle" size={15} color={THEME.slate400} />
                        </Pressable>
                      )}
                    </View>

                    {/* Selector de Vista: Tabla / Tarjetas */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: THEME.slate100,
                        borderRadius: 8,
                        padding: 3,
                      }}
                    >
                      <Pressable
                        onPress={() => setModoVistaResoluciones('tabla')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: modoVistaResoluciones === 'tabla' ? THEME.white : 'transparent',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          shadowColor: modoVistaResoluciones === 'tabla' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                        }}
                      >
                        <Ionicons
                          name="list"
                          size={14}
                          color={modoVistaResoluciones === 'tabla' ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          style={{
                            color: modoVistaResoluciones === 'tabla' ? THEME.marca700 : THEME.slate500,
                            fontSize: 12,
                            fontWeight: modoVistaResoluciones === 'tabla' ? '600' : '500',
                          }}
                        >
                          Tabla
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setModoVistaResoluciones('cards')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: modoVistaResoluciones === 'cards' ? THEME.white : 'transparent',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          shadowColor: modoVistaResoluciones === 'cards' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                        }}
                      >
                        <Ionicons
                          name="grid"
                          size={14}
                          color={modoVistaResoluciones === 'cards' ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          style={{
                            color: modoVistaResoluciones === 'cards' ? THEME.marca700 : THEME.slate500,
                            fontSize: 12,
                            fontWeight: modoVistaResoluciones === 'cards' ? '600' : '500',
                          }}
                        >
                          Tarjetas
                        </Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => abrirModalNuevaRes()}
                      style={{
                        backgroundColor: THEME.marca700,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 7,
                        shadowColor: '#000',
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                      }}
                    >
                      <Ionicons name="cloud-upload-outline" size={17} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                        Subir Resolución
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Banner Destacado: Resolución 117 de 2026 */}
                <View
                  style={{
                    backgroundColor: THEME.marca50,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.marca200,
                    padding: 14,
                    flexDirection: isDesktop ? 'row' : 'column',
                    justifyContent: 'space-between',
                    alignItems: isDesktop ? 'center' : 'flex-start',
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View
                      style={{
                        backgroundColor: THEME.marca800,
                        padding: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Ionicons name="shield-checkmark" size={20} color={THEME.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.marca900 }}>
                          Resolución No. 117 de 2026 — Política Interna Vigente
                        </Text>
                        <View
                          style={{
                            backgroundColor: THEME.badges.emerald.bg,
                            borderColor: THEME.badges.emerald.border,
                            borderWidth: 1,
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.badges.emerald.text }}>
                            Procedimiento PR-117 v06
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11.5, color: THEME.marca800, marginTop: 2 }}>
                        Establece las directrices operativas, criterios de prioridad, visitas SST/TIC y liquidación de servicios para la SJD.
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable
                      onPress={() => setTabActiva('procedimiento')}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: THEME.white,
                        borderColor: THEME.marca200,
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Ionicons name="book-outline" size={14} color={THEME.marca800} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca800 }}>
                        Ver Flujo y Fases
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setModalPdfVisorVisible(true)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: THEME.marca800,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Ionicons name="document-text" size={14} color={THEME.white} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.white }}>
                        Ver PDF Oficial
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Subcabecera informativa */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: THEME.slate500, fontSize: 12 }}>
                    Mostrando <Text style={{ color: THEME.slate800, fontWeight: '700' }}>{resolucionesFiltradas.length}</Text> de {resoluciones.length} resoluciones oficiales
                  </Text>
                  {modoVistaResoluciones === 'tabla' && (
                    <Text style={{ color: THEME.slate400, fontSize: 11, fontStyle: 'italic' }}>
                      💡 Haz clic en cualquier fila para editar la resolución
                    </Text>
                  )}
                </View>

                {modoVistaResoluciones === 'tabla' ? (
                  /* ======================================================== */
                  /* TABLA EJECUTIVA DE RESOLUCIONES                          */
                  /* ======================================================== */
                  <View
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                      <View style={{ minWidth: 1040 }}>
                        {/* Cabecera de la Tabla */}
                        <View
                          style={{
                            flexDirection: 'row',
                            backgroundColor: THEME.slate50,
                            borderBottomWidth: 1,
                            borderBottomColor: THEME.slate200,
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ width: 230, color: THEME.slate500, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                            RESOLUCIÓN / ACTO
                          </Text>
                          <Text style={{ width: 110, color: THEME.slate500, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                            ESTADO
                          </Text>
                          <Text style={{ width: 140, color: THEME.slate500, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                            MODALIDAD
                          </Text>
                          <Text style={{ width: 120, color: THEME.slate500, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                            EXPEDICIÓN
                          </Text>
                          <Text style={{ width: 190, color: THEME.slate500, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                            VIGENCIA GENERAL
                          </Text>
                          <Text style={{ width: 110, color: THEME.slate500, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                            VINCULADOS
                          </Text>
                          <Text style={{ width: 110, color: THEME.slate500, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                            DOCUMENTO
                          </Text>
                          <Text style={{ width: 110, color: THEME.slate500, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textAlign: 'right' }}>
                            ACCIONES
                          </Text>
                        </View>

                        {/* Filas */}
                        {resolucionesFiltradas.map((r, index) => {
                          const badgeEstado =
                            r.estado === 'VIGENTE'
                              ? THEME.badges.emerald
                              : r.estado === 'DEROGADA'
                              ? THEME.badges.rose
                              : THEME.badges.amber;

                          const modalidadLabel =
                            r.modalidad_principal === 'TELETRABAJO'
                              ? 'Teletrabajo'
                              : r.modalidad_principal === 'TRABAJO_EN_CASA'
                              ? 'Trabajo Casa'
                              : 'Mixta / Alt.';

                          return (
                            <Pressable
                              key={r.id}
                              onPress={() => abrirModalEditarRes(r)}
                              style={({ hovered }: any) => ({
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                borderBottomWidth: index === resolucionesFiltradas.length - 1 ? 0 : 1,
                                borderBottomColor: THEME.slate100,
                                backgroundColor: hovered ? THEME.slate50 : index % 2 === 0 ? THEME.white : '#FCFCFD',
                                cursor: 'pointer',
                              })}
                            >
                              {/* 1. Resolución / Acto */}
                              <View style={{ width: 230, paddingRight: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                                  <Ionicons name="document-text" size={17} color={THEME.marca700} />
                                  <Text style={{ color: THEME.slate900, fontSize: 12.5, fontWeight: '800' }} numberOfLines={1}>
                                    {r.numero_resolucion}
                                  </Text>
                                </View>
                                {r.descripcion ? (
                                  <Text style={{ color: THEME.slate500, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                                    {r.descripcion}
                                  </Text>
                                ) : (
                                  <Text style={{ color: THEME.slate400, fontSize: 11, marginTop: 2 }}>
                                    Año {r.anio || '-'}
                                  </Text>
                                )}
                              </View>

                              {/* 2. Estado */}
                              <View style={{ width: 110, paddingRight: 8 }}>
                                <View
                                  style={{
                                    backgroundColor: badgeEstado.bg,
                                    borderColor: badgeEstado.border,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 9999,
                                    alignSelf: 'flex-start',
                                  }}
                                >
                                  <Text style={{ color: badgeEstado.text, fontSize: 10.5, fontWeight: '800' }}>
                                    {r.estado}
                                  </Text>
                                </View>
                              </View>

                              {/* 3. Modalidad */}
                              <View style={{ width: 140, paddingRight: 8 }}>
                                <View
                                  style={{
                                    backgroundColor: THEME.marca50,
                                    borderColor: THEME.marca200,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6,
                                    alignSelf: 'flex-start',
                                  }}
                                >
                                  <Text style={{ color: THEME.marca700, fontSize: 10.5, fontWeight: '700' }}>
                                    {modalidadLabel}
                                  </Text>
                                </View>
                              </View>

                              {/* 4. Expedición */}
                              <View style={{ width: 120, paddingRight: 8 }}>
                                <Text style={{ color: THEME.slate700, fontSize: 11.5, fontWeight: '600' }}>
                                  {limpiarFecha(r.fecha_expedicion) || '-'}
                                </Text>
                                <Text style={{ color: THEME.slate400, fontSize: 10 }}>Expedida</Text>
                              </View>

                              {/* 5. Vigencia General */}
                              <View style={{ width: 190, paddingRight: 8 }}>
                                <Text style={{ color: THEME.slate800, fontSize: 11.5, fontWeight: '600' }}>
                                  {limpiarFecha(r.fecha_inicio_vigencia)} al {limpiarFecha(r.fecha_fin_vigencia)}
                                </Text>
                                <Text style={{ color: THEME.slate400, fontSize: 10 }}>Período formal</Text>
                              </View>

                              {/* 6. Vinculados */}
                              <View style={{ width: 110, paddingRight: 8 }}>
                                <View
                                  style={{
                                    backgroundColor: THEME.slate100,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6,
                                    alignSelf: 'flex-start',
                                  }}
                                >
                                  <Text style={{ color: THEME.slate800, fontSize: 11, fontWeight: '700' }}>
                                    {r.total_personas_activas || 0} activos
                                  </Text>
                                </View>
                              </View>

                              {/* 7. Documento */}
                              <View style={{ width: 110, paddingRight: 8 }}>
                                {r.archivo_pdf_url ? (
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e?.stopPropagation?.();
                                      if (Platform.OS === 'web') {
                                        window.open(r.archivo_pdf_url, '_blank');
                                      }
                                    }}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      backgroundColor: THEME.marca50,
                                      borderColor: THEME.marca200,
                                      borderWidth: 1,
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 6,
                                      alignSelf: 'flex-start',
                                    }}
                                  >
                                    <Ionicons name="eye-outline" size={13} color={THEME.marca700} />
                                    <Text style={{ color: THEME.marca700, fontSize: 11, fontWeight: '700' }}>Ver PDF</Text>
                                  </TouchableOpacity>
                                ) : (
                                  <Text style={{ color: THEME.slate400, fontSize: 11 }}>Sin PDF</Text>
                                )}
                              </View>

                              {/* 8. Acciones */}
                              <View style={{ width: 110, alignItems: 'flex-end' }}>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    abrirModalEditarRes(r);
                                  }}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 5,
                                    backgroundColor: THEME.marca700,
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Ionicons name="pencil-outline" size={13} color="#FFFFFF" />
                                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                                    Editar
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </Pressable>
                          );
                        })}

                        {resolucionesFiltradas.length === 0 && (
                          <View style={{ padding: 40, alignItems: 'center' }}>
                            <Ionicons name="search-outline" size={38} color={THEME.slate300} />
                            <Text style={{ color: THEME.slate500, fontSize: 13, marginTop: 8 }}>
                              {busquedaResoluciones.length > 0
                                ? 'No se encontraron resoluciones con el criterio de búsqueda.'
                                : 'No se han registrado resoluciones aún.'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </ScrollView>
                  </View>
                ) : (
                  /* ======================================================== */
                  /* TARJETAS DE RESOLUCIONES                                 */
                  /* ======================================================== */
                  <View style={{ gap: 12 }}>
                    {resolucionesFiltradas.map((r) => {
                      const badgeEstado =
                        r.estado === 'VIGENTE'
                          ? THEME.badges.emerald
                          : r.estado === 'DEROGADA'
                          ? THEME.badges.rose
                          : THEME.badges.amber;

                      return (
                        <Pressable
                          key={r.id}
                          onPress={() => abrirModalEditarRes(r)}
                          style={({ hovered }: any) => ({
                            backgroundColor: THEME.white,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: hovered ? THEME.marca200 : THEME.slate200,
                            padding: 20,
                            flexDirection: isDesktop ? 'row' : 'column',
                            justifyContent: 'space-between',
                            alignItems: isDesktop ? 'center' : 'stretch',
                            gap: 16,
                            shadowColor: '#000',
                            shadowOpacity: hovered ? 0.07 : 0.03,
                            shadowRadius: 6,
                            elevation: 1,
                            cursor: 'pointer',
                          })}
                        >
                          <View style={{ flex: 1, gap: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <Ionicons name="document-text" size={22} color={THEME.marca700} />
                              <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '800' }}>
                                {r.numero_resolucion}
                              </Text>
                              <View
                                style={{
                                  backgroundColor: badgeEstado.bg,
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 9999,
                                  borderWidth: 1,
                                  borderColor: badgeEstado.border,
                                }}
                              >
                                <Text style={{ color: badgeEstado.text, fontSize: 11, fontWeight: '800' }}>
                                  {r.estado}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: THEME.marca50,
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: THEME.marca200,
                                }}
                              >
                                <Text style={{ color: THEME.marca700, fontSize: 11, fontWeight: '700' }}>
                                  {r.modalidad_principal || 'TELETRABAJO'}
                                </Text>
                              </View>
                            </View>

                            <Text style={{ color: THEME.slate600, fontSize: 13, lineHeight: 19 }}>
                              {r.descripcion || 'Sin descripción adicional.'}
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                              <Text style={{ color: THEME.slate500, fontSize: 12 }}>
                                Expedición: <Text style={{ color: THEME.slate800, fontWeight: '600' }}>{limpiarFecha(r.fecha_expedicion)}</Text>
                              </Text>
                              <Text style={{ color: THEME.slate500, fontSize: 12 }}>
                                Vigencia General:{' '}
                                <Text style={{ color: THEME.slate800, fontWeight: '600' }}>
                                  {limpiarFecha(r.fecha_inicio_vigencia)} al {limpiarFecha(r.fecha_fin_vigencia)}
                                </Text>
                              </Text>
                              <Text style={{ color: THEME.marca700, fontSize: 12, fontWeight: '700' }}>
                                Personas Vinculadas: {r.total_personas_activas || 0} activas
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <TouchableOpacity
                              onPress={(e) => {
                                e?.stopPropagation?.();
                                abrirModalEditarRes(r);
                              }}
                              style={{
                                backgroundColor: THEME.marca700,
                                paddingHorizontal: 14,
                                paddingVertical: 9,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Ionicons name="pencil-outline" size={16} color="#FFFFFF" />
                              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                                Editar Resolución
                              </Text>
                            </TouchableOpacity>

                            {r.archivo_pdf_url && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e?.stopPropagation?.();
                                  if (Platform.OS === 'web') {
                                    window.open(r.archivo_pdf_url, '_blank');
                                  }
                                }}
                                style={{
                                  backgroundColor: THEME.marca50,
                                  paddingHorizontal: 14,
                                  paddingVertical: 9,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: THEME.marca200,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <Ionicons name="eye-outline" size={16} color={THEME.marca700} />
                                <Text style={{ color: THEME.marca700, fontSize: 13, fontWeight: '700' }}>
                                  Ver PDF
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}

                    {resolucionesFiltradas.length === 0 && (
                      <View
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          padding: 36,
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="documents-outline" size={40} color={THEME.slate300} />
                        <Text style={{ color: THEME.slate500, textAlign: 'center', marginTop: 8, fontSize: 13 }}>
                          {busquedaResoluciones.length > 0
                            ? 'No se encontraron resoluciones con el criterio de búsqueda.'
                            : 'No hay resoluciones registradas aún. Haz clic en "Subir Nueva Resolución".'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 3: CARGOS TELETRABAJABLES                           */}
            {/* ------------------------------------------------------------- */}
            {tabActiva === 'cargos' && (
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ color: THEME.slate900, fontSize: 18, fontWeight: '800' }}>
                    Matriz de Viabilidad de Cargos Teletrabajables
                  </Text>
                  <Text style={{ color: THEME.slate500, fontSize: 13, marginTop: 2 }}>
                    Criterios técnicos institucionales según el Manual de Funciones de la Secretaría Jurídica Distrital
                  </Text>
                </View>

                <View style={{ gap: 10 }}>
                  {cargos.map((c) => (
                    <View
                      key={c.id}
                      style={{
                        backgroundColor: THEME.white,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: c.es_teletrabajable
                          ? THEME.badges.emerald.border
                          : THEME.badges.rose.border,
                        padding: 16,
                        flexDirection: isDesktop ? 'row' : 'column',
                        justifyContent: 'space-between',
                        alignItems: isDesktop ? 'center' : 'stretch',
                        gap: 12,
                        shadowColor: '#000',
                        shadowOpacity: 0.03,
                        shadowRadius: 4,
                        elevation: 1,
                      }}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <Text style={{ color: THEME.slate900, fontSize: 15, fontWeight: '800' }}>
                            {c.cargo_nombre}
                          </Text>
                          <Text style={{ color: THEME.slate500, fontSize: 12 }}>
                            Código: {c.codigo} • Grado: {c.grado}
                          </Text>
                          <View
                            style={{
                              backgroundColor: c.es_teletrabajable
                                ? THEME.badges.emerald.bg
                                : THEME.badges.rose.bg,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 9999,
                              borderWidth: 1,
                              borderColor: c.es_teletrabajable
                                ? THEME.badges.emerald.border
                                : THEME.badges.rose.border,
                            }}
                          >
                            <Text
                              style={{
                                color: c.es_teletrabajable ? THEME.badges.emerald.text : THEME.badges.rose.text,
                                fontSize: 10.5,
                                fontWeight: '800',
                              }}
                            >
                              {c.es_teletrabajable ? 'TELETRABAJABLE' : 'NO TELETRABAJABLE'}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: THEME.slate600, fontSize: 12, marginTop: 2 }}>
                          {c.justificacion_estudio || 'Sin justificación técnica registrada.'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ color: THEME.slate600, fontSize: 12 }}>
                          Máx. Días: <Text style={{ color: THEME.slate900, fontWeight: '800' }}>{c.max_dias_semana} días/sem</Text>
                        </Text>

                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              const nuevoEstado = !c.es_teletrabajable;
                              await teletrabajoService.actualizarCargo(c.id, {
                                es_teletrabajable: nuevoEstado,
                              });
                              await cargarTodo();
                              mostrarMensaje('Viabilidad Actualizada', `El cargo ${c.cargo_nombre} ahora figura como ${nuevoEstado ? 'Teletrabajable' : 'No teletrabajable'}.`, 'success');
                            } catch (err: any) {
                              mostrarMensaje('Error', err.message, 'error');
                            }
                          }}
                          style={{
                            backgroundColor: THEME.slate100,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: THEME.slate200,
                          }}
                        >
                          <Text style={{ color: THEME.slate700, fontSize: 11, fontWeight: '700' }}>
                            Cambiar Viabilidad
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 4: ACUERDOS DE COMPROMISO                            */}
            {/* ------------------------------------------------------------- */}
            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 4: ACUERDOS DE COMPROMISO                            */}
            {/* ------------------------------------------------------------- */}
            {tabActiva === 'acuerdos' && (
              <View style={{ gap: 16 }}>
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 12 }}>
                  <View>
                    <Text style={{ color: THEME.slate900, fontSize: 18, fontWeight: '800' }}>
                      Expediente de Acuerdos de Compromiso
                    </Text>
                    <Text style={{ color: THEME.slate500, fontSize: 13, marginTop: 2 }}>
                      Documentos formales suscritos por los servidores y sus jefes al iniciar o cambiar de cargo
                    </Text>
                  </View>

                  {/* Barra de Búsqueda y Selector de Vista */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: THEME.white,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        paddingHorizontal: 10,
                        height: 36,
                        width: isDesktop ? 260 : '100%',
                      }}
                    >
                      <Ionicons name="search" size={15} color={THEME.slate400} style={{ marginRight: 6 }} />
                      <TextInput
                        value={busquedaAcuerdos}
                        onChangeText={setBusquedaAcuerdos}
                        placeholder="Buscar acuerdo por nombre, C.C...."
                        placeholderTextColor={THEME.slate400}
                        style={{ flex: 1, color: THEME.slate900, fontSize: 12, outlineStyle: 'none' as never }}
                      />
                      {busquedaAcuerdos.length > 0 && (
                        <Pressable onPress={() => setBusquedaAcuerdos('')}>
                          <Ionicons name="close-circle" size={15} color={THEME.slate400} />
                        </Pressable>
                      )}
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: THEME.slate100,
                        borderRadius: 8,
                        padding: 3,
                      }}
                    >
                      <Pressable
                        onPress={() => setModoVistaAcuerdos('tabla')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: modoVistaAcuerdos === 'tabla' ? THEME.white : 'transparent',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          shadowColor: modoVistaAcuerdos === 'tabla' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                        }}
                      >
                        <Ionicons
                          name="list"
                          size={14}
                          color={modoVistaAcuerdos === 'tabla' ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          style={{
                            color: modoVistaAcuerdos === 'tabla' ? THEME.marca700 : THEME.slate500,
                            fontSize: 12,
                            fontWeight: modoVistaAcuerdos === 'tabla' ? '600' : '500',
                          }}
                        >
                          Tabla
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setModoVistaAcuerdos('cards')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: modoVistaAcuerdos === 'cards' ? THEME.white : 'transparent',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          shadowColor: modoVistaAcuerdos === 'cards' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                        }}
                      >
                        <Ionicons
                          name="grid"
                          size={14}
                          color={modoVistaAcuerdos === 'cards' ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          style={{
                            color: modoVistaAcuerdos === 'cards' ? THEME.marca700 : THEME.slate500,
                            fontSize: 12,
                            fontWeight: modoVistaAcuerdos === 'cards' ? '600' : '500',
                          }}
                        >
                          Tarjetas
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Conteo y aviso */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: THEME.slate600, fontSize: 13, fontWeight: '600' }}>
                    Mostrando {acuerdosFiltrados.length} acuerdos suscritos
                  </Text>
                  {modoVistaAcuerdos === 'tabla' && (
                    <Text style={{ color: THEME.slate400, fontSize: 11.5 }}>
                      💡 Haz clic en una fila para gestionar o actualizar el acuerdo
                    </Text>
                  )}
                </View>

                {modoVistaAcuerdos === 'tabla' ? (
                  /* TABLA DE ACUERDOS */
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: THEME.white,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                    }}
                  >
                    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%', flexDirection: 'column' }}>
                      {/* Cabecera */}
                      <View
                        style={{
                          flexDirection: 'row',
                          backgroundColor: THEME.slate50,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.slate200,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ width: 240, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>SERVIDOR PÚBLICO</Text>
                        <Text style={{ width: 230, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>CARGO AL SUSCRIBIR</Text>
                        <Text style={{ width: 150, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>FECHA SUSCRIPCIÓN</Text>
                        <Text style={{ width: 140, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>VIGENCIA</Text>
                        <Text style={{ width: 130, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>ESTADO</Text>
                        <Text style={{ width: 180, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>DOCUMENTO FIRMADO</Text>
                        <Text style={{ width: 140, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>ACCIONES</Text>
                      </View>

                      {/* Filas */}
                      <ScrollView style={{ maxHeight: 600 }} showsVerticalScrollIndicator>
                        {acuerdosFiltrados.map((ac, index) => {
                          const esPar = index % 2 === 0;
                          const persona = personas.find((p) => p.titular_cedula === ac.servidor_cedula);

                          return (
                            <TouchableOpacity
                              key={ac.id}
                              activeOpacity={0.7}
                              onPress={() => {
                                if (persona) abrirModalAcuerdo(persona);
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                backgroundColor: esPar ? THEME.white : '#FAFCFF',
                                borderBottomWidth: 1,
                                borderBottomColor: THEME.slate100,
                                // @ts-ignore
                                cursor: 'pointer',
                              }}
                            >
                              {/* Servidor */}
                              <View style={{ width: 240, paddingRight: 10, gap: 2 }}>
                                <Text style={{ color: THEME.slate900, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                                  {ac.servidor_nombre}
                                </Text>
                                <Text style={{ color: THEME.slate500, fontSize: 11 }}>
                                  C.C. {ac.servidor_cedula}
                                </Text>
                              </View>

                              {/* Cargo */}
                              <View style={{ width: 230, paddingRight: 10 }}>
                                <Text style={{ color: THEME.marca800, fontSize: 12.5, fontWeight: '600' }} numberOfLines={2}>
                                  {ac.cargo_al_momento}
                                </Text>
                              </View>

                              {/* Fecha */}
                              <View style={{ width: 150, paddingRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <Ionicons name="calendar-outline" size={13} color={THEME.slate500} />
                                  <Text style={{ color: THEME.slate800, fontSize: 12, fontWeight: '600' }}>
                                    {limpiarFecha(ac.fecha_suscripcion) || 'Sin fecha'}
                                  </Text>
                                </View>
                              </View>

                              {/* Vigencia */}
                              <View style={{ width: 140, paddingRight: 8 }}>
                                <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '600' }}>
                                  {ac.periodo_vigencia || 'ANUAL'}
                                </Text>
                              </View>

                              {/* Estado */}
                              <View style={{ width: 130, paddingRight: 8 }}>
                                <View
                                  style={{
                                    backgroundColor: ac.es_vigente !== false ? THEME.emeraldBg : THEME.slate100,
                                    borderColor: ac.es_vigente !== false ? THEME.emeraldRing : THEME.slate200,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2.5,
                                    borderRadius: 9999,
                                    alignSelf: 'flex-start',
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: ac.es_vigente !== false ? THEME.emeraldText : THEME.slate600,
                                      fontSize: 11,
                                      fontWeight: '700',
                                    }}
                                  >
                                    {ac.es_vigente !== false ? '✓ Vigente' : 'Histórico'}
                                  </Text>
                                </View>
                              </View>

                              {/* Documento Firmado */}
                              <View style={{ width: 180, paddingRight: 8 }}>
                                {ac.archivo_acuerdo_url ? (
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e?.stopPropagation?.();
                                      if (Platform.OS === 'web') {
                                        window.open(ac.archivo_acuerdo_url, '_blank');
                                      }
                                    }}
                                    style={{
                                      backgroundColor: THEME.amberBg,
                                      borderColor: THEME.amberRing,
                                      borderWidth: 1,
                                      paddingHorizontal: 9,
                                      paddingVertical: 5,
                                      borderRadius: 6,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      alignSelf: 'flex-start',
                                    }}
                                  >
                                    <Ionicons name="document-text-outline" size={13} color={THEME.amberText} />
                                    <Text style={{ color: THEME.amberText, fontSize: 11.5, fontWeight: '700' }}>
                                      Ver Acuerdo
                                    </Text>
                                  </TouchableOpacity>
                                ) : (
                                  <Text style={{ color: THEME.slate400, fontSize: 11 }}>Sin PDF adjunto</Text>
                                )}
                              </View>

                              {/* Acciones */}
                              <View style={{ width: 140, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    if (persona) abrirModalAcuerdo(persona);
                                  }}
                                  style={{
                                    backgroundColor: THEME.marca50,
                                    borderColor: THEME.marca200,
                                    borderWidth: 1,
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Ionicons name="create-outline" size={13} color={THEME.marca700} />
                                  <Text style={{ color: THEME.marca700, fontSize: 11.5, fontWeight: '700' }}>
                                    Gestionar
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>
                          );
                        })}

                        {acuerdosFiltrados.length === 0 && (
                          <View style={{ padding: 32, alignItems: 'center' }}>
                            <Ionicons name="ribbon-outline" size={36} color={THEME.slate300} />
                            <Text style={{ color: THEME.slate500, fontSize: 13, marginTop: 8 }}>
                              {busquedaAcuerdos.length > 0 ? 'No se encontraron acuerdos con el criterio de búsqueda.' : 'No se han suscrito acuerdos aún.'}
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </ScrollView>
                  </View>
                ) : (
                  /* TARJETAS DE ACUERDOS */
                  <View style={{ gap: 12 }}>
                    {acuerdosFiltrados.map((ac) => {
                      const persona = personas.find((p) => p.titular_cedula === ac.servidor_cedula);

                      return (
                        <TouchableOpacity
                          key={ac.id}
                          activeOpacity={0.85}
                          onPress={() => {
                            if (persona) abrirModalAcuerdo(persona);
                          }}
                          style={{
                            backgroundColor: THEME.white,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: THEME.slate200,
                            padding: 18,
                            flexDirection: isDesktop ? 'row' : 'column',
                            justifyContent: 'space-between',
                            alignItems: isDesktop ? 'center' : 'stretch',
                            gap: 14,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.04,
                            shadowRadius: 4,
                            elevation: 1,
                            // @ts-ignore
                            cursor: 'pointer',
                          }}
                        >
                          <View style={{ flex: 1, gap: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <Ionicons name="ribbon" size={20} color="#D97706" />
                              <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '800' }}>
                                {ac.servidor_nombre}
                              </Text>
                              <Text style={{ color: THEME.slate500, fontSize: 12.5 }}>
                                C.C. {ac.servidor_cedula}
                              </Text>
                              <View
                                style={{
                                  backgroundColor: ac.es_vigente !== false ? THEME.emeraldBg : THEME.slate100,
                                  borderColor: ac.es_vigente !== false ? THEME.emeraldRing : THEME.slate200,
                                  borderWidth: 1,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 9999,
                                }}
                              >
                                <Text
                                  style={{
                                    color: ac.es_vigente !== false ? THEME.emeraldText : THEME.slate600,
                                    fontSize: 10.5,
                                    fontWeight: '700',
                                  }}
                                >
                                  {ac.es_vigente !== false ? 'VIGENTE' : 'HISTÓRICO'}
                                </Text>
                              </View>
                            </View>

                            <Text style={{ color: THEME.slate600, fontSize: 13 }}>
                              Cargo al momento del acuerdo:{' '}
                              <Text style={{ fontWeight: '700', color: THEME.marca800 }}>
                                {ac.cargo_al_momento}
                              </Text>
                            </Text>

                            <Text style={{ color: THEME.slate500, fontSize: 12 }}>
                              Fecha de Suscripción: <Text style={{ color: THEME.slate800, fontWeight: '600' }}>{limpiarFecha(ac.fecha_suscripcion)}</Text> • Vigencia: <Text style={{ color: THEME.slate800, fontWeight: '600' }}>{ac.periodo_vigencia || 'ANUAL'}</Text>
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {ac.archivo_acuerdo_url && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e?.stopPropagation?.();
                                  if (Platform.OS === 'web') {
                                    window.open(ac.archivo_acuerdo_url, '_blank');
                                  }
                                }}
                                style={{
                                  backgroundColor: THEME.badges.amber.bg,
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: THEME.badges.amber.border,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <Ionicons name="eye-outline" size={15} color={THEME.badges.amber.text} />
                                <Text style={{ color: THEME.badges.amber.text, fontSize: 12, fontWeight: '700' }}>
                                  Ver Acuerdo Firmado
                                </Text>
                              </TouchableOpacity>
                            )}

                            {persona && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e?.stopPropagation?.();
                                  abrirModalAcuerdo(persona);
                                }}
                                style={{
                                  backgroundColor: THEME.marca50,
                                  borderColor: THEME.marca200,
                                  borderWidth: 1,
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  borderRadius: 8,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <Ionicons name="create-outline" size={15} color={THEME.marca700} />
                                <Text style={{ color: THEME.marca700, fontSize: 12, fontWeight: '700' }}>
                                  Gestionar
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {acuerdosFiltrados.length === 0 && (
                      <View
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          padding: 36,
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="ribbon-outline" size={40} color={THEME.slate300} />
                        <Text style={{ color: THEME.slate500, textAlign: 'center', marginTop: 8, fontSize: 13 }}>
                          No se han subido acuerdos de compromiso aún.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 5: SEGUIMIENTOS POR FECHAS                           */}
            {/* ------------------------------------------------------------- */}
            {tabActiva === 'seguimientos' && (
              <View style={{ gap: 16 }}>
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 12 }}>
                  <View>
                    <Text style={{ color: THEME.slate900, fontSize: 18, fontWeight: '800' }}>
                      Seguimientos Periódicos de Rendimiento y Actividades
                    </Text>
                    <Text style={{ color: THEME.slate500, fontSize: 13, marginTop: 2 }}>
                      Fase 4.2 del Procedimiento 2311300-PR-117 (Versión 06) • Certificación de Días y Control SST/TIC
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Botón Punto de Control: Informe Semestral Comité */}
                    <Pressable
                      onPress={() => setModalInformeComiteVisible(true)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: THEME.marca800,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        opacity: pressed ? 0.9 : 1,
                        shadowColor: '#000',
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                      })}
                    >
                      <Ionicons name="pie-chart-outline" size={16} color={THEME.white} />
                      <Text style={{ color: THEME.white, fontSize: 12.5, fontWeight: '700' }}>
                        Informe Semestral Comité (PR-117)
                      </Text>
                    </Pressable>

                    {/* Barra de Búsqueda y Selector de Vista */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: THEME.white,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        paddingHorizontal: 10,
                        height: 36,
                        width: isDesktop ? 240 : '100%',
                      }}
                    >
                      <Ionicons name="search" size={15} color={THEME.slate400} style={{ marginRight: 6 }} />
                      <TextInput
                        value={busquedaSeguimientos}
                        onChangeText={setBusquedaSeguimientos}
                        placeholder="Buscar por nombre, C.C...."
                        placeholderTextColor={THEME.slate400}
                        style={{ flex: 1, color: THEME.slate900, fontSize: 12, outlineStyle: 'none' as never }}
                      />
                      {busquedaSeguimientos.length > 0 && (
                        <Pressable onPress={() => setBusquedaSeguimientos('')}>
                          <Ionicons name="close-circle" size={15} color={THEME.slate400} />
                        </Pressable>
                      )}
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: THEME.slate100,
                        borderRadius: 8,
                        padding: 3,
                      }}
                    >
                      <Pressable
                        onPress={() => setModoVistaSeguimientos('tabla')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: modoVistaSeguimientos === 'tabla' ? THEME.white : 'transparent',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          shadowColor: modoVistaSeguimientos === 'tabla' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                        }}
                      >
                        <Ionicons
                          name="list"
                          size={14}
                          color={modoVistaSeguimientos === 'tabla' ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          style={{
                            color: modoVistaSeguimientos === 'tabla' ? THEME.marca700 : THEME.slate500,
                            fontSize: 12,
                            fontWeight: modoVistaSeguimientos === 'tabla' ? '600' : '500',
                          }}
                        >
                          Tabla
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setModoVistaSeguimientos('cards')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: modoVistaSeguimientos === 'cards' ? THEME.white : 'transparent',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          shadowColor: modoVistaSeguimientos === 'cards' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                        }}
                      >
                        <Ionicons
                          name="grid"
                          size={14}
                          color={modoVistaSeguimientos === 'cards' ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          style={{
                            color: modoVistaSeguimientos === 'cards' ? THEME.marca700 : THEME.slate500,
                            fontSize: 12,
                            fontWeight: modoVistaSeguimientos === 'cards' ? '600' : '500',
                          }}
                        >
                          Tarjetas
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Panel de Métricas: Punto de Control Institucional Semestral (Fase 4.2 / Actividad 5) */}
                <View
                  style={{
                    flexDirection: isDesktop ? 'row' : 'column',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      flex: isDesktop ? 1 : undefined,
                      minWidth: isDesktop ? 200 : '100%',
                      backgroundColor: THEME.white,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 14,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={17} color={THEME.emeraldText} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                        Cumplimiento Promedio
                      </Text>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: THEME.slate900 }}>
                      {seguimientos.length > 0
                        ? (seguimientos.reduce((a, s) => a + (Number(s.calificacion_porcentaje) || 0), 0) / seguimientos.length).toFixed(1)
                        : '100.0'}%
                    </Text>
                    <Text style={{ fontSize: 11, color: THEME.emeraldText, fontWeight: '600' }}>
                      Metas concertadas en matriz de producto
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: isDesktop ? 1 : undefined,
                      minWidth: isDesktop ? 200 : '100%',
                      backgroundColor: THEME.white,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 14,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="calendar" size={17} color={THEME.skyText} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                        Días Efectivos Certificados
                      </Text>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: THEME.slate900 }}>
                      {seguimientos.reduce((a, s) => a + (Number(s.dias_efectivos_teletrabajo) || 0), 0)} días
                    </Text>
                    <Text style={{ fontSize: 11, color: THEME.skyText, fontWeight: '600' }}>
                      Soportados en Memorandos 2311520-FT-018
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: isDesktop ? 1 : undefined,
                      minWidth: isDesktop ? 200 : '100%',
                      backgroundColor: THEME.white,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 14,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="warning" size={17} color={THEME.amberText} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                        Control SST / TIC (Actividad 4.2.3)
                      </Text>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: THEME.slate900 }}>
                      {seguimientos.filter((s) => s.novedad_cambio_domicilio || s.estado_visita_sst_tic !== 'VIGENTE').length}
                    </Text>
                    <Text style={{ fontSize: 11, color: THEME.amberText, fontWeight: '600' }}>
                      Cambios de domicilio o visitas prioritarias
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: isDesktop ? 1 : undefined,
                      minWidth: isDesktop ? 200 : '100%',
                      backgroundColor: THEME.marca50,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.marca200,
                      padding: 14,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="time" size={17} color={THEME.marca800} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca800, textTransform: 'uppercase' }}>
                        Punto de Control Semestral
                      </Text>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: THEME.marca900 }}>
                      Fase 4.2.5
                    </Text>
                    <Text style={{ fontSize: 11, color: THEME.marca800, fontWeight: '600' }}>
                      Comité Institucional de Gestión y Desempeño
                    </Text>
                  </View>
                </View>

                {/* Conteo y aviso */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: THEME.slate600, fontSize: 13, fontWeight: '600' }}>
                    Mostrando {seguimientosFiltrados.length} seguimientos registrados
                  </Text>
                  {modoVistaSeguimientos === 'tabla' && (
                    <Text style={{ color: THEME.slate400, fontSize: 11.5 }}>
                      💡 Haz clic en una fila para registrar un nuevo corte o gestionar el seguimiento
                    </Text>
                  )}
                </View>

                {modoVistaSeguimientos === 'tabla' ? (
                  /* TABLA DE SEGUIMIENTOS */
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: THEME.white,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                    }}
                  >
                    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%', flexDirection: 'column' }}>
                      {/* Cabecera */}
                      <View
                        style={{
                          flexDirection: 'row',
                          backgroundColor: THEME.slate50,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.slate200,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ width: 220, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>SERVIDOR PÚBLICO</Text>
                        <Text style={{ width: 170, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>PERÍODO DE CORTE</Text>
                        <Text style={{ width: 150, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>DÍAS (FT-018)</Text>
                        <Text style={{ width: 170, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>CONDICIÓN SST / TIC</Text>
                        <Text style={{ width: 240, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>ACTIVIDADES REPORTADAS</Text>
                        <Text style={{ width: 160, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>CUMPLIMIENTO</Text>
                        <Text style={{ width: 150, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>CONCEPTO JEFE</Text>
                        <Text style={{ width: 130, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>EVIDENCIAS</Text>
                        <Text style={{ width: 130, color: THEME.slate600, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>ACCIONES</Text>
                      </View>

                      {/* Filas */}
                      <ScrollView style={{ maxHeight: 600 }} showsVerticalScrollIndicator>
                        {seguimientosFiltrados.map((s, index) => {
                          const esPar = index % 2 === 0;
                          const persona = personas.find((p) => p.titular_cedula === s.servidor_cedula);
                          const esSobresaliente = s.cumplimiento_nivel === 'SOBRESALIENTE';
                          const esSatisfactorio = s.cumplimiento_nivel === 'SATISFACTORIO';
                          const esParcial = s.cumplimiento_nivel === 'PARCIAL';

                          return (
                            <TouchableOpacity
                              key={s.id}
                              activeOpacity={0.7}
                              onPress={() => {
                                if (persona) abrirModalSeguimiento(persona);
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                backgroundColor: esPar ? THEME.white : '#FAFCFF',
                                borderBottomWidth: 1,
                                borderBottomColor: THEME.slate100,
                                // @ts-ignore
                                cursor: 'pointer',
                              }}
                            >
                              {/* Servidor */}
                              <View style={{ width: 220, paddingRight: 10, gap: 2 }}>
                                <Text style={{ color: THEME.slate900, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                                  {s.servidor_nombre}
                                </Text>
                                <Text style={{ color: THEME.slate500, fontSize: 11 }}>
                                  C.C. {s.servidor_cedula}
                                </Text>
                              </View>

                              {/* Período de Corte */}
                              <View style={{ width: 170, paddingRight: 8 }}>
                                <View
                                  style={{
                                    backgroundColor: THEME.marca50,
                                    borderWidth: 1,
                                    borderColor: THEME.marca100,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6,
                                    alignSelf: 'flex-start',
                                  }}
                                >
                                  <Text style={{ color: THEME.marca700, fontSize: 11.5, fontWeight: '700' }}>
                                    {limpiarFecha(s.fecha_corte_desde)} al {limpiarFecha(s.fecha_corte_hasta)}
                                  </Text>
                                </View>
                              </View>

                              {/* Días Certificados y Memorando */}
                              <View style={{ width: 150, paddingRight: 8, gap: 2 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <View
                                    style={{
                                      backgroundColor: THEME.badges.sky.bg,
                                      borderColor: THEME.badges.sky.border,
                                      borderWidth: 1,
                                      paddingHorizontal: 6,
                                      paddingVertical: 1.5,
                                      borderRadius: 6,
                                    }}
                                  >
                                    <Text style={{ color: THEME.badges.sky.text, fontSize: 11, fontWeight: '800' }}>
                                      {s.dias_efectivos_teletrabajo || 0} días
                                    </Text>
                                  </View>
                                </View>
                                <Text style={{ color: THEME.slate500, fontSize: 10.5 }} numberOfLines={1}>
                                  {s.radicado_memorando_ft018 || 'FT-018'}
                                </Text>
                              </View>

                              {/* Condición SST / TIC */}
                              <View style={{ width: 170, paddingRight: 8 }}>
                                {s.novedad_cambio_domicilio || s.estado_visita_sst_tic !== 'VIGENTE' ? (
                                  <View
                                    style={{
                                      backgroundColor: THEME.badges.amber.bg,
                                      borderColor: THEME.badges.amber.border,
                                      borderWidth: 1,
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 6,
                                      alignSelf: 'flex-start',
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 3,
                                    }}
                                  >
                                    <Ionicons name="warning" size={12} color={THEME.badges.amber.text} />
                                    <Text style={{ color: THEME.badges.amber.text, fontSize: 10.5, fontWeight: '700' }}>
                                      Visita Prioritaria
                                    </Text>
                                  </View>
                                ) : (
                                  <View
                                    style={{
                                      backgroundColor: THEME.badges.emerald.bg,
                                      borderColor: THEME.badges.emerald.border,
                                      borderWidth: 1,
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 6,
                                      alignSelf: 'flex-start',
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 3,
                                    }}
                                  >
                                    <Ionicons name="shield-checkmark" size={12} color={THEME.badges.emerald.text} />
                                    <Text style={{ color: THEME.badges.emerald.text, fontSize: 10.5, fontWeight: '700' }}>
                                      Condiciones OK
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* Actividades */}
                              <View style={{ width: 240, paddingRight: 12 }}>
                                <Text style={{ color: THEME.slate700, fontSize: 12, lineHeight: 17 }} numberOfLines={2}>
                                  {s.actividades_reportadas || 'Sin detalle de actividades'}
                                </Text>
                              </View>

                              {/* Cumplimiento */}
                              <View style={{ width: 170, paddingRight: 8 }}>
                                <View
                                  style={{
                                    backgroundColor: esSobresaliente ? THEME.emeraldBg : esSatisfactorio ? THEME.skyBg : esParcial ? THEME.amberBg : THEME.roseBg,
                                    borderColor: esSobresaliente ? THEME.emeraldRing : esSatisfactorio ? THEME.skyRing : esParcial ? THEME.amberRing : THEME.roseRing,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2.5,
                                    borderRadius: 9999,
                                    alignSelf: 'flex-start',
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: esSobresaliente ? THEME.emeraldText : esSatisfactorio ? THEME.skyText : esParcial ? THEME.amberText : THEME.roseText,
                                      fontSize: 11,
                                      fontWeight: '700',
                                    }}
                                  >
                                    {s.cumplimiento_nivel} ({s.calificacion_porcentaje}%)
                                  </Text>
                                </View>
                              </View>

                              {/* Concepto Jefe */}
                              <View style={{ width: 170, paddingRight: 8 }}>
                                <Text style={{ color: THEME.slate800, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                                  {s.concepto_recomendacion === 'CONTINUAR'
                                    ? '✓ Continuar'
                                    : s.concepto_recomendacion === 'AJUSTAR_DIAS'
                                    ? '⚠️ Ajustar Días'
                                    : 'Reversión'}
                                </Text>
                              </View>

                              {/* Evidencias */}
                              <View style={{ width: 150, paddingRight: 8 }}>
                                {s.soporte_evidencias_url ? (
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e?.stopPropagation?.();
                                      if (Platform.OS === 'web') {
                                        window.open(s.soporte_evidencias_url, '_blank');
                                      }
                                    }}
                                    style={{
                                      backgroundColor: THEME.marca50,
                                      borderColor: THEME.marca200,
                                      borderWidth: 1,
                                      paddingHorizontal: 9,
                                      paddingVertical: 5,
                                      borderRadius: 6,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      alignSelf: 'flex-start',
                                    }}
                                  >
                                    <Ionicons name="document-attach-outline" size={13} color={THEME.marca700} />
                                    <Text style={{ color: THEME.marca700, fontSize: 11.5, fontWeight: '700' }}>
                                      Ver Soporte
                                    </Text>
                                  </TouchableOpacity>
                                ) : (
                                  <Text style={{ color: THEME.slate400, fontSize: 11 }}>Sin soporte</Text>
                                )}
                              </View>

                              {/* Acciones */}
                              <View style={{ width: 140, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    if (persona) abrirModalSeguimiento(persona);
                                  }}
                                  style={{
                                    backgroundColor: THEME.marca700,
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Ionicons name="add-circle-outline" size={13} color={THEME.white} />
                                  <Text style={{ color: THEME.white, fontSize: 11.5, fontWeight: '700' }}>
                                    Nuevo Corte
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>
                          );
                        })}

                        {seguimientosFiltrados.length === 0 && (
                          <View style={{ padding: 32, alignItems: 'center' }}>
                            <Ionicons name="calendar-outline" size={36} color={THEME.slate300} />
                            <Text style={{ color: THEME.slate500, fontSize: 13, marginTop: 8 }}>
                              {busquedaSeguimientos.length > 0 ? 'No se encontraron seguimientos con el criterio de búsqueda.' : 'No hay seguimientos registrados aún.'}
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </ScrollView>
                  </View>
                ) : (
                  /* TARJETAS DE SEGUIMIENTOS */
                  <View style={{ gap: 12 }}>
                    {seguimientosFiltrados.map((s) => {
                      const persona = personas.find((p) => p.titular_cedula === s.servidor_cedula);
                      const esSobresaliente = s.cumplimiento_nivel === 'SOBRESALIENTE';
                      const esSatisfactorio = s.cumplimiento_nivel === 'SATISFACTORIO';
                      const esParcial = s.cumplimiento_nivel === 'PARCIAL';

                      return (
                        <TouchableOpacity
                          key={s.id}
                          activeOpacity={0.85}
                          onPress={() => {
                            if (persona) abrirModalSeguimiento(persona);
                          }}
                          style={{
                            backgroundColor: THEME.white,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: THEME.slate200,
                            padding: 18,
                            gap: 12,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.04,
                            shadowRadius: 4,
                            elevation: 1,
                            // @ts-ignore
                            cursor: 'pointer',
                          }}
                        >
                          <View
                            style={{
                              flexDirection: isDesktop ? 'row' : 'column',
                              justifyContent: 'space-between',
                              alignItems: isDesktop ? 'center' : 'flex-start',
                              gap: 10,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <Ionicons name="checkmark-circle" size={22} color="#047857" />
                              <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '800' }}>
                                {s.servidor_nombre}
                              </Text>
                              <Text style={{ color: THEME.slate500, fontSize: 12.5 }}>
                                C.C. {s.servidor_cedula}
                              </Text>
                            </View>

                            <View
                              style={{
                                backgroundColor: THEME.marca50,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 9999,
                                borderWidth: 1,
                                borderColor: THEME.marca200,
                              }}
                            >
                              <Text style={{ color: THEME.marca700, fontSize: 12, fontWeight: '800' }}>
                                Corte: {limpiarFecha(s.fecha_corte_desde)} al {limpiarFecha(s.fecha_corte_hasta)}
                              </Text>
                            </View>
                          </View>

                          <Text style={{ color: THEME.slate700, fontSize: 13, lineHeight: 18 }}>
                            {s.actividades_reportadas}
                          </Text>

                          {/* Fila de Certificación FT-018 y SST/TIC */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 8,
                              backgroundColor: THEME.slate50,
                              padding: 8,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: THEME.slate100,
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: THEME.badges.sky.bg,
                                borderColor: THEME.badges.sky.border,
                                borderWidth: 1,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ color: THEME.badges.sky.text, fontSize: 11, fontWeight: '800' }}>
                                📅 {s.dias_efectivos_teletrabajo || 0} Días Certificados
                              </Text>
                            </View>

                            {s.radicado_memorando_ft018 ? (
                              <View
                                style={{
                                  backgroundColor: THEME.white,
                                  borderColor: THEME.slate200,
                                  borderWidth: 1,
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ color: THEME.slate600, fontSize: 11, fontWeight: '600' }}>
                                  Memo FT-018: {s.radicado_memorando_ft018}
                                </Text>
                              </View>
                            ) : null}

                            {s.novedad_cambio_domicilio ? (
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
                                <Ionicons name="warning" size={12} color={THEME.roseText} />
                                <Text style={{ color: THEME.roseText, fontSize: 11, fontWeight: '800' }}>
                                  Alerta SST/TIC: Cambio Domicilio
                                </Text>
                              </View>
                            ) : (
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
                                <Ionicons name="shield-checkmark" size={12} color={THEME.emeraldText} />
                                <Text style={{ color: THEME.emeraldText, fontSize: 11, fontWeight: '700' }}>
                                  Condición SST/TIC Al Día
                                </Text>
                              </View>
                            )}

                            {s.estrato_socioeconomico ? (
                              <Text style={{ color: THEME.slate500, fontSize: 11 }}>
                                Estrato {s.estrato_socioeconomico}
                              </Text>
                            ) : null}
                          </View>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 10,
                              paddingTop: 8,
                              borderTopWidth: 1,
                              borderTopColor: THEME.slate100,
                            }}
                          >
                            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                              <View
                                style={{
                                  backgroundColor: esSobresaliente ? THEME.emeraldBg : esSatisfactorio ? THEME.skyBg : esParcial ? THEME.amberBg : THEME.roseBg,
                                  borderColor: esSobresaliente ? THEME.emeraldRing : esSatisfactorio ? THEME.skyRing : esParcial ? THEME.amberRing : THEME.roseRing,
                                  borderWidth: 1,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2.5,
                                  borderRadius: 9999,
                                }}
                              >
                                <Text
                                  style={{
                                    color: esSobresaliente ? THEME.emeraldText : esSatisfactorio ? THEME.skyText : esParcial ? THEME.amberText : THEME.roseText,
                                    fontSize: 11,
                                    fontWeight: '700',
                                  }}
                                >
                                  {s.cumplimiento_nivel} ({s.calificacion_porcentaje}%)
                                </Text>
                              </View>

                              <Text style={{ color: THEME.slate500, fontSize: 12 }}>
                                Concepto:{' '}
                                <Text style={{ color: THEME.slate800, fontWeight: '700' }}>
                                  {s.concepto_recomendacion}
                                </Text>
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {s.soporte_evidencias_url && (
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    if (Platform.OS === 'web') {
                                      window.open(s.soporte_evidencias_url, '_blank');
                                    }
                                  }}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    backgroundColor: THEME.marca50,
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: THEME.marca200,
                                  }}
                                >
                                  <Ionicons name="document-attach" size={14} color={THEME.marca700} />
                                  <Text style={{ color: THEME.marca700, fontSize: 12, fontWeight: '700' }}>
                                    Ver Evidencias
                                  </Text>
                                </TouchableOpacity>
                              )}

                              {persona && (
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    abrirModalSeguimiento(persona);
                                  }}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 5,
                                    backgroundColor: THEME.marca700,
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Ionicons name="add-circle-outline" size={14} color={THEME.white} />
                                  <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '700' }}>
                                    Nuevo Corte
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {seguimientosFiltrados.length === 0 && (
                      <View
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          padding: 36,
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="calendar-outline" size={40} color={THEME.slate300} />
                        <Text style={{ color: THEME.slate500, textAlign: 'center', marginTop: 8, fontSize: 13 }}>
                          No hay seguimientos registrados aún.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA: POLÍTICA Y PROCEDIMIENTO (2311300-PR-117 V06)         */}
            {/* ------------------------------------------------------------- */}
            {tabActiva === 'procedimiento' && (
              <View style={{ gap: 20 }}>
                {/* 1. FICHA TÉCNICA PRINCIPAL E INSTRUMENTO NORMATIVO */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: isDesktop ? 24 : 16,
                    borderLeftWidth: 5,
                    borderLeftColor: THEME.marca800,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    gap: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: isDesktop ? 'row' : 'column',
                      justifyContent: 'space-between',
                      alignItems: isDesktop ? 'center' : 'flex-start',
                      gap: 14,
                    }}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <View
                          style={{
                            backgroundColor: THEME.marca50,
                            borderColor: THEME.marca200,
                            borderWidth: 1,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca800 }}>
                            CÓDIGO: 2311300-PR-117
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: THEME.badges.emerald.bg,
                            borderColor: THEME.badges.emerald.border,
                            borderWidth: 1,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.badges.emerald.text }}>
                            VERSIÓN 06 (19/03/2026)
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: THEME.slate100,
                            borderColor: THEME.slate200,
                            borderWidth: 1,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate700 }}>
                            Proceso: Gestión del Talento Humano
                          </Text>
                        </View>
                      </View>

                      <Text style={{ color: THEME.slate900, fontSize: 20, fontWeight: '800', marginTop: 4 }}>
                        Procedimiento de Teletrabajo e Implementación de la Política Interna
                      </Text>
                      <Text style={{ color: THEME.slate600, fontSize: 13, lineHeight: 19 }}>
                        Adopta la Resolución 117 de 2026 de la Secretaría Jurídica Distrital. Reglamenta la selección,
                        vinculación, seguimiento, liquidación de auxilio compensatorio y reversibilidad de servidores públicos bajo las modalidades híbrida y autónoma.
                      </Text>
                    </View>

                    {/* Botones de Consulta y Descarga del Documento */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <Pressable
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            setModalPdfVisorVisible(true);
                          }
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: THEME.marca800,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 8,
                          opacity: pressed ? 0.9 : 1,
                        })}
                      >
                        <Ionicons name="document-text" size={17} color={THEME.white} />
                        <Text style={{ color: THEME.white, fontSize: 13, fontWeight: '700' }}>
                          Ver Documento Oficial (PDF)
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.open(urlPdfPolitica117, '_blank');
                          }
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: THEME.slate50,
                          borderColor: THEME.slate300,
                          borderWidth: 1,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Ionicons name="open-outline" size={16} color={THEME.slate700} />
                        <Text style={{ color: THEME.slate700, fontSize: 12.5, fontWeight: '600' }}>
                          Abrir en Nueva Pestaña
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Metadatos normativos clave */}
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 12,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: THEME.slate100,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="shield-checkmark" size={15} color={THEME.marca700} />
                      <Text style={{ fontSize: 12, color: THEME.slate500 }}>Resolución Marco:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.slate800 }}>
                        Resolución No. 117 de 2026
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="time" size={15} color={THEME.amberText} />
                      <Text style={{ fontSize: 12, color: THEME.slate500 }}>Jornada Laboral:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.slate800 }}>
                        Decreto Distrital 640 de 2025
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="business" size={15} color={THEME.skyText} />
                      <Text style={{ fontSize: 12, color: THEME.slate500 }}>Régimen General:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.slate800 }}>
                        Decreto Nacional 1072 de 2015
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="lock-open" size={15} color={THEME.emeraldText} />
                      <Text style={{ fontSize: 12, color: THEME.slate500 }}>Clasificación de Información:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.emeraldText }}>
                        Pública (Formato 2310100-FT-002 v03)
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 2. PILARES Y MARCO OPERACIONAL */}
                <View
                  style={{
                    flexDirection: isDesktop ? 'row' : 'column',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  {/* Tarjeta 1: Modalidad Híbrida */}
                  <View
                    style={{
                      flex: isDesktop ? 1 : undefined,
                      minWidth: isDesktop ? 220 : '100%',
                      backgroundColor: THEME.white,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 16,
                      gap: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ backgroundColor: THEME.badges.sky.bg, padding: 6, borderRadius: 8 }}>
                        <Ionicons name="laptop" size={18} color={THEME.badges.sky.text} />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.slate900 }}>
                        Teletrabajo Híbrido
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: THEME.slate600, lineHeight: 16, marginTop: 4 }}>
                      Modalidad principal de la SJD: 2 o 3 días a la semana en residencia y el resto presencial en sede, garantizando flexibilidad y orientación a resultados.
                    </Text>
                  </View>

                  {/* Tarjeta 2: Modalidad Autónoma */}
                  <View
                    style={{
                      flex: isDesktop ? 1 : undefined,
                      minWidth: isDesktop ? 220 : '100%',
                      backgroundColor: THEME.white,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 16,
                      gap: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ backgroundColor: THEME.badges.purple.bg, padding: 6, borderRadius: 8 }}>
                        <Ionicons name="home" size={18} color={THEME.badges.purple.text} />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.slate900 }}>
                        Teletrabajo Autónomo
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: THEME.slate600, lineHeight: 16, marginTop: 4 }}>
                      Modalidad excepcional: Requiere condiciones especiales debidamente soportadas y concepto previo favorable del Equipo Técnico de Apoyo al Teletrabajo.
                    </Text>
                  </View>

                  {/* Tarjeta 3: Principios Rectores */}
                  <View
                    style={{
                      flex: isDesktop ? 1 : undefined,
                      minWidth: isDesktop ? 220 : '100%',
                      backgroundColor: THEME.white,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 16,
                      gap: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ backgroundColor: THEME.badges.emerald.bg, padding: 6, borderRadius: 8 }}>
                        <Ionicons name="checkmark-done-circle" size={18} color={THEME.badges.emerald.text} />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.slate900 }}>
                        Principios Rectores
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: THEME.slate600, lineHeight: 16, marginTop: 4 }}>
                      Voluntariedad bilateral, igualdad de trato (mismos derechos salariales y prestacionales) y reversibilidad en cualquier momento por mutuo acuerdo o necesidad del servicio.
                    </Text>
                  </View>

                  {/* Tarjeta 4: Auxilio Compensatorio */}
                  <View
                    style={{
                      flex: isDesktop ? 1 : undefined,
                      minWidth: isDesktop ? 220 : '100%',
                      backgroundColor: THEME.white,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 16,
                      gap: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ backgroundColor: THEME.badges.amber.bg, padding: 6, borderRadius: 8 }}>
                        <Ionicons name="cash-outline" size={18} color={THEME.badges.amber.text} />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.slate900 }}>
                        Auxilio Compensatorio
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: THEME.slate600, lineHeight: 16, marginTop: 4 }}>
                      Reconocimiento mensual de internet y energía liquidados por días teletrabajados según tabla por estrato expedida por la Secretaría General. No tiene carácter salarial.
                    </Text>
                  </View>
                </View>

                {/* 3. SELECTOR DE FASES OPERACIONALES PHVA */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: isDesktop ? 'row' : 'column',
                      gap: 6,
                    }}
                  >
                    {[
                      {
                        id: '4.1',
                        numero: 'Fase 4.1',
                        label: 'Postulación y Selección',
                        sub: '12 Actividades • Convocatoria, SST, TIC y Vinculación',
                        icon: 'person-add-outline',
                      },
                      {
                        id: '4.2',
                        numero: 'Fase 4.2',
                        label: 'Seguimiento, Evaluación y Medición',
                        sub: '5 Actividades • Seguimiento de metas, PR-012 y Comité',
                        icon: 'analytics-outline',
                      },
                      {
                        id: '4.3',
                        numero: 'Fase 4.3',
                        label: 'Liquidación y Auxilio de Servicios',
                        sub: '5 Actividades • Certificación días, CDP, RP y pago',
                        icon: 'receipt-outline',
                      },
                      {
                        id: '4.4',
                        numero: 'Fase 4.4',
                        label: 'Reversibilidad, Prórroga y Situaciones',
                        sub: '3 Actividades • Retorno, renovación y novedades',
                        icon: 'repeat-outline',
                      },
                    ].map((fase) => {
                      const isSel = faseProcedimiento === fase.id;
                      return (
                        <Pressable
                          key={fase.id}
                          onPress={() => setFaseProcedimiento(fase.id as any)}
                          style={{
                            flex: 1,
                            backgroundColor: isSel ? THEME.marca50 : 'transparent',
                            borderColor: isSel ? THEME.marca600 : 'transparent',
                            borderWidth: 1,
                            borderRadius: 8,
                            padding: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: isSel ? THEME.marca800 : THEME.slate100,
                              padding: 8,
                              borderRadius: 8,
                            }}
                          >
                            <Ionicons
                              name={fase.icon as any}
                              size={18}
                              color={isSel ? THEME.white : THEME.slate500}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: isSel ? THEME.marca800 : THEME.slate400,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              {fase.numero}
                            </Text>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: '700',
                                color: isSel ? THEME.marca900 : THEME.slate700,
                              }}
                            >
                              {fase.label}
                            </Text>
                            <Text
                              style={{
                                fontSize: 11,
                                color: isSel ? THEME.marca700 : THEME.slate500,
                                marginTop: 1,
                              }}
                            >
                              {fase.sub}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 4. DETALLE DE ACTIVIDADES DE LA FASE SELECCIONADA */}
                <View style={{ gap: 12 }}>
                  {/* FASE 4.1: POSTULACIÓN Y SELECCIÓN */}
                  {faseProcedimiento === '4.1' && (
                    <View style={{ gap: 10 }}>
                      <View
                        style={{
                          backgroundColor: THEME.marca50,
                          borderRadius: 10,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: THEME.marca200,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="information-circle" size={18} color={THEME.marca800} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca900 }}>
                            Fase 4.1: Flujo Oficial de Postulación, Verificación y Vinculación
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11.5, color: THEME.marca800, fontWeight: '600' }}>
                          Punto de Control Principal: Actividad 7 (Informe de Verificación)
                        </Text>
                      </View>

                      {[
                        {
                          num: 1,
                          actividad: 'Elaborar listado de cargos aptos para realizar teletrabajo',
                          responsable: 'El/la Jefe/a de dependencia / Dirección de Gestión Corporativa',
                          tarea: 'El jefe de cada dependencia identifica y remite el listado de empleos teletrabajables y no teletrabajables basándose en el Manual de Funciones y procedimientos internos. Gestión Corporativa consolida y elabora la relación general, sometiéndola a aprobación definitiva del Equipo Técnico de Apoyo al Teletrabajo antes de la convocatoria.',
                          tiempo: '10 días',
                          registro: 'Listado de Cargos Aptos para Teletrabajar',
                          badgeFormato: 'Cargos Aptos Aprobados',
                        },
                        {
                          num: 2,
                          actividad: 'Socializar la convocatoria',
                          responsable: 'Profesional Universitario (a) - Profesional Especializado (a)',
                          tarea: 'Se realiza la convocatoria formal estableciendo lineamientos de modalidad, postulantes habilitados, criterios de prioridad y cómo postularse; divulgando a través de correo electrónico y boletín interno.',
                          tiempo: 'Hasta 5 días',
                          registro: 'Correo electrónico / Boletín Interno',
                          badgeFormato: 'Divulgación Institucional',
                        },
                        {
                          num: 3,
                          actividad: 'Recibir las postulaciones de Teletrabajo',
                          responsable: 'Profesional Universitario (a) - Profesional Especializado (a)',
                          tarea: 'Recibe y verifica que las postulaciones enviadas mediante el formulario oficial 2311300-FT-328 hayan ingresado dentro de términos y cuenten con los soportes de prioridad y/o debida postulación.',
                          tiempo: 'Hasta 5 días',
                          registro: 'Solicitud de vinculación Teletrabajo (2311300-FT-328)',
                          badgeFormato: '2311300-FT-328',
                        },
                        {
                          num: 4,
                          actividad: 'Validar cumplimiento de requisitos mínimos de la postulación',
                          responsable: 'Profesional Universitario (a) - Profesional Especializado (a)',
                          tarea: 'Valida que el cargo del postulante esté en el listado aprobado por el Equipo Técnico. Verifica simultáneamente antigüedad y evaluación de desempeño laboral, y califica criterios de priorización de la Resolución 117 de 2026. Si no cumple, notifica y finaliza; si cumple, remite al jefe de dependencia.',
                          tiempo: 'Hasta 5 días',
                          registro: 'Matriz de análisis de solicitudes de teletrabajo / Memorando 2311520-FT-018',
                          badgeFormato: '2311520-FT-018',
                        },
                        {
                          num: 5,
                          actividad: 'Avalar postulación por parte del/la Jefe/a de dependencia',
                          responsable: 'El/la Jefe/a de dependencia',
                          tarea: 'Analiza la solicitud considerando actitudes, aptitudes, habilidades y competencias del servidor para el trabajo remoto. De ser procedente, emite autorización o visto bueno por escrito a Gestión Corporativa garantizando la no afectación del servicio.',
                          tiempo: 'Hasta 3 días',
                          registro: 'Memorando 2311520-FT-018 (Aval del Jefe)',
                          badgeFormato: '2311520-FT-018',
                        },
                        {
                          num: 6,
                          actividad: 'Verificar condiciones de Seguridad y Salud en el Trabajo y tecnológicas',
                          responsable: 'Profesional de Riesgos Laborales/ARL y Profesional del Área de Tecnología',
                          tarea: 'Con el aval del jefe, se coordinan y efectúan visitas domiciliarias (presenciales o virtuales) para validar el puesto: 1. Componente TIC (hardware, software, conectividad). 2. Componente SST (condiciones biomecánicas, ambientales y familiares bajo el Manual SG-SST).',
                          tiempo: '5 días',
                          registro: 'SST: 2311300-FT-261 | TIC: 2311300-FT-400',
                          badgeFormato: 'FT-261 & FT-400',
                        },
                        {
                          num: 7,
                          actividad: 'Presentar informe de resultados de la verificación de requisitos',
                          responsable: 'Profesional Universitario (a) - Profesional Especializado (a)',
                          tarea: 'Consolida la información de puestos de trabajo y requisitos evaluados para generar el informe de resultados del proceso de selección con los servidores que cumplen criterios de acceso a la modalidad.',
                          tiempo: '5 días',
                          registro: 'Informe de resultados de la convocatoria',
                          badgeFormato: 'Punto de Control',
                          esPuntoControl: true,
                        },
                        {
                          num: 8,
                          actividad: 'Expedir Acto Administrativo particular de autorización',
                          responsable: 'Profesional Universitario (a) - Especializado (a) / Director(a) Gestión Corporativa',
                          tarea: 'Se proyecta la resolución particular de autorización bajo teletrabajo para la firma del Director(a) de Gestión Corporativa. Numerada y comunicada formalmente al servidor público.',
                          tiempo: '5 días',
                          registro: 'Resolución Particular 2311520-FT-130',
                          badgeFormato: '2311520-FT-130',
                        },
                        {
                          num: 9,
                          actividad: 'Suscribir el Acuerdo de Voluntariedad',
                          responsable: 'Teletrabajador(a) / El/la Jefe/a de dependencia',
                          tarea: 'Por ser una decisión voluntaria y concertada, el servidor y su jefe suscriben el Acuerdo de Voluntariedad en SIGA con las tareas, funciones, días, horarios, sitio, duración e insumos. Debe entregarse dentro de los cinco (5) días hábiles siguientes a la resolución como requisito indispensable para iniciar.',
                          tiempo: '5 días hábiles',
                          registro: 'Acuerdo de Voluntariedad 2311300-FT-269',
                          badgeFormato: '2311300-FT-269',
                        },
                        {
                          num: 10,
                          actividad: 'Solicitar ajuste de concertación de compromisos laborales',
                          responsable: 'Profesional Universitario (a) / Jefe/a de dependencia',
                          tarea: 'Gestión Corporativa solicita al jefe verificar si se requiere ajustar compromisos laborales para reflejar la operatividad remota y garantizar evaluación objetiva. Si son suficientes, el jefe informa que no aplica por suficiencia vigente.',
                          tiempo: '1 día',
                          registro: 'Memorando 2311520-FT-018',
                          badgeFormato: '2311520-FT-018',
                        },
                        {
                          num: 11,
                          actividad: 'Reportar teletrabajador(es) en aplicativos obligatorios',
                          responsable: 'Profesional Universitario (a) - Profesional Especializado (a)',
                          tarea: 'Reporte a plataformas externas y distritales obligatorias: 1. Plataforma ARL (cobertura de riesgos laborales). 2. Ministerio del Trabajo (formato oficial vigente). 3. SIDEAP 2.0 (ingreso y novedades en el sistema distrital).',
                          tiempo: '5 días',
                          registro: '2311520-FT-019 / MinTrabajo / SIDEAP 2.0 / ARL',
                          badgeFormato: 'ARL - MinTrabajo - SIDEAP',
                        },
                        {
                          num: 12,
                          actividad: 'Archivar documentos de teletrabajo en historia laboral',
                          responsable: 'Secretario Ejecutivo (a)',
                          tarea: 'Se archiva en historia laboral y Base de Datos: solicitud de vinculación (FT-328), autorización del jefe, actas de visitas domiciliarias (FT-261 y FT-400), resolución particular (FT-130), acuerdo de voluntariedad (FT-269) y comunicación ARL.',
                          tiempo: '2 días',
                          registro: 'Historia Laboral y Base de Datos Teletrabajo',
                          badgeFormato: 'Archivo Oficial',
                        },
                      ].map((item) => (
                        <View
                          key={item.num}
                          style={{
                            backgroundColor: THEME.white,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: item.esPuntoControl ? THEME.amberRing : THEME.slate200,
                            padding: 14,
                            gap: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: isDesktop ? 'row' : 'column',
                              justifyContent: 'space-between',
                              alignItems: isDesktop ? 'center' : 'flex-start',
                              gap: 6,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <View
                                style={{
                                  backgroundColor: item.esPuntoControl ? THEME.amberBg : THEME.marca800,
                                  width: 26,
                                  height: 26,
                                  borderRadius: 13,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <Text
                                  style={{
                                    color: item.esPuntoControl ? THEME.amberText : THEME.white,
                                    fontSize: 12,
                                    fontWeight: '800',
                                  }}
                                >
                                  {item.num}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900 }}>
                                {item.actividad}
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {item.esPuntoControl && (
                                <View
                                  style={{
                                    backgroundColor: THEME.amberBg,
                                    borderColor: THEME.amberRing,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.amberText }}>
                                    ★ PUNTO DE CONTROL
                                  </Text>
                                </View>
                              )}
                              <View
                                style={{
                                  backgroundColor: THEME.slate100,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate700 }}>
                                  SLA: {item.tiempo}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: THEME.marca50,
                                  borderColor: THEME.marca200,
                                  borderWidth: 1,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.marca800 }}>
                                  {item.badgeFormato}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <Text style={{ fontSize: 12.5, color: THEME.slate600, lineHeight: 18 }}>
                            {item.tarea}
                          </Text>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: 8,
                              borderTopWidth: 1,
                              borderTopColor: THEME.slate100,
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            <Text style={{ fontSize: 11.5, color: THEME.slate500 }}>
                              <Text style={{ fontWeight: '600', color: THEME.slate700 }}>Responsable:</Text> {item.responsable}
                            </Text>
                            <Text style={{ fontSize: 11, color: THEME.marca700, fontWeight: '500' }}>
                              Registro: {item.registro}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* FASE 4.2: SEGUIMIENTO, EVALUACIÓN Y MEDICIÓN */}
                  {faseProcedimiento === '4.2' && (
                    <View style={{ gap: 10 }}>
                      <View
                        style={{
                          backgroundColor: THEME.badges.purple.bg,
                          borderRadius: 10,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: THEME.badges.purple.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="analytics" size={18} color={THEME.badges.purple.text} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.badges.purple.text }}>
                            Fase 4.2: Seguimiento Continuo, Evaluación de Desempeño y Medición Semestral
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11.5, color: THEME.badges.purple.text, fontWeight: '600' }}>
                          Punto de Control: Actividad 5 (Informe al Comité de Gestión y Desempeño)
                        </Text>
                      </View>

                      {[
                        {
                          num: 1,
                          actividad: 'Realizar seguimiento permanente',
                          responsable: 'El/la Jefe/a de dependencia',
                          tarea: 'Seguimiento continuo a las actividades del teletrabajador según lo pactado en compromisos laborales, verificando calidad y oportunidad de las metas institucionales. Es deber del jefe informar oportunamente cualquier novedad o incumplimiento para adoptar medidas correctivas o evaluar continuidad.',
                          tiempo: 'Permanente',
                          registro: 'Reportes periódicos / Novedades a Gestión Corporativa',
                          badgeFormato: 'Monitoreo Activo',
                        },
                        {
                          num: 2,
                          actividad: 'Efectuar evaluación del desempeño laboral',
                          responsable: 'El/la Jefe/a de dependencia / teletrabajador(a)',
                          tarea: 'Evaluación del desempeño laboral con base en los plazos y parámetros del Procedimiento 2311300-PR-012 "Permanencia de Servidores Públicos". Garantiza que los resultados remotos se valoren conforme al empleo y la normatividad con objetividad.',
                          tiempo: '15 días',
                          registro: 'Evaluaciones según vinculación y reporte a historia laboral',
                          badgeFormato: '2311300-PR-012',
                        },
                        {
                          num: 3,
                          actividad: 'Verificar anualmente las condiciones SST y TIC',
                          responsable: 'Profesional de Riesgos Laborales/ARL y Profesional del Área de Tecnología',
                          tarea: 'Gestión Corporativa y la Oficina TIC realizan mínimo una vez al año verificación de SG-SST y TIC (formularios, encuestas o visitas según formatos 2311300-FT-261 y 2311300-FT-400). Si el servidor cambia de domicilio, debe comunicarlo de inmediato para validar el nuevo puesto.',
                          tiempo: '5 días',
                          registro: 'FT-261 (SST) & FT-400 (TIC)',
                          badgeFormato: 'Auditoría Anual',
                        },
                        {
                          num: 4,
                          actividad: 'Medir semestralmente la modalidad de teletrabajo',
                          responsable: 'Dirección de Gestión Corporativa / Oficina Asesora de Planeación',
                          tarea: 'Seguimiento semestral para validar el cumplimiento de objetivos y fines del teletrabajo mediante encuestas a jefes y teletrabajadores, midiendo indicadores de producto y oportunidad.',
                          tiempo: '20 días',
                          registro: 'Instrumentos de medición diligenciados',
                          badgeFormato: 'Indicadores Semestrales',
                        },
                        {
                          num: 5,
                          actividad: 'Presentar informe de resultados al Comité Institucional',
                          responsable: 'Dirección de Gestión Corporativa / Oficina de Planeación',
                          tarea: 'Consolidación de resultados semestrales en informe técnico al Equipo Técnico de Apoyo al Teletrabajo, y posterior presentación al Comité Institucional de Gestión y Desempeño para determinar ajustes a la política y publicación en portal web institucional.',
                          tiempo: '10 días',
                          registro: 'Informe de Evaluación Semestral',
                          badgeFormato: 'Punto de Control',
                          esPuntoControl: true,
                        },
                      ].map((item) => (
                        <View
                          key={item.num}
                          style={{
                            backgroundColor: THEME.white,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: item.esPuntoControl ? THEME.amberRing : THEME.slate200,
                            padding: 14,
                            gap: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: isDesktop ? 'row' : 'column',
                              justifyContent: 'space-between',
                              alignItems: isDesktop ? 'center' : 'flex-start',
                              gap: 6,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <View
                                style={{
                                  backgroundColor: item.esPuntoControl ? THEME.amberBg : THEME.marca800,
                                  width: 26,
                                  height: 26,
                                  borderRadius: 13,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <Text
                                  style={{
                                    color: item.esPuntoControl ? THEME.amberText : THEME.white,
                                    fontSize: 12,
                                    fontWeight: '800',
                                  }}
                                >
                                  {item.num}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900 }}>
                                {item.actividad}
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {item.esPuntoControl && (
                                <View
                                  style={{
                                    backgroundColor: THEME.amberBg,
                                    borderColor: THEME.amberRing,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.amberText }}>
                                    ★ PUNTO DE CONTROL
                                  </Text>
                                </View>
                              )}
                              <View
                                style={{
                                  backgroundColor: THEME.slate100,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate700 }}>
                                  SLA: {item.tiempo}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: THEME.marca50,
                                  borderColor: THEME.marca200,
                                  borderWidth: 1,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.marca800 }}>
                                  {item.badgeFormato}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <Text style={{ fontSize: 12.5, color: THEME.slate600, lineHeight: 18 }}>
                            {item.tarea}
                          </Text>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: 8,
                              borderTopWidth: 1,
                              borderTopColor: THEME.slate100,
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            <Text style={{ fontSize: 11.5, color: THEME.slate500 }}>
                              <Text style={{ fontWeight: '600', color: THEME.slate700 }}>Responsable:</Text> {item.responsable}
                            </Text>
                            <Text style={{ fontSize: 11, color: THEME.marca700, fontWeight: '500' }}>
                              Registro: {item.registro}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* FASE 4.3: LIQUIDACIÓN Y PAGO DE AUXILIO COMPENSATORIO */}
                  {faseProcedimiento === '4.3' && (
                    <View style={{ gap: 10 }}>
                      <View
                        style={{
                          backgroundColor: THEME.badges.amber.bg,
                          borderRadius: 10,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: THEME.badges.amber.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="cash" size={18} color={THEME.badges.amber.text} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.badges.amber.text }}>
                            Fase 4.3: Liquidación y Pago de Auxilio Compensatorio de Servicios Públicos
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11.5, color: THEME.badges.amber.text, fontWeight: '600' }}>
                          Punto de Control: Actividad 3 (Resolución de Liquidación - 5 días)
                        </Text>
                      </View>

                      {[
                        {
                          num: 1,
                          actividad: 'Certificar días efectivamente teletrabajados',
                          responsable: 'El/la Jefe/a de dependencia',
                          tarea: 'Con base en los seguimientos, el jefe reporta formalmente a Gestión Corporativa el número exacto de días que el servidor laboró bajo teletrabajo en el periodo. Soporte esencial para liquidar y validar cumplimiento de compromisos y acuerdo.',
                          tiempo: '1 día',
                          registro: 'Memorando 2311520-FT-018',
                          badgeFormato: '2311520-FT-018',
                        },
                        {
                          num: 2,
                          actividad: 'Liquidar la compensación de gastos (energía e internet)',
                          responsable: 'Profesional Universitario (a) - Profesional Especializado (a)',
                          tarea: 'Consolida certificaciones y liquida el gasto de servicios según la tabla de costeo por estrato expedida por la Secretaría General de la Alcaldía Mayor. Se solicita el Certificado de Disponibilidad Presupuestal (CDP). Sin efectos prestacionales.',
                          tiempo: '2 días',
                          registro: 'Consolidado y Liquidación de Gastos',
                          badgeFormato: 'Tabla por Estrato',
                        },
                        {
                          num: 3,
                          actividad: 'Elaborar Acto Administrativo para el pago de compensación',
                          responsable: 'Profesional Universitario (a) - Especializado (a) / Director(a) Gestión Corporativa',
                          tarea: 'Se proyecta la resolución particular de liquidación para la firma del Director(a) de Gestión Corporativa ordenando el reconocimiento de compensación de servicios.',
                          tiempo: '5 días',
                          registro: 'Resolución 2311520-FT-130',
                          badgeFormato: 'Punto de Control',
                          esPuntoControl: true,
                        },
                        {
                          num: 4,
                          actividad: 'Solicitar el Registro Presupuestal (RP)',
                          responsable: 'Profesional Universitario (a) - Profesional Especializado (a)',
                          tarea: 'Se remite solicitud formal al proceso de Gestión Financiera para la expedición del Registro Presupuestal que ampara el pago de la compensación.',
                          tiempo: '1 día',
                          registro: 'Memorando 2311520-FT-018 a Gestión Financiera',
                          badgeFormato: '2311520-FT-018',
                        },
                        {
                          num: 5,
                          actividad: 'Solicitar el pago de la liquidación de compensación',
                          responsable: 'Profesional Universitario (a) - Profesional Especializado (a)',
                          tarea: 'Se radica paquete completo ante Gestión Financiera: Certificado de Disponibilidad Presupuestal (CDP), Liquidación de compensación de gastos, Resolución de liquidación firmada y Registro Presupuestal (RP).',
                          tiempo: '1 día',
                          registro: 'Memorando 2311520-FT-018 y carpeta de pago',
                          badgeFormato: 'Trámite Financiero',
                        },
                      ].map((item) => (
                        <View
                          key={item.num}
                          style={{
                            backgroundColor: THEME.white,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: item.esPuntoControl ? THEME.amberRing : THEME.slate200,
                            padding: 14,
                            gap: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: isDesktop ? 'row' : 'column',
                              justifyContent: 'space-between',
                              alignItems: isDesktop ? 'center' : 'flex-start',
                              gap: 6,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <View
                                style={{
                                  backgroundColor: item.esPuntoControl ? THEME.amberBg : THEME.marca800,
                                  width: 26,
                                  height: 26,
                                  borderRadius: 13,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <Text
                                  style={{
                                    color: item.esPuntoControl ? THEME.amberText : THEME.white,
                                    fontSize: 12,
                                    fontWeight: '800',
                                  }}
                                >
                                  {item.num}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900 }}>
                                {item.actividad}
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {item.esPuntoControl && (
                                <View
                                  style={{
                                    backgroundColor: THEME.amberBg,
                                    borderColor: THEME.amberRing,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.amberText }}>
                                    ★ PUNTO DE CONTROL
                                  </Text>
                                </View>
                              )}
                              <View
                                style={{
                                  backgroundColor: THEME.slate100,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate700 }}>
                                  SLA: {item.tiempo}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: THEME.marca50,
                                  borderColor: THEME.marca200,
                                  borderWidth: 1,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.marca800 }}>
                                  {item.badgeFormato}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <Text style={{ fontSize: 12.5, color: THEME.slate600, lineHeight: 18 }}>
                            {item.tarea}
                          </Text>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: 8,
                              borderTopWidth: 1,
                              borderTopColor: THEME.slate100,
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            <Text style={{ fontSize: 11.5, color: THEME.slate500 }}>
                              <Text style={{ fontWeight: '600', color: THEME.slate700 }}>Responsable:</Text> {item.responsable}
                            </Text>
                            <Text style={{ fontSize: 11, color: THEME.marca700, fontWeight: '500' }}>
                              Registro: {item.registro}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* FASE 4.4: REVERSIBILIDAD, PRÓRROGA Y SITUACIONES ADMINISTRATIVAS */}
                  {faseProcedimiento === '4.4' && (
                    <View style={{ gap: 10 }}>
                      <View
                        style={{
                          backgroundColor: THEME.badges.emerald.bg,
                          borderRadius: 10,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: THEME.badges.emerald.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="repeat" size={18} color={THEME.badges.emerald.text} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.badges.emerald.text }}>
                            Fase 4.4: Reversibilidad a la Presencialidad, Prórrogas y Novedades Laborales
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11.5, color: THEME.badges.emerald.text, fontWeight: '600' }}>
                          Aplica para Traslados, Ascensos, Reubicaciones y Retorno
                        </Text>
                      </View>

                      {[
                        {
                          num: 1,
                          actividad: 'Recibir solicitudes de reversibilidad, prórroga y/o novedades administrativas',
                          responsable: 'Profesional Universitario (a) - Profesional Especializado (a)',
                          tarea: 'Consolida y verifica solicitudes radicadas por servidores o jefes: retorno a la presencialidad (reversibilidad), prórroga al vencimiento del término, o modificaciones derivadas de traslado, ascenso o reubicación. Se determina si requiere concepto técnico previo o formalización inmediata.',
                          tiempo: '8 días',
                          registro: 'Memorando 2311520-FT-018 / Solicitud',
                          badgeFormato: '2311520-FT-018',
                        },
                        {
                          num: 2,
                          actividad: 'Presentar ante el Equipo Técnico de Apoyo al Teletrabajo',
                          responsable: 'Profesional Universitario (a) - Profesional Especializado (a)',
                          tarea: 'Únicamente cuando el caso presente dudas técnicas o jurídicas, se presenta formalmente al Equipo Técnico para que estudie los antecedentes y emita recomendación motivada.',
                          tiempo: '1 día',
                          registro: 'Acta de Reunión 2310100-FT-048',
                          badgeFormato: '2310100-FT-048',
                        },
                        {
                          num: 3,
                          actividad: 'Elaborar Acto Administrativo con la novedad sobre el teletrabajo',
                          responsable: 'Profesional Universitario (a) - Especializado (a) / Director(a) Gestión Corporativa',
                          tarea: 'Se proyecta la resolución particular formalizando la novedad (reversibilidad, prórroga o ajuste) para firma del Director(a) de Gestión Corporativa. Incluye comunicación al servidor, reporte en aplicativos y archivo en historia laboral.',
                          tiempo: '3 días',
                          registro: 'Resolución Particular 2311520-FT-130',
                          badgeFormato: '2311520-FT-130',
                        },
                      ].map((item) => (
                        <View
                          key={item.num}
                          style={{
                            backgroundColor: THEME.white,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: THEME.slate200,
                            padding: 14,
                            gap: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: isDesktop ? 'row' : 'column',
                              justifyContent: 'space-between',
                              alignItems: isDesktop ? 'center' : 'flex-start',
                              gap: 6,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <View
                                style={{
                                  backgroundColor: THEME.marca800,
                                  width: 26,
                                  height: 26,
                                  borderRadius: 13,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '800' }}>
                                  {item.num}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900 }}>
                                {item.actividad}
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View
                                style={{
                                  backgroundColor: THEME.slate100,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate700 }}>
                                  SLA: {item.tiempo}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: THEME.marca50,
                                  borderColor: THEME.marca200,
                                  borderWidth: 1,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.marca800 }}>
                                  {item.badgeFormato}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <Text style={{ fontSize: 12.5, color: THEME.slate600, lineHeight: 18 }}>
                            {item.tarea}
                          </Text>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: 8,
                              borderTopWidth: 1,
                              borderTopColor: THEME.slate100,
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            <Text style={{ fontSize: 11.5, color: THEME.slate500 }}>
                              <Text style={{ fontWeight: '600', color: THEME.slate700 }}>Responsable:</Text> {item.responsable}
                            </Text>
                            <Text style={{ fontSize: 11, color: THEME.marca700, fontWeight: '500' }}>
                              Registro: {item.registro}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* 5. CATÁLOGO DE FORMATOS OFICIALES SIGA (FT) */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: isDesktop ? 20 : 16,
                    gap: 14,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.slate900 }}>
                        Formatos y Registros Oficiales del Sistema Integrado de Gestión (SIGA)
                      </Text>
                      <Text style={{ fontSize: 12, color: THEME.slate500, marginTop: 2 }}>
                        Instrumentos requeridos en las etapas del Procedimiento 2311300-PR-117 (Versión 06)
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: THEME.marca50,
                        borderColor: THEME.marca200,
                        borderWidth: 1,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca800 }}>
                        8 Formatos Mapeados
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: isDesktop ? 'row' : 'column',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    {[
                      {
                        codigo: '2311300-FT-328',
                        nombre: 'Solicitud de Vinculación a Teletrabajo',
                        uso: 'Formulario oficial diligenciado por el servidor público para postularse a la convocatoria institucional.',
                        fase: 'Fase 4.1 • Actividad 3',
                      },
                      {
                        codigo: '2311300-FT-269',
                        nombre: 'Acuerdo de Voluntariedad de Teletrabajo',
                        uso: 'Documento concertado y firmado entre teletrabajador y jefe en SIGA dentro de 5 días hábiles tras la resolución.',
                        fase: 'Fase 4.1 • Actividad 9',
                      },
                      {
                        codigo: '2311300-FT-261',
                        nombre: 'Verificación Condiciones Mínimas de SST para Teletrabajo',
                        uso: 'Acta de visita domiciliaria (presencial o virtual) biomecánica, ambiental y del puesto evaluada por ARL/SST.',
                        fase: 'Fase 4.1 & 4.2 • Actividades 6 y 3',
                      },
                      {
                        codigo: '2311300-FT-400',
                        nombre: 'Verificación Equipo de Cómputo para Teletrabajo (TIC)',
                        uso: 'Validación de requerimientos técnicos de hardware, software, seguridad digital y conectividad remota.',
                        fase: 'Fase 4.1 & 4.2 • Actividades 6 y 3',
                      },
                      {
                        codigo: '2311520-FT-130',
                        nombre: 'Resolución Particular de Teletrabajo / Liquidación',
                        uso: 'Acto administrativo formal expedido por el Director(a) de Gestión Corporativa para autorizar o liquidar auxilio.',
                        fase: 'Fases 4.1, 4.3 & 4.4',
                      },
                      {
                        codigo: '2311520-FT-018',
                        nombre: 'Memorando Oficial de Trámite / Aval / Certificación de Días',
                        uso: 'Comunicaciones formales internas para aval del jefe, trámite presupuestal y reporte mensual de días laborados.',
                        fase: 'Fases 4.1, 4.2, 4.3 & 4.4',
                      },
                      {
                        codigo: '2310100-FT-048',
                        nombre: 'Acta del Equipo Técnico de Apoyo al Teletrabajo',
                        uso: 'Soporte de análisis y concepto motivado en casos especiales de modalidad autónoma, reversibilidad o dudas jurídicas.',
                        fase: 'Fases 4.1 & 4.4',
                      },
                      {
                        codigo: '2311300-PR-012',
                        nombre: 'Procedimiento Permanencia de Servidores Públicos',
                        uso: 'Marco para evaluación periódica y objetiva del desempeño laboral bajo la concertación de compromisos remotos.',
                        fase: 'Fase 4.2 • Actividad 2',
                      },
                    ].map((f) => (
                      <View
                        key={f.codigo}
                        style={{
                          width: isDesktop ? ('49%' as never) : '100%',
                          backgroundColor: THEME.slate50,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          padding: 12,
                          gap: 4,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.marca800 }}>
                            {f.codigo}
                          </Text>
                          <Text style={{ fontSize: 10.5, fontWeight: '600', color: THEME.slate500 }}>
                            {f.fase}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>
                          {f.nombre}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: THEME.slate600, lineHeight: 16 }}>
                          {f.uso}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 6. PLATAFORMAS EXTERNAS OBLIGATORIAS (Actividad 11 de la Fase 4.1) */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: isDesktop ? 20 : 16,
                    gap: 12,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.slate900 }}>
                    Reportes Externos y Plataformas Distritales Obligatorias
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.slate500 }}>
                    Trámites obligatorios ejecutados por Talento Humano previo al inicio efectivo de la modalidad
                  </Text>

                  <View
                    style={{
                      flexDirection: isDesktop ? 'row' : 'column',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        flex: isDesktop ? 1 : undefined,
                        minWidth: isDesktop ? 220 : '100%',
                        backgroundColor: THEME.badges.emerald.bg,
                        borderColor: THEME.badges.emerald.border,
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 14,
                        gap: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="medkit" size={18} color={THEME.badges.emerald.text} />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.badges.emerald.text }}>
                          Plataforma ARL
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11.5, color: THEME.slate700, lineHeight: 16 }}>
                        Reporte del listado oficial de teletrabajadores informando novedades para garantizar la cobertura integral de riesgos laborales.
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: isDesktop ? 1 : undefined,
                        minWidth: isDesktop ? 220 : '100%',
                        backgroundColor: THEME.badges.sky.bg,
                        borderColor: THEME.badges.sky.border,
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 14,
                        gap: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="briefcase" size={18} color={THEME.badges.sky.text} />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.badges.sky.text }}>
                          Ministerio del Trabajo
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11.5, color: THEME.slate700, lineHeight: 16 }}>
                        Reporte formal de la novedad utilizando el formato oficial de recolección de información de teletrabajadores vigente a nivel nacional.
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: isDesktop ? 1 : undefined,
                        minWidth: isDesktop ? 220 : '100%',
                        backgroundColor: THEME.badges.purple.bg,
                        borderColor: THEME.badges.purple.border,
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 14,
                        gap: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="server" size={18} color={THEME.badges.purple.text} />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.badges.purple.text }}>
                          SIDEAP 2.0
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11.5, color: THEME.slate700, lineHeight: 16 }}>
                        Registro de ingreso y novedades de los teletrabajadores en el Sistema de Información Distrital del Empleo y la Administración Pública.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* ================================================================= */}
        {/* MODAL 1: FORMULARIO DE ASIGNACIÓN DE MODALIDAD                    */}
        {/* ================================================================= */}
        <Modal
          visible={modalAsignacionVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalAsignacionVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: THEME.white,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: THEME.slate200,
                padding: 24,
                width: '100%',
                maxWidth: 640,
                maxHeight: '90%',
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                {/* Cabecera Modal */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: THEME.slate200,
                  }}
                >
                  <View>
                    <Text style={{ color: THEME.slate900, fontSize: 17, fontWeight: '800' }}>
                      Configurar Modalidad de Trabajo
                    </Text>
                    <Text style={{ color: THEME.marca700, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                      {formAsignacion.persona?.titular_nombre} (C.C. {formAsignacion.persona?.titular_cedula})
                    </Text>
                  </View>
                  <Pressable onPress={() => setModalAsignacionVisible(false)} hitSlop={8}>
                    <Ionicons name="close" size={24} color={THEME.slate500} />
                  </Pressable>
                </View>

                {/* Cargo Actual y Viabilidad */}
                <View
                  style={{
                    backgroundColor: THEME.slate50,
                    padding: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: THEME.slate700, fontSize: 13 }}>
                    Cargo: <Text style={{ color: THEME.slate900, fontWeight: '800' }}>{formAsignacion.persona?.cargo}</Text>
                  </Text>
                  <Text style={{ color: THEME.slate500, fontSize: 12 }}>
                    Dependencia: {formAsignacion.persona?.dependencia_cargo}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Ionicons
                      name={formAsignacion.cargo_es_teletrabajable ? 'checkmark-circle' : 'alert-circle'}
                      size={18}
                      color={formAsignacion.cargo_es_teletrabajable ? '#047857' : '#BE123C'}
                    />
                    <Text
                      style={{
                        color: formAsignacion.cargo_es_teletrabajable ? '#047857' : '#BE123C',
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {formAsignacion.cargo_es_teletrabajable
                        ? 'Cargo Oficialmente Teletrabajable'
                        : 'Cargo NO figura como teletrabajable en manual'}
                    </Text>
                  </View>
                </View>

                {/* Switch de Excepción de Jefatura si no es teletrabajable */}
                {!formAsignacion.cargo_es_teletrabajable && formAsignacion.modalidad === 'TELETRABAJO' && (
                  <View
                    style={{
                      backgroundColor: THEME.badges.amber.bg,
                      padding: 14,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.badges.amber.border,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: THEME.badges.amber.text, fontSize: 13, fontWeight: '800' }}>
                        ¿Aprobación Excepcional del Jefe Inmediato?
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setFormAsignacion((prev) => ({
                            ...prev,
                            excepcion_jefe_aprobada: !prev.excepcion_jefe_aprobada,
                          }))
                        }
                        style={{
                          backgroundColor: formAsignacion.excepcion_jefe_aprobada ? '#047857' : THEME.slate500,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                          {formAsignacion.excepcion_jefe_aprobada ? 'APROBADO' : 'NO'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {formAsignacion.excepcion_jefe_aprobada && (
                      <TextInput
                        value={formAsignacion.motivo_excepcion_jefe}
                        onChangeText={(t) =>
                          setFormAsignacion((prev) => ({ ...prev, motivo_excepcion_jefe: t }))
                        }
                        placeholder="Justificación de la jefatura para autorizar la excepción..."
                        placeholderTextColor={THEME.slate400}
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate300,
                          color: THEME.slate900,
                          padding: 10,
                          fontSize: 12.5,
                        }}
                      />
                    )}
                  </View>
                )}

                {/* Selección de Modalidad */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: THEME.slate700, fontSize: 13, fontWeight: '700' }}>
                    Tipo de Modalidad:
                  </Text>
                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
                    {[
                      {
                        id: 'TELETRABAJO',
                        label: 'Teletrabajo Suplementario',
                        sub: 'Modalidad híbrida (días presenciales y días en casa)',
                      },
                      {
                        id: 'TELETRABAJO_AUTONOMO',
                        label: 'Teletrabajo Autónomo',
                        sub: 'Modalidad 100% remota continua o permanente',
                      },
                      {
                        id: 'TRABAJO_EN_CASA',
                        label: 'Trabajo en Casa',
                        sub: 'Modalidad temporal o excepcional (Ley 2088)',
                      },
                    ].map((m) => {
                      const sel = formAsignacion.modalidad === m.id;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() => {
                            if (m.id === 'TELETRABAJO_AUTONOMO') {
                              setFormAsignacion((prev) => ({
                                ...prev,
                                modalidad: 'TELETRABAJO_AUTONOMO',
                                submodalidad: 'AUTONOMO',
                                esquema_dias_tipo: 'TODOS',
                                dias_por_semana: 5,
                                dias_semana_fijos: [...DIAS_SEMANA],
                              }));
                            } else {
                              setFormAsignacion((prev) => ({
                                ...prev,
                                modalidad: m.id as any,
                                submodalidad: m.id === 'TELETRABAJO' ? 'SUPLEMENTARIO' : 'EXCEPCIONAL',
                              }));
                            }
                          }}
                          style={{
                            flex: 1,
                            backgroundColor: sel ? THEME.marca50 : THEME.slate50,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            borderWidth: sel ? 2 : 1,
                            borderColor: sel ? THEME.marca600 : THEME.slate200,
                            gap: 3,
                          }}
                        >
                          <Text
                            style={{
                              color: sel ? THEME.marca900 : THEME.slate800,
                              fontSize: 12.5,
                              fontWeight: '800',
                            }}
                          >
                            {m.label}
                          </Text>
                          <Text
                            style={{
                              color: sel ? THEME.marca700 : THEME.slate500,
                              fontSize: 11,
                              lineHeight: 14,
                            }}
                          >
                            {m.sub}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Selección de Resolución General */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: THEME.slate700, fontSize: 13, fontWeight: '700' }}>
                    Resolución que Otorga el Beneficio:
                  </Text>
                  <View style={{ gap: 6 }}>
                    {resoluciones.map((r) => {
                      const sel = formAsignacion.resolucion_id === r.id;
                      return (
                        <TouchableOpacity
                          key={r.id}
                          onPress={() => alCambiarResolucion(r.id)}
                          style={{
                            backgroundColor: sel ? THEME.marca50 : THEME.slate50,
                            padding: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: sel ? THEME.marca600 : THEME.slate200,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <View>
                            <Text style={{ color: sel ? THEME.marca900 : THEME.slate900, fontSize: 13, fontWeight: '700' }}>
                              {r.numero_resolucion}
                            </Text>
                            <Text style={{ color: THEME.slate500, fontSize: 11 }}>
                              Vigencia base de la resolución: {limpiarFecha(r.fecha_inicio_vigencia)} al {limpiarFecha(r.fecha_fin_vigencia)}
                            </Text>
                          </View>
                          {sel && <Ionicons name="checkmark-circle" size={18} color={THEME.marca700} />}
                        </TouchableOpacity>
                      );
                    })}
                    {resoluciones.length === 0 && (
                      <Text style={{ color: THEME.badges.amber.text, fontSize: 12 }}>
                        No hay resoluciones registradas aún. Puedes definirlas en la pestaña de Resoluciones o ingresar fechas manualmente.
                      </Text>
                    )}
                  </View>
                </View>

                {/* Fechas de Vigencia */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: THEME.slate700, fontSize: 13, fontWeight: '700' }}>
                      Periodo de Vigencia de la Autorización de Modalidad:
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setFormAsignacion((prev) => ({
                          ...prev,
                          fechas_editadas_manualmente: !prev.fechas_editadas_manualmente,
                        }))
                      }
                    >
                      <Text style={{ color: THEME.marca700, fontSize: 11.5, fontWeight: '700' }}>
                        {formAsignacion.fechas_editadas_manualmente ? 'Modo Manual Habilitado' : 'Heredando de Resolución'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      backgroundColor: THEME.marca50,
                      padding: 10,
                      borderRadius: 8,
                      borderLeftWidth: 3,
                      borderLeftColor: THEME.marca700,
                    }}
                  >
                    <Text style={{ color: THEME.slate600, fontSize: 11.5, lineHeight: 16 }}>
                      ℹ️ Corresponde al rango de fechas en que la persona tiene autorizada la modalidad. Por defecto hereda la vigencia de la Resolución seleccionada, pero puedes ajustarlo si a la persona se le concede un periodo menor o específico.
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: THEME.slate600, fontSize: 11, fontWeight: '600' }}>Fecha Inicio:</Text>
                      <TextInput
                        value={limpiarFecha(formAsignacion.fecha_inicio)}
                        onChangeText={(t) =>
                          setFormAsignacion((prev) => ({
                            ...prev,
                            fecha_inicio: limpiarFecha(t),
                            fechas_editadas_manualmente: true,
                          }))
                        }
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor={THEME.slate400}
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate300,
                          color: THEME.slate900,
                          padding: 10,
                          fontSize: 13,
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: THEME.slate600, fontSize: 11, fontWeight: '600' }}>Fecha Fin:</Text>
                      <TextInput
                        value={limpiarFecha(formAsignacion.fecha_fin)}
                        onChangeText={(t) =>
                          setFormAsignacion((prev) => ({
                            ...prev,
                            fecha_fin: limpiarFecha(t),
                            fechas_editadas_manualmente: true,
                          }))
                        }
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor={THEME.slate400}
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate300,
                          color: THEME.slate900,
                          padding: 10,
                          fontSize: 13,
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Esquema de Días: Título Dinámico según modalidad seleccionada */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: THEME.slate700, fontSize: 13, fontWeight: '700' }}>
                      {formAsignacion.modalidad === 'TRABAJO_EN_CASA'
                        ? 'Distribución de Días de Trabajo en Casa:'
                        : formAsignacion.modalidad === 'TELETRABAJO_AUTONOMO'
                        ? 'Distribución de Días de Teletrabajo Autónomo:'
                        : 'Distribución de Días de Teletrabajo:'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { id: 'DIAS_FIJOS', label: 'Días Fijos por Semana' },
                      { id: 'TODOS', label: 'Todos los Días (Lunes a Viernes)' },
                      { id: 'DIAS_PARES', label: 'Días Pares del Calendario' },
                      { id: 'DIAS_IMPARES', label: 'Días Impares del Calendario' },
                      { id: 'CANTIDAD_LIBRE', label: 'Días Libres Concertados' },
                    ].map((esq) => {
                      const sel = formAsignacion.esquema_dias_tipo === esq.id;
                      return (
                        <TouchableOpacity
                          key={esq.id}
                          onPress={() => {
                            if (esq.id === 'TODOS') {
                              seleccionarTodosLosDias();
                            } else {
                              setFormAsignacion((prev) => ({
                                ...prev,
                                esquema_dias_tipo: esq.id as any,
                              }));
                            }
                          }}
                          style={{
                            backgroundColor: sel ? THEME.marca700 : THEME.slate100,
                            paddingVertical: 8,
                            paddingHorizontal: 11,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: sel ? THEME.marca700 : THEME.slate200,
                          }}
                        >
                          <Text style={{ color: sel ? '#FFFFFF' : THEME.slate700, fontSize: 11.5, fontWeight: '700' }}>
                            {esq.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selector de días de la semana con botón TODOS */}
                  {(formAsignacion.esquema_dias_tipo === 'DIAS_FIJOS' ||
                    formAsignacion.esquema_dias_tipo === 'TODOS') && (
                    <View style={{ marginTop: 6, gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: THEME.slate500, fontSize: 11 }}>Selecciona los días hábiles:</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            onPress={seleccionarTodosLosDias}
                            style={{
                              backgroundColor: THEME.marca50,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 4,
                              borderWidth: 1,
                              borderColor: THEME.marca200,
                            }}
                          >
                            <Text style={{ color: THEME.marca700, fontSize: 10.5, fontWeight: '800' }}>
                              Marcar Todos (5)
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setFormAsignacion((prev) => ({
                                ...prev,
                                dias_semana_fijos: [],
                                dias_por_semana: 0,
                                esquema_dias_tipo: 'DIAS_FIJOS',
                              }))
                            }
                            style={{
                              backgroundColor: THEME.slate100,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 4,
                              borderWidth: 1,
                              borderColor: THEME.slate200,
                            }}
                          >
                            <Text style={{ color: THEME.slate600, fontSize: 10.5, fontWeight: '600' }}>
                              Limpiar
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {DIAS_SEMANA.map((dia) => {
                          const activo = formAsignacion.dias_semana_fijos.includes(dia);
                          return (
                            <TouchableOpacity
                              key={dia}
                              onPress={() => toggleDiaSemana(dia)}
                              style={{
                                flex: 1,
                                paddingVertical: 8,
                                borderRadius: 6,
                                backgroundColor: activo ? '#047857' : THEME.slate100,
                                borderWidth: 1,
                                borderColor: activo ? '#059669' : THEME.slate200,
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ color: activo ? '#FFFFFF' : THEME.slate600, fontSize: 11, fontWeight: '800' }}>
                                {dia.substring(0, 3)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>

                {/* Botones de Acción Modal */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <Pressable
                    onPress={() => setModalAsignacionVisible(false)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: THEME.slate100,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                    }}
                  >
                    <Text style={{ color: THEME.slate700, fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => guardarAsignacion()}
                    disabled={guardandoAsignacion}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: THEME.marca700,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {guardandoAsignacion ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                          Guardar Asignación
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ================================================================= */}
        {/* MODAL 2: SUBIR / EDITAR RESOLUCIÓN INSTITUCIONAL                  */}
        {/* ================================================================= */}
        <Modal
          visible={modalResVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalResVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: THEME.white,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: THEME.slate200,
                padding: 24,
                width: '100%',
                maxWidth: 580,
                gap: 14,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: THEME.slate200,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: formRes.id ? THEME.marca50 : '#F0FDF4',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={formRes.id ? 'pencil' : 'cloud-upload'}
                      size={18}
                      color={formRes.id ? THEME.marca700 : '#16A34A'}
                    />
                  </View>
                  <View>
                    <Text style={{ color: THEME.slate900, fontSize: 16.5, fontWeight: '800' }}>
                      {formRes.id ? 'Editar Resolución Institucional' : 'Subir Nueva Resolución'}
                    </Text>
                    <Text style={{ color: THEME.slate400, fontSize: 11 }}>
                      {formRes.id
                        ? 'Modifica los parámetros y vigencia del acto administrativo'
                        : 'Registra un acto administrativo marco para el régimen laboral'}
                    </Text>
                  </View>
                </View>

                <Pressable onPress={() => setModalResVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={THEME.slate500} />
                </Pressable>
              </View>

              {/* Selector de Estado */}
              <View style={{ gap: 4 }}>
                <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>
                  Estado Jurídico del Acto:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['VIGENTE', 'DEROGADA', 'FINALIZADA'] as const).map((est) => {
                    const isSel = formRes.estado === est;
                    const badge =
                      est === 'VIGENTE'
                        ? THEME.badges.emerald
                        : est === 'DEROGADA'
                        ? THEME.badges.rose
                        : THEME.badges.amber;
                    return (
                      <Pressable
                        key={est}
                        onPress={() => setFormRes((p) => ({ ...p, estado: est }))}
                        style={{
                          flex: 1,
                          paddingVertical: 7,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          borderWidth: 1.5,
                          borderColor: isSel ? badge.text : THEME.slate200,
                          backgroundColor: isSel ? badge.bg : THEME.slate50,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: isSel ? badge.text : THEME.slate600,
                            fontSize: 11.5,
                            fontWeight: isSel ? '800' : '600',
                          }}
                        >
                          {est}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Selector de Modalidad Principal */}
              <View style={{ gap: 4 }}>
                <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>
                  Modalidad Principal Regulada:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {([
                    { key: 'TELETRABAJO', label: 'Teletrabajo' },
                    { key: 'TRABAJO_EN_CASA', label: 'Trabajo en Casa' },
                    { key: 'MIXTA', label: 'Mixta / Alternancia' },
                  ] as const).map((m) => {
                    const isSel = formRes.modalidad_principal === m.key;
                    return (
                      <Pressable
                        key={m.key}
                        onPress={() => setFormRes((p) => ({ ...p, modalidad_principal: m.key }))}
                        style={{
                          flex: 1,
                          paddingVertical: 7,
                          paddingHorizontal: 6,
                          borderRadius: 8,
                          borderWidth: 1.5,
                          borderColor: isSel ? THEME.marca700 : THEME.slate200,
                          backgroundColor: isSel ? THEME.marca50 : THEME.slate50,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: isSel ? THEME.marca700 : THEME.slate600,
                            fontSize: 11.5,
                            fontWeight: isSel ? '800' : '600',
                          }}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Número de Resolución */}
              <View style={{ gap: 4 }}>
                <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>
                  Número de Resolución:
                </Text>
                <TextInput
                  value={formRes.numero_resolucion}
                  onChangeText={(t) => setFormRes((p) => ({ ...p, numero_resolucion: t }))}
                  placeholder="Ej: Resolución No. 124 de 2026"
                  placeholderTextColor={THEME.slate400}
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate300,
                    color: THEME.slate900,
                    padding: 9,
                    fontSize: 13,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>
                    Fecha Expedición:
                  </Text>
                  <TextInput
                    value={formRes.fecha_expedicion}
                    onChangeText={(t) => setFormRes((p) => ({ ...p, fecha_expedicion: t }))}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={THEME.slate400}
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: THEME.slate300,
                      color: THEME.slate900,
                      padding: 9,
                      fontSize: 13,
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>Año:</Text>
                  <TextInput
                    value={formRes.anio}
                    onChangeText={(t) => setFormRes((p) => ({ ...p, anio: t }))}
                    placeholder="2026"
                    placeholderTextColor={THEME.slate400}
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: THEME.slate300,
                      color: THEME.slate900,
                      padding: 9,
                      fontSize: 13,
                    }}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>
                    Vigencia Inicio:
                  </Text>
                  <TextInput
                    value={formRes.fecha_inicio_vigencia}
                    onChangeText={(t) => setFormRes((p) => ({ ...p, fecha_inicio_vigencia: t }))}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={THEME.slate400}
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: THEME.slate300,
                      color: THEME.slate900,
                      padding: 9,
                      fontSize: 13,
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>
                    Vigencia Fin:
                  </Text>
                  <TextInput
                    value={formRes.fecha_fin_vigencia}
                    onChangeText={(t) => setFormRes((p) => ({ ...p, fecha_fin_vigencia: t }))}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={THEME.slate400}
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: THEME.slate300,
                      color: THEME.slate900,
                      padding: 9,
                      fontSize: 13,
                    }}
                  />
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>
                  Descripción u Objeto:
                </Text>
                <TextInput
                  value={formRes.descripcion}
                  onChangeText={(t) => setFormRes((p) => ({ ...p, descripcion: t }))}
                  placeholder="Descripción del acto administrativo..."
                  placeholderTextColor={THEME.slate400}
                  multiline
                  numberOfLines={2}
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate300,
                    color: THEME.slate900,
                    padding: 9,
                    fontSize: 12.5,
                  }}
                />
              </View>

              {/* Subir o Actualizar Archivo PDF */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>
                  Archivo PDF Oficial:
                </Text>

                {formRes.archivo_pdf_url && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: THEME.slate50,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Ionicons name="document-attach" size={17} color={THEME.marca700} />
                      <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                        Documento oficial adjunto registrado
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        if (Platform.OS === 'web' && formRes.archivo_pdf_url) {
                          window.open(formRes.archivo_pdf_url, '_blank');
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: THEME.marca50,
                        borderWidth: 1,
                        borderColor: THEME.marca200,
                      }}
                    >
                      <Ionicons name="eye-outline" size={13} color={THEME.marca700} />
                      <Text style={{ color: THEME.marca700, fontSize: 11, fontWeight: '700' }}>
                        Ver PDF
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {Platform.OS === 'web' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      accept=".pdf"
                      id="upload-res"
                      style={{ display: 'none' }}
                      onChange={handleSeleccionarArchivoResolucion}
                    />
                    <label
                      htmlFor="upload-res"
                      style={{
                        backgroundColor: THEME.marca50,
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: `1px solid ${THEME.marca200}`,
                        color: THEME.marca700,
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      📁 {formRes.nombre_archivo ? 'Cambiar PDF' : formRes.archivo_pdf_url ? 'Reemplazar PDF' : 'Seleccionar PDF'}
                    </label>
                    <Text style={{ color: THEME.slate600, fontSize: 12 }}>
                      {formRes.nombre_archivo || (formRes.archivo_pdf_url ? 'Conservar archivo actual' : 'Ningún archivo nuevo seleccionado')}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: THEME.slate500, fontSize: 12 }}>
                    Carga de archivos disponible en versión web.
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <Pressable
                  onPress={() => setModalResVisible(false)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: THEME.slate100,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                  }}
                >
                  <Text style={{ color: THEME.slate700, fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={() => guardarResolucion()}
                  disabled={guardandoRes}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: THEME.marca700,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {guardandoRes ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name={formRes.id ? 'save-outline' : 'cloud-upload'}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                        {formRes.id ? 'Actualizar Resolución' : 'Guardar Resolución'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ================================================================= */}
        {/* MODAL 3: ACUERDO DE COMPROMISO                                   */}
        {/* ================================================================= */}
        <Modal
          visible={modalAcuerdoVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalAcuerdoVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: THEME.white,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: THEME.slate200,
                padding: 24,
                width: '100%',
                maxWidth: 540,
                gap: 14,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: THEME.slate200,
                }}
              >
                <View>
                  <Text style={{ color: THEME.slate900, fontSize: 17, fontWeight: '800' }}>
                    Acuerdo de Voluntariedad de Teletrabajo
                  </Text>
                  <Text style={{ color: THEME.marca800, fontSize: 11.5, fontWeight: '600', marginTop: 2 }}>
                    Formato Oficial SIGA: 2311300-FT-269 • Plazo: 5 días hábiles tras la resolución
                  </Text>
                </View>
                <Pressable onPress={() => setModalAcuerdoVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={THEME.slate500} />
                </Pressable>
              </View>

              <View style={{ backgroundColor: THEME.slate50, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: THEME.slate200, gap: 4 }}>
                <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '700' }}>
                  Servidor: {formAcuerdo.persona?.titular_nombre}
                </Text>
                <Text style={{ color: THEME.marca700, fontSize: 12.5, fontWeight: '600' }}>
                  Cargo Actual: {formAcuerdo.persona?.cargo}
                </Text>
                <Text style={{ color: THEME.slate500, fontSize: 11.5 }}>
                  Dependencia: {formAcuerdo.persona?.dependencia_cargo}
                </Text>
              </View>

              {formAcuerdo.persona?.requiere_nuevo_acuerdo && (
                <View
                  style={{
                    backgroundColor: THEME.badges.amber.bg,
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.badges.amber.border,
                  }}
                >
                  <Text style={{ color: THEME.badges.amber.text, fontSize: 12, fontWeight: '700', lineHeight: 17 }}>
                    ⚠️ Atención: El servidor presenta un cargo distinto al registrado en el acuerdo anterior. Se debe formalizar y subir el nuevo acuerdo de compromiso para el cargo actual.
                  </Text>
                </View>
              )}

              <View style={{ gap: 4 }}>
                <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>Fecha de Suscripción:</Text>
                <TextInput
                  value={formAcuerdo.fecha_suscripcion}
                  onChangeText={(t) => setFormAcuerdo((p) => ({ ...p, fecha_suscripcion: t }))}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={THEME.slate400}
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate300,
                    color: THEME.slate900,
                    padding: 10,
                    fontSize: 13,
                  }}
                />
              </View>

              {/* Subir Acuerdo PDF */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>
                  Documento de Acuerdo Firmado (PDF):
                </Text>
                {Platform.OS === 'web' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <input
                      type="file"
                      accept=".pdf"
                      id="upload-acuerdo"
                      style={{ display: 'none' }}
                      onChange={handleSeleccionarArchivoAcuerdo}
                    />
                    <label
                      htmlFor="upload-acuerdo"
                      style={{
                        backgroundColor: THEME.badges.amber.bg,
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: `1px solid ${THEME.badges.amber.border}`,
                        color: THEME.badges.amber.text,
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      📁 {formAcuerdo.nombre_archivo ? 'Cambiar PDF' : 'Subir PDF Firmado'}
                    </label>
                    <Text style={{ color: THEME.slate600, fontSize: 12 }}>
                      {formAcuerdo.nombre_archivo || 'Ningún archivo seleccionado'}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: THEME.slate500, fontSize: 12 }}>
                    Carga disponible en versión web.
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <Pressable
                  onPress={() => setModalAcuerdoVisible(false)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: THEME.slate100,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                  }}
                >
                  <Text style={{ color: THEME.slate700, fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={() => guardarAcuerdoCompromiso()}
                  disabled={guardandoAcuerdo}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: '#D97706',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {guardandoAcuerdo ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="ribbon" size={18} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                        Registrar Acuerdo
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ================================================================= */}
        {/* MODAL 4: SEGUIMIENTO PERIÓDICO POR FECHAS                        */}
        {/* ================================================================= */}
        <Modal
          visible={modalSegVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalSegVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: THEME.white,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: THEME.slate200,
                padding: 24,
                width: '100%',
                maxWidth: 600,
                maxHeight: '90%',
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: THEME.slate200,
                  }}
                >
                  <View>
                    <Text style={{ color: THEME.slate900, fontSize: 17, fontWeight: '800' }}>
                      Registrar Corte de Seguimiento y Certificación
                    </Text>
                    <Text style={{ color: THEME.marca800, fontSize: 11.5, fontWeight: '600', marginTop: 2 }}>
                      Fase 4.2 / Memorando 2311520-FT-018 • Base para liquidación de servicios (Fase 4.3)
                    </Text>
                  </View>
                  <Pressable onPress={() => setModalSegVisible(false)} hitSlop={8}>
                    <Ionicons name="close" size={24} color={THEME.slate500} />
                  </Pressable>
                </View>

                <View style={{ backgroundColor: THEME.slate50, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: THEME.slate200, gap: 4 }}>
                  <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '700' }}>
                    Servidor: {formSeg.persona?.titular_nombre}
                  </Text>
                  <Text style={{ color: THEME.marca700, fontSize: 12.5, fontWeight: '600' }}>
                    Cargo: {formSeg.persona?.cargo}
                  </Text>
                </View>

                {/* Rango de Fechas (Desde - Hasta) */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: THEME.marca700, fontSize: 13, fontWeight: '800' }}>
                    Rango del Periodo Evaluado:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: THEME.slate600, fontSize: 11, fontWeight: '600' }}>Fecha Desde:</Text>
                      <TextInput
                        value={formSeg.fecha_corte_desde}
                        onChangeText={(t) => setFormSeg((p) => ({ ...p, fecha_corte_desde: t }))}
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor={THEME.slate400}
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate300,
                          color: THEME.slate900,
                          padding: 10,
                          fontSize: 13,
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: THEME.slate600, fontSize: 11, fontWeight: '600' }}>Fecha Hasta:</Text>
                      <TextInput
                        value={formSeg.fecha_corte_hasta}
                        onChangeText={(t) => setFormSeg((p) => ({ ...p, fecha_corte_hasta: t }))}
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor={THEME.slate400}
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate300,
                          color: THEME.slate900,
                          padding: 10,
                          fontSize: 13,
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Días Efectivamente Teletrabajados y Radicado Memorando (Fase 4.2 / 4.3) */}
                <View style={{ gap: 8, backgroundColor: THEME.slate50, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: THEME.slate200 }}>
                  <Text style={{ color: THEME.marca800, fontSize: 12.5, fontWeight: '800' }}>
                    Certificación de Días y Soporte Oficial (Procedimiento 2311300-PR-117):
                  </Text>

                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: THEME.slate700, fontSize: 11.5, fontWeight: '700' }}>
                        Días Efectivos en Casa (Mes):
                      </Text>
                      <TextInput
                        value={formSeg.dias_efectivos_teletrabajo}
                        onChangeText={(t) => setFormSeg((p) => ({ ...p, dias_efectivos_teletrabajo: t }))}
                        keyboardType="numeric"
                        placeholder="Ej. 8"
                        placeholderTextColor={THEME.slate400}
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate300,
                          color: THEME.slate900,
                          padding: 9,
                          fontSize: 13,
                        }}
                      />
                    </View>

                    <View style={{ flex: 1.5, gap: 4 }}>
                      <Text style={{ color: THEME.slate700, fontSize: 11.5, fontWeight: '700' }}>
                        Radicado Memorando (FT-018):
                      </Text>
                      <TextInput
                        value={formSeg.radicado_memorando_ft018}
                        onChangeText={(t) => setFormSeg((p) => ({ ...p, radicado_memorando_ft018: t }))}
                        placeholder="Ej. 2311520-FT-018-2026-..."
                        placeholderTextColor={THEME.slate400}
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate300,
                          color: THEME.slate900,
                          padding: 9,
                          fontSize: 13,
                        }}
                      />
                    </View>

                    <View style={{ flex: 1.2, gap: 4 }}>
                      <Text style={{ color: THEME.slate700, fontSize: 11.5, fontWeight: '700' }}>
                        Fecha Radicación:
                      </Text>
                      <TextInput
                        value={formSeg.fecha_radicacion_memorando}
                        onChangeText={(t) => setFormSeg((p) => ({ ...p, fecha_radicacion_memorando: t }))}
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor={THEME.slate400}
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate300,
                          color: THEME.slate900,
                          padding: 9,
                          fontSize: 13,
                        }}
                      />
                    </View>
                  </View>

                  <Text style={{ fontSize: 11, color: THEME.slate500, fontStyle: 'italic' }}>
                    * Término legal del procedimiento: Se debe entregar dentro de los primeros 5 días hábiles del mes.
                  </Text>
                </View>

                {/* Control de Condiciones SST y TIC (Actividad 4.2.3) */}
                <View
                  style={{
                    backgroundColor: formSeg.novedad_cambio_domicilio ? THEME.badges.amber.bg : THEME.white,
                    borderWidth: 1,
                    borderColor: formSeg.novedad_cambio_domicilio ? THEME.badges.amber.border : THEME.slate200,
                    borderRadius: 10,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setFormSeg((p) => ({
                        ...p,
                        novedad_cambio_domicilio: !p.novedad_cambio_domicilio,
                      }))
                    }
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <Ionicons
                      name={formSeg.novedad_cambio_domicilio ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={formSeg.novedad_cambio_domicilio ? THEME.amberText : THEME.slate400}
                    />
                    <Text
                      style={{
                        color: formSeg.novedad_cambio_domicilio ? THEME.amberText : THEME.slate800,
                        fontSize: 12.5,
                        fontWeight: '700',
                      }}
                    >
                      Reportar novedad de cambio de residencia o domicilio (Actividad 4.2.3)
                    </Text>
                  </TouchableOpacity>

                  {formSeg.novedad_cambio_domicilio && (
                    <View style={{ gap: 6, paddingTop: 4 }}>
                      <Text style={{ fontSize: 11.5, color: THEME.amberText, lineHeight: 16 }}>
                        ⚠️ Atención SG-SST y TIC: Al reportar cambio de domicilio se activa la obligación de realizar visita o inspección prioritaria para validar estándares ergonómicos y técnicos con los formatos 2311300-FT-261 y 2311300-FT-400.
                      </Text>
                      <TextInput
                        value={formSeg.observaciones_cambio_domicilio}
                        onChangeText={(t) => setFormSeg((p) => ({ ...p, observaciones_cambio_domicilio: t }))}
                        placeholder="Indica la nueva dirección o detalles del puesto de trabajo para programar la visita..."
                        placeholderTextColor={THEME.slate400}
                        style={{
                          backgroundColor: THEME.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.badges.amber.border,
                          color: THEME.slate900,
                          padding: 8,
                          fontSize: 12,
                        }}
                      />
                    </View>
                  )}
                </View>

                {/* Calificación y Cumplimiento */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>Nivel de Cumplimiento:</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {['SOBRESALIENTE', 'SATISFACTORIO', 'PARCIAL', 'NO_CUMPLE'].map((niv) => {
                        const sel = formSeg.cumplimiento_nivel === niv;
                        return (
                          <TouchableOpacity
                            key={niv}
                            onPress={() => setFormSeg((p) => ({ ...p, cumplimiento_nivel: niv as any }))}
                            style={{
                              backgroundColor: sel ? '#047857' : THEME.slate100,
                              paddingVertical: 6,
                              paddingHorizontal: 8,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: sel ? '#059669' : THEME.slate200,
                            }}
                          >
                            <Text style={{ color: sel ? '#FFFFFF' : THEME.slate700, fontSize: 10.5, fontWeight: '700' }}>
                              {niv}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ width: 110, gap: 4 }}>
                    <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>% Calificación:</Text>
                    <TextInput
                      value={formSeg.calificacion_porcentaje}
                      onChangeText={(t) => setFormSeg((p) => ({ ...p, calificacion_porcentaje: t }))}
                      keyboardType="numeric"
                      placeholder="100"
                      placeholderTextColor={THEME.slate400}
                      style={{
                        backgroundColor: THEME.white,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.slate300,
                        color: THEME.slate900,
                        padding: 10,
                        fontSize: 13,
                      }}
                    />
                  </View>
                </View>

                {/* Actividades y Entregables */}
                <View style={{ gap: 4 }}>
                  <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>Actividades y Entregables Reportados:</Text>
                  <TextInput
                    value={formSeg.actividades_reportadas}
                    onChangeText={(t) => setFormSeg((p) => ({ ...p, actividades_reportadas: t }))}
                    placeholder="Detalle de actividades desarrolladas durante las jornadas de teletrabajo..."
                    placeholderTextColor={THEME.slate400}
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: THEME.slate300,
                      color: THEME.slate900,
                      padding: 10,
                      fontSize: 12.5,
                    }}
                  />
                </View>

                {/* Subir Evidencias */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: THEME.slate700, fontSize: 12, fontWeight: '700' }}>Archivo de Soportes / Evidencias:</Text>
                  {Platform.OS === 'web' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <input
                        type="file"
                        id="upload-seg"
                        style={{ display: 'none' }}
                        onChange={handleSeleccionarArchivoSeguimiento}
                      />
                      <label
                        htmlFor="upload-seg"
                        style={{
                          backgroundColor: THEME.marca50,
                          padding: '8px 14px',
                          borderRadius: '6px',
                          border: `1px solid ${THEME.marca200}`,
                          color: THEME.marca700,
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        📁 {formSeg.nombre_archivo ? 'Cambiar Soportes' : 'Adjuntar Evidencias'}
                      </label>
                      <Text style={{ color: THEME.slate600, fontSize: 12 }}>
                        {formSeg.nombre_archivo || 'Ningún archivo adjunto'}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <Pressable
                    onPress={() => setModalSegVisible(false)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: THEME.slate100,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                    }}
                  >
                    <Text style={{ color: THEME.slate700, fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => guardarSeguimiento()}
                    disabled={guardandoSeg}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: THEME.marca700,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {guardandoSeg ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                          Guardar Seguimiento
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ================================================================= */}
        {/* MODAL INSTITUCIONAL DE NOTIFICACIONES (REGLA: NO ALERTS)         */}
        {/* ================================================================= */}
        <Modal
          visible={notifModal.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setNotifModal((p) => ({ ...p, visible: false }))}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: THEME.white,
                borderRadius: 16,
                borderWidth: 1,
                borderColor:
                  notifModal.tipo === 'error'
                    ? THEME.badges.rose.border
                    : notifModal.tipo === 'success'
                    ? THEME.badges.emerald.border
                    : THEME.marca200,
                padding: 22,
                maxWidth: 460,
                width: '100%',
                gap: 14,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons
                  name={
                    notifModal.tipo === 'error'
                      ? 'close-circle'
                      : notifModal.tipo === 'success'
                      ? 'checkmark-circle'
                      : 'information-circle'
                  }
                  size={26}
                  color={
                    notifModal.tipo === 'error'
                      ? '#BE123C'
                      : notifModal.tipo === 'success'
                      ? '#047857'
                      : THEME.marca700
                  }
                />
                <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '800' }}>
                  {notifModal.titulo}
                </Text>
              </View>

              <Text style={{ color: THEME.slate600, fontSize: 13, lineHeight: 19 }}>
                {notifModal.mensaje}
              </Text>

              <Pressable
                onPress={() => setNotifModal((p) => ({ ...p, visible: false }))}
                style={{
                  alignSelf: 'flex-end',
                  backgroundColor:
                    notifModal.tipo === 'error'
                      ? '#BE123C'
                      : notifModal.tipo === 'success'
                      ? '#047857'
                      : THEME.marca700,
                  paddingHorizontal: 18,
                  paddingVertical: 9,
                  borderRadius: 8,
                  marginTop: 6,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  Aceptar
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ================================================================= */}
        {/* MODAL INFORME TÉCNICO SEMESTRAL AL COMITÉ DE GESTIÓN Y DESEMPEÑO  */}
        {/* Actividad 4.2.5 - Punto de Control Procedimiento 2311300-PR-117    */}
        {/* ================================================================= */}
        <Modal
          visible={modalInformeComiteVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalInformeComiteVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: isDesktop ? 24 : 10,
            }}
          >
            <View
              style={{
                backgroundColor: THEME.white,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: THEME.slate200,
                width: '100%',
                maxWidth: 1100,
                maxHeight: '92%',
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 10,
                flexDirection: 'column',
              }}
            >
              {/* Cabecera del Informe */}
              <View
                style={{
                  backgroundColor: THEME.marca900,
                  paddingHorizontal: 22,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      padding: 10,
                      borderRadius: 10,
                    }}
                  >
                    <Ionicons name="bar-chart" size={22} color={THEME.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ color: THEME.white, fontSize: 16, fontWeight: '800' }}>
                        Informe Técnico Semestral de Seguimiento al Teletrabajo
                      </Text>
                      <View
                        style={{
                          backgroundColor: '#047857',
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: THEME.white, fontSize: 10, fontWeight: '800' }}>
                          PUNTO DE CONTROL 4.2.5
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: 'rgba(214, 228, 244, 0.8)', fontSize: 11.5, marginTop: 2 }}>
                      Comité Institucional de Gestión y Desempeño • Procedimiento 2311300-PR-117 (Versión 06) • Resolución 117 de 2026
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {Platform.OS === 'web' && (
                    <Pressable
                      onPress={() => {
                        if (typeof window !== 'undefined') {
                          window.print();
                        }
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 6,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Ionicons name="print-outline" size={15} color={THEME.white} />
                      <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '600' }}>
                        Imprimir / PDF
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => setModalInformeComiteVisible(false)}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      padding: 6,
                      borderRadius: 6,
                      backgroundColor: pressed ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    })}
                  >
                    <Ionicons name="close" size={24} color={THEME.white} />
                  </Pressable>
                </View>
              </View>

              {/* Contenido desplazable del informe */}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 22, gap: 20 }}>
                {/* Cuadro de Metadatos del Informe */}
                <View
                  style={{
                    backgroundColor: THEME.slate50,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 16,
                    flexDirection: isDesktop ? 'row' : 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: THEME.slate500, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                      ENTIDAD DISTRITAL Y UNIDAD RESPONSABLE
                    </Text>
                    <Text style={{ color: THEME.slate900, fontSize: 13, fontWeight: '700' }}>
                      Secretaría Jurídica Distrital • Dirección de Gestión Corporativa (Talento Humano)
                    </Text>
                    <Text style={{ color: THEME.slate600, fontSize: 12 }}>
                      Formato de Seguimiento Mensual 2311300-FT-018 consolidado semestralmente
                    </Text>
                  </View>

                  <View style={{ gap: 3 }}>
                    <Text style={{ color: THEME.slate500, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                      CORTE DEL INFORME
                    </Text>
                    <View
                      style={{
                        backgroundColor: THEME.marca50,
                        borderColor: THEME.marca200,
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 6,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Text style={{ color: THEME.marca800, fontSize: 12, fontWeight: '800' }}>
                        I/II Semestre • {new Date().getFullYear()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Métricas Consolidadas del Semestre */}
                <View>
                  <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '800', marginBottom: 10 }}>
                    1. Indicadores Globales de Desempeño y Cumplimiento
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {/* Tarjeta 1: Total Evaluaciones */}
                    <View
                      style={{
                        flex: 1,
                        minWidth: 180,
                        backgroundColor: THEME.white,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        padding: 14,
                        gap: 4,
                      }}
                    >
                      <Text style={{ color: THEME.slate500, fontSize: 11, fontWeight: '700' }}>
                        TOTAL REGISTROS
                      </Text>
                      <Text style={{ color: THEME.slate900, fontSize: 24, fontWeight: '900' }}>
                        {seguimientos.length}
                      </Text>
                      <Text style={{ color: THEME.slate500, fontSize: 11 }}>
                        Informes mensuales analizados
                      </Text>
                    </View>

                    {/* Tarjeta 2: Cumplimiento Promedio */}
                    <View
                      style={{
                        flex: 1,
                        minWidth: 180,
                        backgroundColor: '#F0FDF4',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#BBF7D0',
                        padding: 14,
                        gap: 4,
                      }}
                    >
                      <Text style={{ color: '#166534', fontSize: 11, fontWeight: '700' }}>
                        PROMEDIO DE CUMPLIMIENTO
                      </Text>
                      <Text style={{ color: '#166534', fontSize: 24, fontWeight: '900' }}>
                        {promedioCumplimiento}%
                      </Text>
                      <Text style={{ color: '#166534', fontSize: 11 }}>
                        Meta institucional: ≥ 85%
                      </Text>
                    </View>

                    {/* Tarjeta 3: Días Efectivos Certificados */}
                    <View
                      style={{
                        flex: 1,
                        minWidth: 180,
                        backgroundColor: THEME.badges.sky.bg,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: THEME.badges.sky.border,
                        padding: 14,
                        gap: 4,
                      }}
                    >
                      <Text style={{ color: THEME.badges.sky.text, fontSize: 11, fontWeight: '700' }}>
                        DÍAS TELETRABAJADOS
                      </Text>
                      <Text style={{ color: THEME.badges.sky.text, fontSize: 24, fontWeight: '900' }}>
                        {totalDiasTeletrabajados}
                      </Text>
                      <Text style={{ color: THEME.badges.sky.text, fontSize: 11 }}>
                        Soportados con FT-018
                      </Text>
                    </View>

                    {/* Tarjeta 4: Alertas SST y TIC */}
                    <View
                      style={{
                        flex: 1,
                        minWidth: 180,
                        backgroundColor: totalAlertasCambioDomicilio > 0 ? THEME.roseBg : THEME.emeraldBg,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: totalAlertasCambioDomicilio > 0 ? THEME.roseRing : THEME.emeraldRing,
                        padding: 14,
                        gap: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: totalAlertasCambioDomicilio > 0 ? THEME.roseText : THEME.emeraldText,
                          fontSize: 11,
                          fontWeight: '700',
                        }}
                      >
                        CONDICIONES SST / TIC
                      </Text>
                      <Text
                        style={{
                          color: totalAlertasCambioDomicilio > 0 ? THEME.roseText : THEME.emeraldText,
                          fontSize: 24,
                          fontWeight: '900',
                        }}
                      >
                        {totalAlertasCambioDomicilio > 0 ? `${totalAlertasCambioDomicilio} Pendientes` : '100% Al Día'}
                      </Text>
                      <Text
                        style={{
                          color: totalAlertasCambioDomicilio > 0 ? THEME.roseText : THEME.emeraldText,
                          fontSize: 11,
                        }}
                      >
                        {totalAlertasCambioDomicilio > 0
                          ? 'Visitas requeridas por cambio domicilio'
                          : 'Condiciones técnicas validadas'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Distribución de Evaluaciones */}
                <View
                  style={{
                    backgroundColor: THEME.slate50,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 16,
                    gap: 12,
                  }}
                >
                  <Text style={{ color: THEME.slate900, fontSize: 13, fontWeight: '800' }}>
                    2. Desglose Institucional de Calificación del Desempeño
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    <View
                      style={{
                        flex: 1,
                        minWidth: 140,
                        backgroundColor: THEME.emeraldBg,
                        borderColor: THEME.emeraldRing,
                        borderWidth: 1,
                        padding: 10,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: THEME.emeraldText, fontSize: 11, fontWeight: '700' }}>
                        SOBRESALIENTE (≥ 90%)
                      </Text>
                      <Text style={{ color: THEME.emeraldText, fontSize: 20, fontWeight: '900', marginTop: 2 }}>
                        {seguimientos.filter((s) => s.cumplimiento_nivel === 'SOBRESALIENTE').length}
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                        minWidth: 140,
                        backgroundColor: THEME.skyBg,
                        borderColor: THEME.skyRing,
                        borderWidth: 1,
                        padding: 10,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: THEME.skyText, fontSize: 11, fontWeight: '700' }}>
                        SATISFACTORIO (75% - 89%)
                      </Text>
                      <Text style={{ color: THEME.skyText, fontSize: 20, fontWeight: '900', marginTop: 2 }}>
                        {seguimientos.filter((s) => s.cumplimiento_nivel === 'SATISFACTORIO').length}
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                        minWidth: 140,
                        backgroundColor: THEME.amberBg,
                        borderColor: THEME.amberRing,
                        borderWidth: 1,
                        padding: 10,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: THEME.amberText, fontSize: 11, fontWeight: '700' }}>
                        PARCIAL (60% - 74%)
                      </Text>
                      <Text style={{ color: THEME.amberText, fontSize: 20, fontWeight: '900', marginTop: 2 }}>
                        {seguimientos.filter((s) => s.cumplimiento_nivel === 'PARCIAL').length}
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                        minWidth: 140,
                        backgroundColor: THEME.roseBg,
                        borderColor: THEME.roseRing,
                        borderWidth: 1,
                        padding: 10,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: THEME.roseText, fontSize: 11, fontWeight: '700' }}>
                        NO CUMPLE (&lt; 60%)
                      </Text>
                      <Text style={{ color: THEME.roseText, fontSize: 20, fontWeight: '900', marginTop: 2 }}>
                        {seguimientos.filter((s) => s.cumplimiento_nivel === 'NO_CUMPLE').length}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tabla Consolidada para el Comité */}
                <View>
                  <Text style={{ color: THEME.slate900, fontSize: 14, fontWeight: '800', marginBottom: 10 }}>
                    3. Detalle Individual por Servidor Público y Conceptos de Jefatura
                  </Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View style={{ minWidth: 900 }}>
                        {/* Cabecera tabla */}
                        <View
                          style={{
                            flexDirection: 'row',
                            backgroundColor: THEME.slate100,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: THEME.slate200,
                          }}
                        >
                          <Text style={{ width: 220, fontSize: 11, fontWeight: '700', color: THEME.slate700 }}>
                            SERVIDOR PÚBLICO
                          </Text>
                          <Text style={{ width: 140, fontSize: 11, fontWeight: '700', color: THEME.slate700 }}>
                            CORTE EVALUADO
                          </Text>
                          <Text style={{ width: 110, fontSize: 11, fontWeight: '700', color: THEME.slate700 }}>
                            DÍAS CERT.
                          </Text>
                          <Text style={{ width: 150, fontSize: 11, fontWeight: '700', color: THEME.slate700 }}>
                            CUMPLIMIENTO
                          </Text>
                          <Text style={{ width: 140, fontSize: 11, fontWeight: '700', color: THEME.slate700 }}>
                            CONCEPTO JEFE
                          </Text>
                          <Text style={{ width: 140, fontSize: 11, fontWeight: '700', color: THEME.slate700 }}>
                            CONDICIÓN SST/TIC
                          </Text>
                        </View>

                        {/* Filas */}
                        {seguimientos.slice(0, 30).map((s, idx) => (
                          <View
                            key={s.id || idx}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 9,
                              paddingHorizontal: 12,
                              backgroundColor: idx % 2 === 0 ? THEME.white : '#F8FAFC',
                              borderBottomWidth: 1,
                              borderBottomColor: THEME.slate100,
                            }}
                          >
                            <View style={{ width: 220 }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.slate800 }} numberOfLines={1}>
                                {s.servidor_nombre}
                              </Text>
                              <Text style={{ fontSize: 10.5, color: THEME.slate500 }}>
                                C.C. {s.servidor_cedula}
                              </Text>
                            </View>

                            <View style={{ width: 140 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate700 }}>
                                {limpiarFecha(s.fecha_corte_desde)} al {limpiarFecha(s.fecha_corte_hasta)}
                              </Text>
                            </View>

                            <View style={{ width: 110 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.slate800 }}>
                                {s.dias_efectivos_teletrabajo || 0} días
                              </Text>
                              {s.radicado_memorando_ft018 ? (
                                <Text style={{ fontSize: 9.5, color: THEME.slate400 }} numberOfLines={1}>
                                  {s.radicado_memorando_ft018}
                                </Text>
                              ) : null}
                            </View>

                            <View style={{ width: 150 }}>
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '700',
                                  color:
                                    s.cumplimiento_nivel === 'SOBRESALIENTE'
                                      ? '#166534'
                                      : s.cumplimiento_nivel === 'SATISFACTORIO'
                                      ? '#0369A1'
                                      : s.cumplimiento_nivel === 'PARCIAL'
                                      ? '#B45309'
                                      : '#BE123C',
                                }}
                              >
                                {s.cumplimiento_nivel} ({s.calificacion_porcentaje}%)
                              </Text>
                            </View>

                            <View style={{ width: 140 }}>
                              <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate700 }}>
                                {s.concepto_recomendacion === 'CONTINUAR'
                                  ? '✓ Continuar'
                                  : s.concepto_recomendacion === 'AJUSTAR_DIAS'
                                  ? '⚠️ Ajustar Días'
                                  : 'Reversibilidad'}
                              </Text>
                            </View>

                            <View style={{ width: 140 }}>
                              {s.novedad_cambio_domicilio ? (
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#BE123C' }}>
                                  ⚠️ Visita Prioritaria
                                </Text>
                              ) : (
                                <Text style={{ fontSize: 10.5, color: '#166534' }}>
                                  ✓ Condición OK
                                </Text>
                              )}
                            </View>
                          </View>
                        ))}

                        {seguimientos.length === 0 && (
                          <View style={{ padding: 24, alignItems: 'center' }}>
                            <Text style={{ color: THEME.slate400, fontSize: 12 }}>
                              No hay seguimientos registrados para consolidar en el informe.
                            </Text>
                          </View>
                        )}
                      </View>
                    </ScrollView>
                  </View>
                </View>

                {/* Recomendaciones Institucionales del Punto de Control */}
                <View
                  style={{
                    backgroundColor: THEME.marca50,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: THEME.marca100,
                    padding: 16,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: THEME.marca900, fontSize: 13, fontWeight: '800' }}>
                    4. Recomendaciones y Conclusiones del Punto de Control (Actividad 4.2.5)
                  </Text>
                  <Text style={{ color: THEME.marca800, fontSize: 12, lineHeight: 18 }}>
                    • <Text style={{ fontWeight: '700' }}>Permanencia y Prestación del Servicio:</Text> Se evidencia cumplimiento de las jornadas bajo la modalidad suplementaria, garantizando la presencialidad requerida por la Secretaría Jurídica Distrital.
                  </Text>
                  <Text style={{ color: THEME.marca800, fontSize: 12, lineHeight: 18 }}>
                    • <Text style={{ fontWeight: '700' }}>Condiciones SST y TIC:</Text> Para los servidores que notificaron cambio de domicilio ({totalAlertasCambioDomicilio} caso(s)), se remite orden de visita prioritaria a los equipos de SG-SST (Formato 2311300-FT-261) y TIC (Formato 2311300-FT-400) para asegurar la ergonomía y seguridad informática.
                  </Text>
                  <Text style={{ color: THEME.marca800, fontSize: 12, lineHeight: 18 }}>
                    • <Text style={{ fontWeight: '700' }}>Trámites de Reversibilidad:</Text> En caso de calificaciones parciales o insatisfactorias reiteradas, se dará aplicación a la Actividad 4.2.6 del Procedimiento PR-117 para retorno total a la modalidad presencial.
                  </Text>
                </View>
              </ScrollView>

              {/* Pie del Modal */}
              <View
                style={{
                  paddingHorizontal: 22,
                  paddingVertical: 14,
                  backgroundColor: THEME.slate50,
                  borderTopWidth: 1,
                  borderTopColor: THEME.slate200,
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Pressable
                  onPress={() => setModalInformeComiteVisible(false)}
                  style={{
                    backgroundColor: THEME.marca700,
                    paddingHorizontal: 18,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: THEME.white, fontSize: 13, fontWeight: '700' }}>
                    Cerrar Informe
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ================================================================= */}
        {/* MODAL VENTANA DE TERMINAL WEB (npm run seed:teletrabajo)           */}
        {/* ================================================================= */}
        <Modal
          visible={modalTerminalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalTerminalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(11, 15, 25, 0.82)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: isDesktop ? 24 : 10,
            }}
          >
            <View
              style={{
                backgroundColor: '#0B0F19',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#1E293B',
                width: '100%',
                maxWidth: 980,
                height: isDesktop ? 680 : '92%',
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOpacity: 0.5,
                shadowRadius: 25,
                elevation: 15,
                flexDirection: 'column',
              }}
            >
              {/* Cabecera de la Terminal (Estilo Consola macOS / Unix) */}
              <View
                style={{
                  backgroundColor: '#0F172A',
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottomWidth: 1,
                  borderBottomColor: '#1E293B',
                }}
              >
                {/* Controles de Ventana (Rojo, Amarillo, Verde) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Pressable
                      onPress={() => setModalTerminalVisible(false)}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: '#EF4444',
                      }}
                      accessibilityLabel="Cerrar terminal"
                    />
                    <Pressable
                      onPress={limpiarConsola}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: '#F59E0B',
                      }}
                      accessibilityLabel="Limpiar consola"
                    />
                    <Pressable
                      onPress={() => ejecutarComandoTerminal()}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: '#10B981',
                      }}
                      accessibilityLabel="Ejecutar"
                    />
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="terminal" size={15} color="#38BDF8" />
                    <Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: '700', fontFamily: 'monospace' }}>
                      bash • sjd-server:~/backend
                    </Text>
                  </View>
                </View>

                {/* Badge de Estado del Servidor */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                      borderWidth: 1,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                    <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' }}>
                      ONLINE
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setModalTerminalVisible(false)}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      padding: 4,
                      borderRadius: 6,
                      backgroundColor: pressed ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    })}
                  >
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </Pressable>
                </View>
              </View>

              {/* Barra de Control de Comandos */}
              <View
                style={{
                  backgroundColor: '#090D16',
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#1E293B',
                  flexDirection: isDesktop ? 'row' : 'column',
                  alignItems: isDesktop ? 'center' : 'stretch',
                  gap: 10,
                }}
              >
                {/* Selector / Input de Comando */}
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#030712',
                    borderWidth: 1,
                    borderColor: '#334155',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    height: 40,
                  }}
                >
                  <Text style={{ color: '#38BDF8', fontFamily: 'monospace', fontWeight: '800', marginRight: 6 }}>
                    $
                  </Text>
                  <TextInput
                    value={terminalComando}
                    onChangeText={setTerminalComando}
                    placeholder="npm run seed:teletrabajo"
                    placeholderTextColor="#475569"
                    editable={!terminalEjecutando}
                    style={{
                      flex: 1,
                      color: '#F8FAFC',
                      fontFamily: 'monospace',
                      fontSize: 13,
                      outlineStyle: 'none' as never,
                    }}
                  />
                  {terminalComando.length > 0 && !terminalEjecutando && (
                    <Pressable onPress={() => setTerminalComando('')}>
                      <Ionicons name="close-circle" size={15} color="#64748B" />
                    </Pressable>
                  )}
                </View>

                {/* Botones de Acción */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={() => ejecutarComandoTerminal()}
                    disabled={terminalEjecutando}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: terminalEjecutando ? '#075985' : '#0284C7',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 8,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    {terminalEjecutando ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="play" size={15} color="#FFFFFF" />
                    )}
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                      {terminalEjecutando ? 'Ejecutando...' : 'Ejecutar'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={limpiarConsola}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#1E293B',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Ionicons name="trash-outline" size={15} color="#94A3B8" />
                    <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '600' }}>
                      Limpiar
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Presets Rápidos de Comandos */}
              <View
                style={{
                  backgroundColor: '#0F172A',
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#1E293B',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                  Comandos directos:
                </Text>

                <Pressable
                  onPress={() => {
                    setTerminalComando('npm run seed:teletrabajo');
                    ejecutarComandoTerminal('npm run seed:teletrabajo');
                  }}
                  disabled={terminalEjecutando}
                  style={({ pressed }) => ({
                    backgroundColor: '#1E293B',
                    borderColor: '#38BDF8',
                    borderWidth: 1,
                    paddingHorizontal: 10,
                    paddingVertical: 3.5,
                    borderRadius: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: '#38BDF8', fontSize: 11.5, fontFamily: 'monospace', fontWeight: '700' }}>
                    npm run seed:teletrabajo
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setTerminalComando('node migracion_resoluciones_409_366.js');
                    ejecutarComandoTerminal('node migracion_resoluciones_409_366.js');
                  }}
                  disabled={terminalEjecutando}
                  style={({ pressed }) => ({
                    backgroundColor: '#1E293B',
                    borderColor: '#475569',
                    borderWidth: 1,
                    paddingHorizontal: 10,
                    paddingVertical: 3.5,
                    borderRadius: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: '#94A3B8', fontSize: 11.5, fontFamily: 'monospace' }}>
                    node migracion_resoluciones_409_366.js
                  </Text>
                </Pressable>
              </View>

              {/* Pantalla de Terminal / Consola de Salida */}
              <ScrollView
                style={{ flex: 1, backgroundColor: '#030712' }}
                contentContainerStyle={{ padding: 18, gap: 8 }}
              >
                {terminalLogs.map((log, index) => {
                  const esCmd = log.tipo === 'cmd';
                  const esInfo = log.tipo === 'info';
                  const esSuccess = log.tipo === 'success';
                  const esError = log.tipo === 'error';
                  const esStderr = log.tipo === 'stderr';

                  return (
                    <View key={index} style={{ gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: '#475569', fontSize: 10.5, fontFamily: 'monospace' }}>
                          [{log.timestamp}]
                        </Text>
                        {esCmd && (
                          <Text style={{ color: '#F472B6', fontSize: 11, fontFamily: 'monospace', fontWeight: '800' }}>
                            INPUT
                          </Text>
                        )}
                        {esSuccess && (
                          <Text style={{ color: '#34D399', fontSize: 11, fontFamily: 'monospace', fontWeight: '800' }}>
                            SUCCESS
                          </Text>
                        )}
                        {(esError || esStderr) && (
                          <Text style={{ color: '#F87171', fontSize: 11, fontFamily: 'monospace', fontWeight: '800' }}>
                            ERROR
                          </Text>
                        )}
                      </View>

                      <Text
                        style={{
                          color: esCmd
                            ? '#38BDF8'
                            : esSuccess
                            ? '#34D399'
                            : esError || esStderr
                            ? '#FCA5A5'
                            : esInfo
                            ? '#94A3B8'
                            : '#E2E8F0',
                          fontFamily: 'monospace',
                          fontSize: 12.5,
                          lineHeight: 18,
                        }}
                      >
                        {log.texto}
                      </Text>
                    </View>
                  );
                })}

                {terminalEjecutando && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <ActivityIndicator size="small" color="#38BDF8" />
                    <Text style={{ color: '#38BDF8', fontFamily: 'monospace', fontSize: 12 }}>
                      Procesando en el servidor PostgreSQL...
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Pie de Terminal con Notas y Ayuda */}
              <View
                style={{
                  backgroundColor: '#0F172A',
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#1E293B',
                  flexDirection: isDesktop ? 'row' : 'column',
                  justifyContent: 'space-between',
                  alignItems: isDesktop ? 'center' : 'flex-start',
                  gap: 10,
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 11.5 }}>
                    💡 <Text style={{ color: '#F1F5F9', fontWeight: '700' }}>npm run seed:teletrabajo:</Text> Actualiza las Resoluciones 117, 201, 366 y 409 de 2026, y siembra los 84 servidores de Trabajo en Casa y 31 de Teletrabajo Híbrido.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {Platform.OS === 'web' && (
                    <Pressable
                      onPress={() => {
                        const todoTexto = terminalLogs.map((l) => `[${l.timestamp}] ${l.texto}`).join('\n');
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(todoTexto);
                          mostrarMensaje('Copiado', 'Salida de terminal copiada al portapapeles.', 'success');
                        }
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#1E293B',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 6,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Ionicons name="copy-outline" size={14} color="#CBD5E1" />
                      <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '600' }}>
                        Copiar Log
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => setModalTerminalVisible(false)}
                    style={({ pressed }) => ({
                      backgroundColor: '#334155',
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 6,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                      Cerrar
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* ================================================================= */}
        {/* MODAL VISOR DE LA RESOLUCIÓN 117 DE 2026 Y PROCEDIMIENTO PR-117    */}
        {/* ================================================================= */}
        <Modal
          visible={modalPdfVisorVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalPdfVisorVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: isDesktop ? 24 : 12,
            }}
          >
            <View
              style={{
                backgroundColor: THEME.white,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: THEME.slate200,
                width: '100%',
                maxWidth: 1240,
                height: '92%',
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {/* Cabecera del Visor */}
              <View
                style={{
                  backgroundColor: THEME.marca900,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      padding: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Ionicons name="document-text" size={20} color={THEME.white} />
                  </View>
                  <View>
                    <Text style={{ color: THEME.white, fontSize: 15, fontWeight: '800' }}>
                      Resolución No. 117 de 2026 • Procedimiento 2311300-PR-117 (Versión 06)
                    </Text>
                    <Text style={{ color: 'rgba(214, 228, 244, 0.7)', fontSize: 11.5, marginTop: 1 }}>
                      Secretaría Jurídica Distrital • Política Interna de Teletrabajo (Publicación Oficial)
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.open(urlPdfPolitica117, '_blank');
                      }
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 6,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Ionicons name="open-outline" size={15} color={THEME.white} />
                    <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '600' }}>
                      Abrir en pestaña
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setModalPdfVisorVisible(false)}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      padding: 6,
                      borderRadius: 6,
                      backgroundColor: pressed ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    })}
                  >
                    <Ionicons name="close" size={24} color={THEME.white} />
                  </Pressable>
                </View>
              </View>

              {/* Contenido / Iframe en Web */}
              <View style={{ flex: 1, backgroundColor: THEME.slate100 }}>
                {Platform.OS === 'web' ? (
                  <iframe
                    src={urlPdfPolitica117}
                    title="Resolución 117 de 2026 y Procedimiento PR-117"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                  />
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 }}>
                    <Ionicons name="document-attach" size={48} color={THEME.slate400} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate800, textAlign: 'center' }}>
                      Documento PDF de la Política y Procedimiento
                    </Text>
                    <Pressable
                      onPress={() => {
                        if (Platform.OS === 'web') {
                          window.open(urlPdfPolitica117, '_blank');
                        }
                      }}
                      style={{
                        backgroundColor: THEME.marca800,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: THEME.white, fontWeight: '700', fontSize: 13 }}>
                        Ver en el navegador
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
