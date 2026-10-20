import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  generarEtapasParaCaso,
  limpiarEtapasParaNuevoTramite,
  TipoProceso,
  ModalidadPersonal,
  CasoFlujoFuncionario,
} from '../../app/rrhh/vinculaciones-desvinculaciones';

import {
  guardarCasosEnStorage,
  guardarCasoActivoEnStorage,
  obtenerCasosDeStorage,
  STORAGE_KEY_CASOS,
  STORAGE_KEY_CASO_ACTIVO,
} from '../../lib/storageCasosRRHH';

// Paleta institucional armoniosa
const THEME = {
  marca900: '#0F2942',
  marca800: '#174066',
  marca700: '#1E5282',
  marca600: '#2668A5',
  marca50: '#F0F6FC',
  emeraldText: '#047857',
  emeraldBg: '#ECFDF5',
  emeraldBorder: '#A7F3D0',
  amberText: '#B45309',
  amberBg: '#FFFBEB',
  amberBorder: '#FDE68A',
  roseText: '#BE123C',
  roseBg: '#FFF1F2',
  roseBorder: '#FECDD3',
  indigoText: '#4338CA',
  indigoBg: '#EEF2FF',
  indigoBorder: '#C7D2FE',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
};

export interface NovedadPernoItem {
  cedula: string;
  nombre_completo: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  nombres?: string;
  cargo: string;
  cargo_cod?: string;
  grado?: string;
  dependencia: string;
  dependencia_cod?: string;
  posicion_planta?: number | null;
  tipo_funcionario?: string;
  tipo_nombramiento?: string;
  acto_nombramiento?: string;
  numero_acto_nombramiento?: string;
  fecha_acto_nombramiento?: string;
  fecha_efectiva_nombramiento?: string;
  fecha_ingreso_entidad?: string;
  fecha_ingreso_distrito?: string;
  estado_funcionario?: string;
  fecha_retiro?: string;
  total_devengado?: number;
  asignacion_basica?: number;
  tipo_proceso: TipoProceso;
  fecha_evento?: string | null;
  dias_evento?: number | null;
  es_ultimos_6_meses?: boolean;
  es_ultimos_12_meses?: boolean;
}

export interface ModalNovedadesPernoTramitesProps {
  visible: boolean;
  onClose: () => void;
  novedadesVinculacion?: NovedadPernoItem[];
  novedadesDesvinculacion?: NovedadPernoItem[];
  todoElPerno?: any[];
  plazas?: any[];
  onTramiteCreado?: (nuevoCaso: CasoFlujoFuncionario) => void;
}

export default function ModalNovedadesPernoTramites({
  visible,
  onClose,
  novedadesVinculacion = [],
  novedadesDesvinculacion = [],
  todoElPerno = [],
  plazas = [],
  onTramiteCreado,
}: ModalNovedadesPernoTramitesProps) {
  const router = useRouter();

  // Estados de interfaz y filtrado
  const [tabActiva, setTabActiva] = useState<TipoProceso>('VINCULACION');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'6m' | '12m' | 'todos'>('6m');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PENDIENTES' | 'REGISTRADOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [procesandoCedula, setProcesandoCedula] = useState<string | null>(null);
  const [procesandoLote, setProcesandoLote] = useState(false);

  // Modal interno de confirmación/notificación (sin alerts)
  const [toastInfo, setToastInfo] = useState<{
    visible: boolean;
    titulo: string;
    mensaje: string;
    tipo: 'success' | 'info' | 'warning';
  }>({
    visible: false,
    titulo: '',
    mensaje: '',
    tipo: 'info',
  });

  // Mapa de trámites existentes en localStorage (cruzados por cédula)
  const [casosMap, setCasosMap] = useState<{ [cedulaProcesoKey: string]: CasoFlujoFuncionario }>({});
  const [totalCasosActuales, setTotalCasosActuales] = useState<CasoFlujoFuncionario[]>([]);

  // Función para sincronizar casos desde storage seguro
  const refrescarCasosDesdeStorage = () => {
    try {
      const parsed = obtenerCasosDeStorage();
      if (parsed && Array.isArray(parsed)) {
        setTotalCasosActuales(parsed);
        const map: { [k: string]: CasoFlujoFuncionario } = {};
        parsed.forEach((c) => {
          const key = `${String(c.servidor_cedula).trim()}_${c.tipo_proceso}`;
          map[key] = c;
        });
        setCasosMap(map);
      }
    } catch (e) {
      console.warn('Error leyendo casos en ModalNovedadesPernoTramites:', e);
    }
  };

  useEffect(() => {
    if (visible) {
      refrescarCasosDesdeStorage();
    }
  }, [visible]);

  // Si no vienen novedades del backend, generarlas reactivamente desde todoElPerno
  const { vinculacionesCalculadas, desvinculacionesCalculadas } = useMemo(() => {
    if (novedadesVinculacion.length > 0 || novedadesDesvinculacion.length > 0) {
      return {
        vinculacionesCalculadas: novedadesVinculacion,
        desvinculacionesCalculadas: novedadesDesvinculacion,
      };
    }

    const hoyMs = Date.now();
    const msPorDia = 86400000;
    const vinc: NovedadPernoItem[] = [];
    const desv: NovedadPernoItem[] = [];

    (todoElPerno || []).forEach((p) => {
      const ced = String(p.cedula || '').trim();
      if (!ced) return;

      const estado = String(p.estado_funcionario || '').toUpperCase();
      const fechaRet = p.fecha_retiro ? String(p.fecha_retiro).split('T')[0] : null;
      const esRetirado = estado === 'R' || estado.includes('RETIRAD') || !!fechaRet;

      const fechaIngresoRef =
        (p.fecha_ingreso_entidad ? String(p.fecha_ingreso_entidad).split('T')[0] : null) ||
        (p.fecha_efectiva_nombramiento ? String(p.fecha_efectiva_nombramiento).split('T')[0] : null) ||
        (p.fecha_acto_nombramiento ? String(p.fecha_acto_nombramiento).split('T')[0] : null) ||
        (p.fecha_ingreso_distrito ? String(p.fecha_ingreso_distrito).split('T')[0] : null);

      const fechaEvento = esRetirado ? (fechaRet || fechaIngresoRef) : fechaIngresoRef;

      let dias: number | null = null;
      let es6m = false;
      let es12m = false;

      if (fechaEvento) {
        const d = new Date(fechaEvento + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          dias = Math.round((hoyMs - d.getTime()) / msPorDia);
          es6m = dias >= -15 && dias <= 182;
          es12m = dias >= -15 && dias <= 365;
        }
      }

      const item: NovedadPernoItem = {
        cedula: ced,
        nombre_completo:
          p.nombre_completo ||
          `${p.nombres || ''} ${p.primer_apellido || ''} ${p.segundo_apellido || ''}`.trim(),
        primer_apellido: p.primer_apellido,
        segundo_apellido: p.segundo_apellido,
        nombres: p.nombres,
        cargo: p.cargo || 'CARGO NO REGISTRADO',
        cargo_cod: p.cargo_cod,
        grado: p.grado,
        dependencia: p.dependencia || 'SECRETARÍA JURÍDICA DISTRITAL',
        dependencia_cod: p.dependencia_cod,
        posicion_planta: p.posicion_planta,
        tipo_funcionario: p.tipo_funcionario,
        tipo_nombramiento: p.tipo_nombramiento,
        acto_nombramiento: p.acto_nombramiento,
        numero_acto_nombramiento: p.numero_acto_nombramiento,
        fecha_acto_nombramiento: p.fecha_acto_nombramiento,
        fecha_efectiva_nombramiento: p.fecha_efectiva_nombramiento,
        fecha_ingreso_entidad: p.fecha_ingreso_entidad,
        fecha_ingreso_distrito: p.fecha_ingreso_distrito,
        estado_funcionario: esRetirado ? 'R' : 'A',
        fecha_retiro: fechaRet || undefined,
        total_devengado: p.total_devengado,
        asignacion_basica: p.asignacion_basica,
        tipo_proceso: esRetirado ? 'DESVINCULACION' : 'VINCULACION',
        fecha_evento: fechaEvento,
        dias_evento: dias,
        es_ultimos_6_meses: es6m,
        es_ultimos_12_meses: es12m,
      };

      if (esRetirado) {
        desv.push(item);
      } else {
        vinc.push(item);
      }
    });

    const ordenDesc = (a: NovedadPernoItem, b: NovedadPernoItem) => {
      if (!a.fecha_evento) return 1;
      if (!b.fecha_evento) return -1;
      return String(b.fecha_evento).localeCompare(String(a.fecha_evento));
    };

    vinc.sort(ordenDesc);
    desv.sort(ordenDesc);

    return {
      vinculacionesCalculadas: vinc,
      desvinculacionesCalculadas: desv,
    };
  }, [novedadesVinculacion, novedadesDesvinculacion, todoElPerno]);

  // Lista activa según pestaña
  const listaBase = tabActiva === 'VINCULACION' ? vinculacionesCalculadas : desvinculacionesCalculadas;

  // Filtrado reactivo (Periodo, Búsqueda, Estado de Registro)
  const listaFiltrada = useMemo(() => {
    return listaBase.filter((item) => {
      // 1. Filtro temporal
      if (filtroPeriodo === '6m' && !item.es_ultimos_6_meses) return false;
      if (filtroPeriodo === '12m' && !item.es_ultimos_12_meses) return false;

      // 2. Filtro de Registro (Cruce por Cédula)
      const key = `${String(item.cedula).trim()}_${item.tipo_proceso}`;
      const yaRegistrado = !!casosMap[key];

      if (filtroEstado === 'PENDIENTES' && yaRegistrado) return false;
      if (filtroEstado === 'REGISTRADOS' && !yaRegistrado) return false;

      // 3. Búsqueda de texto
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const textoBusqueda = `${item.cedula} ${item.nombre_completo} ${item.cargo} ${item.dependencia} ${item.tipo_nombramiento || ''}`.toLowerCase();
        if (!textoBusqueda.includes(q)) return false;
      }

      return true;
    });
  }, [listaBase, filtroPeriodo, filtroEstado, busqueda, casosMap]);

  // Contadores reactivos
  const metricas = useMemo(() => {
    const contar = (lista: NovedadPernoItem[], tipo: TipoProceso) => {
      const en6m = lista.filter((i) => i.es_ultimos_6_meses);
      const pendientes6m = en6m.filter((i) => !casosMap[`${String(i.cedula).trim()}_${tipo}`]).length;
      const pendientesTotal = lista.filter((i) => !casosMap[`${String(i.cedula).trim()}_${tipo}`]).length;
      return {
        total: lista.length,
        total6m: en6m.length,
        pendientes6m,
        pendientesTotal,
      };
    };

    return {
      vinculacion: contar(vinculacionesCalculadas, 'VINCULACION'),
      desvinculacion: contar(desvinculacionesCalculadas, 'DESVINCULACION'),
    };
  }, [vinculacionesCalculadas, desvinculacionesCalculadas, casosMap]);

  // Deducción inteligente de modalidad
  const deducirModalidad = (item: NovedadPernoItem): ModalidadPersonal => {
    const t = String(item.tipo_nombramiento || item.tipo_funcionario || '').toUpperCase();
    if (t.includes('CARRERA')) return 'CARRERA_ADMINISTRATIVA';
    if (t.includes('PROVISIONAL')) return 'PROVISIONALIDAD';
    if (t.includes('LIBRE') || t.includes('REMOCION')) return 'LIBRE_NOMBRAMIENTO';
    if (t.includes('PRACTICANTE') || t.includes('JUDICANTE') || t.includes('PASANTE')) return 'PRACTICANTE_JUDICANTE';

    const cargoUpper = String(item.cargo || '').toUpperCase();
    if (cargoUpper.includes('SECRETARIO') || cargoUpper.includes('DIRECTOR') || cargoUpper.includes('ASESOR') || cargoUpper.includes('SUBDIRECTOR')) {
      return 'LIBRE_NOMBRAMIENTO';
    }
    return 'CARRERA_ADMINISTRATIVA';
  };

  // Crear caso individual para un servidor
  const handleCrearTramite = (item: NovedadPernoItem) => {
    setProcesandoCedula(item.cedula);
    try {
      const modalidad = deducirModalidad(item);
      const tipoProceso = item.tipo_proceso;

      // Calcular correlativo de ID
      const numMax = totalCasosActuales.reduce((max, c) => {
        const match = c.id.match(/TR-\d{4}-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, totalCasosActuales.length);

      const nuevoId = `TR-${new Date().getFullYear()}-${String(numMax + 1).padStart(3, '0')}`;

      // Etapas reglamentarias totalmente en blanco para gestión oficial
      const etapasBase = generarEtapasParaCaso(tipoProceso, modalidad);
      const etapasLimpias = limpiarEtapasParaNuevoTramite(etapasBase);

      // Buscar plaza asociada priorizando SIEMPRE la cédula del funcionario
      let idPlazaDetectada: number | undefined = undefined;
      const cedLimpia = String(item.cedula || '').replace(/\D/g, '');
      if (cedLimpia) {
        const plazaPorCedula = plazas.find(
          (pl) =>
            (pl.titular_cedula && String(pl.titular_cedula).replace(/\D/g, '') === cedLimpia) ||
            (pl.es_encargo && pl.encargo_cedula && String(pl.encargo_cedula).replace(/\D/g, '') === cedLimpia)
        );
        if (plazaPorCedula) idPlazaDetectada = plazaPorCedula.id_plaza;
      }
      if (!idPlazaDetectada && item.posicion_planta) {
        const plazaMatch = plazas.find((pl) => Number(pl.id_perno) === Number(item.posicion_planta));
        if (plazaMatch) idPlazaDetectada = plazaMatch.id_plaza;
      }

      // Causal de retiro sugerida para desvinculaciones
      let causalSugerida: string | undefined = undefined;
      if (tipoProceso === 'DESVINCULACION') {
        const tNomb = String(item.tipo_nombramiento || '').toUpperCase();
        if (tNomb.includes('RENUNCIA')) causalSugerida = 'Aceptación de renuncia regularmente presentada';
        else if (tNomb.includes('PENSION') || tNomb.includes('JUBILACION')) causalSugerida = 'Reconocimiento de pensión de jubilación o vejez';
        else if (modalidad === 'LIBRE_NOMBRAMIENTO') causalSugerida = 'Declaración de insubsistencia del nombramiento discrecional';
        else causalSugerida = 'Aceptación de renuncia regularmente presentada';
      }

      const nuevoCaso: CasoFlujoFuncionario = {
        id: nuevoId,
        tipo_proceso: tipoProceso,
        modalidad: modalidad,
        id_plaza: idPlazaDetectada,
        servidor_nombre: item.nombre_completo,
        servidor_cedula: item.cedula,
        cargo: item.cargo,
        grado: item.grado,
        dependencia: item.dependencia || 'SECRETARÍA JURÍDICA DISTRITAL',
        causal: causalSugerida,
        fecha_inicio_tramite: new Date().toISOString().split('T')[0],
        fecha_efectiva: item.fecha_evento || undefined,
        acto_administrativo: item.numero_acto_nombramiento ? `${item.acto_nombramiento || 'Resolución'} No. ${item.numero_acto_nombramiento}` : undefined,
        etapas: etapasLimpias,
        etapa_activa_id: etapasLimpias[0]?.id,
        observaciones: `Trámite detectado automáticamente desde Archivo Planta PERNO (Cédula: ${item.cedula}). Creado el ${new Date().toLocaleDateString('es-CO')}.`,
      };

      const nuevosCasos = [nuevoCaso, ...totalCasosActuales];
      setTotalCasosActuales(nuevosCasos);

      // Guardar en storage seguro con tolerancia a cuota y backup en IndexedDB
      try {
        guardarCasosEnStorage(nuevosCasos);
        guardarCasoActivoEnStorage(nuevoId);
      } catch (storageErr) {
        console.warn('Advertencia al guardar en storage secundario:', storageErr);
      }

      // Actualizar el mapa de casos
      const key = `${String(item.cedula).trim()}_${tipoProceso}`;
      setCasosMap((prev) => ({
        ...prev,
        [key]: nuevoCaso,
      }));

      if (onTramiteCreado) {
        onTramiteCreado(nuevoCaso);
      }

      setToastInfo({
        visible: true,
        titulo: 'Trámite Creado Exitosamente',
        mensaje: `Se registró el trámite ${nuevoId} para ${item.nombre_completo} (${tipoProceso === 'VINCULACION' ? 'Vinculación' : 'Desvinculación'}).`,
        tipo: 'success',
      });
    } catch (e: any) {
      setToastInfo({
        visible: true,
        titulo: 'Error al Crear Trámite',
        mensaje: e.message || 'No fue posible registrar el caso.',
        tipo: 'warning',
      });
    } finally {
      setProcesandoCedula(null);
    }
  };

  // Agregar todos los pendientes visibles de la pestaña activa
  const handleAgregarTodosPendientes = () => {
    const pendientes = listaFiltrada.filter((i) => !casosMap[`${String(i.cedula).trim()}_${i.tipo_proceso}`]);
    if (pendientes.length === 0) {
      setToastInfo({
        visible: true,
        titulo: 'Sin Casos Pendientes',
        mensaje: 'No hay personas pendientes por registrar con los filtros actuales.',
        tipo: 'info',
      });
      return;
    }

    setProcesandoLote(true);
    try {
      let casosAcumulados = [...totalCasosActuales];
      const nuevosParaMap: { [k: string]: CasoFlujoFuncionario } = {};

      pendientes.forEach((item, idx) => {
        const modalidad = deducirModalidad(item);
        const tipoProceso = item.tipo_proceso;

        const numMax = casosAcumulados.reduce((max, c) => {
          const match = c.id.match(/TR-\d{4}-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
          }
          return max;
        }, casosAcumulados.length);

        const nuevoId = `TR-${new Date().getFullYear()}-${String(numMax + 1).padStart(3, '0')}`;
        const etapasBase = generarEtapasParaCaso(tipoProceso, modalidad);
        const etapasLimpias = limpiarEtapasParaNuevoTramite(etapasBase);

        const nuevoCaso: CasoFlujoFuncionario = {
          id: nuevoId,
          tipo_proceso: tipoProceso,
          modalidad: modalidad,
          servidor_nombre: item.nombre_completo,
          servidor_cedula: item.cedula,
          cargo: item.cargo,
          grado: item.grado,
          dependencia: item.dependencia || 'SECRETARÍA JURÍDICA DISTRITAL',
          fecha_inicio_tramite: new Date().toISOString().split('T')[0],
          fecha_efectiva: item.fecha_evento || undefined,
          etapas: etapasLimpias,
          etapa_activa_id: etapasLimpias[0]?.id,
          observaciones: `Carga masiva detectada desde Archivo Planta PERNO. Cédula: ${item.cedula}.`,
        };

        casosAcumulados = [nuevoCaso, ...casosAcumulados];
        nuevosParaMap[`${String(item.cedula).trim()}_${tipoProceso}`] = nuevoCaso;
      });

      setTotalCasosActuales(casosAcumulados);
      setCasosMap((prev) => ({ ...prev, ...nuevosParaMap }));

      // Guardar en storage seguro con tolerancia a cuota y backup en IndexedDB
      try {
        guardarCasosEnStorage(casosAcumulados);
      } catch (storageErr) {
        console.warn('Advertencia al guardar lote en storage secundario:', storageErr);
      }

      setToastInfo({
        visible: true,
        titulo: 'Carga por Lote Completada',
        mensaje: `Se crearon ${pendientes.length} nuevos trámites institucionales con sus etapas reglamentarias correspondientes.`,
        tipo: 'success',
      });
    } catch (e: any) {
      setToastInfo({
        visible: true,
        titulo: 'Error en Lote',
        mensaje: e.message || 'Error procesando lote de trámites.',
        tipo: 'warning',
      });
    } finally {
      setProcesandoLote(false);
    }
  };

  // Navegar al módulo de Vinculaciones & Desvinculaciones
  const handleIrAVinculaciones = (casoId?: string) => {
    if (casoId) {
      guardarCasoActivoEnStorage(casoId);
    }
    onClose();
    router.push('/rrhh/vinculaciones-desvinculaciones');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
            borderRadius: 14,
            width: '100%',
            maxWidth: 1040,
            maxHeight: '94%',
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: THEME.slate200,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
          }}
        >
          {/* Cabecera del Modal */}
          <View
            style={{
              backgroundColor: THEME.marca900,
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1, paddingRight: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text
                  style={{
                    color: 'rgba(214, 228, 244, 0.75)',
                    fontSize: 11,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Sincronización PERNO vs Trámites de Talento Humano
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: THEME.white, fontSize: 10.5, fontWeight: '700' }}>
                    Cruce por Cédula de Ciudadanía
                  </Text>
                </View>
              </View>

              <Text style={{ color: THEME.white, fontSize: 18, fontWeight: '700', marginTop: 4 }}>
                Novedades Detectadas en Archivo Planta PERNO
              </Text>
              <Text style={{ color: THEME.slate300, fontSize: 12, marginTop: 2 }}>
                Analiza ingresos y retiros en los últimos 6 meses para agregar automáticamente al módulo de Vinculaciones & Desvinculaciones.
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                padding: 6,
                borderRadius: 6,
                backgroundColor: pressed ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              })}
            >
              <Ionicons name="close" size={22} color={THEME.white} />
            </Pressable>
          </View>

          {/* Sub-cabecera: Tabs principales (Vinculaciones vs Desvinculaciones) */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: THEME.slate100,
              borderBottomWidth: 1,
              borderBottomColor: THEME.slate200,
              paddingHorizontal: 16,
              paddingTop: 10,
              gap: 12,
            }}
          >
            {/* Tab Vinculaciones */}
            <Pressable
              onPress={() => setTabActiva('VINCULACION')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderBottomWidth: 3,
                borderBottomColor: tabActiva === 'VINCULACION' ? THEME.emeraldText : 'transparent',
              }}
            >
              <Ionicons
                name="person-add"
                size={17}
                color={tabActiva === 'VINCULACION' ? THEME.emeraldText : THEME.slate500}
              />
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: tabActiva === 'VINCULACION' ? '800' : '600',
                  color: tabActiva === 'VINCULACION' ? THEME.emeraldText : THEME.slate600,
                }}
              >
                Nuevas Vinculaciones (Ingresos)
              </Text>
              <View
                style={{
                  backgroundColor: tabActiva === 'VINCULACION' ? THEME.emeraldBg : THEME.slate200,
                  borderColor: tabActiva === 'VINCULACION' ? THEME.emeraldBorder : 'transparent',
                  borderWidth: 1,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: tabActiva === 'VINCULACION' ? THEME.emeraldText : THEME.slate600,
                  }}
                >
                  {metricas.vinculacion.pendientes6m} pendientes / {metricas.vinculacion.total6m} (6m)
                </Text>
              </View>
            </Pressable>

            {/* Tab Desvinculaciones */}
            <Pressable
              onPress={() => setTabActiva('DESVINCULACION')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderBottomWidth: 3,
                borderBottomColor: tabActiva === 'DESVINCULACION' ? THEME.roseText : 'transparent',
              }}
            >
              <Ionicons
                name="person-remove"
                size={17}
                color={tabActiva === 'DESVINCULACION' ? THEME.roseText : THEME.slate500}
              />
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: tabActiva === 'DESVINCULACION' ? '800' : '600',
                  color: tabActiva === 'DESVINCULACION' ? THEME.roseText : THEME.slate600,
                }}
              >
                Nuevas Desvinculaciones (Retiros)
              </Text>
              <View
                style={{
                  backgroundColor: tabActiva === 'DESVINCULACION' ? THEME.roseBg : THEME.slate200,
                  borderColor: tabActiva === 'DESVINCULACION' ? THEME.roseBorder : 'transparent',
                  borderWidth: 1,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: tabActiva === 'DESVINCULACION' ? THEME.roseText : THEME.slate600,
                  }}
                >
                  {metricas.desvinculacion.pendientes6m} pendientes / {metricas.desvinculacion.total6m} (6m)
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Barra de Filtros y Búsqueda */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: THEME.white,
              borderBottomWidth: 1,
              borderBottomColor: THEME.slate200,
              flexDirection: Platform.OS === 'web' ? 'row' : 'column',
              gap: 12,
              alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
              justifyContent: 'space-between',
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
                paddingHorizontal: 10,
                height: 38,
              }}
            >
              <Ionicons name="search" size={16} color={THEME.slate400} />
              <TextInput
                placeholder="Buscar por cédula, nombre, cargo o dependencia..."
                placeholderTextColor={THEME.slate400}
                value={busqueda}
                onChangeText={setBusqueda}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontSize: 12.5,
                  color: THEME.slate800,
                  height: '100%',
                }}
              />
              {busqueda.length > 0 && (
                <Pressable onPress={() => setBusqueda('')}>
                  <Ionicons name="close-circle" size={16} color={THEME.slate400} />
                </Pressable>
              )}
            </View>

            {/* Selectores de Período y Estado */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Ventana de tiempo */}
              <View style={{ flexDirection: 'row', backgroundColor: THEME.slate100, borderRadius: 8, padding: 3 }}>
                {[
                  { id: '6m', label: 'Últimos 6 Meses' },
                  { id: '12m', label: '12 Meses' },
                  { id: 'todos', label: 'Histórico' },
                ].map((item) => {
                  const sel = filtroPeriodo === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setFiltroPeriodo(item.id as any)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: sel ? THEME.marca800 : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: sel ? '700' : '500',
                          color: sel ? THEME.white : THEME.slate600,
                        }}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Filtro de Estado */}
              <View style={{ flexDirection: 'row', backgroundColor: THEME.slate100, borderRadius: 8, padding: 3 }}>
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'PENDIENTES', label: 'Pendientes' },
                  { id: 'REGISTRADOS', label: 'Registrados' },
                ].map((item) => {
                  const sel = filtroEstado === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setFiltroEstado(item.id as any)}
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: sel ? THEME.slate800 : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: sel ? '700' : '500',
                          color: sel ? THEME.white : THEME.slate600,
                        }}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Botón de Agregar Lote */}
              <Pressable
                onPress={handleAgregarTodosPendientes}
                disabled={procesandoLote}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: pressed ? THEME.marca900 : THEME.marca800,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  opacity: procesandoLote ? 0.7 : 1,
                })}
              >
                <Ionicons name="sparkles" size={14} color={THEME.white} />
                <Text style={{ color: THEME.white, fontSize: 11.5, fontWeight: '700' }}>
                  {procesandoLote ? 'Agregando...' : 'Agregar Pendientes'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Lista de Registros */}
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {listaFiltrada.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8 }}>
                <Ionicons name="checkmark-done-circle-outline" size={44} color={THEME.slate300} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate600 }}>
                  No se encontraron novedades con los filtros seleccionados
                </Text>
                <Text style={{ fontSize: 12, color: THEME.slate400, textAlign: 'center', maxWidth: 440 }}>
                  {filtroPeriodo === '6m'
                    ? 'No hay registros en la ventana de los últimos 6 meses pendientes por gestionar, o todos ya se encuentran incorporados a los trámites.'
                    : 'Prueba cambiando el período a Histórico o borrando el término de búsqueda.'}
                </Text>
              </View>
            ) : (
              listaFiltrada.map((item) => {
                const key = `${String(item.cedula).trim()}_${item.tipo_proceso}`;
                const casoExistente = casosMap[key];
                const estaEnProceso = procesandoCedula === item.cedula;
                const modalidadDeducida = deducirModalidad(item);

                return (
                  <View
                    key={`${item.cedula}_${item.tipo_proceso}`}
                    style={{
                      backgroundColor: casoExistente ? THEME.slate50 : THEME.white,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: casoExistente ? THEME.slate200 : tabActiva === 'VINCULACION' ? THEME.emeraldBorder : THEME.roseBorder,
                      padding: 14,
                      flexDirection: Platform.OS === 'web' ? 'row' : 'column',
                      alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    {/* Información Principal del Servidor */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* Insignia de Estado */}
                        {casoExistente ? (
                          <View
                            style={{
                              backgroundColor: THEME.slate200,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 4,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Ionicons name="checkmark-circle" size={13} color={THEME.slate700} />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.slate800 }}>
                              Trámite {casoExistente.id}
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={{
                              backgroundColor: tabActiva === 'VINCULACION' ? THEME.emeraldBg : THEME.roseBg,
                              borderColor: tabActiva === 'VINCULACION' ? THEME.emeraldBorder : THEME.roseBorder,
                              borderWidth: 1,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 4,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Ionicons
                              name="flash"
                              size={12}
                              color={tabActiva === 'VINCULACION' ? THEME.emeraldText : THEME.roseText}
                            />
                            <Text
                              style={{
                                fontSize: 10.5,
                                fontWeight: '800',
                                color: tabActiva === 'VINCULACION' ? THEME.emeraldText : THEME.roseText,
                              }}
                            >
                              Novedad Pendiente
                            </Text>
                          </View>
                        )}

                        {/* Cédula */}
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca800 }}>
                          C.C. {item.cedula}
                        </Text>

                        {/* Modalidad Legal */}
                        <View style={{ backgroundColor: THEME.indigoBg, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.indigoText }}>
                            {modalidadDeducida.replace(/_/g, ' ')}
                          </Text>
                        </View>

                        {item.posicion_planta ? (
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                            Plaza PERNO: #{item.posicion_planta}
                          </Text>
                        ) : null}
                      </View>

                      {/* Nombre y Cargo */}
                      <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.slate900, marginTop: 2 }}>
                        {item.nombre_completo}
                      </Text>

                      <Text style={{ fontSize: 12, color: THEME.slate700 }}>
                        <Text style={{ fontWeight: '700' }}>Cargo:</Text> {item.cargo}
                        {item.grado ? ` • Grado ${item.grado}` : ''} •{' '}
                        <Text style={{ fontWeight: '700' }}>Dependencia:</Text> {item.dependencia}
                      </Text>

                      {/* Fecha y Antigüedad */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        <Ionicons name="calendar-outline" size={13} color={THEME.slate500} />
                        <Text style={{ fontSize: 11.5, color: THEME.slate600 }}>
                          {item.tipo_proceso === 'VINCULACION' ? 'Fecha de Ingreso / Posesión:' : 'Fecha de Retiro:'}{' '}
                          <Text style={{ fontWeight: '700' }}>{item.fecha_evento || 'No registrada en archivo'}</Text>
                        </Text>

                        {item.dias_evento !== null && item.dias_evento !== undefined ? (
                          <View
                            style={{
                              backgroundColor: item.es_ultimos_6_meses ? '#FEF3C7' : THEME.slate100,
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10.5,
                                fontWeight: '700',
                                color: item.es_ultimos_6_meses ? '#92400E' : THEME.slate600,
                              }}
                            >
                              {item.dias_evento < 0
                                ? `Programado en ${Math.abs(item.dias_evento)} días`
                                : `Hace ${item.dias_evento} días`}
                              {item.es_ultimos_6_meses ? ' (Dentro de 6 meses)' : ''}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Acciones */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {casoExistente ? (
                        <Pressable
                          onPress={() => handleIrAVinculaciones(casoExistente.id)}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: pressed ? THEME.slate200 : THEME.slate100,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: THEME.slate300,
                          })}
                        >
                          <Ionicons name="open-outline" size={14} color={THEME.slate800} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.slate800 }}>
                            Ver Trámite
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => handleCrearTramite(item)}
                          disabled={estaEnProceso}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: pressed
                              ? THEME.marca900
                              : tabActiva === 'VINCULACION'
                              ? THEME.emeraldText
                              : THEME.roseText,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 6,
                            opacity: estaEnProceso ? 0.6 : 1,
                          })}
                        >
                          <Ionicons
                            name={estaEnProceso ? 'hourglass-outline' : 'add-circle'}
                            size={15}
                            color={THEME.white}
                          />
                          <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '700' }}>
                            {estaEnProceso
                              ? 'Creando...'
                              : tabActiva === 'VINCULACION'
                              ? 'Crear Trámite de Vinculación'
                              : 'Crear Trámite de Desvinculación'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Pie del Modal */}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="information-circle" size={16} color={THEME.slate500} />
              <Text style={{ fontSize: 11.5, color: THEME.slate600 }}>
                Mostrando {listaFiltrada.length} personas registradas en PERNO. Cruce directo por documento de identidad.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={() => handleIrAVinculaciones()}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: pressed ? '#EEF2FF' : '#E0E7FF',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#C7D2FE',
                })}
              >
                <Text style={{ color: THEME.indigoText, fontSize: 12, fontWeight: '700' }}>
                  Ir a Vinculaciones & Desvinculaciones ➔
                </Text>
              </Pressable>

              <Pressable
                onPress={onClose}
                style={{
                  backgroundColor: THEME.marca800,
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '700' }}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Modal de Alerta / Notificación Interno (Regla: no alerts) */}
        {toastInfo.visible && (
          <Modal transparent animationType="fade" visible={toastInfo.visible}>
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 16,
              }}
            >
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  padding: 20,
                  maxWidth: 420,
                  width: '100%',
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name={
                      toastInfo.tipo === 'success'
                        ? 'checkmark-circle'
                        : toastInfo.tipo === 'warning'
                        ? 'alert-circle'
                        : 'information-circle'
                    }
                    size={22}
                    color={
                      toastInfo.tipo === 'success'
                        ? THEME.emeraldText
                        : toastInfo.tipo === 'warning'
                        ? THEME.amberText
                        : THEME.marca800
                    }
                  />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900 }}>
                    {toastInfo.titulo}
                  </Text>
                </View>

                <Text style={{ fontSize: 13, color: THEME.slate700, lineHeight: 18 }}>
                  {toastInfo.mensaje}
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                  <Pressable
                    onPress={() => setToastInfo((prev) => ({ ...prev, visible: false }))}
                    style={{
                      backgroundColor: THEME.marca800,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '700' }}>Entendido</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}
