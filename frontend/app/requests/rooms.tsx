import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Dimensions, Modal, ImageBackground, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';

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
  white: '#FFFFFF'
};

const ROOMS = [
  { id: '1', name: 'Sala Innovación', capacity: 12, floor: 'Piso 2', info: 'Ala Norte' },
  { id: '2', name: 'Sala de Juntas B', capacity: 8, floor: 'Piso 1', info: 'Cerca a Recepción' },
  { id: '3', name: 'Focus Room 4', capacity: 2, floor: 'Piso 3', info: 'Zona Silenciosa' },
  { id: '4', name: 'Auditorio Principal', capacity: 50, floor: 'PB', info: 'Salón Principal' },
];

export default function RoomsRequestScreen() {
  const router = useRouter();
  
  // Form State
  const [selectedRoom, setSelectedRoom] = useState(ROOMS[0]);
  const [title, setTitle] = useState('');
  const [dependency, setDependency] = useState('');
  const [attendees, setAttendees] = useState('4');
  const [date, setDate] = useState('2026-05-15');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:30');
  const [services, setServices] = useState({ projector: true, whiteboard: false, coffee: false });
  
  // UI State
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const progress = useMemo(() => {
    let p = 20;
    if (title) p += 20;
    if (dependency) p += 20;
    if (attendees) p += 20;
    if (startTime && endTime) p += 20;
    return Math.min(p, 100);
  }, [title, dependency, attendees, startTime, endTime]);

  const handleRegister = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowSuccess(true);
    }, 1500);
  };

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

              <View style={{ gap: 18 }}>
                <Card title="Detalles de la Reunión" icon="document-text">
                  <Field 
                    label="Título del Evento" 
                    icon="create-outline" 
                    value={title} 
                    onChangeText={setTitle} 
                    placeholder="Ej. Comité de Gerencia" 
                  />
                  <Field 
                    label="Dependencia Solicitante" 
                    icon="business-outline" 
                    value={dependency} 
                    onChangeText={setDependency} 
                    placeholder="Ej. Secretaría General" 
                  />
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
                    <TouchableOpacity style={styles.changeBtn}>
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
                  </View>
                </Card>

                <Card title="Horario de la Reserva" icon="time">
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Field 
                        label="Fecha" 
                        icon="calendar-outline" 
                        value={date} 
                        onChangeText={setDate} 
                        placeholder="AAAA-MM-DD" 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field 
                        label="Inicio" 
                        icon="time-outline" 
                        value={startTime} 
                        onChangeText={setStartTime} 
                        placeholder="HH:MM" 
                      />
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
                      active={services.whiteboard} 
                      label="Pizarra" 
                      icon="brush-outline" 
                      onPress={() => setServices({...services, whiteboard: !services.whiteboard})} 
                    />
                    <ServiceToggle 
                      active={services.coffee} 
                      label="Estación Café" 
                      icon="cafe-outline" 
                      onPress={() => setServices({...services, coffee: !services.coffee})} 
                    />
                  </View>
                </Card>

                <TouchableOpacity 
                  style={[styles.mainBtn, (progress < 80) && { opacity: 0.5 }]} 
                  onPress={handleRegister}
                  disabled={loading || progress < 80}
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
            </ResponsiveContainer>
          </ScrollView>
        </View>
      </LinearGradient>

      <SuccessModal visible={showSuccess} room={selectedRoom.name} date={date} time={`${startTime} - ${endTime}`} onClose={() => { setShowSuccess(false); router.replace('/(tabs)'); }} />
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
  return (
    <View style={styles.mobHeader}>
      <Ionicons name="business" size={32} color={COLORS.primary} />
      <View>
        <Text style={styles.mobTitle}>Secretaría Jurídica</Text>
        <Text style={styles.mobSub}>Reserva de Salas</Text>
      </View>
    </View>
  );
}

function Hero({ progress }: { progress: number }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <View>
          <Text style={styles.heroTitle}>Nueva Reserva</Text>
          <Text style={styles.heroSub}>Optimice el uso de los espacios comunes</Text>
        </View>
        <View style={styles.pill}><Text style={styles.pillText}>Sede Central</Text></View>
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

function SuccessModal({ visible, onClose, room, date, time }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBlur}>
        <View style={[styles.modalPanel, { alignItems: 'center', padding: 40 }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={60} color={COLORS.white} />
          </View>
          <Text style={styles.modalTitle}>¡Reserva Confirmada!</Text>
          <View style={styles.confirmSummary}>
            <Text style={styles.confirmText}><Text style={{fontWeight:'800'}}>Sala:</Text> {room}</Text>
            <Text style={styles.confirmText}><Text style={{fontWeight:'800'}}>Fecha:</Text> {date}</Text>
            <Text style={styles.confirmText}><Text style={{fontWeight:'800'}}>Hora:</Text> {time}</Text>
          </View>
          <TouchableOpacity style={[styles.modalBtn, { width: '100%', marginTop: 20 }]} onPress={onClose}>
            <Text style={styles.modalBtnText}>LISTO</Text>
          </TouchableOpacity>
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
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
});
