import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, useWindowDimensions, Modal, ImageBackground, Animated, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { DependencySelector } from '../../components/DependencySelector';
import { GuideModalButton } from '../../components/GuideModalButton';
import { AccessibleSwitch } from '../../components/AccessibleSwitch';
import { requestService } from '../../lib/requestService';
import { settingsService } from '../../lib/settingsService';
import { supabase } from '../../lib/supabase';

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

interface MissingField {
  section: string;
  field: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function VisitorsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  // Form State
  const [visitors, setVisitors] = useState<Visitor[]>([{ id: '1', name: '', document: '' }]);
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([{ id: '1', plate: '', brand: '' }]);
  const [responsible, setResponsible] = useState({ name: '', phone: '', dependency: '' });
  const [visitReason, setVisitReason] = useState('');
  const [autoApproveVisitors, setAutoApproveVisitors] = useState(false);

  // Efecto para cargar preferencia global de auto-aprobación de visitantes
  useEffect(() => {
    const loadAutoApproveSetting = async () => {
      try {
        const val = await settingsService.getSystemSetting('auto_approve_visitors');
        if (val !== null && val !== undefined) {
          setAutoApproveVisitors(typeof val === 'boolean' ? val : val === 'true' || val === 1);
        } else if (typeof window !== 'undefined' && window.localStorage) {
          const localVal = localStorage.getItem('auto_approve_visitors');
          if (localVal !== null) {
            setAutoApproveVisitors(localVal === 'true');
          }
        }
      } catch (err) {
        console.warn('Error loading auto_approve_visitors setting:', err);
      }
    };
    loadAutoApproveSetting();
  }, []);

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

  // Efecto para cargar datos de plantilla si existe
  useEffect(() => {
    if (params?.templateId) {
      const fetchTemplate = async () => {
        try {
          const data = await requestService.getById(params.templateId as string);
          if (data && data.metadata) {
            if (data.metadata.visitors && data.metadata.visitors.length > 0) {
              setVisitors(data.metadata.visitors);
            }
            if (data.metadata.vehicles && data.metadata.vehicles.length > 0) {
              setVehicles(data.metadata.vehicles);
              setHasVehicle(true);
            }
            if (data.metadata.responsible) {
              // Merge con los datos actuales para no borrar el usuario si falta algo en la plantilla
              setResponsible(prev => ({
                ...prev,
                ...data.metadata.responsible
              }));
            }
            if (data.metadata.visitReason || data.metadata.reason) {
              setVisitReason(data.metadata.visitReason || data.metadata.reason);
            }
          }
        } catch (err) {
          console.error('Error loading template:', err);
        }
      };
      fetchTemplate();
    }
  }, [params?.templateId]);

  const todayDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Cálculo detallado en tiempo real de todos los campos que faltan
  const missingFields = useMemo<MissingField[]>(() => {
    const missing: MissingField[] = [];

    // 1. Visitantes
    if (!visitors || visitors.length === 0) {
      missing.push({
        section: 'Información de Visitantes',
        field: 'Listado de visitantes',
        description: 'Debes registrar al menos una persona que ingresará a la entidad.',
        icon: 'people-outline'
      });
    } else {
      visitors.forEach((v, idx) => {
        const num = idx + 1;
        const hasName = !!v.name?.trim();
        const hasDoc = !!v.document?.trim();
        if (!hasName && !hasDoc) {
          missing.push({
            section: 'Información de Visitantes',
            field: `Visitante #${num}`,
            description: `Faltan tanto el nombre como el documento del Visitante #${num}.`,
            icon: 'person-outline'
          });
        } else {
          if (!hasName) {
            missing.push({
              section: 'Información de Visitantes',
              field: `Nombre (Visitante #${num})`,
              description: `Ingresa el nombre completo del Visitante #${num}.`,
              icon: 'person-outline'
            });
          }
          if (!hasDoc) {
            missing.push({
              section: 'Información de Visitantes',
              field: `Documento (Visitante #${num})`,
              description: `Ingresa el número de identificación (CC/CE/TI) de ${v.name.trim() || `Visitante #${num}`}.`,
              icon: 'card-outline'
            });
          }
        }
      });
    }

    // 2. Acceso Vehicular (si el switch está activo)
    if (hasVehicle) {
      if (!vehicles || vehicles.length === 0) {
        missing.push({
          section: 'Acceso Vehicular',
          field: 'Vehículos',
          description: 'Debes registrar la placa y marca del vehículo o apagar la opción de vehículo.',
          icon: 'car-outline'
        });
      } else {
        vehicles.forEach((vh, idx) => {
          const num = idx + 1;
          const hasPlate = !!vh.plate?.trim();
          const hasBrand = !!vh.brand?.trim();
          if (!hasPlate) {
            missing.push({
              section: 'Acceso Vehicular',
              field: `Placa (Vehículo #${num})`,
              description: `Ingresa la placa del vehículo #${num} (Ej. ABC123).`,
              icon: 'barcode-outline'
            });
          }
          if (!hasBrand) {
            missing.push({
              section: 'Acceso Vehicular',
              field: `Marca (Vehículo #${num})`,
              description: `Ingresa la marca o tipo de vehículo #${num} (Ej. Mazda, Renault, Pulsar).`,
              icon: 'car-sport-outline'
            });
          }
        });
      }
    }

    // 3. Funcionario Responsable
    if (!responsible.name?.trim()) {
      missing.push({
        section: 'Funcionario Responsable',
        field: 'Nombre del Funcionario',
        description: 'Ingresa el nombre del funcionario o contratista que autoriza o atiende la visita.',
        icon: 'briefcase-outline'
      });
    }
    if (!responsible.dependency?.trim()) {
      missing.push({
        section: 'Funcionario Responsable',
        field: 'Dependencia Institucional',
        description: 'Selecciona la dependencia o área de la Secretaría Jurídica Distrital.',
        icon: 'business-outline'
      });
    }
    if (!responsible.phone?.trim()) {
      missing.push({
        section: 'Funcionario Responsable',
        field: 'Teléfono / Extensión',
        description: 'Ingresa el número telefónico institucional o celular de contacto.',
        icon: 'call-outline'
      });
    }

    // 4. Motivo de la Visita
    if (!visitReason?.trim()) {
      missing.push({
        section: 'Motivo de la Visita',
        field: 'Descripción del Motivo',
        description: 'Escribe una breve descripción del objeto o propósito de la visita.',
        icon: 'document-text-outline'
      });
    }

    // 5. Vigencia de Fechas
    if (fromDate && toDate && new Date(toDate) < new Date(fromDate)) {
      missing.push({
        section: 'Vigencia del Ingreso',
        field: 'Rango de Fechas',
        description: 'La fecha "Hasta" no puede ser anterior a la fecha "Desde".',
        icon: 'calendar-outline'
      });
    }

    // 6. Autorización de Datos
    if (!acceptedTerms) {
      missing.push({
        section: 'Protección de Datos',
        field: 'Autorización de Tratamiento',
        description: 'Debes marcar la casilla aceptando la política de protección de datos personales.',
        icon: 'shield-checkmark-outline'
      });
    }

    return missing;
  }, [visitors, hasVehicle, vehicles, responsible, visitReason, fromDate, toDate, acceptedTerms]);

  const progress = useMemo(() => {
    let p = 10;
    const vFull = visitors.length > 0 && visitors.every(v => v.name?.trim() && v.document?.trim());
    if (vFull) p += 25;
    if (responsible.name?.trim() && responsible.phone?.trim() && responsible.dependency?.trim()) p += 25;
    if (visitReason.trim()) p += 15;
    if (acceptedTerms) p += 25;
    return Math.min(p, 100);
  }, [visitors, responsible, visitReason, acceptedTerms]);

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
      setAttemptedSubmit(true);

      // Si faltan datos, desplegar inmediatamente el modal detallado
      if (missingFields.length > 0) {
        setShowValidationModal(true);
        setErrorMessage(`Falta completar ${missingFields.length} dato${missingFields.length > 1 ? 's' : ''} requerido${missingFields.length > 1 ? 's' : ''} para poder radicar la solicitud.`);
        return;
      }

      setLoading(true);

      const validVisitors = visitors.map(v => ({
        name: v.name.trim(),
        document: v.document.trim()
      }));
      const trimmedResponsibleName = responsible.name.trim();
      const trimmedResponsiblePhone = responsible.phone.trim();
      const trimmedResponsibleDependency = responsible.dependency.trim();
      const trimmedReason = visitReason.trim();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const visitorNames = validVisitors.map(v => v.name).join(', ');

      let adminEmails: string[] = [];
      try {
        const allServiceEmails = await settingsService.getServiceEmails();
        adminEmails = allServiceEmails
          .filter(e => e && e.service_type === 'manager' && e.email?.trim())
          .map(e => e.email.trim());
      } catch (e) {
        console.warn('No se pudieron obtener correos de servicio locales para visitantes:', e);
      }
      
      console.log('📤 [FRONTEND SASGE] Radicando solicitud de ingreso de visitantes. Destinatarios Proceso de Gestión Administrativa:', adminEmails);

      const finalStatus: 'pendiente' | 'en_progreso' | 'resuelto' | 'rechazado' = 
        autoApproveVisitors ? 'resuelto' : 'pendiente';

      await requestService.create({
        user_id: user?.id || null,
        title: `Ingreso: ${visitorNames}`,
        description: `Motivo: ${trimmedReason} | Visita para ${trimmedResponsibleName} en ${trimmedResponsibleDependency} desde ${fromDate} hasta ${toDate}`,
        category: 'visitors',
        status: finalStatus,
        priority: 'media',
        adminEmails,
        metadata: {
          visitors: validVisitors,
          hasVehicle,
          vehicles: hasVehicle ? vehicles.map(vh => ({ plate: vh.plate.trim().toUpperCase(), brand: vh.brand.trim() })) : [],
          responsible: {
            name: trimmedResponsibleName,
            phone: trimmedResponsiblePhone,
            dependency: trimmedResponsibleDependency
          },
          visitReason: trimmedReason,
          reason: trimmedReason,
          fromDate,
          toDate,
          approved_automatically: autoApproveVisitors
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
      <GuideModalButton
        imageSource={require('../../assets/guides/Ingresos.jpg')}
        title="Guía - Ingreso de Visitantes"
        subtitle="Flujograma y procedimiento de autorización de ingreso"
        themeColor={COLORS.primary}
      />
      <LinearGradient colors={['#F1F5F9', '#FFFFFF']} style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
          
          {isDesktop && <Sidebar />}

          <ScrollView 
            contentContainerStyle={{ 
              padding: isDesktop ? 40 : 10, 
              paddingBottom: 60,
              flexGrow: 1
            }}
            showsVerticalScrollIndicator={false}
          >
            <ResponsiveContainer>
              {!isDesktop && <MobileHeader />}

              <Hero 
                progress={progress} 
                missingCount={missingFields.length} 
                onPressMissing={() => setShowValidationModal(true)} 
              />

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
                        hasError={attemptedSubmit && !v.name?.trim()}
                        errorText="Nombre obligatorio"
                      />
                      <Field 
                        label="Documento" 
                        icon="card-outline" 
                        value={v.document} 
                        onChangeText={(txt: string) => updateVisitor(v.id, 'document', txt)} 
                        placeholder="CC / CE / TI" 
                        hasError={attemptedSubmit && !v.document?.trim()}
                        errorText="Documento obligatorio"
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
                    <AccessibleSwitch 
                      value={hasVehicle} 
                      onValueChange={setHasVehicle} 
                      activeColor={COLORS.primary}
                      accessibilityLabel="Acceso vehicular con parqueadero"
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
                                hasError={hasVehicle && attemptedSubmit && !vh.plate?.trim()}
                                errorText="Placa obligatoria"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Field 
                                label="Marca" 
                                value={vh.brand} 
                                onChangeText={(txt: string) => updateVehicle(vh.id, 'brand', txt)} 
                                placeholder="Ej. Mazda"
                                hasError={hasVehicle && attemptedSubmit && !vh.brand?.trim()}
                                errorText="Marca obligatoria"
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
                    hasError={attemptedSubmit && !responsible.name?.trim()}
                    errorText="Nombre obligatorio"
                  />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginLeft: 4 }}>
                        <Text style={[styles.label, { marginBottom: 0, marginLeft: 0 }, attemptedSubmit && !responsible.dependency && { color: '#DC2626', fontWeight: '800' }]}>
                          Dependencia <Text style={{ color: '#DC2626' }}>*</Text>
                        </Text>
                        {attemptedSubmit && !responsible.dependency && (
                          <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700' }}>Obligatorio</Text>
                        )}
                      </View>
                      <TouchableOpacity 
                        style={[
                          styles.inputWrap,
                          attemptedSubmit && !responsible.dependency && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }
                        ]} 
                        onPress={() => setShowDeps(true)}
                        accessibilityRole="combobox"
                        accessibilityLabel="Dependencia"
                        aria-label="Dependencia"
                        {...({ 'data-field-role': 'select', 'data-field-name': 'Dependencia' } as any)}
                      >
                        <Ionicons 
                          name="business-outline" 
                          size={18} 
                          color={attemptedSubmit && !responsible.dependency ? '#DC2626' : COLORS.muted} 
                          style={{ marginRight: 10 }} 
                        />
                        <Text 
                          style={[
                            styles.input, 
                            !responsible.dependency && { color: attemptedSubmit ? '#F87171' : '#94A3B8' }
                          ]} 
                          numberOfLines={1}
                        >
                          {responsible.dependency || "Seleccionar"}
                        </Text>
                        <Ionicons 
                          name="chevron-down" 
                          size={16} 
                          color={attemptedSubmit && !responsible.dependency ? '#DC2626' : COLORS.muted} 
                        />
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
                        hasError={attemptedSubmit && !responsible.phone?.trim()}
                        errorText="Teléfono obligatorio"
                      />
                    </View>
                  </View>
                </Card>

                <Card title="Motivo de la Visita" icon="document-text">
                  <Field 
                    label="Descripción Breve del Motivo" 
                    icon="information-circle-outline" 
                    value={visitReason} 
                    onChangeText={setVisitReason} 
                    placeholder="Ej. Reunión técnica sobre lineamientos jurídicos" 
                    hasError={attemptedSubmit && !visitReason?.trim()}
                    errorText="Motivo obligatorio"
                  />
                </Card>

                <Card title="Vigencia del Ingreso" icon="calendar">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={styles.label}>Desde (Fecha)</Text>
                      <TouchableOpacity 
                        style={styles.inputWrap} 
                        onPress={() => {
                          setModalTarget('from');
                          setShowDatePicker(true);
                        }}
                        accessibilityRole="combobox"
                        accessibilityLabel="Desde (Fecha)"
                        aria-label="Desde (Fecha)"
                        {...({ 'data-field-role': 'select', 'data-field-name': 'Desde (Fecha)' } as any)}
                      >
                        <Ionicons name="calendar-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <Text style={styles.input}>{fromDate}</Text>
                        <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={styles.label}>Hasta (Fecha)</Text>
                      <TouchableOpacity 
                        style={[
                          styles.inputWrap,
                          fromDate && toDate && new Date(toDate) < new Date(fromDate) && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }
                        ]} 
                        onPress={() => {
                          setModalTarget('to');
                          setShowDatePicker(true);
                        }}
                        accessibilityRole="combobox"
                        accessibilityLabel="Hasta (Fecha)"
                        aria-label="Hasta (Fecha)"
                        {...({ 'data-field-role': 'select', 'data-field-name': 'Hasta (Fecha)' } as any)}
                      >
                        <Ionicons 
                          name="calendar-outline" 
                          size={18} 
                          color={fromDate && toDate && new Date(toDate) < new Date(fromDate) ? '#DC2626' : COLORS.muted} 
                          style={{ marginRight: 10 }} 
                        />
                        <Text style={styles.input}>{toDate}</Text>
                        <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {fromDate && toDate && new Date(toDate) < new Date(fromDate) && (
                    <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '700', marginTop: 8 }}>
                      ⚠️ La fecha Hasta no puede ser anterior a la fecha Desde.
                    </Text>
                  )}
                </Card>

                <TouchableOpacity 
                  style={[
                    styles.termsBox,
                    attemptedSubmit && !acceptedTerms && { 
                      borderColor: '#EF4444', 
                      backgroundColor: '#FEF2F2', 
                      borderWidth: 1.5, 
                      borderRadius: 14,
                      padding: 12
                    }
                  ]} 
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                >
                  <View style={[
                    styles.checkbox, 
                    acceptedTerms && styles.checkboxOn,
                    attemptedSubmit && !acceptedTerms && { borderColor: '#EF4444' }
                  ]}>
                    {acceptedTerms && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.termsText}>
                      Autorizo el tratamiento de datos según el <Text style={{ color: COLORS.primary, fontWeight: '700' }} onPress={() => setShowPolicy(true)}>Manual de la Política de Tratamiento y Protección de Datos Personales</Text>.
                    </Text>
                    {attemptedSubmit && !acceptedTerms && (
                      <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '800', marginTop: 4 }}>
                        ⚠️ Debes marcar esta casilla de autorización para poder radicar.
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                {errorMessage ? (
                  <View style={[styles.errorBox, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 }]}>
                    <Ionicons name="alert-circle" size={22} color="#B91C1C" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                    {missingFields.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => setShowValidationModal(true)}
                        style={{ backgroundColor: '#B91C1C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>VER QUÉ FALTA</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}

                <TouchableOpacity 
                  style={[styles.mainBtn, loading && { opacity: 0.6 }]} 
                  onPress={handleRegister}
                  disabled={loading}
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

                {missingFields.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setShowValidationModal(true)}
                    style={{ alignItems: 'center', paddingVertical: 8, marginTop: -4 }}
                  >
                    <Text style={{ fontSize: 13, color: COLORS.muted, fontWeight: '600', textAlign: 'center' }}>
                      ¿Dudas sobre qué datos faltan? <Text style={{ color: COLORS.primary, fontWeight: '800', textDecorationLine: 'underline' }}>Toca aquí para ver la lista de pendientes ({missingFields.length})</Text>
                    </Text>
                  </TouchableOpacity>
                )}
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
        visitReason={visitReason}
        fromDate={fromDate}
        toDate={toDate}
        onClose={() => { setShowSuccess(false); router.replace('/dashboard'); }} 
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
        minDate={modalTarget === 'to' ? fromDate : todayDate}
        onSelect={(val: string) => {
          if (modalTarget === 'from') {
            setFromDate(val);
            // Al cambiar la Vigencia Desde, cambiar automáticamente la fecha Hasta al mismo día
            setToDate(val);
          } else {
            setToDate(val);
          }
          setShowDatePicker(false);
        }}
      />

      <ValidationModal 
        visible={showValidationModal} 
        onClose={() => setShowValidationModal(false)} 
        missingFields={missingFields} 
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
        <ScrollView 
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={[styles.sideContent, { flexGrow: 1, paddingBottom: 30 }]}
          showsVerticalScrollIndicator={true}
        >
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
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

function MobileHeader() {
  const router = useRouter();
  return (
    <View style={[styles.mobHeader, { paddingRight: 50, flexDirection: 'row', alignItems: 'center' }]}>
      <TouchableOpacity 
        onPress={() => router.push('/dashboard')}
        style={{ marginRight: 10, padding: 8, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.line }}
      >
        <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
      </TouchableOpacity>
      <Ionicons name="shield-checkmark" size={28} color={COLORS.primary} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.mobTitle} numberOfLines={1}>Secretaría Jurídica</Text>
        <Text style={styles.mobSub} numberOfLines={1}>Control de Acceso</Text>
      </View>
    </View>
  );
}

function Hero({ 
  progress, 
  missingCount, 
  onPressMissing 
}: { 
  progress: number; 
  missingCount: number; 
  onPressMissing: () => void; 
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <View style={{ flex: 1, minWidth: 160, marginRight: 8 }}>
          <Text style={styles.heroTitle}>Nuevo Ingreso</Text>
          <Text style={styles.heroSub}>Complete la información requerida</Text>
        </View>
        <View style={styles.pill}><Text style={styles.pillText}>Seguro</Text></View>
      </View>
      <View style={styles.barContainer}>
        <View style={styles.barBg}>
          <Animated.View style={[styles.barFill, { width: `${progress}%` }]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
          <Text style={styles.barLabel}>{progress}% Completado</Text>
          {missingCount > 0 ? (
            <TouchableOpacity 
              onPress={onPressMissing}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                gap: 6, 
                backgroundColor: '#FEF2F2', 
                paddingHorizontal: 10, 
                paddingVertical: 5, 
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#FCA5A5'
              }}
            >
              <Ionicons name="alert-circle" size={15} color="#DC2626" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>
                Faltan {missingCount} dato{missingCount > 1 ? 's' : ''} (Ver qué falta)
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0' }}>
              <Ionicons name="checkmark-circle" size={15} color="#059669" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>
                Todos los datos listos
              </Text>
            </View>
          )}
        </View>
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
          <Text style={[styles.cardTitle, { flex: 1, flexWrap: 'wrap' }]}>{title}</Text>
        </View>
        {right && <View style={{ alignSelf: 'flex-start' }}>{right}</View>}
      </View>
      <View style={styles.cardBody}>
        {children}
      </View>
    </BlurView>
  );
}

function Field({ label, icon, hasError, errorText, required = true, ...props }: any) {
  return (
    <View style={styles.field}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginLeft: 4 }}>
        <Text style={[styles.label, { marginBottom: 0, marginLeft: 0 }, hasError && { color: '#DC2626', fontWeight: '800' }]}>
          {label} {required && <Text style={{ color: '#DC2626' }}>*</Text>}
        </Text>
        {hasError && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="alert-circle" size={12} color="#DC2626" />
            <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700' }}>
              {errorText || 'Obligatorio'}
            </Text>
          </View>
        )}
      </View>
      <View style={[
        styles.inputWrap,
        hasError && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }
      ]}>
        {icon && <Ionicons name={icon} size={18} color={hasError ? '#DC2626' : COLORS.muted} style={{ marginRight: 10 }} />}
        <TextInput 
          placeholderTextColor={hasError ? '#F87171' : '#94A3B8'} 
          style={styles.input} 
          {...props} 
        />
      </View>
    </View>
  );
}

function ValidationModal({ visible, onClose, missingFields }: { visible: boolean; onClose: () => void; missingFields: MissingField[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, MissingField[]>();
    missingFields.forEach(item => {
      const arr = map.get(item.section) || [];
      arr.push(item);
      map.set(item.section, arr);
    });
    return Array.from(map.entries());
  }, [missingFields]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBlur}>
        <BlurView intensity={25} style={StyleSheet.absoluteFill} />
        <View style={[styles.modalPanel, { maxWidth: 540, maxHeight: '85%', padding: 24 }]}>
          {/* Encabezado */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingBottom: 14, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FCA5A5' }}>
                <Ionicons name="alert-circle" size={26} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>
                  ¿Qué datos faltan para radicar?
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.muted, fontWeight: '600', marginTop: 2 }}>
                  Faltan {missingFields.length} campo{missingFields.length > 1 ? 's' : ''} obligatorio{missingFields.length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Banner de guía */}
          <View style={{ backgroundColor: '#FFFBEB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 14 }}>
            <Text style={{ fontSize: 12, color: '#B45309', fontWeight: '700', lineHeight: 18 }}>
              Para procesar y autorizar el acceso en portería de la entidad, por favor completa los siguientes puntos pendientes:
            </Text>
          </View>

          {/* Lista agrupada */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
            <View style={{ gap: 12, paddingRight: 4 }}>
              {grouped.map(([sectionTitle, items]) => (
                <View key={sectionTitle} style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.line }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.3 }}>
                      {sectionTitle.toUpperCase()}
                    </Text>
                    <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#B91C1C' }}>
                        {items.length} pendiente{items.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: 8 }}>
                    {items.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' }}>
                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginTop: 2 }}>
                          <Ionicons name={item.icon || 'alert-circle-outline'} size={16} color="#DC2626" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                            {item.field}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 17, marginTop: 2, fontWeight: '500' }}>
                            {item.description}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Botón de acción */}
          <TouchableOpacity 
            style={[styles.modalBtn, { marginTop: 18 }]} 
            onPress={onClose}
          >
            <Text style={styles.modalBtnText}>ENTENDIDO, COMPLETAR DATOS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PolicyModal({ visible, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBlur}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={styles.modalPanel}>
          <View style={styles.modalHead}>
            <Text style={[styles.modalTitle, { fontSize: 16 }]}>Manual de la Política de Tratamiento y Protección de Datos Personales</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            <Text style={styles.modalText}>
              En cumplimiento de la Ley 1581 de 2012 y el Manual de la Política de Tratamiento y Protección de Datos Personales de la Secretaría Jurídica Distrital, informamos que los datos capturados serán utilizados para fines de seguridad, control de acceso y trámites administrativos institucionales.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://secretariajuridica.gov.co/manual-de-la-politica-de-tratamiento-y-proteccion-de-datos-personales')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingVertical: 6 }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>
                Ver Manual Oficial en el sitio web
              </Text>
              <Ionicons name="open-outline" size={16} color={COLORS.primary} />
            </TouchableOpacity>
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
  visitReason,
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
              
              {/* Bloque de Anfitrión y Motivo */}
              <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Anfitrión:</Text> {responsible.name}</Text>
              <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Dependencia:</Text> {responsible.dependency}</Text>
              <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Contacto / Ext:</Text> {responsible.phone || 'N/A'}</Text>
              {visitReason ? (
                <Text style={{ fontSize: 14, color: COLORS.text }}><Text style={{fontWeight:'900', color: COLORS.text}}>Motivo:</Text> {visitReason}</Text>
              ) : null}
              
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
  sidebar: { width: 380, height: '100%', overflow: 'hidden' },
  sideBg: { flex: 1 },
  sideContent: { padding: 40, justifyContent: 'center', minHeight: '100%' },
  logoRing: { width: 90, height: 90, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  sideTitle: { color: COLORS.white, fontSize: 32, fontWeight: '900', lineHeight: 38 },
  sideSub: { color: 'rgba(255,255,255,0.8)', fontSize: 18, marginTop: 5 },
  sideDivider: { width: 50, height: 4, backgroundColor: COLORS.accent, marginVertical: 25, borderRadius: 2 },
  sideDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 16, lineHeight: 24 },
  sideBadge: { marginTop: 30, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignSelf: 'flex-start' },
  badgeText: { color: COLORS.white, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  
  mobHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingRight: 45 },
  mobTitle: { fontSize: 19, fontWeight: '900', color: COLORS.text },
  mobSub: { fontSize: 13, color: COLORS.muted },
  
  hero: { backgroundColor: COLORS.white, borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: COLORS.line, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, elevation: 2 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  heroSub: { color: COLORS.muted, marginTop: 2, fontSize: 13 },
  pill: { backgroundColor: COLORS.soft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  pillText: { color: COLORS.primary, fontWeight: '800', fontSize: 10, textTransform: 'uppercase' },
  barContainer: { marginTop: 16 },
  barBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 10, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 10 },
  barLabel: { marginTop: 6, fontSize: 11, fontWeight: '700', color: COLORS.muted, textAlign: 'right' },
  
  card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line, marginBottom: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)', flexWrap: 'wrap', gap: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 150 },
  iconBox: { width: 32, height: 32, borderRadius: 9, backgroundColor: COLORS.soft, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, flexShrink: 1 },
  cardBody: { padding: 16 },
  
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
  modalBtn: { backgroundColor: COLORS.primary, width: '100%', height: 54, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  modalBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
});

const getNextDays = (count = 60) => {
  const days = [];
  const locale = 'es-ES';
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
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

function DateTimePickerModal({ visible, onClose, title, value, minDate, onSelect }: any) {
  const days = useMemo(() => getNextDays(60), []);
  
  const [selectedDate, setSelectedDate] = useState(value || days[0]?.dateString);

  // Actualizar estados internos si cambia el value o minDate al abrir el modal
  React.useEffect(() => {
    if (visible) {
      if (value) {
        if (minDate && value < minDate) {
          setSelectedDate(minDate);
        } else {
          setSelectedDate(value);
        }
      } else if (minDate) {
        setSelectedDate(minDate);
      } else if (days[0]) {
        setSelectedDate(days[0].dateString);
      }
    }
  }, [visible, value, minDate]);

  const handleConfirm = () => {
    if (minDate && selectedDate < minDate) {
      return;
    }
    onSelect(selectedDate);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBlur}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={[styles.modalPanel, { maxWidth: 360, padding: 20 }]}>
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
            {minDate && (
              <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 4, fontWeight: '600' }}>
                Fechas anteriores a {minDate} bloqueadas
              </Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', height: 270, gap: 10, marginBottom: 20 }}>
            {/* Columna Fecha */}
            <View style={{ flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#F1F5F9', padding: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: COLORS.muted }}>FECHA DISPONIBLE</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {days.map((d) => {
                  const isBlocked = minDate ? d.dateString < minDate : false;
                  const isSelected = d.dateString === selectedDate;
                  return (
                    <TouchableOpacity 
                      key={d.dateString}
                      disabled={isBlocked}
                      style={{ 
                        paddingVertical: 10, 
                        paddingHorizontal: 8, 
                        backgroundColor: isSelected ? COLORS.primary : isBlocked ? '#F8FAFC' : 'transparent',
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(0,0,0,0.03)',
                        alignItems: 'center',
                        opacity: isBlocked ? 0.35 : 1
                      }}
                      onPress={() => !isBlocked && setSelectedDate(d.dateString)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {isBlocked && <Ionicons name="lock-closed" size={10} color={COLORS.muted} />}
                        <Text style={{ 
                          fontSize: 10, 
                          color: isSelected ? COLORS.accent : COLORS.muted, 
                          fontWeight: '800',
                          textDecorationLine: isBlocked ? 'line-through' : 'none'
                        }}>
                          {d.dayName} {isBlocked ? '(Bloqueado)' : ''}
                        </Text>
                      </View>
                      <Text style={{ 
                        fontSize: 14, 
                        color: isSelected ? COLORS.white : isBlocked ? '#94A3B8' : COLORS.text, 
                        fontWeight: '900', 
                        marginTop: 2 
                      }}>
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
