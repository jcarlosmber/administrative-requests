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

  // Formulario de nuevo cargo
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [grado, setGrado] = useState('');
  const [dependencia, setDependencia] = useState('');
  const [meses, setMeses] = useState('54');
  const [formacion, setFormacion] = useState('');
  const [funciones, setFunciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Modales
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

  const guardarNuevoCargo = async () => {
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
        nombre,
        codigo,
        grado,
        dependencia,
        requisito_experiencia_meses: parseFloat(meses) || 0,
        requisitos_formacion: formacion,
        funciones_cargo: funcionesArr
      });

      setGuardando(false);
      setMostrarForm(false);
      // Limpiar
      setNombre('');
      setCodigo('');
      setGrado('');
      setDependencia('');
      setMeses('54');
      setFormacion('');
      setFunciones('');
      cargarCargos();
      mostrarMensaje('Éxito', 'Cargo oficial registrado exitosamente.');
    } catch (err: any) {
      setGuardando(false);
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar el cargo.');
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
          borderBottomColor: '#1E293B'
        }}
      >
        <TouchableOpacity
          onPress={() => router.replace('/ingresos')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
            Banco de Perfiles y Cargos Oficiales
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMostrarForm(!mostrarForm)}
          style={{
            backgroundColor: mostrarForm ? '#334155' : '#991B1B',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Ionicons name={mostrarForm ? 'close' : 'add'} size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
            {mostrarForm ? 'Cerrar Formulario' : 'Nuevo Cargo'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, maxWidth: 1000, alignSelf: 'center', width: '100%' }}>
        {/* FORMULARIO DE NUEVO CARGO */}
        {mostrarForm && (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 22,
              borderWidth: 1,
              borderColor: '#CBD5E1',
              marginBottom: 24
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 14 }}>
              Registrar Perfil Oficial del Manual de Funciones
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flex: 2, minWidth: 240 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                  Nombre del Cargo *
                </Text>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Ej. Profesional Especializado"
                  style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10 }}
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
                  style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10 }}
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
                  style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10 }}
                />
              </View>

              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                  Meses Exigidos
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={meses}
                  onChangeText={setMeses}
                  placeholder="54"
                  style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontWeight: '700' }}
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
                style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10 }}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                Requisitos de Formación
              </Text>
              <TextInput
                value={formacion}
                onChangeText={setFormacion}
                placeholder="Título profesional en... Posgrado en..."
                style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10 }}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
                Funciones Oficiales (Una por cada renglón)
              </Text>
              <TextInput
                multiline
                numberOfLines={6}
                value={funciones}
                onChangeText={setFunciones}
                placeholder="1. Proyectar conceptos jurídicos...&#10;2. Sustanciar actos administrativos..."
                style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, minHeight: 120, textAlignVertical: 'top' }}
              />
            </View>

            <TouchableOpacity
              onPress={guardarNuevoCargo}
              disabled={guardando}
              style={{
                marginTop: 16,
                backgroundColor: '#16A34A',
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
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              )}
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                {guardando ? 'Guardando...' : 'Guardar Cargo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LISTA DE CARGOS */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#991B1B" />
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
                  borderColor: '#E2E8F0'
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                      {cargo.nombre}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                      Código: {cargo.codigo || 'N/A'} • Grado: {cargo.grado || 'N/A'} • Dependencia: {cargo.dependencia || 'N/A'}
                    </Text>
                  </View>

                  <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                      {cargo.requisito_experiencia_meses} meses req.
                    </Text>
                  </View>
                </View>

                {cargo.requisitos_formacion ? (
                  <Text style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>
                    <Text style={{ fontWeight: '700' }}>Formación:</Text> {cargo.requisitos_formacion}
                  </Text>
                ) : null}

                {Array.isArray(cargo.funciones_cargo) && cargo.funciones_cargo.length > 0 && (
                  <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      Funciones Oficiales ({cargo.funciones_cargo.length}):
                    </Text>
                    {cargo.funciones_cargo.map((fn, fidx) => (
                      <Text key={fidx} style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        • {fn}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Reusable */}
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
