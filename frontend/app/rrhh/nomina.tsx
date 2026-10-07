import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
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
import { DataTable, ColumnConfig } from '../../components/DataTable';

// Tipos de modal selector idénticos a /ingresos/nueva
type PickerTipo = 'cargo' | 'codigoGrado' | 'dependencia' | 'situacion' | 'sideap' | 'perno' | null;

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
  const [mostrarKpis, setMostrarKpis] = useState(true);

  // Filtros Avanzados (con modales estilo /ingresos/nueva)
  const [busqueda, setBusqueda] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [filtroCodigoGrado, setFiltroCodigoGrado] = useState('');
  const [filtroDependencia, setFiltroDependencia] = useState('');
  const [filtroSituacion, setFiltroSituacion] = useState('');
  const [filtroSideap, setFiltroSideap] = useState('');
  const [filtroPerno, setFiltroPerno] = useState('');

  const [nivelSeleccionado, setNivelSeleccionado] = useState('TODOS');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('TODOS');
  const [soloEncargo, setSoloEncargo] = useState(false);
  const [modoVista, setModoVista] = useState<'tabla' | 'cards'>('tabla');

  // Estados del Selector Modal Avanzado
  const [pickerTipo, setPickerTipo] = useState<PickerTipo>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerBusqueda, setPickerBusqueda] = useState('');

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
  const [guiaArchivoActiva, setGuiaArchivoActiva] = useState<'planta' | 'perno' | 'reglas'>('planta');

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
          id_sieap: filtroSideap !== '' ? filtroSideap : undefined,
          nivel: nivelSeleccionado,
          estado: estadoSeleccionado,
          dependencia: filtroDependencia !== '' ? filtroDependencia : undefined,
          cargo: filtroCargo !== '' ? filtroCargo : undefined,
          codigo_grado: filtroCodigoGrado !== '' ? filtroCodigoGrado : undefined,
          situacion: filtroSituacion !== '' ? filtroSituacion : undefined,
          id_perno: filtroPerno !== '' ? filtroPerno : undefined,
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
  }, [
    busqueda,
    filtroCargo,
    filtroCodigoGrado,
    filtroDependencia,
    filtroSituacion,
    filtroSideap,
    filtroPerno,
    nivelSeleccionado,
    estadoSeleccionado,
    soloEncargo,
  ]);

  // Lista base consolidada
  const todasLasPlazas = useMemo(() => {
    return (mockPlazasData as unknown as PlazaNomina[]) || [];
  }, []);

  // 1. Lista de Cargos (con conteo)
  const listaCargos = useMemo(() => {
    const map = new Map<string, number>();
    todasLasPlazas.forEach((p) => {
      if (p.cargo) {
        const nom = p.cargo.trim();
        map.set(nom, (map.get(nom) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([cargo, count]) => ({ valor: cargo, etiqueta: cargo, count }))
      .sort((a, b) => a.valor.localeCompare(b.valor));
  }, [todasLasPlazas]);

  // 2. Lista de Códigos y Grados (con conteo)
  const listaCodigoGrado = useMemo(() => {
    const base = filtroCargo
      ? todasLasPlazas.filter((p) => (p.cargo || '').toLowerCase() === filtroCargo.toLowerCase())
      : todasLasPlazas;

    const map = new Map<string, { codigo: string; grado: string; count: number }>();
    base.forEach((p) => {
      const cod = p.codigo ? String(p.codigo) : 'S/C';
      const gr = p.grado ? String(p.grado) : 'S/G';
      const key = `${p.codigo || ''}-${p.grado || ''}`;
      if (!map.has(key)) {
        map.set(key, { codigo: cod, grado: gr, count: 1 });
      } else {
        map.get(key)!.count += 1;
      }
    });

    return Array.from(map.entries())
      .map(([key, val]) => ({
        valor: key,
        codigo: val.codigo,
        grado: val.grado,
        etiqueta: `Cód. ${val.codigo} - Grado ${val.grado}`,
        count: val.count,
      }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  }, [todasLasPlazas, filtroCargo]);

  // 3. Lista de Dependencias (con conteo)
  const listaDependencias = useMemo(() => {
    let base = todasLasPlazas;
    if (filtroCargo) {
      base = base.filter((p) => (p.cargo || '').toLowerCase() === filtroCargo.toLowerCase());
    }
    if (filtroCodigoGrado) {
      base = base.filter((p) => `${p.codigo || ''}-${p.grado || ''}` === filtroCodigoGrado);
    }
    const map = new Map<string, number>();
    base.forEach((p) => {
      const dep = p.dependencia_cargo ? p.dependencia_cargo.trim() : 'Sin dependencia asignada';
      map.set(dep, (map.get(dep) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([dep, count]) => ({ valor: dep, etiqueta: dep, count }))
      .sort((a, b) => a.valor.localeCompare(b.valor));
  }, [todasLasPlazas, filtroCargo, filtroCodigoGrado]);

  // 4. Lista de Situaciones Administrativas del Titular del Cargo
  const listaSituaciones = useMemo(() => {
    let base = todasLasPlazas;
    if (filtroCargo) {
      base = base.filter((p) => (p.cargo || '').toLowerCase() === filtroCargo.toLowerCase());
    }
    if (filtroDependencia) {
      base = base.filter((p) => (p.dependencia_cargo || '').toLowerCase() === filtroDependencia.toLowerCase());
    }
    const map = new Map<string, number>();
    base.forEach((p) => {
      const sit = (p.situacion_administrativa || p.situacion_titular || p.tipo_vinculacion || '').trim() || 'EN PROPIEDAD';
      map.set(sit, (map.get(sit) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([sit, count]) => ({ valor: sit, etiqueta: sit, count }))
      .sort((a, b) => b.count - a.count || a.valor.localeCompare(b.valor));
  }, [todasLasPlazas, filtroCargo, filtroDependencia]);

  // 5. Lista de ID SIDEAP disponibles
  const listaSideap = useMemo(() => {
    return todasLasPlazas
      .filter((p) => p.id_sideap != null)
      .map((p) => ({
        valor: String(p.id_sideap),
        etiquetaPrincipal: `ID SIDEAP: ${p.id_sideap}`,
        etiquetaSecundaria: `${p.cargo} (Cód. ${p.codigo || 'N/A'}-Gr.${p.grado || 'N/A'}) • ${p.dependencia_cargo || ''}`,
        badge: p.situacion_administrativa || (p.es_encargo ? 'ENCARGO' : p.estado_cargo),
        plaza: p,
      }))
      .sort((a, b) => Number(a.valor) - Number(b.valor));
  }, [todasLasPlazas]);

  // 6. Lista de ID PERNO disponibles
  const listaPerno = useMemo(() => {
    return todasLasPlazas
      .filter((p) => p.id_perno != null)
      .map((p) => ({
        valor: String(p.id_perno),
        etiquetaPrincipal: `ID PERNO: ${p.id_perno}`,
        etiquetaSecundaria: `${p.cargo} (Cód. ${p.codigo || 'N/A'}-Gr.${p.grado || 'N/A'}) • ${p.dependencia_cargo || ''}`,
        badge: p.situacion_administrativa || (p.id_sideap ? `SIDEAP #${p.id_sideap}` : undefined),
        plaza: p,
      }))
      .sort((a, b) => Number(a.valor) - Number(b.valor));
  }, [todasLasPlazas]);

  // Funciones del Modal de Filtro
  const abrirPicker = (tipo: PickerTipo) => {
    setPickerTipo(tipo);
    setPickerBusqueda('');
    setPickerVisible(true);
  };

  const getTituloPicker = () => {
    switch (pickerTipo) {
      case 'cargo':
        return 'Seleccionar Denominación del Cargo';
      case 'codigoGrado':
        return 'Seleccionar Código y Grado';
      case 'dependencia':
        return 'Seleccionar Dependencia';
      case 'situacion':
        return 'Seleccionar Situación Administrativa Titular del Cargo';
      case 'sideap':
        return 'Seleccionar por ID SIDEAP';
      case 'perno':
        return 'Seleccionar por ID PERNO';
      default:
        return 'Seleccionar Opción';
    }
  };

  const opcionesModal = useMemo(() => {
    if (!pickerTipo) return [];
    if (pickerTipo === 'cargo') {
      return listaCargos.map((c) => ({
        valor: c.valor,
        etiquetaPrincipal: c.etiqueta,
        etiquetaSecundaria: `${c.count} plaza(s) registradas`,
        badge: undefined,
        seleccionado: filtroCargo.toLowerCase() === c.valor.toLowerCase(),
      }));
    }
    if (pickerTipo === 'codigoGrado') {
      return listaCodigoGrado.map((cg) => ({
        valor: cg.valor,
        etiquetaPrincipal: cg.etiqueta,
        etiquetaSecundaria: `${cg.count} plaza(s) disponibles`,
        badge: undefined,
        seleccionado: filtroCodigoGrado === cg.valor,
      }));
    }
    if (pickerTipo === 'dependencia') {
      return listaDependencias.map((dep) => ({
        valor: dep.valor,
        etiquetaPrincipal: dep.etiqueta,
        etiquetaSecundaria: `${dep.count} plaza(s) en esta dependencia`,
        badge: undefined,
        seleccionado: filtroDependencia.toLowerCase() === dep.valor.toLowerCase(),
      }));
    }
    if (pickerTipo === 'situacion') {
      return listaSituaciones.map((sit) => {
        const isVacante = sit.valor.toUpperCase().includes('VACANTE');
        const isPropiedad = sit.valor.toUpperCase().includes('PROPIEDAD');
        return {
          valor: sit.valor,
          etiquetaPrincipal: sit.etiqueta,
          etiquetaSecundaria: `${sit.count} plaza(s) registradas con esta situación`,
          badge: isVacante ? 'VACANCIA' : isPropiedad ? 'EN PROPIEDAD' : 'ACTIVO',
          seleccionado: filtroSituacion.toLowerCase() === sit.valor.toLowerCase(),
        };
      });
    }
    if (pickerTipo === 'sideap') {
      return listaSideap.map((s) => ({
        valor: s.valor,
        etiquetaPrincipal: s.etiquetaPrincipal,
        etiquetaSecundaria: s.etiquetaSecundaria,
        badge: s.badge,
        seleccionado: filtroSideap === s.valor,
      }));
    }
    if (pickerTipo === 'perno') {
      return listaPerno.map((p) => ({
        valor: p.valor,
        etiquetaPrincipal: p.etiquetaPrincipal,
        etiquetaSecundaria: p.etiquetaSecundaria,
        badge: p.badge,
        seleccionado: filtroPerno === p.valor,
      }));
    }
    return [];
  }, [
    pickerTipo,
    listaCargos,
    listaCodigoGrado,
    listaDependencias,
    listaSituaciones,
    listaSideap,
    listaPerno,
    filtroCargo,
    filtroCodigoGrado,
    filtroDependencia,
    filtroSituacion,
    filtroSideap,
    filtroPerno,
  ]);

  const opcionesModalFiltradas = useMemo(() => {
    if (!pickerBusqueda.trim()) return opcionesModal;
    const q = pickerBusqueda.trim().toLowerCase();
    return opcionesModal.filter(
      (op) =>
        op.etiquetaPrincipal.toLowerCase().includes(q) ||
        (op.etiquetaSecundaria && op.etiquetaSecundaria.toLowerCase().includes(q))
    );
  }, [opcionesModal, pickerBusqueda]);

  const seleccionarOpcionModal = (item: { valor: string }) => {
    if (pickerTipo === 'cargo') setFiltroCargo(item.valor);
    else if (pickerTipo === 'codigoGrado') setFiltroCodigoGrado(item.valor);
    else if (pickerTipo === 'dependencia') setFiltroDependencia(item.valor);
    else if (pickerTipo === 'situacion') setFiltroSituacion(item.valor);
    else if (pickerTipo === 'sideap') setFiltroSideap(item.valor);
    else if (pickerTipo === 'perno') setFiltroPerno(item.valor);
    setPickerVisible(false);
  };

  const hayFiltrosActivos =
    busqueda.trim() !== '' ||
    filtroCargo !== '' ||
    filtroCodigoGrado !== '' ||
    filtroDependencia !== '' ||
    filtroSituacion !== '' ||
    filtroSideap !== '' ||
    filtroPerno !== '' ||
    nivelSeleccionado !== 'TODOS' ||
    estadoSeleccionado !== 'TODOS' ||
    soloEncargo;

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCargo('');
    setFiltroCodigoGrado('');
    setFiltroDependencia('');
    setFiltroSituacion('');
    setFiltroSideap('');
    setFiltroPerno('');
    setNivelSeleccionado('TODOS');
    setEstadoSeleccionado('TODOS');
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
        file: (file as any).file,
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
        file: (file as any).file,
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

  // Descargas de plantillas oficiales
  const handleDescargarPlantillaPlanta = async () => {
    try {
      const url = nominaService.getPlantillaPlantaUrl();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
    } catch (e: any) {
      mostrarModal('Descarga de Plantilla', 'No fue posible abrir la descarga: ' + e.message, 'error');
    }
  };

  const handleDescargarPlantillaPerno = async () => {
    try {
      const url = nominaService.getPlantillaPernoUrl();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
    } catch (e: any) {
      mostrarModal('Descarga de Plantilla', 'No fue posible abrir la descarga: ' + e.message, 'error');
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

  // Configuración de Columnas para el componente DataTable reutilizable
  const columnasTabla: ColumnConfig<PlazaNomina>[] = useMemo(() => [
    {
      id: 'plaza',
      label: 'Plaza / SIEAP',
      width: '6%',
      minWidth: 85,
      sortable: true,
      getSortValue: (p) => p.id_plaza,
      render: (p) => (
        <View style={{ paddingRight: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>
            #{p.id_plaza}
          </Text>
          <Text style={{ fontSize: 10, color: THEME.slate500, marginTop: 1 }}>
            SIEAP: <Text style={{ fontWeight: '600', color: THEME.marca700 }}>{p.id_sideap || '---'}</Text>
          </Text>
          {p.id_perno ? (
            <Text style={{ fontSize: 9.5, color: '#92400E' }}>
              PERNO: #{p.id_perno}
            </Text>
          ) : null}
        </View>
      ),
    },
    {
      id: 'cargo',
      label: 'Cargo & Grado',
      width: '18%',
      minWidth: 200,
      sortable: true,
      getSortValue: (p) => p.cargo || '',
      render: (p) => (
        <View style={{ paddingRight: 8 }}>
          <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '600', color: THEME.marca700, lineHeight: 17 }}>
            {p.cargo || 'Sin denominación'}
          </Text>
          <Text style={{ fontSize: 10.5, color: THEME.slate500, marginTop: 2 }}>
            Cód. {p.codigo || '---'} • Gr. {p.grado || '00'}
          </Text>
        </View>
      ),
    },
    {
      id: 'nivel',
      label: 'Nivel',
      width: '8%',
      minWidth: 95,
      sortable: true,
      getSortValue: (p) => p.nivel || '',
      render: (p) => renderBadgeNivel(p.nivel),
    },
    {
      id: 'dependencia',
      label: 'Dependencia',
      width: '16%',
      minWidth: 180,
      sortable: true,
      getSortValue: (p) => p.dependencia_cargo || '',
      render: (p) => (
        <View style={{ paddingRight: 8 }}>
          <Text numberOfLines={2} style={{ fontSize: 12, color: THEME.slate800, lineHeight: 16 }}>
            {p.dependencia_cargo || 'Secretaría Jurídica Distrital'}
          </Text>
          {p.dependencia_funcional && p.dependencia_funcional !== p.dependencia_cargo ? (
            <Text numberOfLines={1} style={{ fontSize: 10, color: THEME.slate400, marginTop: 1 }}>
              Func: {p.dependencia_funcional}
            </Text>
          ) : null}
        </View>
      ),
    },
    {
      id: 'titular',
      label: 'Titular del Empleo',
      width: '16%',
      minWidth: 180,
      sortable: true,
      getSortValue: (p) => p.titular_nombre || '',
      render: (p) => {
        const estadoNorm = (p.estado_cargo || '').toUpperCase();
        const esVacante = estadoNorm.includes('VACANTE') || (!p.titular_nombre && !p.encargo_nombre);
        if (esVacante && !p.titular_nombre) {
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="ellipse-outline" size={10} color={THEME.roseText} />
              <Text style={{ fontSize: 12, fontStyle: 'italic', color: THEME.roseText }}>
                Vacante sin titular
              </Text>
            </View>
          );
        }
        return (
          <View style={{ gap: 2, paddingRight: 8 }}>
            <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate900 }}>
              {p.titular_nombre || 'Servidor Registrado'}
            </Text>
            <Text style={{ fontSize: 10.5, color: THEME.slate500 }}>
              {p.titular_cedula ? `C.C. ${p.titular_cedula} • ` : ''}
              {p.situacion_titular || p.tipo_vinculacion || 'En Propiedad'}
            </Text>
          </View>
        );
      },
    },
    {
      id: 'encargo',
      label: 'Servidor en Encargo',
      width: '14%',
      minWidth: 160,
      sortable: true,
      getSortValue: (p) => p.encargo_nombre || '',
      render: (p) => {
        const tieneEncargo = p.es_encargo || (p.encargo_nombre && p.encargo_nombre.trim() !== '' && p.encargo_nombre.trim() !== (p.titular_nombre || '').trim());
        if (tieneEncargo) {
          return (
            <View style={{ gap: 2, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
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
                  <Text style={{ color: '#B45309', fontSize: 9, fontWeight: '700' }}>
                    ENCARGADO(A)
                  </Text>
                </View>
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: THEME.slate900, flexShrink: 1 }}>
                  {p.encargo_nombre}
                </Text>
              </View>
              {p.encargo_cedula ? (
                <Text style={{ fontSize: 10, color: THEME.slate500 }}>
                  C.C. {p.encargo_cedula} • {p.situacion_administrativa || 'Encargo'}
                </Text>
              ) : null}
            </View>
          );
        }
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.slate300 }} />
            <Text style={{ fontSize: 11, color: THEME.slate400 }}>
              Sin encargo / Titular activo
            </Text>
          </View>
        );
      },
    },
    {
      id: 'estado',
      label: 'Estado',
      width: '8%',
      minWidth: 100,
      sortable: true,
      getSortValue: (p) => p.estado_cargo || '',
      render: (p) => renderBadgeEstado(p.estado_cargo),
    },
    {
      id: 'basico',
      label: 'Básico Mensual',
      width: '9%',
      minWidth: 110,
      align: 'right',
      sortable: true,
      getSortValue: (p) => Number(p.asignacion_basica) || 0,
      render: (p) => (
        <View style={{ alignItems: 'flex-end', paddingRight: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.slate900 }}>
            {formatearDinero(p.asignacion_basica)}
          </Text>
          <Text style={{ fontSize: 9.5, color: THEME.slate400 }}>COP / Mes</Text>
        </View>
      ),
    },
    {
      id: 'ficha',
      label: 'Ficha',
      width: '5%',
      minWidth: 60,
      align: 'center',
      sortable: false,
      render: (p) => (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: THEME.marca50,
            borderWidth: 1,
            borderColor: THEME.marca100,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Ionicons name="eye-outline" size={13} color={THEME.marca700} />
          <Text style={{ fontSize: 10.5, fontWeight: '600', color: THEME.marca700 }}>Ver</Text>
        </View>
      ),
    },
  ], []);

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
          {/* TÍTULO Y SUBTÍTULO DE PÁGINA + TOGGLE KPIS */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <View>
              <Text style={{ fontSize: 22, fontWeight: '600', color: THEME.slate900 }}>
                Censo Oficial de Planta y Nómina
              </Text>
              <Text style={{ fontSize: 13, color: THEME.slate500, marginTop: 4 }}>
                Consulta unificada de las 170 plazas institucionales, titulares, servidores en encargo y nómina perno.
              </Text>
            </View>

            {/* Botón para ocultar / mostrar KPIs */}
            <Pressable
              onPress={() => setMostrarKpis(!mostrarKpis)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: mostrarKpis ? THEME.slate200 : THEME.marca600,
                backgroundColor: mostrarKpis ? (pressed ? THEME.slate100 : THEME.white) : THEME.marca50,
              })}
            >
              <Ionicons
                name={mostrarKpis ? 'eye-off-outline' : 'stats-chart-outline'}
                size={15}
                color={mostrarKpis ? THEME.slate600 : THEME.marca700}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: mostrarKpis ? THEME.slate700 : THEME.marca700,
                }}
              >
                {mostrarKpis ? 'Ocultar Indicadores KPI' : 'Mostrar Indicadores KPI'}
              </Text>
            </Pressable>
          </View>

          {/* ============================================================== */}
          {/* KPI CARDS (CONDICIONADO A mostrarKpis)                         */}
          {/* ============================================================== */}
          {mostrarKpis && (
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
          )}

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
              {/* FILTROS AVANZADOS CON MODALES ESTILO /ingresos/nueva */}
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
                {/* Fila 1: Búsqueda General y Cambio de Vista (Tabla / Tarjetas) */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 14,
                  }}
                >
                  {/* Buscador de texto libre */}
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
                      placeholder="Buscar por cédula, nombre del titular o encargado, cargo..."
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

                  {/* Toggle "¿Solo Encargos?" y Botón Restablecer Filtros */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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

                    {/* Botón de Restablecer Filtros */}
                    {hayFiltrosActivos && (
                      <Pressable
                        onPress={limpiarFiltros}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: pressed ? '#BE123C' : THEME.roseText,
                          shadowColor: '#BE123C',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.2,
                          shadowRadius: 2,
                        })}
                      >
                        <Ionicons name="refresh-outline" size={14} color={THEME.white} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.white }}>
                          Restablecer Filtros
                        </Text>
                      </Pressable>
                    )}

                    {/* Selector de modo de vista (Tabla | Tarjetas) */}
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
                          gap: 5,
                          paddingHorizontal: 11,
                          paddingVertical: 6,
                          borderRadius: 6,
                          backgroundColor: modoVista === 'tabla' ? THEME.white : 'transparent',
                        }}
                      >
                        <Ionicons
                          name="list-outline"
                          size={14}
                          color={modoVista === 'tabla' ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          style={{
                            fontSize: 11.5,
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
                          gap: 5,
                          paddingHorizontal: 11,
                          paddingVertical: 6,
                          borderRadius: 6,
                          backgroundColor: modoVista === 'cards' ? THEME.white : 'transparent',
                        }}
                      >
                        <Ionicons
                          name="grid-outline"
                          size={14}
                          color={modoVista === 'cards' ? THEME.marca700 : THEME.slate500}
                        />
                        <Text
                          style={{
                            fontSize: 11.5,
                            fontWeight: modoVista === 'cards' ? '600' : '500',
                            color: modoVista === 'cards' ? THEME.marca700 : THEME.slate500,
                          }}
                        >
                          Tarjetas
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Fila 2: Los 6 MODALES DE FILTROS SOLICITADOS (Estilo /ingresos/nueva) */}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 10,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: THEME.slate100,
                  }}
                >
                  {/* 1. Modal: Denominación del Cargo */}
                  <Pressable
                    onPress={() => abrirPicker('cargo')}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: isTablet ? 190 : '100%',
                      backgroundColor: filtroCargo ? THEME.marca50 : pressed ? THEME.slate100 : THEME.white,
                      borderWidth: 1,
                      borderColor: filtroCargo ? THEME.marca600 : THEME.slate200,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: filtroCargo ? THEME.marca700 : THEME.slate400, textTransform: 'uppercase' }}>
                        Denominación del Cargo
                      </Text>
                      {filtroCargo ? (
                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation();
                            setFiltroCargo('');
                          }}
                        >
                          <Ionicons name="close-circle" size={14} color={THEME.marca700} />
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 4 }}>
                        <Ionicons name="briefcase-outline" size={14} color={filtroCargo ? THEME.marca700 : THEME.slate400} />
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: filtroCargo ? '600' : '400', color: filtroCargo ? THEME.marca900 : THEME.slate600 }}>
                          {filtroCargo || 'Todos los cargos'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={13} color={THEME.slate400} />
                    </View>
                  </Pressable>

                  {/* 2. Modal: Código y Grado */}
                  <Pressable
                    onPress={() => abrirPicker('codigoGrado')}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: isTablet ? 160 : '100%',
                      backgroundColor: filtroCodigoGrado ? THEME.marca50 : pressed ? THEME.slate100 : THEME.white,
                      borderWidth: 1,
                      borderColor: filtroCodigoGrado ? THEME.marca600 : THEME.slate200,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: filtroCodigoGrado ? THEME.marca700 : THEME.slate400, textTransform: 'uppercase' }}>
                        Código y Grado
                      </Text>
                      {filtroCodigoGrado ? (
                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation();
                            setFiltroCodigoGrado('');
                          }}
                        >
                          <Ionicons name="close-circle" size={14} color={THEME.marca700} />
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 4 }}>
                        <Ionicons name="ribbon-outline" size={14} color={filtroCodigoGrado ? THEME.marca700 : THEME.slate400} />
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: filtroCodigoGrado ? '600' : '400', color: filtroCodigoGrado ? THEME.marca900 : THEME.slate600 }}>
                          {filtroCodigoGrado ? `Cód-Gr: ${filtroCodigoGrado}` : 'Todos los grados'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={13} color={THEME.slate400} />
                    </View>
                  </Pressable>

                  {/* 3. Modal: Dependencia */}
                  <Pressable
                    onPress={() => abrirPicker('dependencia')}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: isTablet ? 190 : '100%',
                      backgroundColor: filtroDependencia ? THEME.marca50 : pressed ? THEME.slate100 : THEME.white,
                      borderWidth: 1,
                      borderColor: filtroDependencia ? THEME.marca600 : THEME.slate200,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: filtroDependencia ? THEME.marca700 : THEME.slate400, textTransform: 'uppercase' }}>
                        Dependencia
                      </Text>
                      {filtroDependencia ? (
                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation();
                            setFiltroDependencia('');
                          }}
                        >
                          <Ionicons name="close-circle" size={14} color={THEME.marca700} />
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 4 }}>
                        <Ionicons name="business-outline" size={14} color={filtroDependencia ? THEME.marca700 : THEME.slate400} />
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: filtroDependencia ? '600' : '400', color: filtroDependencia ? THEME.marca900 : THEME.slate600 }}>
                          {filtroDependencia || 'Todas las dependencias'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={13} color={THEME.slate400} />
                    </View>
                  </Pressable>

                  {/* 4. Modal: Situación Administrativa Titular del Cargo */}
                  <Pressable
                    onPress={() => abrirPicker('situacion')}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: isTablet ? 220 : '100%',
                      backgroundColor: filtroSituacion ? THEME.marca50 : pressed ? THEME.slate100 : THEME.white,
                      borderWidth: 1,
                      borderColor: filtroSituacion ? THEME.marca600 : THEME.slate200,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: filtroSituacion ? THEME.marca700 : THEME.slate400, textTransform: 'uppercase' }}>
                        Situación Adm. Titular
                      </Text>
                      {filtroSituacion ? (
                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation();
                            setFiltroSituacion('');
                          }}
                        >
                          <Ionicons name="close-circle" size={14} color={THEME.marca700} />
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 4 }}>
                        <Ionicons name="document-text-outline" size={14} color={filtroSituacion ? THEME.marca700 : THEME.slate400} />
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: filtroSituacion ? '600' : '400', color: filtroSituacion ? THEME.marca900 : THEME.slate600 }}>
                          {filtroSituacion || 'Todas las situaciones'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={13} color={THEME.slate400} />
                    </View>
                  </Pressable>

                  {/* 5. Modal: ID SIDEAP */}
                  <Pressable
                    onPress={() => abrirPicker('sideap')}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: isTablet ? 140 : '100%',
                      backgroundColor: filtroSideap ? THEME.marca50 : pressed ? THEME.slate100 : THEME.white,
                      borderWidth: 1,
                      borderColor: filtroSideap ? THEME.marca600 : THEME.slate200,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: filtroSideap ? THEME.marca700 : THEME.slate400, textTransform: 'uppercase' }}>
                        ID SIDEAP
                      </Text>
                      {filtroSideap ? (
                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation();
                            setFiltroSideap('');
                          }}
                        >
                          <Ionicons name="close-circle" size={14} color={THEME.marca700} />
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 4 }}>
                        <Ionicons name="card-outline" size={14} color={filtroSideap ? THEME.marca700 : THEME.slate400} />
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: filtroSideap ? '600' : '400', color: filtroSideap ? THEME.marca900 : THEME.slate600 }}>
                          {filtroSideap ? `#${filtroSideap}` : 'Todos los SIDEAP'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={13} color={THEME.slate400} />
                    </View>
                  </Pressable>

                  {/* 6. Modal: ID PERNO */}
                  <Pressable
                    onPress={() => abrirPicker('perno')}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: isTablet ? 140 : '100%',
                      backgroundColor: filtroPerno ? THEME.marca50 : pressed ? THEME.slate100 : THEME.white,
                      borderWidth: 1,
                      borderColor: filtroPerno ? THEME.marca600 : THEME.slate200,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: filtroPerno ? THEME.marca700 : THEME.slate400, textTransform: 'uppercase' }}>
                        ID PERNO
                      </Text>
                      {filtroPerno ? (
                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation();
                            setFiltroPerno('');
                          }}
                        >
                          <Ionicons name="close-circle" size={14} color={THEME.marca700} />
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 4 }}>
                        <Ionicons name="barcode-outline" size={14} color={filtroPerno ? THEME.marca700 : THEME.slate400} />
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: filtroPerno ? '600' : '400', color: filtroPerno ? THEME.marca900 : THEME.slate600 }}>
                          {filtroPerno ? `#${filtroPerno}` : 'Todos los PERNO'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={13} color={THEME.slate400} />
                    </View>
                  </Pressable>
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
                /* VISTA TABLA CON COMPONENTE DataTable REUTILIZABLE               */
                /* ============================================================== */
                <DataTable
                  data={plazas}
                  columns={columnasTabla}
                  keyExtractor={(p) => String(p.id_plaza)}
                  onRowPress={(p) => setPlazaModal(p)}
                  emptyMessage="No se encontraron plazas con los filtros seleccionados"
                  enableColumnReorder={true}
                  enableSorting={true}
                />
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
          {/* PESTAÑA: CARGA DE ARCHIVOS Y GUÍA DE ESTRUCTURA                */}
          {/* ============================================================== */}
          {tabActiva === 'archivos' && (
            <View style={{ width: '100%', gap: 20 }}>
              {/* Tarjeta Informativa de Arquitectura */}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: THEME.marca100,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="layers" size={20} color={THEME.marca700} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: THEME.slate900 }}>
                      Actualización Oficial de Nómina y Planta de Personal
                    </Text>
                    <Text style={{ fontSize: 13, color: THEME.slate500, marginTop: 2 }}>
                      Guía estructural, orden de columnas y alimentador para la Secretaría Jurídica Distrital.
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: THEME.slate50,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 16,
                    marginTop: 12,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginBottom: 6 }}>
                    ¿Cómo interactúan los dos archivos oficiales?
                  </Text>
                  <Text style={{ fontSize: 12.5, color: THEME.slate600, lineHeight: 19 }}>
                    <Text style={{ fontWeight: '700', color: THEME.marca800 }}>1. Archivo de Planta Oficial:</Text> Estructura las 170 plazas de la entidad (códigos, grados, nivel jerárquico, dependencia orgánica, asignación básica mensual y quién ocupa o si está en vacancia).
                    {'\n'}
                    <Text style={{ fontWeight: '700', color: THEME.emeraldText }}>2. Archivo Planta Perno:</Text> Enriquece la información humana de los servidores (seguridad social: EPS, Pensión, Cesantías, número y fecha del acto de nombramiento o encargo y total devengado mensual), vinculándolos automáticamente por su <Text style={{ fontWeight: '700' }}>Cédula de Ciudadanía</Text>.
                  </Text>
                </View>

                {/* Tarjetas de Carga Rápida */}
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
                      justifyContent: 'space-between',
                    }}
                  >
                    <View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="document-text" size={20} color={THEME.marca700} />
                          <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900 }}>
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

                      <Text style={{ fontSize: 12, color: THEME.slate600, lineHeight: 18, marginBottom: 12 }}>
                        Hoja requerida: <Text style={{ fontWeight: '700' }}>PLANTA SJD (2)</Text> o <Text style={{ fontWeight: '700' }}>PLANTA SJD</Text>. Encabezados en <Text style={{ fontWeight: '700' }}>Fila 4</Text>, datos desde <Text style={{ fontWeight: '700' }}>Fila 5</Text>.
                      </Text>

                      <View
                        style={{
                          backgroundColor: THEME.white,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          borderStyle: 'dashed',
                          borderRadius: 10,
                          padding: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 16,
                        }}
                      >
                        <Ionicons name="cloud-upload-outline" size={28} color={THEME.slate400} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 6, textAlign: 'center' }}>
                          {nombreArchivoPlanta || 'Seleccionar archivo Excel (.xlsx)'}
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.slate500, marginTop: 2, textAlign: 'center' }}>
                          Columnas clave: ID, SIDEAP, Cédula, Nivel, Cargo, Grado, Básico
                        </Text>
                      </View>
                    </View>

                    <View style={{ gap: 8 }}>
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="arrow-up-circle-outline" size={16} color={THEME.white} />
                            <Text style={{ color: THEME.white, fontSize: 13, fontWeight: '600' }}>
                              Cargar Archivo de Planta
                            </Text>
                          </View>
                        )}
                      </Pressable>

                      <Pressable
                        onPress={handleDescargarPlantillaPlanta}
                        style={({ pressed }) => ({
                          backgroundColor: THEME.white,
                          borderWidth: 1,
                          borderColor: THEME.marca600,
                          paddingVertical: 8,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="download-outline" size={16} color={THEME.marca700} />
                          <Text style={{ color: THEME.marca700, fontSize: 12.5, fontWeight: '600' }}>
                            Descargar Plantilla Oficial (.xlsx)
                          </Text>
                        </View>
                      </Pressable>
                    </View>
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
                      justifyContent: 'space-between',
                    }}
                  >
                    <View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="people-circle" size={22} color={THEME.emeraldText} />
                          <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900 }}>
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
                            Nómina y Afiliaciones
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 12, color: THEME.slate600, lineHeight: 18, marginBottom: 12 }}>
                        Hoja requerida: <Text style={{ fontWeight: '700' }}>PLANTA PERNO</Text>. Encabezados en <Text style={{ fontWeight: '700' }}>Fila 9</Text>, datos desde <Text style={{ fontWeight: '700' }}>Fila 10</Text>.
                      </Text>

                      <View
                        style={{
                          backgroundColor: THEME.white,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          borderStyle: 'dashed',
                          borderRadius: 10,
                          padding: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 16,
                        }}
                      >
                        <Ionicons name="shield-checkmark-outline" size={28} color={THEME.slate400} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 6, textAlign: 'center' }}>
                          {nombreArchivoPerno || 'Seleccionar archivo Perno (.xlsx)'}
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.slate500, marginTop: 2, textAlign: 'center' }}>
                          Columnas clave: Cédula, EPS, Pensión, Cesantías, Acto Nombramiento
                        </Text>
                      </View>
                    </View>

                    <View style={{ gap: 8 }}>
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="arrow-up-circle-outline" size={16} color={THEME.white} />
                            <Text style={{ color: THEME.white, fontSize: 13, fontWeight: '600' }}>
                              Cargar Archivo Planta Perno
                            </Text>
                          </View>
                        )}
                      </Pressable>

                      <Pressable
                        onPress={handleDescargarPlantillaPerno}
                        style={({ pressed }) => ({
                          backgroundColor: THEME.white,
                          borderWidth: 1,
                          borderColor: THEME.emeraldText,
                          paddingVertical: 8,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="download-outline" size={16} color={THEME.emeraldText} />
                          <Text style={{ color: THEME.emeraldText, fontSize: 12.5, fontWeight: '600' }}>
                            Descargar Plantilla Oficial (.xlsx)
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>

              {/* Guía Detallada de Columnas y Estructura */}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: THEME.slate900 }}>
                      Especificación de Columnas y Formato Requerido
                    </Text>
                    <Text style={{ fontSize: 12.5, color: THEME.slate500, marginTop: 2 }}>
                      Consulta la posición, el nombre de columna en Excel, el tipo de dato y ejemplos reales.
                    </Text>
                  </View>

                  {/* Selector de Pestañas de Guía */}
                  <View
                    style={{
                      flexDirection: 'row',
                      backgroundColor: THEME.slate100,
                      padding: 4,
                      borderRadius: 8,
                      gap: 4,
                    }}
                  >
                    <Pressable
                      onPress={() => setGuiaArchivoActiva('planta')}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        backgroundColor: guiaArchivoActiva === 'planta' ? THEME.white : 'transparent',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: guiaArchivoActiva === 'planta' ? 1 : 0 },
                        shadowOpacity: guiaArchivoActiva === 'planta' ? 0.08 : 0,
                        shadowRadius: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: guiaArchivoActiva === 'planta' ? THEME.marca800 : THEME.slate600,
                        }}
                      >
                        1. Estructura Planta Oficial
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setGuiaArchivoActiva('perno')}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        backgroundColor: guiaArchivoActiva === 'perno' ? THEME.white : 'transparent',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: guiaArchivoActiva === 'perno' ? 1 : 0 },
                        shadowOpacity: guiaArchivoActiva === 'perno' ? 0.08 : 0,
                        shadowRadius: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: guiaArchivoActiva === 'perno' ? THEME.emeraldText : THEME.slate600,
                        }}
                      >
                        2. Estructura Planta Perno
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setGuiaArchivoActiva('reglas')}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        backgroundColor: guiaArchivoActiva === 'reglas' ? THEME.white : 'transparent',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: guiaArchivoActiva === 'reglas' ? 1 : 0 },
                        shadowOpacity: guiaArchivoActiva === 'reglas' ? 0.08 : 0,
                        shadowRadius: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: guiaArchivoActiva === 'reglas' ? THEME.slate900 : THEME.slate600,
                        }}
                      >
                        Reglas y Recomendaciones
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* CONTENIDO 1: TABLA GUÍA PLANTA OFICIAL */}
                {guiaArchivoActiva === 'planta' && (
                  <View style={{ marginTop: 20 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: THEME.skyBg,
                        borderColor: THEME.skyRing,
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 16,
                      }}
                    >
                      <Text style={{ fontSize: 12.5, color: THEME.skyText, flex: 1, lineHeight: 18 }}>
                        <Text style={{ fontWeight: '700' }}>Hoja de Excel:</Text> Debe llamarse <Text style={{ fontWeight: '700' }}>PLANTA SJD (2)</Text> o <Text style={{ fontWeight: '700' }}>PLANTA SJD</Text>.{'\n'}
                        <Text style={{ fontWeight: '700' }}>Encabezados:</Text> Fila 4 | <Text style={{ fontWeight: '700' }}>Registros:</Text> A partir de la fila 5. Cada fila representa una de las plazas de la entidad.
                      </Text>
                      <Pressable
                        onPress={handleDescargarPlantillaPlanta}
                        style={{
                          backgroundColor: THEME.marca700,
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: THEME.white, fontSize: 11.5, fontWeight: '600' }}>
                          Descargar .xlsx
                        </Text>
                      </Pressable>
                    </View>

                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                      <View style={{ minWidth: 920 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            backgroundColor: THEME.slate100,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: THEME.slate200,
                          }}
                        >
                          <Text style={{ width: 80, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Col. Excel</Text>
                          <Text style={{ width: 180, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Encabezado Oficial</Text>
                          <Text style={{ width: 100, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Estado</Text>
                          <Text style={{ width: 110, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Tipo de Dato</Text>
                          <Text style={{ width: 260, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Descripción / Uso en el Sistema</Text>
                          <Text style={{ width: 190, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Ejemplo Real</Text>
                        </View>

                        {[
                          { col: 'A (1)', header: 'ID', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Entero', desc: 'Número consecutivo único de la plaza (1 a 170). Llave primaria.', ej: '1' },
                          { col: 'B (2)', header: 'ID SIDEAP', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Entero', desc: 'Identificador asignado a la plaza en el SIDEAP distrital.', ej: '4998' },
                          { col: 'C (3)', header: 'ID PERNO', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Entero', desc: 'Identificador del cargo en el sistema de nómina PERNO.', ej: '11' },
                          { col: 'D (4)', header: 'CEDULA', req: 'Obligatorio*', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto/Número', desc: 'Cédula de quien desempeña el puesto actualmente (titular o encargo).', ej: '36697863' },
                          { col: 'E (5)', header: 'APELLIDOS Y NOMBRES', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Nombre del servidor o "VACANTE DEFINITIVA" / "VACANTE TEMPORAL".', ej: 'ANA MARTA MIRANDA CORRALES' },
                          { col: 'F (6)', header: 'TIPO DE VINCULACIÓN A LA ENTIDAD', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'LIBRE NOMBRAMIENTO Y REMOCIÓN, CARRERA ADMINISTRATIVA, etc.', ej: 'LIBRE NOMBRAMIENTO Y REMOCIÓN' },
                          { col: 'G (7)', header: 'TIPO DE VINCULACIÓN AL CARGO/ SIDEAP', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Modo de vinculación al empleo específico.', ej: 'NOMBRAMIENTO ORDINARIO' },
                          { col: 'H (8)', header: 'FECHA INGRESO A LA ENTIDAD', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Fecha', desc: 'Fecha de ingreso institucional a la Secretaría Jurídica (AAAA-MM-DD).', ej: '2025-11-06' },
                          { col: 'I (9)', header: 'FECHA INGRESO AL DISTRITO', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Fecha', desc: 'Fecha de ingreso a la administración distrital.', ej: '2025-11-06' },
                          { col: 'J (10)', header: 'SEXO', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Género del servidor (MUJER / HOMBRE).', ej: 'MUJER' },
                          { col: 'K (11)', header: 'EDAD', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Entero', desc: 'Edad en años.', ej: '45' },
                          { col: 'M (13)', header: 'SITUACIÓN ADMINISTRATIVA', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Situación administrativa activa: ENCARGO, EN PROPIEDAD, VACANCIA.', ej: 'EN PROPIEDAD' },
                          { col: 'N (14)', header: 'SITUACIÓN ADMINISTRATIVA TITULAR', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Situación del titular con derechos sobre la plaza.', ej: 'EN PROPIEDAD' },
                          { col: 'O (15)', header: 'CEDULA (TITULAR)', req: 'Requerido*', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto/Número', desc: 'Cédula del titular si la plaza está ocupada o en encargo.', ej: '36697863' },
                          { col: 'P (16)', header: 'TITULAR CARGO', req: 'Requerido*', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Nombre del servidor titular con derechos de carrera.', ej: 'ANA MARTA MIRANDA CORRALES' },
                          { col: 'Y (25)', header: 'ESTADO DEL CARGO', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Estado oficial: OCUPADO, VACANTE DEFINITIVA o VACANTE TEMPORAL.', ej: 'OCUPADO' },
                          { col: 'Z (26)', header: 'NIVEL', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Nivel jerárquico: DIRECTIVO, ASESOR, PROFESIONAL, TECNICO, ASISTENCIAL.', ej: 'ASESOR' },
                          { col: 'AA (27)', header: 'NOMENCLATURA_ADMIN', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Denominación oficial del empleo en la planta.', ej: 'JEFE DE OFICINA ASESORA' },
                          { col: 'AB (28)', header: 'CÓDIGO', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Código del cargo según nomenclatura distrital.', ej: '115' },
                          { col: 'AC (29)', header: 'GRADO', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Grado salarial del empleo.', ej: '6' },
                          { col: 'AE (31)', header: 'DEPENDENCIA DEL CARGO', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Dependencia orgánica a la que pertenece la plaza.', ej: 'OFICINA ASESORA DE PLANEACIÓN' },
                          { col: 'AF (32)', header: 'DEPENDENCIA FUNCIONAL', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Dependencia donde realmente presta labores.', ej: 'OFICINA ASESORA DE PLANEACIÓN' },
                          { col: 'AG (33)', header: 'PROPOSITO', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Propósito principal según manual de funciones.', ej: 'Asesorar en el diseño de planes y estrategias...' },
                          { col: 'AH (34)', header: 'FUNCIONES', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto Largo', desc: 'Funciones esenciales del empleo (se formatean en lista).', ej: '1. Formular proyectos... 2. Dirigir plan...' },
                          { col: 'AI (35)', header: 'REQUISITOS', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto Largo', desc: 'Estudios académicos y experiencia laboral requerida.', ej: 'Título profesional en Administración. Posgrado.' },
                          { col: 'AK (37)', header: 'ASIGNACIÓN BÁSICA', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Moneda (Num)', desc: 'Asignación básica mensual en pesos colombianos.', ej: '10208469.82' },
                        ].map((row, idx) => (
                          <View
                            key={idx}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 9,
                              paddingHorizontal: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: THEME.slate200,
                              backgroundColor: idx % 2 === 0 ? THEME.white : THEME.slate50,
                            }}
                          >
                            <Text style={{ width: 80, fontSize: 12, fontWeight: '700', color: THEME.slate900 }}>{row.col}</Text>
                            <Text style={{ width: 180, fontSize: 12, fontWeight: '600', color: THEME.marca800 }}>{row.header}</Text>
                            <View style={{ width: 100 }}>
                              <View
                                style={{
                                  backgroundColor: row.reqBg,
                                  alignSelf: 'flex-start',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '600', color: row.reqColor }}>{row.req}</Text>
                              </View>
                            </View>
                            <Text style={{ width: 110, fontSize: 11.5, color: THEME.slate600 }}>{row.tipo}</Text>
                            <Text style={{ width: 260, fontSize: 11.5, color: THEME.slate700, paddingRight: 8 }}>{row.desc}</Text>
                            <Text style={{ width: 190, fontSize: 11, color: THEME.slate500, fontStyle: 'italic' }}>{row.ej}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* CONTENIDO 2: TABLA GUÍA PLANTA PERNO */}
                {guiaArchivoActiva === 'perno' && (
                  <View style={{ marginTop: 20 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: THEME.emeraldBg,
                        borderColor: THEME.emeraldRing,
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 16,
                      }}
                    >
                      <Text style={{ fontSize: 12.5, color: THEME.emeraldText, flex: 1, lineHeight: 18 }}>
                        <Text style={{ fontWeight: '700' }}>Hoja de Excel:</Text> Debe llamarse <Text style={{ fontWeight: '700' }}>PLANTA PERNO</Text>.{'\n'}
                        <Text style={{ fontWeight: '700' }}>Encabezados:</Text> Fila 9 | <Text style={{ fontWeight: '700' }}>Registros:</Text> A partir de la fila 10. Cruza con la plaza mediante la columna <Text style={{ fontWeight: '700' }}>NUMERO_IDENTIFICACION</Text>.
                      </Text>
                      <Pressable
                        onPress={handleDescargarPlantillaPerno}
                        style={{
                          backgroundColor: THEME.emeraldText,
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: THEME.white, fontSize: 11.5, fontWeight: '600' }}>
                          Descargar .xlsx
                        </Text>
                      </Pressable>
                    </View>

                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                      <View style={{ minWidth: 920 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            backgroundColor: THEME.slate100,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: THEME.slate200,
                          }}
                        >
                          <Text style={{ width: 80, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Col. Excel</Text>
                          <Text style={{ width: 190, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Encabezado Oficial</Text>
                          <Text style={{ width: 100, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Estado</Text>
                          <Text style={{ width: 110, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Tipo de Dato</Text>
                          <Text style={{ width: 250, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Descripción / Cruce en Planta</Text>
                          <Text style={{ width: 190, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Ejemplo Real</Text>
                        </View>

                        {[
                          { col: 'A (1)', header: 'NUMERO_IDENTIFICACION', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto/Número', desc: 'Cédula de ciudadanía. Llave indispensable para vincular los datos a la plaza.', ej: '52171949' },
                          { col: 'B (2)', header: 'PRIMER_APELLIDO', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Primer apellido del servidor público.', ej: 'MARTINEZ' },
                          { col: 'C (3)', header: 'SEGUNDO_APELLIDO', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Segundo apellido del servidor público.', ej: 'ORTIZ' },
                          { col: 'D (4)', header: 'NOMBRE', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Nombres del servidor público.', ej: 'GLORIA INES' },
                          { col: 'E (5)', header: 'ESTADO_FUNCIONARIO', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Estado en el software PERNO (ej. "A" para activo).', ej: 'A' },
                          { col: 'F (6)', header: 'FECHA_NACIMIENTO', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Fecha', desc: 'Fecha de nacimiento del funcionario (AAAA-MM-DD).', ej: '1973-04-22' },
                          { col: 'G (7)', header: 'DIRECCION', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Dirección residencial del funcionario.', ej: 'CARRERA 98 A 22 K 00' },
                          { col: 'H (8)', header: 'TELEFONO', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Teléfono de contacto o celular.', ej: '4754435' },
                          { col: 'I (9)', header: 'SEXO', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Género biológico (F / M).', ej: 'F' },
                          { col: 'M (13)', header: 'TIPO_SANGRE', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Grupo sanguíneo (O, A, B, AB).', ej: 'O' },
                          { col: 'N (14)', header: 'RH', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Factor RH (P = Positivo, N = Negativo).', ej: 'P' },
                          { col: 'O (15)', header: 'TIPO_FUNCIONARIO', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'EMPLEADO DE PLANTA, TRABAJADOR OFICIAL, etc.', ej: 'EMPLEADO DE PLANTA' },
                          { col: 'P (16)', header: 'FECHA_INGRESO_ENTIDAD', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Fecha', desc: 'Fecha de vinculación oficial.', ej: '2021-07-12' },
                          { col: 'T (20)', header: 'FONDO_SALUD', req: 'Obligatorio*', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Nombre de la Entidad Promotora de Salud (EPS).', ej: 'SALUD TOTAL S.A. E.P.S.' },
                          { col: 'V (22)', header: 'FONDO_PENSION', req: 'Obligatorio*', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Administradora del Fondo de Pensiones (AFP).', ej: 'COLPENSIONES' },
                          { col: 'X (24)', header: 'FONDO_CESANTIAS', req: 'Obligatorio*', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Administradora del Fondo de Cesantías.', ej: 'FONDO NACIONAL DEL AHORRO' },
                          { col: 'Y (25)', header: 'DEPENDENCIA', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Código numérico de dependencia PERNO.', ej: '2310300' },
                          { col: 'Z (26)', header: 'DESC_DEPENDENCIA', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Descripción textual del área en nómina.', ej: 'OFICINA DE CONTROL INTERNO' },
                          { col: 'AH (34)', header: 'TIPO_NOMB', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'CARRERA ADMINISTRATIVA, ENCARGO, LIBRE NOMBRAMIENTO.', ej: 'CARRERA ADMINISTRATIVA' },
                          { col: 'AI (35)', header: 'ACTO_NOMB', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Tipo de acto (Resolución, Decreto, Acta).', ej: 'Nombramiento' },
                          { col: 'AJ (36)', header: 'FECHA_EFECTIVA_NOMB', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Fecha', desc: 'Fecha de efectos fiscales de la posesión.', ej: '2021-07-12' },
                          { col: 'AK (37)', header: 'NUMERO_ACTO_NOMB', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Número del acto administrativo que confirió el cargo.', ej: '107' },
                          { col: 'AL (38)', header: 'FECHA_ACTO_NOMB', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Fecha', desc: 'Fecha de emisión del acto administrativo.', ej: '2021-07-04' },
                          { col: 'AM (39)', header: 'FECHA_EFECTIVA_ENC', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Fecha', desc: 'Fecha de efectividad si está en situación de encargo.', ej: '2026-01-21' },
                          { col: 'AN (40)', header: 'NUMERO_ACTO_ENC', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto', desc: 'Número del acto administrativo de encargo.', ej: '16' },
                          { col: 'AQ (43)', header: 'TOTAL DEVENGADOS MENSUAL', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Moneda (Num)', desc: 'Total monetario devengado en la nómina liquidada.', ej: '4938935.00' },
                        ].map((row, idx) => (
                          <View
                            key={idx}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 9,
                              paddingHorizontal: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: THEME.slate200,
                              backgroundColor: idx % 2 === 0 ? THEME.white : THEME.slate50,
                            }}
                          >
                            <Text style={{ width: 80, fontSize: 12, fontWeight: '700', color: THEME.slate900 }}>{row.col}</Text>
                            <Text style={{ width: 190, fontSize: 12, fontWeight: '600', color: THEME.emeraldText }}>{row.header}</Text>
                            <View style={{ width: 100 }}>
                              <View
                                style={{
                                  backgroundColor: row.reqBg,
                                  alignSelf: 'flex-start',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '600', color: row.reqColor }}>{row.req}</Text>
                              </View>
                            </View>
                            <Text style={{ width: 110, fontSize: 11.5, color: THEME.slate600 }}>{row.tipo}</Text>
                            <Text style={{ width: 250, fontSize: 11.5, color: THEME.slate700, paddingRight: 8 }}>{row.desc}</Text>
                            <Text style={{ width: 190, fontSize: 11, color: THEME.slate500, fontStyle: 'italic' }}>{row.ej}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* CONTENIDO 3: REGLAS Y RECOMENDACIONES */}
                {guiaArchivoActiva === 'reglas' && (
                  <View style={{ marginTop: 20, gap: 14 }}>
                    <View
                      style={{
                        backgroundColor: THEME.amberBg,
                        borderColor: THEME.amberRing,
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 16,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Ionicons name="alert-circle" size={20} color={THEME.amberText} />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.amberText }}>
                          Reglas Críticas para Evitar Fallos en la Carga
                        </Text>
                      </View>

                      <View style={{ gap: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 12.5, color: THEME.slate700, lineHeight: 18 }}>
                          • <Text style={{ fontWeight: '700' }}>Sin Celdas Combinadas en los Registros:</Text> Asegúrate de que las filas de datos (a partir de la fila 5 en Planta y 10 en Perno) no tengan celdas combinadas vertical u horizontalmente.
                        </Text>
                        <Text style={{ fontSize: 12.5, color: THEME.slate700, lineHeight: 18 }}>
                          • <Text style={{ fontWeight: '700' }}>Cédulas Limpias:</Text> Los números de documento no deben contener comas, puntos ni espacios (ej: <Text style={{ fontWeight: '700' }}>52171949</Text> en lugar de 52.171.949).
                        </Text>
                        <Text style={{ fontSize: 12.5, color: THEME.slate700, lineHeight: 18 }}>
                          • <Text style={{ fontWeight: '700' }}>Valores de Estado del Cargo:</Text> Deben ser exactamente <Text style={{ fontWeight: '700' }}>OCUPADO</Text>, <Text style={{ fontWeight: '700' }}>VACANTE DEFINITIVA</Text> o <Text style={{ fontWeight: '700' }}>VACANTE TEMPORAL</Text>.
                        </Text>
                        <Text style={{ fontSize: 12.5, color: THEME.slate700, lineHeight: 18 }}>
                          • <Text style={{ fontWeight: '700' }}>Niveles Jerárquicos:</Text> Únicamente los niveles reglamentarios: <Text style={{ fontWeight: '700' }}>DIRECTIVO, ASESOR, PROFESIONAL, TECNICO, ASISTENCIAL</Text>.
                        </Text>
                        <Text style={{ fontSize: 12.5, color: THEME.slate700, lineHeight: 18 }}>
                          • <Text style={{ fontWeight: '700' }}>Asignación Salarial:</Text> Ingresar valores numéricos limpios sin signos de pesos ni separadores de miles de texto (ej: <Text style={{ fontWeight: '700' }}>10208469.82</Text>).
                        </Text>
                        <Text style={{ fontSize: 12.5, color: THEME.slate700, lineHeight: 18 }}>
                          • <Text style={{ fontWeight: '700' }}>Orden de Carga Recomendado:</Text> Carga siempre en primer lugar el <Text style={{ fontWeight: '700' }}>Archivo de Planta Oficial</Text> para crear/actualizar la estructura de las plazas. Luego carga el <Text style={{ fontWeight: '700' }}>Archivo Planta Perno</Text> para inyectar la seguridad social y nómina sobre las personas vinculadas.
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        backgroundColor: THEME.slate50,
                        borderColor: THEME.slate200,
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 16,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate800, marginBottom: 6 }}>
                        ¿Necesitas una plantilla lista para usar?
                      </Text>
                      <Text style={{ fontSize: 12, color: THEME.slate600, lineHeight: 18, marginBottom: 12 }}>
                        Descarga los archivos oficiales directamente con las columnas formateadas, fórmulas y registros institucionales de ejemplo:
                      </Text>
                      <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 10 }}>
                        <Pressable
                          onPress={handleDescargarPlantillaPlanta}
                          style={{
                            flex: 1,
                            backgroundColor: THEME.white,
                            borderWidth: 1,
                            borderColor: THEME.marca600,
                            paddingVertical: 10,
                            paddingHorizontal: 14,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          }}
                        >
                          <Ionicons name="document-text-outline" size={18} color={THEME.marca700} />
                          <Text style={{ color: THEME.marca700, fontSize: 12.5, fontWeight: '600' }}>
                            Plantilla Planta Oficial (.xlsx)
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={handleDescargarPlantillaPerno}
                          style={{
                            flex: 1,
                            backgroundColor: THEME.white,
                            borderWidth: 1,
                            borderColor: THEME.emeraldText,
                            paddingVertical: 10,
                            paddingHorizontal: 14,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          }}
                        >
                          <Ionicons name="people-outline" size={18} color={THEME.emeraldText} />
                          <Text style={{ color: THEME.emeraldText, fontSize: 12.5, fontWeight: '600' }}>
                            Plantilla Planta Perno (.xlsx)
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* ============================================================== */}
        {/* ============================================================== */}
        {/* MODAL SELECTOR UNIFICADO PARA LOS 6 FILTROS                   */}
        {/* ============================================================== */}
        <Modal
          visible={pickerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPickerVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 620,
                maxHeight: '82%',
                backgroundColor: THEME.white,
                borderRadius: 16,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 24,
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
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: THEME.white, fontSize: 16, fontWeight: '700' }}>
                    {getTituloPicker()}
                  </Text>
                  <Text style={{ color: 'rgba(214, 228, 244, 0.75)', fontSize: 11.5, marginTop: 2 }}>
                    Mostrando {opcionesModalFiltradas.length} de {opcionesModal.length} opciones disponibles
                  </Text>
                </View>
                <Pressable
                  onPress={() => setPickerVisible(false)}
                  style={({ pressed }) => ({
                    padding: 6,
                    borderRadius: 8,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  })}
                >
                  <Ionicons name="close" size={20} color={THEME.white} />
                </Pressable>
              </View>

              {/* Barra de búsqueda en tiempo real dentro del modal */}
              <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: THEME.slate100, backgroundColor: THEME.slate50 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: THEME.white,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Ionicons name="search-outline" size={17} color={THEME.slate400} />
                  <TextInput
                    value={pickerBusqueda}
                    onChangeText={setPickerBusqueda}
                    placeholder="Filtrar opciones disponibles..."
                    placeholderTextColor={THEME.slate400}
                    style={{ flex: 1, marginLeft: 8, fontSize: 13, color: THEME.slate900, padding: 0 }}
                  />
                  {pickerBusqueda ? (
                    <Pressable onPress={() => setPickerBusqueda('')}>
                      <Ionicons name="close-circle" size={16} color={THEME.slate400} />
                    </Pressable>
                  ) : null}
                </View>

                {/* Opción para limpiar la selección actual */}
                <Pressable
                  onPress={() => {
                    if (pickerTipo === 'cargo') setFiltroCargo('');
                    else if (pickerTipo === 'codigoGrado') setFiltroCodigoGrado('');
                    else if (pickerTipo === 'dependencia') setFiltroDependencia('');
                    else if (pickerTipo === 'situacion') setFiltroSituacion('');
                    else if (pickerTipo === 'sideap') setFiltroSideap('');
                    else if (pickerTipo === 'perno') setFiltroPerno('');
                    setPickerVisible(false);
                  }}
                  style={({ pressed }) => ({
                    marginTop: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 7,
                    paddingHorizontal: 10,
                    borderRadius: 6,
                    backgroundColor: pressed ? THEME.slate200 : THEME.slate100,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="apps-outline" size={14} color={THEME.marca700} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.marca800 }}>
                      Mostrar todas (Sin filtro en este campo)
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={13} color={THEME.slate400} />
                </Pressable>
              </View>

              {/* Lista de opciones scrolleable */}
              <ScrollView style={{ maxHeight: 420, paddingVertical: 4 }}>
                {opcionesModalFiltradas.length === 0 ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="search" size={28} color={THEME.slate300} />
                    <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.slate500, marginTop: 8 }}>
                      No se encontraron resultados para "{pickerBusqueda}"
                    </Text>
                  </View>
                ) : (
                  opcionesModalFiltradas.map((item, idx) => {
                    const seleccionado = item.seleccionado;
                    return (
                      <Pressable
                        key={item.valor + '-' + idx}
                        onPress={() => seleccionarOpcionModal(item)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          paddingHorizontal: 20,
                          backgroundColor: seleccionado
                            ? THEME.marca50
                            : pressed
                            ? THEME.slate50
                            : THEME.white,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.slate100,
                        })}
                      >
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: seleccionado ? '700' : '500',
                              color: seleccionado ? THEME.marca800 : THEME.slate800,
                            }}
                          >
                            {item.etiquetaPrincipal}
                          </Text>
                          {item.etiquetaSecundaria ? (
                            <Text style={{ fontSize: 11, color: THEME.slate500, marginTop: 2 }}>
                              {item.etiquetaSecundaria}
                            </Text>
                          ) : null}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {item.badge ? (
                            <View
                              style={{
                                backgroundColor: THEME.slate100,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{ fontSize: 10, fontWeight: '600', color: THEME.slate600 }}>
                                {item.badge}
                              </Text>
                            </View>
                          ) : null}
                          {seleccionado ? (
                            <Ionicons name="checkmark-circle" size={19} color={THEME.marca600} />
                          ) : (
                            <View
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 9,
                                borderWidth: 1,
                                borderColor: THEME.slate300,
                              }}
                            />
                          )}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              {/* Pie de modal */}
              <View
                style={{
                  padding: 14,
                  borderTopWidth: 1,
                  borderTopColor: THEME.slate100,
                  backgroundColor: THEME.slate50,
                  alignItems: 'flex-end',
                }}
              >
                <Pressable
                  onPress={() => setPickerVisible(false)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: THEME.slate200,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700 }}>
                    Cerrar
                  </Text>
                </Pressable>
              </View>
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
