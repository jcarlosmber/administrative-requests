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
  const params = useLocalSearchParams<{ 
    status?: string; 
    priority?: string; 
    service?: string; 
    time?: string; 
    today?: string; 
    id?: string; 
    t?: string; 
  }>();
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
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPlate, setDriverPlate] = useState('');
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [serviceEmails, setServiceEmails] = useState<ServiceEmail[]>([]);
  const [drawerItem, setDrawerItem] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // Cálculo responsivo: tarjetas más amplias y cómodas de leer (ancho mínimo mayor)
  const numCardCols = useMemo(() => {
    if (!isDesktop) return 1;
    if (width >= 2100) return 4;
    if (width >= 1550) return 3;
    return 2;
  }, [isDesktop, width]);

  const maxCardWidth = useMemo(() => {
    if (!isDesktop || numCardCols <= 1) return undefined;
    const availableWidth = width - 300 - 50; // Sidebar (300) + Padding horizontal (25*2)
    const gapTotal = (numCardCols - 1) * 16;
    return Math.floor((availableWidth - gapTotal) / numCardCols);
  }, [isDesktop, numCardCols, width]);

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

  // Contadores dinámicos por categoría (sin sumar rechazados)
  const isRejectedStatus = (s: string) => ['rechazado', 'rechazada', 'rejected'].includes((s || '').toLowerCase().trim());

  const categoryCounts = useMemo(() => {
    const validRequests = requests.filter(r => !isRejectedStatus(r.status));
    const counts: Record<string, { total: number; pending: number }> = {
      Todas: { total: validRequests.length, pending: requests.filter(r => (r.status || '').toLowerCase().trim() === 'pendiente').length },
      Visitantes: { total: 0, pending: 0 },
      Transporte: { total: 0, pending: 0 },
      Mantenimiento: { total: 0, pending: 0 },
      Salas: { total: 0, pending: 0 },
      Parqueadero: { total: 0, pending: 0 },
    };
    requests.forEach(r => {
      if (isRejectedStatus(r.status)) return; // Los rechazados no los sumes al total de categorías
      const catKey = {
        visitors: 'Visitantes',
        transport: 'Transporte',
        maintenance: 'Mantenimiento',
        rooms: 'Salas',
        parking: 'Parqueadero'
      }[r.category];
      if (catKey && counts[catKey]) {
        counts[catKey].total += 1;
        if ((r.status || '').toLowerCase().trim() === 'pendiente') {
          counts[catKey].pending += 1;
        }
      }
    });
    return counts;
  }, [requests]);

  // Contadores dinámicos por flujo de trabajo (Segmented Tabs)
  const workflowCounts = useMemo(() => {
    const counts = {
      Todos: requests.filter(r => !isRejectedStatus(r.status)).length, // No sumar rechazados en 'Todos'
      Pendiente: 0,
      'En Progreso': 0,
      Aprobado: 0,
      Rechazado: 0,
    };
    requests.forEach(r => {
      const s = (r.status || '').toLowerCase().trim();
      if (s === 'pendiente' || s === 'pending') {
        counts.Pendiente += 1;
      } else if (['en_progreso', 'en progreso', 'en curso', 'en_curso', 'in_progress'].includes(s)) {
        counts['En Progreso'] += 1;
      } else if (['resuelto', 'aprobado', 'resuelta', 'aprobada', 'completada'].includes(s)) {
        counts.Aprobado += 1;
      } else if (isRejectedStatus(s)) {
        counts.Rechazado += 1;
      }
    });
    return counts;
  }, [requests]);

  const hasActiveFilters = searchQuery.trim() !== '' || serviceFilter !== 'Todas' || statusFilter !== 'Todos' || priorityFilter !== 'Todas' || timeFilter !== 'Todos';

  const resetAllFilters = () => {
    setSearchQuery('');
    setServiceFilter('Todas');
    setStatusFilter('Todos');
    setPriorityFilter('Todas');
    setTimeFilter('Todos');
    setCustomDates({ start: '', end: '' });
  };

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
    if (params.status !== undefined || params.priority !== undefined || params.service !== undefined || params.time !== undefined || params.t !== undefined) {
      // 1. Estado
      if (params.status) {
        const statusValue = String(params.status).toLowerCase().trim();
        if (statusValue === 'pendiente') {
          setStatusFilter('Pendiente');
        } else if (statusValue === 'en_progreso' || statusValue === 'en curso' || statusValue === 'en_curso') {
          setStatusFilter('En Progreso');
        } else if (statusValue === 'resuelto' || statusValue === 'aprobado') {
          setStatusFilter('Aprobado');
        } else if (statusValue === 'rechazado') {
          setStatusFilter('Rechazado');
        } else if (statusValue === 'todos' || statusValue === 'todas') {
          setStatusFilter('Todos');
        }
      } else if (params.t) {
        setStatusFilter('Todos');
      }

      // 2. Servicios
      if (params.service) {
        const servValue = String(params.service).trim();
        const foundCategory = CATEGORIES.find(c => c.toLowerCase() === servValue.toLowerCase());
        setServiceFilter(foundCategory || 'Todas');
      } else if (params.t) {
        setServiceFilter('Todas');
      }

      // 3. Prioridad
      if (params.priority) {
        const prioValue = String(params.priority).toLowerCase().trim();
        if (prioValue === 'alta') setPriorityFilter('Alta');
        else if (prioValue === 'media') setPriorityFilter('Media');
        else if (prioValue === 'baja') setPriorityFilter('Baja');
        else setPriorityFilter('Todas');
      } else if (params.t) {
        setPriorityFilter('Todas');
      }

      // 4. Periodo / Tiempo
      if (params.time) {
        const timeValue = String(params.time).trim();
        const foundTime = TIME_OPTIONS.find(t => t.toLowerCase() === timeValue.toLowerCase());
        setTimeFilter(foundTime || 'Todos');
      } else if (params.t) {
        setTimeFilter('Todos');
      }

      // 5. Limpiar búsqueda y fechas personalizadas
      setSearchQuery('');
      setCustomDates({ start: '', end: '' });
    }
  }, [params.status, params.priority, params.service, params.time, params.t]);

  useEffect(() => {
    if (params.id && requests.length > 0) {
      const found = requests.find(r => r.id === params.id);
      if (found) {
        setDrawerItem(mapRequestToUI(found));
      }
    }
  }, [params.id, requests]);

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
        
        {isDesktop && (
          <Sidebar 
            serviceFilter={serviceFilter} 
            setServiceFilter={setServiceFilter} 
            categoryCounts={categoryCounts}
          />
        )}

        <View style={{ flex: 1, ...(Platform.OS === 'web' && viewMode === 'table' ? { overflowX: 'auto' } : {}) }}>
          <FlatList
            key={viewMode === 'table' ? 'table-view' : `cards-${numCardCols}`}
            numColumns={viewMode === 'table' ? 1 : numCardCols}
            columnWrapperStyle={viewMode === 'cards' && numCardCols > 1 ? { paddingHorizontal: 25, gap: 16 } : undefined}
            ListHeaderComponent={
              <View style={styles.headerContainer}>
                <HeroSection 
                  isDesktop={isDesktop} 
                  totalRequests={requests.length} 
                  pendingCount={workflowCounts.Pendiente} 
                  inProgressCount={workflowCounts['En Progreso']}
                  onSelectStatus={setStatusFilter}
                />
                
                <View style={styles.contentPadding}>
                  {/* Pestañas por Flujo de Trabajo (Segmented Tabs) */}
                  <WorkflowSegmentedTabs
                    selected={statusFilter}
                    onSelect={setStatusFilter}
                    counts={workflowCounts}
                    isDesktop={isDesktop}
                  />

                  {/* Píldoras de Servicios Compactas */}
                  <CategoryPillsBar
                    selected={serviceFilter}
                    onSelect={setServiceFilter}
                    badges={categoryCounts}
                  />

                  {/* Toolbar Unificada: Búsqueda, Filtros y Acciones */}
                  <QuickFiltersToolbar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    priorityFilter={priorityFilter}
                    setPriorityFilter={setPriorityFilter}
                    timeFilter={timeFilter}
                    setTimeFilter={setTimeFilter}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    onOpenCustomDate={() => setShowCustomDateModal(true)}
                    onExportCSV={exportToCSV}
                    hasActiveFilters={hasActiveFilters}
                    onResetFilters={resetAllFilters}
                    totalResults={filteredData.length}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                  />
                </View>

                {/* Cabecera de Tabla si la vista activa es Tabla */}
                {viewMode === 'table' && filteredData.length > 0 && (
                  <RequestTableHeader />
                )}
              </View>
            }
            data={filteredData}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              viewMode === 'table' ? (
                <RequestTableRow 
                  item={mapRequestToUI(item)} 
                  onUpdateStatus={askConfirmation} 
                  onAssignDriver={(reqItem: any) => setDriverModal({ visible: true, item: reqItem })}
                  onOpenDetail={(reqItem: any) => setDrawerItem(reqItem)}
                />
              ) : (
                <RequestListItem 
                  item={mapRequestToUI(item)} 
                  onUpdateStatus={askConfirmation} 
                  onRefresh={fetchRequests} 
                  initiallyExpanded={params.id === item.id} 
                  onSuccessAction={(msg: string) => setSuccessModal({ visible: true, message: msg })} 
                  setViewerImage={setViewerImage} 
                  onAssignDriver={(reqItem: any) => setDriverModal({ visible: true, item: reqItem })}
                  onOpenDetail={(reqItem: any) => setDrawerItem(reqItem)}
                  maxCardWidth={maxCardWidth}
                  numCols={numCardCols}
                />
              )
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                padding: 40,
                alignItems: 'center',
                justifyContent: 'center',
                marginHorizontal: 25,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                gap: 12
              }}>
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#F1F5F9',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Ionicons name="search-outline" size={26} color="#64748B" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  No se encontraron solicitudes
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', maxWidth: 340 }}>
                  Intenta ajustar los filtros de búsqueda, cambiar la pestaña de estado o restablecer los criterios.
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    onPress={resetAllFilters}
                    style={{
                      marginTop: 6,
                      backgroundColor: '#0F172A',
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                      Restablecer todos los filtros
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
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

      {/* Modal Centrado de Detalle Completo de Solicitud */}
      <RequestDetailModal
        visible={drawerItem !== null}
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onUpdateStatus={askConfirmation}
        onAssignDriver={(reqItem: any) => {
          setDrawerItem(null);
          setDriverModal({ visible: true, item: reqItem });
        }}
        setViewerImage={setViewerImage}
        onRefresh={fetchRequests}
        onSuccessAction={(msg: string) => setSuccessModal({ visible: true, message: msg })}
      />

    </View>
  );
}

function Sidebar({ 
  serviceFilter, 
  setServiceFilter, 
  categoryCounts 
}: { 
  serviceFilter: string; 
  setServiceFilter: (cat: string) => void; 
  categoryCounts?: Record<string, { total: number; pending: number }>;
}) {
  const router = useRouter();

  const TABS = [
    { id: 'Todas', label: 'Consolidado General', icon: 'layers', color: '#6366F1', bgLight: 'rgba(99, 102, 241, 0.2)' },
    { id: 'Visitantes', label: 'Control de Visitantes', icon: 'people', color: '#F43F5E', bgLight: 'rgba(244, 63, 94, 0.2)' },
    { id: 'Mantenimiento', label: 'Mantenimiento Locativo', icon: 'construct', color: '#14B8A6', bgLight: 'rgba(20, 184, 166, 0.2)' },
    { id: 'Parqueadero', label: 'Acceso Parqueadero', icon: 'car', color: '#F97316', bgLight: 'rgba(249, 115, 22, 0.2)' },
    { id: 'Salas', label: 'Reserva de Salas', icon: 'easel', color: '#A855F7', bgLight: 'rgba(168, 85, 247, 0.2)' },
    { id: 'Transporte', label: 'Flota de Transporte', icon: 'car-sport', color: '#0EA5E9', bgLight: 'rgba(14, 165, 233, 0.2)' },
  ];

  return (
    <View style={styles.sidebar}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
      <View style={styles.sidebarContent}>
        <View style={styles.logoCircle}>
          <Ionicons name="layers" size={40} color={COLORS.white} />
        </View>
        <Text style={styles.sideTitle}>Gestión Operativa</Text>
        <Text style={styles.sideSubTitle}>Panel de Administración</Text>
        <View style={styles.sideDivider} />
        
        <View style={{ gap: 8, width: '100%' }}>
          {TABS.map(tab => {
            const active = serviceFilter === tab.id;
            const count = categoryCounts?.[tab.id]?.pending || 0;
            return (
              <SidebarTabButton 
                key={tab.id}
                label={tab.label} 
                icon={tab.icon} 
                active={active} 
                color={tab.color}
                bgLight={tab.bgLight}
                badge={count > 0 ? count : undefined}
                onPress={() => setServiceFilter(tab.id)} 
              />
            );
          })}
        </View>

        <View style={{ marginTop: 'auto', width: '100%', paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }}>
          <TouchableOpacity
            onPress={() => router.replace('/dashboard')}
            style={styles.sideBackBtn}
          >
            <Ionicons name="arrow-back-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Portal Funcionario</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SidebarTabButton({ label, icon, active, badge, color, bgLight, onPress }: any) {
  return (
    <TouchableOpacity 
      style={[
        styles.sideTabBtn, 
        active 
          ? [styles.sideTabBtnActive, { backgroundColor: color || COLORS.white, shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 }, Platform.OS === 'web' ? { boxShadow: `0 4px 14px ${color}55` } : {}] 
          : { backgroundColor: 'transparent' }
      ]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? 'rgba(255,255,255,0.22)' : (bgLight || 'rgba(255,255,255,0.06)'),
      }}>
        <Ionicons name={icon} size={18} color={active ? '#FFFFFF' : (color || 'rgba(255,255,255,0.7)')} />
      </View>
      <Text 
        style={[
          styles.sideTabLabel, 
          active ? { color: '#FFFFFF', fontWeight: '800' } : { color: 'rgba(255,255,255,0.85)' }, 
          { flex: 1 }
        ]} 
        numberOfLines={1}
      >
        {label}
      </Text>
      {badge !== undefined && (
        <View style={[
          styles.sideBadge, 
          active 
            ? { backgroundColor: 'rgba(255,255,255,0.25)' } 
            : { backgroundColor: 'rgba(245, 158, 11, 0.25)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.5)' }
        ]}>
          <Text style={[
            styles.sideBadgeText, 
            active ? { color: '#FFFFFF' } : { color: '#FBBF24' }
          ]}>
            {badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function HeroSection({ isDesktop, totalRequests, pendingCount, inProgressCount, onSelectStatus }: any) {
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
            <Text style={styles.heroKicker}>SASGE • ADMINISTRACIÓN CENTRAL</Text>
            <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit>Gestión de Solicitudes</Text>
            <Text style={styles.heroSub} numberOfLines={2}>
              Supervisión, asignación de despachos y auditoría de requerimientos
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: isDesktop ? 'auto' : 'flex-end', flexWrap: 'wrap' }}>
            {pendingCount > 0 && (
              <TouchableOpacity 
                onPress={() => onSelectStatus && onSelectStatus('Pendiente')}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(245, 158, 11, 0.16)',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(245, 158, 11, 0.35)',
                }}
              >
                <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                <Text style={{ color: '#FCD34D', fontSize: 12, fontWeight: '800' }}>
                  {pendingCount} por atender
                </Text>
              </TouchableOpacity>
            )}

            {inProgressCount > 0 && (
              <TouchableOpacity 
                onPress={() => onSelectStatus && onSelectStatus('En Progreso')}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(59, 130, 246, 0.16)',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(59, 130, 246, 0.35)',
                }}
              >
                <Ionicons name="sync" size={16} color="#60A5FA" />
                <Text style={{ color: '#93C5FD', fontSize: 12, fontWeight: '800' }}>
                  {inProgressCount} en progreso
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.logoutBtn, { backgroundColor: '#3B82F6', borderColor: '#2563EB' }]} 
              onPress={() => router.replace('/dashboard')}
              accessibilityLabel="Portal Funcionario"
            >
              <Ionicons name="home" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.logoutBtn} 
              onPress={async () => {
                await supabase.auth.signOut();
                router.replace('/login');
              }}
              accessibilityLabel="Cerrar sesión"
            >
              <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function WorkflowSegmentedTabs({
  selected,
  onSelect,
  counts,
  isDesktop
}: {
  selected: string;
  onSelect: (val: string) => void;
  counts: Record<string, number>;
  isDesktop: boolean;
}) {
  const tabs = [
    { id: 'Todos', label: 'Todas', icon: 'layers-outline', count: counts.Todos || 0, color: '#0F172A', activeBg: '#0F172A', badgeColor: '#475569', badgeBg: '#F1F5F9', shadowColor: 'rgba(15,23,42,0.35)' },
    { id: 'Pendiente', label: 'Pendientes', icon: 'flash-outline', count: counts.Pendiente || 0, color: '#D97706', activeBg: '#D97706', badgeColor: '#B45309', badgeBg: '#FEF3C7', shadowColor: 'rgba(217,119,6,0.35)' },
    { id: 'En Progreso', label: 'En Progreso', icon: 'time-outline', count: counts['En Progreso'] || 0, color: '#2563EB', activeBg: '#2563EB', badgeColor: '#1D4ED8', badgeBg: '#EFF6FF', shadowColor: 'rgba(37,99,235,0.35)' },
    { id: 'Aprobado', label: 'Aprobadas', icon: 'checkmark-circle-outline', count: counts.Aprobado || 0, color: '#059669', activeBg: '#059669', badgeColor: '#047857', badgeBg: '#ECFDF5', shadowColor: 'rgba(5,150,105,0.35)' },
    { id: 'Rechazado', label: 'Rechazadas', icon: 'close-circle-outline', count: counts.Rechazado || 0, color: '#DC2626', activeBg: '#DC2626', badgeColor: '#B91C1C', badgeBg: '#FEF2F2', shadowColor: 'rgba(220,38,38,0.35)' },
  ];

  return (
    <View style={{
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 6,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      marginTop: 14,
      marginBottom: 12,
      ...(Platform.OS === 'web' ? { boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)' } : {}),
    }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          minWidth: isDesktop ? '100%' : undefined,
          justifyContent: isDesktop ? 'space-between' : 'flex-start',
        }}
      >
        {tabs.map((tab) => {
          const isSelected = selected === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onSelect(tab.id)}
              style={({ hovered }: any) => [
                {
                  flex: isDesktop ? 1 : undefined,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                  borderRadius: 12,
                  backgroundColor: isSelected
                    ? tab.activeBg
                    : hovered
                    ? tab.badgeBg
                    : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: isSelected
                    ? tab.activeBg
                    : hovered
                    ? tab.color + '50'
                    : 'transparent',
                } as any,
                isSelected && (Platform.OS === 'web' ? { boxShadow: `0 4px 14px ${tab.shadowColor}` } : {}),
                hovered && !isSelected && (Platform.OS === 'web' ? { transform: [{ translateY: -1 }], boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : {}),
                Platform.OS === 'web' ? { cursor: 'pointer' } : {},
              ]}
            >
              {({ hovered }: any) => (
                <>
                  <Ionicons
                    name={tab.icon as any}
                    size={18}
                    color={isSelected ? '#FFFFFF' : hovered ? tab.color : tab.color}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: isSelected ? '800' : '700',
                      color: isSelected ? '#FFFFFF' : hovered ? tab.color : '#334155',
                    }}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={{
                      minWidth: 26,
                      height: 24,
                      paddingHorizontal: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.25)'
                        : (tab.badgeBg || '#F1F5F9'),
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: isSelected ? 'transparent' : (tab.badgeColor + '30'),
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: isSelected ? '#FFFFFF' : (tab.badgeColor || '#475569'),
                      }}
                    >
                      {tab.count}
                    </Text>
                  </View>
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function CategoryPillsBar({
  selected,
  onSelect,
  badges,
}: {
  selected: string;
  onSelect: (cat: string) => void;
  badges: Record<string, { total: number; pending: number }>;
}) {
  const categories = [
    { 
      key: 'Todas', 
      label: 'Todos los servicios', 
      icon: 'apps-outline', 
      color: '#334155', 
      colorDark: '#0F172A',
      bgLight: '#F1F5F9', 
      bgHover: '#E2E8F0',
      borderLight: '#CBD5E1', 
      shadow: 'rgba(51, 65, 85, 0.3)' 
    },
    { 
      key: 'Visitantes', 
      label: 'Visitantes', 
      icon: 'people-outline', 
      color: '#E11D48', 
      colorDark: '#9F1239',
      bgLight: '#FFF1F2', 
      bgHover: '#FFE4E6',
      borderLight: '#FECDD3', 
      shadow: 'rgba(225, 29, 72, 0.35)' 
    },
    { 
      key: 'Transporte', 
      label: 'Transporte', 
      icon: 'car-outline', 
      color: '#0284C7', 
      colorDark: '#0369A1',
      bgLight: '#F0F9FF', 
      bgHover: '#E0F2FE',
      borderLight: '#BAE6FD', 
      shadow: 'rgba(2, 132, 199, 0.35)' 
    },
    { 
      key: 'Mantenimiento', 
      label: 'Mantenimiento', 
      icon: 'construct-outline', 
      color: '#0D9488', 
      colorDark: '#0F766E',
      bgLight: '#F0FDFA', 
      bgHover: '#CCFBF1',
      borderLight: '#99F6E4', 
      shadow: 'rgba(13, 148, 136, 0.35)' 
    },
    { 
      key: 'Salas', 
      label: 'Salas', 
      icon: 'easel-outline', 
      color: '#7C3AED', 
      colorDark: '#6D28D9',
      bgLight: '#F5F3FF', 
      bgHover: '#EDE9FE',
      borderLight: '#DDD6FE', 
      shadow: 'rgba(124, 58, 237, 0.35)' 
    },
    { 
      key: 'Parqueadero', 
      label: 'Parqueadero', 
      icon: 'car-sport-outline', 
      color: '#EA580C', 
      colorDark: '#C2410C',
      bgLight: '#FFF7ED', 
      bgHover: '#FFEDD5',
      borderLight: '#FED7AA', 
      shadow: 'rgba(234, 88, 12, 0.35)' 
    },
  ];

  return (
    <View style={{ marginBottom: 14 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingVertical: 4, paddingHorizontal: 2 }}
      >
        {categories.map((cat) => {
          const isSelected = selected === cat.key;
          const count = badges[cat.key]?.total ?? 0;
          const pending = badges[cat.key]?.pending ?? 0;

          return (
            <Pressable
              key={cat.key}
              onPress={() => onSelect(cat.key)}
              style={({ hovered }: any) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 24,
                  backgroundColor: isSelected
                    ? cat.color
                    : hovered
                    ? cat.bgHover
                    : cat.bgLight,
                  borderWidth: 1.8,
                  borderColor: isSelected
                    ? cat.color
                    : hovered
                    ? cat.color
                    : cat.borderLight,
                } as any,
                isSelected && (Platform.OS === 'web' ? { boxShadow: `0 4px 14px ${cat.shadow}` } : {}),
                hovered && !isSelected && (Platform.OS === 'web' ? { transform: [{ translateY: -2 }], boxShadow: `0 4px 12px ${cat.shadow}` } : {}),
                Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.18s ease-in-out' } : {},
              ]}
            >
              {({ hovered }: any) => (
                <>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.22)' : '#FFFFFF',
                    }}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={15}
                      color={isSelected ? '#FFFFFF' : cat.color}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 13.5,
                      fontWeight: isSelected ? '800' : '700',
                      color: isSelected ? '#FFFFFF' : cat.colorDark,
                    }}
                  >
                    {cat.label}
                  </Text>
                  <View
                    style={{
                      minWidth: 24,
                      height: 22,
                      paddingHorizontal: 7,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 11,
                      backgroundColor: isSelected
                        ? 'rgba(255, 255, 255, 0.25)'
                        : '#FFFFFF',
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: isSelected ? 'transparent' : cat.borderLight,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '800',
                        color: isSelected ? '#FFFFFF' : cat.colorDark,
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                  {pending > 0 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: isSelected ? '#FFFFFF' : '#FEF3C7',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: isSelected ? '#FFFFFF' : '#F59E0B',
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#F59E0B',
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: '#B45309',
                        }}
                      >
                        {pending}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function QuickFiltersToolbar({
  searchQuery,
  setSearchQuery,
  priorityFilter,
  setPriorityFilter,
  timeFilter,
  setTimeFilter,
  sortOrder,
  setSortOrder,
  onOpenCustomDate,
  onExportCSV,
  hasActiveFilters,
  onResetFilters,
  totalResults,
  viewMode,
  setViewMode,
}: any) {
  const [searchFocused, setSearchFocused] = useState(false);

  // Paleta para prioridades
  const getPriorityStyle = (p: string, active: boolean, hovered: boolean) => {
    if (active) {
      if (p === 'Alta') return { bg: '#DC2626', color: '#FFFFFF', shadow: 'rgba(220,38,38,0.35)' };
      if (p === 'Media') return { bg: '#D97706', color: '#FFFFFF', shadow: 'rgba(217,119,6,0.35)' };
      if (p === 'Baja') return { bg: '#2563EB', color: '#FFFFFF', shadow: 'rgba(37,99,235,0.35)' };
      return { bg: '#0F172A', color: '#FFFFFF', shadow: 'rgba(15,23,42,0.35)' };
    }
    if (hovered) {
      if (p === 'Alta') return { bg: '#FEF2F2', color: '#DC2626' };
      if (p === 'Media') return { bg: '#FEF3C7', color: '#D97706' };
      if (p === 'Baja') return { bg: '#EFF6FF', color: '#2563EB' };
      return { bg: '#F1F5F9', color: '#0F172A' };
    }
    return { bg: 'transparent', color: '#64748B' };
  };

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      padding: 14,
      gap: 14,
      marginBottom: 16,
      ...(Platform.OS === 'web' ? { boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)' } : {}),
    }}>
      {/* Fila 1: Buscador + Botón CSV */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#F8FAFC',
          borderRadius: 14,
          paddingHorizontal: 14,
          height: 46,
          borderWidth: 1.5,
          borderColor: searchFocused ? '#3B82F6' : '#E2E8F0',
          ...(Platform.OS === 'web' && searchFocused ? { boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)' } : {}),
        }}>
          <Ionicons name="search" size={19} color={searchFocused ? '#3B82F6' : '#64748B'} />
          <TextInput
            style={{
              flex: 1,
              paddingHorizontal: 10,
              fontSize: 14,
              color: '#0F172A',
              fontWeight: '600',
              ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {} as any),
            }}
            placeholder="Buscar por radicado, solicitante, placa, visitante, detalle..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <Pressable
          onPress={onExportCSV}
          style={({ hovered }: any) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: hovered ? '#047857' : '#059669',
              paddingHorizontal: 18,
              height: 46,
              borderRadius: 14,
            } as any,
            Platform.OS === 'web' ? { cursor: 'pointer' } : {},
            hovered && (Platform.OS === 'web' ? { transform: [{ translateY: -1 }], boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)' } : {}),
          ]}
        >
          <Ionicons name="download-outline" size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
            Exportar CSV
          </Text>
        </Pressable>
      </View>

      {/* Fila 2: Filtros Organizados con Etiquetas Claras, Más Grandes y Mouseover */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          
          {/* Selector de Prioridad */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#FFFFFF',
            padding: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#CBD5E1',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 4 }}>
              <Ionicons name="flag" size={14} color="#EF4444" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569' }}>
                Prioridad:
              </Text>
            </View>
            {PRIORITY_OPTIONS.map((p) => {
              const active = priorityFilter === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPriorityFilter(p)}
                  style={({ hovered }: any) => {
                    const st = getPriorityStyle(p, active, hovered);
                    return [
                      {
                        paddingHorizontal: 12,
                        paddingVertical: 6.5,
                        borderRadius: 8,
                        backgroundColor: st.bg,
                      } as any,
                      active && (Platform.OS === 'web' ? { boxShadow: `0 2px 8px ${st.shadow}` } : {}),
                      Platform.OS === 'web' ? { cursor: 'pointer' } : {},
                    ];
                  }}
                >
                  {({ hovered }: any) => {
                    const st = getPriorityStyle(p, active, hovered);
                    return (
                      <Text style={{ fontSize: 12.5, fontWeight: active ? '800' : '700', color: st.color }}>
                        {p}
                      </Text>
                    );
                  }}
                </Pressable>
              );
            })}
          </View>

          {/* Selector de Período / Fecha */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#FFFFFF',
            padding: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#CBD5E1',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 4 }}>
              <Ionicons name="calendar" size={14} color="#3B82F6" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569' }}>
                Período:
              </Text>
            </View>
            {TIME_OPTIONS.map((t) => {
              const active = timeFilter === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    if (t === 'Personalizado') {
                      onOpenCustomDate();
                    } else {
                      setTimeFilter(t);
                    }
                  }}
                  style={({ hovered }: any) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 6.5,
                      borderRadius: 8,
                      backgroundColor: active ? '#2563EB' : hovered ? '#EFF6FF' : 'transparent',
                    } as any,
                    active && (Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)' } : {}),
                    Platform.OS === 'web' ? { cursor: 'pointer' } : {},
                  ]}
                >
                  {({ hovered }: any) => (
                    <Text style={{
                      fontSize: 12.5,
                      fontWeight: active ? '800' : '700',
                      color: active ? '#FFFFFF' : hovered ? '#2563EB' : '#64748B',
                    }}>
                      {t}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Selector de Orden */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#FFFFFF',
            padding: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#CBD5E1',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 4 }}>
              <Ionicons name="swap-vertical" size={14} color="#8B5CF6" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569' }}>
                Ordenar:
              </Text>
            </View>
            {SORT_OPTIONS.map((s) => {
              const active = sortOrder === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSortOrder(s.id)}
                  style={({ hovered }: any) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 6.5,
                      borderRadius: 8,
                      backgroundColor: active ? '#4F46E5' : hovered ? '#EEF2FF' : 'transparent',
                    } as any,
                    active && (Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)' } : {}),
                    Platform.OS === 'web' ? { cursor: 'pointer' } : {},
                  ]}
                >
                  {({ hovered }: any) => (
                    <Text style={{
                      fontSize: 12.5,
                      fontWeight: active ? '800' : '700',
                      color: active ? '#FFFFFF' : hovered ? '#4F46E5' : '#64748B',
                    }}>
                      {s.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Botón Reset / Limpiar si hay filtros activos */}
          {hasActiveFilters && (
            <Pressable
              onPress={onResetFilters}
              style={({ hovered }: any) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: hovered ? '#FEE2E2' : '#FEF2F2',
                  borderWidth: 1.5,
                  borderColor: hovered ? '#F87171' : '#FECACA',
                } as any,
                Platform.OS === 'web' ? { cursor: 'pointer' } : {},
                hovered && (Platform.OS === 'web' ? { transform: [{ translateY: -1 }], boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)' } : {}),
              ]}
            >
              <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>
                Limpiar filtros
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center', flexWrap: 'wrap' }}>
          {/* Toggle de Vista: Tarjetas vs Tabla */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F1F5F9',
            borderRadius: 12,
            padding: 3,
            borderWidth: 1,
            borderColor: '#CBD5E1',
            gap: 2,
          }}>
            <Pressable
              onPress={() => setViewMode && setViewMode('cards')}
              style={({ hovered }: any) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 9,
                  backgroundColor: viewMode === 'cards' ? '#FFFFFF' : hovered ? '#E2E8F0' : 'transparent',
                } as any,
                viewMode === 'cards' && (Platform.OS === 'web' ? { boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)' } : {}),
                Platform.OS === 'web' ? { cursor: 'pointer' } : {},
              ]}
            >
              <Ionicons 
                name="grid-outline" 
                size={15} 
                color={viewMode === 'cards' ? '#0F172A' : '#64748B'} 
              />
              <Text style={{
                fontSize: 12.5,
                fontWeight: viewMode === 'cards' ? '800' : '600',
                color: viewMode === 'cards' ? '#0F172A' : '#64748B',
              }}>
                Tarjetas
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setViewMode && setViewMode('table')}
              style={({ hovered }: any) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 9,
                  backgroundColor: viewMode === 'table' ? '#FFFFFF' : hovered ? '#E2E8F0' : 'transparent',
                } as any,
                viewMode === 'table' && (Platform.OS === 'web' ? { boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)' } : {}),
                Platform.OS === 'web' ? { cursor: 'pointer' } : {},
              ]}
            >
              <Ionicons 
                name="list-outline" 
                size={16} 
                color={viewMode === 'table' ? '#0F172A' : '#64748B'} 
              />
              <Text style={{
                fontSize: 12.5,
                fontWeight: viewMode === 'table' ? '800' : '600',
                color: viewMode === 'table' ? '#0F172A' : '#64748B',
              }}>
                Tabla
              </Text>
            </Pressable>
          </View>

          {/* Contador de Registros */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#F1F5F9',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}>
            <Ionicons name="document-text-outline" size={15} color="#475569" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>
              {totalResults} {totalResults === 1 ? 'registro' : 'registros'}
            </Text>
          </View>
        </View>
      </View>
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

const getCategoryIcon = (category?: string, type?: string) => {
  const cat = (category || type || '').toLowerCase();
  if (cat.includes('sala')) return 'easel-outline';
  if (cat.includes('transporte')) return 'car-outline';
  if (cat.includes('mantenimiento')) return 'construct-outline';
  if (cat.includes('visitante')) return 'people-outline';
  if (cat.includes('parqueadero')) return 'car-sport-outline';
  return 'document-text-outline';
};

const getInitials = (name?: string) => {
  if (!name || name === 'Funcionario') return 'FN';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getPriorityTheme = (priority: string) => {
  const p = (priority || '').toLowerCase();
  if (p === 'alta') return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', icon: 'alert-circle' as const };
  if (p === 'media') return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', icon: 'warning-outline' as const };
  return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0', icon: 'checkmark-circle-outline' as const };
};

const getStatusTheme = (status: string) => {
  const s = (status || '').toLowerCase().replace(' ', '_');
  if (['en_progreso', 'en_curso', 'en_proceso', 'in_progress'].includes(s)) {
    return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', dot: '#3B82F6' };
  }
  if (['pendiente', 'pending'].includes(s)) {
    return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' };
  }
  if (['resuelto', 'resuelta', 'completada', 'aprobada', 'aprobado', 'approved'].includes(s)) {
    return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', dot: '#22C55E' };
  }
  if (['rechazado', 'rechazada', 'rejected'].includes(s)) {
    return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#EF4444' };
  }
  return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0', dot: '#94A3B8' };
};

// Paleta con fondo muted medio propio con el color de cada servicio para Cards y Filas
const getCategoryCardTheme = (category?: string, type?: string) => {
  const cat = (category || type || '').toLowerCase();
  
  if (cat.includes('visit') || cat === 'visitors') {
    return {
      bg: '#FFE4E6', // Muted suave rosa (Rose 100)
      hoverBg: '#FECDD3', // Hover interactivo (Rose 200)
      border: 'transparent',
      borderExpanded: 'transparent',
      headerBg: '#FFE4E6',
      color: '#E11D48',
      colorDark: '#9F1239',
      accentBar: 'transparent',
      shadow: 'rgba(225, 29, 72, 0.07)',
    };
  }
  
  if (cat.includes('transp') || cat === 'transport') {
    return {
      bg: '#E0F2FE', // Muted suave azul cielo (Sky 100)
      hoverBg: '#BAE6FD', // Hover interactivo (Sky 200)
      border: 'transparent',
      borderExpanded: 'transparent',
      headerBg: '#E0F2FE',
      color: '#0284C7',
      colorDark: '#0369A1',
      accentBar: 'transparent',
      shadow: 'rgba(2, 132, 199, 0.07)',
    };
  }
  
  if (cat.includes('manten') || cat === 'maintenance') {
    return {
      bg: '#CCFBF1', // Muted suave verde agua/turquesa (Teal 100)
      hoverBg: '#99F6E4', // Hover interactivo (Teal 200)
      border: 'transparent',
      borderExpanded: 'transparent',
      headerBg: '#CCFBF1',
      color: '#0D9488',
      colorDark: '#0F766E',
      accentBar: 'transparent',
      shadow: 'rgba(13, 148, 136, 0.07)',
    };
  }
  
  if (cat.includes('sala') || cat === 'rooms') {
    return {
      bg: '#EDE9FE', // Muted suave violeta (Violet 100)
      hoverBg: '#DDD6FE', // Hover interactivo (Violet 200)
      border: 'transparent',
      borderExpanded: 'transparent',
      headerBg: '#EDE9FE',
      color: '#7C3AED',
      colorDark: '#6D28D9',
      accentBar: 'transparent',
      shadow: 'rgba(124, 58, 237, 0.07)',
    };
  }
  
  if (cat.includes('parque') || cat === 'parking') {
    return {
      bg: '#FFEDD5', // Muted suave naranja (Orange 100)
      hoverBg: '#FED7AA', // Hover interactivo (Orange 200)
      border: 'transparent',
      borderExpanded: 'transparent',
      headerBg: '#FFEDD5',
      color: '#EA580C',
      colorDark: '#C2410C',
      accentBar: 'transparent',
      shadow: 'rgba(234, 88, 12, 0.07)',
    };
  }
  
  return {
    bg: '#E2E8F0', // Muted slate por defecto (Slate 200)
    hoverBg: '#CBD5E1', // Hover interactivo (Slate 300)
    border: 'transparent',
    borderExpanded: 'transparent',
    headerBg: '#E2E8F0',
    color: '#3B82F6',
    colorDark: '#1E293B',
    accentBar: 'transparent',
    shadow: 'rgba(15, 23, 42, 0.05)',
  };
};

function RequestTableHeader() {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0F172A',
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 12,
      marginBottom: 8,
      marginHorizontal: 25,
      minWidth: 1080,
      gap: 12,
    }}>
      <View style={{ width: 140 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8 }}>RADICADO / FECHA</Text>
      </View>
      <View style={{ width: 145 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8 }}>SERVICIO</Text>
      </View>
      <View style={{ width: 210 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8 }}>SOLICITANTE</Text>
      </View>
      <View style={{ flex: 1, minWidth: 200 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8 }}>DETALLE DEL REQUERIMIENTO</Text>
      </View>
      <View style={{ width: 110 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8 }}>PRIORIDAD</Text>
      </View>
      <View style={{ width: 140 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8 }}>ESTADO / SLA</Text>
      </View>
      <View style={{ width: 175, alignItems: 'flex-end', paddingRight: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8 }}>ACCIONES</Text>
      </View>
    </View>
  );
}

function RequestTableRow({
  item,
  onUpdateStatus,
  onAssignDriver,
  onOpenDetail,
}: any) {
  const serviceTheme = getCategoryCardTheme(item.category, item.type);
  const priorityTheme = getPriorityTheme(item.priority);
  const statusTheme = getStatusTheme(item.status);
  const sla = getSLAInfo(item.created_at, item.status);
  const catIcon = getCategoryIcon(item.category, item.type);
  const initials = getInitials(item.user);

  const isPending = (item.status || '').toLowerCase() === 'pendiente';
  const isInProgress = ['en_progreso', 'en progreso', 'en curso'].includes((item.status || '').toLowerCase());

  return (
    <Pressable
      onPress={() => onOpenDetail && onOpenDetail(item)}
      style={({ hovered }: any) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: hovered ? serviceTheme.hoverBg : serviceTheme.bg,
          paddingVertical: 13,
          paddingHorizontal: 18,
          borderRadius: 14,
          marginBottom: 8,
          marginHorizontal: 25,
          minWidth: 1080,
          gap: 12,
          borderWidth: 0,
        } as any,
        Platform.OS === 'web' ? { 
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out',
          boxShadow: hovered ? `0 4px 14px ${serviceTheme.shadow}` : '0 1px 4px rgba(15, 23, 42, 0.04)'
        } : {},
      ]}
    >
      {/* 1. Radicado / Fecha */}
      <View style={{ width: 140 }}>
        <View style={{
          backgroundColor: '#0F172A',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          alignSelf: 'flex-start',
        }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
            #{String(item.id).slice(0, 8).toUpperCase()}
          </Text>
        </View>
        <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600', marginTop: 4 }}>
          {item.date || 'Reciente'}
        </Text>
      </View>

      {/* 2. Servicio */}
      <View style={{ width: 145 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 9,
          paddingVertical: 5,
          borderRadius: 8,
          borderWidth: 0,
          alignSelf: 'flex-start',
        }}>
          <Ionicons name={catIcon as any} size={14} color={serviceTheme.color} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: serviceTheme.colorDark }} numberOfLines={1}>
            {item.type}
          </Text>
        </View>
      </View>

      {/* 3. Solicitante */}
      <View style={{ width: 210, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: `${serviceTheme.color}18`,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 0,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: serviceTheme.color }}>
            {initials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
            {item.user}
          </Text>
          <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600' }} numberOfLines={1}>
            {item.dependency || 'General'}
          </Text>
        </View>
      </View>

      {/* 4. Detalle / Asunto */}
      <View style={{ flex: 1, minWidth: 200, paddingRight: 8 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#1E293B', lineHeight: 17 }} numberOfLines={2}>
          {item.detail || item.description || 'Sin detalle adicional'}
        </Text>
      </View>

      {/* 5. Prioridad */}
      <View style={{ width: 110 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
          backgroundColor: priorityTheme.bg,
          borderWidth: 1,
          borderColor: priorityTheme.border,
          alignSelf: 'flex-start',
        }}>
          <Ionicons name={priorityTheme.icon} size={12} color={priorityTheme.text} />
          <Text style={{ fontSize: 11, fontWeight: '800', color: priorityTheme.text }}>
            {item.priority}
          </Text>
        </View>
      </View>

      {/* 6. Estado / SLA */}
      <View style={{ width: 140 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
          backgroundColor: statusTheme.bg,
          borderWidth: 1,
          borderColor: statusTheme.border,
          alignSelf: 'flex-start',
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusTheme.dot }} />
          <Text style={{ fontSize: 11, fontWeight: '800', color: statusTheme.text }}>
            {item.status}
          </Text>
        </View>
        <Text style={{ fontSize: 10.5, color: sla.color, fontWeight: '700', marginTop: 3 }}>
          {sla.text}
        </Text>
      </View>

      {/* 7. Acciones */}
      <View style={{ width: 175, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
        {isPending && (
          <>
            {(item.category === 'maintenance' || (item.category === 'rooms' && item.metadata?.requires_secretaria_general)) && (
              <TouchableOpacity
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  onUpdateStatus(item, 'en_progreso');
                }}
                style={{
                  backgroundColor: '#2563EB',
                  paddingHorizontal: 10,
                  height: 30,
                  borderRadius: 7,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Ionicons name="play-outline" size={13} color="#FFFFFF" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Procesar</Text>
              </TouchableOpacity>
            )}

            {(item.category === 'visitors' || item.category === 'parking' || (item.category === 'rooms' && !item.metadata?.requires_secretaria_general)) && (
              <TouchableOpacity
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  onUpdateStatus(item, 'resuelto');
                }}
                style={{
                  backgroundColor: '#059669',
                  paddingHorizontal: 10,
                  height: 30,
                  borderRadius: 7,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Ionicons name="checkmark-outline" size={13} color="#FFFFFF" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Aprobar</Text>
              </TouchableOpacity>
            )}

            {item.category === 'transport' && (
              <TouchableOpacity
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  onAssignDriver && onAssignDriver(item);
                }}
                style={{
                  backgroundColor: '#0284C7',
                  paddingHorizontal: 10,
                  height: 30,
                  borderRadius: 7,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Ionicons name="car-outline" size={13} color="#FFFFFF" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Asignar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={(e: any) => {
                e?.stopPropagation?.();
                onUpdateStatus(item, 'rechazado');
              }}
              style={{
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
                width: 30,
                height: 30,
                borderRadius: 7,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close-outline" size={15} color="#DC2626" />
            </TouchableOpacity>
          </>
        )}

        {isInProgress && (
          <TouchableOpacity
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onUpdateStatus(item, 'resuelto');
            }}
            style={{
              backgroundColor: '#059669',
              paddingHorizontal: 10,
              height: 30,
              borderRadius: 7,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Ionicons name="checkmark-done-outline" size={13} color="#FFFFFF" />
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Finalizar</Text>
          </TouchableOpacity>
        )}

        {/* Botón Ver Detalle */}
        <TouchableOpacity
          onPress={(e: any) => {
            e?.stopPropagation?.();
            onOpenDetail && onOpenDetail(item);
          }}
          style={{
            backgroundColor: '#F1F5F9',
            borderWidth: 1,
            borderColor: '#CBD5E1',
            paddingHorizontal: 9,
            height: 30,
            borderRadius: 7,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Ionicons name="eye-outline" size={13} color="#334155" />
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#334155' }}>Ver</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

function RequestDetailModal({
  visible,
  item,
  onClose,
  onUpdateStatus,
  onAssignDriver,
  setViewerImage,
  onRefresh,
  onSuccessAction,
}: any) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  if (!item) return null;

  const serviceTheme = getCategoryCardTheme(item.category, item.type);
  const priorityTheme = getPriorityTheme(item.priority);
  const statusTheme = getStatusTheme(item.status);
  const catIcon = getCategoryIcon(item.category, item.type);
  const initials = getInitials(item.user);
  const sla = getSLAInfo(item.created_at, item.status);
  const rejectionReasonText = item.admin_notes || item.metadata?.rejection_reason;
  const isPending = (item.status || '').toLowerCase() === 'pendiente';
  const isInProgress = ['en_progreso', 'en progreso', 'en curso'].includes((item.status || '').toLowerCase());
  const isClosed = ['resuelto', 'completada', 'aprobada', 'aprobado', 'rechazado', 'rechazada'].includes((item.status || '').toLowerCase());

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isDesktop ? 24 : 12,
      }}>
        {/* Fondo clicable para cerrar */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        {/* Contenedor del Modal Centrado */}
        <View style={{
          width: '100%',
          maxWidth: 760,
          maxHeight: isDesktop ? '88%' : '94%',
          backgroundColor: '#FFFFFF',
          borderRadius: 22,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.25,
          shadowRadius: 36,
          elevation: 24,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
        }}>
          {/* Cabecera del Modal */}
          <View style={{
            paddingHorizontal: 22,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: serviceTheme.headerBg || '#F8FAFC',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
              {/* Radicado */}
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 7,
                backgroundColor: '#0F172A',
              }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>
                  #{String(item.id).slice(0, 8).toUpperCase()}
                </Text>
              </View>

              {/* Categoría */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 7,
                backgroundColor: `${item.color}15`,
                borderWidth: 1,
                borderColor: `${item.color}35`,
              }}>
                <Ionicons name={catIcon as any} size={13} color={item.color} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: item.color }}>
                  {item.type}
                </Text>
              </View>

              {/* Prioridad */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 7,
                backgroundColor: priorityTheme.bg,
                borderWidth: 1,
                borderColor: priorityTheme.border,
              }}>
                <Ionicons name={priorityTheme.icon} size={11} color={priorityTheme.text} />
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: priorityTheme.text }}>
                  {item.priority}
                </Text>
              </View>

              {/* Estado */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: statusTheme.bg,
                borderWidth: 1,
                borderColor: statusTheme.border,
              }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusTheme.dot }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: statusTheme.text }}>
                  {item.status}
                </Text>
              </View>
            </View>

            {/* Botón Cerrar (✕) */}
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#FFFFFF',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                marginLeft: 10,
              }}
            >
              <Ionicons name="close" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Cuerpo del Drawer (Scrollable) */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 22, gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Título y Solicitante */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', lineHeight: 26 }}>
                {item.detail || item.title}
              </Text>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: '#F8FAFC',
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#FFFFFF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B' }}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>{item.user}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <Ionicons name="business-outline" size={13} color="#64748B" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>{item.dependency}</Text>
                  </View>
                </View>

                {/* Badge SLA */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: sla.bg,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: `${sla.color}30`,
                }}>
                  <Ionicons name={sla.icon} size={12} color={sla.color} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: sla.color }}>{sla.text}</Text>
                </View>
              </View>
            </View>

            {/* Banner de Rechazo si aplica */}
            {item.status.toLowerCase() === 'rechazado' && rejectionReasonText && (
              <View style={{
                backgroundColor: '#FEF2F2',
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: '#FECACA',
                gap: 4,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#991B1B', textTransform: 'uppercase' }}>
                    Motivo de Rechazo:
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: '#7F1D1D', fontWeight: '500', lineHeight: 19 }}>
                  "{rejectionReasonText}"
                </Text>
              </View>
            )}

            {/* Descripción general */}
            {item.description && item.description !== item.title && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Descripción Ampliada
                </Text>
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 13.5, color: '#334155', lineHeight: 20 }}>
                    {item.description}
                  </Text>
                </View>
              </View>
            )}

            {/* Datos Técnicos y Específicos del Servicio */}
            {item.uiMetadata && item.uiMetadata.length > 0 && (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="construct-outline" size={15} color="#2563EB" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Especificaciones Técnicas
                  </Text>
                </View>

                <View style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 12,
                  gap: 8,
                }}>
                  {item.uiMetadata.map((meta: any, idx: number) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 7,
                        borderBottomWidth: idx < item.uiMetadata.length - 1 ? 1 : 0,
                        borderBottomColor: '#F1F5F9',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
                        <Ionicons name={meta.icon || 'information-circle-outline'} size={14} color="#64748B" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                          {meta.label}:
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A', textAlign: 'right', flex: 1.2 }}>
                        {meta.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Evidencia Fotográfica (Galería Antes y Después) */}
            {((item.attachments && item.attachments.length > 0) || item.metadata?.finalImage) && (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="images-outline" size={15} color="#059669" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Registro y Evidencia Fotográfica
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {item.attachments && item.attachments.length > 0 && (
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Reporte Inicial (Antes):</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {item.attachments.map((attach: string, idx: number) => {
                          const finalUri = attach.startsWith('http') || attach.startsWith('file') || attach.startsWith('data:') || attach.startsWith('blob:') ? attach : 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1000&auto=format&fit=crop';
                          return (
                            <TouchableOpacity
                              key={idx}
                              activeOpacity={0.85}
                              onPress={() => setViewerImage(finalUri)}
                              style={{
                                width: '30%',
                                height: 84,
                                borderRadius: 10,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: '#CBD5E1',
                              }}
                            >
                              <Image source={{ uri: finalUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {item.metadata?.finalImage && (
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>Trabajo Finalizado (Después):</Text>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setViewerImage(item.metadata.finalImage)}
                        style={{
                          width: '45%',
                          height: 100,
                          borderRadius: 10,
                          overflow: 'hidden',
                          borderWidth: 1.5,
                          borderColor: '#10B981',
                        }}
                      >
                        <Image source={{ uri: item.metadata.finalImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Trazabilidad / Línea de Tiempo */}
            {item.timeline && item.timeline.length > 0 && (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="git-commit-outline" size={15} color="#475569" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Trazabilidad y Seguimiento
                  </Text>
                </View>

                <View style={{ paddingLeft: 8 }}>
                  {item.timeline.map((step: any, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ alignItems: 'center', width: 18 }}>
                        <View style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: idx === 0 ? '#3B82F6' : '#CBD5E1',
                          zIndex: 1,
                        }} />
                        {idx < item.timeline.length - 1 && (
                          <View style={{ width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: 2 }} />
                        )}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 16 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{step.title}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 1 }}>{step.date}</Text>
                        {step.desc && (
                          <Text style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>{step.desc}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Calificación de Servicio si existe */}
            {item.metadata?.evaluation && (
              <View style={{
                backgroundColor: '#F0FDF4',
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#BBF7D0',
                gap: 6,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803D' }}>Calificación de usuario:</Text>
                  <View style={{ flexDirection: 'row' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Ionicons
                        key={star}
                        name={item.metadata.evaluation.rating >= star ? 'star' : 'star-outline'}
                        size={15}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                </View>
                {item.metadata.evaluation.comment ? (
                  <Text style={{ fontStyle: 'italic', color: '#166534', fontSize: 12.5 }}>
                    "{item.metadata.evaluation.comment}"
                  </Text>
                ) : null}
              </View>
            )}

            {/* Bitácora / Agregar Comentario */}
            <View style={{ gap: 8, marginTop: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Bitácora de Comentarios Internos
              </Text>
              <View style={{
                flexDirection: 'row',
                gap: 8,
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 8,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}>
                <TextInput
                  style={{ flex: 1, fontSize: 13, color: '#0F172A', paddingHorizontal: 8, minHeight: 38 }}
                  placeholder="Escribir comentario o nota de auditoría..."
                  placeholderTextColor="#94A3B8"
                  value={comment}
                  onChangeText={setComment}
                  editable={!commentLoading}
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  disabled={commentLoading || !comment.trim()}
                  style={{
                    backgroundColor: comment.trim() ? '#0F172A' : '#CBD5E1',
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {commentLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="send" size={15} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Pie de Acciones del Drawer */}
          <View style={{
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            backgroundColor: '#FFFFFF',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}>
            {/* Botón Cerrar */}
            <TouchableOpacity
              onPress={onClose}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 16,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#F1F5F9',
                borderWidth: 1,
                borderColor: '#CBD5E1',
              }}
            >
              <Ionicons name="close-outline" size={17} color="#475569" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cerrar</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Rechazar */}
              {!isClosed && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onUpdateStatus(item, 'rechazado');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 14,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#FEF2F2',
                    borderWidth: 1,
                    borderColor: '#FECACA',
                  }}
                >
                  <Ionicons name="close-outline" size={16} color="#DC2626" />
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>Rechazar</Text>
                </TouchableOpacity>
              )}

              {/* Acciones principales según estado */}
              {isPending && (
                <>
                  {(item.category === 'maintenance' || (item.category === 'rooms' && item.metadata?.requires_secretaria_general)) && (
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        onUpdateStatus(item, 'en_progreso');
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 16,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: '#2563EB',
                      }}
                    >
                      <Ionicons name="play-outline" size={16} color="#FFFFFF" />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Procesar</Text>
                    </TouchableOpacity>
                  )}

                  {(item.category === 'visitors' || item.category === 'parking' || (item.category === 'rooms' && !item.metadata?.requires_secretaria_general)) && (
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        onUpdateStatus(item, 'resuelto');
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 16,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: '#059669',
                      }}
                    >
                      <Ionicons name="checkmark-outline" size={16} color="#FFFFFF" />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Aprobar</Text>
                    </TouchableOpacity>
                  )}

                  {item.category === 'transport' && (
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        onAssignDriver && onAssignDriver(item);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 16,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: '#0284C7',
                      }}
                    >
                      <Ionicons name="car-outline" size={16} color="#FFFFFF" />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Asignar Conductor</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {isInProgress && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onUpdateStatus(item, 'resuelto');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 16,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#059669',
                  }}
                >
                  <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Finalizar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RequestListItem({ 
  item, 
  onUpdateStatus, 
  onRefresh, 
  initiallyExpanded = false, 
  onSuccessAction, 
  setViewerImage, 
  onAssignDriver, 
  onOpenDetail,
  maxCardWidth,
  numCols = 1,
}: any) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const scale = useRef(new Animated.Value(1)).current;
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const serviceTheme = getCategoryCardTheme(item.category, item.type);
  const sla = getSLAInfo(item.created_at, item.status);
  const priorityTheme = getPriorityTheme(item.priority);
  const statusTheme = getStatusTheme(item.status);
  const catIcon = getCategoryIcon(item.category, item.type);
  const initials = getInitials(item.user);

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
    <Animated.View 
      style={[
        styles.card, 
        {
          backgroundColor: serviceTheme.bg,
          borderWidth: 0,
        },
        numCols > 1 && { 
          flex: 1, 
          marginHorizontal: 0, 
          maxWidth: maxCardWidth,
          minWidth: 380,
        }, 
        Platform.OS === 'web' ? ({ 
          boxShadow: `0 4px 18px ${serviceTheme.shadow}`,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        } as any) : {},
        { 
          transform: [{ scale }],
        }
      ]}
    >
      <View style={styles.cardMain}>
        {/* Cabecera Superior: Radicado + Categoría a la izquierda, Estado a la derecha */}
        <View style={styles.cardHeaderTop}>
          <View style={styles.cardBadgesRow}>
            {/* Radicado / ID */}
            {item.id && (
              <View style={styles.idChip}>
                <Text style={styles.idChipText}>#{String(item.id).slice(0, 8).toUpperCase()}</Text>
              </View>
            )}

            {/* Badge de Categoría */}
            <View style={[styles.categoryBadge, { backgroundColor: '#FFFFFF', borderWidth: 0 }]}>
              <Ionicons name={catIcon as any} size={13} color={serviceTheme.color} />
              <Text style={[styles.categoryBadgeText, { color: serviceTheme.colorDark }]}>{item.type}</Text>
            </View>

            {/* Badge de Prioridad sólo si es Alta */}
            {item.priority && item.priority.toLowerCase() === 'alta' && (
              <View style={[styles.priorityBadge, { backgroundColor: priorityTheme.bg, borderWidth: 0 }]}>
                <Ionicons name={priorityTheme.icon} size={11} color={priorityTheme.text} />
                <Text style={[styles.priorityBadgeText, { color: priorityTheme.text }]}>
                  {item.priority}
                </Text>
              </View>
            )}
          </View>

          {/* Pill de Estado */}
          <View style={[styles.statusPillNew, { backgroundColor: statusTheme.bg, borderWidth: 0 }]}>
            <View style={[styles.statusDotNew, { backgroundColor: statusTheme.dot }]} />
            <Text style={[styles.statusTextNew, { color: statusTheme.text }]}>{item.status}</Text>
          </View>
        </View>

        {/* Fila del Solicitante */}
        <TouchableOpacity 
          style={styles.cardUserRow} 
          onPress={() => onOpenDetail && onOpenDetail(item)} 
          activeOpacity={0.85}
        >
          <View style={[styles.avatarCircle, { backgroundColor: '#FFFFFF', borderWidth: 0 }]}>
            <Text style={[styles.avatarText, { color: serviceTheme.color || '#0F172A' }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardUserName}>{item.user}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <Ionicons name="business-outline" size={13} color="#475569" />
              <Text style={styles.cardUserDept}>{item.dependency}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Caja de Requerimiento / Detalle */}
        <TouchableOpacity 
          style={[styles.detailBox, { backgroundColor: '#FFFFFF', borderWidth: 0 }]} 
          onPress={() => onOpenDetail && onOpenDetail(item)} 
          activeOpacity={0.85}
        >
          <Text style={styles.cardDetailText} numberOfLines={2}>
            {item.detail}
          </Text>
        </TouchableOpacity>

        {/* Banner de Motivo de Rechazo Visible Si Aplica */}
        {item.status.toLowerCase() === 'rechazado' && rejectionReasonText && (
          <View style={{
            backgroundColor: '#FEF2F2',
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: '#FECACA',
            marginTop: 4,
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
            <View style={[styles.expandedInfo, { backgroundColor: '#FFFFFF', borderWidth: 0 }]}>
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
          <View style={[styles.cardFooter, { borderTopWidth: 0, paddingTop: 10 }]}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={13} color="#64748B" />
              <Text style={styles.metaText}>{item.date}</Text>
            </View>

            <View style={[styles.actionButtons, { flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, paddingLeft: 10, gap: 6 }]}>

              {/* ACCIONES RÁPIDAS DIRECTAS */}
              {isPending && (
                <>
                  {/* Grupo 1: Mantenimiento, Sala Especial -> Procesar */}
                  {(item.category === 'maintenance' || (item.category === 'rooms' && item.metadata?.requires_secretaria_general)) && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#2563EB', borderColor: '#1D4ED8', height: 32, paddingHorizontal: 11 }]}
                      onPress={() => onUpdateStatus(item, 'en_progreso')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play-outline" size={13} color="#FFFFFF" />
                      <Text style={[styles.actionBtnText, { color: '#FFFFFF', fontSize: 11.5 }]}>Procesar</Text>
                    </TouchableOpacity>
                  )}

                  {/* Grupo 2: Visitantes, Parqueadero, Sala Estándar -> Aprobar directo */}
                  {(item.category === 'visitors' || item.category === 'parking' || (item.category === 'rooms' && !item.metadata?.requires_secretaria_general)) && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#059669', borderColor: '#047857', height: 32, paddingHorizontal: 11 }]}
                      onPress={() => onUpdateStatus(item, 'resuelto')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-outline" size={13} color="#FFFFFF" />
                      <Text style={[styles.actionBtnText, { color: '#FFFFFF', fontSize: 11.5 }]}>Aprobar</Text>
                    </TouchableOpacity>
                  )}

                  {/* Grupo 3: Transporte con Asignación de Conductor */}
                  {item.category === 'transport' && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#0284C7', borderColor: '#0369A1', height: 32, paddingHorizontal: 11 }]}
                      onPress={() => onAssignDriver && onAssignDriver(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="car-outline" size={13} color="#FFFFFF" />
                      <Text style={[styles.actionBtnText, { color: '#FFFFFF', fontSize: 11.5 }]}>Asignar</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {isInProgress && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#059669', borderColor: '#047857', height: 32, paddingHorizontal: 11 }]}
                  onPress={() => onUpdateStatus(item, 'resuelto')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-done-outline" size={13} color="#FFFFFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF', fontSize: 11.5 }]}>Finalizar</Text>
                </TouchableOpacity>
              )}

              {/* Botón de Rechazo sutil pero accesible */}
              {!isClosed && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', height: 32, paddingHorizontal: 10 }]}
                  onPress={() => onUpdateStatus(item, 'rechazado')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="close-outline" size={14} color="#DC2626" />
                  <Text style={[styles.actionBtnText, { color: '#DC2626', fontSize: 11.5 }]}>Rechazar</Text>
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
  sidebar: { width: 300, height: '100%', overflow: 'hidden' },
  sidebarContent: { flex: 1, padding: 30, paddingTop: 60, alignItems: 'center' },
  logoCircle: { width: 70, height: 70, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  sideTitle: { color: COLORS.white, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  sideSubTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700', marginTop: 3 },
  sideDivider: { width: '80%', height: 1.5, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 25 },
  sideDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 24 },

  sideTabBtn: { width: '100%', height: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 14, marginBottom: 6 },
  sideTabBtnActive: { backgroundColor: COLORS.white },
  sideTabLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  sideTabLabelActive: { color: COLORS.primary, fontWeight: '900' },
  sideBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sideBadgeActive: { backgroundColor: 'rgba(15, 23, 42, 0.12)' },
  sideBadgeInactive: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  sideBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.white },
  sideBadgeTextActive: { color: COLORS.primary },
  sideBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.08)' },

  headerContainer: { paddingBottom: 10 },
  hero: { minHeight: 160, paddingVertical: 15, width: '100%', overflow: 'hidden', borderBottomRightRadius: 40 },
  heroCompact: { minHeight: 96, paddingVertical: 14, width: '100%', overflow: 'hidden', borderBottomRightRadius: 28 },
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
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 18, 
    marginBottom: 16, 
    marginHorizontal: 25, 
    borderWidth: 0, 
    minWidth: 380,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
      web: { 
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }
    })
  },
  cardMain: { padding: 18 },
  cardHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  cardBadgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flex: 1 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  categoryBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  priorityBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  slaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  slaBadgeText: { fontSize: 10, fontWeight: '800' },
  idChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#0F172A' },
  idChipText: { fontSize: 10.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  statusPillNew: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4.5, borderRadius: 10, borderWidth: 1 },
  statusDotNew: { width: 7, height: 7, borderRadius: 4 },
  statusTextNew: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardUserRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  avatarText: { fontSize: 13.5, fontWeight: '800' },
  cardUserName: { fontSize: 15.5, fontWeight: '800', color: '#0F172A' },
  cardUserDept: { fontSize: 12, fontWeight: '700', color: '#475569' },
  toggleExpandChip: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  detailBox: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 0, marginBottom: 10 },
  cardDetailText: { fontSize: 13.5, color: '#0F172A', fontWeight: '600', lineHeight: 20 },
  quickMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  quickMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  quickMetaLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  quickMetaVal: { fontSize: 11, fontWeight: '600', color: COLORS.primary, maxWidth: 160 },
  
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
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0, paddingTop: 12, marginTop: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12.5, color: '#475569', fontWeight: '700' },
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
