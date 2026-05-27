import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  UIManager,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const isWide = width >= 768;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  primary: '#A9301E',
  primaryDark: '#7F1D12',
  heroDark: '#210706',
  heroMid: '#3A0D0A',
  heroCard: '#511812',
  heroCardSoft: '#6D241A',
  heroText: '#FFF8F6',
  heroMuted: '#F7B7AA',
  ink: '#111827',
  muted: '#64748B',
  line: '#E2E8F0',
  surface: '#FFFFFF',
  soft: '#F8FAFC',
  warm: '#F4B942',
  teal: '#0F766E',
  blue: '#2563EB',
  violet: '#7C3AED',
  amber: '#D97706',
  white: '#FFFFFF',
};

const navLinks = [
  { label: 'Servicios', target: 'services' },
  { label: 'Cómo funciona', target: 'flow' },
  { label: 'Soporte', target: 'support' },
] as const;

const services = [
  {
    icon: 'car',
    title: 'Transporte institucional',
    description: 'Solicita recorridos, consulta disponibilidad y recibe confirmación del servicio.',
    tone: COLORS.primary,
  },
  {
    icon: 'business',
    title: 'Mantenimientos locativos',
    description: 'Reporta daños, reserva espacios y centraliza novedades operativas.',
    tone: COLORS.teal,
  },
  {
    icon: 'calendar',
    title: 'Reserva de salas',
    description: 'Agenda espacios de reunión y consulta disponibilidad antes de enviar la solicitud.',
    tone: COLORS.violet,
  },
  {
    icon: 'car-sport',
    title: 'Parqueadero institucional',
    description: 'Radica solicitudes de parqueadero y revisa su estado desde el mismo portal.',
    tone: COLORS.amber,
  },
] as const;

const benefits = [
  { label: 'Trazabilidad', value: '100%' },
  { label: 'Servicios', value: '4' },
  { label: 'Seguimiento', value: '24/7' },
];

const dashboardStats = [
  { icon: 'document-text', value: '18', label: 'Solicitudes activas', color: '#FFD0C7' },
  { icon: 'car', value: '7', label: 'Transportes hoy', color: '#FFB84D' },
  { icon: 'business', value: '5', label: 'Sedes reportadas', color: '#F97361' },
  { icon: 'checkmark-circle', value: '12', label: 'Resueltas', color: '#F5A08F' },
] as const;

const AnimatedPressable = ({
  children,
  style,
  containerStyle,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      speed: 22,
      bounciness: 7,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onHoverIn={() => animate(1.035)}
      onHoverOut={() => animate(1)}
      onPress={onPress}
      onPressIn={() => animate(0.97)}
      onPressOut={() => animate(1)}
      style={containerStyle}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  return (
    <AnimatedPressable style={[styles.faqCard, isOpen && styles.faqCardOpen]} onPress={toggle}>
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, isOpen && styles.faqQuestionOpen]}>{question}</Text>
        <View style={[styles.faqIcon, isOpen && styles.faqIconOpen]}>
          <Ionicons name={isOpen ? 'remove' : 'add'} size={19} color={isOpen ? COLORS.primary : COLORS.muted} />
        </View>
      </View>
      {isOpen && <Text style={styles.faqAnswer}>{answer}</Text>}
    </AnimatedPressable>
  );
};

export default function LandingPage() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const heroIntro = useRef(new Animated.Value(0)).current;
  const previewIntro = useRef(new Animated.Value(0)).current;
  const servicesIntro = useRef(new Animated.Value(0)).current;
  const [sectionOffsets, setSectionOffsets] = useState({ services: 0, flow: 0, support: 0 });

  const goToLogin = () => router.push('/login');
  const scrollToSection = (target: keyof typeof sectionOffsets) => {
    scrollRef.current?.scrollTo({ y: Math.max(sectionOffsets[target] - 86, 0), animated: true });
  };

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(heroIntro, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(previewIntro, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(servicesIntro, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroIntro, previewIntro, servicesIntro]);

  const introStyle = (value: Animated.Value, distance = 18) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.headerWrapper}>
        <BlurView intensity={65} tint="dark" style={styles.headerBlur}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <View style={styles.logoGroup}>
                <View style={styles.logoMark}>
                  <Ionicons name="business" size={20} color={COLORS.heroText} />
                </View>
                <View>
                  <Text style={styles.logoText}>SASGE</Text>
                  <Text style={styles.logoSubtext}>Sistema de Administración de Servicios Generales</Text>
                </View>
              </View>

              {isWide && (
                <View style={styles.navLinks}>
                  {navLinks.map((link) => (
                    <Pressable key={link.target} onPress={() => scrollToSection(link.target)}>
                      <Text style={styles.navLink}>{link.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <AnimatedPressable style={styles.loginBtn} onPress={goToLogin}>
                <Text style={styles.loginBtnText}>Ingresar</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </AnimatedPressable>
            </View>
          </SafeAreaView>
        </BlurView>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[COLORS.heroDark, COLORS.heroMid, '#160403']} style={styles.heroSection}>
          <SafeAreaView edges={['top']} style={styles.heroSafeArea}>
            <View style={styles.heroContent}>
              <Animated.View style={[styles.heroCopy, introStyle(heroIntro)]}>
                <View style={styles.heroBadge}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.heroBadgeText}>SASGE</Text>
                </View>

                <Text style={styles.heroTitle}>
                  Gestiona tus solicitudes con <Text style={styles.heroTitleAccent}>claridad total</Text>
                </Text>
                <Text style={styles.systemName}>Sistema de Administración de Servicios Generales</Text>
                <Text style={styles.heroSubtitle}>
                  Transporte, infraestructura, salas, parqueadero y requerimientos internos para la
                  Secretaría Jurídica Distrital, desde un solo lugar.
                </Text>

                <View style={styles.heroActions}>
                  <AnimatedPressable style={styles.ctaButton} onPress={goToLogin}>
                    <Text style={styles.ctaText}>Ingresar al sistema</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.heroText} />
                  </AnimatedPressable>
                  {isWide && (
                    <AnimatedPressable style={styles.secondaryHeroButton}>
                      <Text style={styles.secondaryHeroText}>Ver servicios</Text>
                    </AnimatedPressable>
                  )}
                </View>

                <View style={styles.benefitRow}>
                  {benefits.map((benefit) => (
                    <AnimatedPressable key={benefit.label} style={styles.benefitItem}>
                      <Text style={styles.benefitValue}>{benefit.value}</Text>
                      <Text style={styles.benefitLabel}>{benefit.label}</Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </Animated.View>

              <Animated.View style={[styles.previewPanel, introStyle(previewIntro, 28)]}>
                <View style={styles.browserDots}>
                  <View style={styles.browserDot} />
                  <View style={styles.browserDotMuted} />
                  <View style={styles.browserDotMuted} />
                  <View style={styles.browserBar} />
                </View>

                <View style={styles.previewHeader}>
                  <View>
                    <Text style={styles.previewEyebrow}>Panel de seguimiento</Text>
                    <Text style={styles.previewTitle}>Mis solicitudes</Text>
                  </View>
                  <View style={styles.previewIcon}>
                    <Ionicons name="notifications-outline" size={20} color="#FFD0C7" />
                  </View>
                </View>

                <View style={styles.dashboardGrid}>
                  {dashboardStats.map((stat) => (
                    <AnimatedPressable
                      key={stat.label}
                      containerStyle={styles.dashboardStatShell}
                      style={styles.dashboardStat}
                    >
                      <Ionicons name={stat.icon} size={18} color={stat.color} />
                      <Text style={styles.dashboardValue}>{stat.value}</Text>
                      <Text style={styles.dashboardLabel}>{stat.label}</Text>
                    </AnimatedPressable>
                  ))}
                </View>

                <View style={styles.chartPanel}>
                  <Text style={styles.chartTitle}>Solicitudes últimos 6 meses</Text>
                  <View style={styles.chartBars}>
                    {[38, 58, 44, 66, 52, 74].map((barHeight, index) => (
                      <View key={index} style={[styles.chartBar, { height: barHeight }]} />
                    ))}
                  </View>
                </View>
              </Animated.View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View
          style={styles.section}
          onLayout={(event) =>
            setSectionOffsets((offsets) => ({ ...offsets, services: event.nativeEvent.layout.y }))
          }
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>SERVICIOS</Text>
            <Text style={styles.sectionTitle}>Servicios administrativos disponibles</Text>
            <Text style={styles.sectionIntro}>
              Una entrada única para registrar, consultar y dar seguimiento a las necesidades internas.
            </Text>
          </View>

          <Animated.View style={[styles.featuresGrid, introStyle(servicesIntro, 22)]}>
            {services.map((service) => (
              <AnimatedPressable
                key={service.title}
                containerStyle={styles.featureCardShell}
                style={styles.featureCard}
              >
                <View style={[styles.iconBox, { backgroundColor: `${service.tone}14` }]}>
                  <Ionicons name={service.icon} size={25} color={service.tone} />
                </View>
                <Text style={styles.featureTitle}>{service.title}</Text>
                <Text style={styles.featureDesc}>{service.description}</Text>
              </AnimatedPressable>
            ))}
          </Animated.View>
        </View>

        <View
          style={[styles.section, styles.flowSection]}
          onLayout={(event) =>
            setSectionOffsets((offsets) => ({ ...offsets, flow: event.nativeEvent.layout.y }))
          }
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>FLUJO</Text>
            <Text style={styles.sectionTitle}>Gestión simple, visible y medible</Text>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineLine} />
            {[
              ['1', 'Ingresa con tu usuario', 'Accede al portal desde una experiencia preparada para web y móvil.'],
              ['2', 'Elige el servicio', 'Completa formularios por tipo de solicitud, con información clara desde el inicio.'],
              ['3', 'Haz seguimiento', 'Consulta estados, novedades y respuestas sin depender de llamadas o correos sueltos.'],
            ].map(([number, title, description]) => (
              <AnimatedPressable key={number} style={styles.timelineItem}>
                <View style={styles.timelinePoint}>
                  <Text style={styles.timelineNumber}>{number}</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.stepTitle}>{title}</Text>
                  <Text style={styles.stepDesc}>{description}</Text>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        <View
          style={[styles.section, styles.faqSection]}
          onLayout={(event) =>
            setSectionOffsets((offsets) => ({ ...offsets, support: event.nativeEvent.layout.y }))
          }
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>SOPORTE</Text>
            <Text style={styles.sectionTitle}>Preguntas frecuentes</Text>
          </View>

          <View style={styles.faqList}>
            <FAQItem
              question="¿Qué tipos de servicios puedo solicitar?"
              answer="Puedes solicitar transporte institucional, parqueadero, reserva de salas, mantenimientos locativos y novedades relacionadas con espacios internos."
            />
            <FAQItem
              question="¿Cómo hago seguimiento a mi solicitud?"
              answer="Desde la sección de solicitudes puedes revisar el estado, la categoría, la fecha de creación y las novedades asociadas al trámite."
            />
            <FAQItem
              question="¿Con cuánta antelación debo pedir transporte?"
              answer="Para desplazamientos locales conviene solicitarlo con anticipación suficiente para validar disponibilidad. Para recorridos especiales, registra el requerimiento con mayor margen operativo."
            />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLogoContainer}>
            <Image 
              source={require('../assets/alcaldia-mayor-bogota.png')} 
              style={styles.footerLogo} 
              resizeMode="contain" 
            />
          </View>
          
          <View style={styles.footerDivider} />
          
          <Text style={styles.footerCredits}>
            Desarrollado por la Oficina de Tecnologías de la Información
          </Text>
          <Text style={styles.footerCopyright}>
            © 2026 Alcaldía Mayor de Bogotá
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 208, 199, 0.14)',
  },
  headerBlur: {
    backgroundColor: 'rgba(33, 7, 6, 0.88)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isWide ? 86 : 20,
    height: 74,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: COLORS.heroText,
    fontSize: 20,
    fontWeight: '900',
  },
  logoSubtext: {
    color: COLORS.heroMuted,
    fontSize: isWide ? 11 : 10,
    marginTop: 1,
    maxWidth: isWide ? 320 : 180,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 36,
  },
  navLink: {
    color: COLORS.heroMuted,
    fontSize: 15,
    fontWeight: '800',
  },
  loginBtn: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  loginBtnText: {
    color: COLORS.heroText,
    fontWeight: '900',
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  heroSection: {
    minHeight: Math.max(740, height * 0.92),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 208, 199, 0.12)',
  },
  heroSafeArea: {
    flex: 1,
  },
  heroContent: {
    flex: 1,
    flexDirection: isWide ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isWide ? 86 : 32,
    paddingHorizontal: isWide ? 86 : 22,
    paddingTop: isWide ? 134 : 116,
    paddingBottom: 58,
  },
  heroCopy: {
    width: '100%',
    maxWidth: 700,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 199, 0.24)',
    backgroundColor: 'rgba(169, 48, 30, 0.28)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 28,
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F97361',
  },
  heroBadgeText: {
    color: '#F5A08F',
    fontSize: 14,
    fontWeight: '900',
  },
  heroTitle: {
    color: COLORS.heroText,
    fontSize: isWide ? 70 : 42,
    fontWeight: '900',
    lineHeight: isWide ? 76 : 48,
  },
  heroTitleAccent: {
    color: '#F97361',
  },
  systemName: {
    color: '#FFD0C7',
    fontSize: isWide ? 19 : 15,
    fontWeight: '900',
    lineHeight: isWide ? 28 : 23,
    marginTop: 18,
    maxWidth: 640,
  },
  heroSubtitle: {
    color: COLORS.heroMuted,
    fontSize: isWide ? 21 : 17,
    lineHeight: isWide ? 32 : 27,
    marginTop: 24,
    maxWidth: 680,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    marginTop: 38,
  },
  ctaButton: {
    minHeight: 62,
    backgroundColor: '#F97361',
    flexDirection: 'row',
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#F97361',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 7,
  },
  ctaText: {
    color: COLORS.heroText,
    fontSize: 18,
    fontWeight: '900',
  },
  secondaryHeroButton: {
    minHeight: 48,
    borderBottomWidth: 2,
    borderBottomColor: '#F5A08F',
    justifyContent: 'center',
  },
  secondaryHeroText: {
    color: '#F5A08F',
    fontSize: 17,
    fontWeight: '900',
  },
  benefitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 34,
  },
  benefitItem: {
    minWidth: 118,
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 199, 0.18)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(109, 36, 26, 0.32)',
  },
  benefitValue: {
    color: COLORS.heroText,
    fontSize: 21,
    fontWeight: '900',
  },
  benefitLabel: {
    color: COLORS.heroMuted,
    fontSize: 12,
    marginTop: 3,
  },
  previewPanel: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 199, 0.2)',
    backgroundColor: 'rgba(81, 24, 18, 0.78)',
    padding: 24,
    shadowColor: '#F97361',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 60,
    elevation: 8,
  },
  browserDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  browserDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F97361',
  },
  browserDotMuted: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 208, 199, 0.28)',
  },
  browserBar: {
    flex: 1,
    height: 20,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 208, 199, 0.12)',
    marginLeft: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  previewEyebrow: {
    color: COLORS.heroMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  previewTitle: {
    color: COLORS.heroText,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 3,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 208, 199, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  dashboardStatShell: {
    width: isWide ? '48%' : '47%',
  },
  dashboardStat: {
    width: '100%',
    minHeight: 108,
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'rgba(255, 208, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 199, 0.1)',
  },
  dashboardValue: {
    color: COLORS.heroText,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  dashboardLabel: {
    color: COLORS.heroMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 18,
  },
  chartPanel: {
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    backgroundColor: 'rgba(255, 208, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 199, 0.1)',
  },
  chartTitle: {
    color: COLORS.heroMuted,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 14,
  },
  chartBars: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  chartBar: {
    flex: 1,
    borderRadius: 5,
    backgroundColor: '#F97361',
    opacity: 0.86,
  },
  section: {
    paddingHorizontal: isWide ? 56 : 22,
    paddingVertical: 68,
    backgroundColor: COLORS.surface,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 34,
  },
  sectionBadge: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: isWide ? 34 : 28,
    fontWeight: '900',
    color: COLORS.ink,
    textAlign: 'center',
    lineHeight: isWide ? 40 : 34,
  },
  sectionIntro: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 620,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    maxWidth: 1120,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  featureCardShell: {
    width: isWide ? 348 : '100%',
  },
  featureCard: {
    width: '100%',
    minHeight: 210,
    padding: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.ink,
    marginBottom: 9,
  },
  featureDesc: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 22,
  },
  flowSection: {
    backgroundColor: COLORS.soft,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.line,
  },
  timeline: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingLeft: 14,
  },
  timelineLine: {
    position: 'absolute',
    left: 33,
    top: 20,
    bottom: 30,
    width: 2,
    backgroundColor: COLORS.line,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 22,
    marginBottom: 30,
  },
  timelinePoint: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineNumber: {
    color: COLORS.surface,
    fontWeight: '900',
    fontSize: 15,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 5,
  },
  stepTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.ink,
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 15,
    color: COLORS.muted,
    lineHeight: 23,
  },
  faqSection: {
    backgroundColor: COLORS.surface,
  },
  faqList: {
    gap: 12,
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
  },
  faqCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  faqCardOpen: {
    borderColor: '#F2C4BA',
    backgroundColor: '#FFFDFC',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
    flex: 1,
    paddingRight: 14,
  },
  faqQuestionOpen: {
    color: COLORS.primary,
  },
  faqIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.soft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqIconOpen: {
    backgroundColor: '#FFF0ED',
  },
  faqAnswer: {
    fontSize: 15,
    color: COLORS.muted,
    marginTop: 16,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    backgroundColor: '#0A0F1E', // Navy muy oscuro
  },
  footerLogoContainer: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  footerLogo: {
    width: Math.min(width * 0.72, 320),
    height: '100%',
  },
  footerDivider: {
    width: '100%',
    maxWidth: 800,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 30,
  },
  footerCredits: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerCopyright: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
