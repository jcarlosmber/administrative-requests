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
}

export default function PdfViewerModal({
  visible,
  onClose,
  titulo,
  nombreArchivo,
  pdfUrl,
  pdfBase64
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
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        setResolvedUrl(objectUrl);
        setCargando(false);

        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch (e) {
        console.error('Error al decodificar PDF base64:', e);
        setResolvedUrl(`data:application/pdf;base64,${pdfBase64}`);
        setCargando(false);
      }
    } else if (pdfUrl) {
      setResolvedUrl(pdfUrl);
      setCargando(false);
    } else {
      setResolvedUrl(null);
      setCargando(false);
    }
  }, [visible, pdfBase64, pdfUrl]);

  const abrirEnPestanaNueva = () => {
    if (!resolvedUrl) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(resolvedUrl, '_blank');
    } else {
      Linking.openURL(resolvedUrl);
    }
  };

  const nombreMostrar = nombreArchivo || 'documento.pdf';
  const tituloMostrar = titulo || nombreMostrar;

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
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Platform.OS === 'web' ? 20 : 10
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            width: '100%',
            maxWidth: 1100,
            height: '92%',
            borderWidth: 1,
            borderColor: '#CBD5E1',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 15,
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
                  backgroundColor: '#DC2626',
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Ionicons name="document-text" size={18} color="#FFFFFF" />
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
                  accessibilityLabel="Abrir PDF en pestaña nueva"
                >
                  <Ionicons name="open-outline" size={15} color="#38BDF8" />
                  <Text style={{ color: '#F1F5F9', fontSize: 12, fontWeight: '700' }}>
                    Abrir en pestaña nueva
                  </Text>
                </TouchableOpacity>
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

          {/* Contenido / Visor de PDF */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#F1F5F9',
              position: 'relative'
            }}
          >
            {cargando ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator size="large" color="#1E40AF" />
                <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600' }}>
                  Cargando documento PDF...
                </Text>
              </View>
            ) : resolvedUrl ? (
              Platform.OS === 'web' ? (
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
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                  <Ionicons name="document-text-outline" size={48} color="#1E40AF" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 12 }}>
                    Visualizador de Documentos PDF
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
                      Abrir PDF en Visor Externo
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
                  Archivo PDF no disponible
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, maxWidth: 440, lineHeight: 18 }}>
                  No se encontró el archivo digital correspondiente a este registro ({nombreMostrar}). Si el dictamen fue creado en una versión previa, los archivos originales no fueron persistidos en el servidor.
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
