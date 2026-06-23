import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
import { useRouter } from 'expo-router';
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

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function AdminSettings() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  const [rooms, setRooms] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [serviceEmails, setServiceEmails] = useState<ServiceEmail[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userDraft, setUserDraft] = useState<any>(null);
  const [ldapBaseDn, setLdapBaseDn] = useState('DC=secjur,DC=gov,DC=co');
  const [ldapPort, setLdapPort] = useState('636');
  const [ldapUseSsl, setLdapUseSsl] = useState(true);
  const [ldapServer, setLdapServer] = useState('ldaps://10.54.80.6');
  const [ldapFilter, setLdapFilter] = useState('(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))');
  const [ldapUseBind, setLdapUseBind] = useState(true);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [itemToCreate, setItemToCreate] = useState<'room'|'dependency'|'driver'|null>(null);
  const [ldapRootDn, setLdapRootDn] = useState('SECJUR.GOV.CO/Secretaria Juridica/Servicio/SASGE_SJD');
  const [ldapPassword, setLdapPassword] = useState('');
  const [ldapUserField, setLdapUserField] = useState('samaccountname');
  const [ldapSyncField, setLdapSyncField] = useState('objectguid');
  const [ldapComments, setLdapComments] = useState('Coneccion SSL para Nodo AD 02');
  const [ldapRelay, setLdapRelay] = useState('10.54.80.102');
  
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
          setRooms(dbRooms.map((r: any) => ({ ...r, capacity: r.capacity.toString() })));
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

        // 3. Cargar usuarios del sistema
        const { data: dbUsers, error: dbUsersError } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, email, role, username, phone, entity, is_active, dependency_id, start_date, end_date, ldap_enabled, created_at')
          .order('full_name');

        if (!dbUsersError) {
          setUsers(dbUsers || []);
        }

        // 4. Cargar Conductores y Correos de Servicio
        const dbDrivers = await settingsService.getDrivers();
        setDrivers(dbDrivers);

        const dbEmails = await settingsService.getServiceEmails();
        setServiceEmails(dbEmails);

        // 5. Cargar configuraciones del sistema desde localStorage
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
        const savedLdapDn = await safeStorage.getItem('ldap_base_dn');
        const savedLdapPort = await safeStorage.getItem('ldap_port');
        const savedLdapSsl = await safeStorage.getItem('ldap_use_ssl');
        const savedLdapServer = await safeStorage.getItem('ldap_server');
        const savedLdapFilter = await safeStorage.getItem('ldap_filter');
        const savedLdapUseBind = await safeStorage.getItem('ldap_use_bind');
        const savedLdapRootDn = await safeStorage.getItem('ldap_root_dn');
        const savedLdapUserField = await safeStorage.getItem('ldap_user_field');
        const savedLdapSyncField = await safeStorage.getItem('ldap_sync_field');
        const savedLdapComments = await safeStorage.getItem('ldap_comments');
        const savedLdapRelay = await safeStorage.getItem('ldap_relay');
        if (savedPush !== null) setNotifications(savedPush === 'true');
        if (savedAuto !== null) setAutoApprove(savedAuto === 'true');
        if (savedLdapDn) setLdapBaseDn(savedLdapDn);
        if (savedLdapPort) setLdapPort(savedLdapPort);
        if (savedLdapSsl !== null) setLdapUseSsl(savedLdapSsl === 'true');
        if (savedLdapServer) setLdapServer(savedLdapServer);
        if (savedLdapFilter) setLdapFilter(savedLdapFilter);
        if (savedLdapUseBind !== null) setLdapUseBind(savedLdapUseBind === 'true');
        if (savedLdapRootDn) setLdapRootDn(savedLdapRootDn);
        if (savedLdapUserField) setLdapUserField(savedLdapUserField);
        if (savedLdapSyncField) setLdapSyncField(savedLdapSyncField);
        if (savedLdapComments) setLdapComments(savedLdapComments);
        if (savedLdapRelay) setLdapRelay(savedLdapRelay);
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
    setItemToCreate('room');
    setShowCreateModal(true);
  };

  const openDeleteConfirmation = (room: any) => {
    setRoomToDelete(room);
    setDeleteConfirmationText('');
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
    setItemToCreate('dependency');
    setShowCreateModal(true);
  };

  const openDeleteDepConfirmation = (dep: any) => {
    setDependencyToDelete(dep);
    setDeleteConfirmationText('');
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
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;

    return users.filter(user =>
      [
        user.full_name,
        user.first_name,
        user.last_name,
        user.email,
        user.username,
        user.phone,
        user.role,
        dependencies.find(dep => dep.id === user.dependency_id)?.name,
        user.entity
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    );
  }, [users, userSearch, dependencies]);

  const updateUser = (id: string, field: string, val: any) => {
    setUsers(users.map(user => user.id === id ? { ...user, [field]: val } : user));
  };

  const saveUsers = async () => {
    try {
      setSaving(true);
      for (const user of users) {
        const normalizedFullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        const payload = {
          full_name: normalizedFullName || user.full_name || '',
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          email: user.email || '',
          username: user.username || null,
          phone: user.phone || null,
          entity: user.entity || null,
          role: user.role || 'user',
          is_active: user.is_active ?? true,
          dependency_id: user.dependency_id || null,
          start_date: user.start_date || null,
          end_date: user.end_date || null,
          ldap_enabled: user.ldap_enabled ?? false,
        };

        if (String(user.id).startsWith('temp-')) {
          const profileId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : generateUUID();

          const { error } = await supabase
            .from('profiles')
            .insert([{ ...payload, id: profileId }]);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', user.id);

          if (error) throw error;
        }
      }
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error guardando usuarios:', err);
    } finally {
      setSaving(false);
    }
  };

  const exportUsers = useCallback(() => {
    const exportRows = filteredUsers.map(user => ({
      nombre: user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' '),
      email: user.email || '',
      usuario: user.username || '',
      telefono: user.phone || '',
      dependencia: dependencies.find(dep => dep.id === user.dependency_id)?.name || '',
      entidad: user.entity || '',
      rol: user.role === 'admin' ? 'Administrador' : user.role === 'security' ? 'Seguridad' : 'Funcionario',
      activo: user.is_active ? 'Sí' : 'No',
      inicio: user.start_date || '',
      vencimiento: user.end_date || '',
      ldap: user.ldap_enabled ? 'Sí' : 'No'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'usuarios.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredUsers, dependencies]);

  const addUser = () => {
    const newUser = {
      id: `temp-${Date.now()}`,
      full_name: '',
      first_name: '',
      last_name: '',
      email: '',
      username: '',
      phone: '',
      entity: '',
      role: 'user',
      is_active: true,
      ldap_enabled: false,
      dependency_id: dependencies[0]?.id || null,
      start_date: '',
      end_date: ''
    };
    setUserDraft(newUser);
    setUserModalVisible(true);
  };

  const openUserEditor = (user: any) => {
    setUserDraft({
      ...user,
      dependency_id: user.dependency_id || dependencies[0]?.id || null,
      entity: user.entity || '',
      ldap_enabled: user.ldap_enabled ?? false,
      is_active: user.is_active ?? true,
      start_date: user.start_date || '',
      end_date: user.end_date || ''
    });
    setUserModalVisible(true);
  };

  const closeUserEditor = () => {
    setUserModalVisible(false);
    setUserDraft(null);
  };

  const saveUserDraft = async () => {
    if (!userDraft) return;

    try {
      setSaving(true);
      const normalizedFullName = [userDraft.first_name, userDraft.last_name].filter(Boolean).join(' ').trim();
      const payload = {
        full_name: normalizedFullName || userDraft.full_name || '',
        first_name: userDraft.first_name || null,
        last_name: userDraft.last_name || null,
        email: userDraft.email || '',
        username: userDraft.username || null,
        phone: userDraft.phone || null,
        entity: userDraft.entity || null,
        role: userDraft.role || 'user',
        is_active: userDraft.is_active ?? true,
        dependency_id: userDraft.dependency_id || null,
        start_date: userDraft.start_date || null,
        end_date: userDraft.end_date || null,
        ldap_enabled: userDraft.ldap_enabled ?? false,
      };

      if (String(userDraft.id).startsWith('temp-')) {
        const profileId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : generateUUID();

        const { error } = await supabase
          .from('profiles')
          .insert([{ ...payload, id: profileId }]);

        if (error) throw error;

        setUsers([{ ...userDraft, ...payload, id: profileId }, ...users]);
      } else {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', userDraft.id);

        if (error) throw error;

        setUsers(users.map(user => user.id === userDraft.id ? { ...user, ...payload } : user));
      }

      closeUserEditor();
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error guardando usuario:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: any) => {
    try {
      setSaving(true);
      if (!String(user.id).startsWith('temp-')) {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);
        if (error) throw error;
      }
      setUsers(users.filter(item => item.id !== user.id));
    } catch (err) {
      console.error('Error eliminando usuario:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = (userId: string, value: boolean) => {
    setUsers(users.map(user => user.id === userId ? { ...user, is_active: value } : user));
  };

  const updateDriver = (id: string, field: keyof Driver, val: any) => {
    setDrivers(drivers.map(d => d.id === id ? { ...d, [field]: val } : d));
  };

  const addDriver = () => {
    setItemToCreate('driver');
    setShowCreateModal(true);
  };

  const confirmCreate = () => {
    if (itemToCreate === 'room') {
      const newRoom = { id: `temp-${Date.now()}`, name: 'Nueva Sala', capacity: '10', floor: 'Piso 1', info: 'Estándar', isNew: true };
      setRooms([...rooms, newRoom]);
    } else if (itemToCreate === 'dependency') {
      const newDep = { id: `temp-${Date.now()}`, name: 'Nueva Dependencia', isNew: true };
      setDependencies([...dependencies, newDep]);
    } else if (itemToCreate === 'driver') {
      const newDriver: Driver = { id: `temp-${Date.now()}`, name: 'Nuevo Conductor', phone: '3000000000', is_active: true };
      setDrivers([...drivers, newDriver]);
    }
    setShowCreateModal(false);
    setItemToCreate(null);
  };

  const openDriverDeleteConfirmation = (driver: Driver) => {
    setDriverToDelete(driver);
    setDeleteConfirmationText('');
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
      await safeStorage.setItem('ldap_base_dn', ldapBaseDn);
      await safeStorage.setItem('ldap_port', ldapPort);
      await safeStorage.setItem('ldap_use_ssl', ldapUseSsl.toString());
      await safeStorage.setItem('ldap_server', ldapServer);
      await safeStorage.setItem('ldap_filter', ldapFilter);
      await safeStorage.setItem('ldap_use_bind', ldapUseBind.toString());
      await safeStorage.setItem('ldap_root_dn', ldapRootDn);
      await safeStorage.setItem('ldap_user_field', ldapUserField);
      await safeStorage.setItem('ldap_sync_field', ldapSyncField);
      await safeStorage.setItem('ldap_comments', ldapComments);
      await safeStorage.setItem('ldap_relay', ldapRelay);
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
        setRooms(dbRooms.map((r: any) => ({ ...r, capacity: r.capacity.toString() })));
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
              <View style={[styles.cardList, isDesktop && { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }]}>
                {rooms.map(room => (
                  <View key={room.id} style={[styles.roomCard, isDesktop && { width: '48%' }]}>
                    <View style={[styles.roomIconBox, { backgroundColor: '#F3E8FF', width: 64, height: 64, borderRadius: 16 }]}>
                      <Ionicons name="business" size={32} color="#7209B7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      {/* Title Row */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TextInput
                          style={[styles.roomNameInput, { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0, fontSize: 20, color: '#0F172A', flex: 1 }]}
                          value={room.name}
                          onChangeText={(val) => updateRoom(room.id, 'name', val)}
                          placeholder="Nombre de la sala"
                          placeholderTextColor="#94A3B8"
                        />
                        <TouchableOpacity onPress={() => openDeleteConfirmation(room)} style={[styles.deleteBtn, { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2' }]}>
                          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>

                      {/* First Row of Pills */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        {/* Capacity */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#7209B7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 }}>
                          <Ionicons name="people" size={16} color="#FFF" />
                          <TextInput
                            style={{ fontSize: 14, fontWeight: '700', color: '#FFF', width: 28, padding: 0, textAlign: 'center' }}
                            value={room.capacity}
                            onChangeText={(val) => updateRoom(room.id, 'capacity', val)}
                            keyboardType="numeric"
                            maxLength={4}
                          />
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>personas</Text>
                        </View>
                        
                        {/* Floor */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 }}>
                          <Ionicons name="location" size={16} color="#475569" />
                          <TextInput
                            style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', minWidth: 40, padding: 0 }}
                            value={room.floor}
                            onChangeText={(val) => updateRoom(room.id, 'floor', val)}
                            placeholder="Ubicación"
                            placeholderTextColor="#94A3B8"
                          />
                        </View>
                      </View>

                      {/* Second Row of Pills */}
                      <View style={{ flexDirection: 'row', marginTop: 8 }}>
                        <TouchableOpacity 
                          onPress={() => updateRoom(room.id, 'info', room.info === 'Especial' ? 'Estándar' : 'Especial')}
                          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 }}
                        >
                          <Ionicons name="document-text-outline" size={16} color="#475569" />
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>
                            {room.info === 'Especial' ? 'Especial' : 'Estándar'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
                
                <TouchableOpacity style={[styles.addCardBtn, isDesktop && { width: '48%' }]} onPress={addRoom}>
                  <Ionicons name="add" size={24} color={COLORS.muted} />
                  <Text style={[styles.addCardText, { fontSize: 16 }]}>Agregar Espacio</Text>
                </TouchableOpacity>
              </View>

              <SectionHeader title="Gestión de Dependencias" kicker="ORGANIZACIÓN" />
              <View style={[styles.cardList, isDesktop && { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }]}>
                {dependencies.map(dep => (
                  <View key={dep.id} style={[styles.depCard, { borderColor: '#A9301E' }, isDesktop && { width: '48%' }]}>
                    <View style={[styles.roomIconBox, { backgroundColor: '#FDECEB', width: 64, height: 64, borderRadius: 16 }]}>
                      <Ionicons name="people-circle" size={32} color="#A9301E" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TextInput
                          style={[styles.roomNameInput, { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0, fontSize: 20, color: '#0F172A', flex: 1 }]}
                          value={dep.name}
                          onChangeText={(val) => updateDependency(dep.id, val)}
                          placeholder="Nombre de la dependencia"
                          placeholderTextColor="#94A3B8"
                        />
                        <TouchableOpacity onPress={() => openDeleteDepConfirmation(dep)} style={[styles.deleteBtn, { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2' }]}>
                          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
                
                <TouchableOpacity style={[styles.addCardBtn, isDesktop && { width: '48%' }]} onPress={addDependency}>
                  <Ionicons name="add" size={24} color={COLORS.muted} />
                  <Text style={[styles.addCardText, { fontSize: 16 }]}>Agregar Dependencia</Text>
                </TouchableOpacity>
              </View>

              <SectionHeader title="Usuarios y Roles" kicker="ACCESOS DEL SISTEMA" />
              <View style={styles.userSectionCard}>
                <View style={styles.userSectionHeader}>
                  <TextInput
                    style={styles.userSearchInput}
                    value={userSearch}
                    onChangeText={setUserSearch}
                    placeholder="Buscar usuario, correo o dependencia"
                  />
                  <TouchableOpacity style={styles.exportUsersBtn} onPress={exportUsers}>
                    <Ionicons name="download-outline" size={18} color={COLORS.white} />
                    <Text style={styles.exportUsersText}>Excel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addUserBtn} onPress={addUser}>
                    <Ionicons name="person-add-outline" size={18} color={COLORS.white} />
                    <Text style={styles.exportUsersText}>Agregar</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.userTable}>
                  <View style={styles.userTableHeader}>
                    <Text style={[styles.userTableCell, styles.userTableHeaderText, { flex: 1.6 }]}>Nombre</Text>
                    <Text style={[styles.userTableCell, styles.userTableHeaderText, { flex: 1.3 }]}>Dependencia</Text>
                    <Text style={[styles.userTableCell, styles.userTableHeaderText, { flex: 0.8 }]}>Rol</Text>
                    <Text style={[styles.userTableCell, styles.userTableHeaderText, { flex: 0.8 }]}>Inicio</Text>
                    <Text style={[styles.userTableCell, styles.userTableHeaderText, { flex: 0.8 }]}>Fin</Text>
                    <Text style={[styles.userTableCell, styles.userTableHeaderText, { flex: 0.7 }]}>Activo</Text>
                    <Text style={[styles.userTableCell, styles.userTableHeaderText, { flex: 1.3 }]}>Acciones</Text>
                  </View>

                  {filteredUsers.map(user => (
                    <View key={user.id} style={styles.userTableRow}>
                      <View style={[styles.userTableCell, { flex: 1.6, gap: 3 }]}>
                        <Text style={styles.userNameText}>{user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Sin nombre'}</Text>
                        <Text style={styles.userEmailText}>{user.email || 'Sin correo'}</Text>
                      </View>
                      <View style={[styles.userTableCell, { flex: 1.3 }]}>
                        <Text style={styles.userMetaText}>{dependencies.find(dep => dep.id === user.dependency_id)?.name || 'Sin dependencia'}</Text>
                      </View>
                      <View style={[styles.userTableCell, { flex: 0.8 }]}>
                        <View style={{ backgroundColor: user.role === 'admin' ? '#FEF08A' : user.role === 'security' ? '#BFDBFE' : '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: user.role === 'admin' ? '#854D0E' : user.role === 'security' ? '#1E40AF' : '#475569' }}>
                            {user.role === 'admin' ? 'Admin' : user.role === 'security' ? 'Seguridad' : 'Func.'}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.userTableCell, { flex: 0.8 }]}>
                        <Text style={styles.userMetaText}>{user.start_date || '-'}</Text>
                      </View>
                      <View style={[styles.userTableCell, { flex: 0.8 }]}>
                        <Text style={styles.userMetaText}>{user.end_date || '-'}</Text>
                      </View>
                      <View style={[styles.userTableCell, { flex: 0.7 }]}>
                        <Switch
                          value={!!user.is_active}
                          onValueChange={(val) => toggleUserStatus(user.id, val)}
                          trackColor={{ false: COLORS.line, true: COLORS.success }}
                          thumbColor={COLORS.white}
                        />
                      </View>
                      <View style={[styles.userTableCell, { flex: 1.3, gap: 6 }]}>
                        <TouchableOpacity style={styles.userActionBtn} onPress={() => openUserEditor(user)}>
                          <Text style={styles.userActionBtnText}>Modificar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.userActionBtn, styles.userDeleteBtn]} onPress={() => deleteUser(user)}>
                          <Text style={[styles.userActionBtnText, { color: COLORS.danger }]}>Borrar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={saveUsers} disabled={saving}>
                  <LinearGradient colors={[COLORS.primary, COLORS.primarySoft]} style={styles.saveGradient}>
                    {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.saveText}>GUARDAR USUARIOS</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <SectionHeader title="Gestión de Conductores" kicker="LOGÍSTICA DE TRANSPORTE" />
              <View style={[styles.cardList, isDesktop && { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }]}>
                {drivers.map(drv => (
                  <View key={drv.id} style={[styles.depCard, { borderColor: '#3B82F6' }, isDesktop && { width: '48%' }]}>
                    <View style={[styles.roomIconBox, { backgroundColor: '#EFF6FF', width: 64, height: 64, borderRadius: 16 }]}>
                      <Ionicons name="car-sport" size={32} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TextInput
                          style={[styles.roomNameInput, { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0, fontSize: 20, color: '#0F172A', flex: 1 }]}
                          value={drv.name}
                          onChangeText={(val) => updateDriver(drv.id, 'name', val)}
                          placeholder="Nombre del conductor"
                          placeholderTextColor="#94A3B8"
                        />
                        <TouchableOpacity onPress={() => openDriverDeleteConfirmation(drv)} style={[styles.deleteBtn, { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2' }]}>
                          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Phone Pill */}
                      <View style={{ flexDirection: 'row', marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 }}>
                          <Ionicons name="call" size={16} color="#475569" />
                          <TextInput
                            style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', minWidth: 80, padding: 0 }}
                            value={drv.phone}
                            onChangeText={(val) => updateDriver(drv.id, 'phone', val)}
                            placeholder="Teléfono"
                            placeholderTextColor="#94A3B8"
                            keyboardType="phone-pad"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
                
                <TouchableOpacity style={[styles.addCardBtn, isDesktop && { width: '48%' }]} onPress={addDriver}>
                  <Ionicons name="add" size={24} color={COLORS.muted} />
                  <Text style={[styles.addCardText, { fontSize: 16 }]}>Agregar Conductor</Text>
                </TouchableOpacity>
              </View>

              <SectionHeader title="Correos de Secretaría General" kicker="NOTIFICACIONES DE SERVICIO" />
              <View style={[styles.cardList, isDesktop && { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }]}>
                {([
                  { type: 'maintenance', title: 'Mantenimientos', icon: 'construct', color: '#2A9D8F' },
                  { type: 'visitors', title: 'Visitantes', icon: 'people', color: '#E63946' },
                  { type: 'rooms_special', title: 'Salas Especiales', icon: 'ribbon', color: '#7209B7' },
                  { type: 'parking', title: 'Parqueaderos', icon: 'car', color: '#F4A261' }
                ] as const).map(({ type, title, icon, color }) => {
                  const emails = serviceEmails.filter(e => e.service_type === type);
                  return (
                    <View key={type} style={[{ backgroundColor: COLORS.white, borderRadius: 24, padding: 25, borderWidth: 1, borderColor: COLORS.line }, isDesktop && { width: '48%' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: `${color}15`, justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name={icon as any} size={24} color={color} />
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.primary }}>
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
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 'auto' }}>
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
                <View style={styles.configDivider} />
                <View style={styles.ldapConfigCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Ionicons name="business-outline" size={18} color={COLORS.accent} />
                    <Text style={styles.toggleLabel}>Directorio Activo</Text>
                  </View>
                  <View style={{ gap: 10 }}>
                    <View style={styles.userRow}>
                      <TextInput style={[styles.userFieldInput, { flex: 1 }]} value={ldapServer} onChangeText={setLdapServer} placeholder="Servidor" />
                      <View style={styles.userSwitchRow}>
                        <Text style={styles.userSwitchLabel}>SSL</Text>
                        <Switch value={ldapUseSsl} onValueChange={setLdapUseSsl} trackColor={{ false: COLORS.line, true: COLORS.success }} thumbColor={COLORS.white} />
                      </View>
                    </View>
                    <View style={styles.userRow}>
                      <TextInput style={[styles.userFieldInput, { flex: 1 }]} value={ldapPort} onChangeText={setLdapPort} placeholder="Puerto LDAP" keyboardType="number-pad" />
                      <View style={styles.userSwitchRow}>
                        <Text style={styles.userSwitchLabel}>Usar bind</Text>
                        <Switch value={ldapUseBind} onValueChange={setLdapUseBind} trackColor={{ false: COLORS.line, true: COLORS.accent }} thumbColor={COLORS.white} />
                      </View>
                    </View>
                    <TextInput style={styles.userFieldInput} value={ldapComments} onChangeText={setLdapComments} placeholder="Comentarios" />
                    <TextInput style={styles.userFieldInput} value={ldapFilter} onChangeText={setLdapFilter} placeholder="Filtro de conexión" multiline />
                    <TextInput style={styles.userFieldInput} value={ldapBaseDn} onChangeText={setLdapBaseDn} placeholder="BaseDN" />
                    <TextInput style={styles.userFieldInput} value={ldapRootDn} onChangeText={setLdapRootDn} placeholder="RootDN" />
                    <TextInput style={styles.userFieldInput} value={ldapPassword} onChangeText={setLdapPassword} placeholder="Contraseña" secureTextEntry />
                    <View style={styles.userRow}>
                      <TextInput style={[styles.userFieldInput, { flex: 1 }]} value={ldapUserField} onChangeText={setLdapUserField} placeholder="Campo de usuario" />
                      <TextInput style={[styles.userFieldInput, { flex: 1 }]} value={ldapSyncField} onChangeText={setLdapSyncField} placeholder="Campo de sincronización" />
                    </View>
                    <TextInput style={styles.userFieldInput} value={ldapRelay} onChangeText={setLdapRelay} placeholder="Relay correo" />
                  </View>
                </View>
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

      <Modal
        visible={userModalVisible && !!userDraft}
        transparent={true}
        animationType="slide"
        onRequestClose={closeUserEditor}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContainer, { maxWidth: 560, padding: 20 }]}> 
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>{userDraft?.id?.toString().startsWith('temp-') ? 'Crear usuario' : 'Editar usuario'}</Text>
              <TouchableOpacity onPress={closeUserEditor}>
                <Ionicons name="close" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 520 }}>
              <View style={{ gap: 10 }}>
                <View style={styles.userRow}>
                  <TextInput style={[styles.userFieldInput, { flex: 1 }]} value={userDraft?.first_name || ''} onChangeText={(val) => setUserDraft({ ...userDraft, first_name: val })} placeholder="Nombres" />
                  <TextInput style={[styles.userFieldInput, { flex: 1 }]} value={userDraft?.last_name || ''} onChangeText={(val) => setUserDraft({ ...userDraft, last_name: val })} placeholder="Apellidos" />
                </View>
                <TextInput style={styles.userFieldInput} value={userDraft?.email || ''} onChangeText={(val) => setUserDraft({ ...userDraft, email: val })} placeholder="Correo electrónico" keyboardType="email-address" autoCapitalize="none" />
                <View style={styles.userRow}>
                  <TextInput style={[styles.userFieldInput, { flex: 1 }]} value={userDraft?.username || ''} onChangeText={(val) => setUserDraft({ ...userDraft, username: val })} placeholder="Usuario" />
                  <TextInput style={[styles.userFieldInput, { flex: 1 }]} value={userDraft?.phone || ''} onChangeText={(val) => setUserDraft({ ...userDraft, phone: val })} placeholder="Teléfono" keyboardType="phone-pad" />
                </View>
                <View style={styles.userRow}>
                  <TextInput style={[styles.userFieldInput, { flex: 1 }]} value={userDraft?.entity || ''} onChangeText={(val) => setUserDraft({ ...userDraft, entity: val })} placeholder="Entidad" />
                  <View style={styles.rolePills}>
                    {['user', 'admin', 'security'].map(role => (
                      <TouchableOpacity key={role} style={[styles.rolePill, userDraft?.role === role && styles.rolePillActive]} onPress={() => setUserDraft({ ...userDraft, role })}>
                        <Text style={[styles.rolePillText, userDraft?.role === role && styles.rolePillTextActive]}>{role === 'admin' ? 'Admin' : role === 'security' ? 'Seguridad' : 'Func.'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.userRow}>
                  <TextInput style={[styles.userFieldInput, { flex: 1 }]} value={userDraft?.start_date || ''} onChangeText={(val) => setUserDraft({ ...userDraft, start_date: val })} placeholder="Fecha inicio (YYYY-MM-DD)" />
                  <TextInput style={[styles.userFieldInput, { flex: 1 }]} value={userDraft?.end_date || ''} onChangeText={(val) => setUserDraft({ ...userDraft, end_date: val })} placeholder="Fecha vencimiento (YYYY-MM-DD)" />
                </View>
                <View style={styles.userRow}>
                  <Text style={styles.userSwitchLabel}>Dependencia</Text>
                  <View style={{ flex: 1, gap: 6 }}>
                    {dependencies.map(dep => (
                      <TouchableOpacity key={dep.id} style={[styles.rolePill, userDraft?.dependency_id === dep.id && styles.rolePillActive]} onPress={() => setUserDraft({ ...userDraft, dependency_id: dep.id })}>
                        <Text style={[styles.rolePillText, userDraft?.dependency_id === dep.id && styles.rolePillTextActive]}>{dep.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.userActions}>
                  <View style={styles.userSwitchRow}>
                    <Text style={styles.userSwitchLabel}>Activo</Text>
                    <Switch value={!!userDraft?.is_active} onValueChange={(val) => setUserDraft({ ...userDraft, is_active: val })} trackColor={{ false: COLORS.line, true: COLORS.success }} thumbColor={COLORS.white} />
                  </View>
                  <View style={styles.userSwitchRow}>
                    <Text style={styles.userSwitchLabel}>LDAP</Text>
                    <Switch value={!!userDraft?.ldap_enabled} onValueChange={(val) => setUserDraft({ ...userDraft, ldap_enabled: val })} trackColor={{ false: COLORS.line, true: COLORS.accent }} thumbColor={COLORS.white} />
                  </View>
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={saveUserDraft} disabled={saving}>
                  <LinearGradient colors={[COLORS.primary, COLORS.primarySoft]} style={styles.saveGradient}>
                    {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.saveText}>{userDraft?.id?.toString().startsWith('temp-') ? 'CREAR USUARIO' : 'ACTUALIZAR USUARIO'}</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
            
            <View style={{ width: '100%', marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.muted, marginBottom: 8, textAlign: 'center' }}>
                Escribe "eliminar" para confirmar:
              </Text>
              <TextInput
                style={[styles.userFieldInput, { textAlign: 'center' }]}
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
                placeholder="eliminar"
                autoCapitalize="none"
              />
            </View>

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
                style={[styles.modalButton, styles.confirmDeleteButton, deleteConfirmationText !== 'eliminar' && { opacity: 0.5 }]} 
                onPress={confirmDeleteDriver}
                disabled={saving || deleteConfirmationText !== 'eliminar'}
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
            
            <View style={{ width: '100%', marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.muted, marginBottom: 8, textAlign: 'center' }}>
                Escribe "eliminar" para confirmar:
              </Text>
              <TextInput
                style={[styles.userFieldInput, { textAlign: 'center' }]}
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
                placeholder="eliminar"
                autoCapitalize="none"
              />
            </View>

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
                style={[styles.modalButton, styles.confirmDeleteButton, deleteConfirmationText !== 'eliminar' && { opacity: 0.5 }]} 
                onPress={confirmDeleteRoom}
                disabled={saving || deleteConfirmationText !== 'eliminar'}
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
            
            <View style={{ width: '100%', marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.muted, marginBottom: 8, textAlign: 'center' }}>
                Escribe "eliminar" para confirmar:
              </Text>
              <TextInput
                style={[styles.userFieldInput, { textAlign: 'center' }]}
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
                placeholder="eliminar"
                autoCapitalize="none"
              />
            </View>

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
                style={[styles.modalButton, styles.confirmDeleteButton, deleteConfirmationText !== 'eliminar' && { opacity: 0.5 }]} 
                onPress={confirmDeleteDependency}
                disabled={saving || deleteConfirmationText !== 'eliminar'}
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

      {/* MODAL DE CONFIRMACIÓN DE CREACIÓN */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBox, { backgroundColor: `${COLORS.accent}15` }]}>
              <Ionicons name="add-circle" size={40} color={COLORS.accent} />
            </View>
            <Text style={styles.modalTitle}>
              {itemToCreate === 'room' ? '¿Agregar nuevo espacio?' : 
               itemToCreate === 'dependency' ? '¿Agregar nueva dependencia?' : 
               '¿Agregar nuevo conductor?'}
            </Text>
            <Text style={styles.modalDescription}>
              Se agregará un nuevo registro a la lista. Recuerda llenar sus datos y presionar Guardar Cambios para confirmar de manera definitiva.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.successButton, { flex: 1, backgroundColor: COLORS.accent }]} 
                onPress={confirmCreate}
              >
                <Text style={styles.successButtonText}>Confirmar</Text>
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
            <Text style={styles.heroKicker}>AJUSTES DE SISTEMA</Text>
            <Text style={styles.heroTitle}>Configuración General</Text>
            <Text style={styles.heroSub}>Administre los recursos y reglas del portal</Text>
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
  sectionHeader: { marginTop: 40, marginBottom: 20 },
  sectionKicker: { fontSize: 11, fontWeight: '900', color: COLORS.accent, letterSpacing: 1.5 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: COLORS.primary, marginTop: 4 },

  loaderContainer: { height: 300, justifyContent: 'center', alignItems: 'center', gap: 15 },
  loaderText: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },

  cardList: { gap: 12 },
  roomCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: 20, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 16, 
    borderWidth: 1.5, 
    borderColor: '#7209B7',
    ...Platform.select({
      ios: { shadowColor: '#7209B7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 15px rgba(114, 9, 183, 0.08)' }
    })
  },
  depCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: 20, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 16, 
    borderWidth: 1.5, 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 },
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

  addCardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 18, borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.line },
  addCardText: { fontSize: 16, fontWeight: '800', color: COLORS.accent },

  userSectionCard: { backgroundColor: COLORS.white, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: COLORS.line, gap: 12 },
  userSectionHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  userSearchInput: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: '600', color: COLORS.primary },
  exportUsersBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.success, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  addUserBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  exportUsersText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  userCard: { backgroundColor: COLORS.bg, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.line, gap: 10 },
  userNameInput: { fontSize: 16, fontWeight: '800', color: COLORS.primary, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 12, paddingVertical: 10 },
  userFieldInput: { fontSize: 14, fontWeight: '600', color: COLORS.text, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 12, paddingVertical: 10 },
  userRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rolePills: { flexDirection: 'row', gap: 6 },
  rolePill: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  rolePillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rolePillText: { fontSize: 11, fontWeight: '800', color: COLORS.muted },
  rolePillTextActive: { color: COLORS.white },
  userActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' },
  userSwitchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userSwitchLabel: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  userTable: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, overflow: 'hidden' },
  userTableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: COLORS.line },
  userTableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  userTableCell: { paddingHorizontal: 6 },
  userTableHeaderText: { fontSize: 11, fontWeight: '900', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  userNameText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  userEmailText: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  userMetaText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  userActionBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center' },
  userActionBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  userDeleteBtn: { backgroundColor: '#FEF2F2' },
  ldapConfigCard: { padding: 16, backgroundColor: COLORS.bg, gap: 8 },

  configCard: { backgroundColor: COLORS.white, borderRadius: 28, padding: 5, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 20 },
  toggleIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  toggleLabel: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  toggleDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: '500' },
  logoutBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
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

