import React, { useState } from 'react';
import { View, Text, Pressable, Platform, Modal, ScrollView, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface BotonDescargaFuncionesTxtProps {
  funciones?: string[] | string | null;
  cargo?: string | null;
  codigo?: string | null;
  grado?: string | null;
  id_sideap?: string | number | null;
  id_plaza?: string | number | null;
  variante?: 'card' | 'boton' | 'compacto' | 'outline';
  etiqueta?: string;
  estiloContenedor?: any;
  mostrarInstrucciones?: boolean;
}

/**
 * Normaliza y procesa la lista de funciones conforme a los requerimientos oficiales de cargue masivo:
 * 1. Formato UTF-8 y extensión .txt
 * 2. Cada función en una sola línea (separadas únicamente por salto de línea \n)
 * 3. Sin enumerar (eliminando 1., 2., 1)-, etc.) y conservando el orden exacto del Manual Específico
 */
export function procesarFuncionesParaTxt(funcionesRaw: string[] | string | null | undefined): string[] {
  if (!funcionesRaw) return [];

  let listaInicial: string[] = [];
  if (Array.isArray(funcionesRaw)) {
    listaInicial = funcionesRaw.map((s) => String(s || '')).filter(Boolean);
  } else if (typeof funcionesRaw === 'string') {
    listaInicial = funcionesRaw.split('\n').map((s) => s.trim()).filter(Boolean);
  }

  // Descomponer posibles funciones concatenadas en un mismo string (ej. "1. Efectuar... 2. Realizar...")
  const itemsDesglosados: string[] = [];
  for (const item of listaInicial) {
    const partes = item
      .split(/(?=(?:^|\n|[\.\s])\d+[\.\)]\s*[A-ZÁÉÍÓÚÑ])/g)
      .map((p) => p.replace(/^[\s\.\,\;\-]+/, '').trim())
      .filter((p) => p.length > 4);

    if (partes.length > 1) {
      itemsDesglosados.push(...partes);
    } else if (item.trim().length > 0) {
      itemsDesglosados.push(item.trim());
    }
  }

  // Limpiar enumeraciones y asegurar que cada función quede en una línea limpia sin saltos internos
  const funcionesLimpias: string[] = itemsDesglosados
    .map((f) => {
      return f
        // Quita numeraciones iniciales: "1.", "1. ", "1.-", "1)", "01.", etc.
        .replace(/^\s*\d+[\.\-\)\s]+\s*/, '')
        // Reemplaza saltos de línea internos por espacio para asegurar que cada función ocupe estrictamente una sola línea
        .replace(/[\r\n]+/g, ' ')
        // Colapsa espacios redundantes
        .replace(/\s+/g, ' ')
        .trim();
    })
    .filter((f) => f.length > 0);

  return funcionesLimpias;
}

export default function BotonDescargaFuncionesTxt({
  funciones,
  cargo,
  codigo,
  grado,
  id_sideap,
  id_plaza,
  variante = 'boton',
  etiqueta,
  estiloContenedor,
  mostrarInstrucciones = true,
}: BotonDescargaFuncionesTxtProps) {
  const [modalFeedback, setModalFeedback] = useState<{
    visible: boolean;
    tipo: 'exito' | 'error' | 'preview';
    titulo: string;
    mensaje: string;
    nombreArchivo?: string;
    totalFunciones?: number;
    contenidoPreview?: string[];
  }>({
    visible: false,
    tipo: 'exito',
    titulo: '',
    mensaje: '',
  });

  const funcionesProcesadas = procesarFuncionesParaTxt(funciones);

  // Generación de nombre descriptivo normalizado
  const slugCargo = (cargo || 'cargo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const parteCodigo = codigo ? `_cod${codigo}` : '';
  const parteGrado = grado ? `_gr${grado}` : '';
  const parteSideap = id_sideap ? `_sideap${id_sideap}` : '';
  const partePlaza = !id_sideap && id_plaza ? `_plaza${id_plaza}` : '';

  const nombreArchivoFinal = `funciones_${slugCargo}${parteCodigo}${parteGrado}${parteSideap}${partePlaza}.txt`;

  const ejecutarDescarga = () => {
    if (funcionesProcesadas.length === 0) {
      setModalFeedback({
        visible: true,
        tipo: 'error',
        titulo: 'Sin funciones para descargar',
        mensaje:
          'Este empleo no cuenta con funciones registradas en el Manual de Funciones del sistema. Por favor edite o cargue las funciones antes de descargar.',
      });
      return;
    }

    // Cada función va en una línea exacta separada por \n
    const contenidoTxt = funcionesProcesadas.join('\n');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const blob = new Blob([contenidoTxt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombreArchivoFinal;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        URL.revokeObjectURL(url);

        setModalFeedback({
          visible: true,
          tipo: 'exito',
          titulo: 'Descarga Iniciada con Éxito',
          mensaje: `Se ha generado y descargado el archivo .txt en formato UTF-8 listo para cargue oficial (SIDEAP / SIMO / CNSC).`,
          nombreArchivo: nombreArchivoFinal,
          totalFunciones: funcionesProcesadas.length,
          contenidoPreview: funcionesProcesadas,
        });
      } catch (err: any) {
        setModalFeedback({
          visible: true,
          tipo: 'error',
          titulo: 'Error en la descarga',
          mensaje: `No se pudo generar el archivo: ${err?.message || 'Error desconocido'}`,
        });
      }
    } else {
      // Dispositivos móviles
      try {
        Share.share({
          title: nombreArchivoFinal,
          message: contenidoTxt,
        });
        setModalFeedback({
          visible: true,
          tipo: 'exito',
          titulo: 'Archivo Generado',
          mensaje: `El archivo con ${funcionesProcesadas.length} funciones está listo para compartir o guardar en su dispositivo.`,
          nombreArchivo: nombreArchivoFinal,
          totalFunciones: funcionesProcesadas.length,
        });
      } catch (err: any) {
        setModalFeedback({
          visible: true,
          tipo: 'error',
          titulo: 'Error al exportar',
          mensaje: `No se pudo compartir el archivo: ${err?.message || 'Error desconocido'}`,
        });
      }
    }
  };

  const abrirVistaPrevia = () => {
    if (funcionesProcesadas.length === 0) {
      setModalFeedback({
        visible: true,
        tipo: 'error',
        titulo: 'Sin funciones disponibles',
        mensaje: 'No hay funciones registradas para generar la vista previa.',
      });
      return;
    }

    setModalFeedback({
      visible: true,
      tipo: 'preview',
      titulo: 'Vista Previa del Archivo .txt (UTF-8)',
      mensaje:
        'A continuación se muestra el contenido exacto que se descargará, cumpliendo con cada función en una línea sin enumerar.',
      nombreArchivo: nombreArchivoFinal,
      totalFunciones: funcionesProcesadas.length,
      contenidoPreview: funcionesProcesadas,
    });
  };

  const textoBoton = etiqueta || 'Descargar .txt (Formato SIDEAP)';

  return (
    <>
      {/* VARIANTE: CARD DESTACADA CON INSTRUCCIONES FORMALES */}
      {variante === 'card' && (
        <View
          style={{
            backgroundColor: '#F0FDF4',
            borderColor: '#86EFAC',
            borderWidth: 1.5,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            ...estiloContenedor,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 260 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <View
                  style={{
                    backgroundColor: '#16A34A',
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="document-text" size={16} color="#FFFFFF" />
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: '#14532D',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Descarga para Cargue Oficial (.txt UTF-8)
                </Text>
              </View>

              {mostrarInstrucciones && (
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#BBF7D0',
                    padding: 12,
                    marginTop: 4,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" style={{ marginTop: 2 }} />
                    <Text style={{ fontSize: 12, color: '#166534', flex: 1, lineHeight: 17 }}>
                      El archivo a cargar debe tener <Text style={{ fontWeight: '700' }}>extensión .txt</Text> y{' '}
                      <Text style={{ fontWeight: '700' }}>formato UTF8</Text>.
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" style={{ marginTop: 2 }} />
                    <Text style={{ fontSize: 12, color: '#166534', flex: 1, lineHeight: 17 }}>
                      <Text style={{ fontWeight: '700' }}>Cada función debe ir en una línea</Text>, es decir, para
                      terminar cada línea debe pulsar o insertar un salto de línea.
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" style={{ marginTop: 2 }} />
                    <Text style={{ fontSize: 12, color: '#166534', flex: 1, lineHeight: 17 }}>
                      Se recomienda <Text style={{ fontWeight: '700' }}>no enumerar las funciones</Text> y mantener el
                      mismo orden del Manual Específico de Funciones y Competencias Laborales.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch', justifyContent: 'center' }}>
              <Pressable
                onPress={ejecutarDescarga}
                style={({ pressed, hovered }: any) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: pressed ? '#14532D' : hovered ? '#15803D' : '#16A34A',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  shadowColor: '#166534',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.18,
                  shadowRadius: 4,
                  elevation: 2,
                  cursor: 'pointer',
                })}
              >
                <Ionicons name="download-outline" size={17} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{textoBoton}</Text>
              </Pressable>

              <Pressable
                onPress={abrirVistaPrevia}
                style={({ pressed, hovered }: any) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: pressed ? '#DCFCE7' : hovered ? '#F0FDF4' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#86EFAC',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  cursor: 'pointer',
                })}
              >
                <Ionicons name="eye-outline" size={15} color="#15803D" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#15803D' }}>Ver Texto a Descargar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* VARIANTE: BOTÓN ESTÁNDAR ELEGANTE */}
      {variante === 'boton' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, ...estiloContenedor }}>
          <Pressable
            onPress={ejecutarDescarga}
            style={({ pressed, hovered }: any) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              backgroundColor: pressed ? '#14532D' : hovered ? '#15803D' : '#16A34A',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              shadowColor: '#166534',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 3,
              elevation: 2,
              cursor: 'pointer',
            })}
          >
            <Ionicons name="download-outline" size={16} color="#FFFFFF" />
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>{textoBoton}</Text>
          </Pressable>

          <Pressable
            onPress={abrirVistaPrevia}
            accessibilityLabel="Ver instrucciones y previsualizar formato .txt"
            style={({ pressed, hovered }: any) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: pressed ? '#DCFCE7' : hovered ? '#F0FDF4' : '#FFFFFF',
              borderWidth: 1,
              borderColor: '#86EFAC',
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 8,
              cursor: 'pointer',
            })}
          >
            <Ionicons name="information-circle-outline" size={15} color="#15803D" />
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#15803D' }}>Requisitos .txt</Text>
          </Pressable>
        </View>
      )}

      {/* VARIANTE: COMPACTO (IDEAL PARA ENCABEZADOS Y BARRAS DE ACCIONES) */}
      {variante === 'compacto' && (
        <Pressable
          onPress={ejecutarDescarga}
          style={({ pressed, hovered }: any) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: pressed ? '#14532D' : hovered ? '#15803D' : '#16A34A',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 6,
            cursor: 'pointer',
            ...estiloContenedor,
          })}
        >
          <Ionicons name="download-outline" size={14} color="#FFFFFF" />
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>{textoBoton}</Text>
        </Pressable>
      )}

      {/* VARIANTE: OUTLINE (DISCRETO Y MINIMALISTA) */}
      {variante === 'outline' && (
        <Pressable
          onPress={ejecutarDescarga}
          style={({ pressed, hovered }: any) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: pressed ? '#F0FDF4' : hovered ? '#F8FAFC' : '#FFFFFF',
            borderWidth: 1,
            borderColor: '#16A34A',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 7,
            cursor: 'pointer',
            ...estiloContenedor,
          })}
        >
          <Ionicons name="download-outline" size={15} color="#16A34A" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>{textoBoton}</Text>
        </Pressable>
      )}

      {/* MODAL INSTITUCIONAL PARA FEEDBACK, VISTA PREVIA Y CONFIRMACIÓN (SIN ALERTS) */}
      <Modal
        visible={modalFeedback.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalFeedback((prev) => ({ ...prev, visible: false }))}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              width: '100%',
              maxWidth: 580,
              maxHeight: '85%',
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            {/* Header del Modal */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 16,
                backgroundColor:
                  modalFeedback.tipo === 'error'
                    ? '#FEF2F2'
                    : modalFeedback.tipo === 'preview'
                    ? '#F8FAFC'
                    : '#F0FDF4',
                borderBottomWidth: 1,
                borderBottomColor:
                  modalFeedback.tipo === 'error'
                    ? '#FEE2E2'
                    : modalFeedback.tipo === 'preview'
                    ? '#E2E8F0'
                    : '#DCFCE7',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor:
                      modalFeedback.tipo === 'error'
                        ? '#DC2626'
                        : modalFeedback.tipo === 'preview'
                        ? '#334155'
                        : '#16A34A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={
                      modalFeedback.tipo === 'error'
                        ? 'alert-circle'
                        : modalFeedback.tipo === 'preview'
                        ? 'list-outline'
                        : 'checkmark-circle'
                    }
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color:
                        modalFeedback.tipo === 'error'
                          ? '#991B1B'
                          : modalFeedback.tipo === 'preview'
                          ? '#0F172A'
                          : '#14532D',
                    }}
                  >
                    {modalFeedback.titulo}
                  </Text>
                  {modalFeedback.nombreArchivo && (
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                      Archivo: {modalFeedback.nombreArchivo}
                    </Text>
                  )}
                </View>
              </View>

              <Pressable
                onPress={() => setModalFeedback((prev) => ({ ...prev, visible: false }))}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            {/* Contenido del Modal */}
            <ScrollView style={{ padding: 20 }}>
              <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20, marginBottom: 14 }}>
                {modalFeedback.mensaje}
              </Text>

              {/* Caja de Reglas Oficiales Recordatorio */}
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 14,
                  marginBottom: 16,
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '800',
                    color: '#0F172A',
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  Especificaciones Oficiales de Cargue SIDEAP / SIMO
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 12, color: '#475569', flex: 1, lineHeight: 17 }}>
                    El archivo a cargar debe tener <Text style={{ fontWeight: '700' }}>extensión .txt</Text> y{' '}
                    <Text style={{ fontWeight: '700' }}>formato UTF8</Text>.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 12, color: '#475569', flex: 1, lineHeight: 17 }}>
                    <Text style={{ fontWeight: '700' }}>Cada función debe ir en una línea</Text>, es decir, para
                    terminar cada línea debe pulsar o insertar un salto de línea.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 12, color: '#475569', flex: 1, lineHeight: 17 }}>
                    Se recomienda <Text style={{ fontWeight: '700' }}>no enumerar las funciones</Text> y mantener el
                    mismo orden del Manual Específico de Funciones y Competencias Laborales.
                  </Text>
                </View>
              </View>

              {/* Vista previa de las líneas de funciones */}
              {modalFeedback.contenidoPreview && modalFeedback.contenidoPreview.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', textTransform: 'uppercase' }}>
                      Líneas del archivo ({modalFeedback.contenidoPreview.length} funciones)
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>1 función por línea · Sin numeración</Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: '#0F172A',
                      borderRadius: 8,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    {modalFeedback.contenidoPreview.map((linea, lIdx) => (
                      <View
                        key={lIdx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: 10,
                          borderBottomWidth: lIdx === (modalFeedback.contenidoPreview?.length ?? 0) - 1 ? 0 : 1,
                          borderBottomColor: '#1E293B',
                          paddingBottom: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
                            color: '#64748B',
                            width: 22,
                            textAlign: 'right',
                          }}
                        >
                          {lIdx + 1}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
                            color: '#E2E8F0',
                            flex: 1,
                            lineHeight: 17,
                          }}
                        >
                          {linea}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer con Acciones */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 10,
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: '#F8FAFC',
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
              }}
            >
              <Pressable
                onPress={() => setModalFeedback((prev) => ({ ...prev, visible: false }))}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>Cerrar</Text>
              </Pressable>

              {modalFeedback.tipo === 'preview' && (
                <Pressable
                  onPress={() => {
                    setModalFeedback((prev) => ({ ...prev, visible: false }));
                    ejecutarDescarga();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                    backgroundColor: '#16A34A',
                  }}
                >
                  <Ionicons name="download-outline" size={15} color="#FFFFFF" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Descargar Archivo Ahora</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
