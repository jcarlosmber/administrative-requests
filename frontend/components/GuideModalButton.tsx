import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  useWindowDimensions,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GuideModalButtonProps {
  imageSource: ImageSourcePropType;
  title: string;
  subtitle?: string;
  themeColor?: string;
  buttonStyle?: object;
  floating?: boolean;
}

const resolveSourceUri = (source: any): string | null => {
  if (!source) return null;
  if (typeof source === 'string') return source;
  if (typeof source === 'object') {
    if (typeof source.uri === 'string') return source.uri;
    if (source.default) {
      if (typeof source.default === 'string') return source.default;
      if (typeof source.default.uri === 'string') return source.default.uri;
    }
  }
  try {
    const resolver = (Image as any)?.resolveAssetSource;
    if (typeof resolver === 'function') {
      const res = resolver(source);
      if (res?.uri) return res.uri;
    }
  } catch (e) {
    // Si falla la resolución de asset nativo, retornar null de forma segura
  }
  return null;
};

export const GuideModalButton: React.FC<GuideModalButtonProps> = ({
  imageSource,
  title,
  subtitle = 'Flujograma y guía del trámite institucional',
  themeColor = '#E63946',
  buttonStyle,
  floating = true,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Dimensiones calculadas dinámicamente para móvil y desktop
  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;
  const modalWidth = isMobile ? Math.min(windowWidth * 0.96, 500) : Math.min(windowWidth * 0.94, 1100);
  const modalHeight = isMobile ? Math.min(windowHeight * 0.92, 700) : Math.min(windowHeight * 0.88, 850);

  const handleOpenImageInNewTab = () => {
    if (Platform.OS === 'web') {
      try {
        const uri = resolveSourceUri(imageSource);
        if (uri) {
          window.open(uri, '_blank');
        } else {
          setZoomLevel((prev) => Math.min(prev + 0.5, 3));
        }
      } catch (err) {
        console.warn('No se pudo abrir la imagen en nueva pestaña:', err);
      }
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(Number((prev + 0.3).toFixed(1)), 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(Number((prev - 0.3).toFixed(1)), 0.8));
  const handleZoomReset = () => setZoomLevel(1);

  const baseImageWidth = modalWidth - (isMobile ? 20 : 40);
  const baseImageHeight = modalHeight - (isMobile ? 110 : 140);

  return (
    <>
      <View
        style={[
          floating
            ? {
                position: 'absolute',
                top: Platform.OS === 'web' ? (isDesktop ? 20 : 12) : 10,
                right: Platform.OS === 'web' ? (isDesktop ? 24 : 12) : 10,
                zIndex: 999,
              }
            : null,
          buttonStyle,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setZoomLevel(1);
            setModalVisible(true);
          }}
          accessibilityLabel={`Guía de ${title}`}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 999,
            paddingVertical: isMobile ? 6 : 8,
            paddingHorizontal: isDesktop ? 14 : isMobile ? 8 : 10,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 6,
            borderWidth: 1.5,
            borderColor: '#E2E8F0',
            gap: isMobile ? 4 : 6,
          }}
        >
          <View
            style={{
              width: isMobile ? 28 : 32,
              height: isMobile ? 28 : 32,
              borderRadius: 16,
              backgroundColor: themeColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="help" size={isMobile ? 17 : 20} color="#FFFFFF" />
          </View>
          <View>
            <Text
              style={{
                fontSize: isMobile ? 12 : 13,
                fontWeight: '700',
                color: '#1E293B',
                letterSpacing: 0.2,
              }}
            >
              Guía
            </Text>
            {isDesktop && (
              <Text style={{ fontSize: 10, color: '#64748B', marginTop: -2 }}>
                del flujo
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          {/* Card Principal del Modal */}
          <View
            style={{
              width: modalWidth,
              height: modalHeight,
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.25,
              shadowRadius: 32,
              elevation: 12,
            }}
          >
            {/* Header del Modal */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: themeColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="information-circle" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: '#0F172A',
                    }}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#64748B',
                    }}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                </View>
              </View>

              {/* Acciones de la Cabecera (Controles de Zoom y Cerrar) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* Controles de Zoom */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#EDE9FE',
                    borderRadius: 10,
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    gap: 2,
                  }}
                >
                  <TouchableOpacity
                    onPress={handleZoomOut}
                    style={{ padding: 6 }}
                    accessibilityLabel="Reducir zoom"
                  >
                    <Ionicons name="remove" size={16} color="#4C1D95" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleZoomReset}
                    style={{ paddingHorizontal: 6 }}
                    accessibilityLabel="Restablecer zoom"
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#4C1D95' }}>
                      {Math.round(zoomLevel * 100)}%
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleZoomIn}
                    style={{ padding: 6 }}
                    accessibilityLabel="Aumentar zoom"
                  >
                    <Ionicons name="add" size={16} color="#4C1D95" />
                  </TouchableOpacity>
                </View>

                {Platform.OS === 'web' && (
                  <TouchableOpacity
                    onPress={handleOpenImageInNewTab}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      gap: 4,
                    }}
                    accessibilityLabel="Abrir imagen en resolución original"
                  >
                    <Ionicons name="open-outline" size={16} color="#334155" />
                    {isDesktop && (
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>
                        Ver original
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#E2E8F0',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  accessibilityLabel="Cerrar modal"
                >
                  <Ionicons name="close" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Contenedor Visualizador de la Guía con Scroll Bidireccional */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#0F172A',
                overflow: 'hidden',
              }}
            >
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={0.8}
                bouncesZoom={true}
                showsVerticalScrollIndicator={true}
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 16,
                }}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Image
                    source={imageSource}
                    resizeMode="contain"
                    style={{
                      width: baseImageWidth * zoomLevel,
                      height: baseImageHeight * zoomLevel,
                    }}
                  />
                </ScrollView>
              </ScrollView>
            </View>

            {/* Footer del Modal */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
                backgroundColor: '#FFFFFF',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="bulb-outline" size={16} color="#64748B" />
                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  Usa los botones de zoom (+ / -) y desplázate para explorar todo el flujograma
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  backgroundColor: themeColor,
                  paddingVertical: 8,
                  paddingHorizontal: 22,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  Entendido
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
