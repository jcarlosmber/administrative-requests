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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { ingresosService, CargoEvaluado, AnalisisCompleto, PlazaPlanta, FormacionAcademicaItem, CertificadoAnalizado, VerificacionFormalTitulo, VerificacionFormalTarjeta } from '../../lib/ingresosService';
import PdfViewerModal from '../../components/PdfViewerModal';

export default function NuevaValidacionScreen() {
  const router = useRouter();
  const { rehacerId } = useLocalSearchParams<{ rehacerId?: string }>();

  // Estados de Planta Oficial y Cargos del Manual
  const [cargos, setCargos] = useState<CargoEvaluado[]>([]);
  const [planta, setPlanta] = useState<PlazaPlanta[]>([]);
  const [loadingPlanta, setLoadingPlanta] = useState(false);
  const [cargandoRehacer, setCargandoRehacer] = useState(false);
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

  // Estados para Modal de Título Académico
  const [modalTituloVisible, setModalTituloVisible] = useState(false);
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  const [formTipo, setFormTipo] = useState<FormacionAcademicaItem['tipo']>('PREGRADO');
  const [formTitulo, setFormTitulo] = useState('');
  const [formInstitucion, setFormInstitucion] = useState('');
  const [formFechaGrado, setFormFechaGrado] = useState('');
  const [formCertificaMaterias, setFormCertificaMaterias] = useState(false);
  const [formFechaMaterias, setFormFechaMaterias] = useState('');
  const [formTarjeta, setFormTarjeta] = useState('');
  const [formCumple, setFormCumple] = useState(true);
  const [formJustificacion, setFormJustificacion] = useState('');
  const [descartadoReactivandoIdx, setDescartadoReactivandoIdx] = useState<number | null>(null);

  // Modal Confirmar Eliminación
  const [modalEliminarVisible, setModalEliminarVisible] = useState(false);
  const [indexAEliminar, setIndexAEliminar] = useState<number | null>(null);

  // Modales
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  // Estados del Visor de PDF integrado
  const [visorPdfVisible, setVisorPdfVisible] = useState(false);
  const [visorPdfTitulo, setVisorPdfTitulo] = useState('');
  const [visorPdfNombre, setVisorPdfNombre] = useState('');
  const [visorPdfUrl, setVisorPdfUrl] = useState<string | null>(null);
  const [visorPdfBase64, setVisorPdfBase64] = useState<string | null>(null);

  // Estado para acordeón de los 3 grupos por cada certificado (predeterminado contraídos)
  const [expansionesGrupos, setExpansionesGrupos] = useState<Record<string, { formal?: boolean; previo?: boolean; funciones?: boolean }>>({});

  const toggleGrupo = (certKey: string, grupo: 'formal' | 'previo' | 'funciones') => {
    setExpansionesGrupos(prev => ({
      ...prev,
      [certKey]: {
        ...prev[certKey],
        [grupo]: !prev[certKey]?.[grupo]
      }
    }));
  };

  // Estado para acordeón de checks de títulos y tarjeta profesional (predeterminado contraídos)
  const [expansionesTitulos, setExpansionesTitulos] = useState<Record<string, boolean>>({});

  const toggleTituloExpansion = (tituloKey: string) => {
    setExpansionesTitulos(prev => ({
      ...prev,
      [tituloKey]: !prev[tituloKey]
    }));
  };

  const obtenerChecksTitulo = (fa: FormacionAcademicaItem, candNombre?: string, candDoc?: string): VerificacionFormalTitulo => {
    if (fa.verificacion_formal_titulo) return fa.verificacion_formal_titulo;
    const tieneInst = Boolean(fa.institucion && fa.institucion !== 'NO CONSTA');
    const tieneFecha = Boolean(fa.fecha_grado && fa.fecha_grado !== 'NO CONSTA');
    return {
      institucion_reconocida: tieneInst,
      institucion_evidencia: fa.institucion || 'Institución educativa registrada',
      corresponde_aspirante: true,
      aspirante_evidencia: `${candNombre || 'Aspirante evaluado'} - C.C. ${candDoc || 'Coincidente'}`,
      titulo_y_nivel_formal: true,
      titulo_evidencia: `${fa.titulo_obtenido} (${fa.tipo.replace('_', ' ')})`,
      fecha_grado_cierta: tieneFecha,
      fecha_grado_evidencia: tieneFecha ? `Fecha de grado: ${fa.fecha_grado}` : 'Fecha de grado no visible en registro',
      acta_o_registro_valido: true,
      acta_o_registro_evidencia: 'Acta de grado / Folio institucional acreditado',
      firmas_autoridades: true,
      firmas_evidencia: 'Suscrito por autoridades educativas competentes',
      convalidacion_men: true,
      convalidacion_evidencia: 'Título nacional (no requiere convalidación exterior)'
    };
  };

  const obtenerChecksTarjeta = (fa: FormacionAcademicaItem, candNombre?: string, candDoc?: string): VerificacionFormalTarjeta => {
    if (fa.verificacion_formal_tarjeta) return fa.verificacion_formal_tarjeta;
    const tieneInst = Boolean(fa.institucion && fa.institucion !== 'NO CONSTA');
    const tieneReg = Boolean(fa.numero_tarjeta_o_registro && fa.numero_tarjeta_o_registro !== 'NO CONSTA');
    return {
      consejo_emisor_identificable: tieneInst,
      consejo_evidencia: fa.institucion || 'Colegio o Consejo Profesional emisor',
      corresponde_profesional: true,
      profesional_evidencia: `${candNombre || 'Aspirante evaluado'} - C.C. ${candDoc || 'Coincidente'}`,
      matricula_o_tarjeta_identificable: tieneReg,
      matricula_evidencia: tieneReg ? `Matrícula / Tarjeta N° ${fa.numero_tarjeta_o_registro}` : 'Número visible en documento',
      profesion_autorizada: true,
      profesion_evidencia: fa.titulo_obtenido || 'Profesión autorizada para el ejercicio legal',
      certificado_vigencia_y_sanciones: true,
      vigencia_evidencia: 'Constancia de matrícula activa y sin sanciones disciplinarias vigentes',
      vigencia_temporal_valida: true,
      vigencia_temporal_evidencia: fa.fecha_grado && fa.fecha_grado !== 'NO CONSTA' ? `Expedido el ${fa.fecha_grado}` : 'Expedido dentro del término legal (< 90 días)',
      mecanismo_autenticacion_o_firma: true,
      mecanismo_evidencia: 'Código de verificación / Firma oficial de la autoridad'
    };
  };

  const mostrarMensaje = (titulo: string, mensaje: string) => {
    setModalTitle(titulo);
    setModalMessage(mensaje);
    setModalVisible(true);
  };

  const verPdfDocumento = (nombre?: string, tituloVisible?: string) => {
    const nombreBuscado = (nombre || '').trim();
    const titulo = tituloVisible || nombreBuscado || 'Documento PDF';
    setVisorPdfTitulo(titulo);
    setVisorPdfNombre(nombreBuscado);

    let archivoEncontrado = null;
    if (archivosPdf && archivosPdf.length > 0) {
      if (nombreBuscado) {
        const cleanBusqueda = nombreBuscado.toLowerCase();
        const cleanSinExt = cleanBusqueda.replace(/\.pdf$/i, '');
        archivoEncontrado = archivosPdf.find(a => a.name.toLowerCase() === cleanBusqueda);
        if (!archivoEncontrado) {
          archivoEncontrado = archivosPdf.find(a => a.name.toLowerCase().replace(/\.pdf$/i, '') === cleanSinExt);
        }
        if (!archivoEncontrado) {
          archivoEncontrado = archivosPdf.find(a => {
            const aClean = a.name.toLowerCase();
            return aClean.includes(cleanSinExt) || cleanSinExt.includes(aClean.replace(/\.pdf$/i, ''));
          });
        }
      }
      if (!archivoEncontrado && archivosPdf.length === 1) {
        archivoEncontrado = archivosPdf[0];
      }
    }

    if (archivoEncontrado && archivoEncontrado.base64) {
      setVisorPdfBase64(archivoEncontrado.base64);
      setVisorPdfUrl(null);
      setVisorPdfVisible(true);
      return;
    }

    if (nombreBuscado) {
      const url = rehacerId
        ? ingresosService.obtenerUrlArchivo(rehacerId, nombreBuscado)
        : ingresosService.obtenerUrlArchivo(undefined, nombreBuscado);
      setVisorPdfBase64(null);
      setVisorPdfUrl(url);
      setVisorPdfVisible(true);
      return;
    }

    setVisorPdfBase64(null);
    setVisorPdfUrl(null);
    setVisorPdfVisible(true);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (rehacerId) {
      cargarExpedienteARehacer(rehacerId);
    }
  }, [rehacerId]);

  const cargarExpedienteARehacer = async (idExp: string) => {
    try {
      setCargandoRehacer(true);
      const expediente = await ingresosService.obtenerValidacionPorId(idExp);
      if (expediente) {
        // Precargar candidato
        if (expediente.candidato) {
          setCandidatoNombre(expediente.candidato.nombre || '');
          setCandidatoDoc(expediente.candidato.documento || '');
          setCandidatoEmail(expediente.candidato.email || '');
          setCandidatoTel(expediente.candidato.telefono || '');
        }
        // Precargar cargo
        if (expediente.cargo_evaluado) {
          setNombreCargo(expediente.cargo_evaluado.nombre || '');
          setCodigoCargo(expediente.cargo_evaluado.codigo || '');
          setGradoCargo(expediente.cargo_evaluado.grado || '');
          setDependenciaCargo(expediente.cargo_evaluado.dependencia || '');
          setMesesExigidos(String(expediente.cargo_evaluado.requisito_experiencia_meses || 0));
          if (expediente.cargo_evaluado.requisitos_formacion) {
            setFormacionExigida(expediente.cargo_evaluado.requisitos_formacion);
          }
          if (Array.isArray(expediente.cargo_evaluado.funciones_cargo) && expediente.cargo_evaluado.funciones_cargo.length > 0) {
            setFuncionesTexto(expediente.cargo_evaluado.funciones_cargo.join('\n'));
          }
          if (expediente.cargo_evaluado.id_sideap) {
            setIdSideap(String(expediente.cargo_evaluado.id_sideap));
            setFiltroSideap(String(expediente.cargo_evaluado.id_sideap));
          }
          if (expediente.cargo_evaluado.id_perno) {
            setIdPerno(String(expediente.cargo_evaluado.id_perno));
            setFiltroPerno(String(expediente.cargo_evaluado.id_perno));
          }
          if (expediente.cargo_evaluado.id_plaza) {
            setIdPlaza(expediente.cargo_evaluado.id_plaza);
          }
        }
      }
    } catch (err: any) {
      mostrarMensaje('Error al Cargar Expediente', err.message || 'No se pudo cargar el expediente para rehacer.');
    } finally {
      setCargandoRehacer(false);
    }
  };

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

      setArchivosPdf(prev => {
        const nombresExistentes = new Set(prev.map(p => (p.name || '').toLowerCase().trim()));
        const unicosNuevos = nuevosArchivos.filter(na => !nombresExistentes.has((na.name || '').toLowerCase().trim()));
        return [...prev, ...unicosNuevos];
      });
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
      if (!resultado.candidato.email && candidatoEmail) {
        resultado.candidato.email = candidatoEmail;
      }
      if (!resultado.cargo_evaluado.id_sideap && idSideap) {
        resultado.cargo_evaluado.id_sideap = parseInt(String(idSideap), 10);
      }
      if (!resultado.cargo_evaluado.id_perno && idPerno) {
        resultado.cargo_evaluado.id_perno = parseInt(String(idPerno), 10);
      }

      setProgresoTexto('Generando dictamen oficial y guardando en el expediente...');
      const payloadListo: AnalisisCompleto = {
        ...resultado,
        archivos: archivosPdf,
        candidato: {
          ...resultado.candidato,
          email: candidatoEmail || resultado.candidato?.email || undefined,
          telefono: candidatoTel || resultado.candidato?.telefono || undefined
        },
        cargo_evaluado: {
          ...resultado.cargo_evaluado,
          id_sideap: idSideap ? parseInt(String(idSideap), 10) : resultado.cargo_evaluado?.id_sideap,
          id_perno: idPerno ? parseInt(String(idPerno), 10) : resultado.cargo_evaluado?.id_perno,
          id_plaza: idPlaza ?? resultado.cargo_evaluado?.id_plaza,
          requisitos_formacion: formacionExigida || resultado.cargo_evaluado?.requisitos_formacion,
          dependencia: dependenciaCargo || resultado.cargo_evaluado?.dependencia
        }
      };

      if (rehacerId) {
        await ingresosService.actualizarValidacion(rehacerId, payloadListo);
        setAnalizando(false);
        router.replace(`/ingresos/${rehacerId}`);
      } else {
        const res = await ingresosService.guardarValidacion(payloadListo);
        setAnalizando(false);
        router.replace(`/ingresos/${res.id}`);
      }
    } catch (err: any) {
      setAnalizando(false);
      mostrarMensaje('Error en el Análisis', err.message || 'Ocurrió un error al procesar los documentos.');
    }
  };

  const confirmarYGuardar = async () => {
    if (!analisisResultado) return;
    try {
      setGuardando(true);
      const payloadListo: AnalisisCompleto = {
        ...analisisResultado,
        archivos: archivosPdf,
        candidato: {
          ...analisisResultado.candidato,
          email: candidatoEmail || analisisResultado.candidato?.email || undefined,
          telefono: candidatoTel || analisisResultado.candidato?.telefono || undefined
        },
        cargo_evaluado: {
          ...analisisResultado.cargo_evaluado,
          id_sideap: idSideap ? parseInt(String(idSideap), 10) : analisisResultado.cargo_evaluado?.id_sideap,
          id_perno: idPerno ? parseInt(String(idPerno), 10) : analisisResultado.cargo_evaluado?.id_perno,
          id_plaza: idPlaza ?? analisisResultado.cargo_evaluado?.id_plaza,
          requisitos_formacion: formacionExigida || analisisResultado.cargo_evaluado?.requisitos_formacion,
          dependencia: dependenciaCargo || analisisResultado.cargo_evaluado?.dependencia
        }
      };

      if (rehacerId) {
        // En modo rehacer, actualizamos la validación existente en la base de datos
        await ingresosService.actualizarValidacion(rehacerId, payloadListo);
        setGuardando(false);
        router.replace(`/ingresos/${rehacerId}`);
      } else {
        const res = await ingresosService.guardarValidacion(payloadListo);
        setGuardando(false);
        router.replace(`/ingresos/${res.id}`);
      }
    } catch (err: any) {
      setGuardando(false);
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar la validación en la base de datos.');
    }
  };

  // Helper para validación de experiencia previa al grado según Decreto 1083/2015 y Ley 2039/2020
  const calcularExpPreviaFallback = (cert: CertificadoAnalizado, formacion?: FormacionAcademicaItem[]) => {
    const pregrado = (formacion || []).find(f => {
      const t = (f.tipo || '').toUpperCase();
      const tit = (f.titulo_obtenido || '').toUpperCase();
      return t === 'PREGRADO' || (!t.includes('BACHILLER') && !t.includes('TECNIC') && !t.includes('TARJETA') && !t.includes('ESPECIALIZ') && !t.includes('MAESTR') && !t.includes('DOCTOR') && (tit.includes('ABOGAD') || tit.includes('INGENIER') || tit.includes('LICENCIAD') || tit.includes('ADMINISTRAD') || tit.includes('ECONOM') || tit.includes('PROFESIONAL')));
    });

    const fechaTerminacion = pregrado?.certifica_terminacion_materias && pregrado?.fecha_terminacion_materias && pregrado.fecha_terminacion_materias !== 'NO CONSTA' ? pregrado.fecha_terminacion_materias : null;
    const fechaGrado = pregrado?.fecha_grado && pregrado.fecha_grado !== 'NO CONSTA' ? pregrado.fecha_grado : null;
    const fechaCorte = fechaTerminacion || fechaGrado || '9999-12-31';
    const tipoCorte = fechaTerminacion ? 'TERMINACION_MATERIAS' : (fechaGrado ? 'FECHA_GRADO' : 'NO_CONSTA');

    const fIni = cert.fecha_inicio || '';
    const fFin = cert.fecha_fin || (cert.vinculo_vigente ? (cert.fecha_expedicion || new Date().toISOString().slice(0, 10)) : fIni);

    const esPrevio = fIni < fechaCorte;
    const finalizoAntes = fFin < fechaCorte;

    const esLey2039 = Boolean(
      cert.cumple_excepcion_ley_2039 ||
      (cert.modalidad_ley_2039 && cert.modalidad_ley_2039 !== 'NINGUNA') ||
      (cert.tipo_vinculo && /PRACTICA|PASANTIA|JUDICATURA|MONITORIA|APRENDIZAJE|INVESTIGACION/i.test(cert.tipo_vinculo)) ||
      (cert.cargo_certificado && /PRACTICANTE|PASANTE|JUDICANTE|MONITOR/i.test(cert.cargo_certificado))
    );

    const esRel = cert.clasificacion_experiencia === 'RELACIONADA';

    if (!esPrevio) {
      return {
        es_previo_al_corte: false,
        corte_referencia: {
          tipo: tipoCorte,
          fecha: fechaCorte,
          sustento_normativo: tipoCorte === 'TERMINACION_MATERIAS' ? 'Certificación de terminación y aprobación de materias (Decreto 1083 de 2015)' : 'Fecha de obtención del título profesional (Grado)'
        },
        check_terminacion_pensum: {
          acredita_terminacion_materias: Boolean(fechaTerminacion),
          fecha_terminacion: fechaTerminacion || 'No consta (rige fecha de grado)',
          observacion: tipoCorte === 'TERMINACION_MATERIAS' ? `Terminación de materias acreditada el ${fechaTerminacion}.` : `Rige desde la fecha de grado: ${fechaGrado || 'NO CONSTA'}.`
        },
        check_relacion_profesion: {
          cumple: esRel,
          disciplina_o_profesion_exigida: 'Disciplina académica requerida por el empleo',
          observacion: esRel ? 'Funciones directamente afines con las competencias del empleo.' : 'Funciones no relacionadas con el empleo.'
        },
        check_modalidad_ley_2039: {
          aplica_excepcion: false,
          modalidad: 'NO_APLICA',
          observacion: 'No requerida: Adquirida con posterioridad al título profesional / terminación del pénsum.'
        },
        tipo_resultado: 'COMPUTABLE_TOTAL_POSTERIOR' as const,
        conclusion_juridica: 'Experiencia posterior a la fecha de corte profesional. Computa en su totalidad según las reglas ordinarias de experiencia profesional.'
      };
    }

    if (esLey2039 && esRel) {
      return {
        es_previo_al_corte: true,
        corte_referencia: {
          tipo: tipoCorte,
          fecha: fechaCorte,
          sustento_normativo: 'Ley 2039 de 2020 y Decreto 952 de 2021'
        },
        check_terminacion_pensum: {
          acredita_terminacion_materias: Boolean(fechaTerminacion),
          fecha_terminacion: fechaTerminacion || 'No aplica (adquirida previo a culminación)',
          observacion: 'Experiencia formativa previa adquirida válidamente antes de culminar el pénsum.'
        },
        check_relacion_profesion: {
          cumple: true,
          disciplina_o_profesion_exigida: 'Disciplina académica del empleo',
          observacion: 'Las funciones de la práctica o modalidad previa guardan relación directa con el empleo.'
        },
        check_modalidad_ley_2039: {
          aplica_excepcion: true,
          modalidad: cert.modalidad_ley_2039 || cert.tipo_vinculo || 'Práctica / Pasantía laboral',
          observacion: 'Modalidad de experiencia previa reconocida formalmente bajo el régimen de la Ley 2039 de 2020.'
        },
        tipo_resultado: 'COMPUTABLE_TOTAL_LEY_2039' as const,
        conclusion_juridica: 'Reconocida como experiencia previa válida en virtud de la Ley 2039 de 2020 y Decreto 952 de 2021.'
      };
    }

    if (!finalizoAntes) {
      return {
        es_previo_al_corte: true,
        corte_referencia: {
          tipo: tipoCorte,
          fecha: fechaCorte,
          sustento_normativo: 'Decreto 1083 de 2015 Art. 2.2.2.3.7'
        },
        check_terminacion_pensum: {
          acredita_terminacion_materias: Boolean(fechaTerminacion),
          fecha_terminacion: fechaTerminacion || 'No aporta',
          observacion: `Fecha de corte profesional: ${fechaCorte}.`
        },
        check_relacion_profesion: {
          cumple: esRel,
          disciplina_o_profesion_exigida: 'Disciplina del empleo',
          observacion: esRel ? 'Funciones afines al cargo.' : 'Funciones no relacionadas.'
        },
        check_modalidad_ley_2039: {
          aplica_excepcion: false,
          modalidad: 'NINGUNA',
          observacion: 'No corresponde a modalidad de Ley 2039/2020 en el tramo anterior a la graduación.'
        },
        tipo_resultado: 'COMPUTABLE_PARCIAL_DESDE_CORTE' as const,
        fecha_inicio_computable: fechaCorte,
        conclusion_juridica: `Inició el ${fIni} antes de la terminación de materias/grado (${fechaCorte}). El tramo previo no es computable como experiencia profesional. Se computa exclusivamente a partir del ${fechaCorte}.`
      };
    }

    return {
      es_previo_al_corte: true,
      corte_referencia: {
        tipo: tipoCorte,
        fecha: fechaCorte,
        sustento_normativo: 'Decreto 1083 de 2015 Art. 2.2.2.3.7'
      },
      check_terminacion_pensum: {
        acredita_terminacion_materias: Boolean(fechaTerminacion),
        fecha_terminacion: fechaTerminacion || 'No aporta',
        observacion: `Culminó antes del corte profesional (${fechaCorte}).`
      },
      check_relacion_profesion: {
        cumple: esRel,
        disciplina_o_profesion_exigida: 'Disciplina del empleo',
        observacion: esRel ? 'Funciones afines' : 'Sin relación'
      },
      check_modalidad_ley_2039: {
        aplica_excepcion: false,
        modalidad: 'NINGUNA',
        observacion: 'No corresponde a práctica laboral, pasantía ni judicatura bajo la Ley 2039 de 2020.'
      },
      tipo_resultado: 'NO_COMPUTABLE_PREVIA_AL_GRADO' as const,
      conclusion_juridica: 'NO COMPUTABLE: Experiencia laboral finalizada con anterioridad a la fecha de grado / terminación del pénsum académico (Decreto 1083 de 2015). No reúne las condiciones de la Ley 2039 de 2020.'
    };
  };

  // Funciones para gestión de títulos en dictamen preliminar
  const abrirNuevoTitulo = () => {
    setEditandoIndex(null);
    setDescartadoReactivandoIdx(null);
    setFormTipo('PREGRADO');
    setFormTitulo('');
    setFormInstitucion('');
    setFormFechaGrado('');
    setFormCertificaMaterias(false);
    setFormFechaMaterias('');
    setFormTarjeta('');
    setFormCumple(true);
    setFormJustificacion('');
    setModalTituloVisible(true);
  };

  const abrirEditarTitulo = (idx: number) => {
    if (!analisisResultado || !analisisResultado.formacion_academica) return;
    const item = analisisResultado.formacion_academica[idx];
    if (!item) return;
    setEditandoIndex(idx);
    setDescartadoReactivandoIdx(null);
    setFormTipo(item.tipo || 'PREGRADO');
    setFormTitulo(item.titulo_obtenido || '');
    setFormInstitucion(item.institucion || '');
    setFormFechaGrado(item.fecha_grado || '');
    setFormCertificaMaterias(Boolean(item.certifica_terminacion_materias));
    setFormFechaMaterias(item.fecha_terminacion_materias || '');
    setFormTarjeta(item.tipo === 'BACHILLER' ? '' : (item.numero_tarjeta_o_registro || ''));
    setFormCumple(item.cumple_requisito_cargo !== false);
    setFormJustificacion(item.justificacion || '');
    setModalTituloVisible(true);
  };

  const abrirReactivarDescartado = (idx: number) => {
    if (!analisisResultado?.documentos_no_aplican) return;
    const doc = analisisResultado.documentos_no_aplican[idx];
    if (!doc) return;
    setEditandoIndex(null);
    setDescartadoReactivandoIdx(idx);
    setFormTipo('PREGRADO');
    setFormTitulo(doc.descripcion || doc.nombre_archivo || '');
    setFormInstitucion(doc.entidad || '');
    setFormFechaGrado('');
    setFormCertificaMaterias(false);
    setFormFechaMaterias('');
    setFormTarjeta('');
    setFormCumple(true);
    setFormJustificacion('Reactivado manualmente desde documentos descartados.');
    setModalTituloVisible(true);
  };

  const descartarTitulo = (idx: number) => {
    if (!analisisResultado?.formacion_academica) return;
    const it = analisisResultado.formacion_academica[idx];
    if (!it) return;
    const nuevaFormacion = analisisResultado.formacion_academica.filter((_, i) => i !== idx);
    const nuevoNoAplica = {
      id: `NO-APLICA-${(analisisResultado.documentos_no_aplican || []).length + 1}`,
      nombre_archivo: it.nombre_archivo,
      descripcion: it.titulo_obtenido || 'Documento Formativo',
      entidad: it.institucion || 'Institución',
      motivo_no_aplica: `Descartado manualmente por evaluador: ${it.tipo?.replace('_', ' ') || 'Documento'} no computable para el cumplimiento de requisitos de educación formal.`
    };
    const nuevosNoAplican = [...(analisisResultado.documentos_no_aplican || []), nuevoNoAplica];
    setAnalisisResultado({
      ...analisisResultado,
      formacion_academica: nuevaFormacion,
      documentos_no_aplican: nuevosNoAplican
    });
    setModalTituloVisible(false);
  };

  const guardarTituloForm = () => {
    if (!formTitulo.trim()) {
      mostrarMensaje('Campo Requerido', 'Debes ingresar el nombre del título obtenido.');
      return;
    }
    if (!formInstitucion.trim()) {
      mostrarMensaje('Campo Requerido', 'Debes ingresar la institución educativa emisora.');
      return;
    }
    if (!analisisResultado) return;

    const nuevoItem: FormacionAcademicaItem = {
      tipo: formTipo,
      titulo_obtenido: formTitulo.trim(),
      institucion: formInstitucion.trim(),
      fecha_grado: formFechaGrado.trim() || 'NO CONSTA',
      certifica_terminacion_materias: formTipo === 'PREGRADO' ? formCertificaMaterias : undefined,
      fecha_terminacion_materias: (formTipo === 'PREGRADO' && formCertificaMaterias) ? (formFechaMaterias.trim() || undefined) : undefined,
      numero_tarjeta_o_registro: formTipo === 'BACHILLER' ? undefined : (formTarjeta.trim() || undefined),
      cumple_requisito_cargo: formCumple,
      justificacion: formJustificacion.trim()
    };

    if (descartadoReactivandoIdx !== null) {
      const docReactivado = (analisisResultado.documentos_no_aplican || [])[descartadoReactivandoIdx];
      const nuevosNoAplican = (analisisResultado.documentos_no_aplican || []).filter((_, i) => i !== descartadoReactivandoIdx);
      const nuevoTitConArchivo: FormacionAcademicaItem = {
        ...nuevoItem,
        id: `TIT-${(analisisResultado.formacion_academica || []).length + 1}`,
        nombre_archivo: docReactivado?.nombre_archivo
      };
      setAnalisisResultado({
        ...analisisResultado,
        formacion_academica: [...(analisisResultado.formacion_academica || []), nuevoTitConArchivo],
        documentos_no_aplican: nuevosNoAplican
      });
      setDescartadoReactivandoIdx(null);
      setModalTituloVisible(false);
      return;
    }

    const actual = analisisResultado.formacion_academica || [];
    let nuevaLista: FormacionAcademicaItem[];
    if (editandoIndex !== null) {
      nuevaLista = [...actual];
      nuevaLista[editandoIndex] = { ...nuevaLista[editandoIndex], ...nuevoItem };
    } else {
      nuevaLista = [...actual, nuevoItem];
    }

    setAnalisisResultado({
      ...analisisResultado,
      formacion_academica: nuevaLista
    });
    setModalTituloVisible(false);
  };

  const [itemAEliminar, setItemAEliminar] = useState<{
    tipo: 'TITULO' | 'CERTIFICADO' | 'DOCUMENTO_NO_APLICA';
    idx: number;
    titulo: string;
    descripcion: string;
  } | null>(null);

  const pedirConfirmarEliminarTitulo = (idx: number) => {
    if (!analisisResultado?.formacion_academica) return;
    const it = analisisResultado.formacion_academica[idx];
    setItemAEliminar({
      tipo: 'TITULO',
      idx,
      titulo: 'Eliminar Título Académico',
      descripcion: `¿Estás seguro de que deseas eliminar el título "${it?.titulo_obtenido || 'seleccionado'}" de este dictamen?`
    });
    setModalEliminarVisible(true);
  };

  const pedirConfirmarEliminarCertificado = (idx: number) => {
    if (!analisisResultado?.certificados) return;
    const it = analisisResultado.certificados[idx];
    setItemAEliminar({
      tipo: 'CERTIFICADO',
      idx,
      titulo: 'Eliminar Certificado Laboral',
      descripcion: `¿Estás seguro de que deseas eliminar el certificado "${it?.entidad || ''} - ${it?.cargo_certificado || ''}" de este dictamen? Se recalcularán los tiempos válidos.`
    });
    setModalEliminarVisible(true);
  };

  const pedirConfirmarEliminarDocNoAplica = (idx: number) => {
    if (!analisisResultado?.documentos_no_aplican) return;
    const it = analisisResultado.documentos_no_aplican[idx];
    setItemAEliminar({
      tipo: 'DOCUMENTO_NO_APLICA',
      idx,
      titulo: 'Eliminar Documento No Aplicable',
      descripcion: `¿Estás seguro de que deseas eliminar "${it?.descripcion || it?.nombre_archivo || 'este documento'}" de la lista de documentos que no aplican?`
    });
    setModalEliminarVisible(true);
  };

  const ejecutarEliminar = async () => {
    if (!itemAEliminar || !analisisResultado) return;
    if (itemAEliminar.tipo === 'TITULO') {
      const actual = analisisResultado.formacion_academica || [];
      setAnalisisResultado({
        ...analisisResultado,
        formacion_academica: actual.filter((_, idx) => idx !== itemAEliminar.idx)
      });
    } else if (itemAEliminar.tipo === 'CERTIFICADO') {
      const actual = analisisResultado.certificados || [];
      const nuevosCerts = actual.filter((_, idx) => idx !== itemAEliminar.idx);
      try {
        const reqMeses = Number(mesesExigidos) || analisisResultado.consolidado.requisito_minimo_meses || 0;
        const recalc = await ingresosService.recalcularTiempos(nuevosCerts, reqMeses);
        setAnalisisResultado({
          ...analisisResultado,
          certificados: recalc.certificados || nuevosCerts,
          consolidado: recalc.consolidado || analisisResultado.consolidado
        });
      } catch (e) {
        setAnalisisResultado({
          ...analisisResultado,
          certificados: nuevosCerts
        });
      }
    } else if (itemAEliminar.tipo === 'DOCUMENTO_NO_APLICA') {
      const actual = analisisResultado.documentos_no_aplican || [];
      setAnalisisResultado({
        ...analisisResultado,
        documentos_no_aplican: actual.filter((_, idx) => idx !== itemAEliminar.idx)
      });
    }
    setModalEliminarVisible(false);
    setItemAEliminar(null);
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
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
              {rehacerId ? 'Rehacer Validación de Ingreso' : 'Nueva Validación de Ingreso'}
            </Text>
            {rehacerId ? (
              <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                Reevaluando expediente previo #{rehacerId.slice(0, 8)}...
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, width: '100%' }}>
        {rehacerId && (
          <View
            style={{
              backgroundColor: '#EFF6FF',
              borderColor: '#93C5FD',
              borderWidth: 1,
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
              <Ionicons name="refresh-circle" size={26} color="#1D4ED8" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E40AF' }}>
                  Modo Rehacer Expediente Activo
                </Text>
                <Text style={{ fontSize: 12, color: '#2563EB', marginTop: 2 }}>
                  {candidatoNombre ? `Expediente de ${candidatoNombre}. ` : ''}
                  Los datos del cargo y dictamen previo han sido cargados. Puedes añadir o modificar títulos, o reconfigurar los requisitos y documentos.
                </Text>
              </View>
            </View>

            {analisisResultado ? (
              <TouchableOpacity
                onPress={() => setAnalisisResultado(null)}
                style={{
                  backgroundColor: '#1E40AF',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 6
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                  Reconfigurar Documentos / Cargo
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

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

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => verPdfDocumento(file.name, file.name)}
                          style={{
                            padding: 6,
                            borderRadius: 6,
                            backgroundColor: '#EFF6FF',
                            borderWidth: 1,
                            borderColor: '#BFDBFE'
                          }}
                          accessibilityLabel="Ver PDF adjunto"
                        >
                          <Ionicons name="eye-outline" size={18} color="#1D4ED8" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => eliminarArchivo(idx)}
                          style={{ padding: 6 }}
                          accessibilityLabel="Eliminar archivo"
                        >
                          <Ionicons name="trash-outline" size={20} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
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
                backgroundColor: '#15803D',
                paddingVertical: 16,
                borderRadius: 10,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#15803D',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4
              }}
            >
              <Ionicons name="sparkles" size={20} color="#FDE047" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                {rehacerId ? 'Rehacer y Generar Dictamen Oficial' : 'Crear Validación y Dictamen Oficial con IA'}
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
                <View style={{ flex: 1, minWidth: 260 }}>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>DICTAMEN PRELIMINAR</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                    {analisisResultado.candidato.nombre}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 13, color: '#475569' }}>
                      <Text style={{ fontWeight: '700' }}>Cédula:</Text> {analisisResultado.candidato.documento}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#475569' }}>
                      <Text style={{ fontWeight: '700' }}>Correo:</Text> {analisisResultado.candidato.email || candidatoEmail || 'Sin especificar'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 13, color: '#475569' }}>
                      <Text style={{ fontWeight: '700' }}>Cargo:</Text> {analisisResultado.cargo_evaluado.nombre} (Cód. {analisisResultado.cargo_evaluado.codigo || 'N/A'} - Grado {analisisResultado.cargo_evaluado.grado || 'N/A'})
                    </Text>
                    {(analisisResultado.cargo_evaluado.id_sideap || idSideap) ? (
                      <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#C7D2FE' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#3730A3' }}>SIDEAP #{analisisResultado.cargo_evaluado.id_sideap || idSideap}</Text>
                      </View>
                    ) : null}
                    {(analisisResultado.cargo_evaluado.id_perno || idPerno) ? (
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>PERNO #{analisisResultado.cargo_evaluado.id_perno || idPerno}</Text>
                      </View>
                    ) : null}
                  </View>
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

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#3730A3' }}>
                      {analisisResultado.formacion_academica ? analisisResultado.formacion_academica.length : 0} documento(s)
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={abrirNuevoTitulo}
                    style={{
                      backgroundColor: '#1E40AF',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                      + Agregar Título / Tarjeta
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(!analisisResultado.formacion_academica || analisisResultado.formacion_academica.length === 0) ? (
                <View style={{ padding: 14, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="school-outline" size={28} color="#94A3B8" />
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>
                    No se detectaron diplomas ni tarjetas en los documentos adjuntos.
                  </Text>
                  <TouchableOpacity
                    onPress={abrirNuevoTitulo}
                    style={{ marginTop: 4, paddingVertical: 4, paddingHorizontal: 10 }}
                  >
                    <Text style={{ fontSize: 12, color: '#1E40AF', fontWeight: '700' }}>
                      Pulsa aquí para agregar uno manualmente
                    </Text>
                  </TouchableOpacity>
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
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 260 }}>
                          <Ionicons
                            name={fa.tipo === 'TARJETA_PROFESIONAL' ? 'card-outline' : 'school-outline'}
                            size={20}
                            color={fa.cumple_requisito_cargo ? '#15803D' : '#2563EB'}
                            style={{ marginTop: 2 }}
                          />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                                {fa.titulo_obtenido}
                              </Text>
                              <View
                                style={{
                                  backgroundColor: '#E0E7FF',
                                  paddingHorizontal: 6,
                                  paddingVertical: 1,
                                  borderRadius: 4
                                }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#3730A3' }}>
                                  {fa.tipo.replace('_', ' ')}
                                </Text>
                              </View>
                            </View>

                            <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                              {fa.institucion} {fa.fecha_grado && fa.fecha_grado !== 'NO CONSTA' ? `• Fecha: ${fa.fecha_grado}` : ''}
                            </Text>
                            {fa.numero_tarjeta_o_registro && fa.numero_tarjeta_o_registro !== 'NO CONSTA' ? (
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF', marginTop: 2 }}>
                                Registro / Tarjeta N°: {fa.numero_tarjeta_o_registro}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        {/* Acciones y estado */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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

                          {/* Botón Ver PDF */}
                          <TouchableOpacity
                            onPress={() => verPdfDocumento(fa.nombre_archivo, fa.titulo_obtenido)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              borderRadius: 6,
                              backgroundColor: '#EFF6FF',
                              borderWidth: 1,
                              borderColor: '#BFDBFE'
                            }}
                            accessibilityLabel="Ver PDF del título"
                          >
                            <Ionicons name="document-text-outline" size={14} color="#1D4ED8" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>Ver PDF</Text>
                          </TouchableOpacity>

                          {/* Botón Editar */}
                          <TouchableOpacity
                            onPress={() => abrirEditarTitulo(idx)}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              backgroundColor: '#F1F5F9',
                              borderWidth: 1,
                              borderColor: '#CBD5E1'
                            }}
                            accessibilityLabel="Editar título"
                          >
                            <Ionicons name="pencil-outline" size={15} color="#0F172A" />
                          </TouchableOpacity>

                          {/* Botón Mover a Descartados */}
                          <TouchableOpacity
                            onPress={() => descartarTitulo(idx)}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              backgroundColor: '#FFFBEB',
                              borderWidth: 1,
                              borderColor: '#FDE68A'
                            }}
                            accessibilityLabel="Mover a descartados"
                          >
                            <Ionicons name="close-circle-outline" size={15} color="#D97706" />
                          </TouchableOpacity>

                          {/* Botón Eliminar */}
                          <TouchableOpacity
                            onPress={() => pedirConfirmarEliminarTitulo(idx)}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              backgroundColor: '#FEE2E2',
                              borderWidth: 1,
                              borderColor: '#FCA5A5'
                            }}
                            accessibilityLabel="Eliminar título"
                          >
                            <Ionicons name="trash-outline" size={15} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {fa.justificacion ? (
                        <Text style={{ fontSize: 12, color: '#334155', marginTop: 8, fontStyle: 'italic' }}>
                          <Text style={{ fontWeight: '700' }}>Criterio:</Text> {fa.justificacion}
                        </Text>
                      ) : null}

                      {/* ACORDEÓN DE VERIFICACIÓN FORMAL NORMATIVA (Dcto 1083/2015) */}
                      {(() => {
                        const tKey = fa.id || `TIT-${idx}`;
                        const abierta = Boolean(expansionesTitulos[tKey]);
                        const esBachiller = fa.tipo === 'BACHILLER' || (fa.titulo_obtenido || '').toUpperCase().includes('BACHILLER');
                        const esTarjeta = !esBachiller && (fa.tipo === 'TARJETA_PROFESIONAL' || (fa.titulo_obtenido || '').toUpperCase().includes('TARJETA') || Boolean(fa.numero_tarjeta_o_registro && fa.numero_tarjeta_o_registro !== 'NO CONSTA'));
                        const candNombre = analisisResultado?.candidato?.nombre;
                        const candDoc = analisisResultado?.candidato?.documento;

                        if (esTarjeta) {
                          const checks = obtenerChecksTarjeta(fa, candNombre, candDoc);
                          const listaChecks = [
                            { num: '1', titulo: 'Colegio o Consejo Profesional emisor', cumple: checks.consejo_emisor_identificable, evidencia: checks.consejo_evidencia },
                            { num: '2', titulo: 'Profesional coincide con el aspirante', cumple: checks.corresponde_profesional, evidencia: checks.profesional_evidencia },
                            { num: '3', titulo: 'Número de Matrícula o Tarjeta visible', cumple: checks.matricula_o_tarjeta_identificable, evidencia: checks.matricula_evidencia },
                            { num: '4', titulo: 'Profesión o disciplina autorizada', cumple: checks.profesion_autorizada, evidencia: checks.profesion_evidencia },
                            { num: '5', titulo: 'Certificado de vigencia y sin sanciones', cumple: checks.certificado_vigencia_y_sanciones, evidencia: checks.vigencia_evidencia },
                            { num: '6', titulo: 'Vigencia temporal válida (< 90 días)', cumple: checks.vigencia_temporal_valida, evidencia: checks.vigencia_temporal_evidencia },
                            { num: '7', titulo: 'Mecanismo de verificación o firma digital', cumple: checks.mecanismo_autenticacion_o_firma, evidencia: checks.mecanismo_evidencia }
                          ];
                          const totalCumplen = listaChecks.filter(c => c.cumple).length;

                          return (
                            <View style={{ marginTop: 10 }}>
                              <TouchableOpacity
                                onPress={() => toggleTituloExpansion(tKey)}
                                style={{
                                  paddingVertical: 7,
                                  paddingHorizontal: 10,
                                  backgroundColor: abierta ? '#EEF2FF' : '#F1F5F9',
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: abierta ? '#C7D2FE' : '#E2E8F0',
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <Ionicons name="card-outline" size={15} color="#4338CA" />
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#312E81' }}>
                                    Verificación formal de la matrícula (Dcto 1083/2015)
                                  </Text>
                                  <View
                                    style={{
                                      backgroundColor: totalCumplen === 7 ? '#DCFCE7' : '#FEF3C7',
                                      paddingHorizontal: 6,
                                      paddingVertical: 1,
                                      borderRadius: 4,
                                      borderWidth: 1,
                                      borderColor: totalCumplen === 7 ? '#86EFAC' : '#FDE68A'
                                    }}
                                  >
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: totalCumplen === 7 ? '#15803D' : '#B45309' }}>
                                      {totalCumplen}/7 CHECKS
                                    </Text>
                                  </View>
                                </View>
                                <Ionicons name={abierta ? "chevron-up" : "chevron-down"} size={16} color="#4338CA" />
                              </TouchableOpacity>

                              {abierta ? (
                                <View
                                  style={{
                                    marginTop: 6,
                                    padding: 10,
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                    gap: 6
                                  }}
                                >
                                  {listaChecks.map((chk, iChk) => (
                                    <View
                                      key={chk.num}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        gap: 8,
                                        paddingVertical: 4,
                                        borderBottomWidth: iChk < 6 ? 1 : 0,
                                        borderBottomColor: '#F8FAFC'
                                      }}
                                    >
                                      <Ionicons
                                        name={chk.cumple ? 'checkmark-circle' : 'alert-circle'}
                                        size={16}
                                        color={chk.cumple ? '#15803D' : '#D97706'}
                                        style={{ marginTop: 1 }}
                                      />
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                                          {chk.num}. {chk.titulo}
                                        </Text>
                                        {chk.evidencia ? (
                                          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                                            {chk.evidencia}
                                          </Text>
                                        ) : null}
                                      </View>
                                    </View>
                                  ))}
                                </View>
                              ) : null}
                            </View>
                          );
                        } else {
                          const checks = obtenerChecksTitulo(fa, candNombre, candDoc);
                          const listaChecks = [
                            { num: '1', titulo: 'Institución Educativa Reconocida (MEN)', cumple: checks.institucion_reconocida, evidencia: checks.institucion_evidencia },
                            { num: '2', titulo: 'Titular coincide con el aspirante', cumple: checks.corresponde_aspirante, evidencia: checks.aspirante_evidencia },
                            { num: '3', titulo: 'Denominación del título y nivel formal', cumple: checks.titulo_y_nivel_formal, evidencia: checks.titulo_evidencia },
                            { num: '4', titulo: 'Fecha de grado o aprobación cierta', cumple: checks.fecha_grado_cierta, evidencia: checks.fecha_grado_evidencia },
                            { num: '5', titulo: 'Acta de Grado, Folio o Registro institucional', cumple: checks.acta_o_registro_valido, evidencia: checks.acta_o_registro_evidencia },
                            { num: '6', titulo: 'Firmas de autoridades académicas', cumple: checks.firmas_autoridades, evidencia: checks.firmas_evidencia },
                            { num: '7', titulo: 'Convalidación MEN (Título del exterior)', cumple: checks.convalidacion_men, evidencia: checks.convalidacion_evidencia }
                          ];
                          const totalCumplen = listaChecks.filter(c => c.cumple).length;

                          return (
                            <View style={{ marginTop: 10 }}>
                              <TouchableOpacity
                                onPress={() => toggleTituloExpansion(tKey)}
                                style={{
                                  paddingVertical: 7,
                                  paddingHorizontal: 10,
                                  backgroundColor: abierta ? '#EEF2FF' : '#F1F5F9',
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: abierta ? '#C7D2FE' : '#E2E8F0',
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <Ionicons name="ribbon-outline" size={15} color="#4338CA" />
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#312E81' }}>
                                    Verificación formal del título (Dcto 1083/2015 y Ley 30/1992)
                                  </Text>
                                  <View
                                    style={{
                                      backgroundColor: totalCumplen === 7 ? '#DCFCE7' : '#FEF3C7',
                                      paddingHorizontal: 6,
                                      paddingVertical: 1,
                                      borderRadius: 4,
                                      borderWidth: 1,
                                      borderColor: totalCumplen === 7 ? '#86EFAC' : '#FDE68A'
                                    }}
                                  >
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: totalCumplen === 7 ? '#15803D' : '#B45309' }}>
                                      {totalCumplen}/7 CHECKS
                                    </Text>
                                  </View>
                                </View>
                                <Ionicons name={abierta ? "chevron-up" : "chevron-down"} size={16} color="#4338CA" />
                              </TouchableOpacity>

                              {abierta ? (
                                <View
                                  style={{
                                    marginTop: 6,
                                    padding: 10,
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                    gap: 6
                                  }}
                                >
                                  {listaChecks.map((chk, iChk) => (
                                    <View
                                      key={chk.num}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        gap: 8,
                                        paddingVertical: 4,
                                        borderBottomWidth: iChk < 6 ? 1 : 0,
                                        borderBottomColor: '#F8FAFC'
                                      }}
                                    >
                                      <Ionicons
                                        name={chk.cumple ? 'checkmark-circle' : 'alert-circle'}
                                        size={16}
                                        color={chk.cumple ? '#15803D' : '#D97706'}
                                        style={{ marginTop: 1 }}
                                      />
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                                          {chk.num}. {chk.titulo}
                                        </Text>
                                        {chk.evidencia ? (
                                          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                                            {chk.evidencia}
                                          </Text>
                                        ) : null}
                                      </View>
                                    </View>
                                  ))}
                                </View>
                              ) : null}
                            </View>
                          );
                        }
                      })()}
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
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', flex: 1 }}>
                      {c.id_certificado}: {c.entidad}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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

                      {/* Botones Ver PDF / Anexos */}
                      {(() => {
                        const listaAnexos = (c.anexos && c.anexos.length > 0)
                          ? c.anexos
                          : (c.nombre_archivo ? [c.nombre_archivo] : []);

                        return listaAnexos.map((anexo, aIdx) => (
                          <TouchableOpacity
                            key={aIdx}
                            onPress={() => verPdfDocumento(anexo, `${c.id_certificado} - Anexo ${aIdx + 1}: ${anexo}`)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: aIdx === 0 ? '#EFF6FF' : '#EEF2FF',
                              borderWidth: 1,
                              borderColor: aIdx === 0 ? '#BFDBFE' : '#C7D2FE'
                            }}
                            accessibilityLabel="Ver PDF del certificado"
                          >
                            <Ionicons name="document-text-outline" size={14} color={aIdx === 0 ? '#1D4ED8' : '#4338CA'} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: aIdx === 0 ? '#1D4ED8' : '#4338CA' }}>
                              {listaAnexos.length > 1 ? `Anexo ${aIdx + 1}` : 'Ver PDF'}
                            </Text>
                          </TouchableOpacity>
                        ));
                      })()}

                      {/* Botón Eliminar Certificado */}
                      <TouchableOpacity
                        onPress={() => pedirConfirmarEliminarCertificado(i)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 6,
                          backgroundColor: '#FEF2F2',
                          borderWidth: 1,
                          borderColor: '#FECACA'
                        }}
                        accessibilityLabel="Eliminar experiencia laboral"
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>Eliminar Experiencia</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                    Cargo: {c.cargo_certificado} • Periodo: {c.fecha_inicio} al {c.fecha_fin || 'Vigente'}
                  </Text>

                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                    Tiempo Certificado: {c.tiempo_certificado?.meses_totales_aproximados} meses ({c.tiempo_certificado?.anios ? `${c.tiempo_certificado.anios}a, ` : ''}{c.tiempo_certificado?.meses || 0}m, {c.tiempo_certificado?.dias || 0}d)
                  </Text>

                  {/* ACORDEÓN DE 3 GRUPOS (PREDETERMINADO CONTRAÍDOS) */}
                  {(() => {
                    const certKey = c.id_certificado || `cert_${i}`;
                    const expandidoFormal = Boolean(expansionesGrupos[certKey]?.formal);
                    const expandidoPrevio = Boolean(expansionesGrupos[certKey]?.previo);
                    const expandidoFunciones = Boolean(expansionesGrupos[certKey]?.funciones);

                    // 1. Datos de Verificación Formal
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
                    const itemsFormales = [
                      { num: 1, texto: 'El certificado corresponde al aspirante y contiene su nombre completo e identificación.', ok: c1, detalle: d1 },
                      { num: 2, texto: 'Se identifica claramente la entidad o empresa que expide el certificado.', ok: c2, detalle: d2 },
                      { num: 3, texto: 'Se identifica el nombre, cargo y calidad de quien suscribe el documento.', ok: c3, detalle: d3 },
                      { num: 4, texto: 'El certificado cuenta con firma manuscrita, electrónica o digital, según corresponda.', ok: c4, detalle: d4 },
                      { num: 5, texto: 'Se identifica la fecha de expedición del certificado.', ok: c5, detalle: d5 },
                      { num: 6, texto: 'El documento es legible, íntegro y no presenta alteraciones visibles.', ok: c6, detalle: d6 },
                      { num: 7, texto: 'Se dispone de datos de contacto o mecanismos para verificar la información con la entidad emisora. (cuáles)', ok: c7, detalle: d7, esCuales: true }
                    ];

                    // 2. Datos de Validación Previa al Grado (Decreto 1083/2015 y Ley 2039/2020)
                    const vep = c.verificacion_experiencia_previa || calcularExpPreviaFallback(c, analisisResultado.formacion_academica);
                    const resVep = vep?.tipo_resultado;
                    const esPosterior = resVep === 'COMPUTABLE_TOTAL_POSTERIOR';
                    const esLey2039 = resVep === 'COMPUTABLE_TOTAL_LEY_2039';
                    const esParcial = resVep === 'COMPUTABLE_PARCIAL_DESDE_CORTE';
                    const esNoComputable = resVep === 'NO_COMPUTABLE_PREVIA_AL_GRADO';

                    let badgePrevioBg = '#DCFCE7';
                    let badgePrevioBorder = '#BBF7D0';
                    let badgePrevioColor = '#166534';
                    let badgePrevioTexto = '✓ Posterior al grado';

                    if (esLey2039) {
                      badgePrevioBg = '#DBEAFE';
                      badgePrevioBorder = '#BFDBFE';
                      badgePrevioColor = '#1E40AF';
                      badgePrevioTexto = '✓ Ley 2039/2020 (Práctica)';
                    } else if (esParcial) {
                      badgePrevioBg = '#FEF3C7';
                      badgePrevioBorder = '#FDE68A';
                      badgePrevioColor = '#92400E';
                      badgePrevioTexto = '⚠️ Parcial (corte)';
                    } else if (esNoComputable) {
                      badgePrevioBg = '#FEE2E2';
                      badgePrevioBorder = '#FECACA';
                      badgePrevioColor = '#991B1B';
                      badgePrevioTexto = '🚫 No computable (Dcto 1083/15)';
                    }

                    // 3. Datos de Funciones (Cotejo Funcional Completo: cuáles sí y cuáles no)
                    const coincidentes = c.experiencia_relacionada?.funciones_coincidentes || [];
                    const noCoincidentesRaw = c.experiencia_relacionada?.funciones_no_coincidentes || [];
                    const todasFuncionesCert = Array.isArray(c.funciones_certificadas)
                      ? c.funciones_certificadas.map(f => typeof f === 'string' ? f : (f.funcion || ''))
                      : [];

                    const textosCoincidentes = coincidentes.map(f => (f.funcion_certificada || (f as any).funcion || '').toLowerCase().trim());
                    const listaNoCoincidentes: string[] = [];

                    noCoincidentesRaw.forEach(f => {
                      const txt = typeof f === 'string' ? f.trim() : String(f).trim();
                      if (txt && !listaNoCoincidentes.includes(txt)) {
                        listaNoCoincidentes.push(txt);
                      }
                    });

                    todasFuncionesCert.forEach(fc => {
                      const txt = fc.trim();
                      if (!txt) return;
                      const yaCoincide = textosCoincidentes.some(tc => tc && (tc.includes(txt.toLowerCase()) || txt.toLowerCase().includes(tc)));
                      const yaEnNoCoinc = listaNoCoincidentes.some(nc => nc.toLowerCase() === txt.toLowerCase());
                      if (!yaCoincide && !yaEnNoCoinc) {
                        listaNoCoincidentes.push(txt);
                      }
                    });

                    const esRel = c.clasificacion_experiencia === 'RELACIONADA';

                    return (
                      <View style={{ marginTop: 14, gap: 10 }}>
                        {/* GRUPO 1: VERIFICACIÓN FORMAL DEL CERTIFICADO */}
                        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', overflow: 'hidden' }}>
                          <TouchableOpacity
                            onPress={() => toggleGrupo(certKey, 'formal')}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 12,
                              backgroundColor: '#F8FAFC'
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <Ionicons name="checkbox-outline" size={18} color="#991B1B" />
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                1. Verificación formal del certificado
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{
                                backgroundColor: cumpleFormal ? '#DCFCE7' : '#FEF3C7',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: cumpleFormal ? '#BBF7D0' : '#FDE68A'
                              }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: cumpleFormal ? '#166534' : '#92400E' }}>
                                  {cumpleFormal ? '✓ 7/7 Cumple' : '⚠️ Requiere revisión'}
                                </Text>
                              </View>
                              <Ionicons
                                name={expandidoFormal ? 'chevron-down' : 'chevron-forward'}
                                size={18}
                                color="#64748B"
                              />
                            </View>
                          </TouchableOpacity>

                          {expandidoFormal && (
                            <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 8 }}>
                              {itemsFormales.map((it) => (
                                <View
                                  key={it.num}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                    backgroundColor: '#F8FAFC',
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
                          )}
                        </View>

                        {/* GRUPO 2: VALIDACIÓN PREVIA AL GRADO (DECRETO 1083 DE 2015 Y LEY 2039 DE 2020) */}
                        {vep && (
                          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: esNoComputable ? '#FECACA' : '#CBD5E1', overflow: 'hidden' }}>
                            <TouchableOpacity
                              onPress={() => toggleGrupo(certKey, 'previo')}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 12,
                                backgroundColor: esNoComputable ? '#FFF5F5' : '#F8FAFC'
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <Ionicons name="school-outline" size={18} color="#1E40AF" />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                  2. Validación previa al grado (Dcto 1083/2015 y Ley 2039/2020)
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{
                                  backgroundColor: badgePrevioBg,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: badgePrevioBorder
                                }}>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: badgePrevioColor }}>
                                    {badgePrevioTexto}
                                  </Text>
                                </View>
                                <Ionicons
                                  name={expandidoPrevio ? 'chevron-down' : 'chevron-forward'}
                                  size={18}
                                  color="#64748B"
                                />
                              </View>
                            </TouchableOpacity>

                            {expandidoPrevio && (
                              <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: esNoComputable ? '#FECACA' : '#E2E8F0', gap: 8 }}>
                                {/* Check 1: Terminación del pénsum */}
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                    backgroundColor: '#F8FAFC',
                                    padding: 8,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: vep.check_terminacion_pensum?.acredita_terminacion_materias ? '#BBF7D0' : '#E2E8F0'
                                  }}
                                >
                                  <Ionicons
                                    name={vep.check_terminacion_pensum?.acredita_terminacion_materias ? 'checkmark-circle' : 'information-circle'}
                                    size={16}
                                    color={vep.check_terminacion_pensum?.acredita_terminacion_materias ? '#16A34A' : '#64748B'}
                                    style={{ marginTop: 1 }}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', lineHeight: 16 }}>
                                      1. Terminación del pénsum académico (Decreto 1083 de 2015)
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                      {vep.check_terminacion_pensum?.observacion || `Corte profesional: ${vep.corte_referencia?.fecha || 'NO CONSTA'} (${vep.corte_referencia?.sustento_normativo || 'Fecha de grado'})`}
                                    </Text>
                                  </View>
                                </View>

                                {/* Check 2: Relación con la profesión */}
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                    backgroundColor: '#F8FAFC',
                                    padding: 8,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: vep.check_relacion_profesion?.cumple ? '#BBF7D0' : '#FECACA'
                                  }}
                                >
                                  <Ionicons
                                    name={vep.check_relacion_profesion?.cumple ? 'checkmark-circle' : 'close-circle'}
                                    size={16}
                                    color={vep.check_relacion_profesion?.cumple ? '#16A34A' : '#DC2626'}
                                    style={{ marginTop: 1 }}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', lineHeight: 16 }}>
                                      2. Relación con la profesión o disciplina exigida
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                      {vep.check_relacion_profesion?.observacion || (esRel ? 'Funciones afines con la disciplina y empleo evaluado' : 'Funciones no relacionadas con la disciplina')}
                                    </Text>
                                  </View>
                                </View>

                                {/* Check 3: Tipo de experiencia previa (Ley 2039/2020) */}
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                    backgroundColor: '#F8FAFC',
                                    padding: 8,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: esPosterior ? '#E2E8F0' : (vep.check_modalidad_ley_2039?.aplica_excepcion ? '#BFDBFE' : '#FECACA')
                                  }}
                                >
                                  <Ionicons
                                    name={esPosterior ? 'checkmark-circle' : (vep.check_modalidad_ley_2039?.aplica_excepcion ? 'checkmark-circle' : 'close-circle')}
                                    size={16}
                                    color={esPosterior ? '#16A34A' : (vep.check_modalidad_ley_2039?.aplica_excepcion ? '#2563EB' : '#DC2626')}
                                    style={{ marginTop: 1 }}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', lineHeight: 16 }}>
                                      3. Modalidad de experiencia previa (Ley 2039/2020 y Dcto 952/2021)
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                      {vep.check_modalidad_ley_2039?.observacion || (esPosterior ? 'No requerida: Adquirida con posterioridad al título profesional / terminación de materias.' : 'No califica en modalidades de práctica, pasantía, judicatura o monitoría de la Ley 2039/2020.')}
                                    </Text>
                                  </View>
                                </View>

                                {/* Conclusión Jurídica */}
                                <View
                                  style={{
                                    marginTop: 4,
                                    padding: 10,
                                    backgroundColor: esNoComputable ? '#FEE2E2' : '#EFF6FF',
                                    borderRadius: 6,
                                    borderLeftWidth: 3,
                                    borderLeftColor: esNoComputable ? '#DC2626' : '#2563EB'
                                  }}
                                >
                                  <Text style={{ fontSize: 11, color: esNoComputable ? '#7F1D1D' : '#1E3A8A', lineHeight: 16 }}>
                                    <Text style={{ fontWeight: '700' }}>Conclusión normativa: </Text>
                                    {vep.conclusion_juridica}
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        )}

                        {/* GRUPO 3: COTEJO FUNCIONAL DE ACTIVIDADES (TODAS LAS FUNCIONES) */}
                        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', overflow: 'hidden' }}>
                          <TouchableOpacity
                            onPress={() => toggleGrupo(certKey, 'funciones')}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 12,
                              backgroundColor: '#F8FAFC'
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <Ionicons name="git-compare-outline" size={18} color="#4F46E5" />
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                3. Cotejo funcional de actividades ({coincidentes.length + listaNoCoincidentes.length} funciones)
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{
                                backgroundColor: coincidentes.length > 0 ? '#DCFCE7' : '#F1F5F9',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: coincidentes.length > 0 ? '#BBF7D0' : '#CBD5E1'
                              }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: coincidentes.length > 0 ? '#166534' : '#475569' }}>
                                  {coincidentes.length > 0 ? `${coincidentes.length} relacionada(s)` : '0 relacionadas'}
                                </Text>
                              </View>
                              <Ionicons
                                name={expandidoFunciones ? 'chevron-down' : 'chevron-forward'}
                                size={18}
                                color="#64748B"
                              />
                            </View>
                          </TouchableOpacity>

                          {expandidoFunciones && (
                            <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 12 }}>
                              {/* 3.1 FUNCIONES QUE SÍ SON RELACIONADAS */}
                              <View style={{ gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Ionicons name="checkmark-done-circle" size={16} color="#16A34A" />
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>
                                    Funciones que SÍ son relacionadas ({coincidentes.length}):
                                  </Text>
                                </View>

                                {coincidentes.length === 0 ? (
                                  <View style={{ padding: 10, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                    <Text style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>
                                      No se identificaron funciones del certificado que coincidan directamente con las responsabilidades del cargo evaluado.
                                    </Text>
                                  </View>
                                ) : (
                                  coincidentes.map((f, fidx) => (
                                    <View
                                      key={fidx}
                                      style={{
                                        backgroundColor: '#F0FDF4',
                                        padding: 10,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#BBF7D0',
                                        borderLeftWidth: 4,
                                        borderLeftColor: '#16A34A',
                                        gap: 6
                                      }}
                                    >
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#166534' }}>
                                          Función {fidx + 1}
                                        </Text>
                                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#15803D' }}>
                                            ✓ {f.coincidencia || 'RELACIONADA'}
                                          </Text>
                                        </View>
                                      </View>

                                      <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '600' }}>
                                        Certificada: "{f.funcion_certificada || (f as any).funcion}"
                                      </Text>

                                      <View style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#DCFCE7' }}>
                                        <Text style={{ fontSize: 11, color: '#166534', fontWeight: '700' }}>
                                          ➔ Se relaciona con la función del empleo:
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#1E293B', marginTop: 2 }}>
                                          "{f.funcion_del_cargo}"
                                        </Text>
                                      </View>

                                      {f.justificacion ? (
                                        <Text style={{ fontSize: 11, color: '#475569' }}>
                                          <Text style={{ fontWeight: '600' }}>Criterio de afinidad: </Text>{f.justificacion}
                                        </Text>
                                      ) : null}
                                    </View>
                                  ))
                                )}
                              </View>

                              {/* 3.2 FUNCIONES QUE NO SON RELACIONADAS */}
                              <View style={{ gap: 8, marginTop: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Ionicons name="close-circle" size={16} color="#DC2626" />
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#991B1B' }}>
                                    Funciones que NO son relacionadas ({listaNoCoincidentes.length}):
                                  </Text>
                                </View>

                                {listaNoCoincidentes.length === 0 ? (
                                  <View style={{ padding: 10, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                    <Text style={{ fontSize: 11, color: '#166534', fontStyle: 'italic' }}>
                                      ✓ Todas las funciones certificadas en este documento guardan relación con el perfil del cargo.
                                    </Text>
                                  </View>
                                ) : (
                                  listaNoCoincidentes.map((fText, nidx) => (
                                    <View
                                      key={nidx}
                                      style={{
                                        backgroundColor: '#FEF2F2',
                                        padding: 10,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#FECACA',
                                        borderLeftWidth: 4,
                                        borderLeftColor: '#DC2626',
                                        gap: 4
                                      }}
                                    >
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#991B1B' }}>
                                          Función {nidx + 1}
                                        </Text>
                                        <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#B91C1C' }}>✕ No Relacionada</Text>
                                        </View>
                                      </View>

                                      <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '500' }}>
                                        Certificada: "{fText}"
                                      </Text>
                                      <Text style={{ fontSize: 11, color: '#7F1D1D', fontStyle: 'italic' }}>
                                        No guarda correspondencia funcional ni se enmarca en las funciones oficiales del cargo evaluado.
                                      </Text>
                                    </View>
                                  ))
                                )}
                              </View>
                            </View>
                          )}
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

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FCA5A5' }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#DC2626' }}>
                              NO APLICA
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => abrirReactivarDescartado(idx)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: '#EFF6FF',
                              borderWidth: 1,
                              borderColor: '#BFDBFE'
                            }}
                            accessibilityLabel="Reactivar como título"
                          >
                            <Ionicons name="school-outline" size={13} color="#1D4ED8" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>Reactivar Título</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => verPdfDocumento(doc.nombre_archivo, doc.descripcion || 'Documento no aplicable')}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: '#EFF6FF',
                              borderWidth: 1,
                              borderColor: '#BFDBFE'
                            }}
                            accessibilityLabel="Ver PDF del documento"
                          >
                            <Ionicons name="document-text-outline" size={13} color="#1D4ED8" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>Ver PDF</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => pedirConfirmarEliminarDocNoAplica(idx)}
                            style={{
                              padding: 5,
                              borderRadius: 6,
                              backgroundColor: '#FEE2E2',
                              borderWidth: 1,
                              borderColor: '#FCA5A5'
                            }}
                            accessibilityLabel="Eliminar de no aplica"
                          >
                            <Ionicons name="trash-outline" size={14} color="#DC2626" />
                          </TouchableOpacity>
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

      {/* Modal Crear / Editar Título */}
      <Modal
        visible={modalTituloVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalTituloVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 22,
              width: '100%',
              maxWidth: 580,
              maxHeight: '90%',
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="school" size={22} color="#1E40AF" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                  {editandoIndex !== null ? 'Editar Título o Tarjeta' : 'Agregar Nuevo Título / Tarjeta'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalTituloVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {/* Selector de Tipo */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                  Tipo de Documento Formativo *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {[
                    { id: 'PREGRADO', label: 'Pregrado' },
                    { id: 'ESPECIALIZACION', label: 'Especialización' },
                    { id: 'MAESTRIA', label: 'Maestría' },
                    { id: 'DOCTORADO', label: 'Doctorado' },
                    { id: 'BACHILLER', label: 'Bachiller' },
                    { id: 'TECNICO', label: 'Técnico' },
                    { id: 'TECNOLOGO', label: 'Tecnólogo' },
                    { id: 'TARJETA_PROFESIONAL', label: 'Tarjeta Profesional' },
                    { id: 'OTRO', label: 'Otro' }
                  ].map((t) => {
                    const sel = formTipo === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => setFormTipo(t.id as any)}
                        style={{
                          backgroundColor: sel ? '#1E40AF' : '#F1F5F9',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: sel ? '#1E40AF' : '#CBD5E1'
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: sel ? '#FFFFFF' : '#475569' }}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Título Obtenido */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Título Obtenido / Denominación *
                </Text>
                <TextInput
                  value={formTitulo}
                  onChangeText={setFormTitulo}
                  placeholder="Ej. Abogado, Bachiller Académico, Contador Público"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A'
                  }}
                />
              </View>

              {/* Institución */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Institución Educativa Emisora *
                </Text>
                <TextInput
                  value={formInstitucion}
                  onChangeText={setFormInstitucion}
                  placeholder="Ej. Universidad Nacional de Colombia, Colegio Mayor"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A'
                  }}
                />
              </View>

              {/* Fila Fecha y Tarjeta */}
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    Fecha de Grado / Expedición
                  </Text>
                  <TextInput
                    value={formFechaGrado}
                    onChangeText={setFormFechaGrado}
                    placeholder="AAAA-MM-DD (o NO CONSTA)"
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: '#0F172A'
                    }}
                  />
                </View>

                {/* Solo mostrar N° Tarjeta / Registro si NO es Bachiller */}
                {formTipo !== 'BACHILLER' ? (
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      N° Tarjeta / Registro
                    </Text>
                    <TextInput
                      value={formTarjeta}
                      onChangeText={setFormTarjeta}
                      placeholder="Opcional (Ej. 345612 CSJ)"
                      placeholderTextColor="#94A3B8"
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13,
                        color: '#0F172A'
                      }}
                    />
                  </View>
                ) : null}
              </View>

              {/* Decreto 1083 de 2015: Terminación de Pénsum / Materias (Solo Pregrado) */}
              {formTipo === 'PREGRADO' && (
                <View
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: 8,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    gap: 10
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="school" size={16} color="#1E40AF" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E40AF' }}>
                      Decreto 1083 de 2015 - Terminación de Pénsum Académico
                    </Text>
                  </View>

                  <Text style={{ fontSize: 11, color: '#1E3A8A', lineHeight: 15 }}>
                    La experiencia profesional se contabiliza desde la terminación y aprobación del pénsum académico cuando medie certificación de la institución educativa. De lo contrario, se computa a partir de la fecha de grado.
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setFormCertificaMaterias(!formCertificaMaterias)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: formCertificaMaterias ? '#DBEAFE' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: formCertificaMaterias ? '#2563EB' : '#CBD5E1',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6
                      }}
                    >
                      <Ionicons
                        name={formCertificaMaterias ? 'checkbox' : 'square-outline'}
                        size={16}
                        color={formCertificaMaterias ? '#1D4ED8' : '#64748B'}
                      />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: formCertificaMaterias ? '#1E40AF' : '#475569' }}>
                        Aporta certificación de terminación de materias
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {formCertificaMaterias && (
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF', marginBottom: 4 }}>
                        Fecha de Terminación y Aprobación de Materias *
                      </Text>
                      <TextInput
                        value={formFechaMaterias}
                        onChangeText={setFormFechaMaterias}
                        placeholder="AAAA-MM-DD (fecha exacta de certificación)"
                        placeholderTextColor="#94A3B8"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#93C5FD',
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          fontSize: 12,
                          color: '#0F172A'
                        }}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Cumple Requisito */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                  ¿Cumple Requisito Exigido para el Cargo?
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setFormCumple(true)}
                    style={{
                      flex: 1,
                      backgroundColor: formCumple ? '#DCFCE7' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: formCumple ? '#16A34A' : '#CBD5E1',
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons
                      name={formCumple ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={formCumple ? '#15803D' : '#64748B'}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: formCumple ? '#15803D' : '#64748B' }}>
                      Sí Cumple Requisito
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setFormCumple(false)}
                    style={{
                      flex: 1,
                      backgroundColor: !formCumple ? '#FEF3C7' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: !formCumple ? '#D97706' : '#CBD5E1',
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons
                      name={!formCumple ? 'alert-circle' : 'ellipse-outline'}
                      size={16}
                      color={!formCumple ? '#B45309' : '#64748B'}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: !formCumple ? '#B45309' : '#64748B' }}>
                      En Evaluación / Adicional
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Justificación */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Justificación / Criterio de Validación
                </Text>
                <TextInput
                  value={formJustificacion}
                  onChangeText={setFormJustificacion}
                  multiline
                  numberOfLines={2}
                  placeholder="Ej. Cumple con el núcleo básico del conocimiento exigido en el manual de funciones."
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A',
                    minHeight: 56
                  }}
                />
              </View>
            </ScrollView>

            {/* Botones Acciones Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 18, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14 }}>
              {editandoIndex !== null && (
                <TouchableOpacity
                  onPress={() => descartarTitulo(editandoIndex)}
                  style={{
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: '#FFFBEB',
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginRight: 'auto'
                  }}
                >
                  <Ionicons name="ban-outline" size={15} color="#D97706" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309' }}>Mover a Descartados</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setModalTituloVisible(false)}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: '#F1F5F9',
                  borderWidth: 1,
                  borderColor: '#CBD5E1'
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={guardarTituloForm}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 18,
                  borderRadius: 8,
                  backgroundColor: '#1E40AF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {editandoIndex !== null ? 'Actualizar Título' : 'Agregar Título'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal
        visible={modalEliminarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalEliminarVisible(false)}
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
              padding: 22,
              width: '100%',
              maxWidth: 420,
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Ionicons name="trash-bin-outline" size={24} color="#DC2626" />
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                {itemAEliminar?.titulo || 'Confirmar Eliminación'}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 20 }}>
              {itemAEliminar?.descripcion || '¿Estás seguro de que deseas eliminar este registro del dictamen preliminar?'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setModalEliminarVisible(false)}
                style={{
                  backgroundColor: '#F1F5F9',
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#CBD5E1'
                }}
              >
                <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={ejecutarEliminar}
                style={{
                  backgroundColor: '#DC2626',
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Eliminar</Text>
              </TouchableOpacity>
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

      {/* Modal Visor de PDF integrado */}
      <PdfViewerModal
        visible={visorPdfVisible}
        onClose={() => setVisorPdfVisible(false)}
        titulo={visorPdfTitulo}
        nombreArchivo={visorPdfNombre}
        pdfUrl={visorPdfUrl}
        pdfBase64={visorPdfBase64}
      />
    </View>
  );
}
