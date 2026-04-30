import React, { useMemo, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  TextInput, 
  ScrollView, 
  Dimensions, 
  Animated,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { requestService, AdministrativeRequest } from '../../../lib/requestService';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const COLORS = {
  primary: '#A9301E',
  primaryDark: '#7D1F13',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  dark: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  blue: '#3B82F6',
  accent: '#FACC15'
};

const DATA = [
  { id: '1', title: 'Falla aire sala B', cat: 'Infraestructura', status: 'Pendiente', date: '24 Oct 2026', color: COLORS.warning },
  { id: '2', title: 'Transporte reunión externa', cat: 'Transporte', status: 'Resuelta', date: '25 Oct 2026', color: COLORS.success },
  { id: '3', title: 'Cambio luminaria piso 3', cat: 'Mantenimiento', status: 'En proceso', date: '22 Oct 2026', color: COLORS.blue },
  { id: '4', title: 'Reserva Sala Juntas A', cat: 'Salas', status: 'Aprobada', date: 'Hoy, 2:00 PM', color: COLORS.success },
  { id: '5', title: 'Solicitud Parqueadero Temp', cat: 'Parqueadero', status: 'Rechazada', date: '20 Oct 2026', color: COLORS.primary },
  { id: '6', title: 'Registro Visitantes - Grupo X', cat: 'Visitantes', status: 'Pendiente', date: 'Mañana', color: COLORS.warning },
];

const CATEGORIES = ['Todas', 'Visitantes', 'Transporte', 'Mantenimiento', 'Salas', 'Parqueadero', 'Infraestructura'];
const STATUSES = ['Todos', 'Pendiente', 'En proceso', 'Aprobada', 'Resuelta', 'Rechazada'];

export default function RequestsScreen() {
  const [requests, setRequests] = useState<AdministrativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [serviceFilter, setServiceFilter] = useState('Todas');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestService.getAll();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRequests();
    
    // Realtime subscription
    const subscription = supabase
      .channel('user_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'administrative_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const stats = useMemo(() => {
    return {
      pendientes: requests.filter(r => r.status === 'pendiente').length,
      aprobadas: requests.filter(r => r.status === 'resuelto').length,
      enCurso: requests.filter(r => r.status === 'en_progreso').length
    };
  }, [requests]);

  const filteredData = useMemo(() => {
    return requests.filter(item => {
      const typeLabel = {
        visitors: 'Visitantes',
        transport: 'Transporte',
        maintenance: 'Mantenimiento',
        rooms: 'Salas',
        parking: 'Parqueadero'
      }[item.category] || item.category;

      const matchesSearch = (item.title + typeLabel).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'Todos' || item.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesService = serviceFilter === 'Todas' || typeLabel === serviceFilter;
      return matchesSearch && matchesStatus && matchesService;
    });
  }, [requests, searchQuery, statusFilter, serviceFilter]);

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
        
        {isDesktop && <Sidebar />}

        <View style={{ flex: 1 }}>
          <FlatList
            ListHeaderComponent={
              <View style={styles.headerContainer}>
                <HeroSection />
                <View style={styles.contentPadding}>
                  <KPISection stats={stats} />
                  <SearchBar query={searchQuery} setQuery={setSearchQuery} />
                  
                  <FilterRow 
                    label="Por Servicio" 
                    data={CATEGORIES} 
                    selected={serviceFilter} 
                    onSelect={setServiceFilter} 
                    icon="layers-outline"
                  />
                  
                  <FilterRow 
                    label="Por Estado" 
                    data={STATUSES} 
                    selected={statusFilter} 
                    onSelect={setStatusFilter} 
                    icon="options-outline"
                  />

                  <View style={styles.resultsHeader}>
                    <Text style={styles.resultsTitle}>
                      {filteredData.length} {filteredData.length === 1 ? 'Solicitud encontrada' : 'Solicitudes encontradas'}
                    </Text>
                  </View>
                </View>
              </View>
            }
            data={filteredData}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <RequestCard item={mapRequestToUI(item)} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {!isDesktop && (
          <Pressable style={styles.fab}>
            <Ionicons name="add" size={30} color={COLORS.white} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const mapRequestToUI = (item: AdministrativeRequest) => {
  const typeLabel = {
    visitors: 'Visitantes',
    transport: 'Transporte',
    maintenance: 'Mantenimiento',
    rooms: 'Salas',
    parking: 'Parqueadero'
  }[item.category] || item.category;

  const typeColor = {
    visitors: COLORS.primary,
    transport: COLORS.blue,
    maintenance: COLORS.success,
    rooms: '#7209B7',
    parking: COLORS.accent
  }[item.category] || COLORS.muted;

  const statusColor = {
    pendiente: COLORS.warning,
    resuelto: COLORS.success,
    en_progreso: COLORS.blue,
    rechazada: COLORS.primary
  }[item.status.toLowerCase()] || COLORS.muted;

  return {
    ...item,
    cat: typeLabel,
    status: item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' '),
    date: new Date(item.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    color: statusColor
  };
};

function Sidebar() {
  return (
    <View style={styles.sidebar}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
      <View style={styles.sidebarContent}>
        <View style={styles.logoCircle}>
          <Ionicons name="documents-outline" size={40} color={COLORS.white} />
        </View>
        <Text style={styles.sideTitle}>Historial</Text>
        <Text style={styles.sideSubTitle}>Seguimiento de Trámites</Text>
        <View style={styles.sideDivider} />
        <Text style={styles.sideDesc}>
          Consulte el estado de sus requerimientos administrativos y reciba actualizaciones en tiempo real.
        </Text>
      </View>
    </View>
  );
}

function HeroSection() {
  return (
    <View style={styles.hero}>
      <LinearGradient 
        colors={[COLORS.primaryDark, '#0F172A']} 
        style={StyleSheet.absoluteFill} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.heroInner, !isDesktop && { paddingTop: 40 }]}>
        <Text style={styles.heroKicker}>PANEL DE CONTROL</Text>
        <Text style={styles.heroTitle}>Mis Solicitudes</Text>
        <Text style={styles.heroSub}>Administre y rastree sus requerimientos</Text>
      </View>
    </View>
  );
}

function KPISection({ stats }: { stats: { pendientes: number, aprobadas: number, enCurso: number } }) {
  return (
    <View style={styles.kpiRow}>
      <KPICard label="Pendientes" value={stats.pendientes.toString()} color={COLORS.warning} icon="time" />
      <KPICard label="Aprobadas" value={stats.aprobadas.toString()} color={COLORS.success} icon="checkmark-circle" />
      <KPICard label="En Curso" value={stats.enCurso.toString()} color={COLORS.blue} icon="sync" />
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

function SearchBar({ query, setQuery }: any) {
  return (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color={COLORS.muted} />
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por título o servicio..."
        value={query}
        onChangeText={setQuery}
        placeholderTextColor={COLORS.muted}
      />
      {query.length > 0 && (
        <Pressable onPress={() => setQuery('')}>
          <Ionicons name="close-circle" size={18} color={COLORS.muted} />
        </Pressable>
      )}
    </View>
  );
}

function FilterRow({ label, data, selected, onSelect, icon }: any) {
  return (
    <View style={styles.filterSection}>
      <View style={styles.filterHeader}>
        <Ionicons name={icon} size={14} color={COLORS.primary} />
        <Text style={styles.filterLabel}>{label}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {data.map((item: string) => (
          <Pressable
            key={item}
            onPress={() => onSelect(item)}
            style={[
              styles.filterChip,
              selected === item && styles.filterChipActive
            ]}
          >
            <Text style={[
              styles.filterChipText,
              selected === item && styles.filterChipTextActive
            ]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function RequestCard({ item }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const handleOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Pressable onPressIn={handleIn} onPressOut={handleOut}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={[styles.statusIndicator, { backgroundColor: item.color }]} />
        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={[styles.cardCategory, { color: item.color }]}>{item.cat}</Text>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${item.color}10` }]}>
              <View style={[styles.statusDot, { backgroundColor: item.color }]} />
              <Text style={[styles.statusText, { color: item.color }]}>{item.status}</Text>
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.muted} />
              <Text style={styles.metaText}>{item.date}</Text>
            </View>
            <View style={styles.actionLink}>
              <Text style={styles.actionLinkText}>Ver detalles</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
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
  kpiValue: { fontSize: 24, fontWeight: '900', color: COLORS.dark },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, marginTop: 2 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 18, paddingHorizontal: 16, height: 56, marginTop: 20, borderWidth: 1, borderColor: COLORS.line },
  searchInput: { flex: 1, paddingHorizontal: 12, fontSize: 15, color: COLORS.dark, fontWeight: '600' },

  filterSection: { marginTop: 20 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingLeft: 5 },
  filterLabel: { fontSize: 13, fontWeight: '800', color: COLORS.dark, textTransform: 'uppercase', letterSpacing: 1 },
  filterScroll: { gap: 10, paddingRight: 25 },
  filterChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 14, fontWeight: '700', color: COLORS.muted },
  filterChipTextActive: { color: COLORS.white },

  resultsHeader: { marginTop: 25, marginBottom: 5, paddingLeft: 5 },
  resultsTitle: { fontSize: 15, fontWeight: '800', color: COLORS.muted },

  listContent: { paddingBottom: 100 },
  card: { backgroundColor: COLORS.white, borderRadius: 24, flexDirection: 'row', overflow: 'hidden', marginBottom: 16, marginHorizontal: 25, borderWidth: 1, borderColor: COLORS.line, 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)' }
    })
  },
  statusIndicator: { width: 6, height: '100%' },
  cardMain: { flex: 1, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  cardHeaderLeft: { flex: 1, marginRight: 10 },
  cardCategory: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: COLORS.dark },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 15 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  actionLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionLinkText: { fontSize: 13, color: COLORS.primary, fontWeight: '800' },

  fab: { position: 'absolute', right: 25, bottom: 25, width: 64, height: 64, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 }
});