import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  useWindowDimensions,
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

  const pctCumple = totalEvaluados > 0 ? Math.round((totalCumple / totalEvaluados) * 100) : 0;
  const pctNoCumple = totalEvaluados > 0 ? Math.round((totalNoCumple / totalEvaluados) * 100) : 0;
  const pctRevision = totalEvaluados > 0 ? Math.round((totalRevision / totalEvaluados) * 100) : 0;

  const kpis = [
    {
      id: 'TODOS',
      title: 'Total Expedientes',
      valor: totalEvaluados,
      subtitulo: 'Cotejos IA en plataforma',
      badge: '100% Censo',
      badgeBg: '#F1F5F9',
      badgeColor: '#475569',
      badgeBorder: '#E2E8F0',
      icon: 'folder-open',
      iconColor: '#174A7E',
      iconBg: '#EEF4FB',
      iconBorder: '#D6E4F4',
      accentColor: '#174A7E',
      barColor: '#174A7E',
      barPct: 100,
      filtroLabel: 'Ver todos',
    },
    {
      id: 'CUMPLE',
      title: 'Cumplen Requisitos',
      valor: totalCumple,
      subtitulo: 'Perfil y experiencia idóneos',
      badge: `${pctCumple}% Viables`,
      badgeBg: '#ECFDF5',
      badgeColor: '#047857',
      badgeBorder: 'rgba(5, 150, 105, 0.25)',
      icon: 'checkmark-done-circle',
      iconColor: '#047857',
      iconBg: '#ECFDF5',
      iconBorder: 'rgba(5, 150, 105, 0.25)',
      accentColor: '#047857',
      barColor: '#059669',
      barPct: pctCumple,
      filtroLabel: 'Filtrar viables',
    },
    {
      id: 'NO_CUMPLE',
      title: 'No Cumplen Requisitos',
      valor: totalNoCumple,
      subtitulo: 'Déficit en tiempo o título',
      badge: `${pctNoCumple}% No viables`,
      badgeBg: '#FFF1F2',
      badgeColor: '#BE123C',
      badgeBorder: 'rgba(225, 29, 72, 0.25)',
      icon: 'close-circle',
      iconColor: '#BE123C',
      iconBg: '#FFF1F2',
      iconBorder: 'rgba(225, 29, 72, 0.25)',
      accentColor: '#BE123C',
      barColor: '#E11D48',
      barPct: pctNoCumple,
      filtroLabel: 'Filtrar no viables',
    },
    {
      id: 'REQUIERE_REVISION',
      title: 'Requieren Revisión',
      valor: totalRevision,
      subtitulo: 'Pendiente validar soportes',
      badge: `${pctRevision}% Observaciones`,
      badgeBg: '#FFFBEB',
      badgeColor: '#B45309',
      badgeBorder: 'rgba(217, 119, 6, 0.25)',
      icon: 'time',
      iconColor: '#D97706',
      iconBg: '#FFFBEB',
      iconBorder: 'rgba(217, 119, 6, 0.25)',
      accentColor: '#D97706',
      barColor: '#F59E0B',
      barPct: pctRevision,
      filtroLabel: 'Filtrar revisión',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header Institucional */}
      <View
        style={{
          backgroundColor: '#0D2A48',
          paddingTop: Platform.OS === 'ios' ? 50 : 20,
          paddingBottom: 22,
          paddingHorizontal: 24,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              backgroundColor: '#174A7E',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text
              style={{
                color: 'rgba(214, 228, 244, 0.75)',
                fontSize: 10.5,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 1.1,
              }}
            >
              Secretaría Jurídica Distrital • Talento Humano
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 1 }}>
              Validación Técnica de Ingresos
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push('/rrhh')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.18)',
            }}
          >
            <Ionicons name="grid-outline" size={16} color="#D6E4F4" style={{ marginRight: 6 }} />
            <Text style={{ color: '#D6E4F4', fontSize: 13, fontWeight: '700' }}>Módulos RRHH</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/ingresos/cargos')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.18)',
            }}
          >
            <Ionicons name="briefcase-outline" size={16} color="#D6E4F4" style={{ marginRight: 6 }} />
            <Text style={{ color: '#D6E4F4', fontSize: 13, fontWeight: '600' }}>Cargos Oficiales</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/dashboard')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.18)',
            }}
          >
            <Ionicons name="home-outline" size={16} color="#D6E4F4" style={{ marginRight: 6 }} />
            <Text style={{ color: '#D6E4F4', fontSize: 13, fontWeight: '600' }}>Ir a Solicitudes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/ingresos/nueva')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#174A7E',
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 8,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 4,
            }}
          >
            <Ionicons name="add-circle" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>Nueva Validación</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* ============================================================== */}
        {/* KPI CARDS EJECUTIVOS E INTERACTIVOS                            */}
        {/* ============================================================== */}
        <View style={{ marginBottom: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#0F172A',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Métricas de Idoneidad y Validación
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Haz clic en una tarjeta para filtrar los expedientes en tiempo real
              </Text>
            </View>

            {filtroEstado !== 'TODOS' && (
              <TouchableOpacity
                onPress={() => setFiltroEstado('TODOS')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#EEF4FB',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: '#D6E4F4',
                }}
              >
                <Ionicons name="funnel-outline" size={13} color="#174A7E" />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#174A7E' }}>
                  Restablecer a todos ({totalEvaluados})
                </Text>
                <Ionicons name="close" size={14} color="#174A7E" />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {kpis.map((k) => {
              const isSelected = filtroEstado === k.id;
              return (
                <TouchableOpacity
                  key={k.id}
                  onPress={() => setFiltroEstado(k.id)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    minWidth: 220,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    padding: 18,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? k.accentColor : '#E2E8F0',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.08 : 0.03,
                    shadowRadius: 8,
                    elevation: 2,
                    justifyContent: 'space-between',
                  }}
                >
                  <View>
                    {/* Fila superior: Icono + Badge porcentual */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: k.iconBg,
                          borderWidth: 1,
                          borderColor: k.iconBorder,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name={k.icon as any} size={22} color={k.iconColor} />
                      </View>

                      <View
                        style={{
                          backgroundColor: isSelected ? k.accentColor : k.badgeBg,
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                          borderRadius: 9999,
                          borderWidth: 1,
                          borderColor: isSelected ? k.accentColor : k.badgeBorder,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {isSelected && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                        <Text
                          style={{
                            color: isSelected ? '#FFFFFF' : k.badgeColor,
                            fontSize: 11,
                            fontWeight: '700',
                          }}
                        >
                          {isSelected ? 'Filtro Activo' : k.badge}
                        </Text>
                      </View>
                    </View>

                    {/* Número y Título */}
                    <Text
                      style={{
                        fontSize: 32,
                        fontWeight: '800',
                        color: isSelected ? k.accentColor : '#0F172A',
                        letterSpacing: -0.5,
                        marginTop: 10,
                      }}
                    >
                      {k.valor}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13.5,
                        fontWeight: '700',
                        color: '#1E293B',
                        marginTop: 2,
                      }}
                    >
                      {k.title}
                    </Text>
                  </View>

                  {/* Micro-barra de progreso y subtítulo */}
                  <View style={{ marginTop: 14 }}>
                    <View
                      style={{
                        height: 4,
                        backgroundColor: '#F1F5F9',
                        borderRadius: 9999,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.max(k.barPct, 0)}%`,
                          height: '100%',
                          backgroundColor: k.barColor,
                          borderRadius: 9999,
                        }}
                      />
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                        {k.subtitulo}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: isSelected ? k.accentColor : '#94A3B8',
                        }}
                      >
                        {isSelected ? 'Mostrando' : k.filtroLabel}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Barra de Filtros y Búsqueda */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 260,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              paddingHorizontal: 12,
              height: 40,
            }}
          >
            <Ionicons name="search" size={17} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Buscar por candidato, cédula o cargo..."
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={{ flex: 1, color: '#0F172A', fontSize: 13.5 }}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'TODOS', label: 'Todos', count: totalEvaluados },
              { id: 'CUMPLE', label: 'Cumplen', count: totalCumple },
              { id: 'NO_CUMPLE', label: 'No Cumplen', count: totalNoCumple },
              { id: 'REQUIERE_REVISION', label: 'Revisión', count: totalRevision },
            ].map((f) => {
              const sel = filtroEstado === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setFiltroEstado(f.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                    backgroundColor: sel ? '#0D2A48' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: sel ? '#0D2A48' : '#E2E8F0',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: sel ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {f.label}
                  </Text>
                  <View
                    style={{
                      backgroundColor: sel ? 'rgba(255, 255, 255, 0.2)' : '#E2E8F0',
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 9999,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10.5,
                        fontWeight: '800',
                        color: sel ? '#FFFFFF' : '#64748B',
                      }}
                    >
                      {f.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
