import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface GuideModalButtonProps {
  imageSource: ImageSourcePropType;
  title: string;
  subtitle?: string;
  themeColor?: string;
  buttonStyle?: object;
  floating?: boolean;
}

export const GuideModalButton: React.FC<GuideModalButtonProps> = ({
  imageSource,
  title,
  subtitle = 'Flujograma y guía del trámite institucional',
  themeColor = '#E63946',
  buttonStyle,
  floating = true,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

  // Dimensiones calculadas para el contenedor de la imagen en modal
  const modalWidth = Math.min(windowWidth * 0.94, 1000);
  const modalHeight = Math.min(windowHeight * 0.88, 850);
  const isDesktop = windowWidth >= 1024;

  const handleOpenImageInNewTab = () => {
    if (Platform.OS === 'web') {
      try {
        const resolvedUri = Image.resolveAssetSource(imageSource)?.uri;
        if (resolvedUri) {
          window.open(resolvedUri, '_blank');
        }
      } catch (err) {
        console.warn('No se pudo abrir la imagen en nueva pestaña:', err);
      }
    }
  };

  return (
    <>
      <View
        style={[
          floating
            ? {
                position: 'absolute',
                top: Platform.OS === 'web' ? 20 : 12,
                right: Platform.OS === 'web' ? 24 : 16,
                zIndex: 999,
              }
            : null,
          buttonStyle,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
          accessibilityLabel={`Guía de ${title}`}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 999,
            paddingVertical: 8,
            paddingHorizontal: isDesktop ? 14 : 10,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 6,
            borderWidth: 1.5,
            borderColor: '#E2E8F0',
            gap: 6,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: themeColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="help" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 13,
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
            backgroundColor: 'rgba(15, 23, 42, 0.82)',
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

              {/* Acciones de la Cabecera */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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

            {/* Contenedor Visualizador de la Guía */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#0F172A',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                bouncesZoom={true}
                showsVerticalScrollIndicator={true}
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 12,
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
                    onLoad={() => setImageLoaded(true)}
                    style={{
                      width: modalWidth - 32,
                      height: modalHeight - 130,
                      maxWidth: '100%',
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
                  {Platform.OS === 'web'
                    ? 'Puedes usar "Ver original" para abrir la imagen en alta definición'
                    : 'Puedes pellizcar para hacer zoom en la imagen'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  backgroundColor: themeColor,
                  paddingVertical: 8,
                  paddingHorizontal: 20,
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
