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
  { id: '11111111-1111-1111-1111-111111111111', name: 'Sala Innovación', capacity: '12', floor: 'Piso 2' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Sala de Juntas B', capacity: '8', floor: 'Piso 1' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Focus Room 4', capacity: '2', floor: 'Piso 3' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Auditorio Principal', capacity: '50', floor: 'PB' },
];

const INITIAL_DEPENDENCIES = [
  { id: '11111111-2222-3333-4444-555555555501', name: 'DESPACHO SECRETARIA JURIDICA' },
  { id: '11111111-2222-3333-4444-555555555502', name: 'DIRECCION DE GESTION CORPORATIVA' },
  { id: '11111111-2222-3333-4444-555555555503', name: 'DIRECCION DISTRITAL DE ASUNTOS DISCIPLINARIOS' },
  { id: '11111111-2222-3333-4444-555555555504', name: 'DIRECCION DISTRITAL DE DEFENSA JUDICIAL' },
  { id: '11111111-2222-3333-4444-555555555505', name: 'DIRECCION DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS' },
  { id: '11111111-2222-3333-4444-555555555506', name: 'DIRECCION DISTRITAL DE IVC' },
  { id: '11111111-2222-3333-4444-555555555507', name: 'DIRECCION DISTRITAL DE POLITICA JURIDICA' },
  { id: '11111111-2222-3333-4444-555555555508', name: 'OFICINA ASESORA DE PLANEACION' },
  { id: '11111111-2222-3333-4444-555555555509', name: 'OFICINA DE CONTROL INTERNO' },
  { id: '11111111-2222-3333-4444-555555555510', name: 'OFICINA DE TECNOLOGIAS DE LA INFORMACION Y LAS COMUNICACIONES' },
  { id: '11111111-2222-3333-4444-555555555511', name: 'SUBSECRETARIA JURIDICA' }
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
  const [autoApproveVisitors, setAutoApproveVisitors] = useState(false);
  const [evalCategories, setEvalCategories] = useState<string[]>(['visitors', 'transport', 'maintenance', 'rooms', 'parking']);
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
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [showUserDeleteModal, setShowUserDeleteModal] = useState(false);
  const [showEvalConfirmModal, setShowEvalConfirmModal] = useState(false);
  const [pendingEvalToggle, setPendingEvalToggle] = useState<{id: string, label: string, newValue: boolean} | null>(null);
  const [showSystemConfirmModal, setShowSystemConfirmModal] = useState(false);
  const [pendingSystemToggle, setPendingSystemToggle] = useState<{key: 'autoApprove' | 'autoApproveVisitors', label: string, desc: string, newValue: boolean} | null>(null);

  // Edit Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDraft, setEditDraft] = useState<any>(null);
  const [editType, setEditType] = useState<'room'|'dependency'|'driver'|null>(null);

  // Inputs para añadir correos en tiempo real
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({
    maintenance: '',
    visitors: '',
    rooms: '',
    rooms_special: '',
    parking: ''
  });
  
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // Load configuration, rooms, dependencies, drivers and service emails
  useEffect(() => {
    const loadConfigAndData = async () => {
      try {
        setLoading(true);
        
        // 0. Cargar el usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setCurrentUserEmail(user.email);
        }
        
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
        const savedAutoVisitors = await safeStorage.getItem('auto_approve_visitors');
        
        if (savedPush !== null) setNotifications(savedPush === 'true');
        if (savedAuto !== null) setAutoApprove(savedAuto === 'true');
        if (savedAutoVisitors !== null) setAutoApproveVisitors(savedAutoVisitors === 'true');

        // 6. Cargar configuración global del sistema (Evaluación)
        const dbEvalCategories = await settingsService.getSystemSetting('eval_categories');
        if (dbEvalCategories) {
          setEvalCategories(dbEvalCategories);
        }

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
        const savedAutoVisitors = await safeStorage.getItem('auto_approve_visitors');
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
        if (savedAutoVisitors !== null) setAutoApproveVisitors(savedAutoVisitors === 'true');
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
    let fn = user.first_name;
    let ln = user.last_name;
    if (!fn && !ln && user.full_name) {
      const parts = user.full_name.trim().split(' ');
      fn = parts[0] || '';
      ln = parts.slice(1).join(' ') || '';
    }

    setUserDraft({
      ...user,
      first_name: fn || '',
      last_name: ln || '',
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

  const openUserDeleteConfirmation = (user: any) => {
    setUserToDelete(user);
    setDeleteConfirmationText('');
    setShowUserDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setSaving(true);
      if (!String(userToDelete.id).startsWith('temp-')) {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userToDelete.id);
        if (error) throw error;
      }
      setUsers(users.filter(item => item.id !== userToDelete.id));
      setShowUserDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error eliminando usuario:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = (userId: string, value: boolean) => {
    setUsers(users.map(user => user.id === userId ? { ...user, is_active: value } : user));
  };

  const confirmSystemToggle = async () => {
    if (!pendingSystemToggle) return;
    try {
      setSaving(true);
      if (pendingSystemToggle.key === 'autoApprove') {
        setAutoApprove(pendingSystemToggle.newValue);
        await safeStorage.setItem('auto_approve', pendingSystemToggle.newValue.toString());
      } else if (pendingSystemToggle.key === 'autoApproveVisitors') {
        setAutoApproveVisitors(pendingSystemToggle.newValue);
        await safeStorage.setItem('auto_approve_visitors', pendingSystemToggle.newValue.toString());
      }
      setShowSystemConfirmModal(false);
      setPendingSystemToggle(null);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  };

  const confirmEvalToggle = async () => {
    if (!pendingEvalToggle) return;
    try {
      setSaving(true);
      let newArr = [...evalCategories];
      if (pendingEvalToggle.newValue) {
        if (!newArr.includes(pendingEvalToggle.id)) newArr.push(pendingEvalToggle.id);
      } else {
        newArr = newArr.filter(c => c !== pendingEvalToggle.id);
      }
      setEvalCategories(newArr);
      await settingsService.updateSystemSetting('eval_categories', newArr);
      setShowEvalConfirmModal(false);
      setPendingEvalToggle(null);
    } catch (err) {
      console.error('Error al actualizar configuración:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateDriver = (id: string, field: keyof Driver, val: any) => {
    setDrivers(drivers.map(d => d.id === id ? { ...d, [field]: val } : d));
  };

  const addDriver = () => {
    setItemToCreate('driver');
    setShowCreateModal(true);
  };

  const confirmCreate = async () => {
    try {
      setSaving(true);
      if (itemToCreate === 'room') {
        const { data, error } = await supabase.from('rooms').insert([{ name: 'Nueva Sala', capacity: 10, floor: 'Piso 1', info: 'Estándar' }]).select();
        if (error) throw error;
        setRooms([...rooms, data[0]]);
      } else if (itemToCreate === 'dependency') {
        const { data, error } = await supabase.from('dependencies').insert([{ name: 'Nueva Dependencia' }]).select();
        if (error) throw error;
        setDependencies([...dependencies, data[0]]);
      } else if (itemToCreate === 'driver') {
        const newDriverPayload = { name: 'Nuevo Conductor', phone: '3000000000', is_active: true };
        const created = await settingsService.createDriver(newDriverPayload);
        setDrivers([...drivers, created]);
      }
      setShowCreateModal(false);
      setItemToCreate(null);
    } catch (err) {
      console.error('Error al crear item:', err);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (item: any, type: 'room'|'dependency'|'driver') => {
    setEditDraft({ ...item });
    setEditType(type);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditDraft(null);
    setEditType(null);
  };

  const saveEditDraft = async () => {
    if (!editDraft) return;
    try {
      setSaving(true);
      if (editType === 'room') {
        const { error } = await supabase.from('rooms').update({ name: editDraft.name, capacity: parseInt(editDraft.capacity) || 0, floor: editDraft.floor, info: editDraft.info }).eq('id', editDraft.id);
        if (error) throw error;
        setRooms(rooms.map(r => r.id === editDraft.id ? editDraft : r));
      } else if (editType === 'dependency') {
        const { error } = await supabase.from('dependencies').update({ name: editDraft.name }).eq('id', editDraft.id);
        if (error) throw error;
        setDependencies(dependencies.map(d => d.id === editDraft.id ? editDraft : d));
      } else if (editType === 'driver') {
        const payload = { name: editDraft.name, phone: editDraft.phone, is_active: editDraft.is_active };
        await settingsService.updateDriver(editDraft.id, payload);
        setDrivers(drivers.map(d => d.id === editDraft.id ? editDraft : d));
      }
      closeEditModal();
    } catch (err) {
      console.error('Error al editar item:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasEditChanges = useMemo(() => {
    if (!editDraft) return false;
    let original = null;
    if (editType === 'room') original = rooms.find(r => r.id === editDraft.id);
    else if (editType === 'dependency') original = dependencies.find(d => d.id === editDraft.id);
    else if (editType === 'driver') original = drivers.find(d => d.id === editDraft.id);
    return JSON.stringify(original) !== JSON.stringify(editDraft);
  }, [editDraft, rooms, dependencies, drivers, editType]);

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
  const addServiceEmail = async (type: 'maintenance' | 'visitors' | 'rooms' | 'rooms_special' | 'parking') => {
    const emailVal = emailInputs[type]?.trim();
    if (!emailVal) return;

    try {
      setSaving(true);
      const newEmailPayload = {
        service_type: type,
        email: emailVal
      };

      const created = await settingsService.createServiceEmail(newEmailPayload);
      const updatedEmails = [...(serviceEmails || []), created];
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

      const updatedEmails = (serviceEmails || []).filter(e => e && e.id !== id);
      setServiceEmails(updatedEmails);
      await safeStorage.setItem('local_service_emails', JSON.stringify(updatedEmails));
    } catch (err) {
      console.error('Error al eliminar correo de servicio:', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (loading) return; // Skip saving on mount
    const timer = setTimeout(() => {
      const saveConfig = async () => {
        try {
          await safeStorage.setItem('push_notifications', notifications.toString());
          await safeStorage.setItem('auto_approve', autoApprove.toString());
          await safeStorage.setItem('auto_approve_visitors', autoApproveVisitors.toString());
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
        } catch (e) {
          console.error(e);
        }
      };
      saveConfig();
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    notifications, autoApprove, autoApproveVisitors, ldapBaseDn, ldapPort, ldapUseSsl, ldapServer, 
    ldapFilter, ldapUseBind, ldapRootDn, ldapUserField, ldapSyncField, 
    ldapComments, ldapRelay, loading
  ]);



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
                    <TouchableOpacity onPress={() => openEditModal(room, 'room')} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      {/* Icon */}
                      <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: '#7209B7', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="business" size={20} color="#FFF" />
                      </View>
                      
                      {/* Title & Info */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.roomNameInput, { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0, fontSize: 16, fontWeight: '900', color: '#1E293B', flex: 1 }]}>
                          {room.name || 'Sin nombre'}
                        </Text>
                        
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="people" size={14} color="#64748B" />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                              {room.capacity || '0'} pers.
                            </Text>
                          </View>
                          
                          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center' }} />
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="location" size={14} color="#64748B" />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
                              {room.floor || 'Sin ubicación'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Footer */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, color: '#64748B' }}>
                        ESPACIO {room.info === 'Especial' ? 'ESPECIAL' : 'ESTÁNDAR'}
                      </Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => openEditModal(room, 'room')} style={{ padding: 4 }}>
                          <Ionicons name="pencil" size={16} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openDeleteConfirmation(room)} style={{ padding: 4 }}>
                          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
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
                  <View key={dep.id} style={[styles.depCard, isDesktop && { width: '48%' }]}>
                    <TouchableOpacity onPress={() => openEditModal(dep, 'dependency')} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: '#A9301E', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="people-circle" size={20} color="#FFF" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', height: 44 }}>
                        <Text style={[styles.roomNameInput, { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0, fontSize: 16, fontWeight: '900', color: '#1E293B' }]}>
                          {dep.name || 'Sin nombre'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    
                    {/* Footer */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, color: '#64748B' }}>
                        REGISTRO ACTIVO
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => openEditModal(dep, 'dependency')} style={{ padding: 4 }}>
                          <Ionicons name="pencil" size={16} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openDeleteDepConfirmation(dep)} style={{ padding: 4 }}>
                          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
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
                      <View style={[styles.userTableCell, { flex: 1.3, gap: 6 }]}>
                        <TouchableOpacity style={styles.userActionBtn} onPress={() => openUserEditor(user)}>
                          <Text style={styles.userActionBtnText}>Modificar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.userActionBtn, styles.userDeleteBtn]} onPress={() => openUserDeleteConfirmation(user)}>
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
                  <View key={drv.id} style={[styles.depCard, isDesktop && { width: '48%' }]}>
                    <TouchableOpacity onPress={() => openEditModal(drv, 'driver')} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="car-sport" size={20} color="#FFF" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.roomNameInput, { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0, fontSize: 16, fontWeight: '900', color: '#1E293B', flex: 1 }]}>
                          {drv.name || 'Sin nombre'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="call" size={14} color="#64748B" />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
                            {drv.phone || 'Sin teléfono'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Footer */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, color: '#64748B' }}>
                        REGISTRO ACTIVO
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => openEditModal(drv, 'driver')} style={{ padding: 4 }}>
                          <Ionicons name="pencil" size={16} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openDriverDeleteConfirmation(drv)} style={{ padding: 4 }}>
                          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                        </TouchableOpacity>
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
                  { type: 'rooms', title: 'Salas Estándar', icon: 'business', color: '#4361EE' },
                  { type: 'rooms_special', title: 'Salas Especiales', icon: 'ribbon', color: '#7209B7' },
                  { type: 'parking', title: 'Parqueaderos', icon: 'car', color: '#F4A261' }
                ] as const).map(({ type, title, icon, color }) => {
                  const emails = (serviceEmails || []).filter(e => e && e.service_type === type);
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

              <SectionHeader title="Evaluación de Servicios" kicker="CONTROL DE CALIDAD" />
              <View style={styles.configCard}>
                {[
                  { id: 'maintenance', label: 'Mantenimiento Locativo' },
                  { id: 'visitors', label: 'Control de Visitantes' },
                  { id: 'rooms', label: 'Reserva de Salas' },
                  { id: 'parking', label: 'Cupo de Parqueadero' },
                  { id: 'transport', label: 'Transporte Oficial' }
                ].map((item, index, arr) => (
                  <React.Fragment key={item.id}>
                    <ConfigToggle 
                      label={item.label} 
                      desc={`Solicitar evaluación obligatoria al completar servicios de ${item.label.toLowerCase()}.`}
                      value={evalCategories.includes(item.id)}
                      onValueChange={(val: boolean) => {
                        setPendingEvalToggle({ id: item.id, label: item.label, newValue: val });
                        setShowEvalConfirmModal(true);
                      }}
                      icon="star"
                    />
                    {index < arr.length - 1 && <View style={styles.configDivider} />}
                  </React.Fragment>
                ))}
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
                  label="Aprobación Automática Salas" 
                  desc="Aprobar solicitudes de salas estandar si hay disponibilidad inmediata."
                  value={autoApprove}
                  onValueChange={(val: boolean) => {
                    setPendingSystemToggle({
                      key: 'autoApprove',
                      label: 'Aprobación Automática Salas',
                      desc: 'aprobar las solicitudes de salas estándar de forma automática',
                      newValue: val
                    });
                    setShowSystemConfirmModal(true);
                  }}
                  icon="flash"
                />
                <View style={styles.configDivider} />
                <ConfigToggle 
                  label="Aprobación Automática Visitantes" 
                  desc="Aprobar solicitudes de visitantes de forma automática."
                  value={autoApproveVisitors}
                  onValueChange={(val: boolean) => {
                    setPendingSystemToggle({
                      key: 'autoApproveVisitors',
                      label: 'Aprobación Automática Visitantes',
                      desc: 'aprobar las solicitudes de control de visitantes de forma automática',
                      newValue: val
                    });
                    setShowSystemConfirmModal(true);
                  }}
                  icon="flash"
                />
                <View style={styles.configDivider} />
                {currentUserEmail === 'admin@sasge.com' && (
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
                )}
              </View>

              {/* Removed handleSaveChanges button for auto-save feature */}

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
          <View style={[styles.modalContainer, { maxWidth: 700, padding: 24, backgroundColor: COLORS.primary, borderWidth: 1, borderColor: COLORS.primarySoft }]}> 
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.modalTitle, { color: COLORS.white, fontSize: 20 }]}>{userDraft?.id?.toString().startsWith('temp-') ? 'Crear Nuevo Usuario' : 'Editar Usuario'}</Text>
            </View>
            <ScrollView style={{ maxHeight: 600, paddingRight: 8 }}>
              <View style={{ gap: 20 }}>
                
                {/* Información Personal */}
                <View style={{ gap: 10 }}>
                  <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Información Personal</Text>
                  <View style={styles.userRow}>
                    <TextInput style={[styles.userFieldInput, { flex: 1, backgroundColor: COLORS.primarySoft, color: COLORS.white, borderColor: COLORS.primaryDark }]} placeholderTextColor={COLORS.muted} value={userDraft?.first_name || ''} onChangeText={(val) => setUserDraft({ ...userDraft, first_name: val })} placeholder="Nombres" />
                    <TextInput style={[styles.userFieldInput, { flex: 1, backgroundColor: COLORS.primarySoft, color: COLORS.white, borderColor: COLORS.primaryDark }]} placeholderTextColor={COLORS.muted} value={userDraft?.last_name || ''} onChangeText={(val) => setUserDraft({ ...userDraft, last_name: val })} placeholder="Apellidos" />
                  </View>
                  <View style={styles.userRow}>
                    <TextInput style={[styles.userFieldInput, { flex: 1.5, backgroundColor: COLORS.primarySoft, color: COLORS.white, borderColor: COLORS.primaryDark }]} placeholderTextColor={COLORS.muted} value={userDraft?.email || ''} onChangeText={(val) => setUserDraft({ ...userDraft, email: val })} placeholder="Correo electrónico" keyboardType="email-address" autoCapitalize="none" />
                    <TextInput style={[styles.userFieldInput, { flex: 1, backgroundColor: COLORS.primarySoft, color: COLORS.white, borderColor: COLORS.primaryDark }]} placeholderTextColor={COLORS.muted} value={userDraft?.phone || ''} onChangeText={(val) => setUserDraft({ ...userDraft, phone: val })} placeholder="Teléfono" keyboardType="phone-pad" />
                  </View>
                </View>

                {/* Información Institucional */}
                <View style={{ gap: 10 }}>
                  <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Información Institucional</Text>
                  <View style={styles.userRow}>
                    <TextInput style={[styles.userFieldInput, { flex: 1, backgroundColor: COLORS.primarySoft, color: COLORS.white, borderColor: COLORS.primaryDark }]} placeholderTextColor={COLORS.muted} value={userDraft?.username || ''} onChangeText={(val) => setUserDraft({ ...userDraft, username: val })} placeholder="Nombre de usuario (Login)" autoCapitalize="none" />
                  </View>
                </View>

                {/* Rol del Sistema */}
                <View style={{ gap: 10 }}>
                  <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Rol del Sistema</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity 
                      onPress={() => setUserDraft({ ...userDraft, role: 'user' })}
                      style={[styles.userFieldInput, { flex: 1, backgroundColor: userDraft?.role === 'user' ? COLORS.accent : COLORS.primarySoft, borderColor: userDraft?.role === 'user' ? COLORS.accent : COLORS.primaryDark, justifyContent: 'center', alignItems: 'center' }]}
                    >
                      <Text style={{ color: COLORS.white, fontWeight: '600' }}>Usuario</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setUserDraft({ ...userDraft, role: 'admin' })}
                      style={[styles.userFieldInput, { flex: 1, backgroundColor: userDraft?.role === 'admin' ? COLORS.accent : COLORS.primarySoft, borderColor: userDraft?.role === 'admin' ? COLORS.accent : COLORS.primaryDark, justifyContent: 'center', alignItems: 'center' }]}
                    >
                      <Text style={{ color: COLORS.white, fontWeight: '600' }}>Administrador</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.modalActions, { marginTop: 20 }]}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primarySoft }]} 
                    onPress={closeUserEditor}
                  >
                    <Text style={[styles.cancelButtonText, { color: COLORS.line }]}>CANCELAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.confirmDeleteButton, { flex: 1.5, backgroundColor: COLORS.accent }, saving && { opacity: 0.5 }]} 
                    onPress={saveUserDraft}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.confirmDeleteButtonText}>{userDraft?.id?.toString().startsWith('temp-') ? 'CREAR USUARIO' : 'ACTUALIZAR USUARIO'}</Text>}
                  </TouchableOpacity>
                </View>

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

      {/* MODAL DE CONFIRMACIÓN DE EVALUACIÓN DE SERVICIO */}
      <Modal
        visible={showEvalConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEvalConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBox, { backgroundColor: `${COLORS.accent}15` }]}>
              <Ionicons name="star" size={32} color={COLORS.accent} />
            </View>
            <Text style={styles.modalTitle}>{pendingEvalToggle?.newValue ? '¿Activar' : '¿Desactivar'} Evaluación?</Text>
            <Text style={styles.modalDescription}>
              ¿Estás seguro que deseas {pendingEvalToggle?.newValue ? 'activar' : 'desactivar'} la evaluación obligatoria para el servicio de "{pendingEvalToggle?.label}"?
            </Text>

            <View style={[styles.modalActions, { marginTop: 10 }]}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primarySoft }]} 
                onPress={() => {
                  setShowEvalConfirmModal(false);
                  setPendingEvalToggle(null);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmDeleteButton, { flex: 1, backgroundColor: COLORS.accent }]} 
                onPress={confirmEvalToggle}
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

      {/* MODAL DE CONFIRMACIÓN DE SISTEMA (Aprobación Automática) */}
      <Modal
        visible={showSystemConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSystemConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBox, { backgroundColor: `${COLORS.accent}15` }]}>
              <Ionicons name="flash" size={32} color={COLORS.accent} />
            </View>
            <Text style={styles.modalTitle}>{pendingSystemToggle?.newValue ? '¿Activar' : '¿Desactivar'} {pendingSystemToggle?.label}?</Text>
            <Text style={styles.modalDescription}>
              ¿Estás seguro que deseas {pendingSystemToggle?.newValue ? 'activar' : 'desactivar'} esta función?
              {"\n\n"}
              Esto hará que el sistema empiece a {pendingSystemToggle?.desc}.
            </Text>

            <View style={[styles.modalActions, { marginTop: 10 }]}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primarySoft }]} 
                onPress={() => {
                  setShowSystemConfirmModal(false);
                  setPendingSystemToggle(null);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmDeleteButton, { flex: 1, backgroundColor: COLORS.accent }]} 
                onPress={confirmSystemToggle}
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

      {/* MODAL UNIVERSAL PARA EDITAR CARTAS (SALAS, DEPENDENCIAS, CONDUCTORES) */}
      <Modal
        visible={editModalVisible && !!editDraft}
        transparent={true}
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContainer, { maxWidth: 450, backgroundColor: COLORS.primary, borderWidth: 1, borderColor: COLORS.primarySoft }]}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { color: COLORS.white }]}>
                {editType === 'room' ? 'Editar Espacio' : editType === 'dependency' ? 'Editar Dependencia' : 'Editar Conductor'}
              </Text>
            </View>

            <View style={{ gap: 16, width: '100%', marginBottom: 24 }}>
              {editType === 'room' && (
                <>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.line, marginBottom: 8 }}>Nombre del Espacio</Text>
                    <TextInput
                      style={[styles.userFieldInput, { backgroundColor: COLORS.primarySoft, color: COLORS.white, borderColor: COLORS.primaryDark }]}
                      placeholderTextColor={COLORS.muted}
                      value={editDraft?.name || ''}
                      onChangeText={val => setEditDraft({ ...editDraft, name: val })}
                      placeholder="Ej: Sala de Innovación..."
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.line, marginBottom: 8 }}>Capacidad (pers.)</Text>
                      <TextInput
                        style={[styles.userFieldInput, { backgroundColor: COLORS.primarySoft, color: COLORS.white, borderColor: COLORS.primaryDark }]}
                        placeholderTextColor={COLORS.muted}
                        value={editDraft?.capacity?.toString() || ''}
                        onChangeText={val => setEditDraft({ ...editDraft, capacity: val })}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.line, marginBottom: 8 }}>Ubicación</Text>
                      <TextInput
                        style={[styles.userFieldInput, { backgroundColor: COLORS.primarySoft, color: COLORS.white, borderColor: COLORS.primaryDark }]}
                        placeholderTextColor={COLORS.muted}
                        value={editDraft?.floor || ''}
                        onChangeText={val => setEditDraft({ ...editDraft, floor: val })}
                        placeholder="Ej: Piso 1"
                      />
                    </View>
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.line, marginBottom: 8 }}>Tipo de Sala</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity 
                        style={[styles.rolePill, { backgroundColor: COLORS.primarySoft }, editDraft?.info === 'Estándar' && { backgroundColor: COLORS.white }]} 
                        onPress={() => setEditDraft({ ...editDraft, info: 'Estándar' })}
                      >
                        <Text style={[styles.rolePillText, { color: COLORS.line }, editDraft?.info === 'Estándar' && { color: COLORS.primary }]}>Estándar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.rolePill, { backgroundColor: COLORS.primarySoft }, editDraft?.info === 'Especial' && { backgroundColor: COLORS.white }]} 
                        onPress={() => setEditDraft({ ...editDraft, info: 'Especial' })}
                      >
                        <Text style={[styles.rolePillText, { color: COLORS.line }, editDraft?.info === 'Especial' && { color: COLORS.primary }]}>Especial</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              {editType === 'dependency' && (
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.line, marginBottom: 8 }}>Nombre de la Dependencia</Text>
                  <TextInput
                    style={[styles.userFieldInput, { backgroundColor: COLORS.primarySoft, color: COLORS.white, borderColor: COLORS.primaryDark }]}
                    placeholderTextColor={COLORS.muted}
                    value={editDraft?.name || ''}
                    onChangeText={val => setEditDraft({ ...editDraft, name: val })}
                    placeholder="Ej: Dirección de Asuntos Penales..."
                  />
                </View>
              )}

              {editType === 'driver' && (
                <>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.line, marginBottom: 8 }}>Nombre del Conductor</Text>
                    <TextInput
                      style={[styles.userFieldInput, { backgroundColor: COLORS.primarySoft, color: COLORS.white, borderColor: COLORS.primaryDark }]}
                      placeholderTextColor={COLORS.muted}
                      value={editDraft?.name || ''}
                      onChangeText={val => setEditDraft({ ...editDraft, name: val })}
                      placeholder="Ej: Juan Pérez"
                    />
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.line, marginBottom: 8 }}>Teléfono</Text>
                    <TextInput
                      style={[styles.userFieldInput, { backgroundColor: COLORS.primarySoft, color: COLORS.white, borderColor: COLORS.primaryDark }]}
                      placeholderTextColor={COLORS.muted}
                      value={editDraft?.phone || ''}
                      onChangeText={val => setEditDraft({ ...editDraft, phone: val })}
                      keyboardType="phone-pad"
                      placeholder="3000000000"
                    />
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primarySoft }]} 
                onPress={closeEditModal}
              >
                <Text style={[styles.cancelButtonText, { color: COLORS.line }]}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmDeleteButton, { flex: 1.5, backgroundColor: COLORS.accent }, (!hasEditChanges || !editDraft?.name?.trim()) && { opacity: 0.5 }]} 
                onPress={saveEditDraft}
                disabled={!hasEditChanges || !editDraft?.name?.trim()}
              >
                <Text style={styles.confirmDeleteButtonText}>ACTUALIZAR</Text>
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
  hero: { minHeight: 160, paddingVertical: 15, width: '100%', overflow: 'hidden', borderBottomRightRadius: 40 },
  heroInner: { flex: 1, paddingHorizontal: 25, justifyContent: 'center' },
  heroKicker: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { color: COLORS.white, fontSize: 32, fontWeight: '900', marginTop: 5 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5 },

  contentPadding: { paddingHorizontal: 25 },
  sectionHeader: { marginTop: 70, marginBottom: 20 },
  sectionKicker: { fontSize: 11, fontWeight: '900', color: COLORS.accent, letterSpacing: 1.5 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: COLORS.primary, marginTop: 4 },

  loaderContainer: { height: 300, justifyContent: 'center', alignItems: 'center', gap: 15 },
  loaderText: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },

  cardList: { gap: 12 },
  roomCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: 28, 
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'column',
    borderWidth: 0, 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
      android: { elevation: 4 },
      web: { boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)' }
    })
  },
  depCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: 28, 
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'column', 
    borderWidth: 0, 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
      android: { elevation: 4 },
      web: { boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)' }
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

  userSectionCard: { backgroundColor: COLORS.white, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: COLORS.line, gap: 20 },
  userSectionHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  userSearchInput: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: '600', color: COLORS.primary },
  exportUsersBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.success, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  addUserBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
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
  userTableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingVertical: 14, paddingHorizontal: 12 },
  userTableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center' },
  userTableCell: { paddingHorizontal: 10 },
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

