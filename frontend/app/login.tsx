import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { IntroVideoModal } from '../components/IntroVideoModal';

const COLORS = {
  primary: '#BE1F2D', // Rojo BOGOTÁ
  primaryHover: '#9B1623',
  primarySoft: '#D94553',
  bgDark: '#0D1E2B',
  bgCardDark: '#16354A',
  bgCardDarkSoft: '#1D435C',
  heroText: '#0F2133',
  heroMuted: '#64748B',
  line: '#E2E8F0',
  lineDark: 'rgba(255, 255, 255, 0.15)',
  success: '#10B981',
  white: '#FFFFFF',
  goldStar: '#F59E0B',
};

const POLICY_URL = 'https://www.secretariajuridica.gov.co/node/376';

// Módulos institucionales de SASGE 2.0 (inspirados en la cuadrícula de SIGA)
const SASGE_MODULES = [
  {
    id: 'visitors',
    title: 'Gestión de Visitantes',
    icon: 'people-outline' as const,
  },
  {
    id: 'transport',
    title: 'Transporte Institucional',
    icon: 'car-sport-outline' as const,
  },
  {
    id: 'maintenance',
    title: 'Gestión de Mantenimiento',
    icon: 'construct-outline' as const,
  },
  {
    id: 'rooms',
    title: 'Reserva de Espacios',
    icon: 'business-outline' as const,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isTablet = width >= 768 && width < 992;
  
  const [documentId, setDocumentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showError = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorModalVisible(true);
  };

  const executeLogin = async () => {
    try {
      setLoading(true);

      let finalEmail = documentId.trim();
      if (finalEmail && !finalEmail.includes('@')) {
        finalEmail = `${finalEmail}@secretariajuridica.gov.co`;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: password,
      });

      if (error) throw error;
      
      // Auto-redirect admins and superadmins to the admin panel
      if (data?.user?.role === 'admin' || data?.user?.role === 'superadmin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    } catch (error: any) {
      let msg = error.message || 'Verifica tus credenciales.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Usuario no encontrado o contraseña incorrecta.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Por favor verifica tu correo electrónico antes de iniciar sesión.';
      }
      showError('Error de acceso', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!documentId.trim()) {
      showError('Datos incompletos', 'Por favor, ingresa tu usuario o correo institucional.');
      return;
    }

    if (!password.trim()) {
      showError('Datos incompletos', 'Por favor, ingresa tu contraseña.');
      return;
    }

    if (!policyAccepted) {
      setShowPolicyModal(true);
      return;
    }

    await executeLogin();
  };

  return (
    <ImageBackground
      source={require('../assets/sjd_hero.png')}
      style={styles.screen}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(10, 24, 34, 0.88)', 'rgba(6, 16, 23, 0.94)']}
        style={styles.overlay}
      >
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={[
                styles.scrollContainer,
                isDesktop ? styles.scrollContainerDesktop : styles.scrollContainerMobile,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Barra Superior Responsiva: Botón Volver y Botón Video */}
              <View
                style={[
                  styles.topBar,
                  isDesktop ? styles.topBarDesktop : styles.topBarMobile,
                ]}
              >
                <Pressable
                  style={styles.backButton}
                  onPress={() => router.replace('/')}
                  accessibilityRole="button"
                  accessibilityLabel="Volver al portal"
                >
                  <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                  <Text style={styles.backText}>{isDesktop ? 'Volver al portal' : 'Volver'}</Text>
                </Pressable>

                <Pressable
                  style={styles.videoHeaderButton}
                  onPress={() => setShowVideoModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Ver video de introducción"
                >
                  <View style={styles.videoHeaderIconBox}>
                    <Ionicons name="play" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={styles.videoHeaderText}>
                    {isDesktop ? 'Video de Introducción' : 'Video Tutorial'}
                  </Text>
                </Pressable>
              </View>

              {/* Contenedor Principal (Adaptable en Pantallas Grandes y Celular) */}
              <View
                style={[
                  styles.mainContainer,
                  isDesktop ? styles.mainContainerDesktop : styles.mainContainerMobile,
                ]}
              >
                {/* =========================================
                    COLUMNA IZQUIERDA: HERO INSTITUCIONAL
                   ========================================= */}
                <View
                  style={[
                    styles.brandPanel,
                    isDesktop ? styles.brandPanelDesktop : styles.brandPanelMobile,
                  ]}
                >
                  {/* Cabecera / Identidad SASGE */}
                  <View style={styles.brandHeader}>
                    <View style={styles.logoRow}>
                      <Text style={[styles.sigaText, !isDesktop && styles.sigaTextMobile]}>
                        SASGE
                      </Text>
                      <View style={styles.badge20}>
                        <Text style={styles.badge20Text}>2.0</Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.sigaSubtitle,
                        !isDesktop && styles.sigaSubtitleMobile,
                      ]}
                    >
                      BIENVENIDOS AL SISTEMA DE ADMINISTRACIÓN DE SERVICIOS GENERALES
                    </Text>
                  </View>

                  {/* Botón Destacado de Introducción / Inducción en el Hero */}
                  <Pressable
                    style={[
                      styles.heroVideoButton,
                      !isDesktop && styles.heroVideoButtonMobile,
                    ]}
                    onPress={() => setShowVideoModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Reproducir video de introducción SASGE 2.0"
                  >
                    <View style={[styles.heroVideoPlayCircle, !isDesktop && styles.heroVideoPlayCircleMobile]}>
                      <Ionicons name="play" size={!isDesktop ? 15 : 18} color="#FFFFFF" />
                    </View>
                    <View style={styles.heroVideoInfo}>
                      <Text style={[styles.heroVideoTitle, !isDesktop && { fontSize: 13 }]}>
                        Ver Video de Introducción
                      </Text>
                      <Text style={[styles.heroVideoSubtitle, !isDesktop && { fontSize: 10, lineHeight: 14 }]}>
                        Conoce las funciones y novedades de SASGE 2.0
                      </Text>
                    </View>
                    <View style={styles.heroVideoPill}>
                      <Ionicons name="videocam" size={12} color="#FFFFFF" />
                      <Text style={[styles.heroVideoPillText, !isDesktop && { fontSize: 10 }]}>Ver ahora</Text>
                    </View>
                  </Pressable>

                  {/* Cuadrícula de Módulos (Visible en Pantallas Grandes como la imagen de referencia) */}
                  {isDesktop && (
                    <View style={styles.modulesGrid}>
                      {SASGE_MODULES.map((item) => (
                        <View key={item.id} style={styles.moduleCard}>
                          <View style={styles.moduleIconBox}>
                            <Ionicons name={item.icon} size={28} color="#FFFFFF" />
                          </View>
                          <Text style={styles.moduleCardTitle}>{item.title}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Pie Institucional: Logo Oficial Secretaría Jurídica Distrital */}
                  <View style={[styles.institutionalFooter, !isDesktop && styles.institutionalFooterMobile]}>
                    <Image
                      source={require('../assets/logos/sjd blanco amarillo.png')}
                      style={[styles.sjdLogo, !isDesktop && styles.sjdLogoMobile]}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                {/* =========================================
                    COLUMNA DERECHA: FORMULARIO DE ACCESO
                   ========================================= */}
                <View
                  style={[
                    styles.formPanel,
                    isDesktop ? styles.formPanelDesktop : styles.formPanelMobile,
                  ]}
                >
                  <View style={styles.formBadge}>
                    <Ionicons name="shield-checkmark" size={15} color={COLORS.primary} />
                    <Text style={styles.formBadgeText}>Acceso Institucional Seguro</Text>
                  </View>

                  <Text style={[styles.title, !isDesktop && styles.titleMobile]}>
                    Ingreso al sistema
                  </Text>
                  <Text style={[styles.subtitle, !isDesktop && styles.subtitleMobile]}>
                    Accede con tu usuario o correo institucional y la misma contraseña de red.
                  </Text>

                  <View style={styles.form}>
                    {/* Campo Usuario */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Usuario o Correo Institucional</Text>
                    <View style={styles.inputShell}>
                      <Ionicons name="person-outline" size={20} color={COLORS.heroMuted} />
                      <TextInput
                        value={documentId}
                        onChangeText={setDocumentId}
                        placeholder="usuario o correo institucional"
                        placeholderTextColor={COLORS.heroMuted}
                        style={styles.input}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* Campo Contraseña */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contraseña</Text>
                    <View style={styles.inputShell}>
                      <Ionicons name="lock-closed-outline" size={20} color={COLORS.heroMuted} />
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Misma contraseña de tu correo"
                        placeholderTextColor={COLORS.heroMuted}
                        style={styles.input}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Pressable
                        onPress={() => setShowPassword((value) => !value)}
                        hitSlop={8}
                        accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={COLORS.heroMuted}
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Opciones: Recordarme / Olvidó contraseña */}
                  <View style={styles.optionsRow}>
                    <Pressable
                      style={styles.rememberControl}
                      onPress={() => setRememberMe((value) => !value)}
                    >
                      <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                        {rememberMe && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                      </View>
                      <Text style={styles.optionText}>Recordarme</Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        showError(
                          'Recuperación de Contraseña',
                          'Tu contraseña está sincronizada con tu cuenta de correo institucional (Directorio Activo).\n\nPara cambiarla o recuperarla, realiza el restablecimiento desde tu cuenta de correo o contacta a soporte de TI.'
                        )
                      }
                    >
                      <Text style={styles.recoverText}>¿Olvidaste tu contraseña?</Text>
                    </Pressable>
                  </View>

                  {/* Enlace de Política */}
                  <Pressable
                    style={[styles.policyLink, policyAccepted && styles.policyLinkAccepted]}
                    onPress={() => setShowPolicyModal(true)}
                  >
                    <Ionicons
                      name={policyAccepted ? 'checkbox' : 'shield-checkmark-outline'}
                      size={18}
                      color={policyAccepted ? COLORS.success : COLORS.heroMuted}
                    />
                    <Text
                      style={[
                        styles.policyLinkText,
                        policyAccepted && { color: COLORS.success, fontWeight: '800' },
                      ]}
                    >
                      {policyAccepted
                        ? 'Política de datos aceptada'
                        : 'Ver política de tratamiento de datos personales'}
                    </Text>
                  </Pressable>

                  {/* Botón Ingresar */}
                  <Pressable
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Text style={styles.submitText}>Ingresar al sistema</Text>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                      </>
                    )}
                  </Pressable>
                </View>

                {/* Pie de seguridad en la columna derecha */}
                <View style={styles.formFooterNote}>
                  <Ionicons name="lock-closed" size={13} color={COLORS.heroMuted} />
                  <Text style={styles.formFooterText}>
                    Alcaldía Mayor de Bogotá • Secretaría Jurídica Distrital
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

            {/* Modal de Política de Privacidad */}
            <Modal
              visible={showPolicyModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowPolicyModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxWidth: isDesktop ? 620 : '90%' }]}>
                  <View style={styles.modalHeader}>
                    <Ionicons name="shield-checkmark" size={28} color={COLORS.primary} />
                    <Text style={styles.modalTitle}>Tratamiento de Datos Personales</Text>
                  </View>

                  <ScrollView style={styles.modalBody}>
                    <Text style={styles.policyText}>
                      Conforme a la Ley 1581 de 2012 y demás normas concordantes, el usuario autoriza
                      de manera libre, previa e informada a la Alcaldía Mayor de Bogotá - Secretaría
                      Jurídica Distrital, para realizar el tratamiento de sus datos personales.{'\n\n'}
                      Esta información será utilizada exclusivamente para:{'\n'}
                      1. Gestión de trámites administrativos internos.{'\n'}
                      2. Control de acceso a instalaciones físicas.{'\n'}
                      3. Reportes institucionales y seguimiento de servicios generales.{'\n'}
                      4. Notificaciones relacionadas con el Sistema SASGE 2.0.{'\n\n'}
                      El titular de los datos tiene derecho a conocer, actualizar, rectificar y suprimir
                      su información personal en cualquier momento.{'\n\n'}
                      Para más información, puede consultar el documento oficial aquí:
                    </Text>
                    <Pressable
                      onPress={() => Linking.openURL(POLICY_URL)}
                      style={styles.externalLink}
                    >
                      <Text style={styles.externalLinkText}>Ver Política Completa en el sitio web</Text>
                      <Ionicons name="open-outline" size={16} color={COLORS.primary} />
                    </Pressable>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <Pressable style={styles.cancelBtn} onPress={() => setShowPolicyModal(false)}>
                      <Text style={styles.cancelBtnText}>Cerrar</Text>
                    </Pressable>
                    <Pressable
                      style={styles.acceptBtn}
                      onPress={() => {
                        setPolicyAccepted(true);
                        setShowPolicyModal(false);
                        executeLogin();
                      }}
                    >
                      <Text style={styles.acceptBtnText}>Aceptar y Continuar</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Modal de Errores */}
            <Modal
              visible={errorModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setErrorModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxWidth: 440 }]}>
                  <View style={styles.modalHeader}>
                    <Ionicons name="alert-circle" size={28} color={COLORS.primary} />
                    <Text style={styles.modalTitle}>{errorTitle}</Text>
                  </View>

                  <View style={styles.modalBody}>
                    <Text style={styles.policyText}>{errorMessage}</Text>
                  </View>

                  <View style={styles.modalFooter}>
                    <Pressable
                      style={styles.acceptBtn}
                      onPress={() => setErrorModalVisible(false)}
                    >
                      <Text style={styles.acceptBtnText}>Entendido</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Modal de Video Introductorio */}
            <IntroVideoModal
              visible={showVideoModal}
              onClose={() => setShowVideoModal(false)}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    width: '100%',
  },
  scrollContainerDesktop: {
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  scrollContainerMobile: {
    justifyContent: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topBarDesktop: {
    maxWidth: 1140,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  topBarMobile: {
    maxWidth: 480,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  videoHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(190, 31, 45, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#BE1F2D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  videoHeaderIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  heroVideoButtonMobile: {
    marginTop: 12,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    width: '100%',
  },
  heroVideoPlayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
  },
  heroVideoPlayCircleMobile: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  heroVideoInfo: {
    flex: 1,
  },
  heroVideoTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  heroVideoSubtitle: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  heroVideoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroVideoPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Contenedor Principal */
  mainContainer: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: COLORS.bgCardDark,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 10,
  },
  mainContainerDesktop: {
    maxWidth: 1140,
    flexDirection: 'row',
    minHeight: 620,
  },
  mainContainerMobile: {
    maxWidth: 480,
    flexDirection: 'column',
    marginBottom: 20,
    borderRadius: 20,
  },

  /* =========================================
     COLUMNA IZQUIERDA: HERO INSTITUCIONAL
     ========================================= */
  brandPanel: {
    backgroundColor: COLORS.bgCardDark,
    justifyContent: 'space-between',
  },
  brandPanelDesktop: {
    flex: 1.15,
    padding: 44,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  brandPanelMobile: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  brandHeader: {
    alignItems: 'center',
    width: '100%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  sigaText: {
    color: '#FFFFFF',
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  sigaTextMobile: {
    fontSize: 32,
    letterSpacing: 3,
  },
  badge20: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badge20Text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  sigaSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 380,
    lineHeight: 18,
  },
  sigaSubtitleMobile: {
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 15,
    marginTop: 6,
    maxWidth: 290,
  },

  /* Cuadrícula de módulos (Estilo SIGA) */
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginVertical: 28,
    justifyContent: 'center',
  },
  moduleCard: {
    width: '47%',
    minHeight: 110,
    backgroundColor: COLORS.bgCardDarkSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lineDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  moduleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  moduleCardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 17,
  },

  /* Footer del panel de marca */
  institutionalFooter: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 16,
  },
  institutionalFooterMobile: {
    paddingTop: 10,
  },
  sjdLogo: {
    width: 220,
    height: 52,
  },
  sjdLogoMobile: {
    width: 170,
    height: 40,
    marginTop: 4,
  },

  /* =========================================
     COLUMNA DERECHA: FORMULARIO DE ACCESO
     ========================================= */
  formPanel: {
    backgroundColor: COLORS.white,
    justifyContent: 'center',
  },
  formPanelDesktop: {
    flex: 1,
    padding: 44,
  },
  formPanelMobile: {
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  formBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(190, 31, 45, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(190, 31, 45, 0.18)',
    marginBottom: 14,
  },
  formBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: COLORS.heroText,
    fontSize: 28,
    fontWeight: '900',
  },
  titleMobile: {
    fontSize: 22,
  },
  subtitle: {
    color: COLORS.heroMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  subtitleMobile: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  form: {
    marginTop: 20,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: COLORS.heroText,
    fontSize: 13,
    fontWeight: '800',
  },
  inputShell: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: COLORS.heroText,
    fontSize: 14,
    outlineStyle: 'none' as never,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
    gap: 8,
  },
  rememberControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    color: COLORS.heroMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  recoverText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  policyLink: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  policyLinkAccepted: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  policyLinkText: {
    color: COLORS.heroMuted,
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  submitButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
  },
  formFooterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  formFooterText: {
    color: COLORS.heroMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Modales */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.heroText,
    flex: 1,
  },
  modalBody: {
    marginBottom: 18,
  },
  policyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  externalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    padding: 10,
    backgroundColor: 'rgba(190, 31, 45, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(190, 31, 45, 0.15)',
  },
  externalLinkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
});
