import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Dimensions, Modal, ImageBackground, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { DependencySelector } from '../../components/DependencySelector';
import { TimePickerModal } from '../../components/TimePickerModal';
import { requestService } from '../../lib/requestService';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const COLORS = {
  primary: '#0077B6', // Deep Ocean Blue
  primaryDark: '#023E8A',
  primaryLight: '#ADE8F4',
  accent: '#FACC15',
  soft: '#CAF0F8',
  bg: '#F8FAFC',
  card: 'rgba(255, 255, 255, 0.85)',
  text: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  success: '#10B981',
  white: '#FFFFFF'
};

export default function TransportRequestScreen() {
  const router = useRouter();
  
  // Form State
  const [dependency, setDependency] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [pickupTime, setPickupTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [requiresReturn, setRequiresReturn] = useState(false);
  const [reason, setReason] = useState('');

  // Efecto para auto-completar dependencia desde LDAP
  useEffect(() => {
    const fetchUserLdapData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.dependency) {
          setDependency(user.dependency);
        }
      } catch (err) {
        console.error('Error fetching user for transport prefill:', err);
      }
    };
    fetchUserLdapData();
  }, []);

  
  // UI State
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'pickup' | 'return'>('pickup');
  const [errorMessage, setErrorMessage] = useState('');

  const progress = useMemo(() => {
    let p = 10;
    if (dependency) p += 15;
    if (origin && destination) p += 25;
    if (pickupTime) p += 15;
    if (reason) p += 25;
    if (requiresReturn && returnTime) p += 10;
    else if (!requiresReturn) p += 10;
    return Math.min(p, 100);
  }, [dependency, origin, destination, pickupTime, reason, requiresReturn, returnTime]);

  const handleRegister = async () => {
    try {
      setErrorMessage('');
      const trimmedDependency = dependency.trim();
      const trimmedOrigin = origin.trim();
      const trimmedDestination = destination.trim();
      const trimmedReason = reason.trim();
      const passengerCount = parseInt(passengers, 10) || 1;

      if (!trimmedDependency || !trimmedOrigin || !trimmedDestination || !pickupTime || !trimmedReason) {
        setErrorMessage('Completa la dependencia, origen, destino, hora de recogida y motivo de la solicitud.');
        return;
      }

      if (requiresReturn && !returnTime) {
        setErrorMessage('Indica la hora estimada de regreso cuando el traslado lo requiera.');
        return;
      }

      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      await requestService.create({
        user_id: user?.id || null,
        title: `Transporte: ${trimmedOrigin} -> ${trimmedDestination}`,
        description: `Traslado para ${passengerCount} personas. Motivo: ${trimmedReason}`,
        category: 'transport',
        priority: 'media',
        metadata: {
          dependency: trimmedDependency,
          origin: trimmedOrigin,
          destination: trimmedDestination,
          passengers: passengerCount.toString(),
          pickupTime,
          requiresReturn,
          returnTime,
          reason: trimmedReason
        }
      });

      setLoading(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al solicitar transporte:', error);
      setLoading(false);
      setErrorMessage('No pudimos enviar la solicitud de transporte. Intenta nuevamente.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: 'Solicitud de Transporte' }} />
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
                <Card title="Información del Solicitante" icon="person">
                  <View style={styles.field}>
                    <Text style={styles.label}>Dependencia / Área</Text>
                    <TouchableOpacity 
                      style={styles.inputWrap} 
                      onPress={() => setShowDeps(true)}
                    >
                      <Ionicons name="business-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                      <Text style={[styles.input, !dependency && { color: '#94A3B8' }]}>
                        {dependency || "Seleccionar dependencia"}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Número de Pasajeros</Text>
                    <View style={[styles.inputWrap, { justifyContent: 'space-between', alignItems: 'center' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="people-outline" size={18} color={COLORS.muted} />
                        <Text style={styles.input}>
                          {passengers} {parseInt(passengers, 10) === 1 ? 'pasajero' : 'pasajeros'}
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity 
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: COLORS.bg,
                            borderWidth: 1.5,
                            borderColor: COLORS.line,
                            justifyContent: 'center',
                            alignItems: 'center',
                            opacity: parseInt(passengers, 10) <= 1 ? 0.4 : 1
                          }}
                          disabled={parseInt(passengers, 10) <= 1}
                          onPress={() => {
                            const current = parseInt(passengers, 10) || 1;
                            if (current > 1) {
                              setPassengers((current - 1).toString());
                            }
                          }}
                        >
                          <Ionicons name="remove" size={18} color={COLORS.text} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: COLORS.bg,
                            borderWidth: 1.5,
                            borderColor: COLORS.line,
                            justifyContent: 'center',
                            alignItems: 'center',
                            opacity: parseInt(passengers, 10) >= 4 ? 0.4 : 1
                          }}
                          disabled={parseInt(passengers, 10) >= 4}
                          onPress={() => {
                            const current = parseInt(passengers, 10) || 1;
                            if (current < 4) {
                              setPassengers((current + 1).toString());
                            }
                          }}
                        >
                          <Ionicons name="add" size={18} color={COLORS.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 6, marginLeft: 4 }}>
                      * Capacidad máxima permitida por vehículo oficial: 4 personas.
                    </Text>
                  </View>
                </Card>

                <Card title="Detalles del Trayecto" icon="map">
                  <Field 
                    label="Punto de Origen" 
                    icon="location-outline" 
                    value={origin} 
                    onChangeText={setOrigin} 
                    placeholder="Dirección o punto de partida" 
                  />
                  <Field 
                    label="Punto de Destino" 
                    icon="navigate-outline" 
                    value={destination} 
                    onChangeText={setDestination} 
                    placeholder="Dirección o punto de llegada" 
                  />
                  
                  <View style={{ flexDirection: 'row', gap: 15 }}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.field}>
                        <Text style={styles.label}>Hora de Recogida</Text>
                        <TouchableOpacity 
                          style={styles.inputWrap} 
                          onPress={() => {
                            setTimePickerTarget('pickup');
                            setShowTimePicker(true);
                          }}
                        >
                          <Ionicons name="time-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                          <Text style={[styles.input, !pickupTime && { color: '#94A3B8' }]}>
                            {pickupTime || "Seleccionar"}
                          </Text>
                          <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.field}>
                        <Text style={styles.label}>¿Requiere Regreso?</Text>
                        <View style={[styles.inputWrap, { justifyContent: 'space-between' }]}>
                          <Text style={[styles.input, { color: requiresReturn ? COLORS.primary : COLORS.muted }]}>
                            {requiresReturn ? 'SÍ' : 'NO'}
                          </Text>
                          <Switch 
                            value={requiresReturn} 
                            onValueChange={setRequiresReturn}
                            trackColor={{ false: COLORS.line, true: COLORS.primary }}
                            thumbColor={COLORS.white}
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  {requiresReturn && (
                    <View style={styles.field}>
                      <Text style={styles.label}>Hora de Regreso Estimada</Text>
                      <TouchableOpacity 
                        style={styles.inputWrap} 
                        onPress={() => {
                          setTimePickerTarget('return');
                          setShowTimePicker(true);
                        }}
                      >
                        <Ionicons name="hourglass-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <Text style={[styles.input, !returnTime && { color: '#94A3B8' }]}>
                          {returnTime || "Seleccionar hora"}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>

                <Card title="Justificación de la Solicitud" icon="document-text">
                  <Field 
                    label="Motivo del Traslado" 
                    icon="create-outline" 
                    value={reason} 
                    onChangeText={setReason} 
                    placeholder="Escriba detalladamente el motivo de su solicitud, objetivos de la misión y cualquier observación relevante..." 
                    multiline
                    numberOfLines={6}
                  />
                </Card>

                <Card title="Vehículo Asignado" icon="car">
                  <View style={styles.vehicleInfoBox}>
                    <View style={styles.vehicleIcon}>
                      <Ionicons name="car-sport" size={32} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vehicleName}>Nissan Kicks (Flota Estándar)</Text>
                      <Text style={styles.vehicleStatus}>DISPONIBLE PARA ASIGNACIÓN</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  </View>
                </Card>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity 
                  style={[styles.mainBtn, (progress < 60) && { opacity: 0.5 }]} 
                  onPress={handleRegister}
                  disabled={loading || progress < 60}
                >
                  <LinearGradient 
                    colors={[COLORS.primary, COLORS.primaryDark]} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 0 }} 
                    style={styles.btnGradient}
                  >
                    <Text style={styles.btnText}>{loading ? 'Procesando...' : 'Solicitar Transporte'}</Text>
                    <Ionicons name="send" size={20} color={COLORS.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ResponsiveContainer>
          </ScrollView>
        </View>
      </LinearGradient>

      <SuccessModal 
        visible={showSuccess} 
        origin={origin}
        destination={destination}
        time={pickupTime}
        passengers={passengers}
        onClose={() => { setShowSuccess(false); router.replace('/(tabs)'); }} 
      />
      
      <DependencySelector 
        visible={showDeps} 
        onClose={() => setShowDeps(false)} 
        onSelect={setDependency} 
        selectedValue={dependency}
      />

      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelect={(time) => {
          if (timePickerTarget === 'pickup') {
            setPickupTime(time);
          } else {
            setReturnTime(time);
          }
        }}
        selectedValue={timePickerTarget === 'pickup' ? pickupTime : returnTime}
        title={timePickerTarget === 'pickup' ? 'Hora de Recogida' : 'Hora de Regreso Estimada'}
      />
    </SafeAreaView>
  );
}

function Sidebar() {
  return (
    <View style={styles.sidebar}>
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1594819047050-99defca82545?q=80&w=1000&auto=format&fit=crop' }} 
        style={styles.sideBg}
      >
        <LinearGradient colors={['rgba(0, 119, 182, 0.9)', 'rgba(2, 62, 138, 0.95)']} style={StyleSheet.absoluteFill} />
        <View style={styles.sideContent}>
          <View style={styles.logoRing}>
            <Ionicons name="car-sport" size={54} color={COLORS.white} />
          </View>
          <Text style={styles.sideTitle}>Servicios de Transporte</Text>
          <Text style={styles.sideSub}>Secretaría Jurídica Distrital</Text>
          <View style={styles.sideDivider} />
          <Text style={styles.sideDesc}>
            Gestión eficiente de traslados institucionales para el cumplimiento de las funciones misionales de la entidad.
          </Text>
          <View style={styles.sideBadge}>
            <Text style={styles.badgeText}>SISTEMA DE FLOTA</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

function MobileHeader() {
  return (
    <View style={styles.mobHeader}>
      <Ionicons name="car-sport" size={32} color={COLORS.primary} />
      <View>
        <Text style={styles.mobTitle}>Secretaría Jurídica</Text>
        <Text style={styles.mobSub}>Solicitud de Transporte</Text>
      </View>
    </View>
  );
}

function Hero({ progress }: { progress: number }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <View>
          <Text style={styles.heroTitle}>Nuevo Traslado</Text>
          <Text style={styles.heroSub}>Programe su servicio con anticipación</Text>
        </View>
        <View style={styles.pill}><Text style={styles.pillText}>Flota Oficial</Text></View>
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

function Field({ label, icon, multiline, ...props }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[
        styles.inputWrap, 
        multiline && { height: 'auto', minHeight: 120, alignItems: 'flex-start', paddingTop: 15 }
      ]}>
        {icon && <Ionicons name={icon} size={18} color={COLORS.muted} style={{ marginRight: 10, marginTop: Platform.OS === 'web' ? 2 : 0 }} />}
        <TextInput 
          placeholderTextColor="#94A3B8" 
          style={[styles.input, multiline && { height: 120, textAlignVertical: 'top' }]} 
          multiline={multiline}
          {...props} 
        />
      </View>
    </View>
  );
}

function SuccessModal({ visible, onClose, origin, destination, time, passengers }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBlur}>
        <View style={[styles.modalPanel, { alignItems: 'center', padding: 35 }]}>
          <View style={[styles.successIcon, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="time" size={60} color={COLORS.white} />
          </View>
          <Text style={styles.modalTitle}>¡Solicitud Registrada!</Text>
          <Text style={{ 
            fontSize: 13, 
            color: COLORS.muted, 
            textAlign: 'center', 
            marginTop: 8, 
            marginBottom: 20, 
            lineHeight: 18,
            paddingHorizontal: 10
          }}>
            Su solicitud de traslado ha quedado registrada y se encuentra pendiente de aprobación. Recibirá una notificación con los datos del vehículo y conductor asignado una vez sea autorizada.
          </Text>
          
          <View style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.02)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, gap: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 16, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Ruta:</Text> {origin} ➔ {destination}</Text>
            <Text style={{ fontSize: 16, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Hora:</Text> {time}</Text>
            <Text style={{ fontSize: 16, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Cupos:</Text> {passengers} {passengers === '1' ? 'Persona' : 'Personas'}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#F59E0B', textTransform: 'uppercase' }}>
                Pendiente de Aprobación
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={[styles.modalBtn, { width: '100%', marginTop: 25 }]} onPress={onClose}>
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
  
  vehicleInfoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 20, gap: 15, borderWidth: 1, borderColor: COLORS.line },
  vehicleIcon: { width: 60, height: 60, borderRadius: 15, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.05, shadowRadius: 5 },
  vehicleName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  vehicleStatus: { fontSize: 10, fontWeight: '900', color: COLORS.primary, letterSpacing: 1, marginTop: 4 },
  
  field: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.muted, marginBottom: 8, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 16, paddingHorizontal: 15, height: 54 },
  input: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  
  mainBtn: { height: 64, borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  btnText: { color: COLORS.white, fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8 },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '700', flex: 1 },
  
  modalBlur: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalPanel: { backgroundColor: COLORS.white, borderRadius: 30, width: '100%', maxWidth: 500, padding: 25, shadowOpacity: 0.2, shadowRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  modalText: { fontSize: 15, color: COLORS.muted, lineHeight: 24 },
  modalBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  modalBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
});
