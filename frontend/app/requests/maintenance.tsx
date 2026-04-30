import React, { useMemo, useState } from 'react';
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
  primary: '#2A9D8F', // Teal/Green for Maintenance
  primaryDark: '#1D6F65',
  primaryLight: '#E9F5F4',
  accent: '#FACC15',
  soft: '#F0F9F8',
  bg: '#F8FAFC',
  card: 'rgba(255, 255, 255, 0.85)',
  text: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  success: '#10B981',
  white: '#FFFFFF'
};

export default function MaintenanceRequestScreen() {
  const router = useRouter();
  
  // Form State
  const [title, setTitle] = useState('');
  const [dependency, setDependency] = useState('');
  const [location, setLocation] = useState('');
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');
  
  // UI State
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [loading, setLoading] = useState(false);

  const progress = useMemo(() => {
    let p = 20;
    if (title) p += 20;
    if (dependency) p += 20;
    if (location || room) p += 20;
    if (description) p += 20;
    return Math.min(p, 100);
  }, [title, dependency, location, room, description]);

  const handleRegister = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      await requestService.create({
        user_id: user?.id || null, // Fallback para dev
        title,
        description,
        category: 'maintenance',
        priority: 'media',
        metadata: {
          location,
          room,
          dependency
        }
      });

      setLoading(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al registrar mantenimiento:', error);
      setLoading(false);
      // Aquí se podría mostrar un modal de error
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ title: 'Mantenimientos Locativos' }} />
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
                <Card title="Información General" icon="apps">
                  <Field 
                    label="Asunto del Reporte" 
                    icon="alert-circle-outline" 
                    value={title} 
                    onChangeText={setTitle} 
                    placeholder="Ej. Falla en aire acondicionado" 
                  />
                  
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
                </Card>

                <Card title="Ubicación Exacta" icon="location">
                  <View style={{ flexDirection: 'row', gap: 15 }}>
                    <View style={{ flex: 1 }}>
                      <Field 
                        label="Piso" 
                        icon="layers-outline" 
                        value={location} 
                        onChangeText={setLocation} 
                        placeholder="Ej. 4" 
                      />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Field 
                        label="Sala / Oficina" 
                        icon="business-outline" 
                        value={room} 
                        onChangeText={setRoom} 
                        placeholder="Ej. Sala de Juntas B" 
                      />
                    </View>
                  </View>
                </Card>

                <Card title="Descripción del Problema" icon="document-text">
                  <Field 
                    label="Detalles de la Falla" 
                    icon="create-outline" 
                    value={description} 
                    onChangeText={setDescription} 
                    placeholder="Describa brevemente el problema encontrado, afectaciones y urgencia..." 
                    multiline
                    numberOfLines={6}
                  />
                </Card>

                <Card title="Evidencia" icon="camera">
                  <TouchableOpacity style={styles.uploadBox}>
                    <View style={styles.uploadIcon}>
                      <Ionicons name="cloud-upload-outline" size={32} color={COLORS.primary} />
                    </View>
                    <Text style={styles.uploadText}>Subir Evidencia Fotográfica</Text>
                    <Text style={styles.uploadSub}>Capture una imagen del daño para agilizar el proceso</Text>
                  </TouchableOpacity>
                </Card>

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
                    <Text style={styles.btnText}>{loading ? 'PROCESANDO...' : 'ENVIAR REPORTE'}</Text>
                    <Ionicons name="send" size={20} color={COLORS.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ResponsiveContainer>
          </ScrollView>
        </View>
      </LinearGradient>

      <SuccessModal visible={showSuccess} onClose={() => { setShowSuccess(false); router.replace('/(tabs)'); }} />
      
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
        source={{ uri: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1000&auto=format&fit=crop' }} 
        style={styles.sideBg}
      >
        <LinearGradient colors={['rgba(42, 157, 143, 0.9)', 'rgba(29, 111, 101, 0.95)']} style={StyleSheet.absoluteFill} />
        <View style={styles.sideContent}>
          <View style={styles.logoRing}>
            <Ionicons name="construct" size={54} color={COLORS.white} />
          </View>
          <Text style={styles.sideTitle}>Mantenimientos Locativos</Text>
          <Text style={styles.sideSub}>Secretaría Jurídica Distrital</Text>
          <View style={styles.sideDivider} />
          <Text style={styles.sideDesc}>
            Reporte y haga seguimiento a cualquier falla técnica o requerimiento de mantenimiento en las instalaciones.
          </Text>
          <View style={styles.sideBadge}>
            <Text style={styles.badgeText}>INFRAESTRUCTURA</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

function MobileHeader() {
  return (
    <View style={styles.mobHeader}>
      <Ionicons name="construct" size={32} color={COLORS.primary} />
      <View>
        <Text style={styles.mobTitle}>Secretaría Jurídica</Text>
        <Text style={styles.mobSub}>Mantenimientos Locativos</Text>
      </View>
    </View>
  );
}

function Hero({ progress }: { progress: number }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <View>
          <Text style={styles.heroTitle}>Mantenimientos Locativos</Text>
          <Text style={styles.heroSub}>Infraestructura y Servicios Generales</Text>
        </View>
        <View style={styles.pill}><Text style={styles.pillText}>Técnico</Text></View>
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

function SuccessModal({ visible, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBlur}>
        <View style={[styles.modalPanel, { alignItems: 'center', padding: 40 }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-done" size={60} color={COLORS.white} />
          </View>
          <Text style={styles.modalTitle}>¡Reporte Enviado!</Text>
          <Text style={[styles.modalText, { textAlign: 'center', marginTop: 10 }]}>
            Su solicitud ha sido registrada en el sistema de mantenimiento. Se le notificará cuando un técnico sea asignado.
          </Text>
          <TouchableOpacity style={[styles.modalBtn, { width: '100%', marginTop: 20 }]} onPress={onClose}>
            <Text style={styles.modalBtnText}>VOLVER AL MENÚ</Text>
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
  
  uploadBox: { height: 160, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', gap: 10 },
  uploadIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  uploadText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  uploadSub: { fontSize: 12, color: COLORS.muted, textAlign: 'center', paddingHorizontal: 40 },

  mainBtn: { height: 64, borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  btnText: { color: COLORS.white, fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  
  modalBlur: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalPanel: { backgroundColor: COLORS.white, borderRadius: 30, width: '100%', maxWidth: 500, padding: 25, shadowOpacity: 0.2, shadowRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  modalText: { fontSize: 15, color: COLORS.muted, lineHeight: 24 },
  modalBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  modalBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
});
