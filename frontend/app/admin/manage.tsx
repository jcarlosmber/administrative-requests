import React, { useMemo, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  TextInput, 
  ScrollView, 
  useWindowDimensions, 
  Animated,
  Platform,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { requestService, AdministrativeRequest } from '../../lib/requestService';
import { supabase } from '../../lib/supabase';

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
  danger: '#EF4444',
  info: '#3B82F6',
};

const MOCK_REQUESTS = [
  { 
    id: '1', 
    user: 'Juan Pérez', 
    type: 'Salas', 
    detail: 'Comité de Dirección Jurídica', 
    status: 'Pendiente', 
    date: '29 Abr', 
    color: '#7209B7',
    dependency: 'Subsecretaría Jurídica',
    priority: 'Alta',
    metadata: [
      { label: 'Sala', value: 'Sala Innovación (Piso 2)', icon: 'easel-outline' },
      { label: 'Asistentes', value: '12 personas', icon: 'people-outline' },
      { label: 'Horario', value: '02:00 PM - 04:00 PM', icon: 'time-outline' }
    ],
    timeline: [
      { title: 'Solicitud Creada', date: '29 Abr, 08:30 AM', desc: 'Iniciada por el funcionario.' }
    ]
  },
  { 
    id: '2', 
    user: 'María García', 
    type: 'Mantenimiento', 
    detail: 'Falla Aire Acondicionado Central', 
    status: 'En Curso', 
    date: '29 Abr', 
    color: '#2A9D8F',
    dependency: 'Dirección Administrativa',
    priority: 'Alta',
    metadata: [
      { label: 'Ubicación', value: 'Piso 3 - Ala Norte', icon: 'location-outline' },
      { label: 'Descripción', value: 'Falla total del compresor, goteo constante.', icon: 'document-text-outline' }
    ],
    timeline: [
      { title: 'Solicitud Creada', date: '28 Abr, 10:15 AM', desc: 'Reporte de falla técnica.' },
      { title: 'Asignado a Técnico', date: '29 Abr, 09:00 AM', desc: 'Técnico Roberto Mora asignado.' },
      { title: 'En Revisión', date: '29 Abr, 11:30 AM', desc: 'Se está validando el compresor.' }
    ]
  },
  { 
    id: '3', 
    user: 'Carlos Ruiz', 
    type: 'Parqueadero', 
    detail: 'Solicitud Cupo Permanente', 
    status: 'Pendiente', 
    date: '28 Abr', 
    color: '#F4A261',
    dependency: 'Oficina de Contratación',
    priority: 'Media',
    metadata: [
      { label: 'Vehículo', value: 'Renault Duster 2024 (Gris)', icon: 'car-sport-outline' },
      { label: 'Placa', value: 'KJI-092', icon: 'barcode-outline' }
    ],
    timeline: [
      { title: 'Solicitud Creada', date: '28 Abr, 02:45 PM', desc: 'Pendiente de validación de cargo.' }
    ]
  },
  { 
    id: '4', 
    user: 'Elena Blair', 
    type: 'Transporte', 
    detail: 'Traslado a Sede Centro', 
    status: 'Programada', 
    date: '30 Abr', 
    color: '#0077B6',
    dependency: 'Despacho Secretaría',
    priority: 'Alta',
    metadata: [
      { label: 'Destino', value: 'Sede Distrital Centro', icon: 'location-outline' },
      { label: 'Recogida', value: '09:30 AM', icon: 'time-outline' }
    ],
    timeline: [
      { title: 'Solicitud Creada', date: '28 Abr, 08:00 AM', desc: 'Funcionario requiere traslado oficial.' },
      { title: 'Vehículo Asignado', date: '29 Abr, 04:00 PM', desc: 'Placa oficiales GNQ-122.' }
    ]
  },
];

const CATEGORIES = ['Todas', 'Visitantes', 'Transporte', 'Mantenimiento', 'Salas', 'Parqueadero'];

export default function ManageRequests() {
  const [requests, setRequests] = useState<AdministrativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('Todas');
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

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
      .channel('admin_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'administrative_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredData = useMemo(() => {
    return requests.filter(item => {
      const matchesSearch = (item.title + (item.category || '') + (item.description || '')).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesService = serviceFilter === 'Todas' || 
                           (serviceFilter === 'Visitantes' && item.category === 'visitors') ||
                           (serviceFilter === 'Transporte' && item.category === 'transport') ||
                           (serviceFilter === 'Mantenimiento' && item.category === 'maintenance') ||
                           (serviceFilter === 'Salas' && item.category === 'rooms') ||
                           (serviceFilter === 'Parqueadero' && item.category === 'parking');
      return matchesSearch && matchesService;
    });
  }, [requests, searchQuery, serviceFilter]);

  const mapRequestToUI = (item: AdministrativeRequest) => {
    const typeLabel = {
      visitors: 'Visitantes',
      transport: 'Transporte',
      maintenance: 'Mantenimiento',
      rooms: 'Salas',
      parking: 'Parqueadero'
    }[item.category] || item.category;

    const typeColor = {
      visitors: '#E63946',
      transport: '#0077B6',
      maintenance: '#2A9D8F',
      rooms: '#7209B7',
      parking: '#F4A261'
    }[item.category] || COLORS.accent;

    // Generar metadatos para la UI basados en el JSONB
    let uiMetadata: any[] = [];
    if (item.category === 'visitors' && item.metadata) {
      uiMetadata = [
        { label: 'Visitantes', value: `${item.metadata.visitors?.length || 0} personas`, icon: 'people-outline' },
        { label: 'Vehículo', value: item.metadata.hasVehicle ? 'Sí' : 'No', icon: 'car-outline' },
        { label: 'Autoriza', value: item.metadata.responsible?.name, icon: 'person-outline' }
      ];
    } else if (item.category === 'maintenance' && item.metadata) {
      uiMetadata = [
        { label: 'Ubicación', value: `${item.metadata.location} - ${item.metadata.room}`, icon: 'location-outline' },
        { label: 'Detalles', value: item.description, icon: 'document-text-outline' }
      ];
    } else if (item.category === 'rooms' && item.metadata) {
      uiMetadata = [
        { label: 'Asistentes', value: `${item.metadata.attendees} personas`, icon: 'people-outline' },
        { label: 'Horario', value: `${item.metadata.start_time} - ${item.metadata.end_time}`, icon: 'time-outline' }
      ];
    } else if (item.category === 'parking' && item.metadata) {
      uiMetadata = [
        { label: 'Placa', value: item.metadata.plate, icon: 'barcode-outline' },
        { label: 'Vehículo', value: `${item.metadata.brand} (${item.metadata.color})`, icon: 'car-sport-outline' }
      ];
    }

    return {
      ...item,
      user: 'Usuario Sistema', // Aquí idealmente vendría el nombre del perfil
      type: typeLabel,
      detail: item.title,
      status: item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' '),
      date: new Date(item.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      color: typeColor,
      dependency: item.metadata?.dependency || 'SJD',
      priority: item.priority.charAt(0).toUpperCase() + item.priority.slice(1),
      uiMetadata,
      timeline: [
        { title: 'Solicitud Creada', date: new Date(item.created_at).toLocaleString(), desc: 'Iniciada por el funcionario.' }
      ]
    };
  };

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      enCurso: requests.filter(r => r.status === 'en_progreso').length,
      criticas: requests.filter(r => r.priority === 'alta').length,
      hoy: requests.filter(r => new Date(r.created_at).toDateString() === today).length
    };
  }, [requests]);

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
        
        {isDesktop && <Sidebar />}

        <View style={{ flex: 1 }}>
          <FlatList
            ListHeaderComponent={
              <View style={styles.headerContainer}>
                <HeroSection isDesktop={isDesktop} />
                <View style={styles.contentPadding}>
                  <KPISection stats={stats} />
                  <SearchBar query={searchQuery} setQuery={setSearchQuery} />
                  
                  <FilterRow 
                    label="Filtrar Servicio" 
                    data={CATEGORIES} 
                    selected={serviceFilter} 
                    onSelect={setServiceFilter} 
                    icon="layers-outline"
                  />
                  
                  <View style={styles.resultsHeader}>
                    <Text style={styles.resultsTitle}>
                      {filteredData.length} {filteredData.length === 1 ? 'Registro activo' : 'Registros bajo gestión'}
                    </Text>
                  </View>
                </View>
              </View>
            }
            data={filteredData}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <RequestListItem item={mapRequestToUI(item)} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
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
          <Ionicons name="shield-checkmark-outline" size={40} color={COLORS.white} />
        </View>
        <Text style={styles.sideTitle}>Gestión</Text>
        <Text style={styles.sideSubTitle}>Administración Central</Text>
        <View style={{ width: 40, height: 4, backgroundColor: COLORS.white, marginVertical: 25, borderRadius: 2 }} />
        <Text style={styles.sideDesc}>
          Seguimiento detallado y trazabilidad de requerimientos administrativos para asegurar el cumplimiento del servicio.
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
        <Text style={styles.heroKicker}>PANEL DE ADMINISTRACIÓN</Text>
        <Text style={styles.heroTitle}>Control y Seguimiento</Text>
        <Text style={styles.heroSub}>Monitoree el progreso de cada requerimiento</Text>
      </View>
    </View>
  );
}

function KPISection({ stats }: { stats: { enCurso: number, criticas: number, hoy: number } }) {
  return (
    <View style={styles.kpiRow}>
      <KPICard label="En Curso" value={stats.enCurso.toString()} color={COLORS.info} icon="swap-horizontal" />
      <KPICard label="Críticas" value={stats.criticas.toString()} color={COLORS.danger} icon="alert-circle" />
      <KPICard label="Hoy" value={stats.hoy.toString()} color={COLORS.accent} icon="calendar" />
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
        placeholder="Buscar por usuario, tipo o dependencia..."
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
        <Ionicons name={icon} size={14} color={COLORS.accent} />
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

function RequestListItem({ item }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const [expanded, setExpanded] = useState(false);

  const handleIn = () => Animated.spring(scale, { toValue: 0.99, useNativeDriver: true }).start();
  const handleOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En Curso': return COLORS.info;
      case 'Programada': return COLORS.accent;
      case 'Pendiente': return COLORS.warning;
      case 'Completada': return COLORS.success;
      default: return item.color;
    }
  };

  return (
    <Pressable onPressIn={handleIn} onPressOut={handleOut} onPress={() => setExpanded(!expanded)}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.typeRow}>
                <Text style={[styles.cardCategory, { color: item.color }]}>{item.type}</Text>
                <View style={[styles.priorityPill, { backgroundColor: item.priority === 'Alta' ? `${COLORS.danger}15` : `${COLORS.warning}15` }]}>
                  <Text style={[styles.priorityText, { color: item.priority === 'Alta' ? COLORS.danger : COLORS.warning }]}>
                    {item.priority}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{item.user}</Text>
              <Text style={styles.cardSubTitleText}>{item.dependency}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${getStatusColor(item.status)}10` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
            </View>
          </View>
          
          <Text style={styles.cardDetail} numberOfLines={expanded ? 0 : 1}>{item.detail}</Text>
          
          {expanded && (
            <View style={styles.expandedInfo}>
              <Text style={styles.infoTitle}>TRAZABILIDAD Y SEGUIMIENTO</Text>
              
              {/* Timeline */}
              <View style={styles.timelineContainer}>
                {item.timeline.map((step: any, idx: number) => (
                  <View key={idx} style={styles.timelineStep}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, idx === 0 && { backgroundColor: COLORS.accent }]} />
                      {idx < item.timeline.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDate}>{step.date}</Text>
                      <Text style={styles.stepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.metaDivider} />
              
              <Text style={styles.infoTitle}>DATOS TÉCNICOS</Text>
              <View style={styles.metaGrid}>
                {item.uiMetadata.map((meta: any, idx: number) => (
                  <View key={idx} style={styles.metaBox}>
                    <View style={styles.metaHeader}>
                      <Ionicons name={meta.icon} size={14} color={COLORS.accent} />
                      <Text style={styles.metaLabel}>{meta.label}</Text>
                    </View>
                    <Text style={styles.metaValue}>{meta.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.updateAction}>
                <TextInput 
                  style={styles.updateInput} 
                  placeholder="Añadir comentario o actualización..." 
                  placeholderTextColor={COLORS.muted}
                />
                <TouchableOpacity style={styles.sendUpdateBtn}>
                  <Ionicons name="send" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.muted} />
              <Text style={styles.metaText}>{item.date}</Text>
              <Ionicons 
                name={expanded ? "chevron-up" : "chevron-down"} 
                size={14} 
                color={COLORS.muted} 
                style={{ marginLeft: 10 }} 
              />
            </View>
            <View style={styles.actionButtons}>
              {item.status === 'Pendiente' && (
                <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]}>
                  <Ionicons name="play-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
              )}
              {item.status === 'En Curso' && (
                <TouchableOpacity style={[styles.actionBtn, styles.successBtn]}>
                  <Ionicons name="checkmark-done-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
              )}
              {item.status === 'Programada' && (
                <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]}>
                  <Ionicons name="car-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]}>
                <Ionicons name="ellipsis-horizontal-outline" size={20} color={COLORS.muted} />
              </TouchableOpacity>
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
  kpiValue: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, marginTop: 2 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 18, paddingHorizontal: 16, height: 56, marginTop: 20, borderWidth: 1, borderColor: COLORS.line },
  searchInput: { flex: 1, paddingHorizontal: 12, fontSize: 15, color: COLORS.primary, fontWeight: '600' },

  filterSection: { marginTop: 20 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingLeft: 5 },
  filterLabel: { fontSize: 13, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardHeaderLeft: { flex: 1, marginRight: 10 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  cardCategory: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  priorityPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  cardTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  cardSubTitleText: { fontSize: 13, color: COLORS.muted, fontWeight: '700' },
  cardDetail: { fontSize: 15, color: COLORS.muted, marginTop: 8, marginBottom: 10, fontWeight: '600' },
  
  expandedInfo: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginVertical: 12, borderWidth: 1, borderColor: COLORS.line },
  infoTitle: { fontSize: 11, fontWeight: '900', color: COLORS.muted, letterSpacing: 1.5, marginBottom: 15, textAlign: 'center' },
  
  timelineContainer: { paddingLeft: 10, marginBottom: 25 },
  timelineStep: { flexDirection: 'row', gap: 15 },
  timelineLeft: { alignItems: 'center', width: 20 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.line, zIndex: 1 },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.line, marginVertical: 2 },
  timelineRight: { flex: 1, paddingBottom: 20 },
  stepTitle: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  stepDate: { fontSize: 11, color: COLORS.muted, fontWeight: '700', marginTop: 2 },
  stepDesc: { fontSize: 13, color: COLORS.muted, marginTop: 4, fontWeight: '500' },

  metaDivider: { height: 1, backgroundColor: COLORS.line, marginVertical: 15, borderStyle: 'dashed' },

  metaGrid: { gap: 12 },
  metaBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.02)' },
  metaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLabel: { fontSize: 11, fontWeight: '800', color: COLORS.muted, textTransform: 'uppercase' },
  metaValue: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  updateAction: { flexDirection: 'row', gap: 10, marginTop: 20, backgroundColor: COLORS.white, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: COLORS.line },
  updateInput: { flex: 1, fontSize: 13, color: COLORS.primary, paddingHorizontal: 10 },
  sendUpdateBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 15, marginTop: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 10 },
  actionBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  rejectBtn: { borderColor: COLORS.line, backgroundColor: `${COLORS.line}20` },
  approveBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  successBtn: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  infoBtn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
});
