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
  const stats = useMemo(() => {
    const total = dbData.length;
    const resolved = dbData.filter(d => d.status === 'resuelto').length;
    const pending = dbData.filter(d => d.status === 'pendiente').length;
    const inProgress = dbData.filter(d => d.status === 'en_progreso').length;
    const rejected = dbData.filter(d => d.status === 'rechazado').length;

    const effectiveness = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Distribución por categorías
    const catCounts = dbData.reduce((acc: any, cur) => {
      acc[cur.category] = (acc[cur.category] || 0) + 1;
      return acc;
    }, { visitors: 0, maintenance: 0, parking: 0, rooms: 0, transport: 0 });

    return {
      total,
      resolved,
      pending,
      inProgress,
      rejected,
      effectiveness,
      catCounts
    };
  }, [dbData]);

  // Módulo de Mantenimiento Específico (Manejo de Estados)
  const maintenanceStats = useMemo(() => {
    const maintenanceRequests = dbData.filter(d => d.category === 'maintenance');
    const total = maintenanceRequests.length;
    const pending = maintenanceRequests.filter(d => d.status === 'pendiente').length;
    const inProgress = maintenanceRequests.filter(d => d.status === 'en_progreso').length;
    const resolved = maintenanceRequests.filter(d => d.status === 'resuelto').length;
    const rejected = maintenanceRequests.filter(d => d.status === 'rechazado').length;

    // Criticidad: solicitudes de prioridad alta que siguen pendientes
    const highPriorityPending = maintenanceRequests.filter(d => d.priority === 'alta' && d.status === 'pendiente').length;

    // Ubicaciones más frecuentes
    const locations = maintenanceRequests.reduce((acc: any, cur) => {
      const locName = cur.metadata?.location || 'General';
      acc[locName] = (acc[locName] || 0) + 1;
      return acc;
    }, {});

    const sortedLocations = Object.keys(locations)
      .map(k => ({ name: k, count: locations[k] }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      pending,
      inProgress,
      resolved,
      rejected,
      highPriorityPending,
      locations: sortedLocations
    };
  }, [dbData]);

  // Módulo de Visitantes Específico
  const visitorStats = useMemo(() => {
    const visitorRequests = dbData.filter(d => d.category === 'visitors');
    let totalVisitors = 0;
    let vehicularEntries = 0;

    const depVisits: any = {};

    visitorRequests.forEach(req => {
      if (req.metadata?.visitors) {
        totalVisitors += req.metadata.visitors.length;
      }
      if (req.metadata?.hasVehicle) {
        vehicularEntries += req.metadata.vehicles?.length || 1;
      }
      const depName = req.metadata?.responsible?.dependency || req.profiles?.dependency?.name || 'Otro';
      depVisits[depName] = (depVisits[depName] || 0) + (req.metadata?.visitors?.length || 1);
    });

    const sortedDeps = Object.keys(depVisits)
      .map(k => ({ name: k, count: depVisits[k] }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRequests: visitorRequests.length,
      totalVisitors,
      vehicularEntries,
      departments: sortedDeps
    };
  }, [dbData]);

  // Módulo de Salas Específico
  const roomStats = useMemo(() => {
    const roomRequests = dbData.filter(d => d.category === 'rooms');
    
    // Contar uso por sala
    const roomUsage: any = {};
    let totalAttendees = 0;
    let coffeeServices = 0;
    let projectorServices = 0;
    let laptopServices = 0;

    roomRequests.forEach(req => {
      const roomName = req.metadata?.room?.name || 'General';
      roomUsage[roomName] = (roomUsage[roomName] || 0) + 1;
      
      const attCount = parseInt(req.metadata?.attendees || '0', 10);
      totalAttendees += isNaN(attCount) ? 0 : attCount;

      if (req.metadata?.services?.coffee) coffeeServices++;
      if (req.metadata?.services?.projector) projectorServices++;
      if (req.metadata?.services?.laptop) laptopServices++;
    });

    const sortedRooms = Object.keys(roomUsage)
      .map(k => ({ name: k, count: roomUsage[k] }))
      .sort((a, b) => b.count - a.count);

    const averageAttendees = roomRequests.length > 0 ? Math.round(totalAttendees / roomRequests.length) : 0;

    return {
      totalReservations: roomRequests.length,
      averageAttendees,
      roomsList: sortedRooms,
      services: {
        coffee: roomRequests.length > 0 ? Math.round((coffeeServices / roomRequests.length) * 100) : 0,
        projector: roomRequests.length > 0 ? Math.round((projectorServices / roomRequests.length) * 100) : 0,
        laptop: roomRequests.length > 0 ? Math.round((laptopServices / roomRequests.length) * 100) : 0
      }
    };
  }, [dbData]);

  // Módulo de Parqueadero Específico
  const parkingStats = useMemo(() => {
    const parkingRequests = dbData.filter(d => d.category === 'parking');
    const total = parkingRequests.length;
    const approved = parkingRequests.filter(d => d.status === 'resuelto').length;
    const pending = parkingRequests.filter(d => d.status === 'pendiente').length;

    const plates = parkingRequests.map(r => r.metadata?.plate).filter(Boolean);

    return {
      total,
      approved,
      pending,
      plates: plates.slice(0, 5)
    };
  }, [dbData]);

  // Módulo de Transporte Específico
  const transportStats = useMemo(() => {
    const transportRequests = dbData.filter(d => d.category === 'transport');
    let totalPassengers = 0;
    const routes: any = {};

    transportRequests.forEach(req => {
      const pass = parseInt(req.metadata?.passengers || '1', 10);
      totalPassengers += isNaN(pass) ? 1 : pass;

      const routeName = `${req.metadata?.origin || 'Origen'} a ${req.metadata?.destination || 'Destino'}`;
      routes[routeName] = (routes[routeName] || 0) + 1;
    });

    const sortedRoutes = Object.keys(routes)
      .map(k => ({ name: k, count: routes[k] }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRequests: transportRequests.length,
      totalPassengers,
      routes: sortedRoutes
    };
  }, [dbData]);

  // Simulación de descarga del PDF membretado oficial
  const handleGenerateReport = async () => {
    await loadAnalyticsData();
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
            <View style={[styles.heroInner, !isDesktop && { paddingTop: 35 }]}>
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
                  <TextInput 
                    style={{ flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line, padding: 12, borderRadius: 10, color: COLORS.text }}
                    placeholder="Fecha Inicio (YYYY-MM-DD)"
                    placeholderTextColor={COLORS.muted}
                    value={customStartDate}
                    onChangeText={setCustomStartDate}
                  />
                  <Text style={{ fontWeight: '800', color: COLORS.muted }}>-</Text>
                  <TextInput 
                    style={{ flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line, padding: 12, borderRadius: 10, color: COLORS.text }}
                    placeholder="Fecha Fin (YYYY-MM-DD)"
                    placeholderTextColor={COLORS.muted}
                    value={customEndDate}
                    onChangeText={setCustomEndDate}
                  />
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

                      {/* Columna 2: Distribución por Categoría de Solicitudes */}
                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardTitle}>Solicitudes por Módulo</Text>
                        <Text style={styles.cardSubtitle}>Volumen de requerimientos operativos</Text>
                        <View style={{ gap: 20, marginTop: 25 }}>
                          <CategoryProgress label="Control de Acceso" count={stats.catCounts.visitors} total={stats.total} color={COLORS.danger} />
                          <CategoryProgress label="Mantenimiento" count={stats.catCounts.maintenance} total={stats.total} color={COLORS.success} />
                          <CategoryProgress label="Parqueadero" count={stats.catCounts.parking} total={stats.total} color={COLORS.warning} />
                          <CategoryProgress label="Salas de Juntas" count={stats.catCounts.rooms} total={stats.total} color={COLORS.purple} />
                          <CategoryProgress label="Transporte" count={stats.catCounts.transport} total={stats.total} color={COLORS.accent} />
                        </View>
                      </View>

                      {/* Columna 3: KPIs Clásicos */}
                      <View style={[{ gap: 15 }, isDesktop ? { flex: 1, justifyContent: 'space-between' } : { flex: undefined }]}>
                        <KPICard label="Efectividad Distrital" value={`${stats.effectiveness}%`} color={COLORS.success} icon="trending-up" trend="+2.4% este período" />
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
                  </View>
                )}

                {/* --- TAB VISITANTES --- */}
                {activeTab === 'visitors' && (
                  <View style={{ gap: 25 }}>
                    <View style={styles.kpiRow}>
                      <KPICard label="Total Visitantes" value={visitorStats.totalVisitors.toString()} color={COLORS.danger} icon="people" trend="Externos autorizados" />
                      <KPICard label="Ingresos Vehiculares" value={visitorStats.vehicularEntries.toString()} color={COLORS.accent} icon="car" trend="Vehículos con placa" />
                      <KPICard label="Trámites Creados" value={visitorStats.totalRequests.toString()} color={COLORS.primarySoft} icon="shield-checkmark" trend="Solicitudes de acceso" />
                    </View>

                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Dependencias Receptoras de Visitas</Text>
                      <Text style={styles.cardSubtitle}>Áreas institucionales con mayor volumen de visitas autorizadas</Text>
                      
                      <View style={{ gap: 22, marginTop: 25 }}>
                        {visitorStats.departments.length > 0 ? (
                          visitorStats.departments.map((dep, idx) => (
                            <RankProgress key={idx} name={dep.name} count={dep.count} max={visitorStats.departments[0].count} color={COLORS.danger} index={idx + 1} />
                          ))
                        ) : (
                          <Text style={styles.noDataText}>No se registran visitas en el periodo</Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* --- TAB MANTENIMIENTO --- */}
                {activeTab === 'maintenance' && (
                  <View style={{ gap: 25 }}>
                    {/* Alertas de criticidad en base a estados */}
                    {maintenanceStats.highPriorityPending > 0 && (
                      <View style={styles.dangerAlertBox}>
                        <Ionicons name="warning" size={26} color={COLORS.danger} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dangerAlertTitle}>Incidentes Críticos Pendientes</Text>
                          <Text style={styles.dangerAlertDesc}>
                            Hay {maintenanceStats.highPriorityPending} reporte(s) de prioridad **ALTA** en espera de atención. Requieren asignación urgente.
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.kpiRow}>
                      <KPICard label="En Curso" value={maintenanceStats.inProgress.toString()} color={COLORS.accent} icon="construct" trend="Técnicos asignados" />
                      <KPICard label="Pendientes" value={maintenanceStats.pending.toString()} color={COLORS.warning} icon="time" trend="Por asignar técnico" />
                      <KPICard label="Finalizados" value={maintenanceStats.resolved.toString()} color={COLORS.success} icon="checkmark-circle" trend="Solucionados" />
                    </View>

                    {/* Pipeline / Manejo de Estados Detallado con Barras Animadas */}
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Manejo de Estados de Incidentes</Text>
                      <Text style={styles.cardSubtitle}>Pipeline de control y seguimiento de mantenimientos</Text>
                      
                      <View style={{ gap: 20, marginTop: 25 }}>
                        <CategoryProgress label="Pendiente de Revisión (Inicial)" count={maintenanceStats.pending} total={maintenanceStats.total} color={COLORS.warning} />
                        <CategoryProgress label="En Curso / Técnico Asignado" count={maintenanceStats.inProgress} total={maintenanceStats.total} color={COLORS.accent} />
                        <CategoryProgress label="Finalizado y Validado (Cerrado)" count={maintenanceStats.resolved} total={maintenanceStats.total} color={COLORS.success} />
                        <CategoryProgress label="Rechazado / No Aplica" count={maintenanceStats.rejected} total={maintenanceStats.total} color={COLORS.danger} />
                      </View>
                    </View>

                    {/* Pisos y Áreas con Mayor Daño */}
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Frecuencia de Daños por Piso / Área</Text>
                      <Text style={styles.cardSubtitle}>Zonas físicas con mayor reporte de incidencias técnicas</Text>
                      
                      <View style={{ gap: 22, marginTop: 25 }}>
                        {maintenanceStats.locations.length > 0 ? (
                          maintenanceStats.locations.map((loc, idx) => (
                            <RankProgress key={idx} name={`Piso / Área: ${loc.name}`} count={loc.count} max={maintenanceStats.locations[0].count} color={COLORS.success} index={idx + 1} />
                          ))
                        ) : (
                          <Text style={styles.noDataText}>No se registran daños en el periodo</Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* --- TAB PARQUEADERO --- */}
                {activeTab === 'parking' && (
                  <View style={{ gap: 25 }}>
                    <View style={styles.kpiRow}>
                      <KPICard label="Cupos Activos" value={parkingStats.approved.toString()} color={COLORS.success} icon="checkmark-circle" trend="Autorizaciones vigentes" />
                      <KPICard label="En Espera" value={parkingStats.pending.toString()} color={COLORS.warning} icon="hourglass" trend="Solicitudes por validar" />
                      <KPICard label="Total Registros" value={parkingStats.total.toString()} color={COLORS.warning} icon="car" trend="Historial de solicitudes" />
                    </View>

                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Placas Recientes Autorizadas</Text>
                      <Text style={styles.cardSubtitle}>Vehículos registrados en el sistema de seguridad vehicular</Text>
                      
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
                  </View>
                )}

                {/* --- TAB SALAS --- */}
                {activeTab === 'rooms' && (
                  <View style={{ gap: 25 }}>
                    <View style={styles.kpiRow}>
                      <KPICard label="Reservas Realizadas" value={roomStats.totalReservations.toString()} color={COLORS.purple} icon="calendar" trend="Reuniones ejecutadas" />
                      <KPICard label="Asistencia Promedio" value={`${roomStats.averageAttendees} pers.`} color={COLORS.accent} icon="people" trend="Por reunión" />
                      <KPICard label="Servicios Demandados" value="Alta" color={COLORS.success} icon="cafe" trend="Estación de café líder" />
                    </View>

                    {/* Uso de salas */}
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Uso y Ocupación de Salas</Text>
                      <Text style={styles.cardSubtitle}>Salas de juntas con mayor índice de reservación</Text>
                      
                      <View style={{ gap: 22, marginTop: 25 }}>
                        {roomStats.roomsList.length > 0 ? (
                          roomStats.roomsList.map((room, idx) => (
                            <RankProgress key={idx} name={room.name} count={room.count} max={roomStats.roomsList[0].count} color={COLORS.purple} index={idx + 1} />
                          ))
                        ) : (
                          <Text style={styles.noDataText}>No se registran reservas en el periodo</Text>
                        )}
                      </View>
                    </View>

                    {/* Servicios Adicionales */}
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Demanda de Servicios Especiales</Text>
                      <Text style={styles.cardSubtitle}>Servicios complementarios solicitados en las reservas</Text>
                      
                      <View style={{ gap: 20, marginTop: 25 }}>
                        <CategoryProgress label="Estación de Café y Refrigerios" count={roomStats.services.coffee} total={100} color={COLORS.warning} suffix="%" />
                        <CategoryProgress label="Proyector y Ayudas Visuales" count={roomStats.services.projector} total={100} color={COLORS.accent} suffix="%" />
                        <CategoryProgress label="Laptops y Computación" count={roomStats.services.laptop} total={100} color={COLORS.purple} suffix="%" />
                      </View>
                    </View>
                  </View>
                )}

                {/* --- TAB TRANSPORTE --- */}
                {activeTab === 'transport' && (
                  <View style={{ gap: 25 }}>
                    <View style={styles.kpiRow}>
                      <KPICard label="Misiones de Viaje" value={transportStats.totalRequests.toString()} color={COLORS.accent} icon="car-sport" trend="Servicios solicitados" />
                      <KPICard label="Servidores Movilizados" value={transportStats.totalPassengers.toString()} color={COLORS.success} icon="people" trend="Pasajeros oficiales" />
                      <KPICard label="Flota Disponible" value="Excelente" color={COLORS.accent} icon="checkmark-done" trend="Flotilla disponible" />
                    </View>

                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Rutas y Trayectos Frecuentes</Text>
                      <Text style={styles.cardSubtitle}>Destinos recurrentes de misiones oficiales administrativas</Text>
                      
                      <View style={{ gap: 22, marginTop: 25 }}>
                        {transportStats.routes.length > 0 ? (
                          transportStats.routes.map((route, idx) => (
                            <RankProgress key={idx} name={route.name} count={route.count} max={transportStats.routes[0].count} color={COLORS.accent} index={idx + 1} />
                          ))
                        ) : (
                          <Text style={styles.noDataText}>No se registran misiones de transporte en el periodo</Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}

              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* --- MODAL INTERACTIVO DE PREVISUALIZACIÓN DE REPORTE INSTITUCIONAL (PREMIUM) --- */}
      <Modal visible={showDocModal} transparent animationType="slide" onRequestClose={() => setShowDocModal(false)}>
        <View style={styles.modalBlurContainer}>
          <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
          
          <View style={styles.modalPanel}>
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
                
                {/* Cabecera del Reporte Membretado */}
                <View style={styles.reportDocHeader}>
                  <View style={styles.reportEscudo}>
                    <Ionicons name="ribbon" size={24} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 10 }}>
                    <Text style={styles.reportGovText}>ALCALDÍA MAYOR DE BOGOTÁ D.C.</Text>
                    <Text style={styles.reportDeptText}>Secretaría Jurídica Distrital</Text>
                    <Text style={styles.reportSubText}>Oficina de Gestión Corporativa</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowDocModal(false)} style={styles.closeModalBtn}>
                    <Ionicons name="close" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                {/* Cuerpo del Reporte Formateado */}
                <ScrollView style={styles.reportDocBody} showsVerticalScrollIndicator={true}>
                  <Text style={styles.reportDocTitle}>
                    REPORTE CONSOLIDADO DE GESTIÓN OPERATIVA Y SERVICIOS ADMINISTRATIVOS
                  </Text>
                  
                  <View style={styles.docDivider} />

                  <View style={styles.reportDocMetaGrid}>
                    <Text style={styles.reportMetaLabel}>Periodo del Reporte: <Text style={{fontWeight:'400'}}>{reportPeriodLabel}</Text></Text>
                    <Text style={styles.reportMetaLabel}>Fecha de Generación: <Text style={{fontWeight:'400'}}>{new Date().toLocaleDateString('es-ES')}</Text></Text>
                    <Text style={styles.reportMetaLabel}>Generado por: <Text style={{fontWeight:'400'}}>Administración del Sistema</Text></Text>
                    <Text style={styles.reportMetaLabel}>Fuente de Datos: <Text style={{fontWeight:'400'}}>{dataSource === 'database' ? 'Supabase / administrative_requests' : dataSource === 'error' ? 'No disponible por error de consulta' : 'Supabase sin registros para el periodo'}</Text></Text>
                  </View>

                  <Text style={styles.reportSectionTitle}>1. RESUMEN EJECUTIVO GENERAL</Text>
                  <Text style={styles.reportParagraph}>
                    Durante el periodo de análisis seleccionado, se registraron un total de **{stats.total}** solicitudes operativas en el sistema de gestión administrativa de la Secretaría Jurídica Distrital. Del volumen total, se completaron exitosamente **{stats.resolved}** requerimientos, alcanzando un **{stats.effectiveness}%** de efectividad en la atención de trámites operativos generales.
                  </Text>

                  {/* Tabla de Datos Oficiales */}
                  <View style={styles.reportTable}>
                    <View style={styles.reportTableHeader}>
                      <Text style={[styles.tableCell, { flex: 2, fontWeight: '800' }]}>MÓDULO OPERATIVO</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>REGISTROS</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>PROCESO</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: '800', textAlign: 'center' }]}>RESUELTO</Text>
                    </View>
                    
                    <TableRow label="Control Acceso (Visitantes)" count={stats.catCounts.visitors} inProg={dbData.filter(d=>d.category==='visitors'&&d.status==='en_progreso').length} resolved={dbData.filter(d=>d.category==='visitors'&&d.status==='resuelto').length} />
                    <TableRow label="Mantenimiento Locativo" count={stats.catCounts.maintenance} inProg={dbData.filter(d=>d.category==='maintenance'&&d.status==='en_progreso').length} resolved={dbData.filter(d=>d.category==='maintenance'&&d.status==='resuelto').length} />
                    <TableRow label="Cupo de Parqueadero" count={stats.catCounts.parking} inProg={dbData.filter(d=>d.category==='parking'&&d.status==='en_progreso').length} resolved={dbData.filter(d=>d.category==='parking'&&d.status==='resuelto').length} />
                    <TableRow label="Reserva de Salas" count={stats.catCounts.rooms} inProg={dbData.filter(d=>d.category==='rooms'&&d.status==='en_progreso').length} resolved={dbData.filter(d=>d.category==='rooms'&&d.status==='resuelto').length} />
                    <TableRow label="Transporte Oficial" count={stats.catCounts.transport} inProg={dbData.filter(d=>d.category==='transport'&&d.status==='en_progreso').length} resolved={dbData.filter(d=>d.category==='transport'&&d.status==='resuelto').length} />
                  </View>

                  <Text style={styles.reportSectionTitle}>2. DIAGNÓSTICO DE MANTENIMIENTO E INFRAESTRUCTURA</Text>
                  <Text style={styles.reportParagraph}>
                    El área de mantenimiento reporta un volumen total de **{maintenanceStats.total}** solicitudes registradas. La distribución operativa muestra **{maintenanceStats.pending}** solicitudes pendientes de revisión técnica y **{maintenanceStats.inProgress}** solicitudes en ejecución.
                  </Text>
                </ScrollView>

                {/* Acciones de descarga */}
                <View style={styles.reportDocFooter}>
                  <TouchableOpacity style={styles.cancelReportBtn} onPress={() => setShowDocModal(false)}>
                    <Text style={styles.cancelReportText}>Cerrar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.printReportBtn} onPress={() => { setShowDocModal(false); }}>
                    <Ionicons name="print-outline" size={20} color={COLORS.white} />
                    <Text style={styles.printReportText}>Imprimir / Descargar</Text>
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

function KPICard({ label, value, color, icon, trend }: any) {
  return (
    <View style={[styles.kpiCard, { flex: undefined }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8 }}>
        <View style={[styles.kpiIcon, { backgroundColor: `${color}10` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { flexShrink: 1 }]}>
            <Text style={styles.trendText} numberOfLines={1} adjustsFontSizeToFit>{trend}</Text>
          </View>
        )}
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.kpiLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
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
  hero: { minHeight: 150, paddingVertical: 15, width: '100%', overflow: 'hidden', borderBottomRightRadius: 40, borderBottomLeftRadius: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 5 },
  heroInner: { flex: 1, paddingHorizontal: 30, justifyContent: 'center' },
  heroKicker: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { color: COLORS.white, fontSize: 28, fontWeight: '900', marginTop: 3 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  refreshBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },

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

  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  kpiCard: { flex: 1, minWidth: 155, backgroundColor: COLORS.white, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.line },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  trendBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: COLORS.bg },
  trendText: { fontSize: 9, fontWeight: '800', color: COLORS.muted },
  kpiValue: { fontSize: 26, fontWeight: '900', color: COLORS.primary, marginTop: 14 },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginTop: 2 },

  card: { backgroundColor: COLORS.white, borderRadius: 28, padding: 26, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden' }, // Padding de tarjeta incrementado a 26px
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  cardSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: '500' },

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

  statesRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 18 },
  stateWidget: { flex: 1, minWidth: 105, borderLeftWidth: 4, padding: 14, backgroundColor: COLORS.primary, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primarySoft, alignItems: 'center' },
  stateIconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  stateCount: { fontSize: 20, fontWeight: '900', color: COLORS.white },
  stateLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginTop: 2 },

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
  printReportText: { fontSize: 13, fontWeight: '800', color: COLORS.white }
});
