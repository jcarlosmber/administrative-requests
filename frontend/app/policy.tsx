import React, { useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const POLICY_URL = 'https://www.secretariajuridica.gov.co/node/376';

const COLORS = {
  primary: '#A9301E',
  primarySoft: '#F97361',
  heroDark: '#210706',
  heroMid: '#3A0D0A',
  heroCard: '#511812',
  heroText: '#FFF8F6',
  heroMuted: '#F7B7AA',
  ink: '#111827',
  muted: '#64748B',
  line: '#E2E8F0',
  surface: '#FFFFFF',
  soft: '#FFF8F6',
};

export default function PolicyPage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  const openPolicy = async () => {
    await Linking.openURL(POLICY_URL);
  };

  const continueToLogin = () => {
    if (!accepted) {
      Alert.alert('Aceptación requerida', 'Debes aceptar el tratamiento de datos personales para continuar.');
      return;
    }

    router.replace('/login');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <LinearGradient colors={[COLORS.heroDark, COLORS.heroMid, '#160403']} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.heroText} />
              <Text style={styles.backText}>Volver</Text>
            </Pressable>

            <View style={styles.brand}>
              <View style={styles.logoMark}>
                <Ionicons name="shield-checkmark" size={22} color={COLORS.heroText} />
              </View>
              <View>
                <Text style={styles.brandName}>SASGE</Text>
                <Text style={styles.brandSub}>Tratamiento de datos</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          <View style={styles.contextPanel}>
            <LinearGradient colors={['rgba(169, 48, 30, 0.95)', 'rgba(33, 7, 6, 0.95)']} style={styles.visualCard}>
              <View style={styles.visualIcon}>
                <Ionicons name="lock-closed" size={34} color={COLORS.heroText} />
              </View>
              <Text style={styles.visualTitle}>Protección de su información</Text>
              <Text style={styles.visualText}>
                SASGE garantiza el manejo seguro y transparente de sus datos personales bajo el marco legal vigente.
              </Text>
            </LinearGradient>

            <View style={styles.commitmentCard}>
              <View style={styles.commitmentHeader}>
                <Ionicons name="shield-checkmark-outline" size={19} color={COLORS.primary} />
                <Text style={styles.commitmentTitle}>Compromiso institucional</Text>
              </View>
              <Text style={styles.commitmentText}>
                La Secretaría Jurídica Distrital se compromete a salvaguardar la privacidad de los funcionarios,
                aplicando estándares de seguridad digital y ética administrativa.
              </Text>
            </View>
          </View>

          <View style={styles.policyCard}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>TRATAMIENTO DE DATOS</Text>
            </View>

            <Text style={styles.title}>Autorización de Tratamiento de Datos Personales</Text>
            <Text style={styles.subtitle}>Alcaldía Mayor de Bogotá D.C. - Secretaría Jurídica Distrital</Text>
            <Text style={styles.caption}>Dirección de Gestión Corporativa</Text>

            <View style={styles.quoteBox}>
              <Text style={styles.quoteText}>
                Al completar y enviar estos datos usted autoriza a la Secretaría Jurídica Distrital para que realice
                el tratamiento de sus datos personales, conforme a la política institucional vigente.
              </Text>
              <Pressable style={styles.externalLink} onPress={openPolicy}>
                <Text style={styles.externalLinkText}>Ver política de datos</Text>
                <Ionicons name="open-outline" size={16} color={COLORS.primary} />
              </Pressable>
            </View>

            <Pressable style={[styles.acceptBox, accepted && styles.acceptBoxActive]} onPress={() => setAccepted((value) => !value)}>
              <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
                {accepted && <Ionicons name="checkmark" size={17} color={COLORS.heroDark} />}
              </View>
              <View style={styles.acceptTextWrap}>
                <Text style={styles.acceptTitle}>Acepto los términos y condiciones</Text>
                <Text style={styles.acceptText}>
                  Confirmo que he leído y acepto expresamente el tratamiento de mis datos personales según la política
                  institucional mencionada anteriormente.
                </Text>
              </View>
            </Pressable>

            <View style={styles.actions}>
              <Pressable style={styles.primaryButton} onPress={continueToLogin}>
                <Text style={styles.primaryButtonText}>Aceptar</Text>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.heroText} />
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
            </View>

            <View style={styles.trustRow}>
              {[
                ['lock-closed-outline', 'Seguro'],
                ['reader-outline', 'Legal'],
                ['eye-off-outline', 'Privado'],
              ].map(([icon, label]) => (
                <View key={label} style={styles.trustItem}>
                  <Ionicons name={icon as any} size={21} color={COLORS.primary} />
                  <Text style={styles.trustLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Image source={require('../assets/alcaldia-mayor-bogota.png')} style={styles.footerLogo} resizeMode="contain" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.soft,
  },
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    color: COLORS.heroText,
    fontSize: 14,
    fontWeight: '900',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: COLORS.heroText,
    fontSize: 18,
    fontWeight: '900',
  },
  brandSub: {
    color: COLORS.heroMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  content: {
    padding: 22,
    paddingBottom: 42,
  },
  grid: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    gap: 18,
  },
  contextPanel: {
    gap: 16,
  },
  visualCard: {
    minHeight: 270,
    borderRadius: 18,
    padding: 24,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  visualIcon: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 208, 199, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  visualTitle: {
    color: COLORS.heroText,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  visualText: {
    color: COLORS.heroMuted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  commitmentCard: {
    borderRadius: 14,
    backgroundColor: '#FFF0EE',
    borderWidth: 1,
    borderColor: '#F2C4BA',
    padding: 18,
  },
  commitmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },
  commitmentTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  commitmentText: {
    color: '#59413D',
    fontSize: 14,
    lineHeight: 22,
  },
  policyCard: {
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 5,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#FFDBD4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: '#251816',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  caption: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  quoteBox: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 12,
    backgroundColor: COLORS.soft,
    padding: 18,
    marginTop: 22,
  },
  quoteText: {
    color: '#251816',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '700',
  },
  externalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  externalLinkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  acceptBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0BFB9',
    backgroundColor: COLORS.surface,
    padding: 16,
    marginTop: 22,
    flexDirection: 'row',
    gap: 12,
  },
  acceptBoxActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF0EE',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#8C716C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primarySoft,
  },
  acceptTextWrap: {
    flex: 1,
  },
  acceptTitle: {
    color: '#251816',
    fontSize: 16,
    fontWeight: '900',
  },
  acceptText: {
    color: '#59413D',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  primaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.heroText,
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#FFE9E5',
    borderWidth: 1,
    borderColor: '#E0BFB9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#72342A',
    fontSize: 16,
    fontWeight: '900',
  },
  trustRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    marginTop: 24,
    paddingTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trustItem: {
    alignItems: 'center',
    gap: 5,
  },
  trustLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    marginTop: 26,
  },
  footerLogo: {
    width: 220,
    height: 130,
  },
});
