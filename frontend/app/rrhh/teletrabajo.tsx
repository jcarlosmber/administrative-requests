import React, { useEffect, useState } from 'react';
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

const COLORS = {
  primary: '#BE1F2D', // Rojo BOGOTÁ
  primaryHover: '#9B1623',
  darkBg: '#0B1724',
  cardBg: '#13283B',
  cardBgLight: '#1B354C',
  border: 'rgba(255, 255, 255, 0.12)',
  textWhite: '#FFFFFF',
  textLight: '#F8FAFC',
  textMuted: '#94A3B8',
  blueAccent: '#0284C7',
  cyanBadge: '#38BDF8',
  greenSuccess: '#10B981',
  amberWarning: '#F59E0B',
  purpleAccent: '#8B5CF6',
  inputBg: '#091522',
};

const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

export default function TeletrabajoScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  // Pestañas principales
  const [tabActiva, setTabActiva] = useState<
    'censo' | 'resoluciones' | 'cargos' | 'acuerdos' | 'seguimientos'
  >('censo');

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
    modalidad: 'TELETRABAJO' | 'TRABAJO_EN_CASA';
    submodalidad: string;
    resolucion_id: string;
    fecha_inicio: string;
    fecha_fin: string;
    fechas_editadas_manualmente: boolean;
    cargo_es_teletrabajable: boolean;
    excepcion_jefe_aprobada: boolean;
    motivo_excepcion_jefe: string;
    esquema_dias_tipo: 'DIAS_FIJOS' | 'DIAS_PARES' | 'DIAS_IMPARES' | 'CANTIDAD_LIBRE';
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
    const fechaIni = persona.asignacion_desde || resVigente?.fecha_inicio_vigencia || new Date().toISOString().split('T')[0];
    const fechaFin = persona.asignacion_hasta || resVigente?.fecha_fin_vigencia || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    setFormAsignacion({
      persona,
      modalidad: persona.modalidad || 'TELETRABAJO',
      submodalidad: persona.submodalidad || 'SUPLEMENTARIO',
      resolucion_id: persona.resolucion_id || resVigente?.id || '',
      fecha_inicio: fechaIni,
      fecha_fin: fechaFin,
      fechas_editadas_manualmente: !!persona.asignacion_id,
      cargo_es_teletrabajable: persona.cargo_es_teletrabajable !== undefined ? persona.cargo_es_teletrabajable : true,
      excepcion_jefe_aprobada: persona.excepcion_jefe_aprobada || false,
      motivo_excepcion_jefe: persona.motivo_excepcion_jefe || '',
      esquema_dias_tipo: persona.esquema_dias_tipo || 'DIAS_FIJOS',
      dias_por_semana: persona.dias_por_semana || 2,
      dias_semana_fijos: Array.isArray(persona.dias_semana_fijos) && persona.dias_semana_fijos.length > 0
        ? persona.dias_semana_fijos
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
      // Si el usuario no ha editado manualmente las fechas, hereda automáticamente las de la resolución
      fecha_inicio: !prev.fechas_editadas_manualmente && resSel ? resSel.fecha_inicio_vigencia : prev.fecha_inicio,
      fecha_fin: !prev.fechas_editadas_manualmente && resSel ? resSel.fecha_fin_vigencia : prev.fecha_fin,
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
      };
    });
  };

  const guardarAsignacion = async () => {
    if (!formAsignacion.persona) return;
    if (!formAsignacion.fecha_inicio || !formAsignacion.fecha_fin) {
      mostrarMensaje('Fechas Incompletas', 'Debes definir la fecha de inicio y de fin de la autorización.', 'error');
      return;
    }

    if (
      formAsignacion.modalidad === 'TELETRABAJO' &&
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
        submodalidad: formAsignacion.submodalidad,
        resolucion_id: formAsignacion.resolucion_id || null,
        fecha_inicio: formAsignacion.fecha_inicio,
        fecha_fin: formAsignacion.fecha_fin,
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
      mostrarMensaje(
        'Modalidad Registrada',
        `Se ha configurado exitosamente la modalidad de ${formAsignacion.modalidad === 'TELETRABAJO' ? 'Teletrabajo' : 'Trabajo en Casa'} para ${formAsignacion.persona.titular_nombre}.`,
        'success'
      );
    } catch (err: any) {
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar la asignación.', 'error');
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  // =========================================================================
  // MODAL 2: NUEVA RESOLUCIÓN GENERAL
  // =========================================================================
  const [modalResVisible, setModalResVisible] = useState(false);
  const [guardandoRes, setGuardandoRes] = useState(false);
  const [formRes, setFormRes] = useState<{
    numero_resolucion: string;
    anio: string;
    fecha_expedicion: string;
    fecha_inicio_vigencia: string;
    fecha_fin_vigencia: string;
    descripcion: string;
    modalidad_principal: 'TELETRABAJO' | 'TRABAJO_EN_CASA' | 'MIXTA';
    archivo_base64: string;
    nombre_archivo: string;
  }>({
    numero_resolucion: '',
    anio: new Date().getFullYear().toString(),
    fecha_expedicion: new Date().toISOString().split('T')[0],
    fecha_inicio_vigencia: new Date().toISOString().split('T')[0],
    fecha_fin_vigencia: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    descripcion: '',
    modalidad_principal: 'TELETRABAJO',
    archivo_base64: '',
    nombre_archivo: '',
  });

  const abrirModalNuevaRes = () => {
    setFormRes({
      numero_resolucion: 'Resolución No. ',
      anio: new Date().getFullYear().toString(),
      fecha_expedicion: new Date().toISOString().split('T')[0],
      fecha_inicio_vigencia: new Date().toISOString().split('T')[0],
      fecha_fin_vigencia: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      descripcion: 'Por la cual se confiere la modalidad de teletrabajo a servidores públicos de la Secretaría Jurídica Distrital.',
      modalidad_principal: 'TELETRABAJO',
      archivo_base64: '',
      nombre_archivo: '',
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
    try {
      setGuardandoRes(true);
      await teletrabajoService.guardarResolucion({
        numero_resolucion: formRes.numero_resolucion.trim(),
        anio: parseInt(formRes.anio, 10) || new Date().getFullYear(),
        fecha_expedicion: formRes.fecha_expedicion,
        fecha_inicio_vigencia: formRes.fecha_inicio_vigencia,
        fecha_fin_vigencia: formRes.fecha_fin_vigencia,
        descripcion: formRes.descripcion,
        modalidad_principal: formRes.modalidad_principal,
        archivo_base64: formRes.archivo_base64 || undefined,
        nombre_archivo: formRes.nombre_archivo || undefined,
      });
      setModalResVisible(false);
      await cargarTodo();
      mostrarMensaje('Resolución Registrada', 'El acto administrativo ha sido cargado con éxito en el catálogo general.', 'success');
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
  });

  const abrirModalSeguimiento = (persona: PersonaPlanta) => {
    // Calcular por defecto el mes anterior o rango del último corte
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().split('T')[0];
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 0).toISOString().split('T')[0];

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
      });
      setModalSegVisible(false);
      await cargarTodo();
      mostrarMensaje('Seguimiento Consignado', `El corte de seguimiento (${formSeg.fecha_corte_desde} al ${formSeg.fecha_corte_hasta}) fue registrado satisfactoriamente.`, 'success');
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

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.darkBg }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* ================================================================= */}
        {/* CABECERA INSTITUCIONAL */}
        {/* ================================================================= */}
        <View
          style={{
            backgroundColor: '#0F2133',
            paddingTop: Platform.OS === 'ios' ? 16 : 14,
            paddingBottom: 16,
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
                backgroundColor: pressed ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              })}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                Módulos RRHH
              </Text>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: 'rgba(56, 189, 248, 0.16)',
                  borderWidth: 1,
                  borderColor: 'rgba(56, 189, 248, 0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="laptop-outline" size={24} color="#38BDF8" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '900' }}>
                    Gestión de Teletrabajo y Trabajo en Casa
                  </Text>
                  <View
                    style={{
                      backgroundColor: 'rgba(56, 189, 248, 0.2)',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: 'rgba(56, 189, 248, 0.4)',
                    }}
                  >
                    <Text style={{ color: '#38BDF8', fontSize: 10.5, fontWeight: '800' }}>
                      SASGE 2.0
                    </Text>
                  </View>
                </View>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                  Talento Humano • Secretaría Jurídica Distrital • Planta Oficial ({personas.length} servidores)
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => abrirModalNuevaRes()}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: pressed ? COLORS.primaryHover : COLORS.primary,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 8,
              })}
            >
              <Ionicons name="document-attach-outline" size={17} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Nueva Resolución
              </Text>
            </Pressable>

            <Pressable
              onPress={() => cargarTodo()}
              style={({ pressed }) => ({
                backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                padding: 9,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              })}
              accessibilityLabel="Refrescar datos"
            >
              <Ionicons name="refresh-outline" size={18} color="#CBD5E1" />
            </Pressable>
          </View>
        </View>

        {/* ================================================================= */}
        {/* BANNER DE MÉTRICAS RÁPIDAS */}
        {/* ================================================================= */}
        <View
          style={{
            backgroundColor: '#0A1521',
            paddingVertical: 12,
            paddingHorizontal: isDesktop ? 36 : 18,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.08)',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="people" size={16} color="#94A3B8" />
              <Text style={{ color: '#94A3B8', fontSize: 12 }}>Planta Total:</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {estadisticas?.total_personal_planta || personas.length}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="laptop" size={16} color="#38BDF8" />
              <Text style={{ color: '#38BDF8', fontSize: 12 }}>Teletrabajo Activo:</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {estadisticas?.activas?.en_teletrabajo || 0}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="home" size={16} color="#A78BFA" />
              <Text style={{ color: '#A78BFA', fontSize: 12 }}>Trabajo en Casa:</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {estadisticas?.activas?.en_trabajo_en_casa || 0}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar" size={16} color="#FBBF24" />
              <Text style={{ color: '#FBBF24', fontSize: 12 }}>Pares / Impares:</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {estadisticas?.activas?.dias_pares || 0} / {estadisticas?.activas?.dias_impares || 0}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="shield-half" size={16} color="#F87171" />
              <Text style={{ color: '#F87171', fontSize: 12 }}>Excepción Jefe:</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {estadisticas?.activas?.con_excepcion_jefe || 0}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="newspaper-outline" size={15} color="#10B981" />
            <Text style={{ color: '#A7F3D0', fontSize: 12, fontWeight: '600' }}>
              Resoluciones Vigentes: {resoluciones.filter((r) => r.estado === 'VIGENTE').length}
            </Text>
          </View>
        </View>

        {/* ================================================================= */}
        {/* BARRA DE PESTAÑAS */}
        {/* ================================================================= */}
        <View
          style={{
            backgroundColor: '#0F2133',
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            paddingHorizontal: isDesktop ? 36 : 18,
            flexDirection: 'row',
            gap: 10,
            overflow: 'hidden',
          }}
        >
          {[
            { id: 'censo', label: 'Censo y Asignaciones', icon: 'people-outline' },
            { id: 'resoluciones', label: 'Resoluciones Oficiales', icon: 'document-text-outline' },
            { id: 'cargos', label: 'Cargos Teletrabajables', icon: 'briefcase-outline' },
            { id: 'acuerdos', label: 'Acuerdos de Compromiso', icon: 'ribbon-outline' },
            { id: 'seguimientos', label: 'Seguimientos por Fechas', icon: 'calendar-outline' },
          ].map((tab) => {
            const isSel = tabActiva === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setTabActiva(tab.id as any)}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderBottomWidth: 3,
                  borderBottomColor: isSel ? '#38BDF8' : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={isSel ? '#38BDF8' : '#94A3B8'}
                />
                <Text
                  style={{
                    color: isSel ? '#FFFFFF' : '#94A3B8',
                    fontSize: 13,
                    fontWeight: isSel ? '800' : '600',
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
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
                    backgroundColor: COLORS.cardBg,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 16,
                    flexDirection: isDesktop ? 'row' : 'column',
                    gap: 12,
                    alignItems: isDesktop ? 'center' : 'stretch',
                  }}
                >
                  <View
                    style={{
                      flex: 2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: COLORS.inputBg,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      paddingHorizontal: 12,
                      height: 42,
                    }}
                  >
                    <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      value={busqueda}
                      onChangeText={setBusqueda}
                      placeholder="Buscar por cédula, nombre, cargo o dependencia..."
                      placeholderTextColor="#64748B"
                      style={{ flex: 1, color: '#FFFFFF', fontSize: 13, outlineStyle: 'none' as never }}
                    />
                    {busqueda.length > 0 && (
                      <Pressable onPress={() => setBusqueda('')}>
                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                      </Pressable>
                    )}
                  </View>

                  {/* Filtro por Modalidad */}
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { id: 'TODOS', label: 'Todos' },
                      { id: 'TELETRABAJO', label: 'Teletrabajo' },
                      { id: 'TRABAJO_EN_CASA', label: 'Trabajo en Casa' },
                      { id: 'SIN_MODALIDAD', label: 'Presencial' },
                      { id: 'NUEVO_ACUERDO', label: '⚠️ Requiere Acuerdo' },
                    ].map((f) => (
                      <Pressable
                        key={f.id}
                        onPress={() => setFiltroModalidad(f.id)}
                        style={{
                          backgroundColor:
                            filtroModalidad === f.id ? '#0284C7' : 'rgba(255, 255, 255, 0.06)',
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor:
                            filtroModalidad === f.id ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Text
                          style={{
                            color: filtroModalidad === f.id ? '#FFFFFF' : '#CBD5E1',
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {f.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Listado de Servidores */}
                <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '700' }}>
                  Mostrando {personasFiltradas.length} servidores de planta
                </Text>

                <View style={{ gap: 12 }}>
                  {personasFiltradas.map((p) => {
                    const tieneModalidad = p.modalidad && p.asignacion_estado === 'ACTIVO';
                    const esTeletrabajo = p.modalidad === 'TELETRABAJO';
                    return (
                      <View
                        key={p.id_plaza}
                        style={{
                          backgroundColor: COLORS.cardBg,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: tieneModalidad
                            ? esTeletrabajo
                              ? 'rgba(56, 189, 248, 0.35)'
                              : 'rgba(167, 139, 250, 0.35)'
                            : COLORS.border,
                          padding: 18,
                          flexDirection: isDesktop ? 'row' : 'column',
                          justifyContent: 'space-between',
                          alignItems: isDesktop ? 'center' : 'stretch',
                          gap: 16,
                        }}
                      >
                        <View style={{ flex: 1, gap: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                              {p.titular_nombre}
                            </Text>
                            <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600' }}>
                              C.C. {p.titular_cedula}
                            </Text>

                            {/* Badge Modalidad */}
                            {tieneModalidad ? (
                              <View
                                style={{
                                  backgroundColor: esTeletrabajo
                                    ? 'rgba(56, 189, 248, 0.2)'
                                    : 'rgba(167, 139, 250, 0.2)',
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: esTeletrabajo ? '#38BDF8' : '#A78BFA',
                                }}
                              >
                                <Text
                                  style={{
                                    color: esTeletrabajo ? '#38BDF8' : '#C4B5FD',
                                    fontSize: 11,
                                    fontWeight: '800',
                                  }}
                                >
                                  {esTeletrabajo ? 'TELETRABAJO' : 'TRABAJO EN CASA'}
                                </Text>
                              </View>
                            ) : (
                              <View
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700' }}>
                                  PRESENCIAL
                                </Text>
                              </View>
                            )}

                            {/* Alerta de acuerdo por cambio de cargo */}
                            {p.requiere_nuevo_acuerdo && (
                              <View
                                style={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: COLORS.amberWarning,
                                }}
                              >
                                <Text style={{ color: '#FCD34D', fontSize: 10.5, fontWeight: '800' }}>
                                  ⚠️ Requiere Nuevo Acuerdo
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Cargo y Dependencia */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Ionicons name="briefcase" size={14} color="#CBD5E1" />
                            <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '700' }}>
                              {p.cargo} {p.codigo ? `(${p.codigo}-${p.grado})` : ''}
                            </Text>
                            <Text style={{ color: '#64748B' }}>•</Text>
                            <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                              {p.dependencia_cargo}
                            </Text>

                            {/* Indicador de cargo teletrabajable */}
                            {!p.cargo_es_teletrabajable && (
                              <View
                                style={{
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                }}
                              >
                                <Text style={{ color: '#FCA5A5', fontSize: 10, fontWeight: '700' }}>
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
                                paddingTop: 6,
                                borderTopWidth: 1,
                                borderTopColor: 'rgba(255, 255, 255, 0.05)',
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Ionicons name="calendar-outline" size={14} color="#38BDF8" />
                                <Text style={{ color: '#CBD5E1', fontSize: 12 }}>
                                  Esquema:{' '}
                                  <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>
                                    {p.esquema_dias_tipo === 'DIAS_PARES'
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
                                <Ionicons name="time-outline" size={14} color="#94A3B8" />
                                <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                                  Vigencia:{' '}
                                  <Text style={{ color: '#CBD5E1', fontWeight: '600' }}>
                                    {p.asignacion_desde || 'N/A'} al {p.asignacion_hasta || 'N/A'}
                                  </Text>
                                </Text>
                              </View>

                              {p.numero_resolucion_display && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <Ionicons name="document-text" size={14} color="#10B981" />
                                  <Text style={{ color: '#A7F3D0', fontSize: 12 }}>
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
                              backgroundColor: '#0284C7',
                              paddingHorizontal: 14,
                              paddingVertical: 9,
                              borderRadius: 8,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Ionicons name="options-outline" size={16} color="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                              {tieneModalidad ? 'Editar Modalidad' : 'Asignar Modalidad'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => abrirModalAcuerdo(p)}
                            style={{
                              backgroundColor: p.requiere_nuevo_acuerdo
                                ? '#D97706'
                                : 'rgba(255, 255, 255, 0.08)',
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: p.requiere_nuevo_acuerdo
                                ? '#F59E0B'
                                : 'rgba(255, 255, 255, 0.15)',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Ionicons
                              name="ribbon-outline"
                              size={16}
                              color={p.requiere_nuevo_acuerdo ? '#FFFFFF' : '#CBD5E1'}
                            />
                            <Text
                              style={{
                                color: p.requiere_nuevo_acuerdo ? '#FFFFFF' : '#CBD5E1',
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
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: 'rgba(255, 255, 255, 0.15)',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Ionicons name="calendar-outline" size={16} color="#38BDF8" />
                            <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '700' }}>
                              Seguimiento
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 2: RESOLUCIONES GENERALES                            */}
            {/* ------------------------------------------------------------- */}
            {tabActiva === 'resoluciones' && (
              <View style={{ gap: 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <View>
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                      Catálogo de Resoluciones Institucionales
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: 13 }}>
                      Actos administrativos marco que confieren teletrabajo o trabajo en casa a la planta
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => abrirModalNuevaRes()}
                    style={{
                      backgroundColor: COLORS.primary,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                      Subir Nueva Resolución
                    </Text>
                  </Pressable>
                </View>

                <View style={{ gap: 12 }}>
                  {resoluciones.map((r) => (
                    <View
                      key={r.id}
                      style={{
                        backgroundColor: COLORS.cardBg,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        padding: 20,
                        flexDirection: isDesktop ? 'row' : 'column',
                        justifyContent: 'space-between',
                        alignItems: isDesktop ? 'center' : 'stretch',
                        gap: 16,
                      }}
                    >
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Ionicons name="document-text" size={24} color="#38BDF8" />
                          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                            {r.numero_resolucion}
                          </Text>
                          <View
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.2)',
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: '#10B981',
                            }}
                          >
                            <Text style={{ color: '#A7F3D0', fontSize: 11, fontWeight: '800' }}>
                              {r.estado}
                            </Text>
                          </View>
                        </View>

                        <Text style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 19 }}>
                          {r.descripcion || 'Sin descripción adicional.'}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                          <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                            Expedición: <Text style={{ color: '#FFFFFF' }}>{r.fecha_expedicion}</Text>
                          </Text>
                          <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                            Vigencia General:{' '}
                            <Text style={{ color: '#FFFFFF' }}>
                              {r.fecha_inicio_vigencia} al {r.fecha_fin_vigencia}
                            </Text>
                          </Text>
                          <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '700' }}>
                            Personas Vinculadas: {r.total_personas_activas || 0} activas
                          </Text>
                        </View>
                      </View>

                      {r.archivo_pdf_url && (
                        <TouchableOpacity
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              window.open(r.archivo_pdf_url, '_blank');
                            }
                          }}
                          style={{
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#0284C7',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Ionicons name="eye-outline" size={16} color="#38BDF8" />
                          <Text style={{ color: '#38BDF8', fontSize: 13, fontWeight: '700' }}>
                            Ver Resolución PDF
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {resoluciones.length === 0 && (
                    <Text style={{ color: '#64748B', textAlign: 'center', marginVertical: 30 }}>
                      No hay resoluciones registradas aún. Haz clic en "Subir Nueva Resolución".
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 3: CARGOS TELETRABAJABLES                           */}
            {/* ------------------------------------------------------------- */}
            {tabActiva === 'cargos' && (
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                    Matriz de Viabilidad de Cargos Teletrabajables
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 13 }}>
                    Criterios técnicos institucionales según el Manual de Funciones de la Secretaría Jurídica Distrital
                  </Text>
                </View>

                <View style={{ gap: 10 }}>
                  {cargos.map((c) => (
                    <View
                      key={c.id}
                      style={{
                        backgroundColor: COLORS.cardBg,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: c.es_teletrabajable
                          ? 'rgba(16, 185, 129, 0.25)'
                          : 'rgba(239, 68, 68, 0.25)',
                        padding: 16,
                        flexDirection: isDesktop ? 'row' : 'column',
                        justifyContent: 'space-between',
                        alignItems: isDesktop ? 'center' : 'stretch',
                        gap: 12,
                      }}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                            {c.cargo_nombre}
                          </Text>
                          <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                            Código: {c.codigo} • Grado: {c.grado}
                          </Text>
                          <View
                            style={{
                              backgroundColor: c.es_teletrabajable
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                color: c.es_teletrabajable ? '#A7F3D0' : '#FCA5A5',
                                fontSize: 10.5,
                                fontWeight: '800',
                              }}
                            >
                              {c.es_teletrabajable ? 'TELETRABAJABLE' : 'NO TELETRABAJABLE'}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                          {c.justificacion_estudio || 'Sin justificación técnica registrada.'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ color: '#CBD5E1', fontSize: 12 }}>
                          Máx. Días: <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{c.max_dias_semana} días/sem</Text>
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
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                          }}
                        >
                          <Text style={{ color: '#CBD5E1', fontSize: 11, fontWeight: '700' }}>
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
            {tabActiva === 'acuerdos' && (
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                    Expediente de Acuerdos de Compromiso
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 13 }}>
                    Documentos formales suscritos por los servidores y sus jefes al iniciar o cambiar de cargo
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {acuerdos.map((ac) => (
                    <View
                      key={ac.id}
                      style={{
                        backgroundColor: COLORS.cardBg,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        padding: 18,
                        flexDirection: isDesktop ? 'row' : 'column',
                        justifyContent: 'space-between',
                        alignItems: isDesktop ? 'center' : 'stretch',
                        gap: 14,
                      }}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Ionicons name="ribbon" size={20} color="#F59E0B" />
                          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                            {ac.servidor_nombre}
                          </Text>
                          <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                            C.C. {ac.servidor_cedula}
                          </Text>
                        </View>

                        <Text style={{ color: '#E2E8F0', fontSize: 13 }}>
                          Cargo al momento del acuerdo:{' '}
                          <Text style={{ fontWeight: '700', color: '#93C5FD' }}>
                            {ac.cargo_al_momento}
                          </Text>
                        </Text>

                        <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                          Fecha de Suscripción: {ac.fecha_suscripcion} • Vigencia: {ac.periodo_vigencia || 'ANUAL'}
                        </Text>
                      </View>

                      {ac.archivo_acuerdo_url && (
                        <TouchableOpacity
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              window.open(ac.archivo_acuerdo_url, '_blank');
                            }
                          }}
                          style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#F59E0B',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Ionicons name="eye-outline" size={16} color="#FBBF24" />
                          <Text style={{ color: '#FBBF24', fontSize: 12.5, fontWeight: '700' }}>
                            Ver Acuerdo Firmado
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {acuerdos.length === 0 && (
                    <Text style={{ color: '#64748B', textAlign: 'center', marginVertical: 30 }}>
                      No se han subido acuerdos de compromiso aún.
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 5: SEGUIMIENTOS POR FECHAS                           */}
            {/* ------------------------------------------------------------- */}
            {tabActiva === 'seguimientos' && (
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                    Seguimientos Periódicos de Rendimiento y Actividades
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 13 }}>
                    Cortes periódicos delimitados por rango de fechas (Desde - Hasta)
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {seguimientos.map((s) => (
                    <View
                      key={s.id}
                      style={{
                        backgroundColor: COLORS.cardBg,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        padding: 18,
                        gap: 10,
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                            {s.servidor_nombre}
                          </Text>
                          <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                            C.C. {s.servidor_cedula}
                          </Text>
                        </View>

                        {/* Rango de Fechas */}
                        <View
                          style={{
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#0284C7',
                          }}
                        >
                          <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '800' }}>
                            Corte: {s.fecha_corte_desde} al {s.fecha_corte_hasta}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 18 }}>
                        {s.actividades_reportadas}
                      </Text>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 10,
                          paddingTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: 'rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                          <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                            Nivel:{' '}
                            <Text style={{ color: '#10B981', fontWeight: '800' }}>
                              {s.cumplimiento_nivel} ({s.calificacion_porcentaje}%)
                            </Text>
                          </Text>
                          <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                            Concepto:{' '}
                            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                              {s.concepto_recomendacion}
                            </Text>
                          </Text>
                        </View>

                        {s.soporte_evidencias_url && (
                          <TouchableOpacity
                            onPress={() => {
                              if (Platform.OS === 'web') {
                                window.open(s.soporte_evidencias_url, '_blank');
                              }
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 6,
                            }}
                          >
                            <Ionicons name="document-attach" size={14} color="#38BDF8" />
                            <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '700' }}>
                              Ver Evidencias
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                  {seguimientos.length === 0 && (
                    <Text style={{ color: '#64748B', textAlign: 'center', marginVertical: 30 }}>
                      No hay seguimientos registrados aún.
                    </Text>
                  )}
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
              backgroundColor: 'rgba(0,0,0,0.8)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: '#0F2133',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 24,
                width: '100%',
                maxWidth: 620,
                maxHeight: '90%',
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
                    borderBottomColor: COLORS.border,
                  }}
                >
                  <View>
                    <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                      Configurar Modalidad de Trabajo
                    </Text>
                    <Text style={{ color: '#38BDF8', fontSize: 13, fontWeight: '700' }}>
                      {formAsignacion.persona?.titular_nombre} (C.C. {formAsignacion.persona?.titular_cedula})
                    </Text>
                  </View>
                  <Pressable onPress={() => setModalAsignacionVisible(false)}>
                    <Ionicons name="close" size={24} color="#94A3B8" />
                  </Pressable>
                </View>

                {/* Cargo Actual y Viabilidad */}
                <View
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: 12,
                    borderRadius: 10,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: '#CBD5E1', fontSize: 13 }}>
                    Cargo: <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{formAsignacion.persona?.cargo}</Text>
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                    Dependencia: {formAsignacion.persona?.dependencia_cargo}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Ionicons
                      name={formAsignacion.cargo_es_teletrabajable ? 'checkmark-circle' : 'alert-circle'}
                      size={18}
                      color={formAsignacion.cargo_es_teletrabajable ? '#10B981' : '#F87171'}
                    />
                    <Text
                      style={{
                        color: formAsignacion.cargo_es_teletrabajable ? '#A7F3D0' : '#FCA5A5',
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
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      padding: 14,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#F59E0B',
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#FCD34D', fontSize: 13, fontWeight: '800' }}>
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
                          backgroundColor: formAsignacion.excepcion_jefe_aprobada ? '#10B981' : '#475569',
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
                        placeholderTextColor="#94A3B8"
                        style={{
                          backgroundColor: COLORS.inputBg,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          color: '#FFFFFF',
                          padding: 10,
                          fontSize: 12.5,
                        }}
                      />
                    )}
                  </View>
                )}

                {/* Selección de Modalidad */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '700' }}>
                    Tipo de Modalidad:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                      { id: 'TELETRABAJO', label: 'Teletrabajo (Ordinario/Suplementario)' },
                      { id: 'TRABAJO_EN_CASA', label: 'Trabajo en Casa (Excepcional)' },
                    ].map((m) => {
                      const sel = formAsignacion.modalidad === m.id;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() => setFormAsignacion((prev) => ({ ...prev, modalidad: m.id as any }))}
                          style={{
                            flex: 1,
                            backgroundColor: sel ? '#0284C7' : 'rgba(255, 255, 255, 0.06)',
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: sel ? '#38BDF8' : COLORS.border,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: sel ? '#FFFFFF' : '#94A3B8', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Selección de Resolución General */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '700' }}>
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
                            backgroundColor: sel ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            padding: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: sel ? '#38BDF8' : COLORS.border,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <View>
                            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                              {r.numero_resolucion}
                            </Text>
                            <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                              Vigencia base: {r.fecha_inicio_vigencia} al {r.fecha_fin_vigencia}
                            </Text>
                          </View>
                          {sel && <Ionicons name="checkmark-circle" size={18} color="#38BDF8" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Fechas de Vigencia (Heredadas de resolución o editables) */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '700' }}>
                      Periodo de Vigencia de la Persona:
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setFormAsignacion((prev) => ({
                          ...prev,
                          fechas_editadas_manualmente: !prev.fechas_editadas_manualmente,
                        }))
                      }
                    >
                      <Text style={{ color: '#38BDF8', fontSize: 11.5, fontWeight: '700' }}>
                        {formAsignacion.fechas_editadas_manualmente ? 'Modo Manual' : 'Heredando de Resolución'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11 }}>Fecha Inicio:</Text>
                      <TextInput
                        value={formAsignacion.fecha_inicio}
                        onChangeText={(t) =>
                          setFormAsignacion((prev) => ({
                            ...prev,
                            fecha_inicio: t,
                            fechas_editadas_manualmente: true,
                          }))
                        }
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor="#64748B"
                        style={{
                          backgroundColor: COLORS.inputBg,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          color: '#FFFFFF',
                          padding: 10,
                          fontSize: 13,
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11 }}>Fecha Fin:</Text>
                      <TextInput
                        value={formAsignacion.fecha_fin}
                        onChangeText={(t) =>
                          setFormAsignacion((prev) => ({
                            ...prev,
                            fecha_fin: t,
                            fechas_editadas_manualmente: true,
                          }))
                        }
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor="#64748B"
                        style={{
                          backgroundColor: COLORS.inputBg,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          color: '#FFFFFF',
                          padding: 10,
                          fontSize: 13,
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Esquema de Días */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '700' }}>
                    Distribución de Días de Teletrabajo:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { id: 'DIAS_FIJOS', label: 'Días Fijos por Semana' },
                      { id: 'DIAS_PARES', label: 'Días Pares del Calendario' },
                      { id: 'DIAS_IMPARES', label: 'Días Impares del Calendario' },
                      { id: 'CANTIDAD_LIBRE', label: 'Días Libres Concertados' },
                    ].map((esq) => {
                      const sel = formAsignacion.esquema_dias_tipo === esq.id;
                      return (
                        <TouchableOpacity
                          key={esq.id}
                          onPress={() => setFormAsignacion((prev) => ({ ...prev, esquema_dias_tipo: esq.id as any }))}
                          style={{
                            backgroundColor: sel ? '#0284C7' : 'rgba(255, 255, 255, 0.05)',
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: sel ? '#38BDF8' : COLORS.border,
                          }}
                        >
                          <Text style={{ color: sel ? '#FFFFFF' : '#CBD5E1', fontSize: 11.5, fontWeight: '700' }}>
                            {esq.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selector de días de la semana si es DIAS_FIJOS */}
                  {formAsignacion.esquema_dias_tipo === 'DIAS_FIJOS' && (
                    <View style={{ marginTop: 6, gap: 6 }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11 }}>Selecciona los días hábiles:</Text>
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
                                backgroundColor: activo ? '#10B981' : 'rgba(255, 255, 255, 0.06)',
                                borderWidth: 1,
                                borderColor: activo ? '#34D399' : COLORS.border,
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ color: activo ? '#FFFFFF' : '#94A3B8', fontSize: 11, fontWeight: '800' }}>
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
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => guardarAsignacion()}
                    disabled={guardandoAsignacion}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: '#0284C7',
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
        {/* MODAL 2: NUEVA RESOLUCIÓN GENERAL                                */}
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
              backgroundColor: 'rgba(0,0,0,0.8)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: '#0F2133',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 24,
                width: '100%',
                maxWidth: 540,
                gap: 14,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                  Subir Resolución Institucional
                </Text>
                <Pressable onPress={() => setModalResVisible(false)}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </Pressable>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>Número de Resolución:</Text>
                <TextInput
                  value={formRes.numero_resolucion}
                  onChangeText={(t) => setFormRes((p) => ({ ...p, numero_resolucion: t }))}
                  placeholder="Ej: Resolución No. 124 de 2026"
                  placeholderTextColor="#64748B"
                  style={{
                    backgroundColor: COLORS.inputBg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    color: '#FFFFFF',
                    padding: 10,
                    fontSize: 13,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>Fecha Expedición:</Text>
                  <TextInput
                    value={formRes.fecha_expedicion}
                    onChangeText={(t) => setFormRes((p) => ({ ...p, fecha_expedicion: t }))}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#64748B"
                    style={{
                      backgroundColor: COLORS.inputBg,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      color: '#FFFFFF',
                      padding: 10,
                      fontSize: 13,
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>Año:</Text>
                  <TextInput
                    value={formRes.anio}
                    onChangeText={(t) => setFormRes((p) => ({ ...p, anio: t }))}
                    placeholder="2026"
                    placeholderTextColor="#64748B"
                    style={{
                      backgroundColor: COLORS.inputBg,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      color: '#FFFFFF',
                      padding: 10,
                      fontSize: 13,
                    }}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>Vigencia Inicio:</Text>
                  <TextInput
                    value={formRes.fecha_inicio_vigencia}
                    onChangeText={(t) => setFormRes((p) => ({ ...p, fecha_inicio_vigencia: t }))}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#64748B"
                    style={{
                      backgroundColor: COLORS.inputBg,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      color: '#FFFFFF',
                      padding: 10,
                      fontSize: 13,
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>Vigencia Fin:</Text>
                  <TextInput
                    value={formRes.fecha_fin_vigencia}
                    onChangeText={(t) => setFormRes((p) => ({ ...p, fecha_fin_vigencia: t }))}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#64748B"
                    style={{
                      backgroundColor: COLORS.inputBg,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      color: '#FFFFFF',
                      padding: 10,
                      fontSize: 13,
                    }}
                  />
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>Descripción u Objeto:</Text>
                <TextInput
                  value={formRes.descripcion}
                  onChangeText={(t) => setFormRes((p) => ({ ...p, descripcion: t }))}
                  placeholder="Descripción..."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={2}
                  style={{
                    backgroundColor: COLORS.inputBg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    color: '#FFFFFF',
                    padding: 10,
                    fontSize: 12.5,
                  }}
                />
              </View>

              {/* Subir Archivo PDF */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>Archivo PDF Oficial:</Text>
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
                        backgroundColor: '#1E293B',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: '1px solid #334155',
                        color: '#38BDF8',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      📁 {formRes.nombre_archivo ? 'Cambiar PDF' : 'Seleccionar PDF'}
                    </label>
                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                      {formRes.nombre_archivo || 'Ningún archivo seleccionado'}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>
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
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={() => guardarResolucion()}
                  disabled={guardandoRes}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: COLORS.primary,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {guardandoRes ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                        Guardar Resolución
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
              backgroundColor: 'rgba(0,0,0,0.8)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: '#0F2133',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 24,
                width: '100%',
                maxWidth: 520,
                gap: 14,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                  Acuerdo de Compromiso de Teletrabajo
                </Text>
                <Pressable onPress={() => setModalAcuerdoVisible(false)}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </Pressable>
              </View>

              <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, gap: 4 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                  Servidor: {formAcuerdo.persona?.titular_nombre}
                </Text>
                <Text style={{ color: '#93C5FD', fontSize: 12.5 }}>
                  Cargo Actual: {formAcuerdo.persona?.cargo}
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 11.5 }}>
                  Dependencia: {formAcuerdo.persona?.dependencia_cargo}
                </Text>
              </View>

              {formAcuerdo.persona?.requiere_nuevo_acuerdo && (
                <View
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    padding: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#F59E0B',
                  }}
                >
                  <Text style={{ color: '#FCD34D', fontSize: 12, fontWeight: '700' }}>
                    ⚠️ Atención: El servidor presenta un cargo distinto al registrado en el acuerdo anterior. Se debe formalizar y subir el nuevo acuerdo de compromiso para el cargo actual.
                  </Text>
                </View>
              )}

              <View style={{ gap: 4 }}>
                <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>Fecha de Suscripción:</Text>
                <TextInput
                  value={formAcuerdo.fecha_suscripcion}
                  onChangeText={(t) => setFormAcuerdo((p) => ({ ...p, fecha_suscripcion: t }))}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#64748B"
                  style={{
                    backgroundColor: COLORS.inputBg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    color: '#FFFFFF',
                    padding: 10,
                    fontSize: 13,
                  }}
                />
              </View>

              {/* Subir Acuerdo PDF */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>
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
                        backgroundColor: '#1E293B',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: '1px solid #334155',
                        color: '#FBBF24',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      📁 {formAcuerdo.nombre_archivo ? 'Cambiar PDF' : 'Subir PDF Firmado'}
                    </label>
                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                      {formAcuerdo.nombre_archivo || 'Ningún archivo seleccionado'}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>
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
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
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
              backgroundColor: 'rgba(0,0,0,0.8)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: '#0F2133',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 24,
                width: '100%',
                maxWidth: 580,
                maxHeight: '90%',
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
                    borderBottomColor: COLORS.border,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                    Registrar Corte de Seguimiento
                  </Text>
                  <Pressable onPress={() => setModalSegVisible(false)}>
                    <Ionicons name="close" size={24} color="#94A3B8" />
                  </Pressable>
                </View>

                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, gap: 4 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                    Servidor: {formSeg.persona?.titular_nombre}
                  </Text>
                  <Text style={{ color: '#93C5FD', fontSize: 12.5 }}>
                    Cargo: {formSeg.persona?.cargo}
                  </Text>
                </View>

                {/* Rango de Fechas (Desde - Hasta) */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: '#38BDF8', fontSize: 13, fontWeight: '800' }}>
                    Rango del Periodo Evaluado:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11 }}>Fecha Desde:</Text>
                      <TextInput
                        value={formSeg.fecha_corte_desde}
                        onChangeText={(t) => setFormSeg((p) => ({ ...p, fecha_corte_desde: t }))}
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor="#64748B"
                        style={{
                          backgroundColor: COLORS.inputBg,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          color: '#FFFFFF',
                          padding: 10,
                          fontSize: 13,
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11 }}>Fecha Hasta:</Text>
                      <TextInput
                        value={formSeg.fecha_corte_hasta}
                        onChangeText={(t) => setFormSeg((p) => ({ ...p, fecha_corte_hasta: t }))}
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor="#64748B"
                        style={{
                          backgroundColor: COLORS.inputBg,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          color: '#FFFFFF',
                          padding: 10,
                          fontSize: 13,
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Calificación y Cumplimiento */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>Nivel de Cumplimiento:</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {['SOBRESALIENTE', 'SATISFACTORIO', 'PARCIAL', 'NO_CUMPLE'].map((niv) => {
                        const sel = formSeg.cumplimiento_nivel === niv;
                        return (
                          <TouchableOpacity
                            key={niv}
                            onPress={() => setFormSeg((p) => ({ ...p, cumplimiento_nivel: niv as any }))}
                            style={{
                              backgroundColor: sel ? '#10B981' : 'rgba(255, 255, 255, 0.05)',
                              paddingVertical: 6,
                              paddingHorizontal: 8,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: sel ? '#FFFFFF' : '#94A3B8', fontSize: 10.5, fontWeight: '700' }}>
                              {niv}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ width: 100, gap: 4 }}>
                    <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>% Calificación:</Text>
                    <TextInput
                      value={formSeg.calificacion_porcentaje}
                      onChangeText={(t) => setFormSeg((p) => ({ ...p, calificacion_porcentaje: t }))}
                      keyboardType="numeric"
                      placeholder="100"
                      placeholderTextColor="#64748B"
                      style={{
                        backgroundColor: COLORS.inputBg,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        color: '#FFFFFF',
                        padding: 10,
                        fontSize: 13,
                      }}
                    />
                  </View>
                </View>

                {/* Actividades y Entregables */}
                <View style={{ gap: 4 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>Actividades y Entregables Reportados:</Text>
                  <TextInput
                    value={formSeg.actividades_reportadas}
                    onChangeText={(t) => setFormSeg((p) => ({ ...p, actividades_reportadas: t }))}
                    placeholder="Detalle de actividades desarrolladas durante las jornadas de teletrabajo..."
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: COLORS.inputBg,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      color: '#FFFFFF',
                      padding: 10,
                      fontSize: 12.5,
                    }}
                  />
                </View>

                {/* Subir Evidencias */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '700' }}>Archivo de Soportes / Evidencias:</Text>
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
                          backgroundColor: '#1E293B',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          border: '1px solid #334155',
                          color: '#38BDF8',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        📁 {formSeg.nombre_archivo ? 'Cambiar Soportes' : 'Adjuntar Evidencias'}
                      </label>
                      <Text style={{ color: '#94A3B8', fontSize: 12 }}>
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
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => guardarSeguimiento()}
                    disabled={guardandoSeg}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: '#0284C7',
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
              backgroundColor: 'rgba(0,0,0,0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: '#0F2133',
                borderRadius: 16,
                borderWidth: 1,
                borderColor:
                  notifModal.tipo === 'error'
                    ? '#EF4444'
                    : notifModal.tipo === 'success'
                    ? '#10B981'
                    : '#38BDF8',
                padding: 22,
                maxWidth: 460,
                width: '100%',
                gap: 14,
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
                      ? '#F87171'
                      : notifModal.tipo === 'success'
                      ? '#34D399'
                      : '#38BDF8'
                  }
                />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                  {notifModal.titulo}
                </Text>
              </View>

              <Text style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 19 }}>
                {notifModal.mensaje}
              </Text>

              <Pressable
                onPress={() => setNotifModal((p) => ({ ...p, visible: false }))}
                style={{
                  alignSelf: 'flex-end',
                  backgroundColor:
                    notifModal.tipo === 'error'
                      ? COLORS.primary
                      : notifModal.tipo === 'success'
                      ? '#10B981'
                      : '#0284C7',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
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
      </SafeAreaView>
    </View>
  );
}
