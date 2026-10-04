import React, { useMemo, useState } from 'react';
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

const COLORS = {
  primary: '#BE1F2D',
  primaryHover: '#9B1623',
  darkBg: '#0B1724',
  cardBg: '#13283B',
  cardBgHover: '#1B354D',
  cardBgLight: '#18324A',
  border: 'rgba(255, 255, 255, 0.12)',
  borderLight: 'rgba(255, 255, 255, 0.08)',
  textLight: '#F8FAFC',
  textMuted: '#94A3B8',
  blueAccent: '#38BDF8',
  amberAccent: '#F59E0B',
  purpleAccent: '#A78BFA',
  purpleDark: '#7C3AED',
  emeraldAccent: '#10B981',
  danger: '#EF4444',
};

// Causales legales de retiro según el artículo 41 de la Ley 909 de 2004
const CAUSALES_RETIRO = [
  { id: 'RENUNCIA', label: 'Renuncia regularmente aceptada (Art. 41 lit. a)' },
  { id: 'PENSION', label: 'Obtención de pensión de vejez o invalidez (Art. 41 lit. b)' },
  { id: 'INSUBSISTENCIA_LNR', label: 'Declaratoria de insubsistencia - Libre Nombramiento y Remoción (Art. 41 lit. c)' },
  { id: 'INSUBSISTENCIA_PROV', label: 'Revocatoria / Insubsistencia de Nombramiento Provisional' },
  { id: 'DESTITUCION', label: 'Destitución como consecuencia de proceso disciplinario (Art. 41 lit. d)' },
  { id: 'EVALUACION_NO_SATISFACTORIA', label: 'Declaratoria de insubsistencia por Calificación No Satisfactoria (Art. 41 lit. e)' },
  { id: 'SUPRESION_EMPLEO', label: 'Supresión del empleo de carrera con indemnización o reincorporación (Art. 41 lit. f)' },
  { id: 'EDAD_RETIRO_FORZOSO', label: 'Edad de retiro forzoso - 70 años (Ley 1821 de 2016 / Art. 41 lit. g)' },
  { id: 'ABANDONO_CARGO', label: 'Declaratoria de vacancia del empleo por abandono del mismo (Art. 41 lit. i)' },
  { id: 'MUERTE', label: 'Muerte del servidor (Art. 41 lit. n)' },
];

interface CasoDesvinculacion {
  id: string;
  id_plaza: number;
  servidor_nombre: string;
  servidor_cedula: string;
  cargo: string;
  codigo: string;
  grado: string;
  dependencia: string;
  causal_retiro: string;
  acto_administrativo: string;
  fecha_acto: string;
  fecha_efectiva_retiro: string;
  // Estado ante entidades de control
  reportado_simo: boolean;
  fecha_reporte_simo?: string;
  radicado_simo?: string;
  consultado_bnle: boolean;
  tiene_lista_bnle?: boolean;
  solicitud_uso_bnle?: string;
  paz_y_salvo_completo: boolean;
  notificado_nomina: boolean;
  reportado_sideap: boolean;
  observaciones?: string;
}

const CASOS_INICIALES: CasoDesvinculacion[] = [
  {
    id: 'DESV-2026-001',
    id_plaza: 14,
    servidor_nombre: 'ZULMA ANDREA MORENO DIAZ',
    servidor_cedula: '52899412',
    cargo: 'PROFESIONAL ESPECIALIZADO',
    codigo: '222',
    grado: '24',
    dependencia: 'DIRECCIÓN DISTRITAL DE POLÍTICA JURÍDICA',
    causal_retiro: 'Renuncia regularmente aceptada (Art. 41 lit. a)',
    acto_administrativo: 'Resolución No. 042 de 2026',
    fecha_acto: '2026-03-20',
    fecha_efectiva_retiro: '2026-03-31',
    reportado_simo: true,
    fecha_reporte_simo: '2026-03-24',
    radicado_simo: 'SIMO-VAC-2026-88194',
    consultado_bnle: true,
    tiene_lista_bnle: false,
    solicitud_uso_bnle: 'No existe lista vigente. Autorizado encargo preferente.',
    paz_y_salvo_completo: true,
    notificado_nomina: true,
    reportado_sideap: true,
  },
  {
    id: 'DESV-2026-002',
    id_plaza: 58,
    servidor_nombre: 'CARLOS ALBERTO GIRALDO VELEZ',
    servidor_cedula: '79841203',
    cargo: 'PROFESIONAL UNIVERSITARIO',
    codigo: '219',
    grado: '18',
    dependencia: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS',
    causal_retiro: 'Obtención de pensión de vejez o invalidez (Art. 41 lit. b)',
    acto_administrativo: 'Resolución No. 051 de 2026',
    fecha_acto: '2026-04-01',
    fecha_efectiva_retiro: '2026-04-15',
    reportado_simo: false,
    consultado_bnle: false,
    paz_y_salvo_completo: false,
    notificado_nomina: true,
    reportado_sideap: false,
    observaciones: 'Pendiente entrega de inventario y paz y salvo de la oficina de TIC.',
  },
];

export default function DesvinculacionesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isTablet = width >= 640;

  // Pestañas del módulo
  const [tabActiva, setTabActiva] = useState<'casos' | 'matriz_normativa' | 'paz_salvo'>('casos');

  // Estado de casos
  const [casos, setCasos] = useState<CasoDesvinculacion[]>(CASOS_INICIALES);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstadoSimo, setFiltroEstadoSimo] = useState<'TODOS' | 'REPORTADO' | 'PENDIENTE'>('TODOS');

  // Caso seleccionado para modal de detalle
  const [casoDetalle, setCasoDetalle] = useState<CasoDesvinculacion | null>(null);

  // Modal para registrar nueva desvinculación
  const [modalRegistroVisible, setModalRegistroVisible] = useState(false);
  const [plazaSeleccionadaId, setPlazaSeleccionadaId] = useState<number | null>(null);
  const [causalSeleccionada, setCausalSeleccionada] = useState(CAUSALES_RETIRO[0].label);
  const [actoAdminInput, setActoAdminInput] = useState('');
  const [fechaActoInput, setFechaActoInput] = useState('');
  const [fechaRetiroInput, setFechaRetiroInput] = useState('');
  const [observacionesInput, setObservacionesInput] = useState('');

  // Modal Informativo general (Regla: Modals en vez de alerts)
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

  // Filtrado de casos
  const casosFiltrados = useMemo(() => {
    let result = casos;
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.servidor_nombre.toLowerCase().includes(q) ||
          c.servidor_cedula.includes(q) ||
          c.cargo.toLowerCase().includes(q) ||
          c.dependencia.toLowerCase().includes(q)
      );
    }
    if (filtroEstadoSimo === 'REPORTADO') {
      result = result.filter((c) => c.reportado_simo);
    } else if (filtroEstadoSimo === 'PENDIENTE') {
      result = result.filter((c) => !c.reportado_simo);
    }
    return result;
  }, [casos, busqueda, filtroEstadoSimo]);

  // Lista de servidores activos desde plantaMockData para el selector
  const servidoresPlanta = useMemo(() => {
    return (mockPlazasData as any[]).filter(
      (p) => p.titular_nombre && !p.titular_nombre.includes('VACANTE')
    );
  }, []);

  const handleCrearDesvinculacion = () => {
    if (!plazaSeleccionadaId) {
      mostrarModal('Faltan Datos', 'Debe seleccionar el servidor público a desvincular.', 'warning');
      return;
    }
    if (!actoAdminInput.trim() || !fechaRetiroInput.trim()) {
      mostrarModal('Faltan Datos', 'Ingrese el número del acto administrativo y la fecha efectiva de retiro.', 'warning');
      return;
    }

    const plaza = servidoresPlanta.find((p) => p.id_plaza === plazaSeleccionadaId);
    if (!plaza) return;

    const nuevoCaso: CasoDesvinculacion = {
      id: `DESV-${new Date().getFullYear()}-${String(casos.length + 1).padStart(3, '0')}`,
      id_plaza: plaza.id_plaza,
      servidor_nombre: plaza.titular_nombre,
      servidor_cedula: plaza.titular_cedula,
      cargo: plaza.cargo,
      codigo: plaza.codigo,
      grado: plaza.grado,
      dependencia: plaza.dependencia_cargo,
      causal_retiro: causalSeleccionada,
      acto_administrativo: actoAdminInput.trim(),
      fecha_acto: fechaActoInput.trim() || new Date().toISOString().split('T')[0],
      fecha_efectiva_retiro: fechaRetiroInput.trim(),
      reportado_simo: false,
      consultado_bnle: false,
      paz_y_salvo_completo: false,
      notificado_nomina: true,
      reportado_sideap: false,
      observaciones: observacionesInput.trim(),
    };

    setCasos([nuevoCaso, ...casos]);
    setModalRegistroVisible(false);
    // Limpiar formulario
    setPlazaSeleccionadaId(null);
    setActoAdminInput('');
    setFechaActoInput('');
    setFechaRetiroInput('');
    setObservacionesInput('');

    mostrarModal(
      'Desvinculación Registrada Exitosamente',
      `Se creó el caso ${nuevoCaso.id}. Recuerde que cuenta con cinco (5) días hábiles según la Circular Externa 011 de 2021 de la CNSC para reportar la vacancia definitiva en SIMO 4.4 y consultar el BNLE.`,
      'success'
    );
  };

  const alternarCheckSimo = (id: string) => {
    setCasos(
      casos.map((c) => {
        if (c.id === id) {
          const nuevoEstado = !c.reportado_simo;
          return {
            ...c,
            reportado_simo: nuevoEstado,
            fecha_reporte_simo: nuevoEstado ? new Date().toISOString().split('T')[0] : undefined,
            radicado_simo: nuevoEstado ? `SIMO-VAC-${Date.now().toString().slice(-6)}` : undefined,
          };
        }
        return c;
      })
    );
  };

  const alternarCheckBnle = (id: string) => {
    setCasos(
      casos.map((c) => {
        if (c.id === id) {
          const nuevoEstado = !c.consultado_bnle;
          return {
            ...c,
            consultado_bnle: nuevoEstado,
            tiene_lista_bnle: false,
            solicitud_uso_bnle: nuevoEstado ? 'Consultado en SIMO 4.4 - BNLE (Sin lista vigente)' : undefined,
          };
        }
        return c;
      })
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.darkBg }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Cabecera Superior Institucional */}
        <View
          style={{
            backgroundColor: '#0F2133',
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

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: 'rgba(167, 139, 250, 0.18)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(167, 139, 250, 0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="exit" size={24} color="#A78BFA" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.3 }}>
                    Desvinculaciones y Reportes CNSC
                  </Text>
                  <View
                    style={{
                      backgroundColor: 'rgba(124, 58, 237, 0.2)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#7C3AED',
                    }}
                  >
                    <Text style={{ color: '#C4B5FD', fontSize: 10, fontWeight: '800' }}>
                      SIMO 4.4 • BNLE
                    </Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                  Control de Retiros, Paz y Salvo y Obligaciones Normativas ante la CNSC y SIDEAP
                </Text>
              </View>
            </View>
          </View>

          {/* Botones de acción rápida */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => setModalRegistroVisible(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: pressed ? '#6D28D9' : COLORS.purpleDark,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.35)',
              })}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Registrar Retiro / Desvinculación
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Barra de Pestañas */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#0C1B2A',
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            paddingHorizontal: isDesktop ? 36 : 18,
          }}
        >
          <Pressable
            onPress={() => setTabActiva('casos')}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 3,
              borderBottomColor: tabActiva === 'casos' ? '#A78BFA' : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="people"
              size={18}
              color={tabActiva === 'casos' ? '#A78BFA' : COLORS.textMuted}
            />
            <Text
              style={{
                color: tabActiva === 'casos' ? '#FFFFFF' : COLORS.textMuted,
                fontWeight: tabActiva === 'casos' ? '800' : '600',
                fontSize: 14,
              }}
            >
              Casos de Retiro ({casos.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTabActiva('matriz_normativa')}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 3,
              borderBottomColor: tabActiva === 'matriz_normativa' ? '#A78BFA' : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="book"
              size={18}
              color={tabActiva === 'matriz_normativa' ? '#A78BFA' : COLORS.textMuted}
            />
            <Text
              style={{
                color: tabActiva === 'matriz_normativa' ? '#FFFFFF' : COLORS.textMuted,
                fontWeight: tabActiva === 'matriz_normativa' ? '800' : '600',
                fontSize: 14,
              }}
            >
              Matriz Normativa CNSC, SIMO 4.4 & BNLE
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTabActiva('paz_salvo')}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 3,
              borderBottomColor: tabActiva === 'paz_salvo' ? '#A78BFA' : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="checkmark-done-circle"
              size={18}
              color={tabActiva === 'paz_salvo' ? '#A78BFA' : COLORS.textMuted}
            />
            <Text
              style={{
                color: tabActiva === 'paz_salvo' ? '#FFFFFF' : COLORS.textMuted,
                fontWeight: tabActiva === 'paz_salvo' ? '800' : '600',
                fontSize: 14,
              }}
            >
              Paz y Salvo & Entrega de Puesto
            </Text>
          </Pressable>
        </View>

        {/* CONTENIDO SEGÚN PESTAÑA */}

        {/* PESTAÑA 1: CASOS DE RETIRO Y CHECKLIST CNSC */}
        {tabActiva === 'casos' && (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: isDesktop ? 36 : 18,
              paddingTop: 16,
              paddingBottom: 40,
              gap: 16,
            }}
          >
            {/* Banner de alerta de plazos legales CNSC */}
            <View
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 1.5,
                borderColor: 'rgba(245, 158, 11, 0.35)',
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
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="time" size={22} color={COLORS.amberAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FCD34D', fontSize: 13, fontWeight: '800' }}>
                    OBLIGACIÓN LEGAL INMEDIATA: CIRCULAR EXTERNA 011 DE 2021 (CNSC)
                  </Text>
                  <Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 2, lineHeight: 18 }}>
                    Toda vacancia definitiva generada por desvinculación debe ser reportada en el aplicativo{' '}
                    <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>SIMO 4.4</Text> dentro de los{' '}
                    <Text style={{ color: '#FCD34D', fontWeight: '800' }}>cinco (5) días hábiles siguientes</Text>{' '}
                    y consultar el Banco Nacional de Listas de Elegibles (<Text style={{ color: '#FFFFFF', fontWeight: '800' }}>BNLE</Text>).
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setTabActiva('matriz_normativa')}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                  Ver Normatividad
                </Text>
              </Pressable>
            </View>

            {/* Barra de Búsqueda y Filtros */}
            <View
              style={{
                backgroundColor: COLORS.cardBg,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                flexDirection: isTablet ? 'row' : 'column',
                justifyContent: 'space-between',
                alignItems: isTablet ? 'center' : 'stretch',
                gap: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#0C1B2A',
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
                  placeholder="Buscar por funcionario, cédula, cargo o dependencia..."
                  placeholderTextColor={COLORS.textMuted}
                  style={{
                    flex: 1,
                    color: '#FFFFFF',
                    paddingVertical: 9,
                    paddingHorizontal: 8,
                    fontSize: 13,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>SIMO:</Text>
                {(['TODOS', 'REPORTADO', 'PENDIENTE'] as const).map((filtro) => {
                  const sel = filtroEstadoSimo === filtro;
                  return (
                    <Pressable
                      key={filtro}
                      onPress={() => setFiltroEstadoSimo(filtro)}
                      style={{
                        backgroundColor: sel ? '#7C3AED' : 'rgba(255, 255, 255, 0.05)',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: sel ? '#7C3AED' : COLORS.border,
                      }}
                    >
                      <Text
                        style={{
                          color: sel ? '#FFFFFF' : COLORS.textMuted,
                          fontSize: 11,
                          fontWeight: sel ? '800' : '600',
                        }}
                      >
                        {filtro}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Listado de Casos de Retiro */}
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
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 12 }}>
                  No se encontraron casos de desvinculación
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>
                  Utilice el botón "Registrar Retiro / Desvinculación" para crear un nuevo trámite.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {casosFiltrados.map((caso) => {
                  return (
                    <View
                      key={caso.id}
                      style={{
                        backgroundColor: COLORS.cardBg,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: caso.reportado_simo ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.45)',
                        padding: 18,
                        gap: 14,
                      }}
                    >
                      {/* Cabecera del caso */}
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <View style={{ gap: 2, flex: 1, minWidth: 260 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View
                              style={{
                                backgroundColor: 'rgba(167, 139, 250, 0.16)',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ color: '#C4B5FD', fontSize: 11, fontWeight: '800' }}>
                                CASO {caso.id} • PLAZA #{caso.id_plaza}
                              </Text>
                            </View>
                            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                              Retiro efectivo: <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{caso.fecha_efectiva_retiro}</Text>
                            </Text>
                          </View>
                          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginTop: 4 }}>
                            {caso.servidor_nombre}
                          </Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                            C.C. {caso.servidor_cedula} • {caso.cargo} ({caso.codigo}-{caso.grado})
                          </Text>
                          <Text style={{ color: '#93C5FD', fontSize: 12 }}>
                            {caso.dependencia}
                          </Text>
                        </View>

                        {/* Estado ante SIMO 4.4 */}
                        <View
                          style={{
                            backgroundColor: caso.reportado_simo
                              ? 'rgba(16, 185, 129, 0.16)'
                              : 'rgba(245, 158, 11, 0.16)',
                            borderWidth: 1,
                            borderColor: caso.reportado_simo ? '#10B981' : '#F59E0B',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Ionicons
                            name={caso.reportado_simo ? 'checkmark-circle' : 'alert-circle'}
                            size={16}
                            color={caso.reportado_simo ? '#10B981' : '#F59E0B'}
                          />
                          <Text
                            style={{
                              color: caso.reportado_simo ? '#34D399' : '#FCD34D',
                              fontSize: 11.5,
                              fontWeight: '800',
                            }}
                          >
                            {caso.reportado_simo ? 'REPORTADO EN SIMO 4.4' : 'PENDIENTE SIMO 4.4 (5 DÍAS)'}
                          </Text>
                        </View>
                      </View>

                      {/* Causal y Acto Administrativo */}
                      <View
                        style={{
                          backgroundColor: '#0C1B2A',
                          borderRadius: 8,
                          padding: 12,
                          borderLeftWidth: 3,
                          borderLeftColor: '#A78BFA',
                          gap: 4,
                        }}
                      >
                        <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                          CAUSAL DE RETIRO & ACTO ADMINISTRATIVO:
                        </Text>
                        <Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: '700' }}>
                          {caso.causal_retiro}
                        </Text>
                        <Text style={{ color: '#CBD5E1', fontSize: 12 }}>
                          Acto: {caso.acto_administrativo} • Fecha Expedición: {caso.fecha_acto}
                        </Text>
                      </View>

                      {/* Checklist de Trámites Obligatorios (SIMO, BNLE, Paz y Salvo, Nómina) */}
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 10,
                          paddingTop: 4,
                        }}
                      >
                        {/* Check 1: SIMO 4.4 */}
                        <Pressable
                          onPress={() => alternarCheckSimo(caso.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: caso.reportado_simo ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: caso.reportado_simo ? 'rgba(16, 185, 129, 0.4)' : COLORS.border,
                          }}
                        >
                          <Ionicons
                            name={caso.reportado_simo ? 'checkbox' : 'square-outline'}
                            size={16}
                            color={caso.reportado_simo ? '#10B981' : COLORS.textMuted}
                          />
                          <Text style={{ color: caso.reportado_simo ? '#FFFFFF' : COLORS.textMuted, fontSize: 11.5, fontWeight: '700' }}>
                            1. SIMO 4.4 Vacante
                          </Text>
                        </Pressable>

                        {/* Check 2: BNLE Listas Elegibles */}
                        <Pressable
                          onPress={() => alternarCheckBnle(caso.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: caso.consultado_bnle ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: caso.consultado_bnle ? 'rgba(56, 189, 248, 0.4)' : COLORS.border,
                          }}
                        >
                          <Ionicons
                            name={caso.consultado_bnle ? 'checkbox' : 'square-outline'}
                            size={16}
                            color={caso.consultado_bnle ? '#38BDF8' : COLORS.textMuted}
                          />
                          <Text style={{ color: caso.consultado_bnle ? '#FFFFFF' : COLORS.textMuted, fontSize: 11.5, fontWeight: '700' }}>
                            2. BNLE Consulta Lista
                          </Text>
                        </Pressable>

                        {/* Check 3: Paz y Salvo Interno */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: caso.paz_y_salvo_completo ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: caso.paz_y_salvo_completo ? 'rgba(16, 185, 129, 0.4)' : COLORS.border,
                          }}
                        >
                          <Ionicons
                            name={caso.paz_y_salvo_completo ? 'checkmark-circle' : 'time-outline'}
                            size={16}
                            color={caso.paz_y_salvo_completo ? '#10B981' : COLORS.amberAccent}
                          />
                          <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                            3. Paz y Salvo (TIC/Almacén/TH)
                          </Text>
                        </View>

                        {/* Check 4: Nómina Liquidación */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: 'rgba(16, 185, 129, 0.4)',
                          }}
                        >
                          <Ionicons name="cash-outline" size={16} color="#10B981" />
                          <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                            4. Nómina Notificada
                          </Text>
                        </View>
                      </View>

                      {/* Botón Ver detalle completo */}
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 }}>
                        <Pressable
                          onPress={() => setCasoDetalle(caso)}
                          style={({ pressed }) => ({
                            backgroundColor: pressed ? '#6D28D9' : 'rgba(124, 58, 237, 0.2)',
                            borderWidth: 1,
                            borderColor: '#7C3AED',
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          })}
                        >
                          <Ionicons name="newspaper-outline" size={15} color="#C4B5FD" />
                          <Text style={{ color: '#C4B5FD', fontSize: 12, fontWeight: '800' }}>
                            Ver Expediente & Reporte CNSC
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* PESTAÑA 2: MATRIZ NORMATIVA CNSC, SIMO 4.4 & BNLE */}
        {tabActiva === 'matriz_normativa' && (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: isDesktop ? 36 : 18,
              paddingTop: 16,
              paddingBottom: 40,
              gap: 20,
            }}
          >
            {/* Introducción General */}
            <View
              style={{
                backgroundColor: COLORS.cardBg,
                borderRadius: 14,
                padding: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="shield-checkmark" size={24} color="#A78BFA" />
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                  Marco Normativo Obligatorio para Ingresos y Desvinculaciones (Sector Público)
                </Text>
              </View>
              <Text style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 20 }}>
                La Comisión Nacional del Servicio Civil (CNSC) y el Departamento Administrativo de la Función Pública
                (DAFP) regulan estrictamente la trazabilidad de los cargos de carrera administrativa y libre
                nombramiento. A continuación se detallan las obligaciones normativas exactas:
              </Text>
            </View>

            {/* Cuadrícula Comparativa: ¿Qué se reporta ante un Ingreso vs ante una Desvinculación? */}
            <View
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: 18,
              }}
            >
              {/* Tarjeta 1: DESVINCULACIÓN (Retiro del Servicio) */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.cardBg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  padding: 20,
                  gap: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: 'rgba(239, 68, 68, 0.16)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="exit" size={22} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '800' }}>
                      PROCEDIMIENTO DE RETIRO
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                      Al Ocurrir una Desvinculación
                    </Text>
                  </View>
                </View>

                {/* Paso a paso normativo de Desvinculación */}
                <View style={{ gap: 10 }}>
                  <View style={{ backgroundColor: '#0C1B2A', padding: 12, borderRadius: 8, gap: 4 }}>
                    <Text style={{ color: '#FCD34D', fontSize: 12, fontWeight: '800' }}>
                      1. REPORTE EN SIMO 4.4 (Circular Externa 011 de 2021 CNSC)
                    </Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 18 }}>
                      • <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>Plazo legal:</Text> Máximo{' '}
                      <Text style={{ color: '#FCD34D', fontWeight: '800' }}>cinco (5) días hábiles</Text> a partir de
                      la ejecutoria del acto administrativo de retiro.{'\n'}
                      • <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>Datos:</Text> Causal de retiro (Art. 41 Ley 909/04), número y fecha del acto, fecha de retiro y archivo PDF.{'\n'}
                      • <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>Efecto:</Text> La plaza pasa a estado{' '}
                      <Text style={{ color: '#F87171', fontWeight: '700' }}>VACANTE DEFINITIVA</Text> en la OPEC.
                    </Text>
                  </View>

                  <View style={{ backgroundColor: '#0C1B2A', padding: 12, borderRadius: 8, gap: 4 }}>
                    <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '800' }}>
                      2. BANCO NACIONAL DE LISTAS DE ELEGIBLES - BNLE (Acuerdo 019 de 2024)
                    </Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 18 }}>
                      • <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>Obligatoriedad:</Text> Antes de encargar o
                      nombrar provisionalmente, la entidad debe verificar si en el BNLE existen listas vigentes para el
                      mismo empleo o equivalentes.{'\n'}
                      • Si existe lista, es <Text style={{ color: '#F87171', fontWeight: '800' }}>mandatorio</Text>{' '}
                      solicitar a la CNSC el uso de lista y no se puede proveer en provisionalidad.
                    </Text>
                  </View>

                  <View style={{ backgroundColor: '#0C1B2A', padding: 12, borderRadius: 8, gap: 4 }}>
                    <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '800' }}>
                      3. PAZ Y SALVO Y ACTA DE ENTREGA (Ley 1952 de 2019 / CGD)
                    </Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 18 }}>
                      • Entrega formal bajo inventario de computadores, expedientes y accesos a sistemas.{'\n'}
                      • Firma de no adeudar nada en TIC, Almacén, Archivo y Talento Humano.{'\n'}
                      • Reporte de novedad a Nómina para la liquidación definitiva de prestaciones.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Tarjeta 2: INGRESO (Posesión / Provisión) */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.cardBg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  padding: 20,
                  gap: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: 'rgba(16, 185, 129, 0.16)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="enter" size={22} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '800' }}>
                      PROCEDIMIENTO DE INGRESO
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                      Al Ocurrir un Ingreso o Provisión
                    </Text>
                  </View>
                </View>

                {/* Paso a paso normativo de Ingreso */}
                <View style={{ gap: 10 }}>
                  <View style={{ backgroundColor: '#0C1B2A', padding: 12, borderRadius: 8, gap: 4 }}>
                    <Text style={{ color: '#34D399', fontSize: 12, fontWeight: '800' }}>
                      1. REPORTE DE POSESIÓN EN SIMO 4.4 (CNSC)
                    </Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 18 }}>
                      • <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>Plazo:</Text> Dentro de los{' '}
                      <Text style={{ color: '#34D399', fontWeight: '800' }}>diez (10) días siguientes</Text> a la posesión del servidor.{'\n'}
                      • <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>Modalidad de Provisión:</Text> Concurso de méritos (Periodo de prueba), Encargo preferente (Ley 1960/19), o Nombramiento provisional.{'\n'}
                      • <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>Efecto:</Text> La plaza cambia a estado{' '}
                      <Text style={{ color: '#34D399', fontWeight: '700' }}>OCUPADO</Text> en la OPEC.
                    </Text>
                  </View>

                  <View style={{ backgroundColor: '#0C1B2A', padding: 12, borderRadius: 8, gap: 4 }}>
                    <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '800' }}>
                      2. DESCARGUE DE LISTA EN BNLE (Si fue por mérito)
                    </Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 18 }}>
                      • Si la persona fue nombrada mediante uso de Lista de Elegibles del BNLE, se reporta el Acta de
                      Posesión para que la CNSC descuente la vacante del Registro Público de Carrera Administrativa (RPCA).
                    </Text>
                  </View>

                  <View style={{ backgroundColor: '#0C1B2A', padding: 12, borderRadius: 8, gap: 4 }}>
                    <Text style={{ color: '#FCD34D', fontSize: 12, fontWeight: '800' }}>
                      3. DECLARACIÓN JURAMENTADA & SIDEAP (Ley 2013 de 2019)
                    </Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 18 }}>
                      • Publicación obligatoria en el aplicativo por la Integridad y SIDEAP Bogotá de la Declaración de
                      Bienes y Rentas y Registro de Conflicto de Intereses previa a la posesión.{'\n'}
                      • Afiliación inmediata a EPS, Pensión, ARL y Caja de Compensación Familiar.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Referencias Normativas Descargables / Citadas */}
            <View
              style={{
                backgroundColor: COLORS.cardBg,
                borderRadius: 14,
                padding: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 12,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                Artículos y Circulares Clave Aplicables
              </Text>
              <View style={{ gap: 8 }}>
                {[
                  {
                    norma: 'Circular Externa 011 de 2021 CNSC',
                    tema: 'Término de 5 días hábiles para el reporte obligatorio de vacancias definitivas en SIMO 4.4.',
                  },
                  {
                    norma: 'Acuerdo 019 de 2024 CNSC',
                    tema: 'Reglamentación del Banco Nacional de Listas de Elegibles (BNLE) y uso obligatorio de listas.',
                  },
                  {
                    norma: 'Ley 1960 de 2019 (Modifica Ley 909/04)',
                    tema: 'Derecho preferente al encargo para servidores de carrera con evaluación del desempeño Sobresaliente.',
                  },
                  {
                    norma: 'Decreto 1083 de 2015 (Art. 2.2.5.3.1)',
                    tema: 'Orden riguroso para la provisión transitoria de empleos de carrera en vacancia definitiva.',
                  },
                  {
                    norma: 'Ley 1952 de 2019 (Código General Disciplinario)',
                    tema: 'Deber del servidor saliente de hacer entrega formal de inventarios y paz y salvos.',
                  },
                ].map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: '#0C1B2A',
                      padding: 12,
                      borderRadius: 8,
                      borderLeftWidth: 3,
                      borderLeftColor: '#7C3AED',
                    }}
                  >
                    <Text style={{ color: '#C4B5FD', fontSize: 13, fontWeight: '800' }}>{item.norma}</Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 2 }}>{item.tema}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        )}

        {/* PESTAÑA 3: CIRCUITO DE PAZ Y SALVO DIGITAL */}
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
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                Circuito de Paz y Salvo Institucional (SJD)
              </Text>
              <Text style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 19 }}>
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
                    'Firma del formato de reintegro de elementos',
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
                    <Ionicons name={c.icono as any} size={22} color="#A78BFA" />
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800', flex: 1 }}>
                      {c.area}
                    </Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    {c.items.map((it, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginTop: 2 }} />
                        <Text style={{ color: '#CBD5E1', fontSize: 12, flex: 1, lineHeight: 17 }}>
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

        {/* MODAL REGISTRO DE DESVINCULACIÓN (Regla: Modals en vez de alerts) */}
        <Modal
          visible={modalRegistroVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalRegistroVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: '#112233',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                width: '100%',
                maxWidth: 680,
                maxHeight: '90%',
                overflow: 'hidden',
              }}
            >
              {/* Cabecera */}
              <View
                style={{
                  backgroundColor: '#0F2133',
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
                  <Text style={{ color: '#A78BFA', fontSize: 11, fontWeight: '800' }}>
                    TALENTO HUMANO • SECRETARÍA JURÍDICA DISTRITAL
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginTop: 2 }}>
                    Registrar Retiro / Desvinculación de Servidor
                  </Text>
                </View>
                <Pressable onPress={() => setModalRegistroVisible(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Formulario */}
              <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
                {/* 1. Seleccionar Servidor */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>
                    1. SELECCIONAR SERVIDOR DE LA PLANTA OFICIAL:
                  </Text>
                  <ScrollView
                    style={{
                      maxHeight: 140,
                      backgroundColor: '#0C1B2A',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                    nestedScrollEnabled
                  >
                    {servidoresPlanta.slice(0, 30).map((serv) => {
                      const sel = plazaSeleccionadaId === serv.id_plaza;
                      return (
                        <Pressable
                          key={serv.id_plaza}
                          onPress={() => setPlazaSeleccionadaId(serv.id_plaza)}
                          style={{
                            padding: 10,
                            backgroundColor: sel ? 'rgba(124, 58, 237, 0.25)' : 'transparent',
                            borderBottomWidth: 1,
                            borderBottomColor: 'rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          <Text style={{ color: sel ? '#C4B5FD' : '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                            {serv.titular_nombre} (C.C. {serv.titular_cedula})
                          </Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>
                            Plaza #{serv.id_plaza} • {serv.cargo} ({serv.codigo}-{serv.grado})
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 2. Causal de Retiro */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>
                    2. CAUSAL LEGAL DE RETIRO (Art. 41 Ley 909 de 2004):
                  </Text>
                  <ScrollView
                    style={{
                      maxHeight: 120,
                      backgroundColor: '#0C1B2A',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                    nestedScrollEnabled
                  >
                    {CAUSALES_RETIRO.map((c) => {
                      const sel = causalSeleccionada === c.label;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setCausalSeleccionada(c.label)}
                          style={{
                            padding: 9,
                            backgroundColor: sel ? 'rgba(124, 58, 237, 0.25)' : 'transparent',
                            borderBottomWidth: 1,
                            borderBottomColor: 'rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          <Text style={{ color: sel ? '#C4B5FD' : '#CBD5E1', fontSize: 12, fontWeight: sel ? '700' : '500' }}>
                            {c.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 3. Acto Administrativo y Fechas */}
                <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                      NÚMERO DE ACTO ADMINISTRATIVO:
                    </Text>
                    <TextInput
                      value={actoAdminInput}
                      onChangeText={setActoAdminInput}
                      placeholder="Ej: Resolución No. 064 de 2026"
                      placeholderTextColor={COLORS.textMuted}
                      style={{
                        backgroundColor: '#0C1B2A',
                        color: '#FFFFFF',
                        borderRadius: 8,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        fontSize: 13,
                      }}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                      FECHA EFECTIVA DE RETIRO (AAAA-MM-DD):
                    </Text>
                    <TextInput
                      value={fechaRetiroInput}
                      onChangeText={setFechaRetiroInput}
                      placeholder="Ej: 2026-04-30"
                      placeholderTextColor={COLORS.textMuted}
                      style={{
                        backgroundColor: '#0C1B2A',
                        color: '#FFFFFF',
                        borderRadius: 8,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        fontSize: 13,
                      }}
                    />
                  </View>
                </View>

                {/* 4. Observaciones */}
                <View style={{ gap: 4 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                    OBSERVACIONES / RADICADO DE ENTREGA:
                  </Text>
                  <TextInput
                    value={observacionesInput}
                    onChangeText={setObservacionesInput}
                    placeholder="Detalles sobre entrega de puesto, estado de bienes o reemplazo..."
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: '#0C1B2A',
                      color: '#FFFFFF',
                      borderRadius: 8,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      fontSize: 13,
                      minHeight: 60,
                    }}
                  />
                </View>
              </ScrollView>

              {/* Pie del modal */}
              <View
                style={{
                  backgroundColor: '#0F2133',
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
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleCrearDesvinculacion}
                  style={{
                    backgroundColor: COLORS.purpleDark,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Guardar & Generar Checklist</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL DETALLE DE CASO & EXPEDIENTE CNSC */}
        <Modal
          visible={!!casoDetalle}
          transparent
          animationType="fade"
          onRequestClose={() => setCasoDetalle(null)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: '#112233',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                width: '100%',
                maxWidth: 700,
                maxHeight: '90%',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  backgroundColor: '#0F2133',
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
                  <Text style={{ color: '#A78BFA', fontSize: 11, fontWeight: '800' }}>
                    EXPEDIENTE DE DESVINCULACIÓN #{casoDetalle?.id}
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginTop: 2 }}>
                    {casoDetalle?.servidor_nombre}
                  </Text>
                </View>
                <Pressable onPress={() => setCasoDetalle(null)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
                <View style={{ backgroundColor: '#0B1724', padding: 14, borderRadius: 10, gap: 6 }}>
                  <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '800' }}>DATOS DEL EMPLEO</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 14 }}>
                    {casoDetalle?.cargo} (Cód. {casoDetalle?.codigo} - Grado {casoDetalle?.grado})
                  </Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                    Plaza #{casoDetalle?.id_plaza} • {casoDetalle?.dependencia}
                  </Text>
                  <Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 4 }}>
                    Acto de Retiro: <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{casoDetalle?.acto_administrativo}</Text> ({casoDetalle?.fecha_acto})
                  </Text>
                </View>

                {/* Reporte SIMO 4.4 */}
                <View style={{ backgroundColor: '#0B1724', padding: 14, borderRadius: 10, gap: 6 }}>
                  <Text style={{ color: '#FCD34D', fontSize: 12, fontWeight: '800' }}>ESTADO EN SIMO 4.4 (CNSC)</Text>
                  <Text style={{ color: casoDetalle?.reportado_simo ? '#34D399' : '#FCD34D', fontSize: 13, fontWeight: '700' }}>
                    {casoDetalle?.reportado_simo ? `✓ Reportado Radicado: ${casoDetalle.radicado_simo || 'SIMO-OK'}` : '⚠️ PENDIENTE DE REPORTE (Plazo: 5 días hábiles)'}
                  </Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                    Causal de ley reportada: {casoDetalle?.causal_retiro}
                  </Text>
                </View>

                {/* Consulta BNLE */}
                <View style={{ backgroundColor: '#0B1724', padding: 14, borderRadius: 10, gap: 6 }}>
                  <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '800' }}>BANCO NACIONAL DE LISTAS DE ELEGIBLES (BNLE)</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 13 }}>
                    {casoDetalle?.solicitud_uso_bnle || 'Pendiente de consulta formal en SIMO 4.4'}
                  </Text>
                </View>
              </ScrollView>

              <View
                style={{
                  backgroundColor: '#0F2133',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: COLORS.border,
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                }}
              >
                <Pressable
                  onPress={() => setCasoDetalle(null)}
                  style={{
                    backgroundColor: COLORS.purpleDark,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Cerrar Expediente</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL INFORMATIVO GENERAL (Regla: Modals en vez de alerts) */}
        <Modal
          visible={infoModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setInfoModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: '#112233',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                width: '100%',
                maxWidth: 480,
                padding: 22,
                gap: 14,
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
                        ? 'rgba(16, 185, 129, 0.2)'
                        : infoModalTipo === 'warning'
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(56, 189, 248, 0.2)',
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
                        ? '#10B981'
                        : infoModalTipo === 'warning'
                        ? '#F59E0B'
                        : '#38BDF8'
                    }
                  />
                </View>
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800', flex: 1 }}>
                  {infoModalTitulo}
                </Text>
              </View>

              <Text style={{ color: '#CBD5E1', fontSize: 13.5, lineHeight: 20 }}>
                {infoModalMensaje}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                <Pressable
                  onPress={() => setInfoModalVisible(false)}
                  style={{
                    backgroundColor: COLORS.purpleDark,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Entendido</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
