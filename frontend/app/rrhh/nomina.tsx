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
import { nominaService, PlazaNomina, EstadisticasNomina, PersonaPerno } from '../../lib/nominaService';
import mockPlazasData from '../../lib/plantaMockData.json';
import mockPernoData from '../../lib/pernoMockData.json';
import { DataTable, ColumnConfig } from '../../components/DataTable';
import { useMarcoRRHH } from '../../components/rrhh/MarcoRRHH';

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
  const { enMenu } = useMarcoRRHH();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isTablet = width >= 640;

  // Estados principales
  const [tabActiva, setTabActiva] = useState<'plazas' | 'escaleras' | 'perno' | 'estructura' | 'archivos'>('plazas');
  const [cargando, setCargando] = useState(true);
  const [plazas, setPlazas] = useState<PlazaNomina[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasNomina | null>(null);
  const [mostrarKpis, setMostrarKpis] = useState(true);

  // Estados específicos para Tab Personal Integral / PERNO
  const [personalPerno, setPersonalPerno] = useState<PersonaPerno[]>([]);
  const [cargandoPerno, setCargandoPerno] = useState(false);
  const [busquedaPerno, setBusquedaPerno] = useState('');
  const [filtroEstadoPerno, setFiltroEstadoPerno] = useState<'TODOS' | 'ACTIVOS' | 'RETIRADOS'>('TODOS');
  const [filtroPlazaPerno, setFiltroPlazaPerno] = useState<'TODOS' | 'CON_PLAZA' | 'SIN_PLAZA'>('TODOS');
  const [paginaPerno, setPaginaPerno] = useState(1);
  const filasPorPaginaPerno = 25;
  const [pernoModal, setPernoModal] = useState<PersonaPerno | null>(null);
  const [modalPernoTab, setModalPernoTab] = useState<'personal' | 'vinculacion' | 'seguridad' | 'planta' | 'escalera'>('personal');

  // Filtros Avanzados (con modales estilo /ingresos/nueva)
  const [busqueda, setBusqueda] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [filtroCodigoGrado, setFiltroCodigoGrado] = useState('');
  const [filtroDependencia, setFiltroDependencia] = useState('');
  const [filtroSituacion, setFiltroSituacion] = useState('');
  const [filtroSideap, setFiltroSideap] = useState('');
  const [filtroPerno, setFiltroPerno] = useState('');
  const [filtroEscalera, setFiltroEscalera] = useState('');

  const [nivelSeleccionado, setNivelSeleccionado] = useState('TODOS');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('TODOS');
  const [soloEncargo, setSoloEncargo] = useState(false);
  const [modoVista, setModoVista] = useState<'tabla' | 'cards'>('tabla');

  // Estados del Selector Modal Avanzado
  const [pickerTipo, setPickerTipo] = useState<PickerTipo>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerBusqueda, setPickerBusqueda] = useState('');

  // Modal de Detalle de Plaza y Pestañas de la Ficha Técnica Integral
  const [plazaModal, setPlazaModal] = useState<PlazaNomina | null>(null);
  const [modalTab, setModalTab] = useState<'general' | 'funciones' | 'requisitos' | 'perno' | 'escalera'>('general');

  // Modal de Notificaciones (Regla: no alerts)
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalTitulo, setInfoModalTitulo] = useState('');
  const [infoModalMensaje, setInfoModalMensaje] = useState('');
  const [infoModalTipo, setInfoModalTipo] = useState<'success' | 'info' | 'error'>('info');
  const [infoModalAdvertencias, setInfoModalAdvertencias] = useState<string[]>([]);

  // Carga de Archivos
  const [cargandoArchivoPlanta, setCargandoArchivoPlanta] = useState(false);
  const [cargandoArchivoPerno, setCargandoArchivoPerno] = useState(false);
  const [nombreArchivoPlanta, setNombreArchivoPlanta] = useState<string | null>(null);
  const [nombreArchivoPerno, setNombreArchivoPerno] = useState<string | null>(null);
  const [guiaArchivoActiva, setGuiaArchivoActiva] = useState<'planta' | 'perno' | 'reglas'>('planta');

  const mostrarModal = (
    titulo: string,
    mensaje: string,
    tipo: 'success' | 'info' | 'error' = 'info',
    advertencias: string[] = []
  ) => {
    setInfoModalTitulo(titulo);
    setInfoModalMensaje(mensaje);
    setInfoModalTipo(tipo);
    setInfoModalAdvertencias(advertencias);
    setInfoModalVisible(true);
  };

  const cleanLabel = (val?: string | null, fallback = '') => {
    if (!val) return fallback;
    const s = String(val).trim();
    if (!s || s.toLowerCase().includes('[object')) return fallback;
    return s;
  };

  const formatFecha = (val?: string | null) => {
    if (!val) return 'No registrada';
    const s = String(val).split('T')[0];
    const parts = s.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return s;
  };

  const formatMoneda = (val?: number | string | null) => {
    if (val === null || val === undefined || val === '') return '$0';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[\$,\s]/g, ''));
    if (isNaN(num)) return '$0';
    return '$' + Math.round(num).toLocaleString('es-CO');
  };

  const calcEdad = (val?: string | null) => {
    if (!val) return null;
    const s = String(val).split('T')[0];
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [listado, stats, pernoList] = await Promise.all([
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
        nominaService.getPersonalPerno(),
      ]);
      const rawPerno = Array.isArray(pernoList) && pernoList.length > 0
        ? pernoList
        : ((mockPernoData as unknown as PersonaPerno[]) || []);

      const pernoActivosPorPos = new Map<number, PersonaPerno>();
      const pernoRetirados = new Set<string>();

      rawPerno.forEach((per) => {
        const esRet = per.estado_funcionario === 'R' || !!per.fecha_retiro;
        if (esRet) {
          pernoRetirados.add(String(per.cedula).trim());
        } else if (per.estado_funcionario === 'A' && !per.fecha_retiro && per.posicion_planta) {
          pernoActivosPorPos.set(per.posicion_planta, per);
        }
      });

      const listadoEnriquecido = (listado || []).map((p: PlazaNomina) => {
        const m = (mockPlazasData as any[]).find((mock) => mock.id_plaza === p.id_plaza);
        const titularCed = p.titular_cedula ? String(p.titular_cedula).trim() : (m?.titular_cedula ? String(m.titular_cedula).trim() : null);
        const titularEstaRetirado = titularCed ? pernoRetirados.has(titularCed) : false;
        const posPlanta = p.id_perno || m?.id_perno;
        const funcionarioActivo = posPlanta ? pernoActivosPorPos.get(posPlanta) : null;

        let titularNombreFinal = p.titular_nombre || m?.titular_nombre || null;
        let titularCedulaFinal = p.titular_cedula || m?.titular_cedula || null;
        let estadoCargoFinal = p.estado_cargo || m?.estado_cargo || 'OCUPADO';

        if (titularEstaRetirado) {
          if (funcionarioActivo) {
            titularNombreFinal = funcionarioActivo.nombre_completo || `${funcionarioActivo.nombres} ${funcionarioActivo.primer_apellido}`;
            titularCedulaFinal = funcionarioActivo.cedula;
            estadoCargoFinal = 'OCUPADO';
          } else {
            titularNombreFinal = null;
            titularCedulaFinal = null;
            estadoCargoFinal = 'VACANTE DEFINITIVA';
          }
        }

        return {
          ...p,
          titular_nombre: titularNombreFinal,
          titular_cedula: titularCedulaFinal,
          estado_cargo: estadoCargoFinal,
          id_escalera: p.id_escalera || m?.id_escalera || null,
          peldano_escalera: p.peldano_escalera || m?.peldano_escalera || null,
          encargo_cedula: p.encargo_cedula || m?.encargo_cedula || null,
          encargo_nombre: p.encargo_nombre || m?.encargo_nombre || null,
          es_encargo: p.es_encargo !== undefined ? p.es_encargo : m?.es_encargo,
          opec: p.opec || m?.opec || null,
          situacion_titular: p.situacion_titular || m?.situacion_titular || 'EN PROPIEDAD',
        };
      });
      setPlazas(listadoEnriquecido);
      setEstadisticas(stats);
      setPersonalPerno(rawPerno);
    } catch (e: any) {
      mostrarModal('Error de Conexión', 'No fue posible cargar los datos de nómina: ' + e.message, 'error');
      setPersonalPerno((mockPernoData as unknown as PersonaPerno[]) || []);
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

  // Lista base de PERNO consolidada
  const todoElPerno = useMemo(() => {
    return personalPerno.length > 0 ? personalPerno : (mockPernoData as unknown as PersonaPerno[]) || [];
  }, [personalPerno]);

  // Estadísticas consolidadas de PERNO (Activos vs Desvinculados/Retirados)
  const estadisticasPerno = useMemo(() => {
    const total = todoElPerno.length;
    let activos = 0;
    let retirados = 0;
    let conPlaza = 0;
    const listPlazas = plazas.length > 0 ? plazas : todasLasPlazas;

    todoElPerno.forEach((p) => {
      const esRet = p.estado_funcionario === 'R' || !!p.fecha_retiro;
      if (esRet) retirados++;
      else activos++;

      const tienePlaza =
        p.plaza_id_plaza ||
        listPlazas.some(
          (pl) =>
            String(pl.titular_cedula) === String(p.cedula) ||
            String(pl.encargo_cedula) === String(p.cedula) ||
            (p.posicion_planta && pl.id_perno === p.posicion_planta)
        );
      if (tienePlaza) conPlaza++;
    });

    return { total, activos, retirados, conPlaza };
  }, [todoElPerno, plazas, todasLasPlazas]);

  // Filtrado de Personal de PERNO
  const pernoFiltrado = useMemo(() => {
    let list = todoElPerno;
    const listPlazas = plazas.length > 0 ? plazas : todasLasPlazas;

    if (busquedaPerno.trim()) {
      const q = busquedaPerno.trim().toLowerCase();
      list = list.filter((p) =>
        (p.nombre_completo && p.nombre_completo.toLowerCase().includes(q)) ||
        (p.cedula && p.cedula.toString().includes(q)) ||
        (p.cargo && p.cargo.toLowerCase().includes(q)) ||
        (p.dependencia && p.dependencia.toLowerCase().includes(q)) ||
        (p.fondo_salud && p.fondo_salud.toLowerCase().includes(q)) ||
        (p.fondo_pension && p.fondo_pension.toLowerCase().includes(q)) ||
        (p.fondo_cesantias && p.fondo_cesantias.toLowerCase().includes(q)) ||
        (p.plaza_cargo && p.plaza_cargo.toLowerCase().includes(q))
      );
    }

    if (filtroEstadoPerno === 'ACTIVOS') {
      list = list.filter((p) => p.estado_funcionario === 'A' && !p.fecha_retiro);
    } else if (filtroEstadoPerno === 'RETIRADOS') {
      list = list.filter((p) => p.estado_funcionario === 'R' || !!p.fecha_retiro);
    }

    if (filtroPlazaPerno === 'CON_PLAZA') {
      list = list.filter((p) => {
        if (p.plaza_id_plaza) return true;
        return listPlazas.some(
          (pl) =>
            String(pl.titular_cedula) === String(p.cedula) ||
            String(pl.encargo_cedula) === String(p.cedula) ||
            (p.posicion_planta && pl.id_perno === p.posicion_planta)
        );
      });
    } else if (filtroPlazaPerno === 'SIN_PLAZA') {
      list = list.filter((p) => {
        if (p.plaza_id_plaza) return false;
        return !listPlazas.some(
          (pl) =>
            String(pl.titular_cedula) === String(p.cedula) ||
            String(pl.encargo_cedula) === String(p.cedula) ||
            (p.posicion_planta && pl.id_perno === p.posicion_planta)
        );
      });
    }

    return list;
  }, [todoElPerno, busquedaPerno, filtroEstadoPerno, filtroPlazaPerno, plazas, todasLasPlazas]);

  // Paginación de PERNO
  const totalPaginasPerno = Math.max(1, Math.ceil(pernoFiltrado.length / filasPorPaginaPerno));
  const pernoPaginado = useMemo(() => {
    const inicio = (paginaPerno - 1) * filasPorPaginaPerno;
    return pernoFiltrado.slice(inicio, inicio + filasPorPaginaPerno);
  }, [pernoFiltrado, paginaPerno]);

  // Enriquecimiento de la persona seleccionada en el Modal
  const pernoModalEnriquecida = useMemo(() => {
    if (!pernoModal) return null;
    const listPlazas = plazas.length > 0 ? plazas : todasLasPlazas;
    const matchPlaza = listPlazas.find(
      (pl) =>
        String(pl.titular_cedula) === String(pernoModal.cedula) ||
        String(pl.encargo_cedula) === String(pernoModal.cedula) ||
        (pernoModal.posicion_planta && pl.id_perno === pernoModal.posicion_planta)
    );

    if (!matchPlaza) return pernoModal;

    return {
      ...pernoModal,
      plaza_id_plaza: pernoModal.plaza_id_plaza || matchPlaza.id_plaza,
      plaza_id_sideap: pernoModal.plaza_id_sideap || matchPlaza.id_sideap,
      plaza_nivel: pernoModal.plaza_nivel || matchPlaza.nivel,
      plaza_cargo: pernoModal.plaza_cargo || matchPlaza.cargo,
      plaza_codigo: pernoModal.plaza_codigo || matchPlaza.codigo,
      plaza_grado: pernoModal.plaza_grado || matchPlaza.grado,
      plaza_dependencia_cargo: pernoModal.plaza_dependencia_cargo || matchPlaza.dependencia_cargo,
      plaza_dependencia_funcional: pernoModal.plaza_dependencia_funcional || matchPlaza.dependencia_funcional,
      plaza_proposito: pernoModal.plaza_proposito || matchPlaza.proposito,
      plaza_funciones: pernoModal.plaza_funciones || matchPlaza.funciones,
      plaza_requisitos: pernoModal.plaza_requisitos || matchPlaza.requisitos,
      plaza_estado_cargo: pernoModal.plaza_estado_cargo || matchPlaza.estado_cargo,
      plaza_situacion_titular: pernoModal.plaza_situacion_titular || matchPlaza.situacion_titular,
      plaza_tipo_vinculacion: pernoModal.plaza_tipo_vinculacion || matchPlaza.tipo_vinculacion,
      plaza_situacion_administrativa: pernoModal.plaza_situacion_administrativa || matchPlaza.situacion_administrativa,
      plaza_encargo_cedula: pernoModal.plaza_encargo_cedula || matchPlaza.encargo_cedula,
      plaza_encargo_nombre: pernoModal.plaza_encargo_nombre || matchPlaza.encargo_nombre,
      plaza_es_encargo: pernoModal.plaza_es_encargo !== undefined ? pernoModal.plaza_es_encargo : matchPlaza.es_encargo,
      plaza_opec: pernoModal.plaza_opec || matchPlaza.opec,
      plaza_id_escalera: pernoModal.plaza_id_escalera || matchPlaza.id_escalera,
      plaza_peldano_escalera: pernoModal.plaza_peldano_escalera || matchPlaza.peldano_escalera,
    };
  }, [pernoModal, plazas, todasLasPlazas]);

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

  // 7. Lista agrupada de todas las escaleras de encargo (Calculada sobre la totalidad de la planta)
  const todasLasEscaleras = useMemo(() => {
    const fuente = todasLasPlazas;
    const map = new Map<string, PlazaNomina[]>();
    fuente.forEach((p) => {
      if (p.id_escalera && String(p.id_escalera).trim()) {
        const key = String(p.id_escalera).trim().toUpperCase();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      }
    });

    const lista: { id_escalera: string; peldanos: PlazaNomina[] }[] = [];
    map.forEach((peldanos, id_escalera) => {
      peldanos.sort((a, b) => (Number(a.peldano_escalera) || 999) - (Number(b.peldano_escalera) || 999));
      lista.push({ id_escalera, peldanos });
    });

    lista.sort((a, b) => a.id_escalera.localeCompare(b.id_escalera, undefined, { numeric: true }));

    if (filtroEscalera && filtroEscalera.trim()) {
      const q = filtroEscalera.trim().toLowerCase();
      return lista.filter(
        (e) =>
          e.id_escalera.toLowerCase().includes(q) ||
          e.peldanos.some(
            (p) =>
              (p.cargo && p.cargo.toLowerCase().includes(q)) ||
              (p.titular_nombre && p.titular_nombre.toLowerCase().includes(q)) ||
              (p.encargo_nombre && p.encargo_nombre.toLowerCase().includes(q)) ||
              (p.dependencia_cargo && p.dependencia_cargo.toLowerCase().includes(q)) ||
              (p.titular_cedula && p.titular_cedula.toString().includes(q)) ||
              (p.encargo_cedula && p.encargo_cedula.toString().includes(q)) ||
              (p.id_plaza && p.id_plaza.toString().includes(q))
          )
      );
    }

    return lista;
  }, [todasLasPlazas, filtroEscalera]);

  // 8. Peldaños de la escalera para el modal de detalle (Calculado sobre la totalidad de la planta)
  const peldanosEscaleraModal = useMemo(() => {
    if (!plazaModal?.id_escalera) return [];
    const idEsc = String(plazaModal.id_escalera).trim().toUpperCase();
    return todasLasPlazas
      .filter((p) => p.id_escalera && String(p.id_escalera).trim().toUpperCase() === idEsc)
      .sort((a, b) => (Number(a.peldano_escalera) || 999) - (Number(b.peldano_escalera) || 999));
  }, [plazaModal, todasLasPlazas]);

  // 9. Datos enriquecidos de la plaza seleccionada con el Manual de Funciones y PERNO
  const plazaModalEnriquecida = useMemo(() => {
    if (!plazaModal) return null;
    const mockMatch = (mockPlazasData as any[]).find(
      (m) =>
        m.id_plaza === plazaModal.id_plaza ||
        (m.cargo === plazaModal.cargo &&
          String(m.codigo) === String(plazaModal.codigo) &&
          String(m.grado) === String(plazaModal.grado))
    );

    const funcionesArray: string[] = (() => {
      if (Array.isArray(plazaModal.funciones) && plazaModal.funciones.length > 0) {
        return plazaModal.funciones;
      }
      if (typeof plazaModal.funciones === 'string' && plazaModal.funciones.trim()) {
        return plazaModal.funciones.split('\n').filter(Boolean);
      }
      if (mockMatch && Array.isArray(mockMatch.funciones) && mockMatch.funciones.length > 0) {
        return mockMatch.funciones;
      }
      return [
        '1. Asesorar y ejecutar las actividades técnicas, jurídicas y operativas del área asignada conforme al Plan Estratégico Institucional.',
        '2. Proyectar y revisar actos administrativos, conceptos jurídicos y documentos de gestión asignados por la jefatura.',
        '3. Participar en la implementación del Sistema Integrado de Gestión y en el cumplimiento de los estándares de calidad distrital.',
        '4. Atender y dar trámite oportuno a las solicitudes, requerimientos y peticiones ciudadanas o de entes de control.',
        '5. Desempeñar las demás funciones asignadas por el superior inmediato de acuerdo con la naturaleza del cargo.',
      ];
    })();

    const propositoTexto: string =
      plazaModal.proposito ||
      mockMatch?.proposito ||
      `Ejecutar y coordinar las actividades técnicas, jurídicas y administrativas asignadas a la ${
        plazaModal.dependencia_cargo || 'dependencia'
      }, asegurando la eficiencia, eficacia y cumplimiento normativo institucional de la Secretaría Jurídica Distrital.`;

    const requisitosTexto: string =
      plazaModal.requisitos ||
      mockMatch?.requisitos ||
      'Título profesional en disciplina académica del Núcleo Básico de Conocimiento (NBC) afín a la dependencia y experiencia relacionada según el nivel jerárquico.';

    return {
      ...plazaModal,
      proposito: propositoTexto,
      funciones: funcionesArray,
      requisitos: requisitosTexto,
      fondo_salud: plazaModal.fondo_salud || mockMatch?.fondo_salud || 'No reportada',
      fondo_pension: plazaModal.fondo_pension || mockMatch?.fondo_pension || 'No reportado',
      fondo_cesantias: plazaModal.fondo_cesantias || mockMatch?.fondo_cesantias || 'No reportado',
      telefono: plazaModal.telefono || mockMatch?.telefono || 'No registrado',
      direccion: plazaModal.direccion || mockMatch?.direccion || 'No registrada',
      sexo: plazaModal.sexo || mockMatch?.sexo || '---',
      tipo_funcionario: plazaModal.tipo_funcionario || mockMatch?.tipo_funcionario || 'EMPLEADO DE PLANTA',
      acto_nombramiento:
        plazaModal.acto_nombramiento ||
        mockMatch?.acto_nombramiento ||
        plazaModal.numero_acto_nombramiento ||
        'Resolución institucional',
      numero_acto_nombramiento:
        plazaModal.numero_acto_nombramiento || mockMatch?.numero_acto_nombramiento || '---',
      fecha_acto_nombramiento:
        plazaModal.fecha_acto_nombramiento || mockMatch?.fecha_acto_nombramiento || null,
      fecha_ingreso_entidad:
        (plazaModal as any).fecha_ingreso_entidad || mockMatch?.fecha_ingreso_entidad || null,
      fecha_ingreso_distrito:
        (plazaModal as any).fecha_ingreso_distrito || mockMatch?.fecha_ingreso_distrito || null,
      total_devengado:
        plazaModal.total_devengado ||
        (mockMatch?.total_devengado ? Number(mockMatch.total_devengado) : null) ||
        (plazaModal.asignacion_basica ? Number(plazaModal.asignacion_basica) : null),
      resolucion_manual:
        plazaModal.resolucion_manual || mockMatch?.resolucion_manual || 'RES. 085 de 2020',
      manual_funciones:
        plazaModal.manual_funciones || mockMatch?.manual_funciones || null,
      pv: plazaModal.pv || mockMatch?.pv || null,
      pp_oe: plazaModal.pp_oe || mockMatch?.pp_oe || null,
      vt_lm: plazaModal.vt_lm || mockMatch?.vt_lm || null,
      vt_lnr: plazaModal.vt_lnr || mockMatch?.vt_lnr || null,
    };
  }, [plazaModal]);

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
        mostrarModal(
          'Archivo de Planta Procesado',
          resultado.mensaje || 'Se actualizaron las plazas correctamente.',
          resultado.advertencias && resultado.advertencias.length > 0 ? 'info' : 'success',
          resultado.advertencias || []
        );
        cargarDatos();
      } else {
        mostrarModal('Error de Validación', resultado.mensaje || (resultado as any).error || 'No se pudo procesar el archivo.', 'error');
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
          resultado.advertencias && resultado.advertencias.length > 0 ? 'info' : 'success',
          resultado.advertencias || []
        );
        cargarDatos();
      } else {
        mostrarModal('Error de Validación', resultado.mensaje || (resultado as any).error || 'No se pudo procesar el archivo.', 'error');
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

  const formatearDinero = (val?: number | string | null) => {
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
              {cleanLabel(p.situacion_titular, p.tipo_vinculacion || 'En Propiedad')}
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
                {p.id_escalera ? (
                  <Pressable
                    onPress={() => {
                      setPlazaModal(p);
                      setModalTab('escalera');
                    }}
                    style={{
                      backgroundColor: '#EEF2FF',
                      borderColor: '#C7D2FE',
                      borderWidth: 1,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ color: '#4338CA', fontSize: 9, fontWeight: '800' }}>
                      🪜 {p.id_escalera} #{p.peldano_escalera || 1}
                    </Text>
                  </Pressable>
                ) : null}
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: THEME.slate900, flexShrink: 1 }}>
                  {p.encargo_nombre}
                </Text>
              </View>
              {p.encargo_cedula ? (
                <Text style={{ fontSize: 10, color: THEME.slate500 }}>
                  C.C. {p.encargo_cedula} • {cleanLabel(p.situacion_administrativa, 'Encargo')}
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
              {!enMenu && (
                <>
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
                </>
              )}

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

            {/* Pestaña 2: Escaleras de Encargos */}
            <Pressable
              onPress={() => setTabActiva('escaleras')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'escaleras' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'escaleras' ? THEME.marca700 : THEME.slate500,
                }}
              >
                Escaleras de Encargos
              </Text>
              {todasLasEscaleras.length > 0 && (
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: '#FEF3C7',
                    borderRadius: 9999,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>
                    {todasLasEscaleras.length}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Pestaña: Personal Integral / PERNO (Activos y Desvinculados) */}
            <Pressable
              onPress={() => setTabActiva('perno')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'perno' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Ionicons
                name="people"
                size={16}
                color={tabActiva === 'perno' ? THEME.marca700 : THEME.slate400}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'perno' ? THEME.marca700 : THEME.slate500,
                }}
              >
                Personal Integral (PERNO)
              </Text>
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: tabActiva === 'perno' ? THEME.marca100 : THEME.slate100,
                  borderRadius: 9999,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: tabActiva === 'perno' ? THEME.marca800 : THEME.slate600,
                  }}
                >
                  {estadisticasPerno.total}
                </Text>
              </View>
              {estadisticasPerno.retirados > 0 && (
                <View
                  style={{
                    marginLeft: 6,
                    backgroundColor: '#FEE2E2',
                    borderRadius: 9999,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626' }}>
                    {estadisticasPerno.retirados} desv.
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Pestaña 3: Estructura por Niveles */}
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
                                C.C. {p.encargo_cedula || '---'} • {cleanLabel(p.situacion_administrativa, 'Encargo')}
                              </Text>

                              {/* Titular */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Text style={{ fontSize: 10, fontWeight: '600', color: THEME.slate400 }}>Titular:</Text>
                                <Text numberOfLines={1} style={{ fontSize: 11, color: THEME.slate600, flexShrink: 1 }}>
                                  {p.titular_nombre}
                                </Text>
                                {p.situacion_titular ? (
                                  <Text style={{ fontSize: 9.5, color: THEME.slate400, fontStyle: 'italic' }}>
                                    ({cleanLabel(p.situacion_titular, '')})
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
                                {p.titular_cedula ? `C.C. ${p.titular_cedula} • ` : ''}{cleanLabel(p.situacion_administrativa, 'En propiedad')}
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
          {/* PESTAÑA: ESCALERAS DE ENCARGOS                                 */}
          {/* ============================================================== */}
          {tabActiva === 'escaleras' && (
            <View style={{ width: '100%' }}>
              {/* Tarjeta Informativa de Escaleras */}
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 20,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
                    <View
                      style={{
                        backgroundColor: '#4338CA',
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="git-branch" size={24} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.slate900 }}>
                        Escaleras de Encargos Oficiales (SJD)
                      </Text>
                      <Text style={{ fontSize: 12.5, color: THEME.slate500, marginTop: 2 }}>
                        Monitoreo de provisión sucesiva mediante columnas P (ID-E) y Q (N - Peldaño)
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View
                      style={{
                        backgroundColor: '#EEF2FF',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#C7D2FE',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#4338CA', textTransform: 'uppercase' }}>
                        Escaleras Activas
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#312E81', marginTop: 2 }}>
                        {todasLasEscaleras.length}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: '#FEF3C7',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#F59E0B',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>
                        Plazas Encadenadas
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#78350F', marginTop: 2 }}>
                        {todasLasEscaleras.reduce((acc, e) => acc + e.peldanos.length, 0)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 12,
                    marginTop: 14,
                  }}
                >
                  <Text style={{ fontSize: 12, color: THEME.slate600, lineHeight: 18 }}>
                    <Text style={{ fontWeight: '700', color: THEME.slate800 }}>Normativa Carrera Administrativa:</Text> Cuando un titular se traslada temporalmente a un cargo superior por encargo, libera su plaza propia, permitiendo que otro servidor de carrera ascienda temporalmente a ella (Peldaño 1 = plaza donde se originó el primer encargo, Peldaño 2 = segundo encargo en la cadena, etc.).
                  </Text>
                </View>
              </View>

              {/* Buscador y Filtros de Escaleras */}
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 12,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Ionicons name="search-outline" size={18} color={THEME.slate400} />
                <TextInput
                  placeholder="Buscar escalera por código (ej. E01, E04), cargo, funcionario o cédula..."
                  value={filtroEscalera}
                  onChangeText={setFiltroEscalera}
                  placeholderTextColor={THEME.slate400}
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: THEME.slate900,
                    padding: 0,
                  }}
                />
                {filtroEscalera ? (
                  <Pressable
                    onPress={() => setFiltroEscalera('')}
                    style={{
                      padding: 4,
                      backgroundColor: THEME.slate100,
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons name="close" size={14} color={THEME.slate600} />
                  </Pressable>
                ) : null}
              </View>

              {/* Listado de Escaleras */}
              {todasLasEscaleras.length === 0 ? (
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
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 27,
                      backgroundColor: THEME.slate100,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="git-branch-outline" size={28} color={THEME.slate400} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: THEME.slate700 }}>
                    {filtroEscalera ? 'No se encontraron escaleras coincidentes' : 'No se han registrado escaleras de encargo'}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: THEME.slate500, textAlign: 'center', marginTop: 6, maxWidth: 480, lineHeight: 18 }}>
                    {filtroEscalera
                      ? 'Prueba modificando el criterio de búsqueda o limpiando el filtro.'
                      : 'Para visualizar las cadenas de encargo, carga el archivo de Planta Oficial con los identificadores correspondientes en la Columna Q (ID-E) y número de peldaño en la Columna R (N).'}
                  </Text>
                  {filtroEscalera ? (
                    <Pressable
                      onPress={() => setFiltroEscalera('')}
                      style={{
                        marginTop: 14,
                        backgroundColor: THEME.marca600,
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.white }}>
                        Limpiar Búsqueda
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {todasLasEscaleras.map((esc) => (
                    <View
                      key={esc.id_escalera}
                      style={{
                        backgroundColor: THEME.white,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        padding: 18,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 3,
                      }}
                    >
                      {/* Cabecera de la Escalera */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 14,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.slate100,
                          paddingBottom: 10,
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={{
                              backgroundColor: '#EEF2FF',
                              borderColor: '#C7D2FE',
                              borderWidth: 1,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#4338CA' }}>
                              🪜 ESCALERA ID-E: {esc.id_escalera}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, color: THEME.slate500 }}>
                            {esc.peldanos.length} peldaño{esc.peldanos.length !== 1 ? 's' : ''} en la cadena sucesoria
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate400 }}>
                            Plazas: {esc.peldanos.map((p) => `#${p.id_plaza}`).join(' → ')}
                          </Text>
                        </View>
                      </View>

                      {/* Timeline secuencial de peldaños */}
                      <View style={{ gap: 0, paddingLeft: 6 }}>
                        {esc.peldanos.map((pel, idx) => {
                          const esUltimo = idx === esc.peldanos.length - 1;
                          const peldanoAnterior = idx > 0 ? esc.peldanos[idx - 1] : null;

                          return (
                            <View key={pel.id_plaza}>
                              {/* Conector explicativo de releve entre peldaños */}
                              {idx > 0 && peldanoAnterior && (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginVertical: 4,
                                    marginLeft: 38,
                                    paddingVertical: 3,
                                    paddingHorizontal: 8,
                                    backgroundColor: '#F1F5F9',
                                    borderRadius: 6,
                                    borderLeftWidth: 3,
                                    borderLeftColor: '#6366F1',
                                  }}
                                >
                                  <Ionicons name="arrow-down" size={12} color="#4F46E5" />
                                  <Text style={{ fontSize: 10.5, color: THEME.slate600, flex: 1 }}>
                                    <Text style={{ fontWeight: '700', color: THEME.slate800 }}>
                                      {pel.titular_nombre || 'Titular'}
                                    </Text>{' '}
                                    (titular en propiedad) ascendió a encargo en el Peldaño #{idx}, liberando esta plaza para{' '}
                                    <Text style={{ fontWeight: '700', color: '#92400E' }}>
                                      {pel.encargo_nombre || 'Vacante Temporal'}
                                    </Text>
                                  </Text>
                                </View>
                              )}

                              <View style={{ flexDirection: 'row', gap: 12 }}>
                                {/* Línea conectora y círculo */}
                                <View style={{ alignItems: 'center', width: 32 }}>
                                  <View
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 14,
                                      backgroundColor: idx === 0 ? '#10B981' : '#4338CA',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      zIndex: 2,
                                    }}
                                  >
                                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                                      {pel.peldano_escalera || idx + 1}
                                    </Text>
                                  </View>
                                  {!esUltimo && (
                                    <View
                                      style={{
                                        width: 2,
                                        flex: 1,
                                        minHeight: 20,
                                        backgroundColor: '#CBD5E1',
                                        marginVertical: 4,
                                      }}
                                    />
                                  )}
                                </View>

                                {/* Tarjeta de información del peldaño */}
                                <View
                                  style={{
                                    flex: 1,
                                    backgroundColor: idx === 0 ? '#F0FDF4' : '#F8FAFC',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: idx === 0 ? '#BBF7D0' : THEME.slate200,
                                    padding: 12,
                                    marginBottom: 10,
                                  }}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <View
                                        style={{
                                          backgroundColor: idx === 0 ? '#D1FAE5' : '#EEF2FF',
                                          paddingHorizontal: 6,
                                          paddingVertical: 1,
                                          borderRadius: 4,
                                        }}
                                      >
                                        <Text style={{ color: idx === 0 ? '#047857' : '#4338CA', fontSize: 9.5, fontWeight: '800' }}>
                                          {idx === 0 ? 'PELDAÑO #1 (RAÍZ VACANTE)' : `PELDAÑO #${pel.peldano_escalera || idx + 1}`}
                                        </Text>
                                      </View>
                                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate500 }}>
                                        Plaza #{pel.id_plaza} {pel.id_sideap ? `• SIEAP #${pel.id_sideap}` : ''}
                                      </Text>
                                    </View>

                                    <Pressable
                                      onPress={() => {
                                        setPlazaModal(pel);
                                        setModalTab('escalera');
                                      }}
                                      style={{
                                        backgroundColor: THEME.white,
                                        borderColor: THEME.slate300,
                                        borderWidth: 1,
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 5,
                                      }}
                                    >
                                      <Text style={{ fontSize: 10.5, fontWeight: '600', color: THEME.slate700 }}>
                                        Ver Ficha / Escalera →
                                      </Text>
                                    </Pressable>
                                  </View>

                                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>
                                    {pel.cargo} (Cód. {pel.codigo || '---'} Gr. {pel.grado || '---'})
                                  </Text>
                                  <Text style={{ fontSize: 11, color: THEME.slate500, marginTop: 1, marginBottom: 6 }}>
                                    {pel.dependencia_cargo}
                                  </Text>

                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: THEME.white, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: THEME.slate100 }}>
                                    {/* Titular en Propiedad */}
                                    <View style={{ flex: 1, minWidth: 150 }}>
                                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                                        Titular de la Plaza:
                                      </Text>
                                      <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '700', color: THEME.slate800, marginTop: 1 }}>
                                        {pel.titular_nombre || 'Vacante Definitiva'}
                                      </Text>
                                      <Text style={{ fontSize: 10, color: THEME.slate500 }}>
                                        {pel.titular_cedula ? `C.C. ${pel.titular_cedula} • ` : ''}{cleanLabel(pel.situacion_titular, 'En Propiedad')}
                                      </Text>
                                    </View>

                                    {/* Servidor que ocupa en encargo */}
                                    <View style={{ flex: 1, minWidth: 150 }}>
                                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>
                                        {idx === 0 ? 'Servidor Ascendido en Encargo:' : 'Relevo Actual en la Plaza:'}
                                      </Text>
                                      <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '700', color: '#92400E', marginTop: 1 }}>
                                        {pel.encargo_nombre || 'Sin servidor asignado'}
                                      </Text>
                                      <Text style={{ fontSize: 10, color: '#B45309' }}>
                                        {pel.encargo_cedula ? `C.C. ${pel.encargo_cedula} • ` : ''}{cleanLabel(pel.situacion_administrativa, 'Encargo')}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
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

                    <ScrollView
                      horizontal={true}
                      showsHorizontalScrollIndicator={true}
                      contentContainerStyle={{ flexGrow: 1, minWidth: '100%' }}
                    >
                      <View style={{ width: '100%', minWidth: 960 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            backgroundColor: THEME.slate100,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: THEME.slate200,
                            width: '100%',
                          }}
                        >
                          <Text style={{ flex: 0.8, minWidth: 70, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Col. Excel</Text>
                          <Text style={{ flex: 1.8, minWidth: 150, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Encabezado Oficial</Text>
                          <Text style={{ flex: 1.0, minWidth: 95, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Estado</Text>
                          <Text style={{ flex: 1.0, minWidth: 95, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Tipo de Dato</Text>
                          <Text style={{ flex: 3.6, minWidth: 260, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Descripción / Uso en el Sistema</Text>
                          <Text style={{ flex: 1.6, minWidth: 120, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Ejemplo Real</Text>
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
                          { col: 'L (12)', header: 'SITUACIÓN ADMINISTRATIVA', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Situación administrativa activa: ENCARGO, EN PROPIEDAD, VACANCIA.', ej: 'EN PROPIEDAD' },
                          { col: 'M (13)', header: 'SITUACIÓN ADMINISTRATIVA TITULAR', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Situación del titular con derechos sobre la plaza.', ej: 'EN PROPIEDAD' },
                          { col: 'N (14)', header: 'CEDULA (TITULAR)', req: 'Requerido*', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto/Número', desc: 'Cédula del titular si la plaza está ocupada o en encargo.', ej: '36697863' },
                          { col: 'O (15)', header: 'TITULAR CARGO', req: 'Requerido*', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Nombre del servidor titular con derechos de carrera.', ej: 'ANA MARTA MIRANDA CORRALES' },
                          { col: 'Q (17)', header: 'ID-E', req: 'Recomendado', reqColor: '#4338CA', reqBg: '#EEF2FF', tipo: 'Texto', desc: 'Escalera encargo: Código identificador de la cadena sucesoria de relevo (ej. E01 a E28).', ej: 'E04' },
                          { col: 'R (18)', header: 'N', req: 'Recomendado', reqColor: '#4338CA', reqBg: '#EEF2FF', tipo: 'Entero', desc: 'numero de escalon de escalra encargo: Posición del escalón en la cadena sucesoria (1 = vacante raíz, 2 = relevo inmediato, etc.).', ej: '1' },
                          { col: 'S (19)', header: 'PV', req: 'Opcional', reqColor: THEME.amberText, reqBg: THEME.amberBg, tipo: 'Texto', desc: 'provisionalidad: Provisión transitoria del empleo bajo nombramiento en provisionalidad.', ej: 'PV' },
                          { col: 'T (20)', header: 'PP OE', req: 'Opcional', reqColor: THEME.amberText, reqBg: THEME.amberBg, tipo: 'Texto', desc: 'periodo de prueba otra entidad: Servidor de carrera en periodo de prueba en otra entidad pública.', ej: 'PP OE' },
                          { col: 'U (21)', header: 'VT LM', req: 'Opcional', reqColor: THEME.amberText, reqBg: THEME.amberBg, tipo: 'Texto', desc: 'licencia maternidad: Vacancia temporal originada por licencia de maternidad.', ej: 'VT LM' },
                          { col: 'V (22)', header: 'VT LNR', req: 'Opcional', reqColor: THEME.amberText, reqBg: THEME.amberBg, tipo: 'Texto', desc: 'Licencia no remunerada: Vacancia temporal originada por licencia no remunerada.', ej: 'VT LNR' },
                          { col: 'W (23)', header: 'OPEC', req: 'Opcional', reqColor: THEME.slate500, reqBg: THEME.slate100, tipo: 'Texto/Número', desc: 'Código OPEC de la convocatoria de la Comisión Nacional del Servicio Civil (CNSC).', ej: '201940' },
                          { col: 'Y (25)', header: 'ESTADO DEL CARGO', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Estado oficial: OCUPADO, VACANTE DEFINITIVA o VACANTE TEMPORAL.', ej: 'OCUPADO' },
                          { col: 'Z (26)', header: 'NIVEL', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Nivel jerárquico: DIRECTIVO, ASESOR, PROFESIONAL, TECNICO, ASISTENCIAL.', ej: 'ASESOR' },
                          { col: 'AA (27)', header: 'NOMENCLATURA_ADMIN', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Denominación oficial del empleo en la planta de personal.', ej: 'JEFE DE OFICINA ASESORA' },
                          { col: 'AB (28)', header: 'CÓDIGO', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Código del cargo según nomenclatura distrital.', ej: '115' },
                          { col: 'AC (29)', header: 'GRADO', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Grado salarial del empleo.', ej: '6' },
                          { col: 'AE (31)', header: 'DEPENDENCIA DEL CARGO', req: 'Obligatorio', reqColor: THEME.roseText, reqBg: THEME.roseBg, tipo: 'Texto', desc: 'Dependencia orgánica a la que pertenece la plaza.', ej: 'OFICINA ASESORA DE PLANEACIÓN' },
                          { col: 'AF (32)', header: 'DEPENDENCIA FUNCIONAL', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Dependencia funcional o resoluciones de asignación funcional del cargo.', ej: 'SUBSECRETARÍA JURÍDICA DISTRITAL' },
                          { col: 'AG (33)', header: 'PROPOSITO', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Propósito principal según manual de funciones.', ej: 'Asesorar en el diseño de planes y estrategias...' },
                          { col: 'AH (34)', header: 'FUNCIONES', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto Largo', desc: 'Funciones esenciales del empleo (consolidadas con las resoluciones de Col. AF).', ej: '1. Formular proyectos... 2. Dirigir plan...' },
                          { col: 'AI (35)', header: 'REQUISITOS', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto Largo', desc: 'Estudios académicos y experiencia laboral requerida.', ej: 'Título profesional en Administración. Posgrado.' },
                          { col: 'AJ (36)', header: 'MANUAL DE FUNCIONES', req: 'Recomendado', reqColor: THEME.skyText, reqBg: THEME.skyBg, tipo: 'Texto', desc: 'Resolución oficial y folios del Manual Específico de Funciones y Competencias Laborales.', ej: 'RES. 085 de 2020' },
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
                              width: '100%',
                            }}
                          >
                            <Text style={{ flex: 0.8, minWidth: 70, fontSize: 12, fontWeight: '700', color: THEME.slate900 }}>{row.col}</Text>
                            <Text style={{ flex: 1.8, minWidth: 150, fontSize: 12, fontWeight: '600', color: THEME.marca800 }}>{row.header}</Text>
                            <View style={{ flex: 1.0, minWidth: 95 }}>
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
                            <Text style={{ flex: 1.0, minWidth: 95, fontSize: 11.5, color: THEME.slate600 }}>{row.tipo}</Text>
                            <Text style={{ flex: 3.6, minWidth: 260, fontSize: 11.5, color: THEME.slate700, paddingRight: 8 }}>{row.desc}</Text>
                            <Text style={{ flex: 1.6, minWidth: 120, fontSize: 11, color: THEME.slate500, fontStyle: 'italic' }}>{row.ej}</Text>
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

                    <ScrollView
                      horizontal={true}
                      showsHorizontalScrollIndicator={true}
                      contentContainerStyle={{ flexGrow: 1, minWidth: '100%' }}
                    >
                      <View style={{ width: '100%', minWidth: 960 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            backgroundColor: THEME.slate100,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: THEME.slate200,
                            width: '100%',
                          }}
                        >
                          <Text style={{ flex: 0.8, minWidth: 70, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Col. Excel</Text>
                          <Text style={{ flex: 1.8, minWidth: 150, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Encabezado Oficial</Text>
                          <Text style={{ flex: 1.0, minWidth: 95, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Estado</Text>
                          <Text style={{ flex: 1.0, minWidth: 95, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Tipo de Dato</Text>
                          <Text style={{ flex: 3.6, minWidth: 260, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Descripción / Cruce en Planta</Text>
                          <Text style={{ flex: 1.6, minWidth: 120, fontSize: 11.5, fontWeight: '700', color: THEME.slate700 }}>Ejemplo Real</Text>
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
                              width: '100%',
                            }}
                          >
                            <Text style={{ flex: 0.8, minWidth: 70, fontSize: 12, fontWeight: '700', color: THEME.slate900 }}>{row.col}</Text>
                            <Text style={{ flex: 1.8, minWidth: 150, fontSize: 12, fontWeight: '600', color: THEME.emeraldText }}>{row.header}</Text>
                            <View style={{ flex: 1.0, minWidth: 95 }}>
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
                            <Text style={{ flex: 1.0, minWidth: 95, fontSize: 11.5, color: THEME.slate600 }}>{row.tipo}</Text>
                            <Text style={{ flex: 3.6, minWidth: 260, fontSize: 11.5, color: THEME.slate700, paddingRight: 8 }}>{row.desc}</Text>
                            <Text style={{ flex: 1.6, minWidth: 120, fontSize: 11, color: THEME.slate500, fontStyle: 'italic' }}>{row.ej}</Text>
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

          {/* ============================================================== */}
          {/* PESTAÑA 4: PERSONAL INTEGRAL / PERNO (Activos y Desvinculados) */}
          {/* ============================================================== */}
          {tabActiva === 'perno' && (
            <View style={{ gap: 20 }}>
              {/* Tarjetas KPI de PERNO */}
              <View
                style={{
                  flexDirection: isDesktop ? 'row' : 'column',
                  gap: 12,
                }}
              >
                {/* KPI 1: Total */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: THEME.white,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                      Total Servidores PERNO
                    </Text>
                    <Ionicons name="people" size={20} color={THEME.marca600} />
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: THEME.marca900, marginTop: 8 }}>
                    {estadisticasPerno.total}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.slate500, marginTop: 4 }}>
                    Histórico consolidado nómina
                  </Text>
                </View>

                {/* KPI 2: Activos */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: THEME.white,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(5, 150, 105, 0.3)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#047857', textTransform: 'uppercase' }}>
                      Activos en Servicio
                    </Text>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' }} />
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: '#065F46', marginTop: 8 }}>
                    {estadisticasPerno.activos}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.slate500, marginTop: 4 }}>
                    {((estadisticasPerno.activos / (estadisticasPerno.total || 1)) * 100).toFixed(1)}% de la base total
                  </Text>
                </View>

                {/* KPI 3: Desvinculados / Retirados */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: THEME.white,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(225, 29, 72, 0.3)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#BE123C', textTransform: 'uppercase' }}>
                      Desvinculados / Retirados
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color="#E11D48" />
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: '#9F1239', marginTop: 8 }}>
                    {estadisticasPerno.retirados}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#BE123C', marginTop: 4 }}>
                    Con fecha de desvinculación oficial
                  </Text>
                </View>

                {/* KPI 4: Con Plaza en Planta */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: THEME.white,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                      Con Plaza Oficial
                    </Text>
                    <Ionicons name="briefcase-outline" size={18} color={THEME.marca600} />
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: THEME.marca800, marginTop: 8 }}>
                    {estadisticasPerno.conPlaza}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.slate500, marginTop: 4 }}>
                    Titulares o encargados en planta
                  </Text>
                </View>
              </View>

              {/* Panel de Búsqueda y Filtros */}
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  gap: 14,
                }}
              >
                {/* Input de Búsqueda */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: THEME.slate50,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: Platform.OS === 'web' ? 8 : 4,
                  }}
                >
                  <Ionicons name="search" size={18} color={THEME.slate400} style={{ marginRight: 8 }} />
                  <TextInput
                    value={busquedaPerno}
                    onChangeText={(t) => {
                      setBusquedaPerno(t);
                      setPaginaPerno(1);
                    }}
                    placeholder="Buscar por cédula, nombres, apellidos, cargo, fondo de salud/pensión o dependencia..."
                    placeholderTextColor={THEME.slate400}
                    style={{
                      flex: 1,
                      fontSize: 13.5,
                      color: THEME.slate800,
                      outlineWidth: 0,
                    }}
                  />
                  {busquedaPerno !== '' && (
                    <Pressable
                      onPress={() => {
                        setBusquedaPerno('');
                        setPaginaPerno(1);
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={18} color={THEME.slate400} />
                    </Pressable>
                  )}
                </View>

                {/* Filtros de Pestaña: Estado y Cruce de Planta */}
                <View
                  style={{
                    flexDirection: isDesktop ? 'row' : 'column',
                    justifyContent: 'space-between',
                    alignItems: isDesktop ? 'center' : 'stretch',
                    gap: 12,
                  }}
                >
                  {/* Selector Estado */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate600, marginRight: 4 }}>
                      Estado:
                    </Text>
                    {[
                      { id: 'TODOS', label: `Todos (${estadisticasPerno.total})` },
                      { id: 'ACTIVOS', label: `Activos (${estadisticasPerno.activos})` },
                      { id: 'RETIRADOS', label: `Desvinculados / Retirados (${estadisticasPerno.retirados})` },
                    ].map((opt) => {
                      const sel = filtroEstadoPerno === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => {
                            setFiltroEstadoPerno(opt.id as any);
                            setPaginaPerno(1);
                          }}
                          style={{
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            backgroundColor: sel ? THEME.marca700 : THEME.slate100,
                            borderWidth: 1,
                            borderColor: sel ? THEME.marca800 : THEME.slate200,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: sel ? '600' : '500',
                              color: sel ? THEME.white : THEME.slate700,
                            }}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Selector Plaza */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate600, marginRight: 4 }}>
                      Planta:
                    </Text>
                    {[
                      { id: 'TODOS', label: 'Todas las personas' },
                      { id: 'CON_PLAZA', label: `Con Plaza (${estadisticasPerno.conPlaza})` },
                      { id: 'SIN_PLAZA', label: `Sin Plaza (${estadisticasPerno.total - estadisticasPerno.conPlaza})` },
                    ].map((opt) => {
                      const sel = filtroPlazaPerno === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => {
                            setFiltroPlazaPerno(opt.id as any);
                            setPaginaPerno(1);
                          }}
                          style={{
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            backgroundColor: sel ? THEME.marca700 : THEME.slate100,
                            borderWidth: 1,
                            borderColor: sel ? THEME.marca800 : THEME.slate200,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: sel ? '600' : '500',
                              color: sel ? THEME.white : THEME.slate700,
                            }}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Mensaje de conteo de resultados */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: THEME.slate600, fontWeight: '500' }}>
                  Mostrando{' '}
                  <Text style={{ fontWeight: '700', color: THEME.slate800 }}>
                    {pernoPaginado.length}
                  </Text>{' '}
                  de{' '}
                  <Text style={{ fontWeight: '700', color: THEME.slate800 }}>
                    {pernoFiltrado.length}
                  </Text>{' '}
                  servidores encontrados (Página {paginaPerno} de {totalPaginasPerno})
                </Text>
              </View>

              {/* TABLA PRINCIPAL DE PERNO */}
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                }}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={{ minWidth: 1100 }}>
                    {/* Encabezado de la Tabla */}
                    <View
                      style={{
                        flexDirection: 'row',
                        backgroundColor: THEME.marca900,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ width: 130, color: THEME.white, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
                        Identificación
                      </Text>
                      <Text style={{ width: 230, color: THEME.white, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
                        Servidor(a) / Nombre
                      </Text>
                      <Text style={{ width: 170, color: THEME.white, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
                        Estado & Retiro
                      </Text>
                      <Text style={{ width: 210, color: THEME.white, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
                        Cargo & Grado (PERNO)
                      </Text>
                      <Text style={{ width: 210, color: THEME.white, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
                        Dependencia
                      </Text>
                      <Text style={{ width: 150, color: THEME.white, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
                        Cruce Planta
                      </Text>
                      <Text style={{ width: 120, color: THEME.white, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>
                        Devengado ($)
                      </Text>
                      <Text style={{ width: 130, color: THEME.white, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>
                        Expediente
                      </Text>
                    </View>

                    {/* Filas de la Tabla */}
                    {pernoPaginado.length === 0 ? (
                      <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="search-outline" size={40} color={THEME.slate300} />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: THEME.slate600, marginTop: 10 }}>
                          No se encontraron funcionarios con los filtros seleccionados
                        </Text>
                        <Text style={{ fontSize: 12.5, color: THEME.slate400, marginTop: 4 }}>
                          Prueba ajustando los términos de búsqueda o el filtro de estado
                        </Text>
                      </View>
                    ) : (
                      pernoPaginado.map((item, idx) => {
                        const esRetirado = item.estado_funcionario === 'R' || !!item.fecha_retiro;
                        const matchPlaza =
                          item.plaza_id_plaza ||
                          todasLasPlazas.find(
                            (p) =>
                              String(p.titular_cedula) === String(item.cedula) ||
                              String(p.encargo_cedula) === String(item.cedula)
                          )?.id_plaza;

                        return (
                          <View
                            key={`${item.cedula}-${idx}`}
                            style={{
                              flexDirection: 'row',
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                              alignItems: 'center',
                              backgroundColor: idx % 2 === 0 ? THEME.white : THEME.slate50,
                              borderBottomWidth: 1,
                              borderBottomColor: THEME.slate100,
                            }}
                          >
                            {/* Cédula */}
                            <View style={{ width: 130 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca800 }}>
                                {item.cedula}
                              </Text>
                              {item.posicion_planta ? (
                                <Text style={{ fontSize: 10.5, color: THEME.slate400, marginTop: 1 }}>
                                  Pos. #{item.posicion_planta}
                                </Text>
                              ) : null}
                            </View>

                            {/* Nombre completo */}
                            <View style={{ width: 230, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800 }}>
                                {item.nombre_completo || `${item.nombres} ${item.primer_apellido}`}
                              </Text>
                              <Text style={{ fontSize: 11, color: THEME.slate500, marginTop: 1 }}>
                                {item.tipo_funcionario || 'EMPLEADO DE PLANTA'}
                              </Text>
                            </View>

                            {/* Estado y Fecha Retiro */}
                            <View style={{ width: 170, paddingRight: 10 }}>
                              {esRetirado ? (
                                <View>
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      alignSelf: 'flex-start',
                                      backgroundColor: '#FEE2E2',
                                      borderColor: '#FCA5A5',
                                      borderWidth: 1,
                                      borderRadius: 6,
                                      paddingHorizontal: 7,
                                      paddingVertical: 2,
                                    }}
                                  >
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#DC2626', marginRight: 5 }} />
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#991B1B' }}>
                                      DESVINCULADO
                                    </Text>
                                  </View>
                                  {item.fecha_retiro ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                                      <Ionicons name="calendar-outline" size={11} color="#B91C1C" style={{ marginRight: 3 }} />
                                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#B91C1C' }}>
                                        {formatFecha(item.fecha_retiro)}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                              ) : (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    alignSelf: 'flex-start',
                                    backgroundColor: THEME.emeraldBg,
                                    borderColor: THEME.emeraldRing,
                                    borderWidth: 1,
                                    borderRadius: 6,
                                    paddingHorizontal: 7,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 5 }} />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.emeraldText }}>
                                    ACTIVO
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Cargo y Grado PERNO */}
                            <View style={{ width: 210, paddingRight: 10 }}>
                              <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800 }} numberOfLines={2}>
                                {item.cargo || 'Sin cargo'}
                              </Text>
                              <Text style={{ fontSize: 11, color: THEME.slate500, marginTop: 1 }}>
                                Código: {item.cargo_cod || 'N/A'} • Grado: {item.grado || 'N/A'}
                              </Text>
                            </View>

                            {/* Dependencia */}
                            <View style={{ width: 210, paddingRight: 10 }}>
                              <Text style={{ fontSize: 11.5, color: THEME.slate700 }} numberOfLines={2}>
                                {item.dependencia || 'Sin dependencia'}
                              </Text>
                            </View>

                            {/* Cruce Planta */}
                            <View style={{ width: 150, paddingRight: 10 }}>
                              {matchPlaza ? (
                                <View
                                  style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: '#EFF6FF',
                                    borderColor: '#BFDBFE',
                                    borderWidth: 1,
                                    borderRadius: 6,
                                    paddingHorizontal: 7,
                                    paddingVertical: 3,
                                  }}
                                >
                                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#1D4ED8' }}>
                                    Plaza #{matchPlaza}
                                  </Text>
                                  {item.plaza_es_encargo ? (
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#D97706' }}>
                                      (En Encargo)
                                    </Text>
                                  ) : null}
                                </View>
                              ) : (
                                <View
                                  style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: THEME.slate100,
                                    borderRadius: 6,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                                    Sin plaza activa
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Total Devengado */}
                            <View style={{ width: 120, paddingRight: 12, alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.marca800 }}>
                                {formatMoneda(item.total_devengado || item.asignacion_basica)}
                              </Text>
                              {item.asignacion_basica ? (
                                <Text style={{ fontSize: 10.5, color: THEME.slate400, marginTop: 1 }}>
                                  Básico: {formatMoneda(item.asignacion_basica)}
                                </Text>
                              ) : null}
                            </View>

                            {/* Botón Ver Expediente */}
                            <View style={{ width: 130, alignItems: 'center' }}>
                              <Pressable
                                onPress={() => {
                                  setPernoModal(item);
                                  setModalPernoTab('personal');
                                }}
                                style={({ pressed }) => ({
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  backgroundColor: pressed ? THEME.marca800 : THEME.marca700,
                                  paddingVertical: 6,
                                  paddingHorizontal: 10,
                                  borderRadius: 6,
                                  gap: 5,
                                })}
                              >
                                <Ionicons name="folder-open-outline" size={13} color={THEME.white} />
                                <Text style={{ color: THEME.white, fontSize: 11.5, fontWeight: '600' }}>
                                  Expediente
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </ScrollView>

                {/* Barra de Paginación */}
                {totalPaginasPerno > 1 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderTopWidth: 1,
                      borderTopColor: THEME.slate200,
                      backgroundColor: THEME.slate50,
                    }}
                  >
                    <Pressable
                      disabled={paginaPerno === 1}
                      onPress={() => setPaginaPerno((prev) => Math.max(1, prev - 1))}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        backgroundColor: paginaPerno === 1 ? THEME.slate100 : THEME.white,
                        borderWidth: 1,
                        borderColor: THEME.slate300,
                        opacity: paginaPerno === 1 ? 0.5 : 1,
                      }}
                    >
                      <Ionicons name="chevron-back" size={14} color={THEME.slate700} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700 }}>
                        Anterior
                      </Text>
                    </Pressable>

                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate700 }}>
                      Página {paginaPerno} de {totalPaginasPerno}
                    </Text>

                    <Pressable
                      disabled={paginaPerno >= totalPaginasPerno}
                      onPress={() => setPaginaPerno((prev) => Math.min(totalPaginasPerno, prev + 1))}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        backgroundColor: paginaPerno >= totalPaginasPerno ? THEME.slate100 : THEME.white,
                        borderWidth: 1,
                        borderColor: THEME.slate300,
                        opacity: paginaPerno >= totalPaginasPerno ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700, marginRight: 4 }}>
                        Siguiente
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={THEME.slate700} />
                    </Pressable>
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
                maxWidth: 1040,
                maxHeight: '92%',
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

              {/* Barra de Tabs del Modal con Scroll Horizontal */}
              <View
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: THEME.slate200,
                  backgroundColor: THEME.slate50,
                }}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    gap: 6,
                  }}
                >
                  {/* Tab 1: General & Servidor */}
                  <Pressable
                    onPress={() => setModalTab('general')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: modalTab === 'general' ? THEME.marca600 : 'transparent',
                    }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={modalTab === 'general' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: modalTab === 'general' ? '700' : '500',
                        color: modalTab === 'general' ? THEME.marca700 : THEME.slate600,
                      }}
                    >
                      General & Planta
                    </Text>
                  </Pressable>

                  {/* Tab 2: Manual de Funciones */}
                  <Pressable
                    onPress={() => setModalTab('funciones')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: modalTab === 'funciones' ? THEME.marca600 : 'transparent',
                    }}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color={modalTab === 'funciones' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: modalTab === 'funciones' ? '700' : '500',
                        color: modalTab === 'funciones' ? THEME.marca700 : THEME.slate600,
                      }}
                    >
                      Manual de Funciones
                    </Text>
                    {plazaModalEnriquecida?.funciones?.length ? (
                      <View
                        style={{
                          backgroundColor: modalTab === 'funciones' ? THEME.marca100 : THEME.slate200,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: modalTab === 'funciones' ? THEME.marca700 : THEME.slate600,
                          }}
                        >
                          {plazaModalEnriquecida.funciones.length}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>

                  {/* Tab 3: Requisitos & Perfil */}
                  <Pressable
                    onPress={() => setModalTab('requisitos')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: modalTab === 'requisitos' ? THEME.marca600 : 'transparent',
                    }}
                  >
                    <Ionicons
                      name="school-outline"
                      size={16}
                      color={modalTab === 'requisitos' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: modalTab === 'requisitos' ? '700' : '500',
                        color: modalTab === 'requisitos' ? THEME.marca700 : THEME.slate600,
                      }}
                    >
                      Requisitos & Perfil
                    </Text>
                  </Pressable>

                  {/* Tab 4: Seguridad Social & Nómina */}
                  <Pressable
                    onPress={() => setModalTab('perno')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: modalTab === 'perno' ? THEME.marca600 : 'transparent',
                    }}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={16}
                      color={modalTab === 'perno' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: modalTab === 'perno' ? '700' : '500',
                        color: modalTab === 'perno' ? THEME.marca700 : THEME.slate600,
                      }}
                    >
                      Seg. Social & PERNO
                    </Text>
                  </Pressable>

                  {/* Tab 5: Escalera de Encargos */}
                  <Pressable
                    onPress={() => setModalTab('escalera')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: modalTab === 'escalera' ? THEME.marca600 : 'transparent',
                    }}
                  >
                    <Ionicons
                      name="git-network-outline"
                      size={16}
                      color={modalTab === 'escalera' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: modalTab === 'escalera' ? '700' : '500',
                        color: modalTab === 'escalera' ? THEME.marca700 : THEME.slate600,
                      }}
                    >
                      Escalera
                    </Text>
                    {plazaModal?.id_escalera ? (
                      <View
                        style={{
                          backgroundColor: modalTab === 'escalera' ? '#EEF2FF' : THEME.slate200,
                          borderColor: modalTab === 'escalera' ? '#C7D2FE' : 'transparent',
                          borderWidth: 1,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: modalTab === 'escalera' ? '#4338CA' : THEME.slate700,
                          }}
                        >
                          {plazaModal.id_escalera} · #{plazaModal.peldano_escalera || 1}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                </ScrollView>
              </View>

              {/* ========================================================= */}
              {/* TAB 1: INFORMACIÓN GENERAL Y PLANTA DE PERSONAL           */}
              {/* ========================================================= */}
              {modalTab === 'general' && (
                <ScrollView style={{ padding: 20 }}>
                  {/* Banner de acceso directo a la escalera si la plaza pertenece a una */}
                  {plazaModal?.id_escalera ? (
                    <Pressable
                      onPress={() => setModalTab('escalera')}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? '#EEF2FF' : '#F5F3FF',
                        borderColor: '#C7D2FE',
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 18,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: '#4338CA',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="git-network-outline" size={18} color={THEME.white} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#312E81' }}>
                              Esta plaza forma parte de la Escalera {plazaModal.id_escalera}
                            </Text>
                            <View
                              style={{
                                backgroundColor: '#E0E7FF',
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#4338CA' }}>
                                Peldaño #{plazaModal.peldano_escalera || 1}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 11.5, color: THEME.slate600, marginTop: 2 }}>
                            Cadena de sucesión de {peldanosEscaleraModal.length} peldaño(s) · Toca para ver la escalera completa
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4338CA" />
                    </Pressable>
                  ) : null}

                  {/* SECCIÓN 1: ESPECIFICACIONES DE PLANTA */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      1. Especificaciones de Planta
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <View style={{ backgroundColor: THEME.slate100, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.slate600 }}>
                          PLAZA #{plazaModal?.id_plaza}
                        </Text>
                      </View>
                      {plazaModal?.id_sideap ? (
                        <View style={{ backgroundColor: THEME.marca50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.marca700 }}>
                            SIDEAP #{plazaModal.id_sideap}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

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
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Dependencia Orgánica Oficial</Text>
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

                  {/* SECCIÓN 2: SERVIDORES PÚBLICOS ASIGNADOS */}
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
                              {cleanLabel(plazaModal.situacion_administrativa, 'ENCARGO')}
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
                              {cleanLabel(plazaModal.situacion_titular, 'En comisión o encargo en otro empleo')}
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
                          {cleanLabel(plazaModal?.situacion_administrativa, 'Servicio Activo en Propiedad')}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 140 }}>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>Acto de Nombramiento</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                          {plazaModalEnriquecida?.acto_nombramiento || plazaModalEnriquecida?.numero_acto_nombramiento || '---'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* SECCIÓN 3: FECHAS Y REGISTRO INSTITUCIONAL */}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                    3. Registro y Fechas de Vinculación
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
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Fecha Acto Nombramiento</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                        {plazaModalEnriquecida?.fecha_acto_nombramiento || 'No reportada'}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Ingreso a la Entidad (SJD)</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                        {plazaModalEnriquecida?.fecha_ingreso_entidad || 'No reportada'}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Ingreso al Distrito Capital</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                        {plazaModalEnriquecida?.fecha_ingreso_distrito || 'No reportada'}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              )}

              {/* ========================================================= */}
              {/* TAB 2: MANUAL ESPECÍFICO DE FUNCIONES Y PROPÓSITO         */}
              {/* ========================================================= */}
              {modalTab === 'funciones' && (
                <ScrollView style={{ padding: 20 }}>
                  {/* Banner de identificación del cargo */}
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 14,
                      marginBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase' }}>
                          Manual Específico de Funciones y Competencias Laborales
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900, marginTop: 2 }}>
                          {plazaModal?.cargo} · Cód. {plazaModal?.codigo} Gr. {plazaModal?.grado}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {plazaModalEnriquecida?.resolucion_manual ? (
                          <View
                            style={{
                              backgroundColor: '#FEF3C7',
                              borderColor: '#FDE68A',
                              borderWidth: 1,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Ionicons name="document-text" size={13} color="#92400E" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>
                              {plazaModalEnriquecida.resolucion_manual}
                            </Text>
                          </View>
                        ) : null}
                        <View style={{ backgroundColor: THEME.marca50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca700 }}>
                            {plazaModalEnriquecida?.funciones?.length || 0} Funciones (Cols. AH y AF)
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Especificación de resolución y asignación funcional de la Columna AF */}
                    {plazaModalEnriquecida?.dependencia_funcional ? (
                      <View
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTopWidth: 1,
                          borderTopColor: THEME.slate200,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Ionicons name="git-branch-outline" size={14} color={THEME.marca700} />
                        <Text style={{ fontSize: 11.5, color: THEME.slate700 }}>
                          <Text style={{ fontWeight: '700', color: THEME.marca800 }}>Columna AF (Resolución / Asignación Funcional):</Text>{' '}
                          {plazaModalEnriquecida.dependencia_funcional}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Propósito Principal del Empleo */}
                  <View
                    style={{
                      backgroundColor: '#EFF6FF',
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: '#BFDBFE',
                      padding: 16,
                      marginBottom: 20,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: THEME.marca700,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="compass-outline" size={16} color={THEME.white} />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.marca900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Propósito Principal del Empleo
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 13.5,
                        color: THEME.slate800,
                        lineHeight: 21,
                        fontWeight: '500',
                      }}
                    >
                      {plazaModalEnriquecida?.proposito}
                    </Text>
                  </View>

                  {/* Funciones Esenciales Asignadas */}
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: THEME.marca700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 10,
                      }}
                    >
                      Funciones Esenciales del Cargo
                    </Text>

                    <View style={{ gap: 10 }}>
                      {plazaModalEnriquecida?.funciones?.map((funcStr, fIndex) => {
                        const textoLimpio = funcStr.replace(/^\d+[\.\)]\s*/, '');
                        return (
                          <View
                            key={`func-${fIndex}`}
                            style={{
                              backgroundColor: THEME.white,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: THEME.slate200,
                              padding: 12,
                              flexDirection: 'row',
                              alignItems: 'flex-start',
                              gap: 12,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.03,
                              shadowRadius: 2,
                              elevation: 1,
                            }}
                          >
                            <View
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 13,
                                backgroundColor: '#EEF2FF',
                                borderWidth: 1,
                                borderColor: '#C7D2FE',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: 1,
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#4338CA' }}>
                                {fIndex + 1}
                              </Text>
                            </View>
                            <Text
                              style={{
                                flex: 1,
                                fontSize: 13,
                                color: THEME.slate800,
                                lineHeight: 19,
                              }}
                            >
                              {textoLimpio}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Marco Normativo al pie */}
                  <View
                    style={{
                      marginTop: 16,
                      padding: 12,
                      backgroundColor: THEME.slate50,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: THEME.slate600, lineHeight: 17 }}>
                      <Text style={{ fontWeight: '700' }}>Marco Normativo y Manual:</Text> Funciones consolidadas a partir de las columnas AH (Funciones del cargo) y AF (Asignación y resoluciones funcionales de la SJD), bajo la {plazaModalEnriquecida?.resolucion_manual ? `Resolución ${plazaModalEnriquecida.resolucion_manual}` : 'Resolución de Manual de Funciones vigente en la Secretaría Jurídica Distrital'}, en concordancia con la Ley 909 de 2004 y el Decreto 1083 de 2015.
                    </Text>
                  </View>
                </ScrollView>
              )}

              {/* ========================================================= */}
              {/* TAB 3: REQUISITOS, FORMACIÓN Y PERFIL DE COMPETENCIAS     */}
              {/* ========================================================= */}
              {modalTab === 'requisitos' && (
                <ScrollView style={{ padding: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                    Perfil de Competencias y Requisitos del Cargo
                  </Text>

                  {/* Tarjeta de Formación Académica */}
                  <View
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#E0E7FF',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="school" size={17} color="#4338CA" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>
                          Formación Académica y Núcleo de Conocimiento
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                          Estudios reglamentarios para el nivel {plazaModal?.nivel || 'jerárquico'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        backgroundColor: THEME.slate50,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase', marginBottom: 4 }}>
                        Requisito Académico Oficial:
                      </Text>
                      <Text style={{ fontSize: 13, color: THEME.slate800, lineHeight: 19 }}>
                        {plazaModalEnriquecida?.requisitos}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 140 }}>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>Núcleo Básico (NBC)</Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                          {plazaModal?.nivel === 'DIRECTIVO' || plazaModal?.nivel === 'ASESOR'
                            ? 'Derecho, Ciencias Sociales, Administración'
                            : plazaModal?.nivel === 'PROFESIONAL'
                            ? 'Derecho, Ciencia Política, Economía, Sistemas'
                            : 'Bachillerato Técnico / Gestión Administrativa'}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 140 }}>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>Tarjeta Profesional</Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                          {plazaModal?.nivel === 'PROFESIONAL' || plazaModal?.nivel === 'ASESOR' || plazaModal?.nivel === 'DIRECTIVO'
                            ? 'Requerida en profesiones reglamentadas'
                            : 'No aplica para este nivel'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Tarjeta de Experiencia Laboral Exigida */}
                  <View
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#FEF3C7',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="briefcase" size={17} color="#B45309" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>
                          Experiencia Laboral y Profesional Exigida
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                          Acreditación de experiencia según el nivel y grado
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 140, backgroundColor: THEME.slate50, padding: 10, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Tipo de Experiencia
                        </Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                          {plazaModal?.nivel === 'PROFESIONAL' || plazaModal?.nivel === 'ASESOR' || plazaModal?.nivel === 'DIRECTIVO'
                            ? 'Profesional Relacionada'
                            : 'Laboral o Asistencial'}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 140, backgroundColor: THEME.slate50, padding: 10, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                          Tiempo Estándar de Experiencia
                        </Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.marca700, marginTop: 2 }}>
                          {plazaModal?.nivel === 'DIRECTIVO'
                            ? '48 a 72 meses'
                            : plazaModal?.nivel === 'ASESOR'
                            ? '36 a 60 meses'
                            : (Number(plazaModal?.grado) || 0) >= 15
                            ? '24 a 36 meses'
                            : '12 a 24 meses'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Tarjeta de Régimen de Equivalencias */}
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Ionicons name="swap-vertical-outline" size={16} color={THEME.marca700} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca800 }}>
                        Régimen de Equivalencias de Estudios y Experiencia
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: THEME.slate600, lineHeight: 18 }}>
                      Conforme al Decreto 1083 de 2015 y la Ley 1960 de 2019, el título de Especialización o Maestría puede conmutar experiencia profesional relacionada, o viceversa, según los baremos reglamentarios de la Comisión Nacional del Servicio Civil (CNSC).
                    </Text>
                  </View>
                </ScrollView>
              )}

              {/* ========================================================= */}
              {/* TAB 4: SEGURIDAD SOCIAL, PERNO Y DATOS DE CONTACTO       */}
              {/* ========================================================= */}
              {modalTab === 'perno' && (
                <ScrollView style={{ padding: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                    Seguridad Social Integral y Nómina (PERNO)
                  </Text>

                  {/* Afiliaciones a la Seguridad Social */}
                  <View
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900, marginBottom: 12 }}>
                      Entidades Promotoras y Fondos de Afiliación
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 140, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', padding: 12, borderRadius: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Ionicons name="medical" size={15} color="#15803D" />
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>
                            EPS / Salud
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#14532D' }}>
                          {plazaModalEnriquecida?.fondo_salud || 'No reportada'}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 140, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', padding: 12, borderRadius: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Ionicons name="shield-checkmark" size={15} color="#1D4ED8" />
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#1E40AF', textTransform: 'uppercase' }}>
                            Fondo de Pensiones
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E3A8A' }}>
                          {plazaModalEnriquecida?.fondo_pension || 'No reportado'}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 140, backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF', padding: 12, borderRadius: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Ionicons name="wallet" size={15} color="#7E22CE" />
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#6B21A8', textTransform: 'uppercase' }}>
                            Fondo de Cesantías
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#581C87' }}>
                          {plazaModalEnriquecida?.fondo_cesantias || 'No reportado'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Estructura de Ingresos y Devengos */}
                  <View
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900, marginBottom: 12 }}>
                      Estructura Salarial y Devengos de Nómina
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 140, backgroundColor: THEME.slate50, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: THEME.slate200 }}>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>Asignación Básica Mensual</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.slate900, marginTop: 3 }}>
                          {formatearDinero(plazaModalEnriquecida?.asignacion_basica)}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 140, backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
                        <Text style={{ fontSize: 11, color: '#166534', fontWeight: '600' }}>Total Devengado (PERNO)</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.emeraldText, marginTop: 3 }}>
                          {formatearDinero(plazaModalEnriquecida?.total_devengado)}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 140, backgroundColor: THEME.slate50, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: THEME.slate200 }}>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>Tipo de Funcionario</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 3 }}>
                          {plazaModalEnriquecida?.tipo_funcionario || 'EMPLEADO DE PLANTA'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Datos Sociodemográficos y Contacto */}
                  <View
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 16,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900, marginBottom: 12 }}>
                      Datos Sociodemográficos y de Contacto
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 140 }}>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>Teléfono Registrado</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                          {plazaModalEnriquecida?.telefono || 'No registrado'}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 140 }}>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>Dirección de Residencia</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                          {plazaModalEnriquecida?.direccion || 'No registrada'}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 140 }}>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>Sexo / Género</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                          {plazaModalEnriquecida?.sexo || '---'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              )}

            {/* Tab: Escalera de Encargos */}
            {modalTab === 'escalera' && (
              <ScrollView style={{ padding: 20 }}>
                {!plazaModal?.id_escalera ? (
                  <View
                    style={{
                      backgroundColor: THEME.slate50,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      borderRadius: 10,
                      padding: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: THEME.slate200,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Ionicons name="git-network-outline" size={26} color={THEME.slate500} />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate800, textAlign: 'center' }}>
                      Esta plaza no registra Escalera de Encargos
                    </Text>
                    <Text
                      style={{
                        fontSize: 12.5,
                        color: THEME.slate500,
                        textAlign: 'center',
                        marginTop: 6,
                        lineHeight: 18,
                        maxWidth: 500,
                      }}
                    >
                      En la plantilla oficial de Planta, las columnas <Text style={{ fontWeight: '700' }}>P (ID-E)</Text> y{' '}
                      <Text style={{ fontWeight: '700' }}>Q (N)</Text> identifican las escaleras y el número de peldaño correspondiente a la cadena de relevo por encargo.
                    </Text>
                    <Pressable
                      onPress={() => setModalTab('general')}
                      style={{
                        marginTop: 16,
                        backgroundColor: THEME.marca700,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.white }}>
                        Volver a la Ficha Técnica
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    {/* Cabecera explicativa de la escalera */}
                    <View
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        padding: 16,
                        marginBottom: 20,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 8,
                              backgroundColor: '#4338CA',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name="git-network" size={22} color={THEME.white} />
                          </View>
                          <View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: THEME.slate900 }}>
                              Escalera de Encargo: {plazaModal.id_escalera}
                            </Text>
                            <Text style={{ fontSize: 12, color: THEME.slate500, marginTop: 1 }}>
                              Cadena de sucesión y ascenso en encargo temporal
                            </Text>
                          </View>
                        </View>
                        <View
                          style={{
                            backgroundColor: '#EEF2FF',
                            borderColor: '#C7D2FE',
                            borderWidth: 1,
                            borderRadius: 6,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#4338CA' }}>
                            {peldanosEscaleraModal.length} Peldaño(s) en total
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={{
                          fontSize: 12,
                          color: THEME.slate600,
                          lineHeight: 18,
                          marginTop: 12,
                          borderTopWidth: 1,
                          borderTopColor: THEME.slate200,
                          paddingTop: 10,
                        }}
                      >
                        <Text style={{ fontWeight: '700', color: THEME.slate700 }}>¿Cómo funciona?</Text> El <Text style={{ fontWeight: '700', color: '#4338CA' }}>Peldaño 1</Text> es el cargo inicial objeto de la provisión raíz (ej. ascenso a cargo superior). Al ascender dicho funcionario, su cargo titular queda disponible para el <Text style={{ fontWeight: '700', color: '#4338CA' }}>Peldaño 2</Text>, y así sucesivamente en cascada.
                      </Text>
                    </View>

                    {/* Línea de tiempo de los peldaños */}
                    <View style={{ position: 'relative' }}>
                      {peldanosEscaleraModal.map((pel, idx) => {
                        const esPlazaActual = pel.id_plaza === plazaModal.id_plaza;
                        const esUltimo = idx === peldanosEscaleraModal.length - 1;
                        const numPeldano = pel.peldano_escalera || idx + 1;

                        return (
                          <View key={`modal-pel-${pel.id_plaza}-${idx}`} style={{ flexDirection: 'row', marginBottom: esUltimo ? 0 : 20 }}>
                            {/* Columna Izquierda: Indicador y línea conectora */}
                            <View style={{ alignItems: 'center', width: 44, marginRight: 12 }}>
                              <View
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 19,
                                  backgroundColor: esPlazaActual ? '#4338CA' : THEME.slate100,
                                  borderWidth: 2,
                                  borderColor: esPlazaActual ? '#312E81' : THEME.slate300,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 2,
                                  shadowColor: esPlazaActual ? '#4338CA' : '#000',
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: esPlazaActual ? 0.3 : 0.05,
                                  shadowRadius: 3,
                                  elevation: esPlazaActual ? 3 : 1,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 13,
                                    fontWeight: '800',
                                    color: esPlazaActual ? THEME.white : THEME.slate700,
                                  }}
                                >
                                  #{numPeldano}
                                </Text>
                              </View>
                              {!esUltimo && (
                                <View
                                  style={{
                                    width: 2,
                                    flex: 1,
                                    backgroundColor: THEME.slate300,
                                    marginTop: 4,
                                    marginBottom: -16,
                                  }}
                                />
                              )}
                            </View>

                            {/* Columna Derecha: Tarjeta del Peldaño */}
                            <View
                              style={{
                                flex: 1,
                                backgroundColor: esPlazaActual ? '#F0F9FF' : THEME.white,
                                borderRadius: 8,
                                borderWidth: 1.5,
                                borderColor: esPlazaActual ? THEME.marca600 : THEME.slate200,
                                padding: 14,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 2,
                                elevation: 1,
                              }}
                            >
                              {/* Header del Peldaño */}
                              <View
                                style={{
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  flexWrap: 'wrap',
                                  gap: 6,
                                  borderBottomWidth: 1,
                                  borderBottomColor: esPlazaActual ? '#BAE6FD' : THEME.slate100,
                                  paddingBottom: 8,
                                  marginBottom: 10,
                                }}
                              >
                                <View style={{ flex: 1, minWidth: 180 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>
                                      {pel.cargo}
                                    </Text>
                                    {esPlazaActual && (
                                      <View
                                        style={{
                                          backgroundColor: THEME.marca700,
                                          paddingHorizontal: 6,
                                          paddingVertical: 1,
                                          borderRadius: 4,
                                        }}
                                      >
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.white }}>
                                          PLAZA ACTUAL
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={{ fontSize: 11.5, color: THEME.slate500, marginTop: 1 }}>
                                    Plaza #{pel.id_plaza} · Cód. {pel.codigo || '---'} Grado {pel.grado || '---'} · {pel.nivel || '---'}
                                  </Text>
                                </View>

                                {!esPlazaActual && (
                                  <Pressable
                                    onPress={() => setPlazaModal(pel)}
                                    style={({ pressed }) => ({
                                      backgroundColor: pressed ? THEME.slate200 : THEME.slate100,
                                      paddingHorizontal: 10,
                                      paddingVertical: 5,
                                      borderRadius: 6,
                                      borderWidth: 1,
                                      borderColor: THEME.slate300,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                    })}
                                  >
                                    <Text style={{ fontSize: 11.5, fontWeight: '600', color: THEME.slate700 }}>
                                      Ver esta plaza
                                    </Text>
                                    <Ionicons name="arrow-forward" size={12} color={THEME.slate700} />
                                  </Pressable>
                                )}
                              </View>

                              {/* Dependencia */}
                              <View style={{ marginBottom: 10 }}>
                                <Text style={{ fontSize: 11, color: THEME.slate500 }}>Dependencia:</Text>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate800 }}>
                                  {pel.dependencia_cargo || 'Sin dependencia asignada'}
                                </Text>
                              </View>

                              {/* Comparativa: Quien está en encargo vs Quien es el titular */}
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {/* Encargado (Primero) */}
                                <View
                                  style={{
                                    flex: 1,
                                    minWidth: 180,
                                    backgroundColor: '#FEF3C7',
                                    borderColor: '#FDE68A',
                                    borderWidth: 1,
                                    borderRadius: 6,
                                    padding: 10,
                                  }}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                    <Ionicons name="swap-horizontal" size={13} color="#92400E" />
                                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#92400E', textTransform: 'uppercase' }}>
                                      Servidor en Encargo
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.slate900 }}>
                                    {pel.encargo_nombre || 'Sin servidor en encargo'}
                                  </Text>
                                  {pel.encargo_cedula ? (
                                    <Text style={{ fontSize: 11, color: THEME.slate700, marginTop: 2 }}>
                                      C.C. {pel.encargo_cedula}
                                    </Text>
                                  ) : null}
                                </View>

                                {/* Titular (Luego) */}
                                <View
                                  style={{
                                    flex: 1,
                                    minWidth: 180,
                                    backgroundColor: THEME.slate100,
                                    borderColor: THEME.slate200,
                                    borderWidth: 1,
                                    borderRadius: 6,
                                    padding: 10,
                                  }}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                    <Ionicons name="ribbon-outline" size={13} color={THEME.slate600} />
                                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.slate600, textTransform: 'uppercase' }}>
                                      Titular de la Plaza
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.slate900 }}>
                                    {pel.titular_nombre || 'Vacante Definitiva'}
                                  </Text>
                                  {pel.titular_cedula ? (
                                    <Text style={{ fontSize: 11, color: THEME.slate600, marginTop: 2 }}>
                                      C.C. {pel.titular_cedula}
                                    </Text>
                                  ) : null}
                                  {pel.situacion_titular ? (
                                    <Text style={{ fontSize: 10.5, color: THEME.marca700, fontWeight: '600', marginTop: 2 }}>
                                      {pel.situacion_titular}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

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
        {/* MODAL DE EXPEDIENTE INTEGRAL DE PERSONAL PERNO                 */}
        {/* ============================================================== */}
        <Modal
          visible={!!pernoModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPernoModal(null)}
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
                maxWidth: 1040,
                maxHeight: '92%',
                backgroundColor: THEME.white,
                borderRadius: 14,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.18,
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
                      Expediente Integral de Personal • PERNO
                    </Text>

                    {/* Badge Estado */}
                    {(pernoModalEnriquecida?.estado_funcionario === 'R' || pernoModalEnriquecida?.fecha_retiro) ? (
                      <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 4 }}>
                        <Text style={{ color: THEME.white, fontSize: 10.5, fontWeight: '700' }}>
                          DESVINCULADO / RETIRADO
                        </Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: '#10B981', paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 4 }}>
                        <Text style={{ color: THEME.white, fontSize: 10.5, fontWeight: '700' }}>
                          ACTIVO EN SERVICIO
                        </Text>
                      </View>
                    )}

                    {/* Badge Plaza Planta */}
                    {pernoModalEnriquecida?.plaza_id_plaza ? (
                      <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 4 }}>
                        <Text style={{ color: THEME.white, fontSize: 10.5, fontWeight: '700' }}>
                          Plaza Oficial #{pernoModalEnriquecida.plaza_id_plaza}
                          {pernoModalEnriquecida.plaza_es_encargo ? ' (Encargo)' : ''}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={{ color: THEME.white, fontSize: 18, fontWeight: '700', marginTop: 4 }}>
                    {pernoModalEnriquecida?.nombre_completo || `${pernoModalEnriquecida?.nombres} ${pernoModalEnriquecida?.primer_apellido}`}
                  </Text>
                  <Text style={{ color: 'rgba(214, 228, 244, 0.85)', fontSize: 12, marginTop: 1 }}>
                    C.C. {pernoModalEnriquecida?.cedula} • {pernoModalEnriquecida?.cargo || 'Sin cargo'} • {pernoModalEnriquecida?.dependencia || 'Sin dependencia'}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setPernoModal(null)}
                  style={({ pressed }) => ({
                    padding: 6,
                    borderRadius: 6,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  })}
                >
                  <Ionicons name="close" size={20} color={THEME.white} />
                </Pressable>
              </View>

              {/* Barra de Tabs del Modal con Scroll Horizontal */}
              <View
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: THEME.slate200,
                  backgroundColor: THEME.slate50,
                }}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    gap: 6,
                  }}
                >
                  {/* Tab 1: Datos Personales */}
                  <Pressable
                    onPress={() => setModalPernoTab('personal')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: modalPernoTab === 'personal' ? THEME.marca600 : 'transparent',
                    }}
                  >
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={modalPernoTab === 'personal' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: modalPernoTab === 'personal' ? '700' : '500',
                        color: modalPernoTab === 'personal' ? THEME.marca700 : THEME.slate600,
                      }}
                    >
                      Datos Personales
                    </Text>
                  </Pressable>

                  {/* Tab 2: Vinculación, Nombramiento & Retiro */}
                  <Pressable
                    onPress={() => setModalPernoTab('vinculacion')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: modalPernoTab === 'vinculacion' ? THEME.marca600 : 'transparent',
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={modalPernoTab === 'vinculacion' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: modalPernoTab === 'vinculacion' ? '700' : '500',
                        color: modalPernoTab === 'vinculacion' ? THEME.marca700 : THEME.slate600,
                      }}
                    >
                      Vinculación & Retiro
                    </Text>
                    {(pernoModalEnriquecida?.fecha_retiro || pernoModalEnriquecida?.estado_funcionario === 'R') && (
                      <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626' }}>Desvinculado</Text>
                      </View>
                    )}
                  </Pressable>

                  {/* Tab 3: Seguridad Social & Devengos */}
                  <Pressable
                    onPress={() => setModalPernoTab('seguridad')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: modalPernoTab === 'seguridad' ? THEME.marca600 : 'transparent',
                    }}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={16}
                      color={modalPernoTab === 'seguridad' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: modalPernoTab === 'seguridad' ? '700' : '500',
                        color: modalPernoTab === 'seguridad' ? THEME.marca700 : THEME.slate600,
                      }}
                    >
                      Seg. Social & Nómina
                    </Text>
                  </Pressable>

                  {/* Tab 4: Cruce Planta Oficial */}
                  <Pressable
                    onPress={() => setModalPernoTab('planta')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: modalPernoTab === 'planta' ? THEME.marca600 : 'transparent',
                    }}
                  >
                    <Ionicons
                      name="business-outline"
                      size={16}
                      color={modalPernoTab === 'planta' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: modalPernoTab === 'planta' ? '700' : '500',
                        color: modalPernoTab === 'planta' ? THEME.marca700 : THEME.slate600,
                      }}
                    >
                      Planta Oficial & Cargo
                    </Text>
                    {pernoModalEnriquecida?.plaza_id_plaza ? (
                      <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#1D4ED8' }}>Plaza #{pernoModalEnriquecida.plaza_id_plaza}</Text>
                      </View>
                    ) : null}
                  </Pressable>

                  {/* Tab 5: Escalera de Encargos */}
                  <Pressable
                    onPress={() => setModalPernoTab('escalera')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: modalPernoTab === 'escalera' ? THEME.marca600 : 'transparent',
                    }}
                  >
                    <Ionicons
                      name="git-network-outline"
                      size={16}
                      color={modalPernoTab === 'escalera' ? THEME.marca700 : THEME.slate500}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: modalPernoTab === 'escalera' ? '700' : '500',
                        color: modalPernoTab === 'escalera' ? THEME.marca700 : THEME.slate600,
                      }}
                    >
                      Escalera de Encargos
                    </Text>
                    {pernoModalEnriquecida?.plaza_id_escalera ? (
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309' }}>Escalera #{pernoModalEnriquecida.plaza_id_escalera}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </ScrollView>
              </View>

              {/* Cuerpo del Modal con Scroll Vertical */}
              <ScrollView style={{ padding: 20 }}>
                {pernoModalEnriquecida && (
                  <View style={{ gap: 16, paddingBottom: 20 }}>

                    {/* ======================================================== */}
                    {/* TAB 1: DATOS PERSONALES & SOCIODEMOGRÁFICOS              */}
                    {/* ======================================================== */}
                    {modalPernoTab === 'personal' && (
                      <View style={{ gap: 16 }}>
                        <View style={{ backgroundColor: THEME.slate50, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: THEME.slate200 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca900, marginBottom: 12 }}>
                            Identificación y Datos de Contacto
                          </Text>
                          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, flexWrap: 'wrap' }}>
                            <View style={{ flex: 1, minWidth: 200 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Cédula de Ciudadanía</Text>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate800, marginTop: 2 }}>{pernoModalEnriquecida.cedula}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 200 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Primer Apellido</Text>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>{pernoModalEnriquecida.primer_apellido || 'N/A'}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 200 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Segundo Apellido</Text>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>{pernoModalEnriquecida.segundo_apellido || 'N/A'}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 200 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Nombres</Text>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>{pernoModalEnriquecida.nombres || 'N/A'}</Text>
                            </View>
                          </View>

                          <View style={{ height: 1, backgroundColor: THEME.slate200, marginVertical: 12 }} />

                          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, flexWrap: 'wrap' }}>
                            <View style={{ flex: 1, minWidth: 200 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Dirección de Residencia</Text>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>{pernoModalEnriquecida.direccion || 'No registrada'}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 200 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Teléfono de Contacto</Text>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>{pernoModalEnriquecida.telefono || 'No registrado'}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 200 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Sede Física</Text>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                                {pernoModalEnriquecida.sede ? `${pernoModalEnriquecida.sede} (${pernoModalEnriquecida.sede_cod || 'Sede'})` : 'Sin Definir'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={{ backgroundColor: THEME.slate50, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: THEME.slate200 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca900, marginBottom: 12 }}>
                            Datos Sociodemográficos y Militares
                          </Text>
                          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, flexWrap: 'wrap' }}>
                            <View style={{ flex: 1, minWidth: 180 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Fecha de Nacimiento</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate800, marginTop: 2 }}>
                                {formatFecha(pernoModalEnriquecida.fecha_nacimiento)}
                                {calcEdad(pernoModalEnriquecida.fecha_nacimiento) ? ` (${calcEdad(pernoModalEnriquecida.fecha_nacimiento)} años)` : ''}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Sexo / Género</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                                {pernoModalEnriquecida.sexo === 'F' ? 'Femenino' : pernoModalEnriquecida.sexo === 'M' ? 'Masculino' : pernoModalEnriquecida.sexo || 'N/A'}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Grupo Sanguíneo y RH</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.marca700, marginTop: 2 }}>
                                {pernoModalEnriquecida.tipo_sangre ? `${pernoModalEnriquecida.tipo_sangre}${pernoModalEnriquecida.rh === 'P' ? '+' : pernoModalEnriquecida.rh === 'N' ? '-' : pernoModalEnriquecida.rh || ''}` : 'No registrado'}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 180 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Libreta Militar</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                                {pernoModalEnriquecida.libreta_militar ? `${pernoModalEnriquecida.libreta_militar} (Clase: ${pernoModalEnriquecida.clase_libreta || 'N/A'}, Dist: ${pernoModalEnriquecida.distrito_militar || 'N/A'})` : 'No aplica / No registra'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 2: VINCULACIÓN, NOMBRAMIENTO & FECHA DE RETIRO       */}
                    {/* ======================================================== */}
                    {modalPernoTab === 'vinculacion' && (
                      <View style={{ gap: 16 }}>
                        {/* Alerta de Desvinculación Destacada */}
                        {(pernoModalEnriquecida.fecha_retiro || pernoModalEnriquecida.estado_funcionario === 'R') ? (
                          <View
                            style={{
                              backgroundColor: '#FEF2F2',
                              borderColor: '#F87171',
                              borderWidth: 1.5,
                              borderRadius: 10,
                              padding: 16,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 14,
                            }}
                          >
                            <View style={{ backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 }}>
                              <Ionicons name="alert-circle" size={28} color="#DC2626" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: '#991B1B' }}>
                                SERVIDOR DESVINCULADO / RETIRADO DE LA ENTIDAD
                              </Text>
                              <Text style={{ fontSize: 13, color: '#B91C1C', marginTop: 2 }}>
                                Fecha oficial de desvinculación / retiro de nómina:{' '}
                                <Text style={{ fontWeight: '700' }}>
                                  {formatFecha(pernoModalEnriquecida.fecha_retiro)}
                                </Text>
                              </Text>
                              <Text style={{ fontSize: 11.5, color: '#7F1D1D', marginTop: 2 }}>
                                El funcionario ya no se encuentra en servicio activo dentro de la Secretaría Jurídica Distrital.
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View
                            style={{
                              backgroundColor: THEME.emeraldBg,
                              borderColor: THEME.emeraldRing,
                              borderWidth: 1,
                              borderRadius: 10,
                              padding: 14,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 12,
                            }}
                          >
                            <Ionicons name="checkmark-circle" size={24} color="#059669" />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.emeraldText }}>
                                FUNCIONARIO ACTIVO EN LA ENTIDAD
                              </Text>
                              <Text style={{ fontSize: 12, color: '#065F46', marginTop: 1 }}>
                                El servidor cuenta con vinculación vigente en la nómina de la Secretaría Jurídica Distrital.
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Fechas de Ingreso Histórico */}
                        <View style={{ backgroundColor: THEME.slate50, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: THEME.slate200 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca900, marginBottom: 12 }}>
                            Fechas de Ingreso y Antigüedad
                          </Text>
                          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Ingreso a la Entidad (SJD)</Text>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.marca800, marginTop: 2 }}>
                                {formatFecha(pernoModalEnriquecida.fecha_ingreso_entidad)}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Ingreso al Distrito Capital</Text>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate800, marginTop: 2 }}>
                                {formatFecha(pernoModalEnriquecida.fecha_ingreso_distrito)}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Ingreso a la Nación</Text>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate800, marginTop: 2 }}>
                                {formatFecha(pernoModalEnriquecida.fecha_ingreso_nacion)}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Actos Administrativos de Nombramiento */}
                        <View style={{ backgroundColor: THEME.slate50, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: THEME.slate200 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca900, marginBottom: 12 }}>
                            Acto Administrativo de Nombramiento
                          </Text>
                          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, flexWrap: 'wrap' }}>
                            <View style={{ flex: 1, minWidth: 200 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Tipo de Nombramiento</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate800, marginTop: 2 }}>
                                {pernoModalEnriquecida.tipo_nombramiento || 'No especificado'}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 200 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Acto de Nombramiento</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                                {pernoModalEnriquecida.acto_nombramiento || 'Nombramiento'}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 150 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Número de Acto</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.marca700, marginTop: 2 }}>
                                #{pernoModalEnriquecida.numero_acto_nombramiento || 'S/N'}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 170 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Fecha del Acto</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                                {formatFecha(pernoModalEnriquecida.fecha_acto_nombramiento)}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 170 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Fecha Efectiva Nombramiento</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                                {formatFecha(pernoModalEnriquecida.fecha_efectiva_nombramiento)}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Actos Administrativos de Encargo (si existen) */}
                        {(pernoModalEnriquecida.numero_acto_encargo || pernoModalEnriquecida.fecha_acto_encargo || pernoModalEnriquecida.fecha_efectiva_encargo) ? (
                          <View style={{ backgroundColor: '#FFFBEB', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#FDE68A' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 12 }}>
                              Acto Administrativo de Encargo
                            </Text>
                            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '600', textTransform: 'uppercase' }}>Número Acto Encargo</Text>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#78350F', marginTop: 2 }}>
                                  #{pernoModalEnriquecida.numero_acto_encargo || 'S/N'}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '600', textTransform: 'uppercase' }}>Fecha del Acto</Text>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#78350F', marginTop: 2 }}>
                                  {formatFecha(pernoModalEnriquecida.fecha_acto_encargo)}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '600', textTransform: 'uppercase' }}>Fecha Efectiva Encargo</Text>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#78350F', marginTop: 2 }}>
                                  {formatFecha(pernoModalEnriquecida.fecha_efectiva_encargo)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 3: SEGURIDAD SOCIAL & DEVENGOS                       */}
                    {/* ======================================================== */}
                    {modalPernoTab === 'seguridad' && (
                      <View style={{ gap: 16 }}>
                        <View style={{ backgroundColor: THEME.slate50, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: THEME.slate200 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca900, marginBottom: 12 }}>
                            Afiliaciones a Seguridad Social y Fondos
                          </Text>
                          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Fondo de Salud (EPS)</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate800, marginTop: 2 }}>
                                {pernoModalEnriquecida.fondo_salud || 'No registrada'}
                              </Text>
                              {pernoModalEnriquecida.codigo_eps ? (
                                <Text style={{ fontSize: 11, color: THEME.slate400, marginTop: 2 }}>Código EPS: {pernoModalEnriquecida.codigo_eps}</Text>
                              ) : null}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Fondo de Pensiones</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate800, marginTop: 2 }}>
                                {pernoModalEnriquecida.fondo_pension || 'No registrado'}
                              </Text>
                              {pernoModalEnriquecida.codigo_fondo_pensiones ? (
                                <Text style={{ fontSize: 11, color: THEME.slate400, marginTop: 2 }}>Código Fondo: {pernoModalEnriquecida.codigo_fondo_pensiones}</Text>
                              ) : null}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Fondo de Cesantías</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate800, marginTop: 2 }}>
                                {pernoModalEnriquecida.fondo_cesantias || 'No registrado'}
                              </Text>
                              {pernoModalEnriquecida.codigo_fondo_cesantias ? (
                                <Text style={{ fontSize: 11, color: THEME.slate400, marginTop: 2 }}>Código Cesantías: {pernoModalEnriquecida.codigo_fondo_cesantias}</Text>
                              ) : null}
                            </View>
                          </View>
                        </View>

                        <View style={{ backgroundColor: THEME.slate50, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: THEME.slate200 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca900, marginBottom: 12 }}>
                            Asignación Salarial y Devengos Registrados
                          </Text>
                          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
                            <View style={{ flex: 1, backgroundColor: THEME.white, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: THEME.slate200 }}>
                              <Text style={{ fontSize: 11.5, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Asignación Básica Mensual</Text>
                              <Text style={{ fontSize: 20, fontWeight: '700', color: THEME.marca800, marginTop: 4 }}>
                                {formatMoneda(pernoModalEnriquecida.asignacion_basica)}
                              </Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: THEME.white, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: THEME.slate200 }}>
                              <Text style={{ fontSize: 11.5, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Total Devengados Mensual</Text>
                              <Text style={{ fontSize: 20, fontWeight: '700', color: '#047857', marginTop: 4 }}>
                                {formatMoneda(pernoModalEnriquecida.total_devengado || pernoModalEnriquecida.asignacion_basica)}
                              </Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: THEME.white, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: THEME.slate200 }}>
                              <Text style={{ fontSize: 11.5, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Posición en Nómina PERNO</Text>
                              <Text style={{ fontSize: 20, fontWeight: '700', color: THEME.slate800, marginTop: 4 }}>
                                {pernoModalEnriquecida.posicion_planta ? `Pos. #${pernoModalEnriquecida.posicion_planta}` : 'Sin posición'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 4: PLANTA OFICIAL, CARGO & MANUAL DE FUNCIONES       */}
                    {/* ======================================================== */}
                    {modalPernoTab === 'planta' && (
                      <View style={{ gap: 16 }}>
                        {pernoModalEnriquecida.plaza_id_plaza ? (
                          <View style={{ gap: 16 }}>
                            {/* Tarjeta de Plaza */}
                            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#BFDBFE' }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E40AF' }}>
                                  Plaza Oficial #{pernoModalEnriquecida.plaza_id_plaza} de la Secretaría Jurídica Distrital
                                </Text>
                                {pernoModalEnriquecida.plaza_id_sideap ? (
                                  <View style={{ backgroundColor: THEME.white, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#93C5FD' }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                                      SIDEAP: #{pernoModalEnriquecida.plaza_id_sideap}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>

                              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, marginTop: 8 }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '600', textTransform: 'uppercase' }}>Cargo en Planta</Text>
                                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E3A8A', marginTop: 2 }}>{pernoModalEnriquecida.plaza_cargo || pernoModalEnriquecida.cargo}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '600', textTransform: 'uppercase' }}>Nivel Jerárquico</Text>
                                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E3A8A', marginTop: 2 }}>{pernoModalEnriquecida.plaza_nivel || 'N/A'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '600', textTransform: 'uppercase' }}>Código - Grado</Text>
                                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E3A8A', marginTop: 2 }}>
                                    {pernoModalEnriquecida.plaza_codigo || pernoModalEnriquecida.cargo_cod} - {pernoModalEnriquecida.plaza_grado || pernoModalEnriquecida.grado}
                                  </Text>
                                </View>
                              </View>

                              <View style={{ height: 1, backgroundColor: '#DBEAFE', marginVertical: 10 }} />

                              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '600', textTransform: 'uppercase' }}>Dependencia Oficial del Cargo</Text>
                                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#1E3A8A', marginTop: 2 }}>{pernoModalEnriquecida.plaza_dependencia_cargo || pernoModalEnriquecida.dependencia}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '600', textTransform: 'uppercase' }}>Dependencia Funcional Asignada</Text>
                                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#1E3A8A', marginTop: 2 }}>{pernoModalEnriquecida.plaza_dependencia_funcional || pernoModalEnriquecida.plaza_dependencia_cargo || pernoModalEnriquecida.dependencia}</Text>
                                </View>
                              </View>
                            </View>

                            {/* Propósito del Empleo */}
                            {pernoModalEnriquecida.plaza_proposito ? (
                              <View style={{ backgroundColor: THEME.slate50, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: THEME.slate200 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca900, marginBottom: 6 }}>
                                  Propósito Principal del Empleo
                                </Text>
                                <Text style={{ fontSize: 13, color: THEME.slate700, lineHeight: 19 }}>
                                  {pernoModalEnriquecida.plaza_proposito}
                                </Text>
                              </View>
                            ) : null}

                            {/* Requisitos y Perfil */}
                            {pernoModalEnriquecida.plaza_requisitos ? (
                              <View style={{ backgroundColor: THEME.slate50, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: THEME.slate200 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca900, marginBottom: 6 }}>
                                  Requisitos Mínimos y Competencias
                                </Text>
                                <Text style={{ fontSize: 13, color: THEME.slate700, lineHeight: 19 }}>
                                  {pernoModalEnriquecida.plaza_requisitos}
                                </Text>
                              </View>
                            ) : null}

                            {/* Manual de Funciones Esenciales */}
                            {pernoModalEnriquecida.plaza_funciones ? (
                              <View style={{ backgroundColor: THEME.slate50, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: THEME.slate200 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca900, marginBottom: 12 }}>
                                  Manual de Funciones Esenciales del Cargo
                                </Text>
                                <View style={{ gap: 8 }}>
                                  {(Array.isArray(pernoModalEnriquecida.plaza_funciones)
                                    ? pernoModalEnriquecida.plaza_funciones
                                    : [String(pernoModalEnriquecida.plaza_funciones)]
                                  ).map((fn, fIdx) => (
                                    <View
                                      key={fIdx}
                                      style={{
                                        flexDirection: 'row',
                                        backgroundColor: THEME.white,
                                        padding: 10,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: THEME.slate200,
                                        gap: 10,
                                        alignItems: 'flex-start',
                                      }}
                                    >
                                      <View
                                        style={{
                                          width: 24,
                                          height: 24,
                                          borderRadius: 12,
                                          backgroundColor: THEME.marca100,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca800 }}>
                                          {fIdx + 1}
                                        </Text>
                                      </View>
                                      <Text style={{ flex: 1, fontSize: 12.5, color: THEME.slate700, lineHeight: 18 }}>
                                        {String(fn).trim()}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            ) : null}
                          </View>
                        ) : (
                          <View
                            style={{
                              backgroundColor: THEME.slate50,
                              borderRadius: 10,
                              padding: 24,
                              borderWidth: 1,
                              borderColor: THEME.slate200,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name="folder-open-outline" size={42} color={THEME.slate300} />
                            <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate700, marginTop: 12 }}>
                              Sin Plaza Activa Asignada en Planta Vigente
                            </Text>
                            <Text style={{ fontSize: 13, color: THEME.slate500, textAlign: 'center', marginTop: 4, maxWidth: 520, lineHeight: 19 }}>
                              Este servidor es un exfuncionario retirado / desvinculado o su plaza actual no registra ocupación activa en la planta oficial vigente.
                            </Text>
                            <View style={{ marginTop: 16, backgroundColor: THEME.white, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: THEME.slate200, width: '100%', maxWidth: 480 }}>
                              <Text style={{ fontSize: 12, color: THEME.slate500, fontWeight: '600', textTransform: 'uppercase' }}>Último Cargo Registrado en Nómina PERNO:</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate800, marginTop: 2 }}>{pernoModalEnriquecida.cargo || 'Sin cargo'}</Text>
                              <Text style={{ fontSize: 12, color: THEME.slate600, marginTop: 1 }}>{pernoModalEnriquecida.dependencia || 'Sin dependencia'}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 5: ESCALERA DE ENCARGOS                             */}
                    {/* ======================================================== */}
                    {modalPernoTab === 'escalera' && (
                      <View style={{ gap: 16 }}>
                        {pernoModalEnriquecida.plaza_id_escalera ? (
                          <View style={{ gap: 14 }}>
                            <View style={{ backgroundColor: '#FEF3C7', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A' }}>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400E' }}>
                                Escalera de Encargo Asignada: #{pernoModalEnriquecida.plaza_id_escalera}
                              </Text>
                              <Text style={{ fontSize: 12.5, color: '#B45309', marginTop: 3 }}>
                                Peldaño que ocupa el cargo / servidor: <Text style={{ fontWeight: '700' }}>Peldaño #{pernoModalEnriquecida.plaza_peldano_escalera || 1}</Text>
                              </Text>
                            </View>

                            {/* Cadena completa de peldaños si está disponible en todasLasEscaleras */}
                            {(() => {
                              const esc = todasLasEscaleras.find((e) => e.id_escalera === pernoModalEnriquecida.plaza_id_escalera);
                              if (!esc || !esc.peldanos || esc.peldanos.length === 0) {
                                return (
                                  <View style={{ padding: 16, backgroundColor: THEME.slate50, borderRadius: 8, borderWidth: 1, borderColor: THEME.slate200 }}>
                                    <Text style={{ fontSize: 12.5, color: THEME.slate600 }}>
                                      Este empleo pertenece a la cadena de escaleras identificada como #{pernoModalEnriquecida.plaza_id_escalera}.
                                    </Text>
                                  </View>
                                );
                              }

                              return (
                                <View style={{ backgroundColor: THEME.white, borderRadius: 10, borderWidth: 1, borderColor: THEME.slate200, padding: 16, gap: 10 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.marca900 }}>
                                    Cadena Sucesoria Completa ({esc.peldanos.length} peldaños):
                                  </Text>
                                  {esc.peldanos.map((pel, pIdx) => {
                                    const esEsteServidor = String(pel.id_plaza) === String(pernoModalEnriquecida.plaza_id_plaza);
                                    return (
                                      <View
                                        key={pIdx}
                                        style={{
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          padding: 12,
                                          borderRadius: 8,
                                          backgroundColor: esEsteServidor ? '#EFF6FF' : THEME.slate50,
                                          borderColor: esEsteServidor ? '#3B82F6' : THEME.slate200,
                                          borderWidth: esEsteServidor ? 2 : 1,
                                          gap: 12,
                                        }}
                                      >
                                        <View
                                          style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: esEsteServidor ? '#2563EB' : THEME.slate200,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                        >
                                          <Text style={{ fontSize: 13, fontWeight: '700', color: esEsteServidor ? THEME.white : THEME.slate700 }}>
                                            {pel.peldano_escalera || pIdx + 1}
                                          </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate800 }}>
                                            Plaza #{pel.id_plaza}: {pel.cargo} (Grado {pel.grado})
                                          </Text>
                                          <Text style={{ fontSize: 11.5, color: THEME.slate600, marginTop: 1 }}>
                                            Titular: {pel.titular_nombre || 'Vacante'} • Encargado: {pel.encargo_nombre || 'N/A'}
                                          </Text>
                                        </View>
                                        {esEsteServidor && (
                                          <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>Este Servidor</Text>
                                          </View>
                                        )}
                                      </View>
                                    );
                                  })}
                                </View>
                              );
                            })()}
                          </View>
                        ) : (
                          <View
                            style={{
                              backgroundColor: THEME.slate50,
                              borderRadius: 10,
                              padding: 24,
                              borderWidth: 1,
                              borderColor: THEME.slate200,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name="git-network-outline" size={38} color={THEME.slate300} />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: THEME.slate700, marginTop: 10 }}>
                              No pertenece a una Escalera de Encargos
                            </Text>
                            <Text style={{ fontSize: 12, color: THEME.slate500, textAlign: 'center', marginTop: 4 }}>
                              Este servidor o su plaza asociada no forman parte de una cadena de encargos sucesorios.
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
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
                  onPress={() => setPernoModal(null)}
                  style={{
                    backgroundColor: THEME.white,
                    borderWidth: 1,
                    borderColor: THEME.slate300,
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate700 }}>Cerrar Expediente</Text>
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

              <Text style={{ fontSize: 13, color: THEME.slate600, textAlign: 'center', lineHeight: 19, marginBottom: infoModalAdvertencias.length > 0 ? 12 : 20 }}>
                {infoModalMensaje}
              </Text>

              {infoModalAdvertencias.length > 0 && (
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#FFFBEB',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                    maxHeight: 150,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309', marginBottom: 6 }}>
                    Observaciones detectadas ({infoModalAdvertencias.length}):
                  </Text>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 110 }}>
                    {infoModalAdvertencias.map((adv, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                        <Text style={{ fontSize: 11, color: '#D97706', marginRight: 4, lineHeight: 15 }}>•</Text>
                        <Text style={{ fontSize: 11, color: '#92400E', flex: 1, lineHeight: 15 }}>{adv}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

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
