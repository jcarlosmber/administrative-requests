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

const COLORS = {
  primary: '#BE1F2D',
  accentEmerald: '#10B981',
  accentEmeraldDark: '#059669',
  accentEmeraldSoft: 'rgba(16, 185, 129, 0.16)',
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
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const NIVELES = ['TODOS', 'DIRECTIVO', 'ASESOR', 'PROFESIONAL', 'TECNICO', 'ASISTENCIAL'];
const ESTADOS = ['TODOS', 'OCUPADO', 'VACANTE DEFINITIVA', 'VACANTE TEMPORAL'];

export default function NominaScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isTablet = width >= 640;

  // Estados principales
  const [tabActiva, setTabActiva] = useState<'plazas' | 'archivos' | 'estructura'>('plazas');
  const [cargando, setCargando] = useState(true);
  const [plazas, setPlazas] = useState<PlazaNomina[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasNomina | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [nivelSeleccionado, setNivelSeleccionado] = useState('TODOS');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('TODOS');
  const [dependenciaSeleccionada, setDependenciaSeleccionada] = useState('TODAS');

  // Plaza seleccionada para ver en Modal
  const [plazaModal, setPlazaModal] = useState<PlazaNomina | null>(null);

  // Estado para Modal de Notificación/Confirmación (Regla: Modals en vez de alerts)
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalTitulo, setInfoModalTitulo] = useState('');
  const [infoModalMensaje, setInfoModalMensaje] = useState('');
  const [infoModalTipo, setInfoModalTipo] = useState<'success' | 'info' | 'error'>('info');

  // Estados para carga de archivos
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

  // Cargar datos
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
      mostrarModal('Error', 'No fue posible cargar los datos de nómina: ' + e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [busqueda, nivelSeleccionado, estadoSeleccionado, dependenciaSeleccionada]);

  // Lista única de dependencias para filtro
  const listaDependencias = useMemo(() => {
    const deps = new Set<string>();
    plazas.forEach((p) => {
      if (p.dependencia_cargo) deps.add(p.dependencia_cargo);
    });
    return ['TODAS', ...Array.from(deps).sort()];
  }, [plazas]);

  // Manejador para seleccionar y subir Archivo 1 (Planta - Imagen 1)
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
        mostrarModal(
          'Archivo de Planta Procesado',
          resultado.mensaje || `Se actualizaron correctamente las plazas y cargos oficiales.`,
          'success'
        );
        cargarDatos();
      } else {
        mostrarModal('Aviso de Carga', resultado.mensaje, 'info');
      }
    } catch (e: any) {
      mostrarModal('Error al cargar', 'Ocurrió un error leyendo el archivo: ' + e.message, 'error');
    } finally {
      setCargandoArchivoPlanta(false);
    }
  };

  // Manejador para seleccionar y subir Archivo 2 (Planta Perno - Imagen 2)
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
          resultado.mensaje || `Se enriquecieron los datos de seguridad social, nómina y nombramientos.`,
          'success'
        );
        cargarDatos();
      } else {
        mostrarModal('Aviso de Carga', resultado.mensaje, 'info');
      }
    } catch (e: any) {
      mostrarModal('Error al cargar', 'Ocurrió un error leyendo el archivo: ' + e.message, 'error');
    } finally {
      setCargandoArchivoPerno(false);
    }
  };

  // Sincronizar datos base locales
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
      mostrarModal('Aviso de Sincronización', 'Los datos locales ya están activos en la aplicación.', 'info');
    } finally {
      setCargando(false);
    }
  };

  const formatearDinero = (val?: number) => {
    if (!val) return '$0';
    return '$' + Math.round(val).toLocaleString('es-CO');
  };

  const getColorNivel = (nivel?: string) => {
    const n = (nivel || '').toUpperCase();
    if (n.includes('DIRECTIV')) return '#EF4444';
    if (n.includes('ASESOR')) return '#F59E0B';
    if (n.includes('PROFESIONAL')) return '#38BDF8';
    if (n.includes('TECNIC')) return '#10B981';
    if (n.includes('ASISTENCIAL')) return '#A78BFA';
    return COLORS.textMuted;
  };

  const getBadgeEstado = (estado?: string) => {
    const e = (estado || '').toUpperCase();
    if (e === 'OCUPADO') {
      return {
        bg: 'rgba(16, 185, 129, 0.16)',
        border: 'rgba(16, 185, 129, 0.4)',
        color: '#34D399',
        texto: 'OCUPADO',
        icono: 'checkmark-circle' as const,
      };
    }
    if (e.includes('DEFINITIVA')) {
      return {
        bg: 'rgba(239, 68, 68, 0.16)',
        border: 'rgba(239, 68, 68, 0.4)',
        color: '#F87171',
        texto: 'VACANTE DEFINITIVA',
        icono: 'alert-circle' as const,
      };
    }
    if (e.includes('TEMPORAL')) {
      return {
        bg: 'rgba(245, 158, 11, 0.16)',
        border: 'rgba(245, 158, 11, 0.4)',
        color: '#FBBF24',
        texto: 'VACANTE TEMPORAL',
        icono: 'time-outline' as const,
      };
    }
    return {
      bg: 'rgba(56, 189, 248, 0.16)',
      border: 'rgba(56, 189, 248, 0.4)',
      color: '#38BDF8',
      texto: e || 'DISPONIBLE',
      icono: 'information-circle' as const,
    };
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.darkBg }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Cabecera Principal */}
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
                  backgroundColor: COLORS.accentEmeraldSoft,
                  borderWidth: 1.5,
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="briefcase" size={24} color={COLORS.accentEmerald} />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.3 }}>
                    Gestión de Planta y Nómina
                  </Text>
                  <View
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    <Text style={{ color: '#34D399', fontSize: 10, fontWeight: '800' }}>
                      MÓDULO 4 • ACTIVO
                    </Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                  Control de Plazas Oficiales, Asignación de Cargos y Personal de la Entidad
                </Text>
              </View>
            </View>
          </View>

          {/* Botones de acción rápida */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => setTabActiva('archivos')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: tabActiva === 'archivos' ? COLORS.accentEmeraldDark : COLORS.accentEmerald,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 8,
                opacity: pressed ? 0.85 : 1,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              })}
            >
              <Ionicons name="cloud-upload" size={17} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                Alimentar / Subir Nómina
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
            onPress={() => setTabActiva('plazas')}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 3,
              borderBottomColor: tabActiva === 'plazas' ? COLORS.accentEmerald : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="people"
              size={18}
              color={tabActiva === 'plazas' ? COLORS.accentEmerald : COLORS.textMuted}
            />
            <Text
              style={{
                color: tabActiva === 'plazas' ? '#FFFFFF' : COLORS.textMuted,
                fontWeight: tabActiva === 'plazas' ? '800' : '600',
                fontSize: 14,
              }}
            >
              Plazas y Cargos ({plazas.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTabActiva('archivos')}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 3,
              borderBottomColor: tabActiva === 'archivos' ? COLORS.accentEmerald : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="document-attach"
              size={18}
              color={tabActiva === 'archivos' ? COLORS.accentEmerald : COLORS.textMuted}
            />
            <Text
              style={{
                color: tabActiva === 'archivos' ? '#FFFFFF' : COLORS.textMuted,
                fontWeight: tabActiva === 'archivos' ? '800' : '600',
                fontSize: 14,
              }}
            >
              Carga de Archivos de Nómina
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTabActiva('estructura')}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 3,
              borderBottomColor: tabActiva === 'estructura' ? COLORS.accentEmerald : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="pie-chart"
              size={18}
              color={tabActiva === 'estructura' ? COLORS.accentEmerald : COLORS.textMuted}
            />
            <Text
              style={{
                color: tabActiva === 'estructura' ? '#FFFFFF' : COLORS.textMuted,
                fontWeight: tabActiva === 'estructura' ? '800' : '600',
                fontSize: 14,
              }}
            >
              Estructura & Estadísticas
            </Text>
          </Pressable>
        </View>

        {/* Indicadores KPI */}
        <View
          style={{
            paddingHorizontal: isDesktop ? 36 : 18,
            paddingTop: 16,
            paddingBottom: 8,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <View
              style={{
                flex: 1,
                minWidth: isTablet ? 160 : '47%',
                backgroundColor: COLORS.cardBg,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>TOTAL PLAZAS</Text>
                <Ionicons name="business-outline" size={18} color="#38BDF8" />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 4 }}>
                {estadisticas?.total_plazas || plazas.length}
              </Text>
              <Text style={{ color: '#38BDF8', fontSize: 11, marginTop: 2 }}>Planta aprobada SJD</Text>
            </View>

            <View
              style={{
                flex: 1,
                minWidth: isTablet ? 160 : '47%',
                backgroundColor: COLORS.cardBg,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(16, 185, 129, 0.3)',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>OCUPADAS</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color="#34D399" />
              </View>
              <Text style={{ color: '#34D399', fontSize: 24, fontWeight: '900', marginTop: 4 }}>
                {estadisticas?.ocupadas || 0}
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                {estadisticas?.total_plazas
                  ? `${Math.round(((estadisticas?.ocupadas || 0) / estadisticas.total_plazas) * 100)}% de ocupación`
                  : 'En servicio'}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                minWidth: isTablet ? 160 : '47%',
                backgroundColor: COLORS.cardBg,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>VACANTES DEF.</Text>
                <Ionicons name="alert-circle-outline" size={18} color="#F87171" />
              </View>
              <Text style={{ color: '#F87171', fontSize: 24, fontWeight: '900', marginTop: 4 }}>
                {estadisticas?.vacantes_definitivas || 0}
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>Sin provisión titular</Text>
            </View>

            <View
              style={{
                flex: 1,
                minWidth: isTablet ? 160 : '47%',
                backgroundColor: COLORS.cardBg,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(245, 158, 11, 0.3)',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>VACANTES TEMP.</Text>
                <Ionicons name="time-outline" size={18} color="#FBBF24" />
              </View>
              <Text style={{ color: '#FBBF24', fontSize: 24, fontWeight: '900', marginTop: 4 }}>
                {estadisticas?.vacantes_temporales || 0}
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>Encargos o licencias</Text>
            </View>

            <View
              style={{
                flex: 1.4,
                minWidth: isTablet ? 200 : '100%',
                backgroundColor: COLORS.cardBg,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>MASA SALARIAL BÁSICA</Text>
                <Ionicons name="cash-outline" size={18} color={COLORS.accentEmerald} />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 4 }}>
                {formatearDinero(estadisticas?.masa_salarial_mensual)}
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>Devengado mensual estimado</Text>
            </View>
          </View>
        </View>

        {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
        {tabActiva === 'plazas' && (
          <View style={{ flex: 1, paddingHorizontal: isDesktop ? 36 : 18, paddingTop: 10 }}>
            {/* Barra de Búsqueda y Filtros */}
            <View
              style={{
                backgroundColor: COLORS.cardBg,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginBottom: 14,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
                    placeholder="Buscar por cargo, persona, cédula, código o dependencia..."
                    placeholderTextColor={COLORS.textMuted}
                    style={{
                      flex: 1,
                      color: '#FFFFFF',
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      fontSize: 14,
                    }}
                  />
                  {busqueda.length > 0 && (
                    <Pressable onPress={() => setBusqueda('')}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </Pressable>
                  )}
                </View>

                <Pressable
                  onPress={cargarDatos}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.12)' : '#0C1B2A',
                    padding: 11,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  })}
                >
                  <Ionicons name="refresh" size={18} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Filtros por Nivel */}
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>NIVEL:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {NIVELES.map((niv) => {
                    const sel = nivelSeleccionado === niv;
                    return (
                      <Pressable
                        key={niv}
                        onPress={() => setNivelSeleccionado(niv)}
                        style={{
                          backgroundColor: sel ? COLORS.accentEmerald : 'rgba(255, 255, 255, 0.05)',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: sel ? COLORS.accentEmerald : COLORS.border,
                        }}
                      >
                        <Text
                          style={{
                            color: sel ? '#FFFFFF' : COLORS.textMuted,
                            fontSize: 12,
                            fontWeight: sel ? '800' : '600',
                          }}
                        >
                          {niv}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Filtros por Estado */}
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>ESTADO:</Text>
                {ESTADOS.map((est) => {
                  const sel = estadoSeleccionado === est;
                  return (
                    <Pressable
                      key={est}
                      onPress={() => setEstadoSeleccionado(est)}
                      style={{
                        backgroundColor: sel ? '#38BDF8' : 'rgba(255, 255, 255, 0.05)',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: sel ? '#38BDF8' : COLORS.border,
                      }}
                    >
                      <Text
                        style={{
                          color: sel ? '#0A1822' : COLORS.textMuted,
                          fontSize: 12,
                          fontWeight: sel ? '800' : '600',
                        }}
                      >
                        {est}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Listado de Plazas */}
            {cargando ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                <ActivityIndicator size="large" color={COLORS.accentEmerald} />
                <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 14 }}>
                  Consultando planta de personal y nómina...
                </Text>
              </View>
            ) : plazas.length === 0 ? (
              <View
                style={{
                  backgroundColor: COLORS.cardBg,
                  borderRadius: 12,
                  padding: 40,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 12 }}>
                  No se encontraron cargos o personas
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                  Intente ajustar los términos de búsqueda o filtros seleccionados.
                </Text>
              </View>
            ) : (
              <FlatList
                data={plazas}
                keyExtractor={(item) => String(item.id_plaza)}
                contentContainerStyle={{ paddingBottom: 30, gap: 10 }}
                renderItem={({ item }) => {
                  const badge = getBadgeEstado(item.estado_cargo);
                  const colorNivel = getColorNivel(item.nivel);
                  const tienePerno = !!(item.fondo_salud || item.tipo_funcionario || item.total_devengado);

                  return (
                    <Pressable
                      onPress={() => setPlazaModal(item)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? COLORS.cardBgHover : COLORS.cardBg,
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        gap: 12,
                      })}
                    >
                      {/* Fila superior: ID Plaza, Nivel, Cargo, Estado */}
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
                          <View
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                              PLAZA #{item.id_plaza}
                            </Text>
                          </View>
                          <View
                            style={{
                              backgroundColor: `${colorNivel}22`,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: `${colorNivel}55`,
                            }}
                          >
                            <Text style={{ color: colorNivel, fontSize: 11, fontWeight: '800' }}>
                              {item.nivel || 'N/A'}
                            </Text>
                          </View>
                          <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '600' }}>
                            CÓD. {item.codigo || '-'} • GRADO {item.grado || '-'}
                          </Text>
                        </View>

                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: badge.bg,
                            borderWidth: 1,
                            borderColor: badge.border,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 16,
                          }}
                        >
                          <Ionicons name={badge.icono} size={14} color={badge.color} />
                          <Text style={{ color: badge.color, fontSize: 11, fontWeight: '800' }}>
                            {badge.texto}
                          </Text>
                        </View>
                      </View>

                      {/* Título de Cargo y Dependencia */}
                      <View>
                        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                          {item.cargo}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <Ionicons name="business-outline" size={14} color={COLORS.textMuted} />
                          <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                            {item.dependencia_cargo || 'SECRETARÍA JURÍDICA DISTRITAL'}
                          </Text>
                        </View>
                      </View>

                      {/* Información de la Persona Asignada */}
                      <View
                        style={{
                          backgroundColor: '#0C1B2A',
                          padding: 12,
                          borderRadius: 8,
                          borderLeftWidth: 4,
                          borderLeftColor: item.estado_cargo === 'OCUPADO' ? COLORS.accentEmerald : COLORS.amberAccent,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <View style={{ gap: 2, flex: 1, minWidth: 200 }}>
                          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                            FUNCIONARIO / TITULAR:
                          </Text>
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                            {item.titular_nombre || 'Sin asignación actual'}
                          </Text>
                          {item.titular_cedula ? (
                            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                              C.C. {item.titular_cedula} • {item.tipo_vinculacion || 'Planta'}
                            </Text>
                          ) : null}
                        </View>

                        <View style={{ alignItems: isTablet ? 'flex-end' : 'flex-start', gap: 2 }}>
                          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                            ASIGNACIÓN BÁSICA:
                          </Text>
                          <Text style={{ color: COLORS.accentEmerald, fontSize: 15, fontWeight: '900' }}>
                            {formatearDinero(item.asignacion_basica)}
                          </Text>
                          {tienePerno && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="checkmark-done" size={12} color="#38BDF8" />
                              <Text style={{ color: '#38BDF8', fontSize: 10, fontWeight: '700' }}>
                                Sincronizado Perno
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Pie de tarjeta: Ver detalle */}
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: COLORS.accentEmerald, fontSize: 12, fontWeight: '700' }}>
                          Ver detalles del cargo y funciones
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.accentEmerald} />
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        )}

        {/* PESTAÑA 2: CARGA DE ARCHIVOS DE NÓMINA (Las 2 imágenes explicadas y funcionales) */}
        {tabActiva === 'archivos' && (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: isDesktop ? 36 : 18,
              paddingTop: 16,
              paddingBottom: 40,
              gap: 20,
            }}
          >
            {/* Banner explicativo */}
            <View
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 1.5,
                borderColor: 'rgba(16, 185, 129, 0.35)',
                borderRadius: 14,
                padding: 20,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="information-circle" size={24} color={COLORS.accentEmerald} />
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                  Alimentación de Nómina mediante Carga de Archivos
                </Text>
              </View>
              <Text style={{ color: COLORS.textLight, fontSize: 13, lineHeight: 20 }}>
                Este módulo administra las plazas de la entidad y la relación persona-cargo. Puede alimentar y
                actualizar los datos subiendo los dos archivos oficiales en formato Excel (.xlsx / .xls):
              </Text>
              <View style={{ gap: 6, marginTop: 4 }}>
                <Text style={{ color: '#34D399', fontSize: 13, fontWeight: '700' }}>
                  • Archivo 1 (Planta): Define las plazas, cargos, dependencias, vacancias y perfil.
                </Text>
                <Text style={{ color: '#38BDF8', fontSize: 13, fontWeight: '700' }}>
                  • Archivo 2 (Planta Perno): Enlaza cada persona con seguridad social, nombramientos y sueldos.
                </Text>
              </View>
            </View>

            {/* Cuadrícula de las 2 fuentes de carga */}
            <View
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: 18,
              }}
            >
              {/* Tarjeta Archivo 1: Planta (Imagen 1) */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.cardBg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  padding: 20,
                  gap: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: 'rgba(16, 185, 129, 0.16)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <Ionicons name="document-text" size={22} color={COLORS.accentEmerald} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '800' }}>
                      ARCHIVO 1 • ESTRUCTURA
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                      Planta de Personal (Imagen 1)
                    </Text>
                  </View>
                </View>

                <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 19 }}>
                  Contiene la estructura oficial de las plazas de la Secretaría: Cargos, Códigos, Grados,
                  Dependencias, Requisitos, Funciones y Estado de cada plaza (Ocupado / Vacante).
                </Text>

                <View
                  style={{
                    backgroundColor: '#0C1B2A',
                    borderRadius: 8,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: COLORS.borderLight,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                    COLUMNAS CLAVE ESPERADAS (Fila 4):
                  </Text>
                  <Text style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 18 }}>
                    • ID Plaza, Cédula, Nombres y Apellidos{'\n'}
                    • Nivel, Nomenclatura Cargo, Código, Grado{'\n'}
                    • Dependencia del Cargo, Propósito, Funciones{'\n'}
                    • Requisitos de Estudio y Experiencia, Asignación
                  </Text>
                </View>

                {nombreArchivoPlanta && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.accentEmerald} />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, flex: 1 }} numberOfLines={1}>
                      {nombreArchivoPlanta}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={handleSeleccionarArchivoPlanta}
                  disabled={cargandoArchivoPlanta}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: pressed ? COLORS.accentEmeraldDark : COLORS.accentEmerald,
                    paddingVertical: 12,
                    borderRadius: 8,
                    opacity: cargandoArchivoPlanta ? 0.6 : 1,
                  })}
                >
                  {cargandoArchivoPlanta ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                  )}
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                    {cargandoArchivoPlanta ? 'Procesando Archivo...' : 'Seleccionar Archivo de Planta (.xlsx)'}
                  </Text>
                </Pressable>
              </View>

              {/* Tarjeta Archivo 2: Planta Perno (Imagen 2) */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.cardBg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  padding: 20,
                  gap: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: 'rgba(56, 189, 248, 0.16)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    <Ionicons name="card" size={22} color="#38BDF8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '800' }}>
                      ARCHIVO 2 • NÓMINA & PERSONAL
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                      Planta Perno / Nómina (Imagen 2)
                    </Text>
                  </View>
                </View>

                <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 19 }}>
                  Contiene la relación detallada de funcionarios: Afiliación a Fondos de Salud (EPS), Pensión,
                  Cesantías, Tipo de funcionario, Datos de contacto, Fechas de ingreso y Actos de nombramiento.
                </Text>

                <View
                  style={{
                    backgroundColor: '#0C1B2A',
                    borderRadius: 8,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: COLORS.borderLight,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700' }}>
                    COLUMNAS CLAVE ESPERADAS (Fila 9):
                  </Text>
                  <Text style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 18 }}>
                    • Número Identificación, Apellidos, Nombres{'\n'}
                    • Tipo Funcionario, Sexo, Dirección, Teléfono{'\n'}
                    • Fondo Salud (EPS), Pensión, Cesantías{'\n'}
                    • Acto y Número de Nombramiento, Total Devengado
                  </Text>
                </View>

                {nombreArchivoPerno && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: 'rgba(56, 189, 248, 0.12)',
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#38BDF8" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, flex: 1 }} numberOfLines={1}>
                      {nombreArchivoPerno}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={handleSeleccionarArchivoPerno}
                  disabled={cargandoArchivoPerno}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: pressed ? '#0284C7' : '#0284C7',
                    paddingVertical: 12,
                    borderRadius: 8,
                    opacity: cargandoArchivoPerno ? 0.6 : 1,
                  })}
                >
                  {cargandoArchivoPerno ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                  )}
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                    {cargandoArchivoPerno ? 'Procesando Archivo...' : 'Seleccionar Archivo Planta Perno (.xlsx)'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Inicialización automática si existe el archivo base */}
            <View
              style={{
                backgroundColor: COLORS.cardBg,
                borderRadius: 12,
                padding: 18,
                borderWidth: 1,
                borderColor: COLORS.border,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <View style={{ flex: 1, minWidth: 260 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                  Sincronización Rápida con Archivo Base Oficial
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                  Sincroniza directamente las 170 plazas preconfiguradas y registros de nómina ya integrados.
                </Text>
              </View>

              <Pressable
                onPress={handleSincronizarLocal}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                })}
              >
                <Ionicons name="sync" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  Sincronizar Base Actual
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {/* PESTAÑA 3: ESTRUCTURA ORGANIZACIONAL & ESTADÍSTICAS */}
        {tabActiva === 'estructura' && (
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
                gap: 14,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                Distribución de Plazas por Nivel Jerárquico
              </Text>
              <View style={{ gap: 10 }}>
                {NIVELES.filter((n) => n !== 'TODOS').map((niv) => {
                  const cant = plazas.filter((p) => p.nivel?.toUpperCase() === niv).length;
                  const total = plazas.length || 1;
                  const pct = Math.round((cant / total) * 100);
                  const color = getColorNivel(niv);

                  return (
                    <View key={niv} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{niv}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                          {cant} plazas ({pct}%)
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 8,
                          backgroundColor: '#0C1B2A',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            backgroundColor: color,
                            borderRadius: 4,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View
              style={{
                backgroundColor: COLORS.cardBg,
                borderRadius: 14,
                padding: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 14,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                Dependencias de la Entidad ({listaDependencias.length - 1})
              </Text>
              <View style={{ gap: 8 }}>
                {listaDependencias
                  .filter((d) => d !== 'TODAS')
                  .map((dep) => {
                    const cant = plazas.filter((p) => p.dependencia_cargo === dep).length;
                    const ocupadas = plazas.filter((p) => p.dependencia_cargo === dep && p.estado_cargo === 'OCUPADO').length;

                    return (
                      <View
                        key={dep}
                        style={{
                          backgroundColor: '#0C1B2A',
                          padding: 12,
                          borderRadius: 8,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: COLORS.borderLight,
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{dep}</Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                            {ocupadas} de {cant} plazas ocupadas
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.16)',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: COLORS.accentEmerald, fontSize: 11, fontWeight: '800' }}>
                            {cant} Plazas
                          </Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            </View>
          </ScrollView>
        )}

        {/* MODAL DETALLE DE PLAZA Y CARGO (Regla: Usar Modals en vez de alerts) */}
        <Modal
          visible={!!plazaModal}
          transparent
          animationType="fade"
          onRequestClose={() => setPlazaModal(null)}
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
                maxWidth: 720,
                maxHeight: '90%',
                overflow: 'hidden',
              }}
            >
              {/* Cabecera del Modal */}
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
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.accentEmerald, fontSize: 11, fontWeight: '800' }}>
                    PLAZA #{plazaModal?.id_plaza} • CÓDIGO {plazaModal?.codigo} • GRADO {plazaModal?.grado}
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 2 }}>
                    {plazaModal?.cargo}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setPlazaModal(null)}
                  style={({ pressed }) => ({
                    padding: 6,
                    borderRadius: 6,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  })}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Cuerpo del Modal */}
              <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                {/* Sección 1: Datos de la Persona Asignada */}
                <View
                  style={{
                    backgroundColor: '#0B1724',
                    padding: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: COLORS.borderLight,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '800' }}>
                    PERSONA EN EL CARGO
                  </Text>
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                      {plazaModal?.titular_nombre || 'Plaza Vacante'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      {plazaModal?.titular_cedula ? (
                        <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                          Cédula: <Text style={{ color: '#FFFFFF' }}>{plazaModal?.titular_cedula}</Text>
                        </Text>
                      ) : null}
                      <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                        Estado:{' '}
                        <Text style={{ color: COLORS.accentEmerald, fontWeight: '700' }}>
                          {plazaModal?.estado_cargo}
                        </Text>
                      </Text>
                      {plazaModal?.tipo_vinculacion ? (
                        <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                          Vinculación:{' '}
                          <Text style={{ color: '#FFFFFF' }}>{plazaModal?.tipo_vinculacion}</Text>
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Sección 2: Nómina y Afiliaciones (Datos de Planta Perno) */}
                <View
                  style={{
                    backgroundColor: '#0B1724',
                    padding: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: COLORS.borderLight,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: '#FBBF24', fontSize: 12, fontWeight: '800' }}>
                    NÓMINA & AFILIACIONES (PLANTA PERNO)
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <View style={{ minWidth: 140, flex: 1 }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Asignación Básica</Text>
                      <Text style={{ color: '#34D399', fontSize: 15, fontWeight: '800' }}>
                        {formatearDinero(plazaModal?.asignacion_basica)}
                      </Text>
                    </View>

                    <View style={{ minWidth: 140, flex: 1 }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Fondo de Salud (EPS)</Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                        {plazaModal?.fondo_salud || 'No registrado'}
                      </Text>
                    </View>

                    <View style={{ minWidth: 140, flex: 1 }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Fondo de Pensión</Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                        {plazaModal?.fondo_pension || 'No registrado'}
                      </Text>
                    </View>

                    <View style={{ minWidth: 140, flex: 1 }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Cesantías</Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                        {plazaModal?.fondo_cesantias || 'No registrado'}
                      </Text>
                    </View>

                    {plazaModal?.tipo_funcionario ? (
                      <View style={{ minWidth: 140, flex: 1 }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Tipo Funcionario</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                          {plazaModal?.tipo_funcionario}
                        </Text>
                      </View>
                    ) : null}

                    {plazaModal?.telefono ? (
                      <View style={{ minWidth: 140, flex: 1 }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Teléfono Contacto</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                          {plazaModal?.telefono}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Sección 3: Dependencia y Nivel */}
                <View
                  style={{
                    backgroundColor: '#0B1724',
                    padding: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: COLORS.borderLight,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '800' }}>
                    UBICACIÓN ADMINISTRATIVA
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 14 }}>
                    <Text style={{ color: COLORS.textMuted }}>Dependencia:</Text>{' '}
                    {plazaModal?.dependencia_cargo}
                  </Text>
                  {plazaModal?.dependencia_funcional && (
                    <Text style={{ color: '#FFFFFF', fontSize: 14 }}>
                      <Text style={{ color: COLORS.textMuted }}>Dependencia Funcional:</Text>{' '}
                      {plazaModal?.dependencia_funcional}
                    </Text>
                  )}
                </View>

                {/* Sección 4: Propósito del Cargo */}
                {plazaModal?.proposito ? (
                  <View
                    style={{
                      backgroundColor: '#0B1724',
                      padding: 14,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: COLORS.borderLight,
                      gap: 6,
                    }}
                  >
                    <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '800' }}>
                      PROPÓSITO PRINCIPAL DEL CARGO
                    </Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 19 }}>
                      {plazaModal.proposito}
                    </Text>
                  </View>
                ) : null}

                {/* Sección 5: Requisitos de Estudio y Experiencia */}
                {plazaModal?.requisitos ? (
                  <View
                    style={{
                      backgroundColor: '#0B1724',
                      padding: 14,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: COLORS.borderLight,
                      gap: 6,
                    }}
                  >
                    <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '800' }}>
                      REQUISITOS DEL MANUAL DE FUNCIONES
                    </Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 19 }}>
                      {plazaModal.requisitos}
                    </Text>
                  </View>
                ) : null}
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
                }}
              >
                <Pressable
                  onPress={() => setPlazaModal(null)}
                  style={{
                    backgroundColor: COLORS.accentEmerald,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Cerrar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL INFORMATIVO GENERAL (Regla: Usar Modals en vez de alerts) */}
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
                        : infoModalTipo === 'error'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(56, 189, 248, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={
                      infoModalTipo === 'success'
                        ? 'checkmark-circle'
                        : infoModalTipo === 'error'
                        ? 'alert-circle'
                        : 'information-circle'
                    }
                    size={24}
                    color={
                      infoModalTipo === 'success'
                        ? COLORS.accentEmerald
                        : infoModalTipo === 'error'
                        ? COLORS.danger
                        : COLORS.blueAccent
                    }
                  />
                </View>
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800', flex: 1 }}>
                  {infoModalTitulo}
                </Text>
              </View>

              <Text style={{ color: '#CBD5E1', fontSize: 14, lineHeight: 20 }}>
                {infoModalMensaje}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                <Pressable
                  onPress={() => setInfoModalVisible(false)}
                  style={{
                    backgroundColor: COLORS.accentEmerald,
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
