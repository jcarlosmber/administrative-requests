import React, { useState, useEffect, useMemo } from 'react';
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
import { supabase } from '../../lib/supabase';
import { settingsService, Driver } from '../../lib/settingsService';
import { vehicleService, ParkingSpot, UserVehicle, VehicleHistory } from '../../lib/vehicleService';
import { requestService, AdministrativeRequest } from '../../lib/requestService';

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
  warning: '#F59E0B',
  purple: '#7209B7',
};

const INITIAL_ROOMS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Sala Innovación', capacity: '12', floor: 'Piso 2', info: 'Estándar' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Sala de Juntas B', capacity: '8', floor: 'Piso 1', info: 'Estándar' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Focus Room 4', capacity: '2', floor: 'Piso 3', info: 'Estándar' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Auditorio Principal', capacity: '50', floor: 'PB', info: 'Especial' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Auditorio Huitaca', capacity: '350', floor: 'PB', info: 'Especial', isLargeScale: true },
];

const OPERATING_HOURS = [
  { hour: 7, label: '07:00' },
  { hour: 8, label: '08:00' },
  { hour: 9, label: '09:00' },
  { hour: 10, label: '10:00' },
  { hour: 11, label: '11:00' },
  { hour: 12, label: '12:00' },
  { hour: 13, label: '13:00' },
  { hour: 14, label: '14:00' },
  { hour: 15, label: '15:00' },
  { hour: 16, label: '16:00' },
  { hour: 17, label: '17:00' },
  { hour: 18, label: '18:00' },
  { hour: 19, label: '19:00' },
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

// =========================================================
// UTILIDADES PARA CALENDARIO DE SALAS
// =========================================================
const toLocalDateIso = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MONTH_NAMES_MAP: Record<string, string> = {
  ene: '01', enero: '01',
  feb: '02', febrero: '02',
  mar: '03', marzo: '03',
  abr: '04', abril: '04',
  may: '05', mayo: '05',
  jun: '06', junio: '06',
  jul: '07', julio: '07',
  ago: '08', agosto: '08',
  sep: '09', sept: '09', septiembre: '09',
  oct: '10', octubre: '10',
  nov: '11', noviembre: '11',
  dic: '12', diciembre: '12'
};

const parseDateToIso = (meta: any, createdAt?: string): string => {
  if (!meta) return createdAt ? createdAt.split('T')[0] : toLocalDateIso(new Date());

  // 1. date_iso explícito (ej: "2026-09-24" o "2026-09-24T14:00:00Z")
  if (meta.date_iso && typeof meta.date_iso === 'string') {
    const clean = meta.date_iso.split('T')[0].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  }

  const rawDate = meta.date || meta.booking_date || meta.event_date;
  if (rawDate && typeof rawDate === 'string') {
    const trimmed = rawDate.trim();

    // 2. Formato ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // 3. Formato DD/MM/YYYY o DD-MM-YYYY
    const slashParts = trimmed.split(/[/|-]/);
    if (slashParts.length === 3) {
      if (slashParts[0].length === 4) {
        return `${slashParts[0]}-${slashParts[1].padStart(2, '0')}-${slashParts[2].padStart(2, '0')}`;
      } else if (slashParts[2].length === 4) {
        return `${slashParts[2]}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`;
      }
    }

    // 4. Formato texto en español: ej "miércoles, 24 de sep", "24 de septiembre"
    const lower = trimmed.toLowerCase();
    const dayMatch = lower.match(/\b([0-2]?[0-9]|3[01])\b/);
    if (dayMatch) {
      const dayNum = dayMatch[1].padStart(2, '0');
      let foundMonth = '09';
      for (const [key, val] of Object.entries(MONTH_NAMES_MAP)) {
        if (lower.includes(key)) {
          foundMonth = val;
          break;
        }
      }
      const yearMatch = lower.match(/\b(202\d)\b/);
      const yearVal = yearMatch ? yearMatch[1] : (createdAt ? createdAt.slice(0, 4) : String(new Date().getFullYear()));
      return `${yearVal}-${foundMonth}-${dayNum}`;
    }
  }

  if (createdAt && typeof createdAt === 'string') {
    return createdAt.split('T')[0];
  }

  return toLocalDateIso(new Date());
};

const parseTimeHour = (timeStr: any, isEnd: boolean = false): number | null => {
  if (!timeStr) return null;
  const str = String(timeStr).trim();
  
  const separator = str.includes(' - ') ? ' - ' : (str.includes(' a ') ? ' a ' : (str.includes('-') ? '-' : null));
  let part = str;
  if (separator) {
    const parts = str.split(separator);
    part = isEnd ? parts[1] : parts[0];
  }

  const ampmMatch = part.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const meridian = ampmMatch[3].toLowerCase();
    if (meridian.includes('p') && h < 12) h += 12;
    if (meridian.includes('a') && h === 12) h = 0;
    return h;
  }

  const match24 = part.match(/(\d{1,2}):(\d{2})/);
  if (match24) {
    return parseInt(match24[1], 10);
  }

  const numMatch = part.match(/\b(\d{1,2})\b/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return null;
};

const normalizeRoomName = (name?: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const isReservationConfirmed = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return ['resuelto', 'aprobado', 'aprobada', 'confirmada', 'en_progreso'].includes(s);
};

const isReservationPending = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return ['pendiente', 'en_revision', 'solicitada', 'espera'].includes(s);
};

const isReservationCancelled = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return ['rechazado', 'rechazada', 'cancelado', 'cancelada'].includes(s);
};

export default function AdminGestion() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  // Tab principal de gestión
  const [activeTab, setActiveTab] = useState<'all' | 'calendar' | 'parking_spots' | 'rooms' | 'drivers' | 'evaluations'>('calendar');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // =========================================================
  // ESTADOS DEL CALENDARIO DE SALAS
  // =========================================================
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [roomReservations, setRoomReservations] = useState<any[]>([]);
  const [calendarCategoryFilter, setCalendarCategoryFilter] = useState<'all' | 'standard' | 'special'>('all');
  const [calendarRoomFilter, setCalendarRoomFilter] = useState<'all' | string>('all');
  const [calendarSearch, setCalendarSearch] = useState('');
  const [selectedReservationModal, setSelectedReservationModal] = useState<any | null>(null);
  const [freeSlotModal, setFreeSlotModal] = useState<{
    visible: boolean;
    roomName: string;
    hourText: string;
    dateText: string;
  } | null>(null);

  // Estados de Salas / Espacios
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('10');
  const [roomFloor, setRoomFloor] = useState('Piso 1');
  const [roomInfo, setRoomInfo] = useState<'Estándar' | 'Especial'>('Estándar');
  const [roomToDelete, setRoomToDelete] = useState<any | null>(null);
  const [showRoomDeleteModal, setShowRoomDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Estados de Conductores
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverIsActive, setDriverIsActive] = useState(true);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [showDriverDeleteModal, setShowDriverDeleteModal] = useState(false);

  // Estados de Celdas y Parqueadero
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [allVehicles, setAllVehicles] = useState<UserVehicle[]>([]);
  const [maxVehiclesLimit, setMaxVehiclesLimit] = useState<number>(3);
  const [spotSearch, setSpotSearch] = useState('');
  const [spotFilter, setSpotFilter] = useState<'all' | 'fija' | 'libre' | 'disponible' | 'ocupada'>('all');
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Modales de Celdas
  const [spotModalVisible, setSpotModalVisible] = useState(false);
  const [editingSpot, setEditingSpot] = useState<ParkingSpot | null>(null);
  const [spotCode, setSpotCode] = useState('');
  const [spotType, setSpotType] = useState<'fija' | 'libre'>('libre');
  const [spotStatus, setSpotStatus] = useState<'disponible' | 'ocupada' | 'mantenimiento' | 'reservada'>('disponible');
  const [spotUserId, setSpotUserId] = useState<string>('');
  const [spotUserName, setSpotUserName] = useState<string>('');
  const [spotNotes, setSpotNotes] = useState('');
  const [spotError, setSpotError] = useState('');
  const [spotSaving, setSpotSaving] = useState(false);

  // Modal para Asignar / Cambiar Vehículo a Celda
  const [assignSpotModalVisible, setAssignSpotModalVisible] = useState(false);
  const [selectedSpotForAssign, setSelectedSpotForAssign] = useState<ParkingSpot | null>(null);
  const [selectedVehicleIdToAssign, setSelectedVehicleIdToAssign] = useState<string>('');
  const [assignError, setAssignError] = useState('');

  // Modal para Liberar Celda
  const [releaseSpotModalVisible, setReleaseSpotModalVisible] = useState(false);
  const [selectedSpotForRelease, setSelectedSpotForRelease] = useState<ParkingSpot | null>(null);

  // Modal para Eliminar Celda
  const [deleteSpotModalVisible, setDeleteSpotModalVisible] = useState(false);
  const [selectedSpotForDelete, setSelectedSpotForDelete] = useState<ParkingSpot | null>(null);
  const [isDeletingSpot, setIsDeletingSpot] = useState(false);

  // Modal de Edición de Vehículo por Admin
  const [adminVehicleModalVisible, setAdminVehicleModalVisible] = useState(false);
  const [adminEditingVehicle, setAdminEditingVehicle] = useState<UserVehicle | null>(null);
  const [adminVPlate, setAdminVPlate] = useState('');
  const [adminVBrand, setAdminVBrand] = useState('');
  const [adminVModel, setAdminVModel] = useState('');
  const [adminVColor, setAdminVColor] = useState('');
  const [adminVName, setAdminVName] = useState('');
  const [adminVDoc, setAdminVDoc] = useState('');
  const [adminVDependency, setAdminVDependency] = useState('');
  const [adminVIsActive, setAdminVIsActive] = useState(true);
  const [adminVError, setAdminVError] = useState('');

  // Modal para Ver Historial de Auditoría de Vehículo
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState<VehicleHistory[]>([]);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState<UserVehicle | null>(null);

  // Estados de Evaluaciones
  const [evalCategories, setEvalCategories] = useState<string[]>(['visitors', 'transport', 'maintenance', 'rooms', 'parking']);
  const [showEvalConfirmModal, setShowEvalConfirmModal] = useState(false);
  const [pendingEvalToggle, setPendingEvalToggle] = useState<{ id: string; label: string; newValue: boolean } | null>(null);

  // Modal Notificaciones (sin alerts)
  const [noticeModal, setNoticeModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    isError?: boolean;
  }>({ visible: false, title: '', message: '' });

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Cargar Salas
      const { data: dbRooms } = await supabase.from('rooms').select('*').order('name');
      if (dbRooms && dbRooms.length > 0) {
        setRooms(dbRooms.map((r: any) => ({ ...r, capacity: r.capacity.toString() })));
      } else {
        const localRooms = await safeStorage.getItem('local_rooms');
        setRooms(localRooms ? JSON.parse(localRooms) : INITIAL_ROOMS);
      }

      // 2. Cargar Conductores
      const dbDrivers = await settingsService.getDrivers();
      setDrivers(dbDrivers || []);

      // 3. Cargar Evaluaciones
      const dbEvalCategories = await settingsService.getSystemSetting('eval_categories');
      if (dbEvalCategories) {
        setEvalCategories(dbEvalCategories);
      }

      // 4. Cargar Celdas y Vehículos
      await loadParkingData();

      // 5. Cargar Reservas para el Calendario
      await loadCalendarReservations();
    } catch (err) {
      console.warn('Error cargando datos de gestión:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarReservations = async () => {
    try {
      // 1. Intentar endpoint especializado de disponibilidad de salas (trae todas las reservas con solicitante)
      const availabilityData = await requestService.getRoomAvailability().catch(() => null);
      if (availabilityData && Array.isArray(availabilityData) && availabilityData.length > 0) {
        setRoomReservations(availabilityData);
        return;
      }

      // 2. Intentar supabase administrative_requests
      const { data: dbRequests, error } = await supabase
        .from('administrative_requests')
        .select('*')
        .eq('category', 'rooms')
        .order('created_at', { ascending: false });

      if (!error && dbRequests && dbRequests.length > 0) {
        setRoomReservations(dbRequests.filter((r: any) => !isReservationCancelled(r.status)));
        return;
      }

      // 3. Fallback a requestService.getAll()
      const apiReqs = await requestService.getAll().catch(() => []);
      const roomReqs = apiReqs.filter(r => r.category === 'rooms' && !isReservationCancelled(r.status));
      setRoomReservations(roomReqs);
    } catch (err) {
      console.warn('Error al cargar reservas de salas:', err);
    }
  };

  const loadParkingData = async () => {
    try {
      const [spotsData, vehiclesData, limitVal] = await Promise.all([
        vehicleService.getSpots(),
        vehicleService.getAll({ all: true }),
        vehicleService.getMaxLimit()
      ]);
      setParkingSpots(spotsData || []);
      setAllVehicles(vehiclesData || []);
      setMaxVehiclesLimit(limitVal || 3);
    } catch (err) {
      console.warn('Error al cargar datos de parqueadero:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // LÓGICA DE PROCESAMIENTO DEL CALENDARIO DE SALAS
  // =========================================================
  // Fecha en formato local YYYY-MM-DD sin desfase por zona horaria UTC
  const calendarDateIso = useMemo(() => {
    return toLocalDateIso(calendarDate);
  }, [calendarDate]);

  const displayCalendarDate = useMemo(() => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayName = days[calendarDate.getDay()];
    const monthName = months[calendarDate.getMonth()];
    return `${dayName}, ${calendarDate.getDate()} de ${monthName} de ${calendarDate.getFullYear()}`;
  }, [calendarDate]);

  // Generar 7 días de navegación semanal alineados a la fecha local
  const weekPills = useMemo(() => {
    const list = [];
    const base = new Date(calendarDate);
    // Empezar 3 días antes y terminar 3 días después
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      const iso = toLocalDateIso(d);
      const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
      list.push({
        date: d,
        iso,
        label: dayNames[d.getDay()],
        dayNum: d.getDate(),
        isCurrent: iso === calendarDateIso
      });
    }
    return list;
  }, [calendarDate, calendarDateIso]);

  // Parsear reservas de salas discriminando Confirmadas, Pendientes y Disponibles
  const parsedReservations = useMemo(() => {
    return roomReservations
      .filter(res => !isReservationCancelled(res.status))
      .map(res => {
        const meta = res.metadata || {};
        const dateIso = parseDateToIso(meta, res.created_at);

        let start = typeof meta.start_hour === 'number' ? meta.start_hour : null;
        let end = typeof meta.end_hour === 'number' ? meta.end_hour : null;

        if (start === null) {
          start = parseTimeHour(meta.time, false) ?? parseTimeHour(meta.booking_hours, false) ?? parseTimeHour(meta.event_start_hour, false);
        }
        if (end === null) {
          end = parseTimeHour(meta.time, true) ?? parseTimeHour(meta.booking_hours, true) ?? parseTimeHour(meta.event_end_hour, true);
        }

        if (start === null) start = 8;
        if (end === null || end <= start) end = start + 1;

        const rObj = meta.room || {};
        const rId = rObj.id || null;
        const rName = rObj.name || (res.title ? String(res.title).replace(/^Reserva:\s*/i, '').split('-')[0].trim() : 'Sala');

        const isConfirmed = isReservationConfirmed(res.status);
        const isPending = isReservationPending(res.status) || (!isConfirmed);

        return {
          ...res,
          isConfirmed,
          isPending,
          parsed: {
            dateIso,
            startHour: start,
            endHour: end,
            roomId: rId,
            roomName: rName,
          }
        };
      });
  // Helper para verificar si un espacio es sala especial o auditorio
  const isSpecialRoom = useCallback((r: any): boolean => {
    if (!r) return false;
    return r.info === 'Especial' || 
      (parseInt(r.capacity) || 0) >= 100 || 
      /huitaca|auditorio|especial|barul[eé]/i.test(r.name || '') ||
      Boolean(r.isLargeScale);
  }, []);

  // Salas activas filtradas para mostrar en el calendario (incluye estándar y especiales)
  const calendarRooms = useMemo(() => {
    let result = rooms;

    if (calendarCategoryFilter === 'standard') {
      result = result.filter(r => !isSpecialRoom(r));
    } else if (calendarCategoryFilter === 'special') {
      result = result.filter(r => isSpecialRoom(r));
    }

    if (calendarRoomFilter !== 'all') {
      result = result.filter(r => r.id === calendarRoomFilter || r.name === calendarRoomFilter);
    }
    if (calendarSearch.trim()) {
      const q = calendarSearch.trim().toLowerCase();
      result = result.filter(r => 
        (r.name && r.name.toLowerCase().includes(q)) || 
        (r.floor && r.floor.toLowerCase().includes(q)) ||
        (r.info && r.info.toLowerCase().includes(q))
      );
    }
    return result;
  }, [rooms, calendarCategoryFilter, calendarRoomFilter, calendarSearch, isSpecialRoom]);

  // Reservas del día seleccionado
  const dayReservations = useMemo(() => {
    return parsedReservations.filter(r => r.parsed.dateIso === calendarDateIso);
  }, [parsedReservations, calendarDateIso]);

  // Obtener la reserva para un slot de sala y hora
  const getSlotReservation = (room: any, hour: number) => {
    return parsedReservations.find(item => {
      const p = item.parsed;
      if (p.dateIso !== calendarDateIso) return false;
      
      const targetNorm = normalizeRoomName(room.name);
      const matchRoom = (p.roomId && p.roomId === room.id) || 
                        (p.roomName && normalizeRoomName(p.roomName) === targetNorm) ||
                        (item.title && normalizeRoomName(item.title).includes(targetNorm));
      
      if (!matchRoom) return false;
      return hour >= p.startHour && hour < p.endHour;
    });
  };

  // Contadores de métricas del día (calculados sobre todas las salas y espacios del calendario)
  const calendarMetrics = useMemo(() => {
    const totalSlots = rooms.length * OPERATING_HOURS.length;
    let confirmedSlots = 0;
    let pendingSlots = 0;
    
    rooms.forEach(r => {
      OPERATING_HOURS.forEach(h => {
        const res = getSlotReservation(r, h.hour);
        if (res) {
          if (res.isConfirmed) {
            confirmedSlots++;
          } else {
            pendingSlots++;
          }
        }
      });
    });

    const occupiedSlots = confirmedSlots + pendingSlots;
    const freeSlots = Math.max(0, totalSlots - occupiedSlots);
    const availabilityRate = totalSlots > 0 ? Math.round((freeSlots / totalSlots) * 100) : 100;

    const specialRoomsCount = rooms.filter(r => isSpecialRoom(r)).length;
    const standardRoomsCount = rooms.length - specialRoomsCount;

    return {
      totalRooms: rooms.length,
      standardRoomsCount,
      specialRoomsCount,
      dayReservationsCount: dayReservations.length,
      confirmedSlots,
      pendingSlots,
      occupiedSlots,
      freeSlots,
      availabilityRate
    };
  }, [rooms, OPERATING_HOURS, dayReservations, parsedReservations, calendarDateIso, isSpecialRoom]);sedReservations, calendarDateIso]);

  // Navegación de fecha
  const handlePrevDay = () => {
    const prev = new Date(calendarDate);
    prev.setDate(prev.getDate() - 1);
    setCalendarDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(calendarDate);
    next.setDate(next.getDate() + 1);
    setCalendarDate(next);
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  const handleSlotPress = (room: any, hour: number) => {
    const res = getSlotReservation(room, hour);
    if (res) {
      setSelectedReservationModal({
        ...res,
        roomName: room.name,
        roomFloor: room.floor,
        roomCapacity: room.capacity
      });
    } else {
      setFreeSlotModal({
        visible: true,
        roomName: room.name,
        hourText: `${hour}:00 a ${hour + 1}:00`,
        dateText: displayCalendarDate
      });
    }
  };

  // =========================================================
  // CONTROLADORES DE ESPACIOS / SALAS
  // =========================================================
  const openCreateRoomModal = () => {
    setEditingRoom(null);
    setRoomName('');
    setRoomCapacity('10');
    setRoomFloor('Piso 1');
    setRoomInfo('Estándar');
    setRoomModalVisible(true);
  };

  const openEditRoomModal = (room: any) => {
    setEditingRoom(room);
    setRoomName(room.name || '');
    setRoomCapacity(room.capacity ? room.capacity.toString() : '10');
    setRoomFloor(room.floor || 'Piso 1');
    setRoomInfo(room.info === 'Especial' ? 'Especial' : 'Estándar');
    setRoomModalVisible(true);
  };

  const handleSaveRoom = async () => {
    const cleanName = roomName.trim();
    if (!cleanName) {
      setNoticeModal({
        visible: true,
        title: 'Campo Requerido',
        message: 'El nombre del espacio es obligatorio.',
        isError: true
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: cleanName,
        capacity: parseInt(roomCapacity) || 0,
        floor: roomFloor.trim(),
        info: roomInfo
      };

      if (editingRoom) {
        const { error } = await supabase.from('rooms').update(payload).eq('id', editingRoom.id);
        if (error) throw error;
        const updated = rooms.map(r => r.id === editingRoom.id ? { ...r, ...payload, capacity: payload.capacity.toString() } : r);
        setRooms(updated);
        await safeStorage.setItem('local_rooms', JSON.stringify(updated));
        setNoticeModal({
          visible: true,
          title: 'Espacio Actualizado',
          message: `El espacio "${cleanName}" fue modificado exitosamente.`
        });
      } else {
        const { data, error } = await supabase.from('rooms').insert([payload]).select();
        if (error) throw error;
        const newRoom = data?.[0] || { ...payload, id: `temp-${Date.now()}` };
        const updated = [...rooms, { ...newRoom, capacity: payload.capacity.toString() }];
        setRooms(updated);
        await safeStorage.setItem('local_rooms', JSON.stringify(updated));
        setNoticeModal({
          visible: true,
          title: 'Espacio Creado',
          message: `El nuevo espacio "${cleanName}" fue añadido al inventario institucional.`
        });
      }
      setRoomModalVisible(false);
    } catch (err: any) {
      setNoticeModal({
        visible: true,
        title: 'Error',
        message: err.message || 'No se pudo guardar el espacio.',
        isError: true
      });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteRoomConfirmation = (room: any) => {
    setRoomToDelete(room);
    setDeleteConfirmationText('');
    setShowRoomDeleteModal(true);
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      setSaving(true);
      const isTemp = String(roomToDelete.id).startsWith('temp-');
      if (!isTemp) {
        const { error } = await supabase.from('rooms').delete().eq('id', roomToDelete.id);
        if (error) throw error;
      }
      const updated = rooms.filter(r => r.id !== roomToDelete.id);
      setRooms(updated);
      await safeStorage.setItem('local_rooms', JSON.stringify(updated));
      setShowRoomDeleteModal(false);
      setRoomToDelete(null);
      setNoticeModal({
        visible: true,
        title: 'Espacio Eliminado',
        message: 'El espacio fue removido satisfactoriamente.'
      });
    } catch (err: any) {
      setNoticeModal({
        visible: true,
        title: 'Error',
        message: err.message || 'Error al eliminar el espacio.',
        isError: true
      });
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // CONTROLADORES DE CONDUCTORES
  // =========================================================
  const openCreateDriverModal = () => {
    setEditingDriver(null);
    setDriverName('');
    setDriverPhone('');
    setDriverIsActive(true);
    setDriverModalVisible(true);
  };

  const openEditDriverModal = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverName(driver.name || '');
    setDriverPhone(driver.phone || '');
    setDriverIsActive(driver.is_active !== false);
    setDriverModalVisible(true);
  };

  const handleSaveDriver = async () => {
    const cleanName = driverName.trim();
    if (!cleanName) {
      setNoticeModal({
        visible: true,
        title: 'Campo Requerido',
        message: 'El nombre del conductor es obligatorio.',
        isError: true
      });
      return;
    }

    try {
      setSaving(true);
      if (editingDriver) {
        const payload = { name: cleanName, phone: driverPhone.trim(), is_active: driverIsActive };
        await settingsService.updateDriver(editingDriver.id, payload);
        const updated = drivers.map(d => d.id === editingDriver.id ? { ...d, ...payload } : d);
        setDrivers(updated);
        await safeStorage.setItem('local_drivers', JSON.stringify(updated));
        setNoticeModal({
          visible: true,
          title: 'Conductor Actualizado',
          message: `La información de ${cleanName} fue guardada exitosamente.`
        });
      } else {
        const newPayload = { name: cleanName, phone: driverPhone.trim(), is_active: driverIsActive };
        const created = await settingsService.createDriver(newPayload);
        const updated = [...drivers, created];
        setDrivers(updated);
        await safeStorage.setItem('local_drivers', JSON.stringify(updated));
        setNoticeModal({
          visible: true,
          title: 'Conductor Registrado',
          message: `El conductor ${cleanName} ha sido incorporado al servicio de transporte.`
        });
      }
      setDriverModalVisible(false);
    } catch (err: any) {
      setNoticeModal({
        visible: true,
        title: 'Error',
        message: err.message || 'No se pudo guardar el conductor.',
        isError: true
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDriverStatus = async (driver: Driver) => {
    try {
      const nextStatus = !(driver.is_active !== false);
      await settingsService.updateDriver(driver.id, { is_active: nextStatus });
      const updated = drivers.map(d => d.id === driver.id ? { ...d, is_active: nextStatus } : d);
      setDrivers(updated);
      await safeStorage.setItem('local_drivers', JSON.stringify(updated));
      setNoticeModal({
        visible: true,
        title: nextStatus ? 'Conductor Disponible' : 'Conductor Inactivo',
        message: `${driver.name} ahora se encuentra ${nextStatus ? 'activo y disponible para asignaciones' : 'marcado como no disponible'}.`
      });
    } catch (err: any) {
      setNoticeModal({
        visible: true,
        title: 'Error',
        message: err.message || 'No se pudo modificar el estado del conductor.',
        isError: true
      });
    }
  };

  const openDeleteDriverConfirmation = (driver: Driver) => {
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
      const updated = drivers.filter(d => d.id !== driverToDelete.id);
      setDrivers(updated);
      await safeStorage.setItem('local_drivers', JSON.stringify(updated));
      setShowDriverDeleteModal(false);
      setDriverToDelete(null);
      setNoticeModal({
        visible: true,
        title: 'Conductor Removido',
        message: 'El conductor fue eliminado de la flota.'
      });
    } catch (err: any) {
      setNoticeModal({
        visible: true,
        title: 'Error',
        message: err.message || 'Error al eliminar conductor.',
        isError: true
      });
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // CONTROLADORES DE CELDAS Y PARQUEADERO
  // =========================================================
  const openCreateSpotModal = () => {
    setEditingSpot(null);
    setSpotCode('');
    setSpotType('libre');
    setSpotStatus('disponible');
    setSpotUserId('');
    setSpotUserName('');
    setSpotNotes('');
    setSpotError('');
    setSpotModalVisible(true);
  };

  const openEditSpotModal = (spot: ParkingSpot) => {
    setEditingSpot(spot);
    setSpotCode(spot.code);
    setSpotType(spot.spot_type);
    setSpotStatus(spot.status);
    setSpotUserId(spot.assigned_user_id || '');
    setSpotUserName(spot.assigned_user_name || '');
    setSpotNotes(spot.notes || '');
    setSpotError('');
    setSpotModalVisible(true);
  };

  const handleSaveSpot = async () => {
    try {
      setSpotError('');
      const cleanCode = spotCode.trim().toUpperCase();
      if (!cleanCode) {
        setSpotError('El código de la celda es obligatorio.');
        return;
      }

      setSpotSaving(true);
      if (editingSpot) {
        await vehicleService.updateSpot(editingSpot.id, {
          code: cleanCode,
          spot_type: spotType,
          status: spotStatus,
          assigned_user_id: spotUserId?.trim() ? spotUserId.trim() : null,
          assigned_user_name: spotUserName?.trim() ? spotUserName.trim() : null,
          notes: spotNotes?.trim() ? spotNotes.trim() : null
        });
        setNoticeModal({
          visible: true,
          title: 'Celda Actualizada',
          message: `La celda ${cleanCode} ha sido actualizada exitosamente.`
        });
      } else {
        await vehicleService.createSpot({
          code: cleanCode,
          spot_type: spotType,
          status: spotStatus,
          assigned_user_id: spotUserId?.trim() ? spotUserId.trim() : null,
          assigned_user_name: spotUserName?.trim() ? spotUserName.trim() : null,
          notes: spotNotes?.trim() ? spotNotes.trim() : null
        });
        setNoticeModal({
          visible: true,
          title: 'Celda Creada',
          message: `La celda ${cleanCode} ha sido creada exitosamente en el sistema.`
        });
      }
      setSpotModalVisible(false);
      await loadParkingData();
    } catch (err: any) {
      setSpotError(err.message || 'Error al guardar la celda.');
    } finally {
      setSpotSaving(false);
    }
  };

  const handleOpenAssignModal = (spot: ParkingSpot) => {
    setSelectedSpotForAssign(spot);
    setSelectedVehicleIdToAssign('');
    setSpotUserId(spot.assigned_user_id || '');
    setSpotUserName(spot.assigned_user_name || '');
    setAssignError('');
    setAssignSpotModalVisible(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedSpotForAssign) return;
    try {
      setAssignError('');
      if (!selectedVehicleIdToAssign && !spotUserId) {
        setAssignError('Debes seleccionar un vehículo o un usuario para asignar a la celda.');
        return;
      }
      await vehicleService.assignSpot(selectedSpotForAssign.id, {
        vehicle_id: selectedVehicleIdToAssign || undefined,
        user_id: spotUserId || undefined,
        user_name: spotUserName || undefined
      });
      setAssignSpotModalVisible(false);
      setNoticeModal({
        visible: true,
        title: 'Asignación Exitosa',
        message: `Se ha asignado el vehículo correctamente a la celda ${selectedSpotForAssign.code}.`
      });
      await loadParkingData();
    } catch (err: any) {
      setAssignError(err.message || 'Error al asignar la celda.');
    }
  };

  const handleOpenReleaseModal = (spot: ParkingSpot) => {
    setSelectedSpotForRelease(spot);
    setReleaseSpotModalVisible(true);
  };

  const handleConfirmRelease = async () => {
    if (!selectedSpotForRelease) return;
    try {
      await vehicleService.releaseSpot(selectedSpotForRelease.id);
      setReleaseSpotModalVisible(false);
      setNoticeModal({
        visible: true,
        title: 'Celda Liberada',
        message: `La celda ${selectedSpotForRelease.code} ha quedado libre y disponible.`
      });
      await loadParkingData();
    } catch (err: any) {
      setNoticeModal({
        visible: true,
        title: 'Error',
        message: err.message || 'Error al liberar la celda.',
        isError: true
      });
    }
  };

  const handleOpenDeleteSpotModal = (spot: ParkingSpot) => {
    setSelectedSpotForDelete(spot);
    setDeleteSpotModalVisible(true);
  };

  const handleConfirmDeleteSpot = async () => {
    if (!selectedSpotForDelete || isDeletingSpot) return;
    setIsDeletingSpot(true);
    try {
      await vehicleService.deleteSpot(selectedSpotForDelete.id);
      setDeleteSpotModalVisible(false);
      setNoticeModal({
        visible: true,
        title: 'Celda Eliminada',
        message: `La celda ${selectedSpotForDelete.code} fue eliminada del sistema exitosamente.`
      });
      await loadParkingData();
    } catch (err: any) {
      setDeleteSpotModalVisible(false);
      setNoticeModal({
        visible: true,
        title: 'Error al Eliminar Celda',
        message: err.message || 'Error al eliminar la celda del sistema.',
        isError: true
      });
    } finally {
      setIsDeletingSpot(false);
    }
  };

  const handleSaveMaxLimit = async (newLimit: number) => {
    try {
      await vehicleService.setMaxLimit(newLimit);
      setMaxVehiclesLimit(newLimit);
      setNoticeModal({
        visible: true,
        title: 'Límite Actualizado',
        message: `Se ha establecido el límite base en ${newLimit} vehículos.`
      });
    } catch (err: any) {
      setNoticeModal({
        visible: true,
        title: 'Error',
        message: err.message || 'No se pudo actualizar el límite.',
        isError: true
      });
    }
  };

  const handleOpenHistory = async (veh: UserVehicle) => {
    setSelectedVehicleForHistory(veh);
    setHistoryModalVisible(true);
    setHistoryLoading(true);
    try {
      const history = await vehicleService.getVehicleHistory(veh.id);
      setSelectedVehicleHistory(history);
    } catch (err) {
      console.warn('Error al cargar historial:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAdminEditVehicle = (veh: UserVehicle) => {
    setAdminEditingVehicle(veh);
    setAdminVPlate(veh.plate);
    setAdminVBrand(veh.brand);
    setAdminVModel(veh.model || '');
    setAdminVColor(veh.color || '');
    setAdminVName(veh.name || '');
    setAdminVDoc(veh.doc || '');
    setAdminVDependency(veh.dependency || '');
    setAdminVIsActive(veh.is_active !== false);
    setAdminVError('');
    setAdminVehicleModalVisible(true);
  };

  const handleAdminSaveVehicle = async () => {
    if (!adminEditingVehicle) return;
    try {
      setAdminVError('');
      const cleanPlate = adminVPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!cleanPlate || !adminVBrand.trim()) {
        setAdminVError('La placa y la marca son obligatorias.');
        return;
      }
      await vehicleService.update(adminEditingVehicle.id, {
        plate: cleanPlate,
        brand: adminVBrand.trim(),
        model: adminVModel.trim() || undefined,
        color: adminVColor.trim() || undefined,
        name: adminVName.trim() || undefined,
        doc: adminVDoc.trim() || undefined,
        dependency: adminVDependency.trim() || undefined,
        is_active: adminVIsActive
      });
      setAdminVehicleModalVisible(false);
      setNoticeModal({
        visible: true,
        title: 'Vehículo Actualizado',
        message: `Datos del vehículo ${cleanPlate} actualizados por administración.`
      });
      await loadParkingData();
    } catch (err: any) {
      setAdminVError(err.message || 'Error al actualizar el vehículo.');
    }
  };

  const handleAdminToggleVehicleActive = async (veh: UserVehicle) => {
    try {
      const nextActive = !(veh.is_active !== false);
      await vehicleService.toggleActive(veh.id, nextActive);
      setNoticeModal({
        visible: true,
        title: nextActive ? 'Vehículo Activado' : 'Vehículo Inactivado',
        message: `El vehículo ${veh.plate} ahora está ${nextActive ? 'Activo' : 'Inactivo'}.`
      });
      await loadParkingData();
    } catch (err: any) {
      setNoticeModal({
        visible: true,
        title: 'Error',
        message: err.message || 'No se pudo cambiar el estado del vehículo.',
        isError: true
      });
    }
  };

  const handleAdminDeleteVehicle = async (veh: UserVehicle) => {
    try {
      await vehicleService.delete(veh.id);
      setNoticeModal({
        visible: true,
        title: 'Vehículo Eliminado',
        message: `El vehículo ${veh.plate} ha sido eliminado permanentemente del sistema.`
      });
      await loadParkingData();
    } catch (err: any) {
      setNoticeModal({
        visible: true,
        title: 'Error',
        message: err.message || 'No se pudo eliminar el vehículo.',
        isError: true
      });
    }
  };

  // =========================================================
  // CONTROLADORES DE EVALUACIONES
  // =========================================================
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
      setNoticeModal({
        visible: true,
        title: 'Evaluaciones Actualizadas',
        message: `La encuesta para ${pendingEvalToggle.label} fue ${pendingEvalToggle.newValue ? 'activada' : 'desactivada'}.`
      });
    } catch (err: any) {
      setNoticeModal({
        visible: true,
        title: 'Error',
        message: err.message || 'Error al actualizar configuración de evaluaciones.',
        isError: true
      });
    } finally {
      setSaving(false);
    }
  };

  // Filtrado de celdas
  const filteredSpots = useMemo(() => {
    return parkingSpots.filter(spot => {
      const matchSearch = spotSearch.trim() === '' || 
        spot.code.toLowerCase().includes(spotSearch.toLowerCase()) ||
        (spot.assigned_user_name && spot.assigned_user_name.toLowerCase().includes(spotSearch.toLowerCase())) ||
        (spot.notes && spot.notes.toLowerCase().includes(spotSearch.toLowerCase()));
      
      let matchFilter = true;
      if (spotFilter === 'fija') matchFilter = spot.spot_type === 'fija';
      else if (spotFilter === 'libre') matchFilter = spot.spot_type === 'libre';
      else if (spotFilter === 'disponible') matchFilter = spot.status === 'disponible';
      else if (spotFilter === 'ocupada') matchFilter = spot.status === 'ocupada';

      return matchSearch && matchFilter;
    });
  }, [parkingSpots, spotSearch, spotFilter]);

  // Filtrado de vehículos
  const filteredVehicles = useMemo(() => {
    return allVehicles.filter(veh => {
      const q = vehicleSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        veh.plate.toLowerCase().includes(q) ||
        veh.brand.toLowerCase().includes(q) ||
        (veh.model && veh.model.toLowerCase().includes(q)) ||
        (veh.name && veh.name.toLowerCase().includes(q)) ||
        (veh.doc && veh.doc.toLowerCase().includes(q)) ||
        (veh.dependency && veh.dependency.toLowerCase().includes(q))
      );
    });
  }, [allVehicles, vehicleSearch]);

  const GESTION_TABS = [
    { id: 'calendar', label: 'Gestión de Calendario', icon: 'calendar' },
    { id: 'parking_spots', label: 'Celdas y Parqueadero', icon: 'car' },
    { id: 'rooms', label: 'Gestión de Espacios', icon: 'business' },
    { id: 'drivers', label: 'Gestión Conductores', icon: 'car-sport' },
    { id: 'evaluations', label: 'Evaluación Servicios', icon: 'star' },
    { id: 'all', label: 'Vista Completa', icon: 'grid' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
        
        {/* SIDEBAR PARA DESKTOP */}
        {isDesktop && (
          <View style={styles.sidebar}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
            <View style={styles.sidebarContent}>
              <View style={styles.logoCircle}>
                <Ionicons name="briefcase" size={36} color={COLORS.white} />
              </View>
              <Text style={styles.sideTitle}>Gestión</Text>
              <Text style={styles.sideSubTitle}>Operaciones y Recursos</Text>
              <View style={styles.sideDivider} />
              
              <View style={{ gap: 6, width: '100%' }}>
                {GESTION_TABS.map(tab => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.sideTabBtn, activeTab === tab.id && styles.sideTabBtnActive]}
                    onPress={() => setActiveTab(tab.id as any)}
                  >
                    <Ionicons 
                      name={tab.icon as any} 
                      size={18} 
                      color={activeTab === tab.id ? COLORS.primary : 'rgba(255,255,255,0.7)'} 
                    />
                    <Text style={[styles.sideTabLabel, activeTab === tab.id && styles.sideTabLabelActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ marginTop: 'auto', width: '100%', paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => router.push('/admin/manage')}
                  style={styles.sideBackBtn}
                >
                  <Ionicons name="layers-outline" size={18} color="#93C5FD" />
                  <Text style={{ color: '#93C5FD', fontSize: 13, fontWeight: '700' }}>Ir a Solicitudes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/admin/settings')}
                  style={styles.sideBackBtn}
                >
                  <Ionicons name="settings-outline" size={18} color="#CBD5E1" />
                  <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '700' }}>Ajustes del Sistema</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* CONTENEDOR PRINCIPAL */}
        <View style={{ flex: 1 }}>
          
          {/* HEADER PRINCIPAL */}
          <View style={styles.topHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.topHeaderKicker}>MÓDULO DE GESTIÓN OPERATIVA</Text>
                <Text style={styles.topHeaderTitle}>Recursos, Parqueaderos y Servicios</Text>
                <Text style={styles.topHeaderDesc}>
                  Calendario de disponibilidad de salas, celdas de parqueadero, conductores institucionales y encuestas de calidad.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity 
                  onPress={loadData} 
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0'
                  }}
                >
                  <Ionicons name="refresh" size={16} color={COLORS.primarySoft} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primarySoft }}>Refrescar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* BARRA DE PESTAÑAS MÓVIL / HORIZONTAL */}
            {!isDesktop && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8 }}>
                {GESTION_TABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => setActiveTab(tab.id as any)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: isActive ? COLORS.primary : '#FFFFFF',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isActive ? COLORS.primary : '#E2E8F0'
                      }}
                    >
                      <Ionicons name={tab.icon as any} size={16} color={isActive ? '#FFFFFF' : COLORS.muted} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#FFFFFF' : COLORS.text }}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={{ marginTop: 12, color: COLORS.muted, fontSize: 14, fontWeight: '600' }}>
                Cargando módulos operativos...
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 80 }}>
              
              {/* ========================================================= */}
              {/* SUBMÓDULO: GESTIÓN DE CALENDARIO DE SALAS                */}
              {/* ========================================================= */}
              {(activeTab === 'all' || activeTab === 'calendar') && (
                <View style={{ marginBottom: 44 }}>
                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                    <View>
                      <Text style={styles.sectionKicker}>DISPONIBILIDAD EN TIEMPO REAL</Text>
                      <Text style={styles.sectionTitle}>Gestión de Calendario de Salas</Text>
                      <Text style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>
                        Monitorea qué espacios están ocupados o disponibles para cada franja horaria institucional.
                      </Text>
                    </View>

                    {/* Botón directo para solicitar sala */}
                    <TouchableOpacity
                      onPress={() => router.push('/requests/rooms')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: COLORS.purple,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 14,
                        ...Platform.select({
                          web: { boxShadow: '0 4px 12px rgba(114, 9, 183, 0.25)' }
                        })
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                        + Nueva Reserva
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tarjetas de Métricas de Disponibilidad */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                    {[
                      { label: 'Total Espacios', val: calendarMetrics.totalRooms, icon: 'business', color: '#7209B7', bg: '#F5F3FF' },
                      { label: 'Salas Especiales', val: calendarMetrics.specialRoomsCount, icon: 'sparkles', color: '#D97706', bg: '#FEF3C7' },
                      { label: 'Reservas del Día', val: calendarMetrics.dayReservationsCount, icon: 'bookmark', color: '#0F172A', bg: '#F1F5F9' },
                      { label: 'Franjas Disponibles', val: `${calendarMetrics.freeSlots} hrs`, icon: 'checkmark-circle', color: '#059669', bg: '#ECFDF5' },
                      { label: 'Ocupada (Confirmada)', val: `${calendarMetrics.confirmedSlots} hrs`, icon: 'shield-checkmark', color: '#2563EB', bg: '#EFF6FF' },
                      { label: 'Pendiente Aprobación', val: `${calendarMetrics.pendingSlots} hrs`, icon: 'time', color: '#D97706', bg: '#FFFBEB' },
                    ].map((metric, idx) => (
                      <View 
                        key={idx}
                        style={{
                          flex: 1,
                          minWidth: isDesktop ? 130 : '46%',
                          backgroundColor: metric.bg,
                          padding: 14,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: `${metric.color}25`,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10
                        }}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name={metric.icon as any} size={20} color={metric.color} />
                        </View>
                        <View>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: metric.color }}>{metric.val}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{metric.label}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Control de Navegación de Fechas (Píldoras y Flechas) */}
                  <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 20,
                    padding: 18,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginBottom: 20
                  }}>
                    <View style={{
                      flexDirection: isDesktop ? 'row' : 'column',
                      alignItems: isDesktop ? 'center' : 'flex-start',
                      justifyContent: 'space-between',
                      gap: 14,
                      marginBottom: 16
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="calendar" size={22} color={COLORS.purple} />
                        </View>
                        <View>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.text }}>
                            {displayCalendarDate}
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted }}>
                            {dayReservations.length === 0 ? 'Sin reuniones programadas en esta fecha' : `${dayReservations.length} reunión(es) agendada(s)`}
                          </Text>
                        </View>
                      </View>

                      {/* Botones de navegación temporal */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          onPress={handlePrevDay}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 10,
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: '#E2E8F0'
                          }}
                        >
                          <Ionicons name="chevron-back" size={16} color={COLORS.text} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }}>Día Anterior</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleToday}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 10,
                            backgroundColor: '#EFF6FF',
                            borderWidth: 1,
                            borderColor: '#BFDBFE'
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563EB' }}>Hoy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleNextDay}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 10,
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: '#E2E8F0'
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }}>Día Siguiente</Text>
                          <Ionicons name="chevron-forward" size={16} color={COLORS.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Selector de días de la semana */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 4 }}>
                      {weekPills.map((item, idx) => {
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => setCalendarDate(item.date)}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              borderRadius: 14,
                              backgroundColor: item.isCurrent ? COLORS.purple : '#F8FAFC',
                              borderWidth: 1.5,
                              borderColor: item.isCurrent ? COLORS.purple : '#E2E8F0',
                              alignItems: 'center',
                              minWidth: 70
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: item.isCurrent ? '#FFFFFF' : COLORS.muted }}>
                              {item.label}
                            </Text>
                            <Text style={{ fontSize: 18, fontWeight: '900', color: item.isCurrent ? '#FFFFFF' : COLORS.text, marginTop: 2 }}>
                              {item.dayNum}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Filtro por sala y buscador */}
                  <View style={{
                    flexDirection: isDesktop ? 'row' : 'column',
                    alignItems: isDesktop ? 'center' : 'stretch',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 16
                  }}>
                    {/* Chips de filtro por sala y categoría */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
                      {/* Categorías Rápidas */}
                      <TouchableOpacity
                        onPress={() => {
                          setCalendarCategoryFilter('all');
                          setCalendarRoomFilter('all');
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 10,
                          backgroundColor: (calendarCategoryFilter === 'all' && calendarRoomFilter === 'all') ? COLORS.primary : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: (calendarCategoryFilter === 'all' && calendarRoomFilter === 'all') ? COLORS.primary : '#E2E8F0'
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: (calendarCategoryFilter === 'all' && calendarRoomFilter === 'all') ? '#FFFFFF' : COLORS.text }}>
                          Todos los Espacios ({rooms.length})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setCalendarCategoryFilter('standard');
                          setCalendarRoomFilter('all');
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 10,
                          backgroundColor: calendarCategoryFilter === 'standard' ? COLORS.purple : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: calendarCategoryFilter === 'standard' ? COLORS.purple : '#E2E8F0',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <Ionicons name="business" size={13} color={calendarCategoryFilter === 'standard' ? '#FFFFFF' : COLORS.purple} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: calendarCategoryFilter === 'standard' ? '#FFFFFF' : COLORS.text }}>
                          Estándar ({calendarMetrics.standardRoomsCount})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setCalendarCategoryFilter('special');
                          setCalendarRoomFilter('all');
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 10,
                          backgroundColor: calendarCategoryFilter === 'special' ? '#D97706' : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: calendarCategoryFilter === 'special' ? '#D97706' : '#FDE68A',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <Ionicons name="sparkles" size={13} color={calendarCategoryFilter === 'special' ? '#FFFFFF' : '#D97706'} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: calendarCategoryFilter === 'special' ? '#FFFFFF' : '#B45309' }}>
                          Especiales / Auditorios ({calendarMetrics.specialRoomsCount})
                        </Text>
                      </TouchableOpacity>

                      <View style={{ width: 1, height: 20, backgroundColor: '#CBD5E1', marginHorizontal: 4 }} />

                      {/* Lista de salas individuales */}
                      {rooms.map(room => {
                        const isSpecial = isSpecialRoom(room);
                        const isSelected = calendarRoomFilter === room.id;
                        return (
                          <TouchableOpacity
                            key={room.id}
                            onPress={() => {
                              setCalendarRoomFilter(isSelected ? 'all' : room.id);
                            }}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 10,
                              backgroundColor: isSelected ? (isSpecial ? '#D97706' : COLORS.purple) : '#FFFFFF',
                              borderWidth: 1,
                              borderColor: isSelected ? (isSpecial ? '#D97706' : COLORS.purple) : (isSpecial ? '#FDE68A' : '#E2E8F0'),
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <Ionicons 
                              name={isSpecial ? "sparkles" : "business"} 
                              size={13} 
                              color={isSelected ? '#FFFFFF' : (isSpecial ? '#D97706' : COLORS.muted)} 
                            />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#FFFFFF' : (isSpecial ? '#92400E' : COLORS.text) }}>
                              {room.name}
                            </Text>
                            {isSpecial && !isSelected && (
                              <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ fontSize: 8, fontWeight: '800', color: '#854D0E', textTransform: 'uppercase' }}>
                                  Especial
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Buscador de sala */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      height: 38,
                      width: isDesktop ? 260 : '100%'
                    }}>
                      <Ionicons name="search" size={15} color={COLORS.muted} />
                      <TextInput 
                        placeholder="Filtrar sala o piso..."
                        value={calendarSearch}
                        onChangeText={setCalendarSearch}
                        style={{ flex: 1, marginLeft: 8, fontSize: 12, color: COLORS.text, outlineStyle: 'none' } as any}
                      />
                      {calendarSearch ? (
                        <TouchableOpacity onPress={() => setCalendarSearch('')}>
                          <Ionicons name="close-circle" size={14} color={COLORS.muted} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {/* ========================================================= */}
                  {/* MATRIZ DE DISPONIBILIDAD (CUADRÍCULA HORARIA DE SALAS)    */}
                  {/* ========================================================= */}
                  <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    overflow: 'hidden',
                    ...Platform.select({
                      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }
                    })
                  }}>
                    {/* Leyenda superior */}
                    <View style={{
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      backgroundColor: '#F8FAFC',
                      borderBottomWidth: 1,
                      borderBottomColor: '#E2E8F0',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primarySoft }}>
                        HORARIOS DE ATENCIÓN: 07:00 A 19:00
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#10B981' }} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted }}>Disponible</Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#2563EB' }} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted }}>Ocupada (Confirmada)</Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#F59E0B' }} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted }}>Pendiente Aprobación</Text>
                        </View>
                      </View>
                    </View>

                    {/* Contenedor con scroll horizontal para permitir ver todas las salas en cuadrícula */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                      <View style={{ minWidth: isDesktop ? '100%' : 700 }}>
                        
                        {/* Cabecera de Columnas: Salas */}
                        <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
                          {/* Columna fija de horas */}
                          <View style={{ width: 90, padding: 14, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E2E8F0' }}>
                            <Text style={{ fontSize: 12, fontWeight: '900', color: COLORS.primary }}>
                              HORARIO
                            </Text>
                          </View>

                          {/* Columnas de salas */}
                          {calendarRooms.map(room => {
                            const isSpecial = isSpecialRoom(room);
                            return (
                              <View 
                                key={room.id} 
                                style={{ 
                                  flex: 1, 
                                  minWidth: 190, 
                                  padding: 12, 
                                  borderRightWidth: 1, 
                                  borderRightColor: '#E2E8F0',
                                  backgroundColor: isSpecial ? '#FEFCE8' : '#F8FAFC'
                                }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <View style={{ 
                                    width: 28, 
                                    height: 28, 
                                    borderRadius: 8, 
                                    backgroundColor: isSpecial ? '#FEF08A' : '#F3E8FF', 
                                    justifyContent: 'center', 
                                    alignItems: 'center' 
                                  }}>
                                    <Ionicons 
                                      name={isSpecial ? "sparkles" : "business"} 
                                      size={14} 
                                      color={isSpecial ? '#A16207' : COLORS.purple} 
                                    />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.text, flexShrink: 1 }} numberOfLines={1}>
                                        {room.name}
                                      </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                      {isSpecial && (
                                        <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#854D0E', textTransform: 'uppercase' }}>
                                            Especial
                                          </Text>
                                        </View>
                                      )}
                                      <Text style={{ fontSize: 10, fontWeight: '600', color: isSpecial ? '#854D0E' : COLORS.muted }}>
                                        {room.floor || 'PB'} • {room.capacity || '0'} p.
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>

                        {/* Filas: Cada hora de operación */}
                        {OPERATING_HOURS.map(({ hour, label }) => (
                          <View 
                            key={hour} 
                            style={{ 
                              flexDirection: 'row', 
                              borderBottomWidth: 1, 
                              borderBottomColor: '#F1F5F9',
                              minHeight: 52
                            }}
                          >
                            {/* Etiqueta de la hora */}
                            <View style={{
                              width: 90,
                              paddingHorizontal: 10,
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderRightWidth: 1,
                              borderRightColor: '#E2E8F0',
                              backgroundColor: '#FAFAFA'
                            }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primarySoft }}>
                                {label}
                              </Text>
                              <Text style={{ fontSize: 10, color: COLORS.muted }}>
                                a {hour + 1 < 10 ? `0${hour + 1}:00` : `${hour + 1}:00`}
                              </Text>
                            </View>

                            {/* Celdas por sala */}
                            {calendarRooms.map(room => {
                              const res = getSlotReservation(room, hour);
                              const isOccupied = !!res;
                              const isConfirmed = res?.isConfirmed;
                              const isPending = res?.isPending || (isOccupied && !isConfirmed);

                              return (
                                <TouchableOpacity
                                  key={room.id}
                                  onPress={() => handleSlotPress(room, hour)}
                                  activeOpacity={0.8}
                                  style={{
                                    flex: 1,
                                    minWidth: 180,
                                    padding: 8,
                                    borderRightWidth: 1,
                                    borderRightColor: '#E2E8F0',
                                    backgroundColor: isOccupied 
                                      ? (isConfirmed ? '#EFF6FF' : '#FEF3C7')
                                      : '#FFFFFF',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {isOccupied ? (
                                    <View style={{
                                      backgroundColor: isConfirmed ? '#DBEAFE' : '#FDE68A',
                                      borderRadius: 8,
                                      padding: 8,
                                      borderLeftWidth: 3.5,
                                      borderLeftColor: isConfirmed ? '#2563EB' : '#D97706'
                                    }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <Text style={{
                                          fontSize: 9.5,
                                          fontWeight: '900',
                                          color: isConfirmed ? '#1E40AF' : '#92400E',
                                          textTransform: 'uppercase'
                                        }}>
                                          {isConfirmed ? 'Ocupada (Confirmada)' : 'Pendiente Aprobación'}
                                        </Text>
                                        <Ionicons 
                                          name={isConfirmed ? "checkmark-circle" : "time-outline"} 
                                          size={13} 
                                          color={isConfirmed ? '#1E40AF' : '#92400E'} 
                                        />
                                      </View>
                                      <Text 
                                        style={{ fontSize: 11, fontWeight: '800', color: COLORS.text }} 
                                        numberOfLines={1}
                                      >
                                        {res.title || 'Reunión Institucional'}
                                      </Text>
                                      <Text 
                                        style={{ fontSize: 9, color: COLORS.muted, marginTop: 1 }} 
                                        numberOfLines={1}
                                      >
                                        {res.user_name || res.metadata?.responsible_name || 'Funcionario'}
                                      </Text>
                                    </View>
                                  ) : (
                                    <View style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 6,
                                      paddingHorizontal: 8,
                                      paddingVertical: 6,
                                      borderRadius: 6,
                                      backgroundColor: '#F0FDF4',
                                      borderWidth: 1,
                                      borderColor: '#DCFCE7'
                                    }}>
                                      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' }} />
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>
                                        Disponible
                                      </Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              )}

              {/* ========================================================= */}
              {/* SUBMÓDULO: CELDAS Y PARQUEADERO                           */}
              {/* ========================================================= */}
              {(activeTab === 'all' || activeTab === 'parking_spots') && (
                <View style={{ marginBottom: 44 }}>
                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
                    <View>
                      <Text style={styles.sectionKicker}>CONTROL DE ACCESO Y SÓTANOS</Text>
                      <Text style={styles.sectionTitle}>Administración de Celdas y Parqueadero</Text>
                    </View>
                    <TouchableOpacity 
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: '#EA580C',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 14,
                        ...Platform.select({
                          web: { boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)' }
                        })
                      }}
                      onPress={openCreateSpotModal}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={20} color={COLORS.white} />
                      <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '800' }}>
                        + Nueva Celda
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Panel de Métricas de Parqueadero */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                    {[
                      { label: 'Total Celdas', val: parkingSpots.length, icon: 'grid', color: '#0F172A', bg: '#F1F5F9' },
                      { label: 'Disponibles', val: parkingSpots.filter(s => s.status === 'disponible').length, icon: 'checkmark-circle', color: '#059669', bg: '#ECFDF5' },
                      { label: 'Ocupadas', val: parkingSpots.filter(s => s.status === 'ocupada').length, icon: 'lock-closed', color: '#DC2626', bg: '#FEF2F2' },
                      { label: 'Celdas Fijas', val: parkingSpots.filter(s => s.spot_type === 'fija').length, icon: 'person-pin', color: '#2563EB', bg: '#EFF6FF' },
                      { label: 'Uso Libre', val: parkingSpots.filter(s => s.spot_type === 'libre').length, icon: 'refresh', color: '#7C3AED', bg: '#F5F3FF' },
                      { label: 'Vehículos Activos', val: allVehicles.filter(v => v.is_active !== false).length, icon: 'car-sport', color: '#EA580C', bg: '#FFF7ED' },
                    ].map((card, idx) => (
                      <View 
                        key={idx} 
                        style={{
                          flex: 1,
                          minWidth: isDesktop ? 140 : '46%',
                          backgroundColor: card.bg,
                          padding: 14,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: `${card.color}20`,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12
                        }}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name={card.icon as any} size={20} color={card.color} />
                        </View>
                        <View>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: card.color }}>{card.val}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{card.label}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Política de Asignación por Cargo */}
                  <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 20,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginBottom: 24,
                    flexDirection: isDesktop ? 'row' : 'column',
                    alignItems: isDesktop ? 'center' : 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16
                  }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="speedometer-outline" size={24} color="#2563EB" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.text }}>
                          Política de Asignación y Cupos de Vehículos por Cargo
                        </Text>
                        <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2, marginBottom: 8 }}>
                          Reglas vigentes de parqueadero permanente de la Secretaría Jurídica Distrital:
                        </Text>
                        
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            gap: 5, 
                            backgroundColor: '#EFF6FF', 
                            paddingHorizontal: 8, 
                            paddingVertical: 4, 
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#BFDBFE'
                          }}>
                            <Ionicons name="infinite" size={13} color="#1D4ED8" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                              Directivos: Sin límite
                            </Text>
                          </View>

                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            gap: 5, 
                            backgroundColor: '#F0FDF4', 
                            paddingHorizontal: 8, 
                            paddingVertical: 4, 
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#BBF7D0'
                          }}>
                            <Ionicons name="car" size={13} color="#15803D" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>
                              Funcionarios / Asesores: Máx. 1
                            </Text>
                          </View>

                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            gap: 5, 
                            backgroundColor: '#FEF2F2', 
                            paddingHorizontal: 8, 
                            paddingVertical: 4, 
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#FECACA'
                          }}>
                            <Ionicons name="ban" size={13} color="#B91C1C" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#B91C1C' }}>
                              Contratistas: 0 (No asignable)
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#ECFDF5',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#A7F3D0'
                    }}>
                      <Ionicons name="shield-checkmark" size={16} color="#059669" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#059669' }}>
                        Regla Automática por Cargo
                      </Text>
                    </View>
                  </View>

                  {/* Barra de Filtros y Búsqueda de Celdas */}
                  <View style={{
                    flexDirection: isDesktop ? 'row' : 'column',
                    alignItems: isDesktop ? 'center' : 'stretch',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 16
                  }}>
                    <View style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      height: 44
                    }}>
                      <Ionicons name="search" size={18} color={COLORS.muted} />
                      <TextInput 
                        placeholder="Buscar celda por código, asignatario o notas..."
                        value={spotSearch}
                        onChangeText={setSpotSearch}
                        style={{ flex: 1, marginLeft: 8, fontSize: 13, color: COLORS.text, outlineStyle: 'none' } as any}
                      />
                      {spotSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setSpotSearch('')}>
                          <Ionicons name="close-circle" size={16} color={COLORS.muted} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { id: 'all', label: 'Todas' },
                        { id: 'fija', label: 'Fijas' },
                        { id: 'libre', label: 'Libres' },
                        { id: 'disponible', label: 'Disponibles' },
                        { id: 'ocupada', label: 'Ocupadas' },
                      ].map(f => (
                        <TouchableOpacity
                          key={f.id}
                          onPress={() => setSpotFilter(f.id as any)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 10,
                            backgroundColor: spotFilter === f.id ? COLORS.primary : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: spotFilter === f.id ? COLORS.primary : '#E2E8F0'
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: spotFilter === f.id ? '#FFFFFF' : COLORS.text }}>
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Grid de Celdas */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 36 }}>
                    {filteredSpots.length === 0 ? (
                      <View style={{ width: '100%', padding: 40, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center' }}>
                        <Ionicons name="car-outline" size={48} color="#CBD5E1" />
                        <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '700', color: COLORS.muted }}>
                          No se encontraron celdas con los criterios seleccionados.
                        </Text>
                      </View>
                    ) : (
                      filteredSpots.map(spot => {
                        const isDispo = spot.status === 'disponible';
                        const isFija = spot.spot_type === 'fija';

                        return (
                          <View 
                            key={spot.id}
                            style={{
                              width: isDesktop ? '31.5%' : '100%',
                              backgroundColor: '#FFFFFF',
                              borderRadius: 18,
                              padding: 16,
                              borderWidth: 1.5,
                              borderColor: isDispo ? '#D1FAE5' : '#FEE2E2',
                              ...Platform.select({
                                web: { boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }
                              })
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                  borderRadius: 8,
                                  backgroundColor: isFija ? '#EFF6FF' : '#F5F3FF',
                                  borderWidth: 1,
                                  borderColor: isFija ? '#BFDBFE' : '#DDD6FE'
                                }}>
                                  <Text style={{ fontSize: 13, fontWeight: '900', color: isFija ? '#1D4ED8' : '#6D28D9' }}>
                                    {spot.code}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: isFija ? '#2563EB' : '#7C3AED', textTransform: 'uppercase' }}>
                                  {isFija ? 'Celda Fija' : 'Uso Libre'}
                                </Text>
                              </View>

                              <View style={{
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 6,
                                backgroundColor: isDispo ? '#ECFDF5' : '#FEF2F2'
                              }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: isDispo ? '#059669' : '#DC2626', textTransform: 'uppercase' }}>
                                  {spot.status}
                                </Text>
                              </View>
                            </View>

                            <View style={{ marginBottom: 12, minHeight: 40 }}>
                              {spot.assigned_user_name ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Ionicons name="person" size={14} color="#475569" />
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }} numberOfLines={1}>
                                    {spot.assigned_user_name}
                                  </Text>
                                </View>
                              ) : (
                                <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                                  Sin asignación permanente
                                </Text>
                              )}

                              {spot.notes && (
                                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }} numberOfLines={2}>
                                  {spot.notes}
                                </Text>
                              )}
                            </View>

                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: 10,
                              borderTopWidth: 1,
                              borderTopColor: '#F1F5F9'
                            }}>
                              <View style={{ flexDirection: 'row', gap: 6 }}>
                                {isDispo ? (
                                  <TouchableOpacity
                                    onPress={() => handleOpenAssignModal(spot)}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      backgroundColor: '#EFF6FF',
                                      paddingHorizontal: 8,
                                      paddingVertical: 5,
                                      borderRadius: 8
                                    }}
                                  >
                                    <Ionicons name="person-add" size={13} color="#2563EB" />
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>Asignar</Text>
                                  </TouchableOpacity>
                                ) : (
                                  <TouchableOpacity
                                    onPress={() => handleOpenReleaseModal(spot)}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      backgroundColor: '#FEF2F2',
                                      paddingHorizontal: 8,
                                      paddingVertical: 5,
                                      borderRadius: 8
                                    }}
                                  >
                                    <Ionicons name="lock-open-outline" size={13} color="#DC2626" />
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>Liberar</Text>
                                  </TouchableOpacity>
                                )}
                              </View>

                              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => openEditSpotModal(spot)} style={{ padding: 4 }}>
                                  <Ionicons name="pencil" size={15} color="#64748B" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleOpenDeleteSpotModal(spot)} style={{ padding: 4 }}>
                                  <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* GESTIÓN INTEGRAL DE VEHÍCULOS DE LA ENTIDAD */}
                  <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 20,
                    padding: 22,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginTop: 10
                  }}>
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.text }}>
                          Directorio de Vehículos Registrados
                        </Text>
                        <Text style={{ fontSize: 12, color: COLORS.muted }}>
                          Auditoría, edición de datos de funcionarios, estado activo y trazabilidad histórica.
                        </Text>
                      </View>

                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F8FAFC',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        width: isDesktop ? 300 : '100%',
                        height: 38
                      }}>
                        <Ionicons name="search" size={16} color={COLORS.muted} />
                        <TextInput 
                          placeholder="Buscar por placa, propietario o documento..."
                          value={vehicleSearch}
                          onChangeText={setVehicleSearch}
                          style={{ flex: 1, marginLeft: 8, fontSize: 12, color: COLORS.text, outlineStyle: 'none' } as any}
                        />
                        {vehicleSearch.length > 0 && (
                          <TouchableOpacity onPress={() => setVehicleSearch('')}>
                            <Ionicons name="close-circle" size={14} color={COLORS.muted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {filteredVehicles.length === 0 ? (
                      <View style={{ padding: 30, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.muted, fontSize: 13 }}>No hay vehículos registrados para mostrar.</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'column', gap: 10 }}>
                        {filteredVehicles.map(veh => {
                          const isActive = veh.is_active !== false;

                          return (
                            <View 
                              key={veh.id}
                              style={{
                                flexDirection: isDesktop ? 'row' : 'column',
                                alignItems: isDesktop ? 'center' : 'stretch',
                                justifyContent: 'space-between',
                                backgroundColor: '#F8FAFC',
                                borderRadius: 14,
                                padding: 14,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                gap: 12
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                <View style={{
                                  backgroundColor: '#1E293B',
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: '#334155'
                                }}>
                                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#F8FAFC', letterSpacing: 1 }}>
                                    {veh.plate}
                                  </Text>
                                </View>

                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.text }}>
                                    {veh.brand} {veh.model ? `• ${veh.model}` : ''} {veh.color ? `(${veh.color})` : ''}
                                  </Text>
                                  <Text style={{ fontSize: 11, color: COLORS.muted }}>
                                    {veh.name || 'Sin titular'} {veh.doc ? `• C.C. ${veh.doc}` : ''} {veh.dependency ? `• ${veh.dependency}` : ''}
                                  </Text>
                                </View>
                              </View>

                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: isDesktop ? 'flex-end' : 'space-between' }}>
                                <View style={{
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 6,
                                  backgroundColor: isActive ? '#ECFDF5' : '#FEF2F2'
                                }}>
                                  <Text style={{ fontSize: 10, fontWeight: '800', color: isActive ? '#059669' : '#DC2626' }}>
                                    {isActive ? 'ACTIVO' : 'INACTIVO'}
                                  </Text>
                                </View>

                                <TouchableOpacity
                                  onPress={() => handleOpenHistory(veh)}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                    backgroundColor: '#EFF6FF',
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 8
                                  }}
                                >
                                  <Ionicons name="time-outline" size={14} color="#2563EB" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>Historial</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => handleAdminEditVehicle(veh)}
                                  style={{
                                    padding: 6,
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0'
                                  }}
                                >
                                  <Ionicons name="pencil" size={14} color="#475569" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => handleAdminToggleVehicleActive(veh)}
                                  style={{
                                    padding: 6,
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0'
                                  }}
                                >
                                  <Ionicons 
                                    name={isActive ? "close-circle-outline" : "checkmark-circle-outline"} 
                                    size={14} 
                                    color={isActive ? "#DC2626" : "#059669"} 
                                  />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => handleAdminDeleteVehicle(veh)}
                                  style={{
                                    padding: 6,
                                    backgroundColor: '#FEF2F2',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#FEE2E2'
                                  }}
                                >
                                  <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* ========================================================= */}
              {/* SUBMÓDULO: GESTIÓN DE ESPACIOS                            */}
              {/* ========================================================= */}
              {(activeTab === 'all' || activeTab === 'rooms') && (
                <View style={{ marginBottom: 44 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <View>
                      <Text style={styles.sectionKicker}>INFRAESTRUCTURA Y SALAS</Text>
                      <Text style={styles.sectionTitle}>Gestión de Espacios</Text>
                    </View>
                    <TouchableOpacity 
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: '#7209B7',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 14,
                        ...Platform.select({
                          web: { boxShadow: '0 4px 12px rgba(114, 9, 183, 0.25)' }
                        })
                      }}
                      onPress={openCreateRoomModal}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={20} color={COLORS.white} />
                      <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '800' }}>
                        Agregar Espacio
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.cardList, isDesktop && { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }]}>
                    {rooms.map(room => (
                      <View key={room.id} style={[styles.roomCard, isDesktop && { width: '48%' }]}>
                        <TouchableOpacity onPress={() => openEditRoomModal(room)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                          <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: '#7209B7', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="business" size={20} color="#FFF" />
                          </View>
                          
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: '#1E293B' }}>
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

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, color: '#64748B' }}>
                            ESPACIO {room.info === 'Especial' ? 'ESPECIAL' : 'ESTÁNDAR'}
                          </Text>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TouchableOpacity onPress={() => openEditRoomModal(room)} style={{ padding: 4 }}>
                              <Ionicons name="pencil" size={16} color="#3B82F6" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => openDeleteRoomConfirmation(room)} style={{ padding: 4 }}>
                              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ========================================================= */}
              {/* SUBMÓDULO: GESTIÓN DE CONDUCTORES                         */}
              {/* ========================================================= */}
              {(activeTab === 'all' || activeTab === 'drivers') && (
                <View style={{ marginBottom: 44 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <View>
                      <Text style={styles.sectionKicker}>LOGÍSTICA DE TRANSPORTE</Text>
                      <Text style={styles.sectionTitle}>Gestión de Conductores</Text>
                    </View>
                    <TouchableOpacity 
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: '#2563EB',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 14,
                        ...Platform.select({
                          web: { boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' }
                        })
                      }}
                      onPress={openCreateDriverModal}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={20} color={COLORS.white} />
                      <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '800' }}>
                        Agregar Conductor
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'column', gap: 14 }}>
                    {drivers.map(drv => {
                      const isActive = drv.is_active !== false;

                      return (
                        <View 
                          key={drv.id} 
                          style={{
                            width: '100%',
                            backgroundColor: COLORS.white,
                            borderRadius: 20,
                            paddingVertical: 16,
                            paddingHorizontal: 20,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            flexDirection: isDesktop ? 'row' : 'column',
                            alignItems: isDesktop ? 'center' : 'stretch',
                            justifyContent: 'space-between',
                            gap: 16
                          }}
                        >
                          <TouchableOpacity 
                            onPress={() => openEditDriverModal(drv)} 
                            activeOpacity={0.7} 
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 14,
                              flex: isDesktop ? 1.2 : undefined
                            }}
                          >
                            <View style={{
                              width: 48,
                              height: 48,
                              borderRadius: 14,
                              backgroundColor: '#EFF6FF',
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}>
                              <Ionicons name="car-sport" size={24} color="#2563EB" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.primary }}>
                                {drv.name || 'Sin nombre'}
                              </Text>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }}>
                                Conductor Oficial • Secretaría Jurídica Distrital
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#F8FAFC',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 10
                            }}>
                              <Ionicons name="call" size={14} color="#2563EB" />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }}>
                                {drv.phone || 'Sin teléfono'}
                              </Text>
                            </View>

                            <TouchableOpacity
                              onPress={() => handleToggleDriverStatus(drv)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 10,
                                backgroundColor: isActive ? '#ECFDF5' : '#FEF2F2',
                                borderWidth: 1,
                                borderColor: isActive ? '#A7F3D0' : '#FECACA'
                              }}
                            >
                              <Ionicons 
                                name={isActive ? "checkmark-circle" : "close-circle"} 
                                size={14} 
                                color={isActive ? "#059669" : "#DC2626"} 
                              />
                              <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? "#059669" : "#DC2626" }}>
                                {isActive ? 'DISPONIBLE' : 'NO DISPONIBLE'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                            <TouchableOpacity onPress={() => openEditDriverModal(drv)} style={{ padding: 6 }}>
                              <Ionicons name="pencil" size={16} color="#3B82F6" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => openDeleteDriverConfirmation(drv)} style={{ padding: 6 }}>
                              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ========================================================= */}
              {/* SUBMÓDULO: EVALUACIONES DE SERVICIO                       */}
              {/* ========================================================= */}
              {(activeTab === 'all' || activeTab === 'evaluations') && (
                <View style={{ marginBottom: 44 }}>
                  <View style={{ marginBottom: 20 }}>
                    <Text style={styles.sectionKicker}>CONTROL DE CALIDAD</Text>
                    <Text style={styles.sectionTitle}>Evaluación de Servicios</Text>
                    <Text style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
                      Activa o desactiva la solicitud de calificación obligatoria a los funcionarios una vez finalizada cada solicitud.
                    </Text>
                  </View>

                  <View style={styles.configCard}>
                    {[
                      { id: 'maintenance', label: 'Mantenimiento Locativo' },
                      { id: 'visitors', label: 'Control de Visitantes' },
                      { id: 'rooms', label: 'Reserva de Salas' },
                      { id: 'parking', label: 'Cupo de Parqueadero' },
                      { id: 'transport', label: 'Transporte Oficial' }
                    ].map((item, index, arr) => (
                      <React.Fragment key={item.id}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
                              <Ionicons name="star" size={18} color="#2563EB" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text }}>{item.label}</Text>
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>
                                Solicitar encuesta de satisfacción al culminar servicios de {item.label.toLowerCase()}.
                              </Text>
                            </View>
                          </View>

                          <Switch
                            value={evalCategories.includes(item.id)}
                            onValueChange={(val: boolean) => {
                              setPendingEvalToggle({ id: item.id, label: item.label, newValue: val });
                              setShowEvalConfirmModal(true);
                            }}
                            trackColor={{ false: '#CBD5E1', true: '#2563EB' }}
                          />
                        </View>
                        {index < arr.length - 1 && <View style={styles.configDivider} />}
                      </React.Fragment>
                    ))}
                  </View>
                </View>
              )}

            </ScrollView>
          )}
        </View>
      </View>

      {/* ========================================================= */}
      {/* MODALES DEL CALENDARIO                                    */}
      {/* ========================================================= */}

      {/* MODAL DETALLE DE RESERVA DE SALA */}
      <Modal 
        visible={!!selectedReservationModal} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setSelectedReservationModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 540 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="calendar" size={24} color={COLORS.purple} />
                </View>
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: COLORS.text }}>
                    Detalle de Reserva
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted }}>
                    {selectedReservationModal?.roomName || 'Sala de Juntas'} • {selectedReservationModal?.roomFloor || 'Piso 1'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setSelectedReservationModal(null)} style={{ padding: 6 }}>
                <Ionicons name="close" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12 }}>
                {/* Título de la reunión */}
                <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.muted, textTransform: 'uppercase' }}>
                    Asunto / Actividad
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.text, marginTop: 2 }}>
                    {selectedReservationModal?.title || selectedReservationModal?.metadata?.activity_name || 'Reunión sin título'}
                  </Text>
                  {selectedReservationModal?.description ? (
                    <Text style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                      {selectedReservationModal.description}
                    </Text>
                  ) : null}
                </View>

                {/* Fecha y Horario */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#1E40AF', textTransform: 'uppercase' }}>
                      Fecha Reservada
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E40AF', marginTop: 2 }}>
                      {selectedReservationModal?.metadata?.date || selectedReservationModal?.parsed?.dateIso || 'Hoy'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, backgroundColor: '#F5F3FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#DDD6FE' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#6D28D9', textTransform: 'uppercase' }}>
                      Horario
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#6D28D9', marginTop: 2 }}>
                      {selectedReservationModal?.metadata?.time || selectedReservationModal?.metadata?.booking_hours || `${selectedReservationModal?.parsed?.startHour}:00 - ${selectedReservationModal?.parsed?.endHour}:00`}
                    </Text>
                  </View>
                </View>

                {/* Solicitante y Dependencia */}
                <View style={{ backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="person" size={16} color={COLORS.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: COLORS.muted }}>Solicitante / Responsable:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.text }}>
                        {selectedReservationModal?.user_name || selectedReservationModal?.metadata?.responsible_name || 'Funcionario'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="business-outline" size={16} color={COLORS.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: COLORS.muted }}>Dependencia / Entidad:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>
                        {selectedReservationModal?.user_dependency || selectedReservationModal?.metadata?.dependency || selectedReservationModal?.metadata?.entity_name || 'Secretaría Jurídica Distrital'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="people-outline" size={16} color={COLORS.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: COLORS.muted }}>Asistentes previstos:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>
                        {selectedReservationModal?.metadata?.attendees || selectedReservationModal?.metadata?.participants_count || 'No especificado'} personas
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Estado de Aprobación */}
                {(() => {
                  const isConf = isReservationConfirmed(selectedReservationModal?.status);
                  const isPend = isReservationPending(selectedReservationModal?.status);
                  const bannerBg = isConf ? '#EFF6FF' : (isPend ? '#FEF3C7' : '#F1F5F9');
                  const bannerBorder = isConf ? '#BFDBFE' : (isPend ? '#FDE68A' : '#E2E8F0');
                  const badgeColor = isConf ? '#1E40AF' : (isPend ? '#92400E' : '#475569');
                  const iconName = isConf ? 'checkmark-circle' : (isPend ? 'time' : 'alert-circle');
                  const statusLabel = isConf ? 'Ocupada (Confirmada)' : (isPend ? 'Pendiente Aprobación' : (selectedReservationModal?.status || 'Registrada'));
                  const statusDesc = isConf ? 'Espacio formalmente reservado y confirmado' : 'Pendiente de autorización administrativa';

                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: bannerBg, borderWidth: 1, borderColor: bannerBorder }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons 
                          name={iconName as any} 
                          size={22} 
                          color={badgeColor} 
                        />
                        <View>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: badgeColor, textTransform: 'uppercase' }}>
                            Estado: {statusLabel}
                          </Text>
                          <Text style={{ fontSize: 11, color: badgeColor, opacity: 0.9, marginTop: 1 }}>
                            {statusDesc}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <TouchableOpacity onPress={() => setSelectedReservationModal(null)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setSelectedReservationModal(null);
                  router.push('/admin/manage');
                }} 
                style={[styles.btnPrimary, { backgroundColor: '#2563EB' }]}
              >
                <Text style={styles.btnPrimaryText}>Ir a Solicitudes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ESPACIO DISPONIBLE */}
      <Modal 
        visible={!!freeSlotModal?.visible} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setFreeSlotModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 440 }]}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="checkmark-circle" size={26} color="#059669" />
            </View>
            <Text style={styles.modalTitle}>Franja Horaria Disponible</Text>
            <Text style={styles.modalDesc}>
              El espacio <Text style={{ fontWeight: '800', color: COLORS.text }}>{freeSlotModal?.roomName}</Text> está totalmente libre para el horario de <Text style={{ fontWeight: '800', color: COLORS.text }}>{freeSlotModal?.hourText}</Text> el {freeSlotModal?.dateText}.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <TouchableOpacity onPress={() => setFreeSlotModal(null)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Entendido</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setFreeSlotModal(null);
                  router.push('/requests/rooms');
                }} 
                style={[styles.btnPrimary, { backgroundColor: COLORS.purple }]}
              >
                <Text style={styles.btnPrimaryText}>Reservar Esta Sala</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* RESTO DE MODALES DE GESTIÓN                               */}
      {/* ========================================================= */}

      {/* MODAL CREAR / EDITAR ESPACIO */}
      <Modal visible={roomModalVisible} transparent animationType="fade" onRequestClose={() => setRoomModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 460 }]}>
            <Text style={styles.modalTitle}>{editingRoom ? 'Editar Espacio' : 'Nuevo Espacio'}</Text>
            <Text style={styles.modalDesc}>Especifica las características y ubicación física del espacio.</Text>

            <View style={{ gap: 12, marginVertical: 16 }}>
              <View>
                <Text style={styles.modalInputLabel}>Nombre del Espacio</Text>
                <TextInput 
                  value={roomName}
                  onChangeText={setRoomName}
                  placeholder="Ej: Sala de Juntas Principal"
                  style={styles.modalInput}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>Capacidad (personas)</Text>
                  <TextInput 
                    value={roomCapacity}
                    onChangeText={setRoomCapacity}
                    keyboardType="numeric"
                    placeholder="12"
                    style={styles.modalInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>Piso / Ubicación</Text>
                  <TextInput 
                    value={roomFloor}
                    onChangeText={setRoomFloor}
                    placeholder="Piso 2"
                    style={styles.modalInput}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.modalInputLabel}>Tipo de Espacio</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {['Estándar', 'Especial'].map(tipo => (
                    <TouchableOpacity
                      key={tipo}
                      onPress={() => setRoomInfo(tipo as any)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: roomInfo === tipo ? '#7209B7' : '#F1F5F9',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: roomInfo === tipo ? '#FFFFFF' : COLORS.text }}>
                        {tipo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setRoomModalVisible(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveRoom} style={[styles.btnPrimary, { backgroundColor: '#7209B7' }]} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <Text style={styles.btnPrimaryText}>Guardar Espacio</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR / EDITAR CONDUCTOR */}
      <Modal visible={driverModalVisible} transparent animationType="fade" onRequestClose={() => setDriverModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 460 }]}>
            <Text style={styles.modalTitle}>{editingDriver ? 'Editar Conductor' : 'Nuevo Conductor'}</Text>
            <Text style={styles.modalDesc}>Datos del conductor oficial para la asignación de recorridos institucionales.</Text>

            <View style={{ gap: 12, marginVertical: 16 }}>
              <View>
                <Text style={styles.modalInputLabel}>Nombre Completo</Text>
                <TextInput 
                  value={driverName}
                  onChangeText={setDriverName}
                  placeholder="Ej: Pedro Nel Martínez"
                  style={styles.modalInput}
                />
              </View>

              <View>
                <Text style={styles.modalInputLabel}>Teléfono de Contacto</Text>
                <TextInput 
                  value={driverPhone}
                  onChangeText={setDriverPhone}
                  keyboardType="phone-pad"
                  placeholder="Ej: 310 123 4567"
                  style={styles.modalInput}
                />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>Conductor Activo / En servicio</Text>
                <Switch 
                  value={driverIsActive} 
                  onValueChange={setDriverIsActive} 
                  trackColor={{ false: '#CBD5E1', true: '#2563EB' }} 
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setDriverModalVisible(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveDriver} style={[styles.btnPrimary, { backgroundColor: '#2563EB' }]} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <Text style={styles.btnPrimaryText}>Guardar Conductor</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR / EDITAR CELDA */}
      <Modal visible={spotModalVisible} transparent animationType="fade" onRequestClose={() => setSpotModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 480 }]}>
            <Text style={styles.modalTitle}>{editingSpot ? `Editar Celda ${editingSpot.code}` : 'Nueva Celda de Parqueadero'}</Text>
            <Text style={styles.modalDesc}>Configura la nomenclatura, tipo de celda y estado en el parqueadero.</Text>

            {spotError ? (
              <View style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginTop: 10 }}>
                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>{spotError}</Text>
              </View>
            ) : null}

            <View style={{ gap: 12, marginVertical: 16 }}>
              <View>
                <Text style={styles.modalInputLabel}>Código de Celda (Nomenclatura)</Text>
                <TextInput 
                  value={spotCode}
                  onChangeText={setSpotCode}
                  placeholder="Ej: C-01, S1-14"
                  autoCapitalize="characters"
                  style={styles.modalInput}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>Tipo de Celda</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {(['libre', 'fija'] as const).map(t => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setSpotType(t)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: spotType === t ? '#EA580C' : '#F1F5F9',
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: spotType === t ? '#FFF' : COLORS.text, textTransform: 'uppercase' }}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>Estado Inicial</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {(['disponible', 'ocupada'] as const).map(s => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setSpotStatus(s)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: spotStatus === s ? (s === 'disponible' ? '#059669' : '#DC2626') : '#F1F5F9',
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: spotStatus === s ? '#FFF' : COLORS.text, textTransform: 'uppercase' }}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View>
                <Text style={styles.modalInputLabel}>Funcionario Asignatario (Opcional)</Text>
                <TextInput 
                  value={spotUserName}
                  onChangeText={setSpotUserName}
                  placeholder="Nombre del funcionario asignado"
                  style={styles.modalInput}
                />
              </View>

              <View>
                <Text style={styles.modalInputLabel}>Observaciones / Notas</Text>
                <TextInput 
                  value={spotNotes}
                  onChangeText={setSpotNotes}
                  placeholder="Ej: Celda en sótano 1 cerca a ascensor"
                  style={styles.modalInput}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setSpotModalVisible(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSpot} style={[styles.btnPrimary, { backgroundColor: '#EA580C' }]} disabled={spotSaving}>
                {spotSaving ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <Text style={styles.btnPrimaryText}>Guardar Celda</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ASIGNAR VEHÍCULO / USUARIO A CELDA */}
      <Modal visible={assignSpotModalVisible} transparent animationType="fade" onRequestClose={() => setAssignSpotModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 500 }]}>
            <Text style={styles.modalTitle}>Asignar Celda {selectedSpotForAssign?.code}</Text>
            <Text style={styles.modalDesc}>Selecciona el vehículo o funcionario a quien se le asignará esta celda.</Text>

            {assignError ? (
              <View style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginTop: 10 }}>
                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>{assignError}</Text>
              </View>
            ) : null}

            <View style={{ marginVertical: 16, gap: 12 }}>
              <Text style={styles.modalInputLabel}>Vehículos Registrados Disponibles:</Text>
              <ScrollView style={{ maxHeight: 200, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 8 }}>
                {allVehicles.filter(v => v.is_active !== false).map(v => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => {
                      setSelectedVehicleIdToAssign(v.id);
                      setSpotUserId(v.user_id || '');
                      setSpotUserName(v.name || '');
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: selectedVehicleIdToAssign === v.id ? '#EFF6FF' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: selectedVehicleIdToAssign === v.id ? '#2563EB' : '#F1F5F9',
                      marginBottom: 6,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.text }}>{v.plate} • {v.brand}</Text>
                      <Text style={{ fontSize: 11, color: COLORS.muted }}>{v.name || 'Sin titular'} ({v.dependency || 'Sin dependencia'})</Text>
                    </View>
                    {selectedVehicleIdToAssign === v.id && (
                      <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setAssignSpotModalVisible(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmAssign} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryText}>Confirmar Asignación</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL LIBERAR CELDA */}
      <Modal visible={releaseSpotModalVisible} transparent animationType="fade" onRequestClose={() => setReleaseSpotModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 420 }]}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="lock-open-outline" size={24} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>¿Liberar Celda {selectedSpotForRelease?.code}?</Text>
            <Text style={styles.modalDesc}>
              La celda quedará disponible para que otros usuarios o asignaciones puedan ocuparla inmediatamente.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <TouchableOpacity onPress={() => setReleaseSpotModalVisible(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmRelease} style={[styles.btnPrimary, { backgroundColor: '#DC2626' }]}>
                <Text style={styles.btnPrimaryText}>Sí, Liberar Celda</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ELIMINAR CELDA */}
      <Modal visible={deleteSpotModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteSpotModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 420 }]}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="trash-outline" size={24} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>¿Eliminar Celda {selectedSpotForDelete?.code}?</Text>
            <Text style={styles.modalDesc}>
              Esta acción removerá permanentemente la celda del catálogo del sistema.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <TouchableOpacity 
                disabled={isDeletingSpot} 
                onPress={() => setDeleteSpotModalVisible(false)} 
                style={[styles.btnSecondary, isDeletingSpot && { opacity: 0.5 }]}
              >
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                disabled={isDeletingSpot} 
                onPress={handleConfirmDeleteSpot} 
                style={[styles.btnPrimary, { backgroundColor: '#DC2626' }, isDeletingSpot && { opacity: 0.7 }]}
              >
                {isDeletingSpot ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Eliminar Permanentemente</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR VEHÍCULO POR ADMIN */}
      <Modal visible={adminVehicleModalVisible} transparent animationType="fade" onRequestClose={() => setAdminVehicleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 480 }]}>
            <Text style={styles.modalTitle}>Editar Datos del Vehículo</Text>
            <Text style={styles.modalDesc}>Actualización de placa, marca, modelo y titular por administración.</Text>

            {adminVError ? (
              <View style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginTop: 10 }}>
                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>{adminVError}</Text>
              </View>
            ) : null}

            <View style={{ gap: 10, marginVertical: 16 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>Placa</Text>
                  <TextInput 
                    value={adminVPlate}
                    onChangeText={setAdminVPlate}
                    autoCapitalize="characters"
                    style={styles.modalInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>Marca</Text>
                  <TextInput 
                    value={adminVBrand}
                    onChangeText={setAdminVBrand}
                    style={styles.modalInput}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>Modelo / Año</Text>
                  <TextInput 
                    value={adminVModel}
                    onChangeText={setAdminVModel}
                    style={styles.modalInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>Color</Text>
                  <TextInput 
                    value={adminVColor}
                    onChangeText={setAdminVColor}
                    style={styles.modalInput}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.modalInputLabel}>Nombre Titular</Text>
                <TextInput 
                  value={adminVName}
                  onChangeText={setAdminVName}
                  style={styles.modalInput}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>Cédula / Documento</Text>
                  <TextInput 
                    value={adminVDoc}
                    onChangeText={setAdminVDoc}
                    style={styles.modalInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>Dependencia</Text>
                  <TextInput 
                    value={adminVDependency}
                    onChangeText={setAdminVDependency}
                    style={styles.modalInput}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>Vehículo Activo</Text>
                <Switch value={adminVIsActive} onValueChange={setAdminVIsActive} trackColor={{ false: '#CBD5E1', true: '#2563EB' }} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setAdminVehicleModalVisible(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdminSaveVehicle} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL HISTORIAL DE AUDITORÍA DE VEHÍCULO */}
      <Modal visible={historyModalVisible} transparent animationType="fade" onRequestClose={() => setHistoryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 520 }]}>
            <Text style={styles.modalTitle}>Historial del Vehículo {selectedVehicleForHistory?.plate}</Text>
            <Text style={styles.modalDesc}>Registro de eventos y trazabilidad en el sistema.</Text>

            <View style={{ marginVertical: 16 }}>
              {historyLoading ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#2563EB" />
                </View>
              ) : selectedVehicleHistory.length === 0 ? (
                <Text style={{ textAlign: 'center', color: COLORS.muted, padding: 20, fontSize: 13 }}>
                  No hay registros de auditoría para este vehículo.
                </Text>
              ) : (
                <ScrollView style={{ maxHeight: 240 }}>
                  {selectedVehicleHistory.map((item, idx) => (
                    <View key={item.id || idx} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.text }}>{item.action || 'Modificación'}</Text>
                      <Text style={{ fontSize: 11, color: COLORS.muted }}>{item.details || 'Sin detalles adicionales'}</Text>
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{item.created_at ? new Date(item.created_at).toLocaleString('es-CO') : ''}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ELIMINAR SALA */}
      <Modal visible={showRoomDeleteModal} transparent animationType="fade" onRequestClose={() => setShowRoomDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 420 }]}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="trash-outline" size={24} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>¿Eliminar {roomToDelete?.name}?</Text>
            <Text style={styles.modalDesc}>Esta acción removerá el espacio de la disponibilidad institucional.</Text>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowRoomDeleteModal(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteRoom} style={[styles.btnPrimary, { backgroundColor: '#DC2626' }]}>
                <Text style={styles.btnPrimaryText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ELIMINAR CONDUCTOR */}
      <Modal visible={showDriverDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDriverDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 420 }]}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="trash-outline" size={24} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>¿Eliminar Conductor {driverToDelete?.name}?</Text>
            <Text style={styles.modalDesc}>El conductor ya no estará disponible para la asignación de recorridos.</Text>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowDriverDeleteModal(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteDriver} style={[styles.btnPrimary, { backgroundColor: '#DC2626' }]}>
                <Text style={styles.btnPrimaryText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMAR EVALUACIÓN */}
      <Modal visible={showEvalConfirmModal} transparent animationType="fade" onRequestClose={() => setShowEvalConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 420 }]}>
            <Text style={styles.modalTitle}>Confirmar Ajuste de Evaluación</Text>
            <Text style={styles.modalDesc}>
              ¿Deseas {pendingEvalToggle?.newValue ? 'activar' : 'desactivar'} la encuesta de evaluación para el servicio de {pendingEvalToggle?.label}?
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowEvalConfirmModal(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmEvalToggle} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL NOTICE INFORMATIVO (SIN ALERTS) */}
      <Modal visible={noticeModal.visible} transparent animationType="fade" onRequestClose={() => setNoticeModal(p => ({ ...p, visible: false }))}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 400 }]}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: noticeModal.isError ? '#FEF2F2' : '#EFF6FF',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12
            }}>
              <Ionicons 
                name={noticeModal.isError ? "alert-circle" : "checkmark-circle"} 
                size={26} 
                color={noticeModal.isError ? "#DC2626" : "#2563EB"} 
              />
            </View>
            <Text style={styles.modalTitle}>{noticeModal.title}</Text>
            <Text style={styles.modalDesc}>{noticeModal.message}</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
              <TouchableOpacity 
                onPress={() => setNoticeModal(p => ({ ...p, visible: false }))} 
                style={[styles.btnPrimary, { backgroundColor: noticeModal.isError ? '#DC2626' : '#2563EB' }]}
              >
                <Text style={styles.btnPrimaryText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: COLORS.primaryDark,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  sidebarContent: {
    padding: 24,
    alignItems: 'center',
    flex: 1,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sideTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  sideSubTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  sideDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    marginVertical: 20,
  },
  sideTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
    width: '100%',
  },
  sideTabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  sideTabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  sideTabLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  sideBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  topHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topHeaderKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  topHeaderTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 2,
    letterSpacing: -0.4,
  },
  topHeaderDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  cardList: {
    gap: 14,
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }
    })
  },
  configCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  configDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      web: { boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }
    })
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  modalDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    outlineStyle: 'none',
  } as any,
  btnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  btnPrimary: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
