import React, { ReactNode, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ImageBackground,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { requestService, AdministrativeRequest } from '../../lib/requestService';
import { supabase } from '../../lib/supabase';

const COLORS = {
  primary: '#A9301E',
  primaryDark: '#7D1F13',
  primarySoft: '#D4422F',
  accent: '#FACC15',
  dark: '#0F172A',
  white: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  line: '#E2E8F0',
  bg: '#F8FAFC',
  card: 'rgba(255, 255, 255, 0.9)',
  success: '#10B981',
  warning: '#F59E0B'
};

const SERVICES = [
  {
    id: 'visitors',
    title: 'Ingreso Visitantes',
    subtitle: 'Registro y control',
    icon: 'people-circle-outline',
    color: '#E63946', // Confident Red
    route: '/requests/visitors',
    desc: 'Gestione el ingreso de personal externo con seguridad.'
  },
  {
    id: 'transport',
    title: 'Transporte',
    subtitle: 'Vehículos oficiales',
    icon: 'car-sport-outline',
    color: '#0077B6', // Deep Ocean Blue
    route: '/requests/transport',
    desc: 'Solicite traslados para misiones oficiales de la entidad.'
  },
  {
    id: 'maintenance',
    title: 'Mantenimiento',
    subtitle: 'Reportes locativos',
    icon: 'construct-outline',
    color: '#2A9D8F', // Teal/Green
    route: '/requests/maintenance',
    desc: 'Reporte fallas en infraestructura y servicios generales.'
  },
  {
    id: 'rooms',
    title: 'Reserva de Salas',
    subtitle: 'Agenda de espacios',
    icon: 'calendar-clear-outline',
    color: '#7209B7', // Royal Purple
    route: '/requests/rooms',
    desc: 'Reserve salas de juntas y auditorios institucionales.'
  },
  {
    id: 'parking',
    title: 'Parqueadero',
    subtitle: 'Acceso institucional',
    icon: 'navigate-circle-outline',
    color: '#F4A261', // Sand/Orange
    route: '/requests/parking',
    desc: 'Solicite cupos de parqueadero permanentes y temporales.'
  },
];

const RECENT_REQUESTS = [
  {
    id: '1',
    title: 'Falla aire sala B',
    type: 'Mantenimiento',
    status: 'En revisión',
    date: '24 Oct 2026',
    color: '#F59E0B',
  },
  {
    id: '2',
    title: 'Transporte reunión externa',
    type: 'Movilidad',
    status: 'Aprobada',
    date: '25 Oct 2026',
    color: '#10B981',
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const getCardWidth = () => {
    if (isDesktop) return (width - 450) / 3; // Sidebar (380) + padding
    if (isTablet) return (width - 60) / 2;
    return width - 40;
  };

  const cardWidth = getCardWidth();
  const [requests, setRequests] = useState<AdministrativeRequest[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // En una implementación real, buscaríamos el perfil en la tabla 'profiles'
        setUserProfile({ name: user.email?.split('@')[0] || 'Usuario' });
        
        const allRequests = await requestService.getAll();
        // Filtrar por el usuario actual (suponiendo que requestService.getAll() trae todo o tenemos RLS)
        setRequests(allRequests);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      active: requests.filter(r => !['resuelto', 'rechazada'].includes(r.status.toLowerCase())).length
    };
  }, [requests]);

  const recentRequestsUI = useMemo(() => {
    return requests.slice(0, 3).map(req => ({
      id: req.id,
      title: req.title,
      type: req.category,
      status: req.status.charAt(0).toUpperCase() + req.status.slice(1).replace('_', ' '),
      date: new Date(req.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      color: req.status === 'pendiente' ? COLORS.warning : COLORS.success
    }));
  }, [requests]);

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
        
        {isDesktop && <Sidebar user={userProfile} />}

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <HeroSection isDesktop={isDesktop} user={userProfile} stats={stats} />

          <View style={styles.content}>
            {/* Quick Access Section */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>SERVICIOS</Text>
                <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
              </View>
            </View>

            <View style={[styles.grid, { justifyContent: isDesktop ? 'flex-start' : 'center' }]}>
              {SERVICES.map((item) => (
                <ServiceCard 
                  key={item.id} 
                  item={item} 
                  width={cardWidth} 
                  onPress={() => router.push(item.route)} 
                />
              ))}
            </View>

            {/* Stats / Requests Summary Section */}
            <View style={[styles.sectionHeader, { marginTop: 40 }]}>
              <View>
                <Text style={styles.sectionKicker}>SEGUIMIENTO</Text>
                <Text style={styles.sectionTitle}>Solicitudes Recientes</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/requests')}>
                <Text style={styles.viewAllText}>Ver todas</Text>
              </Pressable>
            </View>

            <View style={styles.requestsContainer}>
              {recentRequestsUI.map((req) => (
                <RequestCard key={req.id} req={req} onPress={() => router.push('/(tabs)/requests')} />
              ))}
              {recentRequestsUI.length === 0 && (
                <Text style={{ textAlign: 'center', color: COLORS.muted, marginTop: 20 }}>No tienes solicitudes recientes.</Text>
              )}
            </View>

            {/* Notice / Banner */}
            <LinearGradient
              colors={['#1e1e1e', '#2d2d2d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.announcement}
            >
              <View style={styles.annIconBox}>
                <Ionicons name="megaphone" size={24} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.annTitle}>Comunicado Institucional</Text>
                <Text style={styles.annText}>
                  Recuerde que el mantenimiento preventivo de la sede se realizará los fines de semana de este mes.
                </Text>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function Sidebar({ user }: any) {
  return (
    <View style={styles.sidebar}>
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1551218371-70068832a829?q=80&w=1000&auto=format&fit=crop' }} 
        style={styles.sideBg}
      >
        <LinearGradient colors={['rgba(169, 48, 30, 0.95)', 'rgba(15, 23, 42, 0.95)']} style={StyleSheet.absoluteFill} />
        <View style={styles.sideContent}>
          <View style={styles.logoRing}>
            <Ionicons name="business" size={54} color={COLORS.white} />
          </View>
          <Text style={styles.sideTitle}>Portal del Funcionario</Text>
          <Text style={styles.sideSub}>SASGE - Sistema de Gestión</Text>
          <View style={styles.sideDivider} />
          <Text style={styles.sideDesc}>
            Centralización de trámites y servicios administrativos para los colaboradores de la Secretaría Jurídica Distrital.
          </Text>
          
          <View style={styles.userSection}>
            <View style={styles.avatarMini}>
              <Ionicons name="person" size={24} color={COLORS.white} />
            </View>
            <View>
              <Text style={styles.userName}>{user?.name || 'Cargando...'}</Text>
              <Text style={styles.userRole}>Funcionario</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

function HeroSection({ isDesktop, user, stats }: any) {
  const router = useRouter();
  return (
    <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.primaryDark }]} />
        <SafeAreaView style={styles.heroSafe}>
          <View style={[styles.heroTop, { flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>SECRETARÍA JURÍDICA DISTRITAL</Text>
              <Text style={styles.heroTitle}>Bienvenido, {user?.name || '...'}</Text>
              <Text style={styles.heroSub}>¿Qué gestión administrativa realizaremos hoy?</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, alignSelf: isDesktop ? 'auto' : 'flex-end' }}>
              <View style={styles.statsPanel}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{stats.total}</Text>
                  <Text style={styles.statLab}>Trámites</Text>
                </View>
                <View style={styles.statDiv} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{stats.active}</Text>
                  <Text style={styles.statLab}>Activos</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.logoutBtn} 
                onPress={() => router.replace('/login')}
              >
                <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
    </View>
  );
}

function ServiceCard({ item, width, onPress }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleIn = () => {
    Animated.spring(scale, { toValue: 1.05, useNativeDriver: true }).start();
  };

  const handleOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Pressable 
      onPress={onPress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      // @ts-ignore
      onHoverIn={handleIn}
      onHoverOut={handleOut}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={[styles.serviceCard, { width: width }]}>
          <LinearGradient
            colors={[`${item.color}15`, `${item.color}05`]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardWatermark}>
            <Ionicons name={item.icon} size={120} color={`${item.color}10`} />
          </View>
          
          <View style={styles.cardInfo}>
            <View style={[styles.cardIconCircle, { backgroundColor: item.color, shadowColor: item.color }]}>
              <Ionicons name={item.icon} size={28} color={COLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={[styles.cardSub, { color: item.color, opacity: 1 }]}>{item.subtitle}</Text>
            </View>
          </View>

          <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>

          <View style={styles.cardBottom}>
            <BlurView intensity={20} tint="light" style={styles.glassButton}>
              <Text style={[styles.glassButtonText, { color: item.color }]}>Solicitar ahora</Text>
              <Ionicons name="add-circle" size={18} color={item.color} />
            </BlurView>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function RequestCard({ req, onPress }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleIn = () => {
    Animated.spring(scale, { toValue: 1.02, useNativeDriver: true }).start();
  };

  const handleOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Pressable 
      onPress={onPress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      // @ts-ignore
      onHoverIn={handleIn}
      onHoverOut={handleOut}
    >
      <Animated.View style={[styles.requestCard, { transform: [{ scale }] }]}>
        <BlurView intensity={40} tint="light" style={styles.reqGlass}>
          <View style={[styles.statusIndicator, { backgroundColor: req.color }]} />
          <View style={styles.reqBody}>
            <Text style={styles.reqTitle}>{req.title}</Text>
            <Text style={styles.reqMeta}>{req.type} • {req.date}</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: req.color }]}>
            <Text style={[styles.statusPillText, { color: req.color }]}>{req.status}</Text>
          </View>
        </BlurView>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  sidebar: { width: 380, height: '100%' },
  sideBg: { flex: 1 },
  sideContent: { flex: 1, padding: 50, justifyContent: 'center' },
  logoRing: { width: 90, height: 90, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  sideTitle: { color: COLORS.white, fontSize: 32, fontWeight: '900', lineHeight: 38 },
  sideSub: { color: 'rgba(255,255,255,0.8)', fontSize: 18, marginTop: 5 },
  sideDivider: { width: 50, height: 4, backgroundColor: COLORS.accent, marginVertical: 25, borderRadius: 2 },
  sideDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 16, lineHeight: 24 },
  userSection: { marginTop: 'auto', flexDirection: 'row', gap: 15, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 20, borderRadius: 20 },
  avatarMini: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center' },
  userName: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  userRole: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  hero: { height: 140, width: '100%' },
  heroDesktop: { height: 160, borderBottomRightRadius: 40, overflow: 'hidden' },
  heroBg: { flex: 1 },
  heroSafe: { flex: 1, paddingHorizontal: 35, justifyContent: 'center' },
  heroKicker: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { color: COLORS.white, fontSize: 28, fontWeight: '900', marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
  heroTop: { justifyContent: 'space-between', gap: 20 },
  logoutBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statsPanel: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 12, gap: 15, alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statVal: { color: COLORS.white, fontSize: 24, fontWeight: '900' },
  statLab: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
  statDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  content: { paddingHorizontal: 35, paddingVertical: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  sectionKicker: { color: COLORS.primary, fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  sectionTitle: { fontSize: 28, fontWeight: '900', color: COLORS.dark, marginTop: 4 },
  viewAllText: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  serviceCard: { height: 260, borderRadius: 32, padding: 24, backgroundColor: COLORS.white, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 10 },
      web: { boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }
    })
  },
  cardWatermark: { position: 'absolute', right: -20, top: -20, transform: [{ rotate: '-15deg' }] },
  cardInfo: { flexDirection: 'row', gap: 15, alignItems: 'center', marginBottom: 20 },
  cardIconCircle: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 12 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: COLORS.dark, letterSpacing: -0.3 },
  cardSub: { fontSize: 13, fontWeight: '800', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardDesc: { fontSize: 14, color: COLORS.text, lineHeight: 20, opacity: 0.8 },
  cardBottom: { marginTop: 'auto' },
  glassButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  glassButtonText: { fontSize: 14, fontWeight: '800' },

  requestsContainer: { gap: 12 },
  requestCard: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  reqGlass: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 15 },
  statusIndicator: { width: 4, height: 30, borderRadius: 2 },
  reqBody: { flex: 1 },
  reqTitle: { fontSize: 16, fontWeight: '800', color: COLORS.dark },
  reqMeta: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.8)' },
  statusPillText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },

  announcement: { marginTop: 30, borderRadius: 25, padding: 20, flexDirection: 'row', gap: 15, alignItems: 'center' },
  annIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  annTitle: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
  annText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, lineHeight: 20 }
});