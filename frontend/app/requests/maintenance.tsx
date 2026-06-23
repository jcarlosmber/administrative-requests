import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Dimensions, Modal, ImageBackground, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
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
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta'>('media');
  const [attachment, setAttachment] = useState<{ name: string; uri: string } | null>(null);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachment({
          name: result.assets[0].name,
          uri: result.assets[0].uri
        });
      }
    } catch (err) {
      console.error('Error al seleccionar documento:', err);
    }
  };

  // Efecto para auto-completar dependencia desde LDAP
  useEffect(() => {
    const fetchUserLdapData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.dependency) {
          setDependency(user.dependency);
        }
      } catch (err) {
        console.error('Error fetching user for maintenance prefill:', err);
      }
    };
    fetchUserLdapData();
  }, []);

  
  // UI State
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      setErrorMessage('');
      if (!title.trim() || !dependency.trim() || !description.trim() || (!location.trim() && !room.trim())) {
        setErrorMessage('Completa el asunto, la dependencia, la ubicación y la descripción antes de enviar.');
        return;
      }

      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      await requestService.create({
        user_id: user?.id || null,
        title: title.trim(),
        description: description.trim(),
        category: 'maintenance',
        priority,
        attachments: attachment ? [attachment.name] : [],
        metadata: {
          location: location.trim(),
          room: room.trim(),
          dependency: dependency.trim()
        }
      });

      setLoading(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al registrar mantenimiento:', error);
      setLoading(false);
      setErrorMessage('No pudimos enviar el reporte. Intenta nuevamente.');
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

                <Card title="Nivel de Prioridad" icon="alert-circle">
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                    {(['baja', 'media', 'alta'] as const).map((p) => {
                      const isSelected = priority === p;
                      const config = {
                        baja: { label: 'Baja', color: '#10B981', bg: '#EBFDF5' },
                        media: { label: 'Media', color: '#F59E0B', bg: '#FEF3C7' },
                        alta: { label: 'Alta', color: '#EF4444', bg: '#FEE2E2' }
                      }[p];
                      
                      return (
                        <TouchableOpacity
                          key={p}
                          onPress={() => setPriority(p)}
                          activeOpacity={0.8}
                          style={{
                            flex: 1,
                            height: 50,
                            borderRadius: 16,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 2,
                            borderColor: isSelected ? config.color : COLORS.line,
                            backgroundColor: isSelected ? config.bg : COLORS.white,
                          }}
                        >
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '800',
                            color: isSelected ? config.color : COLORS.muted,
                            textTransform: 'uppercase'
                          }}>
                            {config.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
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
                  <TouchableOpacity style={styles.uploadBox} onPress={handlePickDocument}>
                    {attachment ? (
                      <>
                        <View style={[styles.uploadIcon, { backgroundColor: COLORS.success }]}>
                          <Ionicons name="checkmark" size={32} color={COLORS.white} />
                        </View>
                        <Text style={styles.uploadText}>{attachment.name}</Text>
                        <Text style={styles.uploadSub}>Toca para cambiar la evidencia</Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.uploadIcon}>
                          <Ionicons name="cloud-upload-outline" size={32} color={COLORS.primary} />
                        </View>
                        <Text style={styles.uploadText}>Subir Evidencia Fotográfica</Text>
                        <Text style={styles.uploadSub}>Capture una imagen del daño para agilizar el proceso</Text>
                      </>
                    )}
                  </TouchableOpacity>
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
                    <Text style={styles.btnText}>{loading ? 'Procesando...' : 'Enviar Reporte'}</Text>
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
        title={title}
        dependency={dependency}
        location={location}
        room={room}
        onClose={() => { setShowSuccess(false); router.replace('/(tabs)'); }} 
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

function SuccessModal({ visible, onClose, title, dependency, location, room }: any) {
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
            Su requerimiento ha sido registrado en el sistema. Se encuentra en revisión para asignación del personal técnico idóneo.
          </Text>
          
          <View style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.02)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, gap: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 16, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Reporte:</Text> {title}</Text>
            <Text style={{ fontSize: 16, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Área:</Text> {dependency}</Text>
            <Text style={{ fontSize: 16, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Ubicación:</Text> Piso {location} - {room}</Text>
            
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
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8 },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '700', flex: 1 },
  
  modalBlur: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalPanel: { backgroundColor: COLORS.white, borderRadius: 30, width: '100%', maxWidth: 500, padding: 25, shadowOpacity: 0.2, shadowRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  modalText: { fontSize: 15, color: COLORS.muted, lineHeight: 24 },
  modalBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  modalBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
});
