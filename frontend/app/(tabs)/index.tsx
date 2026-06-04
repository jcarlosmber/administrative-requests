import React, { ReactNode, useMemo, useRef, useState, useCallback } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { requestService, AdministrativeRequest } from '../../lib/requestService';
import { supabase } from '../../lib/supabase';
import { vehicleService, UserVehicle } from '../../lib/vehicleService';
import { VehicleFormModal } from '../../components/VehicleFormModal';
import { VehicleDeleteConfirmModal } from '../../components/VehicleDeleteConfirmModal';


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
    desc: 'Solicite cupos de parqueadero permanente (únicamente aplica para funcionarios de planta dadas las condiciones).'
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

  // Estados de Vehículos Registrados
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<UserVehicle | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AdministrativeRequest | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // En una implementación real, buscaríamos el perfil en la tabla 'profiles'
        setUserProfile({ name: user.email?.split('@')[0] || 'Usuario' });
      } else {
        setUserProfile({ name: 'Usuario' });
      }
      
      const allRequests = await requestService.getAll();
      // Filtrar por el usuario actual (suponiendo que requestService.getAll() trae todo o tenemos RLS)
      setRequests(allRequests);

      // Obtener vehículos registrados del usuario
      try {
        const allVehicles = await vehicleService.getAll();
        setVehicles(allVehicles);
      } catch (vehError) {
        console.error('Error fetching user vehicles:', vehError);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleSaveVehicle = async (vehicleData: { 
    plate: string; 
    brand: string; 
    color?: string; 
    name: string; 
    doc: string; 
    dependency: string; 
  }) => {
    if (selectedVehicle) {
      await vehicleService.update(selectedVehicle.id, vehicleData);
    } else {
      await vehicleService.create(vehicleData);
    }
    await fetchDashboardData();
  };

  const handleDeleteVehicle = async () => {
    if (selectedVehicle) {
      await vehicleService.delete(selectedVehicle.id);
      await fetchDashboardData();
    }
  };

  // Cargar datos cada vez que la pestaña reciba el foco
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  React.useEffect(() => {
    // Crear un canal con nombre único para evitar colisiones en la caché global de Supabase
    const channelName = `dashboard_requests_changes_${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'administrative_requests' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      active: requests.filter(r => !['resuelto', 'rechazada'].includes(r.status.toLowerCase())).length
    };
  }, [requests]);

  const recentRequestsUI = useMemo(() => {
    const categoryMap: Record<string, string> = {
      visitors: 'Visitantes',
      transport: 'Transporte',
      maintenance: 'Mantenimiento',
      rooms: 'Salas',
      parking: 'Parqueadero'
    };

    return requests.slice(0, 3).map(req => ({
      id: req.id,
      title: req.title,
      type: categoryMap[req.category] || req.category,
      status: req.status.charAt(0).toUpperCase() + req.status.slice(1).replace('_', ' '),
      date: new Date(req.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      color: req.status === 'pendiente' ? COLORS.warning : COLORS.success
    }));
  }, [requests]);

  const upcomingRoomBookings = useMemo(() => {
    // 1. Filtrar solicitudes de salas activas (que no estén rechazadas de forma negativa)
    const roomReqs = requests.filter(r => 
      ['rooms', 'salas'].includes(r.category.toLowerCase()) && 
      !['rechazado', 'rechazada', 'rejected'].includes(r.status.toLowerCase())
    );

    // 2. Formatear para el listado del dashboard
    return roomReqs.map(req => {
      const meta = req.metadata || {};
      const roomName = meta.room?.name || 'Sala Regular';
      const dateText = meta.date || 'Sin fecha';
      
      // Ajustar hora
      const timeText = meta.requires_secretaria_general 
        ? (meta.booking_hours || 'Todo el día')
        : (meta.time || 'Horario regular');
      
      const statusLower = req.status.toLowerCase();
      const isResolved = ['resuelto', 'resolved', 'approved', 'confirmada', 'confirmado'].includes(statusLower);
      const statusLabel = isResolved ? 'Confirmada' : 'En Revisión';
      const statusColor = isResolved ? COLORS.success : COLORS.warning;

      return {
        id: req.id,
        roomName,
        dateText,
        timeText,
        statusLabel,
        statusColor,
        isLarge: !!meta.requires_secretaria_general
      };
    }).slice(0, 3); // Mostrar las 3 reservas más próximas/recientes
  }, [requests]);

  const activeMaintenances = useMemo(() => {
    // 1. Filtrar solicitudes de mantenimiento activas (pendientes, en progreso o resueltas)
    const maintReqs = requests.filter(r => 
      ['maintenance', 'mantenimiento'].includes(r.category.toLowerCase()) && 
      ['pendiente', 'pending', 'en_progreso', 'in_progress', 'resuelto', 'resolved', 'approved'].includes(r.status.toLowerCase())
    );

    // 2. Mapearlas a un formato visual limpio
    return maintReqs.map(req => {
      const meta = req.metadata || {};
      const locationText = meta.location 
        ? `${meta.location} ${meta.room ? '• ' + meta.room : ''}`
        : 'Ubicación General';
      
      const statusLower = req.status.toLowerCase();
      const isResolved = ['resuelto', 'resolved', 'approved'].includes(statusLower);
      const isProgress = ['en_progreso', 'in_progress', 'en proceso'].includes(statusLower);
      
      const statusLabel = isResolved ? 'Resuelto' : isProgress ? 'En Proceso' : 'Reportado';
      const statusColor = isResolved ? COLORS.success : isProgress ? '#3B82F6' : COLORS.warning;

      return {
        id: req.id,
        title: req.title,
        locationText,
        statusLabel,
        statusColor,
        dateText: new Date(req.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      };
    }).slice(0, 3); // Mostrar los 3 reportes más recientes
  }, [requests]);

  const activeVisitors = useMemo(() => {
    // 1. Filtrar solicitudes de visitantes activas (pendientes, en progreso o resueltas/autorizadas)
    const visitorsReqs = requests.filter(r => 
      ['visitors', 'visitantes'].includes(r.category.toLowerCase()) && 
      ['pendiente', 'pending', 'en_progreso', 'in_progress', 'resuelto', 'resolved', 'approved'].includes(r.status.toLowerCase())
    );

    // 2. Mapearlas a un formato visual limpio
    return visitorsReqs.map(req => {
      const meta = req.metadata || {};
      const peopleText = meta.visitors?.length 
        ? `${meta.visitors.length} ${meta.visitors.length === 1 ? 'persona' : 'personas'}`
        : '1 persona';
      
      const statusLower = req.status.toLowerCase();
      const isResolved = ['resuelto', 'resolved', 'approved'].includes(statusLower);
      const isProgress = ['en_progreso', 'in_progress', 'en ingreso'].includes(statusLower);
      
      const statusLabel = isResolved ? 'Autorizado' : isProgress ? 'En Ingreso' : 'Registrado';
      const statusColor = isResolved ? COLORS.success : isProgress ? '#3B82F6' : COLORS.warning;

      return {
        id: req.id,
        title: req.title,
        peopleText,
        statusLabel,
        statusColor,
        dateText: new Date(req.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        hostName: meta.responsible?.name || 'Por asignar'
      };
    }).slice(0, 3); // Mostrar los 3 ingresos más recientes
  }, [requests]);

  const activeTransports = useMemo(() => {
    // 1. Filtrar solicitudes de transporte activas (pendientes, en progreso o resueltas/confirmadas)
    const transportReqs = requests.filter(r => 
      ['transport', 'transporte'].includes(r.category.toLowerCase()) && 
      ['pendiente', 'pending', 'en_progreso', 'in_progress', 'resuelto', 'resolved', 'approved'].includes(r.status.toLowerCase())
    );

    // 2. Mapearlas a un formato visual limpio
    return transportReqs.map(req => {
      const meta = req.metadata || {};
      const destinationText = meta.destination || 'Misión Oficial';
      const numPassengers = parseInt(meta.passengers || '1', 10);
      const passengersText = `${numPassengers} ${numPassengers === 1 ? 'pasajero' : 'pasajeros'}`;
      
      const statusLower = req.status.toLowerCase();
      const isResolved = ['resuelto', 'resolved', 'approved'].includes(statusLower);
      const isProgress = ['en_progreso', 'in_progress', 'en curso'].includes(statusLower);
      
      const statusLabel = isResolved ? 'Confirmado' : isProgress ? 'En Curso' : 'Programado';
      const statusColor = isResolved ? COLORS.success : isProgress ? '#3B82F6' : COLORS.warning;

      return {
        id: req.id,
        title: req.title,
        destinationText,
        passengersText,
        statusLabel,
        statusColor,
        dateText: new Date(req.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        timeText: meta.pickupTime || meta.time || 'Por definir'
      };
    }).slice(0, 3); // Mostrar los 3 traslados más recientes
  }, [requests]);

  const activeParkings = useMemo(() => {
    // 1. Filtrar solicitudes de parqueadero activas (pendientes o en progreso)
    const parkingReqs = requests.filter(r => 
      ['parking', 'parqueadero'].includes(r.category.toLowerCase()) && 
      ['pendiente', 'pending', 'en_progreso', 'in_progress'].includes(r.status.toLowerCase())
    );

    // 2. Mapearlas a un formato visual limpio
    return parkingReqs.map(req => {
      const meta = req.metadata || {};
      const statusLower = req.status.toLowerCase();
      const isProgress = ['en_progreso', 'in_progress', 'en uso'].includes(statusLower);
      
      const statusLabel = isProgress ? 'En Uso' : 'Asignando';
      const statusColor = isProgress ? '#3B82F6' : COLORS.warning;

      return {
        id: req.id,
        title: req.title,
        plate: meta.plate || 'Sin Placa',
        brand: meta.brand || 'Vehículo',
        name: meta.name || 'Funcionario',
        statusLabel,
        statusColor,
        dateText: new Date(req.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      };
    }).slice(0, 3);
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

            {/* Próximas Reservas de Salas Section */}
            {upcomingRoomBookings.length > 0 && (
              <View style={{ marginTop: 35 }}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionKicker}>AGENDA</Text>
                    <Text style={styles.sectionTitle}>Próximas Reservas de Salas</Text>
                  </View>
                  <Pressable onPress={() => router.push({ pathname: '/(tabs)/requests', params: { service: 'Salas' } })}>
                    <Text style={styles.viewAllText}>Ver todas</Text>
                  </Pressable>
                </View>

                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ gap: 16, paddingRight: 35, paddingBottom: 5 }}
                >
                  {upcomingRoomBookings.map((booking) => (
                    <TouchableOpacity 
                      key={booking.id}
                      activeOpacity={0.9}
                      onPress={() => {
                        const req = requests.find(r => r.id === booking.id);
                        if (req) {
                          setSelectedRequest(req);
                          setIsDetailModalVisible(true);
                        }
                      }}
                      style={{
                        width: isDesktop ? 280 : 250,
                        backgroundColor: COLORS.white,
                        borderRadius: 24,
                        padding: 18,
                        borderWidth: 1.5,
                        borderColor: 'rgba(114, 9, 183, 0.1)',
                        shadowColor: '#7209B7',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.05,
                        shadowRadius: 10,
                        elevation: 3
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: booking.isLarge ? '#F5E6FF' : '#F3E8FF', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name={booking.isLarge ? "ribbon-outline" : "easel-outline"} size={20} color="#7209B7" />
                        </View>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: `${booking.statusColor}12`, borderStyle: 'solid', borderWidth: 1, borderColor: `${booking.statusColor}25` }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: booking.statusColor, textTransform: 'uppercase' }}>
                            {booking.statusLabel}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.dark }} numberOfLines={1}>
                        {booking.roomName}
                      </Text>

                      <View style={{ gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="calendar-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }} numberOfLines={1}>
                            {booking.dateText}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="time-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }} numberOfLines={1}>
                            {booking.timeText}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Reportes de Mantenimiento Activos Section */}
            {activeMaintenances.length > 0 && (
              <View style={{ marginTop: 35 }}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionKicker}>ALERTAS</Text>
                    <Text style={styles.sectionTitle}>Mantenimientos Pendientes</Text>
                  </View>
                  <Pressable onPress={() => router.push({ pathname: '/(tabs)/requests', params: { service: 'Mantenimiento' } })}>
                    <Text style={styles.viewAllText}>Ver todos</Text>
                  </Pressable>
                </View>

                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ gap: 16, paddingRight: 35, paddingBottom: 5 }}
                >
                  {activeMaintenances.map((maint) => (
                    <TouchableOpacity 
                      key={maint.id}
                      activeOpacity={0.9}
                      onPress={() => {
                        const req = requests.find(r => r.id === maint.id);
                        if (req) {
                          setSelectedRequest(req);
                          setIsDetailModalVisible(true);
                        }
                      }}
                      style={{
                        width: isDesktop ? 280 : 250,
                        backgroundColor: COLORS.white,
                        borderRadius: 24,
                        padding: 18,
                        borderWidth: 1.5,
                        borderColor: 'rgba(42, 157, 143, 0.1)',
                        shadowColor: '#2A9D8F',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.05,
                        shadowRadius: 10,
                        elevation: 3
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#EBF7F5', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="construct-outline" size={20} color="#2A9D8F" />
                        </View>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: `${maint.statusColor}12`, borderStyle: 'solid', borderWidth: 1, borderColor: `${maint.statusColor}25` }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: maint.statusColor, textTransform: 'uppercase' }}>
                            {maint.statusLabel}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.dark }} numberOfLines={1}>
                        {maint.title}
                      </Text>

                      <View style={{ gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="location-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }} numberOfLines={1}>
                            {maint.locationText}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="calendar-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }} numberOfLines={1}>
                            Reportado el {maint.dateText}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Visitantes Activos Section */}
            {activeVisitors.length > 0 && (
              <View style={{ marginTop: 35 }}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionKicker}>INGRESO</Text>
                    <Text style={styles.sectionTitle}>Visitantes Activos</Text>
                  </View>
                  <Pressable onPress={() => router.push({ pathname: '/(tabs)/requests', params: { service: 'Visitantes' } })}>
                    <Text style={styles.viewAllText}>Ver todos</Text>
                  </Pressable>
                </View>

                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ gap: 16, paddingRight: 35, paddingBottom: 5 }}
                >
                  {activeVisitors.map((visit) => (
                    <TouchableOpacity 
                      key={visit.id}
                      activeOpacity={0.9}
                      onPress={() => {
                        const req = requests.find(r => r.id === visit.id);
                        if (req) {
                          setSelectedRequest(req);
                          setIsDetailModalVisible(true);
                        }
                      }}
                      style={{
                        width: isDesktop ? 280 : 250,
                        backgroundColor: COLORS.white,
                        borderRadius: 24,
                        padding: 18,
                        borderWidth: 1.5,
                        borderColor: 'rgba(230, 57, 70, 0.1)',
                        shadowColor: '#E63946',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.05,
                        shadowRadius: 10,
                        elevation: 3
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFECEF', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="people-outline" size={20} color="#E63946" />
                        </View>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: `${visit.statusColor}12`, borderStyle: 'solid', borderWidth: 1, borderColor: `${visit.statusColor}25` }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: visit.statusColor, textTransform: 'uppercase' }}>
                            {visit.statusLabel}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.dark }} numberOfLines={1}>
                        {visit.title}
                      </Text>

                      <View style={{ gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="people-circle-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }} numberOfLines={1}>
                            Aforo: {visit.peopleText}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="person-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }} numberOfLines={1}>
                            Autoriza: {visit.hostName}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Transporte Activo Section */}
            {activeTransports.length > 0 && (
              <View style={{ marginTop: 35 }}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionKicker}>VIAJES</Text>
                    <Text style={styles.sectionTitle}>Transporte Activo</Text>
                  </View>
                  <Pressable onPress={() => router.push({ pathname: '/(tabs)/requests', params: { service: 'Transporte' } })}>
                    <Text style={styles.viewAllText}>Ver todos</Text>
                  </Pressable>
                </View>

                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ gap: 16, paddingRight: 35, paddingBottom: 5 }}
                >
                  {activeTransports.map((trans) => (
                    <TouchableOpacity 
                      key={trans.id}
                      activeOpacity={0.9}
                      onPress={() => {
                        const req = requests.find(r => r.id === trans.id);
                        if (req) {
                          setSelectedRequest(req);
                          setIsDetailModalVisible(true);
                        }
                      }}
                      style={{
                        width: isDesktop ? 280 : 250,
                        backgroundColor: COLORS.white,
                        borderRadius: 24,
                        padding: 18,
                        borderWidth: 1.5,
                        borderColor: 'rgba(0, 119, 182, 0.1)',
                        shadowColor: '#0077B6',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.05,
                        shadowRadius: 10,
                        elevation: 3
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#EBF4F9', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="car-sport-outline" size={20} color="#0077B6" />
                        </View>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: `${trans.statusColor}12`, borderStyle: 'solid', borderWidth: 1, borderColor: `${trans.statusColor}25` }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: trans.statusColor, textTransform: 'uppercase' }}>
                            {trans.statusLabel}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.dark }} numberOfLines={1}>
                        {trans.title}
                      </Text>

                      <View style={{ gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="location-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }} numberOfLines={1}>
                            Destino: {trans.destinationText}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="time-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }} numberOfLines={1}>
                            Hora: {trans.timeText} ({trans.dateText})
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Parqueadero Activo Section */}
            {activeParkings.length > 0 && (
              <View style={{ marginTop: 35 }}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionKicker}>ACCESO</Text>
                    <Text style={styles.sectionTitle}>Parqueadero Activo</Text>
                  </View>
                  <Pressable onPress={() => router.push({ pathname: '/(tabs)/requests', params: { service: 'Parqueadero' } })}>
                    <Text style={styles.viewAllText}>Ver todos</Text>
                  </Pressable>
                </View>

                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ gap: 16, paddingRight: 35, paddingBottom: 5 }}
                >
                  {activeParkings.map((park) => (
                    <TouchableOpacity 
                      key={park.id}
                      activeOpacity={0.9}
                      onPress={() => {
                        const req = requests.find(r => r.id === park.id);
                        if (req) {
                          setSelectedRequest(req);
                          setIsDetailModalVisible(true);
                        }
                      }}
                      style={{
                        width: isDesktop ? 280 : 250,
                        backgroundColor: COLORS.white,
                        borderRadius: 24,
                        padding: 18,
                        borderWidth: 1.5,
                        borderColor: 'rgba(244, 162, 97, 0.1)',
                        shadowColor: '#F4A261',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.05,
                        shadowRadius: 10,
                        elevation: 3
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="car-outline" size={20} color="#F4A261" />
                        </View>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: `${park.statusColor}12`, borderStyle: 'solid', borderWidth: 1, borderColor: `${park.statusColor}25` }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: park.statusColor, textTransform: 'uppercase' }}>
                            {park.statusLabel}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.dark }} numberOfLines={1}>
                        Placa: {park.plate}
                      </Text>

                      <View style={{ gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="construct-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }} numberOfLines={1}>
                            {park.brand}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="person-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }} numberOfLines={1}>
                            Cond: {park.name} ({park.dateText})
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Mis Vehículos Registrados Section */}
            <View style={{ marginTop: 35 }}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionKicker}>CONTROL DE ACCESO</Text>
                  <Text style={styles.sectionTitle}>Vehículos Registrados</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    router.push('/requests/parking');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: `${COLORS.primary}12`,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary}25`
                  }}
                >
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                  <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 13 }}>Agregar</Text>
                </TouchableOpacity>
              </View>

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ gap: 16, paddingRight: 35, paddingBottom: 5 }}
              >
                {vehicles.map((vehicle) => (
                  <View 
                    key={vehicle.id}
                    style={{
                      width: isDesktop ? 280 : 250,
                      backgroundColor: COLORS.white,
                      borderRadius: 24,
                      padding: 18,
                      borderWidth: 1.5,
                      borderColor: 'rgba(169, 48, 30, 0.1)',
                      shadowColor: COLORS.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.05,
                      shadowRadius: 10,
                      elevation: 3,
                      position: 'relative'
                    }}
                  >
                    {/* Botones de acción */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(169, 48, 30, 0.08)', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="car-sport-outline" size={20} color={COLORS.primary} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity 
                          onPress={() => {
                            router.push('/requests/parking');
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            backgroundColor: '#F1F5F9',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <Ionicons name="pencil" size={14} color={COLORS.text} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => {
                            setSelectedVehicle(vehicle);
                            setIsDeleteModalVisible(true);
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            backgroundColor: 'rgba(169, 48, 30, 0.05)',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.dark, letterSpacing: 0.5 }}>
                      {vehicle.plate}
                    </Text>

                    <View style={{ gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="pricetag-outline" size={14} color={COLORS.muted} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }}>
                          {vehicle.brand}
                        </Text>
                      </View>
                      {vehicle.color ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="color-palette-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }}>
                            Color: {vehicle.color}
                          </Text>
                        </View>
                      ) : null}
                      {/* @ts-ignore */}
                      {vehicle.name ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="person-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }}>
                            {/* @ts-ignore */}
                            Cond: {vehicle.name} (CC: {vehicle.doc})
                          </Text>
                        </View>
                      ) : null}
                      {/* @ts-ignore */}
                      {vehicle.dependency ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="business-outline" size={14} color={COLORS.muted} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }}>
                            {/* @ts-ignore */}
                            Área: {vehicle.dependency}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
                {vehicles.length === 0 && (
                  <View style={{
                    width: isDesktop ? 400 : width - 70,
                    backgroundColor: 'rgba(0,0,0,0.01)',
                    borderRadius: 24,
                    padding: 24,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: COLORS.line,
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: 140
                  }}>
                    <Ionicons name="car-outline" size={32} color={COLORS.muted} style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.muted, textAlign: 'center' }}>
                      No tienes vehículos registrados para el ingreso.
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 2 }}>
                      Presione "Agregar" para registrar su primer vehículo.
                    </Text>
                  </View>
                )}
              </ScrollView>
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

      {/* Modales de Vehículos */}
      <VehicleDeleteConfirmModal
        visible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
        onConfirm={handleDeleteVehicle}
        plate={selectedVehicle?.plate || ''}
      />
      <DetailModal
        visible={isDetailModalVisible}
        request={selectedRequest}
        onClose={() => {
          setIsDetailModalVisible(false);
          setSelectedRequest(null);
        }}
      />
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
            colors={['#111827', '#0F172A', `${item.color}35`]}
            locations={[0, 0.62, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardWatermark}>
            <Ionicons name={item.icon} size={120} color={`${item.color}22`} />
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
            <BlurView intensity={18} tint="dark" style={[styles.glassButton, { backgroundColor: item.color, borderColor: item.color }]}>
              <Text style={styles.glassButtonText}>Solicitar ahora</Text>
              <Ionicons name="add-circle" size={18} color={COLORS.white} />
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
  serviceCard: { height: 260, borderRadius: 32, padding: 24, backgroundColor: '#0F172A', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 10 },
      web: { boxShadow: '0 16px 40px rgba(15,23,42,0.18)' }
    })
  },
  cardWatermark: { position: 'absolute', right: -20, top: -20, transform: [{ rotate: '-15deg' }] },
  cardInfo: { flexDirection: 'row', gap: 15, alignItems: 'center', marginBottom: 20 },
  cardIconCircle: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 12 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: COLORS.white, letterSpacing: -0.3 },
  cardSub: { fontSize: 13, fontWeight: '800', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardDesc: { fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 20, opacity: 1 },
  cardBottom: { marginTop: 'auto' },
  glassButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  glassButtonText: { fontSize: 14, fontWeight: '800', color: COLORS.white },

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
    transport: '#3B82F6',
    maintenance: COLORS.success,
    rooms: '#7209B7',
    parking: '#F4A261'
  }[item.category] || COLORS.muted;

  const statusColor = {
    pendiente: COLORS.warning,
    resuelto: COLORS.success,
    en_progreso: '#3B82F6',
    rechazada: COLORS.primary,
    rechazado: COLORS.primary
  }[item.status.toLowerCase()] || COLORS.muted;

  return {
    ...item,
    cat: typeLabel,
    status: item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' '),
    date: new Date(item.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    color: statusColor
  };
};

function DetailModal({ visible, request, onClose }: { visible: boolean; request: AdministrativeRequest | null; onClose: () => void }) {
  if (!request) return null;

  const mapped = mapRequestToUI(request);
  const metadata = request.metadata || {};

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
                    <Ionicons name="car-sport-outline" size={18} color="#3B82F6" />
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
              {metadata.charge ? (
                <View style={modalStyles.fieldRow}>
                  <Ionicons name="briefcase-outline" size={16} color={COLORS.muted} />
                  <Text style={modalStyles.fieldValue}>Cargo: {metadata.charge}</Text>
                </View>
              ) : null}
              <View style={modalStyles.fieldRow}>
                <Ionicons name="business-outline" size={16} color={COLORS.muted} />
                <Text style={modalStyles.fieldValue}>Dependencia: {metadata.dependency || 'N/A'}</Text>
              </View>
            </View>

            <View style={modalStyles.infoBlock}>
              <Text style={modalStyles.infoSectionTitle}>DATOS DEL VEHÍCULO</Text>
              <View style={modalStyles.fieldRow}>
                <Ionicons name="barcode-outline" size={16} color="#3B82F6" />
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
                <Ionicons name="time-outline" size={16} color="#3B82F6" />
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
            <TouchableOpacity onPress={onClose} style={modalStyles.primaryBtn}>
              <LinearGradient 
                colors={[COLORS.primary, COLORS.primaryDark]} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }} 
                style={modalStyles.btnGradient}
              >
                <Text style={modalStyles.btnText}>Entendido</Text>
              </LinearGradient>
            </TouchableOpacity>
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
    borderColor: COLORS.line
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
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.line
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    overflow: 'hidden'
  },
  btnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  btnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900'
  }
});