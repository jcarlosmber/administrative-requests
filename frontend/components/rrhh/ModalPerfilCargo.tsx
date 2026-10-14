import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BotonManualFunciones from '../BotonManualFunciones';
import {
  nominaService,
  PerfilCargoItem,
  PlazaNomina,
  ActualizarPerfilCargoPayload,
} from '../../lib/nominaService';

interface ModalPerfilCargoProps {
  visible: boolean;
  onClose: () => void;
  onGuardadoExitoso?: (datos: any) => void;
  cargoInicial?: PerfilCargoItem | PlazaNomina | null;
  idPlaza?: number | null;
  totalPlazasMismoCargo?: number;
}

export const ModalPerfilCargo: React.FC<ModalPerfilCargoProps> = ({
  visible,
  onClose,
  onGuardadoExitoso,
  cargoInicial,
  idPlaza,
  totalPlazasMismoCargo = 1,
}) => {
  const [cargo, setCargo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [grado, setGrado] = useState('');
  const [nivel, setNivel] = useState('PROFESIONAL');
  const [idSideap, setIdSideap] = useState('');
  const [proposito, setProposito] = useState('');
  const [funciones, setFunciones] = useState<string[]>([]);
  const [nuevaFuncionTexto, setNuevaFuncionTexto] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [manualFunciones, setManualFunciones] = useState('');
  const [resolucionManual, setResolucionManual] = useState('');
  const [aplicarATodas, setAplicarATodas] = useState(true);

  const [tabActivo, setTabActivo] = useState<'proposito' | 'funciones' | 'requisitos' | 'manual'>('proposito');
  const [guardando, setGuardando] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  useEffect(() => {
    if (visible && cargoInicial) {
      setCargo(cargoInicial.cargo || '');
      setCodigo(String(cargoInicial.codigo || ''));
      setGrado(String(cargoInicial.grado || ''));
      setNivel((cargoInicial as any).nivel || 'PROFESIONAL');
      setIdSideap(cargoInicial.id_sideap ? String(cargoInicial.id_sideap) : '');
      setProposito(cargoInicial.proposito || '');

      let funcs: string[] = [];
      if (Array.isArray(cargoInicial.funciones)) {
        funcs = cargoInicial.funciones;
      } else if (typeof cargoInicial.funciones === 'string' && cargoInicial.funciones.trim()) {
        try {
          const parsed = JSON.parse(cargoInicial.funciones);
          funcs = Array.isArray(parsed) ? parsed : cargoInicial.funciones.split('\n').filter(Boolean);
        } catch {
          funcs = cargoInicial.funciones.split('\n').filter(Boolean);
        }
      }
      setFunciones(funcs);
      setRequisitos(cargoInicial.requisitos || '');
      setManualFunciones((cargoInicial as any).manual_funciones || '');
      setResolucionManual((cargoInicial as any).resolucion_manual || '');
      setNuevaFuncionTexto('');
      setModalFeedback(null);
      setAplicarATodas(true);
      setTabActivo('proposito');
    }
  }, [visible, cargoInicial]);

  const handleAgregarFuncion = () => {
    const texto = nuevaFuncionTexto.trim();
    if (!texto) return;
    setFunciones(prev => [...prev, texto]);
    setNuevaFuncionTexto('');
  };

  const handleEditarFuncion = (index: number, nuevoTexto: string) => {
    setFunciones(prev => {
      const copia = [...prev];
      copia[index] = nuevoTexto;
      return copia;
    });
  };

  const handleEliminarFuncion = (index: number) => {
    setFunciones(prev => prev.filter((_, i) => i !== index));
  };

  const handleGuardar = async () => {
    if (!cargo.trim()) {
      setModalFeedback({
        tipo: 'error',
        mensaje: 'Por favor ingresa la denominación del cargo.',
      });
      return;
    }

    setGuardando(true);
    setModalFeedback(null);

    try {
      const payload: ActualizarPerfilCargoPayload = {
        id_plaza: idPlaza || undefined,
        cargo: cargo.trim(),
        codigo: codigo.trim() || undefined,
        grado: grado.trim() || undefined,
        id_sideap: idSideap ? parseInt(idSideap, 10) : undefined,
        proposito: proposito.trim(),
        funciones: funciones.filter(f => f.trim().length > 0),
        requisitos: requisitos.trim(),
        manual_funciones: manualFunciones.trim(),
        resolucion_manual: resolucionManual.trim(),
        aplicar_a_todas_las_plazas: idPlaza ? aplicarATodas : true,
      };

      const res = await nominaService.actualizarPerfilCargo(payload);

      if (res.success) {
        setModalFeedback({
          tipo: 'exito',
          mensaje: res.mensaje || 'Perfil de cargo guardado exitosamente en el sistema.',
        });

        if (onGuardadoExitoso) {
          onGuardadoExitoso({
            ...payload,
            plazasActualizadas: res.plazasActualizadas,
          });
        }

        setTimeout(() => {
          setModalFeedback(null);
          onClose();
        }, 1200);
      } else {
        setModalFeedback({
          tipo: 'error',
          mensaje: res.error || 'Ocurrió un error al guardar el perfil del cargo.',
        });
      }
    } catch (err: any) {
      setModalFeedback({
        tipo: 'error',
        mensaje: 'Error de conexión con el servidor: ' + (err.message || 'Desconocido'),
      });
    } finally {
      setGuardando(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            width: '100%',
            maxWidth: 860,
            maxHeight: '92%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Header del Modal */}
          <View
            style={{
              backgroundColor: '#0F2942',
              paddingHorizontal: 22,
              paddingVertical: 18,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View
                  style={{
                    backgroundColor: '#1E40AF',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
                    GESTIÓN MANUAL DE CARGO
                  </Text>
                </View>
                {idPlaza ? (
                  <View
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: '#E2E8F0', fontSize: 11, fontWeight: '600' }}>
                      Plaza Activa #{idPlaza}
                    </Text>
                  </View>
                ) : null}
                {idSideap ? (
                  <View
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      borderColor: '#10B981',
                      borderWidth: 1,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: '#6EE7B7', fontSize: 11, fontWeight: '700' }}>
                      SIDEAP #{idSideap}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: '700',
                  marginTop: 6,
                }}
                numberOfLines={1}
              >
                {cargo || 'Nuevo Cargo / Perfil'}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                Nivel: {nivel} • Código: {codigo || 'S/C'} • Grado: {grado || 'S/G'}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Opciones de Ámbito si hay plaza asignada */}
          {idPlaza && (
            <View
              style={{
                backgroundColor: '#EFF6FF',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#DBEAFE',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="git-branch-outline" size={18} color="#1D4ED8" />
                <Text style={{ fontSize: 12.5, color: '#1E3A8A', fontWeight: '500' }}>
                  Este cargo está presente en{' '}
                  <Text style={{ fontWeight: '700' }}>{totalPlazasMismoCargo} plazas</Text> de la planta.
                </Text>
              </View>
              <Pressable
                onPress={() => setAplicarATodas(!aplicarATodas)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: aplicarATodas ? '#2563EB' : '#FFFFFF',
                  borderColor: '#2563EB',
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 6,
                  gap: 6,
                }}
              >
                <Ionicons
                  name={aplicarATodas ? 'checkbox' : 'square-outline'}
                  size={15}
                  color={aplicarATodas ? '#FFFFFF' : '#2563EB'}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: aplicarATodas ? '#FFFFFF' : '#2563EB',
                  }}
                >
                  {aplicarATodas ? 'Actualizar todas las plazas del cargo' : 'Solo actualizar esta plaza'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Barra de Pestañas del Perfil */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#F8FAFC',
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
              paddingHorizontal: 16,
              paddingTop: 8,
              gap: 4,
            }}
          >
            {[
              { id: 'proposito', label: '1. Propósito', icon: 'compass-outline' },
              { id: 'funciones', label: `2. Funciones (${funciones.length})`, icon: 'list-outline' },
              { id: 'requisitos', label: '3. Requisitos', icon: 'school-outline' },
              { id: 'manual', label: '4. Manual PDF', icon: 'document-text-outline' },
            ].map(tab => {
              const activo = tabActivo === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setTabActivo(tab.id as any)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderBottomWidth: activo ? 3 : 0,
                    borderBottomColor: '#1E40AF',
                    backgroundColor: activo ? '#FFFFFF' : 'transparent',
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                  }}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={activo ? '#1E40AF' : '#64748B'}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: activo ? '700' : '500',
                      color: activo ? '#1E40AF' : '#64748B',
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Feedback Banner (en lugar de alert) */}
          {modalFeedback && (
            <View
              style={{
                backgroundColor: modalFeedback.tipo === 'exito' ? '#ECFDF5' : '#FEF2F2',
                borderColor: modalFeedback.tipo === 'exito' ? '#A7F3D0' : '#FECACA',
                borderWidth: 1,
                paddingHorizontal: 16,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons
                  name={modalFeedback.tipo === 'exito' ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={modalFeedback.tipo === 'exito' ? '#059669' : '#DC2626'}
                />
                <Text
                  style={{
                    fontSize: 13,
                    color: modalFeedback.tipo === 'exito' ? '#065F46' : '#991B1B',
                    fontWeight: '600',
                    flex: 1,
                  }}
                >
                  {modalFeedback.mensaje}
                </Text>
              </View>
              <Pressable onPress={() => setModalFeedback(null)}>
                <Ionicons name="close" size={16} color="#64748B" />
              </Pressable>
            </View>
          )}

          {/* Cuerpo con Scroll */}
          <ScrollView
            style={{ flex: 1, padding: 22 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={true}
          >
            {/* PESTAÑA 1: PROPÓSITO */}
            {tabActivo === 'proposito' && (
              <View style={{ gap: 16 }}>
                <View
                  style={{
                    backgroundColor: '#F0F9FF',
                    borderColor: '#BAE6FD',
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: 'row',
                    gap: 10,
                  }}
                >
                  <Ionicons name="information-circle-outline" size={20} color="#0284C7" />
                  <Text style={{ flex: 1, fontSize: 12.5, color: '#0369A1', lineHeight: 18 }}>
                    Define la razón de ser del cargo dentro de la estructura institucional de la Secretaría Jurídica Distrital. Este texto se mostrará en la Ficha Técnica de la Plaza y en los trámites de vinculación.
                  </Text>
                </View>

                {/* Campos identificadores básicos si se necesita editarlos */}
                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                  <View style={{ flex: 2, minWidth: 200 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      Denominación del Cargo *
                    </Text>
                    <TextInput
                      value={cargo}
                      onChangeText={setCargo}
                      placeholder="Ej. PROFESIONAL ESPECIALIZADO"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13.5,
                        color: '#0F172A',
                      }}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 100 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      Código
                    </Text>
                    <TextInput
                      value={codigo}
                      onChangeText={setCodigo}
                      placeholder="Ej. 222"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13.5,
                        color: '#0F172A',
                      }}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 90 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      Grado
                    </Text>
                    <TextInput
                      value={grado}
                      onChangeText={setGrado}
                      placeholder="Ej. 07"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13.5,
                        color: '#0F172A',
                      }}
                    />
                  </View>
                </View>

                {/* Textarea Propósito */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 6 }}>
                    Propósito Principal del Empleo
                  </Text>
                  <TextInput
                    value={proposito}
                    onChangeText={setProposito}
                    placeholder="Escriba aquí el propósito principal según el manual de funciones y competencias laborales..."
                    multiline={true}
                    numberOfLines={6}
                    textAlignVertical="top"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 13.5,
                      color: '#0F172A',
                      minHeight: 140,
                      lineHeight: 20,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, textAlign: 'right' }}>
                    {proposito.length} caracteres
                  </Text>
                </View>
              </View>
            )}

            {/* PESTAÑA 2: FUNCIONES ESENCIALES */}
            {tabActivo === 'funciones' && (
              <View style={{ gap: 16 }}>
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="layers-outline" size={18} color="#475569" />
                    <Text style={{ fontSize: 12.5, color: '#334155', fontWeight: '500' }}>
                      Agrega o edita cada función esencial individualmente. El sistema las ordenará y enumerará automáticamente.
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#E0E7FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ color: '#4338CA', fontSize: 11.5, fontWeight: '700' }}>
                      {funciones.length} funciones
                    </Text>
                  </View>
                </View>

                {/* Formulario para añadir nueva función */}
                <View
                  style={{
                    backgroundColor: '#F1F5F9',
                    borderRadius: 10,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    gap: 10,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>
                    Añadir Nueva Función
                  </Text>
                  <TextInput
                    value={nuevaFuncionTexto}
                    onChangeText={setNuevaFuncionTexto}
                    placeholder="Redacte la función esencial a incorporar..."
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 13,
                      color: '#0F172A',
                      minHeight: 70,
                    }}
                  />
                  <Pressable
                    onPress={handleAgregarFuncion}
                    disabled={!nuevaFuncionTexto.trim()}
                    style={({ pressed }) => ({
                      alignSelf: 'flex-end',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: !nuevaFuncionTexto.trim() ? '#94A3B8' : pressed ? '#1D4ED8' : '#2563EB',
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 6,
                    })}
                  >
                    <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                      Agregar a la Lista
                    </Text>
                  </Pressable>
                </View>

                {/* Listado de funciones añadidas */}
                {funciones.length === 0 ? (
                  <View
                    style={{
                      padding: 30,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderStyle: 'dashed',
                    }}
                  >
                    <Ionicons name="clipboard-outline" size={32} color="#94A3B8" />
                    <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600', marginTop: 8 }}>
                      No hay funciones registradas para este cargo.
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                      Utiliza el formulario superior para incorporar las funciones esenciales.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {funciones.map((func, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          padding: 12,
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: '#EFF6FF',
                            borderWidth: 1,
                            borderColor: '#BFDBFE',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 2,
                          }}
                        >
                          <Text style={{ color: '#1E40AF', fontSize: 12, fontWeight: '800' }}>
                            {index + 1}
                          </Text>
                        </View>

                        <TextInput
                          value={func}
                          onChangeText={(texto) => handleEditarFuncion(index, texto)}
                          multiline={true}
                          style={{
                            flex: 1,
                            fontSize: 13,
                            color: '#1E293B',
                            lineHeight: 19,
                            padding: 0,
                          }}
                        />

                        <Pressable
                          onPress={() => handleEliminarFuncion(index)}
                          style={({ pressed }) => ({
                            padding: 6,
                            borderRadius: 6,
                            backgroundColor: pressed ? '#FEE2E2' : 'transparent',
                          })}
                        >
                          <Ionicons name="trash-outline" size={17} color="#DC2626" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* PESTAÑA 3: REQUISITOS (EXPERIENCIA O TÍTULOS) */}
            {tabActivo === 'requisitos' && (
              <View style={{ gap: 16 }}>
                <View
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderColor: '#FDE68A',
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: 'row',
                    gap: 10,
                  }}
                >
                  <Ionicons name="school-outline" size={20} color="#D97706" />
                  <Text style={{ flex: 1, fontSize: 12.5, color: '#92400E', lineHeight: 18 }}>
                    Especifica los requisitos exigidos para el desempeño del empleo en cuanto a títulos de educación superior, núcleo básico de conocimiento y meses de experiencia laboral o profesional relacionada.
                  </Text>
                </View>

                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 6 }}>
                    Requisitos Consolidados de Formación y Experiencia
                  </Text>
                  <TextInput
                    value={requisitos}
                    onChangeText={setRequisitos}
                    placeholder="Ej. Título profesional en Derecho o Ciencias Políticas. Título de postgrado en modalidad de especialización en áreas afines. Treinta y seis (36) meses de experiencia profesional relacionada."
                    multiline={true}
                    numberOfLines={6}
                    textAlignVertical="top"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 13.5,
                      color: '#0F172A',
                      minHeight: 140,
                      lineHeight: 20,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, textAlign: 'right' }}>
                    {requisitos.length} caracteres
                  </Text>
                </View>
              </View>
            )}

            {/* PESTAÑA 4: MANUAL DE FUNCIONES Y RESOLUCIÓN */}
            {tabActivo === 'manual' && (
              <View style={{ gap: 16 }}>
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: 'row',
                    gap: 10,
                  }}
                >
                  <Ionicons name="document-attach-outline" size={20} color="#475569" />
                  <Text style={{ flex: 1, fontSize: 12.5, color: '#334155', lineHeight: 18 }}>
                    Asocia el archivo digital del Manual de Funciones por ID SIDEAP y especifica el acto administrativo con sus folios correspondientes.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      ID SIDEAP Asociado
                    </Text>
                    <TextInput
                      value={idSideap}
                      onChangeText={setIdSideap}
                      placeholder="Ej. 4998"
                      keyboardType="numeric"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13.5,
                        color: '#0F172A',
                      }}
                    />
                  </View>

                  <View style={{ flex: 1.5, minWidth: 200 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      Páginas / Folios del Manual
                    </Text>
                    <TextInput
                      value={manualFunciones}
                      onChangeText={setManualFunciones}
                      placeholder="Ej. 34-37"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13.5,
                        color: '#0F172A',
                      }}
                    />
                  </View>

                  <View style={{ flex: 2, minWidth: 240 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      Resolución / Acto de Adopción
                    </Text>
                    <TextInput
                      value={resolucionManual}
                      onChangeText={setResolucionManual}
                      placeholder="Ej. RES. 085 de 2020"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13.5,
                        color: '#0F172A',
                      }}
                    />
                  </View>
                </View>

                {/* Vista previa del botón de PDF si hay SIDEAP configurado */}
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 10,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                    Visualización del PDF del Manual
                  </Text>
                  <BotonManualFunciones
                    id_sideap={idSideap ? parseInt(idSideap, 10) : undefined}
                    cargo={cargo}
                    codigo={codigo}
                    grado={grado}
                    variante="boton"
                    etiqueta="Abrir Manual de Funciones en PDF"
                  />
                  <Text style={{ fontSize: 11.5, color: '#64748B', textAlign: 'center' }}>
                    Los documentos en PDF se indexan automáticamente a partir del ID SIDEAP del empleo.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer con Acciones */}
          <View
            style={{
              paddingHorizontal: 22,
              paddingVertical: 14,
              backgroundColor: '#F8FAFC',
              borderTopWidth: 1,
              borderTopColor: '#E2E8F0',
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Pressable
              onPress={onClose}
              disabled={guardando}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderRadius: 8,
                backgroundColor: pressed ? '#E2E8F0' : '#FFFFFF',
                borderWidth: 1,
                borderColor: '#CBD5E1',
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={handleGuardar}
              disabled={guardando}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 20,
                paddingVertical: 9,
                borderRadius: 8,
                backgroundColor: guardando ? '#94A3B8' : pressed ? '#1E3A8A' : '#1D4ED8',
                shadowColor: '#1D4ED8',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
                elevation: 2,
              })}
            >
              {guardando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="save-outline" size={17} color="#FFFFFF" />
              )}
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                {guardando ? 'Guardando...' : 'Guardar Perfil'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
