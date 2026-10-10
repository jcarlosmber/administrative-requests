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
import {
  requisitosPosesionService,
  LISTA_32_REQUISITOS_FT095,
  DatosFormatoFT095Diligenciado,
  EstadoItemFT095,
} from '../../lib/requisitosPosesionService';

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
}

export const ModalRequisitosPosesionFT095: React.FC<ModalRequisitosPosesionFT095Props> = ({
  visible,
  onClose,
  servidorInicial,
  onDescargarPlantillaBase,
}) => {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  const [datos, setDatos] = useState<DatosFormatoFT095Diligenciado>(() =>
    requisitosPosesionService.crearEstadoInicial(servidorInicial)
  );

  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'CUMPLE' | 'PENDIENTE' | 'NO_APLICA'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarEncabezadoEditable, setMostrarEncabezadoEditable] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Sincronizar cuando cambia el servidor inicial seleccionado
  useEffect(() => {
    if (servidorInicial && servidorInicial.cedula) {
      setDatos(requisitosPosesionService.crearEstadoInicial(servidorInicial));
    }
  }, [servidorInicial?.cedula, servidorInicial?.nombre]);

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

  if (!visible) return null;

  return (
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

            {/* Acciones principales: Imprimir y Descargar Diligenciado */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Pressable
                onPress={handleImprimirPDF}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#0D2A48',
                }}
              >
                <Ionicons name="print-outline" size={15} color="#0D2A48" />
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0D2A48' }}>
                  Imprimir / PDF Oficial
                </Text>
              </Pressable>

              <Pressable
                onPress={handleDescargarDoc}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 8.5,
                  borderRadius: 6,
                  backgroundColor: '#059669',
                  shadowColor: '#059669',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Ionicons name="download-outline" size={16} color="#ffffff" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                  📥 Descargar Formato Diligenciado (.doc)
                </Text>
              </Pressable>

              <Pressable
                onPress={onClose}
                style={{
                  paddingHorizontal: 14,
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
  );
};
