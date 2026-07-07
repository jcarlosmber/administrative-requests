import React, { useMemo, useRef, useState, useCallback } from 'react';
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
  Platform,
  Modal,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { requestService, AdministrativeRequest } from '../../../lib/requestService';
import { settingsService } from '../../../lib/settingsService';
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

const CATEGORIES = ['Todas', 'Visitantes', 'Transporte', 'Mantenimiento', 'Salas', 'Parqueadero'];
const STATUSES = ['Todos', 'Pendiente', 'En proceso', 'Aprobada', 'Resuelta', 'Rechazada'];

export default function RequestsScreen() {
  const params = useLocalSearchParams();
  const [requests, setRequests] = useState<AdministrativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [serviceFilter, setServiceFilter] = useState((params?.service as string) || 'Todas');
  const [selectedRequest, setSelectedRequest] = useState<AdministrativeRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [evalCategories, setEvalCategories] = useState<string[]>(['visitors', 'transport', 'maintenance', 'rooms', 'parking']);

  // Reactivar el filtro si el parámetro cambia dinámicamente
  React.useEffect(() => {
    if (params?.service) {
      setServiceFilter(params.service as string);
    }
  }, [params?.service]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestService.getAll();
      setRequests(data);
      const cats = await settingsService.getSystemSetting('eval_categories');
      if (cats) setEvalCategories(cats);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos cada vez que la pestaña reciba el foco
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  React.useEffect(() => {
    // Crear un canal con nombre único para evitar colisiones en la caché global de Supabase
    const channelName = `user_requests_changes_${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'administrative_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      const labelMap: Record<string, string> = {
        visitors: 'Visitantes',
        transport: 'Transporte',
        maintenance: 'Mantenimiento',
        rooms: 'Salas',
        parking: 'Parqueadero'
      };
      const typeLabel = labelMap[item.category] || item.category;

      const matchesSearch = (item.title + typeLabel).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = (() => {
        if (statusFilter === 'Todos') return true;
        const statusLower = item.status.toLowerCase();
        const filterLower = statusFilter.toLowerCase();
        if (filterLower === 'pendiente') return statusLower === 'pendiente';
        if (filterLower === 'en proceso') return statusLower === 'en_progreso' || statusLower === 'en proceso';
        if (filterLower === 'aprobada' || filterLower === 'resuelta' || filterLower === 'resuelto') {
          return statusLower === 'resuelto' || statusLower === 'aprobado' || statusLower === 'aprobada' || statusLower === 'resuelta';
        }
        if (filterLower === 'rechazada' || filterLower === 'rechazado') {
          return statusLower === 'rechazado' || statusLower === 'rechazada';
        }
        return statusLower === filterLower;
      })();
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
            renderItem={({ item }) => <RequestCard 
                    item={mapRequestToUI(item)} 
                    evalCategories={evalCategories}
                    onPress={() => {
                  setSelectedRequest(item);
                  setModalVisible(true);
                }} 
              />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          <DetailModal 
            visible={modalVisible} 
            request={selectedRequest} 
            evalCategories={evalCategories}
            onClose={() => {
              setModalVisible(false);
              setSelectedRequest(null);
            }} 
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
  const typeLabel = ({
    visitors: 'Visitantes',
    transport: 'Transporte',
    maintenance: 'Mantenimiento',
    rooms: 'Salas',
    parking: 'Parqueadero'
  } as Record<string, string>)[item.category] || item.category;

  const typeColor = ({
    visitors: COLORS.primary,
    transport: COLORS.blue,
    maintenance: COLORS.success,
    rooms: '#7209B7',
    parking: COLORS.accent
  } as Record<string, string>)[item.category] || COLORS.muted;

  const statusColor = ({
    pendiente: COLORS.warning,
    resuelto: COLORS.success,
    en_progreso: COLORS.blue,
    rechazada: COLORS.primary
  } as Record<string, string>)[item.status.toLowerCase()] || COLORS.muted;

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
      <KPICard label="Pendientes" value={stats.pendientes.toString()} color={COLORS.warning} icon="time" bg="#78350f" index={0} />
      <KPICard label="Aprobadas" value={stats.aprobadas.toString()} color={COLORS.success} icon="checkmark-circle" bg="#064e3b" index={1} />
      <KPICard label="En Curso" value={stats.enCurso.toString()} color={COLORS.blue} icon="sync" bg="#1e3a8a" index={2} />
    </View>
  );
}

function KPICard({ label, value, color, icon, bg, index = 0 }: any) {
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 35,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleHoverIn = () => {
    Animated.spring(hoverAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start();
  };
  const handleHoverOut = () => {
    Animated.spring(hoverAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }).start();
  };

  const translateY = Animated.add(
    slideAnim,
    hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] })
  );
  const scale = hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });

  return (
    <Pressable
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPressIn={handleHoverIn}
      onPressOut={handleHoverOut}
      style={{ flex: 1 }}
    >
      <Animated.View style={[
        styles.kpiCard,
        {
          backgroundColor: bg,
          opacity: fadeAnim,
          transform: [{ translateY }, { scale }],
          borderTopWidth: 4,
          borderTopColor: color,
        }
      ]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <View>
            <Text style={styles.kpiValue}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
          </View>
          <View style={[styles.kpiIcon, { backgroundColor: `${color}25`, width: 50, height: 50, borderRadius: 25 }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, width: '100%', gap: 4 }}>
          <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" />
          <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: '600' }}>Actualizado ahora</Text>
        </View>
      </Animated.View>
    </Pressable>
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

function RequestCard({ item, evalCategories, onPress }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const handleOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const needsEval = item.status.toLowerCase() === 'resuelto' && (!item.metadata || !item.metadata.evaluation) && evalCategories.includes(item.category);

  return (
    <Pressable onPressIn={handleIn} onPressOut={handleOut} onPress={onPress}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={[styles.statusIndicator, { backgroundColor: item.color }]} />
        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={[styles.cardCategory, { color: item.color }]}>{item.cat}</Text>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              {needsEval && (
                <Text style={{fontSize: 11, color: COLORS.warning, fontWeight: '800', marginTop: 4, display: 'flex', alignItems: 'center'}}>
                  <Ionicons name="alert-circle" size={12} /> PENDIENTE DE EVALUAR
                </Text>
              )}
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
  kpiCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 20, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.line },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  kpiValue: { fontSize: 32, fontWeight: '900', color: COLORS.white },
  kpiLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginTop: 2 },

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

function DetailModal({ visible, request, evalCategories, onClose }: { visible: boolean; request: AdministrativeRequest | null; evalCategories: string[]; onClose: () => void }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setRating(0);
      setComment('');
      setSubmitting(false);
    }
  }, [visible, request]);

  if (!request) return null;

  const mapped = mapRequestToUI(request);
  const metadata = request.metadata || {};
  const needsEval = request.status === 'resuelto' && !metadata.evaluation && evalCategories.includes(request.category);

  const renderMetadataFields = () => {
    switch (request.category) {
      case 'visitors':
        return (
          <View style={{ gap: 12 }}>
            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>FUNCIONARIO RESPONSABLE</Text>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="person-outline" size={16} color={COLORS.primary} />
                <Text style={modalStyles.fieldValue}>{metadata.responsible?.name || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="call-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>{metadata.responsible?.phone || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="business-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>{metadata.responsible?.dependency || 'N/A'}</Text>
              </View>
            </View>

            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>VIGENCIA DE LA VISITA</Text>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                <Text style={modalStyles.fieldValue}>
                  <Text style={{ fontWeight: '700' }}>Desde:</Text> {metadata.fromDate || 'N/A'}
                </Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                <Text style={modalStyles.fieldValue}>
                  <Text style={{ fontWeight: '700' }}>Hasta:</Text> {metadata.toDate || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>VISITANTES REGISTRADOS</Text>
              {metadata.visitors && Array.isArray(metadata.visitors) ? (
                metadata.visitors.map((visitor: any, index: number) => (
                  <View key={index} style={modalStyles.visitorBadge}>
                    <Ionicons name="people-outline" size={18} color={COLORS.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={modalStyles.visitorName}>{visitor.name}</Text>
                      <Text style={modalStyles.visitorDoc}>Documento: {visitor.document}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={modalStyles.fieldValue}>Ninguno</Text>
              )}
            </View>

            {metadata.hasVehicle && metadata.vehicles && Array.isArray(metadata.vehicles) && metadata.vehicles.length > 0 && (
              <View style={modalStyles.infoBlock}>
                <Text style={modalStyles.infoSectionTitle}>ACCESO VEHICULAR</Text>
                {metadata.vehicles.map((vehicle: any, index: number) => (
                  <View key={index} style={modalStyles.visitorBadge}>
                    <Ionicons name="car-sport-outline" size={18} color={COLORS.blue} />
                    <View style={{ flex: 1 }}>
                      <Text style={modalStyles.visitorName}>Placa: {vehicle.plate}</Text>
                      <Text style={modalStyles.visitorDoc}>Marca: {vehicle.brand}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 'maintenance':
        return (
          <View style={{ gap: 12 }}>
            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>UBICACIÓN DEL REPORTE</Text>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                <Text style={modalStyles.fieldValue}>Piso: {metadata.location || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="business-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>Sala/Oficina: {metadata.room || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="layers-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>Dependencia: {metadata.dependency || 'N/A'}</Text>
              </View>
            </View>
            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>DESCRIPCIÓN DE LA FALLA</Text>
              <Text style={modalStyles.descriptionText}>{request.description || 'Sin descripción'}</Text>
            </View>
          </View>
        );

      case 'parking':
        return (
          <View style={{ gap: 12 }}>
            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>DATOS DEL CONDUCTOR</Text>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="person-outline" size={16} color={COLORS.primary} />
                <Text style={modalStyles.fieldValue}>{metadata.name || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="card-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>ID/Cédula: {metadata.doc || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="business-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>Dependencia: {metadata.dependency || 'N/A'}</Text>
              </View>
            </View>

            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>DATOS DEL VEHÍCULO</Text>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="barcode-outline" size={16} color={COLORS.blue} />
                <Text style={modalStyles.fieldValue}>Placa: {metadata.plate || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="car-sport-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>Marca/Modelo: {metadata.brand || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="color-palette-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>Color: {metadata.color || 'N/A'}</Text>
              </View>
            </View>
          </View>
        );

      case 'transport':
        return (
          <View style={{ gap: 12 }}>
            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>DETALLES DEL TRAYECTO</Text>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                <Text style={modalStyles.fieldValue}>Origen: {metadata.origin || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="navigate-outline" size={16} color={COLORS.primary} />
                <Text style={modalStyles.fieldValue}>Destino: {metadata.destination || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="business-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>Dependencia: {metadata.dependency || 'N/A'}</Text>
              </View>
            </View>

            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>PROGRAMACIÓN</Text>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="time-outline" size={16} color={COLORS.blue} />
                <Text style={modalStyles.fieldValue}>Hora Recogida: {metadata.pickupTime || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="people-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>Pasajeros: {metadata.passengers || '1'}</Text>
              </View>
              {metadata.requiresReturn && (
                <View style={modalStyles.fieldRow}>
                  <Ionicons name="repeat-outline" size={16} color={COLORS.success} />
                  <Text style={modalStyles.fieldValue}>Hora Regreso: {metadata.returnTime || 'N/A'}</Text>
                </View>
              )}
            </View>

            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>MOTIVO DEL TRASLADO</Text>
              <Text style={modalStyles.descriptionText}>{metadata.reason || request.description || 'Sin justificación'}</Text>
            </View>
          </View>
        );

      case 'rooms':
        const isSecretaria = !!metadata.requires_secretaria_general;
        return (
          <View style={{ gap: 12 }}>
            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>RESERVA DE ESPACIO</Text>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="easel-outline" size={16} color={COLORS.primary} />
                <Text style={modalStyles.fieldValue}>Sala: {metadata.room?.name || 'Sala Regular'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>Fecha: {metadata.date || 'N/A'}</Text>
              </View>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="time-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>Horario: {metadata.time || `${metadata.start_time || ''} - ${metadata.end_time || ''}`}</Text>
              </View>
              {!isSecretaria && (
                <View style={modalStyles.fieldRow}>
                  <Ionicons name="people-outline" size={16} color={COLORS.muted} />
                  <Text style={modalStyles.fieldValue}>Asistentes: {metadata.attendees || 'N/A'}</Text>
                </View>
              )}
              <View style={modalStyles.fieldRow}>
                <Ionicons name="business-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>Dependencia: {metadata.dependency || 'N/A'}</Text>
              </View>
            </View>

            {isSecretaria && (
              <View style={modalStyles.infoBlock}>
                <Text style={modalStyles.infoSectionTitle}>DETALLES DEL EVENTO MAGNO</Text>
                <View style={modalStyles.fieldRow}>
                  <Ionicons name="business-outline" size={16} color={COLORS.primary} />
                  <Text style={modalStyles.fieldValue}>Entidad: {metadata.entity_name || 'N/A'}</Text>
                </View>
                <View style={modalStyles.fieldRow}>
                  <Ionicons name="person-outline" size={16} color={COLORS.muted} />
                  <Text style={modalStyles.fieldValue}>Responsable: {metadata.responsible_name} ({metadata.responsible_role})</Text>
                </View>
                <View style={modalStyles.fieldRow}>
                  <Ionicons name="call-outline" size={16} color={COLORS.muted} />
                  <Text style={modalStyles.fieldValue}>Teléfono: {metadata.contact_phone || 'N/A'}</Text>
                </View>
                <View style={modalStyles.fieldRow}>
                  <Ionicons name="people-outline" size={16} color={COLORS.muted} />
                  <Text style={modalStyles.fieldValue}>Aforo Proyectado: {metadata.participants_count || 'N/A'}</Text>
                </View>
                <View style={modalStyles.fieldRow}>
                  <Ionicons name="play-outline" size={16} color={COLORS.muted} />
                  <Text style={modalStyles.fieldValue}>Horario Acto: {metadata.event_start_hour} - {metadata.event_end_hour}</Text>
                </View>
                <View style={modalStyles.fieldRow}>
                  <Ionicons name="git-commit-outline" size={16} color={COLORS.muted} />
                  <Text style={modalStyles.fieldValue}>Modalidad: {metadata.meeting_type || 'N/A'}</Text>
                </View>
              </View>
            )}

            {isSecretaria && metadata.services_description && (
              <View style={modalStyles.infoBlock}>
                <Text style={modalStyles.infoSectionTitle}>REQUERIMIENTOS ADICIONALES</Text>
                <Text style={modalStyles.descriptionText}>{metadata.services_description}</Text>
              </View>
            )}
          </View>
        );

      default:
        return (
          <View style={modalStyles.infoBlock}>
            <Text style={modalStyles.infoSectionTitle}>DETALLES GENERALES</Text>
            <Text style={modalStyles.descriptionText}>{request.description || 'Sin detalles'}</Text>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[modalStyles.categoryBadge, { backgroundColor: `${mapped.color}15` }]}>
                <Ionicons 
                  name={
                    request.category === 'visitors' ? 'people' :
                    request.category === 'transport' ? 'car-sport' :
                    request.category === 'maintenance' ? 'construct' :
                    request.category === 'rooms' ? 'easel' :
                    request.category === 'parking' ? 'car' : 'document-text'
                  } 
                  size={20} 
                  color={mapped.color} 
                />
              </View>
              <View>
                <Text style={[modalStyles.categoryText, { color: mapped.color }]}>{mapped.cat}</Text>
                <Text style={modalStyles.dateText}>Creado el {mapped.date}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={modalStyles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.dark} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView style={modalStyles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Title & Status */}
            <View style={modalStyles.titleRow}>
              <Text style={modalStyles.titleText}>{request.title}</Text>
              <View style={[modalStyles.statusPill, { backgroundColor: `${mapped.color}10` }]}>
                <View style={[modalStyles.statusDot, { backgroundColor: mapped.color }]} />
                <Text style={[modalStyles.statusText, { color: mapped.color }]}>{mapped.status}</Text>
              </View>
            </View>

            {/* Custom Metadata Fields */}
            <View style={modalStyles.fieldsContainer}>
              {needsEval && (
                <View style={[modalStyles.infoBlock, { borderColor: COLORS.warning, borderWidth: 1.5, backgroundColor: '#FFFBEB' }]}>
                  <Text style={[modalStyles.infoSectionTitle, { color: COLORS.warning }]}>EVALUACIÓN REQUERIDA</Text>
                  <Text style={{fontSize: 14, marginBottom: 15, fontWeight: '700', color: COLORS.dark}}>Por favor califica el servicio para continuar.</Text>
                  
                  <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                    {[1,2,3,4,5].map(star => (
                      <Pressable key={star} onPress={() => setRating(star)}>
                        <Ionicons name={rating >= star ? 'star' : 'star-outline'} size={32} color={COLORS.accent} />
                      </Pressable>
                    ))}
                  </View>

                  <TextInput
                    style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top' }}
                    placeholder="Opcional: Déjanos un comentario sobre el servicio..."
                    multiline
                    value={comment}
                    onChangeText={setComment}
                  />
                </View>
              )}

              {request.status === 'resuelto' && metadata.evaluation && (
                <View style={[modalStyles.infoBlock, { borderColor: COLORS.success, borderWidth: 1, backgroundColor: '#F0FDF4' }]}>
                  <Text style={[modalStyles.infoSectionTitle, { color: COLORS.success }]}>TU EVALUACIÓN</Text>
                  <View style={{ flexDirection: 'row', gap: 5, marginBottom: 10 }}>
                    {[1,2,3,4,5].map(star => (
                      <Ionicons key={star} name={metadata.evaluation.rating >= star ? 'star' : 'star-outline'} size={18} color={COLORS.accent} />
                    ))}
                  </View>
                  {metadata.evaluation.comment ? (
                    <Text style={{fontSize: 14, fontStyle: 'italic', color: COLORS.dark, fontWeight: '600'}}>"{metadata.evaluation.comment}"</Text>
                  ) : null}
                </View>
              )}

              {renderMetadataFields()}
            </View>

            {/* Admin Notes if exist */}
            {request.admin_notes && (
              <View style={[modalStyles.infoBlock, { borderColor: COLORS.primary, borderWidth: 1 }]}>
                <Text style={[modalStyles.infoSectionTitle, { color: COLORS.primary }]}>NOTAS DE ADMINISTRACIÓN</Text>
                <Text style={modalStyles.descriptionText}>{request.admin_notes}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer / Actions */}
          <View style={modalStyles.footer}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {needsEval ? (
                <TouchableOpacity 
                  disabled={rating === 0 || submitting}
                  onPress={async () => {
                    setSubmitting(true);
                    try {
                      await requestService.evaluateRequest(request.id, { rating, comment });
                      onClose();
                    } catch(e) {
                      console.error(e);
                    } finally {
                      setSubmitting(false);
                    }
                  }} 
                  style={[modalStyles.primaryBtn, { flex: 1, opacity: rating === 0 || submitting ? 0.5 : 1 }]}
                >
                  <LinearGradient 
                    colors={[COLORS.warning, '#B45309']} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 0 }} 
                    style={modalStyles.btnGradient}
                  >
                    <Text style={modalStyles.btnText}>{submitting ? 'Enviando...' : 'Enviar Evaluación'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <>
                  {request.category === 'visitors' && (
                    <TouchableOpacity 
                      onPress={() => {
                        onClose();
                        router.push({ pathname: '/requests/visitors', params: { templateId: request.id } });
                      }} 
                      style={[modalStyles.primaryBtn, { flex: 1, backgroundColor: '#FFF1F2', borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}
                    >
                      <Ionicons name="copy-outline" size={20} color={COLORS.primaryDark} style={{ position: 'absolute', left: 16 }} />
                      <Text style={[modalStyles.btnText, { color: COLORS.primaryDark }]}>Plantilla</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={onClose} style={[modalStyles.primaryBtn, { flex: request.category === 'visitors' ? 1 : undefined }]}>
                    <LinearGradient 
                      colors={[COLORS.primary, COLORS.primaryDark]} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 0 }} 
                      style={modalStyles.btnGradient}
                    >
                      <Text style={modalStyles.btnText}>Entendido</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  container: {
    width: '100%',
    maxWidth: 550,
    maxHeight: '85%',
    backgroundColor: COLORS.white,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.line,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 10 },
      web: { boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }
    })
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line
  },
  categoryBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  dateText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
    marginTop: 2
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollBody: {
    padding: 24
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20
  },
  titleText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.dark,
    flex: 1
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
    alignSelf: 'flex-start'
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  fieldsContainer: {
    gap: 16,
    marginBottom: 24
  },
  infoBlock: {
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.line
  },
  infoSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.muted,
    letterSpacing: 1,
    marginBottom: 12
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.dark,
    fontWeight: '600'
  },
  visitorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 8
  },
  visitorName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark
  },
  visitorDoc: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
    marginTop: 2
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: COLORS.white
  },
  primaryBtn: {
    height: 56,
    borderRadius: 18,
    overflow: 'hidden'
  },
  btnGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  btnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900'
  }
});