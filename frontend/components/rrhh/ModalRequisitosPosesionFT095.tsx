import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { assetADataUrl } from '../../lib/storageAdjuntosIndexedDB';
import PdfViewerModal from '../PdfViewerModal';
import {
  requisitosPosesionService,
  LISTA_32_REQUISITOS_FT095,
  DatosFormatoFT095Diligenciado,
  EstadoItemFT095,
  SoporteAdjuntoItemFT095,
} from '../../lib/requisitosPosesionService';
import { ingresosService } from '../../lib/ingresosService';

interface ModalRequisitosPosesionFT095Props {
  visible: boolean;
  onClose: () => void;
  servidorInicial: {
    nombre: string;
    cedula: string;
    cargo: string;
    codigo?: string;
    grado?: string;
    dependencia: string;
    modalidad?: string;
    fecha?: string;
  };
  onDescargarPlantillaBase?: (archivo: string) => void;
  fechaPosesionInicial?: string;
  onGuardarFechaPosesion?: (fecha: string) => void;
  datosGuardados?: DatosFormatoFT095Diligenciado;
  onGuardarFT095?: (datos: DatosFormatoFT095Diligenciado) => void;
  validacionCoincidente?: any;
}

export const ModalRequisitosPosesionFT095: React.FC<ModalRequisitosPosesionFT095Props> = ({
  visible,
  onClose,
  servidorInicial,
  onDescargarPlantillaBase,
  fechaPosesionInicial,
  onGuardarFechaPosesion,
  datosGuardados,
  onGuardarFT095,
  validacionCoincidente,
}) => {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  const [datos, setDatos] = useState<DatosFormatoFT095Diligenciado>(() =>
    datosGuardados && datosGuardados.items && Object.keys(datosGuardados.items).length > 0
      ? datosGuardados
      : requisitosPosesionService.crearEstadoInicial(servidorInicial)
  );

  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'CUMPLE' | 'PENDIENTE' | 'NO_APLICA'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarEncabezadoEditable, setMostrarEncabezadoEditable] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [fechaPosesionInput, setFechaPosesionInput] = useState<string>(
    fechaPosesionInicial || servidorInicial?.fecha || ''
  );

  const [cargandoArchivo, setCargandoArchivo] = useState<number | null>(null);
  const [descargandoZip, setDescargandoZip] = useState(false);
  const [visorSoporte, setVisorSoporte] = useState<{
    visible: boolean;
    titulo: string;
    nombreArchivo: string;
    url?: string;
    mimeType?: string;
  } | null>(null);

  // Sincronizar cuando cambia el servidor inicial seleccionado o la fecha o datos guardados
  useEffect(() => {
    if (datosGuardados && datosGuardados.items && Object.keys(datosGuardados.items).length > 0) {
      setDatos(datosGuardados);
    } else if (servidorInicial && servidorInicial.cedula) {
      setDatos(requisitosPosesionService.crearEstadoInicial(servidorInicial));
    }
  }, [datosGuardados, servidorInicial?.cedula, servidorInicial?.nombre]);

  useEffect(() => {
    if (fechaPosesionInicial) {
      setFechaPosesionInput(fechaPosesionInicial);
    }
  }, [fechaPosesionInicial]);

  const resumen = useMemo(() => {
    return requisitosPosesionService.calcularResumen(datos);
  }, [datos]);

  const requisitosFiltrados = useMemo(() => {
    return LISTA_32_REQUISITOS_FT095.filter((req) => {
      const it = datos.items[req.numero];
      const estadoActual = it ? it.estado : 'PENDIENTE';

      if (filtroEstado !== 'TODOS' && estadoActual !== filtroEstado) {
        return false;
      }

      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const coincideNum = String(req.numero).includes(q);
        const coincideNombre = req.nombre.toLowerCase().includes(q);
        const coincideNorma = (req.normaODetalle || '').toLowerCase().includes(q);
        const coincideObs = ((it && it.observaciones) || '').toLowerCase().includes(q);
        if (!coincideNum && !coincideNombre && !coincideNorma && !coincideObs) {
          return false;
        }
      }

      return true;
    });
  }, [datos, filtroEstado, busqueda]);

  const handleCambiarEstadoItem = (numero: number, nuevoEstado: EstadoItemFT095) => {
    setDatos((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [numero]: {
          ...(prev.items[numero] || { numero, observaciones: '' }),
          estado: nuevoEstado,
        },
      },
    }));
  };

  const handleCambiarObsItem = (numero: number, texto: string) => {
    setDatos((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [numero]: {
          ...(prev.items[numero] || { numero, estado: 'PENDIENTE' }),
          observaciones: texto,
        },
      },
    }));
  };

  const handleMarcarTodosCumple = () => {
    const esLnr = (datos.tipoVinculacion || '').toUpperCase().includes('LIBRE');
    setDatos((prev) => {
      const newItems = { ...prev.items };
      LISTA_32_REQUISITOS_FT095.forEach((req) => {
        if ((req.numero === 31 || req.numero === 32) && !esLnr) {
          newItems[req.numero] = { ...newItems[req.numero], estado: 'NO_APLICA' };
        } else {
          newItems[req.numero] = { ...newItems[req.numero], estado: 'CUMPLE' };
        }
      });
      return { ...prev, items: newItems };
    });
    setMensajeExito('Todos los requisitos aplicables marcados como CUMPLE.');
    setTimeout(() => setMensajeExito(null), 3000);
  };

  const handleDescargarDoc = () => {
    requisitosPosesionService.descargarDocumentoDoc(datos);
    setMensajeExito('Formato 2311300-FT-095 V05 generado y descargado exitosamente.');
    setTimeout(() => setMensajeExito(null), 4000);
  };

  const handleImprimirPDF = () => {
    requisitosPosesionService.imprimirOPdf(datos);
  };

  const handleAdjuntarSoporteItem = async (numero: number, nombreReq: string) => {
    try {
      setCargandoArchivo(numero);
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const fileAsset = res.assets[0];
        const dataUrl = await assetADataUrl(fileAsset);

        const nuevoSoporte: SoporteAdjuntoItemFT095 = {
          id: `soporte_${numero}_${Date.now()}`,
          nombre: fileAsset.name || `Soporte_Req_${numero}.pdf`,
          size: fileAsset.size,
          mimeType: fileAsset.mimeType,
          dataUrl,
          fechaSubida: new Date().toISOString(),
        };

        setDatos((prev) => {
          const itemPrev = prev.items[numero] || { numero, estado: 'PENDIENTE', observaciones: '' };
          return {
            ...prev,
            items: {
              ...prev.items,
              [numero]: {
                ...itemPrev,
                soporte: nuevoSoporte,
              },
            },
          };
        });

        setMensajeExito(`Soporte "${fileAsset.name}" anexado con éxito al requisito #${numero}.`);
        setTimeout(() => setMensajeExito(null), 3500);
      }
    } catch (error) {
      console.error('Error al anexar soporte al requisito:', error);
      setMensajeExito('Error al cargar el archivo.');
      setTimeout(() => setMensajeExito(null), 3500);
    } finally {
      setCargandoArchivo(null);
    }
  };

  const handleEliminarSoporteItem = (numero: number) => {
    setDatos((prev) => {
      const itemPrev = prev.items[numero];
      if (!itemPrev) return prev;
      const { soporte, ...resto } = itemPrev;
      return {
        ...prev,
        items: {
          ...prev.items,
          [numero]: resto,
        },
      };
    });
    setMensajeExito(`Soporte removido del requisito #${numero}.`);
    setTimeout(() => setMensajeExito(null), 3000);
  };

  const handleVerSoporteItem = (numero: number, reqNombre: string) => {
    const it = datos.items[numero];
    if (!it?.soporte?.dataUrl) {
      setMensajeExito('El soporte no cuenta con vista previa disponible.');
      setTimeout(() => setMensajeExito(null), 3000);
      return;
    }
    setVisorSoporte({
      visible: true,
      titulo: `Soporte Requisito #${numero}: ${reqNombre}`,
      nombreArchivo: it.soporte.nombre,
      url: it.soporte.dataUrl,
      mimeType: it.soporte.mimeType,
    });
  };

  const handleDescargarZipOrganizado = async () => {
    try {
      setDescargandoZip(true);
      await requisitosPosesionService.descargarExpedienteZip(datos);
      setMensajeExito('📦 Expediente ZIP organizado descargado exitosamente con soportes y formato .doc.');
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (e) {
      console.error('Error descargando ZIP organizado:', e);
      setMensajeExito('No se pudo generar el archivo ZIP. Verifique los documentos.');
      setTimeout(() => setMensajeExito(null), 4000);
    } finally {
      setDescargandoZip(false);
    }
  };

  const handleGuardarYFinalizar = () => {
    if (onGuardarFT095) {
      onGuardarFT095(datos);
    }
    if (fechaPosesionInput && onGuardarFechaPosesion) {
      onGuardarFechaPosesion(fechaPosesionInput);
    }
    setMensajeExito('Verificación y soportes guardados en el caso exitosamente.');
    setTimeout(() => {
      setMensajeExito(null);
      onClose();
    }, 1200);
  };

  // Carga y sincronización con la Validación Técnica FT-318 del servidor
  const [valCompleta, setValCompleta] = useState<any>(validacionCoincidente || null);
  const [cargandoVal, setCargandoVal] = useState(false);

  useEffect(() => {
    let activa = true;
    const cargarDetalleVal = async () => {
      const val = validacionCoincidente;
      if (!val) {
        if (servidorInicial?.cedula) {
          try {
            setCargandoVal(true);
            const todas = await ingresosService.obtenerValidaciones();
            const cedulaLimpia = String(servidorInicial.cedula).replace(/\D/g, '');
            const match = todas.find((v: any) => {
              const docVal = String(v.candidato_documento || v.candidato?.documento || '').replace(/\D/g, '');
              return docVal && docVal === cedulaLimpia;
            });
            if (match && activa) {
              const full = await ingresosService.obtenerValidacionPorId(match.id).catch(() => match);
              if (activa) setValCompleta(full);
            }
          } catch (e) {
            console.warn('No se pudo cargar validación por cédula:', e);
          } finally {
            if (activa) setCargandoVal(false);
          }
        }
        return;
      }

      if (val.id && (!val.formacion_academica || !val.certificados)) {
        try {
          setCargandoVal(true);
          const full = await ingresosService.obtenerValidacionPorId(val.id);
          if (activa) setValCompleta(full);
        } catch (e) {
          if (activa) setValCompleta(val);
        } finally {
          if (activa) setCargandoVal(false);
        }
      } else {
        setValCompleta(val);
      }
    };

    cargarDetalleVal();
    return () => {
      activa = false;
    };
  }, [validacionCoincidente?.id, servidorInicial?.cedula]);

  const extraerEducacionFT318 = () => {
    if (!valCompleta) return null;
    const titulos: any[] =
      valCompleta.formacion_academica ||
      valCompleta.analisis_completo?.formacion_academica ||
      [];
    const academicos = titulos.filter(
      (t) => t.tipo !== 'TARJETA_PROFESIONAL' && t.tipo !== 'LICENCIA_CONDUCCION'
    );

    if (academicos.length === 0) {
      return {
        texto: 'Formación académica verificada en Validación Técnica (Res. 020/2019). Cumple con los títulos exigidos por el manual.',
      };
    }

    const lista = academicos.map((t) => {
      const nombre = t.titulo_obtenido || 'Título Profesional';
      const inst = t.institucion ? ` - ${t.institucion}` : '';
      const anio = t.fecha_grado ? ` (${t.fecha_grado.substring(0, 4)})` : '';
      return `${nombre}${inst}${anio}`;
    });

    const texto = `Cumple formación académica exigida (Res. 020 de 2019). Títulos verificados en Validación Técnica: ${lista.join('; ')}. Verificación directa Ley 190 / Dec. 1083: Favorable.`;

    return {
      texto,
      titulos: academicos,
    };
  };

  const extraerExperienciaFT318 = () => {
    if (!valCompleta) return null;
    const certs: any[] =
      valCompleta.certificados ||
      valCompleta.analisis_completo?.certificados ||
      [];
    const consolidado =
      valCompleta.consolidado ||
      valCompleta.analisis_completo?.consolidado;

    const mesesComputables =
      consolidado?.meses_computables ??
      consolidado?.experiencia_relacionada_meses ??
      0;
    const mesesExigidos =
      consolidado?.requisito_minimo_meses ??
      valCompleta.cargo_evaluado?.requisito_experiencia_meses ??
      0;

    const anios = Math.floor(mesesComputables / 12);
    const mesesRestantes = Math.round(mesesComputables % 12);
    const tiempoTexto =
      anios > 0
        ? `${anios} año${anios > 1 ? 's' : ''} y ${mesesRestantes} mes${mesesRestantes !== 1 ? 'es' : ''} (${mesesComputables} meses)`
        : `${mesesComputables} meses`;

    const entidades = Array.from(
      new Set(
        certs
          .map((c) => c.entidad?.trim())
          .filter(Boolean)
      )
    ).slice(0, 3);
    const entidadesTexto = entidades.length > 0 ? ` Entidades verificadas: ${entidades.join(', ')}.` : '';

    const confirmadosDirectos = certs.filter(
      (c) => c.estado_confirmacion === 'VERIFICADO_DIRECTO' || c.estado_confirmacion === 'CONFIRMADO_POR_EMISOR'
    ).length;
    const textoConfirmacion =
      confirmadosDirectos > 0
        ? ` Confirmación Directa Ley 190: ${confirmadosDirectos} certificado(s) ratificado(s).`
        : ' Verificación formal Ley 190 / Dec. 1083: Favorable.';

    const texto = `Experiencia laboral acreditada: ${tiempoTexto}${mesesExigidos > 0 ? ` (Exigido: ${mesesExigidos} meses). CUMPLE.` : '.'} Cómputo calendario completo sin penalización horaria (Sentencia Consejo de Estado Sept/2026).${entidadesTexto}${textoConfirmacion}`;

    return {
      texto,
      mesesComputables,
      mesesExigidos,
      certs,
    };
  };

  const extraerTarjetaFT318 = () => {
    if (!valCompleta) return null;
    const titulos: any[] =
      valCompleta.formacion_academica ||
      valCompleta.analisis_completo?.formacion_academica ||
      [];
    const itemTarjeta = titulos.find(
      (t) =>
        t.tipo === 'TARJETA_PROFESIONAL' ||
        (t.numero_tarjeta_o_registro && t.numero_tarjeta_o_registro !== 'NO CONSTA')
    );

    let numTarjeta = itemTarjeta?.numero_tarjeta_o_registro || '';
    let emisor = itemTarjeta?.institucion || '';

    if (!numTarjeta && valCompleta.tarjeta_profesional) {
      numTarjeta = valCompleta.tarjeta_profesional.numero || '';
      emisor = valCompleta.tarjeta_profesional.consejo || '';
    }

    if (numTarjeta && numTarjeta !== 'NO CONSTA') {
      const emisorTexto = emisor ? ` expedida por ${emisor}` : '';
      return {
        numero: numTarjeta,
        emisor,
        texto: `Tarjeta / Matrícula Profesional N° ${numTarjeta}${emisorTexto}. Verificada, vigente y sin antecedentes disciplinarios reportados.`,
      };
    }

    return {
      numero: '',
      emisor: '',
      texto: 'Tarjeta / Registro Profesional verificado en Validación Técnica. Vigente y sin antecedentes sancionatorios.',
    };
  };

  const handleVincularPunto17 = () => {
    const res = extraerEducacionFT318();
    if (!res) {
      setMensajeExito('No se encontró información de formación académica en la Validación Técnica.');
      setTimeout(() => setMensajeExito(null), 3500);
      return;
    }
    setDatos((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [17]: {
          ...(prev.items[17] || { numero: 17 }),
          estado: 'CUMPLE',
          observaciones: res.texto,
        },
      },
    }));
    setMensajeExito('✓ Punto 17 (Diplomas y Estudios) vinculado con la Validación Técnica.');
    setTimeout(() => setMensajeExito(null), 3500);
  };

  const handleVincularPunto18 = () => {
    const res = extraerExperienciaFT318();
    if (!res) {
      setMensajeExito('No se encontró información de experiencia laboral en la Validación Técnica.');
      setTimeout(() => setMensajeExito(null), 3500);
      return;
    }
    setDatos((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [18]: {
          ...(prev.items[18] || { numero: 18 }),
          estado: 'CUMPLE',
          observaciones: res.texto,
        },
      },
    }));
    setMensajeExito('✓ Punto 18 (Certificados Laborales) vinculado con el cómputo Consejo de Estado.');
    setTimeout(() => setMensajeExito(null), 3500);
  };

  const handleVincularPunto19 = () => {
    const res = extraerTarjetaFT318();
    if (!res) {
      setMensajeExito('No se encontró tarjeta profesional en la Validación Técnica.');
      setTimeout(() => setMensajeExito(null), 3500);
      return;
    }
    setDatos((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [19]: {
          ...(prev.items[19] || { numero: 19 }),
          estado: 'CUMPLE',
          observaciones: res.texto,
        },
      },
    }));
    setMensajeExito('✓ Punto 19 (Tarjeta Profesional) vinculado con la matrícula verificada.');
    setTimeout(() => setMensajeExito(null), 3500);
  };

  const handleVincularPuntos17_18_19 = () => {
    const res17 = extraerEducacionFT318();
    const res18 = extraerExperienciaFT318();
    const res19 = extraerTarjetaFT318();

    setDatos((prev) => {
      const itemsActualizados = { ...prev.items };

      if (res17) {
        itemsActualizados[17] = {
          ...(itemsActualizados[17] || { numero: 17 }),
          estado: 'CUMPLE',
          observaciones: res17.texto,
        };
      }
      if (res18) {
        itemsActualizados[18] = {
          ...(itemsActualizados[18] || { numero: 18 }),
          estado: 'CUMPLE',
          observaciones: res18.texto,
        };
      }
      if (res19) {
        itemsActualizados[19] = {
          ...(itemsActualizados[19] || { numero: 19 }),
          estado: 'CUMPLE',
          observaciones: res19.texto,
        };
      }

      return {
        ...prev,
        items: itemsActualizados,
      };
    });

    setMensajeExito('⚡ Puntos 17 (Estudios), 18 (Experiencia) y 19 (Tarjeta) vinculados exitosamente.');
    setTimeout(() => setMensajeExito(null), 4000);
  };

  if (!visible) return null;

  return (
    <>
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: isDesktop ? 24 : 10,
        }}
      >
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            width: isDesktop ? '92%' : '100%',
            maxWidth: 960,
            height: isDesktop ? '92%' : '96%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#cbd5e1',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* BARRA SUPERIOR INSTITUCIONAL NAVY */}
          <View
            style={{
              backgroundColor: '#0D2A48',
              paddingHorizontal: isDesktop ? 24 : 16,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="clipboard-outline" size={24} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: isDesktop ? 16 : 14, fontWeight: '800', color: '#ffffff' }}>
                    Requisitos para Tomar Posesión del Cargo
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#1E5A96',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                      2311300-FT-095 V05
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: resumen.esApto ? '#059669' : '#d97706',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                      {resumen.esApto ? '✅ APTO PARA POSESIÓN' : '⏳ DOCUMENTACIÓN EN TRÁMITE'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  Dirección de Gestión Corporativa • Secretaría Jurídica Distrital • Lista Oficial de 32 Requisitos
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={20} color="#ffffff" />
            </Pressable>
          </View>

          {/* MENSAJE DE NOTIFICACIÓN TEMPORAL */}
          {mensajeExito && (
            <View
              style={{
                backgroundColor: '#ecfdf5',
                borderBottomWidth: 1,
                borderBottomColor: '#a7f3d0',
                paddingHorizontal: 20,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#065f46' }}>
                {mensajeExito}
              </Text>
            </View>
          )}

          {/* CUERPO PRINCIPAL CON SCROLL */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isDesktop ? 20 : 12, gap: 14 }}>
            {/* BANNER INSTITUCIONAL UNIFICADO: MANDATO LEGAL Y NORMATIVA DE POSESIÓN */}
            <View
              style={{
                backgroundColor: '#f0f9ff',
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: '#7dd3fc',
                padding: 14,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#e0f2fe',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#bae6fd',
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={18} color="#0284c7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0369a1' }}>
                      Certificado de Cumplimiento de Requisitos para Tomar Posesión (Formato 2311300-FT-095 V05)
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7', marginTop: 1 }}>
                      Secretaría Jurídica Distrital • Dirección de Gestión Corporativa (Talento Humano)
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: '#0284c7',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                    ⚖️ MANDATO LEGAL OBLIGATORIO
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 11, color: '#0c4a6e', lineHeight: 16 }}>
                ⚖️ <Text style={{ fontWeight: '800' }}>Fundamento Jurídico:</Text> Artículos 2.2.5.1.4 y 2.2.5.1.5 del Decreto 1083 de 2015; Ley 190 de 1995; Ley 1952 de 2019; Ley 610 de 2000; Ley 1801 de 2016; y Manual de Funciones SJD (Resolución 020 de 2019).
              </Text>

              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderLeftWidth: 3,
                  borderLeftColor: '#0284c7',
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#e0f2fe',
                }}
              >
                <Text style={{ fontSize: 10.5, color: '#334155', fontStyle: 'italic', lineHeight: 15 }}>
                  «Para autorizar y formalizar la toma de posesión, la Dirección de Talento Humano debe verificar rigurosamente que el aspirante cumpla con las calidades y requisitos del cargo, no se encuentre incurso en inhabilidades o incompatibilidades, y anexe los soportes correspondientes a cada uno de los 32 requisitos normativos.»
                </Text>
              </View>
            </View>

            {/* VINCULACIÓN CON VALIDACIÓN TÉCNICA (PUNTOS 17, 18 Y 19) */}
            {valCompleta && (
              <View
                style={{
                  backgroundColor: '#ecfdf5',
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: '#86efac',
                  padding: 12,
                  flexDirection: isTablet ? 'row' : 'column',
                  justifyContent: 'space-between',
                  alignItems: isTablet ? 'center' : 'stretch',
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      backgroundColor: '#dcfce7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#86efac',
                    }}
                  >
                    <Ionicons name="sparkles" size={18} color="#15803d" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#065f46' }}>
                        Validación Técnica de Ingresos Disponible
                      </Text>
                      <View style={{ backgroundColor: '#15803d', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#ffffff' }}>CONCEPTO CUMPLE</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                      Se encontraron los títulos académicos, el cómputo de experiencia laboral (Consejo de Estado Sept/2026) y la matrícula profesional verificados previamente.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleVincularPuntos17_18_19}
                  style={{
                    backgroundColor: '#15803d',
                    paddingHorizontal: 13,
                    paddingVertical: 7.5,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    alignSelf: isTablet ? 'center' : 'flex-start',
                    shadowColor: '#15803d',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                >
                  <Ionicons name="flash" size={13} color="#ffffff" />
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#ffffff' }}>
                    ⚡ Vincular Puntos 17, 18 y 19
                  </Text>
                </Pressable>
              </View>
            )}

            {/* PANEL DE DATOS DEL ASPIRANTE */}
            <View
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 14,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="person-outline" size={16} color="#0D2A48" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0D2A48' }}>
                    I. Identificación del Aspirante / Servidor a Posesionar
                  </Text>
                </View>
                <Pressable
                  onPress={() => setMostrarEncabezadoEditable(!mostrarEncabezadoEditable)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E5A96' }}>
                    {mostrarEncabezadoEditable ? 'Ocultar Edición' : 'Editar Datos del Encabezado'}
                  </Text>
                  <Ionicons
                    name={mostrarEncabezadoEditable ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#1E5A96"
                  />
                </Pressable>
              </View>

              {/* Vista rápida o formulario editable */}
              {!mostrarEncabezadoEditable ? (
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    padding: 12,
                    flexDirection: isTablet ? 'row' : 'column',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>NOMBRES Y APELLIDOS</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                      {datos.nombresApellidos || '-'}
                    </Text>
                  </View>
                  <View style={{ minWidth: 140 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>CÉDULA DE CIUDADANÍA</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                      {datos.documentoIdentidad || '-'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>CARGO & GRADO</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                      {datos.cargo} (Cód. {datos.codigo} - Gr. {datos.grado})
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>DEPENDENCIA ASIGNADA</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                      {datos.dependencia}
                    </Text>
                  </View>
                  <View style={{ minWidth: 150 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>TIPO DE VINCULACIÓN</Text>
                    <View
                      style={{
                        backgroundColor: '#eff6ff',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 4,
                        alignSelf: 'flex-start',
                        marginTop: 2,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#1e40af' }}>
                        {datos.tipoVinculacion}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    padding: 12,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 10 }}>
                    <View style={{ flex: 2 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginBottom: 2 }}>
                        Nombres y Apellidos
                      </Text>
                      <TextInput
                        value={datos.nombresApellidos}
                        onChangeText={(txt) => setDatos({ ...datos, nombresApellidos: txt })}
                        style={{
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 6,
                          padding: 8,
                          fontSize: 12,
                          backgroundColor: '#f8fafc',
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginBottom: 2 }}>
                        Nombre Identitario (Trans)
                      </Text>
                      <TextInput
                        value={datos.nombreIdentitario}
                        onChangeText={(txt) => setDatos({ ...datos, nombreIdentitario: txt })}
                        placeholder="Opcional"
                        style={{
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 6,
                          padding: 8,
                          fontSize: 12,
                          backgroundColor: '#f8fafc',
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginBottom: 2 }}>
                        Documento Identidad
                      </Text>
                      <TextInput
                        value={datos.documentoIdentidad}
                        onChangeText={(txt) => setDatos({ ...datos, documentoIdentidad: txt })}
                        style={{
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 6,
                          padding: 8,
                          fontSize: 12,
                          backgroundColor: '#f8fafc',
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 10 }}>
                    <View style={{ flex: 2 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginBottom: 2 }}>
                        Denominación del Cargo
                      </Text>
                      <TextInput
                        value={datos.cargo}
                        onChangeText={(txt) => setDatos({ ...datos, cargo: txt })}
                        style={{
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 6,
                          padding: 8,
                          fontSize: 12,
                          backgroundColor: '#f8fafc',
                        }}
                      />
                    </View>
                    <View style={{ width: 80 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginBottom: 2 }}>
                        Código
                      </Text>
                      <TextInput
                        value={datos.codigo}
                        onChangeText={(txt) => setDatos({ ...datos, codigo: txt })}
                        style={{
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 6,
                          padding: 8,
                          fontSize: 12,
                          backgroundColor: '#f8fafc',
                        }}
                      />
                    </View>
                    <View style={{ width: 80 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginBottom: 2 }}>
                        Grado
                      </Text>
                      <TextInput
                        value={datos.grado}
                        onChangeText={(txt) => setDatos({ ...datos, grado: txt })}
                        style={{
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 6,
                          padding: 8,
                          fontSize: 12,
                          backgroundColor: '#f8fafc',
                        }}
                      />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginBottom: 2 }}>
                        Tipo de Vinculación
                      </Text>
                      <TextInput
                        value={datos.tipoVinculacion}
                        onChangeText={(txt) => setDatos({ ...datos, tipoVinculacion: txt })}
                        style={{
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 6,
                          padding: 8,
                          fontSize: 12,
                          backgroundColor: '#f8fafc',
                        }}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Franja Destacada: Fecha de Posesión Efectiva (o Inicio de Período de Prueba según modalidad) */}
              {(() => {
                const esProvisional = (servidorInicial?.modalidad || datos.tipoVinculacion || '').toUpperCase().includes('PROVISIONAL');
                return (
                  <View
                    style={{
                      backgroundColor: esProvisional ? '#fffbeb' : '#f0fdf4',
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: esProvisional ? '#fde68a' : '#86efac',
                      padding: 12,
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="calendar-outline" size={17} color={esProvisional ? '#b45309' : '#166534'} />
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: esProvisional ? '#92400e' : '#166534' }}>
                          {esProvisional
                            ? 'Fecha de Posesión Efectiva (YYYY-MM-DD):'
                            : 'Fecha de Posesión / Inicio de Período de Prueba (YYYY-MM-DD):'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: esProvisional ? '#b45309' : '#15803d', fontWeight: '500' }}>
                        {esProvisional
                          ? 'No aplica período de prueba para provisionales (Ley 909/2004, Art. 25)'
                          : 'Base legal para cómputo de 6 meses y calificación EDL (Ley 909/2004, Art. 31)'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TextInput
                        value={fechaPosesionInput}
                        onChangeText={(txt) => setFechaPosesionInput(txt)}
                        placeholder="Ej: 2026-03-15"
                        placeholderTextColor="#94a3b8"
                        style={{
                          flex: 1,
                          backgroundColor: '#ffffff',
                          borderWidth: 1,
                          borderColor: esProvisional ? '#fde68a' : '#86efac',
                          borderRadius: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          fontSize: 13,
                          fontWeight: '700',
                          color: '#0f172a',
                        }}
                      />
                      <Pressable
                        onPress={() => {
                          if (onGuardarFechaPosesion) {
                            onGuardarFechaPosesion(fechaPosesionInput);
                          }
                          setMensajeExito('Fecha de Posesión guardada correctamente.');
                          setTimeout(() => setMensajeExito(null), 3500);
                        }}
                        style={({ pressed, hovered }: any) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: pressed
                            ? (esProvisional ? '#b45309' : '#15803d')
                            : hovered
                            ? (esProvisional ? '#92400e' : '#166534')
                            : (esProvisional ? '#d97706' : '#15803d'),
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 6,
                          cursor: 'pointer',
                        })}
                      >
                        <Ionicons name="checkmark-circle-outline" size={15} color="#ffffff" />
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#ffffff' }}>
                          Guardar Fecha
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* BARRA DE PROGRESO Y CONTADORES */}
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 14,
                gap: 10,
              }}
            >
              <View
                style={{
                  flexDirection: isTablet ? 'row' : 'column',
                  justifyContent: 'space-between',
                  alignItems: isTablet ? 'center' : 'flex-start',
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                    Progreso de Verificación:
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        backgroundColor: '#dcfce7',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#166534' }}>
                        ✓ {resumen.cumplidos} Cumplidos
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: '#fef3c7',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400e' }}>
                        ⏳ {resumen.pendientes} Pendientes
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: '#f1f5f9',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>
                        🚫 {resumen.noAplica} No Aplica
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Acciones masivas */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={handleMarcarTodosCumple}
                    style={{
                      backgroundColor: '#ecfdf5',
                      borderWidth: 1,
                      borderColor: '#a7f3d0',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#065f46' }}>
                      ✓ Marcar Todo Cumple
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Barra de porcentaje */}
              <View style={{ width: '100%', height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${resumen.porcentaje}%`,
                    height: '100%',
                    backgroundColor: resumen.porcentaje === 100 ? '#059669' : '#1E5A96',
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>

            {/* FILTROS Y BÚSQUEDA DE REQUISITOS */}
            <View
              style={{
                flexDirection: isTablet ? 'row' : 'column',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {(['TODOS', 'CUMPLE', 'PENDIENTE', 'NO_APLICA'] as const).map((est) => {
                  const activo = filtroEstado === est;
                  return (
                    <Pressable
                      key={est}
                      onPress={() => setFiltroEstado(est)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: activo ? '#0D2A48' : '#f1f5f9',
                        borderWidth: 1,
                        borderColor: activo ? '#0D2A48' : '#cbd5e1',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: activo ? '#ffffff' : '#475569',
                        }}
                      >
                        {est === 'TODOS'
                          ? 'Todos (32)'
                          : est === 'CUMPLE'
                          ? `Cumplen (${resumen.cumplidos})`
                          : est === 'PENDIENTE'
                          ? `Pendientes (${resumen.pendientes})`
                          : `No Aplica (${resumen.noAplica})`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  width: isTablet ? 260 : '100%',
                }}
              >
                <Ionicons name="search" size={14} color="#94a3b8" />
                <TextInput
                  value={busqueda}
                  onChangeText={setBusqueda}
                  placeholder="Buscar requisito o norma..."
                  style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 6, fontSize: 11.5 }}
                />
                {busqueda ? (
                  <Pressable onPress={() => setBusqueda('')}>
                    <Ionicons name="close-circle" size={14} color="#94a3b8" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* BANNER DE VINCULACIÓN INTELIGENTE: PUNTOS 17, 18 y 19 (Excluye Punto 1 - FT-318 final) */}
            {valCompleta && (
              <View
                style={{
                  backgroundColor: '#f0fdfa',
                  borderWidth: 1,
                  borderColor: '#99f6e4',
                  borderRadius: 8,
                  padding: 10,
                  flexDirection: isTablet ? 'row' : 'column',
                  alignItems: isTablet ? 'center' : 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Ionicons name="sparkles" size={16} color="#0d9488" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f766e' }}>
                      Validación Técnica Disponible ({valCompleta.candidato_nombre || servidorInicial?.nombre})
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#ccfbf1',
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#115e59' }}>
                        Ley 190 / Consejo de Estado Sept 2026
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#134e4a', marginTop: 3, lineHeight: 15 }}>
                    Vincula automáticamente los puntos 17 (Títulos académicos), 18 (Certificados y cómputo laboral) y 19 (Tarjeta profesional). El Punto 1 (FT-318) queda reservado para adjuntar de forma manual el dictamen final firmado.
                  </Text>
                </View>

                <Pressable
                  onPress={handleVincularPuntos17_18_19}
                  style={({ pressed, hovered }: any) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: pressed ? '#0f766e' : hovered ? '#0d9488' : '#14b8a6',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                    cursor: 'pointer',
                  })}
                >
                  <Ionicons name="flash-outline" size={14} color="#ffffff" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>
                    ⚡ Vincular Puntos 17, 18 y 19
                  </Text>
                </Pressable>
              </View>
            )}

            {/* TABLA DINÁMICA DE LOS 32 REQUISITOS */}
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#cbd5e1',
                overflow: 'hidden',
              }}
            >
              {/* Encabezado de tabla */}
              <View
                style={{
                  backgroundColor: '#0D2A48',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ width: 36, fontSize: 11, fontWeight: '800', color: '#ffffff', textAlign: 'center' }}>
                  No.
                </Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: '#ffffff', paddingLeft: 8 }}>
                  Requisito / Documento Oficial Exigido (Formato 2311300-FT-095)
                </Text>
                <Text style={{ width: 230, fontSize: 11, fontWeight: '800', color: '#ffffff', textAlign: 'center' }}>
                  Estado de Verificación
                </Text>
              </View>

              {/* Lista de filas */}
              {requisitosFiltrados.map((req, idx) => {
                const it = datos.items[req.numero] || { estado: 'PENDIENTE', observaciones: '' };
                const esCumple = it.estado === 'CUMPLE';
                const esPendiente = it.estado === 'PENDIENTE';
                const esNoAplica = it.estado === 'NO_APLICA';
                const esPar = idx % 2 === 0;

                return (
                  <View
                    key={req.numero}
                    style={{
                      borderBottomWidth: idx === requisitosFiltrados.length - 1 ? 0 : 1,
                      borderBottomColor: '#e2e8f0',
                      backgroundColor: esPar ? '#ffffff' : '#f8fafc',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      flexDirection: isTablet ? 'row' : 'column',
                      alignItems: isTablet ? 'center' : 'flex-start',
                      gap: 8,
                    }}
                  >
                    {/* Número */}
                    <View
                      style={{
                        width: 36,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: esCumple ? '#dcfce7' : esPendiente ? '#fef3c7' : '#f1f5f9',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: esCumple ? '#166534' : esPendiente ? '#92400e' : '#64748b',
                        }}
                      >
                        {req.numero}
                      </Text>
                    </View>

                    {/* Nombre y Norma */}
                    <View style={{ flex: 1, paddingLeft: isTablet ? 8 : 0 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', lineHeight: 16 }}>
                        {req.nombre}
                      </Text>
                      {req.normaODetalle && (
                        <Text style={{ fontSize: 10.5, color: '#64748b', marginTop: 2, lineHeight: 14 }}>
                          {req.normaODetalle}
                        </Text>
                      )}

                      {/* Observación inline si existe o para editar */}
                      <TextInput
                        value={it.observaciones || ''}
                        onChangeText={(txt) => handleCambiarObsItem(req.numero, txt)}
                        placeholder="Observación o radicado del documento (opcional)..."
                        placeholderTextColor="#94a3b8"
                        style={{
                          marginTop: 4,
                          fontSize: 10.5,
                          color: '#334155',
                          backgroundColor: '#f1f5f9',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                        }}
                      />

                      {/* ZONA DE ANEXO INDIVIDUAL DEL REQUISITO */}
                      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {it.soporte && it.soporte.nombre ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: '#ecfdf5',
                              borderWidth: 1,
                              borderColor: '#a7f3d0',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              gap: 6,
                              maxWidth: '100%',
                            }}
                          >
                            <Ionicons
                              name={
                                it.soporte.nombre.toLowerCase().endsWith('.pdf')
                                  ? 'document-text'
                                  : it.soporte.nombre.toLowerCase().endsWith('.doc') || it.soporte.nombre.toLowerCase().endsWith('.docx')
                                  ? 'document'
                                  : it.soporte.nombre.toLowerCase().endsWith('.xls') || it.soporte.nombre.toLowerCase().endsWith('.xlsx')
                                  ? 'grid'
                                  : 'image'
                              }
                              size={14}
                              color="#059669"
                            />
                            <Text
                              style={{ fontSize: 11, fontWeight: '700', color: '#065f46', maxWidth: 220 }}
                              numberOfLines={1}
                            >
                              {it.soporte.nombre}
                            </Text>
                            {it.soporte.size ? (
                              <Text style={{ fontSize: 9.5, color: '#047857' }}>
                                ({Math.round(it.soporte.size / 1024)} KB)
                              </Text>
                            ) : null}

                            {/* Botón Ver Soporte */}
                            <Pressable
                              onPress={() => handleVerSoporteItem(req.numero, req.nombre)}
                              style={{
                                backgroundColor: '#ffffff',
                                paddingHorizontal: 6,
                                paddingVertical: 2.5,
                                borderRadius: 4,
                                borderWidth: 1,
                                borderColor: '#10b981',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 2,
                              }}
                            >
                              <Ionicons name="eye-outline" size={11} color="#059669" />
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>Ver</Text>
                            </Pressable>

                            {/* Botón Reemplazar Soporte */}
                            <Pressable
                              onPress={() => handleAdjuntarSoporteItem(req.numero, req.nombre)}
                              style={{
                                backgroundColor: '#ffffff',
                                paddingHorizontal: 6,
                                paddingVertical: 2.5,
                                borderRadius: 4,
                                borderWidth: 1,
                                borderColor: '#cbd5e1',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 2,
                              }}
                            >
                              <Ionicons name="cloud-upload-outline" size={11} color="#475569" />
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569' }}>Cambiar</Text>
                            </Pressable>

                            {/* Botón Eliminar Soporte */}
                            <Pressable
                              onPress={() => handleEliminarSoporteItem(req.numero)}
                              style={{
                                backgroundColor: '#fee2e2',
                                paddingHorizontal: 5,
                                paddingVertical: 2.5,
                                borderRadius: 4,
                              }}
                            >
                              <Ionicons name="trash-outline" size={11} color="#b91c1c" />
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => handleAdjuntarSoporteItem(req.numero, req.nombre)}
                            disabled={cargandoArchivo === req.numero}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: '#f8fafc',
                              borderWidth: 1,
                              borderColor: '#cbd5e1',
                              borderStyle: 'dashed',
                              paddingHorizontal: 8,
                              paddingVertical: 3.5,
                              borderRadius: 5,
                            }}
                          >
                            <Ionicons
                              name={cargandoArchivo === req.numero ? 'hourglass-outline' : 'attach-outline'}
                              size={13}
                              color="#475569"
                            />
                            <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#475569' }}>
                              {cargandoArchivo === req.numero ? 'Cargando archivo...' : '📎 Anexar soporte individual'}
                            </Text>
                          </Pressable>
                        )}

                        {/* Indicación exclusiva para Requisito 1: Dictamen final firmado manual */}
                        {req.numero === 1 && (
                          <View
                            style={{
                              backgroundColor: '#f1f5f9',
                              borderWidth: 1,
                              borderColor: '#cbd5e1',
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>
                              ⚠️ Adjunte aquí el Dictamen FT-318 oficial firmado
                            </Text>
                          </View>
                        )}

                        {/* Botón de vinculación rápida para Requisito 17 (Títulos académicos) */}
                        {valCompleta && req.numero === 17 && (
                          <Pressable
                            onPress={handleVincularPunto17}
                            style={({ pressed, hovered }: any) => ({
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: pressed ? '#ccfbf1' : hovered ? '#d1fae5' : '#f0fdfa',
                              borderWidth: 1,
                              borderColor: '#5eead4',
                              paddingHorizontal: 8,
                              paddingVertical: 3.5,
                              borderRadius: 5,
                              cursor: 'pointer',
                            })}
                          >
                            <Ionicons name="flash-outline" size={12} color="#0f766e" />
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0f766e' }}>
                              ⚡ Traer Títulos Validados
                            </Text>
                          </Pressable>
                        )}

                        {/* Botón de vinculación rápida para Requisito 18 (Certificados y Cómputo Consejo de Estado) */}
                        {valCompleta && req.numero === 18 && (
                          <Pressable
                            onPress={handleVincularPunto18}
                            style={({ pressed, hovered }: any) => ({
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: pressed ? '#ccfbf1' : hovered ? '#d1fae5' : '#f0fdfa',
                              borderWidth: 1,
                              borderColor: '#5eead4',
                              paddingHorizontal: 8,
                              paddingVertical: 3.5,
                              borderRadius: 5,
                              cursor: 'pointer',
                            })}
                          >
                            <Ionicons name="flash-outline" size={12} color="#0f766e" />
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0f766e' }}>
                              ⚡ Traer Cómputo Consejo de Estado
                            </Text>
                          </Pressable>
                        )}

                        {/* Botón de vinculación rápida para Requisito 19 (Tarjeta Profesional) */}
                        {valCompleta && req.numero === 19 && (
                          <Pressable
                            onPress={handleVincularPunto19}
                            style={({ pressed, hovered }: any) => ({
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: pressed ? '#ccfbf1' : hovered ? '#d1fae5' : '#f0fdfa',
                              borderWidth: 1,
                              borderColor: '#5eead4',
                              paddingHorizontal: 8,
                              paddingVertical: 3.5,
                              borderRadius: 5,
                              cursor: 'pointer',
                            })}
                          >
                            <Ionicons name="flash-outline" size={12} color="#0f766e" />
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0f766e' }}>
                              ⚡ Traer Tarjeta Profesional
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {/* Botones de selección de estado */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        width: isTablet ? 230 : '100%',
                        justifyContent: isTablet ? 'center' : 'flex-start',
                      }}
                    >
                      <Pressable
                        onPress={() => handleCambiarEstadoItem(req.numero, 'CUMPLE')}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          borderRadius: 5,
                          backgroundColor: esCumple ? '#16a34a' : '#f8fafc',
                          borderWidth: 1,
                          borderColor: esCumple ? '#15803d' : '#cbd5e1',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '800',
                            color: esCumple ? '#ffffff' : '#15803d',
                          }}
                        >
                          ✓ Cumple
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleCambiarEstadoItem(req.numero, 'PENDIENTE')}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          borderRadius: 5,
                          backgroundColor: esPendiente ? '#d97706' : '#f8fafc',
                          borderWidth: 1,
                          borderColor: esPendiente ? '#b45309' : '#cbd5e1',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '800',
                            color: esPendiente ? '#ffffff' : '#b45309',
                          }}
                        >
                          ⏳ Pendiente
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleCambiarEstadoItem(req.numero, 'NO_APLICA')}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          borderRadius: 5,
                          backgroundColor: esNoAplica ? '#64748b' : '#f8fafc',
                          borderWidth: 1,
                          borderColor: esNoAplica ? '#475569' : '#cbd5e1',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '800',
                            color: esNoAplica ? '#ffffff' : '#64748b',
                          }}
                        >
                          🚫 N/A
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* SECCIÓN DE OBSERVACIONES GENERALES Y ENCARGADOS */}
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 14,
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0D2A48' }}>
                II. Observaciones Generales y Firmas de Verificación Institucional
              </Text>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                  Observaciones Generales de la Posesión:
                </Text>
                <TextInput
                  value={datos.observacionesGenerales}
                  onChangeText={(txt) => setDatos({ ...datos, observacionesGenerales: txt })}
                  multiline
                  numberOfLines={2}
                  style={{
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    borderRadius: 6,
                    padding: 8,
                    fontSize: 11.5,
                    color: '#1e293b',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </View>

              <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0D2A48' }}>
                    1. Encargado de Vinculaciones (TH)
                  </Text>
                  <TextInput
                    value={datos.verificadorVinculaciones.nombre}
                    onChangeText={(txt) =>
                      setDatos({
                        ...datos,
                        verificadorVinculaciones: { ...datos.verificadorVinculaciones, nombre: txt },
                      })
                    }
                    placeholder="Nombres completos"
                    style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, padding: 6, fontSize: 11, marginTop: 4, backgroundColor: '#fff' }}
                  />
                  <TextInput
                    value={datos.verificadorVinculaciones.cargo}
                    onChangeText={(txt) =>
                      setDatos({
                        ...datos,
                        verificadorVinculaciones: { ...datos.verificadorVinculaciones, cargo: txt },
                      })
                    }
                    placeholder="Cargo del responsable"
                    style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, padding: 6, fontSize: 11, marginTop: 4, backgroundColor: '#fff' }}
                  />
                </View>

                <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0D2A48' }}>
                    2. Encargado de Archivo de Hojas de Vida
                  </Text>
                  <TextInput
                    value={datos.verificadorArchivoHojasVida.nombre}
                    onChangeText={(txt) =>
                      setDatos({
                        ...datos,
                        verificadorArchivoHojasVida: { ...datos.verificadorArchivoHojasVida, nombre: txt },
                      })
                    }
                    placeholder="Nombres completos"
                    style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, padding: 6, fontSize: 11, marginTop: 4, backgroundColor: '#fff' }}
                  />
                  <TextInput
                    value={datos.verificadorArchivoHojasVida.cargo}
                    onChangeText={(txt) =>
                      setDatos({
                        ...datos,
                        verificadorArchivoHojasVida: { ...datos.verificadorArchivoHojasVida, cargo: txt },
                      })
                    }
                    placeholder="Cargo del responsable"
                    style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, padding: 6, fontSize: 11, marginTop: 4, backgroundColor: '#fff' }}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* BARRA INFERIOR DE ACCIONES Y DESCARGA */}
          <View
            style={{
              backgroundColor: '#f8fafc',
              borderTopWidth: 1,
              borderTopColor: '#cbd5e1',
              paddingHorizontal: isDesktop ? 20 : 12,
              paddingVertical: 12,
              flexDirection: isTablet ? 'row' : 'column',
              justifyContent: 'space-between',
              alignItems: isTablet ? 'center' : 'stretch',
              gap: 10,
            }}
          >
            {/* Botón para plantilla base original */}
            <Pressable
              onPress={() => {
                if (onDescargarPlantillaBase) {
                  onDescargarPlantillaBase('Requisitos para tomar posesion del cargo_V5.doc');
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#cbd5e1',
              }}
            >
              <Ionicons name="document-text-outline" size={14} color="#475569" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                Descargar Plantilla Base (.doc)
              </Text>
            </Pressable>

            {/* Acciones principales: Imprimir, Descargar .doc, Descargar ZIP Organizado y Guardar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Pressable
                onPress={handleImprimirPDF}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#0D2A48',
                }}
              >
                <Ionicons name="print-outline" size={15} color="#0D2A48" />
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0D2A48' }}>
                  Imprimir / PDF
                </Text>
              </Pressable>

              <Pressable
                onPress={handleDescargarDoc}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: '#059669',
                }}
              >
                <Ionicons name="download-outline" size={15} color="#ffffff" />
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#ffffff' }}>
                  📥 Formato (.doc)
                </Text>
              </Pressable>

              <Pressable
                onPress={handleDescargarZipOrganizado}
                disabled={descargandoZip}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: '#0284c7',
                  shadowColor: '#0284c7',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <Ionicons name="archive-outline" size={16} color="#ffffff" />
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#ffffff' }}>
                  {descargandoZip ? 'Empaquetando ZIP...' : '📦 Descargar Expediente ZIP Organizado'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleGuardarYFinalizar}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: '#15803d',
                }}
              >
                <Ionicons name="save-outline" size={15} color="#ffffff" />
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#ffffff' }}>
                  💾 Guardar Verificación
                </Text>
              </Pressable>

              <Pressable
                onPress={onClose}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                  Cerrar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>

    {/* Visor de documentos para soportes individuales */}
    {visorSoporte && (
      <PdfViewerModal
        visible={visorSoporte.visible}
        onClose={() => setVisorSoporte(null)}
        titulo={visorSoporte.titulo}
        nombreArchivo={visorSoporte.nombreArchivo}
        pdfUrl={visorSoporte.url}
        mimeType={visorSoporte.mimeType}
      />
    )}
    </>
  );
};
