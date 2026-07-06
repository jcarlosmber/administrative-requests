import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
const STATUS_OPTIONS = ['Todos', 'Pendiente', 'En Progreso', 'Aprobado', 'Rechazado'];

export default function ManageRequests() {
  const params = useLocalSearchParams<{ status?: string; priority?: string; today?: string; id?: string }>();
  const [requests, setRequests] = useState<AdministrativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [successModal, setSuccessModal] = useState({ visible: false, message: '' });
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

  const updateStatus = async (id: string, newStatus: 'pendiente' | 'en_progreso' | 'resuelto' | 'rechazado') => {
    try {
      setLoading(true);
      await requestService.updateStatus(id, newStatus);
      await fetchRequests();
      let actionName = 'procesada';
      if (newStatus === 'resuelto') actionName = 'aprobada / finalizada';
      if (newStatus === 'rechazado') actionName = 'rechazada';
      if (newStatus === 'en_progreso') actionName = 'pasada a en curso';
      setSuccessModal({ visible: true, message: `La solicitud fue ${actionName} exitosamente.` });
    } catch (err: any) {
      console.error('Error al actualizar estado:', err);
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
    const channelName = `admin_requests_changes_${Math.random().toString(36).substr(2, 9)}`;
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

  useEffect(() => {
    if (params.status) {
      const statusValue = String(params.status).toLowerCase();
      if (statusValue === 'pendiente') {
        setStatusFilter('Pendiente');
      } else if (statusValue === 'en_progreso' || statusValue === 'en curso') {
        setStatusFilter('En Progreso');
      } else if (statusValue === 'resuelto' || statusValue === 'aprobado') {
        setStatusFilter('Aprobado');
      } else if (statusValue === 'rechazado') {
        setStatusFilter('Rechazado');
      }
    }
  }, [params.status]);

  const filteredData = useMemo(() => {
    const today = new Date().toDateString();

    return requests.filter(item => {
      const matchesSearch = (item.title + (item.category || '') + (item.description || '')).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesService = serviceFilter === 'Todas' || 
                           (serviceFilter === 'Visitantes' && item.category === 'visitors') ||
                           (serviceFilter === 'Transporte' && item.category === 'transport') ||
                           (serviceFilter === 'Mantenimiento' && item.category === 'maintenance') ||
                           (serviceFilter === 'Salas' && item.category === 'rooms') ||
                           (serviceFilter === 'Parqueadero' && item.category === 'parking');
      
      const itemStatus = item.status ? item.status.toLowerCase() : '';
      const matchesStatus = statusFilter === 'Todos' ||
                           (statusFilter === 'Pendiente' && itemStatus === 'pendiente') ||
                           (statusFilter === 'En Progreso' && itemStatus === 'en_progreso') ||
                           (statusFilter === 'Aprobado' && (itemStatus === 'resuelto' || itemStatus === 'aprobado')) ||
                           (statusFilter === 'Rechazado' && itemStatus === 'rechazado');

      const matchesPriority = !params.priority || params.priority === 'all' || item.priority === String(params.priority);
      const matchesToday = !params.today || new Date(item.created_at).toDateString() === today;

      return matchesSearch && matchesService && matchesStatus && matchesPriority && matchesToday;
    });
  }, [requests, searchQuery, serviceFilter, statusFilter, params.priority, params.today]);

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
      const visitorList = item.metadata.visitors?.map((v: any) => `${v.name} (${v.document})`).join(', ') || 'N/A';
      const hasVeh = item.metadata.hasVehicle;
      const vehList = hasVeh && item.metadata.vehicles && item.metadata.vehicles.length > 0
        ? item.metadata.vehicles.map((v: any) => `${v.brand} [${v.plate}]`).join(', ')
        : 'Ninguno';
      
      uiMetadata = [
        { label: 'Visitantes', value: `${item.metadata.visitors?.length || 0} personas`, icon: 'people-outline' },
        { label: 'Listado Detallado', value: visitorList, icon: 'list-circle-outline' },
        { label: 'Vehículo', value: hasVeh ? 'Sí' : 'No', icon: 'car-outline' },
        ...(hasVeh ? [{ label: 'Detalles Vehículo', value: vehList, icon: 'car-sport-outline' }] : []),
        { label: 'Autoriza (Funcionario)', value: item.metadata.responsible?.name || 'N/A', icon: 'person-outline' },
        { label: 'Dep. Funcionario', value: item.metadata.responsible?.dependency || 'N/A', icon: 'briefcase-outline' },
        { label: 'Tel. Funcionario', value: item.metadata.responsible?.phone || 'N/A', icon: 'call-outline' },
        { label: 'Desde', value: item.metadata.fromDate || 'N/A', icon: 'calendar-outline' },
        { label: 'Hasta', value: item.metadata.toDate || 'N/A', icon: 'calendar-outline' }
      ];
    } else if (item.category === 'maintenance' && item.metadata) {
      uiMetadata = [
        { label: 'Piso', value: item.metadata.location || 'N/A', icon: 'layers-outline' },
        { label: 'Sala / Oficina', value: item.metadata.room || 'N/A', icon: 'business-outline' },
        { label: 'Dependencia', value: item.metadata.dependency || 'N/A', icon: 'briefcase-outline' },
        { label: 'Asunto', value: item.title || 'N/A', icon: 'alert-circle-outline' },
        { label: 'Detalles del Reporte', value: item.description || 'N/A', icon: 'document-text-outline' }
      ];
    } else if (item.category === 'rooms' && item.metadata) {
      if (item.metadata.requires_secretaria_general) {
        const techReqs = [
          ...(item.metadata.tech_requirements || []),
          ...(item.metadata.custom_tech_description ? [item.metadata.custom_tech_description] : [])
        ].join(', ') || 'Ninguno';

        uiMetadata = [
          { label: 'Entidad Solicitante', value: item.metadata.entity_name || 'N/A', icon: 'business-outline' },
          { label: 'Responsable', value: item.metadata.responsible_name || 'N/A', icon: 'person-outline' },
          { label: 'Cargo Responsable', value: item.metadata.responsible_role || 'N/A', icon: 'ribbon-outline' },
          { label: 'Teléfono Contacto', value: item.metadata.contact_phone || 'N/A', icon: 'call-outline' },
          { label: 'Actividad / Evento', value: item.metadata.activity_name || 'N/A', icon: 'bookmark-outline' },
          { label: 'Descripción Evento', value: item.metadata.activity_description || 'N/A', icon: 'information-circle-outline' },
          { label: 'Espacio Especial', value: item.metadata.room?.name || 'Auditorio Huitaca', icon: 'ribbon-outline' },
          { label: 'Asistentes Previstos', value: `${item.metadata.participants_count || '350'} personas`, icon: 'people-outline' },
          { label: 'Fecha Evento', value: item.metadata.date || 'N/A', icon: 'calendar-outline' },
          { label: 'Horario Reserva (Montaje)', value: item.metadata.booking_hours || 'N/A', icon: 'time-outline' },
          { label: 'Horario Evento Real', value: `${item.metadata.event_start_hour || 'N/A'} - ${item.metadata.event_end_hour || 'N/A'}`, icon: 'play-outline' },
          { label: 'Servicios Logísticos', value: item.metadata.services_description || 'Ninguno', icon: 'cafe-outline' },
          { label: 'Requisitos Técnicos', value: techReqs, icon: 'construct-outline' },
          { label: 'Modalidad', value: item.metadata.meeting_type || 'N/A', icon: 'easel-outline' },
          { label: 'Declaración Misión SJD', value: item.metadata.manifestation_express ? 'Aceptada' : 'No Aceptada', icon: 'shield-checkmark-outline' }
        ];
      } else {
        const activeServices: string[] = [];
        if (item.metadata.services?.projector) activeServices.push('Proyector');
        if (item.metadata.services?.laptop) activeServices.push('Computador');
        if (item.metadata.services?.coffee) activeServices.push('Cafetería');
        const servicesVal = activeServices.join(', ') || 'Ninguno';

        uiMetadata = [
          { label: 'Sala / Espacio', value: item.metadata.room?.name || 'Sala Regular', icon: 'easel-outline' },
          { label: 'Asistentes', value: `${item.metadata.attendees || '4'} personas`, icon: 'people-outline' },
          { label: 'Fecha Reserva', value: item.metadata.date || 'N/A', icon: 'calendar-outline' },
          { label: 'Horario', value: item.metadata.time || `${item.metadata.start_time || ''} - ${item.metadata.end_time || ''}`, icon: 'time-outline' },
          { label: 'Dependencia Solicitante', value: item.metadata.dependency || 'SJD', icon: 'business-outline' },
          { label: 'Servicios Adicionales', value: servicesVal, icon: 'cafe-outline' }
        ];
      }
    } else if (item.category === 'parking' && item.metadata) {
      uiMetadata = [
        { label: 'Placa del Vehículo', value: item.metadata.plate || 'N/A', icon: 'barcode-outline' },
        { label: 'Vehículo (Marca/Modelo)', value: item.metadata.brand || 'N/A', icon: 'car-sport-outline' },
        { label: 'Color', value: item.metadata.color || 'N/A', icon: 'color-palette-outline' },
        { label: 'Conductor', value: item.metadata.name || 'N/A', icon: 'person-outline' },
        { label: 'Documento Conductor', value: item.metadata.doc || 'N/A', icon: 'card-outline' },
        { label: 'Dependencia / Área', value: item.metadata.dependency || 'N/A', icon: 'business-outline' }
      ];
    } else if (item.category === 'transport' && item.metadata) {
      uiMetadata = [
        { label: 'Origen del Traslado', value: item.metadata.origin || 'N/A', icon: 'location-outline' },
        { label: 'Destino del Traslado', value: item.metadata.destination || 'N/A', icon: 'navigate-outline' },
        { label: 'Pasajeros', value: `${item.metadata.passengers || '1'} personas`, icon: 'people-outline' },
        { label: 'Hora de Recogida', value: item.metadata.pickupTime || 'N/A', icon: 'time-outline' },
        { label: 'Requiere Retorno', value: item.metadata.requiresReturn ? `Sí (Hora: ${item.metadata.returnTime || 'N/A'})` : 'No', icon: 'repeat-outline' },
        { label: 'Dependencia Solicitante', value: item.metadata.dependency || 'N/A', icon: 'business-outline' },
        { label: 'Motivo del Traslado', value: item.metadata.reason || 'N/A', icon: 'document-text-outline' }
      ];
    }

    const statusLabel = {
      pendiente: 'Pendiente',
      pending: 'Pendiente',
      en_progreso: 'En Progreso',
      'en progreso': 'En Progreso',
      en_curso: 'En Progreso',
      'en curso': 'En Progreso',
      in_progress: 'En Progreso',
      'in progress': 'En Progreso',
      resuelto: 'Aprobado',
      resolved: 'Aprobado',
      aprobado: 'Aprobado',
      approved: 'Aprobado',
      rechazado: 'Rechazado',
      rejected: 'Rechazado'
    }[item.status.toLowerCase()] || item.status;

    return {
      ...item,
      user: (item as any).user_name || 'Funcionario',
      type: typeLabel,
      detail: item.title,
      status: statusLabel,
      date: new Date(item.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      color: typeColor,
      dependency: item.metadata?.dependency || 'SJD',
      priority: item.priority.charAt(0).toUpperCase() + item.priority.slice(1),
      uiMetadata,
      timeline: (item.metadata && item.metadata.timeline) || [
        { 
          title: 'Solicitud Creada', 
          date: new Date(item.created_at).toLocaleString('es-ES'), 
          desc: 'Iniciada por el funcionario.' 
        }
      ]
    };
  };

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      enCurso: requests.filter(r => r.status === 'en_progreso').length,
      pendientes: requests.filter(r => r.status === 'pendiente').length,
      hoy: requests.filter(r => new Date(r.created_at).toDateString() === today).length
    };
  }, [requests]);

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
        
        {isDesktop && <Sidebar />}

        <View style={{ flex: 1 }}>
          <FlatList
            key={isDesktop ? 'desktop-cols' : 'mobile-cols'}
            numColumns={isDesktop ? 2 : 1}
            columnWrapperStyle={isDesktop ? { paddingHorizontal: 25, gap: 20 } : undefined}
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

                  <FilterRow 
                    label="Filtrar Estado" 
                    data={STATUS_OPTIONS} 
                    selected={statusFilter} 
                    onSelect={setStatusFilter} 
                    icon="options-outline"
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
            renderItem={({ item }) => <RequestListItem item={mapRequestToUI(item)} onUpdateStatus={updateStatus} onRefresh={fetchRequests} initiallyExpanded={params.id === item.id} onSuccessAction={(msg: string) => setSuccessModal({ visible: true, message: msg })} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      <Modal
        visible={successModal.visible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Ionicons name="checkmark-circle" size={45} color={COLORS.success} />
            </View>
            <Text style={styles.modalTitle}>¡Acción exitosa!</Text>
            <Text style={styles.modalMessage}>{successModal.message}</Text>
            <TouchableOpacity 
              style={styles.modalBtn} 
              onPress={() => setSuccessModal({ visible: false, message: '' })}
            >
              <Text style={styles.modalBtnText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  const router = useRouter();

  return (
    <View style={styles.hero}>
      <LinearGradient 
        colors={[COLORS.primaryDark, '#1E293B']} 
        style={StyleSheet.absoluteFill} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.heroInner, !isDesktop && { paddingTop: 40 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.heroKicker}>PANEL DE ADMINISTRACIÓN</Text>
            <Text style={styles.heroTitle}>Control y Seguimiento</Text>
            <Text style={styles.heroSub}>Monitoree el progreso de cada requerimiento</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity 
              style={[styles.logoutBtn, { backgroundColor: '#3B82F6', borderColor: '#2563EB' }]} 
              onPress={() => router.replace('/(tabs)')}
            >
              <Ionicons name="home" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.logoutBtn} 
              onPress={async () => {
                await supabase.auth.signOut();
                router.replace('/login');
              }}
            >
              <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function KPISection({ stats }: { stats: { enCurso: number, pendientes: number, hoy: number } }) {
  return (
    <View style={styles.kpiRow}>
      <KPICard label="En Curso" value={stats.enCurso.toString()} color={COLORS.info} icon="swap-horizontal" index={0} />
      <KPICard label="Pendientes" value={stats.pendientes.toString()} color={COLORS.warning} icon="time" index={1} />
      <KPICard label="Hoy" value={stats.hoy.toString()} color={COLORS.accent} icon="calendar" index={2} />
    </View>
  );
}

function KPICard({ label, value, color, icon, index }: any) {
  const hoverAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
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

  const translateY = Animated.add(
    slideAnim,
    hoverAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -6],
    })
  );

  const scale = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.025],
  });

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
          <View style={[styles.kpiIcon, { backgroundColor: `${color}15`, width: 50, height: 50, borderRadius: 25 }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, width: '100%', gap: 4 }}>
          <Ionicons name="time-outline" size={12} color={COLORS.muted} />
          <Text style={{ fontSize: 11, color: COLORS.muted, fontWeight: '600' }}>Actualizado ahora</Text>
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

function RequestListItem({ item, onUpdateStatus, onRefresh, initiallyExpanded = false, onSuccessAction }: any) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const scale = useRef(new Animated.Value(1)).current;
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const handleIn = () => Animated.spring(scale, { toValue: 0.99, useNativeDriver: true }).start();
  const handleOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase().replace(' ', '_');
    switch (statusLower) {
      case 'en_progreso':
      case 'en_curso': 
      case 'en_proceso': return COLORS.info;
      case 'programada': return COLORS.accent;
      case 'pendiente': return COLORS.warning;
      case 'resuelto':
      case 'resuelta':
      case 'completada':
      case 'aprobada':
      case 'aprobado': return COLORS.success;
      case 'rechazado':
      case 'rechazada': return COLORS.danger;
      default: return item.color;
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || commentLoading) return;
    
    try {
      setCommentLoading(true);
      await requestService.addComment(item.id, comment.trim());
      setComment('');
      if (onRefresh) onRefresh();
      if (onSuccessAction) onSuccessAction('Comentario añadido exitosamente.');
    } catch (err: any) {
      console.error('Error al guardar comentario:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <Animated.View style={[styles.card, isDesktop && { flex: 1, marginHorizontal: 0 }, { transform: [{ scale }], backgroundColor: `${getStatusColor(item.status)}0D`, borderColor: `${getStatusColor(item.status)}25` }]}>
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
      <View style={styles.cardMain}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.9}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.typeRow}>
                <View style={{ backgroundColor: item.color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={[styles.cardCategory, { color: COLORS.white }]}>{item.type}</Text>
                </View>
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
          </TouchableOpacity>
          
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
              <View style={[styles.metaGrid, isDesktop && { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }]}>
                {item.uiMetadata && item.uiMetadata.map((meta: any, idx: number) => (
                  <View key={idx} style={[styles.metaBox, isDesktop && { width: '48%', borderBottomWidth: 1 }]}>
                    <View style={styles.metaHeader}>
                      <Ionicons name={meta.icon} size={14} color={COLORS.accent} />
                      <Text style={styles.metaLabel}>{meta.label}</Text>
                    </View>
                    <Text style={styles.metaValue}>{meta.value}</Text>
                  </View>
                ))}
              </View>

              {item.metadata?.evaluation && (
                <>
                  <View style={styles.metaDivider} />
                  <Text style={styles.infoTitle}>EVALUACIÓN DEL SERVICIO</Text>
                  <View style={{ backgroundColor: '#F0FDF4', padding: 15, borderRadius: 12, borderColor: COLORS.success, borderWidth: 1, marginBottom: 15 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Text style={{ fontWeight: '800', color: COLORS.text }}>Calificación:</Text>
                      <View style={{ flexDirection: 'row' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Ionicons key={star} name={item.metadata.evaluation.rating >= star ? 'star' : 'star-outline'} size={16} color={COLORS.accent} />
                        ))}
                      </View>
                    </View>
                    {item.metadata.evaluation.comment ? (
                      <Text style={{ fontStyle: 'italic', color: COLORS.text }}>"{item.metadata.evaluation.comment}"</Text>
                    ) : (
                      <Text style={{ color: COLORS.muted }}>Sin comentarios.</Text>
                    )}
                  </View>
                </>
              )}

              <View style={styles.updateAction}>
                <TextInput 
                  style={styles.updateInput} 
                  placeholder="Añadir comentario o actualización..." 
                  placeholderTextColor={COLORS.muted}
                  value={comment}
                  onChangeText={setComment}
                  editable={!commentLoading}
                  multiline
                  blurOnSubmit={false}
                  returnKeyType="default"
                  textAlignVertical="top"
                />
                <TouchableOpacity 
                  style={styles.sendUpdateBtn}
                  onPress={handleAddComment}
                  disabled={commentLoading || !comment.trim()}
                  activeOpacity={0.8}
                >
                  {commentLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="send" size={18} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.muted} />
              <Text style={styles.metaText}>{item.date}</Text>
            </View>
            <View style={[styles.actionButtons, { flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, paddingLeft: 10 }]}>
              <TouchableOpacity 
                style={[styles.actionBtn, { borderColor: COLORS.text, backgroundColor: COLORS.text, height: 32 }]}
                onPress={() => setExpanded(!expanded)}
              >
                <Text style={[styles.actionBtnText, { color: COLORS.white }]}>{expanded ? 'Ocultar' : 'Ampliar'}</Text>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={COLORS.white} />
              </TouchableOpacity>

              {expanded && (
                <>
                  {/* Botones para solicitudes en estado Pendiente */}
                  {item.status.toLowerCase() === 'pendiente' && (
                    <>
                      {/* Poner en Progreso (Play Azul) para Transporte y Mantenimiento - Primero */}
                      {['transport', 'maintenance'].includes(item.category) && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.processBtn]}
                          onPress={() => onUpdateStatus(item.id, 'en_progreso')}
                        >
                          <Ionicons name="play-outline" size={16} color={COLORS.white} />
                          <Text style={styles.actionBtnText}>Procesar</Text>
                        </TouchableOpacity>
                      )}

                      {/* Aprobar Directamente (Check Verde) para todas las categorías - Segundo o Único */}
                      {!['transport', 'maintenance'].includes(item.category) && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.successBtn]}
                          onPress={() => onUpdateStatus(item.id, 'resuelto')}
                        >
                          <Ionicons name="checkmark-outline" size={16} color={COLORS.white} />
                          <Text style={styles.actionBtnText}>Aprobar</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  {/* Botones para solicitudes en progreso */}
                  {['en_progreso', 'en progreso'].includes(item.status.toLowerCase()) && (
                    <TouchableOpacity 
                       style={[styles.actionBtn, styles.successBtn]}
                       onPress={() => onUpdateStatus(item.id, 'resuelto')}
                    >
                      <Ionicons name="checkmark-done-outline" size={16} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Finalizar</Text>
                    </TouchableOpacity>
                  )}

                  {/* Botón para solicitudes programadas (fallback de mock data) */}
                  {item.status.toLowerCase() === 'programada' && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.infoBtn]}
                      onPress={() => onUpdateStatus(item.id, 'resuelto')}
                    >
                      <Ionicons name="car-outline" size={16} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Despachar</Text>
                    </TouchableOpacity>
                  )}
                  {/* Botón de Rechazo (Equis Roja) para cualquier solicitud activa */}
                  {!['resuelto', 'completada', 'aprobada', 'aprobado', 'rechazado', 'rechazada'].includes(item.status.toLowerCase()) && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => onUpdateStatus(item.id, 'rechazado')}
                    >
                      <Ionicons name="close-outline" size={16} color={COLORS.white} />
                      <Text style={[styles.actionBtnText, { color: COLORS.white }]}>Rechazar</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
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
  hero: { minHeight: 160, paddingVertical: 15, width: '100%', overflow: 'hidden', borderBottomRightRadius: 40 },
  heroInner: { flex: 1, paddingHorizontal: 25, justifyContent: 'center' },
  heroKicker: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { color: COLORS.white, fontSize: 32, fontWeight: '900', marginTop: 5 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5 },
  logoutBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  contentPadding: { paddingHorizontal: 25 },
  kpiRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  kpiCard: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 20, padding: 20, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.primarySoft },
  kpiIcon: { justifyContent: 'center', alignItems: 'center' },
  kpiValue: { fontSize: 32, fontWeight: '900', color: COLORS.white },
  kpiLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginTop: 2 },

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
  actionButtons: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { height: 38, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.white },
  rejectBtn: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  approveBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  processBtn: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  successBtn: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  infoBtn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 340, backgroundColor: COLORS.white, borderRadius: 24, padding: 25, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 5 }, shadowRadius: 15 },
  modalIconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: `${COLORS.success}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 25, lineHeight: 20, fontWeight: '500' },
  modalBtn: { backgroundColor: COLORS.primary, width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
