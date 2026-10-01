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
import { ingresosService } from '../../lib/ingresosService';

export default function IngresosDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [validaciones, setValidaciones] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  // Estado para Modal de Notificación/Error (Regla: No alerts)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  // Modal de confirmación de eliminación
  const [modalEliminarVisible, setModalEliminarVisible] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState<{ id: string; nombre: string } | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const mostrarMensaje = (titulo: string, mensaje: string) => {
    setModalTitle(titulo);
    setModalMessage(mensaje);
    setModalVisible(true);
  };

  const pedirConfirmarEliminar = (id: string, nombre: string) => {
    setItemAEliminar({ id, nombre });
    setModalEliminarVisible(true);
  };

  const ejecutarEliminar = async () => {
    if (!itemAEliminar) return;
    try {
      setEliminando(true);
      await ingresosService.eliminarValidacion(itemAEliminar.id);
      setModalEliminarVisible(false);
      setItemAEliminar(null);
      await cargarDatos();
      mostrarMensaje('Expediente Eliminado', 'El dictamen y su expediente documental han sido eliminados correctamente.');
    } catch (err: any) {
      mostrarMensaje('Error al Eliminar', err.message || 'No se pudo eliminar el dictamen.');
    } finally {
      setEliminando(false);
    }
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const data = await ingresosService.obtenerValidaciones();
      setValidaciones(data || []);
    } catch (err: any) {
      mostrarMensaje('Error de Carga', err.message || 'No se pudieron obtener las validaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const filtrados = validaciones.filter(v => {
    const coincideTexto =
      (v.candidato_nombre && v.candidato_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.candidato_documento && v.candidato_documento.includes(searchTerm)) ||
      (v.cargo_nombre && v.cargo_nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    const coincideEstado = filtroEstado === 'TODOS' || v.resultado_final === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  const totalEvaluados = validaciones.length;
  const totalCumple = validaciones.filter(v => v.resultado_final === 'CUMPLE').length;
  const totalNoCumple = validaciones.filter(v => v.resultado_final === 'NO_CUMPLE').length;
  const totalRevision = validaciones.filter(v => v.resultado_final === 'REQUIERE_REVISION').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header Institucional */}
      <View
        style={{
          backgroundColor: '#0F172A',
          paddingTop: Platform.OS === 'ios' ? 50 : 20,
          paddingBottom: 24,
          paddingHorizontal: 24,
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: '#991B1B',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Ionicons name="shield-checkmark" size={26} color="#FFFFFF" />
          </View>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>
              Validación Técnica de Ingresos
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: 13 }}>
              Cotejo Documental y Experiencia Laboral con IA • SJD
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push('/ingresos/cargos')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#1E293B',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#334155'
            }}
          >
            <Ionicons name="briefcase-outline" size={18} color="#CBD5E1" style={{ marginRight: 6 }} />
            <Text style={{ color: '#CBD5E1', fontSize: 14, fontWeight: '600' }}>Cargos Oficiales</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/dashboard')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#334155',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 8
            }}
          >
            <Ionicons name="home-outline" size={18} color="#F1F5F9" style={{ marginRight: 6 }} />
            <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600' }}>Ir a Solicitudes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/ingresos/nueva')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#991B1B',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8
            }}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Nueva Validación</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Tarjetas de Métricas */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <View
            style={{
              flex: 1,
              minWidth: 180,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 18,
              borderLeftWidth: 4,
              borderLeftColor: '#3B82F6',
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>Total Expedientes</Text>
            <Text style={{ color: '#0F172A', fontSize: 26, fontWeight: '800', marginTop: 4 }}>
              {totalEvaluados}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              minWidth: 180,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 18,
              borderLeftWidth: 4,
              borderLeftColor: '#16A34A',
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>Cumplen Requisitos</Text>
            <Text style={{ color: '#16A34A', fontSize: 26, fontWeight: '800', marginTop: 4 }}>
              {totalCumple}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              minWidth: 180,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 18,
              borderLeftWidth: 4,
              borderLeftColor: '#DC2626',
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>No Cumplen</Text>
            <Text style={{ color: '#DC2626', fontSize: 26, fontWeight: '800', marginTop: 4 }}>
              {totalNoCumple}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              minWidth: 180,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 18,
              borderLeftWidth: 4,
              borderLeftColor: '#D97706',
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>Requieren Revisión</Text>
            <Text style={{ color: '#D97706', fontSize: 26, fontWeight: '800', marginTop: 4 }}>
              {totalRevision}
            </Text>
          </View>
        </View>

        {/* Barra de Filtros y Búsqueda */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 260,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F1F5F9',
              borderRadius: 8,
              paddingHorizontal: 12,
              height: 42
            }}
          >
            <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Buscar por candidato, cédula o cargo..."
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={{ flex: 1, color: '#0F172A', fontSize: 14 }}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['TODOS', 'CUMPLE', 'NO_CUMPLE', 'REQUIERE_REVISION'].map(estado => (
              <TouchableOpacity
                key={estado}
                onPress={() => setFiltroEstado(estado)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: filtroEstado === estado ? '#0F172A' : '#F1F5F9'
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: filtroEstado === estado ? '#FFFFFF' : '#475569'
                  }}
                >
                  {estado.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Listado de Evaluaciones */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#991B1B" />
            <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14 }}>
              Cargando historial de validaciones...
            </Text>
          </View>
        ) : filtrados.length === 0 ? (
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
            <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
            <Text style={{ marginTop: 12, fontSize: 16, fontWeight: '700', color: '#1E293B' }}>
              No se encontraron validaciones
            </Text>
            <Text style={{ color: '#64748B', fontSize: 14, textAlign: 'center', marginTop: 4 }}>
              Inicia una nueva validación cargando certificados en PDF para analizarlos con IA.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/ingresos/nueva')}
              style={{
                marginTop: 16,
                backgroundColor: '#991B1B',
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                Iniciar Primera Validación
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filtrados.map((val) => {
              const esCumple = val.resultado_final === 'CUMPLE';
              const esNoCumple = val.resultado_final === 'NO_CUMPLE';
              const badgeColor = esCumple ? '#16A34A' : esNoCumple ? '#DC2626' : '#D97706';
              const badgeBg = esCumple ? '#DCFCE7' : esNoCumple ? '#FEE2E2' : '#FEF3C7';

              return (
                <TouchableOpacity
                  key={val.id}
                  onPress={() => router.push(`/ingresos/${val.id}`)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 18,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16
                  }}
                >
                  <View style={{ flex: 1, minWidth: 260 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                        {val.candidato_nombre || 'Candidato sin nombre'}
                      </Text>
                      <View
                        style={{
                          backgroundColor: badgeBg,
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: 999
                        }}
                      >
                        <Text style={{ color: badgeColor, fontSize: 12, fontWeight: '800' }}>
                          {val.resultado_final.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                      Cédula: {val.candidato_documento || 'N/A'} {val.candidato_email ? `• ${val.candidato_email}` : ''} • Cargo: {val.cargo_nombre} ({val.cargo_codigo || 'N/A'})
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {val.id_sideap ? (
                        <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#C7D2FE' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#3730A3' }}>SIDEAP #{val.id_sideap}</Text>
                        </View>
                      ) : null}
                      {val.id_perno ? (
                        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#FDE68A' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#92400E' }}>PERNO #{val.id_perno}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
                      <Text style={{ fontSize: 12, color: '#334155' }}>
                        <Text style={{ fontWeight: '700' }}>Req. Exigido:</Text> {val.requisito_minimo_meses} meses
                      </Text>
                      <Text style={{ fontSize: 12, color: '#334155' }}>
                        <Text style={{ fontWeight: '700' }}>Exp. Neta:</Text> {val.experiencia_relacionada_meses} meses
                      </Text>
                      <Text style={{ fontSize: 12, color: '#334155' }}>
                        <Text style={{ fontWeight: '700' }}>Excluido traslapes:</Text> {val.tiempo_excluido_traslapes_meses} meses
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={(e) => {
                        // @ts-ignore
                        if (e?.stopPropagation) e.stopPropagation();
                        router.push(`/ingresos/nueva?rehacerId=${val.id}`);
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: '#EEF2FF',
                        borderWidth: 1,
                        borderColor: '#C7D2FE',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Ionicons name="refresh-outline" size={15} color="#4338CA" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#4338CA' }}>Rehacer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={(e) => {
                        // @ts-ignore
                        if (e?.stopPropagation) e.stopPropagation();
                        pedirConfirmarEliminar(val.id, val.candidato_nombre || 'Candidato');
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: '#FEE2E2',
                        borderWidth: 1,
                        borderColor: '#FECACA',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Eliminar</Text>
                    </TouchableOpacity>

                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: '#F1F5F9',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>Ver Dictamen</Text>
                      <Ionicons name="chevron-forward" size={16} color="#334155" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Reusable (Regla: No alerts) */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
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
              <Ionicons name="alert-circle" size={26} color="#991B1B" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>{modalTitle}</Text>
            </View>
            <Text style={{ fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 20 }}>
              {modalMessage}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                backgroundColor: '#0F172A',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        visible={modalEliminarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !eliminando && setModalEliminarVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
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
              maxWidth: 440,
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="trash" size={22} color="#DC2626" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                Eliminar Dictamen
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 20 }}>
              ¿Estás seguro de que deseas eliminar permanentemente el dictamen de verificación de <Text style={{ fontWeight: '700' }}>{itemAEliminar?.nombre}</Text>? Esta acción no se puede deshacer y borrará el expediente completo.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setModalEliminarVisible(false)}
                disabled={eliminando}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#F1F5F9'
                }}
              >
                <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={ejecutarEliminar}
                disabled={eliminando}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#DC2626',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {eliminando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                )}
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  {eliminando ? 'Eliminando...' : 'Sí, Eliminar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
