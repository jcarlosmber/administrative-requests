import React, { useState } from 'react';
import {
  Alert,
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
  primary: '#A9301E',
  primarySoft: '#F97361',
  heroDark: '#210706',
  heroMid: '#3A0D0A',
  heroText: '#FFF8F6',
  heroMuted: '#F7B7AA',
  line: 'rgba(255, 208, 199, 0.18)',
  success: '#10B981',
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

  const handleLogin = async () => {
    if (!documentId.trim() || !password.trim()) {
      Alert.alert('Datos incompletos', 'Ingresa tu correo institucional y la contraseña.');
      return;
    }

    if (!policyAccepted) {
      setShowPolicyModal(true);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: documentId,
        password: password,
      });

      if (error) throw error;
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error de acceso', error.message || 'Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (type: 'admin' | 'user') => {
    if (!policyAccepted) {
      setPolicyAccepted(true);
    }
    
    try {
      setLoading(true);
      const credentials = {
        admin: { email: 'admin@bogota.gov.co', pass: 'admin123' },
        user: { email: 'funcionario@bogota.gov.co', pass: 'user123' }
      };
      
      const target = credentials[type];
      const { error } = await supabase.auth.signInWithPassword({
        email: target.email,
        password: target.pass,
      });

      if (error) throw error;
      
      if (type === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error Dev Login', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.heroDark, COLORS.heroMid, '#160403']} style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.heroText} />
            <Text style={styles.backText}>Volver</Text>
          </Pressable>

          <View style={styles.card}>
            <View style={styles.brand}>
              <View style={[styles.logoMark, { width: isWide ? 64 : 84, height: isWide ? 64 : 84 }]}>
                <Ionicons name="business" size={isWide ? 32 : 42} color={COLORS.heroText} />
              </View>
              <View>
                <Text style={[styles.brandName, { fontSize: isWide ? 22 : 28 }]}>SASGE</Text>
                <Text style={styles.brandSubtitle}>Sistema de Administración de Servicios Generales</Text>
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
                    placeholder="usuario@secretariajuridica.gov.co"
                    placeholderTextColor="rgba(247, 183, 170, 0.58)"
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
                    placeholderTextColor="rgba(247, 183, 170, 0.58)"
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
                    {rememberMe && <Ionicons name="checkmark" size={14} color={COLORS.heroDark} />}
                  </View>
                  <Text style={styles.optionText}>Recordarme</Text>
                </Pressable>

                <Pressable onPress={() => Alert.alert('Recuperar acceso', 'Contacta al administrador del sistema SASGE.')}>
                  <Text style={styles.recoverText}>¿Olvidaste tu contraseña?</Text>
                </Pressable>
              </View>

              <Pressable style={styles.policyLink} onPress={() => setShowPolicyModal(true)}>
                <Ionicons name={policyAccepted ? "checkbox" : "shield-checkmark-outline"} size={17} color={policyAccepted ? COLORS.primarySoft : "#FFD0C7"} />
                <Text style={[styles.policyLinkText, policyAccepted && { color: COLORS.primarySoft }]}>
                  {policyAccepted ? "Política aceptada" : "Ver política de tratamiento de datos personales"}
                </Text>
              </Pressable>

              <Pressable style={styles.submitButton} onPress={handleLogin}>
                <Text style={[styles.submitText, { fontSize: isWide ? 18 : 22 }]}>Ingresar al sistema</Text>
                <Ionicons name="arrow-forward" size={isWide ? 18 : 22} color={COLORS.heroText} />
              </Pressable>

              {/* Dev Shortcuts */}
              <View style={styles.devSection}>
                <View style={styles.devHeader}>
                  <View style={styles.devLine} />
                  <Text style={styles.devLabel}>MODO DESARROLLO</Text>
                  <View style={styles.devLine} />
                </View>
                <View style={styles.devBtns}>
                  <Pressable 
                    style={[styles.devBtn, { borderColor: '#10B981' }]} 
                    onPress={() => handleDevLogin('user')}
                    disabled={loading}
                  >
                    <Ionicons name="person" size={16} color="#10B981" />
                    <Text style={[styles.devBtnText, { color: '#10B981' }]}>FUNCIONARIO</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.devBtn, { borderColor: '#FACC15' }]} 
                    onPress={() => handleDevLogin('admin')}
                    disabled={loading}
                  >
                    <Ionicons name="shield-half" size={16} color="#FACC15" />
                    <Text style={[styles.devBtnText, { color: '#FACC15' }]}>ADMIN</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.footerBrand}>
              <Image source={require('../assets/alcaldia-mayor-bogota.png')} style={styles.footerLogo} resizeMode="contain" />
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
                    4. Notificaciones relacionadas con el sistema SASGE.{"\n\n"}
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
                    }}
                  >
                    <Text style={styles.acceptBtnText}>Aceptar y Continuar</Text>
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
    backgroundColor: 'rgba(81, 24, 18, 0.78)',
    padding: 26,
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
  
  /* Dev Styles */
  devSection: {
    marginTop: 20,
    gap: 12,
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    opacity: 0.5,
  },
  devLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.line,
  },
  devLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.heroMuted,
    letterSpacing: 1.5,
  },
  devBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  devBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  devBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
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
    backgroundColor: 'rgba(255, 208, 199, 0.08)',
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
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primarySoft,
  },
  optionText: {
    color: COLORS.heroMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  recoverText: {
    color: '#FFD0C7',
    fontSize: 13,
    fontWeight: '900',
  },
  policyLink: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: 'rgba(255, 208, 199, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  policyLinkText: {
    color: '#FFD0C7',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  submitButton: {
    minHeight: 58,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  submitText: {
    color: COLORS.heroText,
    fontSize: 22,
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
    backgroundColor: COLORS.heroText,
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
    color: COLORS.heroDark,
    flex: 1,
  },
  modalBody: {
    marginBottom: 20,
  },
  policyText: {
    fontSize: 14,
    color: COLORS.heroMid,
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
    color: COLORS.heroMid,
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
    color: COLORS.heroText,
    fontWeight: '900',
  },
});
