import React, { useMemo, useState, useEffect } from 'react';
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

  // Efecto para auto-completar responsable desde LDAP
  useEffect(() => {
    const fetchUserLdapData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setResponsible({
            name: user.name || '',
            phone: '',
            dependency: user.dependency || ''
          });
        }
      } catch (err) {
        console.error('Error fetching user for visitors prefill:', err);
      }
    };
    fetchUserLdapData();
  }, []);

  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // DatePicker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalTarget, setModalTarget] = useState<'from' | 'to'>('from');
  
  // UI State
  const [showPolicy, setShowPolicy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      setErrorMessage('');

      const validVisitors = visitors.map(v => ({
        name: v.name.trim(),
        document: v.document.trim()
      }));
      const trimmedResponsibleName = responsible.name.trim();
      const trimmedResponsiblePhone = responsible.phone.trim();
      const trimmedResponsibleDependency = responsible.dependency.trim();

      if (!validVisitors.every(v => v.name && v.document)) {
        setErrorMessage('Todos los visitantes deben tener nombre y documento completos.');
        return;
      }

      if (!trimmedResponsibleName || !trimmedResponsiblePhone || !trimmedResponsibleDependency) {
        setErrorMessage('Completa los datos del funcionario responsable antes de continuar.');
        return;
      }

      if (new Date(toDate) <= new Date(fromDate)) {
        setErrorMessage('La fecha final debe ser posterior a la fecha inicial.');
        return;
      }

      if (!acceptedTerms) {
        setErrorMessage('Debes aceptar la autorización de tratamiento de datos para continuar.');
        return;
      }

      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const visitorNames = validVisitors.map(v => v.name).join(', ');
      
      await requestService.create({
        user_id: user?.id || null,
        title: `Ingreso: ${visitorNames}`,
        description: `Visita para ${trimmedResponsibleName} en ${trimmedResponsibleDependency} desde ${fromDate} hasta ${toDate}`,
        category: 'visitors',
        priority: 'media',
        metadata: {
          visitors: validVisitors,
          hasVehicle,
          vehicles: hasVehicle ? vehicles.map(vh => ({ plate: vh.plate.trim().toUpperCase(), brand: vh.brand.trim() })) : [],
          responsible: {
            name: trimmedResponsibleName,
            phone: trimmedResponsiblePhone,
            dependency: trimmedResponsibleDependency
          },
          fromDate,
          toDate
        }
      });

      setLoading(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al registrar visitantes:', error);
      setLoading(false);
      setErrorMessage('No pudimos registrar el ingreso de visitantes. Intenta nuevamente.');
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
                      <View style={{ 
                        flexDirection: 'row', 
                        gap: 12, 
                        backgroundColor: '#FFFBEB', 
                        padding: 15, 
                        borderRadius: 18, 
                        borderLeftWidth: 4, 
                        borderLeftColor: '#F59E0B',
                        marginBottom: 5
                      }}>
                        <Ionicons name="information-circle" size={22} color="#D97706" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, color: '#B45309', lineHeight: 18, fontWeight: '800' }}>
                            Nota de parqueadero para visitantes:
                          </Text>
                          <Text style={{ fontSize: 12, color: '#B45309', lineHeight: 17, marginTop: 4, fontWeight: '600' }}>
                            La Secretaría Jurídica no cuenta con espacios para visitantes, no obstante, de presentarse espacios, es viable autorizar el ingreso. El conductor deberá acatar las normas que apliquen (conducir a velocidad máxima de 10 Km/h, apagar el vehículo al ingresar, y retirar el casco en motos).
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          backgroundColor: '#FFF7ED',
                          padding: 12,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: 'rgba(244, 162, 97, 0.3)',
                          marginBottom: 8
                        }}
                        onPress={() => setShowGuidelines(true)}
                      >
                        <Ionicons name="book-outline" size={16} color="#D97706" />
                        <Text style={{ color: '#D97706', fontWeight: '800', fontSize: 13 }}>
                          VER LINEAMIENTOS COMPLETOS DE PARQUEADERO
                        </Text>
                      </TouchableOpacity>
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

                <Card title="Vigencia del Ingreso" icon="calendar">
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Desde (Fecha)</Text>
                      <TouchableOpacity 
                        style={styles.inputWrap} 
                        onPress={() => {
                          setModalTarget('from');
                          setShowDatePicker(true);
                        }}
                      >
                        <Ionicons name="calendar-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <Text style={styles.input}>{fromDate}</Text>
                        <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Hasta (Fecha)</Text>
                      <TouchableOpacity 
                        style={styles.inputWrap} 
                        onPress={() => {
                          setModalTarget('to');
                          setShowDatePicker(true);
                        }}
                      >
                        <Ionicons name="calendar-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <Text style={styles.input}>{toDate}</Text>
                        <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
                      </TouchableOpacity>
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

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

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
                    <Text style={styles.btnText}>{loading ? 'Procesando...' : 'Registrar Ingreso'}</Text>
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ResponsiveContainer>
          </ScrollView>
        </View>
      </LinearGradient>

      <PolicyModal visible={showPolicy} onClose={() => setShowPolicy(false)} />
      <SuccessModal 
        visible={showSuccess} 
        visitors={visitors.filter(v => v.name)}
        hasVehicle={hasVehicle}
        vehicles={hasVehicle ? vehicles.filter(vh => vh.plate) : []}
        responsible={responsible}
        fromDate={fromDate}
        toDate={toDate}
        onClose={() => { setShowSuccess(false); router.replace('/(tabs)'); }} 
      />
      
      <GuidelinesModal 
        visible={showGuidelines} 
        onClose={() => setShowGuidelines(false)} 
      />
      
      <DependencySelector 
        visible={showDeps} 
        onClose={() => setShowDeps(false)} 
        onSelect={(val: string) => setResponsible({ ...responsible, dependency: val })} 
        selectedValue={responsible.dependency}
      />
      
      <DateTimePickerModal 
        visible={showDatePicker} 
        onClose={() => setShowDatePicker(false)} 
        title={modalTarget === 'from' ? 'Vigencia: Desde' : 'Vigencia: Hasta'}
        value={modalTarget === 'from' ? fromDate : toDate}
        onSelect={(val: string) => {
          if (modalTarget === 'from') {
            setFromDate(val);
          } else {
            setToDate(val);
          }
          setShowDatePicker(false);
        }}
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
            <Text style={styles.badgeText}>BOGOTÁ MI CIUDAD MI CASA</Text>
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

function SuccessModal({ 
  visible, 
  onClose, 
  visitors, 
  hasVehicle, 
  vehicles, 
  responsible, 
  fromDate, 
  toDate 
}: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBlur}>
        <View style={[styles.modalPanel, { alignItems: 'center', padding: 25, maxWidth: 450 }]}>
          <View style={[styles.successIcon, { backgroundColor: '#F59E0B', marginBottom: 12 }]}>
            <Ionicons name="time" size={50} color={COLORS.white} />
          </View>
          <Text style={[styles.modalTitle, { fontSize: 20, marginBottom: 5 }]}>¡Solicitud Registrada!</Text>
          <Text style={{ 
            fontSize: 12, 
            color: COLORS.muted, 
            textAlign: 'center', 
            marginBottom: 15, 
            lineHeight: 16,
            paddingHorizontal: 5
          }}>
            La solicitud de acceso ha quedado registrada. Se encuentra pendiente de validación por parte del funcionario anfitrión o recepción.
          </Text>
          
          <ScrollView 
            style={{ width: '100%', maxHeight: 280, marginBottom: 10 }} 
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: '100%', padding: 18, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: COLORS.line, gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.8, borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingBottom: 6 }}>
                RESUMEN DE INGRESO
              </Text>
              
              {/* Bloque de Vigencia */}
              <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Desde:</Text> {fromDate}</Text>
              <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Hasta:</Text> {toDate}</Text>
              
              <View style={{ height: 1, backgroundColor: COLORS.line, marginVertical: 4 }} />
              
              {/* Bloque de Anfitrión */}
              <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Anfitrión:</Text> {responsible.name}</Text>
              <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Dependencia:</Text> {responsible.dependency}</Text>
              <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Contacto / Ext:</Text> {responsible.phone || 'N/A'}</Text>
              
              <View style={{ height: 1, backgroundColor: COLORS.line, marginVertical: 4 }} />
              
              {/* Bloque de Visitantes Desglosados */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.muted }}>VISITANTE(S) REGISTRADO(S):</Text>
              {visitors && visitors.map((v: any, index: number) => (
                <View key={v.id || index} style={{ flexDirection: 'row', gap: 6, paddingLeft: 4 }}>
                  <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: '800' }}>•</Text>
                  <Text style={{ fontSize: 14, color: COLORS.text, flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>{v.name}</Text> (Doc: {v.document || 'N/A'})
                  </Text>
                </View>
              ))}
              
              {/* Bloque de Acceso Vehicular */}
              {hasVehicle && vehicles && vehicles.length > 0 && (
                <>
                  <View style={{ height: 1, backgroundColor: COLORS.line, marginVertical: 4 }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.muted }}>ACCESO VEHICULAR:</Text>
                  {vehicles.map((vh: any, index: number) => (
                    <View key={vh.id || index} style={{ flexDirection: 'row', gap: 6, paddingLeft: 4 }}>
                      <Ionicons name="car-sport-outline" size={14} color={COLORS.muted} style={{ marginTop: 2 }} />
                      <Text style={{ fontSize: 14, color: COLORS.text, flex: 1 }}>
                        Placa: <Text style={{ fontWeight: '800', color: COLORS.text }}>{vh.plate}</Text> ({vh.brand || 'N/A'})
                      </Text>
                    </View>
                  ))}
                </>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#F59E0B', textTransform: 'uppercase' }}>
                  Pendiente de Aprobación
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

function GuidelinesModal({ visible, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBlur}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={[styles.modalPanel, { maxWidth: 650, maxHeight: '85%', padding: 25 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="document-text" size={24} color={COLORS.primary} />
              <Text style={[styles.modalTitle, { fontSize: 18 }]}>Lineamientos de Parqueadero</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
            <View style={{ gap: 14 }}>
              <View style={{ backgroundColor: COLORS.soft, padding: 15, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: COLORS.primary, gap: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.text }}>Entidad:</Text>
                <Text style={{ fontSize: 13, color: COLORS.muted, fontWeight: '600' }}>BOGOTÁ, SECRETARÍA JURÍDICA DISTRITAL.</Text>
                
                <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 8 }}>Título:</Text>
                <Text style={{ fontSize: 13, color: COLORS.muted, fontWeight: '600', lineHeight: 18 }}>
                  Lineamientos para el uso de parqueadero de vehículos y motocicletas a servidores de la Secretaría Jurídica Distrital en la Manzana Liévano de la Alcaldía Mayor de Bogotá D.C.
                </Text>
              </View>

              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.primary, marginTop: 5 }}>ANTECEDENTES</Text>
              <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, fontWeight: '500' }}>
                • Mediante el Convenio Interadministrativo No. 095-2017 entre la Secretaría General y la Secretaría Jurídica Distrital (SJD), se dispuso el uso de los espacios físicos, incluyendo los parqueaderos. Inicialmente se asignaron 21 parqueaderos en la Manzana Liévano. Tras gestiones de la SJD, el total aumentó a treinta y un (31) parqueaderos para vehículos y trece (13) para motos. Esto permitió a la Dirección de Gestión Corporativa (DGC) modificar la modalidad de asignación a partir de junio de 2019.
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, fontWeight: '500' }}>
                • En concordancia con la Alcaldía Mayor de Bogotá D.C., los primeros jueves de cada mes no habrá servicio de parqueadero para vehículos y motos en la Manzana Liévano ni en el Archivo Distrital, por ser el día sin carro para los servidores públicos del distrito.
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, fontWeight: '500' }}>
                • El listado de cupos se realizó inicialmente mediante encuesta y luego por solicitudes personales vía correo de los servidores públicos de planta (Carrera, Libre Nombramiento y Provisionales).
              </Text>
              
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.primary, marginTop: 5 }}>NORMAS DE USO Y ACCESO</Text>
              
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>1.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    La Dirección de Gestión Corporativa mantendrá actualizado el listado de servidores autorizados. Este documento lo usa la vigilancia en portería para controlar el ingreso del vehículo o moto, el cual debe ser conducido únicamente por el servidor identificado con carnet de la Entidad, respetando el día de pico y placa del vehículo registrado.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>2.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    Al ingresar, la vigilancia entregará una ficha con el número de parqueadero asignado, la cual debe colocarse en un lugar visible en la parte delantera interior del vehículo o moto.
                  </Text>
                </View>

                <View style={{ backgroundColor: '#FFFBEB', padding: 12, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#F59E0B', marginLeft: 15 }}>
                  <Text style={{ fontSize: 12, color: '#B45309', fontWeight: '800', lineHeight: 17 }}>
                    NOTA: En caso de pérdida de la ficha, el usuario no podrá usar el parqueadero hasta realizar la reposición y el trámite correspondiente ante la DGC.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>5.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    Al ingresar, la vigilancia revisará el vehículo, el cual debe estar apagado. En el caso de las motos, la persona debe retirarse el casco para su identificación y usarlo de igual manera dentro del parqueadero.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>6.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    Los vehículos no pueden permanecer en el parqueadero de un día para otro, salvo por casos excepcionales y con previo conocimiento de la Dirección de Gestión Corporativa.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>7.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    El ingreso se hará exclusivamente con el carnet de la Entidad y los cupos se asignarán según el orden de llegada y ocupación.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>8.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    Si al llegar se encuentran agotados los cupos en la Manzana Liévano, los servidores podrán parquear en el parqueadero del Archivo Distrital.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>9.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    En el parqueadero de la Manzana Liévano no se cuenta con parqueaderos de visitantes.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>10.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    El servicio es exclusivo para los/as servidores/as de la SJD; no se permite la transferencia o asignación a un tercero.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>11.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    La asignación del cupo podrá suspenderse por situaciones de causa mayor, lo cual se comunicará oportunamente.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>12.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    El/la servidor/a debe dejar el vehículo en el lugar asignado respetando la señalización y con las máximas medidas de seguridad (carros: en posición de salida, cerrados, vidrios arriba, luces y radio apagados; motos: seguro de dirección y luces apagadas).
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>13.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    Se deben acatar las normas y señales de tránsito, como conducir a una velocidad máxima de 10 Km por hora.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>14.</Text>
                  <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1, fontWeight: '500' }}>
                    Ante incidentes por colisión o robo dentro de la Manzana Liévano, el afectado avisará al supervisor de la empresa de seguridad, registrando las pruebas para las reclamaciones. La Dirección de Gestión Corporativa de la SJD no se hace responsable de estos u otros incidentes.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
          
          <TouchableOpacity style={[styles.modalBtn, { marginTop: 20 }]} onPress={onClose}>
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
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8 },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '700', flex: 1 },
  
  modalBlur: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalPanel: { backgroundColor: COLORS.white, borderRadius: 30, width: '100%', maxWidth: 500, padding: 25, shadowOpacity: 0.2, shadowRadius: 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  modalText: { fontSize: 15, color: COLORS.muted, lineHeight: 24 },
  modalBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  modalBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
});

const getNext14Days = () => {
  const days = [];
  const locale = 'es-ES';
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString(locale, { weekday: 'short' });
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
  const days = useMemo(() => getNext14Days(), []);
  
  const [selectedDate, setSelectedDate] = useState(value || days[0].dateString);

  // Actualizar estados internos si cambia el value externo al abrir el modal
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
      <View style={styles.modalBlur}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={[styles.modalPanel, { maxWidth: 350, padding: 20 }]}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Indicador de Selección Actual */}
          <View style={{ backgroundColor: COLORS.soft, borderRadius: 16, padding: 12, marginBottom: 15, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '800', letterSpacing: 1 }}>SELECCIÓN ACTUAL</Text>
            <Text style={{ fontSize: 18, color: COLORS.text, fontWeight: '900', marginTop: 4 }}>
              {selectedDate}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', height: 260, gap: 10, marginBottom: 20 }}>
            {/* Columna Fecha */}
            <View style={{ flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#F1F5F9', padding: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: COLORS.muted }}>FECHA</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {days.map((d) => {
                  const isSelected = d.dateString === selectedDate;
                  return (
                    <TouchableOpacity 
                      key={d.dateString}
                      style={{ 
                        paddingVertical: 10, 
                        paddingHorizontal: 8, 
                        backgroundColor: isSelected ? COLORS.primary : 'transparent',
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(0,0,0,0.03)',
                        alignItems: 'center'
                      }}
                      onPress={() => setSelectedDate(d.dateString)}
                    >
                      <Text style={{ fontSize: 10, color: isSelected ? COLORS.accent : COLORS.muted, fontWeight: '800' }}>
                        {d.dayName}
                      </Text>
                      <Text style={{ fontSize: 14, color: isSelected ? COLORS.white : COLORS.text, fontWeight: '900', marginTop: 2 }}>
                        {d.dayNumber} {d.monthName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity style={styles.modalBtn} onPress={handleConfirm}>
            <Text style={styles.modalBtnText}>CONFIRMAR SELECCIÓN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
