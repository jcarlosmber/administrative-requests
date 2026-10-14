import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
  Linking,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PdfViewerModalProps {
  visible: boolean;
  onClose: () => void;
  titulo?: string;
  nombreArchivo?: string;
  pdfUrl?: string | null;
  pdfBase64?: string | null;
  mimeType?: string | null;
}

export default function PdfViewerModal({
  visible,
  onClose,
  titulo,
  nombreArchivo,
  pdfUrl,
  pdfBase64,
  mimeType
}: PdfViewerModalProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!visible) {
      setResolvedUrl(null);
      return;
    }

    if (pdfBase64) {
      try {
        setCargando(true);
        const clean = pdfBase64.includes(';base64,') ? pdfBase64.split(';base64,')[1] : pdfBase64;
        const byteCharacters = atob(clean);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const inferredMime = mimeType || (pdfBase64.includes('image/') ? 'image/png' : 'application/pdf');
        const blob = new Blob([byteArray], { type: inferredMime });
        const objectUrl = URL.createObjectURL(blob);
        setResolvedUrl(objectUrl);
        setCargando(false);

        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch (e) {
        console.error('Error al decodificar documento base64:', e);
        setResolvedUrl(`data:${mimeType || 'application/pdf'};base64,${pdfBase64}`);
        setCargando(false);
      }
    } else if (pdfUrl) {
      setResolvedUrl(pdfUrl);
      setCargando(false);
    } else {
      setResolvedUrl(null);
      setCargando(false);
    }
  }, [visible, pdfBase64, pdfUrl, mimeType]);

  const abrirEnPestanaNueva = () => {
    if (!resolvedUrl) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(resolvedUrl, '_blank');
    } else {
      Linking.openURL(resolvedUrl);
    }
  };

  const descargarArchivo = () => {
    if (!resolvedUrl) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = resolvedUrl;
      a.download = nombreMostrar;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      Linking.openURL(resolvedUrl);
    }
  };

  const nombreMostrar = nombreArchivo || 'documento.pdf';
  const tituloMostrar = titulo || nombreMostrar;

  const ext = (nombreMostrar.split('.').pop() || '').toLowerCase();
  const esImagen = (mimeType && mimeType.startsWith('image/')) || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  const esExcel = ['xls', 'xlsx', 'csv'].includes(ext);
  const esWord = ['doc', 'docx'].includes(ext);
  const esPdf = !esImagen && !esExcel && !esWord && (mimeType?.includes('pdf') || ext === 'pdf' || !mimeType);

  const iconoHeader = esImagen ? 'image' : esExcel ? 'grid' : esWord ? 'document' : esPdf ? 'document-text' : 'attach';
  const colorHeaderIcono = esImagen ? '#6366F1' : esExcel ? '#16A34A' : esWord ? '#2563EB' : esPdf ? '#DC2626' : '#0D2A48';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Platform.OS === 'web' ? 20 : 10,
          zIndex: 99999,
          elevation: 25,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            width: '100%',
            maxWidth: 1150,
            height: '92%',
            borderWidth: 1,
            borderColor: '#CBD5E1',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35,
            shadowRadius: 24,
            elevation: 25,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header Superior Corporativo */}
          <View
            style={{
              backgroundColor: '#0F172A',
              paddingHorizontal: 18,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: '#1E293B',
              gap: 12
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
              <View
                style={{
                  backgroundColor: colorHeaderIcono,
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Ionicons name={iconoHeader as any} size={19} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: '#F8FAFC',
                    letterSpacing: -0.2
                  }}
                >
                  {tituloMostrar}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    color: '#94A3B8',
                    marginTop: 1
                  }}
                >
                  {nombreMostrar}
                </Text>
              </View>
            </View>

            {/* Acciones de la barra de herramientas */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {resolvedUrl && (
                <>
                  <TouchableOpacity
                    onPress={descargarArchivo}
                    style={{
                      backgroundColor: '#1E293B',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: '#334155'
                    }}
                    accessibilityLabel="Descargar archivo adjunto"
                  >
                    <Ionicons name="download-outline" size={15} color="#38BDF8" />
                    <Text style={{ color: '#F1F5F9', fontSize: 12, fontWeight: '700' }}>
                      Descargar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={abrirEnPestanaNueva}
                    style={{
                      backgroundColor: '#1E293B',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: '#334155'
                    }}
                    accessibilityLabel="Abrir en pestaña nueva"
                  >
                    <Ionicons name="open-outline" size={15} color="#38BDF8" />
                    <Text style={{ color: '#F1F5F9', fontSize: 12, fontWeight: '700' }}>
                      Abrir en pestaña nueva
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                onPress={onClose}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  backgroundColor: '#1E293B',
                  borderWidth: 1,
                  borderColor: '#334155'
                }}
                accessibilityLabel="Cerrar visor"
              >
                <Ionicons name="close" size={20} color="#F1F5F9" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Contenido / Visor de Documento */}
          <View
            style={{
              flex: 1,
              backgroundColor: esImagen ? '#0B0F19' : '#F1F5F9',
              position: 'relative'
            }}
          >
            {cargando ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator size="large" color="#1E40AF" />
                <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600' }}>
                  Cargando documento...
                </Text>
              </View>
            ) : resolvedUrl ? (
              Platform.OS === 'web' ? (
                esImagen ? (
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: '#0F172A',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20
                    }}
                  >
                    {React.createElement('img', {
                      src: resolvedUrl,
                      alt: tituloMostrar,
                      style: {
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
                        backgroundColor: '#1E293B',
                      }
                    })}
                  </View>
                ) : esPdf ? (
                  React.createElement('iframe', {
                    src: resolvedUrl,
                    title: tituloMostrar,
                    style: {
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }
                  })
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 12,
                        backgroundColor: esExcel ? '#DCFCE7' : '#DBEAFE',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16
                      }}
                    >
                      <Ionicons
                        name={esExcel ? 'grid' : 'document'}
                        size={40}
                        color={esExcel ? '#16A34A' : '#2563EB'}
                      />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                      {nombreMostrar}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8, maxWidth: 440, lineHeight: 18 }}>
                      Este archivo de oficina ({ext.toUpperCase()}) se encuentra listo para descargar o abrir en tu software de edición local preferido.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                      <TouchableOpacity
                        onPress={descargarArchivo}
                        style={{
                          backgroundColor: '#1E40AF',
                          paddingHorizontal: 18,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                          Descargar Documento
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={abrirEnPestanaNueva}
                        style={{
                          backgroundColor: '#E2E8F0',
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Ionicons name="open-outline" size={16} color="#1E293B" />
                        <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 13 }}>
                          Abrir archivo
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                  <Ionicons name="document-text-outline" size={48} color="#1E40AF" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 12 }}>
                    Visualizador de Documentos
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, maxWidth: 360 }}>
                    La previsualización interactiva integrada en ventana está optimizada para navegador web de escritorio.
                  </Text>
                  <TouchableOpacity
                    onPress={abrirEnPestanaNueva}
                    style={{
                      marginTop: 16,
                      backgroundColor: '#1E40AF',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                      Abrir en Visor Externo
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#FEE2E2',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12
                  }}
                >
                  <Ionicons name="alert-circle-outline" size={36} color="#DC2626" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  Documento no disponible
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, maxWidth: 440, lineHeight: 18 }}>
                  No se encontró el contenido digital correspondiente a este registro ({nombreMostrar}).
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    marginTop: 18,
                    backgroundColor: '#E2E8F0',
                    paddingHorizontal: 18,
                    paddingVertical: 8,
                    borderRadius: 6
                  }}
                >
                  <Text style={{ color: '#334155', fontWeight: '700', fontSize: 13 }}>
                    Cerrar
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
