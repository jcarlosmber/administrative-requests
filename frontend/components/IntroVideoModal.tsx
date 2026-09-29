import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
  Platform,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

interface IntroVideoModalProps {
  visible: boolean;
  onClose: () => void;
}

const videoSource = require('../assets/videos/video_intro.mp4');

const resolveSourceUri = (source: any): string => {
  if (!source) return '';
  if (typeof source === 'string') return source;
  if (typeof source === 'object') {
    if (typeof source.uri === 'string') return source.uri;
    if (source.default) {
      if (typeof source.default === 'string') return source.default;
      if (typeof source.default?.uri === 'string') return source.default.uri;
    }
  }
  try {
    const resolver = (Image as any)?.resolveAssetSource;
    if (typeof resolver === 'function') {
      const res = resolver(source);
      if (res?.uri) return res.uri;
    }
  } catch (e) {
    // Retornar fallback vacío
  }
  return '';
};

export const IntroVideoModal: React.FC<IntroVideoModalProps> = ({ visible, onClose }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 992;
  const isMobile = windowWidth < 600;

  const webVideoRef = useRef<any>(null);

  // Player de expo-video para plataformas compatibles
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
  });

  // Pausar o reproducir según visibilidad
  useEffect(() => {
    if (visible) {
      if (Platform.OS === 'web' && webVideoRef.current) {
        try {
          webVideoRef.current.currentTime = 0;
          webVideoRef.current.play().catch(() => {
            // Autoplay bloqueado por políticas del navegador si no hubo interacción previa
          });
        } catch (_) {}
      } else if (player) {
        try {
          player.currentTime = 0;
          player.play();
        } catch (_) {}
      }
    } else {
      if (Platform.OS === 'web' && webVideoRef.current) {
        try {
          webVideoRef.current.pause();
        } catch (_) {}
      } else if (player) {
        try {
          player.pause();
        } catch (_) {}
      }
    }
  }, [visible, player]);

  // Listener para cerrar con tecla Esc en Web
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onClose]);

  const modalWidth = isMobile
    ? Math.min(windowWidth - 16, 480)
    : Math.min(windowWidth * 0.88, 1020);

  const modalHeight = isMobile
    ? Math.min(windowHeight * 0.82, 540)
    : Math.min(windowHeight * 0.88, 720);

  const videoUri = resolveSourceUri(videoSource);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isMobile && styles.overlayMobile]}>
        {/* Fondo oscuro cerrable al hacer clic */}
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View
          style={[
            styles.modalContainer,
            {
              width: modalWidth,
              height: modalHeight,
              maxWidth: 1040,
            },
            isMobile && { borderRadius: 16 },
          ]}
        >
          {/* Header del Modal */}
          <View style={[styles.header, isMobile && styles.headerMobile]}>
            <View style={[styles.headerLeft, isMobile && styles.headerLeftMobile]}>
              <View style={[styles.playBadge, isMobile && styles.playBadgeMobile]}>
                <Ionicons name="play" size={isMobile ? 13 : 16} color="#FFFFFF" />
              </View>
              <View style={styles.headerTextGroup}>
                <View style={styles.headerTitleRow}>
                  <Text style={[styles.title, isMobile && styles.titleMobile]} numberOfLines={1}>
                    Video de Introducción
                  </Text>
                  <View style={[styles.tagBadge, isMobile && styles.tagBadgeMobile]}>
                    <Text style={[styles.tagBadgeText, isMobile && styles.tagBadgeTextMobile]}>SASGE 2.0</Text>
                  </View>
                </View>
                <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]} numberOfLines={1}>
                  {isMobile ? 'Sistema de Servicios Generales' : 'Conoce el Sistema de Administración de Servicios Generales'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, isMobile && styles.closeButtonMobile]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar video"
            >
              <Ionicons name="close" size={isMobile ? 18 : 22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Área del Reproductor de Video */}
          <View style={styles.videoWrapper}>
            {Platform.OS === 'web' ? (
              <video
                ref={webVideoRef}
                src={videoUri || require('../assets/videos/video_intro.mp4')}
                controls
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#000000',
                  outline: 'none',
                }}
              />
            ) : (
              <VideoView
                style={styles.nativeVideo}
                player={player}
                allowsFullscreen
                allowsPictureInPicture
                contentFit="contain"
              />
            )}
          </View>

          {/* Footer del Modal */}
          <View style={[styles.footer, isMobile && styles.footerMobile]}>
            <View style={[styles.footerLeft, isMobile && styles.footerLeftMobile]}>
              <Ionicons name="shield-checkmark" size={isMobile ? 14 : 16} color="#BE1F2D" />
              <Text style={[styles.footerText, isMobile && styles.footerTextMobile]} numberOfLines={1}>
                {isMobile ? 'Secretaría Jurídica Distrital' : 'Secretaría Jurídica Distrital • Alcaldía Mayor de Bogotá'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeFooterBtn, isMobile && styles.closeFooterBtnMobile]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar reproductor"
            >
              <Text style={[styles.closeFooterBtnText, isMobile && styles.closeFooterBtnTextMobile]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 14, 22, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 1000,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: '#0F2133',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 35,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1001,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#16354A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  playBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#BE1F2D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BE1F2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#16354A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
  closeFooterBtn: {
    backgroundColor: '#BE1F2D',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#BE1F2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  closeFooterBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  overlayMobile: {
    padding: 8,
  },
  headerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLeftMobile: {
    gap: 8,
  },
  playBadgeMobile: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  titleMobile: {
    fontSize: 14,
  },
  tagBadgeMobile: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tagBadgeTextMobile: {
    fontSize: 9.5,
  },
  subtitleMobile: {
    fontSize: 10.5,
    marginTop: 1,
  },
  closeButtonMobile: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  footerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footerLeftMobile: {
    flex: 1,
    marginRight: 8,
  },
  footerTextMobile: {
    fontSize: 10.5,
    flexShrink: 1,
  },
  closeFooterBtnMobile: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  closeFooterBtnTextMobile: {
    fontSize: 12,
  },
});
