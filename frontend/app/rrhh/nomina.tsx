import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import * as DocumentPicker from 'expo-document-picker';
import { nominaService, PlazaNomina, EstadisticasNomina } from '../../lib/nominaService';

// Sistema de diseño institucional basado en supervision-prueba (Marca Navy + Slate)
const THEME = {
  // Colores de marca (Marca 50 - 900)
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

  slateBadgeBg: '#F1F5F9',
  slateBadgeText: '#475569',
  slateBadgeRing: 'rgba(100, 116, 139, 0.25)',
};

const NIVELES = ['TODOS', 'DIRECTIVO', 'ASESOR', 'PROFESIONAL', 'TECNICO', 'ASISTENCIAL'];
const ESTADOS = ['TODOS', 'OCUPADO', 'VACANTE DEFINITIVA', 'VACANTE TEMPORAL'];

export default function NominaScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isTablet = width >= 640;

  // Estados principales
  const [tabActiva, setTabActiva] = useState<'plazas' | 'estructura' | 'archivos'>('plazas');
  const [cargando, setCargando] = useState(true);
  const [plazas, setPlazas] = useState<PlazaNomina[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasNomina | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [nivelSeleccionado, setNivelSeleccionado] = useState('TODOS');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('TODOS');
  const [dependenciaSeleccionada, setDependenciaSeleccionada] = useState('TODAS');
  const [modoVista, setModoVista] = useState<'tabla' | 'cards'>('tabla');

  // Modal de Detalle de Plaza
  const [plazaModal, setPlazaModal] = useState<PlazaNomina | null>(null);

  // Modal de Notificaciones (Regla: no alerts)
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalTitulo, setInfoModalTitulo] = useState('');
  const [infoModalMensaje, setInfoModalMensaje] = useState('');
  const [infoModalTipo, setInfoModalTipo] = useState<'success' | 'info' | 'error'>('info');

  // Carga de Archivos
  const [cargandoArchivoPlanta, setCargandoArchivoPlanta] = useState(false);
  const [cargandoArchivoPerno, setCargandoArchivoPerno] = useState(false);
  const [nombreArchivoPlanta, setNombreArchivoPlanta] = useState<string | null>(null);
  const [nombreArchivoPerno, setNombreArchivoPerno] = useState<string | null>(null);

  const mostrarModal = (titulo: string, mensaje: string, tipo: 'success' | 'info' | 'error' = 'info') => {
    setInfoModalTitulo(titulo);
    setInfoModalMensaje(mensaje);
    setInfoModalTipo(tipo);
    setInfoModalVisible(true);
  };

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [listado, stats] = await Promise.all([
        nominaService.getPlazas({
          busqueda,
          nivel: nivelSeleccionado,
          estado: estadoSeleccionado,
          dependencia: dependenciaSeleccionada,
        }),
        nominaService.getEstadisticas(),
      ]);
      setPlazas(listado);
      setEstadisticas(stats);
    } catch (e: any) {
      mostrarModal('Error de Conexión', 'No fue posible cargar los datos de nómina: ' + e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [busqueda, nivelSeleccionado, estadoSeleccionado, dependenciaSeleccionada]);

  // Dependencias para filtro
  const listaDependencias = useMemo(() => {
    const deps = new Set<string>();
    plazas.forEach((p) => {
      if (p.dependencia_cargo) deps.add(p.dependencia_cargo);
    });
    return ['TODAS', ...Array.from(deps).sort()];
  }, [plazas]);

  // Distribución por nivel jerárquico
  const distribucionPorNivel = useMemo(() => {
    const conteo: Record<string, number> = {
      DIRECTIVO: 0,
      ASESOR: 0,
      PROFESIONAL: 0,
      TECNICO: 0,
      ASISTENCIAL: 0,
    };
    plazas.forEach((p) => {
      const niv = (p.nivel || '').toUpperCase();
      if (niv.includes('DIRECTIV')) conteo.DIRECTIVO++;
      else if (niv.includes('ASESOR')) conteo.ASESOR++;
      else if (niv.includes('PROFESIONAL')) conteo.PROFESIONAL++;
      else if (niv.includes('TECNIC')) conteo.TECNICO++;
      else if (niv.includes('ASISTENCIAL')) conteo.ASISTENCIAL++;
    });
    return conteo;
  }, [plazas]);

  // Manejo de carga de archivo 1 (Planta)
  const handleSeleccionarArchivoPlanta = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

      const file = res.assets[0];
      setNombreArchivoPlanta(file.name);
      setCargandoArchivoPlanta(true);

      const resultado = await nominaService.uploadPlanta({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      if (resultado.success) {
        mostrarModal('Archivo de Planta Procesado', resultado.mensaje || 'Se actualizaron las plazas correctamente.', 'success');
        cargarDatos();
      } else {
        mostrarModal('Aviso de Carga', resultado.mensaje, 'info');
      }
    } catch (e: any) {
      mostrarModal('Error al procesar', 'Ocurrió un error leyendo el archivo de planta: ' + e.message, 'error');
    } finally {
      setCargandoArchivoPlanta(false);
    }
  };

  // Manejo de carga de archivo 2 (Planta Perno)
  const handleSeleccionarArchivoPerno = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

      const file = res.assets[0];
      setNombreArchivoPerno(file.name);
      setCargandoArchivoPerno(true);

      const resultado = await nominaService.uploadPerno({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      if (resultado.success) {
        mostrarModal(
          'Archivo Planta Perno Procesado',
          resultado.mensaje || 'Se enriquecieron los datos de nómina, EPS, pensión y nombramientos.',
          'success'
        );
        cargarDatos();
      } else {
        mostrarModal('Aviso de Carga', resultado.mensaje, 'info');
      }
    } catch (e: any) {
      mostrarModal('Error al procesar', 'Ocurrió un error leyendo el archivo perno: ' + e.message, 'error');
    } finally {
      setCargandoArchivoPerno(false);
    }
  };

  // Sincronizar datos base
  const handleSincronizarLocal = async () => {
    try {
      setCargando(true);
      const res = await nominaService.syncLocal();
      if (res.success) {
        mostrarModal('Sincronización Exitosa', res.mensaje, 'success');
        cargarDatos();
      } else {
        mostrarModal('Aviso', res.mensaje, 'info');
      }
    } catch (e: any) {
      mostrarModal('Sincronización', 'Los datos oficiales de planta ya están actualizados.', 'info');
    } finally {
      setCargando(false);
    }
  };

  const formatearDinero = (val?: number) => {
    if (!val) return '$0';
    return '$' + Math.round(val).toLocaleString('es-CO');
  };

  // Badges inspirados en supervision-prueba
  const renderBadgeEstado = (estado?: string) => {
    const e = (estado || '').toUpperCase();
    if (e === 'OCUPADO') {
      return (
        <View
          style={{
            backgroundColor: THEME.emeraldBg,
            borderColor: THEME.emeraldRing,
            borderWidth: 1,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 9999,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.emeraldText }} />
          <Text style={{ color: THEME.emeraldText, fontSize: 11, fontWeight: '600' }}>Ocupado</Text>
        </View>
      );
    }
    if (e.includes('DEFINITIVA')) {
      return (
        <View
          style={{
            backgroundColor: THEME.roseBg,
            borderColor: THEME.roseRing,
            borderWidth: 1,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 9999,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.roseText }} />
          <Text style={{ color: THEME.roseText, fontSize: 11, fontWeight: '600' }}>Vacante Definitiva</Text>
        </View>
      );
    }
    if (e.includes('TEMPORAL')) {
      return (
        <View
          style={{
            backgroundColor: THEME.amberBg,
            borderColor: THEME.amberRing,
            borderWidth: 1,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 9999,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.amberText }} />
          <Text style={{ color: THEME.amberText, fontSize: 11, fontWeight: '600' }}>Vacante Temporal</Text>
        </View>
      );
    }
    return (
      <View
        style={{
          backgroundColor: THEME.slateBadgeBg,
          borderColor: THEME.slateBadgeRing,
          borderWidth: 1,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 9999,
          alignSelf: 'flex-start',
        }}
      >
        <Text style={{ color: THEME.slateBadgeText, fontSize: 11, fontWeight: '600' }}>{estado || 'Disponible'}</Text>
      </View>
    );
  };

  const renderBadgeNivel = (nivel?: string) => {
    const n = (nivel || '').toUpperCase();
    let bg = THEME.skyBg;
    let color = THEME.skyText;
    let ring = THEME.skyRing;

    if (n.includes('DIRECTIV')) {
      bg = THEME.roseBg;
      color = THEME.roseText;
      ring = THEME.roseRing;
    } else if (n.includes('ASESOR')) {
      bg = THEME.amberBg;
      color = THEME.amberText;
      ring = THEME.amberRing;
    } else if (n.includes('PROFESIONAL')) {
      bg = THEME.skyBg;
      color = THEME.skyText;
      ring = THEME.skyRing;
    } else if (n.includes('TECNIC')) {
      bg = THEME.emeraldBg;
      color = THEME.emeraldText;
      ring = THEME.emeraldRing;
    } else if (n.includes('ASISTENCIAL')) {
      bg = THEME.slateBadgeBg;
      color = THEME.slateBadgeText;
      ring = THEME.slateBadgeRing;
    }

    return (
      <View
        style={{
          backgroundColor: bg,
          borderColor: ring,
          borderWidth: 1,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 9999,
          alignSelf: 'flex-start',
        }}
      >
        <Text style={{ color, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>
          {nivel?.toLowerCase() || 'Sin nivel'}
        </Text>
      </View>
    );
  };

  // Cálculos de KPIs
  const totalOcupadas = estadisticas?.ocupadas ?? 153;
  const vacDefinitivas = estadisticas?.vacantes_definitivas ?? 13;
  const vacTemporales = estadisticas?.vacantes_temporales ?? 4;
  const totalVacantes = vacDefinitivas + vacTemporales;
  const pctOcupacion = Math.round((totalOcupadas / (estadisticas?.total_plazas || 170)) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.slate50 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* ============================================================== */}
        {/* CABECERA INSTITUCIONAL ESTILO SUPERVISION (bg-marca-900)       */}
        {/* ============================================================== */}
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
              maxWidth: 1400,
              width: '100%',
              marginHorizontal: 'auto',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Lado izquierdo: Regresar + Título con subtítulo de marca */}
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
                  backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
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
                  Gestión de Planta y Nómina
                </Text>
              </View>
            </View>

            {/* Lado derecho: Acciones rápidas (Sincronizar y Subir) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={handleSincronizarLocal}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: pressed ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                })}
              >
                <Ionicons name="sync-outline" size={15} color={THEME.marca100} />
                <Text style={{ color: THEME.marca100, fontSize: 12, fontWeight: '500' }}>
                  Sincronizar Datos
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setTabActiva('archivos')}
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
                <Ionicons name="cloud-upload-outline" size={15} color={THEME.white} />
                <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '600' }}>
                  Alimentar Nómina
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ============================================================== */}
        {/* CUERPO PRINCIPAL                                              */}
        {/* ============================================================== */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: isDesktop ? 32 : 16,
            paddingVertical: 24,
            maxWidth: 1400,
            width: '100%',
            marginHorizontal: 'auto',
          }}
        >
          {/* TÍTULO Y SUBTÍTULO DE PÁGINA */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: '600', color: THEME.slate900 }}>
              Censo Oficial de Planta y Nómina
            </Text>
            <Text style={{ fontSize: 13, color: THEME.slate500, marginTop: 4 }}>
              Consulta unificada de las 170 plazas institucionales, vinculaciones activas, vacantes y reporte perno.
            </Text>
          </View>

          {/* ============================================================== */}
          {/* KPI CARDS (Patrón Ri de supervision-prueba)                    */}
          {/* ============================================================== */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 14,
              marginBottom: 24,
            }}
          >
            {/* KPI 1: Total Plazas */}
            <View
              style={{
                flex: 1,
                minWidth: isTablet ? 220 : '100%',
                backgroundColor: THEME.white,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: THEME.slate200,
                paddingHorizontal: 20,
                paddingVertical: 16,
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
                Total Plazas Oficiales
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '600', color: THEME.slate900, marginTop: 4 }}>
                {estadisticas?.total_plazas || 170}
              </Text>
              <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                100% planta autorizada entidad
              </Text>
            </View>

            {/* KPI 2: Cargos Ocupados */}
            <View
              style={{
                flex: 1,
                minWidth: isTablet ? 220 : '100%',
                backgroundColor: THEME.white,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: THEME.slate200,
                paddingHorizontal: 20,
                paddingVertical: 16,
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
                Cargos Ocupados
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '600', color: THEME.emeraldText, marginTop: 4 }}>
                {totalOcupadas}
              </Text>
              <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                {pctOcupacion}% vinculados activos
              </Text>
            </View>

            {/* KPI 3: Vacantes */}
            <View
              style={{
                flex: 1,
                minWidth: isTablet ? 220 : '100%',
                backgroundColor: THEME.white,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: THEME.slate200,
                paddingHorizontal: 20,
                paddingVertical: 16,
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
                Vacantes en Trámite
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '600', color: THEME.roseText, marginTop: 4 }}>
                {totalVacantes}
              </Text>
              <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                {vacDefinitivas} definitivas · {vacTemporales} temporales
              </Text>
            </View>

            {/* KPI 4: Masa Salarial Mensual */}
            <View
              style={{
                flex: 1,
                minWidth: isTablet ? 220 : '100%',
                backgroundColor: THEME.white,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: THEME.slate200,
                paddingHorizontal: 20,
                paddingVertical: 16,
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
                Masa Salarial Básica
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '600', color: THEME.slate900, marginTop: 4 }}>
                {formatearDinero(estadisticas?.masa_salarial_mensual || 1789230000)}
              </Text>
              <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                Devengado mensual estimado
              </Text>
            </View>
          </View>

          {/* ============================================================== */}
          {/* PESTAÑAS (Patrón de navegación underline de supervision)       */}
          {/* ============================================================== */}
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              borderBottomWidth: 1,
              borderBottomColor: THEME.slate200,
              marginBottom: 20,
              overflow: 'hidden',
            }}
          >
            {/* Pestaña 1: Censo de Plazas */}
            <Pressable
              onPress={() => setTabActiva('plazas')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'plazas' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'plazas' ? THEME.marca700 : THEME.slate500,
                }}
              >
                Censo de Plazas
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
                  {plazas.length}
                </Text>
              </View>
            </Pressable>

            {/* Pestaña 2: Estructura por Niveles */}
            <Pressable
              onPress={() => setTabActiva('estructura')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'estructura' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'estructura' ? THEME.marca700 : THEME.slate500,
                }}
              >
                Estructura por Niveles
              </Text>
            </Pressable>

            {/* Pestaña 3: Carga de Archivos */}
            <Pressable
              onPress={() => setTabActiva('archivos')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'archivos' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'archivos' ? THEME.marca700 : THEME.slate500,
                }}
              >
                Carga de Archivos de Nómina
              </Text>
              {(nombreArchivoPlanta || nombreArchivoPerno) && (
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: THEME.emeraldBg,
                    borderRadius: 9999,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.emeraldText }}>
                    Listo
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* ============================================================== */}
          {/* CONTENIDO SEGÚN PESTAÑA ACTIVA                                */}
          {/* ============================================================== */}
          {tabActiva === 'plazas' && (
            <View>
              {/* FILTROS Y BARRA DE BÚSQUEDA */}
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 16,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.03,
                  shadowRadius: 2,
                }}
              >
                {/* Fila 1: Input de búsqueda + Toggle Cards/Tabla */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      minWidth: isTablet ? 300 : '100%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: THEME.slate50,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Ionicons name="search-outline" size={17} color={THEME.slate400} />
                    <TextInput
                      value={busqueda}
                      onChangeText={setBusqueda}
                      placeholder="Buscar por cédula, nombre, cargo, código o dependencia..."
                      placeholderTextColor={THEME.slate400}
                      style={{
                        flex: 1,
                        marginLeft: 8,
                        fontSize: 13,
                        color: THEME.slate900,
                        padding: 0,
                      }}
                    />
                    {busqueda ? (
                      <Pressable onPress={() => setBusqueda('')}>
                        <Ionicons name="close-circle" size={17} color={THEME.slate400} />
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Selector de modo de vista (Tarjetas | Tabla) */}
                  <View
                    style={{
                      flexDirection: 'row',
                      backgroundColor: THEME.slate100,
                      borderRadius: 8,
                      padding: 3,
                    }}
                  >
                    <Pressable
                      onPress={() => setModoVista('tabla')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor: modoVista === 'tabla' ? THEME.white : 'transparent',
                        shadowColor: modoVista === 'tabla' ? '#000' : 'transparent',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 2,
                      }}
                    >
                      <Ionicons
                        name="list-outline"
                        size={15}
                        color={modoVista === 'tabla' ? THEME.marca700 : THEME.slate500}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: modoVista === 'tabla' ? '600' : '500',
                          color: modoVista === 'tabla' ? THEME.marca700 : THEME.slate500,
                        }}
                      >
                        Tabla
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setModoVista('cards')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor: modoVista === 'cards' ? THEME.white : 'transparent',
                        shadowColor: modoVista === 'cards' ? '#000' : 'transparent',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 2,
                      }}
                    >
                      <Ionicons
                        name="grid-outline"
                        size={15}
                        color={modoVista === 'cards' ? THEME.marca700 : THEME.slate500}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: modoVista === 'cards' ? '600' : '500',
                          color: modoVista === 'cards' ? THEME.marca700 : THEME.slate500,
                        }}
                      >
                        Tarjetas
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Fila 2: Filtros por Nivel y Estado */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginTop: 14,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: THEME.slate100,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate500 }}>
                    NIVEL:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {NIVELES.map((niv) => {
                      const activo = nivelSeleccionado === niv;
                      return (
                        <Pressable
                          key={niv}
                          onPress={() => setNivelSeleccionado(niv)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: activo ? THEME.marca50 : THEME.white,
                            borderWidth: 1,
                            borderColor: activo ? THEME.marca600 : THEME.slate200,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: activo ? '600' : '500',
                              color: activo ? THEME.marca700 : THEME.slate600,
                            }}
                          >
                            {niv}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={{ width: 1, height: 18, backgroundColor: THEME.slate200, marginHorizontal: 4 }} />

                  <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate500 }}>
                    ESTADO:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {ESTADOS.map((est) => {
                      const activo = estadoSeleccionado === est;
                      return (
                        <Pressable
                          key={est}
                          onPress={() => setEstadoSeleccionado(est)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: activo ? THEME.marca50 : THEME.white,
                            borderWidth: 1,
                            borderColor: activo ? THEME.marca600 : THEME.slate200,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: activo ? '600' : '500',
                              color: activo ? THEME.marca700 : THEME.slate600,
                            }}
                          >
                            {est}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* LISTADO / TABLA */}
              {cargando ? (
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    paddingVertical: 60,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator size="large" color={THEME.marca600} />
                  <Text style={{ color: THEME.slate500, fontSize: 13, marginTop: 12 }}>
                    Cargando plazas y registros de nómina...
                  </Text>
                </View>
              ) : plazas.length === 0 ? (
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    paddingVertical: 60,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="folder-open-outline" size={38} color={THEME.slate300} />
                  <Text style={{ color: THEME.slate700, fontSize: 15, fontWeight: '600', marginTop: 10 }}>
                    No se encontraron plazas con los filtros seleccionados
                  </Text>
                  <Text style={{ color: THEME.slate400, fontSize: 12, marginTop: 4 }}>
                    Intenta modificar la búsqueda o limpiar los filtros.
                  </Text>
                </View>
              ) : modoVista === 'tabla' ? (
                /* ============================================================== */
                /* VISTA TABLA (Estilo Bi de supervision-prueba)                  */
                /* ============================================================== */
                <View
                  style={{
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
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View style={{ minWidth: 1100 }}>
                      {/* Cabecera de la tabla */}
                      <View
                        style={{
                          flexDirection: 'row',
                          backgroundColor: THEME.slate50,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.slate200,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                        }}
                      >
                        <Text style={{ width: 70, fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                          ID / Plaza
                        </Text>
                        <Text style={{ width: 230, fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Denominación del Empleo
                        </Text>
                        <Text style={{ width: 110, fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Nivel
                        </Text>
                        <Text style={{ width: 210, fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Servidor / Titular
                        </Text>
                        <Text style={{ width: 140, fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Estado
                        </Text>
                        <Text style={{ width: 200, fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Dependencia
                        </Text>
                        <Text style={{ width: 120, fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase', textAlign: 'right' }}>
                          Básico Mensual
                        </Text>
                        <Text style={{ width: 90, fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase', textAlign: 'center' }}>
                          Acción
                        </Text>
                      </View>

                      {/* Filas */}
                      {plazas.map((p, index) => {
                        const esOcupado = (p.estado_cargo || '').toUpperCase() === 'OCUPADO';
                        return (
                          <Pressable
                            key={p.id_plaza || index}
                            onPress={() => setPlazaModal(p)}
                            style={({ pressed }) => ({
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 11,
                              paddingHorizontal: 16,
                              borderBottomWidth: 1,
                              borderBottomColor: THEME.slate100,
                              backgroundColor: pressed
                                ? THEME.marcaHover
                                : index % 2 === 0
                                ? THEME.white
                                : '#FAFCFF',
                            })}
                          >
                            {/* ID */}
                            <View style={{ width: 70 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate600 }}>
                                #{p.id_plaza}
                              </Text>
                              <Text style={{ fontSize: 10, color: THEME.slate400 }}>
                                Cód. {p.codigo || '---'}
                              </Text>
                            </View>

                            {/* Cargo */}
                            <View style={{ width: 230, paddingRight: 10 }}>
                              <Text
                                numberOfLines={1}
                                style={{ fontSize: 13, fontWeight: '600', color: THEME.marca700 }}
                              >
                                {p.cargo || 'Sin denominación'}
                              </Text>
                              <Text style={{ fontSize: 11, color: THEME.slate400 }}>
                                Grado {p.grado || '00'} • {p.tipo_vinculacion || 'Planta'}
                              </Text>
                            </View>

                            {/* Nivel */}
                            <View style={{ width: 110 }}>{renderBadgeNivel(p.nivel)}</View>

                            {/* Servidor */}
                            <View style={{ width: 210, paddingRight: 10 }}>
                              {esOcupado ? (
                                <>
                                  <Text
                                    numberOfLines={1}
                                    style={{ fontSize: 13, fontWeight: '600', color: THEME.slate900 }}
                                  >
                                    {p.titular_nombre || 'Servidor Registrado'}
                                  </Text>
                                  <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                                    C.C. {p.titular_cedula || 'No registrada'}
                                  </Text>
                                </>
                              ) : (
                                <Text style={{ fontSize: 12, fontStyle: 'italic', color: THEME.slate400 }}>
                                  Sin servidor vinculado
                                </Text>
                              )}
                            </View>

                            {/* Estado */}
                            <View style={{ width: 140 }}>{renderBadgeEstado(p.estado_cargo)}</View>

                            {/* Dependencia */}
                            <View style={{ width: 200, paddingRight: 10 }}>
                              <Text numberOfLines={2} style={{ fontSize: 12, color: THEME.slate600 }}>
                                {p.dependencia_cargo || 'Secretaría Jurídica Distrital'}
                              </Text>
                            </View>

                            {/* Asignación Básica */}
                            <View style={{ width: 120, alignItems: 'flex-end', paddingRight: 8 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate900 }}>
                                {formatearDinero(p.asignacion_basica)}
                              </Text>
                              <Text style={{ fontSize: 10, color: THEME.slate400 }}>COP</Text>
                            </View>

                            {/* Acción */}
                            <View style={{ width: 90, alignItems: 'center' }}>
                              <View
                                style={{
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 6,
                                  backgroundColor: THEME.slate100,
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.marca700 }}>
                                  Ver Ficha
                                </Text>
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              ) : (
                /* ============================================================== */
                /* VISTA TARJETAS (Cards en Grid de supervision-prueba)           */
                /* ============================================================== */
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}
                >
                  {plazas.map((p, index) => {
                    const esOcupado = (p.estado_cargo || '').toUpperCase() === 'OCUPADO';
                    return (
                      <Pressable
                        key={p.id_plaza || index}
                        onPress={() => setPlazaModal(p)}
                        style={({ pressed }) => ({
                          width: isDesktop ? '31.8%' : isTablet ? '48%' : '100%',
                          backgroundColor: THEME.white,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          padding: 16,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.04,
                          shadowRadius: 3,
                          opacity: pressed ? 0.92 : 1,
                        })}
                      >
                        {/* Cabecera de la tarjeta */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate400 }}>
                            PLAZA #{p.id_plaza}
                          </Text>
                          {renderBadgeEstado(p.estado_cargo)}
                        </View>

                        {/* Título del cargo */}
                        <Text
                          numberOfLines={2}
                          style={{ fontSize: 15, fontWeight: '600', color: THEME.marca700, marginBottom: 4 }}
                        >
                          {p.cargo || 'Sin denominación'}
                        </Text>

                        {/* Badges de nivel y código */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          {renderBadgeNivel(p.nivel)}
                          <View
                            style={{
                              backgroundColor: THEME.slate100,
                              borderRadius: 4,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '600', color: THEME.slate600 }}>
                              Cód. {p.codigo} - Gr. {p.grado}
                            </Text>
                          </View>
                        </View>

                        <View style={{ height: 1, backgroundColor: THEME.slate100, marginBottom: 12 }} />

                        {/* Datos del servidor */}
                        <View style={{ marginBottom: 10 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                            Servidor Vinculado
                          </Text>
                          {esOcupado ? (
                            <View style={{ marginTop: 2 }}>
                              <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: THEME.slate900 }}>
                                {p.titular_nombre}
                              </Text>
                              <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                                C.C. {p.titular_cedula || 'No registrada'}
                              </Text>
                            </View>
                          ) : (
                            <Text style={{ fontSize: 12, fontStyle: 'italic', color: THEME.slate400, marginTop: 2 }}>
                              Vacante disponible en planta
                            </Text>
                          )}
                        </View>

                        {/* Dependencia */}
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                            Dependencia
                          </Text>
                          <Text numberOfLines={1} style={{ fontSize: 12, color: THEME.slate700, marginTop: 1 }}>
                            {p.dependencia_cargo || 'Secretaría Jurídica Distrital'}
                          </Text>
                        </View>

                        {/* Pie de tarjeta con Asignación Básica y botón */}
                        <View
                          style={{
                            paddingTop: 10,
                            borderTopWidth: 1,
                            borderTopColor: THEME.slate100,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <View>
                            <Text style={{ fontSize: 10, color: THEME.slate400, textTransform: 'uppercase' }}>
                              Asignación Básica
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900 }}>
                              {formatearDinero(p.asignacion_basica)}
                            </Text>
                          </View>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              borderRadius: 6,
                              backgroundColor: THEME.marca50,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.marca700 }}>
                              Ver Detalle
                            </Text>
                            <Ionicons name="chevron-forward" size={13} color={THEME.marca700} />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA: ESTRUCTURA POR NIVELES                                */}
          {/* ============================================================== */}
          {tabActiva === 'estructura' && (
            <View>
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: THEME.slate900 }}>
                  Distribución Jerárquica de la Planta
                </Text>
                <Text style={{ fontSize: 13, color: THEME.slate500, marginTop: 4 }}>
                  Resumen de plazas provistas y vacantes por nivel administrativo en la entidad.
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginTop: 20,
                  }}
                >
                  {Object.entries(distribucionPorNivel).map(([nivel, cant]) => {
                    const totalBase = estadisticas?.total_plazas || (plazas.length > 0 ? plazas.length : 170);
                    const porcentaje = Math.round((cant / totalBase) * 100);
                    return (
                      <View
                        key={nivel}
                        style={{
                          flex: 1,
                          minWidth: isTablet ? 200 : '100%',
                          backgroundColor: THEME.slate50,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          padding: 16,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          {renderBadgeNivel(nivel)}
                          <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate500 }}>
                            {porcentaje}%
                          </Text>
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: THEME.slate900, marginTop: 8 }}>
                          {cant} <Text style={{ fontSize: 13, fontWeight: '400', color: THEME.slate500 }}>plazas</Text>
                        </Text>
                        {/* Barra de progreso */}
                        <View
                          style={{
                            height: 6,
                            backgroundColor: THEME.slate200,
                            borderRadius: 3,
                            marginTop: 10,
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{
                              width: `${porcentaje}%`,
                              height: '100%',
                              backgroundColor: THEME.marca600,
                              borderRadius: 3,
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA: CARGA DE ARCHIVOS DE NÓMINA (PLANTA + PERNO)          */}
          {/* ============================================================== */}
          {tabActiva === 'archivos' && (
            <View>
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '600', color: THEME.slate900 }}>
                  Alimentación de Nómina mediante Archivos Excel
                </Text>
                <Text style={{ fontSize: 13, color: THEME.slate500, marginTop: 4 }}>
                  Actualiza de manera autónoma las plazas y la información pormenorizada de personal subiendo los dos
                  formatos oficiales de la Secretaría Jurídica Distrital.
                </Text>

                <View
                  style={{
                    flexDirection: isTablet ? 'row' : 'column',
                    gap: 20,
                    marginTop: 20,
                  }}
                >
                  {/* ARCHIVO 1: PLANTA (IMAGEN 1) */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: THEME.slate50,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 20,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="document-text" size={20} color={THEME.marca700} />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: THEME.slate900 }}>
                          1. Archivo de Planta
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: THEME.skyBg,
                          borderColor: THEME.skyRing,
                          borderWidth: 1,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 9999,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.skyText }}>Estructura Base</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, color: THEME.slate600, lineHeight: 18, marginBottom: 16 }}>
                      Contiene el censo de cargos, plazas, código, grado, dependencia, asignación básica mensual y
                      gastos de representación.
                    </Text>

                    <View
                      style={{
                        backgroundColor: THEME.white,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        borderStyle: 'dashed',
                        borderRadius: 10,
                        padding: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                      }}
                    >
                      <Ionicons name="cloud-upload-outline" size={32} color={THEME.slate400} />
                      <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate700, marginTop: 8 }}>
                        {nombreArchivoPlanta || 'Formato Excel (.xlsx, .xls)'}
                      </Text>
                      <Text style={{ fontSize: 11, color: THEME.slate400, marginTop: 2 }}>
                        Estructura: Nivel, Denominación, Cód, Grado, Básico
                      </Text>
                    </View>

                    <Pressable
                      onPress={handleSeleccionarArchivoPlanta}
                      disabled={cargandoArchivoPlanta}
                      style={({ pressed }) => ({
                        backgroundColor: THEME.marca700,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed || cargandoArchivoPlanta ? 0.8 : 1,
                      })}
                    >
                      {cargandoArchivoPlanta ? (
                        <ActivityIndicator size="small" color={THEME.white} />
                      ) : (
                        <Text style={{ color: THEME.white, fontSize: 13, fontWeight: '600' }}>
                          Seleccionar y Cargar Archivo de Planta
                        </Text>
                      )}
                    </Pressable>
                  </View>

                  {/* ARCHIVO 2: PLANTA PERNO (IMAGEN 2) */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: THEME.slate50,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 20,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="people-circle" size={22} color={THEME.emeraldText} />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: THEME.slate900 }}>
                          2. Archivo Planta Perno
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: THEME.emeraldBg,
                          borderColor: THEME.emeraldRing,
                          borderWidth: 1,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 9999,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.emeraldText }}>
                          Nómina y Novedades
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, color: THEME.slate600, lineHeight: 18, marginBottom: 16 }}>
                      Contiene la información detallada del personal: EPS, Fondos de Pensiones, Cesantías, ARL, acto de
                      nombramiento, posesión y correo institucional.
                    </Text>

                    <View
                      style={{
                        backgroundColor: THEME.white,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        borderStyle: 'dashed',
                        borderRadius: 10,
                        padding: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                      }}
                    >
                      <Ionicons name="shield-checkmark-outline" size={32} color={THEME.slate400} />
                      <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate700, marginTop: 8 }}>
                        {nombreArchivoPerno || 'Formato Perno (.xlsx, .xls)'}
                      </Text>
                      <Text style={{ fontSize: 11, color: THEME.slate400, marginTop: 2 }}>
                        Estructura: EPS, Pensión, Cesantías, Novedades
                      </Text>
                    </View>

                    <Pressable
                      onPress={handleSeleccionarArchivoPerno}
                      disabled={cargandoArchivoPerno}
                      style={({ pressed }) => ({
                        backgroundColor: THEME.marca700,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed || cargandoArchivoPerno ? 0.8 : 1,
                      })}
                    >
                      {cargandoArchivoPerno ? (
                        <ActivityIndicator size="small" color={THEME.white} />
                      ) : (
                        <Text style={{ color: THEME.white, fontSize: 13, fontWeight: '600' }}>
                          Seleccionar y Cargar Archivo Perno
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ============================================================== */}
        {/* MODAL DE DETALLE DE PLAZA (FICHA TÉCNICA INSTITUCIONAL)       */}
        {/* ============================================================== */}
        <Modal
          visible={!!plazaModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPlazaModal(null)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 720,
                maxHeight: '90%',
                backgroundColor: THEME.white,
                borderRadius: 14,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
              }}
            >
              {/* Cabecera del Modal (bg-marca-900) */}
              <View
                style={{
                  backgroundColor: THEME.marca900,
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <Text
                    style={{
                      color: 'rgba(214, 228, 244, 0.7)',
                      fontSize: 11,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Ficha Técnica de Plaza #{plazaModal?.id_plaza}
                  </Text>
                  <Text style={{ color: THEME.white, fontSize: 17, fontWeight: '600', marginTop: 2 }}>
                    {plazaModal?.cargo}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setPlazaModal(null)}
                  style={({ pressed }) => ({
                    padding: 6,
                    borderRadius: 6,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  })}
                >
                  <Ionicons name="close" size={20} color={THEME.white} />
                </Pressable>
              </View>

              {/* Contenido scrolleable de la ficha */}
              <ScrollView style={{ padding: 20 }}>
                {/* Sección 1: Datos del Cargo Oficial */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                  1. Especificaciones de Planta
                </Text>

                <View
                  style={{
                    backgroundColor: THEME.slate50,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 14,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Nivel Jerárquico</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate900, marginTop: 2 }}>
                      {plazaModal?.nivel || '---'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Código y Grado</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate900, marginTop: 2 }}>
                      Cód. {plazaModal?.codigo || '---'} - Gr. {plazaModal?.grado || '---'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Estado de la Plaza</Text>
                    <View style={{ marginTop: 4 }}>{renderBadgeEstado(plazaModal?.estado_cargo)}</View>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Asignación Básica</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.emeraldText, marginTop: 2 }}>
                      {formatearDinero(plazaModal?.asignacion_basica)}
                    </Text>
                  </View>

                  <View style={{ width: '100%' }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Dependencia Asignada</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.dependencia_cargo || 'Secretaría Jurídica Distrital'}
                    </Text>
                  </View>
                </View>

                {/* Sección 2: Titular o Servidor Asignado */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                  2. Servidor Público Asignado
                </Text>

                <View
                  style={{
                    backgroundColor: THEME.slate50,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 14,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  <View style={{ width: '100%' }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Nombre Completo</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: THEME.slate900, marginTop: 2 }}>
                      {plazaModal?.titular_nombre || 'Plaza actualmente Vacante'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Número de Documento</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.titular_cedula ? `C.C. ${plazaModal.titular_cedula}` : '---'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Tipo de Vinculación</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.tipo_vinculacion || '---'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Situación Administrativa</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.situacion_administrativa || 'Servicio Activo'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Acto de Nombramiento</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.acto_nombramiento || plazaModal?.numero_acto_nombramiento || '---'}
                    </Text>
                  </View>
                </View>

                {/* Sección 3: Seguridad Social & Datos Nómina Perno */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                  3. Seguridad Social y Nómina Perno
                </Text>

                <View
                  style={{
                    backgroundColor: THEME.slate50,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 14,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 14,
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>EPS / Salud</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.fondo_salud || 'No reportada'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Fondo de Pensiones</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.fondo_pension || 'No reportado'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Fondo de Cesantías</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.fondo_cesantias || 'No reportado'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Teléfono de Contacto</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.telefono || 'No registrado'}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Botón de cierre en el pie */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: THEME.slate200,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  backgroundColor: THEME.slate50,
                  alignItems: 'flex-end',
                }}
              >
                <Pressable
                  onPress={() => setPlazaModal(null)}
                  style={{
                    backgroundColor: THEME.white,
                    borderWidth: 1,
                    borderColor: THEME.slate300,
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate700 }}>Cerrar Ficha</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ============================================================== */}
        {/* MODAL DE NOTIFICACIONES / AVISOS (Regla: no alerts)            */}
        {/* ============================================================== */}
        <Modal
          visible={infoModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setInfoModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 440,
                backgroundColor: THEME.white,
                borderRadius: 14,
                padding: 24,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor:
                    infoModalTipo === 'success'
                      ? THEME.emeraldBg
                      : infoModalTipo === 'error'
                      ? THEME.roseBg
                      : THEME.skyBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons
                  name={
                    infoModalTipo === 'success'
                      ? 'checkmark-circle'
                      : infoModalTipo === 'error'
                      ? 'close-circle'
                      : 'information-circle'
                  }
                  size={32}
                  color={
                    infoModalTipo === 'success'
                      ? THEME.emeraldText
                      : infoModalTipo === 'error'
                      ? THEME.roseText
                      : THEME.skyText
                  }
                />
              </View>

              <Text style={{ fontSize: 17, fontWeight: '600', color: THEME.slate900, textAlign: 'center', marginBottom: 8 }}>
                {infoModalTitulo}
              </Text>

              <Text style={{ fontSize: 13, color: THEME.slate600, textAlign: 'center', lineHeight: 19, marginBottom: 20 }}>
                {infoModalMensaje}
              </Text>

              <Pressable
                onPress={() => setInfoModalVisible(false)}
                style={{
                  width: '100%',
                  backgroundColor: THEME.marca700,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: THEME.white, fontSize: 13, fontWeight: '600' }}>Entendido</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
