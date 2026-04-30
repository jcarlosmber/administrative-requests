import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Dimensions, Modal, ImageBackground, Animated } from 'react-native';
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
  primary: '#E63946',
  primaryDark: '#B91C1C',
  primaryLight: '#D4422F',
  accent: '#FACC15',
  soft: '#FFF1F2',
  bg: '#F8FAFC',
  card: 'rgba(255, 255, 255, 0.85)',
  text: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  success: '#10B981',
  white: '#FFFFFF'
};

interface Visitor {
  id: string;
  name: string;
  document: string;
}

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
}

export default function VisitorsScreen() {
  const router = useRouter();
  
  // Form State
  const [visitors, setVisitors] = useState<Visitor[]>([{ id: '1', name: '', document: '' }]);
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([{ id: '1', plate: '', brand: '' }]);
  const [responsible, setResponsible] = useState({ name: '', phone: '', dependency: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // UI State
  const [showPolicy, setShowPolicy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [loading, setLoading] = useState(false);

  const progress = useMemo(() => {
    let p = 10;
    const vFull = visitors.every(v => v.name && v.document);
    if (vFull) p += 30;
    if (responsible.name && responsible.phone) p += 30;
    if (acceptedTerms) p += 30;
    return Math.min(p, 100);
  }, [visitors, responsible, acceptedTerms]);

  const addVisitor = () => setVisitors([...visitors, { id: Math.random().toString(), name: '', document: '' }]);
  const updateVisitor = (id: string, field: keyof Visitor, val: string) => {
    setVisitors(visitors.map(v => v.id === id ? { ...v, [field]: val } : v));
  };
  const removeVisitor = (id: string) => visitors.length > 1 && setVisitors(visitors.filter(v => v.id !== id));

  const addVehicle = () => setVehicles([...vehicles, { id: Math.random().toString(), plate: '', brand: '' }]);
  const updateVehicle = (id: string, field: keyof Vehicle, val: string) => {
    setVehicles(vehicles.map(v => v.id === id ? { ...v, [field]: val.toUpperCase() } : v));
  };
  const removeVehicle = (id: string) => vehicles.length > 1 && setVehicles(vehicles.filter(v => v.id !== id));

  const handleRegister = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const visitorNames = visitors.map(v => v.name).join(', ');
      
      await requestService.create({
        user_id: user?.id || null,
        title: `Ingreso: ${visitorNames}`,
        description: `Visita para ${responsible.name} en ${responsible.dependency}`,
        category: 'visitors',
        priority: 'media',
        metadata: {
          visitors: visitors.map(v => ({ name: v.name, document: v.document })),
          hasVehicle,
          vehicles: hasVehicle ? vehicles.map(vh => ({ plate: vh.plate, brand: vh.brand })) : [],
          responsible
        }
      });

      setLoading(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al registrar visitantes:', error);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: 'Ingreso de Visitantes' }} />
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
                <Card title="Información de Visitantes" icon="people">
                  {visitors.map((v, i) => (
                    <View key={v.id} style={[styles.itemBox, i > 0 && styles.itemDivider]}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemTag}>VISITANTE #{i + 1}</Text>
                        {i > 0 && (
                          <TouchableOpacity onPress={() => removeVisitor(v.id)}>
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Field 
                        label="Nombre Completo" 
                        icon="person-outline" 
                        value={v.name} 
                        onChangeText={(txt: string) => updateVisitor(v.id, 'name', txt)} 
                        placeholder="Ej. Juan Pérez" 
                      />
                      <Field 
                        label="Documento" 
                        icon="card-outline" 
                        value={v.document} 
                        onChangeText={(txt: string) => updateVisitor(v.id, 'document', txt)} 
                        placeholder="CC / CE / TI" 
                      />
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addBtn} onPress={addVisitor}>
                    <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.addBtnText}>Agregar otro visitante</Text>
                  </TouchableOpacity>
                </Card>

                <Card 
                  title="Acceso Vehicular" 
                  icon="car" 
                  right={
                    <Switch 
                      value={hasVehicle} 
                      onValueChange={setHasVehicle} 
                      trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                    />
                  }
                >
                  {hasVehicle && (
                    <View style={{ gap: 12 }}>
                      {vehicles.map((vh, i) => (
                        <View key={vh.id} style={[styles.itemBox, i > 0 && styles.itemDivider]}>
                          <View style={styles.itemHeader}>
                            <Text style={styles.itemTag}>VEHÍCULO #{i + 1}</Text>
                            {i > 0 && (
                              <TouchableOpacity onPress={() => removeVehicle(vh.id)}>
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Field 
                                label="Placa" 
                                value={vh.plate} 
                                onChangeText={(txt: string) => updateVehicle(vh.id, 'plate', txt)} 
                                placeholder="ABC123"
                                maxLength={6}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Field 
                                label="Marca" 
                                value={vh.brand} 
                                onChangeText={(txt: string) => updateVehicle(vh.id, 'brand', txt)} 
                                placeholder="Ej. Mazda"
                              />
                            </View>
                          </View>
                        </View>
                      ))}
                      <TouchableOpacity style={styles.addBtn} onPress={addVehicle}>
                        <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                        <Text style={styles.addBtnText}>Agregar otro vehículo</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>

                <Card title="Funcionario Responsable" icon="business">
                  <Field 
                    label="Nombre del Funcionario" 
                    icon="briefcase-outline" 
                    value={responsible.name} 
                    onChangeText={(txt: string) => setResponsible({ ...responsible, name: txt })} 
                    placeholder="Persona que autoriza" 
                  />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Dependencia</Text>
                      <TouchableOpacity 
                        style={styles.inputWrap} 
                        onPress={() => setShowDeps(true)}
                      >
                        <Ionicons name="business-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <Text 
                          style={[styles.input, !responsible.dependency && { color: '#94A3B8' }]} 
                          numberOfLines={1}
                        >
                          {responsible.dependency || "Seleccionar"}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field 
                        label="Teléfono / Ext" 
                        icon="call-outline" 
                        value={responsible.phone} 
                        onChangeText={(txt: string) => setResponsible({ ...responsible, phone: txt })} 
                        placeholder="Ej. 1234"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                </Card>

                <TouchableOpacity 
                  style={styles.termsBox} 
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxOn]}>
                    {acceptedTerms && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                  </View>
                  <Text style={styles.termsText}>
                    Autorizo el tratamiento de datos según la <Text style={{ color: COLORS.primary, fontWeight: '700' }} onPress={() => setShowPolicy(true)}>Ley 1581 de 2012</Text>.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.mainBtn, (!acceptedTerms || progress < 40) && { opacity: 0.5 }]} 
                  onPress={handleRegister}
                  disabled={!acceptedTerms || loading}
                >
                  <LinearGradient 
                    colors={[COLORS.primary, COLORS.primaryDark]} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 0 }} 
                    style={styles.btnGradient}
                  >
                    <Text style={styles.btnText}>{loading ? 'PROCESANDO...' : 'REGISTRAR INGRESO'}</Text>
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ResponsiveContainer>
          </ScrollView>
        </View>
      </LinearGradient>

      <PolicyModal visible={showPolicy} onClose={() => setShowPolicy(false)} />
      <SuccessModal visible={showSuccess} onClose={() => { setShowSuccess(false); router.replace('/(tabs)'); }} />
      
      <DependencySelector 
        visible={showDeps} 
        onClose={() => setShowDeps(false)} 
        onSelect={(val: string) => setResponsible({ ...responsible, dependency: val })} 
        selectedValue={responsible.dependency}
      />
    </SafeAreaView>
  );
}

function Sidebar() {
  return (
    <View style={styles.sidebar}>
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1590487988256-9ed24133863e?q=80&w=1000&auto=format&fit=crop' }} 
        style={styles.sideBg}
      >
        <LinearGradient colors={['rgba(230, 57, 70, 0.9)', 'rgba(185, 28, 28, 0.95)']} style={StyleSheet.absoluteFill} />
        <View style={styles.sideContent}>
          <View style={styles.logoRing}>
            <Ionicons name="shield-checkmark" size={54} color={COLORS.white} />
          </View>
          <Text style={styles.sideTitle}>Registro de Visitantes</Text>
          <Text style={styles.sideSub}>Secretaría Jurídica Distrital</Text>
          <View style={styles.sideDivider} />
          <Text style={styles.sideDesc}>
            Sistema centralizado para el control y seguridad de las instalaciones institucionales.
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
      <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
      <View>
        <Text style={styles.mobTitle}>Secretaría Jurídica</Text>
        <Text style={styles.mobSub}>Control de Acceso</Text>
      </View>
    </View>
  );
}

function Hero({ progress }: { progress: number }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <View>
          <Text style={styles.heroTitle}>Nuevo Ingreso</Text>
          <Text style={styles.heroSub}>Complete la información requerida</Text>
        </View>
        <View style={styles.pill}><Text style={styles.pillText}>Seguro</Text></View>
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

function PolicyModal({ visible, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBlur}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={styles.modalPanel}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Política de Privacidad</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            <Text style={styles.modalText}>
              En cumplimiento de la Ley 1581 de 2012, informamos que los datos capturados serán utilizados únicamente para fines de seguridad y control de acceso. Usted puede ejercer sus derechos de consulta y reclamo a través de nuestros canales oficiales.
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
            <Text style={styles.modalBtnText}>CERRAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SuccessModal({ visible, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBlur}>
        <View style={[styles.modalPanel, { alignItems: 'center', padding: 40 }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={60} color={COLORS.white} />
          </View>
          <Text style={styles.modalTitle}>¡Registro Completado!</Text>
          <Text style={[styles.modalText, { textAlign: 'center', marginTop: 10 }]}>
            El ingreso ha sido registrado. Por favor, espere las indicaciones del personal de seguridad.
          </Text>
          <TouchableOpacity style={[styles.modalBtn, { width: '100%', marginTop: 20 }]} onPress={onClose}>
            <Text style={styles.modalBtnText}>ENTENDIDO</Text>
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
  
  itemBox: { marginBottom: 15 },
  itemDivider: { paddingTop: 15, borderTopWidth: 1, borderTopColor: COLORS.line },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  itemTag: { fontSize: 11, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5 },
  
  field: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.muted, marginBottom: 8, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 16, paddingHorizontal: 15, height: 54 },
  input: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  addBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  
  termsBox: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, marginBottom: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  termsText: { flex: 1, fontSize: 14, color: COLORS.muted, lineHeight: 20 },
  
  mainBtn: { height: 64, borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  btnText: { color: COLORS.white, fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  
  modalBlur: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalPanel: { backgroundColor: COLORS.white, borderRadius: 30, width: '100%', maxWidth: 500, padding: 25, shadowOpacity: 0.2, shadowRadius: 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  modalText: { fontSize: 15, color: COLORS.muted, lineHeight: 24 },
  modalBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  modalBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
});
