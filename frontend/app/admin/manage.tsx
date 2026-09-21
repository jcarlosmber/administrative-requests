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
  ActivityIndicator,
  Modal,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { requestService, AdministrativeRequest } from '../../lib/requestService';
import { supabase } from '../../lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { settingsService, ServiceEmail } from '../../lib/settingsService';

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
const TIME_OPTIONS = ['Todos', 'Hoy', 'Últimos 7 días', 'Este mes', 'Personalizado'];

export default function ManageRequests() {
  const params = useLocalSearchParams<{ status?: string; priority?: string; today?: string; id?: string }>();
  const [requests, setRequests] = useState<AdministrativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [timeFilter, setTimeFilter] = useState('Todos');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [successModal, setSuccessModal] = useState({ visible: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; reqId: string; newStatus: 'pendiente' | 'en_progreso' | 'resuelto' | 'rechazado'; actionName: string; category?: string; finalImage?: string | null; item?: AdministrativeRequest } | null>(null);
  const [driverModal, setDriverModal] = useState<{ visible: boolean; item: AdministrativeRequest | null }>({ visible: false, item: null });
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPlate, setDriverPlate] = useState('');
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [serviceEmails, setServiceEmails] = useState<ServiceEmail[]>([]);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const handleApproveTransport = async () => {
    if (!driverModal.item) return;
    try {
      setLoading(true);
      const updatedMetadata = {
        ...(driverModal.item.metadata || {}),
        driver: {
          name: driverName.trim() || 'Conductor Asignado',
          phone: driverPhone.trim(),
          plate: driverPlate.trim()
        }
      };
      await requestService.update(driverModal.item.id, {
        status: 'resuelto',
        metadata: updatedMetadata
      });
      await fetchRequests();
      setDriverModal({ visible: false, item: null });
      setDriverName('');
      setDriverPhone('');
      setDriverPlate('');
      setSuccessModal({ visible: true, message: 'Solicitud aprobada exitosamente con conductor asignado.' });
    } catch (err: any) {
      console.error('Error al aprobar transporte:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    settingsService.getServiceEmails().then(setServiceEmails).catch(console.error);
  }, []);

  const askConfirmation = (item: AdministrativeRequest, newStatus: 'pendiente' | 'en_progreso' | 'resuelto' | 'rechazado') => {
    let actionName = 'procesar';
    if (newStatus === 'resuelto') actionName = 'aprobar / finalizar';
    if (newStatus === 'rechazado') actionName = 'rechazar';
    if (newStatus === 'en_progreso') actionName = 'poner en progreso';
    setConfirmModal({ visible: true, reqId: item.id, newStatus, actionName, category: item.category, finalImage: null, item });
  };

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

  const updateStatus = async (id: string, newStatus: 'pendiente' | 'en_progreso' | 'resuelto' | 'rechazado', finalImage?: string | null) => {
    try {
      setLoading(true);
      await requestService.updateStatus(id, newStatus, finalImage || undefined);
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

      const itemDate = new Date(item.created_at);
      const todayDate = new Date();
      let matchesTime = true;
      
      if (timeFilter === 'Hoy') {
        matchesTime = itemDate.toDateString() === todayDate.toDateString();
      } else if (timeFilter === 'Últimos 7 días') {
        const diffTime = Math.abs(todayDate.getTime() - itemDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        matchesTime = diffDays <= 7;
      } else if (timeFilter === 'Este mes') {
        matchesTime = itemDate.getMonth() === todayDate.getMonth() && itemDate.getFullYear() === todayDate.getFullYear();
      } else if (timeFilter === 'Personalizado' && customDates.start && customDates.end) {
        const start = new Date(customDates.start + 'T00:00:00');
        const end = new Date(customDates.end + 'T23:59:59');
        matchesTime = itemDate >= start && itemDate <= end;
      }

      return matchesSearch && matchesService && matchesStatus && matchesPriority && matchesToday && matchesTime;
    });
  }, [requests, searchQuery, serviceFilter, statusFilter, timeFilter, customDates, params.priority, params.today]);

  const mapRequestToUI = (item: AdministrativeRequest) => {
    const typeLabel = {
      visitors: 'Visitantes',
      transport: 'Transporte',
      maintenance: 'Mantenimiento',
      rooms: 'Salas',
      parking: 'Parqueadero'
    }[item.category] || item.category;

    let detail = item.description;

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

                  <FilterRow 
                    label="Filtrar Fecha" 
                    data={TIME_OPTIONS} 
                    selected={timeFilter} 
                    onSelect={(val: string) => {
                      if (val === 'Personalizado') {
                        setShowCustomDateModal(true);
                      } else {
                        setTimeFilter(val);
                      }
                    }} 
                    icon="calendar-outline"
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
            renderItem={({ item }) => (
              <RequestListItem 
                item={mapRequestToUI(item)} 
                onUpdateStatus={askConfirmation} 
                onRefresh={fetchRequests} 
                initiallyExpanded={params.id === item.id} 
                onSuccessAction={(msg: string) => setSuccessModal({ visible: true, message: msg })} 
                setViewerImage={setViewerImage} 
                onAssignDriver={(reqItem: any) => setDriverModal({ visible: true, item: reqItem })}
              />
            )}
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
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <View style={[styles.modalIconBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1.5 }]}>
              <Ionicons name="checkmark-circle" size={38} color={COLORS.success} />
            </View>
            <Text style={styles.modalTitle}>¡Acción exitosa!</Text>
            <Text style={styles.modalMessage}>{successModal.message}</Text>
            <TouchableOpacity 
              style={[styles.modalBtn, { overflow: 'hidden', backgroundColor: 'transparent' }]} 
              onPress={() => setSuccessModal({ visible: false, message: '' })}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={styles.modalBtnText}>Aceptar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Rango de Fechas Modernizado */}
      <Modal visible={showCustomDateModal} transparent animationType="fade" onRequestClose={() => setShowCustomDateModal(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          
          <View style={[styles.modalContent, { maxWidth: 440, padding: 26 }]}>
            {/* Botón cerrar X */}
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setShowCustomDateModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Icono con Squircle y Glow */}
            <View style={[styles.modalIconBox, { 
              backgroundColor: '#EFF6FF', 
              borderColor: '#BFDBFE',
              borderWidth: 1.5,
              marginBottom: 12
            }]}>
              <Ionicons name="calendar" size={34} color={COLORS.accent} />
            </View>

            {/* Badge */}
            <View style={{
              backgroundColor: '#DBEAFE',
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              marginBottom: 8,
            }}>
              <Text style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#1E40AF',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}>
                Filtro Temporal
              </Text>
            </View>

            {/* Título y Mensaje */}
            <Text style={[styles.modalTitle, { fontSize: 20, marginBottom: 6 }]}>
              Rango de Fechas
            </Text>
            <Text style={[styles.modalMessage, { marginBottom: 16, paddingHorizontal: 6 }]}>
              Selecciona o ingresa el período de fechas para filtrar las solicitudes.
            </Text>

            {/* Atajos rápidos (Presets) */}
            <View style={{ width: '100%', marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Períodos sugeridos
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: 'Últimos 7 días', type: '7days' as const },
                  { label: 'Últimos 15 días', type: '15days' as const },
                  { label: 'Este mes', type: 'thisMonth' as const },
                  { label: 'Mes anterior', type: 'lastMonth' as const },
                ].map(preset => {
                  const now = new Date();
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                  
                  return (
                    <TouchableOpacity
                      key={preset.type}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 10,
                        backgroundColor: '#F1F5F9',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                      }}
                      onPress={() => {
                        if (preset.type === '7days') {
                          const start = new Date(now);
                          start.setDate(now.getDate() - 7);
                          setCustomDates({ start: toISO(start), end: toISO(now) });
                        } else if (preset.type === '15days') {
                          const start = new Date(now);
                          start.setDate(now.getDate() - 15);
                          setCustomDates({ start: toISO(start), end: toISO(now) });
                        } else if (preset.type === 'thisMonth') {
                          const start = new Date(now.getFullYear(), now.getMonth(), 1);
                          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                          setCustomDates({ start: toISO(start), end: toISO(end) });
                        } else if (preset.type === 'lastMonth') {
                          const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                          const end = new Date(now.getFullYear(), now.getMonth(), 0);
                          setCustomDates({ start: toISO(start), end: toISO(end) });
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Campos de Entrada: Desde y Hasta */}
            <View style={{ width: '100%', gap: 12, marginBottom: 16 }}>
              {/* Fecha Desde */}
              <View style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={14} color="#64748B" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                      Fecha de Inicio (Desde)
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: '#E2E8F0',
                    }}
                    onPress={() => {
                      const now = new Date();
                      const pad = (n: number) => String(n).padStart(2, '0');
                      setCustomDates(prev => ({ ...prev, start: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` }));
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#334155' }}>Hoy</Text>
                  </TouchableOpacity>
                </View>

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  paddingHorizontal: 10,
                  height: 44,
                }}>
                  <Ionicons name="calendar-sharp" size={16} color={COLORS.accent} style={{ marginRight: 8 }} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' }}
                    placeholder="AAAA-MM-DD (Ej. 2026-07-01)"
                    placeholderTextColor="#94A3B8"
                    value={customDates.start}
                    onChangeText={(t) => setCustomDates(prev => ({ ...prev, start: t }))}
                  />
                  {customDates.start ? (
                    <TouchableOpacity onPress={() => setCustomDates(prev => ({ ...prev, start: '' }))}>
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Fecha Hasta */}
              <View style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={14} color="#64748B" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                      Fecha de Fin (Hasta)
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: '#E2E8F0',
                    }}
                    onPress={() => {
                      const now = new Date();
                      const pad = (n: number) => String(n).padStart(2, '0');
                      setCustomDates(prev => ({ ...prev, end: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` }));
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#334155' }}>Hoy</Text>
                  </TouchableOpacity>
                </View>

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  paddingHorizontal: 10,
                  height: 44,
                }}>
                  <Ionicons name="calendar-sharp" size={16} color={COLORS.accent} style={{ marginRight: 8 }} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' }}
                    placeholder="AAAA-MM-DD (Ej. 2026-07-31)"
                    placeholderTextColor="#94A3B8"
                    value={customDates.end}
                    onChangeText={(t) => setCustomDates(prev => ({ ...prev, end: t }))}
                  />
                  {customDates.end ? (
                    <TouchableOpacity onPress={() => setCustomDates(prev => ({ ...prev, end: '' }))}>
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Banner Informativo de Validación / Conteo de Días */}
            {(() => {
              if (!customDates.start || !customDates.end) return null;
              const s = new Date(customDates.start + 'T00:00:00');
              const e = new Date(customDates.end + 'T00:00:00');
              if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
              const diffTime = e.getTime() - s.getTime();
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

              if (diffDays <= 0) {
                return (
                  <View style={{
                    width: '100%',
                    backgroundColor: '#FEF2F2',
                    borderRadius: 12,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#FECACA',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                  }}>
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600', flex: 1 }}>
                      La fecha final debe ser posterior o igual a la inicial.
                    </Text>
                  </View>
                );
              }

              return (
                <View style={{
                  width: '100%',
                  backgroundColor: '#F0FDF4',
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: '#BBF7D0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text style={{ fontSize: 12, color: '#166534', fontWeight: '700', flex: 1 }}>
                    Período válido: {diffDays} {diffDays === 1 ? 'día seleccionado' : 'días seleccionados'}
                  </Text>
                </View>
              );
            })()}

            {/* Botones de Cancelar / Aplicar */}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#F1F5F9',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 6
                }}
                onPress={() => setShowCustomDateModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={17} color="#64748B" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{
                  flex: 1.3,
                  height: 48,
                  borderRadius: 14,
                  overflow: 'hidden',
                  opacity: (!customDates.start || !customDates.end) ? 0.6 : 1,
                  shadowColor: COLORS.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 4
                }}
                disabled={!customDates.start || !customDates.end}
                onPress={() => {
                  setTimeFilter('Personalizado');
                  setShowCustomDateModal(false);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    paddingHorizontal: 12
                  }}
                >
                  <Ionicons name="filter" size={17} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                    Aplicar Filtro
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Asignación de Conductor al Aprobar Traslado */}
      <Modal visible={driverModal.visible} transparent animationType="fade" onRequestClose={() => setDriverModal({ visible: false, item: null })}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setDriverModal({ visible: false, item: null })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.modalIconBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1.5 }]}>
              <Ionicons name="car-sport" size={34} color={COLORS.accent} />
            </View>
            <Text style={styles.modalTitle}>Aprobar Traslado</Text>
            <Text style={styles.modalMessage}>Asigna el conductor y vehículo que prestará el servicio de transporte.</Text>
            
            <View style={{ width: '100%', gap: 12, marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 5 }}>Nombre del Conductor *</Text>
                <TextInput
                  style={[styles.searchInput, { height: 46, borderRadius: 12 }]}
                  placeholder="Ej. Carlos Pérez"
                  placeholderTextColor={COLORS.muted}
                  value={driverName}
                  onChangeText={setDriverName}
                />
              </View>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 5 }}>Teléfono de Contacto</Text>
                <TextInput
                  style={[styles.searchInput, { height: 46, borderRadius: 12 }]}
                  placeholder="Ej. 3109876543"
                  placeholderTextColor={COLORS.muted}
                  value={driverPhone}
                  onChangeText={setDriverPhone}
                />
              </View>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 5 }}>Placa del Vehículo / Datos</Text>
                <TextInput
                  style={[styles.searchInput, { height: 46, borderRadius: 12 }]}
                  placeholder="Ej. ABC-123 (Camioneta Oficial)"
                  placeholderTextColor={COLORS.muted}
                  value={driverPlate}
                  onChangeText={setDriverPlate}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity 
                style={[styles.modalBtn, { flex: 1, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }]} 
                onPress={() => setDriverModal({ visible: false, item: null })}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnText, { color: '#64748B' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { flex: 1.2, backgroundColor: 'transparent', overflow: 'hidden' }]} 
                onPress={handleApproveTransport}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}
                >
                  <Ionicons name="checkmark-circle" size={17} color="#FFF" />
                  <Text style={styles.modalBtnText}>Aprobar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación Modernizado */}
      {(() => {
        if (!confirmModal?.visible) return null;

        const isApprove = confirmModal.newStatus === 'resuelto';
        const isReject = confirmModal.newStatus === 'rechazado';
        const isProgress = confirmModal.newStatus === 'en_progreso';

        const modalTheme = isApprove ? {
          color: '#059669',
          bgLight: '#ECFDF5',
          borderColor: '#A7F3D0',
          badgeBg: '#D1FAE5',
          badgeColor: '#065F46',
          icon: 'checkmark-circle-outline' as const,
          badgeText: 'Aprobación de Solicitud',
          titleText: '¿Aprobar y finalizar solicitud?',
          confirmText: 'Aprobar Solicitud',
          confirmIcon: 'checkmark-circle' as const,
          gradient: ['#10B981', '#059669'] as [string, string],
        } : isReject ? {
          color: '#DC2626',
          bgLight: '#FEF2F2',
          borderColor: '#FECACA',
          badgeBg: '#FEE2E2',
          badgeColor: '#991B1B',
          icon: 'close-circle-outline' as const,
          badgeText: 'Rechazo de Solicitud',
          titleText: '¿Rechazar esta solicitud?',
          confirmText: 'Rechazar',
          confirmIcon: 'close-circle' as const,
          gradient: ['#EF4444', '#DC2626'] as [string, string],
        } : isProgress ? {
          color: '#2563EB',
          bgLight: '#EFF6FF',
          borderColor: '#BFDBFE',
          badgeBg: '#DBEAFE',
          badgeColor: '#1E40AF',
          icon: 'hourglass-outline' as const,
          badgeText: 'Pase a Trámite',
          titleText: '¿Iniciar trámite de solicitud?',
          confirmText: 'Iniciar trámite',
          confirmIcon: 'arrow-forward-circle' as const,
          gradient: ['#2563EB', '#1D4ED8'] as [string, string],
        } : {
          color: '#D97706',
          bgLight: '#FFFBEB',
          borderColor: '#FDE68A',
          badgeBg: '#FEF3C7',
          badgeColor: '#92400E',
          icon: 'help-circle-outline' as const,
          badgeText: 'Confirmación',
          titleText: 'Confirmar acción',
          confirmText: 'Confirmar',
          confirmIcon: 'checkmark' as const,
          gradient: ['#0F172A', '#1E293B'] as [string, string],
        };

        const categoryName = {
          visitors: 'Visitantes',
          transport: 'Transporte',
          maintenance: 'Mantenimiento',
          rooms: 'Salas',
          parking: 'Parqueadero'
        }[confirmModal.category || ''] || confirmModal.category;

        // Verificar si aplica notificación a Secretaría General
        let secGenEmail: string | null = null;
        if (
          confirmModal.category && 
          confirmModal.category !== 'transport' && 
          (confirmModal.newStatus === 'en_progreso' || confirmModal.newStatus === 'resuelto') &&
          confirmModal.item?.status.toLowerCase() === 'pendiente'
        ) {
          let serviceKey = confirmModal.category;
          if (confirmModal.category === 'rooms' && confirmModal.item?.metadata?.requires_secretaria_general) {
            serviceKey = 'rooms_special';
          }
          const emailObj = serviceEmails.find(e => e.service_type === serviceKey);
          if (emailObj) {
            secGenEmail = emailObj.email;
          }
        }

        const isMissingMaintenancePhoto = confirmModal.category === 'maintenance' && confirmModal.newStatus === 'resuelto' && !confirmModal.finalImage;

        return (
          <Modal
            animationType="fade"
            transparent={true}
            visible={!!confirmModal.visible}
            onRequestClose={() => setConfirmModal(null)}
          >
            <View style={styles.modalOverlay}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
              
              <View style={[styles.modalContent, { maxWidth: 440, padding: 26 }]}>
                {/* Botón cerrar X */}
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setConfirmModal(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#94A3B8" />
                </TouchableOpacity>

                {/* Icono con Squircle y Glow */}
                <View style={[styles.modalIconBox, { 
                  backgroundColor: modalTheme.bgLight, 
                  borderColor: modalTheme.borderColor,
                  borderWidth: 1.5,
                  marginBottom: 12
                }]}>
                  <Ionicons name={modalTheme.icon} size={36} color={modalTheme.color} />
                </View>

                {/* Badge de tipo de acción */}
                <View style={{
                  backgroundColor: modalTheme.badgeBg,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginBottom: 8,
                }}>
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: modalTheme.badgeColor,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}>
                    {modalTheme.badgeText}
                  </Text>
                </View>

                {/* Título y Mensaje */}
                <Text style={[styles.modalTitle, { fontSize: 20, marginBottom: 6 }]}>
                  {modalTheme.titleText}
                </Text>
                <Text style={[styles.modalMessage, { marginBottom: 12, paddingHorizontal: 4 }]}>
                  ¿Estás seguro de que deseas {confirmModal.actionName} esta solicitud?
                </Text>

                {/* Tarjeta de Contexto de la Solicitud */}
                {confirmModal.item && (
                  <View style={{
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: modalTheme.color }} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                          {categoryName || 'Solicitud'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                        {(confirmModal.item as any).requester_name || confirmModal.item.metadata?.requester_name || confirmModal.item.metadata?.responsible?.name || confirmModal.item.title || 'Solicitud administrativa'}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>
                        #{confirmModal.reqId.slice(0, 6).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Aviso Destacado de Secretaría General */}
                {secGenEmail && (
                  <View style={{
                    width: '100%',
                    backgroundColor: '#F0F7FF',
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    marginBottom: 12,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="mail" size={13} color="#1D4ED8" />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E40AF', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        Notificación a Secretaría General
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#334155', lineHeight: 17, marginBottom: 8 }}>
                      Esta solicitud será remitida automáticamente vía correo institucional para la gestión correspondiente:
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#DBEAFE',
                    }}>
                      <Ionicons name="at-outline" size={14} color="#1D4ED8" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E3A8A' }} numberOfLines={1}>
                        {secGenEmail}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Foto Final Obligatoria para Mantenimiento */}
                {confirmModal.category === 'maintenance' && confirmModal.newStatus === 'resuelto' && (
                  <View style={{
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginBottom: 12,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="camera" size={16} color="#0F172A" />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                          Evidencia de Finalización
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#991B1B', textTransform: 'uppercase' }}>Obligatoria</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10, lineHeight: 16 }}>
                      Adjunta una fotografía que certifique el trabajo de mantenimiento completado.
                    </Text>

                    {confirmModal.finalImage ? (
                      <View style={{ width: '100%', alignItems: 'center', gap: 8 }}>
                        <View style={{
                          width: '100%',
                          height: 140,
                          borderRadius: 10,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                          position: 'relative'
                        }}>
                          <Image 
                            source={{ uri: confirmModal.finalImage }} 
                            style={{ width: '100%', height: '100%', resizeMode: 'cover' }} 
                          />
                          <View style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            backgroundColor: 'rgba(16, 185, 129, 0.95)',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <Ionicons name="checkmark-circle" size={13} color="#FFF" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>Adjuntada</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingVertical: 7,
                            paddingHorizontal: 12,
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            borderRadius: 8
                          }}
                          onPress={async () => {
                            try {
                              const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
                              if (!result.canceled && result.assets && result.assets.length > 0) {
                                const fileUri = result.assets[0].uri;
                                try {
                                  const response = await fetch(fileUri);
                                  const blob = await response.blob();
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setConfirmModal({ ...confirmModal, finalImage: reader.result as string });
                                  };
                                  reader.readAsDataURL(blob);
                                } catch (e) {
                                  setConfirmModal({ ...confirmModal, finalImage: fileUri });
                                }
                              }
                            } catch (err) {
                              console.log('Error selecting final image', err);
                            }
                          }}
                        >
                          <Ionicons name="camera-reverse-outline" size={15} color="#0F172A" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>Cambiar foto</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: 14,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: '#CBD5E1',
                          borderStyle: 'dashed',
                          borderRadius: 10
                        }}
                        onPress={async () => {
                          try {
                            const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
                            if (!result.canceled && result.assets && result.assets.length > 0) {
                              const fileUri = result.assets[0].uri;
                              try {
                                const response = await fetch(fileUri);
                                const blob = await response.blob();
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setConfirmModal({ ...confirmModal, finalImage: reader.result as string });
                                };
                                reader.readAsDataURL(blob);
                              } catch (e) {
                                setConfirmModal({ ...confirmModal, finalImage: fileUri });
                              }
                            }
                          } catch (err) {
                            console.log('Error selecting final image', err);
                          }
                        }}
                      >
                        <Ionicons name="camera-outline" size={20} color="#0F172A" />
                        <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700' }}>
                          Tomar / Adjuntar Foto
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Botones Cancelar / Confirmar */}
                <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 12 }}>
                  <TouchableOpacity 
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: '#F1F5F9',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: 6
                    }}
                    onPress={() => setConfirmModal(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle-outline" size={17} color="#64748B" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{
                      flex: 1.3,
                      height: 48,
                      borderRadius: 14,
                      overflow: 'hidden',
                      opacity: isMissingMaintenancePhoto ? 0.5 : 1,
                      shadowColor: modalTheme.color,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 4
                    }}
                    disabled={isMissingMaintenancePhoto}
                    onPress={() => {
                      if (confirmModal) {
                        updateStatus(confirmModal.reqId, confirmModal.newStatus, confirmModal.finalImage);
                        setConfirmModal(null);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={modalTheme.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        paddingHorizontal: 12
                      }}
                    >
                      <Ionicons name={modalTheme.confirmIcon} size={17} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                        {modalTheme.confirmText}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* Visor de Imágenes a Pantalla Completa */}
      <Modal visible={viewerImage !== null} transparent={true} animationType="fade" onRequestClose={() => setViewerImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 30, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }} 
            onPress={() => setViewerImage(null)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
            maximumZoomScale={3} 
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            style={{ width: '100%', height: '100%' }}
          >
            {viewerImage && (
              <Image 
                source={{ uri: viewerImage }} 
                style={{ width: width, height: Dimensions.get('window').height }} 
                resizeMode="contain" 
              />
            )}
          </ScrollView>
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
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 15 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroKicker}>PANEL DE ADMINISTRACIÓN</Text>
            <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit>Control y Seguimiento</Text>
            <Text style={styles.heroSub} numberOfLines={2}>Monitoree el progreso de cada requerimiento</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignSelf: isDesktop ? 'auto' : 'flex-end' }}>
            <TouchableOpacity 
              style={[styles.logoutBtn, { backgroundColor: '#3B82F6', borderColor: '#2563EB' }]} 
              onPress={() => router.replace('/dashboard')}
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

function RequestListItem({ item, onUpdateStatus, onRefresh, initiallyExpanded = false, onSuccessAction, setViewerImage, onAssignDriver }: any) {
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

              {item.attachments && item.attachments.length > 0 && (
                <>
                  <View style={styles.metaDivider} />
                  <Text style={styles.infoTitle}>EVIDENCIA ADJUNTA</Text>
                  <View style={{ gap: 12 }}>
                    {item.attachments.map((attach: string, idx: number) => {
                      const finalUri = attach.startsWith('http') || attach.startsWith('file') || attach.startsWith('data:') || attach.startsWith('blob:') ? attach : 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1000&auto=format&fit=crop';
                      return (
                        <View key={idx} style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white }}>
                          <TouchableOpacity activeOpacity={0.8} onPress={() => setViewerImage(finalUri)}>
                            <Image 
                              source={{ uri: finalUri }} 
                              style={{ width: '100%', height: 160 }} 
                              resizeMode="cover" 
                            />
                          </TouchableOpacity>
                          <View style={{ padding: 10 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }}>{attach.split('/').pop() || attach}</Text>
                        </View>
                      </View>
                      );
                    })}
                  </View>
                </>
              )}
              
              {item.metadata?.finalImage && (
                <>
                  <View style={styles.metaDivider} />
                  <Text style={styles.infoTitle}>EVIDENCIA DE FINALIZACIÓN</Text>
                  <View style={{ gap: 12 }}>
                    <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white }}>
                      <TouchableOpacity activeOpacity={0.8} onPress={() => setViewerImage(item.metadata.finalImage)}>
                        <Image 
                          source={{ uri: item.metadata.finalImage }} 
                          style={{ width: '100%', height: 160 }} 
                          resizeMode="cover" 
                        />
                      </TouchableOpacity>
                      <View style={{ padding: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }}>Foto Final</Text>
                      </View>
                    </View>
                  </View>
                </>
              )}

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
                      {/* Grupo 1: Mantenimiento, Sala Especial */}
                      { (item.category === 'maintenance' || (item.category === 'rooms' && item.metadata?.requires_secretaria_general)) && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.processBtn]}
                          onPress={() => onUpdateStatus(item, 'en_progreso')}
                        >
                          <Ionicons name="play-outline" size={16} color={COLORS.white} />
                          <Text style={styles.actionBtnText}>Procesar</Text>
                        </TouchableOpacity>
                      )}

                      {/* Grupo 2: Visitantes, Parqueadero, Sala Estándar */}
                      { (item.category === 'visitors' || item.category === 'parking' || (item.category === 'rooms' && !item.metadata?.requires_secretaria_general)) && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.successBtn]}
                          onPress={() => onUpdateStatus(item, 'resuelto')}
                        >
                          <Ionicons name="checkmark-outline" size={16} color={COLORS.white} />
                          <Text style={styles.actionBtnText}>Aprobar</Text>
                        </TouchableOpacity>
                      )}

                      {/* Grupo 3: Transporte con Asignación de Conductor */}
                      { item.category === 'transport' && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.successBtn]}
                          onPress={() => onAssignDriver && onAssignDriver(item)}
                        >
                          <Ionicons name="checkmark-outline" size={16} color={COLORS.white} />
                          <Text style={styles.actionBtnText}>Aprobar</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  {['en_progreso', 'en progreso'].includes(item.status.toLowerCase()) && (
                    <TouchableOpacity 
                       style={[styles.actionBtn, styles.successBtn]}
                       onPress={() => onUpdateStatus(item, 'resuelto')}
                    >
                      <Ionicons name="checkmark-done-outline" size={16} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Finalizar</Text>
                    </TouchableOpacity>
                  )}

                  {/* Botón para solicitudes programadas (fallback de mock data) */}
                  {item.status.toLowerCase() === 'programada' && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.infoBtn]}
                      onPress={() => onUpdateStatus(item, 'resuelto')}
                    >
                      <Ionicons name="car-outline" size={16} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Despachar</Text>
                    </TouchableOpacity>
                  )}
                  {/* Botón de Rechazo (Equis Roja) para cualquier solicitud activa */}
                  {!['resuelto', 'completada', 'aprobada', 'aprobado', 'rechazado', 'rechazada'].includes(item.status.toLowerCase()) && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => onUpdateStatus(item, 'rechazado')}
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
  metaValue: { fontSize: 14, fontWeight: '700', color: COLORS.primary, flex: 1, textAlign: 'right', marginLeft: 15 },

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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: COLORS.white, borderRadius: 24, padding: 26, alignItems: 'center', elevation: 16, shadowColor: '#0F172A', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 12 }, shadowRadius: 28, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.8)', position: 'relative' },
  modalCloseBtn: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', zIndex: 10 },
  modalHeader: { width: '100%', alignItems: 'center' },
  modalIconBox: { width: 68, height: 68, borderRadius: 22, backgroundColor: `${COLORS.success}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: `${COLORS.success}30` },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, marginBottom: 8, textAlign: 'center', letterSpacing: -0.3 },
  modalMessage: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 20, lineHeight: 21, fontWeight: '500', paddingHorizontal: 6 },
  modalBtn: { backgroundColor: COLORS.primary, width: '100%', height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
