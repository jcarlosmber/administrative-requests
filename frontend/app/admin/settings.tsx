import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  useWindowDimensions, 
  Platform,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
};

const INITIAL_ROOMS = [
  { id: '1', name: 'Sala Innovación', capacity: '12', floor: 'Piso 2' },
  { id: '2', name: 'Sala de Juntas B', capacity: '8', floor: 'Piso 1' },
  { id: '3', name: 'Focus Room 4', capacity: '2', floor: 'Piso 3' },
  { id: '4', name: 'Auditorio Principal', capacity: '50', floor: 'PB' },
];

export default function AdminSettings() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [notifications, setNotifications] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);

  const updateRoom = (id: string, field: string, val: string) => {
    setRooms(rooms.map(r => r.id === id ? { ...r, [field]: val } : r));
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
          
          <View style={styles.contentPadding}>
            
            <SectionHeader title="Gestión de Espacios" kicker="INFRAESTRUCTURA" />
            <View style={styles.cardList}>
              {rooms.map(room => (
                <View key={room.id} style={styles.settingsCard}>
                  <View style={styles.roomIconBox}>
                    <Ionicons name="business" size={24} color={COLORS.accent} />
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
                        <Ionicons name="people-outline" size={12} color={COLORS.muted} />
                        <TextInput
                          style={styles.miniInput}
                          value={room.capacity}
                          onChangeText={(val) => updateRoom(room.id, 'capacity', val)}
                          keyboardType="numeric"
                        />
                        <Text style={styles.miniLabel}>cap.</Text>
                      </View>
                      <View style={styles.miniField}>
                        <Ionicons name="layers-outline" size={12} color={COLORS.muted} />
                        <TextInput
                          style={styles.miniInput}
                          value={room.floor}
                          onChangeText={(val) => updateRoom(room.id, 'floor', val)}
                        />
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.muted} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addBtn}>
                <Ionicons name="add-circle" size={20} color={COLORS.accent} />
                <Text style={styles.addBtnText}>Añadir nuevo espacio</Text>
              </TouchableOpacity>
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

            <TouchableOpacity style={styles.saveBtn}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primarySoft]}
                style={styles.saveGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.saveText}>GUARDAR CAMBIOS</Text>
                <Ionicons name="save-outline" size={20} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>
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
        <div style={{ width: 40, height: 4, backgroundColor: COLORS.white, marginVertical: 25, borderRadius: 2 }} />
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

  cardList: { gap: 12 },
  settingsCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 15, borderWidth: 1, borderColor: COLORS.line },
  roomIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: `${COLORS.accent}15`, justifyContent: 'center', alignItems: 'center' },
  roomNameInput: { fontSize: 16, fontWeight: '800', color: COLORS.primary, padding: 0 },
  roomMetaRow: { flexDirection: 'row', gap: 15, marginTop: 5 },
  miniField: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniInput: { fontSize: 12, fontWeight: '700', color: COLORS.muted, padding: 0, minWidth: 20 },
  miniLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  deleteBtn: { padding: 8 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 15, borderRadius: 18, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.line, marginTop: 10 },
  addBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.accent },

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
  saveText: { color: COLORS.white, fontSize: 16, fontWeight: '900', letterSpacing: 1 }
});
