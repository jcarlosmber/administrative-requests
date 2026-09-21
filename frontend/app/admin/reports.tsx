import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
  const [reportTab, setReportTab] = useState<'consolidated' | 'visitors' | 'maintenance' | 'parking' | 'rooms' | 'transport'>('consolidated');
  const [isModalExpanded, setIsModalExpanded] = useState(false);

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

    const highPriority = validData.filter(d => d.priority === 'alta').length;
    const mediumPriority = validData.filter(d => d.priority === 'media' || !d.priority).length;
    const lowPriority = validData.filter(d => d.priority === 'baja').length;
    const highResolved = validData.filter(d => d.priority === 'alta' && d.status === 'resuelto').length;

    return {
      total,
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
    const highPriorityPending = maintenanceRequests.filter(d => d.priority === 'alta' && d.status === 'pendiente').length;

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
    const highCount = validMaintenance.filter(d => d.priority === 'alta').length;
    const medCount = validMaintenance.filter(d => d.priority === 'media' || !d.priority).length;
    const lowCount = validMaintenance.filter(d => d.priority === 'baja').length;

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

  // Módulo de Parqueadero Específico
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
    const occupancyRate = Math.min(100, Math.round((approved / Math.max(1, total)) * 100));

    return {
      total,
      approved,
      pending,
      cars,
      motos,
      bikes,
      occupancyRate,
      plates: plates.slice(0, 8),
      recentList: dbData.filter(d => d.category === 'parking').slice(0, 8)
    };
  }, [dbData]);

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
  const handleGenerateReport = async () => {
    await loadAnalyticsData();
    setReportTab(activeTab);
    setShowDocModal(true);
    triggerPdfGeneration();
  };

  const handleExportExcel = useCallback(() => {
    const exportRows = dbData.map(row => ({
      id: row.id,
      titulo: row.title || '',
      categoria: row.category || '',
      estado: row.status || '',
      prioridad: row.priority || '',
      fecha_creacion: row.created_at || '',
      dependencia: row.metadata?.responsible?.dependency || row.metadata?.dependency || '',
      descripcion: row.description || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_${selectedMonth || 'general'}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [dbData, selectedMonth]);

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
          title: 'REPORTE DE ASIGNACIÓN Y GESTIÓN DE CUPOS DE PARQUEADERO',
          subtitle: 'Módulo de Seguridad y Control de Estacionamiento Institucional',
          code: 'SASGE-REP-04'
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
          <div class="section-title">3. Conclusiones y Recomendaciones de Gestión</div>
          <p>Se aconseja mantener la periodicidad de seguimiento a los reportes en curso, priorizando las solicitudes de mantenimiento técnico y el control vehicular de parqueaderos para conservar los estándares institucionales de la Secretaría Jurídica Distrital.</p>
        `;
      } else if (reportTab === 'visitors') {
        const visitorRows = dbData.filter(d => d.category === 'visitors').slice(0, 25);
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
          <div class="section-title">3. Registro Detallado de Visitas Autorizadas (Muestra Reciente)</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Requerimiento / Asunto</th>
                <th>Dependencia</th>
                <th class="text-center">Personas</th>
                <th class="text-center">Estado</th>
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
                </tr>
              `).join('') || '<tr><td colspan="5" class="text-center">No se registran visitas en el periodo</td></tr>'}
            </tbody>
          </table>
        `;
      } else if (reportTab === 'maintenance') {
        const maintenanceRows = dbData.filter(d => d.category === 'maintenance').slice(0, 25);
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
          <div class="section-title">3. Detalle de Requerimientos Técnicos</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Incidencia / Descripción</th>
                <th>Ubicación</th>
                <th class="text-center">Prioridad</th>
                <th class="text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${maintenanceRows.map(r => `
                <tr>
                  <td>${new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                  <td>${r.title || 'Mantenimiento locativo'}</td>
                  <td>${r.metadata?.location || 'General'}</td>
                  <td class="text-center"><strong style="color:${r.priority === 'alta' ? '#DC2626' : '#2563EB'}">${r.priority?.toUpperCase() || 'MEDIA'}</strong></td>
                  <td class="text-center"><strong>${r.status?.toUpperCase()}</strong></td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="text-center">Sin solicitudes registradas</td></tr>'}
            </tbody>
          </table>
        `;
      } else if (reportTab === 'parking') {
        const parkingRows = dbData.filter(d => d.category === 'parking').slice(0, 25);
        bodySections = `
          <div class="meta-box">
            <div class="meta-item"><strong>Periodo Evaluado:</strong> ${reportPeriodLabel}</div>
            <div class="meta-item"><strong>Fecha Emisión:</strong> ${todayStr}</div>
            <div class="meta-item"><strong>Cupos Activos Autorizados:</strong> ${parkingStats.approved}</div>
            <div class="meta-item"><strong>En Espera de Cupo:</strong> ${parkingStats.pending}</div>
          </div>
          <div class="section-title">1. Resumen Operativo de Parqueadero</div>
          <p>Se registraron <strong>${parkingStats.total}</strong> solicitudes de estacionamiento institucional, manteniendo <strong>${parkingStats.approved}</strong> autorizaciones vigentes con control de placa vehicular y <strong>${parkingStats.pending}</strong> en lista de espera para asignación conforme a disponibilidad física en sótanos.</p>
          <div class="section-title">2. Placas Recientes con Autorización Vigente</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Placa Vehicular</th>
                <th>Vehículo / Solicitante</th>
                <th class="text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${parkingRows.map(r => `
                <tr>
                  <td>${new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                  <td><strong>${r.metadata?.plate || 'Sin placa'}</strong></td>
                  <td>${r.title || r.metadata?.vehicleType || 'Vehículo institucional'}</td>
                  <td class="text-center"><strong>${r.status?.toUpperCase()}</strong></td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="text-center">No hay registros de parqueadero en el periodo</td></tr>'}
            </tbody>
          </table>
        `;
      } else if (reportTab === 'rooms') {
        const roomRows = dbData.filter(d => d.category === 'rooms').slice(0, 25);
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
          <div class="section-title">3. Detalle de Reuniones Registradas</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Asunto / Reunión</th>
                <th>Sala</th>
                <th class="text-center">Asistentes</th>
                <th class="text-center">Estado</th>
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
                </tr>
              `).join('') || '<tr><td colspan="5" class="text-center">No hay reuniones en el periodo</td></tr>'}
            </tbody>
          </table>
        `;
      } else if (reportTab === 'transport') {
        const transportRows = dbData.filter(d => d.category === 'transport').slice(0, 25);
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
          <div class="section-title">3. Detalle de Misiones de Transporte</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Misión / Motivo</th>
                <th>Ruta</th>
                <th class="text-center">Pasajeros</th>
                <th class="text-center">Estado</th>
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
                </tr>
              `).join('') || '<tr><td colspan="5" class="text-center">No hay comisiones en el periodo</td></tr>'}
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
            <View style={[styles.heroInner, !isDesktop && { paddingTop: 40 }]}>
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 15 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroKicker}>SECRETARÍA JURÍDICA DISTRITAL</Text>
                  <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit>Analítica & Reportes</Text>
                  <Text style={styles.heroSub} numberOfLines={2}>Consola interactiva de monitoreo de servicios administrativos</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignSelf: isDesktop ? 'auto' : 'flex-end' }}>
                  <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={loading}>
                    <Ionicons name="refresh" size={20} color={COLORS.white} />
                  </TouchableOpacity>

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
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
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
                          />
                          <SegmentedCategoryBar 
                            label="Mantenimiento Locativo" 
                            icon="construct" 
                            total={categoryBreakdown.maintenance.total} 
                            resolved={categoryBreakdown.maintenance.resolved}
                            inProgress={categoryBreakdown.maintenance.inProgress}
                            pending={categoryBreakdown.maintenance.pending}
                            rejected={categoryBreakdown.maintenance.rejected}
                          />
                          <SegmentedCategoryBar 
                            label="Cupo de Parqueadero" 
                            icon="car" 
                            total={categoryBreakdown.parking.total} 
                            resolved={categoryBreakdown.parking.resolved}
                            inProgress={categoryBreakdown.parking.inProgress}
                            pending={categoryBreakdown.parking.pending}
                            rejected={categoryBreakdown.parking.rejected}
                          />
                          <SegmentedCategoryBar 
                            label="Salas de Juntas" 
                            icon="easel" 
                            total={categoryBreakdown.rooms.total} 
                            resolved={categoryBreakdown.rooms.resolved}
                            inProgress={categoryBreakdown.rooms.inProgress}
                            pending={categoryBreakdown.rooms.pending}
                            rejected={categoryBreakdown.rooms.rejected}
                          />
                          <SegmentedCategoryBar 
                            label="Transporte Oficial" 
                            icon="car-sport" 
                            total={categoryBreakdown.transport.total} 
                            resolved={categoryBreakdown.transport.resolved}
                            inProgress={categoryBreakdown.transport.inProgress}
                            pending={categoryBreakdown.transport.pending}
                            rejected={categoryBreakdown.transport.rejected}
                          />
                        </View>
                      </View>

                      {/* Columna 3: KPIs Clásicos */}
                      <View style={[{ gap: 15 }, isDesktop ? { flex: 1, justifyContent: 'space-between' } : { flex: undefined }]}>
                        <KPICard label="Efectividad" value={`${stats.effectiveness}%`} color={COLORS.success} icon="trending-up" trend="+2.4% este período" />
                        <KPICard label="Pendientes de Atención" value={stats.pending.toString()} color={COLORS.warning} icon="hourglass" trend="Requieren acción" />
                        <KPICard label="Total Requerimientos" value={stats.total.toString()} color={COLORS.accent} icon="folder-open" trend="Registrados en sistema" />
                      </View>
                    </View>

                    {/* Estado del Flujo de Procesos */}
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Embudo de Solicitudes Administrativas</Text>
                      <Text style={styles.cardSubtitle}>Estado general del ciclo de vida de los trámites</Text>
                      
                      <View style={styles.statesRow}>
                        <StateWidget label="Pendiente" count={stats.pending} color={COLORS.warning} icon="alert-circle-outline" bg={COLORS.warningSoft} />
                        <StateWidget label="En Progreso" count={stats.inProgress} color={COLORS.accent} icon="sync-outline" bg={COLORS.accentLight} />
                        <StateWidget label="Resuelto" count={stats.resolved} color={COLORS.success} icon="checkmark-done-circle-outline" bg={COLORS.successSoft} />
                        <StateWidget label="Rechazado" count={stats.rejected} color={COLORS.danger} icon="close-circle-outline" bg={COLORS.dangerSoft} />
                      </View>
                    </View>

                    {/* Fila Ampliada: Criticidad Global y Capacidad Operativa */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      {/* Distribución por Nivel de Criticidad */}
                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardTitle}>Nivel de Criticidad Global</Text>
                        <Text style={styles.cardSubtitle}>Distribución de solicitudes según prioridad de atención</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          <CategoryProgress label="Prioridad Alta (Urgente)" count={stats.highPriority} total={stats.total} color={COLORS.danger} />
                          <CategoryProgress label="Prioridad Media (Ordinaria)" count={stats.mediumPriority} total={stats.total} color={COLORS.accent} />
                          <CategoryProgress label="Prioridad Baja (Preventiva)" count={stats.lowPriority} total={stats.total} color={COLORS.muted} />
                        </View>
                        
                        <View style={[styles.infoAlertBox, { marginTop: 20 }]}>
                          <Ionicons name="information-circle-outline" size={22} color={COLORS.accent} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.infoAlertTitle}>Atención Oportuna</Text>
                            <Text style={styles.infoAlertDesc}>
                              {stats.highResolved} de {stats.highPriority} casos de alta prioridad han sido resueltos satisfactoriamente.
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Indicadores Clave de Capacidad Operativa */}
                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Capacidad y Demanda de Servicios</Text>
                        <Text style={styles.cardSubtitle}>Resumen ejecutivo de atención por servicio en el periodo</Text>
                        
                        <View style={styles.miniCardGrid}>
                          <View style={styles.miniInfoCard}>
                            <Ionicons name="people" size={20} color={COLORS.danger} />
                            <Text style={styles.miniInfoCardValue}>{visitorStats.totalVisitors}</Text>
                            <Text style={styles.miniInfoCardLabel}>Visitantes</Text>
                            <Text style={styles.miniInfoCardSub}>{visitorStats.vehicularEntries} accesos con vehículo</Text>
                          </View>

                          <View style={styles.miniInfoCard}>
                            <Ionicons name="construct" size={20} color={COLORS.accent} />
                            <Text style={styles.miniInfoCardValue}>{maintenanceStats.inProgress + maintenanceStats.pending}</Text>
                            <Text style={styles.miniInfoCardLabel}>Averías Activas</Text>
                            <Text style={styles.miniInfoCardSub}>{maintenanceStats.resolved} ya solucionadas</Text>
                          </View>

                          <View style={styles.miniInfoCard}>
                            <Ionicons name="car" size={20} color={COLORS.purple} />
                            <Text style={styles.miniInfoCardValue}>{parkingStats.approved}</Text>
                            <Text style={styles.miniInfoCardLabel}>Cupos Parqueadero</Text>
                            <Text style={styles.miniInfoCardSub}>{parkingStats.occupancyRate}% tasa de ocupación</Text>
                          </View>

                          <View style={styles.miniInfoCard}>
                            <Ionicons name="car-sport" size={20} color={COLORS.success} />
                            <Text style={styles.miniInfoCardValue}>{transportStats.totalRequests}</Text>
                            <Text style={styles.miniInfoCardLabel}>Misiones Flota</Text>
                            <Text style={styles.miniInfoCardSub}>{transportStats.totalPassengers} funcionarios movilizados</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Tabla de Requerimientos Institucionales Recientes */}
                    <View style={[styles.card, { width: '100%' }]}>
                      <View style={styles.cardSectionHeader}>
                        <View>
                          <Text style={styles.cardTitle}>Auditoría de Requerimientos Recientes</Text>
                          <Text style={styles.cardSubtitle}>Muestra de las últimas solicitudes tramitadas en todas las áreas de la entidad</Text>
                        </View>
                        <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                          <Ionicons name="document-text-outline" size={14} color={COLORS.accent} />
                          <Text style={styles.cardSectionActionText}>Ver Reporte Oficial</Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : 860 }}>
                          <View style={[styles.tableHeaderRowDark, { width: '100%' }]}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 105 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 160 }]}>MÓDULO</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 2.2, minWidth: 240 }]}>ASUNTO / DETALLE</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1.3, minWidth: 180 }]}>SOLICITANTE</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 105, textAlign: 'center' }]}>PRIORIDAD</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 125, textAlign: 'center' }]}>ESTADO</Text>
                          </View>

                          {stats.recentGlobal.length > 0 ? (
                            stats.recentGlobal.map((req, idx) => {
                              const meta = getModuleMeta(req.category);
                              return (
                                <View key={req.id || idx} style={[styles.tableRowDark, { width: '100%' }]}>
                                  <Text style={[styles.tableCellTxt, { width: 105 }]}>{formatDisplayDate(req.created_at)}</Text>
                                  <View style={{ width: 160, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name={meta.icon as any} size={14} color={meta.color} />
                                    <Text style={[styles.tableCellTxtBold, { fontSize: 11 }]}>{meta.name}</Text>
                                  </View>
                                  <Text style={[styles.tableCellTxt, { flex: 2.2, minWidth: 240 }]} numberOfLines={1}>
                                    {req.title || 'Solicitud administrativa'}
                                  </Text>
                                  <Text style={[styles.tableCellTxt, { flex: 1.3, minWidth: 180 }]} numberOfLines={1}>
                                    {req.profiles?.full_name || req.profiles?.dependency?.name || 'Funcionario'}
                                  </Text>
                                  <View style={{ width: 105, alignItems: 'center', justifyContent: 'center' }}>
                                    <PriorityBadge priority={req.priority} />
                                  </View>
                                  <View style={{ width: 125, alignItems: 'center', justifyContent: 'center' }}>
                                    <StatusBadge status={req.status} />
                                  </View>
                                </View>
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
                      <KPICard label="Total Visitantes" value={visitorStats.totalVisitors.toString()} color={COLORS.danger} icon="people" trend="Externos autorizados" />
                      <KPICard label="Ingresos Vehiculares" value={visitorStats.vehicularEntries.toString()} color={COLORS.accent} icon="car" trend="Vehículos con placa" />
                      <KPICard label="Trámites Creados" value={visitorStats.totalRequests.toString()} color={COLORS.purple} icon="shield-checkmark" trend="Solicitudes formales" />
                      <KPICard label="Promedio por Visita" value={`${visitorStats.avgVisitorsPerRequest} pers.`} color={COLORS.success} icon="person-add" trend="Aforo por solicitud" />
                    </View>

                    {/* 2 Columnas: Dependencias Receptoras y Modalidad de Acceso */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Dependencias Receptoras de Visitas</Text>
                        <Text style={styles.cardSubtitle}>Áreas institucionales con mayor volumen de visitas autorizadas</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          {visitorStats.departments.length > 0 ? (
                            visitorStats.departments.slice(0, 6).map((dep, idx) => (
                              <RankProgress key={idx} name={dep.name} count={dep.count} max={visitorStats.departments[0].count} color={COLORS.danger} index={idx + 1} />
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
                          <CategoryProgress label="Ingreso Peatonal" count={visitorStats.pedestrianEntries} total={visitorStats.totalVisitors} color={COLORS.purple} suffix=" personas" />
                          <CategoryProgress label="Ingreso Vehicular con Placa" count={visitorStats.vehicularEntries} total={visitorStats.totalVisitors} color={COLORS.accent} suffix=" vehículos" />
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
                          <Text style={styles.cardSubtitle}>Historial de visitas autorizadas con verificación de seguridad</Text>
                        </View>
                        <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                          <Ionicons name="print-outline" size={14} color={COLORS.accent} />
                          <Text style={styles.cardSectionActionText}>Imprimir Reporte</Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : 780 }}>
                          <View style={styles.tableHeaderRowDark}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1, minWidth: 180 }]}>ASUNTO / MOTIVO</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 180 }]}>DEPENDENCIA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 90, textAlign: 'center' }]}>PERSONAS</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>MODALIDAD</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>ESTADO</Text>
                          </View>

                          {visitorStats.recentList.length > 0 ? (
                            visitorStats.recentList.map((r, idx) => (
                              <View key={r.id || idx} style={styles.tableRowDark}>
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
                              </View>
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
                      <View style={styles.dangerAlertBox}>
                        <Ionicons name="warning" size={26} color={COLORS.danger} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dangerAlertTitle}>Incidentes Críticos Pendientes</Text>
                          <Text style={styles.dangerAlertDesc}>
                            Hay {maintenanceStats.highPriorityPending} reporte(s) de prioridad **ALTA** en espera de atención técnica. Requieren asignación inmediata.
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.kpiRow}>
                      <KPICard label="En Curso" value={maintenanceStats.inProgress.toString()} color={COLORS.accent} icon="construct" trend="Técnicos asignados" />
                      <KPICard label="Pendientes" value={maintenanceStats.pending.toString()} color={COLORS.warning} icon="time" trend="Por asignar" />
                      <KPICard label="Finalizados" value={maintenanceStats.resolved.toString()} color={COLORS.success} icon="checkmark-circle" trend="Solucionados" />
                      <KPICard label="Tasa de Solución" value={`${maintenanceStats.effectivenessRate}%`} color={COLORS.purple} icon="speedometer" trend="Efectividad técnica" />
                    </View>

                    {/* Fila 2 columnas: Pipeline y Especialidades Técnicas */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardTitle}>Manejo de Estados de Incidentes</Text>
                        <Text style={styles.cardSubtitle}>Pipeline de control y seguimiento de órdenes</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          <CategoryProgress label="Pendiente de Revisión (Inicial)" count={maintenanceStats.pending} total={maintenanceStats.total} color={COLORS.warning} />
                          <CategoryProgress label="En Curso / Técnico Asignado" count={maintenanceStats.inProgress} total={maintenanceStats.total} color={COLORS.accent} />
                          <CategoryProgress label="Finalizado y Validado (Cerrado)" count={maintenanceStats.resolved} total={maintenanceStats.total} color={COLORS.success} />
                          <CategoryProgress label="Rechazado / No Aplica" count={maintenanceStats.rejected} total={maintenanceStats.total} color={COLORS.danger} />
                        </View>
                      </View>

                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Especialidades y Tipos de Daño</Text>
                        <Text style={styles.cardSubtitle}>Clasificación técnica de los incidentes reportados</Text>
                        
                        <View style={{ gap: 16, marginTop: 22 }}>
                          {maintenanceStats.specialties.map((sp, idx) => (
                            <CategoryProgress key={idx} label={sp.name} count={sp.count} total={maintenanceStats.total} color={COLORS.accent} />
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
                            <RankProgress key={idx} name={`Piso / Área: ${loc.name}`} count={loc.count} max={maintenanceStats.locations[0].count} color={COLORS.success} index={idx + 1} />
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
                          <Text style={styles.cardSubtitle}>Seguimiento individual de las solicitudes e intervenciones locativas</Text>
                        </View>
                        <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                          <Ionicons name="print-outline" size={14} color={COLORS.accent} />
                          <Text style={styles.cardSectionActionText}>Imprimir Reporte</Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : 800 }}>
                          <View style={styles.tableHeaderRowDark}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1, minWidth: 200 }]}>INCIDENCIA / DAÑO</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 160 }]}>UBICACIÓN</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 90, textAlign: 'center' }]}>PRIORIDAD</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 140 }]}>SOLICITANTE</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>ESTADO</Text>
                          </View>

                          {maintenanceStats.recentList.length > 0 ? (
                            maintenanceStats.recentList.map((r, idx) => (
                              <View key={r.id || idx} style={styles.tableRowDark}>
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
                              </View>
                            ))
                          ) : (
                            <Text style={styles.noDataText}>No hay órdenes técnicas en el periodo</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* --- TAB PARQUEADERO AMPLIADO --- */}
                {activeTab === 'parking' && (
                  <View style={{ gap: 25 }}>
                    <View style={styles.kpiRow}>
                      <KPICard label="Cupos Activos" value={parkingStats.approved.toString()} color={COLORS.success} icon="checkmark-circle" trend="Autorizaciones vigentes" />
                      <KPICard label="En Espera" value={parkingStats.pending.toString()} color={COLORS.warning} icon="hourglass" trend="Solicitudes en trámite" />
                      <KPICard label="Total Registros" value={parkingStats.total.toString()} color={COLORS.accent} icon="car" trend="Historial solicitudes" />
                      <KPICard label="Tasa de Ocupación" value={`${parkingStats.occupancyRate}%`} color={COLORS.purple} icon="pie-chart" trend="Capacidad sótanos" />
                    </View>

                    {/* Fila 2 Columnas: Tipología Vehicular y Reglamento */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Distribución por Tipología Vehicular</Text>
                        <Text style={styles.cardSubtitle}>Clasificación de vehículos autorizados para ingreso a sótanos</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          <CategoryProgress label="Automóviles / Camionetas" count={parkingStats.cars} total={parkingStats.total} color={COLORS.accent} suffix=" cupos" />
                          <CategoryProgress label="Motocicletas" count={parkingStats.motos} total={parkingStats.total} color={COLORS.warning} suffix=" cupos" />
                          <CategoryProgress label="Bicicletas / Micromovilidad Eléctrica" count={parkingStats.bikes} total={parkingStats.total} color={COLORS.success} suffix=" cupos" />
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

                    {/* Placas Recientes Autorizadas */}
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Placas Recientes Autorizadas</Text>
                      <Text style={styles.cardSubtitle}>Vehículos con permiso activo registrados en el sistema de seguridad vehicular</Text>
                      
                      <View style={styles.platesGrid}>
                        {parkingStats.plates.length > 0 ? (
                          parkingStats.plates.map((plate, idx) => (
                            <View key={idx} style={styles.plateCard}>
                              <Text style={styles.plateText}>{plate}</Text>
                              <View style={styles.plateBadge}><Text style={styles.plateBadgeText}>ACTIVO</Text></View>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.noDataText}>No hay placas autorizadas en el periodo</Text>
                        )}
                      </View>
                    </View>

                    {/* Tabla de Asignación y Solicitudes de Parqueadero */}
                    <View style={styles.card}>
                      <View style={styles.cardSectionHeader}>
                        <View>
                          <Text style={styles.cardTitle}>Registro y Control de Cupos Vehiculares</Text>
                          <Text style={styles.cardSubtitle}>Historial de asignaciones de estacionamiento por placa</Text>
                        </View>
                        <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                          <Ionicons name="print-outline" size={14} color={COLORS.accent} />
                          <Text style={styles.cardSectionActionText}>Imprimir Reporte</Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : 760 }}>
                          <View style={styles.tableHeaderRowDark}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110 }]}>PLACA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1, minWidth: 180 }]}>VEHÍCULO / MODELO</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 160 }]}>SOLICITANTE</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 150 }]}>DEPENDENCIA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>ESTADO</Text>
                          </View>

                          {parkingStats.recentList.length > 0 ? (
                            parkingStats.recentList.map((r, idx) => (
                              <View key={r.id || idx} style={styles.tableRowDark}>
                                <Text style={[styles.tableCellTxt, { width: 95 }]}>{formatDisplayDate(r.created_at)}</Text>
                                <Text style={[styles.tableCellTxtBold, { width: 110, color: COLORS.primary }]}>{r.metadata?.plate || 'Sin placa'}</Text>
                                <Text style={[styles.tableCellTxt, { flex: 1, minWidth: 180 }]} numberOfLines={1}>{r.title || r.metadata?.vehicleType || 'Vehículo institucional'}</Text>
                                <Text style={[styles.tableCellTxt, { width: 160 }]} numberOfLines={1}>{r.profiles?.full_name || 'Servidor'}</Text>
                                <Text style={[styles.tableCellTxt, { width: 150 }]} numberOfLines={1}>{r.profiles?.dependency?.name || 'General'}</Text>
                                <View style={{ width: 110, alignItems: 'center' }}>
                                  <StatusBadge status={r.status} />
                                </View>
                              </View>
                            ))
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
                      <KPICard label="Reservas Realizadas" value={roomStats.totalReservations.toString()} color={COLORS.purple} icon="calendar" trend="Reuniones ejecutadas" />
                      <KPICard label="Asistencia Promedio" value={`${roomStats.averageAttendees} pers.`} color={COLORS.accent} icon="people" trend="Por reunión" />
                      <KPICard label="Total Asistentes" value={`${roomStats.totalAttendees} pers.`} color={COLORS.success} icon="person-add" trend="Acumulado periodo" />
                      <KPICard label="Servicios Demandados" value="Alta" color={COLORS.warning} icon="cafe" trend="Café y audiovisuales" />
                    </View>

                    {/* Fila 2 Columnas: Salas y Servicios */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Uso y Ocupación de Salas de Juntas</Text>
                        <Text style={styles.cardSubtitle}>Espacios de reunión con mayor índice de reservación</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          {roomStats.roomsList.length > 0 ? (
                            roomStats.roomsList.slice(0, 6).map((room, idx) => (
                              <RankProgress key={idx} name={room.name} count={room.count} max={roomStats.roomsList[0].count} color={COLORS.purple} index={idx + 1} />
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
                          <CategoryProgress label="Estación de Café y Refrigerios" count={roomStats.services.coffee} total={100} color={COLORS.warning} suffix="%" />
                          <CategoryProgress label="Proyector y Ayudas Visuales" count={roomStats.services.projector} total={100} color={COLORS.accent} suffix="%" />
                          <CategoryProgress label="Laptops y Conectividad" count={roomStats.services.laptop} total={100} color={COLORS.purple} suffix="%" />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                          <View style={styles.miniInfoCard}>
                            <Text style={styles.miniInfoCardLabel}>Franja Mañana (8am-12m)</Text>
                            <Text style={styles.miniInfoCardValue}>{roomStats.morningSlots}</Text>
                            <Text style={styles.miniInfoCardSub}>reuniones programadas</Text>
                          </View>
                          <View style={styles.miniInfoCard}>
                            <Text style={styles.miniInfoCardLabel}>Franja Tarde (2pm-5pm)</Text>
                            <Text style={styles.miniInfoCardValue}>{roomStats.afternoonSlots}</Text>
                            <Text style={styles.miniInfoCardSub}>reuniones programadas</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Tabla de Reservas Recientes */}
                    <View style={styles.card}>
                      <View style={styles.cardSectionHeader}>
                        <View>
                          <Text style={styles.cardTitle}>Bitácora de Reservaciones y Sesiones de Trabajo</Text>
                          <Text style={styles.cardSubtitle}>Historial de eventos y reuniones desarrolladas en las salas de la entidad</Text>
                        </View>
                        <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                          <Ionicons name="print-outline" size={14} color={COLORS.accent} />
                          <Text style={styles.cardSectionActionText}>Imprimir Reporte</Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : 780 }}>
                          <View style={styles.tableHeaderRowDark}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 140 }]}>SALA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1, minWidth: 200 }]}>ASUNTO / REUNIÓN</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 160 }]}>DEPENDENCIA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 90, textAlign: 'center' }]}>ASISTENTES</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>ESTADO</Text>
                          </View>

                          {roomStats.recentList.length > 0 ? (
                            roomStats.recentList.map((r, idx) => (
                              <View key={r.id || idx} style={styles.tableRowDark}>
                                <Text style={[styles.tableCellTxt, { width: 95 }]}>{formatDisplayDate(r.created_at)}</Text>
                                <Text style={[styles.tableCellTxtBold, { width: 140 }]}>{r.metadata?.room?.name || 'Sala General'}</Text>
                                <Text style={[styles.tableCellTxt, { flex: 1, minWidth: 200 }]} numberOfLines={1}>{r.title || 'Reunión de trabajo'}</Text>
                                <Text style={[styles.tableCellTxt, { width: 160 }]} numberOfLines={1}>{r.profiles?.dependency?.name || 'General'}</Text>
                                <Text style={[styles.tableCellTxt, { width: 90, textAlign: 'center', fontWeight: '800' }]}>{r.metadata?.attendees || '-'}</Text>
                                <View style={{ width: 110, alignItems: 'center' }}>
                                  <StatusBadge status={r.status} />
                                </View>
                              </View>
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
                      <KPICard label="Misiones de Viaje" value={transportStats.totalRequests.toString()} color={COLORS.accent} icon="car-sport" trend="Servicios ejecutados" />
                      <KPICard label="Servidores Movilizados" value={transportStats.totalPassengers.toString()} color={COLORS.success} icon="people" trend="Pasajeros oficiales" />
                      <KPICard label="Promedio Pasajeros" value={`${transportStats.avgPassengers} pers.`} color={COLORS.purple} icon="speedometer" trend="Por misión" />
                      <KPICard label="Cobertura Operativa" value="100%" color={COLORS.danger} icon="navigate" trend="Sede y Distrital" />
                    </View>

                    {/* Fila 2 Columnas: Rutas y Modalidades */}
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
                      <View style={[styles.card, { flex: 1.2 }]}>
                        <Text style={styles.cardTitle}>Rutas y Trayectos Frecuentes</Text>
                        <Text style={styles.cardSubtitle}>Destinos recurrentes de misiones oficiales administrativas</Text>
                        
                        <View style={{ gap: 18, marginTop: 22 }}>
                          {transportStats.routes.length > 0 ? (
                            transportStats.routes.slice(0, 6).map((route, idx) => (
                              <RankProgress key={idx} name={route.name} count={route.count} max={transportStats.routes[0].count} color={COLORS.accent} index={idx + 1} />
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
                          <CategoryProgress label="Diligencias Judiciales y Notificaciones" count={transportStats.judicialTrips} total={transportStats.totalRequests} color={COLORS.accent} suffix=" viajes" />
                          <CategoryProgress label="Comisiones Directivas y Despacho" count={transportStats.executiveTrips} total={transportStats.totalRequests} color={COLORS.purple} suffix=" viajes" />
                          <CategoryProgress label="Logística Administrativa y Envíos" count={transportStats.adminTrips} total={transportStats.totalRequests} color={COLORS.success} suffix=" viajes" />
                        </View>

                        <View style={[styles.infoAlertBox, { marginTop: 20 }]}>
                          <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.accent} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.infoAlertTitle}>Seguridad Vial y SOAT Vigente</Text>
                            <Text style={styles.infoAlertDesc}>
                              Toda la flota institucional cuenta con revisiones técnico-mecánicas y pólizas contractuales al día.
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Tabla de Comisiones de Transporte */}
                    <View style={styles.card}>
                      <View style={styles.cardSectionHeader}>
                        <View>
                          <Text style={styles.cardTitle}>Registro de Salidas y Comisiones de Transporte Oficial</Text>
                          <Text style={styles.cardSubtitle}>Relación de traslados con origen, destino y personal a bordo</Text>
                        </View>
                        <TouchableOpacity style={styles.cardSectionAction} onPress={handleGenerateReport}>
                          <Ionicons name="print-outline" size={14} color={COLORS.accent} />
                          <Text style={styles.cardSectionActionText}>Imprimir Reporte</Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                        contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: '100%' }}
                        style={{ width: '100%' }}
                      >
                        <View style={{ flex: 1, width: '100%', minWidth: isDesktop ? '100%' : 800 }}>
                          <View style={styles.tableHeaderRowDark}>
                            <Text style={[styles.tableHeaderTxtDark, { width: 95 }]}>FECHA</Text>
                            <Text style={[styles.tableHeaderTxtDark, { flex: 1, minWidth: 180 }]}>ASUNTO / MISIÓN</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 200 }]}>ORIGEN Y DESTINO</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 80, textAlign: 'center' }]}>PASAJEROS</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 140 }]}>SOLICITANTE</Text>
                            <Text style={[styles.tableHeaderTxtDark, { width: 110, textAlign: 'center' }]}>ESTADO</Text>
                          </View>

                          {transportStats.recentList.length > 0 ? (
                            transportStats.recentList.map((r, idx) => (
                              <View key={r.id || idx} style={styles.tableRowDark}>
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
                              </View>
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

                    <TouchableOpacity 
                      style={[styles.modalTabBtn, reportTab === 'parking' && styles.modalTabBtnActive]} 
                      onPress={() => setReportTab('parking')}
                    >
                      <Ionicons name="car" size={14} color={reportTab === 'parking' ? COLORS.white : COLORS.muted} />
                      <Text style={[styles.modalTabBtnText, reportTab === 'parking' && styles.modalTabBtnTextActive]}>Parqueadero</Text>
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
                        
                        <TableRow label="Control Acceso (Visitantes)" count={stats.catCounts.visitors} inProg={categoryBreakdown.visitors.inProgress} resolved={categoryBreakdown.visitors.resolved} />
                        <TableRow label="Mantenimiento Locativo" count={stats.catCounts.maintenance} inProg={categoryBreakdown.maintenance.inProgress} resolved={categoryBreakdown.maintenance.resolved} />
                        <TableRow label="Cupo de Parqueadero" count={stats.catCounts.parking} inProg={categoryBreakdown.parking.inProgress} resolved={categoryBreakdown.parking.resolved} />
                        <TableRow label="Reserva de Salas" count={stats.catCounts.rooms} inProg={categoryBreakdown.rooms.inProgress} resolved={categoryBreakdown.rooms.resolved} />
                        <TableRow label="Transporte Oficial" count={stats.catCounts.transport} inProg={categoryBreakdown.transport.inProgress} resolved={categoryBreakdown.transport.resolved} />
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
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text }]}>{dep.name}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{dep.count}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>
                              {visitorStats.totalVisitors > 0 ? Math.round((dep.count / visitorStats.totalVisitors) * 100) : 0}%
                            </Text>
                          </View>
                        ))}
                      </View>

                      <Text style={styles.reportSectionTitle}>3. MUESTRA RECIENTE DE REGISTROS DE VISITA</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '800' }]}>FECHA</Text>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>MOTIVO / ASUNTO</Text>
                          <Text style={[styles.tableCell, { flex: 1.8, fontWeight: '800' }]}>DEPENDENCIA</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                        </View>
                        {dbData.filter(d => d.category === 'visitors').slice(0, 10).map((r, idx) => (
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.tableCell, { flex: 1.2, color: COLORS.text }]}>{new Date(r.created_at).toLocaleDateString('es-CO')}</Text>
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text }]}>{r.title || 'Visita oficial'}</Text>
                            <Text style={[styles.tableCell, { flex: 1.8, color: COLORS.text }]}>{r.metadata?.responsible?.dependency || r.profiles?.dependency?.name || 'General'}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text, fontWeight: '700' }]}>{r.status?.toUpperCase()}</Text>
                          </View>
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
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text }]}>{loc.name}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{loc.count}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>
                              {maintenanceStats.total > 0 ? Math.round((loc.count / maintenanceStats.total) * 100) : 0}%
                            </Text>
                          </View>
                        ))}
                      </View>

                      <Text style={styles.reportSectionTitle}>3. DETALLE DE SOLICITUDES TÉCNICAS RECIENTES</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '800' }]}>FECHA</Text>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>INCIDENCIA</Text>
                          <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '800' }]}>UBICACIÓN</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>PRIORIDAD</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                        </View>
                        {dbData.filter(d => d.category === 'maintenance').slice(0, 10).map((r, idx) => (
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.tableCell, { flex: 1.2, color: COLORS.text }]}>{new Date(r.created_at).toLocaleDateString('es-CO')}</Text>
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text }]}>{r.title || 'Mantenimiento'}</Text>
                            <Text style={[styles.tableCell, { flex: 1.5, color: COLORS.text }]}>{r.metadata?.location || 'General'}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: r.priority === 'alta' ? COLORS.danger : COLORS.accent, fontWeight: '800' }]}>{r.priority?.toUpperCase() || 'MEDIA'}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text, fontWeight: '700' }]}>{r.status?.toUpperCase()}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* --- 4. REPORTE ACCESO PARQUEADERO --- */}
                  {reportTab === 'parking' && (
                    <View>
                      <Text style={styles.reportDocTitle}>
                        REPORTE DE ASIGNACIÓN Y GESTIÓN DE CUPOS DE PARQUEADERO
                      </Text>
                      <View style={styles.docDivider} />

                      <View style={styles.reportDocMetaGrid}>
                        <Text style={styles.reportMetaLabel}>Periodo Evaluado: <Text style={{fontWeight:'400'}}>{reportPeriodLabel}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Total Solicitudes de Cupo: <Text style={{fontWeight:'400'}}>{parkingStats.total}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Cupos Activos Aprobados: <Text style={{fontWeight:'400'}}>{parkingStats.approved}</Text></Text>
                        <Text style={styles.reportMetaLabel}>Solicitudes en Lista de Espera: <Text style={{fontWeight:'400'}}>{parkingStats.pending}</Text></Text>
                      </View>

                      <Text style={styles.reportSectionTitle}>1. CONTROL DE ESTACIONAMIENTO INSTITUCIONAL</Text>
                      <Text style={styles.reportParagraph}>
                        El parqueadero de la Secretaría Jurídica Distrital mantiene **{parkingStats.approved}** asignaciones vehiculares activas con placa autorizada. Se cuenta con **{parkingStats.pending}** solicitudes en trámite de validación conforme a disponibilidad de espacios en sótanos.
                      </Text>

                      <Text style={styles.reportSectionTitle}>2. MUESTRA DE PLACAS AUTORIZADAS RECIENTES</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '800' }]}>FECHA</Text>
                          <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '800' }]}>PLACA</Text>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>DESCRIPCIÓN / VEHÍCULO</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                        </View>
                        {dbData.filter(d => d.category === 'parking').slice(0, 10).map((r, idx) => (
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.tableCell, { flex: 1.2, color: COLORS.text }]}>{new Date(r.created_at).toLocaleDateString('es-CO')}</Text>
                            <Text style={[styles.tableCell, { flex: 1.5, color: COLORS.primary, fontWeight: '900' }]}>{r.metadata?.plate || 'Sin placa'}</Text>
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text }]}>{r.title || r.metadata?.vehicleType || 'Vehículo autorizado'}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text, fontWeight: '700' }]}>{r.status?.toUpperCase()}</Text>
                          </View>
                        ))}
                      </View>
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
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text }]}>{rm.name}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{rm.count}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>
                              {roomStats.totalReservations > 0 ? Math.round((rm.count / roomStats.totalReservations) * 100) : 0}%
                            </Text>
                          </View>
                        ))}
                      </View>

                      <Text style={styles.reportSectionTitle}>3. DETALLE DE REUNIONES RECIENTES</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '800' }]}>FECHA</Text>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>ASUNTO</Text>
                          <Text style={[styles.tableCell, { flex: 1.5, fontWeight: '800' }]}>SALA</Text>
                          <Text style={[styles.tableCell, { flex: 0.8, fontWeight: '800', textAlign: 'center' }]}>ASIST.</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                        </View>
                        {dbData.filter(d => d.category === 'rooms').slice(0, 10).map((r, idx) => (
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.tableCell, { flex: 1.2, color: COLORS.text }]}>{new Date(r.created_at).toLocaleDateString('es-CO')}</Text>
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text }]}>{r.title || 'Reunión'}</Text>
                            <Text style={[styles.tableCell, { flex: 1.5, color: COLORS.text }]}>{r.metadata?.room?.name || 'General'}</Text>
                            <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'center', color: COLORS.text }]}>{r.metadata?.attendees || '-'}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text, fontWeight: '700' }]}>{r.status?.toUpperCase()}</Text>
                          </View>
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
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.tableCell, { flex: 2.5, color: COLORS.text }]}>{rt.name}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{rt.count}</Text>
                          </View>
                        ))}
                      </View>

                      <Text style={styles.reportSectionTitle}>3. DETALLE DE MISIONES RECIENTES</Text>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '800' }]}>FECHA</Text>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>ASUNTO / MISIÓN</Text>
                          <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>RUTA</Text>
                          <Text style={[styles.tableCell, { flex: 0.8, fontWeight: '800', textAlign: 'center' }]}>PASAJ.</Text>
                          <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>ESTADO</Text>
                        </View>
                        {dbData.filter(d => d.category === 'transport').slice(0, 10).map((r, idx) => (
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.tableCell, { flex: 1.2, color: COLORS.text }]}>{new Date(r.created_at).toLocaleDateString('es-CO')}</Text>
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text }]}>{r.title || 'Misión oficial'}</Text>
                            <Text style={[styles.tableCell, { flex: 2, color: COLORS.text }]}>{r.metadata?.origin || 'Origen'} - {r.metadata?.destination || 'Destino'}</Text>
                            <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'center', color: COLORS.text }]}>{r.metadata?.passengers || 1}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text, fontWeight: '700' }]}>{r.status?.toUpperCase()}</Text>
                          </View>
                        ))}
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

function KPICard({ label, value, color, icon, trend, style }: any) {
  return (
    <View style={[styles.kpiCard, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8 }}>
        <View style={[styles.kpiIcon, { backgroundColor: `${color}14`, borderWidth: 1, borderColor: `${color}28` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: `${color}10`, borderColor: `${color}25`, borderWidth: 1, flexShrink: 1 }]}>
            <Text style={[styles.trendText, { color: color }]} numberOfLines={1} adjustsFontSizeToFit>{trend}</Text>
          </View>
        )}
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.kpiLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </View>
  );
}

interface SegmentedCategoryBarProps {
  label: string;
  icon: string;
  total: number;
  resolved: number;
  inProgress: number;
  pending: number;
  rejected: number;
}

function SegmentedCategoryBar({
  label,
  icon,
  total,
  resolved,
  inProgress,
  pending,
  rejected
}: SegmentedCategoryBarProps) {
  // El total real para la distribución gráfica y visual de la barra es la suma de todas las solicitudes de la categoría
  const sumTotal = resolved + inProgress + pending + rejected;
  const barTotal = sumTotal > 0 ? sumTotal : (total || 0);

  return (
    <View style={styles.segmentedContainer}>
      <View style={styles.segmentedHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.moduleIconBadge}>
            <Ionicons name={icon as any} size={14} color={COLORS.primary} />
          </View>
          <Text style={styles.segmentedLabel}>{label}</Text>
        </View>
        <Text style={styles.segmentedTotal}>{barTotal} {barTotal === 1 ? 'solicitud' : 'solicitudes'}</Text>
      </View>

      {/* Barra segmentada por estado */}
      <View style={styles.segmentedBarOuter}>
        {barTotal === 0 ? (
          <View style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 6 }} />
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden', borderRadius: 6, gap: 1 }}>
            {resolved > 0 && (
              <View style={{ flex: resolved, backgroundColor: COLORS.success, height: '100%' }} />
            )}
            {inProgress > 0 && (
              <View style={{ flex: inProgress, backgroundColor: COLORS.accent, height: '100%' }} />
            )}
            {pending > 0 && (
              <View style={{ flex: pending, backgroundColor: COLORS.warning, height: '100%' }} />
            )}
            {rejected > 0 && (
              <View style={{ flex: rejected, backgroundColor: COLORS.danger, height: '100%' }} />
            )}
          </View>
        )}
      </View>

      {/* Mini indicadores de desglose */}
      <View style={styles.segmentedBadgesRow}>
        <View style={styles.statusBadgeMini}>
          <View style={[styles.statusDotMini, { backgroundColor: COLORS.success }]} />
          <Text style={styles.statusTextMini}>{resolved} resueltas</Text>
        </View>
        <View style={styles.statusBadgeMini}>
          <View style={[styles.statusDotMini, { backgroundColor: COLORS.accent }]} />
          <Text style={styles.statusTextMini}>{inProgress} en curso</Text>
        </View>
        <View style={styles.statusBadgeMini}>
          <View style={[styles.statusDotMini, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.statusTextMini}>{pending} pendientes</Text>
        </View>
        <View style={styles.statusBadgeMini}>
          <View style={[styles.statusDotMini, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.statusTextMini}>{rejected} rechazadas</Text>
        </View>
      </View>
    </View>
  );
}

function CategoryProgress({ label, count, total, color, suffix = '', prefix = '' }: any) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTextRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{prefix}{count}{suffix}</Text>
      </View>
      <AnimatedProgressBar percent={percent} color={color} />
    </View>
  );
}

function RankProgress({ name, count, max, color, index }: any) {
  const percent = max > 0 ? (count / max) * 100 : 0;
  return (
    <View style={styles.rankContainer}>
      <View style={styles.rankIndexCircle}><Text style={styles.rankIndexText}>{index}</Text></View>
      <View style={{ flex: 1 }}>
        <View style={styles.progressTextRow}>
          <Text style={styles.rankName}>{name}</Text>
          <Text style={styles.rankCount}>{count} reg.</Text>
        </View>
        <AnimatedProgressBar percent={percent} color={color} />
      </View>
    </View>
  );
}

function StateWidget({ label, count, color, icon, bg }: any) {
  return (
    <View style={[styles.stateWidget, { borderLeftColor: color }]}>
      <View style={[styles.stateIconCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.stateCount}>{count}</Text>
      <Text style={styles.stateLabel}>{label}</Text>
    </View>
  );
}

function TableRow({ label, count, inProg, resolved }: any) {
  return (
    <View style={styles.reportTableRow}>
      <Text style={[styles.tableCell, { flex: 2, color: COLORS.text }]}>{label}</Text>
      <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{count}</Text>
      <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{inProg}</Text>
      <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: COLORS.text }]}>{resolved}</Text>
    </View>
  );
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

  if (p === 'alta') {
    bg = COLORS.dangerSoft;
    text = COLORS.danger;
    label = 'ALTA';
  } else if (p === 'baja') {
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

  contentPadding: { paddingHorizontal: 26, paddingTop: 26 }, // Padding general incrementado
  
  filtersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, flexWrap: 'wrap', gap: 12 },
  rangeSelector: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: COLORS.line },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  rangeBtnActive: { backgroundColor: COLORS.accent },
  rangeText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  rangeTextActive: { color: COLORS.white },
  
  downloadDocBtn: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primarySoft, paddingHorizontal: 18, borderRadius: 14, shadowOpacity: 0.1, shadowRadius: 5 },
  downloadDocText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },

  monthSelectorCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: COLORS.line, marginBottom: 22 },
  monthSelectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  monthSelectorKicker: { fontSize: 10, fontWeight: '900', color: COLORS.accent, letterSpacing: 1.5 },
  monthSelectorTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary, marginTop: 2 },
  monthOptionsRow: { gap: 10, paddingRight: 8 },
  monthOptionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line },
  monthOptionBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  monthOptionText: { fontSize: 12, fontWeight: '800', color: COLORS.muted, textTransform: 'capitalize' },
  monthOptionTextActive: { color: COLORS.white },
  dbBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.accentLight, borderWidth: 1, borderColor: '#BFDBFE' },
  dbBadgeError: { backgroundColor: COLORS.dangerSoft, borderColor: '#FECACA' },
  dbBadgeText: { fontSize: 11, fontWeight: '900', color: COLORS.accent },
  dbBadgeTextError: { color: COLORS.danger },

  mobileTabsContainer: { paddingBottom: 18, gap: 12 },
  mobTabBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 18, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  mobTabBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  mobTabLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  mobTabLabelActive: { color: COLORS.white, fontWeight: '900' },

  loadingContainer: { minHeight: 300, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },

  kpiRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  kpiCard: { 
    flex: 1, 
    minWidth: 155, 
    backgroundColor: COLORS.white, 
    borderRadius: 22, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: COLORS.line,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10 },
      android: { elevation: 2 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }
    })
  },
  kpiIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  trendText: { fontSize: 10, fontWeight: '800' },
  kpiValue: { fontSize: 28, fontWeight: '900', color: COLORS.primary, marginTop: 14 },
  kpiLabel: { fontSize: 13, fontWeight: '700', color: COLORS.muted, marginTop: 3 },

  card: { backgroundColor: COLORS.white, borderRadius: 28, padding: 26, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden' }, // Padding de tarjeta incrementado a 26px
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

  modalBlurContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalPanel: { backgroundColor: COLORS.white, borderRadius: 28, width: '95%', maxWidth: 900, height: '90%', padding: 25, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
  modalPanelExpanded: { width: '98%', maxWidth: 1400, height: '98%', borderRadius: 16, padding: 25 },
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
  reportTableHeader: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 12 },
  reportTableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: COLORS.line, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: COLORS.white },
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
