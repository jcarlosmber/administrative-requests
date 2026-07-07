import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Dimensions, Modal, ImageBackground, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { DependencySelector } from '../../components/DependencySelector';
import { supabase } from '../../lib/supabase';
import { requestService } from '../../lib/requestService';
import { vehicleService } from '../../lib/vehicleService';
import ConfirmActionModal from '../../components/ConfirmActionModal';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const COLORS = {
  primary: '#F4A261', // Sand/Orange
  primaryDark: '#E76F51',
  primaryLight: '#FEFAE0',
  accent: '#2A9D8F',
  soft: '#FFF7ED',
  bg: '#F8FAFC',
  card: 'rgba(255, 255, 255, 0.85)',
  text: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  success: '#10B981',
  white: '#FFFFFF'
};

export default function ParkingRequestScreen() {
  const router = useRouter();
  
  // Form State
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [dependency, setDependency] = useState('');
  const [charge, setCharge] = useState('');
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');

  // UI State
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [showDeps, setShowDeps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [myVehicles, setMyVehicles] = useState<any[]>([]);

  // Efecto para auto-completar nombre y dependencia desde LDAP, y cargar vehículos
  useEffect(() => {
    const fetchUserLdapDataAndVehicles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (user.name) setName(user.name);
          if (user.dependency) setDependency(user.dependency);
          
          // Obtener las solicitudes de parqueadero del usuario
          const allReqs = await requestService.getAll();
          if (allReqs) {
            const parks = allReqs.filter(r => r.category === 'parking');
            setMyVehicles(parks);
          }
        }
      } catch (err) {
        console.error('Error fetching user for parking prefill:', err);
      }
    };
    fetchUserLdapDataAndVehicles();
  }, []);

  const progress = useMemo(() => {
    let p = 10;
    if (name && doc && charge) p += 40;
    if (plate && brand) p += 30;
    if (dependency) p += 20;
    return Math.min(p, 100);
  }, [name, doc, charge, plate, brand, dependency]);

  const handleRegister = async () => {
    try {
      setErrorMessage('');
      const trimmedName = name.trim();
      const trimmedDoc = doc.trim();
      const trimmedCharge = charge.trim();
      const trimmedDependency = dependency.trim();
      const trimmedPlate = plate.trim();
      const trimmedBrand = brand.trim();

      if (!trimmedName || !trimmedDoc || !trimmedCharge || !trimmedDependency || !trimmedPlate || !trimmedBrand) {
        setErrorMessage('Completa todos los datos del conductor y del vehículo para continuar.');
        return;
      }

      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      await requestService.create({
        user_id: user?.id || null,
        title: `Parqueadero: ${trimmedPlate}`,
        description: `Solicitud de cupo para vehículo ${trimmedBrand} (${color.trim() || 'Sin color'}) - Conductor: ${trimmedName}`,
        category: 'parking',
        priority: 'media',
        metadata: {
          name: trimmedName,
          doc: trimmedDoc,
          dependency: trimmedDependency,
          charge: trimmedCharge,
          plate: trimmedPlate,
          brand: trimmedBrand,
          color: color.trim()
        }
      });

      setLoading(false);
      setIsSuccessModalVisible(true);
      setIsConfirmModalVisible(false);
    } catch (error) {
      console.error('Error al solicitar parqueadero:', error);
      setLoading(false);
      setErrorMessage('No pudimos enviar la solicitud de parqueadero. Intenta nuevamente.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: 'Cupo de Parqueadero' }} />
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
                {myVehicles.length > 0 && (
                  <Card title="Tus Solicitudes de Parqueadero" icon="car">
                    {myVehicles.map((v, index) => (
                      <View key={v.id || index} style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        padding: 12, 
                        backgroundColor: COLORS.bg, 
                        borderRadius: 12, 
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: COLORS.line
                      }}>
                        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                          <Ionicons name="car" size={24} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: 'bold', color: COLORS.text }}>
                            Placa: {v.metadata?.plate || 'S/N'}
                          </Text>
                          <Text style={{ fontSize: 12, color: COLORS.muted }}>
                            {v.metadata?.brand || 'Sin marca'} • {v.metadata?.color || 'Sin color'}
                          </Text>
                        </View>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(244, 162, 97, 0.1)' }}>
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: COLORS.primaryDark }}>
                            EN SISTEMA
                          </Text>
                        </View>
                      </View>
                    ))}
                  </Card>
                )}

                <Card title="Lineamientos de Parqueadero" icon="document-text">
                  <Text style={{ fontSize: 14, color: COLORS.text, lineHeight: 20, marginBottom: 12, fontWeight: '500' }}>
                    Conozca los lineamientos y normas de tránsito vigentes para el uso de los parqueaderos en la Manzana Liévano y Archivo Distrital.
                  </Text>
                  <TouchableOpacity 
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: COLORS.soft,
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: 'rgba(244, 162, 97, 0.3)'
                    }}
                    onPress={() => setShowGuidelines(true)}
                  >
                    <Ionicons name="book-outline" size={18} color={COLORS.primary} />
                    <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 14 }}>
                      VER LINEAMIENTOS COMPLETOS
                    </Text>
                  </TouchableOpacity>
                </Card>

                <Card title="Información del Conductor" icon="person">
                  <Field 
                    label="Nombre Completo" 
                    icon="person-outline" 
                    value={name} 
                    onChangeText={setName} 
                    placeholder="Ej. Juan Pérez" 
                  />
                  <Field 
                    label="Cargo" 
                    icon="briefcase-outline" 
                    value={charge} 
                    onChangeText={setCharge} 
                    placeholder="Ej. Profesional Especializado, Director, Asesor" 
                  />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Field 
                        label="Cédula / ID" 
                        icon="card-outline" 
                        value={doc} 
                        onChangeText={setDoc} 
                        placeholder="1.000.000" 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Dependencia</Text>
                      <TouchableOpacity 
                        style={styles.inputWrap} 
                        onPress={() => setShowDeps(true)}
                      >
                        <Ionicons name="business-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <Text 
                          style={[styles.input, !dependency && { color: '#94A3B8' }]} 
                          numberOfLines={1}
                        >
                          {dependency || "Seleccionar"}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>

                <Card title="Datos del Vehículo" icon="car">
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Field 
                        label="Placa" 
                        icon="barcode-outline" 
                        value={plate} 
                        onChangeText={(txt: string) => setPlate(txt.toUpperCase())} 
                        placeholder="ABC123"
                        maxLength={6}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field 
                        label="Color" 
                        icon="color-palette-outline" 
                        value={color} 
                        onChangeText={setColor} 
                        placeholder="Ej. Gris" 
                      />
                    </View>
                  </View>
                  <Field 
                    label="Marca / Modelo" 
                    icon="construct-outline" 
                    value={brand} 
                    onChangeText={setBrand} 
                    placeholder="Ej. Renault Duster 2024" 
                  />
                </Card>

                <View style={styles.warningBox}>
                  <Ionicons name="information-circle" size={22} color="#1E40AF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.warningText}>
                      La asignación de cupo está sujeta a disponibilidad y validación por parte de Servicios Generales.
                    </Text>
                    <Text style={[styles.warningText, { marginTop: 5, fontWeight: '800' }]}>
                      Nota: El parqueadero permanente es exclusivo para funcionarios de planta, directores y asesores.
                    </Text>
                  </View>
                </View>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity 
                  style={[styles.mainBtn, (progress < 80) && { opacity: 0.5 }]} 
                  onPress={() => setIsConfirmModalVisible(true)}
                  disabled={loading || progress < 80}
                >
                  <LinearGradient 
                    colors={[COLORS.primary, COLORS.primaryDark]} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 0 }} 
                    style={styles.btnGradient}
                  >
                    <Text style={styles.btnText}>{loading ? 'Procesando...' : 'Solicitar Acceso'}</Text>
                    <Ionicons name="key" size={20} color={COLORS.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ResponsiveContainer>
          </ScrollView>
        </View>
      </LinearGradient>

      <SuccessModal 
        visible={isSuccessModalVisible} 
        plate={plate}
        brand={brand}
        name={name}
        charge={charge}
        dependency={dependency}
        onClose={() => { setIsSuccessModalVisible(false); router.replace('/dashboard'); }} 
      />
      
      <ConfirmActionModal
        visible={isConfirmModalVisible}
        onClose={() => setIsConfirmModalVisible(false)}
        onConfirm={handleRegister}
        title="Confirmar Solicitud"
        message="¿Está seguro de enviar esta solicitud de parqueadero?"
        confirmText="Enviar"
      />

      <GuidelinesModal 
        visible={showGuidelines} 
        onClose={() => setShowGuidelines(false)} 
      />
      
      <DependencySelector 
        visible={showDeps} 
        onClose={() => setShowDeps(false)} 
        onSelect={setDependency} 
        selectedValue={dependency}
      />
    </SafeAreaView>
  );
}

function Sidebar() {
  return (
    <View style={styles.sidebar}>
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=1000&auto=format&fit=crop' }} 
        style={styles.sideBg}
      >
        <LinearGradient colors={['rgba(244, 162, 97, 0.9)', 'rgba(231, 111, 81, 0.95)']} style={StyleSheet.absoluteFill} />
        <View style={styles.sideContent}>
          <View style={styles.logoRing}>
            <Ionicons name="car" size={54} color={COLORS.white} />
          </View>
          <Text style={styles.sideTitle}>Acceso a Parqueadero</Text>
          <Text style={styles.sideSub}>Secretaría Jurídica Distrital</Text>
          <View style={styles.sideDivider} />
          <Text style={styles.sideDesc}>
            Inscripción y gestión de vehículos oficiales y particulares autorizados para el ingreso a la sede administrativa.
          </Text>
          <View style={styles.sideBadge}>
            <Text style={styles.badgeText}>ZONA PROTEGIDA</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

function MobileHeader() {
  return (
    <View style={styles.mobHeader}>
      <Ionicons name="car" size={32} color={COLORS.primary} />
      <View>
        <Text style={styles.mobTitle}>Secretaría Jurídica</Text>
        <Text style={styles.mobSub}>Solicitud de Parqueadero</Text>
      </View>
    </View>
  );
}

function Hero({ progress }: { progress: number }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <View>
          <Text style={styles.heroTitle}>Nuevo Registro</Text>
          <Text style={styles.heroSub}>Vincule su vehículo al sistema central</Text>
        </View>
        <View style={styles.pill}><Text style={styles.pillText}>Acceso Vial</Text></View>
      </View>
      <View style={barStyles.barContainer}>
        <View style={barStyles.barBg}>
          <Animated.View style={[barStyles.barFill, { width: `${progress}%` }]} />
        </View>
        <Text style={barStyles.barLabel}>{progress}% Completado</Text>
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  barContainer: { marginTop: 20 },
  barBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 10, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 10 },
  barLabel: { marginTop: 8, fontSize: 12, fontWeight: '700', color: COLORS.muted, textAlign: 'right' }
});

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

function SuccessModal({ visible, onClose, plate, brand, name, charge, dependency }: any) {
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
            Su solicitud de cupo vehicular ha quedado ingresada al sistema para evaluación de disponibilidad física en el sótano administrativo.
          </Text>
          
          <View style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.02)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, gap: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 16, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Vehículo:</Text> {brand} ({plate})</Text>
            <Text style={{ fontSize: 16, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Conductor:</Text> {name}</Text>
            <Text style={{ fontSize: 16, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Cargo:</Text> {charge}</Text>
            <Text style={{ fontSize: 16, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Dependencia:</Text> {dependency}</Text>
            
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
  
  field: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.muted, marginBottom: 8, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 16, paddingHorizontal: 15, height: 54 },
  input: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  
  warningBox: { flexDirection: 'row', gap: 12, backgroundColor: '#EFF6FF', padding: 15, borderRadius: 18, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  warningText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18, fontWeight: '600' },
  
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
