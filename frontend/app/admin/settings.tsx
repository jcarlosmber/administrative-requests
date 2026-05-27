import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  useWindowDimensions, 
  Platform,
  Switch,
  Modal,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { settingsService, Driver, ServiceEmail } from '../../lib/settingsService';

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
  danger: '#EF4444',
};

const INITIAL_ROOMS = [
  { id: '1', name: 'Sala Innovación', capacity: '12', floor: 'Piso 2' },
  { id: '2', name: 'Sala de Juntas B', capacity: '8', floor: 'Piso 1' },
  { id: '3', name: 'Focus Room 4', capacity: '2', floor: 'Piso 3' },
  { id: '4', name: 'Auditorio Principal', capacity: '50', floor: 'PB' },
];

const INITIAL_DEPENDENCIES = [
  { id: 'dep-1', name: 'Secretaría Jurídica Distrital' },
  { id: 'dep-2', name: 'Dirección de Gestión Corporativa' },
  { id: 'dep-3', name: 'Dirección Distrital de Defensa Judicial' },
  { id: 'dep-4', name: 'Subdirección de Informática (Oficina TIC)' },
  { id: 'dep-5', name: 'Oficina Asesora de Planeación' },
  { id: 'dep-6', name: 'Oficina de Control Interno' },
  { id: 'dep-7', name: 'Subsecretaría Jurídica' },
  { id: 'dep-8', name: 'Dirección Distrital de Asuntos Penales' }
];

const safeStorage = {
  getItem: async (key: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}
  }
};

export default function AdminSettings() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  const [rooms, setRooms] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [serviceEmails, setServiceEmails] = useState<ServiceEmail[]>([]);
  
  const [notifications, setNotifications] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modals States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dependencyToDelete, setDependencyToDelete] = useState<any | null>(null);
  const [showDepDeleteModal, setShowDepDeleteModal] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [showDriverDeleteModal, setShowDriverDeleteModal] = useState(false);

  // Inputs para añadir correos en tiempo real
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({
    maintenance: '',
    visitors: '',
    rooms_special: '',
    parking: ''
  });

  // Load configuration, rooms, dependencies, drivers and service emails
  useEffect(() => {
    const loadConfigAndData = async () => {
      try {
        setLoading(true);
        
        // 1. Cargar Salas desde Supabase
        const { data: dbRooms, error: dbError } = await supabase
          .from('rooms')
          .select('*')
          .order('name');
        
        if (dbError) throw dbError;
        
        if (dbRooms && dbRooms.length > 0) {
          setRooms(dbRooms.map(r => ({ ...r, capacity: r.capacity.toString() })));
        } else {
          setRooms(INITIAL_ROOMS);
        }

        // 2. Cargar Dependencias desde Supabase
        const { data: dbDeps, error: dbDepsError } = await supabase
          .from('dependencies')
          .select('*')
          .order('name');

        if (dbDepsError) throw dbDepsError;

        if (dbDeps && dbDeps.length > 0) {
          setDependencies(dbDeps);
        } else {
          setDependencies(INITIAL_DEPENDENCIES);
        }

        // 3. Cargar Conductores y Correos de Servicio
        const dbDrivers = await settingsService.getDrivers();
        setDrivers(dbDrivers);

        const dbEmails = await settingsService.getServiceEmails();
        setServiceEmails(dbEmails);

        // 4. Cargar configuraciones del sistema desde localStorage
        const savedPush = await safeStorage.getItem('push_notifications');
        const savedAuto = await safeStorage.getItem('auto_approve');
        
        if (savedPush !== null) setNotifications(savedPush === 'true');
        if (savedAuto !== null) setAutoApprove(savedAuto === 'true');

      } catch (err) {
        console.warn('Cargando con almacenamiento de respaldo local:', err);
        
        // Fallback local robusto si la base de datos no está activa
        const localRoomsStr = await safeStorage.getItem('local_rooms');
        if (localRoomsStr) {
          setRooms(JSON.parse(localRoomsStr));
        } else {
          setRooms(INITIAL_ROOMS);
        }

        const localDepsStr = await safeStorage.getItem('local_dependencies');
        if (localDepsStr) {
          setDependencies(JSON.parse(localDepsStr));
        } else {
          setDependencies(INITIAL_DEPENDENCIES);
        }

        const dbDrivers = await settingsService.getDrivers();
        setDrivers(dbDrivers);

        const dbEmails = await settingsService.getServiceEmails();
        setServiceEmails(dbEmails);

        const savedPush = await safeStorage.getItem('push_notifications');
        const savedAuto = await safeStorage.getItem('auto_approve');
        if (savedPush !== null) setNotifications(savedPush === 'true');
        if (savedAuto !== null) setAutoApprove(savedAuto === 'true');
      } finally {
        setLoading(false);
      }
    };

    loadConfigAndData();
  }, []);

  const updateRoom = (id: string, field: string, val: string) => {
    setRooms(rooms.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const addRoom = () => {
    const newRoom = {
      id: `temp-${Date.now()}`,
      name: 'Nueva Sala',
      capacity: '10',
      floor: 'Piso 1',
      info: 'Estándar',
      isNew: true
    };
    setRooms([...rooms, newRoom]);
  };

  const openDeleteConfirmation = (room: any) => {
    setRoomToDelete(room);
    setShowDeleteModal(true);
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;

    try {
      setSaving(true);
      const isTemp = roomToDelete.id.toString().startsWith('temp-');

      if (!isTemp) {
        // Eliminar físicamente de la base de datos Supabase
        const { error } = await supabase
          .from('rooms')
          .delete()
          .eq('id', roomToDelete.id);
        
        if (error) throw error;
      }

      const updatedRooms = rooms.filter(r => r.id !== roomToDelete.id);
      setRooms(updatedRooms);
      
      // Guardar también en localStorage como respaldo
      await safeStorage.setItem('local_rooms', JSON.stringify(updatedRooms));
      
      setShowDeleteModal(false);
      setRoomToDelete(null);
    } catch (err) {
      console.error('Error al eliminar sala:', err);
      // Eliminar al menos localmente
      const updatedRooms = rooms.filter(r => r.id !== roomToDelete.id);
      setRooms(updatedRooms);
      await safeStorage.setItem('local_rooms', JSON.stringify(updatedRooms));
      setShowDeleteModal(false);
      setRoomToDelete(null);
    } finally {
      setSaving(false);
    }
  };

  const updateDependency = (id: string, val: string) => {
    setDependencies(dependencies.map(d => d.id === id ? { ...d, name: val } : d));
  };

  const addDependency = () => {
    const newDep = {
      id: `temp-${Date.now()}`,
      name: 'Nueva Dependencia',
      isNew: true
    };
    setDependencies([...dependencies, newDep]);
  };

  const openDeleteDepConfirmation = (dep: any) => {
    setDependencyToDelete(dep);
    setShowDepDeleteModal(true);
  };

  const confirmDeleteDependency = async () => {
    if (!dependencyToDelete) return;

    try {
      setSaving(true);
      const isTemp = dependencyToDelete.id.toString().startsWith('temp-');

      if (!isTemp) {
        // Eliminar físicamente de la base de datos Supabase
        const { error } = await supabase
          .from('dependencies')
          .delete()
          .eq('id', dependencyToDelete.id);
        
        if (error) throw error;
      }

      const updatedDeps = dependencies.filter(d => d.id !== dependencyToDelete.id);
      setDependencies(updatedDeps);
      
      // Guardar también en localStorage como respaldo
      await safeStorage.setItem('local_dependencies', JSON.stringify(updatedDeps));
      
      setShowDepDeleteModal(false);
      setDependencyToDelete(null);
    } catch (err) {
      console.error('Error al eliminar dependencia:', err);
      // Eliminar al menos localmente
      const updatedDeps = dependencies.filter(d => d.id !== dependencyToDelete.id);
      setDependencies(updatedDeps);
      await safeStorage.setItem('local_dependencies', JSON.stringify(updatedDeps));
      setShowDepDeleteModal(false);
      setDependencyToDelete(null);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // MANEJADORES PARA CONDUCTORES (DRIVERS)
  // ==========================================
  const updateDriver = (id: string, field: keyof Driver, val: any) => {
    setDrivers(drivers.map(d => d.id === id ? { ...d, [field]: val } : d));
  };

  const addDriver = () => {
    const newDriver: Driver = {
      id: `temp-${Date.now()}`,
      name: 'Nuevo Conductor',
      phone: '3000000000',
      is_active: true
    };
    setDrivers([...drivers, newDriver]);
  };

  const openDriverDeleteConfirmation = (driver: Driver) => {
    setDriverToDelete(driver);
    setShowDriverDeleteModal(true);
  };

  const confirmDeleteDriver = async () => {
    if (!driverToDelete) return;

    try {
      setSaving(true);
      const isTemp = driverToDelete.id.startsWith('temp-');
      
      if (!isTemp) {
        await settingsService.deleteDriver(driverToDelete.id);
      }

      const updatedDrivers = drivers.filter(d => d.id !== driverToDelete.id);
      setDrivers(updatedDrivers);
      await safeStorage.setItem('local_drivers', JSON.stringify(updatedDrivers));
      
      setShowDriverDeleteModal(false);
      setDriverToDelete(null);
    } catch (err) {
      console.error('Error al eliminar conductor:', err);
      const updatedDrivers = drivers.filter(d => d.id !== driverToDelete.id);
      setDrivers(updatedDrivers);
      await safeStorage.setItem('local_drivers', JSON.stringify(updatedDrivers));
      setShowDriverDeleteModal(false);
      setDriverToDelete(null);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // MANEJADORES PARA CORREOS (SERVICE EMAILS)
  // ==========================================
  const addServiceEmail = async (type: 'maintenance' | 'visitors' | 'rooms_special' | 'parking') => {
    const emailVal = emailInputs[type]?.trim();
    if (!emailVal) return;

    try {
      setSaving(true);
      const newEmailPayload = {
        service_type: type,
        email: emailVal
      };

      const created = await settingsService.createServiceEmail(newEmailPayload);
      const updatedEmails = [...serviceEmails, created];
      setServiceEmails(updatedEmails);
      await safeStorage.setItem('local_service_emails', JSON.stringify(updatedEmails));

      setEmailInputs({
        ...emailInputs,
        [type]: ''
      });
    } catch (err) {
      console.error('Error al añadir correo de servicio:', err);
    } finally {
      setSaving(false);
    }
  };

  const removeServiceEmail = async (id: string) => {
    try {
      setSaving(true);
      const isTemp = id.startsWith('temp-');
      
      if (!isTemp) {
        await settingsService.deleteServiceEmail(id);
      }

      const updatedEmails = serviceEmails.filter(e => e.id !== id);
      setServiceEmails(updatedEmails);
      await safeStorage.setItem('local_service_emails', JSON.stringify(updatedEmails));
    } catch (err) {
      console.error('Error al eliminar correo de servicio:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);

      // 1. Guardar configuraciones en localStorage (para uso inmediato en el cliente)
      await safeStorage.setItem('push_notifications', notifications.toString());
      await safeStorage.setItem('auto_approve', autoApprove.toString());
      await safeStorage.setItem('local_rooms', JSON.stringify(rooms));
      await safeStorage.setItem('local_dependencies', JSON.stringify(dependencies));
      await safeStorage.setItem('local_drivers', JSON.stringify(drivers));
      await safeStorage.setItem('local_service_emails', JSON.stringify(serviceEmails));

      // 2. Guardar/actualizar salas en la base de datos de Supabase
      for (const room of rooms) {
        const isTemp = room.id.toString().startsWith('temp-');
        
        const roomData = {
          name: room.name,
          capacity: parseInt(room.capacity) || 0,
          floor: room.floor,
          info: room.info === 'Especial' ? 'Especial' : 'Estándar'
        };

        if (isTemp) {
          // Insertar nueva sala en Supabase
          const { error } = await supabase
            .from('rooms')
            .insert([roomData]);
          if (error) console.error('Error al insertar sala en Supabase:', error);
        } else {
          // Actualizar sala existente en Supabase
          const { error } = await supabase
            .from('rooms')
            .update(roomData)
            .eq('id', room.id);
          if (error) console.error('Error al actualizar sala en Supabase:', error);
        }
      }

      // 3. Guardar/actualizar dependencias en la base de datos de Supabase
      for (const dep of dependencies) {
        const isTemp = dep.id.toString().startsWith('temp-');
        
        const depData = {
          name: dep.name
        };

        if (isTemp) {
          // Insertar nueva dependencia en Supabase
          const { error } = await supabase
            .from('dependencies')
            .insert([depData]);
          if (error) console.error('Error al insertar dependencia en Supabase:', error);
        } else {
          // Actualizar dependencia existente en Supabase
          const { error } = await supabase
            .from('dependencies')
            .update(depData)
            .eq('id', dep.id);
          if (error) console.error('Error al actualizar dependencia en Supabase:', error);
        }
      }

      // 4. Guardar/actualizar conductores en Supabase
      for (const drv of drivers) {
        const isTemp = drv.id.toString().startsWith('temp-');
        const driverData = {
          name: drv.name,
          phone: drv.phone,
          is_active: drv.is_active
        };

        if (isTemp) {
          await settingsService.createDriver(driverData);
        } else {
          await settingsService.updateDriver(drv.id, driverData);
        }
      }

      // 5. Recargar salas reales desde Supabase si es posible
      const { data: dbRooms } = await supabase
        .from('rooms')
        .select('*')
        .order('name');
      
      if (dbRooms && dbRooms.length > 0) {
        setRooms(dbRooms.map(r => ({ ...r, capacity: r.capacity.toString() })));
      }

      // Recargar dependencias reales desde Supabase si es posible
      const { data: dbDeps } = await supabase
        .from('dependencies')
        .select('*')
        .order('name');
      
      if (dbDeps && dbDeps.length > 0) {
        setDependencies(dbDeps);
      }

      // Recargar conductores y correos reales
      const freshDrivers = await settingsService.getDrivers();
      setDrivers(freshDrivers);

      const freshEmails = await settingsService.getServiceEmails();
      setServiceEmails(freshEmails);

      setShowSuccessModal(true);
    } catch (err) {
      console.warn('Cambios guardados localmente:', err);
      setShowSuccessModal(true);
    } finally {
      setSaving(false);
    }
  };

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
          
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.loaderText}>Cargando recursos...</Text>
            </View>
          ) : (
            <View style={styles.contentPadding}>
              
              <SectionHeader title="Gestión de Espacios" kicker="INFRAESTRUCTURA" />
              <View style={styles.cardList}>
                {rooms.map(room => (
                  <View key={room.id} style={styles.roomCard}>
                    <View style={[styles.roomIconBox, { backgroundColor: 'rgba(114, 9, 183, 0.08)' }]}>
                      <Ionicons name="business" size={24} color="#7209B7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={styles.roomNameInput}
                        value={room.name}
                        onChangeText={(val) => updateRoom(room.id, 'name', val)}
                        placeholder="Nombre de la sala"
                      />
                      <View style={styles.roomMetaRow}>
                        <View style={styles.miniField}>
                          <Ionicons name="people" size={14} color="#7209B7" />
                          <TextInput
                            style={styles.miniInput}
                            value={room.capacity}
                            onChangeText={(val) => updateRoom(room.id, 'capacity', val)}
                            keyboardType="numeric"
                          />
                          <Text style={styles.miniLabel}>cap.</Text>
                        </View>
                        <View style={styles.miniField}>
                          <Ionicons name="layers" size={14} color="#7209B7" />
                          <TextInput
                            style={styles.miniInput}
                            value={room.floor}
                            onChangeText={(val) => updateRoom(room.id, 'floor', val)}
                            placeholder="Piso"
                          />
                        </View>
                        
                        {/* Píldora interactiva para alternar tipo de sala (Estándar vs Especial) */}
                        {room.info === 'Especial' ? (
                          <TouchableOpacity 
                            onPress={() => {
                              updateRoom(room.id, 'info', 'Estándar');
                            }}
                            style={{ borderRadius: 10, overflow: 'hidden', marginLeft: 5 }}
                          >
                            <LinearGradient
                              colors={['#3B82F6', '#1D4ED8']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                              }}
                            >
                              <Ionicons name="ribbon" size={12} color="#FFF" />
                              <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 }}>
                                Especial
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity 
                            onPress={() => {
                              updateRoom(room.id, 'info', 'Especial');
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              marginLeft: 5,
                              backgroundColor: '#F1F5F9',
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: '#E2E8F0'
                            }}
                          >
                            <Ionicons name="business-outline" size={12} color={COLORS.muted} />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.muted }}>
                              Estándar
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={[styles.deleteBtn, { backgroundColor: '#FEF2F2' }]}
                      onPress={() => openDeleteConfirmation(room)}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <TouchableOpacity style={styles.addBtn} onPress={addRoom}>
                  <Ionicons name="add-circle" size={20} color={COLORS.accent} />
                  <Text style={styles.addBtnText}>Añadir nuevo espacio</Text>
                </TouchableOpacity>
              </View>

              <SectionHeader title="Gestión de Dependencias" kicker="ORGANIZACIÓN" />
              <View style={styles.cardList}>
                {dependencies.map(dep => (
                  <View key={dep.id} style={styles.depCard}>
                    <View style={[styles.roomIconBox, { backgroundColor: 'rgba(227, 39, 42, 0.08)' }]}>
                      <Ionicons name="people-circle" size={24} color="#E3272A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={styles.roomNameInput}
                        value={dep.name}
                        onChangeText={(val) => updateDependency(dep.id, val)}
                        placeholder="Nombre de la dependencia"
                      />
                    </View>
                    <TouchableOpacity 
                      style={[styles.deleteBtn, { backgroundColor: '#FEF2F2' }]}
                      onPress={() => openDeleteDepConfirmation(dep)}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <TouchableOpacity style={styles.addBtn} onPress={addDependency}>
                  <Ionicons name="add-circle" size={20} color={COLORS.accent} />
                  <Text style={styles.addBtnText}>Añadir nueva dependencia</Text>
                </TouchableOpacity>
              </View>

              <SectionHeader title="Gestión de Conductores" kicker="LOGÍSTICA DE TRANSPORTE" />
              <View style={styles.cardList}>
                {drivers.map(drv => (
                  <View key={drv.id} style={[styles.depCard, { borderLeftColor: '#3B82F6' }]}>
                    <View style={[styles.roomIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
                      <Ionicons name="car-sport" size={24} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <TextInput
                        style={styles.roomNameInput}
                        value={drv.name}
                        onChangeText={(val) => updateDriver(drv.id, 'name', val)}
                        placeholder="Nombre del conductor"
                      />
                      <TextInput
                        style={[styles.roomNameInput, { fontSize: 14, fontWeight: '600' }]}
                        value={drv.phone}
                        onChangeText={(val) => updateDriver(drv.id, 'phone', val)}
                        placeholder="Teléfono (ej. 3101234567)"
                        keyboardType="phone-pad"
                      />
                    </View>
                    <TouchableOpacity 
                      style={[styles.deleteBtn, { backgroundColor: '#FEF2F2' }]}
                      onPress={() => openDriverDeleteConfirmation(drv)}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <TouchableOpacity style={styles.addBtn} onPress={addDriver}>
                  <Ionicons name="add-circle" size={20} color={COLORS.accent} />
                  <Text style={styles.addBtnText}>Añadir nuevo conductor</Text>
                </TouchableOpacity>
              </View>

              <SectionHeader title="Correos de Secretaría General" kicker="NOTIFICACIONES DE SERVICIO" />
              <View style={{ gap: 15 }}>
                {([
                  { type: 'maintenance', title: 'Mantenimientos', icon: 'construct', color: '#2A9D8F' },
                  { type: 'visitors', title: 'Visitantes', icon: 'people', color: '#E63946' },
                  { type: 'rooms_special', title: 'Salas Especiales', icon: 'ribbon', color: '#7209B7' },
                  { type: 'parking', title: 'Parqueaderos', icon: 'car', color: '#F4A261' }
                ] as const).map(({ type, title, icon, color }) => {
                  const emails = serviceEmails.filter(e => e.service_type === type);
                  return (
                    <View key={type} style={{ backgroundColor: COLORS.white, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.line }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Ionicons name={icon as any} size={18} color={color} />
                        <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.primary }}>
                          {title}
                        </Text>
                      </View>

                      {/* Chips de correos registrados */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        {emails.map(emailObj => (
                          <View key={emailObj.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${color}10`, borderRadius: 10, paddingLeft: 10, paddingRight: 6, paddingVertical: 6, borderWidth: 1, borderColor: `${color}20` }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primarySoft, marginRight: 6 }}>
                              {emailObj.email}
                            </Text>
                            <TouchableOpacity onPress={() => removeServiceEmail(emailObj.id)} style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' }}>
                              <Ionicons name="close" size={12} color={COLORS.danger} />
                            </TouchableOpacity>
                          </View>
                        ))}
                        {emails.length === 0 && (
                          <Text style={{ fontSize: 13, color: COLORS.muted, fontStyle: 'italic' }}>
                            No hay correos configurados.
                          </Text>
                        )}
                      </View>

                      {/* Campo de agregar nuevo correo */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 5 }}>
                        <TextInput
                          style={[styles.roomNameInput, { flex: 1, fontSize: 13, height: 40, paddingVertical: 4 }]}
                          value={emailInputs[type] || ''}
                          onChangeText={(val) => setEmailInputs({ ...emailInputs, [type]: val })}
                          placeholder={`Añadir correo para ${title.toLowerCase()}...`}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                        <TouchableOpacity 
                          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}
                          onPress={() => addServiceEmail(type)}
                        >
                          <Ionicons name="add" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              <SectionHeader title="Preferencias del Sistema" kicker="CONFIGURACIÓN" />
              <View style={styles.configCard}>
                <ConfigToggle 
                  label="Notificaciones Push" 
                  desc="Enviar avisos al administrador por cada nueva solicitud."
                  value={notifications}
                  onValueChange={setNotifications}
                  icon="notifications"
                />
                <View style={styles.configDivider} />
                <ConfigToggle 
                  label="Aprobación Automática" 
                  desc="Aprobar solicitudes de salas si hay disponibilidad inmediata."
                  value={autoApprove}
                  onValueChange={setAutoApprove}
                  icon="flash"
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChanges} disabled={saving}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primarySoft]}
                  style={styles.saveGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.saveText}>GUARDAR CAMBIOS</Text>
                      <Ionicons name="save-outline" size={20} color={COLORS.white} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

            </View>
          )}
        </ScrollView>
      </View>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE CONDUCTOR */}
      <Modal
        visible={showDriverDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDriverDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBox, { backgroundColor: `${COLORS.danger}15` }]}>
              <Ionicons name="trash" size={32} color={COLORS.danger} />
            </View>
            <Text style={styles.modalTitle}>¿Eliminar conductor?</Text>
            <Text style={styles.modalDescription}>
              Esta acción eliminará al conductor "{driverToDelete?.name}" de la base de datos de transporte. Esta operación no se puede deshacer.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowDriverDeleteModal(false);
                  setDriverToDelete(null);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmDeleteButton]} 
                onPress={confirmDeleteDriver}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE SALA */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBox, { backgroundColor: `${COLORS.danger}15` }]}>
              <Ionicons name="trash" size={32} color={COLORS.danger} />
            </View>
            <Text style={styles.modalTitle}>¿Eliminar espacio?</Text>
            <Text style={styles.modalDescription}>
              Esta acción eliminará físicamente la sala "{roomToDelete?.name}" de la plataforma de administración. Esta operación no se puede deshacer.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowDeleteModal(false);
                  setRoomToDelete(null);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmDeleteButton]} 
                onPress={confirmDeleteRoom}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE DEPENDENCIA */}
      <Modal
        visible={showDepDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDepDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBox, { backgroundColor: `${COLORS.danger}15` }]}>
              <Ionicons name="trash" size={32} color={COLORS.danger} />
            </View>
            <Text style={styles.modalTitle}>¿Eliminar dependencia?</Text>
            <Text style={styles.modalDescription}>
              Esta acción eliminará la dependencia "{dependencyToDelete?.name}" de la lista del sistema. Esta operación no se puede deshacer.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowDepDeleteModal(false);
                  setDependencyToDelete(null);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmDeleteButton]} 
                onPress={confirmDeleteDependency}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ÉXITO AL GUARDAR */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBox, { backgroundColor: `${COLORS.success}15` }]}>
              <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
            </View>
            <Text style={styles.modalTitle}>¡Configuración Guardada!</Text>
            <Text style={styles.modalDescription}>
              Los espacios físicos y las reglas operativas han sido actualizados con éxito en el sistema.
            </Text>
            <TouchableOpacity 
              style={[styles.modalButton, styles.successButton]} 
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>ENTENDIDO</Text>
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
          <Ionicons name="settings-outline" size={40} color={COLORS.white} />
        </View>
        <Text style={styles.sideTitle}>Ajustes</Text>
        <Text style={styles.sideSubTitle}>Configuración Técnica</Text>
        <View style={{ width: 40, height: 4, backgroundColor: COLORS.white, marginVertical: 25, borderRadius: 2 }} />
        <Text style={styles.sideDesc}>
          Personalice los parámetros operativos de la plataforma y gestione el inventario de recursos físicos.
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
        <Text style={styles.heroKicker}>AJUSTES DE SISTEMA</Text>
        <Text style={styles.heroTitle}>Configuración General</Text>
        <Text style={styles.heroSub}>Administre los recursos y reglas del portal</Text>
      </View>
    </View>
  );
}

function SectionHeader({ title, kicker }: any) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionKicker}>{kicker}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function ConfigToggle({ label, desc, value, onValueChange, icon }: any) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIconBox}>
        <Ionicons name={icon} size={22} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{desc}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ false: COLORS.line, true: COLORS.accent }}
        thumbColor={COLORS.white}
      />
    </View>
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

  scrollContent: { paddingBottom: 60 },
  hero: { height: 160, width: '100%', overflow: 'hidden', borderBottomRightRadius: 40 },
  heroInner: { flex: 1, paddingHorizontal: 25, justifyContent: 'center' },
  heroKicker: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { color: COLORS.white, fontSize: 32, fontWeight: '900', marginTop: 5 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5 },

  contentPadding: { paddingHorizontal: 25 },
  sectionHeader: { marginTop: 35, marginBottom: 20 },
  sectionKicker: { fontSize: 11, fontWeight: '900', color: COLORS.accent, letterSpacing: 1.5 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: COLORS.primary, marginTop: 4 },

  loaderContainer: { height: 300, justifyContent: 'center', alignItems: 'center', gap: 15 },
  loaderText: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },

  cardList: { gap: 12 },
  roomCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: 24, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 15, 
    borderWidth: 1, 
    borderColor: COLORS.line,
    borderLeftWidth: 6,
    borderLeftColor: '#7209B7',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
      web: { boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)' }
    })
  },
  depCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: 24, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 15, 
    borderWidth: 1, 
    borderColor: COLORS.line,
    borderLeftWidth: 6,
    borderLeftColor: '#A9301E',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
      web: { boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)' }
    })
  },
  roomIconBox: { width: 54, height: 54, borderRadius: 16, backgroundColor: `${COLORS.accent}15`, justifyContent: 'center', alignItems: 'center' },
  roomNameInput: { fontSize: 18, fontWeight: '800', color: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignSelf: 'stretch' },
  roomMetaRow: { flexDirection: 'row', gap: 15, marginTop: 8 },
  miniField: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniInput: { fontSize: 14, fontWeight: '700', color: COLORS.text, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 45, textAlign: 'center' },
  miniLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  deleteBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 18, borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.line, marginTop: 15 },
  addBtnText: { fontSize: 16, fontWeight: '800', color: COLORS.accent },

  configCard: { backgroundColor: COLORS.white, borderRadius: 28, padding: 5, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 20 },
  toggleIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  toggleLabel: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  toggleDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: '500' },
  configDivider: { height: 1, backgroundColor: COLORS.line, marginHorizontal: 20 },

  saveBtn: { marginTop: 40, borderRadius: 20, overflow: 'hidden', 
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 8 },
      web: { boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)' }
    })
  },
  saveGradient: { height: 64, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  saveText: { color: COLORS.white, fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  // Modals Styling
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { backgroundColor: COLORS.white, borderRadius: 28, padding: 30, width: '100%', maxWidth: 420, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalIconBox: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, marginBottom: 12 },
  modalDescription: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginBottom: 25, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cancelButton: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line },
  cancelButtonText: { color: COLORS.primarySoft, fontSize: 14, fontWeight: '800' },
  confirmDeleteButton: { backgroundColor: COLORS.danger },
  confirmDeleteButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  successButton: { backgroundColor: COLORS.primary, width: '100%', height: 60, borderRadius: 18 },
  successButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '900', letterSpacing: 1 }
});

