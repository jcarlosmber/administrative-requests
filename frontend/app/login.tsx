import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';

const COLORS = {
  primary: '#BE1F2D', // Rojo BOGOTÁ
  primarySoft: '#D94553',
  bgDark: '#210706', // Fondo principal original
  bgMid: '#3A0D0A', // Fondo secundario original
  heroDark: '#F8FAFC',
  heroMid: '#F1F5F9',
  heroText: '#0F2133', // Texto principal oscuro
  heroMuted: '#64748B', // Texto secundario / gris azulado
  line: '#E2E8F0', // Líneas y bordes
  success: '#10B981',
  white: '#FFFFFF',
};

const POLICY_URL = 'https://www.secretariajuridica.gov.co/node/376';

export default function LoginPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  
  const [documentId, setDocumentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: documentId,
        password: password,
      });

      if (error) throw error;
      
      // Auto-redirect admins to the admin panel
      if (data?.user?.role === 'admin') {
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
    <LinearGradient colors={[COLORS.bgDark, COLORS.bgMid, '#160403']} style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
          <Pressable style={styles.backButton} onPress={() => router.replace('/')}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={[styles.backText, { color: '#FFFFFF' }]}>Volver</Text>
          </Pressable>

          <View style={styles.card}>
            <View style={styles.brand}>
              <View style={[styles.logoMark, { width: isWide ? 64 : 84, height: isWide ? 64 : 84 }]}>
                <Ionicons name="business" size={isWide ? 32 : 42} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.brandName, { fontSize: isWide ? 16 : 22 }]}>Servicios Generales 2.0</Text>
                <Text style={styles.brandSubtitle}>Secretaría Jurídica Distrital</Text>
              </View>
            </View>

            <Text style={styles.title}>Ingreso institucional</Text>
            <Text style={styles.subtitle}>
              Accede con tu correo institucional y la misma contraseña que usas para el correo.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Usuario</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="person-outline" size={20} color={COLORS.heroMuted} />
                  <TextInput
                    value={documentId}
                    onChangeText={setDocumentId}
                    placeholder="usuario o correo institucional"
                    placeholderTextColor={COLORS.heroMuted}
                    style={styles.input}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.heroMuted} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Misma contraseña del correo"
                    placeholderTextColor={COLORS.heroMuted}
                    style={styles.input}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword((value) => !value)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.heroMuted} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.optionsRow}>
                <Pressable style={styles.rememberControl} onPress={() => setRememberMe((value) => !value)}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                  </View>
                  <Text style={styles.optionText}>Recordarme</Text>
                </Pressable>

                <Pressable onPress={() => showError('Recuperación de Contraseña', 'Tu contraseña está sincronizada con tu correo institucional (Gmail) y el acceso a tu PC de la entidad (Directorio Activo).\n\nPara cambiarla o recuperarla, debes realizar el proceso de recuperación de tu cuenta de correo o cambiarla desde tu equipo de cómputo.')}>
                  <Text style={styles.recoverText}>¿Olvidaste tu contraseña?</Text>
                </Pressable>
              </View>

              <Pressable style={styles.policyLink} onPress={() => setShowPolicyModal(true)}>
                <Ionicons name={policyAccepted ? "checkbox" : "shield-checkmark-outline"} size={17} color={policyAccepted ? COLORS.primary : COLORS.heroMuted} />
                <Text style={[styles.policyLinkText, policyAccepted && { color: COLORS.primary }]}>
                  {policyAccepted ? "Política aceptada" : "Ver política de tratamiento de datos personales"}
                </Text>
              </Pressable>

              <Pressable style={styles.submitButton} onPress={handleLogin} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.heroText} />
                ) : (
                  <>
                    <Text style={[styles.submitText, { fontSize: isWide ? 18 : 20 }]}>Ingresar al sistema</Text>
                    <Ionicons name="arrow-forward" size={isWide ? 18 : 20} color={COLORS.white} />
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.footerBrand}>
              <Image source={require('../assets/logos/SJD negro y amarillo.png')} style={styles.footerLogo} resizeMode="contain" />
            </View>
          </View>

          {/* Modal de Política de Privacidad */}
          <Modal
            visible={showPolicyModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowPolicyModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxWidth: isWide ? 600 : '90%' }]}>
                <View style={styles.modalHeader}>
                  <Ionicons name="shield-checkmark" size={28} color={COLORS.primary} />
                  <Text style={styles.modalTitle}>Tratamiento de Datos Personales</Text>
                </View>
                
                <ScrollView style={styles.modalBody}>
                  <Text style={styles.policyText}>
                    Conforme a la Ley 1581 de 2012 y demás normas concordantes, el usuario autoriza de manera libre, previa e informada a la Alcaldía Mayor de Bogotá - Secretaría Jurídica Distrital, para realizar el tratamiento de sus datos personales.{"\n\n"}
                    Esta información será utilizada exclusivamente para:{"\n"}
                    1. Gestión de trámites administrativos internos.{"\n"}
                    2. Control de acceso a instalaciones físicas.{"\n"}
                    3. Reportes institucionales y seguimiento de servicios generales.{"\n"}
                    4. Notificaciones relacionadas con el Sistema de Administración de Servicios Generales 2.0.{"\n\n"}
                    El titular de los datos tiene derecho a conocer, actualizar, rectificar y suprimir su información personal en cualquier momento.{"\n\n"}
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
                  <Pressable 
                    style={styles.cancelBtn} 
                    onPress={() => setShowPolicyModal(false)}
                  >
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
              <View style={[styles.modalContent, { maxWidth: 400 }]}>
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    color: COLORS.heroText,
    fontSize: 14,
    fontWeight: '800',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    padding: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 36,
  },
  logoMark: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  brandName: {
    color: COLORS.heroText,
    fontSize: 28,
    fontWeight: '900',
  },
  brandSubtitle: {
    color: COLORS.heroMuted,
    fontSize: 12,
    marginTop: 2,
  },
  title: {
    color: COLORS.heroText,
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: COLORS.heroMuted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  form: {
    marginTop: 28,
    gap: 18,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: COLORS.heroText,
    fontSize: 13,
    fontWeight: '900',
  },
  inputShell: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: COLORS.heroText,
    fontSize: 15,
    outlineStyle: 'none' as never,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  rememberControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.line,
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
    fontWeight: '700',
  },
  recoverText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  policyLink: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.heroMid,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  policyLinkText: {
    color: COLORS.heroMuted,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  submitButton: {
    minHeight: 58,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
  },
  footerBrand: {
    alignItems: 'center',
    marginTop: 26,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  footerLogo: {
    width: '100%',
    maxWidth: 300,
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    flex: 1,
  },
  modalBody: {
    marginBottom: 20,
  },
  policyText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 22,
  },
  externalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 15,
    padding: 10,
    backgroundColor: 'rgba(169, 48, 30, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(169, 48, 30, 0.1)',
  },
  externalLinkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  cancelBtnText: {
    color: '#000000',
    fontWeight: '700',
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
