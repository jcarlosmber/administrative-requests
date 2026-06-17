import React, { useRef } from 'react';
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
import { useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { requestService, AdministrativeRequest } from '../../lib/requestService';
import { supabase } from '../../lib/supabase';

const COLORS = {
  primary: '#0F172A', // Admin Slate
  primaryDark: '#020617',
  primarySoft: '#334155',
  accent: '#3B82F6', // Power Blue
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  white: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  line: '#E2E8F0',
  bg: '#F8FAFC',
};

const KPI_DATA = [
  { id: 'pending', title: 'Pendientes', value: '24', icon: 'time', color: '#F59E0B', desc: 'Solicitudes por revisar' },
  { id: 'total', title: 'Total Hoy', value: '156', icon: 'stats-chart', color: '#3B82F6', desc: 'Trámites procesados' },
  { id: 'alerts', title: 'Urgencias', value: '3', icon: 'alert-circle', color: '#EF4444', desc: 'Atención inmediata' },
];

const RECENT_ACTIVITY = [
  { id: '1', user: 'Juan Pérez', type: 'Reserva Sala', status: 'Pendiente', time: '10 min', color: '#7209B7' },
  { id: '2', user: 'María García', type: 'Mantenimiento', status: 'Urgente', time: '25 min', color: '#2A9D8F' },
  { id: '3', user: 'Carlos Ruiz', type: 'Parqueadero', status: 'Aprobado', time: '1 hora', color: '#F4A261' },
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const cardWidth = isDesktop ? (width - 450) / 3 : width - 40;
  const [requests, setRequests] = React.useState<AdministrativeRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Animaciones para el banner de reportes
  const bannerHoverAnim = React.useRef(new Animated.Value(0)).current;
  const bannerFadeAnim = React.useRef(new Animated.Value(0)).current;
  const bannerSlideAnim = React.useRef(new Animated.Value(25)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(bannerFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.spring(bannerSlideAnim, {
        toValue: 0,
        friction: 8,
        tension: 30,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBannerHoverIn = () => {
    Animated.spring(bannerHoverAnim, {
      toValue: 1,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleBannerHoverOut = () => {
    Animated.spring(bannerHoverAnim, {
      toValue: 0,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const bannerTranslateY = Animated.add(
    bannerSlideAnim,
    bannerHoverAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -5],
    })
  );

  const bannerScale = bannerHoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });


  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await requestService.getAll();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStats();

    const subscription = supabase
      .channel('admin_dashboard_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'administrative_requests' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const kpiStats = React.useMemo(() => {
    const today = new Date().toDateString();
    const pending = requests.filter(r => r.status === 'pendiente').length;
    const todayCount = requests.filter(r => new Date(r.created_at).toDateString() === today).length;
    const urgencies = requests.filter(r => r.priority === 'alta' && r.status !== 'resuelto').length;

    return [
      { id: 'pending', title: 'Pendientes', value: pending.toString(), icon: 'time', color: '#F59E0B', desc: 'Solicitudes por revisar' },
      { id: 'total', title: 'Total Hoy', value: todayCount.toString(), icon: 'stats-chart', color: '#3B82F6', desc: 'Trámites procesados' },
      { id: 'alerts', title: 'Urgencias', value: urgencies.toString(), icon: 'alert-circle', color: '#EF4444', desc: 'Atención inmediata' },
    ];
  }, [requests]);

  const handleKpiPress = (item: { id: string }) => {
    const params: Record<string, string> = {};

    if (item.id === 'pending') {
      params.status = 'pendiente';
    } else if (item.id === 'total') {
      params.today = 'true';
    } else if (item.id === 'alerts') {
      params.priority = 'alta';
      params.status = 'pendiente';
    }

    router.push({
      pathname: '/admin/manage',
      params,
    });
  };

  const recentActivity = React.useMemo(() => {
    return requests.slice(0, 3).map(req => {
      const timeDiff = Math.floor((new Date().getTime() - new Date(req.created_at).getTime()) / (1000 * 60));
      const timeStr = timeDiff < 60 ? `${timeDiff} min` : `${Math.floor(timeDiff / 60)}h`;
      
      const typeLabel = {
        visitors: 'Visitantes',
        transport: 'Transporte',
        maintenance: 'Mantenimiento',
        rooms: 'Salas',
        parking: 'Parqueadero'
      }[req.category] || req.category;

      const typeColor = {
        visitors: '#E63946',
        transport: '#0077B6',
        maintenance: '#2A9D8F',
        rooms: '#7209B7',
        parking: '#F4A261'
      }[req.category] || COLORS.accent;

      return {
        id: req.id,
        user: 'Usuario Sistema', // Opcional: Cargar perfiles
        type: typeLabel,
        status: req.status.charAt(0).toUpperCase() + req.status.slice(1).replace('_', ' '),
        time: timeStr,
        color: typeColor
      };
    });
  }, [requests]);

  const efficiency = React.useMemo(() => {
    if (requests.length === 0) return 0;
    const completed = requests.filter(r => r.status === 'resuelto').length;
    return Math.round((completed / requests.length) * 100);
  }, [requests]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
        
        {isDesktop && <Sidebar />}

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <HeroSection isDesktop={isDesktop} efficiency={efficiency} urgencies={kpiStats[2].value} />

          <View style={styles.content}>
            {/* KPI Section */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>INDICADORES</Text>
                <Text style={styles.sectionTitle}>Estado del Sistema</Text>
              </View>
            </View>

            <View style={[styles.grid, { justifyContent: isDesktop ? 'flex-start' : 'center' }]}>
              {kpiStats.map((item, index) => (
                <KPICard 
                  key={item.id} 
                  item={item} 
                  width={cardWidth} 
                  index={index}
                  onPress={() => handleKpiPress(item)} 
                />
              ))}
            </View>

            {/* Recent Activity */}
            <View style={[styles.sectionHeader, { marginTop: 40 }]}>
              <View>
                <Text style={styles.sectionKicker}>ACTIVIDAD</Text>
                <Text style={styles.sectionTitle}>Últimos Movimientos</Text>
              </View>
              <Pressable onPress={() => router.push('/admin/manage')}>
                <Text style={styles.viewAllText}>Gestionar todo</Text>
              </Pressable>
            </View>

            <View style={styles.activityContainer}>
              {recentActivity.map((item, index) => (
                <ActivityRow key={item.id} item={item} index={index} />
              ))}
              {recentActivity.length === 0 && (
                <Text style={{ textAlign: 'center', color: COLORS.muted, marginTop: 20 }}>No hay actividad reciente.</Text>
              )}
            </View>

            {/* Reports Banner */}
            <Pressable 
              onPress={() => router.push('/admin/reports')}
              onHoverIn={handleBannerHoverIn}
              onHoverOut={handleBannerHoverOut}
              onPressIn={handleBannerHoverIn}
              onPressOut={handleBannerHoverOut}
            >
              <Animated.View style={{ 
                opacity: bannerFadeAnim,
                transform: [{ translateY: bannerTranslateY }, { scale: bannerScale }] 
              }}>
                <LinearGradient
                  colors={['#0F172A', '#1E293B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.reportsBanner}
                >
                  <View style={styles.bannerIconBox}>
                    <Ionicons name="bar-chart" size={28} color={COLORS.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>Reportes Consolidados</Text>
                    <Text style={styles.bannerText}>
                      Consulte estadísticas de uso por dependencia y tiempos de respuesta.
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={32} color={COLORS.white} opacity={0.8} />
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function Sidebar() {
  return (
    <View style={styles.sidebar}>
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop' }} 
        style={styles.sideBg}
      >
        <LinearGradient colors={['rgba(15, 23, 42, 0.95)', 'rgba(2, 6, 23, 0.98)']} style={StyleSheet.absoluteFill} />
        <View style={styles.sideContent}>
          <View style={styles.logoRing}>
            <Ionicons name="shield-checkmark" size={54} color={COLORS.white} />
          </View>
          <Text style={styles.sideTitle}>Panel de Control</Text>
          <Text style={styles.sideSub}>SASGE Admin - Bogotá</Text>
          <View style={styles.sideDivider} />
          <Text style={styles.sideDesc}>
            Módulo de supervisión y gestión de servicios generales de la Secretaría Jurídica Distrital.
          </Text>
          
          <View style={styles.userSection}>
            <View style={styles.avatarMini}>
              <Ionicons name="person" size={24} color={COLORS.white} />
            </View>
            <View>
              <Text style={styles.userName}>Administrador</Text>
              <Text style={styles.userRole}>Nivel: Superusuario</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

function HeroSection({ isDesktop, efficiency, urgencies }: any) {
  const router = useRouter();
  return (
    <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.primaryDark }]} />
        <SafeAreaView style={styles.heroSafe}>
          <View style={[styles.heroTop, { flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>SISTEMA DE ADMINISTRACIÓN</Text>
              <Text style={styles.heroTitle}>Control de Gestión</Text>
              <Text style={styles.heroSub}>Supervisando la operación administrativa</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, alignSelf: isDesktop ? 'auto' : 'flex-end' }}>
              <View style={styles.statsPanel}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{efficiency}%</Text>
                  <Text style={styles.statLab}>Eficiencia</Text>
                </View>
                <View style={styles.statDiv} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{urgencies}</Text>
                  <Text style={styles.statLab}>Críticos</Text>
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

function KPICard({ item, width, onPress, index }: any) {
  const hoverAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 35,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleHoverIn = () => {
    Animated.spring(hoverAnim, {
      toValue: 1,
      friction: 7,
      tension: 45,
      useNativeDriver: true,
    }).start();
  };

  const handleHoverOut = () => {
    Animated.spring(hoverAnim, {
      toValue: 0,
      friction: 7,
      tension: 45,
      useNativeDriver: true,
    }).start();
  };

  const translateY = Animated.add(
    slideAnim,
    hoverAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -8],
    })
  );

  const scale = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPressIn={handleHoverIn}
      onPressOut={handleHoverOut}
      style={{ width: width }}
    >
      <Animated.View style={[
        styles.kpiCard, 
        { 
          width: '100%',
          opacity: fadeAnim,
          transform: [{ translateY }, { scale }],
        }
      ]}>
        <LinearGradient
          colors={[`${item.color}10`, `${item.color}05`]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardInfo}>
          <View style={[styles.cardIconCircle, { backgroundColor: item.color }]}>
            <Ionicons name={item.icon} size={28} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statValueText}>{item.value}</Text>
            <Text style={styles.cardTitleText}>{item.title}</Text>
          </View>
        </View>
        <Text style={styles.cardDescText}>{item.desc}</Text>
        <View style={styles.cardBottom}>
          <View style={styles.trendRow}>
            <Ionicons name="trending-up" size={14} color={item.color} />
            <Text style={[styles.trendText, { color: item.color }]}>+12% este mes</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function ActivityRow({ item, index }: any) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  const hoverAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 200 + index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 35,
        delay: 200 + index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleHoverIn = () => {
    Animated.spring(hoverAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleHoverOut = () => {
    Animated.spring(hoverAnim, {
      toValue: 0,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const translateX = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  const translateY = slideAnim;

  return (
    <Pressable
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPressIn={handleHoverIn}
      onPressOut={handleHoverOut}
    >
      <Animated.View style={[
        styles.activityRow, 
        { 
          opacity: fadeAnim,
          transform: [{ translateY }, { translateX }],
        }
      ]}>
        <BlurView intensity={30} tint="light" style={styles.activityGlass}>
          <View style={[styles.activityDot, { backgroundColor: item.color }]} />
          <View style={styles.activityBody}>
            <Text style={styles.activityUser}>{item.user}</Text>
            <Text style={styles.activityType}>{item.type} • Hace {item.time}</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: item.color }]}>
            <Text style={[styles.statusPillText, { color: item.color }]}>{item.status}</Text>
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
  avatarMini: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  userName: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  userRole: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  hero: { height: 140, width: '100%' },
  heroDesktop: { height: 160, borderBottomRightRadius: 40, overflow: 'hidden' },
  heroSafe: { flex: 1, paddingHorizontal: 35, justifyContent: 'center' },
  heroKicker: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
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
  sectionKicker: { color: COLORS.accent, fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  sectionTitle: { fontSize: 28, fontWeight: '900', color: COLORS.primary, marginTop: 4 },
  viewAllText: { color: COLORS.accent, fontWeight: '800', fontSize: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  kpiCard: { height: 200, borderRadius: 32, padding: 24, backgroundColor: COLORS.white, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 10 },
      web: { boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }
    })
  },
  cardInfo: { flexDirection: 'row', gap: 18, alignItems: 'center', marginBottom: 15 },
  cardIconCircle: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statValueText: { fontSize: 28, fontWeight: '900', color: COLORS.primary },
  cardTitleText: { fontSize: 14, fontWeight: '800', color: COLORS.muted, marginTop: -2 },
  cardDescText: { fontSize: 14, color: COLORS.text, lineHeight: 20, opacity: 0.8 },
  cardBottom: { marginTop: 'auto' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trendText: { fontSize: 12, fontWeight: '800' },

  activityContainer: { gap: 12 },
  activityRow: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  activityGlass: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 15 },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityBody: { flex: 1 },
  activityUser: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  activityType: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.8)' },
  statusPillText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },

  reportsBanner: { marginTop: 30, borderRadius: 28, padding: 25, flexDirection: 'row', gap: 20, alignItems: 'center' },
  bannerIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  bannerText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4, lineHeight: 20 }
});
