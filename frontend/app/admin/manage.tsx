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
const PRIORITY_OPTIONS = ['Todas', 'Alta', 'Media', 'Baja'];
const TIME_OPTIONS = ['Todos', 'Hoy', 'Últimos 7 días', 'Este mes', 'Personalizado'];

const SORT_OPTIONS: { id: 'recent' | 'oldest' | 'priority' | 'requester'; label: string; icon: any }[] = [
  { id: 'recent', label: 'Más recientes', icon: 'time-outline' },
  { id: 'oldest', label: 'Más antiguas', icon: 'hourglass-outline' },
  { id: 'priority', label: 'Prioridad', icon: 'alert-circle-outline' },
  { id: 'requester', label: 'Solicitante (A-Z)', icon: 'person-outline' },
];

export default function ManageRequests() {
  const params = useLocalSearchParams<{ status?: string; priority?: string; today?: string; id?: string }>();
  const [requests, setRequests] = useState<AdministrativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [priorityFilter, setPriorityFilter] = useState<string>(
    params.priority ? (params.priority.charAt(0).toUpperCase() + params.priority.slice(1).toLowerCase()) : 'Todas'
  );
  const [timeFilter, setTimeFilter] = useState('Todos');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'priority' | 'requester'>('recent');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [successModal, setSuccessModal] = useState({ visible: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{ 
    visible: boolean; 
    reqId: string; 
    newStatus: 'pendiente' | 'en_progreso' | 'resuelto' | 'rechazado'; 
    actionName: string; 
    category?: string; 
    finalImage?: string | null; 
    item?: AdministrativeRequest;
    rejectReason?: string;
  } | null>(null);
  const [driverModal, setDriverModal] = useState<{ visible: boolean; item: AdministrativeRequest | null }>({ visible: false, item: null });
  const [dispatchModal, setDispatchModal] = useState<{ visible: boolean; item: any | null }>({ visible: false, item: null });
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
    setConfirmModal({ visible: true, reqId: item.id, newStatus, actionName, category: item.category, finalImage: null, item, rejectReason: '' });
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

  const updateStatus = async (id: string, newStatus: 'pendiente' | 'en_progreso' | 'resuelto' | 'rechazado', finalImage?: string | null, reason?: string) => {
    try {
      setLoading(true);
      await requestService.updateStatus(id, newStatus, finalImage || undefined, reason);
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

  // Contadores dinámicos por categoría
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; pending: number }> = {
      Todas: { total: requests.length, pending: requests.filter(r => r.status === 'pendiente').length },
      Visitantes: { total: 0, pending: 0 },
      Transporte: { total: 0, pending: 0 },
      Mantenimiento: { total: 0, pending: 0 },
      Salas: { total: 0, pending: 0 },
      Parqueadero: { total: 0, pending: 0 },
    };
    requests.forEach(r => {
      const catKey = {
        visitors: 'Visitantes',
        transport: 'Transporte',
        maintenance: 'Mantenimiento',
        rooms: 'Salas',
        parking: 'Parqueadero'
      }[r.category];
      if (catKey && counts[catKey]) {
        counts[catKey].total += 1;
        if (r.status === 'pendiente') {
          counts[catKey].pending += 1;
        }
      }
    });
    return counts;
  }, [requests]);

  // Cargar datos cada vez que la pestaña reciba el foco
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  React.useEffect(() => {
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

    const filtered = requests.filter(item => {
      // Búsqueda Profunda
      const q = searchQuery.toLowerCase().trim();
      let matchesSearch = true;
      if (q) {
        const title = (item.title || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const user = ((item as any).user_name || item.metadata?.responsible?.name || item.metadata?.name || item.metadata?.requester_name || item.metadata?.passengerName || '').toLowerCase();
        const dep = (item.metadata?.dependency || item.metadata?.responsible?.dependency || '').toLowerCase();
        const notes = (item.admin_notes || item.metadata?.rejection_reason || '').toLowerCase();
        const metaJson = JSON.stringify(item.metadata || {}).toLowerCase();
        matchesSearch = title.includes(q) || desc.includes(q) || cat.includes(q) || user.includes(q) || dep.includes(q) || notes.includes(q) || metaJson.includes(q);
      }

      const matchesService = serviceFilter === 'Todas' || 
                           (serviceFilter === 'Visitantes' && item.category === 'visitors') ||
                           (serviceFilter === 'Transporte' && item.category === 'transport') ||
                           (serviceFilter === 'Mantenimiento' && item.category === 'maintenance') ||
                           (serviceFilter === 'Salas' && item.category === 'rooms') ||
                           (serviceFilter === 'Parqueadero' && item.category === 'parking');
      
      const itemStatus = item.status ? item.status.toLowerCase() : '';
      const matchesStatus = statusFilter === 'Todos' ||
                           (statusFilter === 'Pendiente' && itemStatus === 'pendiente') ||
                           (statusFilter === 'En Progreso' && (itemStatus === 'en_progreso' || itemStatus === 'en curso' || itemStatus === 'en_curso')) ||
                           (statusFilter === 'Aprobado' && (itemStatus === 'resuelto' || itemStatus === 'aprobado')) ||
                           (statusFilter === 'Rechazado' && itemStatus === 'rechazado');

      const itemPriority = (item.priority || 'media').toLowerCase();
      const matchesPriority = priorityFilter === 'Todas' || itemPriority === priorityFilter.toLowerCase();

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

      return matchesSearch && matchesService && matchesStatus && matchesPriority && matchesTime;
    });

    // Ordenamiento Dinámico
    return filtered.sort((a, b) => {
      if (sortOrder === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOrder === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortOrder === 'priority') {
        const weight: Record<string, number> = { alta: 3, media: 2, baja: 1 };
        const wA = weight[(a.priority || 'media').toLowerCase()] || 0;
        const wB = weight[(b.priority || 'media').toLowerCase()] || 0;
        if (wB !== wA) return wB - wA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOrder === 'requester') {
        const userA = ((a as any).user_name || a.metadata?.responsible?.name || a.metadata?.name || a.title || '').toLowerCase();
        const userB = ((b as any).user_name || b.metadata?.responsible?.name || b.metadata?.name || b.title || '').toLowerCase();
        return userA.localeCompare(userB);
      }
      return 0;
    });
  }, [requests, searchQuery, serviceFilter, statusFilter, priorityFilter, timeFilter, customDates, sortOrder]);

  // Exportación a CSV / Excel con codificación UTF-8 BOM
  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      setSuccessModal({ visible: true, message: 'No hay solicitudes disponibles para exportar con los filtros actuales.' });
      return;
    }

    const headers = [
      'Radicado SASGE',
      'Fecha Creacion',
      'Categoria',
      'Prioridad',
      'Estado',
      'Funcionario Solicitante',
      'Dependencia',
      'Titulo / Asunto',
      'Descripcion General',
      'Detalles Tecnicos',
      'Observaciones / Motivo Rechazo'
    ];

    const rows = filteredData.map(item => {
      const u = mapRequestToUI(item);
      const catLabel = u.type;
      const userName = (u.user || '').replace(/"/g, '""');
      const depName = (u.dependency || '').replace(/"/g, '""');
      const title = (item.title || '').replace(/"/g, '""');
      const desc = (item.description || '').replace(/"/g, '""');
      const metaValues = (u.uiMetadata || []).map((m: any) => `${m.label}: ${m.value}`).join(' | ').replace(/"/g, '""');
      const notes = (item.admin_notes || item.metadata?.rejection_reason || '').replace(/"/g, '""');
      const dateStr = new Date(item.created_at).toLocaleString('es-CO');

      return [
        `"#${item.id.slice(0, 8).toUpperCase()}"`,
        `"${dateStr}"`,
        `"${catLabel}"`,
        `"${item.priority.toUpperCase()}"`,
        `"${u.status}"`,
        `"${userName}"`,
        `"${depName}"`,
        `"${title}"`,
        `"${desc}"`,
        `"${metaValues}"`,
        `"${notes}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `SASGE_Gestion_Solicitudes_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccessModal({ visible: true, message: `Reporte CSV generado y descargado exitosamente con ${filteredData.length} solicitudes.` });
      } catch (e) {
        console.error('Error al descargar CSV:', e);
      }
    } else {
      setSuccessModal({ visible: true, message: `Reporte preparado con éxito (${filteredData.length} registros).` });
    }
  };

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
                  <SearchBar query={searchQuery} setQuery={setSearchQuery} />
                  
                  <ServiceTabsBar 
                    selected={serviceFilter} 
                    onSelect={setServiceFilter} 
                    badges={categoryCounts}
                    isDesktop={isDesktop}
                  />

                  <FilterRow 
                    label="Filtrar Prioridad" 
                    data={PRIORITY_OPTIONS} 
                    selected={priorityFilter} 
                    onSelect={setPriorityFilter} 
                    icon="flag-outline"
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
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultsTitle}>
                        {filteredData.length} {filteredData.length === 1 ? 'Registro filtrado' : 'Registros bajo gestión'}
                      </Text>
                      {/* Chips de Ordenamiento Dinámico */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 8 }}>
                        {SORT_OPTIONS.map(sortOpt => {
                          const isActive = sortOrder === sortOpt.id;
                          return (
                            <TouchableOpacity
                              key={sortOpt.id}
                              onPress={() => setSortOrder(sortOpt.id)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 8,
                                backgroundColor: isActive ? '#0F172A' : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: isActive ? '#0F172A' : '#CBD5E1',
                              }}
                            >
                              <Ionicons name={sortOpt.icon} size={13} color={isActive ? '#FFFFFF' : '#64748B'} />
                              <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#FFFFFF' : '#475569' }}>
                                {sortOpt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {/* Botón de Exportar a CSV / Excel */}
                    <TouchableOpacity
                      onPress={exportToCSV}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#10B981',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        shadowColor: '#10B981',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 5,
                        elevation: 3,
                        alignSelf: 'flex-start',
                        marginTop: 4
                      }}
                    >
                      <Ionicons name="download-outline" size={17} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                        Exportar CSV
                      </Text>
                    </TouchableOpacity>
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
                onOpenDispatch={(reqItem: any) => setDispatchModal({ visible: true, item: reqItem })}
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
          <View style={[styles.modalContent, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC', borderWidth: 1.5 }]}>
            <View style={[styles.modalIconBox, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC', borderWidth: 1.5 }]}>
              <Ionicons name="checkmark-circle" size={38} color="#059669" />
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
          
          <View style={[styles.modalContent, { maxWidth: 440, padding: 26, backgroundColor: '#F0F7FF', borderColor: '#BFDBFE', borderWidth: 1.5 }]}>
            {/* Botón cerrar X */}
            <TouchableOpacity 
              style={[styles.modalCloseBtn, { backgroundColor: '#FFFFFF', borderColor: '#BFDBFE' }]}
              onPress={() => setShowCustomDateModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#64748B" />
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
          cardBg: '#F0FDF4',
          cardBorder: '#86EFAC',
          bgLight: '#DCFCE7',
          borderColor: '#86EFAC',
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
          cardBg: '#FEF2F2',
          cardBorder: '#FCA5A5',
          bgLight: '#FEE2E2',
          borderColor: '#FCA5A5',
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
          cardBg: '#EFF6FF',
          cardBorder: '#BFDBFE',
          bgLight: '#DBEAFE',
          borderColor: '#93C5FD',
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
          cardBg: '#FFFBEB',
          cardBorder: '#FDE68A',
          bgLight: '#FEF3C7',
          borderColor: '#FCD34D',
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
              
              <View style={[
                styles.modalContent, 
                { 
                  maxWidth: 440, 
                  padding: 26,
                  backgroundColor: modalTheme.cardBg,
                  borderColor: modalTheme.cardBorder,
                  borderWidth: 1.5,
                }
              ]}>
                {/* Botón cerrar X */}
                <TouchableOpacity 
                  style={[styles.modalCloseBtn, { backgroundColor: '#FFFFFF', borderColor: modalTheme.cardBorder }]}
                  onPress={() => setConfirmModal(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
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
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: modalTheme.cardBorder,
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
                      backgroundColor: modalTheme.bgLight,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: modalTheme.cardBorder,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: modalTheme.color }}>
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

                {/* Motivo Obligatorio al Rechazar */}
                {isReject && (
                  <View style={{
                    width: '100%',
                    backgroundColor: '#FEF2F2',
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#FECACA',
                    marginBottom: 12,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="alert-circle" size={16} color="#DC2626" />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#991B1B' }}>
                          Justificación del Rechazo
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FCA5A5' }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#991B1B', textTransform: 'uppercase' }}>Obligatorio</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#7F1D1D', marginBottom: 8, lineHeight: 16 }}>
                      Indique el motivo o fundamento institucional por el cual se declina este requerimiento. Esta justificación quedará registrada y se notificará al solicitante.
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#FCA5A5',
                        padding: 10,
                        fontSize: 13,
                        color: '#0F172A',
                        minHeight: 70,
                        textAlignVertical: 'top'
                      }}
                      placeholder="Ej. No se cuenta con disponibilidad de cupos vehiculares para la fecha solicitada..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      value={confirmModal.rejectReason || ''}
                      onChangeText={(t) => setConfirmModal({ ...confirmModal, rejectReason: t })}
                    />
                  </View>
                )}

                {/* Foto Final Obligatoria para Mantenimiento */}
                {confirmModal.category === 'maintenance' && confirmModal.newStatus === 'resuelto' && (
                  <View style={{
                    width: '100%',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: modalTheme.cardBorder,
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
                {(() => {
                  const isMissingRejectReason = isReject && (!confirmModal.rejectReason || !confirmModal.rejectReason.trim());
                  const isBlocked = isMissingMaintenancePhoto || isMissingRejectReason;

                  return (
                    <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 12 }}>
                      <TouchableOpacity 
                        style={{
                          flex: 1,
                          height: 48,
                          borderRadius: 14,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: modalTheme.cardBorder,
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
                          opacity: isBlocked ? 0.5 : 1,
                          shadowColor: modalTheme.color,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.25,
                          shadowRadius: 8,
                          elevation: 4
                        }}
                        disabled={isBlocked}
                        onPress={() => {
                          if (confirmModal) {
                            updateStatus(confirmModal.reqId, confirmModal.newStatus, confirmModal.finalImage, confirmModal.rejectReason?.trim());
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
                  );
                })()}
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* Modal Ficha de Despacho Oficial (Imprimible) */}
      <Modal visible={dispatchModal.visible} transparent animationType="fade" onRequestClose={() => setDispatchModal({ visible: false, item: null })}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContent, { maxWidth: 540, maxHeight: '90%', padding: 24 }]}>
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setDispatchModal({ visible: false, item: null })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              {/* Membrete Institucional */}
              <View style={{ alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#0F172A', paddingBottom: 14, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' }}>
                  Alcaldía Mayor de Bogotá D.C.
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563EB', marginTop: 2, textAlign: 'center' }}>
                  Secretaría Jurídica Distrital — SASGE
                </Text>
                <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginTop: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1, textTransform: 'uppercase' }}>
                    Comprobante Oficial de Despacho y Control
                  </Text>
                </View>
              </View>

              {dispatchModal.item && (
                <View style={{ gap: 12 }}>
                  {/* Datos Clave */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>RADICADO</Text>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>#{dispatchModal.item.id?.slice(0, 8).toUpperCase()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>FECHA EMISIÓN</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{new Date().toLocaleDateString('es-CO')}</Text>
                    </View>
                  </View>

                  {/* Solicitante y Servicio */}
                  <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Solicitante:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>{dispatchModal.item.user || dispatchModal.item.user_name || 'Funcionario'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Dependencia:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>{dispatchModal.item.dependency || 'SJD'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Tipo Servicio:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563EB' }}>{dispatchModal.item.type}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Estado Actual:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>{dispatchModal.item.status}</Text>
                    </View>
                  </View>

                  {/* Descripción del Servicio */}
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                      Asunto / Detalle Requerimiento
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A', lineHeight: 18 }}>
                      {dispatchModal.item.detail || dispatchModal.item.title}
                    </Text>
                  </View>

                  {/* Metadatos Técnicos */}
                  {dispatchModal.item.uiMetadata && dispatchModal.item.uiMetadata.length > 0 && (
                    <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                        Ficha Técnica Operativa
                      </Text>
                      {dispatchModal.item.uiMetadata.map((m: any, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{m.label}:</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', flex: 1, textAlign: 'right', marginLeft: 10 }}>{m.value}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Conductor si aplica */}
                  {dispatchModal.item.metadata?.driver && (
                    <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, padding: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E40AF', textTransform: 'uppercase', marginBottom: 4 }}>
                        Vehículo & Conductor Asignado
                      </Text>
                      <Text style={{ fontSize: 12, color: '#1E3A8A', fontWeight: '700' }}>
                        Conductor: {dispatchModal.item.metadata.driver.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#1E3A8A' }}>
                        Teléfono: {dispatchModal.item.metadata.driver.phone || 'N/A'} — Placa: {dispatchModal.item.metadata.driver.plate || 'Oficial'}
                      </Text>
                    </View>
                  )}

                  {/* Zona de Firmas de Control */}
                  <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#CBD5E1', flexDirection: 'row', justifyContent: 'space-between', gap: 14 }}>
                    <View style={{ flex: 1, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#94A3B8', paddingTop: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569' }}>FIRMA SOLICITANTE</Text>
                      <Text style={{ fontSize: 9, color: '#94A3B8' }}>C.C. / Recibido a Conformidad</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#94A3B8', paddingTop: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569' }}>FIRMA DESPACHO / CONTROL</Text>
                      <Text style={{ fontSize: 9, color: '#94A3B8' }}>Seguridad / Conductor / Técnico</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Botones Imprimir / Cerrar */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity 
                  style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}
                  onPress={() => setDispatchModal({ visible: false, item: null })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Cerrar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ flex: 1.3, height: 46, borderRadius: 12, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.print();
                    } else {
                      setSuccessModal({ visible: true, message: 'Ficha lista para radicación y control.' });
                    }
                  }}
                >
                  <Ionicons name="print-outline" size={17} color="#FFFFFF" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Imprimir Ficha</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  const router = useRouter();

  const NAV_ITEMS = [
    { label: 'Panel Principal', icon: 'grid-outline' as const, path: '/admin' },
    { label: 'Gestión Solicitudes', icon: 'list-circle-outline' as const, path: '/admin/manage', active: true },
    { label: 'Reportes y Métricas', icon: 'bar-chart-outline' as const, path: '/admin/reports' },
    { label: 'Configuración', icon: 'settings-outline' as const, path: '/admin/settings' },
  ];

  return (
    <View style={styles.sidebar}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
      <View style={styles.sidebarContent}>
        <View style={styles.logoCircle}>
          <Ionicons name="shield-checkmark-outline" size={38} color={COLORS.white} />
        </View>
        <Text style={styles.sideTitle}>SASGE</Text>
        <Text style={styles.sideSubTitle}>Administración Central</Text>
        
        <View style={{ width: 40, height: 4, backgroundColor: COLORS.accent, marginVertical: 20, borderRadius: 2 }} />

        {/* Menú de Navegación Rápida */}
        <View style={{ width: '100%', gap: 8, marginVertical: 10 }}>
          {NAV_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => router.push(item.path as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: item.active ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                borderWidth: 1,
                borderColor: item.active ? '#3B82F6' : 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <Ionicons name={item.icon} size={20} color={item.active ? '#60A5FA' : 'rgba(255, 255, 255, 0.7)'} />
              <Text style={{
                fontSize: 14,
                fontWeight: item.active ? '800' : '600',
                color: item.active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)',
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 'auto', paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }}>
          <TouchableOpacity
            onPress={() => router.replace('/dashboard')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <Ionicons name="arrow-back-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Portal Funcionario</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.heroSub} numberOfLines={2}>Gestione requerimientos, asigne despachos y audite trazabilidad</Text>
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

function SearchBar({ query, setQuery }: any) {
  return (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color={COLORS.muted} />
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por solicitante, placa, visitante, conductor o asunto..."
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

const SERVICE_CONFIG: Record<string, {
  label: string;
  icon: any;
  color: string;
  gradient: [string, string];
  bgLight: string;
  borderColor: string;
}> = {
  Todas: {
    label: 'Todas',
    icon: 'apps',
    color: '#0F172A',
    gradient: ['#1E293B', '#0F172A'],
    bgLight: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  Visitantes: {
    label: 'Visitantes',
    icon: 'people',
    color: '#E11D48',
    gradient: ['#F43F5E', '#BE123C'],
    bgLight: '#FFE4E6',
    borderColor: '#FDA4AF',
  },
  Transporte: {
    label: 'Transporte',
    icon: 'car-sport',
    color: '#0284C7',
    gradient: ['#0EA5E9', '#0369A1'],
    bgLight: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  Mantenimiento: {
    label: 'Mantenimiento',
    icon: 'construct',
    color: '#0D9488',
    gradient: ['#14B8A6', '#0F766E'],
    bgLight: '#CCFBF1',
    borderColor: '#5EEAD4',
  },
  Salas: {
    label: 'Salas',
    icon: 'easel',
    color: '#7C3AED',
    gradient: ['#8B5CF6', '#6D28D9'],
    bgLight: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  Parqueadero: {
    label: 'Parqueadero',
    icon: 'car',
    color: '#EA580C',
    gradient: ['#FB923C', '#C2410C'],
    bgLight: '#FFEDD5',
    borderColor: '#FDBA74',
  },
};

function ServiceTabsBar({ 
  selected, 
  onSelect, 
  badges, 
  isDesktop 
}: { 
  selected: string; 
  onSelect: (cat: string) => void; 
  badges: Record<string, { total: number; pending: number }>; 
  isDesktop: boolean; 
}) {
  const categories = ['Todas', 'Visitantes', 'Transporte', 'Mantenimiento', 'Salas', 'Parqueadero'];

  return (
    <View style={{ width: '100%', marginTop: 22, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingLeft: 2 }}>
        <Ionicons name="layers" size={16} color={COLORS.accent} />
        <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
          Filtrar por Servicio
        </Text>
      </View>

      {/* Grid de Tabs de Ancho Completo */}
      <View style={{
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
      }}>
        {categories.map((catKey) => {
          const cfg = SERVICE_CONFIG[catKey] || SERVICE_CONFIG.Todas;
          const isSelected = selected === catKey;
          const count = badges[catKey]?.total ?? 0;
          const pending = badges[catKey]?.pending ?? 0;

          // En desktop: 6 columnas uniformes (~15.4%). En móvil/tablet: 3 columnas (~31.3%)
          const tabWidth = isDesktop ? '15.4%' : '31.3%';

          return (
            <TouchableOpacity
              key={catKey}
              onPress={() => onSelect(catKey)}
              activeOpacity={0.85}
              style={{
                width: tabWidth,
                minHeight: 76,
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: isSelected ? 'transparent' : '#FFFFFF',
                borderWidth: isSelected ? 0 : 1.5,
                borderColor: isSelected ? 'transparent' : cfg.borderColor,
                shadowColor: isSelected ? cfg.color : '#0F172A',
                shadowOffset: { width: 0, height: isSelected ? 5 : 2 },
                shadowOpacity: isSelected ? 0.28 : 0.05,
                shadowRadius: isSelected ? 10 : 4,
                elevation: isSelected ? 6 : 2,
              }}
            >
              {isSelected ? (
                <LinearGradient
                  colors={cfg.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    padding: 10,
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: 'rgba(255,255,255,0.22)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Ionicons name={cfg.icon} size={18} color="#FFFFFF" />
                    </View>
                    <View style={{
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF' }}>
                        {count}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 6, width: '100%' }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.2 }} numberOfLines={1}>
                      {cfg.label}
                    </Text>
                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginTop: 1 }}>
                      {pending > 0 ? `⚡ ${pending} pend.` : '✓ Al día'}
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <View style={{
                  flex: 1,
                  padding: 10,
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: `${cfg.bgLight}60`,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: cfg.bgLight,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: cfg.borderColor,
                    }}>
                      <Ionicons name={cfg.icon} size={17} color={cfg.color} />
                    </View>
                    <View style={{
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: cfg.color }}>
                        {count}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 6, width: '100%' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }} numberOfLines={1}>
                      {cfg.label}
                    </Text>
                    <Text style={{ fontSize: 10, color: pending > 0 ? '#D97706' : '#64748B', fontWeight: pending > 0 ? '700' : '500', marginTop: 1 }}>
                      {pending > 0 ? `⚠️ ${pending} pend.` : 'Sin pend.'}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function FilterRow({ label, data, selected, onSelect, icon, badges }: any) {
  return (
    <View style={styles.filterSection}>
      <View style={styles.filterHeader}>
        <Ionicons name={icon} size={14} color={COLORS.accent} />
        <Text style={styles.filterLabel}>{label}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {data.map((item: string) => {
          const isSelected = selected === item;
          const countInfo = badges ? badges[item] : null;

          return (
            <Pressable
              key={item}
              onPress={() => onSelect(item)}
              style={[
                styles.filterChip,
                isSelected && styles.filterChipActive,
                { flexDirection: 'row', alignItems: 'center', gap: 6 }
              ]}
            >
              {/* Punto de color para prioridades si aplica */}
              {item === 'Alta' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />}
              {item === 'Media' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />}
              {item === 'Baja' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />}

              <Text style={[
                styles.filterChipText,
                isSelected && styles.filterChipTextActive
              ]}>
                {item}
              </Text>

              {countInfo !== undefined && countInfo !== null && (
                <View style={{
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                  paddingHorizontal: 7,
                  paddingVertical: 1,
                  borderRadius: 10,
                  marginLeft: 2
                }}>
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: isSelected ? '#FFFFFF' : '#64748B'
                  }}>
                    {countInfo.total}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Función auxiliar para calcular tiempo transcurrido / SLA
function getSLAInfo(createdAt: string, status: string) {
  const statusLower = (status || '').toLowerCase();
  const isResolved = ['resuelto', 'aprobado', 'completada'].includes(statusLower);
  const isRejected = ['rechazado', 'rechazada'].includes(statusLower);

  if (isResolved) {
    return {
      text: 'Finalizado',
      color: '#059669',
      bg: '#ECFDF5',
      icon: 'checkmark-circle-outline' as const,
      isAlert: false
    };
  }

  if (isRejected) {
    return {
      text: 'Rechazado',
      color: '#DC2626',
      bg: '#FEF2F2',
      icon: 'close-circle-outline' as const,
      isAlert: false
    };
  }

  const now = new Date().getTime();
  const created = new Date(createdAt).getTime();
  const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours >= 48) {
    return {
      text: `SLA Crítico (+${diffDays}d)`,
      color: '#DC2626',
      bg: '#FEF2F2',
      icon: 'alert-circle' as const,
      isAlert: true
    };
  } else if (diffHours >= 24) {
    return {
      text: `SLA En Riesgo (${diffHours}h)`,
      color: '#D97706',
      bg: '#FFFBEB',
      icon: 'time' as const,
      isAlert: true
    };
  } else {
    return {
      text: diffHours <= 0 ? 'Reciente (<1h)' : `En tiempo (${diffHours}h)`,
      color: '#2563EB',
      bg: '#EFF6FF',
      icon: 'hourglass-outline' as const,
      isAlert: false
    };
  }
}

function RequestListItem({ item, onUpdateStatus, onRefresh, initiallyExpanded = false, onSuccessAction, setViewerImage, onAssignDriver, onOpenDispatch }: any) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const scale = useRef(new Animated.Value(1)).current;
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const sla = getSLAInfo(item.created_at, item.status);

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

  const rejectionReasonText = item.admin_notes || item.metadata?.rejection_reason;
  const isPending = item.status.toLowerCase() === 'pendiente';
  const isInProgress = ['en_progreso', 'en progreso', 'en curso'].includes(item.status.toLowerCase());
  const isClosed = ['resuelto', 'completada', 'aprobada', 'aprobado', 'rechazado', 'rechazada'].includes(item.status.toLowerCase());

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

                {/* Badge de Indicador SLA */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: sla.bg,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: `${sla.color}30`
                }}>
                  <Ionicons name={sla.icon} size={11} color={sla.color} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: sla.color }}>
                    {sla.text}
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
          
          <Text style={styles.cardDetail} numberOfLines={expanded ? 0 : 2}>{item.detail}</Text>

          {/* Banner de Motivo de Rechazo Visible Si Aplica */}
          {item.status.toLowerCase() === 'rechazado' && rejectionReasonText && (
            <View style={{
              backgroundColor: '#FEF2F2',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: '#FECACA',
              marginTop: 6,
              marginBottom: 10,
              gap: 4
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#991B1B', textTransform: 'uppercase' }}>
                  Motivo de Rechazo:
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: '#7F1D1D', fontWeight: '500', lineHeight: 18 }}>
                "{rejectionReasonText}"
              </Text>
            </View>
          )}
          
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

              {/* Evidencia Fotográfica Mejorada (Galería Antes/Después) */}
              {((item.attachments && item.attachments.length > 0) || item.metadata?.finalImage) && (
                <>
                  <View style={styles.metaDivider} />
                  <Text style={styles.infoTitle}>REGISTRO Y EVIDENCIA FOTOGRÁFICA</Text>
                  
                  <View style={{ gap: 14 }}>
                    {/* Evidencia Inicial / Reporte */}
                    {item.attachments && item.attachments.length > 0 && (
                      <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#1E40AF', textTransform: 'uppercase' }}>Reporte Inicial (Antes)</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: COLORS.muted }}>{item.attachments.length} archivo(s)</Text>
                        </View>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                          {item.attachments.map((attach: string, idx: number) => {
                            const finalUri = attach.startsWith('http') || attach.startsWith('file') || attach.startsWith('data:') || attach.startsWith('blob:') ? attach : 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1000&auto=format&fit=crop';
                            return (
                              <TouchableOpacity 
                                key={idx} 
                                activeOpacity={0.85} 
                                onPress={() => setViewerImage(finalUri)}
                                style={{
                                  width: isDesktop ? '31%' : '47%',
                                  height: 120,
                                  borderRadius: 12,
                                  overflow: 'hidden',
                                  borderWidth: 1,
                                  borderColor: COLORS.line,
                                  backgroundColor: COLORS.white,
                                  position: 'relative'
                                }}
                              >
                                <Image 
                                  source={{ uri: finalUri }} 
                                  style={{ width: '100%', height: '100%' }} 
                                  resizeMode="cover" 
                                />
                                <View style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 6 }}>
                                  <Ionicons name="expand-outline" size={14} color="#FFF" />
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Evidencia Final / Trabajo Concluido */}
                    {item.metadata?.finalImage && (
                      <View style={{ gap: 8, marginTop: item.attachments?.length ? 6 : 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#065F46', textTransform: 'uppercase' }}>Trabajo Finalizado (Después)</Text>
                          </View>
                        </View>

                        <TouchableOpacity 
                          activeOpacity={0.85} 
                          onPress={() => setViewerImage(item.metadata.finalImage)}
                          style={{
                            width: isDesktop ? '31%' : '100%',
                            height: 140,
                            borderRadius: 12,
                            overflow: 'hidden',
                            borderWidth: 1.5,
                            borderColor: '#10B981',
                            backgroundColor: COLORS.white,
                            position: 'relative'
                          }}
                        >
                          <Image 
                            source={{ uri: item.metadata.finalImage }} 
                            style={{ width: '100%', height: '100%' }} 
                            resizeMode="cover" 
                          />
                          <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>Foto de Cierre</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}
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

          {/* Pie de Tarjeta con Acciones Rápidas Directas */}
          <View style={styles.cardFooter}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.muted} />
              <Text style={styles.metaText}>{item.date}</Text>
            </View>

            <View style={[styles.actionButtons, { flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, paddingLeft: 10, gap: 6 }]}>
              {/* Botón de Ficha de Despacho Oficial */}
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', height: 34 }]}
                onPress={() => onOpenDispatch && onOpenDispatch(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="receipt-outline" size={15} color="#334155" />
                <Text style={[styles.actionBtnText, { color: '#334155' }]}>Ficha</Text>
              </TouchableOpacity>

              {/* Botón Detalles / Ampliar */}
              <TouchableOpacity 
                style={[styles.actionBtn, { borderColor: COLORS.text, backgroundColor: COLORS.text, height: 34 }]}
                onPress={() => setExpanded(!expanded)}
              >
                <Text style={[styles.actionBtnText, { color: COLORS.white }]}>{expanded ? 'Ocultar' : 'Detalles'}</Text>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={COLORS.white} />
              </TouchableOpacity>

              {/* ACCIONES RÁPIDAS DIRECTAS (No requieren forzar expansión) */}
              {isPending && (
                <>
                  {/* Grupo 1: Mantenimiento, Sala Especial -> Procesar */}
                  {(item.category === 'maintenance' || (item.category === 'rooms' && item.metadata?.requires_secretaria_general)) && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.processBtn, { height: 34 }]}
                      onPress={() => onUpdateStatus(item, 'en_progreso')}
                    >
                      <Ionicons name="play-outline" size={15} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Procesar</Text>
                    </TouchableOpacity>
                  )}

                  {/* Grupo 2: Visitantes, Parqueadero, Sala Estándar -> Aprobar directo */}
                  {(item.category === 'visitors' || item.category === 'parking' || (item.category === 'rooms' && !item.metadata?.requires_secretaria_general)) && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.successBtn, { height: 34 }]}
                      onPress={() => onUpdateStatus(item, 'resuelto')}
                    >
                      <Ionicons name="checkmark-outline" size={15} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Aprobar</Text>
                    </TouchableOpacity>
                  )}

                  {/* Grupo 3: Transporte con Asignación de Conductor */}
                  {item.category === 'transport' && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.successBtn, { height: 34 }]}
                      onPress={() => onAssignDriver && onAssignDriver(item)}
                    >
                      <Ionicons name="car-outline" size={15} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Asignar</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {isInProgress && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.successBtn, { height: 34 }]}
                  onPress={() => onUpdateStatus(item, 'resuelto')}
                >
                  <Ionicons name="checkmark-done-outline" size={15} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Finalizar</Text>
                </TouchableOpacity>
              )}

              {/* Botón de Rechazo (Equis Roja) accesible directamente si la solicitud no está cerrada */}
              {!isClosed && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.rejectBtn, { height: 34 }]}
                  onPress={() => onUpdateStatus(item, 'rechazado')}
                >
                  <Ionicons name="close-outline" size={15} color={COLORS.white} />
                  <Text style={[styles.actionBtnText, { color: COLORS.white }]}>Rechazar</Text>
                </TouchableOpacity>
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
