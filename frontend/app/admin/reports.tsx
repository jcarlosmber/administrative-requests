import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';
import { createStyledSheet, downloadWorkbook } from '../../lib/excelExport';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  useWindowDimensions, 
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  TextInput
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { requestService } from '../../lib/requestService';
import { supabase } from '../../lib/supabase';
import { settingsService } from '../../lib/settingsService';
import { vehicleService, ParkingSpot, UserVehicle, getVehicleType, getSpotVehicleType } from '../../lib/vehicleService';

// Paleta de Colores de Diseño Premium

type DateRange = 'month' | 'quarter' | 'all' | 'custom';

type MonthOption = {
  value: string;
  label: string;
  shortLabel: string;
  startDate: string;
  endDate: string;
};

const getMonthValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const buildMonthOption = (date: Date): MonthOption => {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const nextMonthStart = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const label = monthStart.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  return {
    value: getMonthValue(monthStart),
    label: label.charAt(0).toUpperCase() + label.slice(1),
    shortLabel: monthStart.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }).replace('.', ''),
    startDate: monthStart.toISOString(),
    endDate: nextMonthStart.toISOString(),
  };
};

const buildRecentMonthOptions = (count = 18) => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => buildMonthOption(new Date(now.getFullYear(), now.getMonth() - index, 1)));
};

const COLORS = {
  primary: '#0F172A',     // Slate 900
  primaryDark: '#020617', // Slate 950
  primarySoft: '#334155', // Slate 700
  accent: '#3B82F6',      // Blue 500
  accentLight: '#EFF6FF', // Blue 50
  bg: '#F8FAFC',          // Slate 50
  white: '#FFFFFF',
  text: '#1E293B',        // Slate 800
  muted: '#64748B',       // Slate 500
  line: '#E2E8F0',        // Slate 200
  success: '#10B981',     // Emerald 500
  successSoft: '#ECFDF5', // Emerald 50
  warning: '#F59E0B',     // Amber 500
  warningSoft: '#FEF3C7', // Amber 50
  danger: '#EF4444',      // Red 500
  dangerSoft: '#FEF2F2',  // Red 50
  purple: '#8B5CF6',      // Violet 500
  purpleSoft: '#F5F3FF',  // Violet 50
};

const isHighPriority = (p?: string) => ['alta', 'urgente', 'urgent', 'critica', 'crítica'].includes((p || '').toLowerCase().trim());
const isLowPriority = (p?: string) => ['baja', 'preventiva', 'menor'].includes((p || '').toLowerCase().trim());
const isMediumPriority = (p?: string) => {
  const norm = (p || '').toLowerCase().trim();
  return !norm || ['media', 'normal', 'ordinaria'].includes(norm);
};

export default function AdminReports() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const router = useRouter();

  // Estados de control
  const [activeTab, setActiveTab] = useState<'consolidated' | 'visitors' | 'maintenance' | 'parking' | 'rooms' | 'transport'>('consolidated');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const monthOptions = useMemo(() => buildRecentMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthValue(new Date()));
  const [dbData, setDbData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [dataSource, setDataSource] = useState<'database' | 'empty' | 'error'>('empty');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalTarget, setModalTarget] = useState<'from' | 'to'>('from');
  const [reportTab, setReportTab] = useState<'consolidated' | 'visitors' | 'maintenance' | 'parking' | 'parking_spots' | 'parking_access' | 'parking_requests' | 'rooms' | 'transport' | 'satisfaction'>('consolidated');
  const [isModalExpanded, setIsModalExpanded] = useState(false);
  const [evalCategories, setEvalCategories] = useState<string[]>(['visitors', 'transport', 'maintenance', 'rooms', 'parking']);

  // Control Integral de Celdas y Vehículos para Reportes
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [reportVehicles, setReportVehicles] = useState<UserVehicle[]>([]);
  const [parkingFilterType, setParkingFilterType] = useState<'all' | 'fixed' | 'free' | 'spots'>('all');
  const [parkingCellTypeFilter, setParkingCellTypeFilter] = useState<'all' | 'fija' | 'libre'>('all');
  const [parkingVehicleTypeFilter, setParkingVehicleTypeFilter] = useState<'all' | 'carro' | 'moto'>('all');
  const [parkingSortBy, setParkingSortBy] = useState<'plate' | 'name' | 'spot'>('plate');
  const [parkingSortOrder, setParkingSortOrder] = useState<'asc' | 'desc'>('asc');
  const [parkingSearch, setParkingSearch] = useState('');

  useEffect(() => {
    const loadEvalSettings = async () => {
      try {
        const cats = await settingsService.getSystemSetting('eval_categories');
        if (Array.isArray(cats)) {
          setEvalCategories(cats);
        }
      } catch (err) {
        console.warn('Error al cargar eval_categories en reportes:', err);
      }
    };
    loadEvalSettings();
  }, []);

  const isEvalActive = useCallback((category?: string) => {
    if (!category) return false;
    return evalCategories.includes(category.toLowerCase().trim());
  }, [evalCategories]);

  const selectedMonthOption = useMemo(
    () => monthOptions.find(option => option.value === selectedMonth) || monthOptions[0],
    [monthOptions, selectedMonth]
  );

  const reportPeriodLabel = useMemo(() => {
    if (dateRange === 'month') return selectedMonthOption?.label || 'Mes seleccionado';
    if (dateRange === 'quarter') return 'Últimos 3 meses';
    if (dateRange === 'custom') return `Personalizado: ${customStartDate || 'Inicio'} al ${customEndDate || 'Fin'}`;
    return 'Histórico completo';
  }, [dateRange, selectedMonthOption, customStartDate, customEndDate]);

  // Navegación fluida hacia la gestión de solicitudes con filtros o apertura de modal detallada
  const navigateToManage = useCallback((options: {
    id?: string;
    status?: string;
    service?: string;
    priority?: string;
    time?: string;
  }) => {
    const params: Record<string, string> = {
      t: Date.now().toString(),
    };
    if (options.id) params.id = options.id;
    if (options.status) params.status = options.status;
    if (options.service) params.service = options.service;
    if (options.priority) params.priority = options.priority;
    if (options.time) params.time = options.time;

    if (showDocModal) {
      setShowDocModal(false);
    }

    router.push({
      pathname: '/admin/manage',
      params,
    });
  }, [router, showDocModal]);

  // Carga de datos de analítica de Supabase. El reporte siempre usa este mismo arreglo filtrado desde la BD.
  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calcular filtros de fecha para enviar a la BD
      let startDateStr: string | undefined = undefined;
      let endDateStr: string | undefined = undefined;
      const now = new Date();
      
      if (dateRange === 'month' && selectedMonthOption) {
        startDateStr = selectedMonthOption.startDate;
        endDateStr = selectedMonthOption.endDate;
      } else if (dateRange === 'quarter') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        startDateStr = threeMonthsAgo.toISOString();
      } else if (dateRange === 'custom' && customStartDate && customEndDate) {
        try {
          startDateStr = new Date(customStartDate + 'T00:00:00').toISOString();
          endDateStr = new Date(customEndDate + 'T23:59:59').toISOString();
        } catch (e) {
          console.warn('Fechas personalizadas invalidas', e);
        }
      }

      const data = await requestService.getAnalytics(startDateStr, endDateStr);
      const rows = data || [];
      setDbData(rows);
      setDataSource(rows.length > 0 ? 'database' : 'empty');

      // Cargar celdas de parqueadero y vehículos registrados
      try {
        const [spots, vehicles] = await Promise.all([
          vehicleService.getSpots().catch(() => []),
          vehicleService.getAll({ all: true }).catch(() => [])
        ]);
        setParkingSpots(spots || []);
        setReportVehicles(vehicles || []);
      } catch (pErr) {
        console.warn('Error cargando celdas/vehículos en analítica:', pErr);
      }

      return rows;
    } catch (error) {
      console.warn('Error cargando analítica desde Supabase:', error);
      setDbData([]);
      setDataSource('error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedMonthOption]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Recargar manualmente
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalyticsData();
    setIsRefreshing(false);
  };

  // --- PROCESAMIENTO ANALÍTICO ---
  const isRejectedStatus = (s: string) => ['rechazado', 'rechazada', 'rejected'].includes((s || '').toLowerCase().trim());

  const stats = useMemo(() => {
    const validData = dbData.filter(d => !isRejectedStatus(d.status));
    const total = validData.length;
    const resolved = dbData.filter(d => d.status === 'resuelto').length;
    const pending = dbData.filter(d => d.status === 'pendiente').length;
    const inProgress = dbData.filter(d => d.status === 'en_progreso').length;
    const rejected = dbData.filter(d => isRejectedStatus(d.status)).length;

    const effectiveness = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Distribución por categorías (sin sumar rechazados)
    const catCounts = validData.reduce((acc: any, cur) => {
      acc[cur.category] = (acc[cur.category] || 0) + 1;
      return acc;
    }, { visitors: 0, maintenance: 0, parking: 0, rooms: 0, transport: 0 });

    // Criticidad Global: evaluar sobre la totalidad de solicitudes recibidas en el periodo (incluyendo alta/urgente)
    const highPriority = dbData.filter(d => isHighPriority(d.priority)).length;
    const mediumPriority = dbData.filter(d => isMediumPriority(d.priority)).length;
    const lowPriority = dbData.filter(d => isLowPriority(d.priority)).length;
    const highResolved = dbData.filter(d => isHighPriority(d.priority) && d.status === 'resuelto').length;
    const criticalityTotal = highPriority + mediumPriority + lowPriority || dbData.length;

    // Evaluaciones y Calificaciones
    const evaluatedRequests = dbData.filter(d => typeof d.metadata?.evaluation?.rating === 'number');
    const totalEvaluated = evaluatedRequests.length;
    const sumRatings = evaluatedRequests.reduce((acc, cur) => acc + (cur.metadata.evaluation.rating || 0), 0);
    const averageRating = totalEvaluated > 0 ? Number((sumRatings / totalEvaluated).toFixed(1)) : 0;

    const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    evaluatedRequests.forEach(d => {
      const r = Math.round(d.metadata.evaluation.rating);
      if (r >= 1 && r <= 5) ratingCounts[r] = (ratingCounts[r] || 0) + 1;
    });
    const favorablePercent = totalEvaluated > 0 
      ? Math.round(((ratingCounts[5] + ratingCounts[4]) / totalEvaluated) * 100) 
      : 0;
    const responseRate = resolved > 0 ? Math.round((totalEvaluated / resolved) * 100) : 0;

    const getModuleEval = (cat: string) => {
      const modEvals = evaluatedRequests.filter(d => d.category === cat);
      const count = modEvals.length;
      const avg = count > 0 ? Number((modEvals.reduce((a, c) => a + c.metadata.evaluation.rating, 0) / count).toFixed(1)) : 0;
      return { count, avg, list: modEvals };
    };

    const moduleEvaluations = {
      visitors: getModuleEval('visitors'),
      maintenance: getModuleEval('maintenance'),
      parking: getModuleEval('parking'),
      rooms: getModuleEval('rooms'),
      transport: getModuleEval('transport'),
    };

    const recentEvaluations = evaluatedRequests
      .filter(d => d.metadata?.evaluation?.comment)
      .sort((a, b) => new Date(b.metadata.evaluation.date || b.created_at).getTime() - new Date(a.metadata.evaluation.date || a.created_at).getTime());

    return {
      total,
      criticalityTotal,
      resolved,
      pending,
      inProgress,
      rejected,
      effectiveness,
      catCounts,
      highPriority,
      mediumPriority,
      lowPriority,
      highResolved,
      totalEvaluated,
      averageRating,
      ratingCounts,
      favorablePercent,
      responseRate,
      moduleEvaluations,
      recentEvaluations,
      recentGlobal: dbData.slice(0, 15)
    };
  }, [dbData]);

  // Desglose de estados por módulo para barras segmentadas
  const categoryBreakdown = useMemo(() => {
    const getStatsFor = (cat: string) => {
      const items = dbData.filter(d => d.category === cat);
      const validItems = items.filter(d => !isRejectedStatus(d.status));
      return {
        total: items.length,
        validTotal: validItems.length,
        resolved: items.filter(d => d.status === 'resuelto').length,
        inProgress: items.filter(d => d.status === 'en_progreso').length,
        pending: items.filter(d => d.status === 'pendiente').length,
        rejected: items.filter(d => isRejectedStatus(d.status)).length,
      };
    };

    return {
      visitors: getStatsFor('visitors'),
      maintenance: getStatsFor('maintenance'),
      parking: getStatsFor('parking'),
      rooms: getStatsFor('rooms'),
      transport: getStatsFor('transport')
    };
  }, [dbData]);

  // Módulo de Mantenimiento Específico (Manejo de Estados)
  const maintenanceStats = useMemo(() => {
    const maintenanceRequests = dbData.filter(d => d.category === 'maintenance');
    const validMaintenance = maintenanceRequests.filter(d => !isRejectedStatus(d.status));
    const total = validMaintenance.length;
    const pending = maintenanceRequests.filter(d => d.status === 'pendiente').length;
    const inProgress = maintenanceRequests.filter(d => d.status === 'en_progreso').length;
    const resolved = maintenanceRequests.filter(d => d.status === 'resuelto').length;
    const rejected = maintenanceRequests.filter(d => isRejectedStatus(d.status)).length;

    // Criticidad: solicitudes de prioridad alta que siguen pendientes
    const highPriorityPending = maintenanceRequests.filter(d => isHighPriority(d.priority) && d.status === 'pendiente').length;

    // Especialidades de daño
    const specialties: Record<string, number> = {
      'Eléctrico e Iluminación': 0,
      'Hidrosanitario / Plomería': 0,
      'Cerrajería y Puertas': 0,
      'Mobiliario y Pintura': 0,
      'Climatización y Ventilación': 0,
      'Infraestructura General': 0,
    };

    validMaintenance.forEach(req => {
      const text = `${req.title || ''} ${req.description || ''} ${req.metadata?.location || ''}`.toLowerCase();
      if (text.includes('luz') || text.includes('ilumina') || text.includes('electr') || text.includes('toma') || text.includes('cable') || text.includes('bombill')) {
        specialties['Eléctrico e Iluminación']++;
      } else if (text.includes('agua') || text.includes('baño') || text.includes('fuga') || text.includes('tubo') || text.includes('grifo') || text.includes('sanitari')) {
        specialties['Hidrosanitario / Plomería']++;
      } else if (text.includes('chapa') || text.includes('puerta') || text.includes('llave') || text.includes('cerraj')) {
        specialties['Cerrajería y Puertas']++;
      } else if (text.includes('silla') || text.includes('mesa') || text.includes('pint') || text.includes('mueble') || text.includes('vidrio') || text.includes('pared')) {
        specialties['Mobiliario y Pintura']++;
      } else if (text.includes('aire') || text.includes('clima') || text.includes('ventilador') || text.includes('temperat')) {
        specialties['Climatización y Ventilación']++;
      } else {
        specialties['Infraestructura General']++;
      }
    });

    const sortedSpecialties = Object.keys(specialties)
      .map(k => ({ name: k, count: specialties[k] }))
      .sort((a, b) => b.count - a.count);

    // Ubicaciones más frecuentes (excluyendo rechazadas)
    const locations = validMaintenance.reduce((acc: any, cur) => {
      const locName = cur.metadata?.location || 'General';
      acc[locName] = (acc[locName] || 0) + 1;
      return acc;
    }, {});

    const sortedLocations = Object.keys(locations)
      .map(k => ({ name: k, count: locations[k] }))
      .sort((a, b) => b.count - a.count);

    const effectivenessRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const highCount = maintenanceRequests.filter(d => isHighPriority(d.priority)).length;
    const medCount = maintenanceRequests.filter(d => isMediumPriority(d.priority)).length;
    const lowCount = maintenanceRequests.filter(d => isLowPriority(d.priority)).length;

    return {
      total,
      pending,
      inProgress,
      resolved,
      rejected,
      highPriorityPending,
      effectivenessRate,
      highCount,
      medCount,
      lowCount,
      specialties: sortedSpecialties,
      locations: sortedLocations,
      recentList: dbData.filter(d => d.category === 'maintenance').slice(0, 8)
    };
  }, [dbData]);

  // Módulo de Visitantes Específico
  const visitorStats = useMemo(() => {
    const visitorRequests = dbData.filter(d => d.category === 'visitors' && !isRejectedStatus(d.status));
    let totalVisitors = 0;
    let vehicularEntries = 0;
    let pedestrianEntries = 0;

    const depVisits: any = {};

    visitorRequests.forEach(req => {
      const vCount = req.metadata?.visitors?.length || 1;
      totalVisitors += vCount;

      if (req.metadata?.hasVehicle) {
        vehicularEntries += req.metadata.vehicles?.length || 1;
      } else {
        pedestrianEntries += vCount;
      }
      const depName = req.metadata?.responsible?.dependency || req.profiles?.dependency?.name || 'Dirección General';
      depVisits[depName] = (depVisits[depName] || 0) + vCount;
    });

    const sortedDeps = Object.keys(depVisits)
      .map(k => ({ name: k, count: depVisits[k] }))
      .sort((a, b) => b.count - a.count);

    const avgVisitorsPerRequest = visitorRequests.length > 0 ? (totalVisitors / visitorRequests.length).toFixed(1) : '1.0';

    return {
      totalRequests: visitorRequests.length,
      totalVisitors,
      vehicularEntries,
      pedestrianEntries,
      avgVisitorsPerRequest,
      departments: sortedDeps,
      recentList: dbData.filter(d => d.category === 'visitors').slice(0, 8)
    };
  }, [dbData]);

  // Módulo de Salas Específico
  const roomStats = useMemo(() => {
    const roomRequests = dbData.filter(d => d.category === 'rooms' && !isRejectedStatus(d.status));
    
    // Contar uso por sala
    const roomUsage: any = {};
    let totalAttendees = 0;
    let coffeeServices = 0;
    let projectorServices = 0;
    let laptopServices = 0;
    let morningSlots = 0;
    let afternoonSlots = 0;

    roomRequests.forEach(req => {
      const roomName = req.metadata?.room?.name || 'Sala Principal';
      roomUsage[roomName] = (roomUsage[roomName] || 0) + 1;
      
      const attCount = parseInt(req.metadata?.attendees || '0', 10);
      totalAttendees += isNaN(attCount) ? 0 : attCount;

      if (req.metadata?.services?.coffee) coffeeServices++;
      if (req.metadata?.services?.projector) projectorServices++;
      if (req.metadata?.services?.laptop) laptopServices++;

      const timeStr = req.metadata?.startTime || req.metadata?.time || '';
      const hour = parseInt(timeStr.split(':')[0] || '10', 10);
      if (hour < 13) morningSlots++;
      else afternoonSlots++;
    });

    const sortedRooms = Object.keys(roomUsage)
      .map(k => ({ name: k, count: roomUsage[k] }))
      .sort((a, b) => b.count - a.count);

    const averageAttendees = roomRequests.length > 0 ? Math.round(totalAttendees / roomRequests.length) : 0;

    return {
      totalReservations: roomRequests.length,
      averageAttendees,
      totalAttendees,
      morningSlots,
      afternoonSlots,
      roomsList: sortedRooms,
      services: {
        coffee: roomRequests.length > 0 ? Math.round((coffeeServices / roomRequests.length) * 100) : 0,
        projector: roomRequests.length > 0 ? Math.round((projectorServices / roomRequests.length) * 100) : 0,
        laptop: roomRequests.length > 0 ? Math.round((laptopServices / roomRequests.length) * 100) : 0
      },
      recentList: dbData.filter(d => d.category === 'rooms').slice(0, 8)
    };
  }, [dbData]);

  // Módulo de Parqueadero Específico con Control Integral de Celdas y Vehículos
  const parkingStats = useMemo(() => {
    const parkingRequests = dbData.filter(d => d.category === 'parking');
    const validParking = parkingRequests.filter(d => !isRejectedStatus(d.status));
    const total = validParking.length;
    const approved = parkingRequests.filter(d => d.status === 'resuelto').length;
    const pending = parkingRequests.filter(d => d.status === 'pendiente').length;

    let cars = 0;
    let motos = 0;
    let bikes = 0;

    validParking.forEach(req => {
      const vType = (req.metadata?.vehicleType || req.title || '').toLowerCase();
      if (vType.includes('moto')) motos++;
      else if (vType.includes('bici') || vType.includes('cicla')) bikes++;
      else cars++;
    });

    const plates = validParking.map(r => r.metadata?.plate).filter(Boolean);

    // Resumen de Celdas
    const totalSpots = parkingSpots.length;
    const availableSpots = parkingSpots.filter(s => s.status === 'disponible').length;
    const occupiedSpots = parkingSpots.filter(s => s.status === 'ocupada').length;
    const assignedSpots = parkingSpots.filter(s => s.assigned_user_id || s.assigned_user_name || s.status === 'ocupada').length;
    const freeSpots = parkingSpots.filter(s => s.spot_type === 'libre').length;
    const fixedSpots = parkingSpots.filter(s => s.spot_type === 'fija').length;
    const maintenanceSpots = parkingSpots.filter(s => s.status === 'mantenimiento').length;
    const reservedSpots = parkingSpots.filter(s => s.status === 'reservada').length;
    const occupancyRate = totalSpots > 0 ? Math.round((assignedSpots / totalSpots) * 100) : Math.min(100, Math.round((approved / Math.max(1, total)) * 100));

    // Apartado 1: Vehículos con Celda Fija
    const fixedCellVehicles = reportVehicles.filter(v => 
      Boolean(v.spot_code) || v.spot_type === 'fija' || Boolean(v.assigned_spot_id)
    );

    // Apartado 2: Vehículos sin Celda Fija (Uso Libre / Rotativo)
    const knownFixedPlates = new Set(fixedCellVehicles.map(v => (v.plate || '').toUpperCase()));
    const knownFreeVehicles = reportVehicles.filter(v => 
      !v.spot_code && v.spot_type !== 'fija' && !v.assigned_spot_id
    );

    // Complementar con solicitudes aprobadas si su placa no estaba registrada en la tabla de vehículos
    const allReportPlates = new Set(reportVehicles.map(v => (v.plate || '').toUpperCase()));
    const synthFreeVehicles: UserVehicle[] = [];
    validParking.forEach(req => {
      const reqPlate = (req.metadata?.plate || '').trim().toUpperCase();
      if (reqPlate && !allReportPlates.has(reqPlate) && !knownFixedPlates.has(reqPlate)) {
        allReportPlates.add(reqPlate);
        synthFreeVehicles.push({
          id: req.id,
          plate: reqPlate,
          brand: req.metadata?.brand || 'Vehículo institucional',
          model: req.metadata?.model || '',
          color: req.metadata?.color || '',
          name: req.metadata?.name || req.profiles?.full_name || req.user_name || 'Servidor',
          doc: req.metadata?.doc || req.metadata?.identification || req.profiles?.doc || '',
          dependency: req.metadata?.dependency || req.profiles?.dependency?.name || req.profiles?.dependency || 'Secretaría Jurídica Distrital',
          is_active: req.status === 'resuelto',
          spot_type: 'libre'
        });
      }
    });

    const freeUseVehicles = [...knownFreeVehicles, ...synthFreeVehicles];

    // Desglose por tipo de vehículo (Carro / Moto)
    const carSpots = parkingSpots.filter(s => getSpotVehicleType(s) === 'carro').length;
    const motoSpots = parkingSpots.filter(s => getSpotVehicleType(s) === 'moto').length;
    const mixedSpots = parkingSpots.filter(s => getSpotVehicleType(s) === 'mixto').length;

    const fixedCars = fixedCellVehicles.filter(v => getVehicleType(v) === 'carro').length;
    const fixedMotos = fixedCellVehicles.filter(v => getVehicleType(v) === 'moto').length;

    const freeCars = freeUseVehicles.filter(v => getVehicleType(v) === 'carro').length;
    const freeMotos = freeUseVehicles.filter(v => getVehicleType(v) === 'moto').length;

    return {
      total,
      approved,
      pending,
      cars,
      motos,
      bikes,
      occupancyRate,
      plates: plates.slice(0, 8),
      recentList: dbData.filter(d => d.category === 'parking').slice(0, 8),
      totalSpots,
      availableSpots,
      occupiedSpots,
      assignedSpots,
      freeSpots,
      fixedSpots,
      maintenanceSpots,
      reservedSpots,
      carSpots,
      motoSpots,
      mixedSpots,
      fixedCars,
      fixedMotos,
      freeCars,
      freeMotos,
      fixedCellVehicles,
      freeUseVehicles
    };
  }, [dbData, parkingSpots, reportVehicles]);

  // Función de ordenamiento de vehículos (por Placa, Titular o Celda)
  const sortVehiclesList = useCallback((list: UserVehicle[]) => {
    return [...list].sort((a, b) => {
      let comparison = 0;
      if (parkingSortBy === 'plate') {
        comparison = (a.plate || '').localeCompare(b.plate || '');
      } else if (parkingSortBy === 'name') {
        comparison = (a.name || a.owner_name || '').localeCompare(b.name || b.owner_name || '');
      } else if (parkingSortBy === 'spot') {
        comparison = (a.spot_code || '').localeCompare(b.spot_code || '', undefined, { numeric: true });
      }
      return parkingSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [parkingSortBy, parkingSortOrder]);

  // Celdas procesadas con filtros (fija/variable, carro/moto, búsqueda)
  const filteredReportSpots = useMemo(() => {
    return parkingSpots.filter(spot => {
      // Filtro fija / libre (variable)
      if (parkingCellTypeFilter !== 'all' && spot.spot_type !== parkingCellTypeFilter) {
        return false;
      }
      // Filtro carro / moto
      if (parkingVehicleTypeFilter !== 'all') {
        const sType = getSpotVehicleType(spot);
        if (sType !== parkingVehicleTypeFilter && sType !== 'mixto') return false;
      }
      // Búsqueda
      if (parkingSearch.trim()) {
        const q = parkingSearch.trim().toLowerCase();
        const matchCode = spot.code.toLowerCase().includes(q);
        const matchUser = (spot.assigned_user_name || '').toLowerCase().includes(q);
        const matchNotes = (spot.notes || '').toLowerCase().includes(q);
        if (!matchCode && !matchUser && !matchNotes) return false;
      }
      return true;
    }).sort((a, b) => {
      return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true });
    });
  }, [parkingSpots, parkingCellTypeFilter, parkingVehicleTypeFilter, parkingSearch]);

  // Vehículos con celda fija filtrados y ordenados
  const filteredReportFixedVehicles = useMemo(() => {
    const list = (parkingStats.fixedCellVehicles || []).filter(v => {
      // Filtro carro / moto
      if (parkingVehicleTypeFilter !== 'all') {
        if (getVehicleType(v) !== parkingVehicleTypeFilter) return false;
      }
      // Búsqueda por placa, titular, cédula
      if (parkingSearch.trim()) {
        const q = parkingSearch.trim().toLowerCase();
        const matchPlate = (v.plate || '').toLowerCase().includes(q);
        const matchName = (v.name || v.owner_name || '').toLowerCase().includes(q);
        const matchDoc = (v.doc || '').toLowerCase().includes(q);
        const matchSpot = (v.spot_code || '').toLowerCase().includes(q);
        const matchBrand = (v.brand || '').toLowerCase().includes(q);
        if (!matchPlate && !matchName && !matchDoc && !matchSpot && !matchBrand) return false;
      }
      return true;
    });
    return sortVehiclesList(list);
  }, [parkingStats.fixedCellVehicles, parkingVehicleTypeFilter, parkingSearch, sortVehiclesList]);

  // Vehículos de uso libre (variables) filtrados y ordenados
  const filteredReportFreeVehicles = useMemo(() => {
    const list = (parkingStats.freeUseVehicles || []).filter(v => {
      // Filtro carro / moto
      if (parkingVehicleTypeFilter !== 'all') {
        if (getVehicleType(v) !== parkingVehicleTypeFilter) return false;
      }
      // Búsqueda por placa, titular, cédula
      if (parkingSearch.trim()) {
        const q = parkingSearch.trim().toLowerCase();
        const matchPlate = (v.plate || '').toLowerCase().includes(q);
        const matchName = (v.name || v.owner_name || '').toLowerCase().includes(q);
        const matchDoc = (v.doc || '').toLowerCase().includes(q);
        const matchBrand = (v.brand || '').toLowerCase().includes(q);
        if (!matchPlate && !matchName && !matchDoc && !matchBrand) return false;
      }
      return true;
    });
    return sortVehiclesList(list);
  }, [parkingStats.freeUseVehicles, parkingVehicleTypeFilter, parkingSearch, sortVehiclesList]);

  // Módulo de Transporte Específico
  const transportStats = useMemo(() => {
    const transportRequests = dbData.filter(d => d.category === 'transport' && !isRejectedStatus(d.status));
    let totalPassengers = 0;
    let judicialTrips = 0;
    let executiveTrips = 0;
    let adminTrips = 0;
    const routes: any = {};

    transportRequests.forEach(req => {
      const pass = parseInt(req.metadata?.passengers || '1', 10);
      totalPassengers += isNaN(pass) ? 1 : pass;

      const routeName = `${req.metadata?.origin || 'Sede'} - ${req.metadata?.destination || 'Destino'}`;
      routes[routeName] = (routes[routeName] || 0) + 1;

      const text = `${req.title || ''} ${req.metadata?.destination || ''}`.toLowerCase();
      if (text.includes('juzgado') || text.includes('tribunal') || text.includes('fiscalia') || text.includes('notifica')) {
        judicialTrips++;
      } else if (text.includes('alcaldia') || text.includes('secretar') || text.includes('directiv') || text.includes('despacho')) {
        executiveTrips++;
      } else {
        adminTrips++;
      }
    });

    const sortedRoutes = Object.keys(routes)
      .map(k => ({ name: k, count: routes[k] }))
      .sort((a, b) => b.count - a.count);

    const avgPassengers = transportRequests.length > 0 ? (totalPassengers / transportRequests.length).toFixed(1) : '1.0';

    return {
      totalRequests: transportRequests.length,
      totalPassengers,
      avgPassengers,
      judicialTrips,
      executiveTrips,
      adminTrips,
      routes: sortedRoutes,
      recentList: dbData.filter(d => d.category === 'transport').slice(0, 8)
    };
  }, [dbData]);

  // Simulación de descarga del PDF membretado oficial
  const handleGenerateReport = async (targetTab?: any) => {
    await loadAnalyticsData();
    let tabToUse = typeof targetTab === 'string' ? targetTab : activeTab;
    if (tabToUse === 'parking') {
      if (parkingFilterType === 'spots') tabToUse = 'parking_spots';
      else if (parkingFilterType === 'fixed' || parkingFilterType === 'free') tabToUse = 'parking_access';
      else tabToUse = 'parking_spots';
    }
    setReportTab(tabToUse as any);
    setShowDocModal(true);
    triggerPdfGeneration();
  };

  const handleExportExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    const periodLabel = reportPeriodLabel || 'Periodo';
    const emissionDate = new Date().toLocaleDateString('es-CO');

    // 1. HOJA 1: Reporte General de Solicitudes Administrativas
    const exportRows = dbData.map(row => {
      const cat = (row.category || '').toLowerCase();
      const isEvalCat = isEvalActive(cat);
      const isParking = cat === 'parking';

      const dep = row.metadata?.dependency || row.metadata?.responsible?.dependency || row.profiles?.dependency?.name || row.user_dependency || 'Secretaría Jurídica Distrital';
      const sol = row.metadata?.name || row.profiles?.full_name || row.user_name || 'Servidor';

      const serviceMap: Record<string, string> = {
        visitors: 'Control de Acceso / Visitantes',
        maintenance: 'Mantenimiento Locativo',
        parking: 'Acceso Parqueadero',
        rooms: 'Salas de Juntas',
        transport: 'Movilidad Institucional'
      };

      const base: any = {
        id: row.id ? String(row.id).slice(0, 8).toUpperCase() : '',
        fecha: row.created_at ? new Date(row.created_at).toLocaleDateString('es-CO') : '',
        servicio: serviceMap[cat] || row.category || 'General',
        titulo: row.title || '',
        estado: (row.status || '').toUpperCase(),
        prioridad: (row.priority || '').toUpperCase(),
        solicitante: sol,
        dependencia: dep,
        calificacion: isEvalCat && row.metadata?.evaluation?.rating != null ? `${row.metadata.evaluation.rating} / 5` : 'Sin calificar',
        comentario_evaluacion: isEvalCat ? (row.metadata?.evaluation?.comment || '—') : '—',
        descripcion: row.description || ''
      };

      if (isParking) {
        base.placa = row.metadata?.plate || '';
      }

      return base;
    });

    const generalSheet = createStyledSheet({
      sheetName: 'Reporte General',
      title: 'ALCALDÍA MAYOR DE BOGOTÁ D.C. — SECRETARÍA JURÍDICA DISTRITAL',
      subtitle: 'SISTEMA SASGE — REPORTE GENERAL DE GESTIÓN OPERATIVA Y SERVICIOS',
      metaInfo: `Periodo: ${periodLabel} | Fecha de Emisión: ${emissionDate} | Total de Solicitudes: ${exportRows.length}`,
      columns: [
        { header: 'RADICADO', key: 'id', width: 14, align: 'center' },
        { header: 'FECHA', key: 'fecha', width: 13, align: 'center' },
        { header: 'MÓDULO / SERVICIO', key: 'servicio', width: 26 },
        { header: 'ASUNTO / TÍTULO', key: 'titulo', width: 34 },
        { header: 'ESTADO', key: 'estado', width: 16, align: 'center', isStatus: true },
        { header: 'PRIORIDAD', key: 'prioridad', width: 14, align: 'center' },
        { header: 'PERSONA SOLICITANTE', key: 'solicitante', width: 26 },
        { header: 'DEPENDENCIA', key: 'dependencia', width: 30 },
        { header: 'CALIFICACIÓN', key: 'calificacion', width: 15, align: 'center' },
        { header: 'RETROALIMENTACIÓN CSAT', key: 'comentario_evaluacion', width: 32 },
        { header: 'DETALLE / OBSERVACIONES', key: 'descripcion', width: 40 }
      ],
      data: exportRows
    });
    XLSX.utils.book_append_sheet(workbook, generalSheet, 'Reporte General');

    // 2. HOJA 2: CARROS AUTORIZADOS (Dividido claramente de motos)
    const fixedCars = (parkingStats.fixedCellVehicles || []).filter(v => getVehicleType(v) !== 'moto');
    const freeCars = (parkingStats.freeUseVehicles || []).filter(v => getVehicleType(v) !== 'moto');

    const allCars = [
      ...fixedCars.map(v => ({ ...v, _modalidad: 'Celda Fija', _celdaAsignada: v.spot_code ? `Celda ${v.spot_code}` : 'Celda Fija' })),
      ...freeCars.map(v => ({ ...v, _modalidad: 'Uso Libre Rotativo', _celdaAsignada: 'Rotativo / Libre' }))
    ].sort((a, b) => (a.plate || '').localeCompare(b.plate || ''));

    const carDataRows = allCars.map(v => ({
      placa: v.plate || '',
      modalidad: v._modalidad,
      celda: v._celdaAsignada,
      titular: v.name || v.owner_name || 'Servidor institucional',
      documento: v.doc || 'S/N',
      vehiculo: `${v.brand || ''} ${v.model || ''}`.trim() || 'Automóvil',
      color: v.color || 'No especificado',
      estado: v.is_active !== false ? 'ACTIVO' : 'INACTIVO',
      autorizacion: v.is_active !== false ? 'Autorizado para Ingreso' : 'Suspendido / Inactivo',
      dependencia: v.dependency || 'Secretaría Jurídica Distrital'
    }));

    const carsSheet = createStyledSheet({
      sheetName: 'Carros Autorizados',
      title: 'ALCALDÍA MAYOR DE BOGOTÁ D.C. — SECRETARÍA JURÍDICA DISTRITAL',
      subtitle: 'CONTROL DE ACCESO A PARQUEADERO — VEHÍCULOS DE CUATRO RUEDAS (CARROS)',
      metaInfo: `Periodo: ${periodLabel} | Fecha de Emisión: ${emissionDate} | Total Carros Autorizados: ${carDataRows.length} (${fixedCars.length} fijas, ${freeCars.length} uso libre)`,
      columns: [
        { header: 'PLACA', key: 'placa', width: 14, align: 'center', isPlate: true },
        { header: 'MODALIDAD', key: 'modalidad', width: 22, align: 'center', isStatus: true },
        { header: 'CELDA ASIGNADA', key: 'celda', width: 18, align: 'center' },
        { header: 'PERSONA TITULAR', key: 'titular', width: 28 },
        { header: 'IDENTIFICACIÓN', key: 'documento', width: 16, align: 'center' },
        { header: 'VEHÍCULO / MODELO', key: 'vehiculo', width: 24 },
        { header: 'COLOR', key: 'color', width: 15, align: 'center' },
        { header: 'ESTADO', key: 'estado', width: 14, align: 'center', isStatus: true },
        { header: 'ESTADO DE ACCESO', key: 'autorizacion', width: 24 },
        { header: 'DEPENDENCIA', key: 'dependencia', width: 30 }
      ],
      data: carDataRows
    });
    XLSX.utils.book_append_sheet(workbook, carsSheet, 'Carros Autorizados');

    // 3. HOJA 3: MOTOS AUTORIZADAS (Dividido claramente de carros)
    const fixedMotos = (parkingStats.fixedCellVehicles || []).filter(v => getVehicleType(v) === 'moto');
    const freeMotos = (parkingStats.freeUseVehicles || []).filter(v => getVehicleType(v) === 'moto');

    const allMotos = [
      ...fixedMotos.map(v => ({ ...v, _modalidad: 'Cupo Fijo Asignado', _celdaAsignada: v.spot_code ? `Celda ${v.spot_code}` : 'Cupo Fijo' })),
      ...freeMotos.map(v => ({ ...v, _modalidad: 'Uso Libre Rotativo', _celdaAsignada: 'Rotativo / Libre' }))
    ].sort((a, b) => (a.plate || '').localeCompare(b.plate || ''));

    const motoDataRows = allMotos.map(v => ({
      placa: v.plate || '',
      modalidad: v._modalidad,
      celda: v._celdaAsignada,
      titular: v.name || v.owner_name || 'Servidor institucional',
      documento: v.doc || 'S/N',
      vehiculo: `${v.brand || ''} ${v.model || ''}`.trim() || 'Motocicleta',
      color: v.color || 'No especificado',
      estado: v.is_active !== false ? 'ACTIVO' : 'INACTIVO',
      autorizacion: v.is_active !== false ? 'Autorizado para Ingreso' : 'Suspendido / Inactivo',
      dependencia: v.dependency || 'Secretaría Jurídica Distrital'
    }));

    const motosSheet = createStyledSheet({
      sheetName: 'Motos Autorizadas',
      title: 'ALCALDÍA MAYOR DE BOGOTÁ D.C. — SECRETARÍA JURÍDICA DISTRITAL',
      subtitle: 'CONTROL DE ACCESO A PARQUEADERO — MOTOCICLETAS (MOTOS)',
      metaInfo: `Periodo: ${periodLabel} | Fecha de Emisión: ${emissionDate} | Total Motos Autorizadas: ${motoDataRows.length} (${fixedMotos.length} cupos fijos, ${freeMotos.length} uso libre)`,
      columns: [
        { header: 'PLACA', key: 'placa', width: 14, align: 'center', isPlate: true },
        { header: 'MODALIDAD', key: 'modalidad', width: 22, align: 'center', isStatus: true },
        { header: 'CUPO / CELDA', key: 'celda', width: 18, align: 'center' },
        { header: 'PERSONA TITULAR', key: 'titular', width: 28 },
        { header: 'IDENTIFICACIÓN', key: 'documento', width: 16, align: 'center' },
        { header: 'MOTOCICLETA / LÍNEA', key: 'vehiculo', width: 24 },
        { header: 'COLOR', key: 'color', width: 15, align: 'center' },
        { header: 'ESTADO', key: 'estado', width: 14, align: 'center', isStatus: true },
        { header: 'ESTADO DE ACCESO', key: 'autorizacion', width: 24 },
        { header: 'DEPENDENCIA', key: 'dependencia', width: 30 }
      ],
      data: motoDataRows
    });
    XLSX.utils.book_append_sheet(workbook, motosSheet, 'Motos Autorizadas');

    // 4. HOJA 4: INVENTARIO FÍSICO DE CELDAS DE PARQUEADERO
    if (parkingSpots.length > 0) {
      const sortedSpots = [...parkingSpots].sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));
      const spotRows = sortedSpots.map(s => {
        const sType = getSpotVehicleType(s);
        return {
          codigo: s.code,
          modalidad: s.spot_type === 'fija' ? 'Celda Fija' : 'Uso Libre Rotativo',
          tipo: sType === 'moto' ? 'Moto' : sType === 'mixto' ? 'Mixto (Carro / Moto)' : 'Carro',
          estado: (s.status || 'DISPONIBLE').toUpperCase(),
          titular: s.assigned_user_name || 'Sin asignar / Disponible',
          observaciones: s.notes || '—'
        };
      });

      const spotsSheet = createStyledSheet({
        sheetName: 'Inventario Celdas',
        title: 'ALCALDÍA MAYOR DE BOGOTÁ D.C. — SECRETARÍA JURÍDICA DISTRITAL',
        subtitle: 'INVENTARIO Y CAPACIDAD FÍSICA DE CELDAS DE PARQUEADERO',
        metaInfo: `Capacidad: ${parkingStats.totalSpots} Celdas (${parkingStats.carSpots} Carros, ${parkingStats.motoSpots} Motos) | Disponibles: ${parkingStats.availableSpots} | Ocupación: ${parkingStats.occupancyRate}%`,
        columns: [
          { header: 'CÓDIGO CELDA', key: 'codigo', width: 16, align: 'center' },
          { header: 'MODALIDAD', key: 'modalidad', width: 22, align: 'center', isStatus: true },
          { header: 'TIPO ADMITIDO', key: 'tipo', width: 22, align: 'center' },
          { header: 'ESTADO ACTUAL', key: 'estado', width: 16, align: 'center', isStatus: true },
          { header: 'TITULAR ASIGNADO', key: 'titular', width: 28 },
          { header: 'UBICACIÓN / NOTAS', key: 'observaciones', width: 34 }
        ],
        data: spotRows
      });
      XLSX.utils.book_append_sheet(workbook, spotsSheet, 'Inventario Celdas');
    }

    // 5. HOJA 5: SOLICITUDES DE PARQUEADERO DEL PERIODO
    const parkingRequests = dbData.filter(d => (d.category || '').toLowerCase() === 'parking');
    if (parkingRequests.length > 0) {
      const reqRows = parkingRequests.map(r => ({
        fecha: r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : '',
        placa: r.metadata?.plate || 'S/P',
        tipo: r.metadata?.vehicleType || (r.metadata?.plate?.length === 5 ? 'Moto' : 'Carro'),
        vehiculo: [r.metadata?.brand, r.metadata?.model].filter(Boolean).join(' ') || r.title || 'Vehículo',
        solicitante: r.metadata?.name || r.profiles?.full_name || r.user_name || 'Servidor',
        dependencia: r.metadata?.dependency || r.profiles?.dependency?.name || r.user_dependency || 'Secretaría Jurídica Distrital',
        estado: (r.status || '').toUpperCase(),
        calificacion: r.metadata?.evaluation?.rating != null ? `${r.metadata.evaluation.rating} / 5` : 'Sin calificar'
      }));

      const reqSheet = createStyledSheet({
        sheetName: 'Solicitudes Parqueadero',
        title: 'ALCALDÍA MAYOR DE BOGOTÁ D.C. — SECRETARÍA JURÍDICA DISTRITAL',
        subtitle: 'HISTORIAL DE SOLICITUDES DE ASIGNACIÓN DE PARQUEADERO',
        metaInfo: `Periodo: ${periodLabel} | Total Solicitudes: ${reqRows.length}`,
        columns: [
          { header: 'FECHA RADICACIÓN', key: 'fecha', width: 18, align: 'center' },
          { header: 'PLACA', key: 'placa', width: 14, align: 'center', isPlate: true },
          { header: 'TIPO VEHÍCULO', key: 'tipo', width: 16, align: 'center' },
          { header: 'VEHÍCULO / MODELO', key: 'vehiculo', width: 26 },
          { header: 'SOLICITANTE', key: 'solicitante', width: 26 },
          { header: 'DEPENDENCIA', key: 'dependencia', width: 30 },
          { header: 'ESTADO TRÁMITE', key: 'estado', width: 16, align: 'center', isStatus: true },
          { header: 'CALIFICACIÓN', key: 'calificacion', width: 16, align: 'center' }
        ],
        data: reqRows
      });
      XLSX.utils.book_append_sheet(workbook, reqSheet, 'Solicitudes Parqueadero');
    }

    // Descarga con nombre profesional
    const cleanPeriod = (selectedMonth || 'periodo').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadWorkbook(workbook, `Reporte_Oficial_SASGE_${cleanPeriod}.xlsx`);
  }, [dbData, selectedMonth, reportPeriodLabel, parkingSpots, parkingStats]);

  // 1. REPORTE EXCEL EXCLUSIVO: Ocupación e Inventario Físico de Celdas (44 celdas)
  const handleExportParkingSpotsExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    const periodLabel = reportPeriodLabel || 'Periodo';
    const cleanPeriod = (selectedMonth || 'periodo').replace(/[^a-zA-Z0-9_-]/g, '_');
    
    const sortedSpots = [...parkingSpots].sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));
    const spotRows = sortedSpots.map(s => {
      const sType = getSpotVehicleType(s);
      return {
        codigo: s.code,
        modalidad: s.spot_type === 'fija' ? 'Celda Fija' : 'Uso Libre Rotativo',
        tipo: sType === 'moto' ? 'Moto' : sType === 'mixto' ? 'Mixto (Carro / Moto)' : 'Carro',
        estado: (s.status || 'DISPONIBLE').toUpperCase(),
        titular: s.assigned_user_name || 'Sin asignar / Disponible',
        observaciones: s.notes || '—'
      };
    });

    const spotsSheet = createStyledSheet({
      sheetName: 'Ocupación Celdas',
      title: 'ALCALDÍA MAYOR DE BOGOTÁ D.C. — SECRETARÍA JURÍDICA DISTRITAL',
      subtitle: 'REPORTE DE OCUPACIÓN E INVENTARIO FÍSICO DE CELDAS DE PARQUEADERO',
      metaInfo: `Capacidad Total: ${parkingStats.totalSpots} Celdas (${parkingStats.carSpots} Carros, ${parkingStats.motoSpots} Motos) | Disponibles: ${parkingStats.availableSpots} | Ocupadas / Asignadas: ${parkingStats.assignedSpots} | Ocupación: ${parkingStats.occupancyRate}% | Periodo: ${periodLabel}`,
      columns: [
        { header: 'CÓDIGO CELDA', key: 'codigo', width: 16, align: 'center' },
        { header: 'MODALIDAD', key: 'modalidad', width: 22, align: 'center', isStatus: true },
        { header: 'TIPO ADMITIDO', key: 'tipo', width: 22, align: 'center' },
        { header: 'ESTADO ACTUAL', key: 'estado', width: 16, align: 'center', isStatus: true },
        { header: 'TITULAR ASIGNADO', key: 'titular', width: 28 },
        { header: 'UBICACIÓN / NOTAS', key: 'observaciones', width: 34 }
      ],
      data: spotRows
    });
    XLSX.utils.book_append_sheet(workbook, spotsSheet, 'Ocupación Celdas');
    downloadWorkbook(workbook, `Reporte_1_Ocupacion_Celdas_SASGE_${cleanPeriod}.xlsx`);
  }, [parkingSpots, parkingStats, selectedMonth, reportPeriodLabel]);

  // 2. REPORTE EXCEL EXCLUSIVO: Control de Acceso — Automóviles (Carros) y Motocicletas (Motos)
  const handleExportParkingAccessExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    const periodLabel = reportPeriodLabel || 'Periodo';
    const emissionDate = new Date().toLocaleDateString('es-CO');
    const cleanPeriod = (selectedMonth || 'periodo').replace(/[^a-zA-Z0-9_-]/g, '_');

    // 2.1 Carros Autorizados (63 vehículos)
    const fixedCars = (parkingStats.fixedCellVehicles || []).filter(v => getVehicleType(v) !== 'moto');
    const freeCars = (parkingStats.freeUseVehicles || []).filter(v => getVehicleType(v) !== 'moto');
    const allCars = [
      ...fixedCars.map(v => ({ ...v, _modalidad: 'Celda Fija', _celdaAsignada: v.spot_code ? `Celda ${v.spot_code}` : 'Celda Fija' })),
      ...freeCars.map(v => ({ ...v, _modalidad: 'Uso Libre Rotativo', _celdaAsignada: 'Rotativo / Libre' }))
    ].sort((a, b) => (a.plate || '').localeCompare(b.plate || ''));

    const carDataRows = allCars.map(v => ({
      placa: v.plate || '',
      modalidad: v._modalidad,
      celda: v._celdaAsignada,
      titular: v.name || v.owner_name || 'Servidor institucional',
      documento: v.doc || 'S/N',
      vehiculo: `${v.brand || ''} ${v.model || ''}`.trim() || 'Automóvil',
      color: v.color || 'No especificado',
      estado: v.is_active !== false ? 'ACTIVO' : 'INACTIVO',
      autorizacion: v.is_active !== false ? 'Autorizado para Ingreso' : 'Suspendido / Inactivo',
      dependencia: v.dependency || 'Secretaría Jurídica Distrital'
    }));

    const carsSheet = createStyledSheet({
      sheetName: 'Carros Autorizados',
      title: 'ALCALDÍA MAYOR DE BOGOTÁ D.C. — SECRETARÍA JURÍDICA DISTRITAL',
      subtitle: 'CONTROL DE ACCESO A PARQUEADERO — AUTOMÓVILES (CARROS)',
      metaInfo: `Periodo: ${periodLabel} | Fecha: ${emissionDate} | Total Carros Autorizados: ${carDataRows.length} (${fixedCars.length} fijas, ${freeCars.length} uso libre)`,
      columns: [
        { header: 'PLACA', key: 'placa', width: 14, align: 'center', isPlate: true },
        { header: 'MODALIDAD', key: 'modalidad', width: 22, align: 'center', isStatus: true },
        { header: 'CELDA ASIGNADA', key: 'celda', width: 18, align: 'center' },
        { header: 'PERSONA TITULAR', key: 'titular', width: 28 },
        { header: 'IDENTIFICACIÓN', key: 'documento', width: 16, align: 'center' },
        { header: 'VEHÍCULO / MODELO', key: 'vehiculo', width: 24 },
        { header: 'COLOR', key: 'color', width: 15, align: 'center' },
        { header: 'ESTADO', key: 'estado', width: 14, align: 'center', isStatus: true },
        { header: 'ESTADO DE ACCESO', key: 'autorizacion', width: 24 },
        { header: 'DEPENDENCIA', key: 'dependencia', width: 30 }
      ],
      data: carDataRows
    });
    XLSX.utils.book_append_sheet(workbook, carsSheet, 'Carros Autorizados');

    // 2.2 Motos Autorizadas (25 motos)
    const fixedMotos = (parkingStats.fixedCellVehicles || []).filter(v => getVehicleType(v) === 'moto');
    const freeMotos = (parkingStats.freeUseVehicles || []).filter(v => getVehicleType(v) === 'moto');
    const allMotos = [
      ...fixedMotos.map(v => ({ ...v, _modalidad: 'Cupo Fijo Asignado', _celdaAsignada: v.spot_code ? `Celda ${v.spot_code}` : 'Cupo Fijo' })),
      ...freeMotos.map(v => ({ ...v, _modalidad: 'Uso Libre Rotativo', _celdaAsignada: 'Rotativo / Libre' }))
    ].sort((a, b) => (a.plate || '').localeCompare(b.plate || ''));

    const motoDataRows = allMotos.map(v => ({
      placa: v.plate || '',
      modalidad: v._modalidad,
      celda: v._celdaAsignada,
      titular: v.name || v.owner_name || 'Servidor institucional',
      documento: v.doc || 'S/N',
      vehiculo: `${v.brand || ''} ${v.model || ''}`.trim() || 'Motocicleta',
      color: v.color || 'No especificado',
      estado: v.is_active !== false ? 'ACTIVO' : 'INACTIVO',
      autorizacion: v.is_active !== false ? 'Autorizado para Ingreso' : 'Suspendido / Inactivo',
      dependencia: v.dependency || 'Secretaría Jurídica Distrital'
    }));

    const motosSheet = createStyledSheet({
      sheetName: 'Motos Autorizadas',
      title: 'ALCALDÍA MAYOR DE BOGOTÁ D.C. — SECRETARÍA JURÍDICA DISTRITAL',
      subtitle: 'CONTROL DE ACCESO A PARQUEADERO — MOTOCICLETAS (MOTOS)',
      metaInfo: `Periodo: ${periodLabel} | Fecha: ${emissionDate} | Total Motos Autorizadas: ${motoDataRows.length} (${fixedMotos.length} cupos fijos, ${freeMotos.length} uso libre)`,
      columns: [
        { header: 'PLACA', key: 'placa', width: 14, align: 'center', isPlate: true },
        { header: 'MODALIDAD', key: 'modalidad', width: 22, align: 'center', isStatus: true },
        { header: 'CUPO / CELDA', key: 'celda', width: 18, align: 'center' },
        { header: 'PERSONA TITULAR', key: 'titular', width: 28 },
        { header: 'IDENTIFICACIÓN', key: 'documento', width: 16, align: 'center' },
        { header: 'MOTOCICLETA / LÍNEA', key: 'vehiculo', width: 24 },
        { header: 'COLOR', key: 'color', width: 15, align: 'center' },
        { header: 'ESTADO', key: 'estado', width: 14, align: 'center', isStatus: true },
        { header: 'ESTADO DE ACCESO', key: 'autorizacion', width: 24 },
        { header: 'DEPENDENCIA', key: 'dependencia', width: 30 }
      ],
      data: motoDataRows
    });
    XLSX.utils.book_append_sheet(workbook, motosSheet, 'Motos Autorizadas');

    downloadWorkbook(workbook, `Reporte_2_Control_Acceso_Vehicular_SASGE_${cleanPeriod}.xlsx`);
  }, [parkingStats, selectedMonth, reportPeriodLabel]);

  // 3. REPORTE EXCEL EXCLUSIVO: Solicitudes de Parqueadero del Periodo
  const handleExportParkingRequestsExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    const periodLabel = reportPeriodLabel || 'Periodo';
    const cleanPeriod = (selectedMonth || 'periodo').replace(/[^a-zA-Z0-9_-]/g, '_');

    const parkingRequests = dbData.filter(d => (d.category || '').toLowerCase() === 'parking');
    const reqRows = parkingRequests.map(r => ({
      radicado: r.id ? String(r.id).slice(0, 8).toUpperCase() : '',
      fecha: r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : '',
      placa: r.metadata?.plate || 'S/P',
      tipo: r.metadata?.vehicleType || (r.metadata?.plate?.length === 5 ? 'Moto' : 'Carro'),
      vehiculo: [r.metadata?.brand, r.metadata?.model].filter(Boolean).join(' ') || r.title || 'Vehículo',
      solicitante: r.metadata?.name || r.profiles?.full_name || r.user_name || 'Servidor',
      dependencia: r.metadata?.dependency || r.profiles?.dependency?.name || r.user_dependency || 'Secretaría Jurídica Distrital',
      estado: (r.status || '').toUpperCase(),
      calificacion: r.metadata?.evaluation?.rating != null ? `${r.metadata.evaluation.rating} / 5` : 'Sin calificar'
    }));

    const reqSheet = createStyledSheet({
      sheetName: 'Solicitudes Parqueadero',
      title: 'ALCALDÍA MAYOR DE BOGOTÁ D.C. — SECRETARÍA JURÍDICA DISTRITAL',
      subtitle: 'HISTORIAL DE SOLICITUDES DE ASIGNACIÓN DE PARQUEADERO',
      metaInfo: `Periodo: ${periodLabel} | Total Solicitudes: ${reqRows.length}`,
      columns: [
        { header: 'RADICADO', key: 'radicado', width: 14, align: 'center' },
        { header: 'FECHA RADICACIÓN', key: 'fecha', width: 18, align: 'center' },
        { header: 'PLACA', key: 'placa', width: 14, align: 'center', isPlate: true },
        { header: 'TIPO VEHÍCULO', key: 'tipo', width: 16, align: 'center' },
        { header: 'VEHÍCULO / MODELO', key: 'vehiculo', width: 26 },
        { header: 'SOLICITANTE', key: 'solicitante', width: 26 },
        { header: 'DEPENDENCIA', key: 'dependencia', width: 30 },
        { header: 'ESTADO TRÁMITE', key: 'estado', width: 16, align: 'center', isStatus: true },
        { header: 'CALIFICACIÓN', key: 'calificacion', width: 16, align: 'center' }
      ],
      data: reqRows
    });
    XLSX.utils.book_append_sheet(workbook, reqSheet, 'Solicitudes Parqueadero');
    downloadWorkbook(workbook, `Reporte_3_Solicitudes_Parqueadero_SASGE_${cleanPeriod}.xlsx`);
  }, [dbData, selectedMonth, reportPeriodLabel]);

  // Exportador contextual para el modal interactivo
  const handleExportCurrentModalExcel = useCallback(() => {
    if (reportTab === 'parking_spots' || reportTab === 'parking') {
      handleExportParkingSpotsExcel();
    } else if (reportTab === 'parking_access') {
      handleExportParkingAccessExcel();
    } else if (reportTab === 'parking_requests') {
      handleExportParkingRequestsExcel();
    } else {
      handleExportExcel();
    }
  }, [reportTab, handleExportParkingSpotsExcel, handleExportParkingAccessExcel, handleExportParkingRequestsExcel, handleExportExcel]);

  const triggerPdfGeneration = () => {
    setIsGeneratingPdf(true);
    setPdfProgress(0);
    
    const interval = setInterval(() => {
      setPdfProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsGeneratingPdf(false);
          }, 300);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const handlePrintReport = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank', 'width=1000,height=900');
      
      const reportConfigs: Record<string, { title: string; subtitle: string; code: string }> = {
        consolidated: {
          title: 'REPORTE CONSOLIDADO DE GESTIÓN OPERATIVA Y SERVICIOS ADMINISTRATIVOS',
          subtitle: 'Visión Integral de Todos los Módulos Operativos',
          code: 'SASGE-REP-01'
        },
        visitors: {
          title: 'REPORTE OFICIAL DE CONTROL DE ACCESO Y SEGURIDAD FÍSICA',
          subtitle: 'Módulo de Visitantes Externos y Accesos Vehiculares',
          code: 'SASGE-REP-02'
        },
        maintenance: {
          title: 'REPORTE TÉCNICO DE MANTENIMIENTO LOCATIVO E INFRAESTRUCTURA',
          subtitle: 'Módulo de Incidentes y Mantenimiento Técnico Preventivo/Correctivo',
          code: 'SASGE-REP-03'
        },
        parking: {
          title: 'REPORTE DE OCUPACIÓN DE CELDAS DE PARQUEADERO',
          subtitle: 'Inventario Físico y Ocupación de Celdas Institucionales (44 celdas)',
          code: 'SASGE-REP-04A'
        },
        parking_spots: {
          title: 'REPORTE DE OCUPACIÓN DE CELDAS DE PARQUEADERO',
          subtitle: 'Inventario Físico y Ocupación de Celdas Institucionales (44 celdas)',
          code: 'SASGE-REP-04A'
        },
        parking_access: {
          title: 'CONTROL DE ACCESO A PARQUEADERO — VEHÍCULOS AUTORIZADOS',
          subtitle: 'Padrón Oficial de Control de Acceso: Automóviles (63) y Motocicletas (25)',
          code: 'SASGE-REP-04B'
        },
        parking_requests: {
          title: 'REPORTE DE SOLICITUDES DE PARQUEADERO DEL PERIODO',
          subtitle: 'Historial de Solicitudes y Trámites de Acceso a Parqueadero',
          code: 'SASGE-REP-04C'
        },
        rooms: {
          title: 'REPORTE DE OCUPACIÓN Y DEMANDA DE SALAS DE JUNTAS',
          subtitle: 'Módulo de Espacios de Reunión y Servicios Auxiliares',
          code: 'SASGE-REP-05'
        },
        transport: {
          title: 'REPORTE DE MOVILIDAD INSTITUCIONAL Y COMISIONES DE TRANSPORTE',
          subtitle: 'Módulo de Desplazamientos Terrestres y Flota Oficial',
          code: 'SASGE-REP-06'
        },
        satisfaction: {
          title: 'REPORTE OFICIAL DE SATISFACCIÓN DE USUARIOS Y CALIDAD DEL SERVICIO (CSAT)',
          subtitle: 'Módulo de Percepción Institucional, Calificaciones y Retroalimentación Ciudadana',
          code: 'SASGE-REP-07'
        }
      };

      const currentConfig = reportConfigs[reportTab] || reportConfigs.consolidated;
      const todayStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

      let bodySections = '';

      if (reportTab === 'consolidated') {
        bodySections = `
          <div class="meta-box">
            <div class="meta-item"><strong>Periodo:</strong> ${reportPeriodLabel}</div>
            <div class="meta-item"><strong>Fecha Emisión:</strong> ${todayStr}</div>
            <div class="meta-item"><strong>Efectividad Global:</strong> ${stats.effectiveness}% (${stats.resolved} de ${stats.total} resueltos)</div>
            <div class="meta-item"><strong>Pendientes Totales:</strong> ${stats.pending} requerimientos</div>
          </div>
          <div class="section-title">1. Resumen Ejecutivo de Operaciones</div>
          <p>Durante el periodo evaluado (${reportPeriodLabel}), la entidad gestionó un total de <strong>${stats.total}</strong> solicitudes administrativas a través de SASGE. El índice global de efectividad alcanzó el <strong>${stats.effectiveness}%</strong>, con <strong>${stats.resolved}</strong> solicitudes resueltas satisfactoriamente, <strong>${stats.inProgress}</strong> en curso de atención técnica, <strong>${stats.pending}</strong> pendientes de asignación y <strong>${stats.rejected}</strong> rechazadas conforme a validaciones reglamentarias.</p>
          <table>
            <thead>
              <tr>
                <th>Módulo Operativo</th>
                <th class="text-center">Total</th>
                <th class="text-center">En Proceso</th>
                <th class="text-center">Resueltas</th>
                <th class="text-center">Efectividad</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Control de Acceso (Visitantes)</strong></td>
                <td class="text-center">${stats.catCounts.visitors}</td>
                <td class="text-center">${categoryBreakdown.visitors.inProgress}</td>
                <td class="text-center">${categoryBreakdown.visitors.resolved}</td>
                <td class="text-center">${stats.catCounts.visitors > 0 ? Math.round((categoryBreakdown.visitors.resolved / stats.catCounts.visitors) * 100) : 0}%</td>
              </tr>
              <tr>
                <td><strong>Mantenimiento Locativo</strong></td>
                <td class="text-center">${stats.catCounts.maintenance}</td>
                <td class="text-center">${categoryBreakdown.maintenance.inProgress}</td>
                <td class="text-center">${categoryBreakdown.maintenance.resolved}</td>
                <td class="text-center">${stats.catCounts.maintenance > 0 ? Math.round((categoryBreakdown.maintenance.resolved / stats.catCounts.maintenance) * 100) : 0}%</td>
              </tr>
              <tr>
                <td><strong>Cupo de Parqueadero</strong></td>
                <td class="text-center">${stats.catCounts.parking}</td>
                <td class="text-center">${categoryBreakdown.parking.inProgress}</td>
                <td class="text-center">${categoryBreakdown.parking.resolved}</td>
                <td class="text-center">${stats.catCounts.parking > 0 ? Math.round((categoryBreakdown.parking.resolved / stats.catCounts.parking) * 100) : 0}%</td>
              </tr>
              <tr>
                <td><strong>Reserva de Salas de Juntas</strong></td>
                <td class="text-center">${stats.catCounts.rooms}</td>
                <td class="text-center">${categoryBreakdown.rooms.inProgress}</td>
                <td class="text-center">${categoryBreakdown.rooms.resolved}</td>
                <td class="text-center">${stats.catCounts.rooms > 0 ? Math.round((categoryBreakdown.rooms.resolved / stats.catCounts.rooms) * 100) : 0}%</td>
              </tr>
              <tr>
                <td><strong>Transporte Oficial</strong></td>
                <td class="text-center">${stats.catCounts.transport}</td>
                <td class="text-center">${categoryBreakdown.transport.inProgress}</td>
                <td class="text-center">${categoryBreakdown.transport.resolved}</td>
                <td class="text-center">${stats.catCounts.transport > 0 ? Math.round((categoryBreakdown.transport.resolved / stats.catCounts.transport) * 100) : 0}%</td>
              </tr>
            </tbody>
          </table>
          <div class="section-title">2. Diagnóstico de Mantenimiento e Infraestructura</div>
          <p>Se registraron <strong>${maintenanceStats.total}</strong> incidencias técnicas locativas. ${maintenanceStats.highPriorityPending > 0 ? `<span style="color:#B91C1C;font-weight:700;">Atención requerida:</span> Existen <strong>${maintenanceStats.highPriorityPending}</strong> casos de prioridad ALTA pendientes de cierre.` : 'No se registran casos críticos pendientes en la infraestructura física de la sede.'}</p>
          <div class="section-title">3. Evaluación de Calidad y Satisfacción del Usuario (CSAT)</div>
          ${(() => {
            const evalModules = [
              { key: 'visitors', name: 'Control de Acceso (Visitantes)', eval: stats.moduleEvaluations.visitors },
              { key: 'maintenance', name: 'Mantenimiento Locativo', eval: stats.moduleEvaluations.maintenance },
              { key: 'parking', name: 'Cupo de Parqueadero', eval: stats.moduleEvaluations.parking },
              { key: 'rooms', name: 'Reserva de Salas de Juntas', eval: stats.moduleEvaluations.rooms },
              { key: 'transport', name: 'Transporte Oficial', eval: stats.moduleEvaluations.transport },
            ].filter(m => isEvalActive(m.key));

            if (evalModules.length === 0) {
              return '<p style="color:#64748B;font-style:italic;">Actualmente la evaluación de satisfacción no se encuentra habilitada para los servicios operativos.</p>';
            }

            return `
              <p>El índice de satisfacción promedio alcanzado en el periodo es de <strong>${stats.averageRating} / 5.0 estrellas</strong>, con un <strong>${stats.favorablePercent}%</strong> de calificaciones altamente favorables (4 y 5 estrellas) sobre un total de <strong>${stats.totalEvaluated}</strong> solicitudes evaluadas formalmente por los funcionarios.</p>
              <table>
                <thead>
                  <tr>
                    <th>Módulo Operativo</th>
                    <th class="text-center">Evaluaciones Recibidas</th>
                    <th class="text-center">Calificación Promedio</th>
                    <th class="text-center">Percepción de Calidad</th>
                  </tr>
                </thead>
                <tbody>
                  ${evalModules.map(m => `
                    <tr>
                      <td><strong>${m.name}</strong></td>
                      <td class="text-center">${m.eval.count}</td>
                      <td class="text-center">${m.eval.avg > 0 ? m.eval.avg + ' / 5.0' : 'Sin evaluar'}</td>
                      <td class="text-center">${m.eval.avg >= 4.0 ? 'Excelente' : m.eval.avg >= 3.0 ? 'Aceptable' : 'Por evaluar'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
          })()}
          <div class="section-title">4. Conclusiones y Recomendaciones de Gestión</div>
          <p>Se aconseja mantener la periodicidad de seguimiento a los reportes en curso, priorizando las solicitudes de mantenimiento técnico y el control vehicular de parqueaderos para conservar los estándares institucionales de la Secretaría Jurídica Distrital.</p>
        `;
      } else if (reportTab === 'visitors') {
        const visitorRows = dbData.filter(d => d.category === 'visitors');
        const showVisitorEval = isEvalActive('visitors');
        bodySections = `
          <div class="meta-box">
            <div class="meta-item"><strong>Periodo Evaluado:</strong> ${reportPeriodLabel}</div>
            <div class="meta-item"><strong>Fecha Emisión:</strong> ${todayStr}</div>
            <div class="meta-item"><strong>Total Visitantes Registrados:</strong> ${visitorStats.totalVisitors} personas</div>
            <div class="meta-item"><strong>Ingresos Vehiculares:</strong> ${visitorStats.vehicularEntries} vehículos</div>
          </div>
          <div class="section-title">1. Balance General de Seguridad Física y Accesos</div>
          <p>En el periodo analizado se formalizaron <strong>${visitorStats.totalRequests}</strong> solicitudes de autorización de acceso para un total de <strong>${visitorStats.totalVisitors}</strong> ciudadanos y servidores externos, coordinando además el ingreso reglamentario de <strong>${visitorStats.vehicularEntries}</strong> vehículos con placa registrada.</p>
          <div class="section-title">2. Áreas Institucionales con Mayor Volumen de Visitas</div>
          <table>
            <thead>
              <tr>
                <th>Dependencia / Área Receptora</th>
                <th class="text-center">Total Personas Recibidas</th>
                <th class="text-center">% Participación</th>
              </tr>
            </thead>
            <tbody>
              ${visitorStats.departments.slice(0, 6).map(dep => `
                <tr>
                  <td><strong>${dep.name}</strong></td>
                  <td class="text-center">${dep.count}</td>
                  <td class="text-center">${visitorStats.totalVisitors > 0 ? Math.round((dep.count / visitorStats.totalVisitors) * 100) : 0}%</td>
                </tr>
              `).join('') || '<tr><td colspan="3" class="text-center">Sin registros en el periodo</td></tr>'}
            </tbody>
          </table>
          <div class="section-title">3. Registro Completo de Visitas Autorizadas</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Requerimiento / Asunto</th>
                <th>Dependencia</th>
                <th class="text-center">Personas</th>
                <th class="text-center">Estado</th>
                ${showVisitorEval ? '<th class="text-center">Calificación</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${visitorRows.map(r => `
                <tr>
                  <td>${new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                  <td>${r.title || 'Visita oficial'}</td>
                  <td>${r.metadata?.responsible?.dependency || r.profiles?.dependency?.name || 'General'}</td>
                  <td class="text-center">${r.metadata?.visitors?.length || 1}</td>
                  <td class="text-center"><strong>${r.status?.toUpperCase()}</strong></td>
                  ${showVisitorEval ? `<td class="text-center">${r.metadata?.evaluation?.rating ? `★ ${Number(r.metadata.evaluation.rating).toFixed(1)}` : '—'}</td>` : ''}
                </tr>
              `).join('') || `<tr><td colspan="${showVisitorEval ? 6 : 5}" class="text-center">No se registran visitas en el periodo</td></tr>`}
            </tbody>
          </table>
        `;
      } else if (reportTab === 'maintenance') {
        const maintenanceRows = dbData.filter(d => d.category === 'maintenance');
        const showMaintEval = isEvalActive('maintenance');
        bodySections = `
          <div class="meta-box">
            <div class="meta-item"><strong>Periodo Evaluado:</strong> ${reportPeriodLabel}</div>
            <div class="meta-item"><strong>Fecha Emisión:</strong> ${todayStr}</div>
            <div class="meta-item"><strong>Total Incidencias Técnicas:</strong> ${maintenanceStats.total}</div>
            <div class="meta-item"><strong>Casos Críticos (Alta Prioridad):</strong> ${maintenanceStats.highPriorityPending}</div>
          </div>
          <div class="section-title">1. Estado y Ciclo de Vida de las Reparaciones</div>
          <p>El área de infraestructura reporta <strong>${maintenanceStats.total}</strong> reportes de averías o solicitudes locativas: <strong>${maintenanceStats.resolved}</strong> cerradas exitosamente (${maintenanceStats.total > 0 ? Math.round((maintenanceStats.resolved / maintenanceStats.total) * 100) : 0}%), <strong>${maintenanceStats.inProgress}</strong> con técnico asignado en ejecución, <strong>${maintenanceStats.pending}</strong> pendientes de revisión diagnóstica y <strong>${maintenanceStats.rejected}</strong> no procedentes.</p>
          <div class="section-title">2. Zonas y Pisos con Mayor Incidencia de Daños</div>
          <table>
            <thead>
              <tr>
                <th>Piso / Área Locativa</th>
                <th class="text-center">Incidentes Reportados</th>
                <th class="text-center">% del Total</th>
              </tr>
            </thead>
            <tbody>
              ${maintenanceStats.locations.slice(0, 6).map(loc => `
                <tr>
                  <td><strong>${loc.name}</strong></td>
                  <td class="text-center">${loc.count}</td>
                  <td class="text-center">${maintenanceStats.total > 0 ? Math.round((loc.count / maintenanceStats.total) * 100) : 0}%</td>
                </tr>
              `).join('') || '<tr><td colspan="3" class="text-center">Sin averías reportadas</td></tr>'}
            </tbody>
          </table>
          <div class="section-title">3. Registro Completo de Requerimientos Técnicos</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Incidencia / Descripción</th>
                <th>Ubicación</th>
                <th class="text-center">Prioridad</th>
                <th class="text-center">Estado</th>
                ${showMaintEval ? '<th class="text-center">Calificación</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${maintenanceRows.map(r => `
                <tr>
                  <td>${new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                  <td>${r.title || 'Mantenimiento locativo'}</td>
                  <td>${r.metadata?.location || 'General'}</td>
                  <td class="text-center"><strong style="color:${isHighPriority(r.priority) ? '#DC2626' : '#2563EB'}">${r.priority?.toUpperCase() || 'MEDIA'}</strong></td>
                  <td class="text-center"><strong>${r.status?.toUpperCase()}</strong></td>
                  ${showMaintEval ? `<td class="text-center">${r.metadata?.evaluation?.rating ? `★ ${Number(r.metadata.evaluation.rating).toFixed(1)}` : '—'}</td>` : ''}
                </tr>
              `).join('') || `<tr><td colspan="${showMaintEval ? 6 : 5}" class="text-center">Sin solicitudes registradas</td></tr>`}
            </tbody>
          </table>
        `;
      } else if (reportTab === 'parking_spots' || reportTab === 'parking') {
        const spotsList = filteredReportSpots;
        bodySections = `
          <div class="meta-box">
            <div class="meta-item"><strong>Periodo Evaluado:</strong> ${reportPeriodLabel}</div>
            <div class="meta-item"><strong>Fecha Emisión:</strong> ${todayStr}</div>
            <div class="meta-item"><strong>Total Celdas Físicas:</strong> ${parkingStats.totalSpots} celdas</div>
            <div class="meta-item"><strong>Celdas Disponibles:</strong> ${parkingStats.availableSpots} celdas</div>
            <div class="meta-item"><strong>Celdas Asignadas / Ocupadas:</strong> ${parkingStats.assignedSpots} celdas</div>
            <div class="meta-item"><strong>Celdas Fijas:</strong> ${parkingStats.fixedSpots} celdas</div>
            <div class="meta-item"><strong>Celdas Uso Libre Rotativo:</strong> ${parkingStats.freeSpots} celdas</div>
            <div class="meta-item"><strong>Tasa de Ocupación:</strong> ${parkingStats.occupancyRate}%</div>
          </div>

          <div class="section-title">1. Resumen Ejecutivo de Capacidad Física y Ocupación</div>
          <p>La sede distrital dispone de un total de <strong>${parkingStats.totalSpots}</strong> celdas físicas de parqueadero (<strong>${parkingStats.carSpots}</strong> celdas admitidas para automóviles y <strong>${parkingStats.motoSpots}</strong> para motocicletas). Actualmente se registran <strong>${parkingStats.availableSpots}</strong> celdas disponibles para parqueo inmediato y <strong>${parkingStats.assignedSpots}</strong> celdas ocupadas o con titular asignado, representando una tasa de ocupación del <strong>${parkingStats.occupancyRate}%</strong>.</p>

          <div class="section-title">2. Inventario y Ocupación Detallada de Celdas (${spotsList.length} celdas)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 14%;">Código</th>
                <th style="width: 18%;">Modalidad</th>
                <th style="width: 16%;" class="text-center">Tipo Admitido</th>
                <th style="width: 16%;" class="text-center">Estado Actual</th>
                <th style="width: 20%;">Titular Asignado</th>
                <th style="width: 16%;">Observaciones / Ubicación</th>
              </tr>
            </thead>
            <tbody>
              ${spotsList.map(s => {
                const sType = getSpotVehicleType(s);
                return `
                <tr>
                  <td><strong>${s.code}</strong></td>
                  <td>${s.spot_type === 'fija' ? '<span style="color:#2563EB; font-weight:bold;">Celda Fija</span>' : '<span style="color:#7C3AED; font-weight:bold;">Uso Libre</span>'}</td>
                  <td class="text-center"><strong>${sType === 'moto' ? '🏍️ Moto' : sType === 'carro' ? '🚗 Carro' : '🔄 Mixto'}</strong></td>
                  <td class="text-center">${s.status === 'disponible' ? '<span class="badge-status-active">DISPONIBLE</span>' : '<span class="badge-status-inactive">OCUPADA</span>'}</td>
                  <td>${s.assigned_user_name || 'Sin asignar / Disponible'}</td>
                  <td>${s.notes || '—'}</td>
                </tr>
              `;
              }).join('') || '<tr><td colspan="6" class="text-center">No hay celdas registradas con los filtros seleccionados</td></tr>'}
            </tbody>
          </table>
        `;
      } else if (reportTab === 'parking_access') {
        const fixedCars = filteredReportFixedVehicles.filter(v => getVehicleType(v) !== 'moto');
        const fixedMotos = filteredReportFixedVehicles.filter(v => getVehicleType(v) === 'moto');
        const freeCars = filteredReportFreeVehicles.filter(v => getVehicleType(v) !== 'moto');
        const freeMotos = filteredReportFreeVehicles.filter(v => getVehicleType(v) === 'moto');

        const totalCars = fixedCars.length + freeCars.length;
        const totalMotos = fixedMotos.length + freeMotos.length;
        const totalVehicles = totalCars + totalMotos;

        bodySections = `
          <div class="meta-box">
            <div class="meta-item"><strong>Periodo Evaluado:</strong> ${reportPeriodLabel}</div>
            <div class="meta-item"><strong>Fecha Emisión:</strong> ${todayStr}</div>
            <div class="meta-item"><strong>Total Vehículos Autorizados:</strong> ${totalVehicles} vehículos</div>
            <div class="meta-item"><strong>Automóviles (Carros):</strong> ${totalCars} (${fixedCars.length} fijas, ${freeCars.length} uso libre)</div>
            <div class="meta-item"><strong>Motocicletas (Motos):</strong> ${totalMotos} (${fixedMotos.length} cupos fijos, ${freeMotos.length} uso libre)</div>
            <div class="meta-item"><strong>Modalidad Fija:</strong> ${fixedCars.length + fixedMotos.length} vehículos</div>
            <div class="meta-item"><strong>Modalidad Uso Libre:</strong> ${freeCars.length + freeMotos.length} vehículos</div>
          </div>

          <!-- SECCIÓN 1: AUTOMÓVILES (CARROS) -->
          <div class="section-title">1. CONTROL DE ACCESO — AUTOMÓVILES (CARROS) (${totalCars} vehículos)</div>
          <p>Relación oficial de vehículos de cuatro ruedas autorizados formalmente para el ingreso y estacionamiento en las sedes distritales:</p>

          <div class="sub-section-title">1.1 Automóviles con Celda Fija Asignada (${fixedCars.length} carros)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Persona Titular</th>
                <th style="width: 14%;" class="text-center">Identificación</th>
                <th class="plate-col">Placa</th>
                <th style="width: 25%;">Vehículo / Modelo</th>
                <th style="width: 18%;">Celda Asignada</th>
                <th style="width: 18%;" class="text-center">Estado de Acceso</th>
              </tr>
            </thead>
            <tbody>
              ${fixedCars.map(v => `
                <tr>
                  <td><strong>${v.name || v.owner_name || 'Servidor'}</strong></td>
                  <td class="text-center">${v.doc || 'S/N'}</td>
                  <td class="plate-col"><span class="plate-badge">${v.plate}</span></td>
                  <td>${v.brand} ${v.model || ''} ${v.color ? `(${v.color})` : ''}</td>
                  <td><strong style="color: #1D4ED8;">${v.spot_code ? `Celda ${v.spot_code}` : 'Celda Fija'}</strong></td>
                  <td class="text-center">${v.is_active !== false ? '<span class="badge-status-active">ACTIVO</span>' : '<span class="badge-status-inactive">INACTIVO</span>'}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="text-center" style="color:#64748B;">No se registran automóviles con celda fija asignada</td></tr>'}
            </tbody>
          </table>

          <div class="sub-section-title" style="margin-top: 18px;">1.2 Automóviles en Modalidad de Uso Libre Rotativo (${freeCars.length} carros)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Persona Titular</th>
                <th style="width: 14%;" class="text-center">Identificación</th>
                <th class="plate-col">Placa</th>
                <th style="width: 25%;">Vehículo / Modelo</th>
                <th style="width: 18%;">Modalidad de Parqueo</th>
                <th style="width: 18%;" class="text-center">Estado de Acceso</th>
              </tr>
            </thead>
            <tbody>
              ${freeCars.map(v => `
                <tr>
                  <td><strong>${v.name || v.owner_name || 'Servidor'}</strong></td>
                  <td class="text-center">${v.doc || 'S/N'}</td>
                  <td class="plate-col"><span class="plate-badge">${v.plate}</span></td>
                  <td>${v.brand} ${v.model || ''} ${v.color ? `(${v.color})` : ''}</td>
                  <td><span style="color:#7C3AED; font-weight:700;">Uso Libre Rotativo</span></td>
                  <td class="text-center">${v.is_active !== false ? '<span class="badge-status-active">ACTIVO</span>' : '<span class="badge-status-inactive">INACTIVO</span>'}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="text-center" style="color:#64748B;">No se registran automóviles en modalidad rotativa</td></tr>'}
            </tbody>
          </table>

          <!-- SECCIÓN 2: MOTOCICLETAS (MOTOS) -->
          <div class="section-title" style="margin-top: 24px;">2. CONTROL DE ACCESO — MOTOCICLETAS (MOTOS) (${totalMotos} motos)</div>
          <p>Relación oficial de motocicletas autorizadas formalmente para el ingreso y uso de las áreas de estacionamiento de dos ruedas:</p>

          <div class="sub-section-title">2.1 Motocicletas con Cupo Asignado / Fijo (${fixedMotos.length} motos)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Persona Titular</th>
                <th style="width: 14%;" class="text-center">Identificación</th>
                <th class="plate-col">Placa</th>
                <th style="width: 25%;">Motocicleta / Línea</th>
                <th style="width: 18%;">Cupo Asignado</th>
                <th style="width: 18%;" class="text-center">Estado de Acceso</th>
              </tr>
            </thead>
            <tbody>
              ${fixedMotos.map(v => `
                <tr>
                  <td><strong>${v.name || v.owner_name || 'Servidor'}</strong></td>
                  <td class="text-center">${v.doc || 'S/N'}</td>
                  <td class="plate-col"><span class="plate-badge">${v.plate}</span></td>
                  <td>${v.brand} ${v.model || ''} ${v.color ? `(${v.color})` : ''}</td>
                  <td><strong style="color: #1D4ED8;">${v.spot_code ? `Celda ${v.spot_code}` : 'Cupo Fijo'}</strong></td>
                  <td class="text-center">${v.is_active !== false ? '<span class="badge-status-active">ACTIVO</span>' : '<span class="badge-status-inactive">INACTIVO</span>'}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="text-center" style="color:#64748B;">No se registran motocicletas con cupo fijo asignado</td></tr>'}
            </tbody>
          </table>

          <div class="sub-section-title" style="margin-top: 18px;">2.2 Motocicletas en Modalidad de Uso Libre Rotativo (${freeMotos.length} motos)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Persona Titular</th>
                <th style="width: 14%;" class="text-center">Identificación</th>
                <th class="plate-col">Placa</th>
                <th style="width: 25%;">Motocicleta / Línea</th>
                <th style="width: 18%;">Modalidad</th>
                <th style="width: 18%;" class="text-center">Estado de Acceso</th>
              </tr>
            </thead>
            <tbody>
              ${freeMotos.map(v => `
                <tr>
                  <td><strong>${v.name || v.owner_name || 'Servidor'}</strong></td>
                  <td class="text-center">${v.doc || 'S/N'}</td>
                  <td class="plate-col"><span class="plate-badge">${v.plate}</span></td>
                  <td>${v.brand} ${v.model || ''} ${v.color ? `(${v.color})` : ''}</td>
                  <td><span style="color:#7C3AED; font-weight:700;">Uso Libre Rotativo</span></td>
                  <td class="text-center">${v.is_active !== false ? '<span class="badge-status-active">ACTIVO</span>' : '<span class="badge-status-inactive">INACTIVO</span>'}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="text-center" style="color:#64748B;">No se registran motocicletas en modalidad rotativa</td></tr>'}
            </tbody>
          </table>
        `;
      } else if (reportTab === 'parking_requests') {
        const parkingRows = dbData.filter(d => d.category === 'parking');
        const showParkingEval = isEvalActive('parking');
        const parkingApproved = parkingRows.filter(d => d.status === 'resuelto').length;
        const parkingPending = parkingRows.filter(d => d.status === 'pendiente').length;
        const parkingInProgress = parkingRows.filter(d => d.status === 'en_proceso' || d.status === 'en proceso').length;
        const parkingRejected = parkingRows.filter(d => d.status === 'rechazado').length;

        bodySections = `
          <div class="meta-box">
            <div class="meta-item"><strong>Periodo Evaluado:</strong> ${reportPeriodLabel}</div>
            <div class="meta-item"><strong>Fecha Emisión:</strong> ${todayStr}</div>
            <div class="meta-item"><strong>Total Solicitudes:</strong> ${parkingRows.length} trámites</div>
            <div class="meta-item"><strong>Aprobadas / Resueltas:</strong> ${parkingApproved} requerimientos</div>
            <div class="meta-item"><strong>En Proceso:</strong> ${parkingInProgress} requerimientos</div>
            <div class="meta-item"><strong>Pendientes:</strong> ${parkingPending} requerimientos</div>
            <div class="meta-item"><strong>Rechazadas:</strong> ${parkingRejected} requerimientos</div>
            <div class="meta-item"><strong>Satisfacción CSAT:</strong> ${stats.moduleEvaluations.parking?.avg > 0 ? stats.moduleEvaluations.parking.avg.toFixed(1) + ' / 5.0' : 'Sin evaluar'}</div>
          </div>

          <div class="section-title">1. Balance Operativo de Solicitudes de Parqueadero</div>
          <p>Durante el periodo evaluado (${reportPeriodLabel}) se tramitaron un total de <strong>${parkingRows.length}</strong> solicitudes de acceso y asignación de celdas de parqueadero en SASGE: <strong>${parkingApproved}</strong> fueron aprobadas satisfactoriamente, <strong>${parkingInProgress}</strong> en trámite técnico, <strong>${parkingPending}</strong> pendientes de respuesta y <strong>${parkingRejected}</strong> no viables conforme a la disponibilidad de cupos.</p>

          <div class="section-title">2. Historial de Solicitudes de Parqueadero del Periodo</div>
          <table>
            <thead>
              <tr>
                <th style="width: 14%;">Fecha</th>
                <th class="plate-col">Placa</th>
                <th style="width: 22%;">Vehículo / Modelo</th>
                <th style="width: 22%;">Solicitante</th>
                <th style="width: 22%;">Dependencia</th>
                <th style="width: 10%;" class="text-center">Estado</th>
                ${showParkingEval ? '<th style="width: 10%;" class="text-center">Calificación</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${parkingRows.map(r => {
                const vModel = [r.metadata?.brand, r.metadata?.model].filter(Boolean).join(' ') || r.metadata?.vehicleType || r.title || 'Vehículo particular';
                const reqName = r.metadata?.name || r.profiles?.full_name || r.user_name || 'Servidor';
                const depName = r.metadata?.dependency || r.profiles?.dependency?.name || r.profiles?.dependency || r.user_dependency || 'Secretaría Jurídica Distrital';
                return `
                  <tr>
                    <td>${new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                    <td class="plate-col"><span class="plate-badge">${r.metadata?.plate || 'S/P'}</span></td>
                    <td>${vModel}</td>
                    <td>${reqName}</td>
                    <td>${depName}</td>
                    <td class="text-center"><strong>${(r.status || '').toUpperCase()}</strong></td>
                    ${showParkingEval ? `<td class="text-center">${r.metadata?.evaluation?.rating ? `★ ${Number(r.metadata.evaluation.rating).toFixed(1)}` : '—'}</td>` : ''}
                  </tr>
                `;
              }).join('') || `<tr><td colspan="${showParkingEval ? 7 : 6}" class="text-center">No hay solicitudes de parqueadero registradas en el periodo</td></tr>`}
            </tbody>
          </table>
        `;
      } else if (reportTab === 'rooms') {
        const roomRows = dbData.filter(d => d.category === 'rooms');
        const showRoomEval = isEvalActive('rooms');
        bodySections = `
          <div class="meta-box">
            <div class="meta-item"><strong>Periodo Evaluado:</strong> ${reportPeriodLabel}</div>
            <div class="meta-item"><strong>Fecha Emisión:</strong> ${todayStr}</div>
            <div class="meta-item"><strong>Total Reservas Ejecutadas:</strong> ${roomStats.totalReservations}</div>
            <div class="meta-item"><strong>Asistencia Promedio:</strong> ${roomStats.averageAttendees} personas/reunión</div>
          </div>
          <div class="section-title">1. Ocupación y Servicios Complementarios</div>
          <p>Durante el periodo se coordinaron <strong>${roomStats.totalReservations}</strong> eventos y reuniones oficiales. La demanda de servicios auxiliares fue: Estación de café y refrigerios en un <strong>${roomStats.services.coffee}%</strong> de las reuniones, equipos audiovisuales y proyectores en un <strong>${roomStats.services.projector}%</strong>, y soporte de equipos portátiles en un <strong>${roomStats.services.laptop}%</strong>.</p>
          <div class="section-title">2. Uso de Salas de Juntas</div>
          <table>
            <thead>
              <tr>
                <th>Sala de Juntas</th>
                <th class="text-center">Eventos Coordinados</th>
                <th class="text-center">% Utilización</th>
              </tr>
            </thead>
            <tbody>
              ${roomStats.roomsList.map(rm => `
                <tr>
                  <td><strong>${rm.name}</strong></td>
                  <td class="text-center">${rm.count}</td>
                  <td class="text-center">${roomStats.totalReservations > 0 ? Math.round((rm.count / roomStats.totalReservations) * 100) : 0}%</td>
                </tr>
              `).join('') || '<tr><td colspan="3" class="text-center">Sin reservas en el periodo</td></tr>'}
            </tbody>
          </table>
          <div class="section-title">3. Registro Completo de Reuniones y Reservas</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Asunto / Reunión</th>
                <th>Sala</th>
                <th class="text-center">Asistentes</th>
                <th class="text-center">Estado</th>
                ${showRoomEval ? '<th class="text-center">Calificación</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${roomRows.map(r => `
                <tr>
                  <td>${new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                  <td>${r.title || 'Reunión de trabajo'}</td>
                  <td>${r.metadata?.room?.name || 'Sala general'}</td>
                  <td class="text-center">${r.metadata?.attendees || '-'}</td>
                  <td class="text-center"><strong>${r.status?.toUpperCase()}</strong></td>
                  ${showRoomEval ? `<td class="text-center">${r.metadata?.evaluation?.rating ? `★ ${Number(r.metadata.evaluation.rating).toFixed(1)}` : '—'}</td>` : ''}
                </tr>
              `).join('') || `<tr><td colspan="${showRoomEval ? 6 : 5}" class="text-center">No hay reuniones en el periodo</td></tr>`}
            </tbody>
          </table>
        `;
      } else if (reportTab === 'transport') {
        const transportRows = dbData.filter(d => d.category === 'transport');
        const showTransportEval = isEvalActive('transport');
        bodySections = `
          <div class="meta-box">
            <div class="meta-item"><strong>Periodo Evaluado:</strong> ${reportPeriodLabel}</div>
            <div class="meta-item"><strong>Fecha Emisión:</strong> ${todayStr}</div>
            <div class="meta-item"><strong>Misiones de Viaje:</strong> ${transportStats.totalRequests}</div>
            <div class="meta-item"><strong>Servidores Movilizados:</strong> ${transportStats.totalPassengers} funcionarios</div>
          </div>
          <div class="section-title">1. Balance de Movilidad Terrestre Oficial</div>
          <p>Se llevaron a cabo <strong>${transportStats.totalRequests}</strong> comisiones y traslados oficiales, garantizando la movilidad de <strong>${transportStats.totalPassengers}</strong> servidores distritales a sedes judiciales, administrativas y gubernamentales del Distrito Capital.</p>
          <div class="section-title">2. Rutas y Trayectos Recurrentes</div>
          <table>
            <thead>
              <tr>
                <th>Ruta / Destino</th>
                <th class="text-center">Viajes Realizados</th>
              </tr>
            </thead>
            <tbody>
              ${transportStats.routes.slice(0, 6).map(rt => `
                <tr>
                  <td><strong>${rt.name}</strong></td>
                  <td class="text-center">${rt.count}</td>
                </tr>
              `).join('') || '<tr><td colspan="2" class="text-center">Sin rutas registradas</td></tr>'}
            </tbody>
          </table>
          <div class="section-title">3. Registro Completo de Misiones de Transporte</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Misión / Motivo</th>
                <th>Ruta</th>
                <th class="text-center">Pasajeros</th>
                <th class="text-center">Estado</th>
                ${showTransportEval ? '<th class="text-center">Calificación</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${transportRows.map(r => `
                <tr>
                  <td>${new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                  <td>${r.title || 'Misión oficial'}</td>
                  <td>${r.metadata?.origin || 'Origen'} - ${r.metadata?.destination || 'Destino'}</td>
                  <td class="text-center">${r.metadata?.passengers || 1}</td>
                  <td class="text-center"><strong>${r.status?.toUpperCase()}</strong></td>
                  ${showTransportEval ? `<td class="text-center">${r.metadata?.evaluation?.rating ? `★ ${Number(r.metadata.evaluation.rating).toFixed(1)}` : '—'}</td>` : ''}
                </tr>
              `).join('') || `<tr><td colspan="${showTransportEval ? 6 : 5}" class="text-center">No hay comisiones en el periodo</td></tr>`}
            </tbody>
          </table>
        `;
      } else if (reportTab === 'satisfaction') {
        bodySections = `
          <div class="meta-box">
            <div class="meta-item"><strong>Periodo Evaluado:</strong> ${reportPeriodLabel}</div>
            <div class="meta-item"><strong>Fecha Emisión:</strong> ${todayStr}</div>
            <div class="meta-item"><strong>Índice CSAT Global:</strong> ${stats.averageRating > 0 ? `${stats.averageRating} / 5.0 ★` : 'Sin calificaciones'}</div>
            <div class="meta-item"><strong>Encuestas Recibidas:</strong> ${stats.totalEvaluated} (${stats.favorablePercent}% favorables)</div>
          </div>
          <div class="section-title">1. Balance Ejecutivo de Satisfacción de Usuarios</div>
          <p>Durante el periodo evaluado (${reportPeriodLabel}), la gestión de servicios operativos de la Secretaría Jurídica Distrital registró una calificación promedio de <strong>${stats.averageRating} / 5.0 puntos</strong>. Se consolidaron <strong>${stats.totalEvaluated}</strong> encuestas de percepción diligenciadas por funcionarios tras la resolución de sus solicitudes, alcanzando un <strong>${stats.favorablePercent}%</strong> de calificaciones de alta satisfacción (4 y 5 estrellas).</p>
          <div class="section-title">2. Distribución de Calificaciones (Escala 1 a 5 Estrellas)</div>
          <table>
            <thead>
              <tr>
                <th>Nivel de Calificación</th>
                <th class="text-center">Total Encuestas</th>
                <th class="text-center">Porcentaje</th>
                <th class="text-center">Concepto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>★★★★★ (5 Estrellas)</strong></td>
                <td class="text-center">${stats.ratingCounts[5] || 0}</td>
                <td class="text-center">${stats.totalEvaluated > 0 ? Math.round(((stats.ratingCounts[5] || 0) / stats.totalEvaluated) * 100) : 0}%</td>
                <td class="text-center" style="color:#059669"><strong>Excelente</strong></td>
              </tr>
              <tr>
                <td><strong>★★★★☆ (4 Estrellas)</strong></td>
                <td class="text-center">${stats.ratingCounts[4] || 0}</td>
                <td class="text-center">${stats.totalEvaluated > 0 ? Math.round(((stats.ratingCounts[4] || 0) / stats.totalEvaluated) * 100) : 0}%</td>
                <td class="text-center" style="color:#10B981"><strong>Bueno / Favorable</strong></td>
              </tr>
              <tr>
                <td><strong>★★★☆☆ (3 Estrellas)</strong></td>
                <td class="text-center">${stats.ratingCounts[3] || 0}</td>
                <td class="text-center">${stats.totalEvaluated > 0 ? Math.round(((stats.ratingCounts[3] || 0) / stats.totalEvaluated) * 100) : 0}%</td>
                <td class="text-center" style="color:#D97706"><strong>Aceptable</strong></td>
              </tr>
              <tr>
                <td><strong>★★☆☆☆ (2 Estrellas)</strong></td>
                <td class="text-center">${stats.ratingCounts[2] || 0}</td>
                <td class="text-center">${stats.totalEvaluated > 0 ? Math.round(((stats.ratingCounts[2] || 0) / stats.totalEvaluated) * 100) : 0}%</td>
                <td class="text-center" style="color:#EA580C"><strong>Regular</strong></td>
              </tr>
              <tr>
                <td><strong>★☆☆☆☆ (1 Estrella)</strong></td>
                <td class="text-center">${stats.ratingCounts[1] || 0}</td>
                <td class="text-center">${stats.totalEvaluated > 0 ? Math.round(((stats.ratingCounts[1] || 0) / stats.totalEvaluated) * 100) : 0}%</td>
                <td class="text-center" style="color:#DC2626"><strong>Deficiente / Crítico</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="section-title">3. Calidad y Satisfacción por Servicio Operativo</div>
          ${(() => {
            const activeModules = [
              { key: 'visitors', name: 'Control de Acceso y Visitantes', eval: stats.moduleEvaluations.visitors },
              { key: 'maintenance', name: 'Mantenimiento Locativo', eval: stats.moduleEvaluations.maintenance },
              { key: 'parking', name: 'Acceso Parqueadero', eval: stats.moduleEvaluations.parking },
              { key: 'rooms', name: 'Reserva de Salas de Juntas', eval: stats.moduleEvaluations.rooms },
              { key: 'transport', name: 'Transporte Oficial', eval: stats.moduleEvaluations.transport },
            ].filter(m => isEvalActive(m.key));

            if (activeModules.length === 0) {
              return '<p style="color:#64748B;font-style:italic;">No hay servicios operativos con evaluación de satisfacción habilitada.</p>';
            }

            return `
              <table>
                <thead>
                  <tr>
                    <th>Servicio / Módulo</th>
                    <th class="text-center">Encuestas</th>
                    <th class="text-center">Calificación Promedio</th>
                    <th class="text-center">Estado de Calidad</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeModules.map(m => `
                    <tr>
                      <td><strong>${m.name}</strong></td>
                      <td class="text-center">${m.eval.count}</td>
                      <td class="text-center"><strong>${m.eval.count > 0 ? `★ ${m.eval.avg.toFixed(1)}` : '—'}</strong></td>
                      <td class="text-center">${m.eval.count === 0 ? 'Sin evaluar' : m.eval.avg >= 4.0 ? 'Excelente' : m.eval.avg >= 3.0 ? 'Aceptable' : 'Oportunidad de Mejora'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
          })()}
          <div class="section-title">4. Comentarios y Observaciones Cualitativas de los Usuarios</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Servicio</th>
                <th class="text-center">Calif.</th>
                <th>Comentario / Observación</th>
              </tr>
            </thead>
            <tbody>
              ${stats.recentEvaluations.filter(r => isEvalActive(r.category)).map(r => `
                <tr>
                  <td>${r.metadata?.evaluation?.date ? new Date(r.metadata.evaluation.date).toLocaleDateString('es-CO') : new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                  <td><strong>${getModuleMeta(r.category).name}</strong></td>
                  <td class="text-center" style="color:#B45309"><strong>★ ${r.metadata?.evaluation?.rating}</strong></td>
                  <td><em>"${r.metadata?.evaluation?.comment || ''}"</em></td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="text-center">No hay comentarios registrados en el periodo para los servicios con evaluación activa</td></tr>'}
            </tbody>
          </table>
        `;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>${currentConfig.title} - Secretaría Jurídica Distrital</title>
          <style>
            @page {
              size: A4;
              margin: 18mm 15mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #1E293B;
              line-height: 1.5;
              padding: 20px;
              margin: 0;
              background-color: #FFFFFF;
            }
            .header {
              border-bottom: 2.5px solid #0F172A;
              padding-bottom: 12px;
              margin-bottom: 18px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .gov-title {
              font-size: 11px;
              font-weight: 800;
              color: #64748B;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .sec-title {
              font-size: 19px;
              font-weight: 900;
              color: #0F172A;
              margin: 3px 0 1px 0;
            }
            .sub-title {
              font-size: 12px;
              color: #64748B;
              font-weight: 600;
            }
            .doc-title {
              text-align: center;
              font-size: 15px;
              font-weight: 900;
              color: #0F172A;
              margin: 18px 0 14px 0;
              letter-spacing: 0.5px;
              line-height: 1.3;
            }
            .meta-box {
              background-color: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 10px 16px;
              margin-bottom: 18px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
              font-size: 11px;
            }
            .meta-item strong {
              color: #0F172A;
            }
            .section-title {
              font-size: 12px;
              font-weight: 800;
              color: #0F172A;
              border-left: 4px solid #3B82F6;
              padding-left: 8px;
              margin-top: 18px;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            p {
              font-size: 11.5px;
              color: #334155;
              text-align: justify;
              margin: 0 0 10px 0;
              line-height: 1.6;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0 18px 0;
              font-size: 11px;
            }
            th {
              background-color: #0F172A;
              color: #FFFFFF;
              text-align: left;
              padding: 7px 10px;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.5px;
            }
            td {
              padding: 7px 10px;
              border-bottom: 1px solid #E2E8F0;
              color: #1E293B;
            }
            tr:nth-child(even) td {
              background-color: #F8FAFC;
            }
            .text-center {
              text-align: center;
            }
            .sub-section-title {
              font-size: 11px;
              font-weight: 800;
              color: #1E3A8A;
              margin: 14px 0 6px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .plate-col {
              width: 120px !important;
              min-width: 110px !important;
              white-space: nowrap !important;
              text-align: center !important;
            }
            .plate-badge {
              display: inline-block !important;
              white-space: nowrap !important;
              word-break: keep-all !important;
              letter-spacing: 1.5px !important;
              font-family: 'Consolas', 'Courier New', monospace !important;
              font-size: 11.5px !important;
              font-weight: 800 !important;
              background-color: #FEF08A !important;
              color: #0F172A !important;
              border: 1.5px solid #000000 !important;
              border-radius: 4px !important;
              padding: 3px 8px !important;
              text-align: center !important;
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .badge-status-active {
              display: inline-block !important;
              background-color: #DCFCE7 !important;
              color: #166534 !important;
              font-weight: 800 !important;
              padding: 2px 7px !important;
              border-radius: 4px !important;
              font-size: 10px !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .badge-status-inactive {
              display: inline-block !important;
              background-color: #FEE2E2 !important;
              color: #991B1B !important;
              font-weight: 800 !important;
              padding: 2px 7px !important;
              border-radius: 4px !important;
              font-size: 10px !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .signature-box {
              margin-top: 40px;
              page-break-inside: avoid;
              text-align: center;
            }
            .signature-line {
              width: 240px;
              height: 1px;
              background-color: #64748B;
              margin: 0 auto 6px auto;
            }
            .signature-name {
              font-size: 12px;
              font-weight: 800;
              color: #0F172A;
            }
            .signature-dept {
              font-size: 11px;
              color: #64748B;
            }
            .footer-note {
              margin-top: 25px;
              border-top: 1px solid #E2E8F0;
              padding-top: 8px;
              font-size: 9.5px;
              color: #94A3B8;
              text-align: center;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
              table { page-break-inside: auto; width: 100% !important; table-layout: auto !important; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              .plate-col { width: 120px !important; min-width: 110px !important; white-space: nowrap !important; }
              .plate-badge { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .badge-status-active { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .badge-status-inactive { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="gov-title">Alcaldía Mayor de Bogotá D.C.</div>
              <div class="sec-title">Secretaría Jurídica Distrital</div>
              <div class="sub-title">Oficina de Gestión Corporativa • ${currentConfig.subtitle}</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748B;">
              <div><strong>${currentConfig.code}</strong></div>
              <div>Reporte Oficial SASGE</div>
            </div>
          </div>

          <div class="doc-title">${currentConfig.title}</div>

          ${bodySections}

          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-name">Dirección de Gestión Corporativa</div>
            <div class="signature-dept">Secretaría Jurídica Distrital • Alcaldía Mayor de Bogotá D.C.</div>
          </div>

          <div class="footer-note">
            Documento administrativo generado digitalmente por el Sistema SASGE de la Secretaría Jurídica Distrital.
          </div>
        </body>
        </html>
      `;

      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
      } else {
        window.print();
      }
    }
  }, [reportTab, reportPeriodLabel, stats, dbData, maintenanceStats, visitorStats, roomStats, transportStats, categoryBreakdown]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Reportes de Gestión' }} />
      
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
        
        {isDesktop && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner Analítico */}
          <View style={styles.hero}>
            <LinearGradient 
              colors={[COLORS.primaryDark, '#1E293B']} 
              style={StyleSheet.absoluteFill} 
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={[styles.heroInner, { paddingHorizontal: isDesktop ? 25 : 14, paddingTop: !isDesktop ? 30 : 0 }]}>
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 15 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroKicker}>SECRETARÍA JURÍDICA DISTRITAL</Text>
                  <Text style={[styles.heroTitle, { fontSize: isDesktop ? 32 : 24 }]} numberOfLines={1} adjustsFontSizeToFit>Analítica & Reportes</Text>
                  <Text style={styles.heroSub} numberOfLines={2}>Consola interactiva de monitoreo de servicios administrativos</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignSelf: isDesktop ? 'auto' : 'stretch', justifyContent: isDesktop ? 'flex-end' : 'space-between', alignItems: 'center' }}>
                  <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={loading} accessibilityLabel="Actualizar métricas">
                    <Ionicons name="refresh" size={20} color={COLORS.white} />
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      style={[styles.logoutBtn, { backgroundColor: '#3B82F6', borderColor: '#2563EB' }]} 
                      onPress={() => router.replace('/dashboard')}
                      accessibilityLabel="Portal Funcionario"
                    >
                      <Ionicons name="home" size={20} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.logoutBtn} 
                      onPress={async () => {
                        await supabase.auth.signOut();
                        router.replace('/login');
                      }}
                      accessibilityLabel="Cerrar sesión"
                    >
                      <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {!isDesktop && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    onPress={() => router.push('/admin')}
                    style={{
                      flex: 1,
                      minWidth: 140,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons name="speedometer-outline" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Panel Admin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push('/admin/manage')}
                    style={{
                      flex: 1,
                      minWidth: 140,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      borderWidth: 1,
                      borderColor: 'rgba(59, 130, 246, 0.4)',
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons name="file-tray-full-outline" size={16} color="#93C5FD" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Gestionar Solicitudes</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.contentPadding}>
            
            {/* Filtros Generales Superior */}
            <View style={styles.filtersRow}>
              <View style={styles.rangeSelector}>
                <TouchableOpacity 
                  style={[styles.rangeBtn, dateRange === 'month' && styles.rangeBtnActive]} 
                  onPress={() => setDateRange('month')}
                >
                  <Text style={[styles.rangeText, dateRange === 'month' && styles.rangeTextActive]}>Este Mes</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.rangeBtn, dateRange === 'quarter' && styles.rangeBtnActive]} 
                  onPress={() => setDateRange('quarter')}
                >
                  <Text style={[styles.rangeText, dateRange === 'quarter' && styles.rangeTextActive]}>3 Meses</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.rangeBtn, dateRange === 'all' && styles.rangeBtnActive]} 
                  onPress={() => setDateRange('all')}
                >
                  <Text style={[styles.rangeText, dateRange === 'all' && styles.rangeTextActive]}>Histórico</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.rangeBtn, dateRange === 'custom' && styles.rangeBtnActive]} 
                  onPress={() => setDateRange('custom')}
                >
                  <Text style={[styles.rangeText, dateRange === 'custom' && styles.rangeTextActive]}>Personalizado</Text>
                </TouchableOpacity>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <TouchableOpacity 
                  style={[styles.downloadDocBtn, { backgroundColor: COLORS.primarySoft }]} 
                  onPress={() => navigateToManage({ status: 'Todos', service: 'Todas' })}
                >
                  <Ionicons name="layers-outline" size={18} color={COLORS.white} />
                  <Text style={styles.downloadDocText}>Ver Solicitudes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.downloadDocBtn} onPress={handleGenerateReport} disabled={loading}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.white} />
                  <Text style={styles.downloadDocText}>Generar Reporte PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.downloadDocBtn, { backgroundColor: COLORS.success }]} onPress={handleExportExcel} disabled={loading}>
                  <Ionicons name="download-outline" size={18} color={COLORS.white} />
                  <Text style={styles.downloadDocText}>Exportar Excel</Text>
                </TouchableOpacity>
              </View>
            </View>

            {dateRange === 'month' && (
              <View style={styles.monthSelectorCard}>
                <View style={styles.monthSelectorHeader}>
                  <View>
                    <Text style={styles.monthSelectorKicker}>MES DEL REPORTE</Text>
                    <Text style={styles.monthSelectorTitle}>{reportPeriodLabel}</Text>
                  </View>
                  <View style={[styles.dbBadge, dataSource === 'error' && styles.dbBadgeError]}>
                    <Ionicons
                      name={dataSource === 'database' ? 'server-outline' : dataSource === 'error' ? 'warning-outline' : 'file-tray-outline'}
                      size={14}
                      color={dataSource === 'error' ? COLORS.danger : COLORS.accent}
                    />
                    <Text style={[styles.dbBadgeText, dataSource === 'error' && styles.dbBadgeTextError]}>
                      {dataSource === 'database' ? 'Datos de BD' : dataSource === 'error' ? 'Error BD' : 'BD sin registros'}
                    </Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthOptionsRow}>
                  {monthOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.monthOptionBtn, selectedMonth === option.value && styles.monthOptionBtnActive]}
                      onPress={() => setSelectedMonth(option.value)}
                    >
                      <Text style={[styles.monthOptionText, selectedMonth === option.value && styles.monthOptionTextActive]}>
                        {option.shortLabel}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {dateRange === 'custom' && (
              <View style={styles.monthSelectorCard}>
                <View style={styles.monthSelectorHeader}>
                  <View>
                    <Text style={styles.monthSelectorKicker}>PERIODO PERSONALIZADO</Text>
                    <Text style={styles.monthSelectorTitle}>Seleccionar Rango</Text>
                  </View>
                  <TouchableOpacity style={[styles.downloadDocBtn, { backgroundColor: COLORS.accent, height: 38 }]} onPress={handleRefresh}>
                    <Ionicons name="filter" size={16} color={COLORS.white} />
                    <Text style={[styles.downloadDocText, { fontSize: 12 }]}>Aplicar Filtro</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line, padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      setModalTarget('from');
                      setShowDatePicker(true);
                    }}
                  >
                    <Ionicons name="calendar-outline" size={16} color={COLORS.muted} style={{ marginRight: 8 }} />
                    <Text style={{ color: customStartDate ? COLORS.text : COLORS.muted, flex: 1 }}>{customStartDate || 'Fecha Inicio (YYYY-MM-DD)'}</Text>
                  </TouchableOpacity>
                  <Text style={{ fontWeight: '800', color: COLORS.muted }}>-</Text>
                  <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line, padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      setModalTarget('to');
                      setShowDatePicker(true);
                    }}
                  >
                    <Ionicons name="calendar-outline" size={16} color={COLORS.muted} style={{ marginRight: 8 }} />
                    <Text style={{ color: customEndDate ? COLORS.text : COLORS.muted, flex: 1 }}>{customEndDate || 'Fecha Fin (YYYY-MM-DD)'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Selector de Módulos (Tabs Horizontales en Móviles) */}
            {!isDesktop && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileTabsContainer}>
                <TabButton id="consolidated" label="Consolidado" icon="bar-chart" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="visitors" label="Visitantes" icon="people" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="maintenance" label="Mantenimiento" icon="construct" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="parking" label="Parqueadero" icon="car" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="rooms" label="Salas" icon="easel" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="transport" label="Transporte" icon="car-sport" activeTab={activeTab} setActiveTab={setActiveTab} />
              </ScrollView>
            )}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Procesando métricas y conectando a Supabase...</Text>
              </View>
            ) : (
              <View style={{ gap: 25 }}>

                {/* --- TAB CONSOLIDADO --- */}
                {activeTab === 'consolidated' && (
                  <View style={{ gap: 25 }}>
                    
                    {/* Sección Superior: 3 columnas en desktop */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      
                      {/* Columna 1: Círculo de Progreso / Donut de Efectividad */}
                      <View style={[styles.card, { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 35 }]}>
                        <Text style={[styles.cardTitle, { textAlign: 'center', marginBottom: 5 }]}>Efectividad General</Text>
                        <Text style={[styles.cardSubtitle, { textAlign: 'center', marginBottom: 25 }]}>Porcentaje total de casos resueltos</Text>
                        
                        <CircularProgress percent={stats.effectiveness} color={COLORS.success} />
                      </View>

                      {/* Columna 2: Distribución por Categoría de Solicitudes con Barras Segmentadas por Estado */}
                      <View style={[styles.card, { flex: 1.2 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                          <View>
                            <Text style={styles.cardTitle}>Solicitudes por Módulo</Text>
                            <Text style={styles.cardSubtitle}>Desglose de estados por cada área operativa</Text>
                          </View>
                          {/* Leyenda de estados */}
                          <View style={styles.moduleLegendRow}>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                              <Text style={styles.legendText}>Resueltas</Text>
                            </View>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
                              <Text style={styles.legendText}>En Curso</Text>
                            </View>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
                              <Text style={styles.legendText}>Pendientes</Text>
                            </View>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
                              <Text style={styles.legendText}>Rechazadas</Text>
                            </View>
                          </View>
                        </View>

                        <View style={{ gap: 16, marginTop: 20 }}>
                          <SegmentedCategoryBar 
                            label="Control de Acceso" 
                            icon="people" 
                            total={categoryBreakdown.visitors.total} 
                            resolved={categoryBreakdown.visitors.resolved}
                            inProgress={categoryBreakdown.visitors.inProgress}
                            pending={categoryBreakdown.visitors.pending}
                            rejected={categoryBreakdown.visitors.rejected}
                            onPressCategory={() => navigateToManage({ service: 'Visitantes' })}
                            onPressResolved={() => navigateToManage({ service: 'Visitantes', status: 'resuelto' })}
                            onPressInProgress={() => navigateToManage({ service: 'Visitantes', status: 'en_progreso' })}
                            onPressPending={() => navigateToManage({ service: 'Visitantes', status: 'pendiente' })}
                            onPressRejected={() => navigateToManage({ service: 'Visitantes', status: 'rechazado' })}
                          />
                          <SegmentedCategoryBar 
                            label="Mantenimiento Locativo" 
                            icon="construct" 
                            total={categoryBreakdown.maintenance.total} 
                            resolved={categoryBreakdown.maintenance.resolved}
                            inProgress={categoryBreakdown.maintenance.inProgress}
                            pending={categoryBreakdown.maintenance.pending}
                            rejected={categoryBreakdown.maintenance.rejected}
                            onPressCategory={() => navigateToManage({ service: 'Mantenimiento' })}
                            onPressResolved={() => navigateToManage({ service: 'Mantenimiento', status: 'resuelto' })}
                            onPressInProgress={() => navigateToManage({ service: 'Mantenimiento', status: 'en_progreso' })}
                            onPressPending={() => navigateToManage({ service: 'Mantenimiento', status: 'pendiente' })}
                            onPressRejected={() => navigateToManage({ service: 'Mantenimiento', status: 'rechazado' })}
                          />
                          <SegmentedCategoryBar 
                            label="Cupo de Parqueadero" 
                            icon="car" 
                            total={categoryBreakdown.parking.total} 
                            resolved={categoryBreakdown.parking.resolved}
                            inProgress={categoryBreakdown.parking.inProgress}
                            pending={categoryBreakdown.parking.pending}
                            rejected={categoryBreakdown.parking.rejected}
                            onPressCategory={() => navigateToManage({ service: 'Parqueadero' })}
                            onPressResolved={() => navigateToManage({ service: 'Parqueadero', status: 'resuelto' })}
                            onPressInProgress={() => navigateToManage({ service: 'Parqueadero', status: 'en_progreso' })}
                            onPressPending={() => navigateToManage({ service: 'Parqueadero', status: 'pendiente' })}
                            onPressRejected={() => navigateToManage({ service: 'Parqueadero', status: 'rechazado' })}
                          />
                          <SegmentedCategoryBar 
                            label="Salas de Juntas" 
                            icon="easel" 
                            total={categoryBreakdown.rooms.total} 
                            resolved={categoryBreakdown.rooms.resolved}
                            inProgress={categoryBreakdown.rooms.inProgress}
                            pending={categoryBreakdown.rooms.pending}
                            rejected={categoryBreakdown.rooms.rejected}
                            onPressCategory={() => navigateToManage({ service: 'Salas' })}
                            onPressResolved={() => navigateToManage({ service: 'Salas', status: 'resuelto' })}
                            onPressInProgress={() => navigateToManage({ service: 'Salas', status: 'en_progreso' })}
                            onPressPending={() => navigateToManage({ service: 'Salas', status: 'pendiente' })}
                            onPressRejected={() => navigateToManage({ service: 'Salas', status: 'rechazado' })}
                          />
                          <SegmentedCategoryBar 
                            label="Transporte Oficial" 
                            icon="car-sport" 
                            total={categoryBreakdown.transport.total} 
                            resolved={categoryBreakdown.transport.resolved}
                            inProgress={categoryBreakdown.transport.inProgress}
                            pending={categoryBreakdown.transport.pending}
                            rejected={categoryBreakdown.transport.rejected}
                            onPressCategory={() => navigateToManage({ service: 'Transporte' })}
                            onPressResolved={() => navigateToManage({ service: 'Transporte', status: 'resuelto' })}
                            onPressInProgress={() => navigateToManage({ service: 'Transporte', status: 'en_progreso' })}
                            onPressPending={() => navigateToManage({ service: 'Transporte', status: 'pendiente' })}
                            onPressRejected={() => navigateToManage({ service: 'Transporte', status: 'rechazado' })}
                          />
                        </View>
                      </View>

                      {/* Columna 3: KPIs Clásicos */}
                      <View style={[{ gap: 15 }, isDesktop ? { flex: 1, justifyContent: 'space-between' } : { flex: undefined }]}>
                        <KPICard 
                          label="Efectividad" 
                          value={`${stats.effectiveness}%`} 
                          color={COLORS.success} 
                          icon="trending-up" 
                          trend="+2.4% este período" 
                          onPress={() => navigateToManage({ status: 'resuelto', service: 'Todas' })}
                        />
                        <KPICard 
                          label="Pendientes de Atención" 
                          value={stats.pending.toString()} 
                          color={COLORS.warning} 
                          icon="hourglass" 
                          trend="Requieren acción" 
                          onPress={() => navigateToManage({ status: 'pendiente', service: 'Todas' })}
                        />
                        <KPICard 
                          label="Total Requerimientos" 
                          value={stats.total.toString()} 
                          color={COLORS.accent} 
                          icon="folder-open" 
                          trend="Registrados en sistema" 
                          onPress={() => navigateToManage({ status: 'Todos', service: 'Todas' })}
                        />
                      </View>
                    </View>

                    {/* Estado del Flujo de Procesos */}
                    <View style={styles.card}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={styles.cardTitle}>Embudo de Solicitudes Administrativas</Text>
                        <Text style={{ fontSize: 11, color: COLORS.muted, fontStyle: 'italic' }}>Clic en un estado para filtrar</Text>
                      </View>
                      <Text style={[styles.cardSubtitle, { marginBottom: 15 }]}>Estado general del ciclo de vida de los trámites</Text>
                      
                      <View style={styles.statesRow}>
                        <StateWidget 
                          label="Pendiente" 
                          count={stats.pending} 
                          color={COLORS.warning} 
                          icon="alert-circle-outline" 
                          bg={COLORS.warningSoft} 
                          onPress={() => navigateToManage({ status: 'pendiente', service: 'Todas' })}
                        />
                        <StateWidget 
                          label="En Progreso" 
                          count={stats.inProgress} 
                          color={COLORS.accent} 
                          icon="sync-outline" 
                          bg={COLORS.accentLight} 
                          onPress={() => navigateToManage({ status: 'en_progreso', service: 'Todas' })}
                        />
                        <StateWidget 
                          label="Resuelto" 
                          count={stats.resolved} 
                          color={COLORS.success} 
                          icon="checkmark-done-circle-outline" 
                          bg={COLORS.successSoft} 
                          onPress={() => navigateToManage({ status: 'resuelto', service: 'Todas' })}
                        />
                        <StateWidget 
                          label="Rechazado" 
                          count={stats.rejected} 
                          color={COLORS.danger} 
                          icon="close-circle-outline" 
                          bg={COLORS.dangerSoft} 
                          onPress={() => navigateToManage({ status: 'rechazado', service: 'Todas' })}
                        />
                      </View>
                    </View>

                    {/* Fila Ampliada: Criticidad Global y Capacidad Operativa */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      {/* Distribución por Nivel de Criticidad */}
                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardTitle}>Nivel de Criticidad Global</Text>
                        <Text style={styles.cardSubtitle}>Distribución de solicitudes según prioridad de atención (clic para ver solicitudes)</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          <CategoryProgress 
                            label="Prioridad Alta (Urgente)" 
                            count={stats.highPriority} 
                            total={stats.criticalityTotal} 
                            color={COLORS.danger} 
                            onPress={() => navigateToManage({ priority: 'Alta', status: 'Todos', service: 'Todas' })}
                          />
                          <CategoryProgress 
                            label="Prioridad Media (Ordinaria)" 
                            count={stats.mediumPriority} 
                            total={stats.criticalityTotal} 
                            color={COLORS.accent} 
                            onPress={() => navigateToManage({ priority: 'Media', status: 'Todos', service: 'Todas' })}
                          />
                          <CategoryProgress 
                            label="Prioridad Baja (Preventiva)" 
                            count={stats.lowPriority} 
                            total={stats.criticalityTotal} 
                            color={COLORS.muted} 
                            onPress={() => navigateToManage({ priority: 'Baja', status: 'Todos', service: 'Todas' })}
                          />
                        </View>
                        
                        <TouchableOpacity 
                          style={[styles.infoAlertBox, { marginTop: 20, cursor: 'pointer' } as any]}
                          activeOpacity={0.75}
                          onPress={() => navigateToManage({ priority: 'Alta', status: 'resuelto', service: 'Todas' })}
                        >
                          <Ionicons name="information-circle-outline" size={22} color={COLORS.accent} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={styles.infoAlertTitle}>Atención Oportuna</Text>
                              <Text style={{ fontSize: 10, color: COLORS.accent, fontWeight: '800' }}>VER CASOS →</Text>
                            </View>
                            <Text style={styles.infoAlertDesc}>
                              {stats.highResolved} de {stats.highPriority} casos de alta prioridad han sido resueltos satisfactoriamente.
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>

                      {/* Indicadores Clave de Capacidad Operativa */}
                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Capacidad y Demanda de Servicios</Text>
                        <Text style={styles.cardSubtitle}>Resumen ejecutivo de atención por servicio en el periodo</Text>
                        
                        <View style={styles.miniCardGrid}>
                          <TouchableOpacity 
                            style={[styles.miniInfoCard, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ service: 'Visitantes' })}
                          >
                            <Ionicons name="people" size={20} color={COLORS.danger} />
                            <Text style={styles.miniInfoCardValue}>{visitorStats.totalVisitors}</Text>
                            <Text style={styles.miniInfoCardLabel}>Visitantes</Text>
                            <Text style={styles.miniInfoCardSub}>{visitorStats.vehicularEntries} accesos con vehículo</Text>
                            <Text style={{ fontSize: 10, color: COLORS.danger, fontWeight: '700', marginTop: 4 }}>Ver módulo →</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={[styles.miniInfoCard, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ service: 'Mantenimiento', status: 'pendiente' })}
                          >
                            <Ionicons name="construct" size={20} color={COLORS.accent} />
                            <Text style={styles.miniInfoCardValue}>{maintenanceStats.inProgress + maintenanceStats.pending}</Text>
                            <Text style={styles.miniInfoCardLabel}>Averías Activas</Text>
                            <Text style={styles.miniInfoCardSub}>{maintenanceStats.resolved} ya solucionadas</Text>
                            <Text style={{ fontSize: 10, color: COLORS.warning, fontWeight: '700', marginTop: 4 }}>Ver pendientes →</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={[styles.miniInfoCard, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ service: 'Parqueadero' })}
                          >
                            <Ionicons name="car" size={20} color={COLORS.purple} />
                            <Text style={styles.miniInfoCardValue}>{parkingStats.approved}</Text>
                            <Text style={styles.miniInfoCardLabel}>Cupos Parqueadero</Text>
                            <Text style={styles.miniInfoCardSub}>{parkingStats.occupancyRate}% tasa de ocupación</Text>
                            <Text style={{ fontSize: 10, color: COLORS.purple, fontWeight: '700', marginTop: 4 }}>Ver módulo →</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={[styles.miniInfoCard, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ service: 'Transporte' })}
                          >
                            <Ionicons name="car-sport" size={20} color={COLORS.success} />
                            <Text style={styles.miniInfoCardValue}>{transportStats.totalRequests}</Text>
                            <Text style={styles.miniInfoCardLabel}>Misiones Flota</Text>
                            <Text style={styles.miniInfoCardSub}>{transportStats.totalPassengers} funcionarios movilizados</Text>
                            <Text style={{ fontSize: 10, color: COLORS.success, fontWeight: '700', marginTop: 4 }}>Ver módulo →</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Panel de Satisfacción de Usuarios y Calidad de Servicio (CSAT) */}
                    <View style={[styles.card, { width: '100%' }]}>
                      <View style={styles.cardSectionHeader}>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.cardTitle}>Satisfacción de Usuarios y Calidad de Servicio</Text>
                            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>CSAT INSTITUCIONAL</Text>
                            </View>
                          </View>
                          <Text style={styles.cardSubtitle}>
                            Percepción, calificaciones y retroalimentación de los funcionarios al cierre de sus requerimientos
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line }}>
                            <Ionicons name="sparkles" size={14} color="#D97706" />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primary }}>
                              {stats.favorablePercent}% Favorable (4-5★)
                            </Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.cardSectionAction} 
                            onPress={() => handleGenerateReport('satisfaction')}
                          >
                            <Ionicons name="print-outline" size={14} color={COLORS.accent} />
                            <Text style={styles.cardSectionActionText}>Reporte CSAT</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Contenido en 3 columnas en desktop */}
                      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20, marginTop: 10 }}>
                        
                        {/* Columna 1: Puntuación Global Promedio */}
                        <View style={{ flex: 1, backgroundColor: COLORS.bg, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                            CALIFICACIÓN PROMEDIO
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                            <Text style={{ fontSize: 44, fontWeight: '900', color: COLORS.primary }}>
                              {stats.averageRating > 0 ? stats.averageRating : '—'}
                            </Text>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.muted }}>/ 5.0</Text>
                          </View>

                          {/* Estrellas */}
                          <View style={{ flexDirection: 'row', gap: 4, marginVertical: 10 }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons 
                                key={star} 
                                name={stats.averageRating >= star ? 'star' : stats.averageRating >= star - 0.5 ? 'star-half' : 'star-outline'} 
                                size={22} 
                                color="#D97706" 
                              />
                            ))}
                          </View>

                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primarySoft, textAlign: 'center' }}>
                            Basado en {stats.totalEvaluated} {stats.totalEvaluated === 1 ? 'evaluación recibida' : 'evaluaciones recibidas'}
                          </Text>
                          <View style={{ marginTop: 12, backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted }}>
                              Tasa de respuesta: <Text style={{ color: COLORS.accent, fontWeight: '900' }}>{stats.responseRate}%</Text> de resueltos
                            </Text>
                          </View>
                        </View>

                        {/* Columna 2: Distribución por Estrellas (5★ a 1★) */}
                        <View style={{ flex: 1.2, backgroundColor: COLORS.bg, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.line, justifyContent: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primarySoft, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            DISTRIBUCIÓN DE CALIFICACIONES
                          </Text>
                          <View style={{ gap: 10 }}>
                            {[5, 4, 3, 2, 1].map((n) => {
                              const count = stats.ratingCounts[n] || 0;
                              const pct = stats.totalEvaluated > 0 ? Math.round((count / stats.totalEvaluated) * 100) : 0;
                              return (
                                <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', width: 36, gap: 2 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primary }}>{n}</Text>
                                    <Ionicons name="star" size={12} color="#D97706" />
                                  </View>
                                  <View style={{ flex: 1, height: 10, backgroundColor: COLORS.white, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line }}>
                                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: n >= 4 ? COLORS.success : n === 3 ? COLORS.warning : COLORS.danger, borderRadius: 5 }} />
                                  </View>
                                  <Text style={{ width: 50, fontSize: 11, fontWeight: '700', color: COLORS.muted, textAlign: 'right' }}>
                                    {count} ({pct}%)
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>

                        {/* Columna 3: Calificación por Módulo */}
                        <View style={{ flex: 1.3, backgroundColor: COLORS.bg, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.line }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primarySoft, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            SATISFACCIÓN POR ÁREA OPERATIVA
                          </Text>
                          <View style={{ gap: 8 }}>
                            {[
                              { key: 'visitors', name: 'Control de Acceso', icon: 'people', color: COLORS.danger },
                              { key: 'maintenance', name: 'Mantenimiento Locativo', icon: 'construct', color: COLORS.accent },
                              { key: 'parking', name: 'Cupo de Parqueadero', icon: 'car', color: COLORS.purple },
                              { key: 'rooms', name: 'Reserva de Salas', icon: 'easel', color: COLORS.warning },
                              { key: 'transport', name: 'Transporte Oficial', icon: 'car-sport', color: COLORS.success },
                            ].filter(mod => isEvalActive(mod.key)).map((mod) => {
                              const modData = (stats.moduleEvaluations as any)[mod.key];
                              const avg = modData?.avg || 0;
                              const count = modData?.count || 0;
                              return (
                                <View key={mod.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                    <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: `${mod.color}15`, justifyContent: 'center', alignItems: 'center' }}>
                                      <Ionicons name={mod.icon as any} size={13} color={mod.color} />
                                    </View>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }} numberOfLines={1}>
                                      {mod.name}
                                    </Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    {count > 0 ? (
                                      <>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                          <Ionicons name="star" size={11} color="#D97706" />
                                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>{avg.toFixed(1)}</Text>
                                        </View>
                                        <Text style={{ fontSize: 10, color: COLORS.muted, fontWeight: '600' }}>({count})</Text>
                                      </>
                                    ) : (
                                      <Text style={{ fontSize: 10, color: COLORS.muted, fontStyle: 'italic' }}>Sin calificar</Text>
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </View>

                      </View>

                      {/* Opiniones y Comentarios Cualitativos de Funcionarios */}
                      <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="chatbubbles-outline" size={16} color={COLORS.primary} />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.primary }}>
                              Retroalimentación y Comentarios de Servidores
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: COLORS.muted, fontWeight: '600' }}>
                            {stats.recentEvaluations.length} {stats.recentEvaluations.length === 1 ? 'opinión registrada' : 'opiniones registradas'}
                          </Text>
                        </View>

                        {stats.recentEvaluations.length > 0 ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            {stats.recentEvaluations.map((item, idx) => {
                              const modMeta = getModuleMeta(item.category);
                              const evalData = item.metadata?.evaluation;
                              return (
                                <TouchableOpacity 
                                  key={item.id || idx} 
                                  style={{ 
                                    flex: 1, 
                                    minWidth: isDesktop ? 280 : '100%', 
                                    backgroundColor: COLORS.bg, 
                                    borderRadius: 14, 
                                    padding: 14, 
                                    borderWidth: 1, 
                                    borderColor: COLORS.line,
                                    gap: 8,
                                    cursor: 'pointer' as any
                                  }}
                                  activeOpacity={0.75}
                                  onPress={() => navigateToManage({ id: item.id })}
                                >
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: `${modMeta.color}15`, justifyContent: 'center', alignItems: 'center' }}>
                                        <Ionicons name={modMeta.icon as any} size={12} color={modMeta.color} />
                                      </View>
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: modMeta.color }}>{modMeta.name}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Ionicons 
                                          key={s} 
                                          name={evalData?.rating >= s ? 'star' : 'star-outline'} 
                                          size={11} 
                                          color="#D97706" 
                                        />
                                      ))}
                                    </View>
                                  </View>

                                  <Text style={{ fontSize: 12, color: COLORS.text, fontStyle: 'italic', lineHeight: 17 }} numberOfLines={3}>
                                    "{evalData?.comment}"
                                  </Text>

                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 6, marginTop: 2 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.muted }} numberOfLines={1}>
                                      {item.profiles?.full_name || 'Servidor Público'}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Text style={{ fontSize: 10, color: COLORS.muted }}>
                                        {formatDisplayDate(evalData?.date || item.created_at)}
                                      </Text>
                                      <Ionicons name="open-outline" size={11} color={COLORS.accent} />
                                    </View>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ) : (
                          <View style={{ backgroundColor: COLORS.bg, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.line }}>
                            <Ionicons name="chatbox-ellipses-outline" size={22} color={COLORS.muted} style={{ marginBottom: 6 }} />
                            <Text style={{ fontSize: 12, color: COLORS.muted, fontWeight: '600' }}>
                              No se registran observaciones textuales en las calificaciones de este periodo.
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Tabla de Requerimientos Institucionales Recientes */}
                    <View style={[styles.card, { width: '100%' }]}>
                      <View style={styles.cardSectionHeader}>
                        <View>
                          <Text style={styles.cardTitle}>Auditoría de Requerimientos Recientes</Text>
                          <Text style={styles.cardSubtitle}>Muestra de las últimas solicitudes tramitadas (clic en cualquier fila para abrir el modal detallado)</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          <TouchableOpacity 
                            style={[styles.cardSectionAction, { backgroundColor: '#3B82F615', borderColor: '#3B82F635' }]} 
                            onPress={() => navigateToManage({ status: 'Todos', service: 'Todas' })}
                          >
                            <Ionicons name="layers-outline" size={14} color={COLORS.accent} />
                            <Text style={styles.cardSectionActionText}>Gestionar Solicitudes</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                            <Ionicons name="document-text-outline" size={14} color={COLORS.accent} />
                            <Text style={styles.cardSectionActionText}>Ver Reporte Oficial</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : 940 }}>
                          <View style={[styles.tableHeaderRowDark, { width: '100%' }]}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 145 }]}>MÓDULO</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 2, minWidth: 200 }]}>ASUNTO / DETALLE</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1.2, minWidth: 150 }]}>SOLICITANTE</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95, textAlign: 'center' }]}>PRIORIDAD</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>ESTADO</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>CALIFICACIÓN</Text>
                          </View>

                          {stats.recentGlobal.length > 0 ? (
                            stats.recentGlobal.map((req, idx) => {
                              const meta = getModuleMeta(req.category);
                              const evalRating = req.metadata?.evaluation?.rating;
                              return (
                                <TouchableOpacity 
                                  key={req.id || idx} 
                                  style={[styles.tableRowDark, { width: '100%', cursor: 'pointer' } as any]}
                                  activeOpacity={0.75}
                                  onPress={() => navigateToManage({ id: req.id })}
                                >
                                  <Text style={[styles.tableCellTxt, { width: 95 }]}>{formatDisplayDate(req.created_at)}</Text>
                                  <View style={{ width: 145, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name={meta.icon as any} size={14} color={meta.color} />
                                    <Text style={[styles.tableCellTxtBold, { fontSize: 11 }]}>{meta.name}</Text>
                                  </View>
                                  <Text style={[styles.tableCellTxt, { flex: 2, minWidth: 200 }]} numberOfLines={1}>
                                    {req.title || 'Solicitud administrativa'}
                                  </Text>
                                  <Text style={[styles.tableCellTxt, { flex: 1.2, minWidth: 150 }]} numberOfLines={1}>
                                    {req.profiles?.full_name || req.profiles?.dependency?.name || 'Funcionario'}
                                  </Text>
                                  <View style={{ width: 95, alignItems: 'center', justifyContent: 'center' }}>
                                    <PriorityBadge priority={req.priority} />
                                  </View>
                                  <View style={{ width: 110, alignItems: 'center', justifyContent: 'center' }}>
                                    <StatusBadge status={req.status} />
                                  </View>
                                  <View style={{ width: 110, alignItems: 'center', justifyContent: 'center' }}>
                                    {isEvalActive(req.category) ? (
                                      <RatingBadge rating={evalRating} status={req.status} />
                                    ) : (
                                      <Text style={{ fontSize: 11, color: COLORS.muted }}>—</Text>
                                    )}
                                  </View>
                                </TouchableOpacity>
                              );
                            })
                          ) : (
                            <Text style={styles.noDataText}>No hay solicitudes registradas en el periodo</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* --- TAB VISITANTES AMPLIADO --- */}
                {activeTab === 'visitors' && (
                  <View style={{ gap: 25 }}>
                    <View style={styles.kpiRow}>
                      <KPICard label="Total Visitantes" value={visitorStats.totalVisitors.toString()} color={COLORS.danger} icon="people" trend="Externos autorizados" onPress={() => navigateToManage({ service: 'Visitantes' })} />
                      <KPICard label="Ingresos Vehiculares" value={visitorStats.vehicularEntries.toString()} color={COLORS.accent} icon="car" trend="Vehículos con placa" onPress={() => navigateToManage({ service: 'Visitantes' })} />
                      <KPICard label="Trámites Creados" value={visitorStats.totalRequests.toString()} color={COLORS.purple} icon="shield-checkmark" trend="Solicitudes formales" onPress={() => navigateToManage({ service: 'Visitantes' })} />
                      <KPICard label="Promedio por Visita" value={`${visitorStats.avgVisitorsPerRequest} pers.`} color={COLORS.success} icon="person-add" trend="Aforo por solicitud" />
                    </View>

                    {/* Calidad y Satisfacción del Módulo */}
                    {isEvalActive('visitors') && (
                      <ModuleCSATCard 
                        moduleName="Control de Acceso y Visitantes" 
                        category="visitors" 
                        stats={stats} 
                        color={COLORS.danger} 
                        onPressComment={(id) => navigateToManage({ id })}
                      />
                    )}

                    {/* 2 Columnas: Dependencias Receptoras y Modalidad de Acceso */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Dependencias Receptoras de Visitas</Text>
                        <Text style={styles.cardSubtitle}>Áreas institucionales con mayor volumen de visitas autorizadas</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          {visitorStats.departments.length > 0 ? (
                            visitorStats.departments.slice(0, 6).map((dep, idx) => (
                              <RankProgress key={idx} name={dep.name} count={dep.count} max={visitorStats.departments[0].count} color={COLORS.danger} index={idx + 1} onPress={() => navigateToManage({ service: 'Visitantes' })} />
                            ))
                          ) : (
                            <Text style={styles.noDataText}>No se registran visitas en el periodo</Text>
                          )}
                        </View>
                      </View>

                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardTitle}>Modalidad de Ingreso y Seguridad</Text>
                        <Text style={styles.cardSubtitle}>Discriminación de accesos peatonales vs vehiculares</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          <CategoryProgress label="Ingreso Peatonal" count={visitorStats.pedestrianEntries} total={visitorStats.totalVisitors} color={COLORS.purple} suffix=" personas" onPress={() => navigateToManage({ service: 'Visitantes' })} />
                          <CategoryProgress label="Ingreso Vehicular con Placa" count={visitorStats.vehicularEntries} total={visitorStats.totalVisitors} color={COLORS.accent} suffix=" vehículos" onPress={() => navigateToManage({ service: 'Visitantes' })} />
                        </View>

                        <View style={[styles.infoAlertBox, { marginTop: 24 }]}>
                          <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.success} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.infoAlertTitle}>Protocolos de Seguridad Física</Text>
                            <Text style={styles.infoAlertDesc}>
                              100% de los visitantes externos registrados con documento oficial, verificación en minuta digital y entrega de escarapela distrital.
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Tabla Detallada de Ingresos Recientes */}
                    <View style={styles.card}>
                      <View style={styles.cardSectionHeader}>
                        <View>
                          <Text style={styles.cardTitle}>Registro Detallado de Ingresos Recientes</Text>
                          <Text style={styles.cardSubtitle}>Historial de visitas (clic en cualquier fila para abrir el modal detallado)</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          <TouchableOpacity 
                            style={[styles.cardSectionAction, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]} 
                            onPress={() => navigateToManage({ service: 'Visitantes' })}
                          >
                            <Ionicons name="open-outline" size={14} color={COLORS.danger} />
                            <Text style={[styles.cardSectionActionText, { color: COLORS.danger }]}>Ver en Solicitudes</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                            <Ionicons name="print-outline" size={14} color={COLORS.accent} />
                            <Text style={styles.cardSectionActionText}>Imprimir Reporte</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : (isEvalActive('visitors') ? 890 : 780) }}>
                          <View style={styles.tableHeaderRowDark}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1, minWidth: 180 }]}>ASUNTO / MOTIVO</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 180 }]}>DEPENDENCIA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 90, textAlign: 'center' }]}>PERSONAS</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>MODALIDAD</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>ESTADO</Text>
                            {isEvalActive('visitors') && (
                              <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>CALIFICACIÓN</Text>
                            )}
                          </View>

                          {visitorStats.recentList.length > 0 ? (
                            visitorStats.recentList.map((r, idx) => (
                              <TouchableOpacity 
                                key={r.id || idx} 
                                style={[styles.tableRowDark, { cursor: 'pointer' } as any]}
                                activeOpacity={0.75}
                                onPress={() => navigateToManage({ id: r.id })}
                              >
                                <Text style={[styles.tableCellTxt, { width: 95 }]}>{formatDisplayDate(r.created_at)}</Text>
                                <Text style={[styles.tableCellTxtBold, { flex: 1, minWidth: 180 }]} numberOfLines={1}>{r.title || 'Visita institucional'}</Text>
                                <Text style={[styles.tableCellTxt, { width: 180 }]} numberOfLines={1}>{r.metadata?.responsible?.dependency || r.profiles?.dependency?.name || 'General'}</Text>
                                <Text style={[styles.tableCellTxt, { width: 90, textAlign: 'center', fontWeight: '800' }]}>{r.metadata?.visitors?.length || 1}</Text>
                                <View style={{ width: 110, alignItems: 'center' }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name={r.metadata?.hasVehicle ? "car" : "walk"} size={14} color={r.metadata?.hasVehicle ? COLORS.accent : COLORS.muted} />
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.text }}>{r.metadata?.hasVehicle ? 'Vehicular' : 'Peatonal'}</Text>
                                  </View>
                                </View>
                                <View style={{ width: 110, alignItems: 'center' }}>
                                  <StatusBadge status={r.status} />
                                </View>
                                {isEvalActive('visitors') && (
                                  <View style={{ width: 110, alignItems: 'center', justifyContent: 'center' }}>
                                    <RatingBadge rating={r.metadata?.evaluation?.rating} status={r.status} />
                                  </View>
                                )}
                              </TouchableOpacity>
                            ))
                          ) : (
                            <Text style={styles.noDataText}>No hay visitas registradas</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* --- TAB MANTENIMIENTO AMPLIADO --- */}
                {activeTab === 'maintenance' && (
                  <View style={{ gap: 25 }}>
                    {/* Alertas de criticidad */}
                    {maintenanceStats.highPriorityPending > 0 && (
                      <TouchableOpacity 
                        style={[styles.dangerAlertBox, { cursor: 'pointer' } as any]}
                        activeOpacity={0.8}
                        onPress={() => navigateToManage({ service: 'Mantenimiento', priority: 'Alta', status: 'pendiente' })}
                      >
                        <Ionicons name="warning" size={26} color={COLORS.danger} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.dangerAlertTitle}>Incidentes Críticos Pendientes</Text>
                            <Text style={{ fontSize: 10, color: COLORS.danger, fontWeight: '800' }}>VER SOLICITUDES →</Text>
                          </View>
                          <Text style={styles.dangerAlertDesc}>
                            Hay {maintenanceStats.highPriorityPending} reporte(s) de prioridad **ALTA** en espera de atención técnica. Requieren asignación inmediata.
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    <View style={styles.kpiRow}>
                      <KPICard label="En Curso" value={maintenanceStats.inProgress.toString()} color={COLORS.accent} icon="construct" trend="Técnicos asignados" onPress={() => navigateToManage({ service: 'Mantenimiento', status: 'en_progreso' })} />
                      <KPICard label="Pendientes" value={maintenanceStats.pending.toString()} color={COLORS.warning} icon="time" trend="Por asignar" onPress={() => navigateToManage({ service: 'Mantenimiento', status: 'pendiente' })} />
                      <KPICard label="Finalizados" value={maintenanceStats.resolved.toString()} color={COLORS.success} icon="checkmark-circle" trend="Solucionados" onPress={() => navigateToManage({ service: 'Mantenimiento', status: 'resuelto' })} />
                      <KPICard label="Tasa de Solución" value={`${maintenanceStats.effectivenessRate}%`} color={COLORS.purple} icon="speedometer" trend="Efectividad técnica" />
                    </View>

                    {/* Calidad y Satisfacción del Módulo */}
                    {isEvalActive('maintenance') && (
                      <ModuleCSATCard 
                        moduleName="Mantenimiento Locativo" 
                        category="maintenance" 
                        stats={stats} 
                        color={COLORS.accent} 
                        onPressComment={(id) => navigateToManage({ id })}
                      />
                    )}

                    {/* Fila 2 columnas: Pipeline y Especialidades Técnicas */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardTitle}>Manejo de Estados de Incidentes</Text>
                        <Text style={styles.cardSubtitle}>Pipeline de control y seguimiento de órdenes (clic para filtrar)</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          <CategoryProgress label="Pendiente de Revisión (Inicial)" count={maintenanceStats.pending} total={maintenanceStats.total} color={COLORS.warning} onPress={() => navigateToManage({ service: 'Mantenimiento', status: 'pendiente' })} />
                          <CategoryProgress label="En Curso / Técnico Asignado" count={maintenanceStats.inProgress} total={maintenanceStats.total} color={COLORS.accent} onPress={() => navigateToManage({ service: 'Mantenimiento', status: 'en_progreso' })} />
                          <CategoryProgress label="Finalizado y Validado (Cerrado)" count={maintenanceStats.resolved} total={maintenanceStats.total} color={COLORS.success} onPress={() => navigateToManage({ service: 'Mantenimiento', status: 'resuelto' })} />
                          <CategoryProgress label="Rechazado / No Aplica" count={maintenanceStats.rejected} total={maintenanceStats.total} color={COLORS.danger} onPress={() => navigateToManage({ service: 'Mantenimiento', status: 'rechazado' })} />
                        </View>
                      </View>

                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Especialidades y Tipos de Daño</Text>
                        <Text style={styles.cardSubtitle}>Clasificación técnica de los incidentes reportados</Text>
                        
                        <View style={{ gap: 16, marginTop: 22 }}>
                          {maintenanceStats.specialties.map((sp, idx) => (
                            <CategoryProgress 
                              key={idx} 
                              label={sp.name} 
                              count={sp.count} 
                              total={maintenanceStats.total} 
                              color={COLORS.accent} 
                              onPress={() => navigateToManage({ service: 'Mantenimiento' })}
                            />
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Pisos y Áreas con Mayor Daño */}
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Frecuencia de Daños por Piso / Área</Text>
                      <Text style={styles.cardSubtitle}>Zonas físicas con mayor reporte de incidencias técnicas en la sede</Text>
                      
                      <View style={{ gap: 18, marginTop: 22 }}>
                        {maintenanceStats.locations.length > 0 ? (
                          maintenanceStats.locations.slice(0, 6).map((loc, idx) => (
                            <RankProgress 
                              key={idx} 
                              name={`Piso / Área: ${loc.name}`} 
                              count={loc.count} 
                              max={maintenanceStats.locations[0].count} 
                              color={COLORS.success} 
                              index={idx + 1} 
                              onPress={() => navigateToManage({ service: 'Mantenimiento' })}
                            />
                          ))
                        ) : (
                          <Text style={styles.noDataText}>No se registran daños en el periodo</Text>
                        )}
                      </View>
                    </View>

                    {/* Tabla Detallada de Órdenes Técnicas */}
                    <View style={styles.card}>
                      <View style={styles.cardSectionHeader}>
                        <View>
                          <Text style={styles.cardTitle}>Órdenes de Trabajo y Mantenimiento Técnico</Text>
                          <Text style={styles.cardSubtitle}>Seguimiento individual (clic en cualquier fila para abrir el modal detallado)</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          <TouchableOpacity 
                            style={[styles.cardSectionAction, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]} 
                            onPress={() => navigateToManage({ service: 'Mantenimiento' })}
                          >
                            <Ionicons name="open-outline" size={14} color={COLORS.accent} />
                            <Text style={styles.cardSectionActionText}>Ver en Solicitudes</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                            <Ionicons name="print-outline" size={14} color={COLORS.accent} />
                            <Text style={styles.cardSectionActionText}>Imprimir Reporte</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : (isEvalActive('maintenance') ? 910 : 800) }}>
                          <View style={styles.tableHeaderRowDark}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1, minWidth: 200 }]}>INCIDENCIA / DAÑO</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 160 }]}>UBICACIÓN</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 90, textAlign: 'center' }]}>PRIORIDAD</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 140 }]}>SOLICITANTE</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>ESTADO</Text>
                            {isEvalActive('maintenance') && (
                              <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>CALIFICACIÓN</Text>
                            )}
                          </View>

                          {maintenanceStats.recentList.length > 0 ? (
                            maintenanceStats.recentList.map((r, idx) => (
                              <TouchableOpacity 
                                key={r.id || idx} 
                                style={[styles.tableRowDark, { cursor: 'pointer' } as any]}
                                activeOpacity={0.75}
                                onPress={() => navigateToManage({ id: r.id })}
                              >
                                <Text style={[styles.tableCellTxt, { width: 95 }]}>{formatDisplayDate(r.created_at)}</Text>
                                <Text style={[styles.tableCellTxtBold, { flex: 1, minWidth: 200 }]} numberOfLines={1}>{r.title || 'Mantenimiento locativo'}</Text>
                                <Text style={[styles.tableCellTxt, { width: 160 }]} numberOfLines={1}>{r.metadata?.location || 'General'}</Text>
                                <View style={{ width: 90, alignItems: 'center' }}>
                                  <PriorityBadge priority={r.priority} />
                                </View>
                                <Text style={[styles.tableCellTxt, { width: 140 }]} numberOfLines={1}>{r.profiles?.full_name || 'Funcionario'}</Text>
                                <View style={{ width: 110, alignItems: 'center' }}>
                                  <StatusBadge status={r.status} />
                                </View>
                                {isEvalActive('maintenance') && (
                                  <View style={{ width: 110, alignItems: 'center', justifyContent: 'center' }}>
                                    <RatingBadge rating={r.metadata?.evaluation?.rating} status={r.status} />
                                  </View>
                                )}
                              </TouchableOpacity>
                            ))
                          ) : (
                            <Text style={styles.noDataText}>No hay órdenes técnicas en el periodo</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* --- TAB PARQUEADERO AMPLIADO: CONTROL INTEGRAL DE CELDAS Y VEHÍCULOS --- */}
                {activeTab === 'parking' && (
                  <View style={{ gap: 25 }}>
                    {/* KPIs de Ocupación y Control */}
                    <View style={styles.kpiRow}>
                      <KPICard 
                        label="Celdas Totales" 
                        value={parkingStats.totalSpots.toString()} 
                        color={COLORS.primary} 
                        icon="grid" 
                        trend="Inventario físico" 
                        onPress={() => router.push('/admin/settings')} 
                      />
                      <KPICard 
                        label="Disponibles" 
                        value={parkingStats.availableSpots.toString()} 
                        color={COLORS.success} 
                        icon="checkmark-circle" 
                        trend="Listas para uso" 
                        onPress={() => setParkingFilterType('spots')} 
                      />
                      <KPICard 
                        label="Ocupadas / Asignadas" 
                        value={parkingStats.assignedSpots.toString()} 
                        color={COLORS.accent} 
                        icon="lock-closed" 
                        trend="En uso actual" 
                        onPress={() => setParkingFilterType('spots')} 
                      />
                      <KPICard 
                        label="Celdas Fijas" 
                        value={parkingStats.fixedSpots.toString()} 
                        color="#2563EB" 
                        icon="person-pin" 
                        trend="Asignadas a personas" 
                        onPress={() => setParkingFilterType('fixed')} 
                      />
                      <KPICard 
                        label="Celdas Uso Libre" 
                        value={parkingStats.freeSpots.toString()} 
                        color={COLORS.purple} 
                        icon="refresh" 
                        trend="Parqueo rotativo" 
                        onPress={() => setParkingFilterType('free')} 
                      />
                      <KPICard 
                        label="Tasa de Ocupación" 
                        value={`${parkingStats.occupancyRate}%`} 
                        color={COLORS.warning} 
                        icon="pie-chart" 
                        trend="Capacidad sótanos" 
                      />
                    </View>

                    {/* PANEL DE CONTROL, FILTROS Y ORDENAMIENTO DE PARQUEADERO */}
                    <View style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 18,
                      padding: 18,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      gap: 14
                    }}>
                      {/* Fila 1: Filtro de Vistas y Buscador */}
                      <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'stretch', gap: 12 }}>
                        {/* Selector de Sección */}
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.muted }}>SECCIÓN:</Text>
                          {[
                            { id: 'all', label: 'Todo el Módulo', icon: 'grid-outline' },
                            { id: 'spots', label: `Celdas (${parkingStats.totalSpots})`, icon: 'car-outline' },
                            { id: 'fixed', label: `Celda Fija (${(parkingStats.fixedCellVehicles || []).length})`, icon: 'person-pin-outline' },
                            { id: 'free', label: `Uso Libre (${(parkingStats.freeUseVehicles || []).length})`, icon: 'refresh-outline' }
                          ].map(f => {
                            const active = parkingFilterType === f.id;
                            return (
                              <TouchableOpacity
                                key={f.id}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 5,
                                  paddingHorizontal: 12,
                                  paddingVertical: 7,
                                  borderRadius: 10,
                                  backgroundColor: active ? COLORS.primary : '#F8FAFC',
                                  borderWidth: 1,
                                  borderColor: active ? COLORS.primary : '#E2E8F0'
                                }}
                                onPress={() => setParkingFilterType(f.id as any)}
                              >
                                <Ionicons name={f.icon as any} size={14} color={active ? '#FFFFFF' : COLORS.muted} />
                                <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#FFFFFF' : COLORS.primary }}>
                                  {f.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Buscador Rápido por Placa, Cédula o Nombre */}
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#F8FAFC',
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          width: isDesktop ? 280 : '100%',
                          height: 38
                        }}>
                          <Ionicons name="search" size={16} color={COLORS.muted} />
                          <TextInput 
                            placeholder="Buscar por placa, titular, celda..."
                            value={parkingSearch}
                            onChangeText={setParkingSearch}
                            style={{ flex: 1, marginLeft: 8, fontSize: 12, color: COLORS.primary, outlineStyle: 'none' } as any}
                          />
                          {parkingSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setParkingSearch('')}>
                              <Ionicons name="close-circle" size={16} color={COLORS.muted} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Fila 2: Filtros de Celdas Fijas/Variables, Tipo Carro/Moto y Ordenamiento por Placa */}
                      <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'stretch', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: isDesktop ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                          {/* Filtro Celdas Fijas / Variables */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.muted }}>MODALIDAD:</Text>
                            {[
                              { id: 'all', label: 'Todas' },
                              { id: 'fija', label: '📌 Celdas Fijas' },
                              { id: 'libre', label: '🔄 Variables / Libres' },
                            ].map(f => {
                              const active = parkingCellTypeFilter === f.id;
                              return (
                                <TouchableOpacity
                                  key={f.id}
                                  onPress={() => setParkingCellTypeFilter(f.id as any)}
                                  style={{
                                    paddingHorizontal: 11,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    backgroundColor: active ? (f.id === 'fija' ? '#2563EB' : f.id === 'libre' ? '#7C3AED' : COLORS.primary) : '#F1F5F9',
                                    borderWidth: 1,
                                    borderColor: active ? (f.id === 'fija' ? '#2563EB' : f.id === 'libre' ? '#7C3AED' : COLORS.primary) : '#E2E8F0'
                                  }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#FFFFFF' : COLORS.text }}>
                                    {f.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          {/* Filtro Tipo de Vehículo: Carro / Moto */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.muted }}>TIPO VEHÍCULO:</Text>
                            {[
                              { id: 'all', label: 'Todos' },
                              { id: 'carro', label: '🚗 Carros' },
                              { id: 'moto', label: '🏍️ Motos' },
                            ].map(f => {
                              const active = parkingVehicleTypeFilter === f.id;
                              return (
                                <TouchableOpacity
                                  key={f.id}
                                  onPress={() => setParkingVehicleTypeFilter(f.id as any)}
                                  style={{
                                    paddingHorizontal: 11,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    backgroundColor: active ? (f.id === 'moto' ? '#EA580C' : '#0284C7') : '#F1F5F9',
                                    borderWidth: 1,
                                    borderColor: active ? (f.id === 'moto' ? '#EA580C' : '#0284C7') : '#E2E8F0'
                                  }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#FFFFFF' : COLORS.text }}>
                                    {f.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>

                        {/* Botón de Ordenamiento por Placa / Titular */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.muted }}>ORDENAR POR:</Text>
                          <TouchableOpacity
                            onPress={() => {
                              if (parkingSortBy === 'plate') {
                                setParkingSortOrder(parkingSortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setParkingSortBy('plate');
                                setParkingSortOrder('asc');
                              }
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: parkingSortBy === 'plate' ? '#EFF6FF' : '#F8FAFC',
                              borderWidth: 1,
                              borderColor: parkingSortBy === 'plate' ? '#BFDBFE' : '#E2E8F0'
                            }}
                          >
                            <Ionicons 
                              name={parkingSortBy === 'plate' ? (parkingSortOrder === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'} 
                              size={14} 
                              color={parkingSortBy === 'plate' ? '#2563EB' : COLORS.muted} 
                            />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: parkingSortBy === 'plate' ? '#1D4ED8' : COLORS.text }}>
                              Placa {parkingSortBy === 'plate' ? (parkingSortOrder === 'asc' ? '(A-Z)' : '(Z-A)') : ''}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              if (parkingSortBy === 'name') {
                                setParkingSortOrder(parkingSortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setParkingSortBy('name');
                                setParkingSortOrder('asc');
                              }
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: parkingSortBy === 'name' ? '#EFF6FF' : '#F8FAFC',
                              borderWidth: 1,
                              borderColor: parkingSortBy === 'name' ? '#BFDBFE' : '#E2E8F0'
                            }}
                          >
                            <Ionicons 
                              name={parkingSortBy === 'name' ? (parkingSortOrder === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'} 
                              size={14} 
                              color={parkingSortBy === 'name' ? '#2563EB' : COLORS.muted} 
                            />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: parkingSortBy === 'name' ? '#1D4ED8' : COLORS.text }}>
                              Titular
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Calidad y Satisfacción del Módulo */}
                    {isEvalActive('parking') && (
                      <ModuleCSATCard 
                        moduleName="Cupos de Parqueadero" 
                        category="parking" 
                        stats={stats} 
                        color={COLORS.purple} 
                        onPressComment={(id) => navigateToManage({ id })}
                      />
                    )}

                    {/* --- REPORTE DE OCUPACIÓN DE CELDAS --- */}
                    {(parkingFilterType === 'all' || parkingFilterType === 'spots') && (
                      <View style={styles.card}>
                        <View style={styles.cardSectionHeader}>
                          <View>
                            <Text style={styles.cardTitle}>Reporte 1: Ocupación de Celdas de Parqueadero</Text>
                            <Text style={styles.cardSubtitle}>
                              Inventario físico ({parkingStats.totalSpots} celdas), disponibilidad y ocupación actual
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <TouchableOpacity 
                              style={[styles.cardSectionAction, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]} 
                              onPress={() => router.push('/admin/settings')}
                            >
                              <Ionicons name="settings-outline" size={14} color="#2563EB" />
                              <Text style={[styles.cardSectionActionText, { color: '#2563EB' }]}>Gestionar Celdas</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.cardSectionAction, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]} 
                              onPress={handleExportParkingSpotsExcel}
                            >
                              <Ionicons name="download-outline" size={14} color={COLORS.success} />
                              <Text style={[styles.cardSectionActionText, { color: COLORS.success }]}>Excel Celdas</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.cardSectionAction} 
                              onPress={() => handleGenerateReport('parking_spots')}
                            >
                              <Ionicons name="document-text-outline" size={14} color={COLORS.accent} />
                              <Text style={styles.cardSectionActionText}>Generar Reporte PDF</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Barra de Distribución y Capacidad */}
                        <View style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10, gap: 10 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.primary }}>
                              Estado de Ocupación Físico ({parkingStats.assignedSpots} de {parkingStats.totalSpots} celdas en uso)
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: parkingStats.occupancyRate > 80 ? COLORS.danger : COLORS.success }}>
                              {parkingStats.occupancyRate}% Ocupado
                            </Text>
                          </View>
                          <View style={{ height: 10, backgroundColor: '#E2E8F0', borderRadius: 999, overflow: 'hidden', flexDirection: 'row' }}>
                            <View style={{ width: `${parkingStats.occupancyRate}%`, backgroundColor: parkingStats.occupancyRate > 80 ? COLORS.danger : COLORS.accent, height: '100%' }} />
                          </View>
                          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' }} />
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>Disponibles: <Text style={{ fontWeight: '800', color: COLORS.primary }}>{parkingStats.availableSpots}</Text></Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' }} />
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>Ocupadas: <Text style={{ fontWeight: '800', color: COLORS.primary }}>{parkingStats.occupiedSpots}</Text></Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' }} />
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>Celdas Fijas: <Text style={{ fontWeight: '800', color: COLORS.primary }}>{parkingStats.fixedSpots}</Text></Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C3AED' }} />
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>Uso Libre: <Text style={{ fontWeight: '800', color: COLORS.primary }}>{parkingStats.freeSpots}</Text></Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>🚗 Cupos Carro: <Text style={{ fontWeight: '800', color: '#1D4ED8' }}>{parkingStats.carSpots}</Text></Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>🏍️ Cupos Moto: <Text style={{ fontWeight: '800', color: '#C2410C' }}>{parkingStats.motoSpots}</Text></Text>
                            </View>
                          </View>
                        </View>

                        {/* Grilla de Celdas */}
                        <View style={{ marginTop: 16 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.primary }}>
                              Celdas de Parqueadero ({filteredReportSpots.length} de {parkingSpots.length})
                            </Text>
                            {(parkingCellTypeFilter !== 'all' || parkingVehicleTypeFilter !== 'all' || parkingSearch.trim()) ? (
                              <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>
                                  Filtro activo
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            {filteredReportSpots.length > 0 ? (
                              filteredReportSpots.map((spot, idx) => {
                                const isAvailable = spot.status === 'disponible';
                                const isOccupied = spot.status === 'ocupada';
                                const isFixed = spot.spot_type === 'fija';
                                const sType = getSpotVehicleType(spot);
                                const cardBorder = isAvailable ? '#A7F3D0' : (isOccupied ? '#FECACA' : '#FED7AA');
                                const cardBg = isAvailable ? '#ECFDF5' : (isOccupied ? '#FEF2F2' : '#FFF7ED');

                                return (
                                  <View
                                    key={spot.id || idx}
                                    style={{
                                      minWidth: isDesktop ? 220 : '100%',
                                      flex: isDesktop ? 1 : undefined,
                                      padding: 14,
                                      borderRadius: 16,
                                      backgroundColor: cardBg,
                                      borderWidth: 1.5,
                                      borderColor: cardBorder,
                                      gap: 8
                                    }}
                                  >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                          <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 }}>
                                            {spot.code}
                                          </Text>
                                        </View>

                                        {/* Badge Carro / Moto / Mixto */}
                                        <View style={{
                                          backgroundColor: sType === 'moto' ? '#FFF7ED' : sType === 'mixto' ? '#F5F3FF' : '#F0F9FF',
                                          paddingHorizontal: 7,
                                          paddingVertical: 3,
                                          borderRadius: 6,
                                          borderWidth: 1,
                                          borderColor: sType === 'moto' ? '#FDBA74' : sType === 'mixto' ? '#DDD6FE' : '#BAE6FD'
                                        }}>
                                          <Text style={{ fontSize: 10, fontWeight: '800', color: sType === 'moto' ? '#C2410C' : sType === 'mixto' ? '#6D28D9' : '#0369A1' }}>
                                            {sType === 'moto' ? '🏍️ Moto' : sType === 'mixto' ? '🔄 Mixto' : '🚗 Carro'}
                                          </Text>
                                        </View>
                                      </View>

                                      <View style={{
                                        backgroundColor: isFixed ? '#EFF6FF' : '#F5F3FF',
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: isFixed ? '#BFDBFE' : '#DDD6FE'
                                      }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: isFixed ? '#1D4ED8' : '#6D28D9' }}>
                                          {isFixed ? 'Celda Fija' : 'Uso Libre'}
                                        </Text>
                                      </View>
                                    </View>

                                    <View>
                                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted }}>
                                        Estado: <Text style={{ textTransform: 'uppercase', color: isAvailable ? '#059669' : (isOccupied ? '#DC2626' : '#D97706'), fontWeight: '900' }}>{spot.status || 'Disponible'}</Text>
                                      </Text>
                                      {spot.assigned_user_name ? (
                                        <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primary, marginTop: 2 }} numberOfLines={1}>
                                          Titular: {spot.assigned_user_name}
                                        </Text>
                                      ) : (
                                        <Text style={{ fontSize: 11, fontStyle: 'italic', color: COLORS.muted, marginTop: 2 }}>
                                          {isFixed ? 'Sin titular asignado' : 'Disponible para rotación'}
                                        </Text>
                                      )}
                                      {spot.notes ? (
                                        <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }} numberOfLines={1}>
                                          {spot.notes}
                                        </Text>
                                      ) : null}
                                    </View>
                                  </View>
                                );
                              })
                            ) : (
                              <Text style={styles.noDataText}>No se encontraron celdas con los filtros aplicados.</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    )}

                    {/* --- APARTADO 1: VEHÍCULOS CON CELDA FIJA --- */}
                    {(parkingFilterType === 'all' || parkingFilterType === 'fixed') && (parkingCellTypeFilter === 'all' || parkingCellTypeFilter === 'fija') && (
                      <View style={styles.card}>
                        <View style={styles.cardSectionHeader}>
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' }} />
                              <Text style={styles.cardTitle}>Apartado 1: Vehículos con Celda Fija</Text>
                            </View>
                            <Text style={styles.cardSubtitle}>
                              Vehículos vinculados a una persona titular que cuenta con una celda fija de parqueadero asignada
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1D4ED8' }}>
                                {filteredReportFixedVehicles.length} de {(parkingStats.fixedCellVehicles || []).length} Vehículos
                              </Text>
                            </View>
                            <TouchableOpacity 
                              style={[styles.cardSectionAction, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]} 
                              onPress={handleExportParkingAccessExcel}
                            >
                              <Ionicons name="download-outline" size={14} color={COLORS.success} />
                              <Text style={[styles.cardSectionActionText, { color: COLORS.success }]}>Excel Control Acceso</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.cardSectionAction} 
                              onPress={() => handleGenerateReport('parking_access')}
                            >
                              <Ionicons name="document-text-outline" size={14} color={COLORS.accent} />
                              <Text style={styles.cardSectionActionText}>Generar Reporte PDF</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={true}
                          contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                          style={{ width: '100%', marginTop: 8 }}
                        >
                          <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : 1000 }}>
                            <View style={styles.tableHeaderRowDark}>
                              <Text style={[styles.tableHeaderTxtDark, { width: 170 }]}>PERSONA TITULAR</Text>
                              <Text style={[styles.tableHeaderTxtDark, { width: 110 }]}>IDENTIFICACIÓN</Text>
                              <TouchableOpacity
                                onPress={() => {
                                  if (parkingSortBy === 'plate') {
                                    setParkingSortOrder(parkingSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setParkingSortBy('plate');
                                    setParkingSortOrder('asc');
                                  }
                                }}
                                style={{ width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                              >
                                <Text style={[styles.tableHeaderTxtDark, { color: '#93C5FD' }]}>
                                  PLACA {parkingSortBy === 'plate' ? (parkingSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                </Text>
                              </TouchableOpacity>
                              <Text style={[styles.tableHeaderTxtDark, { width: 95, textAlign: 'center' }]}>TIPO</Text>
                              <Text style={[styles.tableHeaderTxtDark, { flex: 1.2, minWidth: 160 }]}>VEHÍCULO / MODELO</Text>
                              <Text style={[styles.tableHeaderTxtDark, { width: 120 }]}>CELDA ASIGNADA</Text>
                              <Text style={[styles.tableHeaderTxtDark, { width: 95, textAlign: 'center' }]}>ESTADO</Text>
                              <Text style={[styles.tableHeaderTxtDark, { width: 130, textAlign: 'center' }]}>AUTORIZACIÓN</Text>
                            </View>

                            {filteredReportFixedVehicles.length > 0 ? (
                              filteredReportFixedVehicles.map((v, idx) => {
                                const vType = getVehicleType(v);
                                return (
                                  <View key={v.id || idx} style={styles.tableRowDark}>
                                    <Text style={[styles.tableCellTxtBold, { width: 170, color: COLORS.primary }]} numberOfLines={1}>
                                      {v.name || v.owner_name || 'Servidor institucional'}
                                    </Text>
                                    <Text style={[styles.tableCellTxt, { width: 110 }]} numberOfLines={1}>
                                      {v.doc || 'S/N'}
                                    </Text>
                                    <View style={{ width: 110 }}>
                                      <View style={{
                                        backgroundColor: '#FDE047',
                                        paddingHorizontal: 8,
                                        paddingVertical: 2,
                                        borderRadius: 5,
                                        borderWidth: 1,
                                        borderColor: '#000000',
                                        alignSelf: 'flex-start'
                                      }}>
                                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#000000', letterSpacing: 0.5 }}>
                                          {v.plate}
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={{ width: 95, alignItems: 'center' }}>
                                      <View style={{
                                        backgroundColor: vType === 'moto' ? '#FFF7ED' : '#EFF6FF',
                                        paddingHorizontal: 7,
                                        paddingVertical: 3,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: vType === 'moto' ? '#FDBA74' : '#BFDBFE'
                                      }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: vType === 'moto' ? '#C2410C' : '#1D4ED8' }}>
                                          {vType === 'moto' ? '🏍️ Moto' : '🚗 Carro'}
                                        </Text>
                                      </View>
                                    </View>
                                    <Text style={[styles.tableCellTxt, { flex: 1.2, minWidth: 160 }]} numberOfLines={1}>
                                      {v.brand} {v.model ? `• ${v.model}` : ''} {v.color ? `(${v.color})` : ''}
                                    </Text>
                                    <View style={{ width: 120 }}>
                                      <View style={{
                                        backgroundColor: '#EFF6FF',
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#BFDBFE',
                                        alignSelf: 'flex-start'
                                      }}>
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>
                                          {v.spot_code ? `Celda ${v.spot_code}` : 'Celda Fija'}
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={{ width: 95, alignItems: 'center' }}>
                                      <View style={{
                                        backgroundColor: v.is_active !== false ? '#ECFDF5' : '#FEF2F2',
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: v.is_active !== false ? '#A7F3D0' : '#FECACA'
                                      }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: v.is_active !== false ? '#065F46' : '#DC2626' }}>
                                          {v.is_active !== false ? 'ACTIVO' : 'INACTIVO'}
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={{ width: 130, alignItems: 'center' }}>
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: v.is_active !== false ? '#059669' : '#64748B' }}>
                                        {v.is_active !== false ? 'Cupo Fijo Vigente' : 'Inactivo'}
                                      </Text>
                                    </View>
                                  </View>
                                );
                              })
                            ) : (
                              <Text style={styles.noDataText}>No se encontraron vehículos con celda fija según los criterios seleccionados.</Text>
                            )}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {/* --- APARTADO 2: VEHÍCULOS SIN CELDA FIJA (USO LIBRE) --- */}
                    {(parkingFilterType === 'all' || parkingFilterType === 'free') && (parkingCellTypeFilter === 'all' || parkingCellTypeFilter === 'libre') && (
                      <View style={styles.card}>
                        <View style={styles.cardSectionHeader}>
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C3AED' }} />
                              <Text style={styles.cardTitle}>Apartado 2: Vehículos sin Celda Fija (Variables / Uso Libre)</Text>
                            </View>
                            <Text style={styles.cardSubtitle}>
                              Vehículos autorizados que ingresan y utilizan cualquiera de las celdas de parqueadero de uso libre rotativo
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <View style={{ backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#DDD6FE' }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#6D28D9' }}>
                                {filteredReportFreeVehicles.length} de {(parkingStats.freeUseVehicles || []).length} Vehículos
                              </Text>
                            </View>
                            <View style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted }}>
                                🚗 {parkingStats.freeCars} Carros • 🏍️ {parkingStats.freeMotos} Motos
                              </Text>
                            </View>
                          </View>
                        </View>

                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={true}
                          contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                          style={{ width: '100%', marginTop: 8 }}
                        >
                          <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : 1020 }}>
                            <View style={styles.tableHeaderRowDark}>
                              <Text style={[styles.tableHeaderTxtDark, { width: 170 }]}>PERSONA TITULAR</Text>
                              <Text style={[styles.tableHeaderTxtDark, { width: 110 }]}>IDENTIFICACIÓN</Text>
                              <TouchableOpacity
                                onPress={() => {
                                  if (parkingSortBy === 'plate') {
                                    setParkingSortOrder(parkingSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setParkingSortBy('plate');
                                    setParkingSortOrder('asc');
                                  }
                                }}
                                style={{ width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                              >
                                <Text style={[styles.tableHeaderTxtDark, { color: '#C4B5FD' }]}>
                                  PLACA {parkingSortBy === 'plate' ? (parkingSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                </Text>
                              </TouchableOpacity>
                              <Text style={[styles.tableHeaderTxtDark, { width: 95, textAlign: 'center' }]}>TIPO</Text>
                              <Text style={[styles.tableHeaderTxtDark, { flex: 1.2, minWidth: 160 }]}>VEHÍCULO / MODELO</Text>
                              <Text style={[styles.tableHeaderTxtDark, { width: 180 }]}>MODALIDAD DE PARQUEO</Text>
                              <Text style={[styles.tableHeaderTxtDark, { width: 95, textAlign: 'center' }]}>ESTADO</Text>
                              <Text style={[styles.tableHeaderTxtDark, { width: 130, textAlign: 'center' }]}>AUTORIZACIÓN</Text>
                            </View>

                            {filteredReportFreeVehicles.length > 0 ? (
                              filteredReportFreeVehicles.map((v, idx) => {
                                const vType = getVehicleType(v);
                                return (
                                  <View key={v.id || idx} style={styles.tableRowDark}>
                                    <Text style={[styles.tableCellTxtBold, { width: 170, color: COLORS.primary }]} numberOfLines={1}>
                                      {v.name || v.owner_name || 'Servidor institucional'}
                                    </Text>
                                    <Text style={[styles.tableCellTxt, { width: 110 }]} numberOfLines={1}>
                                      {v.doc || 'S/N'}
                                    </Text>
                                    <View style={{ width: 110 }}>
                                      <View style={{
                                        backgroundColor: '#FDE047',
                                        paddingHorizontal: 8,
                                        paddingVertical: 2,
                                        borderRadius: 5,
                                        borderWidth: 1,
                                        borderColor: '#000000',
                                        alignSelf: 'flex-start'
                                      }}>
                                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#000000', letterSpacing: 0.5 }}>
                                          {v.plate}
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={{ width: 95, alignItems: 'center' }}>
                                      <View style={{
                                        backgroundColor: vType === 'moto' ? '#FFF7ED' : '#EFF6FF',
                                        paddingHorizontal: 7,
                                        paddingVertical: 3,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: vType === 'moto' ? '#FDBA74' : '#BFDBFE'
                                      }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: vType === 'moto' ? '#C2410C' : '#1D4ED8' }}>
                                          {vType === 'moto' ? '🏍️ Moto' : '🚗 Carro'}
                                        </Text>
                                      </View>
                                    </View>
                                    <Text style={[styles.tableCellTxt, { flex: 1.2, minWidth: 160 }]} numberOfLines={1}>
                                      {v.brand} {v.model ? `• ${v.model}` : ''} {v.color ? `(${v.color})` : ''}
                                    </Text>
                                    <View style={{ width: 180 }}>
                                      <View style={{
                                        backgroundColor: '#F5F3FF',
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#DDD6FE',
                                        alignSelf: 'flex-start'
                                      }}>
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#7C3AED' }}>
                                          Uso Libre / Rotativo
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={{ width: 95, alignItems: 'center' }}>
                                      <View style={{
                                        backgroundColor: v.is_active !== false ? '#ECFDF5' : '#FEF2F2',
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: v.is_active !== false ? '#A7F3D0' : '#FECACA'
                                      }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: v.is_active !== false ? '#065F46' : '#DC2626' }}>
                                          {v.is_active !== false ? 'ACTIVO' : 'INACTIVO'}
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={{ width: 130, alignItems: 'center' }}>
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: v.is_active !== false ? '#059669' : '#64748B' }}>
                                        {v.is_active !== false ? 'Autorizado (Rotativo)' : 'Inactivo'}
                                      </Text>
                                    </View>
                                  </View>
                                );
                              })
                            ) : (
                              <Text style={styles.noDataText}>No se encontraron vehículos en modalidad de uso libre con los filtros seleccionados.</Text>
                            )}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {/* Fila 2 Columnas: Tipología Vehicular y Reglamento */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Distribución por Tipología Vehicular</Text>
                        <Text style={styles.cardSubtitle}>Clasificación de vehículos autorizados para ingreso a sótanos</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          <CategoryProgress label="Automóviles / Camionetas" count={parkingStats.cars} total={parkingStats.total} color={COLORS.accent} suffix=" cupos" onPress={() => navigateToManage({ service: 'Parqueadero' })} />
                          <CategoryProgress label="Motocicletas" count={parkingStats.motos} total={parkingStats.total} color={COLORS.warning} suffix=" cupos" onPress={() => navigateToManage({ service: 'Parqueadero' })} />
                          <CategoryProgress label="Bicicletas / Micromovilidad Eléctrica" count={parkingStats.bikes} total={parkingStats.total} color={COLORS.success} suffix=" cupos" onPress={() => navigateToManage({ service: 'Parqueadero' })} />
                        </View>
                      </View>

                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardTitle}>Políticas y Condiciones del Parqueadero</Text>
                        <Text style={styles.cardSubtitle}>Reglamento institucional de estacionamiento vehicular</Text>
                        
                        <View style={{ gap: 14, marginTop: 18 }}>
                          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                            <Ionicons name="time-outline" size={20} color={COLORS.accent} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primary }}>Horario Institucional</Text>
                              <Text style={{ fontSize: 11, color: COLORS.muted }}>Lunes a Viernes de 6:00 a.m. a 8:00 p.m. Permanencia nocturna requiere autorización especial.</Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                            <Ionicons name="key-outline" size={20} color={COLORS.purple} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primary }}>Sótanos Asignados</Text>
                              <Text style={{ fontSize: 11, color: COLORS.muted }}>Sótano 1 asignado a vehículos oficiales y directivos; Sótano 2 asignado a funcionarios y motos.</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Tabla de Asignación y Solicitudes de Parqueadero */}
                    <View style={styles.card}>
                      <View style={styles.cardSectionHeader}>
                        <View>
                          <Text style={styles.cardTitle}>Historial de Solicitudes de Parqueadero del Periodo</Text>
                          <Text style={styles.cardSubtitle}>Historial de requerimientos y trámites de acceso (clic para abrir detalle)</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity 
                            style={[styles.cardSectionAction, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]} 
                            onPress={() => navigateToManage({ service: 'Parqueadero' })}
                          >
                            <Ionicons name="list-outline" size={14} color={COLORS.accent} />
                            <Text style={[styles.cardSectionActionText, { color: COLORS.accent }]}>Ver en Solicitudes</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                            <Ionicons name="print-outline" size={14} color={COLORS.accent} />
                            <Text style={styles.cardSectionActionText}>Imprimir Reporte</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : (isEvalActive('parking') ? 955 : 855) }}>
                          <View style={styles.tableHeaderRowDark}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 100 }]}>PLACA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1.2, minWidth: 160 }]}>VEHÍCULO / MODELO</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 100 }]}>COLOR</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 140 }]}>SOLICITANTE</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 160 }]}>DEPENDENCIA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 100, textAlign: 'center' }]}>ESTADO</Text>
                            {isEvalActive('parking') && (
                              <Text style={[styles.tableHeaderTxtDark, { width: 100, textAlign: 'center' }]}>CALIFICACIÓN</Text>
                            )}
                          </View>

                          {parkingStats.recentList.length > 0 ? (
                            parkingStats.recentList.map((r, idx) => {
                              const vehiculoModelo = [r.metadata?.brand, r.metadata?.model].filter(Boolean).join(' ') || r.metadata?.vehicleType || r.title || 'Vehículo particular';
                              const color = r.metadata?.color || 'No registrado';
                              const solicitante = r.metadata?.name || r.profiles?.full_name || r.user_name || 'Servidor';
                              const dependencia = r.metadata?.dependency || r.profiles?.dependency?.name || r.profiles?.dependency || r.user_dependency || 'Secretaría Jurídica Distrital';
                              return (
                                <TouchableOpacity 
                                  key={r.id || idx} 
                                  style={[styles.tableRowDark, { cursor: 'pointer' } as any]}
                                  activeOpacity={0.75}
                                  onPress={() => navigateToManage({ id: r.id })}
                                >
                                  <Text style={[styles.tableCellTxt, { width: 95 }]}>{formatDisplayDate(r.created_at)}</Text>
                                  <Text style={[styles.tableCellTxtBold, { width: 100, color: COLORS.primary }]}>{r.metadata?.plate || 'Sin placa'}</Text>
                                  <Text style={[styles.tableCellTxt, { flex: 1.2, minWidth: 160 }]} numberOfLines={1}>{vehiculoModelo}</Text>
                                  <Text style={[styles.tableCellTxt, { width: 100 }]} numberOfLines={1}>{color}</Text>
                                  <Text style={[styles.tableCellTxt, { width: 140 }]} numberOfLines={1}>{solicitante}</Text>
                                  <Text style={[styles.tableCellTxt, { width: 160 }]} numberOfLines={1}>{dependencia}</Text>
                                  <View style={{ width: 100, alignItems: 'center' }}>
                                    <StatusBadge status={r.status} />
                                  </View>
                                  {isEvalActive('parking') && (
                                    <View style={{ width: 100, alignItems: 'center', justifyContent: 'center' }}>
                                      <RatingBadge rating={r.metadata?.evaluation?.rating} status={r.status} />
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })
                          ) : (
                            <Text style={styles.noDataText}>No hay registros de parqueadero</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* --- TAB SALAS AMPLIADO --- */}
                {activeTab === 'rooms' && (
                  <View style={{ gap: 25 }}>
                    <View style={styles.kpiRow}>
                      <KPICard label="Reservas Realizadas" value={roomStats.totalReservations.toString()} color={COLORS.purple} icon="calendar" trend="Reuniones ejecutadas" onPress={() => navigateToManage({ service: 'Salas' })} />
                      <KPICard label="Asistencia Promedio" value={`${roomStats.averageAttendees} pers.`} color={COLORS.accent} icon="people" trend="Por reunión" onPress={() => navigateToManage({ service: 'Salas' })} />
                      <KPICard label="Total Asistentes" value={`${roomStats.totalAttendees} pers.`} color={COLORS.success} icon="person-add" trend="Acumulado periodo" onPress={() => navigateToManage({ service: 'Salas' })} />
                      <KPICard label="Servicios Demandados" value="Alta" color={COLORS.warning} icon="cafe" trend="Café y audiovisuales" onPress={() => navigateToManage({ service: 'Salas' })} />
                    </View>

                    {/* Calidad y Satisfacción del Módulo */}
                    {isEvalActive('rooms') && (
                      <ModuleCSATCard 
                        moduleName="Reserva de Salas de Juntas" 
                        category="rooms" 
                        stats={stats} 
                        color={COLORS.warning} 
                        onPressComment={(id) => navigateToManage({ id })}
                      />
                    )}

                    {/* Fila 2 Columnas: Salas y Servicios */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Uso y Ocupación de Salas de Juntas</Text>
                        <Text style={styles.cardSubtitle}>Espacios de reunión con mayor índice de reservación</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          {roomStats.roomsList.length > 0 ? (
                            roomStats.roomsList.slice(0, 6).map((room, idx) => (
                              <RankProgress key={idx} name={room.name} count={room.count} max={roomStats.roomsList[0].count} color={COLORS.purple} index={idx + 1} onPress={() => navigateToManage({ service: 'Salas' })} />
                            ))
                          ) : (
                            <Text style={styles.noDataText}>No se registran reservas en el periodo</Text>
                          )}
                        </View>
                      </View>

                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardTitle}>Servicios Auxiliares y Horarios</Text>
                        <Text style={styles.cardSubtitle}>Servicios complementarios y picos de demanda</Text>
                        
                        <View style={{ gap: 16, marginTop: 22 }}>
                          <CategoryProgress label="Estación de Café y Refrigerios" count={roomStats.services.coffee} total={100} color={COLORS.warning} suffix="%" onPress={() => navigateToManage({ service: 'Salas' })} />
                          <CategoryProgress label="Proyector y Ayudas Visuales" count={roomStats.services.projector} total={100} color={COLORS.accent} suffix="%" onPress={() => navigateToManage({ service: 'Salas' })} />
                          <CategoryProgress label="Laptops y Conectividad" count={roomStats.services.laptop} total={100} color={COLORS.purple} suffix="%" onPress={() => navigateToManage({ service: 'Salas' })} />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                          <TouchableOpacity 
                            style={[styles.miniInfoCard, { cursor: 'pointer' } as any]}
                            activeOpacity={0.75}
                            onPress={() => navigateToManage({ service: 'Salas' })}
                          >
                            <Text style={styles.miniInfoCardLabel}>Franja Mañana (8am-12m)</Text>
                            <Text style={styles.miniInfoCardValue}>{roomStats.morningSlots}</Text>
                            <Text style={styles.miniInfoCardSub}>reuniones programadas →</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.miniInfoCard, { cursor: 'pointer' } as any]}
                            activeOpacity={0.75}
                            onPress={() => navigateToManage({ service: 'Salas' })}
                          >
                            <Text style={styles.miniInfoCardLabel}>Franja Tarde (2pm-5pm)</Text>
                            <Text style={styles.miniInfoCardValue}>{roomStats.afternoonSlots}</Text>
                            <Text style={styles.miniInfoCardSub}>reuniones programadas →</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Tabla de Reservas Recientes */}
                    <View style={styles.card}>
                      <View style={styles.cardSectionHeader}>
                        <View>
                          <Text style={styles.cardTitle}>Bitácora de Reservaciones y Sesiones de Trabajo</Text>
                          <Text style={styles.cardSubtitle}>Historial de eventos y reuniones desarrolladas en las salas de la entidad (clic para abrir detalle)</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity 
                            style={[styles.cardSectionAction, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]} 
                            onPress={() => navigateToManage({ service: 'Salas' })}
                          >
                            <Ionicons name="list-outline" size={14} color={COLORS.accent} />
                            <Text style={[styles.cardSectionActionText, { color: COLORS.accent }]}>Ver en Solicitudes</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                            <Ionicons name="print-outline" size={14} color={COLORS.accent} />
                            <Text style={styles.cardSectionActionText}>Imprimir Reporte</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : (isEvalActive('rooms') ? 890 : 780) }}>
                          <View style={styles.tableHeaderRowDark}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 140 }]}>SALA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1, minWidth: 200 }]}>ASUNTO / REUNIÓN</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 160 }]}>DEPENDENCIA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 90, textAlign: 'center' }]}>ASISTENTES</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>ESTADO</Text>
                            {isEvalActive('rooms') && (
                              <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>CALIFICACIÓN</Text>
                            )}
                          </View>

                          {roomStats.recentList.length > 0 ? (
                            roomStats.recentList.map((r, idx) => (
                              <TouchableOpacity 
                                key={r.id || idx} 
                                style={[styles.tableRowDark, { cursor: 'pointer' } as any]}
                                activeOpacity={0.75}
                                onPress={() => navigateToManage({ id: r.id })}
                              >
                                <Text style={[styles.tableCellTxt, { width: 95 }]}>{formatDisplayDate(r.created_at)}</Text>
                                <Text style={[styles.tableCellTxtBold, { width: 140 }]}>{r.metadata?.room?.name || 'Sala General'}</Text>
                                <Text style={[styles.tableCellTxt, { flex: 1, minWidth: 200 }]} numberOfLines={1}>{r.title || 'Reunión de trabajo'}</Text>
                                <Text style={[styles.tableCellTxt, { width: 160 }]} numberOfLines={1}>{r.profiles?.dependency?.name || 'General'}</Text>
                                <Text style={[styles.tableCellTxt, { width: 90, textAlign: 'center', fontWeight: '800' }]}>{r.metadata?.attendees || '-'}</Text>
                                <View style={{ width: 110, alignItems: 'center' }}>
                                  <StatusBadge status={r.status} />
                                </View>
                                {isEvalActive('rooms') && (
                                  <View style={{ width: 110, alignItems: 'center', justifyContent: 'center' }}>
                                    <RatingBadge rating={r.metadata?.evaluation?.rating} status={r.status} />
                                  </View>
                                )}
                              </TouchableOpacity>
                            ))
                          ) : (
                            <Text style={styles.noDataText}>No hay reuniones registradas</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* --- TAB TRANSPORTE AMPLIADO --- */}
                {activeTab === 'transport' && (
                  <View style={{ gap: 25 }}>
                    <View style={styles.kpiRow}>
                      <KPICard label="Misiones de Viaje" value={transportStats.totalRequests.toString()} color={COLORS.accent} icon="car-sport" trend="Servicios ejecutados" onPress={() => navigateToManage({ service: 'Transporte' })} />
                      <KPICard label="Servidores Movilizados" value={transportStats.totalPassengers.toString()} color={COLORS.success} icon="people" trend="Pasajeros oficiales" onPress={() => navigateToManage({ service: 'Transporte' })} />
                      <KPICard label="Promedio Pasajeros" value={`${transportStats.avgPassengers} pers.`} color={COLORS.purple} icon="speedometer" trend="Por misión" onPress={() => navigateToManage({ service: 'Transporte' })} />
                      <KPICard label="Cobertura Operativa" value="100%" color={COLORS.danger} icon="navigate" trend="Sede y Distrital" onPress={() => navigateToManage({ service: 'Transporte' })} />
                    </View>

                    {/* Calidad y Satisfacción del Módulo */}
                    {isEvalActive('transport') && (
                      <ModuleCSATCard 
                        moduleName="Transporte Institucional" 
                        category="transport" 
                        stats={stats} 
                        color={COLORS.success} 
                        onPressComment={(id) => navigateToManage({ id })}
                      />
                    )}

                    {/* Fila 2 Columnas: Rutas y Modalidades */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Rutas y Trayectos Frecuentes</Text>
                        <Text style={styles.cardSubtitle}>Destinos recurrentes de misiones oficiales administrativas</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          {transportStats.routes.length > 0 ? (
                            transportStats.routes.slice(0, 6).map((route, idx) => (
                              <RankProgress key={idx} name={route.name} count={route.count} max={transportStats.routes[0].count} color={COLORS.accent} index={idx + 1} onPress={() => navigateToManage({ service: 'Transporte' })} />
                            ))
                          ) : (
                            <Text style={styles.noDataText}>No se registran misiones de transporte en el periodo</Text>
                          )}
                        </View>
                      </View>

                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardTitle}>Modalidades de Desplazamiento</Text>
                        <Text style={styles.cardSubtitle}>Clasificación por tipo y objetivo de misión institucional</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          <CategoryProgress label="Diligencias Judiciales y Notificaciones" count={transportStats.judicialTrips} total={transportStats.totalRequests} color={COLORS.accent} suffix=" viajes" onPress={() => navigateToManage({ service: 'Transporte' })} />
                          <CategoryProgress label="Comisiones Directivas y Despacho" count={transportStats.executiveTrips} total={transportStats.totalRequests} color={COLORS.purple} suffix=" viajes" onPress={() => navigateToManage({ service: 'Transporte' })} />
                          <CategoryProgress label="Logística Administrativa y Envíos" count={transportStats.adminTrips} total={transportStats.totalRequests} color={COLORS.success} suffix=" viajes" onPress={() => navigateToManage({ service: 'Transporte' })} />
                        </View>

                        <TouchableOpacity 
                          style={[styles.infoAlertBox, { marginTop: 20, cursor: 'pointer' } as any]}
                          activeOpacity={0.75}
                          onPress={() => navigateToManage({ service: 'Transporte' })}
                        >
                          <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.accent} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={styles.infoAlertTitle}>Seguridad Vial y SOAT Vigente</Text>
                              <Text style={{ fontSize: 10, color: COLORS.accent, fontWeight: '800' }}>VER EN SOLICITUDES →</Text>
                            </View>
                            <Text style={styles.infoAlertDesc}>
                              Toda la flota institucional cuenta con revisiones técnico-mecánicas y pólizas contractuales al día.
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Tabla de Comisiones de Transporte */}
                    <View style={styles.card}>
                      <View style={styles.cardSectionHeader}>
                        <View>
                          <Text style={styles.cardTitle}>Registro de Salidas y Comisiones de Transporte Oficial</Text>
                          <Text style={styles.cardSubtitle}>Relación de traslados con origen, destino y personal a bordo (clic para abrir detalle)</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity 
                            style={[styles.cardSectionAction, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]} 
                            onPress={() => navigateToManage({ service: 'Transporte' })}
                          >
                            <Ionicons name="list-outline" size={14} color={COLORS.accent} />
                            <Text style={[styles.cardSectionActionText, { color: COLORS.accent }]}>Ver en Solicitudes</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                            <Ionicons name="print-outline" size={14} color={COLORS.accent} />
                            <Text style={styles.cardSectionActionText}>Imprimir Reporte</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : (isEvalActive('transport') ? 910 : 800) }}>
                          <View style={styles.tableHeaderRowDark}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1, minWidth: 180 }]}>ASUNTO / MISIÓN</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 200 }]}>ORIGEN Y DESTINO</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 80, textAlign: 'center' }]}>PASAJEROS</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 140 }]}>SOLICITANTE</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>ESTADO</Text>
                            {isEvalActive('transport') && (
                              <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>CALIFICACIÓN</Text>
                            )}
                          </View>

                          {transportStats.recentList.length > 0 ? (
                            transportStats.recentList.map((r, idx) => (
                              <TouchableOpacity 
                                key={r.id || idx} 
                                style={[styles.tableRowDark, { cursor: 'pointer' } as any]}
                                activeOpacity={0.75}
                                onPress={() => navigateToManage({ id: r.id })}
                              >
                                <Text style={[styles.tableCellTxt, { width: 95 }]}>{formatDisplayDate(r.created_at)}</Text>
                                <Text style={[styles.tableCellTxtBold, { flex: 1, minWidth: 180 }]} numberOfLines={1}>{r.title || 'Misión oficial'}</Text>
                                <Text style={[styles.tableCellTxt, { width: 200 }]} numberOfLines={1}>
                                  {r.metadata?.origin || 'Sede'} - {r.metadata?.destination || 'Destino'}
                                </Text>
                                <Text style={[styles.tableCellTxt, { width: 80, textAlign: 'center', fontWeight: '800' }]}>{r.metadata?.passengers || 1}</Text>
                                <Text style={[styles.tableCellTxt, { width: 140 }]} numberOfLines={1}>{r.profiles?.full_name || 'Funcionario'}</Text>
                                <View style={{ width: 110, alignItems: 'center' }}>
                                  <StatusBadge status={r.status} />
                                </View>
                                {isEvalActive('transport') && (
                                  <View style={{ width: 110, alignItems: 'center', justifyContent: 'center' }}>
                                    <RatingBadge rating={r.metadata?.evaluation?.rating} status={r.status} />
                                  </View>
                                )}
                              </TouchableOpacity>
                            ))
                          ) : (
                            <Text style={styles.noDataText}>No hay misiones de transporte en el periodo</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <DateTimePickerModal 
        visible={showDatePicker} 
        onClose={() => setShowDatePicker(false)} 
        title={modalTarget === 'from' ? 'Fecha Inicio' : 'Fecha Fin'}
        value={modalTarget === 'from' ? customStartDate : customEndDate}
        onSelect={(val: string) => {
          if (modalTarget === 'from') {
            setCustomStartDate(val);
          } else {
            setCustomEndDate(val);
          }
          setShowDatePicker(false);
        }}
      />

      {/* --- MODAL INTERACTIVO DE PREVISUALIZACIÓN DE REPORTE INSTITUCIONAL (PREMIUM) --- */}
      <Modal visible={showDocModal} transparent animationType="slide" onRequestClose={() => setShowDocModal(false)}>
        <View style={styles.modalBlurContainer}>
          <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
          
          <View style={[styles.modalPanel, isModalExpanded && styles.modalPanelExpanded]}>
            {isGeneratingPdf ? (
              <View style={styles.pdfGeneratingBox}>
                <ActivityIndicator size="large" color={COLORS.accent} style={{ marginBottom: 15 }} />
                <Text style={styles.pdfGeneratingTitle}>Generando Reporte Oficial...</Text>
                <Text style={styles.pdfGeneratingDesc}>Compilando datos y aplicando firma institucional</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${pdfProgress}%` }]} />
                </View>
                <Text style={styles.progressNumText}>{pdfProgress}%</Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                
                {/* Cabecera del Reporte Membretado con controles de pantalla completa y cierre */}
                <View style={styles.reportDocHeader}>
                  <View style={styles.reportEscudo}>
                    <Ionicons name="ribbon" size={24} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 10 }}>
                    <Text style={styles.reportGovText}>ALCALDÍA MAYOR DE BOGOTÁ D.C.</Text>
                    <Text style={styles.reportDeptText}>Secretaría Jurídica Distrital</Text>
                    <Text style={styles.reportSubText}>Oficina de Gestión Corporativa • Sistema SASGE</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity 
                      onPress={() => setIsModalExpanded(!isModalExpanded)} 
                      style={styles.expandModalBtn}
                      accessibilityLabel="Alternar pantalla completa"
                    >
                      <Ionicons name={isModalExpanded ? 'contract-outline' : 'expand-outline'} size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowDocModal(false)} style={styles.closeModalBtn}>
                      <Ionicons name="close" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Selector de Subpantallas / Tipos de Reporte dentro del Modal */}
                <View style={{ paddingBottom: 10 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalTabSelector}>
                    <TouchableOpacity 
                      style={[styles.modalTabBtn, reportTab === 'consolidated' && styles.modalTabBtnActive]} 
                      onPress={() => setReportTab('consolidated')}
                    >
                      <Ionicons name="bar-chart" size={14} color={reportTab === 'consolidated' ? COLORS.white : COLORS.muted} />
                      <Text style={[styles.modalTabBtnText, reportTab === 'consolidated' && styles.modalTabBtnTextActive]}>Consolidado General</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.modalTabBtn, reportTab === 'satisfaction' && styles.modalTabBtnActive]} 
                      onPress={() => setReportTab('satisfaction')}
                    >
                      <Ionicons name="star" size={14} color={reportTab === 'satisfaction' ? COLORS.white : '#D97706'} />
                      <Text style={[styles.modalTabBtnText, reportTab === 'satisfaction' && styles.modalTabBtnTextActive]}>Satisfacción (CSAT)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.modalTabBtn, reportTab === 'visitors' && styles.modalTabBtnActive]} 
                      onPress={() => setReportTab('visitors')}
                    >
                      <Ionicons name="people" size={14} color={reportTab === 'visitors' ? COLORS.white : COLORS.muted} />
                      <Text style={[styles.modalTabBtnText, reportTab === 'visitors' && styles.modalTabBtnTextActive]}>Visitantes</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.modalTabBtn, reportTab === 'maintenance' && styles.modalTabBtnActive]} 
                      onPress={() => setReportTab('maintenance')}
                    >
                      <Ionicons name="construct" size={14} color={reportTab === 'maintenance' ? COLORS.white : COLORS.muted} />
                      <Text style={[styles.modalTabBtnText, reportTab === 'maintenance' && styles.modalTabBtnTextActive]}>Mantenimiento</Text>
                    </TouchableOpacity>

                    {/* 1. Reporte de Ocupación de Celdas (44 celdas) */}
                    <TouchableOpacity 
                      style={[styles.modalTabBtn, (reportTab === 'parking_spots' || reportTab === 'parking') && styles.modalTabBtnActive]} 
                      onPress={() => setReportTab('parking_spots')}
                    >
                      <Ionicons name="grid" size={14} color={(reportTab === 'parking_spots' || reportTab === 'parking') ? COLORS.white : COLORS.purple} />
                      <Text style={[styles.modalTabBtnText, (reportTab === 'parking_spots' || reportTab === 'parking') && styles.modalTabBtnTextActive]}>
                        1. Ocupación Celdas ({parkingStats.totalSpots})
                      </Text>
                    </TouchableOpacity>

                    {/* 2. Control de Acceso — Automóviles (63) y Motos (25) */}
                    <TouchableOpacity 
                      style={[styles.modalTabBtn, reportTab === 'parking_access' && styles.modalTabBtnActive]} 
                      onPress={() => setReportTab('parking_access')}
                    >
                      <Ionicons name="car" size={14} color={reportTab === 'parking_access' ? COLORS.white : '#2563EB'} />
                      <Text style={[styles.modalTabBtnText, reportTab === 'parking_access' && styles.modalTabBtnTextActive]}>
                        2. Control de Acceso ({parkingStats.fixedCellVehicles.length + parkingStats.freeUseVehicles.length})
                      </Text>
                    </TouchableOpacity>

                    {/* 3. Solicitudes de Parqueadero del Periodo */}
                    <TouchableOpacity 
                      style={[styles.modalTabBtn, reportTab === 'parking_requests' && styles.modalTabBtnActive]} 
                      onPress={() => setReportTab('parking_requests')}
                    >
                      <Ionicons name="document-text" size={14} color={reportTab === 'parking_requests' ? COLORS.white : COLORS.accent} />
                      <Text style={[styles.modalTabBtnText, reportTab === 'parking_requests' && styles.modalTabBtnTextActive]}>
                        3. Solicitudes ({dbData.filter(d => d.category === 'parking').length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.modalTabBtn, reportTab === 'rooms' && styles.modalTabBtnActive]} 
                      onPress={() => setReportTab('rooms')}
                    >
                      <Ionicons name="easel" size={14} color={reportTab === 'rooms' ? COLORS.white : COLORS.muted} />
                      <Text style={[styles.modalTabBtnText, reportTab === 'rooms' && styles.modalTabBtnTextActive]}>Salas de Juntas</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.modalTabBtn, reportTab === 'transport' && styles.modalTabBtnActive]} 
                      onPress={() => setReportTab('transport')}
                    >
                      <Ionicons name="car-sport" size={14} color={reportTab === 'transport' ? COLORS.white : COLORS.muted} />
                      <Text style={[styles.modalTabBtnText, reportTab === 'transport' && styles.modalTabBtnTextActive]}>Transporte</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* Cuerpo del Reporte Formateado Dinámicamente */}
                <ScrollView style={styles.reportDocBody} showsVerticalScrollIndicator={true}>
                  
                  {/* --- 1. REPORTE CONSOLIDADO GENERAL --- */}
                  {reportTab === 'consolidated' && (
                    <View>
                      <Text style={styles.reportDocTitle}>
                        REPORTE CONSOLIDADO DE GESTIÓN OPERATIVA Y SERVICIOS ADMINISTRATIVOS
                      </Text>
                      <View style={styles.docDivider} />

                      {/* Banner de ayuda interactiva */}
                      <TouchableOpacity 
                        style={[styles.infoAlertBox, { marginBottom: 16, cursor: 'pointer' } as any]}
                        activeOpacity={0.8}
                        onPress={() => navigateToManage({ service: 'Todas', status: 'Todos' })}
                      >
                        <Ionicons name="sparkles" size={18} color={COLORS.accent} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primary }}>Panel Interactivo</Text>
                          <Text style={{ fontSize: 11, color: COLORS.muted }}>Haz clic sobre cualquier servicio, fila o solicitud para abrir su detalle completo o gestionar en Solicitudes.</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={14} color={COLORS.accent} />
                      </TouchableOpacity>

                      <View style={styles.reportDocMetaGrid}>
                        <Text style={styles.reportMetaLabel}>Periodo del Reporte: <Text style={{fontWeight:'400'}}>{reportPeriodLabel}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Fecha de Emisión: <Text style={{fontWeight:'400'}}>{new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Generado por: <Text style={{fontWeight:'400'}}>Administración del Sistema</Text></Text>
                        <Text style={styles.reportMetaLabel}>Efectividad Global: <Text style={{fontWeight:'400'}}>{stats.effectiveness}% ({stats.resolved} resueltos de {stats.total})</Text></Text>
                      </View>

                      <Text style={styles.reportSectionTitle}>1. RESUMEN EJECUTIVO GENERAL</Text>
                      <Text style={styles.reportParagraph}>
                        Durante el periodo evaluado ({reportPeriodLabel}), se tramitaron un total de **{stats.total}** solicitudes operativas en la Secretaría Jurídica Distrital. Del total, se resolvieron con éxito **{stats.resolved}** requerimientos (**{stats.effectiveness}%** de efectividad), **{stats.inProgress}** se encuentran en curso técnico, **{stats.pending}** pendientes de asignación y **{stats.rejected}** rechazadas conforme a criterios normativos.
                      </Text>

                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>MÓDULO OPERATIVO</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>TOTAL</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>PROCESO</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>RESUELTO</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>EFECTIVIDAD</Text>
                        </View>
                        
                        <TableRow label="Control Acceso (Visitantes)" count={stats.catCounts.visitors} inProg={categoryBreakdown.visitors.inProgress} resolved={categoryBreakdown.visitors.resolved} onPress={() => navigateToManage({ service: 'Visitantes' })} />
                        <TableRow label="Mantenimiento Locativo" count={stats.catCounts.maintenance} inProg={categoryBreakdown.maintenance.inProgress} resolved={categoryBreakdown.maintenance.resolved} onPress={() => navigateToManage({ service: 'Mantenimiento' })} />
                        <TableRow label="Cupo de Parqueadero" count={stats.catCounts.parking} inProg={categoryBreakdown.parking.inProgress} resolved={categoryBreakdown.parking.resolved} onPress={() => navigateToManage({ service: 'Parqueadero' })} />
                        <TableRow label="Reserva de Salas" count={stats.catCounts.rooms} inProg={categoryBreakdown.rooms.inProgress} resolved={categoryBreakdown.rooms.resolved} onPress={() => navigateToManage({ service: 'Salas' })} />
                        <TableRow label="Transporte Oficial" count={stats.catCounts.transport} inProg={categoryBreakdown.transport.inProgress} resolved={categoryBreakdown.transport.resolved} onPress={() => navigateToManage({ service: 'Transporte' })} />
                        <TableRow label="TOTAL CONSOLIDADO" count={stats.total} inProg={stats.inProgress} resolved={stats.resolved} effectiveness={`${stats.effectiveness}%`} isTotal={true} onPress={() => navigateToManage({ service: 'Todas', status: 'Todos' })} />
                      </View>

                      <Text style={styles.reportSectionTitle}>2. INFRAESTRUCTURA Y MANTENIMIENTO</Text>
                      <Text style={styles.reportParagraph}>
                        Se contabilizan **{maintenanceStats.total}** reportes técnicos en el periodo. {maintenanceStats.highPriorityPending > 0 ? `Se identifican **${maintenanceStats.highPriorityPending}** caso(s) de prioridad ALTA pendientes de cierre urgente.` : 'No se registran solicitudes críticas pendientes de resolución.'}
                      </Text>

                      <Text style={styles.reportSectionTitle}>3. SEGURIDAD Y CONTROL DE ACCESO (VISITANTES)</Text>
                      <Text style={styles.reportParagraph}>
                        Se autorizó el ingreso de **{visitorStats.totalVisitors}** personas externas y **{visitorStats.vehicularEntries}** accesos vehiculares a la sede distrital a través de **{visitorStats.totalRequests}** solicitudes formales.
                      </Text>

                      <Text style={styles.reportSectionTitle}>4. RECURSOS LOGÍSTICOS Y MOVILIDAD</Text>
                      <Text style={styles.reportParagraph}>
                        En salas de juntas se coordinaron **{roomStats.totalReservations}** reuniones (promedio de **{roomStats.averageAttendees}** asistentes por evento). En transporte oficial se ejecutaron **{transportStats.totalRequests}** traslados movilizando a **{transportStats.totalPassengers}** servidores distritales.
                      </Text>

                      <Text style={styles.reportSectionTitle}>5. EVALUACIÓN DE CALIDAD Y SATISFACCIÓN DEL USUARIO (CSAT)</Text>
                      <Text style={styles.reportParagraph}>
                        El índice de satisfacción de los servidores distritales se situó en **{stats.averageRating} / 5.0 estrellas**, con un **{stats.favorablePercent}%** de evaluaciones favorables (4 y 5 estrellas) sobre un total de **{stats.totalEvaluated}** calificaciones registradas en el periodo.
                      </Text>
                    </View>
                  )}

                  {/* --- 2. REPORTE CONTROL DE VISITANTES --- */}
                  {reportTab === 'visitors' && (
                    <View>
                      <Text style={styles.reportDocTitle}>
                        REPORTE OFICIAL DE CONTROL DE ACCESO Y SEGURIDAD FÍSICA
                      </Text>
                      <View style={styles.docDivider} />

                      <View style={styles.reportDocMetaGrid}>
                        <Text style={styles.reportMetaLabel}>Periodo Evaluado: <Text style={{fontWeight:'400'}}>{reportPeriodLabel}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Total Visitantes Autorizados: <Text style={{fontWeight:'400'}}>{visitorStats.totalVisitors} personas</Text></Text>
                        <Text style={styles.reportMetaLabel}>Ingresos Vehiculares con Placa: <Text style={{fontWeight:'400'}}>{visitorStats.vehicularEntries} vehículos</Text></Text>
                        <Text style={styles.reportMetaLabel}>Trámites Formalizados: <Text style={{fontWeight:'400'}}>{visitorStats.totalRequests} registros</Text></Text>
                      </View>

                      <Text style={styles.reportSectionTitle}>1. BALANCE GENERAL DE ACCESOS</Text>
                      <Text style={styles.reportParagraph}>
                        Durante el periodo analizado, la recepción de la sede institucional autorizó la entrada de un total acumulado de **{visitorStats.totalVisitors}** visitantes externos, garantizando los protocolos de verificación de identidad, registro de pertenencias y asignación de escarapelas oficiales.
                      </Text>

                      <Text style={styles.reportSectionTitle}>2. DEPENDENCIAS CON MAYOR RECEPCIÓN DE VISITAS</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>DEPENDENCIA / ÁREA</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>PERSONAS</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>PARTICIPACIÓN</Text>
                        </View>
                        {visitorStats.departments.slice(0, 8).map((dep, idx) => (
                          <TouchableOpacity 
                            key={idx} 
                            style={[styles.reportTableRow, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ service: 'Visitantes' })}
                          >
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text, fontWeight: '700' }]}>{dep.name}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{dep.count}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>
                              {visitorStats.totalVisitors > 0 ? Math.round((dep.count / visitorStats.totalVisitors) * 100) : 0}%
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.reportSectionTitle}>3. REGISTRO COMPLETO DE VISITAS AUTORIZADAS</Text>
                      <Text style={[styles.cardSubtitle, { marginBottom: 10 }]}>Haz clic sobre cualquier visita para abrir su modal detallado</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '800' }]}>FECHA</Text>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>MOTIVO / ASUNTO</Text>
                          <Text style={[styles.tableCell, { flex: 1.6, fontWeight: '800' }]}>DEPENDENCIA</Text>
                          <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                          {isEvalActive('visitors') && (
                            <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>CALIF.</Text>
                          )}
                        </View>
                        {dbData.filter(d => d.category === 'visitors').map((r, idx) => (
                          <TouchableOpacity 
                            key={r.id || idx} 
                            style={[styles.reportTableRow, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ id: r.id })}
                          >
                            <Text style={[styles.tableCell, { flex: 1.1, color: COLORS.text }]}>{new Date(r.created_at).toLocaleDateString('es-CO')}</Text>
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.primary, fontWeight: '700' }]}>{r.title || 'Visita oficial'}</Text>
                            <Text style={[styles.tableCell, { flex: 1.6, color: COLORS.text }]}>{r.metadata?.responsible?.dependency || r.profiles?.dependency?.name || 'General'}</Text>
                            <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', color: COLORS.text, fontWeight: '700' }]}>{r.status?.toUpperCase()}</Text>
                            {isEvalActive('visitors') && (
                              <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', color: '#B45309', fontWeight: '800' }]}>{r.metadata?.evaluation?.rating ? `★ ${Number(r.metadata.evaluation.rating).toFixed(1)}` : '—'}</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* --- 3. REPORTE MANTENIMIENTO LOCATIVO --- */}
                  {reportTab === 'maintenance' && (
                    <View>
                      <Text style={styles.reportDocTitle}>
                        REPORTE TÉCNICO DE MANTENIMIENTO LOCATIVO E INFRAESTRUCTURA
                      </Text>
                      <View style={styles.docDivider} />

                      <View style={styles.reportDocMetaGrid}>
                        <Text style={styles.reportMetaLabel}>Periodo Evaluado: <Text style={{fontWeight:'400'}}>{reportPeriodLabel}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Total Solicitudes Técnicas: <Text style={{fontWeight:'400'}}>{maintenanceStats.total} órdenes</Text></Text>
                        <Text style={styles.reportMetaLabel}>Resueltas / Solucionadas: <Text style={{fontWeight:'400'}}>{maintenanceStats.resolved} ({maintenanceStats.total > 0 ? Math.round((maintenanceStats.resolved / maintenanceStats.total) * 100) : 0}%)</Text></Text>
                        <Text style={styles.reportMetaLabel}>Incidentes de Alta Prioridad: <Text style={{fontWeight:'400', color: maintenanceStats.highPriorityPending > 0 ? COLORS.danger : COLORS.primary}}>{maintenanceStats.highPriorityPending} casos</Text></Text>
                      </View>

                      <Text style={styles.reportSectionTitle}>1. DIAGNÓSTICO TÉCNICO Y ESTADO DE ÓRDENES</Text>
                      <Text style={styles.reportParagraph}>
                        Se gestionaron **{maintenanceStats.total}** incidentes locativos: **{maintenanceStats.resolved}** completados satisfactoriamente, **{maintenanceStats.inProgress}** en curso técnico por parte del equipo de soporte, **{maintenanceStats.pending}** pendientes de evaluación inicial y **{maintenanceStats.rejected}** desestimados.
                      </Text>

                      <Text style={styles.reportSectionTitle}>2. ZONAS Y PISOS CON MAYOR FRECUENCIA DE AVERÍAS</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>PISO / ZONA LOCATIVA</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>REPORTES</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>PARTICIPACIÓN</Text>
                        </View>
                        {maintenanceStats.locations.slice(0, 8).map((loc, idx) => (
                          <TouchableOpacity 
                            key={idx} 
                            style={[styles.reportTableRow, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ service: 'Mantenimiento' })}
                          >
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text, fontWeight: '700' }]}>{loc.name}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{loc.count}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>
                              {maintenanceStats.total > 0 ? Math.round((loc.count / maintenanceStats.total) * 100) : 0}%
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.reportSectionTitle}>3. REGISTRO COMPLETO DE SOLICITUDES TÉCNICAS</Text>
                      <Text style={[styles.cardSubtitle, { marginBottom: 10 }]}>Haz clic sobre cualquier incidencia técnica para abrir su gestión detallada</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '800' }]}>FECHA</Text>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>INCIDENCIA</Text>
                          <Text style={[styles.tableCell, { flex: 1.4, fontWeight: '800' }]}>UBICACIÓN</Text>
                          <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>PRIORIDAD</Text>
                          <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                          {isEvalActive('maintenance') && (
                            <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>CALIF.</Text>
                          )}
                        </View>
                        {dbData.filter(d => d.category === 'maintenance').map((r, idx) => (
                          <TouchableOpacity 
                            key={r.id || idx} 
                            style={[styles.reportTableRow, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ id: r.id })}
                          >
                            <Text style={[styles.tableCell, { flex: 1.1, color: COLORS.text }]}>{new Date(r.created_at).toLocaleDateString('es-CO')}</Text>
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.primary, fontWeight: '700' }]}>{r.title || 'Mantenimiento'}</Text>
                            <Text style={[styles.tableCell, { flex: 1.4, color: COLORS.text }]}>{r.metadata?.location || 'General'}</Text>
                            <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', color: isHighPriority(r.priority) ? COLORS.danger : COLORS.accent, fontWeight: '800' }]}>{r.priority?.toUpperCase() || 'MEDIA'}</Text>
                            <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', color: COLORS.text, fontWeight: '700' }]}>{r.status?.toUpperCase()}</Text>
                            {isEvalActive('maintenance') && (
                              <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', color: '#B45309', fontWeight: '800' }]}>{r.metadata?.evaluation?.rating ? `★ ${Number(r.metadata.evaluation.rating).toFixed(1)}` : '—'}</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* --- 4. REPORTE 1: OCUPACIÓN DE CELDAS DE PARQUEADERO (44 CELDAS) --- */}
                  {(reportTab === 'parking_spots' || reportTab === 'parking') && (
                    <View>
                      <Text style={styles.reportDocTitle}>
                        REPORTE DE OCUPACIÓN DE CELDAS DE PARQUEADERO
                      </Text>
                      <View style={styles.docDivider} />

                      <View style={styles.reportDocMetaGrid}>
                        <Text style={styles.reportMetaLabel}>Periodo Evaluado: <Text style={{fontWeight:'400'}}>{reportPeriodLabel}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Total Celdas Físicas: <Text style={{fontWeight:'400'}}>{parkingStats.totalSpots} celdas</Text></Text>
                        <Text style={styles.reportMetaLabel}>Celdas Disponibles: <Text style={{fontWeight:'400', color: COLORS.success}}>{parkingStats.availableSpots} celdas</Text></Text>
                        <Text style={styles.reportMetaLabel}>Celdas Asignadas / Ocupadas: <Text style={{fontWeight:'400', color: COLORS.accent}}>{parkingStats.assignedSpots} celdas</Text></Text>
                        <Text style={styles.reportMetaLabel}>Celdas Fijas: <Text style={{fontWeight:'400'}}>{parkingStats.fixedSpots} celdas</Text></Text>
                        <Text style={styles.reportMetaLabel}>Celdas Uso Libre: <Text style={{fontWeight:'400'}}>{parkingStats.freeSpots} celdas</Text></Text>
                        <Text style={styles.reportMetaLabel}>🚗 Cupos Carro: <Text style={{fontWeight:'400'}}>{parkingStats.carSpots} celdas</Text></Text>
                        <Text style={styles.reportMetaLabel}>🏍️ Cupos Moto: <Text style={{fontWeight:'400'}}>{parkingStats.motoSpots} celdas</Text></Text>
                        <Text style={styles.reportMetaLabel}>Tasa de Ocupación: <Text style={{fontWeight:'400'}}>{parkingStats.occupancyRate}%</Text></Text>
                      </View>

                      <Text style={styles.reportSectionTitle}>INVENTARIO Y OCUPACIÓN FÍSICA DE CELDAS ({filteredReportSpots.length} celdas)</Text>
                      <Text style={styles.reportParagraph}>
                        Capacidad física inventariada de **{parkingStats.totalSpots}** celdas en la sede: **{parkingStats.availableSpots}** disponibles, **{parkingStats.assignedSpots}** ocupadas o asignadas, **{parkingStats.fixedSpots}** celdas fijas y **{parkingStats.freeSpots}** de uso libre rotativo.
                      </Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 0.8, fontWeight: '800' }]}>CÓDIGO</Text>
                          <Text style={[styles.tableCell, { flex: 1.0, fontWeight: '800' }]}>MODALIDAD</Text>
                          <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>VEHÍCULO</Text>
                          <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                          <Text style={[styles.tableCell, { flex: 1.6, fontWeight: '800' }]}>TITULAR ASIGNADO</Text>
                          <Text style={[styles.tableCell, { flex: 1.6, fontWeight: '800' }]}>OBSERVACIONES / UBICACIÓN</Text>
                        </View>
                        {filteredReportSpots.length > 0 ? (
                          filteredReportSpots.map((spot, idx) => {
                            const sType = getSpotVehicleType(spot);
                            return (
                              <View key={spot.id || idx} style={styles.reportTableRow}>
                                <Text style={[styles.tableCell, { flex: 0.8, fontWeight: '900', color: COLORS.primary }]}>{spot.code}</Text>
                                <Text style={[styles.tableCell, { flex: 1.0, fontWeight: '700', color: spot.spot_type === 'fija' ? '#1D4ED8' : '#6D28D9' }]}>
                                  {spot.spot_type === 'fija' ? 'Celda Fija' : 'Uso Libre'}
                                </Text>
                                <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', fontWeight: '800', color: sType === 'moto' ? '#C2410C' : (sType === 'carro' ? '#1D4ED8' : '#059669') }]}>
                                  {sType === 'moto' ? '🏍️ Moto' : (sType === 'carro' ? '🚗 Carro' : '🔄 Mixto')}
                                </Text>
                                <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', fontWeight: '800', color: spot.status === 'disponible' ? '#059669' : (spot.status === 'ocupada' ? '#DC2626' : '#D97706') }]}>
                                  {(spot.status || 'disponible').toUpperCase()}
                                </Text>
                                <Text style={[styles.tableCell, { flex: 1.6, color: COLORS.text }]}>
                                  {spot.assigned_user_name || 'Sin asignar / Disponible'}
                                </Text>
                                <Text style={[styles.tableCell, { flex: 1.6, color: COLORS.muted }]}>
                                  {spot.notes || '—'}
                                </Text>
                              </View>
                            );
                          })
                        ) : (
                          <View style={{ padding: 14 }}>
                            <Text style={styles.noDataText}>No hay celdas registradas con los filtros seleccionados</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* --- 4. REPORTE 2: CONTROL DE ACCESO — AUTOMÓVILES (63) Y MOTOCICLETAS (25) --- */}
                  {reportTab === 'parking_access' && (
                    <View>
                      <Text style={styles.reportDocTitle}>
                        CONTROL DE ACCESO A PARQUEADERO — VEHÍCULOS AUTORIZADOS
                      </Text>
                      <View style={styles.docDivider} />

                      {(() => {
                        const fixedCars = filteredReportFixedVehicles.filter(v => getVehicleType(v) !== 'moto');
                        const fixedMotos = filteredReportFixedVehicles.filter(v => getVehicleType(v) === 'moto');
                        const freeCars = filteredReportFreeVehicles.filter(v => getVehicleType(v) !== 'moto');
                        const freeMotos = filteredReportFreeVehicles.filter(v => getVehicleType(v) === 'moto');
                        const totalCars = fixedCars.length + freeCars.length;
                        const totalMotos = fixedMotos.length + freeMotos.length;
                        const totalVehicles = totalCars + totalMotos;

                        return (
                          <View>
                            <View style={styles.reportDocMetaGrid}>
                              <Text style={styles.reportMetaLabel}>Periodo Evaluado: <Text style={{fontWeight:'400'}}>{reportPeriodLabel}</Text></Text>
                              <Text style={styles.reportMetaLabel}>Total Vehículos Autorizados: <Text style={{fontWeight:'400'}}>{totalVehicles} vehículos</Text></Text>
                              <Text style={styles.reportMetaLabel}>Automóviles (Carros): <Text style={{fontWeight:'400', color: '#1D4ED8'}}>{totalCars} vehículos ({fixedCars.length} fijas, {freeCars.length} uso libre)</Text></Text>
                              <Text style={styles.reportMetaLabel}>Motocicletas (Motos): <Text style={{fontWeight:'400', color: '#C2410C'}}>{totalMotos} motos ({fixedMotos.length} cupos fijos, {freeMotos.length} uso libre)</Text></Text>
                              <Text style={styles.reportMetaLabel}>Cupos Fijos Asignados: <Text style={{fontWeight:'400'}}>{fixedCars.length + fixedMotos.length} vehículos</Text></Text>
                              <Text style={styles.reportMetaLabel}>Modalidad Uso Libre Rotativo: <Text style={{fontWeight:'400'}}>{freeCars.length + freeMotos.length} vehículos</Text></Text>
                            </View>

                            {/* 1. Apartado: Automóviles (Carros) */}
                            <View style={{ marginTop: 12 }}>
                              <Text style={styles.reportSectionTitle}>
                                1. CONTROL DE ACCESO — AUTOMÓVILES (CARROS) ({totalCars} vehículos)
                              </Text>
                              <Text style={[styles.cardSubtitle, { marginBottom: 10 }]}>
                                Automóviles de funcionarios y contratistas autorizados para el ingreso a la sede distrital
                              </Text>

                              {/* 1.1 Carros con Celda Fija */}
                              <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8', marginBottom: 6 }}>
                                  1.1 AUTOMÓVILES CON CELDA FIJA ASIGNADA ({fixedCars.length})
                                </Text>
                                <View style={styles.reportTable}>
                                  <View style={styles.reportTableHeader}>
                                    <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '800' }]}>PERSONA TITULAR</Text>
                                    <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>IDENTIFICACIÓN</Text>
                                    <Text style={[styles.tableCell, { width: 110, minWidth: 105, fontWeight: '800', textAlign: 'center' }]}>PLACA</Text>
                                    <Text style={[styles.tableCell, { flex: 1.4, fontWeight: '800' }]}>VEHÍCULO</Text>
                                    <Text style={[styles.tableCell, { flex: 1.0, fontWeight: '800', textAlign: 'center' }]}>CELDA ASIGNADA</Text>
                                    <Text style={[styles.tableCell, { flex: 0.8, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                                  </View>
                                  {fixedCars.length > 0 ? (
                                    fixedCars.map((v, idx) => (
                                      <View key={v.id || idx} style={styles.reportTableRow}>
                                        <Text style={[styles.tableCell, { flex: 1.5, color: COLORS.primary, fontWeight: '700' }]}>
                                          {v.name || v.owner_name || 'Servidor'}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.9, color: COLORS.text, textAlign: 'center' }]}>
                                          {v.doc || 'S/N'}
                                        </Text>
                                        <View style={{ width: 110, minWidth: 105, alignItems: 'center', justifyContent: 'center' }}>
                                          <View style={styles.reportPlateBadge}>
                                            <Text style={styles.reportPlateBadgeText}>{v.plate}</Text>
                                          </View>
                                        </View>
                                        <Text style={[styles.tableCell, { flex: 1.4, color: COLORS.text }]}>
                                          {v.brand} {v.model ? `• ${v.model}` : ''} {v.color ? `(${v.color})` : ''}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 1.0, fontWeight: '800', color: '#1D4ED8', textAlign: 'center' }]}>
                                          {v.spot_code ? `Celda ${v.spot_code}` : 'Celda Fija'}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'center', fontWeight: '800', color: v.is_active !== false ? '#059669' : '#DC2626' }]}>
                                          {v.is_active !== false ? 'ACTIVO' : 'INACTIVO'}
                                        </Text>
                                      </View>
                                    ))
                                  ) : (
                                    <View style={{ padding: 10 }}>
                                      <Text style={styles.noDataText}>No se registran automóviles con celda fija</Text>
                                    </View>
                                  )}
                                </View>
                              </View>

                              {/* 1.2 Carros Uso Libre */}
                              <View>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#6D28D9', marginBottom: 6 }}>
                                  1.2 AUTOMÓVILES EN MODALIDAD DE USO LIBRE ROTATIVO ({freeCars.length})
                                </Text>
                                <View style={styles.reportTable}>
                                  <View style={styles.reportTableHeader}>
                                    <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '800' }]}>PERSONA TITULAR</Text>
                                    <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>IDENTIFICACIÓN</Text>
                                    <Text style={[styles.tableCell, { width: 110, minWidth: 105, fontWeight: '800', textAlign: 'center' }]}>PLACA</Text>
                                    <Text style={[styles.tableCell, { flex: 1.4, fontWeight: '800' }]}>VEHÍCULO</Text>
                                    <Text style={[styles.tableCell, { flex: 1.0, fontWeight: '800', textAlign: 'center' }]}>MODALIDAD</Text>
                                    <Text style={[styles.tableCell, { flex: 0.8, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                                  </View>
                                  {freeCars.length > 0 ? (
                                    freeCars.map((v, idx) => (
                                      <View key={v.id || idx} style={styles.reportTableRow}>
                                        <Text style={[styles.tableCell, { flex: 1.5, color: COLORS.primary, fontWeight: '700' }]}>
                                          {v.name || v.owner_name || 'Servidor'}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.9, color: COLORS.text, textAlign: 'center' }]}>
                                          {v.doc || 'S/N'}
                                        </Text>
                                        <View style={{ width: 110, minWidth: 105, alignItems: 'center', justifyContent: 'center' }}>
                                          <View style={styles.reportPlateBadge}>
                                            <Text style={styles.reportPlateBadgeText}>{v.plate}</Text>
                                          </View>
                                        </View>
                                        <Text style={[styles.tableCell, { flex: 1.4, color: COLORS.text }]}>
                                          {v.brand} {v.model ? `• ${v.model}` : ''} {v.color ? `(${v.color})` : ''}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 1.0, color: '#7C3AED', fontWeight: '700', textAlign: 'center' }]}>
                                          Uso Libre
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'center', fontWeight: '800', color: v.is_active !== false ? '#059669' : '#DC2626' }]}>
                                          {v.is_active !== false ? 'ACTIVO' : 'INACTIVO'}
                                        </Text>
                                      </View>
                                    ))
                                  ) : (
                                    <View style={{ padding: 10 }}>
                                      <Text style={styles.noDataText}>No se registran automóviles en modalidad rotativa</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            </View>

                            {/* 2. Apartado: Motocicletas (Motos) */}
                            <View style={{ marginTop: 24 }}>
                              <Text style={styles.reportSectionTitle}>
                                2. CONTROL DE ACCESO — MOTOCICLETAS (MOTOS) ({totalMotos} motos)
                              </Text>
                              <Text style={[styles.cardSubtitle, { marginBottom: 10 }]}>
                                Motocicletas autorizadas formalmente para ingreso y parqueo institucional
                              </Text>

                              {/* 2.1 Motos con Cupo Fijo */}
                              <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8', marginBottom: 6 }}>
                                  2.1 MOTOCICLETAS CON CUPO ASIGNADO / FIJO ({fixedMotos.length})
                                </Text>
                                <View style={styles.reportTable}>
                                  <View style={styles.reportTableHeader}>
                                    <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '800' }]}>PERSONA TITULAR</Text>
                                    <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>IDENTIFICACIÓN</Text>
                                    <Text style={[styles.tableCell, { width: 110, minWidth: 105, fontWeight: '800', textAlign: 'center' }]}>PLACA</Text>
                                    <Text style={[styles.tableCell, { flex: 1.4, fontWeight: '800' }]}>MOTOCICLETA / LÍNEA</Text>
                                    <Text style={[styles.tableCell, { flex: 1.0, fontWeight: '800', textAlign: 'center' }]}>CUPO ASIGNADO</Text>
                                    <Text style={[styles.tableCell, { flex: 0.8, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                                  </View>
                                  {fixedMotos.length > 0 ? (
                                    fixedMotos.map((v, idx) => (
                                      <View key={v.id || idx} style={styles.reportTableRow}>
                                        <Text style={[styles.tableCell, { flex: 1.5, color: COLORS.primary, fontWeight: '700' }]}>
                                          {v.name || v.owner_name || 'Servidor'}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.9, color: COLORS.text, textAlign: 'center' }]}>
                                          {v.doc || 'S/N'}
                                        </Text>
                                        <View style={{ width: 110, minWidth: 105, alignItems: 'center', justifyContent: 'center' }}>
                                          <View style={styles.reportPlateBadge}>
                                            <Text style={styles.reportPlateBadgeText}>{v.plate}</Text>
                                          </View>
                                        </View>
                                        <Text style={[styles.tableCell, { flex: 1.4, color: COLORS.text }]}>
                                          {v.brand} {v.model ? `• ${v.model}` : ''} {v.color ? `(${v.color})` : ''}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 1.0, fontWeight: '800', color: '#1D4ED8', textAlign: 'center' }]}>
                                          {v.spot_code ? `Celda ${v.spot_code}` : 'Cupo Fijo'}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'center', fontWeight: '800', color: v.is_active !== false ? '#059669' : '#DC2626' }]}>
                                          {v.is_active !== false ? 'ACTIVO' : 'INACTIVO'}
                                        </Text>
                                      </View>
                                    ))
                                  ) : (
                                    <View style={{ padding: 10 }}>
                                      <Text style={styles.noDataText}>No se registran motocicletas con cupo fijo asignado</Text>
                                    </View>
                                  )}
                                </View>
                              </View>

                              {/* 2.2 Motos Uso Libre */}
                              <View>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#6D28D9', marginBottom: 6 }}>
                                  2.2 MOTOCICLETAS EN MODALIDAD DE USO LIBRE ROTATIVO ({freeMotos.length})
                                </Text>
                                <View style={styles.reportTable}>
                                  <View style={styles.reportTableHeader}>
                                    <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '800' }]}>PERSONA TITULAR</Text>
                                    <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>IDENTIFICACIÓN</Text>
                                    <Text style={[styles.tableCell, { width: 110, minWidth: 105, fontWeight: '800', textAlign: 'center' }]}>PLACA</Text>
                                    <Text style={[styles.tableCell, { flex: 1.4, fontWeight: '800' }]}>MOTOCICLETA / LÍNEA</Text>
                                    <Text style={[styles.tableCell, { flex: 1.0, fontWeight: '800', textAlign: 'center' }]}>MODALIDAD</Text>
                                    <Text style={[styles.tableCell, { flex: 0.8, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                                  </View>
                                  {freeMotos.length > 0 ? (
                                    freeMotos.map((v, idx) => (
                                      <View key={v.id || idx} style={styles.reportTableRow}>
                                        <Text style={[styles.tableCell, { flex: 1.5, color: COLORS.primary, fontWeight: '700' }]}>
                                          {v.name || v.owner_name || 'Servidor'}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.9, color: COLORS.text, textAlign: 'center' }]}>
                                          {v.doc || 'S/N'}
                                        </Text>
                                        <View style={{ width: 110, minWidth: 105, alignItems: 'center', justifyContent: 'center' }}>
                                          <View style={styles.reportPlateBadge}>
                                            <Text style={styles.reportPlateBadgeText}>{v.plate}</Text>
                                          </View>
                                        </View>
                                        <Text style={[styles.tableCell, { flex: 1.4, color: COLORS.text }]}>
                                          {v.brand} {v.model ? `• ${v.model}` : ''} {v.color ? `(${v.color})` : ''}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 1.0, color: '#7C3AED', fontWeight: '700', textAlign: 'center' }]}>
                                          Uso Libre
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'center', fontWeight: '800', color: v.is_active !== false ? '#059669' : '#DC2626' }]}>
                                          {v.is_active !== false ? 'ACTIVO' : 'INACTIVO'}
                                        </Text>
                                      </View>
                                    ))
                                  ) : (
                                    <View style={{ padding: 10 }}>
                                      <Text style={styles.noDataText}>No se registran motocicletas en modalidad rotativa</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            </View>
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {/* --- 4. REPORTE 3: SOLICITUDES DE PARQUEADERO DEL PERIODO --- */}
                  {reportTab === 'parking_requests' && (
                    <View>
                      <Text style={styles.reportDocTitle}>
                        REPORTE DE SOLICITUDES DE PARQUEADERO DEL PERIODO
                      </Text>
                      <View style={styles.docDivider} />

                      {(() => {
                        const parkingReqs = dbData.filter(d => (d.category || '').toLowerCase() === 'parking');
                        const pApproved = parkingReqs.filter(d => d.status === 'resuelto').length;
                        const pPending = parkingReqs.filter(d => d.status === 'pendiente').length;
                        const pInProgress = parkingReqs.filter(d => d.status === 'en_proceso' || d.status === 'en proceso').length;
                        const pRejected = parkingReqs.filter(d => d.status === 'rechazado').length;

                        return (
                          <View>
                            <View style={styles.reportDocMetaGrid}>
                              <Text style={styles.reportMetaLabel}>Periodo Evaluado: <Text style={{fontWeight:'400'}}>{reportPeriodLabel}</Text></Text>
                              <Text style={styles.reportMetaLabel}>Total Solicitudes: <Text style={{fontWeight:'400'}}>{parkingReqs.length} trámites</Text></Text>
                              <Text style={styles.reportMetaLabel}>Aprobadas / Resueltas: <Text style={{fontWeight:'400', color: COLORS.success}}>{pApproved}</Text></Text>
                              <Text style={styles.reportMetaLabel}>En Proceso: <Text style={{fontWeight:'400', color: COLORS.accent}}>{pInProgress}</Text></Text>
                              <Text style={styles.reportMetaLabel}>Pendientes: <Text style={{fontWeight:'400', color: COLORS.warning}}>{pPending}</Text></Text>
                              <Text style={styles.reportMetaLabel}>Rechazadas: <Text style={{fontWeight:'400', color: COLORS.danger}}>{pRejected}</Text></Text>
                              {isEvalActive('parking') && (
                                <Text style={styles.reportMetaLabel}>Promedio CSAT: <Text style={{fontWeight:'400', color: '#B45309'}}>{stats.moduleEvaluations.parking?.avg > 0 ? `★ ${stats.moduleEvaluations.parking.avg.toFixed(1)} / 5.0` : 'Sin evaluar'}</Text></Text>
                              )}
                            </View>

                            <Text style={styles.reportSectionTitle}>HISTORIAL DE SOLICITUDES DEL PERIODO</Text>
                            <Text style={[styles.cardSubtitle, { marginBottom: 10 }]}>Haz clic sobre cualquier solicitud para abrir su gestión detallada</Text>
                            <View style={styles.reportTable}>
                              <View style={styles.reportTableHeader}>
                                <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '800' }]}>FECHA</Text>
                                <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '800' }]}>PLACA</Text>
                                <Text style={[styles.tableCell, { flex: 1.6, fontWeight: '800' }]}>VEHÍCULO / MODELO</Text>
                                <Text style={[styles.tableCell, { flex: 1.3, fontWeight: '800' }]}>SOLICITANTE</Text>
                                <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '800' }]}>DEPENDENCIA</Text>
                                <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                                {isEvalActive('parking') && (
                                  <Text style={[styles.tableCell, { flex: 0.8, fontWeight: '800', textAlign: 'center' }]}>CALIF.</Text>
                                )}
                              </View>
                              {parkingReqs.length > 0 ? (
                                parkingReqs.map((r, idx) => {
                                  const vModel = [r.metadata?.brand, r.metadata?.model].filter(Boolean).join(' ') || r.metadata?.vehicleType || r.title || 'Vehículo particular';
                                  const reqName = r.metadata?.name || r.profiles?.full_name || r.user_name || 'Servidor';
                                  const depName = r.metadata?.dependency || r.profiles?.dependency?.name || r.profiles?.dependency || r.user_dependency || 'Secretaría Jurídica Distrital';
                                  return (
                                    <TouchableOpacity 
                                      key={r.id || idx} 
                                      style={[styles.reportTableRow, { cursor: 'pointer' } as any]}
                                      activeOpacity={0.7}
                                      onPress={() => navigateToManage({ id: r.id })}
                                    >
                                      <Text style={[styles.tableCell, { flex: 1.1, color: COLORS.text }]}>{new Date(r.created_at).toLocaleDateString('es-CO')}</Text>
                                      <Text style={[styles.tableCell, { flex: 1.1, color: COLORS.primary, fontWeight: '900' }]}>{r.metadata?.plate || 'Sin placa'}</Text>
                                      <Text style={[styles.tableCell, { flex: 1.6, color: COLORS.text }]}>{vModel}</Text>
                                      <Text style={[styles.tableCell, { flex: 1.3, color: COLORS.text }]}>{reqName}</Text>
                                      <Text style={[styles.tableCell, { flex: 1.5, color: COLORS.text }]}>{depName}</Text>
                                      <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', color: COLORS.text, fontWeight: '700' }]}>{r.status?.toUpperCase()}</Text>
                                      {isEvalActive('parking') && (
                                        <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'center', color: '#B45309', fontWeight: '800' }]}>
                                          {r.metadata?.evaluation?.rating ? `★ ${Number(r.metadata.evaluation.rating).toFixed(1)}` : '—'}
                                        </Text>
                                      )}
                                    </TouchableOpacity>
                                  );
                                })
                              ) : (
                                <View style={{ padding: 14 }}>
                                  <Text style={styles.noDataText}>No se registran solicitudes de parqueadero en el periodo</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {/* --- 5. REPORTE RESERVA DE SALAS --- */}
                  {reportTab === 'rooms' && (
                    <View>
                      <Text style={styles.reportDocTitle}>
                        REPORTE DE OCUPACIÓN Y DEMANDA DE SALAS DE JUNTAS
                      </Text>
                      <View style={styles.docDivider} />

                      <View style={styles.reportDocMetaGrid}>
                        <Text style={styles.reportMetaLabel}>Periodo Evaluado: <Text style={{fontWeight:'400'}}>{reportPeriodLabel}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Total Eventos y Reuniones: <Text style={{fontWeight:'400'}}>{roomStats.totalReservations}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Asistencia Promedio: <Text style={{fontWeight:'400'}}>{roomStats.averageAttendees} personas por evento</Text></Text>
                        <Text style={styles.reportMetaLabel}>Demanda Servicios: <Text style={{fontWeight:'400'}}>Café: {roomStats.services.coffee}% | Proyector: {roomStats.services.projector}% | Laptops: {roomStats.services.laptop}%</Text></Text>
                      </View>

                      <Text style={styles.reportSectionTitle}>1. GESTIÓN DE ESPACIOS DE REUNIÓN</Text>
                      <Text style={styles.reportParagraph}>
                        Se facilitaron **{roomStats.totalReservations}** reservaciones de salas para eventos oficiales y reuniones de trabajo de las distintas dependencias de la entidad, con un promedio de **{roomStats.averageAttendees}** participantes por reunión.
                      </Text>

                      <Text style={styles.reportSectionTitle}>2. FRECUENCIA DE USO POR SALA DE JUNTAS</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>SALA DE JUNTAS</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>REUNIONES</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>% OCUPACIÓN</Text>
                        </View>
                        {roomStats.roomsList.map((rm, idx) => (
                          <TouchableOpacity 
                            key={idx} 
                            style={[styles.reportTableRow, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ service: 'Salas' })}
                          >
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text, fontWeight: '700' }]}>{rm.name}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{rm.count}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>
                              {roomStats.totalReservations > 0 ? Math.round((rm.count / roomStats.totalReservations) * 100) : 0}%
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.reportSectionTitle}>3. REGISTRO COMPLETO DE REUNIONES Y RESERVAS DE SALAS</Text>
                      <Text style={[styles.cardSubtitle, { marginBottom: 10 }]}>Haz clic sobre cualquier reunión para abrir su detalle completo</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '800' }]}>FECHA</Text>
                          <Text style={[styles.tableCell, { flex: 1.9, fontWeight: '800' }]}>ASUNTO</Text>
                          <Text style={[styles.tableCell, { flex: 1.3, fontWeight: '800' }]}>SALA</Text>
                          <Text style={[styles.tableCell, { flex: 0.7, fontWeight: '800', textAlign: 'center' }]}>ASIST.</Text>
                          <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                          {isEvalActive('rooms') && (
                            <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>CALIF.</Text>
                          )}
                        </View>
                        {dbData.filter(d => d.category === 'rooms').map((r, idx) => (
                          <TouchableOpacity 
                            key={r.id || idx} 
                            style={[styles.reportTableRow, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ id: r.id })}
                          >
                            <Text style={[styles.tableCell, { flex: 1.1, color: COLORS.text }]}>{new Date(r.created_at).toLocaleDateString('es-CO')}</Text>
                            <Text style={[styles.tableCell, { flex: 1.9, color: COLORS.primary, fontWeight: '700' }]}>{r.title || 'Reunión'}</Text>
                            <Text style={[styles.tableCell, { flex: 1.3, color: COLORS.text }]}>{r.metadata?.room?.name || 'General'}</Text>
                            <Text style={[styles.tableCell, { flex: 0.7, textAlign: 'center', color: COLORS.text }]}>{r.metadata?.attendees || '-'}</Text>
                            <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', color: COLORS.text, fontWeight: '700' }]}>{r.status?.toUpperCase()}</Text>
                            {isEvalActive('rooms') && (
                              <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', color: '#B45309', fontWeight: '800' }]}>{r.metadata?.evaluation?.rating ? `★ ${Number(r.metadata.evaluation.rating).toFixed(1)}` : '—'}</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* --- 6. REPORTE FLOTA DE TRANSPORTE --- */}
                  {reportTab === 'transport' && (
                    <View>
                      <Text style={styles.reportDocTitle}>
                        REPORTE DE MOVILIDAD INSTITUCIONAL Y COMISIONES DE TRANSPORTE
                      </Text>
                      <View style={styles.docDivider} />

                      <View style={styles.reportDocMetaGrid}>
                        <Text style={styles.reportMetaLabel}>Periodo Evaluado: <Text style={{fontWeight:'400'}}>{reportPeriodLabel}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Total Misiones de Viaje: <Text style={{fontWeight:'400'}}>{transportStats.totalRequests}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Servidores Movilizados: <Text style={{fontWeight:'400'}}>{transportStats.totalPassengers} funcionarios</Text></Text>
                        <Text style={styles.reportMetaLabel}>Promedio Pasajeros/Misión: <Text style={{fontWeight:'400'}}>{transportStats.totalRequests > 0 ? Math.round((transportStats.totalPassengers / transportStats.totalRequests) * 10) / 10 : 0} personas</Text></Text>
                      </View>

                      <Text style={styles.reportSectionTitle}>1. BALANCE OPERATIVO DE TRANSPORTE</Text>
                      <Text style={styles.reportParagraph}>
                        Se llevaron a cabo **{transportStats.totalRequests}** comisiones terrestres institucionales, asegurando el traslado seguro y oportuno de **{transportStats.totalPassengers}** funcionarios distritales en el cumplimiento de sus labores oficiales.
                      </Text>

                      <Text style={styles.reportSectionTitle}>2. RUTAS Y TRAYECTOS FRECUENTES</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 2.5, fontWeight: '800' }]}>TRAYECTO OFICIAL</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>VIAJES</Text>
                        </View>
                        {transportStats.routes.slice(0, 8).map((rt, idx) => (
                          <TouchableOpacity 
                            key={idx} 
                            style={[styles.reportTableRow, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ service: 'Transporte' })}
                          >
                            <Text style={[styles.tableCell, { flex: 2.5, color: COLORS.text, fontWeight: '700' }]}>{rt.name}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{rt.count}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.reportSectionTitle}>3. REGISTRO COMPLETO DE MISIONES DE TRANSPORTE</Text>
                      <Text style={[styles.cardSubtitle, { marginBottom: 10 }]}>Haz clic sobre cualquier comisión para abrir su detalle completo</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '800' }]}>FECHA</Text>
                          <Text style={[styles.tableCell, { flex: 1.8, fontWeight: '800' }]}>ASUNTO / MISIÓN</Text>
                          <Text style={[styles.tableCell, { flex: 1.8, fontWeight: '800' }]}>RUTA</Text>
                          <Text style={[styles.tableCell, { flex: 0.7, fontWeight: '800', textAlign: 'center' }]}>PASAJ.</Text>
                          <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                          {isEvalActive('transport') && (
                            <Text style={[styles.tableCell, { flex: 0.9, fontWeight: '800', textAlign: 'center' }]}>CALIF.</Text>
                          )}
                        </View>
                        {dbData.filter(d => d.category === 'transport').map((r, idx) => (
                          <TouchableOpacity 
                            key={r.id || idx} 
                            style={[styles.reportTableRow, { cursor: 'pointer' } as any]}
                            activeOpacity={0.7}
                            onPress={() => navigateToManage({ id: r.id })}
                          >
                            <Text style={[styles.tableCell, { flex: 1.1, color: COLORS.text }]}>{new Date(r.created_at).toLocaleDateString('es-CO')}</Text>
                            <Text style={[styles.tableCell, { flex: 1.8, color: COLORS.primary, fontWeight: '700' }]}>{r.title || 'Misión oficial'}</Text>
                            <Text style={[styles.tableCell, { flex: 1.8, color: COLORS.text }]}>{r.metadata?.origin || 'Origen'} - {r.metadata?.destination || 'Destino'}</Text>
                            <Text style={[styles.tableCell, { flex: 0.7, textAlign: 'center', color: COLORS.text }]}>{r.metadata?.passengers || 1}</Text>
                            <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', color: COLORS.text, fontWeight: '700' }]}>{r.status?.toUpperCase()}</Text>
                            {isEvalActive('transport') && (
                              <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'center', color: '#B45309', fontWeight: '800' }]}>{r.metadata?.evaluation?.rating ? `★ ${Number(r.metadata.evaluation.rating).toFixed(1)}` : '—'}</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* --- 7. REPORTE OFICIAL DE SATISFACCIÓN Y CALIDAD DEL SERVICIO (CSAT) --- */}
                  {reportTab === 'satisfaction' && (
                    <View>
                      <Text style={styles.reportDocTitle}>
                        REPORTE OFICIAL DE SATISFACCIÓN DE USUARIOS Y CALIDAD DEL SERVICIO (CSAT)
                      </Text>
                      <View style={styles.docDivider} />

                      <View style={styles.reportDocMetaGrid}>
                        <Text style={styles.reportMetaLabel}>Periodo Evaluado: <Text style={{fontWeight:'400'}}>{reportPeriodLabel}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Índice Global CSAT: <Text style={{fontWeight:'800', color: stats.averageRating >= 4 ? COLORS.success : COLORS.warning}}>{stats.averageRating > 0 ? `${stats.averageRating} / 5.0 ★` : 'Sin datos'}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Encuestas Diligenciadas: <Text style={{fontWeight:'400'}}>{stats.totalEvaluated} ({stats.responseRate}% de solicitudes resueltas)</Text></Text>
                        <Text style={styles.reportMetaLabel}>Percepción Favorable: <Text style={{fontWeight:'800', color: COLORS.success}}>{stats.favorablePercent}% (4 y 5 estrellas)</Text></Text>
                      </View>

                      <Text style={styles.reportSectionTitle}>1. BALANCE EJECUTIVO DE PERCEPCIÓN INSTITUCIONAL</Text>
                      <Text style={styles.reportParagraph}>
                        Durante el periodo analizado ({reportPeriodLabel}), la gestión de servicios administrativos de la Secretaría Jurídica Distrital obtuvo un promedio de satisfacción de **{stats.averageRating} / 5.0 estrellas**, con un **{stats.favorablePercent}%** de conceptos altamente favorables. De las **{stats.resolved}** solicitudes resueltas con éxito en el sistema SASGE, se consolidaron **{stats.totalEvaluated}** encuestas de satisfacción diligenciadas por funcionarios y colaboradores de las diferentes dependencias distritales.
                      </Text>

                      <Text style={styles.reportSectionTitle}>2. DISTRIBUCIÓN DE CALIFICACIONES (ESCALA 1 A 5 ESTRELLAS)</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>ESCALA DE VALORACIÓN</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>ENCUESTAS</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>PARTICIPACIÓN</Text>
                          <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '800', textAlign: 'center' }]}>NIVEL PERCEPCIÓN</Text>
                        </View>
                        {[
                          { star: 5, label: '★★★★★ (5 Estrellas)', desc: 'Excelente', color: '#059669' },
                          { star: 4, label: '★★★★☆ (4 Estrellas)', desc: 'Bueno / Favorable', color: '#10B981' },
                          { star: 3, label: '★★★☆☆ (3 Estrellas)', desc: 'Aceptable', color: '#D97706' },
                          { star: 2, label: '★★☆☆☆ (2 Estrellas)', desc: 'Regular', color: '#EA580C' },
                          { star: 1, label: '★☆☆☆☆ (1 Estrella)', desc: 'Deficiente / Crítico', color: '#DC2626' },
                        ].map((scale) => {
                          const count = stats.ratingCounts[scale.star] || 0;
                          const pct = stats.totalEvaluated > 0 ? Math.round((count / stats.totalEvaluated) * 100) : 0;
                          return (
                            <View key={scale.star} style={styles.reportTableRow}>
                              <Text style={[styles.tableCell, { flex: 2, color: COLORS.text, fontWeight: '700' }]}>{scale.label}</Text>
                              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{count}</Text>
                              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{pct}%</Text>
                              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'center', color: scale.color, fontWeight: '800' }]}>{scale.desc}</Text>
                            </View>
                          );
                        })}
                      </View>

                      <Text style={styles.reportSectionTitle}>3. CALIDAD Y SATISFACCIÓN POR SERVICIO OPERATIVO</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>SERVICIO / MÓDULO</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>ENCUESTAS</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>PROMEDIO</Text>
                          <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '800', textAlign: 'center' }]}>ESTADO DE CALIDAD</Text>
                        </View>
                        {[
                          { key: 'visitors', name: 'Control de Acceso y Visitantes', srv: 'Visitantes' },
                          { key: 'maintenance', name: 'Mantenimiento Locativo', srv: 'Mantenimiento' },
                          { key: 'parking', name: 'Acceso Parqueadero', srv: 'Parqueadero' },
                          { key: 'rooms', name: 'Reserva de Salas de Juntas', srv: 'Salas' },
                          { key: 'transport', name: 'Transporte Oficial', srv: 'Transporte' },
                        ].filter(mod => isEvalActive(mod.key)).map((mod) => {
                          const modEval = stats.moduleEvaluations[mod.key as keyof typeof stats.moduleEvaluations];
                          const avg = modEval?.avg || 0;
                          const count = modEval?.count || 0;
                          const statusText = count === 0 ? 'Sin evaluar' : avg >= 4.5 ? 'Sobresaliente' : avg >= 4.0 ? 'Excelente' : avg >= 3.0 ? 'Aceptable' : 'Oportunidad de Mejora';
                          const statusColor = count === 0 ? COLORS.muted : avg >= 4.0 ? '#059669' : avg >= 3.0 ? '#D97706' : '#DC2626';
                          return (
                            <TouchableOpacity 
                              key={mod.key} 
                              style={[styles.reportTableRow, { cursor: 'pointer' } as any]}
                              activeOpacity={0.7}
                              onPress={() => navigateToManage({ service: mod.srv })}
                            >
                              <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.tableCell, { flex: 1, color: COLORS.text, fontWeight: '700' }]}>{mod.name}</Text>
                                <Ionicons name="open-outline" size={12} color={COLORS.accent} />
                              </View>
                              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{count}</Text>
                              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: '#B45309', fontWeight: '800' }]}>{count > 0 ? `★ ${avg.toFixed(1)}` : '—'}</Text>
                              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'center', color: statusColor, fontWeight: '800' }]}>{statusText}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text style={styles.reportSectionTitle}>4. RETROALIMENTACIÓN CUALITATIVA Y COMENTARIOS DE USUARIOS</Text>
                      <Text style={[styles.cardSubtitle, { marginBottom: 10 }]}>Haz clic sobre cualquier comentario para abrir la solicitud evaluada</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '800' }]}>FECHA</Text>
                          <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '800' }]}>SERVICIO</Text>
                          <Text style={[styles.tableCell, { flex: 0.8, fontWeight: '800', textAlign: 'center' }]}>CALIF.</Text>
                          <Text style={[styles.tableCell, { flex: 3, fontWeight: '800' }]}>COMENTARIO / OBSERVACIÓN</Text>
                        </View>
                        {dbData.filter(d => isEvalActive(d.category) && d.metadata?.evaluation?.comment).map((r, idx) => {
                          const meta = getModuleMeta(r.category);
                          return (
                            <TouchableOpacity 
                              key={r.id || idx} 
                              style={[styles.reportTableRow, { cursor: 'pointer' } as any]}
                              activeOpacity={0.7}
                              onPress={() => navigateToManage({ id: r.id })}
                            >
                              <Text style={[styles.tableCell, { flex: 1.1, color: COLORS.text }]}>
                                {r.metadata?.evaluation?.date ? formatDisplayDate(r.metadata.evaluation.date) : formatDisplayDate(r.created_at)}
                              </Text>
                              <Text style={[styles.tableCell, { flex: 1.5, color: meta.color, fontWeight: '700' }]}>{meta.name}</Text>
                              <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'center', color: '#B45309', fontWeight: '800' }]}>★ {r.metadata?.evaluation?.rating}</Text>
                              <Text style={[styles.tableCell, { flex: 3, color: COLORS.text, fontStyle: 'italic' }]} numberOfLines={2}>
                                "{r.metadata?.evaluation?.comment}"
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        {dbData.filter(d => d.metadata?.evaluation?.comment).length === 0 && (
                          <View style={styles.reportTableRow}>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.muted, fontStyle: 'italic' }]}>
                              No se registran comentarios cualitativos en las encuestas de este periodo
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Bloque de firma institucional común para todos los reportes */}
                  <View style={styles.firmaBox}>
                    <View style={styles.firmaLinea} />
                    <Text style={styles.firmaTexto}>Dirección de Gestión Corporativa</Text>
                    <Text style={styles.firmaSub}>Secretaría Jurídica Distrital • Alcaldía Mayor de Bogotá D.C.</Text>
                  </View>
                </ScrollView>

                {/* Acciones de descarga */}
                <View style={styles.reportDocFooter}>
                  <TouchableOpacity style={styles.cancelReportBtn} onPress={() => setShowDocModal(false)}>
                    <Text style={styles.cancelReportText}>Cerrar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.printReportBtn, { backgroundColor: COLORS.success }]} 
                    onPress={handleExportCurrentModalExcel}
                  >
                    <Ionicons name="download-outline" size={20} color={COLORS.white} />
                    <Text style={styles.printReportText}>Exportar a Excel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.printReportBtn} onPress={handlePrintReport}>
                    <Ionicons name="print-outline" size={20} color={COLORS.white} />
                    <Text style={styles.printReportText}>Imprimir / Guardar PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- COMPONENTE DE TARJETA DE SATISFACCIÓN (CSAT) POR SUBMÓDULO ---
interface ModuleCSATCardProps {
  moduleName: string;
  category: string;
  stats: any;
  color: string;
  onPressComment?: (id: string) => void;
}

function ModuleCSATCard({ moduleName, category, stats, color, onPressComment }: ModuleCSATCardProps) {
  const modData = stats.moduleEvaluations?.[category];
  const avg = modData?.avg || 0;
  const count = modData?.count || 0;
  const modComments = (stats.recentEvaluations || []).filter((e: any) => e.category === category);

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${color}18`, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="star" size={22} color="#D97706" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.cardTitle}>Satisfacción y Calidad de Atención</Text>
              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#92400E' }}>CSAT</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>Percepción y calificaciones de servidores usuarios de {moduleName}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: count > 0 ? '#FEF3C7' : COLORS.bg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: count > 0 ? '#FDE68A' : COLORS.line }}>
          <Ionicons name="star" size={18} color="#D97706" />
          <Text style={{ fontSize: 16, fontWeight: '900', color: count > 0 ? '#92400E' : COLORS.muted }}>
            {avg > 0 ? `${avg.toFixed(1)} / 5.0` : 'Sin calificaciones'}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: count > 0 ? '#B45309' : COLORS.muted }}>
            ({count} {count === 1 ? 'evaluación' : 'evaluaciones'})
          </Text>
        </View>
      </View>

      {modComments.length > 0 && (
        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 14, gap: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primarySoft, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            COMENTARIOS RECIENTES DE FUNCIONARIOS (CLIC PARA ABRIR SOLICITUD)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {modComments.slice(0, 3).map((item: any, idx: number) => (
              <TouchableOpacity 
                key={item.id || idx} 
                style={[{ flex: 1, minWidth: 260, backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.line }, onPressComment ? { cursor: 'pointer' } as any : {}]}
                activeOpacity={onPressComment ? 0.75 : 1}
                onPress={() => onPressComment && item.id && onPressComment(item.id)}
                disabled={!onPressComment}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>
                      {item.profiles?.full_name || 'Funcionario'}
                    </Text>
                    {onPressComment && <Ionicons name="open-outline" size={11} color={COLORS.accent} />}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 1 }}>
                    {[1, 2, 3, 4, 5].map((s: number) => (
                      <Ionicons key={s} name={item.metadata?.evaluation?.rating >= s ? 'star' : 'star-outline'} size={11} color="#D97706" />
                    ))}
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: COLORS.text, fontStyle: 'italic', lineHeight: 16 }}>
                  "{item.metadata?.evaluation?.comment}"
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// --- COMPONENTE DE GRÁFICO CIRCULAR DE PROGRESO (DONUT CHART) ---

interface CircularProgressProps {
  percent: number;
  color: string;
}

function CircularProgress({ percent, color }: CircularProgressProps) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    fillAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 30,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true
      }),
      Animated.timing(fillAnim, {
        toValue: percent,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false
      })
    ]).start();
  }, [percent]);

  // Rotación decorativa del anillo exterior para darle sensación dinámica
  const spinValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    spinValue.setValue(0);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
  }, [percent]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Animated.View style={[styles.circularOuterWrapper, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      {/* Anillo de fondo simulado con sombras */}
      <View style={[styles.circularTrackRing, { borderColor: COLORS.line }]} />
      
      {/* Semicírculo animado para color principal */}
      <Animated.View style={[styles.circularFillRing, { 
        borderColor: color, 
        transform: [{ rotate: spin }] 
      }]} />

      {/* Centro blanco (Efecto Donut) */}
      <View style={styles.circularHole}>
        <AnimatedTextValue animatedValue={fillAnim} />
        <Text style={styles.circularLabel}>Efectivo</Text>
      </View>
    </Animated.View>
  );
}

// Componente para animar el valor numérico en el donut de forma fluida
function AnimatedTextValue({ animatedValue }: { animatedValue: Animated.Value }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const listener = animatedValue.addListener((state) => {
      setVal(Math.round(state.value));
    });
    return () => animatedValue.removeListener(listener);
  }, [animatedValue]);

  return <Text style={styles.circularValueText}>{val}%</Text>;
}


// --- COMPONENTE BARRAS DE PROGRESO GRUESAS CON ANIMACIÓN ---

interface AnimatedProgressBarProps {
  percent: number;
  color: string;
}

function AnimatedProgressBar({ percent, color }: AnimatedProgressBarProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: percent,
      duration: 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false
    }).start();
  }, [percent]);

  const widthStyle = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={styles.progressBarOuter}>
      <Animated.View style={[styles.progressBarInner, { width: widthStyle, backgroundColor: color }]}>
        {/* Pequeño brillo estético en la barra gruesa */}
        <LinearGradient 
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0)']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 0, y: 1 }} 
          style={StyleSheet.absoluteFill} 
        />
      </Animated.View>
    </View>
  );
}


// --- SUB-COMPONENTES AUXILIARES ---

function Sidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: any) => void }) {
  return (
    <View style={styles.sidebar}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
      <View style={styles.sidebarContent}>
        <View style={styles.logoCircle}>
          <Ionicons name="bar-chart" size={40} color={COLORS.white} />
        </View>
        <Text style={styles.sideTitle}>Consola Analítica</Text>
        <Text style={styles.sideSubTitle}>Panel de Administración</Text>
        <View style={styles.sideDivider} />
        
        <View style={{ gap: 8, width: '100%' }}>
          <SidebarTabButton id="consolidated" label="Consolidado General" icon="bar-chart" active={activeTab === 'consolidated'} onPress={() => setActiveTab('consolidated')} />
          <SidebarTabButton id="visitors" label="Control de Visitantes" icon="people" active={activeTab === 'visitors'} onPress={() => setActiveTab('visitors')} />
          <SidebarTabButton id="maintenance" label="Mantenimiento Locativo" icon="construct" active={activeTab === 'maintenance'} onPress={() => setActiveTab('maintenance')} />
          <SidebarTabButton id="parking" label="Acceso Parqueadero" icon="car" active={activeTab === 'parking'} onPress={() => setActiveTab('parking')} />
          <SidebarTabButton id="rooms" label="Reserva de Salas" icon="easel" active={activeTab === 'rooms'} onPress={() => setActiveTab('rooms')} />
          <SidebarTabButton id="transport" label="Flota de Transporte" icon="car-sport" active={activeTab === 'transport'} onPress={() => setActiveTab('transport')} />
        </View>
      </View>
    </View>
  );
}

function SidebarTabButton({ label, icon, active, onPress }: any) {
  return (
    <TouchableOpacity 
      style={[styles.sideTabBtn, active && styles.sideTabBtnActive]} 
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={active ? COLORS.primary : 'rgba(255,255,255,0.7)'} />
      <Text style={[styles.sideTabLabel, active && styles.sideTabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TabButton({ id, label, icon, activeTab, setActiveTab }: any) {
  const active = activeTab === id;
  return (
    <TouchableOpacity 
      style={[styles.mobTabBtn, active && styles.mobTabBtnActive]} 
      onPress={() => setActiveTab(id)}
    >
      <Ionicons name={icon} size={18} color={active ? COLORS.white : COLORS.muted} />
      <Text style={[styles.mobTabLabel, active && styles.mobTabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function KPICard({ label, value, color, icon, trend, style, onPress }: any) {
  const content = (
    <View style={[styles.kpiCard, style, onPress ? { borderWidth: 1.5, borderColor: `${color}40` } : {}]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8 }}>
        <View style={[styles.kpiIcon, { backgroundColor: `${color}14`, borderWidth: 1, borderColor: `${color}28` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {trend && (
            <View style={[styles.trendBadge, { backgroundColor: `${color}10`, borderColor: `${color}25`, borderWidth: 1, flexShrink: 1 }]}>
              <Text style={[styles.trendText, { color: color }]} numberOfLines={1} adjustsFontSizeToFit>{trend}</Text>
            </View>
          )}
          {onPress && (
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: `${color}15`, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="arrow-forward" size={12} color={color} />
            </View>
          )}
        </View>
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.kpiLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
        {onPress && (
          <Text style={{ fontSize: 10, fontWeight: '700', color: color, letterSpacing: 0.2 }}>Filtrar →</Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : undefined}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

interface SegmentedCategoryBarProps {
  label: string;
  icon: string;
  total: number;
  resolved: number;
  inProgress: number;
  pending: number;
  rejected: number;
  onPressCategory?: () => void;
  onPressResolved?: () => void;
  onPressInProgress?: () => void;
  onPressPending?: () => void;
  onPressRejected?: () => void;
}

function SegmentedCategoryBar({
  label,
  icon,
  total,
  resolved,
  inProgress,
  pending,
  rejected,
  onPressCategory,
  onPressResolved,
  onPressInProgress,
  onPressPending,
  onPressRejected
}: SegmentedCategoryBarProps) {
  // El total real para la distribución gráfica y visual de la barra es la suma de todas las solicitudes de la categoría
  const sumTotal = resolved + inProgress + pending + rejected;
  const barTotal = sumTotal > 0 ? sumTotal : (total || 0);

  return (
    <View style={styles.segmentedContainer}>
      <TouchableOpacity 
        style={styles.segmentedHeader} 
        activeOpacity={onPressCategory ? 0.7 : 1}
        onPress={onPressCategory}
        disabled={!onPressCategory}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.moduleIconBadge}>
            <Ionicons name={icon as any} size={14} color={COLORS.primary} />
          </View>
          <Text style={styles.segmentedLabel}>{label}</Text>
          {onPressCategory && (
            <Ionicons name="open-outline" size={13} color={COLORS.accent} />
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.segmentedTotal}>{barTotal} {barTotal === 1 ? 'solicitud' : 'solicitudes'}</Text>
          {onPressCategory && <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />}
        </View>
      </TouchableOpacity>

      {/* Barra segmentada por estado */}
      <View style={styles.segmentedBarOuter}>
        {barTotal === 0 ? (
          <View style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 6 }} />
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden', borderRadius: 6, gap: 1 }}>
            {resolved > 0 && (
              <TouchableOpacity 
                style={{ flex: resolved, backgroundColor: COLORS.success, height: '100%' }}
                onPress={onPressResolved || onPressCategory}
                disabled={!onPressResolved && !onPressCategory}
              />
            )}
            {inProgress > 0 && (
              <TouchableOpacity 
                style={{ flex: inProgress, backgroundColor: COLORS.accent, height: '100%' }}
                onPress={onPressInProgress || onPressCategory}
                disabled={!onPressInProgress && !onPressCategory}
              />
            )}
            {pending > 0 && (
              <TouchableOpacity 
                style={{ flex: pending, backgroundColor: COLORS.warning, height: '100%' }}
                onPress={onPressPending || onPressCategory}
                disabled={!onPressPending && !onPressCategory}
              />
            )}
            {rejected > 0 && (
              <TouchableOpacity 
                style={{ flex: rejected, backgroundColor: COLORS.danger, height: '100%' }}
                onPress={onPressRejected || onPressCategory}
                disabled={!onPressRejected && !onPressCategory}
              />
            )}
          </View>
        )}
      </View>

      {/* Mini indicadores de desglose con botones interactivos */}
      <View style={styles.segmentedBadgesRow}>
        <TouchableOpacity 
          style={[styles.statusBadgeMini, onPressResolved ? { cursor: 'pointer' } as any : {}]}
          onPress={onPressResolved}
          disabled={!onPressResolved}
          activeOpacity={0.7}
        >
          <View style={[styles.statusDotMini, { backgroundColor: COLORS.success }]} />
          <Text style={styles.statusTextMini}>{resolved} resueltas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statusBadgeMini, onPressInProgress ? { cursor: 'pointer' } as any : {}]}
          onPress={onPressInProgress}
          disabled={!onPressInProgress}
          activeOpacity={0.7}
        >
          <View style={[styles.statusDotMini, { backgroundColor: COLORS.accent }]} />
          <Text style={styles.statusTextMini}>{inProgress} en curso</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statusBadgeMini, onPressPending ? { cursor: 'pointer' } as any : {}]}
          onPress={onPressPending}
          disabled={!onPressPending}
          activeOpacity={0.7}
        >
          <View style={[styles.statusDotMini, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.statusTextMini}>{pending} pendientes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statusBadgeMini, onPressRejected ? { cursor: 'pointer' } as any : {}]}
          onPress={onPressRejected}
          disabled={!onPressRejected}
          activeOpacity={0.7}
        >
          <View style={[styles.statusDotMini, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.statusTextMini}>{rejected} rechazadas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CategoryProgress({ label, count, total, color, suffix = '', prefix = '', onPress }: any) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  const content = (
    <View style={[styles.progressContainer, onPress ? { padding: 8, borderRadius: 10, backgroundColor: `${color}06` } : {}]}>
      <View style={styles.progressTextRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.progressLabel, onPress ? { color: COLORS.primary, fontWeight: '800' } : {}]}>{label}</Text>
          {onPress && <Ionicons name="open-outline" size={12} color={color} />}
        </View>
        <Text style={styles.progressValue}>{prefix}{count}{suffix}</Text>
      </View>
      <AnimatedProgressBar percent={percent} color={color} />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : undefined}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function RankProgress({ name, count, max, color, index, onPress }: any) {
  const percent = max > 0 ? (count / max) * 100 : 0;
  const content = (
    <View style={[styles.rankContainer, onPress ? { cursor: 'pointer' } as any : {}]}>
      <View style={styles.rankIndexCircle}><Text style={styles.rankIndexText}>{index}</Text></View>
      <View style={{ flex: 1 }}>
        <View style={styles.progressTextRow}>
          <Text style={styles.rankName}>{name}</Text>
          <Text style={styles.rankCount}>{count} reg.</Text>
        </View>
        <AnimatedProgressBar percent={percent} color={color} />
      </View>
      {onPress && <Ionicons name="chevron-forward" size={14} color={COLORS.muted} style={{ marginLeft: 6 }} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function StateWidget({ label, count, color, icon, bg, onPress }: any) {
  const content = (
    <View style={[styles.stateWidget, { borderLeftColor: color }, onPress ? { borderWidth: 1, borderColor: `${color}35` } : {}]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <View style={[styles.stateIconCircle, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {onPress && (
          <View style={{ backgroundColor: `${color}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: color }}>VER</Text>
            <Ionicons name="chevron-forward" size={10} color={color} />
          </View>
        )}
      </View>
      <Text style={styles.stateCount}>{count}</Text>
      <Text style={styles.stateLabel}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={[{ flex: 1 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}]}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function TableRow({ label, count, inProg, resolved, effectiveness, isTotal, onPress }: any) {
  const eff = effectiveness !== undefined 
    ? effectiveness 
    : (count > 0 ? `${Math.round(((resolved || 0) / count) * 100)}%` : '0%');

  const content = (
    <View style={[
      styles.reportTableRow, 
      isTotal ? { backgroundColor: '#F8FAFC', borderTopWidth: 1.5, borderTopColor: COLORS.primary } : {},
      onPress ? ({ cursor: 'pointer' } as any) : {}
    ]}>
      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[styles.tableCell, { flex: 1, color: isTotal ? COLORS.primary : COLORS.text, fontWeight: isTotal ? '800' : (onPress ? '700' : '400') }]}>{label}</Text>
        {onPress && !isTotal && <Ionicons name="open-outline" size={12} color={COLORS.accent} />}
      </View>
      <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: isTotal ? COLORS.primary : COLORS.text, fontWeight: isTotal ? '800' : '400' }]}>{count}</Text>
      <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: isTotal ? COLORS.primary : COLORS.text, fontWeight: isTotal ? '800' : '400' }]}>{inProg}</Text>
      <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: isTotal ? COLORS.primary : COLORS.text, fontWeight: isTotal ? '800' : '400' }]}>{resolved}</Text>
      <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: isTotal ? COLORS.primary : COLORS.success, fontWeight: '800' }]}>{eff}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={{ width: '100%' }}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase().trim();
  let bg = COLORS.warningSoft;
  let text = COLORS.warning;
  let label = 'PENDIENTE';

  if (s === 'resuelto' || s === 'aprobado' || s === 'finalizado') {
    bg = COLORS.successSoft;
    text = COLORS.success;
    label = 'RESUELTO';
  } else if (s === 'en_progreso' || s === 'en curso') {
    bg = COLORS.accentLight;
    text = COLORS.accent;
    label = 'EN CURSO';
  } else if (['rechazado', 'rechazada', 'rejected'].includes(s)) {
    bg = COLORS.dangerSoft;
    text = COLORS.danger;
    label = 'RECHAZADO';
  }

  return (
    <View style={[styles.statusBadgePill, { backgroundColor: bg }]}>
      <Text style={[styles.statusBadgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  const p = (priority || 'media').toLowerCase().trim();
  let bg = '#F1F5F9';
  let text = COLORS.muted;
  let label = 'MEDIA';

  if (isHighPriority(p)) {
    bg = COLORS.dangerSoft;
    text = COLORS.danger;
    label = 'ALTA';
  } else if (isLowPriority(p)) {
    bg = '#F8FAFC';
    text = COLORS.muted;
    label = 'BAJA';
  }

  return (
    <View style={[styles.priorityBadge, { backgroundColor: bg }]}>
      <Text style={[styles.priorityBadgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

function RatingBadge({ rating, status }: { rating?: number | null; status?: string }) {
  if (typeof rating === 'number') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
        <Ionicons name="star" size={11} color="#D97706" />
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>
          {Number(rating).toFixed(1)}
        </Text>
      </View>
    );
  }
  if (status && ['resuelto', 'aprobado'].includes(status.toLowerCase())) {
    return <Text style={{ fontSize: 10, color: COLORS.muted, fontStyle: 'italic' }}>Sin calificar</Text>;
  }
  return <Text style={{ fontSize: 11, color: COLORS.line }}>—</Text>;
}

const formatDisplayDate = (d?: string) => {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  } catch {
    return d;
  }
};

const getModuleMeta = (cat?: string) => {
  switch (cat) {
    case 'visitors': return { name: 'Visitantes', icon: 'people', color: COLORS.danger };
    case 'maintenance': return { name: 'Mantenimiento', icon: 'construct', color: COLORS.accent };
    case 'parking': return { name: 'Parqueadero', icon: 'car', color: COLORS.purple };
    case 'rooms': return { name: 'Salas', icon: 'easel', color: COLORS.warning };
    case 'transport': return { name: 'Transporte', icon: 'car-sport', color: COLORS.success };
    default: return { name: 'General', icon: 'document-text', color: COLORS.muted };
  }
};

// Estilos de la aplicación nativa React Native (con PADDING INCREMENTADO y BARRAS GRUESAS)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  sidebar: { width: 300, height: '100%', overflow: 'hidden' },
  sidebarContent: { flex: 1, padding: 30, paddingTop: 60, alignItems: 'center' },
  logoCircle: { width: 70, height: 70, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  sideTitle: { color: COLORS.white, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  sideSubTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700', marginTop: 3 },
  sideDivider: { width: '80%', height: 1.5, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 25 },
  
  sideTabBtn: { width: '100%', height: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 14, marginBottom: 6 },
  sideTabBtnActive: { backgroundColor: COLORS.white },
  sideTabLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  sideTabLabelActive: { color: COLORS.primary, fontWeight: '900' },

  scrollContent: { paddingBottom: 60 },
  hero: { minHeight: 160, paddingVertical: 15, width: '100%', overflow: 'hidden', borderBottomRightRadius: 40 },
  heroInner: { flex: 1, paddingHorizontal: 25, justifyContent: 'center' },
  heroKicker: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { color: COLORS.white, fontSize: 32, fontWeight: '900', marginTop: 5 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5 },
  refreshBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  contentPadding: { paddingHorizontal: 14, paddingTop: 16 },

  filtersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
  rangeSelector: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: COLORS.line },
  rangeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  rangeBtnActive: { backgroundColor: COLORS.accent },
  rangeText: { fontSize: 11.5, fontWeight: '700', color: COLORS.muted },
  rangeTextActive: { color: COLORS.white },
  
  downloadDocBtn: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primarySoft, paddingHorizontal: 16, borderRadius: 14, shadowOpacity: 0.1, shadowRadius: 5 },
  downloadDocText: { color: COLORS.white, fontSize: 12.5, fontWeight: '800' },

  monthSelectorCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.line, marginBottom: 20 },
  monthSelectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  monthSelectorKicker: { fontSize: 10, fontWeight: '900', color: COLORS.accent, letterSpacing: 1.5 },
  monthSelectorTitle: { fontSize: 17, fontWeight: '900', color: COLORS.primary, marginTop: 2 },
  monthOptionsRow: { gap: 10, paddingRight: 8 },
  monthOptionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line },
  monthOptionBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  monthOptionText: { fontSize: 12, fontWeight: '800', color: COLORS.muted, textTransform: 'capitalize' },
  monthOptionTextActive: { color: COLORS.white },
  dbBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.accentLight, borderWidth: 1, borderColor: '#BFDBFE' },
  dbBadgeError: { backgroundColor: COLORS.dangerSoft, borderColor: '#FECACA' },
  dbBadgeText: { fontSize: 11, fontWeight: '900', color: COLORS.accent },
  dbBadgeTextError: { color: COLORS.danger },

  mobileTabsContainer: { paddingBottom: 16, gap: 10 },
  mobTabBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 16, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  mobTabBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  mobTabLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  mobTabLabelActive: { color: COLORS.white, fontWeight: '900' },

  loadingContainer: { minHeight: 300, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },

  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  kpiCard: { 
    flex: 1, 
    minWidth: 140, 
    backgroundColor: COLORS.white, 
    borderRadius: 20, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: COLORS.line,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10 },
      android: { elevation: 2 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }
    })
  },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  trendBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  trendText: { fontSize: 10, fontWeight: '800' },
  kpiValue: { fontSize: 24, fontWeight: '900', color: COLORS.primary, marginTop: 10 },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginTop: 3 },

  card: { backgroundColor: COLORS.white, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden' }, // Padding de tarjeta incrementado a 26px
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  cardSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: '500' },

  segmentedContainer: { gap: 6 },
  segmentedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduleIconBadge: { width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.line },
  segmentedLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  segmentedTotal: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  segmentedBarOuter: { height: 16, backgroundColor: '#F1F5F9', borderRadius: 8, overflow: 'hidden', padding: 2, borderWidth: 1, borderColor: COLORS.line },
  segmentedBadgesRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 2 },
  statusBadgeMini: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDotMini: { width: 7, height: 7, borderRadius: 3.5 },
  statusTextMini: { fontSize: 10, fontWeight: '700', color: COLORS.muted },
  moduleLegendRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', backgroundColor: COLORS.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '700', color: COLORS.muted },

  progressContainer: { gap: 8 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  progressValue: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  progressBarOuter: { height: 18, backgroundColor: '#F1F5F9', borderRadius: 10, overflow: 'hidden' }, // Altura de barra incrementada a 18px (gruesa)
  progressBarInner: { height: '100%', borderRadius: 10 },

  rankContainer: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rankIndexCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  rankIndexText: { fontSize: 11, fontWeight: '900', color: COLORS.primarySoft },
  rankName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  rankCount: { fontSize: 12, fontWeight: '800', color: COLORS.muted },

  statesRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 18 },
  stateWidget: { 
    flex: 1, 
    minWidth: 110, 
    borderLeftWidth: 4, 
    padding: 16, 
    backgroundColor: COLORS.white, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: COLORS.line, 
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }
    })
  },
  stateIconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  stateCount: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  stateLabel: { fontSize: 11, fontWeight: '800', color: COLORS.muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  dangerAlertBox: { flexDirection: 'row', gap: 14, backgroundColor: COLORS.dangerSoft, padding: 18, borderRadius: 24, borderLeftWidth: 6, borderLeftColor: COLORS.danger, borderWidth: 1, borderColor: COLORS.line },
  dangerAlertTitle: { fontSize: 15, fontWeight: '900', color: COLORS.danger },
  dangerAlertDesc: { fontSize: 12, color: '#991B1B', lineHeight: 18, fontWeight: '500', marginTop: 3 },
  noDataText: { fontSize: 12, color: COLORS.muted, textAlign: 'center', paddingVertical: 20, fontWeight: '500' },

  platesGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 15 },
  plateCard: { flex: 1, minWidth: 100, backgroundColor: COLORS.bg, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 12, padding: 12, alignItems: 'center' },
  plateText: { fontSize: 15, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5 },
  plateBadge: { backgroundColor: COLORS.successSoft, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  plateBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.success },

  // Estilos específicos de gráficos circulares (Donut)
  circularOuterWrapper: {
    width: 145,
    height: 145,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    backgroundColor: COLORS.white,
    borderRadius: 72.5
  },
  circularTrackRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 12
  },
  circularFillRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 12,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent'
  },
  circularHole: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center'
  },
  circularValueText: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary
  },
  circularLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2
  },

  modalBlurContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8 },
  modalPanel: { backgroundColor: COLORS.white, borderRadius: 22, width: '98%', maxWidth: 900, height: '94%', padding: 16, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
  modalPanelExpanded: { width: '99%', maxWidth: 1400, height: '98%', borderRadius: 16, padding: 18 },
  expandModalBtn: { padding: 6, borderRadius: 8, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line, marginRight: 4 },
  modalTabSelector: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
  modalTabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line },
  modalTabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modalTabBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.muted },
  modalTabBtnTextActive: { color: COLORS.white },
  
  pdfGeneratingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  pdfGeneratingTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary, marginTop: 15 },
  pdfGeneratingDesc: { fontSize: 13, color: COLORS.muted, marginTop: 4, textAlign: 'center' },
  progressBarBg: { width: '80%', height: 6, backgroundColor: COLORS.bg, borderRadius: 3, overflow: 'hidden', marginTop: 20 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },
  progressNumText: { fontSize: 12, fontWeight: '800', color: COLORS.accent, marginTop: 6 },

  reportDocHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: COLORS.primary, paddingBottom: 15, marginBottom: 15 },
  reportEscudo: { width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.line },
  reportGovText: { fontSize: 10, fontWeight: '900', color: COLORS.muted, letterSpacing: 0.5 },
  reportDeptText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  reportSubText: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  closeModalBtn: { padding: 5 },

  reportDocBody: { flex: 1, paddingRight: 5 },
  reportDocTitle: { fontSize: 13, fontWeight: '900', color: COLORS.primary, textAlign: 'center', lineHeight: 18, marginVertical: 10 },
  docDivider: { height: 1.5, backgroundColor: COLORS.line, marginVertical: 10 },
  reportDocMetaGrid: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 10, gap: 5, marginBottom: 15 },
  reportMetaLabel: { fontSize: 11, fontWeight: '800', color: COLORS.primarySoft },
  
  reportSectionTitle: { fontSize: 12, fontWeight: '900', color: COLORS.primary, marginTop: 15, marginBottom: 8 },
  reportParagraph: { fontSize: 12, color: COLORS.text, lineHeight: 18, textAlign: 'justify', fontWeight: '500' },
  
  reportTable: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, overflow: 'hidden', marginVertical: 15 },
  reportTableHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 12, width: '100%' },
  reportTableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: COLORS.line, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: COLORS.white, width: '100%' },
  tableCell: { fontSize: 10, color: COLORS.white },

  firmaBox: { marginTop: 40, marginBottom: 20, alignItems: 'center' },
  firmaLinea: { width: 180, height: 1, backgroundColor: COLORS.muted },
  firmaTexto: { fontSize: 11, fontWeight: '800', color: COLORS.primary, marginTop: 6 },
  firmaSub: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
  logoutBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  reportDocFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 15, marginTop: 10 },
  cancelReportBtn: { height: 42, paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center', borderWidth: 1, borderColor: COLORS.line },
  cancelReportText: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  printReportBtn: { height: 42, paddingHorizontal: 20, backgroundColor: COLORS.primary, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  printReportText: { fontSize: 13, fontWeight: '800', color: COLORS.white },

  statusBadgePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  priorityBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.line },
  priorityBadgeText: { fontSize: 10, fontWeight: '800' },

  cardSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardSectionAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line },
  cardSectionActionText: { fontSize: 11, fontWeight: '800', color: COLORS.accent },
  tableContainer: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, overflow: 'hidden', marginTop: 15 },
  tableHeaderRowDark: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.line, width: '100%' },
  tableHeaderTxtDark: { fontSize: 11, fontWeight: '800', color: COLORS.primarySoft, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRowDark: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.line, backgroundColor: COLORS.white, width: '100%' },
  tableCellTxt: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
  tableCellTxtBold: { fontSize: 12, color: COLORS.primary, fontWeight: '800' },

  miniCardGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 16 },
  miniInfoCard: { flex: 1, minWidth: 130, backgroundColor: COLORS.bg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.line },
  miniInfoCardLabel: { fontSize: 11, fontWeight: '800', color: COLORS.muted },
  miniInfoCardValue: { fontSize: 18, fontWeight: '900', color: COLORS.primary, marginTop: 4 },
  miniInfoCardSub: { fontSize: 10, color: COLORS.muted, marginTop: 2 },

  reportPlateBadge: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#000000',
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center'
  },
  reportPlateBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
    textAlign: 'center'
  },

  infoAlertBox: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.accentLight, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center' },
  infoAlertTitle: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  infoAlertDesc: { fontSize: 11, color: COLORS.primarySoft, marginTop: 2, lineHeight: 16 }
});

const getReportPickerDays = () => {
  const days = [];
  const locale = 'es-CO';
  for (let i = 0; i <= 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayName = i === 0 ? 'Hoy' : d.toLocaleDateString(locale, { weekday: 'short' });
    const dayNumber = d.getDate();
    const monthName = d.toLocaleDateString(locale, { month: 'short' });
    const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', ''),
      dayNumber,
      monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', ''),
      dateString
    });
  }
  return days;
};

function DateTimePickerModal({ visible, onClose, title, value, onSelect }: any) {
  const days = useMemo(() => getReportPickerDays(), []);
  const [selectedDate, setSelectedDate] = useState(value || days[0].dateString);

  React.useEffect(() => {
    if (visible && value) {
      setSelectedDate(value);
    }
  }, [visible, value]);

  const handleConfirm = () => {
    onSelect(selectedDate);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 }}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={{ backgroundColor: COLORS.white, borderRadius: 30, width: '100%', maxWidth: 350, padding: 20, shadowOpacity: 0.2, shadowRadius: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: COLORS.bg, borderRadius: 16, padding: 12, marginBottom: 15, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: COLORS.accent, fontWeight: '800', letterSpacing: 1 }}>SELECCIÓN ACTUAL</Text>
            <Text style={{ fontSize: 18, color: COLORS.text, fontWeight: '900', marginTop: 4 }}>{selectedDate}</Text>
          </View>
          <View style={{ flexDirection: 'row', height: 260, gap: 10, marginBottom: 20 }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, overflow: 'hidden' }}>
              <View style={{ backgroundColor: COLORS.line, padding: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: COLORS.muted }}>FECHA</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {days.map((d) => {
                  const isSelected = d.dateString === selectedDate;
                  return (
                    <TouchableOpacity 
                      key={d.dateString}
                      style={{ paddingVertical: 10, paddingHorizontal: 8, backgroundColor: isSelected ? COLORS.accent : 'transparent', borderBottomWidth: 1, borderBottomColor: COLORS.line, alignItems: 'center' }}
                      onPress={() => setSelectedDate(d.dateString)}
                    >
                      <Text style={{ fontSize: 10, color: isSelected ? COLORS.white : COLORS.muted, fontWeight: '800' }}>{d.dayName}</Text>
                      <Text style={{ fontSize: 14, color: isSelected ? COLORS.white : COLORS.text, fontWeight: '900', marginTop: 2 }}>{d.dayNumber} {d.monthName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
          <TouchableOpacity style={{ backgroundColor: COLORS.accent, height: 54, borderRadius: 15, justifyContent: 'center', alignItems: 'center' }} onPress={handleConfirm}>
            <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 16 }}>CONFIRMAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
