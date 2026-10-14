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

  // Requisitos separados de Formación y de Experiencia
  const [requisitosFormacion, setRequisitosFormacion] = useState('');
  const [requisitosExperiencia, setRequisitosExperiencia] = useState('');
  const [mesesExperiencia, setMesesExperiencia] = useState('');
  const [tipoExperiencia, setTipoExperiencia] = useState('Profesional Relacionada');
  const [requiereTarjetaProf, setRequiereTarjetaProf] = useState(false);

  const [manualFunciones, setManualFunciones] = useState('');
  const [resolucionManual, setResolucionManual] = useState('');
  const [aplicarATodas, setAplicarATodas] = useState(true);

  const [tabActivo, setTabActivo] = useState<'proposito' | 'funciones' | 'formacion' | 'experiencia' | 'manual'>('proposito');
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

      // Desglose inteligente de requisitos: Formación y Experiencia
      const reqRaw = cargoInicial.requisitos || '';
      let formacionIni = (cargoInicial as any).requisitos_formacion || '';
      let experienciaIni = (cargoInicial as any).requisitos_experiencia || '';
      let mesesIni = (cargoInicial as any).meses_experiencia ? String((cargoInicial as any).meses_experiencia) : '';

      if (!formacionIni && !experienciaIni && reqRaw) {
        const expMatch = reqRaw.match(/(?:experiencia(?:\s*(?:laboral|profesional|requerida|exigida))?\s*[:\-])\s*(.+)/is);
        if (expMatch) {
          experienciaIni = expMatch[1].trim();
          formacionIni = reqRaw.substring(0, expMatch.index).replace(/(?:estudios?|formaci[oó]n(?:\s*acad[eé]mica)?)\s*[:\-]\s*/i, '').trim();
        } else {
          formacionIni = reqRaw.replace(/(?:estudios?|formaci[oó]n(?:\s*acad[eé]mica)?)\s*[:\-]\s*/i, '').trim();
        }
      }

      // Detectar meses si existen en el texto
      if (!mesesIni && experienciaIni) {
        const mesesMatch = experienciaIni.match(/(\d{1,2})\s*(?:meses)/i);
        if (mesesMatch) {
          mesesIni = mesesMatch[1];
        }
      }

      setRequisitosFormacion(formacionIni);
      setRequisitosExperiencia(experienciaIni);
      setMesesExperiencia(mesesIni);
      setRequiereTarjetaProf(
        Boolean(formacionIni && (formacionIni.toLowerCase().includes('tarjeta') || formacionIni.toLowerCase().includes('matrícula')))
      );

      // Determinar tipo de experiencia inicial
      const niv = ((cargoInicial as any).nivel || '').toUpperCase();
      if (niv === 'DIRECTIVO' || niv === 'ASESOR' || niv === 'PROFESIONAL') {
        setTipoExperiencia('Profesional Relacionada');
      } else if (niv === 'TECNICO') {
        setTipoExperiencia('Laboral o Relacionada');
      } else {
        setTipoExperiencia('Laboral');
      }

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

  const handleAplicarPlantillaNBC = (textoPlantilla: string) => {
    setRequisitosFormacion(prev => {
      if (!prev.trim()) return textoPlantilla;
      return `${prev.trim()}\n• ${textoPlantilla}`;
    });
  };

  const handleSeleccionarMeses = (numMeses: number) => {
    setMesesExperiencia(String(numMeses));
    const descActual = requisitosExperiencia.trim();
    const textoSugerido = `${numMeses} meses de experiencia ${tipoExperiencia.toLowerCase()} con las funciones del empleo.`;
    if (!descActual || descActual.match(/^\d+\s*meses/i)) {
      setRequisitosExperiencia(textoSugerido);
    }
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
      // Consolidar texto general para compatibilidad
      const partesReq: string[] = [];
      if (requisitosFormacion.trim()) {
        partesReq.push(`Estudio: ${requisitosFormacion.trim()}`);
      }
      if (requisitosExperiencia.trim()) {
        partesReq.push(`Experiencia: ${requisitosExperiencia.trim()}`);
      }
      const reqConsolidado = partesReq.join('\n\n');

      const payload: ActualizarPerfilCargoPayload = {
        id_plaza: idPlaza || undefined,
        cargo: cargo.trim(),
        codigo: codigo.trim() || undefined,
        grado: grado.trim() || undefined,
        id_sideap: idSideap ? parseInt(idSideap, 10) : undefined,
        proposito: proposito.trim(),
        funciones: funciones.filter(f => f.trim().length > 0),
        requisitos: reqConsolidado,
        requisitos_formacion: requisitosFormacion.trim(),
        requisitos_experiencia: requisitosExperiencia.trim(),
        meses_experiencia: mesesExperiencia ? parseInt(mesesExperiencia, 10) : null,
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
            maxWidth: 980,
            maxHeight: '94%',
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

          {/* Barra de Pestañas del Perfil con Formación y Experiencia Aparte */}
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
              { id: 'formacion', label: '3. Formación', icon: 'school-outline' },
              { id: 'experiencia', label: '4. Experiencia', icon: 'briefcase-outline' },
              { id: 'manual', label: '5. Manual PDF', icon: 'document-text-outline' },
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
                    paddingHorizontal: 13,
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
                      fontSize: 12.5,
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

          {/* Feedback Banner (Regla: No alerts) */}
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

                {/* Identificadores básicos */}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons name="layers-outline" size={20} color="#334155" />
                    <Text style={{ fontSize: 13.5, color: '#334155', fontWeight: '500', lineHeight: 20 }}>
                      Agrega o edita cada función esencial individualmente. El sistema las ordenará y enumerará automáticamente.
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#E0E7FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: '#4338CA', fontSize: 12.5, fontWeight: '700' }}>
                      {funciones.length} funciones
                    </Text>
                  </View>
                </View>

                {/* Añadir nueva función */}
                <View
                  style={{
                    backgroundColor: '#F1F5F9',
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    gap: 12,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
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
                      padding: 12,
                      fontSize: 14.5,
                      lineHeight: 22,
                      color: '#0F172A',
                      minHeight: 85,
                    }}
                  />
                  <Pressable
                    onPress={handleAgregarFuncion}
                    disabled={!nuevaFuncionTexto.trim()}
                    style={({ pressed }) => ({
                      alignSelf: 'flex-end',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: !nuevaFuncionTexto.trim() ? '#94A3B8' : pressed ? '#1D4ED8' : '#2563EB',
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 8,
                    })}
                  >
                    <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' }}>
                      Agregar a la Lista
                    </Text>
                  </Pressable>
                </View>

                {/* Lista de funciones */}
                {funciones.length === 0 ? (
                  <View
                    style={{
                      padding: 36,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderStyle: 'dashed',
                    }}
                  >
                    <Ionicons name="clipboard-outline" size={36} color="#94A3B8" />
                    <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '600', marginTop: 10 }}>
                      No hay funciones registradas para este cargo.
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 4 }}>
                      Utiliza el formulario superior para incorporar las funciones esenciales.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {funciones.map((func, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                          padding: 14,
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: 14,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.04,
                          shadowRadius: 3,
                          elevation: 1,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: '#EFF6FF',
                            borderWidth: 1.5,
                            borderColor: '#BFDBFE',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 2,
                            flexShrink: 0,
                          }}
                        >
                          <Text style={{ color: '#1E40AF', fontSize: 14, fontWeight: '800' }}>
                            {index + 1}
                          </Text>
                        </View>

                        <TextInput
                          value={func}
                          onChangeText={(texto) => handleEditarFuncion(index, texto)}
                          multiline={true}
                          style={{
                            flex: 1,
                            fontSize: 14.5,
                            color: '#0F172A',
                            lineHeight: 23,
                            padding: 10,
                            backgroundColor: '#F8FAFC',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            minHeight: 56,
                          }}
                        />

                        <Pressable
                          onPress={() => handleEliminarFuncion(index)}
                          style={({ pressed }) => ({
                            padding: 8,
                            borderRadius: 8,
                            backgroundColor: pressed ? '#FEE2E2' : '#F8FAFC',
                            borderWidth: 1,
                            borderColor: pressed ? '#FECACA' : '#E2E8F0',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 2,
                          })}
                        >
                          <Ionicons name="trash-outline" size={19} color="#DC2626" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* PESTAÑA 3: REQUISITOS DE FORMACIÓN ACADÉMICA (TÍTULOS / NBC) */}
            {tabActivo === 'formacion' && (
              <View style={{ gap: 16 }}>
                <View
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderColor: '#BFDBFE',
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: 'row',
                    gap: 10,
                  }}
                >
                  <Ionicons name="school-outline" size={20} color="#1D4ED8" />
                  <Text style={{ flex: 1, fontSize: 12.5, color: '#1E3A8A', lineHeight: 18 }}>
                    Define los títulos profesionales, técnicos o de bachillerato exigidos, núcleos básicos del conocimiento (NBC), posgrados afines y matrícula profesional reglamentaria.
                  </Text>
                </View>

                {/* Atajos Rápidos de NBC */}
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                    Plantillas Rápidas de Núcleos Básicos de Conocimiento (NBC):
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { label: '+ Derecho y afines', texto: 'Título profesional en disciplina académica del núcleo básico de conocimiento (NBC) en Derecho y afines. Título de posgrado en modalidad de especialización en áreas afines a las funciones del cargo.' },
                      { label: '+ Administración', texto: 'Título profesional en Administración de Empresas, Administración Pública o Finanzas del NBC en Administración. Título de posgrado en áreas afines.' },
                      { label: '+ Economía / Contaduría', texto: 'Título profesional en Economía, Contaduría Pública o Finanzas. Tarjeta o matrícula profesional vigente.' },
                      { label: '+ Ingeniería de Sistemas', texto: 'Título profesional en Ingeniería de Sistemas, Telemática, Computación o afines del NBC respectivo. Posgrado afín.' },
                      { label: '+ Bachiller / Asistencial', texto: 'Diploma de bachiller en cualquier modalidad o educación media concluida.' },
                    ].map((item, idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => handleAplicarPlantillaNBC(item.texto)}
                        style={({ pressed }) => ({
                          backgroundColor: pressed ? '#E2E8F0' : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                          borderRadius: 6,
                          paddingHorizontal: 9,
                          paddingVertical: 4.5,
                        })}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#1E40AF' }}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Requisito de Formación */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 6 }}>
                    Requisitos Específicos de Formación Académica (Títulos / Estudios)
                  </Text>
                  <TextInput
                    value={requisitosFormacion}
                    onChangeText={setRequisitosFormacion}
                    placeholder="Ej. Título profesional en: Derecho, Jurisprudencia o Ciencias Políticas; del núcleo básico de conocimiento en Derecho y afines. Título de posgrado en modalidad de especialización en áreas relacionadas con las funciones del cargo..."
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
                    {requisitosFormacion.length} caracteres
                  </Text>
                </View>

                {/* Tarjeta Profesional Checkbox */}
                <Pressable
                  onPress={() => {
                    const nuevo = !requiereTarjetaProf;
                    setRequiereTarjetaProf(nuevo);
                    const fraseTP = 'Tarjeta o matrícula profesional en los casos reglamentados por la ley.';
                    if (nuevo && !requisitosFormacion.toLowerCase().includes('tarjeta')) {
                      setRequisitosFormacion(prev => (prev.trim() ? `${prev.trim()}\n${fraseTP}` : fraseTP));
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: requiereTarjetaProf ? '#ECFDF5' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: requiereTarjetaProf ? '#A7F3D0' : '#E2E8F0',
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons
                    name={requiereTarjetaProf ? 'checkbox' : 'square-outline'}
                    size={18}
                    color={requiereTarjetaProf ? '#059669' : '#64748B'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: requiereTarjetaProf ? '#065F46' : '#334155' }}>
                      Exige Tarjeta o Matrícula Profesional
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>
                      Aplica en profesiones reglamentadas (Derecho, Contaduría, Ingeniería, etc.)
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* PESTAÑA 4: REQUISITOS DE EXPERIENCIA LABORAL / PROFESIONAL */}
            {tabActivo === 'experiencia' && (
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
                  <Ionicons name="briefcase-outline" size={20} color="#D97706" />
                  <Text style={{ flex: 1, fontSize: 12.5, color: '#92400E', lineHeight: 18 }}>
                    Define la experiencia exigida para el empleo: número de meses y modalidad de experiencia (profesional relacionada, profesional o laboral asistencial).
                  </Text>
                </View>

                {/* Selector rápido de Meses de Experiencia */}
                <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>
                    Meses de Experiencia Exigidos:
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {[
                      { meses: 0, label: 'Sin Experiencia' },
                      { meses: 12, label: '12 meses (1 año)' },
                      { meses: 24, label: '24 meses (2 años)' },
                      { meses: 36, label: '36 meses (3 años)' },
                      { meses: 48, label: '48 meses (4 años)' },
                      { meses: 60, label: '60 meses (5 años)' },
                    ].map((m) => {
                      const sel = String(m.meses) === String(mesesExperiencia);
                      return (
                        <Pressable
                          key={m.meses}
                          onPress={() => handleSeleccionarMeses(m.meses)}
                          style={{
                            paddingHorizontal: 11,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: sel ? '#B45309' : '#FEF3C7',
                            borderWidth: 1,
                            borderColor: sel ? '#92400E' : '#FDE68A',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: sel ? '#FFFFFF' : '#92400E' }}>
                            {m.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                      O especifica los meses exactos:
                    </Text>
                    <TextInput
                      value={mesesExperiencia}
                      onChangeText={setMesesExperiencia}
                      placeholder="Ej. 36"
                      keyboardType="numeric"
                      style={{
                        width: 80,
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        fontSize: 13,
                        fontWeight: '700',
                        textAlign: 'center',
                        color: '#0F172A',
                      }}
                    />
                    <Text style={{ fontSize: 12, color: '#64748B' }}>meses</Text>
                  </View>
                </View>

                {/* Tipo de Experiencia */}
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                    Tipo / Modalidad de Experiencia:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      'Profesional Relacionada',
                      'Profesional',
                      'Laboral o Relacionada',
                      'Laboral Asistencial',
                      'No Requiere',
                    ].map(tipo => {
                      const sel = tipoExperiencia === tipo;
                      return (
                        <Pressable
                          key={tipo}
                          onPress={() => setTipoExperiencia(tipo)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 6,
                            backgroundColor: sel ? '#1E40AF' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: sel ? '#1D4ED8' : '#CBD5E1',
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: sel ? '#FFFFFF' : '#334155' }}>
                            {tipo}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Textarea Experiencia */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 6 }}>
                    Redacción Oficial de los Requisitos de Experiencia
                  </Text>
                  <TextInput
                    value={requisitosExperiencia}
                    onChangeText={setRequisitosExperiencia}
                    placeholder="Ej. Treinta y seis (36) meses de experiencia profesional relacionada con las funciones del empleo en entidades del sector público o privado..."
                    multiline={true}
                    numberOfLines={5}
                    textAlignVertical="top"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 13.5,
                      color: '#0F172A',
                      minHeight: 120,
                      lineHeight: 20,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, textAlign: 'right' }}>
                    {requisitosExperiencia.length} caracteres
                  </Text>
                </View>
              </View>
            )}

            {/* PESTAÑA 5: MANUAL DE FUNCIONES Y RESOLUCIÓN */}
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
