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
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { nominaService, PlazaNomina, EstadisticasNomina } from '../../lib/nominaService';
import mockPlazasData from '../../lib/plantaMockData.json';

// Sistema de diseño institucional Navy + Slate
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
  const [idSieapFiltro, setIdSieapFiltro] = useState('');
  const [nivelSeleccionado, setNivelSeleccionado] = useState('TODOS');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('TODOS');
  const [dependenciaSeleccionada, setDependenciaSeleccionada] = useState('TODAS');
  const [cargoSeleccionado, setCargoSeleccionado] = useState('TODOS');
  const [soloEncargo, setSoloEncargo] = useState(false);
  const [modoVista, setModoVista] = useState<'tabla' | 'cards'>('tabla');

  // Modales de selección de filtros
  const [modalDependenciaVisible, setModalDependenciaVisible] = useState(false);
  const [busquedaModalDep, setBusquedaModalDep] = useState('');
  const [modalCargoVisible, setModalCargoVisible] = useState(false);
  const [busquedaModalCargo, setBusquedaModalCargo] = useState('');

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
          id_sieap: idSieapFiltro,
          nivel: nivelSeleccionado,
          estado: estadoSeleccionado,
          dependencia: dependenciaSeleccionada,
          cargo: cargoSeleccionado,
          solo_encargo: soloEncargo,
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
  }, [busqueda, idSieapFiltro, nivelSeleccionado, estadoSeleccionado, dependenciaSeleccionada, cargoSeleccionado, soloEncargo]);

  // Listado consolidado de dependencias para el filtro
  const listaDependencias = useMemo(() => {
    const deps = new Set<string>();
    (mockPlazasData as unknown as PlazaNomina[]).forEach((p) => {
      if (p.dependencia_cargo) deps.add(p.dependencia_cargo);
    });
    return ['TODAS', ...Array.from(deps).sort()];
  }, []);

  // Listado consolidado de cargos para el filtro
  const listaCargos = useMemo(() => {
    const c = new Set<string>();
    (mockPlazasData as unknown as PlazaNomina[]).forEach((p) => {
      if (p.cargo) c.add(p.cargo);
    });
    return ['TODOS', ...Array.from(c).sort()];
  }, []);

  const hayFiltrosActivos =
    busqueda.trim() !== '' ||
    idSieapFiltro.trim() !== '' ||
    nivelSeleccionado !== 'TODOS' ||
    estadoSeleccionado !== 'TODOS' ||
    dependenciaSeleccionada !== 'TODAS' ||
    cargoSeleccionado !== 'TODOS' ||
    soloEncargo;

  const limpiarFiltros = () => {
    setBusqueda('');
    setIdSieapFiltro('');
    setNivelSeleccionado('TODOS');
    setEstadoSeleccionado('TODOS');
    setDependenciaSeleccionada('TODAS');
    setCargoSeleccionado('TODOS');
    setSoloEncargo(false);
  };

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

  const formatearDinero = (val?: number | string) => {
    if (!val) return '$0';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '$0';
    return '$' + Math.round(num).toLocaleString('es-CO');
  };

  // Badges institucionales
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
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 9999,
          alignSelf: 'flex-start',
        }}
      >
        <Text style={{ color, fontSize: 10.5, fontWeight: '600', textTransform: 'capitalize' }}>
          {nivel?.toLowerCase() || 'Sin nivel'}
        </Text>
      </View>
    );
  };

  // Cálculos de KPIs
  const totalOcupadas = estadisticas?.ocupadas ?? 155;
  const vacDefinitivas = estadisticas?.vacantes_definitivas ?? 5;
  const vacTemporales = estadisticas?.vacantes_temporales ?? 10;
  const totalVacantes = vacDefinitivas + vacTemporales;
  const pctOcupacion = Math.round((totalOcupadas / (estadisticas?.total_plazas || 170)) * 100);
  const totalEncargos = plazas.filter((p) => p.es_encargo).length;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.slate50 }}>
      {/* Ocultar el Header nativo del Stack para evitar el doble header */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* ============================================================== */}
        {/* CABECERA INSTITUCIONAL ÚNICA (AZUL MARCA-900, ANCHO 100%)       */}
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
        {/* CUERPO PRINCIPAL (USA EL 100% DEL ANCHO DE LA PÁGINA)          */}
        {/* ============================================================== */}
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{
            paddingHorizontal: isDesktop ? 32 : 16,
            paddingVertical: 24,
            width: '100%',
          }}
        >
          {/* TÍTULO Y SUBTÍTULO DE PÁGINA */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: '600', color: THEME.slate900 }}>
              Censo Oficial de Planta y Nómina
            </Text>
            <Text style={{ fontSize: 13, color: THEME.slate500, marginTop: 4 }}>
              Consulta unificada de las 170 plazas institucionales, titulares, servidores en encargo y nómina perno.
            </Text>
          </View>

          {/* ============================================================== */}
          {/* KPI CARDS (ANCHO COMPLETO Y FLEXIBLE)                         */}
          {/* ============================================================== */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 14,
              marginBottom: 24,
              width: '100%',
            }}
          >
            {/* KPI 1: Total Plazas */}
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
                Cargos Ocupados
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '600', color: THEME.emeraldText, marginTop: 4 }}>
                {totalOcupadas}
              </Text>
              <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                {pctOcupacion}% vinculados activos
              </Text>
            </View>

            {/* KPI 3: Plazas con Encargo */}
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
                Plazas en Encargo
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '600', color: THEME.amberText, marginTop: 4 }}>
                {totalEncargos}
              </Text>
              <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                Con servidor encargado activo
              </Text>
            </View>

            {/* KPI 4: Vacantes */}
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
                Vacantes en Trámite
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '600', color: THEME.roseText, marginTop: 4 }}>
                {totalVacantes}
              </Text>
              <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                {vacDefinitivas} definitivas · {vacTemporales} temporales
              </Text>
            </View>

            {/* KPI 5: Masa Salarial Mensual */}
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
                Masa Salarial Básica
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '600', color: THEME.slate900, marginTop: 4 }}>
                {formatearDinero(estadisticas?.masa_salarial_mensual || 1789230000)}
              </Text>
              <Text style={{ fontSize: 12, color: THEME.slate400, marginTop: 2 }}>
                Devengado mensual estimado
              </Text>
            </View>
          </View>

          {/* ============================================================== */}
          {/* PESTAÑAS (NAVEGACIÓN)                                         */}
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
            <View style={{ width: '100%' }}>
              {/* FILTROS Y BARRA DE BÚSQUEDA AVANZADA */}
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
                  width: '100%',
                }}
              >
                {/* Fila 1: Búsqueda General + Búsqueda por ID SIEAP + Toggle Cards/Tabla */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Input de búsqueda por nombre, cédula, cargo */}
                  <View
                    style={{
                      flex: 2,
                      minWidth: isTablet ? 280 : '100%',
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
                      placeholder="Buscar por cédula, nombre de titular o encargado, cargo o código..."
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

                  {/* Input específico para ID SIEAP / SIDEAP */}
                  <View
                    style={{
                      flex: 1,
                      minWidth: isTablet ? 170 : '100%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: THEME.slate50,
                      borderWidth: 1,
                      borderColor: idSieapFiltro ? THEME.marca600 : THEME.slate200,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Ionicons name="card-outline" size={17} color={idSieapFiltro ? THEME.marca700 : THEME.slate400} />
                    <TextInput
                      value={idSieapFiltro}
                      onChangeText={setIdSieapFiltro}
                      placeholder="Filtro ID SIEAP..."
                      placeholderTextColor={THEME.slate400}
                      keyboardType="numeric"
                      style={{
                        flex: 1,
                        marginLeft: 8,
                        fontSize: 13,
                        color: THEME.slate900,
                        padding: 0,
                      }}
                    />
                    {idSieapFiltro ? (
                      <Pressable onPress={() => setIdSieapFiltro('')}>
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

                {/* Fila 2: Selectores de Dependencia, Cargo y Toggle Encargos */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginTop: 14,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: THEME.slate100,
                  }}
                >
                  {/* Selector de Dependencia */}
                  <Pressable
                    onPress={() => setModalDependenciaVisible(true)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: dependenciaSeleccionada !== 'TODAS' ? THEME.marca600 : THEME.slate200,
                      backgroundColor: dependenciaSeleccionada !== 'TODAS' ? THEME.marca50 : pressed ? THEME.slate100 : THEME.white,
                    })}
                  >
                    <Ionicons
                      name="business-outline"
                      size={15}
                      color={dependenciaSeleccionada !== 'TODAS' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: dependenciaSeleccionada !== 'TODAS' ? '600' : '500',
                        color: dependenciaSeleccionada !== 'TODAS' ? THEME.marca800 : THEME.slate700,
                        maxWidth: 220,
                      }}
                      numberOfLines={1}
                    >
                      {dependenciaSeleccionada === 'TODAS'
                        ? 'Dependencia: Todas'
                        : `Dep: ${dependenciaSeleccionada}`}
                    </Text>
                    <Ionicons name="chevron-down" size={13} color={THEME.slate400} />
                  </Pressable>

                  {/* Selector de Cargo */}
                  <Pressable
                    onPress={() => setModalCargoVisible(true)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: cargoSeleccionado !== 'TODOS' ? THEME.marca600 : THEME.slate200,
                      backgroundColor: cargoSeleccionado !== 'TODOS' ? THEME.marca50 : pressed ? THEME.slate100 : THEME.white,
                    })}
                  >
                    <Ionicons
                      name="briefcase-outline"
                      size={15}
                      color={cargoSeleccionado !== 'TODOS' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: cargoSeleccionado !== 'TODOS' ? '600' : '500',
                        color: cargoSeleccionado !== 'TODOS' ? THEME.marca800 : THEME.slate700,
                        maxWidth: 200,
                      }}
                      numberOfLines={1}
                    >
                      {cargoSeleccionado === 'TODOS' ? 'Cargo: Todos' : `Cargo: ${cargoSeleccionado}`}
                    </Text>
                    <Ionicons name="chevron-down" size={13} color={THEME.slate400} />
                  </Pressable>

                  {/* Toggle "¿Solo Encargos?" */}
                  <Pressable
                    onPress={() => setSoloEncargo(!soloEncargo)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: soloEncargo ? '#F59E0B' : THEME.slate200,
                      backgroundColor: soloEncargo ? '#FEF3C7' : THEME.white,
                    }}
                  >
                    <Ionicons
                      name={soloEncargo ? 'swap-horizontal' : 'swap-horizontal-outline'}
                      size={15}
                      color={soloEncargo ? '#B45309' : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: soloEncargo ? '700' : '500',
                        color: soloEncargo ? '#B45309' : THEME.slate600,
                      }}
                    >
                      ¿En Encargo? {soloEncargo ? '(Activo)' : ''}
                    </Text>
                  </Pressable>

                  {/* Botón para limpiar filtros */}
                  {hayFiltrosActivos && (
                    <Pressable
                      onPress={limpiarFiltros}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor: THEME.roseBg,
                        borderWidth: 1,
                        borderColor: THEME.roseRing,
                        marginLeft: 'auto',
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={14} color={THEME.roseText} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.roseText }}>
                        Limpiar Filtros
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Fila 3: Chips de Niveles y Estados */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginTop: 12,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: THEME.slate100,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate400, textTransform: 'uppercase' }}>
                    Nivel:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {NIVELES.map((niv) => {
                      const activo = nivelSeleccionado === niv;
                      return (
                        <Pressable
                          key={niv}
                          onPress={() => setNivelSeleccionado(niv)}
                          style={{
                            paddingHorizontal: 9,
                            paddingVertical: 3,
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

                  <View style={{ width: 1, height: 16, backgroundColor: THEME.slate200, marginHorizontal: 2 }} />

                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate400, textTransform: 'uppercase' }}>
                    Estado:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {ESTADOS.map((est) => {
                      const activo = estadoSeleccionado === est;
                      return (
                        <Pressable
                          key={est}
                          onPress={() => setEstadoSeleccionado(est)}
                          style={{
                            paddingHorizontal: 9,
                            paddingVertical: 3,
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

              {/* LISTADO / TABLA O TARJETAS */}
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
                    width: '100%',
                  }}
                >
                  <ActivityIndicator size="large" color={THEME.marca600} />
                  <Text style={{ color: THEME.slate500, fontSize: 13, marginTop: 12 }}>
                    Cargando plazas, titulares y encargos de nómina...
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
                    width: '100%',
                  }}
                >
                  <Ionicons name="folder-open-outline" size={38} color={THEME.slate300} />
                  <Text style={{ color: THEME.slate700, fontSize: 15, fontWeight: '600', marginTop: 10 }}>
                    No se encontraron plazas con los filtros seleccionados
                  </Text>
                  <Text style={{ color: THEME.slate400, fontSize: 12, marginTop: 4 }}>
                    Intenta modificar los filtros de cargo, dependencia, id sieap o limpiar filtros.
                  </Text>
                  <Pressable
                    onPress={limpiarFiltros}
                    style={{
                      marginTop: 16,
                      backgroundColor: THEME.marca700,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '600' }}>
                      Restablecer Filtros
                    </Text>
                  </Pressable>
                </View>
              ) : modoVista === 'tabla' ? (
                /* ============================================================== */
                /* VISTA TABLA (ANCHO 100%, COLUMNAS EN PORCENTAJE)               */
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
                    width: '100%',
                  }}
                >
                  <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
                    <View style={{ width: '100%', minWidth: 1100 }}>
                      {/* Cabecera de la tabla con porcentajes exactos */}
                      <View
                        style={{
                          flexDirection: 'row',
                          backgroundColor: THEME.slate50,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.slate200,
                          paddingVertical: 11,
                          paddingHorizontal: 16,
                          alignItems: 'center',
                        }}
                      >
                        {/* 1. ID / SIDEAP: 9% */}
                        <Text style={{ width: '9%', fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Plaza / SIEAP
                        </Text>
                        {/* 2. Denominación / Nivel: 21% */}
                        <Text style={{ width: '21%', fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Cargo & Nivel
                        </Text>
                        {/* 3. Servidor (Encargado y Titular): 27% */}
                        <Text style={{ width: '27%', fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Servidor (Encargado / Titular)
                        </Text>
                        {/* 4. Estado: 11% */}
                        <Text style={{ width: '11%', fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Estado
                        </Text>
                        {/* 5. Dependencia: 16% */}
                        <Text style={{ width: '16%', fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Dependencia
                        </Text>
                        {/* 6. Asignación Básica: 9% */}
                        <Text style={{ width: '9%', fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase', textAlign: 'right' }}>
                          Básico
                        </Text>
                        {/* 7. Acción: 7% */}
                        <Text style={{ width: '7%', fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase', textAlign: 'center' }}>
                          Ficha
                        </Text>
                      </View>

                      {/* Filas */}
                      {plazas.map((p, index) => {
                        const estadoNorm = (p.estado_cargo || '').toUpperCase();
                        const esVacante = estadoNorm.includes('VACANTE') || (!p.titular_nombre && !p.encargo_nombre);
                        const tieneEncargo = p.es_encargo || (p.encargo_nombre && p.encargo_nombre.trim() !== '' && p.encargo_nombre.trim() !== (p.titular_nombre || '').trim());

                        return (
                          <Pressable
                            key={p.id_plaza || index}
                            onPress={() => setPlazaModal(p)}
                            style={({ pressed }) => ({
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 12,
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
                            {/* 1. ID Plaza & ID SIDEAP (SIEAP): 9% */}
                            <View style={{ width: '9%' }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>
                                #{p.id_plaza}
                              </Text>
                              <Text style={{ fontSize: 10, color: THEME.slate500, marginTop: 1 }}>
                                SIEAP: <Text style={{ fontWeight: '600', color: THEME.marca700 }}>{p.id_sideap || '---'}</Text>
                              </Text>
                            </View>

                            {/* 2. Denominación del Empleo & Nivel: 21% */}
                            <View style={{ width: '21%', paddingRight: 10 }}>
                              <Text
                                numberOfLines={1}
                                style={{ fontSize: 13, fontWeight: '600', color: THEME.marca700 }}
                              >
                                {p.cargo || 'Sin denominación'}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                {renderBadgeNivel(p.nivel)}
                                <Text style={{ fontSize: 10.5, color: THEME.slate400 }}>
                                  Cód. {p.codigo || '---'} Gr. {p.grado || '00'}
                                </Text>
                              </View>
                            </View>

                            {/* 3. Servidor: Primero quién está ENCARGADO, luego TITULAR: 27% */}
                            <View style={{ width: '27%', paddingRight: 12, justifyContent: 'center' }}>
                              {esVacante ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <Ionicons name="alert-circle-outline" size={14} color={THEME.roseText} />
                                  <Text style={{ fontSize: 12, fontStyle: 'italic', color: THEME.slate400 }}>
                                    Sin servidor vinculado ({p.estado_cargo || 'Vacante'})
                                  </Text>
                                </View>
                              ) : tieneEncargo ? (
                                <View style={{ gap: 2 }}>
                                  {/* Primero: ENCARGADO */}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                    <View
                                      style={{
                                        backgroundColor: '#FEF3C7',
                                        borderColor: '#F59E0B',
                                        borderWidth: 1,
                                        paddingHorizontal: 5,
                                        paddingVertical: 1,
                                        borderRadius: 4,
                                      }}
                                    >
                                      <Text style={{ color: '#B45309', fontSize: 9.5, fontWeight: '700' }}>
                                        ENCARGADO(A)
                                      </Text>
                                    </View>
                                    <Text
                                      numberOfLines={1}
                                      style={{ fontSize: 12.5, fontWeight: '700', color: THEME.slate900, flexShrink: 1 }}
                                    >
                                      {p.encargo_nombre}
                                    </Text>
                                  </View>
                                  {p.encargo_cedula ? (
                                    <Text style={{ fontSize: 10.5, color: THEME.slate500, marginLeft: 2 }}>
                                      C.C. {p.encargo_cedula} • {p.situacion_administrativa || 'Encargo'}
                                    </Text>
                                  ) : null}

                                  {/* Luego: TITULAR */}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: THEME.slate400, textTransform: 'uppercase' }}>
                                      Titular:
                                    </Text>
                                    <Text
                                      numberOfLines={1}
                                      style={{ fontSize: 11, fontWeight: '500', color: THEME.slate600, flexShrink: 1 }}
                                    >
                                      {p.titular_nombre || 'Vacante Definitiva'}
                                    </Text>
                                    {p.situacion_titular ? (
                                      <Text style={{ fontSize: 9.5, color: THEME.slate400, fontStyle: 'italic' }}>
                                        ({p.situacion_titular})
                                      </Text>
                                    ) : null}
                                  </View>
                                </View>
                              ) : (
                                /* Titular directo sin encargo */
                                <View style={{ gap: 2 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    <View
                                      style={{
                                        backgroundColor: THEME.slate100,
                                        borderColor: THEME.slate300,
                                        borderWidth: 1,
                                        paddingHorizontal: 5,
                                        paddingVertical: 1,
                                        borderRadius: 4,
                                      }}
                                    >
                                      <Text style={{ color: THEME.slate600, fontSize: 9.5, fontWeight: '600' }}>
                                        TITULAR
                                      </Text>
                                    </View>
                                    <Text
                                      numberOfLines={1}
                                      style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate900, flexShrink: 1 }}
                                    >
                                      {p.titular_nombre || 'Servidor Registrado'}
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 10.5, color: THEME.slate500, marginLeft: 2 }}>
                                    {p.titular_cedula ? `C.C. ${p.titular_cedula} • ` : ''}
                                    {p.situacion_administrativa || p.tipo_vinculacion || 'En Propiedad'}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* 4. Estado: 11% */}
                            <View style={{ width: '11%' }}>{renderBadgeEstado(p.estado_cargo)}</View>

                            {/* 5. Dependencia: 16% */}
                            <View style={{ width: '16%', paddingRight: 8 }}>
                              <Text numberOfLines={2} style={{ fontSize: 11.5, color: THEME.slate700 }}>
                                {p.dependencia_cargo || 'Secretaría Jurídica Distrital'}
                              </Text>
                            </View>

                            {/* 6. Asignación Básica: 9% */}
                            <View style={{ width: '9%', alignItems: 'flex-end', paddingRight: 8 }}>
                              <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate900 }}>
                                {formatearDinero(p.asignacion_basica)}
                              </Text>
                              <Text style={{ fontSize: 9.5, color: THEME.slate400 }}>COP</Text>
                            </View>

                            {/* 7. Acción: 7% */}
                            <View style={{ width: '7%', alignItems: 'center' }}>
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
                /* VISTA TARJETAS (CARDS GRID COMPLETO)                           */
                /* ============================================================== */
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 16,
                    width: '100%',
                  }}
                >
                  {plazas.map((p, index) => {
                    const estadoNorm = (p.estado_cargo || '').toUpperCase();
                    const esVacante = estadoNorm.includes('VACANTE') || (!p.titular_nombre && !p.encargo_nombre);
                    const tieneEncargo = p.es_encargo || (p.encargo_nombre && p.encargo_nombre.trim() !== '' && p.encargo_nombre.trim() !== (p.titular_nombre || '').trim());

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
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate400 }}>
                              PLAZA #{p.id_plaza}
                            </Text>
                            {p.id_sideap ? (
                              <View style={{ backgroundColor: THEME.marca50, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ fontSize: 9.5, fontWeight: '700', color: THEME.marca700 }}>
                                  SIEAP: {p.id_sideap}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          {renderBadgeEstado(p.estado_cargo)}
                        </View>

                        {/* Título del cargo */}
                        <Text
                          numberOfLines={2}
                          style={{ fontSize: 14.5, fontWeight: '600', color: THEME.marca700, marginBottom: 4 }}
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

                        <View style={{ height: 1, backgroundColor: THEME.slate100, marginBottom: 10 }} />

                        {/* Servidores: Encargado primero y luego Titular */}
                        <View style={{ marginBottom: 10 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.slate400, textTransform: 'uppercase', marginBottom: 4 }}>
                            Servidor Asignado
                          </Text>

                          {esVacante ? (
                            <Text style={{ fontSize: 12, fontStyle: 'italic', color: THEME.slate400 }}>
                              Vacante disponible en planta
                            </Text>
                          ) : tieneEncargo ? (
                            <View style={{ gap: 4 }}>
                              {/* Encargado */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                                  <Text style={{ color: '#B45309', fontSize: 9, fontWeight: '700' }}>ENCARGADO</Text>
                                </View>
                                <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: THEME.slate900, flexShrink: 1 }}>
                                  {p.encargo_nombre}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 10.5, color: THEME.slate500 }}>
                                C.C. {p.encargo_cedula || '---'} • {p.situacion_administrativa || 'Encargo'}
                              </Text>

                              {/* Titular */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Text style={{ fontSize: 10, fontWeight: '600', color: THEME.slate400 }}>Titular:</Text>
                                <Text numberOfLines={1} style={{ fontSize: 11, color: THEME.slate600, flexShrink: 1 }}>
                                  {p.titular_nombre}
                                </Text>
                                {p.situacion_titular ? (
                                  <Text style={{ fontSize: 9.5, color: THEME.slate400, fontStyle: 'italic' }}>
                                    ({p.situacion_titular})
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          ) : (
                            <View style={{ gap: 2 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <View style={{ backgroundColor: THEME.slate100, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                                  <Text style={{ color: THEME.slate600, fontSize: 9, fontWeight: '600' }}>TITULAR</Text>
                                </View>
                                <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate900, flexShrink: 1 }}>
                                  {p.titular_nombre}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 10.5, color: THEME.slate500 }}>
                                {p.titular_cedula ? `C.C. ${p.titular_cedula} • ` : ''}{p.situacion_administrativa || 'En propiedad'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Dependencia */}
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.slate400, textTransform: 'uppercase' }}>
                            Dependencia
                          </Text>
                          <Text numberOfLines={1} style={{ fontSize: 11.5, color: THEME.slate700, marginTop: 1 }}>
                            {p.dependencia_cargo || 'Secretaría Jurídica Distrital'}
                          </Text>
                        </View>

                        {/* Pie de tarjeta */}
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
                            <Text style={{ fontSize: 9.5, color: THEME.slate400, textTransform: 'uppercase' }}>
                              Asignación Básica
                            </Text>
                            <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate900 }}>
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
            <View style={{ width: '100%' }}>
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 20,
                  marginBottom: 20,
                  width: '100%',
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
                    width: '100%',
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
                              height: '100%',
                              width: `${porcentaje}%`,
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
          {/* PESTAÑA: CARGA DE ARCHIVOS                                     */}
          {/* ============================================================== */}
          {tabActiva === 'archivos' && (
            <View style={{ width: '100%' }}>
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 24,
                  width: '100%',
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '600', color: THEME.slate900 }}>
                  Alimentación de Nómina y Actualización de Planta
                </Text>
                <Text style={{ fontSize: 13, color: THEME.slate500, marginTop: 4 }}>
                  Carga los archivos oficiales en Excel para actualizar los cargos de planta o alimentar la seguridad social y nómina perno.
                </Text>

                <View
                  style={{
                    flexDirection: isTablet ? 'row' : 'column',
                    gap: 20,
                    marginTop: 20,
                    width: '100%',
                  }}
                >
                  {/* ARCHIVO 1: PLANTA */}
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
                          1. Archivo de Planta Oficial
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
                      Contiene el censo de cargos, plazas, ID SIDEAP, dependencias, asignación básica mensual y personas encargadas o titulares.
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
                        Estructura: Nivel, Cargo, ID SIDEAP, Básico, Titular, Encargo
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

                  {/* ARCHIVO 2: PLANTA PERNO */}
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
                      Contiene la información detallada del personal: EPS, Fondos de Pensiones, Cesantías, acto de nombramiento y datos de contacto.
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
        {/* MODAL DE SELECCIÓN DE DEPENDENCIA                              */}
        {/* ============================================================== */}
        <Modal
          visible={modalDependenciaVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalDependenciaVisible(false)}
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
                maxWidth: 520,
                maxHeight: '80%',
                backgroundColor: THEME.white,
                borderRadius: 14,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: THEME.marca900,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="business" size={18} color={THEME.marca100} />
                  <Text style={{ color: THEME.white, fontSize: 15, fontWeight: '600' }}>
                    Filtrar por Dependencia
                  </Text>
                </View>
                <Pressable onPress={() => setModalDependenciaVisible(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={THEME.white} />
                </Pressable>
              </View>

              {/* Input de filtro dentro del modal */}
              <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: THEME.slate100 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: THEME.slate50,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Ionicons name="search-outline" size={16} color={THEME.slate400} />
                  <TextInput
                    value={busquedaModalDep}
                    onChangeText={setBusquedaModalDep}
                    placeholder="Buscar dependencia..."
                    placeholderTextColor={THEME.slate400}
                    style={{ flex: 1, marginLeft: 8, fontSize: 13, color: THEME.slate900, padding: 0 }}
                  />
                  {busquedaModalDep ? (
                    <Pressable onPress={() => setBusquedaModalDep('')}>
                      <Ionicons name="close-circle" size={16} color={THEME.slate400} />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <ScrollView style={{ paddingVertical: 6 }}>
                {listaDependencias
                  .filter((d) => d.toLowerCase().includes(busquedaModalDep.toLowerCase()))
                  .map((dep) => {
                    const seleccionado = dependenciaSeleccionada === dep;
                    return (
                      <Pressable
                        key={dep}
                        onPress={() => {
                          setDependenciaSeleccionada(dep);
                          setModalDependenciaVisible(false);
                          setBusquedaModalDep('');
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 11,
                          paddingHorizontal: 18,
                          backgroundColor: seleccionado ? THEME.marca50 : pressed ? THEME.slate100 : THEME.white,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.slate100,
                        })}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: seleccionado ? '700' : '500',
                            color: seleccionado ? THEME.marca800 : THEME.slate700,
                            flex: 1,
                            paddingRight: 10,
                          }}
                        >
                          {dep}
                        </Text>
                        {seleccionado && <Ionicons name="checkmark-circle" size={18} color={THEME.marca600} />}
                      </Pressable>
                    );
                  })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ============================================================== */}
        {/* MODAL DE SELECCIÓN DE CARGO                                    */}
        {/* ============================================================== */}
        <Modal
          visible={modalCargoVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalCargoVisible(false)}
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
                maxWidth: 520,
                maxHeight: '80%',
                backgroundColor: THEME.white,
                borderRadius: 14,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: THEME.marca900,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="briefcase" size={18} color={THEME.marca100} />
                  <Text style={{ color: THEME.white, fontSize: 15, fontWeight: '600' }}>
                    Filtrar por Denominación del Empleo
                  </Text>
                </View>
                <Pressable onPress={() => setModalCargoVisible(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={THEME.white} />
                </Pressable>
              </View>

              {/* Input de filtro dentro del modal */}
              <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: THEME.slate100 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: THEME.slate50,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Ionicons name="search-outline" size={16} color={THEME.slate400} />
                  <TextInput
                    value={busquedaModalCargo}
                    onChangeText={setBusquedaModalCargo}
                    placeholder="Buscar denominación del cargo..."
                    placeholderTextColor={THEME.slate400}
                    style={{ flex: 1, marginLeft: 8, fontSize: 13, color: THEME.slate900, padding: 0 }}
                  />
                  {busquedaModalCargo ? (
                    <Pressable onPress={() => setBusquedaModalCargo('')}>
                      <Ionicons name="close-circle" size={16} color={THEME.slate400} />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <ScrollView style={{ paddingVertical: 6 }}>
                {listaCargos
                  .filter((c) => c.toLowerCase().includes(busquedaModalCargo.toLowerCase()))
                  .map((cargo) => {
                    const seleccionado = cargoSeleccionado === cargo;
                    return (
                      <Pressable
                        key={cargo}
                        onPress={() => {
                          setCargoSeleccionado(cargo);
                          setModalCargoVisible(false);
                          setBusquedaModalCargo('');
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 11,
                          paddingHorizontal: 18,
                          backgroundColor: seleccionado ? THEME.marca50 : pressed ? THEME.slate100 : THEME.white,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.slate100,
                        })}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: seleccionado ? '700' : '500',
                            color: seleccionado ? THEME.marca800 : THEME.slate700,
                            flex: 1,
                            paddingRight: 10,
                          }}
                        >
                          {cargo}
                        </Text>
                        {seleccionado && <Ionicons name="checkmark-circle" size={18} color={THEME.marca600} />}
                      </Pressable>
                    );
                  })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ============================================================== */}
        {/* MODAL DE DETALLE DE PLAZA (ENCARGADO PRIMERO Y LUEGO TITULAR)   */}
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
                maxWidth: 740,
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
              {/* Cabecera del Modal */}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      style={{
                        color: 'rgba(214, 228, 244, 0.7)',
                        fontSize: 11,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      Ficha Técnica Plaza #{plazaModal?.id_plaza}
                    </Text>
                    {plazaModal?.id_sideap ? (
                      <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ color: THEME.white, fontSize: 10, fontWeight: '700' }}>
                          SIEAP: #{plazaModal.id_sideap}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: THEME.white, fontSize: 17, fontWeight: '600', marginTop: 3 }}>
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
                {/* SECCIÓN 1: ESPECIFICACIONES DE PLANTA */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
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
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Asignación Básica Mensual</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.emeraldText, marginTop: 2 }}>
                      {formatearDinero(plazaModal?.asignacion_basica)}
                    </Text>
                  </View>

                  <View style={{ width: '100%' }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Dependencia Oficial del Cargo</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.dependencia_cargo || 'Secretaría Jurídica Distrital'}
                    </Text>
                  </View>

                  {plazaModal?.dependencia_funcional && plazaModal.dependencia_funcional !== plazaModal.dependencia_cargo ? (
                    <View style={{ width: '100%' }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Dependencia Funcional Asignada</Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '500', color: THEME.slate700, marginTop: 2 }}>
                        {plazaModal.dependencia_funcional}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* SECCIÓN 2: SERVIDORES (PRIMERO QUIÉN ESTÁ ENCARGADO, LUEGO EL TITULAR) */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  2. Servidores Públicos Asignados (Encargo y Titularidad)
                </Text>

                {plazaModal?.es_encargo || (plazaModal?.encargo_nombre && plazaModal.encargo_nombre.trim() !== '') ? (
                  <View style={{ gap: 12, marginBottom: 20 }}>
                    {/* BLOQUE 1: SERVIDOR EN ENCARGO (PRIMERO) */}
                    <View
                      style={{
                        backgroundColor: '#FFFBEB',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                        padding: 14,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={{
                              backgroundColor: '#F59E0B',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ color: THEME.white, fontSize: 10, fontWeight: '700' }}>
                              PRIMERO: ENCARGADO(A)
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>
                            Servidor desempeñando actualmente la plaza
                          </Text>
                        </View>
                        <Ionicons name="swap-horizontal" size={16} color="#B45309" />
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900, marginBottom: 4 }}>
                        {plazaModal.encargo_nombre}
                      </Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Número de Cédula</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                            {plazaModal.encargo_cedula ? `C.C. ${plazaModal.encargo_cedula}` : 'No registrada'}
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Situación Administrativa</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#B45309', marginTop: 1 }}>
                            {plazaModal.situacion_administrativa || 'ENCARGO'}
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Vinculación</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                            {plazaModal.tipo_vinculacion || 'Planta'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* BLOQUE 2: SERVIDOR TITULAR DEL CARGO (LUEGO) */}
                    <View
                      style={{
                        backgroundColor: THEME.slate50,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        padding: 14,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={{
                              backgroundColor: THEME.slate600,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ color: THEME.white, fontSize: 10, fontWeight: '700' }}>
                              LUEGO: TITULAR DEL CARGO
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate600 }}>
                            Servidor titular en propiedad de la plaza
                          </Text>
                        </View>
                        <Ionicons name="ribbon-outline" size={16} color={THEME.slate500} />
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900, marginBottom: 4 }}>
                        {plazaModal.titular_nombre || 'Plaza Vacante Definitiva'}
                      </Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Cédula Titular</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                            {plazaModal.titular_cedula ? `C.C. ${plazaModal.titular_cedula}` : 'No registrada'}
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Situación del Titular</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.marca700, marginTop: 1 }}>
                            {plazaModal.situacion_titular || 'En comisión o encargo en otro empleo'}
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Condición</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                            Plaza en encargo activo
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  /* CUANDO NO HAY ENCARGO (TITULAR DIRECTO O VACANTE) */
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
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Servidor Titular Vinculado</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900, marginTop: 2 }}>
                        {plazaModal?.titular_nombre || 'Plaza actualmente Vacante'}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Número de Documento</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                        {plazaModal?.titular_cedula ? `C.C. ${plazaModal.titular_cedula}` : '---'}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Tipo de Vinculación</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                        {plazaModal?.tipo_vinculacion || '---'}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Situación Administrativa</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                        {plazaModal?.situacion_administrativa || 'Servicio Activo en Propiedad'}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Acto de Nombramiento</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                        {plazaModal?.acto_nombramiento || plazaModal?.numero_acto_nombramiento || '---'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* SECCIÓN 3: SEGURIDAD SOCIAL Y NÓMINA PERNO */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
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
                    <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.fondo_salud || 'No reportada'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Fondo de Pensiones</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.fondo_pension || 'No reportado'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Fondo de Cesantías</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                      {plazaModal?.fondo_cesantias || 'No reportado'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Teléfono de Contacto</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
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
