import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ingresosService, CargoEvaluado } from '../../lib/ingresosService';

export default function CargosOficialesScreen() {
  const router = useRouter();
  const [cargos, setCargos] = useState<CargoEvaluado[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario de cargo (Crear o Editar)
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cargoEditandoId, setCargoEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [grado, setGrado] = useState('');
  const [dependencia, setDependencia] = useState('');
  const [meses, setMeses] = useState('54');
  const [formacion, setFormacion] = useState('');
  const [funciones, setFunciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Modal de Confirmación de Eliminación (Regla: No alerts)
  const [cargoAEliminar, setCargoAEliminar] = useState<CargoEvaluado | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Modales de Notificación
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const mostrarMensaje = (titulo: string, mensaje: string) => {
    setModalTitle(titulo);
    setModalMessage(mensaje);
    setModalVisible(true);
  };

  useEffect(() => {
    cargarCargos();
  }, []);

  const cargarCargos = async () => {
    try {
      setLoading(true);
      const data = await ingresosService.obtenerCargos();
      setCargos(data || []);
    } catch (err: any) {
      mostrarMensaje('Error', err.message || 'No se pudieron cargar los cargos.');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setCargoEditandoId(null);
    setNombre('');
    setCodigo('');
    setGrado('');
    setDependencia('');
    setMeses('54');
    setFormacion('');
    setFunciones('');
  };

  const iniciarCreacion = () => {
    limpiarFormulario();
    setMostrarForm(true);
  };

  const iniciarEdicion = (c: CargoEvaluado) => {
    setCargoEditandoId(c.id || null);
    setNombre(c.nombre);
    setCodigo(c.codigo || '');
    setGrado(c.grado || '');
    setDependencia(c.dependencia || '');
    setMeses(String(c.requisito_experiencia_meses || 0));
    setFormacion(c.requisitos_formacion || '');
    if (Array.isArray(c.funciones_cargo)) {
      setFunciones(c.funciones_cargo.join('\n'));
    } else {
      setFunciones('');
    }
    setMostrarForm(true);
  };

  const cancelarEdicion = () => {
    limpiarFormulario();
    setMostrarForm(false);
  };

  const guardarCargo = async () => {
    if (!nombre.trim()) {
      mostrarMensaje('Campo Requerido', 'El nombre del cargo es obligatorio.');
      return;
    }

    try {
      setGuardando(true);
      const funcionesArr = funciones
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      await ingresosService.guardarCargo({
        id: cargoEditandoId || undefined,
        nombre,
        codigo,
        grado,
        dependencia,
        requisito_experiencia_meses: parseFloat(meses) || 0,
        requisitos_formacion: formacion,
        funciones_cargo: funcionesArr
      });

      const esEdicion = !!cargoEditandoId;
      setGuardando(false);
      cancelarEdicion();
      await cargarCargos();
      mostrarMensaje(
        'Operación Exitosa',
        esEdicion ? 'El cargo oficial ha sido actualizado correctamente.' : 'El cargo oficial fue registrado exitosamente.'
      );
    } catch (err: any) {
      setGuardando(false);
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar el cargo.');
    }
  };

  const confirmarEliminar = async () => {
    if (!cargoAEliminar?.id) return;
    try {
      setEliminando(true);
      await ingresosService.eliminarCargo(cargoAEliminar.id);
      setEliminando(false);
      setCargoAEliminar(null);
      await cargarCargos();
      mostrarMensaje('Cargo Eliminado', 'El perfil ha sido removido del catálogo.');
    } catch (err: any) {
      setEliminando(false);
      setCargoAEliminar(null);
      mostrarMensaje('Error al Eliminar', err.message || 'No se pudo eliminar el cargo.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#0F172A',
          paddingTop: Platform.OS === 'ios' ? 50 : 20,
          paddingBottom: 20,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <TouchableOpacity
          onPress={() => router.replace('/ingresos')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
              Banco de Perfiles y Cargos Oficiales
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>
              Manuales de Funciones para Cotejo Documental
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={mostrarForm ? cancelarEdicion : iniciarCreacion}
          style={{
            backgroundColor: mostrarForm ? '#334155' : '#991B1B',
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Ionicons name={mostrarForm ? 'close' : 'add-circle'} size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
            {mostrarForm ? 'Cerrar Formulario' : 'Nuevo Cargo'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, width: '100%' }}>
        {/* FORMULARIO DE CARGO (CREAR O EDITAR) */}
        {mostrarForm && (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 24,
              borderWidth: 1,
              borderColor: cargoEditandoId ? '#3B82F6' : '#CBD5E1',
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={cargoEditandoId ? 'create' : 'add-circle'}
                  size={22}
                  color={cargoEditandoId ? '#2563EB' : '#991B1B'}
                />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                  {cargoEditandoId ? `Editar Perfil de Cargo: ${nombre}` : 'Registrar Nuevo Perfil de Cargo'}
                </Text>
              </View>

              <TouchableOpacity onPress={cancelarEdicion} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flex: 2, minWidth: 240 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                  Nombre del Cargo *
                </Text>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Ej. Profesional Especializado"
                  placeholderTextColor="#94A3B8"
                  style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14, color: '#0F172A' }}
                />
              </View>

              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                  Código
                </Text>
                <TextInput
                  value={codigo}
                  onChangeText={setCodigo}
                  placeholder="222"
                  placeholderTextColor="#94A3B8"
                  style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14, color: '#0F172A' }}
                />
              </View>

              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                  Grado
                </Text>
                <TextInput
                  value={grado}
                  onChangeText={setGrado}
                  placeholder="24"
                  placeholderTextColor="#94A3B8"
                  style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14, color: '#0F172A' }}
                />
              </View>

              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                  Meses Exigidos *
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={meses}
                  onChangeText={setMeses}
                  placeholder="54"
                  placeholderTextColor="#94A3B8"
                  style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14, color: '#0F172A', fontWeight: '700' }}
                />
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                Dependencia
              </Text>
              <TextInput
                value={dependencia}
                onChangeText={setDependencia}
                placeholder="Ej. Dirección Distrital de Asuntos Penales"
                placeholderTextColor="#94A3B8"
                style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14, color: '#0F172A' }}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                Requisitos de Formación Académica
              </Text>
              <TextInput
                value={formacion}
                onChangeText={setFormacion}
                placeholder="Título profesional en... Posgrado en..."
                placeholderTextColor="#94A3B8"
                style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14, color: '#0F172A' }}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                Funciones Oficiales del Manual de Funciones (Una por cada renglón) *
              </Text>
              <TextInput
                multiline
                numberOfLines={6}
                value={funciones}
                onChangeText={setFunciones}
                placeholder="1. Proyectar conceptos jurídicos sobre temas de doctrina...&#10;2. Sustanciar actos administrativos..."
                placeholderTextColor="#94A3B8"
                style={{
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 8,
                  padding: 10,
                  minHeight: 120,
                  textAlignVertical: 'top',
                  fontSize: 13,
                  color: '#0F172A',
                  lineHeight: 18
                }}
              />
            </View>

            {/* BOTONES DEL FORMULARIO */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                onPress={cancelarEdicion}
                style={{
                  flex: 1,
                  backgroundColor: '#F1F5F9',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#475569', fontWeight: '700', fontSize: 14 }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={guardarCargo}
                disabled={guardando}
                style={{
                  flex: 2,
                  backgroundColor: cargoEditandoId ? '#2563EB' : '#16A34A',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {guardando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name={cargoEditandoId ? 'save-outline' : 'checkmark-circle'} size={18} color="#FFFFFF" />
                )}
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                  {guardando
                    ? 'Guardando cambios...'
                    : cargoEditandoId
                    ? 'Actualizar Cargo Oficial'
                    : 'Guardar Nuevo Cargo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LISTADO DE CARGOS */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#991B1B" />
            <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14 }}>
              Cargando catálogo de cargos...
            </Text>
          </View>
        ) : cargos.length === 0 ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 40,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <Ionicons name="briefcase-outline" size={44} color="#94A3B8" />
            <Text style={{ marginTop: 12, fontSize: 16, fontWeight: '700', color: '#1E293B' }}>
              No hay cargos configurados
            </Text>
            <Text style={{ color: '#64748B', fontSize: 14, textAlign: 'center', marginTop: 4 }}>
              Crea el primer cargo oficial con sus funciones para realizar cotejos automáticos con IA.
            </Text>
            <TouchableOpacity
              onPress={iniciarCreacion}
              style={{
                marginTop: 16,
                backgroundColor: '#991B1B',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Crear Primer Cargo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {cargos.map((cargo, idx) => (
              <View
                key={cargo.id || idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: cargoEditandoId === cargo.id ? '#3B82F6' : '#E2E8F0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.03,
                  shadowRadius: 6
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 260 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                      {cargo.nombre}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
                      Código: <Text style={{ fontWeight: '700', color: '#334155' }}>{cargo.codigo || 'N/A'}</Text> • Grado: <Text style={{ fontWeight: '700', color: '#334155' }}>{cargo.grado || 'N/A'}</Text> • Dependencia: {cargo.dependencia || 'N/A'}
                    </Text>
                  </View>

                  <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                      {cargo.requisito_experiencia_meses} meses req.
                    </Text>
                  </View>
                </View>

                {cargo.requisitos_formacion ? (
                  <Text style={{ fontSize: 12, color: '#475569', marginTop: 10 }}>
                    <Text style={{ fontWeight: '700' }}>Formación exigida:</Text> {cargo.requisitos_formacion}
                  </Text>
                ) : null}

                {Array.isArray(cargo.funciones_cargo) && cargo.funciones_cargo.length > 0 && (
                  <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      Funciones Oficiales ({cargo.funciones_cargo.length}):
                    </Text>
                    {cargo.funciones_cargo.map((fn, fidx) => (
                      <Text key={fidx} style={{ fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 18 }}>
                        • {fn}
                      </Text>
                    ))}
                  </View>
                )}

                {/* BARRA DE ACCIONES (EDITAR / ELIMINAR) */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    gap: 10,
                    marginTop: 16,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#F1F5F9'
                  }}
                >
                  <TouchableOpacity
                    onPress={() => iniciarEdicion(cargo)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#EFF6FF',
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 6
                    }}
                  >
                    <Ionicons name="pencil" size={15} color="#2563EB" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>
                      Editar Cargo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setCargoAEliminar(cargo)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#FEF2F2',
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 6
                    }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#DC2626" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#DC2626' }}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de Confirmación de Eliminación (Regla: No alerts) */}
      <Modal
        visible={!!cargoAEliminar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCargoAEliminar(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Ionicons name="warning" size={26} color="#DC2626" />
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                Confirmar Eliminación
              </Text>
            </View>

            <Text style={{ fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 18 }}>
              ¿Estás seguro de que deseas eliminar el cargo{' '}
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                "{cargoAEliminar?.nombre}"
              </Text>
              ? Esta acción no se puede deshacer.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setCargoAEliminar(null)}
                style={{
                  flex: 1,
                  backgroundColor: '#F1F5F9',
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#475569', fontWeight: '700', fontSize: 14 }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmarEliminar}
                disabled={eliminando}
                style={{
                  flex: 1,
                  backgroundColor: '#DC2626',
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                {eliminando && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                  {eliminando ? 'Eliminando...' : 'Sí, Eliminar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Notificaciones Reusable (Regla: No alerts) */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 10 }}>{modalTitle}</Text>
            <Text style={{ fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 20 }}>{modalMessage}</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{ backgroundColor: '#0F172A', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
