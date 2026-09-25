import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, useWindowDimensions, Modal, ImageBackground, Animated, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { DependencySelector } from '../../components/DependencySelector';
import { GuideModalButton } from '../../components/GuideModalButton';
import { supabase } from '../../lib/supabase';
import { requestService } from '../../lib/requestService';
import { vehicleService, resolveVehicleLimitByCharge, getVehicleType } from '../../lib/vehicleService';
import ConfirmActionModal from '../../components/ConfirmActionModal';

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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
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

  // Estados de Control de Vehículos
  const [registeredVehicles, setRegisteredVehicles] = useState<any[]>([]);
  const [maxLimit, setMaxLimit] = useState<number>(3);
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [vType, setVType] = useState<'carro' | 'moto'>('carro');
  const [vPlate, setVPlate] = useState('');
  const [vBrand, setVBrand] = useState('');
  const [vModel, setVModel] = useState('');
  const [vColor, setVColor] = useState('');
  const [vError, setVError] = useState('');
  const [vSaving, setVSaving] = useState(false);

  // Modal de Confirmación para Vehículos (Inactivar, Activar, Eliminar)
  const [vehicleActionModal, setVehicleActionModal] = useState<{
    visible: boolean;
    type: 'inactivate' | 'activate' | 'delete';
    vehicle: any | null;
  }>({ visible: false, type: 'inactivate', vehicle: null });

  // Modal Informativo / Alerta personalizada (reemplazo de alert)
  const [infoModal, setInfoModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    isError?: boolean;
  }>({ visible: false, title: '', message: false as any });

  const loadUserVehiclesAndLimit = async () => {
    try {
      setLoadingVehicles(true);
      const vehiclesData = await vehicleService.getAll();
      setRegisteredVehicles(vehiclesData || []);
      const vWithCharge = vehiclesData?.find((v: any) => v.charge && v.charge.trim());
      if (vWithCharge?.charge) {
        setCharge(prev => prev || vWithCharge.charge || '');
      }
    } catch (err) {
      console.warn('Error al cargar vehículos del usuario:', err);
    } finally {
      setLoadingVehicles(false);
    }
  };

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
            const firstWithCharge = parks.find(p => p.metadata?.charge);
            if (firstWithCharge?.metadata?.charge) {
              setCharge(prev => prev || firstWithCharge.metadata.charge || '');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user for parking prefill:', err);
      }
    };
    fetchUserLdapDataAndVehicles();
    loadUserVehiclesAndLimit();
  }, []);

  const activeVehiclesCount = useMemo(() => {
    return registeredVehicles.filter(v => v.is_active !== false).length;
  }, [registeredVehicles]);

  const chargeLimitInfo = useMemo(() => {
    return resolveVehicleLimitByCharge(charge);
  }, [charge]);

  const submittingVehicleRef = useRef(false);

  const openCreateVehicleModal = () => {
    if (!chargeLimitInfo.canRegister || chargeLimitInfo.maxLimit === 0) {
      setInfoModal({
        visible: true,
        title: 'Asignación No Habilitada',
        message: chargeLimitInfo.reason || 'Según los lineamientos institucionales, el parqueadero permanente es de uso exclusivo para funcionarios de planta, directores y asesores. El personal contratista no cuenta con asignación de cupo permanente.',
        isError: true
      });
      return;
    }

    if (!chargeLimitInfo.isUnlimited && activeVehiclesCount >= chargeLimitInfo.maxLimit) {
      setInfoModal({
        visible: true,
        title: 'Cupo Máximo Alcanzado',
        message: `Para cargos de ${chargeLimitInfo.label}, el cupo máximo permitido es de ${chargeLimitInfo.maxLimit} vehículo activo. Si tienes un nuevo vehículo, por favor inactiva tu vehículo actual registrado antes de continuar.`,
        isError: true
      });
      return;
    }

    setEditingVehicle(null);
    setVType('carro');
    setVPlate('');
    setVBrand('');
    setVModel('');
    setVColor('');
    setVError('');
    setVehicleModalVisible(true);
  };

  const openEditVehicleModal = (v: any) => {
    setEditingVehicle(v);
    setVType(getVehicleType(v));
    setVPlate(v.plate || '');
    setVBrand(v.brand || '');
    setVModel(v.model || '');
    setVColor(v.color || '');
    if (v.name) setName(v.name);
    if (v.doc) setDoc(v.doc);
    if (v.charge) setCharge(v.charge);
    if (v.dependency) setDependency(v.dependency);
    setVError('');
    setVehicleModalVisible(true);
  };

  const handleSaveVehicle = async () => {
    if (submittingVehicleRef.current || vSaving) return;

    try {
      setVError('');
      const cleanPlate = vPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanBrand = vBrand.trim();
      const cleanName = name.trim();
      const cleanDoc = doc.trim();
      const cleanCharge = charge.trim();
      const cleanDep = dependency.trim();
      const limitInfo = resolveVehicleLimitByCharge(cleanCharge);

      if (!cleanPlate || !cleanBrand) {
        setVError('La placa y la marca del vehículo son obligatorias.');
        return;
      }

      if (cleanPlate.length < 5 || cleanPlate.length > 7) {
        setVError('La placa debe tener entre 5 y 7 caracteres alfanuméricos.');
        return;
      }

      if (!editingVehicle) {
        if (!cleanName || !cleanDoc || !cleanCharge || !cleanDep) {
          setVError('Por favor completa el nombre, cédula, cargo y dependencia del conductor.');
          return;
        }

        if (!limitInfo.canRegister || limitInfo.maxLimit === 0) {
          setVError(limitInfo.reason || 'El personal contratista no tiene habilitada asignación de parqueadero permanente.');
          return;
        }

        if (!limitInfo.isUnlimited && activeVehiclesCount >= limitInfo.maxLimit) {
          setVError(`Para ${limitInfo.label}s, el límite máximo permitido es de ${limitInfo.maxLimit} vehículo activo. Por favor inactiva tu vehículo actual antes de inscribir uno nuevo.`);
          return;
        }

        const duplicateInList = registeredVehicles.some(
          v => v.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlate
        );
        if (duplicateInList) {
          setVError(`Ya tienes registrado un vehículo con la placa ${cleanPlate}.`);
          return;
        }
      }

      submittingVehicleRef.current = true;
      setVSaving(true);

      if (editingVehicle) {
        await vehicleService.update(editingVehicle.id, {
          plate: cleanPlate,
          brand: cleanBrand,
          model: vModel.trim() || undefined,
          color: vColor.trim() || undefined,
          name: cleanName || undefined,
          doc: cleanDoc || undefined,
          charge: cleanCharge || undefined,
          dependency: cleanDep || undefined,
          vehicle_type: vType
        });
        setVehicleModalVisible(false);
        await loadUserVehiclesAndLimit();
        setInfoModal({
          visible: true,
          title: 'Vehículo Actualizado',
          message: `El vehículo con placa ${cleanPlate} ha sido actualizado correctamente.`
        });
      } else {
        // 1. Inscribir vehículo en perfil (con estado pendiente de aprobación)
        await vehicleService.create({
          plate: cleanPlate,
          brand: cleanBrand,
          model: vModel.trim() || undefined,
          color: vColor.trim() || undefined,
          name: cleanName,
          doc: cleanDoc,
          charge: cleanCharge,
          dependency: cleanDep,
          vehicle_type: vType,
          notes: `Vehículo inscrito por el usuario (${vType === 'moto' ? 'Motocicleta' : 'Automóvil'})`
        });

        // 2. Radicar solicitud administrativa de cupo de parqueadero
        const { data: { user } } = await supabase.auth.getUser();
        await requestService.create({
          user_id: user?.id || null,
          title: `Parqueadero: ${cleanPlate}`,
          description: `Solicitud de cupo para vehículo ${cleanBrand} (${vColor.trim() || 'Sin color'}) - Conductor: ${cleanName}`,
          category: 'parking',
          priority: 'media',
          metadata: {
            name: cleanName,
            doc: cleanDoc,
            dependency: cleanDep,
            charge: cleanCharge,
            plate: cleanPlate,
            brand: cleanBrand,
            model: vModel.trim() || undefined,
            color: vColor.trim() || undefined
          }
        });

        setVehicleModalVisible(false);
        await loadUserVehiclesAndLimit();
        setInfoModal({
          visible: true,
          title: '¡Vehículo Registrado y Solicitud Radicada!',
          message: `El vehículo con placa ${cleanPlate} ha sido inscrito en tu perfil y tu solicitud de parqueadero quedó en estado "Pendiente de Aprobación". Servicios Generales evaluará la solicitud y te notificará por correo institucional.`
        });
      }
    } catch (err: any) {
      console.error('Error al guardar vehículo:', err);
      setVError(err.message || 'No se pudo guardar el vehículo. Intente nuevamente.');
    } finally {
      setVSaving(false);
      submittingVehicleRef.current = false;
    }
  };

  const handleRequestForExistingVehicle = async (v: any) => {
    if (submittingVehicleRef.current || loading) return;

    const isPending = v.approval_status === 'pendiente' || v.status === 'pendiente';
    if (isPending) {
      setInfoModal({
        visible: true,
        title: 'Solicitud en Trámite',
        message: `El vehículo con placa ${v.plate} ya tiene una solicitud pendiente de aprobación en el sistema.`,
      });
      return;
    }

    try {
      submittingVehicleRef.current = true;
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      await requestService.create({
        user_id: user?.id || null,
        title: `Parqueadero: ${v.plate}`,
        description: `Solicitud de cupo para vehículo ${v.brand} (${v.color || 'Sin color'}) - Conductor: ${v.name || name}`,
        category: 'parking',
        priority: 'media',
        metadata: {
          name: v.name || name,
          doc: v.doc || doc,
          dependency: v.dependency || dependency,
          charge: charge,
          plate: v.plate,
          brand: v.brand,
          model: v.model,
          color: v.color
        }
      });

      await vehicleService.update(v.id, { approval_status: 'pendiente' });
      await loadUserVehiclesAndLimit();

      setInfoModal({
        visible: true,
        title: '¡Solicitud Radicada!',
        message: `Se ha enviado la solicitud de parqueadero para el vehículo placa ${v.plate}. Su estado actual es "Pendiente de Aprobación".`
      });
    } catch (err: any) {
      console.error('Error al radicar solicitud para vehículo existente:', err);
      setInfoModal({
        visible: true,
        title: 'Error',
        message: err.message || 'No se pudo radicar la solicitud. Intente nuevamente.',
        isError: true
      });
    } finally {
      setLoading(false);
      submittingVehicleRef.current = false;
    }
  };

  const handleConfirmVehicleAction = async () => {
    const { type, vehicle } = vehicleActionModal;
    if (!vehicle) return;

    try {
      setLoading(true);
      if (type === 'delete') {
        await vehicleService.delete(vehicle.id);
        setInfoModal({
          visible: true,
          title: 'Vehículo Eliminado',
          message: `El vehículo con placa ${vehicle.plate} ha sido eliminado.`
        });
      } else if (type === 'inactivate') {
        await vehicleService.toggleActive(vehicle.id, false);
        setInfoModal({
          visible: true,
          title: 'Vehículo Inactivado',
          message: `El vehículo con placa ${vehicle.plate} ha sido inactivado.`
        });
      } else if (type === 'activate') {
        await vehicleService.toggleActive(vehicle.id, true);
        setInfoModal({
          visible: true,
          title: 'Vehículo Reactivado',
          message: `El vehículo con placa ${vehicle.plate} ha sido reactivado.`
        });
      }
      setVehicleActionModal({ visible: false, type: 'inactivate', vehicle: null });
      await loadUserVehiclesAndLimit();
    } catch (err: any) {
      console.error('Error al ejecutar acción sobre vehículo:', err);
      setInfoModal({
        visible: true,
        title: 'Error',
        message: err.message || 'No se pudo completar la acción.',
        isError: true
      });
    } finally {
      setLoading(false);
    }
  };

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
      const trimmedPlate = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
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

      // Si el vehículo aún no está en la lista de vehículos, registrarlo o asegurar su existencia
      const alreadyHasVehicle = registeredVehicles.some(
        v => v.plate.toUpperCase() === trimmedPlate
      );
      if (!alreadyHasVehicle && activeVehiclesCount < maxLimit) {
        try {
          await vehicleService.create({
            plate: trimmedPlate,
            brand: trimmedBrand,
            color: color.trim() || undefined,
            name: trimmedName,
            doc: trimmedDoc,
            dependency: trimmedDependency
          });
          await loadUserVehiclesAndLimit();
        } catch (_) {}
      }

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
      <GuideModalButton
        imageSource={require('../../assets/guides/parqueadero.jpg')}
        title="Guía - Asignación de Parqueadero"
        subtitle="Flujograma y procedimiento de asignación y registro vehicular"
        themeColor={COLORS.primary}
      />
      <LinearGradient colors={['#F1F5F9', '#FFFFFF']} style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
          
          {isDesktop && <Sidebar />}

          <ScrollView 
            contentContainerStyle={{ 
              padding: isDesktop ? 40 : 14, 
              paddingBottom: 60,
              flexGrow: 1
            }}
            showsVerticalScrollIndicator={false}
          >
            <ResponsiveContainer>
              {!isDesktop && <MobileHeader />}

              <Hero progress={progress} />

              <View style={{ gap: 18 }}>
                {/* 1. SECCIÓN DE GESTIÓN INTEGRAL DE VEHÍCULOS DEL USUARIO */}
                <Card 
                  title="Mis Vehículos Registrados" 
                  icon="car-sport"
                  right={
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: !chargeLimitInfo.canRegister 
                          ? '#94A3B8' 
                          : (!chargeLimitInfo.isUnlimited && activeVehiclesCount >= chargeLimitInfo.maxLimit)
                          ? '#F59E0B'
                          : COLORS.primary,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 10,
                      }}
                      onPress={openCreateVehicleModal}
                    >
                      <Ionicons 
                        name={!chargeLimitInfo.canRegister ? "lock-closed" : "add-circle"} 
                        size={16} 
                        color={COLORS.white} 
                      />
                      <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 12 }}>
                        {!chargeLimitInfo.canRegister 
                          ? 'No Habilitado (Contratista)' 
                          : (!chargeLimitInfo.isUnlimited && activeVehiclesCount >= chargeLimitInfo.maxLimit)
                          ? '+ Registrar (Cupo 1/1)'
                          : '+ Registrar Nuevo Vehículo'}
                      </Text>
                    </TouchableOpacity>
                  }
                >
                  {/* Contador dinámico de cupo según cargo */}
                  <View style={{ 
                    backgroundColor: chargeLimitInfo.type === 'directivo' 
                      ? '#EFF6FF' 
                      : chargeLimitInfo.type === 'contratista' 
                      ? '#FEF2F2' 
                      : '#F8FAFC', 
                    borderRadius: 14, 
                    padding: 12, 
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: chargeLimitInfo.type === 'directivo' 
                      ? '#BFDBFE' 
                      : chargeLimitInfo.type === 'contratista' 
                      ? '#FECACA' 
                      : COLORS.line 
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons 
                          name={
                            chargeLimitInfo.type === 'directivo' 
                              ? 'ribbon' 
                              : chargeLimitInfo.type === 'contratista' 
                              ? 'alert-circle' 
                              : 'speedometer-outline'
                          } 
                          size={16} 
                          color={
                            chargeLimitInfo.type === 'directivo' 
                              ? '#2563EB' 
                              : chargeLimitInfo.type === 'contratista' 
                              ? '#DC2626' 
                              : COLORS.muted
                          } 
                        />
                        <Text style={{ 
                          fontSize: 12, 
                          fontWeight: '800', 
                          color: chargeLimitInfo.type === 'directivo' 
                            ? '#1E40AF' 
                            : chargeLimitInfo.type === 'contratista' 
                            ? '#B91C1C' 
                            : COLORS.muted 
                        }}>
                          {chargeLimitInfo.type === 'directivo'
                            ? `Capacidad: Directivo (${charge || 'Directivo'})`
                            : chargeLimitInfo.type === 'contratista'
                            ? `Capacidad: Contratista (${charge || 'Contratista'})`
                            : `Capacidad: ${chargeLimitInfo.label} (${charge || 'Planta'})`}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: chargeLimitInfo.type === 'directivo'
                          ? '#DBEAFE'
                          : chargeLimitInfo.type === 'contratista'
                          ? '#FEE2E2'
                          : activeVehiclesCount >= 1
                          ? '#FEE2E2'
                          : '#EFF6FF',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                      }}>
                        <Text style={{ 
                          fontSize: 12, 
                          fontWeight: '900', 
                          color: chargeLimitInfo.type === 'directivo'
                            ? '#1D4ED8'
                            : chargeLimitInfo.type === 'contratista'
                            ? '#DC2626'
                            : activeVehiclesCount >= 1
                            ? '#DC2626'
                            : '#2563EB' 
                        }}>
                          {chargeLimitInfo.type === 'directivo'
                            ? `${activeVehiclesCount} Activos • Sin Límite 🌟`
                            : chargeLimitInfo.type === 'contratista'
                            ? `0 Cupos • No Habilitado ⛔`
                            : `${activeVehiclesCount} / 1 Activo`}
                        </Text>
                      </View>
                    </View>

                    {/* Barra de progreso de cupo */}
                    {chargeLimitInfo.type === 'directivo' ? (
                      <Text style={{ fontSize: 11, color: '#3B82F6', marginTop: 2 }}>
                        Los cargos directivos no tienen límite en el número de vehículos activos registrados en el sistema.
                      </Text>
                    ) : chargeLimitInfo.type === 'contratista' ? (
                      <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>
                        De acuerdo con los lineamientos distritales, el parqueadero permanente es exclusivo para funcionarios de planta, directores y asesores.
                      </Text>
                    ) : (
                      <>
                        <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 6, overflow: 'hidden', marginTop: 4 }}>
                          <View style={{ 
                            height: '100%', 
                            width: `${Math.min(100, (activeVehiclesCount / 1) * 100)}%`,
                            backgroundColor: activeVehiclesCount >= 1 ? '#EF4444' : '#10B981'
                          }} />
                        </View>
                        <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>
                          {activeVehiclesCount >= 1 
                            ? 'Has alcanzado el límite máximo de 1 vehículo activo. Para registrar otro automotor debes inactivar el actual.' 
                            : 'Tienes disponible el cupo para registrar tu vehículo institucional (máximo 1 vehículo activo).'}
                        </Text>
                      </>
                    )}
                  </View>

                  {/* Resumen de Celda Asignada del Usuario */}
                  {(() => {
                    const fixedVehicle = registeredVehicles.find(v => v.spot_code);
                    if (!fixedVehicle && registeredVehicles.length === 0) return null;

                    return (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        borderRadius: 14,
                        backgroundColor: fixedVehicle ? '#EFF6FF' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: fixedVehicle ? '#BFDBFE' : '#E2E8F0',
                        marginBottom: 12
                      }}>
                        <View style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: fixedVehicle ? '#2563EB' : '#64748B',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          <Ionicons name={fixedVehicle ? "key" : "infinite"} size={20} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: fixedVehicle ? '#1E40AF' : '#1E293B' }}>
                            {fixedVehicle ? `Tu Celda Fija Asignada: ${fixedVehicle.spot_code}` : 'Modalidad de Ingreso: Parqueadero de Uso Libre'}
                          </Text>
                          <Text style={{ fontSize: 11, color: fixedVehicle ? '#3B82F6' : '#64748B', marginTop: 1 }}>
                            {fixedVehicle 
                              ? `Asignada a tu vehículo placa ${fixedVehicle.plate}. Tienes prioridad de estacionamiento en esta celda.`
                              : 'Tus vehículos registrados y activos pueden ingresar y ocupar cualquier celda disponible de uso general.'}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Listado de Vehículos */}
                  {registeredVehicles.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <Ionicons name="car-outline" size={42} color="#94A3B8" style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.text, textAlign: 'center' }}>
                        No tienes vehículos registrados
                      </Text>
                      <Text style={{ fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 4, marginBottom: 16, maxWidth: 360, lineHeight: 18 }}>
                        Para solicitar cupo de parqueadero, inscribe tu vehículo completando los datos del conductor y del automotor.
                      </Text>
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: COLORS.primary,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 12,
                        }}
                        onPress={openCreateVehicleModal}
                      >
                        <Ionicons name="add-circle" size={18} color={COLORS.white} />
                        <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 13 }}>
                          + Registrar Nuevo Vehículo
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {registeredVehicles.map((v) => {
                        const isVehicleActive = v.is_active !== false;
                        const isPending = v.approval_status === 'pendiente' || v.status === 'pendiente';
                        const isRejected = v.approval_status === 'rechazado';
                        const hasFixedSpot = !!v.spot_code;
                        const isMoto = getVehicleType(v) === 'moto';
                        
                        return (
                          <View 
                            key={v.id} 
                            style={{ 
                              padding: 14, 
                              backgroundColor: isVehicleActive ? '#FFFFFF' : '#F8FAFC', 
                              borderRadius: 16, 
                              borderWidth: 1, 
                              borderColor: isVehicleActive ? COLORS.line : '#CBD5E1',
                              opacity: isVehicleActive ? 1 : 0.75
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                              {/* Placa y descripción */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
                                {/* Badge Placa Colombiana */}
                                <View style={{
                                  backgroundColor: '#FDE047',
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 8,
                                  borderWidth: 1.5,
                                  borderColor: '#000000',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: 85,
                                  shadowColor: '#000',
                                  shadowOpacity: 0.08,
                                  shadowRadius: 2,
                                  elevation: 1
                                }}>
                                  <Text style={{
                                    fontSize: 14,
                                    fontWeight: '900',
                                    color: '#000000',
                                    letterSpacing: 1.2,
                                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
                                  }}>
                                    {v.plate}
                                  </Text>
                                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#334155', textTransform: 'uppercase', marginTop: -2 }}>
                                    BOGOTÁ D.C.
                                  </Text>
                                </View>

                                {/* Datos de Marca y Modelo */}
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text }}>
                                    {v.brand} {v.model ? `• ${v.model}` : ''}
                                  </Text>
                                  <Text style={{ fontSize: 12, color: COLORS.muted }}>
                                    Color: {v.color || 'No especificado'}
                                  </Text>
                                </View>
                              </View>

                              {/* Badges de Tipo, Estado y Celda */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {/* Badge Tipo Carro / Moto */}
                                <View style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4,
                                  backgroundColor: isMoto ? '#FFFBEB' : '#EFF6FF',
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: isMoto ? '#FDE68A' : '#BFDBFE'
                                }}>
                                  <Ionicons name={isMoto ? 'bicycle' : 'car-sport'} size={12} color={isMoto ? '#D97706' : '#2563EB'} />
                                  <Text style={{
                                    fontSize: 10,
                                    fontWeight: '800',
                                    color: isMoto ? '#D97706' : '#2563EB',
                                    textTransform: 'uppercase'
                                  }}>
                                    {isMoto ? 'Moto' : 'Carro'}
                                  </Text>
                                </View>

                                {/* Badge Estado */}
                                <View style={{
                                  backgroundColor: isPending ? '#FEF3C7' : isRejected ? '#FEE2E2' : isVehicleActive ? '#ECFDF5' : '#F1F5F9',
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: isPending ? '#FDE68A' : isRejected ? '#FECACA' : isVehicleActive ? '#A7F3D0' : '#CBD5E1'
                                }}>
                                  <Text style={{
                                    fontSize: 10,
                                    fontWeight: '800',
                                    color: isPending ? '#B45309' : isRejected ? '#DC2626' : isVehicleActive ? '#065F46' : '#64748B',
                                    textTransform: 'uppercase'
                                  }}>
                                    {isPending ? '⏳ Pendiente de Aprobación' : isRejected ? '✕ Rechazado' : isVehicleActive ? '● Activo' : '○ Inactivo'}
                                  </Text>
                                </View>

                                {/* Badge Celda */}
                                <View style={{
                                  backgroundColor: hasFixedSpot ? '#EFF6FF' : '#F5F3FF',
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: hasFixedSpot ? '#BFDBFE' : '#DDD6FE'
                                }}>
                                  <Text style={{
                                    fontSize: 10,
                                    fontWeight: '800',
                                    color: hasFixedSpot ? '#1D4ED8' : '#6D28D9'
                                  }}>
                                    {hasFixedSpot ? `Celda Fija: ${v.spot_code}` : 'Uso Libre'}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {/* Botones de acción del vehículo */}
                            <View style={{ 
                              flexDirection: 'row', 
                              justifyContent: 'flex-end', 
                              alignItems: 'center', 
                              gap: 8, 
                              marginTop: 12, 
                              paddingTop: 10, 
                              borderTopWidth: 1, 
                              borderTopColor: '#F1F5F9' 
                            }}>
                              {isPending ? (
                                <View style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 5,
                                  backgroundColor: '#FEF3C7',
                                  paddingHorizontal: 9,
                                  paddingVertical: 5,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: '#FDE68A'
                                }}>
                                  <Ionicons name="time-outline" size={13} color="#B45309" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>
                                    En trámite de aprobación
                                  </Text>
                                </View>
                              ) : isVehicleActive ? (
                                <TouchableOpacity
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 5,
                                    backgroundColor: '#EFF6FF',
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#BFDBFE'
                                  }}
                                  onPress={() => handleRequestForExistingVehicle(v)}
                                >
                                  <Ionicons name="key-outline" size={13} color="#2563EB" />
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>
                                    Solicitar Cupo
                                  </Text>
                                </TouchableOpacity>
                              ) : null}

                              <TouchableOpacity
                                style={{
                                  padding: 7,
                                  borderRadius: 8,
                                  backgroundColor: '#F8FAFC',
                                  borderWidth: 1,
                                  borderColor: COLORS.line
                                }}
                                onPress={() => openEditVehicleModal(v)}
                                accessibilityLabel="Editar"
                              >
                                <Ionicons name="pencil-outline" size={16} color="#334155" />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{
                                  padding: 7,
                                  borderRadius: 8,
                                  backgroundColor: isVehicleActive ? '#FEF3C7' : '#DCFCE7',
                                  borderWidth: 1,
                                  borderColor: isVehicleActive ? '#FDE68A' : '#BBF7D0'
                                }}
                                onPress={() => setVehicleActionModal({
                                  visible: true,
                                  type: isVehicleActive ? 'inactivate' : 'activate',
                                  vehicle: v
                                })}
                                accessibilityLabel={isVehicleActive ? 'Inactivar vehículo' : 'Reactivar vehículo'}
                              >
                                <Ionicons 
                                  name={isVehicleActive ? 'eye-off-outline' : 'checkmark-circle-outline'} 
                                  size={16} 
                                  color={isVehicleActive ? '#B45309' : '#15803D'} 
                                />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{
                                  padding: 7,
                                  borderRadius: 8,
                                  backgroundColor: '#FEF2F2',
                                  borderWidth: 1,
                                  borderColor: '#FECACA'
                                }}
                                onPress={() => setVehicleActionModal({
                                  visible: true,
                                  type: 'delete',
                                  vehicle: v
                                })}
                                accessibilityLabel="Eliminar vehículo"
                              >
                                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Card>

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

      {/* MODAL PARA AGREGAR / EDITAR VEHÍCULO */}
      <Modal
        visible={vehicleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVehicleModalVisible(false)}
      >
        <View style={styles.modalBlur}>
          <BlurView intensity={25} style={StyleSheet.absoluteFill} />
          <View style={[styles.modalPanel, { maxWidth: 540, width: '92%', padding: 22, maxHeight: '90%' }]}>
            {/* Header del Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.soft, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="car-sport" size={22} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { fontSize: 18, marginBottom: 2 }]}>
                    {editingVehicle ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted }}>
                    {editingVehicle ? 'Actualiza los datos registrados' : 'Inscripción y solicitud de cupo de parqueadero'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={{ padding: 6, borderRadius: 8, backgroundColor: '#F1F5F9' }} 
                onPress={() => setVehicleModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <View style={{ gap: 16 }}>
                
                {/* SECCIÓN 1: INFORMACIÓN DEL CONDUCTOR */}
                <View style={{ 
                  backgroundColor: '#F8FAFC', 
                  borderRadius: 14, 
                  padding: 14, 
                  borderWidth: 1, 
                  borderColor: '#E2E8F0',
                  gap: 12 
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Ionicons name="person" size={16} color={COLORS.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      1. Información del Conductor
                    </Text>
                  </View>

                  <View>
                    <Text style={styles.label}>Nombre Completo *</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="person-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Ej. Juan Pérez"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Cédula *</Text>
                      <View style={styles.inputWrap}>
                        <Ionicons name="card-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <TextInput
                          style={styles.input}
                          value={doc}
                          onChangeText={setDoc}
                          placeholder="Cédula / ID"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Cargo *</Text>
                      <View style={styles.inputWrap}>
                        <Ionicons name="briefcase-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <TextInput
                          style={styles.input}
                          value={charge}
                          onChangeText={setCharge}
                          placeholder="Ej. Asesor, Director"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Chips de selección rápida de tipo de cargo */}
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted, marginBottom: 6 }}>
                      Selección Rápida de Tipo de Cargo / Vinculación:
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 20,
                          borderWidth: 1,
                          backgroundColor: chargeLimitInfo.type === 'directivo' ? '#DBEAFE' : '#FFFFFF',
                          borderColor: chargeLimitInfo.type === 'directivo' ? '#2563EB' : '#CBD5E1'
                        }}
                        onPress={() => setCharge('Directivo')}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: chargeLimitInfo.type === 'directivo' ? '#1D4ED8' : '#64748B' }}>
                          👑 Directivo (Sin Límite)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 20,
                          borderWidth: 1,
                          backgroundColor: chargeLimitInfo.type === 'funcionario_asesor' ? '#EFF6FF' : '#FFFFFF',
                          borderColor: chargeLimitInfo.type === 'funcionario_asesor' ? '#2563EB' : '#CBD5E1'
                        }}
                        onPress={() => setCharge('Funcionario / Asesor')}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: chargeLimitInfo.type === 'funcionario_asesor' ? '#1D4ED8' : '#64748B' }}>
                          💼 Funcionario / Asesor (1 Cupo)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 20,
                          borderWidth: 1,
                          backgroundColor: chargeLimitInfo.type === 'contratista' ? '#FEE2E2' : '#FFFFFF',
                          borderColor: chargeLimitInfo.type === 'contratista' ? '#DC2626' : '#CBD5E1'
                        }}
                        onPress={() => setCharge('Contratista')}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: chargeLimitInfo.type === 'contratista' ? '#B91C1C' : '#64748B' }}>
                          📋 Contratista (0 Cupos)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Banner explicativo del cargo seleccionado */}
                  <View style={{
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: chargeLimitInfo.type === 'directivo'
                      ? '#EFF6FF'
                      : chargeLimitInfo.type === 'contratista'
                      ? '#FEF2F2'
                      : activeVehiclesCount >= 1 && !editingVehicle
                      ? '#FFFBEB'
                      : '#F0FDF4',
                    borderWidth: 1,
                    borderColor: chargeLimitInfo.type === 'directivo'
                      ? '#BFDBFE'
                      : chargeLimitInfo.type === 'contratista'
                      ? '#FECACA'
                      : activeVehiclesCount >= 1 && !editingVehicle
                      ? '#FDE68A'
                      : '#BBF7D0'
                  }}>
                    <Text style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: chargeLimitInfo.type === 'directivo'
                        ? '#1E40AF'
                        : chargeLimitInfo.type === 'contratista'
                        ? '#B91C1C'
                        : activeVehiclesCount >= 1 && !editingVehicle
                        ? '#B45309'
                        : '#15803D'
                    }}>
                      {chargeLimitInfo.type === 'directivo'
                        ? '🌟 Cargos directivos cuentan con cupo ilimitado para registro de vehículos.'
                        : chargeLimitInfo.type === 'contratista'
                        ? '⛔ Los contratistas no tienen habilitado el registro de cupo de parqueadero permanente.'
                        : activeVehiclesCount >= 1 && !editingVehicle
                        ? '⚠️ Ya tienes 1 vehículo activo registrado. Debes inactivar el actual antes de inscribir uno nuevo.'
                        : '💼 Cupo permitido para funcionarios y asesores: 1 vehículo activo.'}
                    </Text>
                  </View>

                  <View>
                    <Text style={styles.label}>Dependencia *</Text>
                    <TouchableOpacity
                      style={[styles.inputWrap, { justifyContent: 'space-between', backgroundColor: '#FFFFFF' }]}
                      onPress={() => setShowDeps(true)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Ionicons name="business-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <Text 
                          numberOfLines={1} 
                          style={[styles.input, { color: dependency ? COLORS.text : '#94A3B8', paddingTop: 10 }]}
                        >
                          {dependency || 'Seleccionar Dependencia...'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* SECCIÓN 2: DATOS DEL VEHÍCULO */}
                <View style={{ 
                  backgroundColor: '#F8FAFC', 
                  borderRadius: 14, 
                  padding: 14, 
                  borderWidth: 1, 
                  borderColor: '#E2E8F0',
                  gap: 12 
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Ionicons name="car" size={16} color={COLORS.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      2. Datos del Vehículo
                    </Text>
                  </View>

                  {/* Selector Tipo de Automotor (Carro o Moto) */}
                  <View>
                    <Text style={styles.label}>Tipo de Automotor *</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <TouchableOpacity
                        onPress={() => setVType('carro')}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: vType === 'carro' ? '#EFF6FF' : '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: vType === 'carro' ? '#2563EB' : '#CBD5E1',
                          gap: 6
                        }}
                      >
                        <Ionicons name="car-sport" size={18} color={vType === 'carro' ? '#2563EB' : COLORS.muted} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: vType === 'carro' ? '#2563EB' : COLORS.muted }}>
                          Carro
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setVType('moto')}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: vType === 'moto' ? '#FFFBEB' : '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: vType === 'moto' ? '#D97706' : '#CBD5E1',
                          gap: 6
                        }}
                      >
                        <Ionicons name="bicycle" size={18} color={vType === 'moto' ? '#D97706' : COLORS.muted} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: vType === 'moto' ? '#D97706' : COLORS.muted }}>
                          Moto
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Placa del Vehículo *</Text>
                      <View style={styles.inputWrap}>
                        <Ionicons name="barcode-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <TextInput
                          style={styles.input}
                          value={vPlate}
                          onChangeText={(t) => {
                            const clean = t.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            setVPlate(clean);
                            if (/^[A-Z]{3}[0-9]{2}[A-Z]$/.test(clean)) {
                              setVType('moto');
                            } else if (/^[A-Z]{3}[0-9]{3}$/.test(clean)) {
                              setVType('carro');
                            }
                          }}
                          placeholder={vType === 'moto' ? 'Ej. BGE89H' : 'Ej. ABC123'}
                          placeholderTextColor="#94A3B8"
                          maxLength={7}
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Marca *</Text>
                      <View style={styles.inputWrap}>
                        <Ionicons name="construct-outline" size={18} color={COLORS.muted} style={{ marginRight: 10 }} />
                        <TextInput
                          style={styles.input}
                          value={vBrand}
                          onChangeText={setVBrand}
                          placeholder="Ej. Chevrolet"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Línea / Modelo</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.input}
                          value={vModel}
                          onChangeText={setVModel}
                          placeholder="Ej. Duster"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Color</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.input}
                          value={vColor}
                          onChangeText={setVColor}
                          placeholder="Ej. Gris"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* Nota de estado inicial */}
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 8, 
                  backgroundColor: '#FEF3C7', 
                  padding: 10, 
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#FDE68A'
                }}>
                  <Ionicons name="time" size={18} color="#D97706" />
                  <Text style={{ fontSize: 12, color: '#92400E', flex: 1, lineHeight: 16 }}>
                    Tu vehículo quedará registrado en estado <Text style={{ fontWeight: '800' }}>Pendiente de Aprobación</Text> hasta que la solicitud sea evaluada por Servicios Generales.
                  </Text>
                </View>

                {vError ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                    <Text style={styles.errorText}>{vError}</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#F1F5F9'
                }}
                onPress={() => setVehicleModalVisible(false)}
                disabled={vSaving}
              >
                <Text style={{ fontWeight: '700', color: '#64748B' }}>Cancelar</Text>
              </TouchableOpacity>

              {(() => {
                const isContractorBlocked = !editingVehicle && (!chargeLimitInfo.canRegister || chargeLimitInfo.maxLimit === 0);
                const isLimitReached = !editingVehicle && !chargeLimitInfo.isUnlimited && activeVehiclesCount >= chargeLimitInfo.maxLimit;
                const isActionDisabled = vSaving || isContractorBlocked || isLimitReached;

                return (
                  <TouchableOpacity
                    style={{
                      flex: 1.5,
                      height: 48,
                      borderRadius: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isContractorBlocked 
                        ? '#CBD5E1' 
                        : isLimitReached 
                        ? '#F59E0B' 
                        : COLORS.primary
                    }}
                    onPress={handleSaveVehicle}
                    disabled={isActionDisabled}
                  >
                    <Text style={{ fontWeight: '800', color: COLORS.white }}>
                      {vSaving 
                        ? 'Procesando...' 
                        : isContractorBlocked
                        ? 'No Habilitado (Contratista)'
                        : isLimitReached
                        ? 'Cupo Lleno (Máx 1)'
                        : (editingVehicle ? 'Actualizar Vehículo' : 'Registrar y Solicitar Cupo')}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN DE ACCIÓN SOBRE VEHÍCULO */}
      <Modal
        visible={vehicleActionModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVehicleActionModal({ visible: false, type: 'inactivate', vehicle: null })}
      >
        <View style={styles.modalBlur}>
          <BlurView intensity={25} style={StyleSheet.absoluteFill} />
          <View style={[styles.modalPanel, { maxWidth: 440, padding: 24 }]}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: vehicleActionModal.type === 'delete' ? '#FEE2E2' : '#FEF3C7',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12
              }}>
                <Ionicons
                  name={vehicleActionModal.type === 'delete' ? 'trash' : (vehicleActionModal.type === 'inactivate' ? 'eye-off' : 'checkmark-circle')}
                  size={26}
                  color={vehicleActionModal.type === 'delete' ? '#DC2626' : (vehicleActionModal.type === 'inactivate' ? '#D97706' : '#16A34A')}
                />
              </View>
              <Text style={[styles.modalTitle, { fontSize: 18, textAlign: 'center' }]}>
                {vehicleActionModal.type === 'delete' ? '¿Eliminar Vehículo?' : (vehicleActionModal.type === 'inactivate' ? '¿Inactivar Vehículo?' : '¿Reactivar Vehículo?')}
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
                {vehicleActionModal.type === 'delete' 
                  ? `Esta acción eliminará permanentemente el vehículo con placa ${vehicleActionModal.vehicle?.plate}.`
                  : vehicleActionModal.type === 'inactivate'
                  ? `El vehículo con placa ${vehicleActionModal.vehicle?.plate} quedará inactivo y liberará un cupo en tu cuenta.`
                  : `El vehículo con placa ${vehicleActionModal.vehicle?.plate} volverá a estar activo para el uso del parqueadero.`}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#F1F5F9'
                }}
                onPress={() => setVehicleActionModal({ visible: false, type: 'inactivate', vehicle: null })}
              >
                <Text style={{ fontWeight: '700', color: '#64748B' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: vehicleActionModal.type === 'delete' ? '#DC2626' : COLORS.primary
                }}
                onPress={handleConfirmVehicleAction}
              >
                <Text style={{ fontWeight: '800', color: COLORS.white }}>
                  {vehicleActionModal.type === 'delete' ? 'Eliminar' : (vehicleActionModal.type === 'inactivate' ? 'Inactivar' : 'Reactivar')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL INFORMATIVO PERSONALIZADO (REEMPLAZO DE ALERTS) */}
      <Modal
        visible={infoModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModal({ visible: false, title: '', message: '' })}
      >
        <View style={styles.modalBlur}>
          <BlurView intensity={25} style={StyleSheet.absoluteFill} />
          <View style={[styles.modalPanel, { maxWidth: 420, padding: 24, alignItems: 'center' }]}>
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: infoModal.isError ? '#FEE2E2' : '#ECFDF5',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12
            }}>
              <Ionicons
                name={infoModal.isError ? 'alert-circle' : 'checkmark-circle'}
                size={28}
                color={infoModal.isError ? '#DC2626' : '#10B981'}
              />
            </View>
            <Text style={[styles.modalTitle, { fontSize: 18, textAlign: 'center', marginBottom: 8 }]}>
              {infoModal.title}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 19, marginBottom: 18 }}>
              {infoModal.message}
            </Text>
            <TouchableOpacity
              style={{
                width: '100%',
                height: 46,
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: COLORS.primary
              }}
              onPress={() => setInfoModal({ visible: false, title: '', message: '' })}
            >
              <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 14 }}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  const router = useRouter();
  return (
    <View style={[styles.mobHeader, { paddingRight: 50, flexDirection: 'row', alignItems: 'center' }]}>
      <TouchableOpacity 
        onPress={() => router.push('/dashboard')}
        style={{ marginRight: 10, padding: 8, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.line }}
      >
        <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
      </TouchableOpacity>
      <Ionicons name="car" size={28} color={COLORS.primary} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.mobTitle} numberOfLines={1}>Secretaría Jurídica</Text>
        <Text style={styles.mobSub} numberOfLines={1}>Solicitud de Parqueadero</Text>
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
  modalBtn: { backgroundColor: COLORS.primary, width: '100%', height: 54, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  modalBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
});
