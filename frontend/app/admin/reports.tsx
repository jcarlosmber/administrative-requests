import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  useWindowDimensions, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const COLORS = {
  primary: '#0F172A',
  primaryDark: '#020617',
  primarySoft: '#334155',
  accent: '#3B82F6',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  line: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
};

export default function AdminReports() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
        
        {isDesktop && <Sidebar />}

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <HeroSection isDesktop={isDesktop} />
          
          <View style={styles.contentPadding}>
            <KPISection />

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>INFORMES</Text>
                <Text style={styles.sectionTitle}>Generación de Reportes</Text>
              </View>
            </View>

            <View style={styles.grid}>
              <ReportCard title="Consumo Mensual" icon="calendar" color="#3B82F6" desc="Resumen de gastos y consumos mensuales." />
              <ReportCard title="Uso de Salas" icon="business" color="#7209B7" desc="Estadísticas de reserva y ocupación." />
              <ReportCard title="Gasto Transporte" icon="car" color="#0077B6" desc="Kilometraje y misiones oficiales." />
              <ReportCard title="Incidentes Locativos" icon="build" color="#2A9D8F" desc="Reportes de mantenimiento resueltos." />
            </View>

            <TouchableOpacity style={styles.generateBtn}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primarySoft]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.generateGradient}
              >
                <Ionicons name="download-outline" size={24} color={COLORS.white} />
                <Text style={styles.generateText}>Descargar Reporte Consolidado (PDF)</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function Sidebar() {
  return (
    <View style={styles.sidebar}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
      <View style={styles.sidebarContent}>
        <View style={styles.logoCircle}>
          <Ionicons name="bar-chart-outline" size={40} color={COLORS.white} />
        </View>
        <Text style={styles.sideTitle}>Reportes</Text>
        <Text style={styles.sideSubTitle}>Analítica de Gestión</Text>
        <View style={styles.sideDivider} />
        <Text style={styles.sideDesc}>
          Analice el rendimiento de los servicios administrativos y optimice los recursos institucionales.
        </Text>
      </View>
    </View>
  );
}

function HeroSection({ isDesktop }: any) {
  return (
    <View style={styles.hero}>
      <LinearGradient 
        colors={[COLORS.primaryDark, '#1E293B']} 
        style={StyleSheet.absoluteFill} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.heroInner, !isDesktop && { paddingTop: 40 }]}>
        <Text style={styles.heroKicker}>REPORTE Y ESTADÍSTICA</Text>
        <Text style={styles.heroTitle}>Informes de Gestión</Text>
        <Text style={styles.heroSub}>Visualice el impacto de los servicios administrativos</Text>
      </View>
    </View>
  );
}

function KPISection() {
  return (
    <View style={styles.kpiRow}>
      <KPICard label="Efectividad" value="92%" color={COLORS.success} icon="trending-up" />
      <KPICard label="T. Respuesta" value="1.5d" color={COLORS.accent} icon="time" />
      <KPICard label="Usuarios" value="450" color={COLORS.primarySoft} icon="people" />
    </View>
  );
}

function KPICard({ label, value, color, icon }: any) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function ReportCard({ title, icon, color, desc }: any) {
  return (
    <TouchableOpacity style={styles.card}>
      <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  sidebar: { width: 320, height: '100%', overflow: 'hidden' },
  sidebarContent: { flex: 1, padding: 40, justifyContent: 'center' },
  logoCircle: { width: 80, height: 80, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  sideTitle: { color: COLORS.white, fontSize: 36, fontWeight: '900' },
  sideSubTitle: { color: COLORS.accent, fontSize: 18, fontWeight: '700', marginTop: 5 },
  sideDivider: { width: 40, height: 4, backgroundColor: COLORS.white, marginVertical: 25, borderRadius: 2 },
  sideDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 24 },

  scrollContent: { paddingBottom: 60 },
  headerContainer: { paddingBottom: 10 },
  hero: { height: 160, width: '100%', overflow: 'hidden', borderBottomRightRadius: 40 },
  heroInner: { flex: 1, paddingHorizontal: 25, justifyContent: 'center' },
  heroKicker: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { color: COLORS.white, fontSize: 32, fontWeight: '900', marginTop: 5 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5 },

  contentPadding: { paddingHorizontal: 25 },
  kpiRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  kpiCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: COLORS.line },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  kpiValue: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, marginTop: 2 },

  sectionHeader: { marginTop: 35, marginBottom: 20 },
  sectionKicker: { color: COLORS.accent, fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  sectionTitle: { fontSize: 26, fontWeight: '900', color: COLORS.primary, marginTop: 4 },

  grid: { gap: 15 },
  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 18, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }
    })
  },
  iconBox: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  cardDesc: { fontSize: 13, color: COLORS.muted, marginTop: 4, fontWeight: '500' },

  generateBtn: { marginTop: 40, borderRadius: 20, overflow: 'hidden' },
  generateGradient: { height: 64, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  generateText: { color: COLORS.white, fontSize: 16, fontWeight: '800' }
});
