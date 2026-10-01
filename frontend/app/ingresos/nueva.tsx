import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { ingresosService, CargoEvaluado, AnalisisCompleto, PlazaPlanta } from '../../lib/ingresosService';

export default function NuevaValidacionScreen() {
  const router = useRouter();

  // Estados de Planta Oficial y Cargos del Manual
  const [cargos, setCargos] = useState<CargoEvaluado[]>([]);
  const [planta, setPlanta] = useState<PlazaPlanta[]>([]);
  const [loadingPlanta, setLoadingPlanta] = useState(false);
  const [cargoSeleccionado, setCargoSeleccionado] = useState<CargoEvaluado | null>(null);
  const [plazaSeleccionada, setPlazaSeleccionada] = useState<PlazaPlanta | null>(null);

  // Filtros de los Desplegables
  const [filtroCargo, setFiltroCargo] = useState('');
  const [filtroCodigoGrado, setFiltroCodigoGrado] = useState('');
  const [filtroDependencia, setFiltroDependencia] = useState('');
  const [filtroSituacion, setFiltroSituacion] = useState('');
  const [filtroSideap, setFiltroSideap] = useState('');
  const [filtroPerno, setFiltroPerno] = useState('');

  // Estados del Formulario del Cargo
  const [idSideap, setIdSideap] = useState('');
  const [idPerno, setIdPerno] = useState('');
  const [idPlaza, setIdPlaza] = useState<number | null>(null);
  const [nombreCargo, setNombreCargo] = useState('Profesional Especializado');
  const [codigoCargo, setCodigoCargo] = useState('222');
  const [gradoCargo, setGradoCargo] = useState('24');
  const [dependenciaCargo, setDependenciaCargo] = useState('Dirección Distrital de Doctrina y Asuntos Normativos');
  const [mesesExigidos, setMesesExigidos] = useState('54');
  const [formacionExigida, setFormacionExigida] = useState('Título profesional en Derecho o afines. Título de posgrado relacionado.');
  const [funcionesTexto, setFuncionesTexto] = useState(
    '1. Proyectar conceptos jurídicos sobre temas de doctrina distrital y asuntos normativos de competencia de la entidad.\n2. Analizar y revisar proyectos de actos administrativos, decretos, resoluciones y proyectos de acuerdo distritales.\n3. Sustanciar respuestas a consultas y derechos de petición formulados por entidades públicas o ciudadanos en materia jurídica.\n4. Participar en la formulación, seguimiento y evaluación de políticas jurídicas de alcance distrital.\n5. Asistir técnicamente a los organismos distritales en la correcta aplicación e interpretación de la normatividad vigente.'
  );

  // Estados del Modal Selector Universal (Desplegable)
  type PickerTipo = 'cargo' | 'codigoGrado' | 'dependencia' | 'situacion' | 'sideap' | 'perno';
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTipo, setPickerTipo] = useState<PickerTipo | null>(null);
  const [pickerBusqueda, setPickerBusqueda] = useState('');

  // Estados de Candidato
  const [candidatoNombre, setCandidatoNombre] = useState('');
  const [candidatoDoc, setCandidatoDoc] = useState('');
  const [candidatoEmail, setCandidatoEmail] = useState('');
  const [candidatoTel, setCandidatoTel] = useState('');

  // Estados de Archivos PDF
  const [archivosPdf, setArchivosPdf] = useState<Array<{ name: string; base64: string; size?: number }>>([]);

  // Estados de Proceso
  const [analizando, setAnalizando] = useState(false);
  const [progresoTexto, setProgresoTexto] = useState('');

  // Resultado del análisis previo a guardar
  const [analisisResultado, setAnalisisResultado] = useState<AnalisisCompleto | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Modales
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const mostrarMensaje = (titulo: string, mensaje: string) => {
    setModalTitle(titulo);
    setModalMessage(mensaje);
    setModalVisible(true);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoadingPlanta(true);
      const [cargosData, plantaData] = await Promise.all([
        ingresosService.obtenerCargos().catch(() => []),
        ingresosService.obtenerPlanta().catch(() => [])
      ]);
      setCargos(cargosData || []);
      setPlanta(plantaData || []);
    } catch (e) {
      console.log('No se pudieron cargar datos de cargos o planta', e);
    } finally {
      setLoadingPlanta(false);
    }
  };

  // 1. Lista única de Cargos / Denominaciones
  const listaCargos = useMemo(() => {
    const set = new Set<string>();
    planta.forEach(p => { if (p.cargo) set.add(p.cargo.trim()); });
    if (set.size === 0) {
      cargos.forEach(c => { if (c.nombre) set.add(c.nombre.trim()); });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [planta, cargos]);

  // 2. Lista de Códigos y Grados (filtrados por cargo si hay)
  const listaCodigoGrado = useMemo(() => {
    const base = filtroCargo
      ? planta.filter(p => p.cargo.toLowerCase() === filtroCargo.toLowerCase())
      : planta;
    const map = new Map<string, { codigo: string; grado: string; count: number }>();
    base.forEach(p => {
      const cod = p.codigo ? String(p.codigo) : 'S/C';
      const gr = p.grado ? String(p.grado) : 'S/G';
      const key = `${p.codigo || ''}-${p.grado || ''}`;
      if (!map.has(key)) {
        map.set(key, { codigo: cod, grado: gr, count: 1 });
      } else {
        map.get(key)!.count += 1;
      }
    });
    return Array.from(map.entries()).map(([key, val]) => ({
      valor: key,
      codigo: val.codigo,
      grado: val.grado,
      etiqueta: `Cód. ${val.codigo} - Grado ${val.grado}`,
      count: val.count
    })).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  }, [planta, filtroCargo]);

  // 3. Lista de Dependencias (filtradas por cargo y codigo/grado si hay)
  const listaDependencias = useMemo(() => {
    let base = planta;
    if (filtroCargo) {
      base = base.filter(p => p.cargo.toLowerCase() === filtroCargo.toLowerCase());
    }
    if (filtroCodigoGrado) {
      base = base.filter(p => `${p.codigo || ''}-${p.grado || ''}` === filtroCodigoGrado);
    }
    const map = new Map<string, number>();
    base.forEach(p => {
      const dep = p.dependencia_cargo ? p.dependencia_cargo.trim() : 'Sin dependencia asignada';
      map.set(dep, (map.get(dep) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([dep, count]) => ({ valor: dep, etiqueta: dep, count }))
      .sort((a, b) => a.valor.localeCompare(b.valor));
  }, [planta, filtroCargo, filtroCodigoGrado]);

  // 4. Lista de Situaciones Administrativas del Titular del Cargo
  const listaSituaciones = useMemo(() => {
    let base = planta;
    if (filtroCargo) {
      base = base.filter(p => p.cargo.toLowerCase() === filtroCargo.toLowerCase());
    }
    if (filtroCodigoGrado) {
      base = base.filter(p => `${p.codigo || ''}-${p.grado || ''}` === filtroCodigoGrado);
    }
    if (filtroDependencia) {
      base = base.filter(p => (p.dependencia_cargo || '').toLowerCase() === filtroDependencia.toLowerCase());
    }
    const map = new Map<string, number>();
    base.forEach(p => {
      const sit = (p.situacion_administrativa || '').trim() || 'NO ESPECIFICADA';
      map.set(sit, (map.get(sit) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([sit, count]) => ({ valor: sit, etiqueta: sit, count }))
      .sort((a, b) => b.count - a.count || a.valor.localeCompare(b.valor));
  }, [planta, filtroCargo, filtroCodigoGrado, filtroDependencia]);

  // 5. Plazas filtradas por los selectores
  const plazasFiltradas = useMemo(() => {
    return planta.filter(p => {
      if (filtroCargo && p.cargo.toLowerCase() !== filtroCargo.toLowerCase()) return false;
      if (filtroCodigoGrado && `${p.codigo || ''}-${p.grado || ''}` !== filtroCodigoGrado) return false;
      if (filtroDependencia && (p.dependencia_cargo || '').toLowerCase() !== filtroDependencia.toLowerCase()) return false;
      if (filtroSituacion) {
        const sit = (p.situacion_administrativa || '').trim() || 'NO ESPECIFICADA';
        if (sit.toLowerCase() !== filtroSituacion.toLowerCase()) return false;
      }
      if (filtroSideap && String(p.id_sideap) !== filtroSideap) return false;
      if (filtroPerno && String(p.id_perno) !== filtroPerno) return false;
      return true;
    });
  }, [planta, filtroCargo, filtroCodigoGrado, filtroDependencia, filtroSituacion, filtroSideap, filtroPerno]);

  // 6. Lista de ID SIDEAP disponibles
  const listaSideap = useMemo(() => {
    let base = plazasFiltradas.length > 0 ? plazasFiltradas : planta;
    return base
      .filter(p => p.id_sideap != null)
      .map(p => ({
        valor: String(p.id_sideap),
        etiquetaPrincipal: `ID SIDEAP: ${p.id_sideap}`,
        etiquetaSecundaria: `${p.cargo} (Cód. ${p.codigo || 'N/A'}-Gr.${p.grado || 'N/A'}) • ${p.dependencia_cargo || ''}`,
        badge: p.situacion_administrativa ? p.situacion_administrativa : (p.id_perno ? `PERNO #${p.id_perno}` : undefined),
        plaza: p
      }))
      .sort((a, b) => Number(a.valor) - Number(b.valor));
  }, [plazasFiltradas, planta]);

  // 7. Lista de ID PERNO disponibles
  const listaPerno = useMemo(() => {
    let base = plazasFiltradas.length > 0 ? plazasFiltradas : planta;
    return base
      .filter(p => p.id_perno != null)
      .map(p => ({
        valor: String(p.id_perno),
        etiquetaPrincipal: `ID PERNO: ${p.id_perno}`,
        etiquetaSecundaria: `${p.cargo} (Cód. ${p.codigo || 'N/A'}-Gr.${p.grado || 'N/A'}) • ${p.dependencia_cargo || ''}`,
        badge: p.situacion_administrativa ? p.situacion_administrativa : (p.id_sideap ? `SIDEAP #${p.id_sideap}` : undefined),
        plaza: p
      }))
      .sort((a, b) => Number(a.valor) - Number(b.valor));
  }, [plazasFiltradas, planta]);

  // Aplicar selección completa de una plaza oficial
  const aplicarPlazaCompleta = (p: PlazaPlanta) => {
    setPlazaSeleccionada(p);
    setIdSideap(p.id_sideap != null ? String(p.id_sideap) : '');
    setIdPerno(p.id_perno != null ? String(p.id_perno) : '');
    setIdPlaza(p.id_plaza ?? null);
    setNombreCargo(p.cargo || '');
    setCodigoCargo(p.codigo || '');
    setGradoCargo(p.grado || '');
    setDependenciaCargo(p.dependencia_cargo || '');

    setFiltroCargo(p.cargo || '');
    setFiltroCodigoGrado(p.codigo && p.grado ? `${p.codigo}-${p.grado}` : '');
    setFiltroDependencia(p.dependencia_cargo || '');
    setFiltroSituacion(p.situacion_administrativa || '');
    setFiltroSideap(p.id_sideap != null ? String(p.id_sideap) : '');
    setFiltroPerno(p.id_perno != null ? String(p.id_perno) : '');

    if (p.requisitos) {
      setFormacionExigida(p.requisitos);
    }

    // Funciones
    if (Array.isArray(p.funciones) && p.funciones.length > 0) {
      setFuncionesTexto(p.funciones.join('\n'));
    } else {
      const matchCargo = cargos.find(c =>
        c.nombre.toLowerCase().trim() === p.cargo.toLowerCase().trim()
      );
      if (matchCargo && Array.isArray(matchCargo.funciones_cargo) && matchCargo.funciones_cargo.length > 0) {
        setFuncionesTexto(matchCargo.funciones_cargo.join('\n'));
      }
    }

    // Meses de experiencia exigidos
    const matchCargo = cargos.find(c =>
        c.nombre.toLowerCase().trim() === p.cargo.toLowerCase().trim()
    );
    if (matchCargo && matchCargo.requisito_experiencia_meses) {
      setMesesExigidos(String(matchCargo.requisito_experiencia_meses));
      if (!p.requisitos && matchCargo.requisitos_formacion) {
        setFormacionExigida(matchCargo.requisitos_formacion);
      }
    } else if (p.requisitos) {
      const matchMeses = p.requisitos.match(/(\d{1,3})\s*meses/i);
      if (matchMeses && matchMeses[1]) {
        setMesesExigidos(matchMeses[1]);
      }
    }
  };

  const limpiarFiltros = () => {
    setFiltroCargo('');
    setFiltroCodigoGrado('');
    setFiltroDependencia('');
    setFiltroSituacion('');
    setFiltroSideap('');
    setFiltroPerno('');
    setPlazaSeleccionada(null);
  };

  const abrirPicker = (tipo: PickerTipo) => {
    setPickerTipo(tipo);
    setPickerBusqueda('');
    setPickerVisible(true);
  };

  const getTituloPicker = () => {
    switch (pickerTipo) {
      case 'cargo': return 'Seleccionar Denominación del Cargo';
      case 'codigoGrado': return 'Seleccionar Código y Grado';
      case 'dependencia': return 'Seleccionar Dependencia';
      case 'situacion': return 'Seleccionar Situación Administrativa Titular del Cargo';
      case 'sideap': return 'Seleccionar por ID SIDEAP';
      case 'perno': return 'Seleccionar por ID PERNO';
      default: return 'Seleccionar Opción';
    }
  };

  const opcionesModal = useMemo(() => {
    if (!pickerTipo) return [];
    if (pickerTipo === 'cargo') {
      return listaCargos.map(cargo => {
        const cant = planta.filter(p => p.cargo.toLowerCase() === cargo.toLowerCase()).length;
        return {
          valor: cargo,
          etiquetaPrincipal: cargo,
          etiquetaSecundaria: cant > 0 ? `${cant} plaza(s) en planta SJD` : 'Cargo del manual oficial',
          badge: undefined,
          seleccionado: filtroCargo.toLowerCase() === cargo.toLowerCase()
        };
      });
    }
    if (pickerTipo === 'codigoGrado') {
      return listaCodigoGrado.map(cg => ({
        valor: cg.valor,
        etiquetaPrincipal: cg.etiqueta,
        etiquetaSecundaria: `${cg.count} plaza(s) disponibles`,
        badge: undefined,
        seleccionado: filtroCodigoGrado === cg.valor
      }));
    }
    if (pickerTipo === 'dependencia') {
      return listaDependencias.map(dep => ({
        valor: dep.valor,
        etiquetaPrincipal: dep.etiqueta,
        etiquetaSecundaria: `${dep.count} plaza(s) en esta dependencia`,
        badge: undefined,
        seleccionado: filtroDependencia.toLowerCase() === dep.valor.toLowerCase()
      }));
    }
    if (pickerTipo === 'situacion') {
      return listaSituaciones.map(sit => {
        const isVacante = sit.valor.toUpperCase().includes('VACANTE');
        const isPropiedad = sit.valor.toUpperCase().includes('PROPIEDAD');
        return {
          valor: sit.valor,
          etiquetaPrincipal: sit.etiqueta,
          etiquetaSecundaria: `${sit.count} plaza(s) registradas con esta situación`,
          badge: isVacante ? 'VACANCIA' : (isPropiedad ? 'EN PROPIEDAD' : 'ACTIVO'),
          seleccionado: filtroSituacion.toLowerCase() === sit.valor.toLowerCase()
        };
      });
    }
    if (pickerTipo === 'sideap') {
      return listaSideap.map(s => ({
        valor: s.valor,
        etiquetaPrincipal: s.etiquetaPrincipal,
        etiquetaSecundaria: s.etiquetaSecundaria,
        badge: s.badge,
        plaza: s.plaza,
        seleccionado: filtroSideap === s.valor
      }));
    }
    if (pickerTipo === 'perno') {
      return listaPerno.map(p => ({
        valor: p.valor,
        etiquetaPrincipal: p.etiquetaPrincipal,
        etiquetaSecundaria: p.etiquetaSecundaria,
        badge: p.badge,
        plaza: p.plaza,
        seleccionado: filtroPerno === p.valor
      }));
    }
    return [];
  }, [pickerTipo, listaCargos, listaCodigoGrado, listaDependencias, listaSituaciones, listaSideap, listaPerno, planta, filtroCargo, filtroCodigoGrado, filtroDependencia, filtroSituacion, filtroSideap, filtroPerno]);

  const opcionesModalFiltradas = useMemo(() => {
    if (!pickerBusqueda.trim()) return opcionesModal;
    const q = pickerBusqueda.toLowerCase().trim();
    return opcionesModal.filter(o =>
      o.etiquetaPrincipal.toLowerCase().includes(q) ||
      (o.etiquetaSecundaria && o.etiquetaSecundaria.toLowerCase().includes(q)) ||
      (o.badge && o.badge.toLowerCase().includes(q))
    );
  }, [opcionesModal, pickerBusqueda]);

  const seleccionarOpcionModal = (item: any) => {
    if (pickerTipo === 'sideap') {
      const p = planta.find(pl => String(pl.id_sideap) === item.valor);
      if (p) {
        aplicarPlazaCompleta(p);
      } else {
        setFiltroSideap(item.valor);
        setIdSideap(item.valor);
      }
    } else if (pickerTipo === 'perno') {
      const p = planta.find(pl => String(pl.id_perno) === item.valor);
      if (p) {
        aplicarPlazaCompleta(p);
      } else {
        setFiltroPerno(item.valor);
        setIdPerno(item.valor);
      }
    } else if (pickerTipo === 'cargo') {
      setFiltroCargo(item.valor);
      setNombreCargo(item.valor);
      setFiltroCodigoGrado('');
      setFiltroDependencia('');
      setFiltroSituacion('');
      setFiltroSideap('');
      setFiltroPerno('');
      setPlazaSeleccionada(null);

      const matchC = cargos.find(c => c.nombre.toLowerCase().trim() === item.valor.toLowerCase().trim());
      if (matchC) {
        setCargoSeleccionado(matchC);
        setMesesExigidos(String(matchC.requisito_experiencia_meses || 54));
        if (matchC.requisitos_formacion) setFormacionExigida(matchC.requisitos_formacion);
        if (Array.isArray(matchC.funciones_cargo) && matchC.funciones_cargo.length > 0) {
          setFuncionesTexto(matchC.funciones_cargo.join('\n'));
        }
      }
    } else if (pickerTipo === 'codigoGrado') {
      setFiltroCodigoGrado(item.valor);
      const parts = item.valor.split('-');
      if (parts[0]) setCodigoCargo(parts[0]);
      if (parts[1]) setGradoCargo(parts[1]);
      setFiltroDependencia('');
      setFiltroSituacion('');
      setFiltroSideap('');
      setFiltroPerno('');
      setPlazaSeleccionada(null);
    } else if (pickerTipo === 'dependencia') {
      setFiltroDependencia(item.valor);
      setDependenciaCargo(item.valor);
      const coincidentes = planta.filter(p => {
        if (filtroCargo && p.cargo.toLowerCase() !== filtroCargo.toLowerCase()) return false;
        if (filtroCodigoGrado && `${p.codigo || ''}-${p.grado || ''}` !== filtroCodigoGrado) return false;
        if (filtroSituacion && ((p.situacion_administrativa || '').trim() || 'NO ESPECIFICADA').toLowerCase() !== filtroSituacion.toLowerCase()) return false;
        return (p.dependencia_cargo || '').toLowerCase() === item.valor.toLowerCase();
      });
      if (coincidentes.length === 1) {
        aplicarPlazaCompleta(coincidentes[0]);
      }
    } else if (pickerTipo === 'situacion') {
      setFiltroSituacion(item.valor);
      const coincidentes = planta.filter(p => {
        if (filtroCargo && p.cargo.toLowerCase() !== filtroCargo.toLowerCase()) return false;
        if (filtroCodigoGrado && `${p.codigo || ''}-${p.grado || ''}` !== filtroCodigoGrado) return false;
        if (filtroDependencia && (p.dependencia_cargo || '').toLowerCase() !== filtroDependencia.toLowerCase()) return false;
        const sit = (p.situacion_administrativa || '').trim() || 'NO ESPECIFICADA';
        return sit.toLowerCase() === item.valor.toLowerCase();
      });
      if (coincidentes.length === 1) {
        aplicarPlazaCompleta(coincidentes[0]);
      }
    }
    setPickerVisible(false);
  };

  // Selección de archivos PDF con expo-document-picker
  const seleccionarArchivos = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets) return;

      const nuevosArchivos: Array<{ name: string; base64: string; size?: number }> = [];

      for (const asset of result.assets) {
        let base64 = '';
        if (Platform.OS === 'web' && asset.file) {
          base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(asset.file as Blob);
          });
        } else {
          // En móvil nativo Expo
          const FileSystem = require('expo-file-system');
          base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64
          });
        }

        nuevosArchivos.push({
          name: asset.name,
          base64: base64,
          size: asset.size
        });
      }

      setArchivosPdf(prev => [...prev, ...nuevosArchivos]);
    } catch (err: any) {
      mostrarMensaje('Error al seleccionar archivos', err.message || 'No se pudieron cargar los archivos.');
    }
  };

  const eliminarArchivo = (index: number) => {
    setArchivosPdf(prev => prev.filter((_, i) => i !== index));
  };

  const iniciarAnalisisIA = async () => {
    if (!nombreCargo.trim()) {
      mostrarMensaje('Datos Incompletos', 'Debes ingresar el nombre del cargo a evaluar.');
      return;
    }
    if (archivosPdf.length === 0) {
      mostrarMensaje('Sin Certificados', 'Debes adjuntar al menos un archivo PDF de certificación laboral.');
      return;
    }

    try {
      setAnalizando(true);
      setProgresoTexto('Preparando certificados y enviando a Gemini...');

      const funcionesArray = funcionesTexto
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const cargoPayload: CargoEvaluado = {
        id: cargoSeleccionado?.id,
        id_sideap: idSideap ? parseInt(String(idSideap), 10) : undefined,
        id_perno: idPerno ? parseInt(String(idPerno), 10) : undefined,
        id_plaza: idPlaza ?? undefined,
        nombre: nombreCargo,
        codigo: codigoCargo,
        grado: gradoCargo,
        dependencia: dependenciaCargo,
        requisito_experiencia_meses: parseFloat(mesesExigidos) || 54,
        requisitos_formacion: formacionExigida,
        funciones_cargo: funcionesArray
      };

      const candidatoPayload = {
        nombre: candidatoNombre || 'Candidato en Evaluación',
        documento: candidatoDoc || 'NO CONSTA',
        email: candidatoEmail,
        telefono: candidatoTel
      };

      setProgresoTexto('Analizando documentos con IA y cotejando funciones oficiales...');
      const resultado = await ingresosService.analizarDocumentos(
        archivosPdf,
        cargoPayload,
        candidatoPayload
      );

      setProgresoTexto('Auditando traslapes y calculando tiempos válidos...');
      setAnalisisResultado(resultado);
      setAnalizando(false);
    } catch (err: any) {
      setAnalizando(false);
      mostrarMensaje('Error en el Análisis', err.message || 'Ocurrió un error al procesar los documentos.');
    }
  };

  const confirmarYGuardar = async () => {
    if (!analisisResultado) return;
    try {
      setGuardando(true);
      const res = await ingresosService.guardarValidacion(analisisResultado);
      setGuardando(false);
      router.replace(`/ingresos/${res.id}`);
    } catch (err: any) {
      setGuardando(false);
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar la validación en la base de datos.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#0F172A',
          paddingTop: Platform.OS === 'ios' ? 50 : 20,
          paddingBottom: 20,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B'
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
            Nueva Validación de Ingreso
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, maxWidth: 1100, alignSelf: 'center', width: '100%' }}>
        {!analisisResultado ? (
          <>
            {/* SECCIÓN 1: DATOS DEL CARGO Y FUNCIONES OFICIALES */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 22,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 20
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Ionicons name="briefcase" size={22} color="#991B1B" />
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>
                  1. Perfil del Cargo y Funciones Oficiales del Manual
                </Text>
              </View>

              {/* SECCIÓN DE DESPLEGABLES: PLANTA OFICIAL SJD */}
              <View
                style={{
                  marginBottom: 20,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0'
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="filter-circle" size={22} color="#991B1B" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                      Selección por Planta Oficial SJD:
                    </Text>
                    <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#4338CA' }}>
                        {planta.length > 0 ? `${planta.length} plazas` : `${cargos.length} cargos`}
                      </Text>
                    </View>
                  </View>

                  {(filtroCargo || filtroCodigoGrado || filtroDependencia || filtroSituacion || filtroSideap || filtroPerno || plazaSeleccionada) ? (
                    <TouchableOpacity
                      onPress={limpiarFiltros}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: '#FEE2E2',
                        borderWidth: 1,
                        borderColor: '#FECACA'
                      }}
                    >
                      <Ionicons name="refresh-outline" size={14} color="#991B1B" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#991B1B' }}>
                        Restablecer Filtros
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* FILA 1: DESPLEGABLES PRINCIPALES (CARGO, CÓDIGO-GRADO, DEPENDENCIA) */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  {/* Desplegable 1: Cargo / Denominación */}
                  <View style={{ flex: 2, minWidth: 220 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 }}>
                      Denominación del Cargo
                    </Text>
                    <TouchableOpacity
                      onPress={() => abrirPicker('cargo')}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: filtroCargo ? '#2563EB' : '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 42
                      }}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 6 }}>
                        <Ionicons name="briefcase-outline" size={16} color={filtroCargo ? '#2563EB' : '#64748B'} />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: filtroCargo ? '700' : '500',
                            color: filtroCargo ? '#0F172A' : '#94A3B8'
                          }}
                          numberOfLines={1}
                        >
                          {filtroCargo || 'Todos los cargos...'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {/* Desplegable 2: Código y Grado */}
                  <View style={{ flex: 1.2, minWidth: 160 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 }}>
                      Código y Grado
                    </Text>
                    <TouchableOpacity
                      onPress={() => abrirPicker('codigoGrado')}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: filtroCodigoGrado ? '#2563EB' : '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 42
                      }}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 6 }}>
                        <Ionicons name="layers-outline" size={16} color={filtroCodigoGrado ? '#2563EB' : '#64748B'} />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: filtroCodigoGrado ? '700' : '500',
                            color: filtroCodigoGrado ? '#0F172A' : '#94A3B8'
                          }}
                          numberOfLines={1}
                        >
                          {filtroCodigoGrado
                            ? `Cód. ${filtroCodigoGrado.split('-')[0]} - Gr. ${filtroCodigoGrado.split('-')[1]}`
                            : 'Todos los grados...'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {/* Desplegable 3: Dependencia */}
                  <View style={{ flex: 2, minWidth: 220 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 }}>
                      Dependencia
                    </Text>
                    <TouchableOpacity
                      onPress={() => abrirPicker('dependencia')}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: filtroDependencia ? '#2563EB' : '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 42
                      }}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 6 }}>
                        <Ionicons name="business-outline" size={16} color={filtroDependencia ? '#2563EB' : '#64748B'} />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: filtroDependencia ? '700' : '500',
                            color: filtroDependencia ? '#0F172A' : '#94A3B8'
                          }}
                          numberOfLines={1}
                        >
                          {filtroDependencia || 'Todas las dependencias...'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* FILA 2: SITUACIÓN ADMINISTRATIVA TITULAR DEL CARGO E IDENTIFICADORES DIRECTOS */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {/* Desplegable 4: Situación Administrativa Titular del Cargo */}
                  <View style={{ flex: 2, minWidth: 240 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 }}>
                      Situación Administrativa Titular del Cargo
                    </Text>
                    <TouchableOpacity
                      onPress={() => abrirPicker('situacion')}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: filtroSituacion
                          ? (filtroSituacion.toUpperCase().includes('VACANTE') ? '#D97706' : filtroSituacion.toUpperCase().includes('PROPIEDAD') ? '#059669' : '#2563EB')
                          : '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 42
                      }}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 6 }}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={16}
                          color={
                            filtroSituacion
                              ? (filtroSituacion.toUpperCase().includes('VACANTE') ? '#D97706' : filtroSituacion.toUpperCase().includes('PROPIEDAD') ? '#059669' : '#2563EB')
                              : '#64748B'
                          }
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: filtroSituacion ? '800' : '500',
                            color: filtroSituacion
                              ? (filtroSituacion.toUpperCase().includes('VACANTE') ? '#B45309' : filtroSituacion.toUpperCase().includes('PROPIEDAD') ? '#047857' : '#1D4ED8')
                              : '#94A3B8'
                          }}
                          numberOfLines={1}
                        >
                          {filtroSituacion || 'Todas las situaciones...'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {/* Desplegable 5: ID SIDEAP */}
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 }}>
                      ID SIDEAP
                    </Text>
                    <TouchableOpacity
                      onPress={() => abrirPicker('sideap')}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: filtroSideap ? '#4338CA' : '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 42
                      }}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 6 }}>
                        <Ionicons name="finger-print-outline" size={16} color={filtroSideap ? '#4338CA' : '#64748B'} />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: filtroSideap ? '800' : '500',
                            color: filtroSideap ? '#4338CA' : '#94A3B8'
                          }}
                          numberOfLines={1}
                        >
                          {filtroSideap ? `SIDEAP #${filtroSideap}` : 'ID SIDEAP...'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {/* Desplegable 6: ID PERNO */}
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 }}>
                      ID PERNO
                    </Text>
                    <TouchableOpacity
                      onPress={() => abrirPicker('perno')}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: filtroPerno ? '#B45309' : '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 42
                      }}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 6 }}>
                        <Ionicons name="bookmark-outline" size={16} color={filtroPerno ? '#B45309' : '#64748B'} />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: filtroPerno ? '800' : '500',
                            color: filtroPerno ? '#B45309' : '#94A3B8'
                          }}
                          numberOfLines={1}
                        >
                          {filtroPerno ? `PERNO #${filtroPerno}` : 'ID PERNO...'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* BANNER DE PLAZA OFICIAL SELECCIONADA */}
                {plazaSeleccionada ? (
                  <View
                    style={{
                      marginTop: 12,
                      backgroundColor: '#F0FDF4',
                      borderWidth: 1,
                      borderColor: '#BBF7D0',
                      borderRadius: 8,
                      padding: 12,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 260 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>
                          Plaza Oficial Asignada:
                        </Text>
                        {plazaSeleccionada.id_sideap != null && (
                          <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#86EFAC' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                              SIDEAP #{plazaSeleccionada.id_sideap}
                            </Text>
                          </View>
                        )}
                        {plazaSeleccionada.id_perno != null && (
                          <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#FDE68A' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                              PERNO #{plazaSeleccionada.id_perno}
                            </Text>
                          </View>
                        )}
                        {plazaSeleccionada.situacion_administrativa ? (
                          <View
                            style={{
                              backgroundColor: plazaSeleccionada.situacion_administrativa.toUpperCase().includes('VACANTE')
                                ? '#FEF3C7'
                                : plazaSeleccionada.situacion_administrativa.toUpperCase().includes('PROPIEDAD')
                                ? '#DCFCE7'
                                : '#EFF6FF',
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 4,
                              borderWidth: 1,
                              borderColor: plazaSeleccionada.situacion_administrativa.toUpperCase().includes('VACANTE')
                                ? '#FDE68A'
                                : plazaSeleccionada.situacion_administrativa.toUpperCase().includes('PROPIEDAD')
                                ? '#86EFAC'
                                : '#BFDBFE'
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '800',
                                color: plazaSeleccionada.situacion_administrativa.toUpperCase().includes('VACANTE')
                                  ? '#B45309'
                                  : plazaSeleccionada.situacion_administrativa.toUpperCase().includes('PROPIEDAD')
                                  ? '#15803D'
                                  : '#1D4ED8'
                              }}
                            >
                              SITUACIÓN: {plazaSeleccionada.situacion_administrativa}
                            </Text>
                          </View>
                        ) : null}
                        {plazaSeleccionada.id_plaza != null && (
                          <Text style={{ fontSize: 11, color: '#64748B' }}>
                            (Plaza #{plazaSeleccionada.id_plaza})
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                        <Text style={{ fontWeight: '700' }}>{plazaSeleccionada.cargo}</Text> (Cód. {plazaSeleccionada.codigo || 'N/A'} - Gr. {plazaSeleccionada.grado || 'N/A'}) • {plazaSeleccionada.dependencia_cargo || 'Sin dependencia'}
                      </Text>
                      {plazaSeleccionada.titular_nombre ? (
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          Titular en nómina: {plazaSeleccionada.titular_nombre} ({plazaSeleccionada.tipo_vinculacion || 'N/A'})
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {/* LISTA RÁPIDA DE COINCIDENCIAS CUANDO SE FILTRA Y HAY MENOS DE 6 PLAZAS */}
                {!plazaSeleccionada && (filtroCargo || filtroCodigoGrado || filtroDependencia || filtroSituacion) && plazasFiltradas.length > 0 && plazasFiltradas.length <= 6 && (
                  <View style={{ marginTop: 12, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                      {plazasFiltradas.length} plaza(s) coincidente(s) - Haz clic para seleccionar:
                    </Text>
                    <View style={{ gap: 6 }}>
                      {plazasFiltradas.map((pl) => (
                        <TouchableOpacity
                          key={pl.id_plaza}
                          onPress={() => aplicarPlazaCompleta(pl)}
                          style={{
                            padding: 8,
                            borderRadius: 6,
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                                {pl.cargo}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#475569' }}>
                                Cód. {pl.codigo || 'N/A'} - Gr. {pl.grado || 'N/A'}
                              </Text>
                              {pl.situacion_administrativa ? (
                                <View style={{
                                  backgroundColor: pl.situacion_administrativa.toUpperCase().includes('VACANTE') ? '#FEF3C7' : '#EFF6FF',
                                  paddingHorizontal: 5,
                                  paddingVertical: 1,
                                  borderRadius: 4
                                }}>
                                  <Text style={{
                                    fontSize: 10,
                                    fontWeight: '800',
                                    color: pl.situacion_administrativa.toUpperCase().includes('VACANTE') ? '#92400E' : '#1E40AF'
                                  }}>
                                    {pl.situacion_administrativa}
                                  </Text>
                                </View>
                              ) : null}
                              {pl.id_sideap != null && (
                                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#4338CA' }}>SIDEAP #{pl.id_sideap}</Text>
                                </View>
                              )}
                              {pl.id_perno != null && (
                                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#92400E' }}>PERNO #{pl.id_perno}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
                              {pl.dependencia_cargo}
                            </Text>
                          </View>
                          <Ionicons name="arrow-forward-circle" size={18} color="#2563EB" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* CAMPOS DEL CARGO Y PLAZA EVALUADOS (EDITABLES) */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
                {/* ID SIDEAP */}
                <View style={{ flex: 1, minWidth: 110 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    ID SIDEAP
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Ej: 4998"
                    placeholderTextColor="#94A3B8"
                    value={idSideap}
                    onChangeText={setIdSideap}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A',
                      fontWeight: '700'
                    }}
                  />
                </View>

                {/* ID PERNO */}
                <View style={{ flex: 1, minWidth: 110 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    ID PERNO
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Ej: 11"
                    placeholderTextColor="#94A3B8"
                    value={idPerno}
                    onChangeText={setIdPerno}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A',
                      fontWeight: '700'
                    }}
                  />
                </View>

                {/* Badge ID Plaza */}
                {idPlaza != null ? (
                  <View style={{ justifyContent: 'center', minWidth: 90, paddingTop: 18 }}>
                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}>
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Plaza Planta</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>#{idPlaza}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Código */}
                <View style={{ flex: 1, minWidth: 90 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Código
                  </Text>
                  <TextInput
                    value={codigoCargo}
                    onChangeText={setCodigoCargo}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A'
                    }}
                  />
                </View>

                {/* Grado */}
                <View style={{ flex: 1, minWidth: 90 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Grado
                  </Text>
                  <TextInput
                    value={gradoCargo}
                    onChangeText={setGradoCargo}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A'
                    }}
                  />
                </View>

                {/* Meses Requeridos */}
                <View style={{ flex: 1, minWidth: 130 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#991B1B', marginBottom: 6 }}>
                    Meses Requeridos *
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    value={mesesExigidos}
                    onChangeText={setMesesExigidos}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#991B1B',
                      fontWeight: '800'
                    }}
                  />
                </View>
              </View>

              {/* Nombre del Cargo */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                  Nombre del Cargo *
                </Text>
                <TextInput
                  value={nombreCargo}
                  onChangeText={setNombreCargo}
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: '#FFFFFF',
                    fontSize: 14,
                    color: '#0F172A',
                    fontWeight: '600'
                  }}
                />
              </View>

              {/* Dependencia */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                  Dependencia
                </Text>
                <TextInput
                  value={dependenciaCargo}
                  onChangeText={setDependenciaCargo}
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: '#FFFFFF',
                    fontSize: 14,
                    color: '#0F172A'
                  }}
                />
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                  Requisitos de Formación Académica
                </Text>
                <TextInput
                  value={formacionExigida}
                  onChangeText={setFormacionExigida}
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: '#FFFFFF',
                    fontSize: 14,
                    color: '#0F172A'
                  }}
                />
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                  Funciones Oficiales del Cargo (Manual de Funciones) - Una por línea *
                </Text>
                <TextInput
                  multiline
                  numberOfLines={5}
                  value={funcionesTexto}
                  onChangeText={setFuncionesTexto}
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: '#FFFFFF',
                    fontSize: 13,
                    color: '#0F172A',
                    minHeight: 110,
                    textAlignVertical: 'top'
                  }}
                />
              </View>
            </View>

            {/* SECCIÓN 2: DATOS DEL CANDIDATO */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 22,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 20
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Ionicons name="person" size={22} color="#991B1B" />
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>
                  2. Datos del Aspirante / Candidato
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                <View style={{ flex: 1, minWidth: 240 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Nombre Completo
                  </Text>
                  <TextInput
                    placeholder="Ej. Carlos Andrés Mendoza"
                    placeholderTextColor="#94A3B8"
                    value={candidatoNombre}
                    onChangeText={setCandidatoNombre}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A'
                    }}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 200 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Número de Documento / Cédula
                  </Text>
                  <TextInput
                    placeholder="Ej. 1018456789"
                    placeholderTextColor="#94A3B8"
                    value={candidatoDoc}
                    onChangeText={setCandidatoDoc}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A'
                    }}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 200 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Correo Electrónico
                  </Text>
                  <TextInput
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor="#94A3B8"
                    value={candidatoEmail}
                    onChangeText={setCandidatoEmail}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A'
                    }}
                  />
                </View>
              </View>
            </View>

            {/* SECCIÓN 3: SUBIDA DE CERTIFICADOS EN PDF */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 22,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 24
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="document-attach" size={22} color="#991B1B" />
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>
                    3. Certificados Laborales (PDF)
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={seleccionarArchivos}
                  style={{
                    backgroundColor: '#1E293B',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    Adjuntar Certificados
                  </Text>
                </TouchableOpacity>
              </View>

              {archivosPdf.length === 0 ? (
                <TouchableOpacity
                  onPress={seleccionarArchivos}
                  style={{
                    borderWidth: 2,
                    borderColor: '#CBD5E1',
                    borderStyle: 'dashed',
                    borderRadius: 12,
                    padding: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F8FAFC'
                  }}
                >
                  <Ionicons name="document-text-outline" size={44} color="#94A3B8" />
                  <Text style={{ marginTop: 10, fontSize: 15, fontWeight: '700', color: '#1E293B' }}>
                    Haz clic aquí para seleccionar los certificados PDF
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                    Puedes seleccionar uno o varios archivos simultáneamente.
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 10 }}>
                  {archivosPdf.map((file, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        backgroundColor: '#F1F5F9',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#E2E8F0'
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Ionicons name="document" size={24} color="#DC2626" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                            {file.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748B' }}>
                            Certificado #{idx + 1}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => eliminarArchivo(idx)}
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* BOTÓN DE ACCIÓN PRINCIPAL */}
            <TouchableOpacity
              onPress={iniciarAnalisisIA}
              disabled={analizando}
              style={{
                backgroundColor: '#991B1B',
                paddingVertical: 16,
                borderRadius: 10,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#991B1B',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8
              }}
            >
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                Ejecutar Análisis y Cotejo con IA Gemini
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* VISTA PREVIA INMEDIATA DEL ANÁLISIS */
          <View style={{ gap: 20 }}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 24,
                borderWidth: 1,
                borderColor: '#E2E8F0'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>DICTAMEN PRELIMINAR</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                    {analisisResultado.candidato.nombre}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>
                    Cédula: {analisisResultado.candidato.documento} • Cargo: {analisisResultado.cargo_evaluado.nombre}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor:
                      analisisResultado.consolidado.resultado_final === 'CUMPLE'
                        ? '#DCFCE7'
                        : analisisResultado.consolidado.resultado_final === 'NO_CUMPLE'
                        ? '#FEE2E2'
                        : '#FEF3C7',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color:
                        analisisResultado.consolidado.resultado_final === 'CUMPLE'
                          ? '#16A34A'
                          : analisisResultado.consolidado.resultado_final === 'NO_CUMPLE'
                          ? '#DC2626'
                          : '#D97706'
                    }}
                  >
                    {analisisResultado.consolidado.resultado_final.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  padding: 16,
                  marginTop: 18,
                  borderLeftWidth: 4,
                  borderLeftColor: '#0F172A'
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
                  Justificación Técnica:
                </Text>
                <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20 }}>
                  {analisisResultado.consolidado.justificacion}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 18 }}>
                <View style={{ flex: 1, minWidth: 150, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Requisito Exigido</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>
                    {analisisResultado.consolidado.requisito_minimo_meses} meses
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 150, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Exp. Relacionada Neta</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#16A34A' }}>
                    {analisisResultado.consolidado.experiencia_relacionada_meses} meses
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 150, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Excluido por Traslapes</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#DC2626' }}>
                    {analisisResultado.consolidado.tiempo_excluido_por_traslapes_meses} meses
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 150, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Diferencia</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>
                    {analisisResultado.consolidado.diferencia_meses >= 0 ? '+' : ''}
                    {analisisResultado.consolidado.diferencia_meses} meses
                  </Text>
                </View>
              </View>
            </View>

            {/* SECCIÓN: TÍTULOS ACADÉMICOS Y TARJETA PROFESIONAL */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 18,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                gap: 12
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="school" size={20} color="#1E40AF" />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    Títulos Académicos y Tarjeta Profesional
                  </Text>
                </View>
                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#3730A3' }}>
                    {analisisResultado.formacion_academica && analisisResultado.formacion_academica.length > 0
                      ? `${analisisResultado.formacion_academica.length} documento(s) formativo(s)`
                      : '0 detectados'}
                  </Text>
                </View>
              </View>

              {(!analisisResultado.formacion_academica || analisisResultado.formacion_academica.length === 0) ? (
                <View style={{ padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                    No se detectaron diplomas, actas de grado ni tarjetas profesionales en el lote de archivos adjuntos. Si el cargo exige título o tarjeta, asegúrate de adjuntar el PDF correspondiente.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {analisisResultado.formacion_academica.map((fa, idx) => (
                    <View
                      key={fa.id || idx}
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: fa.cumple_requisito_cargo ? '#BBF7D0' : '#E2E8F0'
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <Ionicons
                            name={fa.tipo === 'TARJETA_PROFESIONAL' ? 'card-outline' : 'school-outline'}
                            size={18}
                            color={fa.cumple_requisito_cargo ? '#15803D' : '#2563EB'}
                          />
                          <View>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                              {fa.titulo_obtenido}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
                              {fa.institucion} {fa.fecha_grado && fa.fecha_grado !== 'NO CONSTA' ? `• Fecha: ${fa.fecha_grado}` : ''}
                            </Text>
                            {fa.numero_tarjeta_o_registro && fa.numero_tarjeta_o_registro !== 'NO CONSTA' ? (
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF', marginTop: 2 }}>
                                Registro / Tarjeta N°: {fa.numero_tarjeta_o_registro}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            backgroundColor: fa.cumple_requisito_cargo ? '#DCFCE7' : '#FEF3C7',
                            borderWidth: 1,
                            borderColor: fa.cumple_requisito_cargo ? '#86EFAC' : '#FDE68A'
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '800',
                              color: fa.cumple_requisito_cargo ? '#15803D' : '#B45309'
                            }}
                          >
                            {fa.cumple_requisito_cargo ? '✓ CUMPLE REQUISITO' : 'EN EVALUACIÓN'}
                          </Text>
                        </View>
                      </View>

                      {fa.justificacion ? (
                        <Text style={{ fontSize: 12, color: '#334155', marginTop: 8, fontStyle: 'italic' }}>
                          <Text style={{ fontWeight: '700' }}>Criterio:</Text> {fa.justificacion}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Resumen de Certificados Laborales Computados */}
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                Certificados de Experiencia Laboral Computados ({analisisResultado.certificados.length})
              </Text>

              {analisisResultado.certificados.map((c, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 10,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>
                      {c.id_certificado}: {c.entidad}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 4,
                        backgroundColor: c.clasificacion_experiencia === 'RELACIONADA' ? '#DCFCE7' : '#FEE2E2'
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: c.clasificacion_experiencia === 'RELACIONADA' ? '#16A34A' : '#DC2626'
                        }}
                      >
                        {c.clasificacion_experiencia}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                    Cargo: {c.cargo_certificado} • Periodo: {c.fecha_inicio} al {c.fecha_fin || 'Vigente'}
                  </Text>

                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                    Tiempo Certificado: {c.tiempo_certificado?.meses_totales_aproximados} meses ({c.tiempo_certificado?.anios}a, {c.tiempo_certificado?.meses}m, {c.tiempo_certificado?.dias}d)
                  </Text>

                  {/* 1. VERIFICACIÓN FORMAL DEL CERTIFICADO (7 CHECKS BÁSICOS) */}
                  {(() => {
                    const vf = c.verificacion_formal;
                    const c1 = vf ? vf.corresponde_aspirante : true;
                    const d1 = vf?.aspirante_nombre_doc || candidatoNombre || 'Consta en documento';
                    const c2 = vf ? vf.entidad_identificable : (!!c.entidad && c.entidad !== 'NO CONSTA');
                    const d2 = vf?.entidad_nombre || c.entidad;
                    const c3 = vf ? vf.suscriptor_identificable : (!!c.firmante && c.firmante !== 'NO CONSTA');
                    const d3 = vf?.suscriptor_nombre_cargo_calidad || (c.firmante ? `${c.firmante} - ${c.cargo_firmante || 'Suscriptor'}` : 'NO CONSTA');
                    const c4 = vf ? vf.cuenta_con_firma : (c.documento?.firma_visible ?? true);
                    const d4 = vf?.tipo_firma || (c.documento?.firma_visible ? 'Firma visible identificada' : 'Sin firma identificable');
                    const c5 = vf ? vf.fecha_expedicion_identificable : (!!c.fecha_expedicion && c.fecha_expedicion !== 'NO CONSTA');
                    const d5 = vf?.fecha_expedicion || c.fecha_expedicion || 'NO CONSTA';
                    const c6 = vf ? vf.documento_legible_integro : (c.documento?.documento_legible ?? true);
                    const d6 = vf?.detalle_legibilidad || (c.documento?.documento_legible ? 'Documento legible, íntegro y sin alteraciones' : 'Documento con ilegibilidad');
                    const c7 = vf ? vf.mecanismos_contacto_verificacion : true;
                    const d7 = vf?.mecanismos_contacto_cuales || (c.ciudad_expedicion ? `Ciudad: ${c.ciudad_expedicion} • Membrete institucional` : 'Membrete institucional de la entidad emisora');

                    const cumpleFormal = c1 && c2 && c3 && c4 && c5 && c6 && c7;

                    const items = [
                      { num: 1, texto: 'El certificado corresponde al aspirante y contiene su nombre completo e identificación.', ok: c1, detalle: d1 },
                      { num: 2, texto: 'Se identifica claramente la entidad o empresa que expide el certificado.', ok: c2, detalle: d2 },
                      { num: 3, texto: 'Se identifica el nombre, cargo y calidad de quien suscribe el documento.', ok: c3, detalle: d3 },
                      { num: 4, texto: 'El certificado cuenta con firma manuscrita, electrónica o digital, según corresponda.', ok: c4, detalle: d4 },
                      { num: 5, texto: 'Se identifica la fecha de expedición del certificado.', ok: c5, detalle: d5 },
                      { num: 6, texto: 'El documento es legible, íntegro y no presenta alteraciones visibles.', ok: c6, detalle: d6 },
                      { num: 7, texto: 'Se dispone de datos de contacto o mecanismos para verificar la información con la entidad emisora. (cuáles)', ok: c7, detalle: d7, esCuales: true }
                    ];

                    return (
                      <View
                        style={{
                          marginTop: 14,
                          backgroundColor: '#F8FAFC',
                          borderRadius: 8,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: '#E2E8F0'
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="checkbox-outline" size={17} color="#991B1B" />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                              1. Verificación formal del certificado
                            </Text>
                          </View>
                          <View
                            style={{
                              backgroundColor: cumpleFormal ? '#DCFCE7' : '#FEF3C7',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: cumpleFormal ? '#BBF7D0' : '#FDE68A'
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: cumpleFormal ? '#166534' : '#92400E' }}>
                              {cumpleFormal ? '✓ Cumple verificación formal' : '⚠️ Requiere revisión formal'}
                            </Text>
                          </View>
                        </View>

                        <View style={{ gap: 6 }}>
                          {items.map((it) => (
                            <View
                              key={it.num}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                gap: 8,
                                backgroundColor: '#FFFFFF',
                                padding: 8,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: it.ok ? '#E2E8F0' : '#FECACA'
                              }}
                            >
                              <Ionicons
                                name={it.ok ? 'checkmark-circle' : 'close-circle'}
                                size={16}
                                color={it.ok ? '#16A34A' : '#DC2626'}
                                style={{ marginTop: 1 }}
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', lineHeight: 16 }}>
                                  {it.texto}
                                </Text>
                                {it.detalle ? (
                                  <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                    {it.esCuales ? 'Mecanismos / Datos: ' : 'Consta: '}
                                    <Text style={{ fontWeight: it.esCuales ? '700' : '500', color: '#0F172A' }}>
                                      {it.detalle}
                                    </Text>
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })()}
                </View>
              ))}
            </View>

            {/* SECCIÓN AL FINAL: DOCUMENTOS Y CERTIFICACIONES QUE NO APLICAN */}
            <View
              style={{
                backgroundColor: '#FFFBEB',
                borderRadius: 12,
                padding: 18,
                borderWidth: 1,
                borderColor: '#FDE68A',
                gap: 12
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="alert-circle" size={22} color="#D97706" />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#92400E' }}>
                    Documentos y Certificaciones que NO Aplican
                  </Text>
                </View>
                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                    {analisisResultado.documentos_no_aplican && analisisResultado.documentos_no_aplican.length > 0
                      ? `${analisisResultado.documentos_no_aplican.length} excluido(s)`
                      : '0 excluidos'}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 12, color: '#78350F', lineHeight: 18 }}>
                Relación explícita de documentos que no constituyen experiencia laboral válida, certificaciones sin funciones o requisitos de ley, o documentos que no guardan relación con el perfil exigido.
              </Text>

              {(!analisisResultado.documentos_no_aplican || analisisResultado.documentos_no_aplican.length === 0) ? (
                <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
                  <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>
                    ✓ Todos los documentos aportados son válidos y computables para la evaluación del cargo.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {analisisResultado.documentos_no_aplican.map((doc, idx) => (
                    <View
                      key={doc.id || idx}
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#FECACA',
                        borderLeftWidth: 4,
                        borderLeftColor: '#DC2626'
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                        <View style={{ flex: 1, minWidth: 220 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                            {doc.descripcion || doc.nombre_archivo}
                          </Text>
                          {doc.entidad ? (
                            <Text style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
                              Entidad emisora: <Text style={{ fontWeight: '600' }}>{doc.entidad}</Text>
                            </Text>
                          ) : null}
                          {doc.nombre_archivo ? (
                            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                              Archivo: {doc.nombre_archivo}
                            </Text>
                          ) : null}
                        </View>

                        <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FCA5A5' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#DC2626' }}>
                            NO APLICA
                          </Text>
                        </View>
                      </View>

                      {/* Motivo por el cual no aplica */}
                      <View style={{ marginTop: 8, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#FECACA' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#991B1B' }}>
                          ¿Por qué no aplica al cargo?
                        </Text>
                        <Text style={{ fontSize: 12, color: '#7F1D1D', marginTop: 2, lineHeight: 17 }}>
                          {doc.motivo_no_aplica}
                        </Text>
                        {doc.sustento_criterio ? (
                          <Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 4, fontStyle: 'italic' }}>
                            Sustento / Criterio: {doc.sustento_criterio}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* BOTONES DE CONFIRMACIÓN */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setAnalisisResultado(null)}
                style={{
                  flex: 1,
                  backgroundColor: '#E2E8F0',
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#334155', fontWeight: '700', fontSize: 14 }}>
                  Volver a Editar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmarYGuardar}
                disabled={guardando}
                style={{
                  flex: 2,
                  backgroundColor: '#16A34A',
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {guardando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="save" size={18} color="#FFFFFF" />
                )}
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                  {guardando ? 'Guardando...' : 'Confirmar y Guardar Dictamen Oficial'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal Desplegable Universal para Selección de Planta Oficial */}
      <Modal
        visible={pickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              width: '100%',
              maxWidth: 600,
              maxHeight: '85%',
              borderWidth: 1,
              borderColor: '#CBD5E1',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
              overflow: 'hidden'
            }}
          >
            {/* Header del Modal */}
            <View
              style={{
                backgroundColor: '#0F172A',
                paddingHorizontal: 20,
                paddingVertical: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={
                    pickerTipo === 'sideap'
                      ? 'finger-print-outline'
                      : pickerTipo === 'perno'
                      ? 'bookmark-outline'
                      : pickerTipo === 'dependencia'
                      ? 'business-outline'
                      : pickerTipo === 'codigoGrado'
                      ? 'layers-outline'
                      : 'briefcase-outline'
                  }
                  size={20}
                  color="#F8FAFC"
                />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                  {getTituloPicker()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Barra de Filtro en Tiempo Real */}
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  height: 40
                }}
              >
                <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  placeholder={`Filtrar ${getTituloPicker().toLowerCase()}...`}
                  placeholderTextColor="#94A3B8"
                  value={pickerBusqueda}
                  onChangeText={setPickerBusqueda}
                  style={{ flex: 1, color: '#0F172A', fontSize: 13 }}
                  autoFocus={true}
                />
                {pickerBusqueda.length > 0 && (
                  <TouchableOpacity onPress={() => setPickerBusqueda('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 6, marginLeft: 2 }}>
                {opcionesModalFiltradas.length} opción(es) disponible(s)
              </Text>
            </View>

            {/* Lista Scrolleable de Opciones */}
            <ScrollView style={{ maxHeight: 380 }}>
              {opcionesModalFiltradas.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Ionicons name="search-outline" size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
                    No se encontraron opciones para "{pickerBusqueda}".
                  </Text>
                </View>
              ) : (
                opcionesModalFiltradas.map((item, idx) => {
                  return (
                    <TouchableOpacity
                      key={item.valor + '_' + idx}
                      onPress={() => seleccionarOpcionModal(item)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F1F5F9',
                        backgroundColor: item.seleccionado ? '#EFF6FF' : '#FFFFFF',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Ionicons
                          name={item.seleccionado ? 'checkmark-circle' : 'ellipse-outline'}
                          size={18}
                          color={item.seleccionado ? '#2563EB' : '#CBD5E1'}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: item.seleccionado ? '800' : '600',
                              color: item.seleccionado ? '#1E40AF' : '#0F172A'
                            }}
                          >
                            {item.etiquetaPrincipal}
                          </Text>
                          {item.etiquetaSecundaria && (
                            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                              {item.etiquetaSecundaria}
                            </Text>
                          )}
                        </View>
                      </View>

                      {item.badge ? (
                        <View
                          style={{
                            backgroundColor: '#FEF3C7',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#FDE68A'
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>
                            {item.badge}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Footer del Modal */}
            <View
              style={{
                padding: 12,
                backgroundColor: '#F8FAFC',
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  if (pickerTipo === 'cargo') setFiltroCargo('');
                  else if (pickerTipo === 'codigoGrado') setFiltroCodigoGrado('');
                  else if (pickerTipo === 'dependencia') setFiltroDependencia('');
                  else if (pickerTipo === 'situacion') setFiltroSituacion('');
                  else if (pickerTipo === 'sideap') setFiltroSideap('');
                  else if (pickerTipo === 'perno') setFiltroPerno('');
                  setPickerVisible(false);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
                  Quitar filtro de este campo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                style={{
                  backgroundColor: '#0F172A',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  Cerrar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Progreso del Análisis IA */}
      <Modal visible={analizando} transparent={true} animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 32,
              alignItems: 'center',
              maxWidth: 440,
              width: '100%'
            }}
          >
            <ActivityIndicator size="large" color="#991B1B" />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 18 }}>
              Analizando Certificados con IA
            </Text>
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              {progresoTexto || 'Procesando documentos y auditando requisitos...'}
            </Text>
            <View style={{ marginTop: 20, backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>
                Aplicando las 18 reglas de analista documental y cotejo funcional estricto.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Notificaciones (Regla: No alerts) */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Ionicons name="alert-circle" size={26} color="#991B1B" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>{modalTitle}</Text>
            </View>
            <Text style={{ fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 20 }}>
              {modalMessage}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                backgroundColor: '#0F172A',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
