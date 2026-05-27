import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Dimensions, Modal, ImageBackground, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { DependencySelector } from '../../components/DependencySelector';
import { requestService } from '../../lib/requestService';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const COLORS = {
  primary: '#7209B7', // Royal Purple
  primaryDark: '#560BAD',
  primaryLight: '#E0AAFF',
  accent: '#FACC15',
  soft: '#F3E8FF',
  bg: '#F8FAFC',
  card: 'rgba(255, 255, 255, 0.85)',
  text: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  success: '#10B981',
  white: '#FFFFFF',
  danger: '#EF4444'
};

const DEFAULT_ROOMS = [
  { id: '1', name: 'Sala Innovación', capacity: 12, floor: 'Piso 2', info: 'Ala Norte' },
  { id: '2', name: 'Sala de Juntas B', capacity: 8, floor: 'Piso 1', info: 'Cerca a Recepción' },
  { id: '3', name: 'Focus Room 4', capacity: 2, floor: 'Piso 3', info: 'Zona Silenciosa' },
  { id: '4', name: 'Auditorio Principal', capacity: 50, floor: 'PB', info: 'Salón Principal' },
  { id: '5', name: 'Auditorio Huitaca', capacity: 350, floor: 'PB', info: 'Sede Central - Secretaría General', isLargeScale: true },
  { id: '6', name: 'Salón de Actos Distrital', capacity: 150, floor: 'Piso 2', info: 'Sede Central - Secretaría General', isLargeScale: true }
];

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6 AM to 8 PM

export default function RoomsRequestScreen() {
  const router = useRouter();
  
  // Slots ocupados en tiempo real (limpio por defecto)
  const [occupiedSlots, setOccupiedSlots] = useState<{ day: number; hour: number }[]>([]);
  
  // Selector de Modo: 'standard' | 'large'
  const [bookingMode, setBookingMode] = useState<'standard' | 'large'>('standard');

  // Salas dinámicas cargadas de Supabase
  const [roomsList, setRoomsList] = useState<any[]>(DEFAULT_ROOMS);
  const [selectedRoom, setSelectedRoom] = useState(DEFAULT_ROOMS[0]);
  const [autoApprove, setAutoApprove] = useState(false);
  
  const [title, setTitle] = useState('');
  const [dependency, setDependency] = useState('');
  const [attendees, setAttendees] = useState('4');
  
  // Campos adicionales para Evento de Gran Escala (Secretaría General)
  const [entityName, setEntityName] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleRole, setResponsibleRole] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [activityName, setActivityName] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  // Estados para selectores de hora en Evento de Gran Escala
  const [bookingStartHour, setBookingStartHour] = useState('07:00');
  const [bookingEndHour, setBookingEndHour] = useState('17:00');
  const [eventStartHour, setEventStartHour] = useState('08:00');
  const [eventEndHour, setEventEndHour] = useState('16:00');
  
  // Servicios y requerimientos técnicos
  const [selectedServices, setSelectedServices] = useState<string[]>(['Cafetería / Coffee Break', 'Servicio de Brigadistas']);
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [customTechDescription, setCustomTechDescription] = useState('');
  
  // UI State de selectores
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'bookingStart' | 'bookingEnd' | 'eventStart' | 'eventEnd'>('bookingStart');
  
  const [meetingType, setMeetingType] = useState<'Presencial' | 'Híbrida' | 'Virtual'>('Presencial');
  const [manifestationAccepted, setManifestationAccepted] = useState(false);

  // Selection from Cronograma
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [endHour, setEndHour] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  
  const [services, setServices] = useState({ projector: true, laptop: false, coffee: false });
  
  // UI State
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cargar salas y reglas de negocio al iniciar la pantalla
  useEffect(() => {
    const loadRoomsAndRules = async () => {
      try {
        // 1. Cargar Salas reales de Supabase
        const { data: dbRooms } = await supabase
          .from('rooms')
          .select('*')
          .order('name');
        
        if (dbRooms && dbRooms.length > 0) {
          // Clasificar como especial si info === 'Especial' o capacidad es masiva
          const formattedRooms = dbRooms.map(r => ({
            ...r,
            isLargeScale: r.info === 'Especial' || r.capacity >= 100
          }));
          setRoomsList(formattedRooms);
          setSelectedRoom(formattedRooms[0]);
        } else {
          // Fallback con localStorage si Supabase está vacío
          if (Platform.OS === 'web') {
            const savedRooms = localStorage.getItem('local_rooms');
            if (savedRooms) {
              const parsed = JSON.parse(savedRooms);
              const formatted = parsed.map((r: any) => ({
                ...r,
                isLargeScale: r.info === 'Especial' || (parseInt(r.capacity) || 0) >= 100
              }));
              setRoomsList(formatted);
              setSelectedRoom(formatted[0]);
            }
          }
        }

        // 2. Cargar regla de Aprobación Automática
        if (Platform.OS === 'web') {
          const savedAuto = localStorage.getItem('auto_approve');
          if (savedAuto !== null) {
            setAutoApprove(savedAuto === 'true');
          }
        }
      } catch (err) {
        console.warn('Cargando con valores por defecto debido a error:', err);
      }
    };

    loadRoomsAndRules();
  }, []);

  // Date Logic
  const weekDates = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + (weekOffset * 7));
    
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const monthYearLabel = useMemo(() => {
    const first = weekDates[0];
    return first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }, [weekDates]);

  // Cargar disponibilidad y slots ocupados reales de la sala seleccionada en la semana de interés
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const { data, error } = await supabase
          .from('administrative_requests')
          .select('*')
          .eq('category', 'rooms')
          .neq('status', 'rechazado');

        if (error) throw error;

        if (data) {
          const slots: { day: number; hour: number }[] = [];
          const weekIsoDates = weekDates.map(d => d.toISOString().split('T')[0]);

          data.forEach((req: any) => {
            const meta = req.metadata;
            if (!meta || !meta.room) return;

            // Comparar por ID o por nombre de la sala seleccionada
            if (String(meta.room.id) === String(selectedRoom.id) || String(meta.room.name).toLowerCase() === String(selectedRoom.name).toLowerCase()) {
              if (meta.date_iso) {
                const dayIndex = weekIsoDates.indexOf(meta.date_iso);
                if (dayIndex !== -1 && meta.start_hour !== undefined && meta.end_hour !== undefined) {
                  for (let h = meta.start_hour; h < meta.end_hour; h++) {
                    slots.push({ day: dayIndex, hour: h });
                  }
                }
              } else {
                // Fallback: decodificación a partir de la fecha y hora en formato string
                const reqDateStr = String(meta.date || '').toLowerCase();
                weekDates.forEach((wDate, wIdx) => {
                  const wDateStr = wDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).toLowerCase();
                  if (reqDateStr.includes(wDateStr) || wDateStr.includes(reqDateStr)) {
                    const timeStr = String(meta.time || '');
                    const timeMatch = timeStr.match(/(\d+):00\s*-\s*(\d+):00/);
                    if (timeMatch) {
                      const sH = parseInt(timeMatch[1]);
                      const eH = parseInt(timeMatch[2]);
                      for (let h = sH; h < eH; h++) {
                        slots.push({ day: wIdx, hour: h });
                      }
                    }
                  }
                });
              }
            }
          });

          setOccupiedSlots(slots);
        }
      } catch (err) {
        console.warn('Error al cargar disponibilidad real:', err);
        setOccupiedSlots([]); // agenda limpia por defecto
      }
    };

    fetchReservations();
  }, [selectedRoom, weekOffset, weekDates]);

  const progress = useMemo(() => {
    let p = 20;
    if (title) p += 20;
    if (dependency) p += 20;
    if (attendees) p += 20;
    if (selectedDay !== null && startHour !== null) p += 20;
    return Math.min(p, 100);
  }, [title, dependency, attendees, selectedDay, startHour]);

  const isCapacityExceeded = useMemo(() => {
    const entered = parseInt(attendees) || 0;
    const maxCapacity = selectedRoom?.capacity || 0;
    return entered > maxCapacity;
  }, [attendees, selectedRoom]);

  const handleRegister = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const isLarge = bookingMode === 'large';
      
      const bookingHours = isLarge ? `${bookingStartHour} - ${bookingEndHour}` : '';
      const servicesDescription = isLarge ? selectedServices.join(', ') : '';

      // Las solicitudes magnas o de gran escala siempre son 'pendientes' por revisión de Secretaría General
      const finalStatus = (autoApprove && !isLarge) ? 'resuelto' : 'pendiente';
      const finalPriority: 'baja' | 'media' | 'alta' = isLarge ? 'alta' : 'media';

      const requestPayload = {
        user_id: user?.id || null,
        title: isLarge ? `Evento Magno: ${activityName}` : `Reserva: ${selectedRoom.name} - ${title}`,
        description: isLarge 
          ? `Solicitud de gran capacidad para ${entityName} organizada por ${responsibleName}. Horario: ${displayDate} de ${bookingHours}`
          : `Reunión para ${dependency} con ${attendees} asistentes. Horario: ${displayDate} ${displayTime}`,
        category: 'rooms' as const,
        status: finalStatus,
        priority: finalPriority,
        metadata: isLarge ? {
          room: selectedRoom,
          entity_name: entityName,
          responsible_name: responsibleName,
          responsible_role: responsibleRole,
          contact_phone: contactPhone,
          activity_name: activityName,
          activity_description: activityDescription,
          participants_count: attendees,
          date: displayDate,
          booking_hours: bookingHours,
          event_start_hour: eventStartHour,
          event_end_hour: eventEndHour,
          services_description: servicesDescription,
          tech_requirements: selectedTech,
          custom_tech_description: customTechDescription,
          meeting_type: meetingType,
          manifestation_express: manifestationAccepted,
          requires_secretaria_general: true
        } : {
          room: selectedRoom,
          attendees,
          date: displayDate,
          time: displayTime,
          services,
          dependency,
          approved_automatically: autoApprove,
          start_hour: startHour,
          end_hour: endHour,
          selected_day: selectedDay,
          date_iso: selectedDay !== null ? weekDates[selectedDay].toISOString().split('T')[0] : null
        }
      };

      await requestService.create(requestPayload);

      setLoading(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al reservar sala:', error);
      setLoading(false);
    }
  };

  const handleSlotPress = (day: number, hour: number) => {
    const isOccupied = occupiedSlots.some(s => s.day === day && s.hour === hour);
    if (isOccupied) return;

    if (selectedDay !== day) {
      setSelectedDay(day);
      setStartHour(hour);
      setEndHour(hour + 1);
      return;
    }

    if (startHour === null) {
      setStartHour(hour);
      setEndHour(hour + 1);
    } else {
      if (hour < startHour) {
        const slotsInBetween = Array.from({ length: endHour! - hour }, (_, i) => hour + i);
        const hasOccupied = slotsInBetween.some(h => occupiedSlots.some(s => s.day === day && s.hour === h));
        if (hasOccupied) {
          setStartHour(hour);
          setEndHour(hour + 1);
        } else {
          setStartHour(hour);
        }
      } else if (hour >= endHour!) {
        const slotsInBetween = Array.from({ length: (hour + 1) - startHour }, (_, i) => startHour + i);
        const hasOccupied = slotsInBetween.some(h => occupiedSlots.some(s => s.day === day && s.hour === h));
        if (hasOccupied) {
          setStartHour(hour);
          setEndHour(hour + 1);
        } else {
          setEndHour(hour + 1);
        }
      } else {
        setStartHour(hour);
        setEndHour(hour + 1);
      }
    }
  };

  const displayDate = useMemo(() => {
    if (selectedDay === null) return '';
    const dateObj = weekDates[selectedDay];
    return dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
  }, [selectedDay, weekDates]);

  const displayTime = useMemo(() => {
    if (startHour === null || endHour === null) return '';
    return `${startHour}:00 - ${endHour}:00`;
  }, [startHour, endHour]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: 'Reserva de Salas' }} />
      <LinearGradient colors={['#F1F5F9', '#FFFFFF']} style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
          
          {isDesktop && <Sidebar />}

          <ScrollView 
            contentContainerStyle={{ 
              padding: isDesktop ? 40 : 20, 
              paddingBottom: 60,
              flexGrow: 1
            }}
            showsVerticalScrollIndicator={false}
          >
            <ResponsiveContainer>
              {!isDesktop && <MobileHeader />}

              <Hero progress={progress} />

              {/* Selector de Tipo de Espacio / Evento */}
              <View 
                style={{ 
                  flexDirection: 'row', 
                  backgroundColor: 'rgba(0,0,0,0.03)', 
                  borderRadius: 18, 
                  padding: 4, 
                  marginBottom: 20, 
                  gap: 5 
                }}
              >
                <TouchableOpacity 
                  style={[
                    {
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      borderRadius: 14,
                      gap: 8
                    },
                    bookingMode === 'standard' && { backgroundColor: COLORS.primary }
                  ]}
                  onPress={() => {
                    setBookingMode('standard');
                    const firstStandard = roomsList.find(r => !r.isLargeScale) || roomsList[0];
                    setSelectedRoom(firstStandard);
                  }}
                >
                  <Ionicons name="business" size={18} color={bookingMode === 'standard' ? COLORS.white : COLORS.primary} />
                  <Text 
                    style={[
                      { fontSize: 13, fontWeight: '800', color: COLORS.primary },
                      bookingMode === 'standard' && { color: COLORS.white }
                    ]}
                  >
                    Sala de Juntas
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    {
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      borderRadius: 14,
                      gap: 8
                    },
                    bookingMode === 'large' && { backgroundColor: COLORS.primary }
                  ]}
                  onPress={() => {
                    setBookingMode('large');
                    const firstLarge = roomsList.find(r => r.isLargeScale) || roomsList[4] || roomsList[0];
                    setSelectedRoom(firstLarge);
                  }}
                >
                  <Ionicons name="ribbon" size={18} color={bookingMode === 'large' ? COLORS.white : COLORS.primary} />
                  <Text 
                    style={[
                      { fontSize: 13, fontWeight: '800', color: COLORS.primary },
                      bookingMode === 'large' && { color: COLORS.white }
                    ]}
                  >
                    Evento Secretaría General
                  </Text>
                </TouchableOpacity>
              </View>

              {bookingMode === 'large' ? (
                <View style={{ gap: 18 }}>
                  {/* CARD 1: INFORMACIÓN INSTITUCIONAL */}
                  <Card title="Entidad y Dependencia Solicitante" icon="business">
                    <Field 
                      label="Nombre de la Entidad / Dependencia" 
                      icon="business-outline" 
                      value={entityName} 
                      onChangeText={setEntityName} 
                      placeholder="Ej. Consejo de Estado" 
                    />
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 5 }}>
                      <View style={{ flex: 1 }}>
                        <Field 
                          label="Nombre del Responsable" 
                          icon="person-outline" 
                          value={responsibleName} 
                          onChangeText={setResponsibleName} 
                          placeholder="Ej. Laura Juliana Ariza" 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field 
                          label="Cargo del Responsable" 
                          icon="ribbon-outline" 
                          value={responsibleRole} 
                          onChangeText={setResponsibleRole} 
                          placeholder="Ej. Coordinadora" 
                        />
                      </View>
                    </View>
                    <Field 
                      label="Teléfono de Contacto" 
                      icon="call-outline" 
                      value={contactPhone} 
                      onChangeText={setContactPhone} 
                      placeholder="Ej. 3134728939" 
                      keyboardType="phone-pad"
                    />
                  </Card>

                  {/* CARD 2: DETALLES DEL EVENTO MAGNO */}
                  <Card title="Detalles del Evento o Actividad" icon="document-text">
                    <Field 
                      label="Nombre de la Actividad / Evento" 
                      icon="create-outline" 
                      value={activityName} 
                      onChangeText={setActivityName} 
                      placeholder="Ej. Conmemoración de 20 años de Juzgados" 
                    />
                    <View style={styles.field}>
                      <Text style={styles.label}>Descripción del Evento</Text>
                      <View style={[styles.inputWrap, { height: 90, paddingVertical: 10 }]}>
                        <TextInput 
                          multiline 
                          style={[styles.input, { textAlignVertical: 'top' }]} 
                          placeholder="Describa brevemente el propósito de la actividad"
                          placeholderTextColor="#94A3B8" 
                          value={activityDescription}
                          onChangeText={activityDescription => setActivityDescription(activityDescription)}
                        />
                      </View>
                    </View>
                    
                    <Text style={styles.label}>Espacio Especial Requerido</Text>
                    <View style={styles.roomSelectBox}>
                      <View style={styles.roomIcon}>
                        <Ionicons name="ribbon-outline" size={30} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>{selectedRoom.name}</Text>
                        <Text style={styles.roomDetails}>{selectedRoom.floor} • Capacidad Recomendada: {selectedRoom.capacity} pers.</Text>
                      </View>
                      <TouchableOpacity style={styles.changeBtn} onPress={() => setShowRoomSelector(true)}>
                        <Text style={styles.changeBtnText}>Cambiar</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={{ marginTop: 15 }}>
                      <Field 
                        label="Número de Participantes" 
                        icon="people-outline" 
                        value={attendees} 
                        onChangeText={setAttendees} 
                        keyboardType="numeric"
                        placeholder="Ej. 350" 
                      />
                      {isCapacityExceeded && (
                        <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '700', marginTop: 5, marginLeft: 4 }}>
                          ⚠️ El número de participantes supera la capacidad máxima del espacio ({selectedRoom.capacity} pers.)
                        </Text>
                      )}
                    </View>
                  </Card>

                  {/* CARD 3: TIEMPOS Y LOGÍSTICA */}
                  <Card title="Horarios y Logística Especial" icon="time">
                    
                    {/* Sección mini calendario interactivo para fecha */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 0, marginBottom: 8 }}>
                      <Text style={[styles.label, { marginTop: 0 }]}>Seleccionar Fecha del Evento</Text>
                      <View style={styles.navBtns}>
                        <TouchableOpacity onPress={() => setWeekOffset(v => v - 1)} style={styles.navBtn}>
                          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setWeekOffset(0)} style={styles.navToday}>
                          <Text style={styles.todayText}>Hoy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setWeekOffset(v => v + 1)} style={styles.navBtn}>
                          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 10, textTransform: 'capitalize', paddingLeft: 2 }}>
                      {monthYearLabel}
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 15 }}>
                      {weekDates.map((dateObj, idx) => {
                        const isSelected = selectedDay === idx;
                        return (
                          <TouchableOpacity 
                            key={idx}
                            style={[
                              {
                                flex: 1,
                                height: 54,
                                borderRadius: 14,
                                borderStyle: 'solid',
                                borderWidth: 1.5,
                                borderColor: COLORS.line,
                                backgroundColor: COLORS.white,
                                justifyContent: 'center',
                                alignItems: 'center'
                              },
                              isSelected && { borderColor: COLORS.primary, backgroundColor: COLORS.soft }
                            ]}
                            onPress={() => setSelectedDay(idx)}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '900', color: COLORS.muted, textTransform: 'uppercase' }}>{DAYS_SHORT[idx]}</Text>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.text, marginTop: 2 }}>{dateObj.getDate()}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Horarios con selector modal táctil */}
                    <Text style={styles.label}>Horario de Reserva (Montaje / Desmontaje)</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { fontSize: 11, marginLeft: 4, marginTop: 0 }]}>Montaje Desde</Text>
                        <TouchableOpacity 
                          style={styles.inputWrap} 
                          onPress={() => {
                            setTimePickerTarget('bookingStart');
                            setShowTimePicker(true);
                          }}
                        >
                          <Ionicons name="time-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                          <Text style={styles.input}>{bookingStartHour}</Text>
                          <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
                        </TouchableOpacity>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { fontSize: 11, marginLeft: 4, marginTop: 0 }]}>Desmontaje Hasta</Text>
                        <TouchableOpacity 
                          style={styles.inputWrap} 
                          onPress={() => {
                            setTimePickerTarget('bookingEnd');
                            setShowTimePicker(true);
                          }}
                        >
                          <Ionicons name="time-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                          <Text style={styles.input}>{bookingEndHour}</Text>
                          <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.label}>Duración del Evento Real</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 15 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { fontSize: 11, marginLeft: 4, marginTop: 0 }]}>Hora Inicio Evento</Text>
                        <TouchableOpacity 
                          style={styles.inputWrap} 
                          onPress={() => {
                            setTimePickerTarget('eventStart');
                            setShowTimePicker(true);
                          }}
                        >
                          <Ionicons name="play-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                          <Text style={styles.input}>{eventStartHour}</Text>
                          <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
                        </TouchableOpacity>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { fontSize: 11, marginLeft: 4, marginTop: 0 }]}>Hora Finalización</Text>
                        <TouchableOpacity 
                          style={styles.inputWrap} 
                          onPress={() => {
                            setTimePickerTarget('eventEnd');
                            setShowTimePicker(true);
                          }}
                        >
                          <Ionicons name="stop-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                          <Text style={styles.input}>{eventEndHour}</Text>
                          <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Servicios Adicionales Selección Múltiple */}
                    <Text style={styles.label}>Servicios Adicionales Requeridos</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
                      {SERVICE_OPTIONS.map((option) => {
                        const isSelected = selectedServices.includes(option);
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.chipBtn,
                              isSelected && styles.chipBtnActive
                            ]}
                            onPress={() => {
                              if (isSelected) {
                                setSelectedServices(selectedServices.filter(s => s !== option));
                              } else {
                                setSelectedServices([...selectedServices, option]);
                              }
                            }}
                          >
                            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                              {option}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Requerimientos Técnicos Selección Múltiple y Campo Abierto */}
                    <Text style={styles.label}>Requerimientos Técnicos Especiales</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
                      {TECH_OPTIONS.map((option) => {
                        const isSelected = selectedTech.includes(option);
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.chipBtn,
                              isSelected && styles.chipBtnActive
                            ]}
                            onPress={() => {
                              if (isSelected) {
                                setSelectedTech(selectedTech.filter(t => t !== option));
                              } else {
                                setSelectedTech([...selectedTech, option]);
                              }
                            }}
                          >
                            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                              {option}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Otros Requerimientos Técnicos (Campo Abierto)</Text>
                      <View style={[styles.inputWrap, { height: 75, paddingVertical: 8 }]}>
                        <TextInput 
                          multiline 
                          style={[styles.input, { textAlignVertical: 'top' }]} 
                          placeholder="Describa aquí otros requerimientos técnicos (sonido, adaptadores, grabación, etc.)"
                          placeholderTextColor="#94A3B8" 
                          value={customTechDescription}
                          onChangeText={setCustomTechDescription}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.field}>
                      <Text style={styles.label}>Tipo de Reunión</Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {['Presencial', 'Híbrida', 'Virtual'].map((type) => (
                          <TouchableOpacity 
                            key={type}
                            style={[
                              {
                                flex: 1,
                                backgroundColor: COLORS.white,
                                borderWidth: 1.5,
                                borderColor: COLORS.line,
                                borderRadius: 14,
                                height: 48,
                                justifyContent: 'center',
                                alignItems: 'center'
                              },
                              meetingType === type && { borderColor: COLORS.primary, backgroundColor: COLORS.soft }
                            ]}
                            onPress={() => setMeetingType(type as any)}
                          >
                            <Text 
                              style={[
                                { fontSize: 13, fontWeight: '800', color: COLORS.muted },
                                meetingType === type && { color: COLORS.primary }
                              ]}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </Card>

                  {/* CARD 4: MANIFESTACIÓN OBLIGATORIA */}
                  <Card title="Declaración Institucional Obligatoria" icon="shield-checkmark">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, padding: 5 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '700', lineHeight: 20 }}>
                          Manifestación expresa de misión y fines institucionales
                        </Text>
                        <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, lineHeight: 18 }}>
                          Se manifiesta expresamente que el evento está relacionado con la misión y funciones de la entidad solicitante y no es de carácter político, religioso o comercial.
                        </Text>
                      </View>
                      <Switch 
                        value={manifestationAccepted} 
                        onValueChange={setManifestationAccepted} 
                        trackColor={{ false: COLORS.line, true: COLORS.primary }}
                        thumbColor={COLORS.white}
                      />
                    </View>
                  </Card>

                  {/* BOTÓN REGISTRO DE EVENTO GRANDE */}
                  <TouchableOpacity 
                    style={[
                      styles.mainBtn, 
                      (!entityName || !responsibleName || !activityName || !manifestationAccepted || isCapacityExceeded) && { opacity: 0.5 }
                    ]} 
                    onPress={handleRegister}
                    disabled={loading || !entityName || !responsibleName || !activityName || !manifestationAccepted || isCapacityExceeded}
                  >
                    <LinearGradient 
                      colors={[COLORS.primary, COLORS.primaryDark]} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 0 }} 
                      style={styles.btnGradient}
                    >
                      <Text style={styles.btnText}>{loading ? 'PROCESANDO...' : 'SOLICITAR AUTORIZACIÓN SG'}</Text>
                      <Ionicons name="ribbon-outline" size={22} color={COLORS.white} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 18 }}>
                  <Card title="Detalles de la Reunión" icon="document-text">
                    <Field 
                      label="Título del Evento" 
                      icon="create-outline" 
                      value={title} 
                      onChangeText={setTitle} 
                      placeholder="Ej. Comité de Gerencia" 
                    />
                    <View style={styles.field}>
                      <Text style={styles.label}>Dependencia Solicitante</Text>
                      <TouchableOpacity 
                        style={styles.inputWrap} 
                        onPress={() => setShowDeps(true)}
                      >
                        <Ionicons name="business-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <Text 
                          style={[styles.input, !dependency && { color: '#94A3B8' }]} 
                          numberOfLines={1}
                        >
                          {dependency || "Seleccionar dependencia"}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
                      </TouchableOpacity>
                    </View>
                  </Card>

                  <Card title="Sala y Capacidad" icon="business">
                    <View style={styles.roomSelectBox}>
                      <View style={styles.roomIcon}>
                        <Ionicons name="easel-outline" size={30} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>{selectedRoom.name}</Text>
                        <Text style={styles.roomDetails}>{selectedRoom.floor} • Capacidad: {selectedRoom.capacity} pers.</Text>
                      </View>
                      <TouchableOpacity style={styles.changeBtn} onPress={() => setShowRoomSelector(true)}>
                        <Text style={styles.changeBtnText}>Cambiar</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ marginTop: 15 }}>
                      <Field 
                        label="Número de Asistentes" 
                        icon="people-outline" 
                        value={attendees} 
                        onChangeText={setAttendees} 
                        keyboardType="numeric"
                        placeholder="Ej. 10" 
                      />
                      {isCapacityExceeded && (
                        <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '700', marginTop: 5, marginLeft: 4 }}>
                          ⚠️ El número de asistentes supera la capacidad máxima de la sala ({selectedRoom.capacity} pers.)
                        </Text>
                      )}
                    </View>
                  </Card>

                  <Card title="Disponibilidad y Horario" icon="calendar">
                    <View style={styles.calendarNav}>
                      <Text style={styles.monthLabel}>{monthYearLabel}</Text>
                      <View style={styles.navBtns}>
                        <TouchableOpacity onPress={() => setWeekOffset(v => v - 1)} style={styles.navBtn}>
                          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setWeekOffset(0)} style={styles.navToday}>
                          <Text style={styles.todayText}>Hoy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setWeekOffset(v => v + 1)} style={styles.navBtn}>
                          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.calendarOuter}>
                      <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator={false}>
                        <View style={[styles.calendarContainer, isDesktop && { flex: 1 }]}>
                          {/* Hours Column */}
                          <View style={styles.hoursCol}>
                            <View style={{ height: 45 }} /> 
                            {HOURS.map(h => (
                              <View key={h} style={styles.hourCell}>
                                <Text style={styles.hourText}>{h}:00</Text>
                              </View>
                            ))}
                          </View>
                          
                          {/* Days Grid */}
                          {weekDates.map((dateObj, dIdx) => (
                            <View key={dIdx} style={[styles.dayCol, isDesktop && { flex: 1 }]}>
                              <View style={styles.dayHeader}>
                                <Text style={styles.dayHeaderText}>{DAYS_SHORT[dIdx]}</Text>
                                <Text style={styles.dayHeaderNum}>{dateObj.getDate()}</Text>
                              </View>
                              {HOURS.map(h => {
                                const isOccupied = occupiedSlots.some(s => s.day === dIdx && s.hour === h);
                                const isSelected = selectedDay === dIdx && startHour !== null && endHour !== null && h >= startHour && h < endHour;
                                const isStart = isSelected && h === startHour;
                                const isEnd = isSelected && h === endHour - 1;

                                return (
                                  <TouchableOpacity 
                                    key={h} 
                                    disabled={isOccupied}
                                    onPress={() => handleSlotPress(dIdx, h)}
                                    activeOpacity={0.7}
                                    style={[
                                      styles.slotCell, 
                                      isOccupied && styles.slotOccupied,
                                      isSelected && styles.slotSelected,
                                      isSelected && !isStart && { borderTopWidth: 0 },
                                      isSelected && !isEnd && { borderBottomWidth: 0 }
                                    ]}
                                  >
                                    {isOccupied && <View style={styles.occupiedIndicator} />}
                                    {isSelected && (
                                      <View style={[
                                        styles.selectedIndicator,
                                        !isStart && { borderTopLeftRadius: 0, borderTopRightRadius: 0 },
                                        !isEnd && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
                                      ]}>
                                        {isStart && <Ionicons name="time-outline" size={16} color={COLORS.white} />}
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

                    <View style={styles.selectionSummary}>
                      <View style={styles.summaryCenter}>
                        <View style={styles.clockIconBox}>
                          <Ionicons name="time" size={24} color={COLORS.white} />
                        </View>
                        <View>
                          <Text style={styles.summaryLabel}>Horario Seleccionado</Text>
                          <Text style={styles.summaryText}>
                            {selectedDay !== null ? `${displayDate}, ${displayTime}` : "Seleccione su horario en la cuadrícula"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.legendSmall}>
                        <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line }]} /><Text style={styles.legendText}>Libre</Text></View>
                        <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#E2E8F0' }]} /><Text style={styles.legendText}>Ocupado</Text></View>
                      </View>
                    </View>
                  </Card>

                  <Card title="Servicios Adicionales" icon="add-circle">
                    <View style={styles.servicesGrid}>
                      <ServiceToggle 
                        active={services.projector} 
                        label="Proyector" 
                        icon="videocam-outline" 
                        onPress={() => setServices({...services, projector: !services.projector})} 
                      />
                      <ServiceToggle 
                        active={services.laptop} 
                        label="Laptop" 
                        icon="laptop-outline" 
                        onPress={() => setServices({...services, laptop: !services.laptop})} 
                      />
                      <ServiceToggle 
                        active={services.coffee} 
                        label="Servicio de Café" 
                        icon="cafe-outline" 
                        onPress={() => setServices({...services, coffee: !services.coffee})} 
                      />
                    </View>
                  </Card>

                  <TouchableOpacity 
                    style={[styles.mainBtn, (progress < 100 || isCapacityExceeded) && { opacity: 0.5 }]} 
                    onPress={handleRegister}
                    disabled={loading || progress < 100 || isCapacityExceeded}
                  >
                    <LinearGradient 
                      colors={[COLORS.primary, COLORS.primaryDark]} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 0 }} 
                      style={styles.btnGradient}
                    >
                      <Text style={styles.btnText}>{loading ? 'PROCESANDO...' : 'CONFIRMAR RESERVA'}</Text>
                      <Ionicons name="calendar-outline" size={22} color={COLORS.white} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </ResponsiveContainer>
          </ScrollView>
        </View>
      </LinearGradient>

      <SuccessModal 
        visible={showSuccess} 
        room={selectedRoom.name} 
        date={displayDate} 
        time={bookingMode === 'large' ? `${bookingStartHour} - ${bookingEndHour}` : displayTime} 
        isApproved={bookingMode === 'standard' && autoApprove}
        bookingMode={bookingMode}
        title={title}
        dependency={dependency}
        attendees={attendees}
        entityName={entityName}
        responsibleName={responsibleName}
        activityName={activityName}
        selectedServices={bookingMode === 'large' ? selectedServices : []}
        selectedTech={bookingMode === 'large' ? selectedTech : []}
        customTechDescription={customTechDescription}
        eventTime={bookingMode === 'large' ? `${eventStartHour} - ${eventEndHour}` : ''}
        standardServices={bookingMode === 'standard' ? services : null}
        onClose={() => { setShowSuccess(false); router.replace('/(tabs)'); }} 
      />
      
      <DependencySelector 
        visible={showDeps} 
        onClose={() => setShowDeps(false)} 
        onSelect={setDependency} 
        selectedValue={dependency}
      />

      <RoomSelectorModal
        visible={showRoomSelector}
        rooms={roomsList.filter(r => bookingMode === 'large' ? r.isLargeScale : !r.isLargeScale)}
        selectedRoom={selectedRoom}
        onSelect={(room: any) => {
          setSelectedRoom(room);
          setShowRoomSelector(false);
        }}
        onClose={() => setShowRoomSelector(false)}
      />

      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        title={
          timePickerTarget === 'bookingStart' ? 'Hora de Montaje (Desde)' :
          timePickerTarget === 'bookingEnd' ? 'Hora de Desmontaje (Hasta)' :
          timePickerTarget === 'eventStart' ? 'Inicio del Evento' : 'Fin del Evento'
        }
        value={
          timePickerTarget === 'bookingStart' ? bookingStartHour :
          timePickerTarget === 'bookingEnd' ? bookingEndHour :
          timePickerTarget === 'eventStart' ? eventStartHour : eventEndHour
        }
        onSelect={(val: string) => {
          if (timePickerTarget === 'bookingStart') setBookingStartHour(val);
          else if (timePickerTarget === 'bookingEnd') setBookingEndHour(val);
          else if (timePickerTarget === 'eventStart') setEventStartHour(val);
          else if (timePickerTarget === 'eventEnd') setEventEndHour(val);
          setShowTimePicker(false);
        }}
      />
    </SafeAreaView>
  );
}

function Sidebar() {
  return (
    <View style={styles.sidebar}>
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop' }} 
        style={styles.sideBg}
      >
        <LinearGradient colors={['rgba(114, 9, 183, 0.9)', 'rgba(86, 11, 173, 0.95)']} style={StyleSheet.absoluteFill} />
        <View style={styles.sideContent}>
          <View style={styles.logoRing}>
            <Ionicons name="business" size={54} color={COLORS.white} />
          </View>
          <Text style={styles.sideTitle}>Gestión de Espacios</Text>
          <Text style={styles.sideSub}>Secretaría Jurídica Distrital</Text>
          <View style={styles.sideDivider} />
          <Text style={styles.sideDesc}>
            Reserva de salas de juntas y espacios colaborativos para el desarrollo de actividades institucionales.
          </Text>
          <View style={styles.sideBadge}>
            <Text style={styles.badgeText}>BOGOTÁ UNIDA</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

function MobileHeader() {
  const router = useRouter();
  return (
    <View style={[styles.mobHeader, { justifyContent: 'space-between', width: '100%', alignItems: 'center' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="business" size={32} color={COLORS.primary} />
        <View>
          <Text style={styles.mobTitle}>Secretaría Jurídica</Text>
          <Text style={styles.mobSub}>Reserva de Salas</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 6, 
          backgroundColor: COLORS.soft, 
          paddingHorizontal: 12, 
          paddingVertical: 8, 
          borderRadius: 12 
        }}
        onPress={() => router.push({ pathname: '/(tabs)/requests', params: { service: 'Salas' } })}
      >
        <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
        <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>Mis Reservas</Text>
      </TouchableOpacity>
    </View>
  );
}

function Hero({ progress }: { progress: number }) {
  const router = useRouter();
  return (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.heroTitle}>Nueva Reserva</Text>
          <Text style={styles.heroSub}>Optimice el uso de los espacios comunes</Text>
        </View>
        <View style={{ gap: 8, alignItems: 'flex-end' }}>
          <View style={styles.pill}><Text style={styles.pillText}>Sede Central</Text></View>
          <TouchableOpacity 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: 6, 
              backgroundColor: COLORS.soft, 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 10,
              borderWidth: 1,
              borderColor: COLORS.primaryLight
            }}
            onPress={() => router.push({ pathname: '/(tabs)/requests', params: { service: 'Salas' } })}
          >
            <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>Mis Reservas</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.barContainer}>
        <View style={styles.barBg}>
          <Animated.View style={[styles.barFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.barLabel}>{progress}% Completado</Text>
      </View>
    </View>
  );
}

function Card({ title, icon, right, children }: any) {
  return (
    <BlurView intensity={90} tint="light" style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardRow}>
          <View style={styles.iconBox}>
            <Ionicons name={icon} size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {right}
      </View>
      <View style={styles.cardBody}>
        {children}
      </View>
    </BlurView>
  );
}

function Field({ label, icon, ...props }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        {icon && <Ionicons name={icon} size={18} color={COLORS.muted} style={{ marginRight: 10 }} />}
        <TextInput 
          placeholderTextColor="#94A3B8" 
          style={styles.input} 
          {...props} 
        />
      </View>
    </View>
  );
}

function ServiceToggle({ active, label, icon, onPress }: any) {
  return (
    <TouchableOpacity 
      style={[styles.serviceBtn, active && styles.serviceBtnActive]} 
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color={active ? COLORS.primary : COLORS.muted} />
      <Text style={[styles.serviceLabel, active && styles.serviceLabelActive]}>{label}</Text>
      {active && <View style={styles.activeDot} />}
    </TouchableOpacity>
  );
}

function SuccessModal({ 
  visible, 
  onClose, 
  room, 
  date, 
  time, 
  isApproved, 
  bookingMode,
  title,
  dependency,
  attendees,
  entityName,
  responsibleName,
  activityName,
  selectedServices,
  selectedTech,
  customTechDescription,
  eventTime,
  standardServices
}: any) {
  const isLarge = bookingMode === 'large';
  
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBlur}>
        <View style={[styles.modalPanel, { alignItems: 'center', padding: 25, maxWidth: 450 }]}>
          
          {isApproved ? (
            <View style={[styles.successIcon, { backgroundColor: COLORS.success, marginBottom: 12 }]}>
              <Ionicons name="checkmark-circle" size={50} color={COLORS.white} />
            </View>
          ) : (
            <View style={[styles.successIcon, { backgroundColor: '#F59E0B', marginBottom: 12 }]}>
              <Ionicons name="time" size={50} color={COLORS.white} />
            </View>
          )}

          <Text style={[styles.modalTitle, { fontSize: 20, marginBottom: 5 }]}>
            {isApproved ? '¡Reserva Confirmada!' : '¡Solicitud Registrada!'}
          </Text>

          <Text style={{ 
            fontSize: 12, 
            color: COLORS.muted, 
            textAlign: 'center', 
            marginBottom: 15, 
            lineHeight: 16,
            paddingHorizontal: 5
          }}>
            {isApproved 
              ? 'El espacio ha sido reservado y aprobado de forma inmediata. ¡Todo listo para tu evento!'
              : isLarge 
                ? 'Esta reserva requiere autorización de la Secretaría General debido al aforo del espacio. Recibirás una notificación en cuanto se resuelva.'
                : 'La reserva ha quedado en estado pendiente para validación del administrador. Se le informará por correo o notificación móvil.'
            }
          </Text>

          {/* Resumen del Evento */}
          <ScrollView 
            style={{ width: '100%', maxHeight: 280, marginBottom: 10 }} 
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: '100%', padding: 18, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: COLORS.line, gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.8, borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingBottom: 6 }}>
                DETALLES DEL TRÁMITE
              </Text>
              
              {isLarge ? (
                <>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Evento:</Text> {activityName}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Entidad:</Text> {entityName}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Responsable:</Text> {responsibleName}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Espacio:</Text> {room}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Fecha:</Text> {date}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Aforo:</Text> {attendees} personas</Text>
                  
                  <View style={{ height: 1, backgroundColor: COLORS.line, marginVertical: 4 }} />
                  
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Horario Montaje:</Text> {time}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Duración Evento:</Text> {eventTime}</Text>
                  
                  {selectedServices && selectedServices.length > 0 && (
                    <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Servicios:</Text> {selectedServices.join(', ')}</Text>
                  )}
                  
                  {selectedTech && selectedTech.length > 0 && (
                    <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Tecnología:</Text> {selectedTech.join(', ')}</Text>
                  )}

                  {customTechDescription ? (
                    <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Especificaciones:</Text> {customTechDescription}</Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Reunión:</Text> {title}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Dependencia:</Text> {dependency}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Sala:</Text> {room}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Fecha:</Text> {date}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Horario:</Text> {time}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Asistentes:</Text> {attendees} personas</Text>
                  
                  {standardServices && (
                    <>
                      <View style={{ height: 1, backgroundColor: COLORS.line, marginVertical: 4 }} />
                      <Text style={{ fontSize: 14, color: COLORS.text }}>
                        <Text style={{fontWeight:'900', color: COLORS.text}}>Servicios:</Text> {[
                          standardServices.projector ? 'Proyector' : '',
                          standardServices.laptop ? 'Laptop' : '',
                          standardServices.coffee ? 'Café' : ''
                        ].filter(Boolean).join(', ') || 'Ninguno'}
                      </Text>
                    </>
                  )}
                </>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isApproved ? COLORS.success : '#F59E0B' }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: isApproved ? COLORS.success : '#F59E0B', textTransform: 'uppercase' }}>
                  {isApproved ? 'Aprobada Automáticamente' : 'Pendiente de Aprobación'}
                </Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={[styles.modalBtn, { width: '100%', marginTop: 15 }]} onPress={onClose}>
            <Text style={styles.modalBtnText}>LISTO</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function RoomSelectorModal({ visible, onClose, rooms, selectedRoom, onSelect }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBlur}>
        <View style={styles.modalPanel}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>Seleccionar Sala</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
              <Ionicons name="close" size={24} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 12 }}>
              {rooms.map((room: any) => {
                const isSelected = selectedRoom?.id === room.id;
                return (
                  <TouchableOpacity
                    key={room.id}
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isSelected ? COLORS.soft : 'rgba(0,0,0,0.01)',
                        padding: 15,
                        borderRadius: 18,
                        borderWidth: 1.5,
                        borderColor: isSelected ? COLORS.primary : COLORS.line,
                        gap: 15
                      }
                    ]}
                    onPress={() => onSelect(room)}
                  >
                    <View
                      style={[
                        {
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: isSelected ? COLORS.white : `${COLORS.primary}10`,
                          justifyContent: 'center',
                          alignItems: 'center'
                        }
                      ]}
                    >
                      <Ionicons name="easel-outline" size={22} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.text }}>{room.name}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{room.floor} • Capacidad: {room.capacity} pers.</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 380, height: '100%' },
  sideBg: { flex: 1 },
  sideContent: { flex: 1, padding: 50, justifyContent: 'center' },
  logoRing: { width: 90, height: 90, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  sideTitle: { color: COLORS.white, fontSize: 32, fontWeight: '900', lineHeight: 38 },
  sideSub: { color: 'rgba(255,255,255,0.8)', fontSize: 18, marginTop: 5 },
  sideDivider: { width: 50, height: 4, backgroundColor: COLORS.accent, marginVertical: 25, borderRadius: 2 },
  sideDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 16, lineHeight: 24 },
  sideBadge: { marginTop: 30, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignSelf: 'flex-start' },
  badgeText: { color: COLORS.white, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  
  mobHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  mobTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  mobSub: { fontSize: 14, color: COLORS.muted },
  
  hero: { backgroundColor: COLORS.white, borderRadius: 28, padding: 25, marginBottom: 20, borderWidth: 1, borderColor: COLORS.line, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, elevation: 2 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  heroSub: { color: COLORS.muted, marginTop: 2, fontSize: 15 },
  pill: { backgroundColor: COLORS.soft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  pillText: { color: COLORS.primary, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  barContainer: { marginTop: 20 },
  barBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 10, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 10 },
  barLabel: { marginTop: 8, fontSize: 12, fontWeight: '700', color: COLORS.muted, textAlign: 'right' },
  
  card: { borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line, marginBottom: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.soft, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  cardBody: { padding: 20 },
  
  calendarNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  monthLabel: { fontSize: 16, fontWeight: '900', color: COLORS.text, textTransform: 'capitalize' },
  navBtns: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bg, borderRadius: 12, padding: 4 },
  navBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  navToday: { paddingHorizontal: 12, height: 32, justifyContent: 'center' },
  todayText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },

  calendarOuter: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white },
  calendarContainer: { flexDirection: 'row' },
  hoursCol: { width: 55, backgroundColor: COLORS.bg, borderRightWidth: 1, borderRightColor: COLORS.line },
  hourCell: { height: 45, justifyContent: 'center', alignItems: 'center' },
  hourText: { fontSize: 11, color: COLORS.muted, fontWeight: '700' },
  dayCol: { minWidth: 80, borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.09)' },
  dayHeader: { height: 45, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.line, backgroundColor: COLORS.bg },
  dayHeaderText: { fontSize: 10, fontWeight: '900', color: COLORS.muted, textTransform: 'uppercase' },
  dayHeaderNum: { fontSize: 16, fontWeight: '900', color: COLORS.text, marginTop: -2 },
  slotCell: { height: 45, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.09)', backgroundColor: COLORS.white },
  slotOccupied: { backgroundColor: '#F1F5F9' },
  slotSelected: { backgroundColor: COLORS.soft },
  occupiedIndicator: { flex: 1, margin: 4, borderRadius: 8, backgroundColor: '#CBD5E1', opacity: 0.4 },
  selectedIndicator: { flex: 1, marginHorizontal: 2, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  
  selectionSummary: { flexDirection: 'row', alignItems: 'center', marginTop: 20, padding: 20, backgroundColor: COLORS.white, borderRadius: 26, borderWidth: 1.5, borderColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.08, shadowRadius: 15 },
  summaryCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 15, justifyContent: 'center' },
  clockIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  summaryText: { fontSize: 17, fontWeight: '900', color: COLORS.text, marginTop: 1 },
  legendSmall: { gap: 10, paddingLeft: 20, borderLeftWidth: 1, borderLeftColor: COLORS.line },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendBox: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: 12, color: COLORS.muted, fontWeight: '700' },

  roomSelectBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 20, gap: 15, borderWidth: 1, borderColor: COLORS.line },
  roomIcon: { width: 56, height: 56, borderRadius: 15, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  roomName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  roomDetails: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line },
  changeBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  
  field: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.muted, marginBottom: 8, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 16, paddingHorizontal: 15, height: 54 },
  input: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  
  servicesGrid: { flexDirection: 'row', gap: 10 },
  serviceBtn: { flex: 1, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 20, padding: 15, alignItems: 'center', gap: 8 },
  serviceBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.soft },
  serviceLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  serviceLabelActive: { color: COLORS.primary },
  activeDot: { position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  
  mainBtn: { height: 64, borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  btnText: { color: COLORS.white, fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  
  modalBlur: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalPanel: { backgroundColor: COLORS.white, borderRadius: 30, width: '100%', maxWidth: 500, padding: 25, shadowOpacity: 0.2, shadowRadius: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginBottom: 15 },
  confirmSummary: { width: '100%', backgroundColor: COLORS.bg, padding: 20, borderRadius: 20, gap: 10, marginBottom: 10 },
  confirmText: { fontSize: 16, color: COLORS.text },
  modalBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  modalBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  
  // Estilos de chips
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 2
  },
  chipBtnActive: {
    borderColor: '#7209B7',
    backgroundColor: '#F3E8FF'
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B'
  },
  chipTextActive: {
    color: '#7209B7'
  }
});

const SERVICE_OPTIONS = [
  'Cafetería / Coffee Break',
  'Servicio de Brigadistas',
  'Acomodación / Sillas Especiales',
  'Servicio de Sonido / Micrófonos',
  'Estación de Agua permanente',
  'Decoración / Logística'
];

const TECH_OPTIONS = [
  'Videobeam / Proyector',
  'Laptop / Computador',
  'Conexión a Internet (WiFi)',
  'Cable HDMI / Adaptadores',
  'Grabación de Audio / Video',
  'Traducción Simultánea'
];

function TimePickerModal({ visible, onClose, title, value, onSelect }: any) {
  const hours = useMemo(() => {
    const hrs = [];
    for (let i = 0; i < 24; i++) {
      hrs.push(String(i).padStart(2, '0'));
    }
    return hrs;
  }, []);

  const minutes = useMemo(() => {
    return ['00', '15', '30', '45'];
  }, []);

  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');

  useEffect(() => {
    if (visible && value) {
      // Parsear formato "HH:MM" o similar
      const match = value.match(/(\d+):(\d+)/);
      if (match) {
        setSelectedHour(match[1].padStart(2, '0'));
        setSelectedMinute(match[2].padStart(2, '0'));
      }
    }
  }, [visible, value]);

  const handleConfirm = () => {
    onSelect(`${selectedHour}:${selectedMinute}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBlur}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={[styles.modalPanel, { maxWidth: 350, padding: 20 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Indicador de Selección Actual */}
          <View style={{ backgroundColor: COLORS.soft, borderRadius: 16, padding: 12, marginBottom: 15, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: COLORS.primary, fontWeight: '800', letterSpacing: 1 }}>SELECCIÓN ACTUAL</Text>
            <Text style={{ fontSize: 22, color: COLORS.text, fontWeight: '900', marginTop: 4 }}>
              {selectedHour}:{selectedMinute}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', height: 200, gap: 10, marginBottom: 20 }}>
            {/* Columna Hora */}
            <View style={{ flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#F1F5F9', padding: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: COLORS.muted }}>HORA</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {hours.map((h) => {
                  const isSelected = h === selectedHour;
                  return (
                    <TouchableOpacity 
                      key={h}
                      style={{ 
                        paddingVertical: 12, 
                        backgroundColor: isSelected ? COLORS.primary : 'transparent',
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(0,0,0,0.03)',
                        alignItems: 'center'
                      }}
                      onPress={() => setSelectedHour(h)}
                    >
                      <Text style={{ fontSize: 16, color: isSelected ? COLORS.white : COLORS.text, fontWeight: '900' }}>
                        {h}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Columna Minuto */}
            <View style={{ flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#F1F5F9', padding: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: COLORS.muted }}>MIN</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {minutes.map((m) => {
                  const isSelected = m === selectedMinute;
                  return (
                    <TouchableOpacity 
                      key={m}
                      style={{ 
                        paddingVertical: 12, 
                        backgroundColor: isSelected ? COLORS.primary : 'transparent',
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(0,0,0,0.03)',
                        alignItems: 'center'
                      }}
                      onPress={() => setSelectedMinute(m)}
                    >
                      <Text style={{ fontSize: 16, color: isSelected ? COLORS.white : COLORS.text, fontWeight: '900' }}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity style={styles.modalBtn} onPress={handleConfirm}>
            <Text style={styles.modalBtnText}>CONFIRMAR HORA</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
