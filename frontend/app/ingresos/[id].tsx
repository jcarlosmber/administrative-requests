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
  Linking
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ingresosService, AnalisisCompleto, FormacionAcademicaItem } from '../../lib/ingresosService';

export default function DetalleValidacionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalisisCompleto | null>(null);

  // Estados de Títulos Académicos
  const [titulos, setTitulos] = useState<FormacionAcademicaItem[]>([]);
  const [hayCambios, setHayCambios] = useState(false);
  const [guardandoCambios, setGuardandoCambios] = useState(false);

  // Modal para Crear / Editar Título
  const [modalTituloVisible, setModalTituloVisible] = useState(false);
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  const [formTipo, setFormTipo] = useState<FormacionAcademicaItem['tipo']>('PREGRADO');
  const [formTitulo, setFormTitulo] = useState('');
  const [formInstitucion, setFormInstitucion] = useState('');
  const [formFechaGrado, setFormFechaGrado] = useState('');
  const [formTarjeta, setFormTarjeta] = useState('');
  const [formCumple, setFormCumple] = useState(true);
  const [formJustificacion, setFormJustificacion] = useState('');

  // Modal Confirmar Eliminación
  const [modalEliminarVisible, setModalEliminarVisible] = useState(false);
  const [indexAEliminar, setIndexAEliminar] = useState<number | null>(null);

  // Modales Informativos
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const mostrarMensaje = (titulo: string, mensaje: string) => {
    setModalTitle(titulo);
    setModalMessage(mensaje);
    setModalVisible(true);
  };

  useEffect(() => {
    if (id) {
      cargarValidacion(id);
    }
  }, [id]);

  const cargarValidacion = async (valId: string) => {
    try {
      setLoading(true);
      const res = await ingresosService.obtenerValidacionPorId(valId);
      setData(res);
      setTitulos(res.formacion_academica || []);
      setHayCambios(false);
    } catch (err: any) {
      mostrarMensaje('Error al Cargar', err.message || 'No se pudo obtener el detalle de la validación.');
    } finally {
      setLoading(false);
    }
  };

  const abrirNuevoTitulo = () => {
    setEditandoIndex(null);
    setFormTipo('PREGRADO');
    setFormTitulo('');
    setFormInstitucion('');
    setFormFechaGrado('');
    setFormTarjeta('');
    setFormCumple(true);
    setFormJustificacion('');
    setModalTituloVisible(true);
  };

  const abrirEditarTitulo = (idx: number) => {
    const item = titulos[idx];
    if (!item) return;
    setEditandoIndex(idx);
    setFormTipo(item.tipo || 'PREGRADO');
    setFormTitulo(item.titulo_obtenido || '');
    setFormInstitucion(item.institucion || '');
    setFormFechaGrado(item.fecha_grado || '');
    setFormTarjeta(item.numero_tarjeta_o_registro || '');
    setFormCumple(item.cumple_requisito_cargo !== false);
    setFormJustificacion(item.justificacion || '');
    setModalTituloVisible(true);
  };

  const guardarTituloForm = () => {
    if (!formTitulo.trim()) {
      mostrarMensaje('Campo Requerido', 'Debes ingresar el nombre del título obtenido.');
      return;
    }
    if (!formInstitucion.trim()) {
      mostrarMensaje('Campo Requerido', 'Debes ingresar la institución educativa emisora.');
      return;
    }

    const nuevoItem: FormacionAcademicaItem = {
      tipo: formTipo,
      titulo_obtenido: formTitulo.trim(),
      institucion: formInstitucion.trim(),
      fecha_grado: formFechaGrado.trim() || 'NO CONSTA',
      numero_tarjeta_o_registro: formTarjeta.trim() || undefined,
      cumple_requisito_cargo: formCumple,
      justificacion: formJustificacion.trim()
    };

    let nuevaLista: FormacionAcademicaItem[];
    if (editandoIndex !== null) {
      nuevaLista = [...titulos];
      nuevaLista[editandoIndex] = { ...nuevaLista[editandoIndex], ...nuevoItem };
    } else {
      nuevaLista = [...titulos, nuevoItem];
    }

    setTitulos(nuevaLista);
    setHayCambios(true);
    setModalTituloVisible(false);
  };

  const pedirConfirmarEliminar = (idx: number) => {
    setIndexAEliminar(idx);
    setModalEliminarVisible(true);
  };

  const ejecutarEliminarTitulo = () => {
    if (indexAEliminar === null) return;
    const nuevaLista = titulos.filter((_, idx) => idx !== indexAEliminar);
    setTitulos(nuevaLista);
    setHayCambios(true);
    setModalEliminarVisible(false);
    setIndexAEliminar(null);
  };

  const guardarCambiosServidor = async () => {
    if (!id || !data) return;
    try {
      setGuardandoCambios(true);
      await ingresosService.actualizarValidacion(id, {
        formacion_academica: titulos
      });
      setHayCambios(false);
      setData({ ...data, formacion_academica: titulos });
      mostrarMensaje(
        'Cambios Guardados',
        'Los títulos formativos del expediente han sido actualizados exitosamente en la base de datos y se reflejarán de inmediato en la exportación a Excel.'
      );
    } catch (err: any) {
      mostrarMensaje('Error al Guardar', err.message || 'No se pudieron guardar los cambios.');
    } finally {
      setGuardandoCambios(false);
    }
  };

  const rehacerExpediente = () => {
    if (!id) return;
    router.push(`/ingresos/nueva?rehacerId=${id}`);
  };

  const descargarExcel = () => {
    if (!id) return;
    const url = ingresosService.getExcelDownloadUrl(id);
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#991B1B" />
        <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14 }}>
          Cargando dictamen documental...
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 12 }}>
          Expediente no encontrado
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/ingresos')}
          style={{ marginTop: 16, backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Volver al Listado</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { candidato, cargo_evaluado, consolidado, certificados } = data;
  const esCumple = consolidado.resultado_final === 'CUMPLE';
  const esNoCumple = consolidado.resultado_final === 'NO_CUMPLE';
  const colorEstado = esCumple ? '#16A34A' : esNoCumple ? '#DC2626' : '#D97706';
  const bgEstado = esCumple ? '#DCFCE7' : esNoCumple ? '#FEE2E2' : '#FEF3C7';

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
              Dictamen de Validación de Ingreso
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>
              Expediente: {candidato.nombre} • Cédula: {candidato.documento}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {hayCambios && (
            <TouchableOpacity
              onPress={guardarCambiosServidor}
              disabled={guardandoCambios}
              style={{
                backgroundColor: '#2563EB',
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6
              }}
            >
              {guardandoCambios ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="save-outline" size={18} color="#FFFFFF" />
              )}
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                {guardandoCambios ? 'Guardando...' : 'Guardar Cambios'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={rehacerExpediente}
            style={{
              backgroundColor: '#4338CA',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
              Rehacer Dictamen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={descargarExcel}
            style={{
              backgroundColor: '#16A34A',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
              Exportar Excel
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, maxWidth: 1100, alignSelf: 'center', width: '100%' }}>
        {/* TARJETA PRINCIPAL DE DICTAMEN */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: 24,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 20
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                Resultado Oficial de la Verificación
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                {candidato.nombre}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 14, color: '#475569' }}>
                  Cargo Evaluado: <Text style={{ fontWeight: '700' }}>{cargo_evaluado.nombre}</Text> (Cód. {cargo_evaluado.codigo || 'N/A'} - Grado {cargo_evaluado.grado || 'N/A'})
                </Text>
                {cargo_evaluado.id_sideap ? (
                  <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#C7D2FE' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#3730A3' }}>SIDEAP #{cargo_evaluado.id_sideap}</Text>
                  </View>
                ) : null}
                {cargo_evaluado.id_perno ? (
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>PERNO #{cargo_evaluado.id_perno}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View
              style={{
                backgroundColor: bgEstado,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colorEstado
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '900', color: colorEstado }}>
                {consolidado.resultado_final.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Justificación Técnica */}
          <View
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 10,
              padding: 16,
              marginTop: 18,
              borderLeftWidth: 4,
              borderLeftColor: colorEstado
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
              Justificación Técnica del Dictamen:
            </Text>
            <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20 }}>
              {consolidado.justificacion}
            </Text>
          </View>

          {/* Tarjetas de Métricas de Tiempo */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 18 }}>
            <View style={{ flex: 1, minWidth: 160, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Requisito Mínimo</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                {consolidado.requisito_minimo_meses} meses
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: 160, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Exp. Relacionada Neta</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#16A34A', marginTop: 4 }}>
                {consolidado.experiencia_relacionada_meses} meses
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: 160, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Excluido por Traslapes</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#DC2626', marginTop: 4 }}>
                {consolidado.tiempo_excluido_por_traslapes_meses} meses
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: 160, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Diferencia</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: consolidado.diferencia_meses >= 0 ? '#16A34A' : '#DC2626', marginTop: 4 }}>
                {consolidado.diferencia_meses >= 0 ? '+' : ''}{consolidado.diferencia_meses} meses
              </Text>
            </View>
          </View>
        </View>

        {/* TÍTULOS ACADÉMICOS Y TARJETA PROFESIONAL */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: 20,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 20,
            gap: 14
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="school" size={20} color="#1E40AF" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                Títulos Académicos y Tarjeta Profesional
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#3730A3' }}>
                  {titulos.length} documento(s) formativo(s)
                </Text>
              </View>

              <TouchableOpacity
                onPress={abrirNuevoTitulo}
                style={{
                  backgroundColor: '#1E40AF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                  + Agregar Título / Tarjeta
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Banner de cambios pendientes */}
          {hayCambios && (
            <View
              style={{
                backgroundColor: '#EFF6FF',
                borderColor: '#93C5FD',
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 240 }}>
                <Ionicons name="information-circle" size={20} color="#1D4ED8" />
                <Text style={{ fontSize: 12, color: '#1E40AF', fontWeight: '600' }}>
                  Has realizado cambios en los títulos. Guarda los cambios para que se persistan en el expediente y en el Excel.
                </Text>
              </View>
              <TouchableOpacity
                onPress={guardarCambiosServidor}
                disabled={guardandoCambios}
                style={{
                  backgroundColor: '#1D4ED8',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {guardandoCambios ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                )}
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                  {guardandoCambios ? 'Guardando...' : 'Guardar Cambios'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {titulos.length === 0 ? (
            <View style={{ padding: 14, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', gap: 6 }}>
              <Ionicons name="school-outline" size={28} color="#94A3B8" />
              <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>
                No hay títulos ni tarjetas registradas en este expediente.
              </Text>
              <TouchableOpacity
                onPress={abrirNuevoTitulo}
                style={{ marginTop: 4, paddingVertical: 4, paddingHorizontal: 10 }}
              >
                <Text style={{ fontSize: 12, color: '#1E40AF', fontWeight: '700' }}>
                  Pulsa aquí para agregar uno manualmente
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {titulos.map((fa, idx) => (
                <View
                  key={fa.id || idx}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: fa.cumple_requisito_cargo ? '#BBF7D0' : '#E2E8F0'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 260 }}>
                      <Ionicons
                        name={fa.tipo === 'TARJETA_PROFESIONAL' ? 'card-outline' : 'school-outline'}
                        size={20}
                        color={fa.cumple_requisito_cargo ? '#15803D' : '#2563EB'}
                        style={{ marginTop: 2 }}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                            {fa.titulo_obtenido}
                          </Text>
                          <View
                            style={{
                              backgroundColor: '#E0E7FF',
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 4
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#3730A3' }}>
                              {fa.tipo.replace('_', ' ')}
                            </Text>
                          </View>
                        </View>

                        <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                          {fa.institucion} {fa.fecha_grado && fa.fecha_grado !== 'NO CONSTA' ? `• Fecha: ${fa.fecha_grado}` : ''}
                        </Text>
                        {fa.numero_tarjeta_o_registro && fa.numero_tarjeta_o_registro !== 'NO CONSTA' ? (
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF', marginTop: 2 }}>
                            Registro / Tarjeta N°: {fa.numero_tarjeta_o_registro}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Acciones y estado */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: fa.cumple_requisito_cargo ? '#DCFCE7' : '#FEF3C7',
                          borderWidth: 1,
                          borderColor: fa.cumple_requisito_cargo ? '#86EFAC' : '#FDE68A'
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: fa.cumple_requisito_cargo ? '#15803D' : '#B45309'
                          }}
                        >
                          {fa.cumple_requisito_cargo ? '✓ CUMPLE REQUISITO' : 'EN EVALUACIÓN'}
                        </Text>
                      </View>

                      {/* Botón Editar */}
                      <TouchableOpacity
                        onPress={() => abrirEditarTitulo(idx)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: '#F1F5F9',
                          borderWidth: 1,
                          borderColor: '#CBD5E1'
                        }}
                        accessibilityLabel="Editar título"
                      >
                        <Ionicons name="pencil-outline" size={15} color="#0F172A" />
                      </TouchableOpacity>

                      {/* Botón Eliminar */}
                      <TouchableOpacity
                        onPress={() => pedirConfirmarEliminar(idx)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: '#FEE2E2',
                          borderWidth: 1,
                          borderColor: '#FCA5A5'
                        }}
                        accessibilityLabel="Eliminar título"
                      >
                        <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {fa.justificacion ? (
                    <Text style={{ fontSize: 12, color: '#334155', marginTop: 8, fontStyle: 'italic' }}>
                      <Text style={{ fontWeight: '700' }}>Criterio:</Text> {fa.justificacion}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* DETALLE CERTIFICADO POR CERTIFICADO */}
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 14 }}>
          Certificados Analizados y Evidencias Textuales ({certificados.length})
        </Text>

        <View style={{ gap: 16 }}>
          {certificados.map((c, index) => {
            const esRel = c.clasificacion_experiencia === 'RELACIONADA';
            const coinc = c.experiencia_relacionada?.funciones_coincidentes || [];

            return (
              <View
                key={c.id || index}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#E2E8F0'
                }}
              >
                {/* Encabezado del Certificado */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                        {c.id_certificado}: {c.entidad}
                      </Text>
                      {c.nit_entidad && c.nit_entidad !== 'NO CONSTA' && (
                        <Text style={{ fontSize: 12, color: '#64748B' }}>NIT: {c.nit_entidad}</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 14, color: '#334155', fontWeight: '600', marginTop: 2 }}>
                      Cargo: {c.cargo_certificado} {c.tipo_vinculo ? `(${c.tipo_vinculo})` : ''}
                    </Text>
                  </View>

                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 6,
                      backgroundColor: esRel ? '#DCFCE7' : '#FEE2E2'
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: esRel ? '#16A34A' : '#DC2626' }}>
                      {c.clasificacion_experiencia}
                    </Text>
                  </View>
                </View>

                {/* Periodo y Tiempo */}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 16,
                    backgroundColor: '#F8FAFC',
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 12
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#334155' }}>
                    <Text style={{ fontWeight: '700' }}>Periodo Certificado:</Text> {c.fecha_inicio} al {c.fecha_fin || (c.vinculo_vigente ? 'Vigente' : 'NO CONSTA')}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>
                    <Text style={{ fontWeight: '700' }}>Duración:</Text> {c.tiempo_certificado?.meses_totales_aproximados} meses ({c.tiempo_certificado?.anios}a, {c.tiempo_certificado?.meses}m, {c.tiempo_certificado?.dias}d)
                  </Text>
                  {c.nombre_archivo && (
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      <Text style={{ fontWeight: '700' }}>Archivo:</Text> {c.nombre_archivo}
                    </Text>
                  )}
                </View>

                {/* Traslapes */}
                {c.traslapes && c.traslapes.length > 0 && (
                  <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#FCA5A5' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="warning" size={16} color="#DC2626" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>
                        TRASLAPE DETECTADO (Periodo no computable dos veces):
                      </Text>
                    </View>
                    {c.traslapes.map((t, tidx) => (
                      <Text key={tidx} style={{ fontSize: 12, color: '#991B1B', marginTop: 4 }}>
                        • {t.explicacion}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Cotejo de Funciones Coincidentes */}
                <View style={{ marginTop: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
                    Cotejo Funcional con el Manual del Cargo:
                  </Text>

                  {coinc.length === 0 ? (
                    <Text style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                      No se encontraron coincidencias funcionales directas o sustancialmente equivalentes con el cargo.
                    </Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {coinc.map((f, fidx) => (
                        <View
                          key={fidx}
                          style={{
                            backgroundColor: '#F1F5F9',
                            padding: 12,
                            borderRadius: 8,
                            borderLeftWidth: 3,
                            borderLeftColor: '#3B82F6'
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', flex: 1 }}>
                              Función del Cargo: {f.funcion_del_cargo}
                            </Text>
                            <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#1D4ED8' }}>
                                {f.coincidencia || 'COINCIDENTE'}
                              </Text>
                            </View>
                          </View>

                          <Text style={{ fontSize: 12, color: '#334155', marginTop: 6, fontStyle: 'italic' }}>
                            Evidencia en Certificado: "{f.evidencia_textual || f.funcion_certificada}"
                          </Text>

                          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                            <Text style={{ fontWeight: '600' }}>Criterio:</Text> {f.justificacion}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* 1. VERIFICACIÓN FORMAL DEL CERTIFICADO (7 CHECKS BÁSICOS) */}
                {(() => {
                  const vf = c.verificacion_formal;
                  const c1 = vf ? vf.corresponde_aspirante : true;
                  const d1 = vf?.aspirante_nombre_doc || candidato.nombre;
                  const c2 = vf ? vf.entidad_identificable : (!!c.entidad && c.entidad !== 'NO CONSTA');
                  const d2 = vf?.entidad_nombre || c.entidad;
                  const c3 = vf ? vf.suscriptor_identificable : (!!c.firmante && c.firmante !== 'NO CONSTA');
                  const d3 = vf?.suscriptor_nombre_cargo_calidad || (c.firmante ? `${c.firmante} - ${c.cargo_firmante || 'Suscriptor'}` : 'NO CONSTA');
                  const c4 = vf ? vf.cuenta_con_firma : (c.documento?.firma_visible ?? true);
                  const d4 = vf?.tipo_firma || (c.documento?.firma_visible ? 'Firma visible identificada' : 'Sin firma identificable');
                  const c5 = vf ? vf.fecha_expedicion_identificable : (!!c.fecha_expedicion && c.fecha_expedicion !== 'NO CONSTA');
                  const d5 = vf?.fecha_expedicion || c.fecha_expedicion || 'NO CONSTA';
                  const c6 = vf ? vf.documento_legible_integro : (c.documento?.documento_legible ?? true);
                  const d6 = vf?.detalle_legibilidad || (c.documento?.documento_legible ? 'Documento legible, íntegro y sin alteraciones' : 'Documento con ilegibilidad');
                  const c7 = vf ? vf.mecanismos_contacto_verificacion : true;
                  const d7 = vf?.mecanismos_contacto_cuales || (c.ciudad_expedicion ? `Ciudad: ${c.ciudad_expedicion} • Membrete institucional` : 'Membrete institucional de la entidad emisora');

                  const cumpleFormal = c1 && c2 && c3 && c4 && c5 && c6 && c7;

                  const items = [
                    { num: 1, texto: 'El certificado corresponde al aspirante y contiene su nombre completo e identificación.', ok: c1, detalle: d1 },
                    { num: 2, texto: 'Se identifica claramente la entidad o empresa que expide el certificado.', ok: c2, detalle: d2 },
                    { num: 3, texto: 'Se identifica el nombre, cargo y calidad de quien suscribe el documento.', ok: c3, detalle: d3 },
                    { num: 4, texto: 'El certificado cuenta con firma manuscrita, electrónica o digital, según corresponda.', ok: c4, detalle: d4 },
                    { num: 5, texto: 'Se identifica la fecha de expedición del certificado.', ok: c5, detalle: d5 },
                    { num: 6, texto: 'El documento es legible, íntegro y no presenta alteraciones visibles.', ok: c6, detalle: d6 },
                    { num: 7, texto: 'Se dispone de datos de contacto o mecanismos para verificar la información con la entidad emisora. (cuáles)', ok: c7, detalle: d7, esCuales: true }
                  ];

                  return (
                    <View
                      style={{
                        marginTop: 16,
                        backgroundColor: '#F8FAFC',
                        borderRadius: 10,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#E2E8F0'
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="checkbox-outline" size={18} color="#991B1B" />
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                            1. Verificación formal del certificado
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: cumpleFormal ? '#DCFCE7' : '#FEF3C7',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: cumpleFormal ? '#BBF7D0' : '#FDE68A'
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: cumpleFormal ? '#166534' : '#92400E' }}>
                            {cumpleFormal ? '✓ Cumple verificación formal' : '⚠️ Requiere revisión formal'}
                          </Text>
                        </View>
                      </View>

                      <View style={{ gap: 8 }}>
                        {items.map((it) => (
                          <View
                            key={it.num}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'flex-start',
                              gap: 8,
                              backgroundColor: '#FFFFFF',
                              padding: 8,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: it.ok ? '#E2E8F0' : '#FECACA'
                            }}
                          >
                            <Ionicons
                              name={it.ok ? 'checkmark-circle' : 'close-circle'}
                              size={18}
                              color={it.ok ? '#16A34A' : '#DC2626'}
                              style={{ marginTop: 1 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', lineHeight: 17 }}>
                                {it.texto}
                              </Text>
                              {it.detalle ? (
                                <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                  {it.esCuales ? 'Mecanismos / Datos: ' : 'Consta: '}
                                  <Text style={{ fontWeight: it.esCuales ? '700' : '500', color: '#0F172A' }}>
                                    {it.detalle}
                                  </Text>
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })()}
              </View>
            );
          })}
        </View>

        {/* DOCUMENTOS Y CERTIFICACIONES QUE NO APLICAN */}
        <View
          style={{
            marginTop: 20,
            backgroundColor: '#FFFBEB',
            borderRadius: 12,
            padding: 20,
            borderWidth: 1,
            borderColor: '#FDE68A',
            gap: 14
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="alert-circle" size={22} color="#D97706" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#92400E' }}>
                Documentos y Certificaciones que NO Aplican
              </Text>
            </View>
            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                {data.documentos_no_aplican && data.documentos_no_aplican.length > 0
                  ? `${data.documentos_no_aplican.length} excluido(s)`
                  : '0 excluidos'}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: '#78350F', lineHeight: 18 }}>
            Relación explícita de documentos que no constituyen experiencia laboral válida, certificaciones sin funciones o requisitos de ley, o documentos que no guardan relación con el perfil exigido.
          </Text>

          {(!data.documentos_no_aplican || data.documentos_no_aplican.length === 0) ? (
            <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
              <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>
                ✓ Todos los documentos aportados son válidos y computables para la evaluación del cargo.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {data.documentos_no_aplican.map((doc, idx) => (
                <View
                  key={doc.id || idx}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#FECACA',
                    borderLeftWidth: 4,
                    borderLeftColor: '#DC2626'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                    <View style={{ flex: 1, minWidth: 220 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                        {doc.descripcion || doc.nombre_archivo}
                      </Text>
                      {doc.entidad ? (
                        <Text style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
                          Entidad emisora: <Text style={{ fontWeight: '600' }}>{doc.entidad}</Text>
                        </Text>
                      ) : null}
                      {doc.nombre_archivo ? (
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                          Archivo: {doc.nombre_archivo}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FCA5A5' }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#DC2626' }}>
                        NO APLICA
                      </Text>
                    </View>
                  </View>

                  {/* Motivo por el cual no aplica */}
                  <View style={{ marginTop: 8, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#FECACA' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#991B1B' }}>
                      ¿Por qué no aplica al cargo?
                    </Text>
                    <Text style={{ fontSize: 12, color: '#7F1D1D', marginTop: 2, lineHeight: 17 }}>
                      {doc.motivo_no_aplica}
                    </Text>
                    {doc.sustento_criterio ? (
                      <Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 4, fontStyle: 'italic' }}>
                        Sustento / Criterio: {doc.sustento_criterio}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Crear / Editar Título */}
      <Modal
        visible={modalTituloVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalTituloVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 22,
              width: '100%',
              maxWidth: 580,
              maxHeight: '90%',
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="school" size={22} color="#1E40AF" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                  {editandoIndex !== null ? 'Editar Título o Tarjeta' : 'Agregar Nuevo Título / Tarjeta'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalTituloVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {/* Selector de Tipo */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                  Tipo de Documento Formativo *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {[
                    { id: 'PREGRADO', label: 'Pregrado' },
                    { id: 'ESPECIALIZACION', label: 'Especialización' },
                    { id: 'MAESTRIA', label: 'Maestría' },
                    { id: 'DOCTORADO', label: 'Doctorado' },
                    { id: 'BACHILLER', label: 'Bachiller' },
                    { id: 'TECNICO', label: 'Técnico' },
                    { id: 'TECNOLOGO', label: 'Tecnólogo' },
                    { id: 'TARJETA_PROFESIONAL', label: 'Tarjeta Profesional' },
                    { id: 'OTRO', label: 'Otro' }
                  ].map((t) => {
                    const sel = formTipo === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => setFormTipo(t.id as any)}
                        style={{
                          backgroundColor: sel ? '#1E40AF' : '#F1F5F9',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: sel ? '#1E40AF' : '#CBD5E1'
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: sel ? '#FFFFFF' : '#475569' }}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Título Obtenido */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Título Obtenido / Denominación *
                </Text>
                <TextInput
                  value={formTitulo}
                  onChangeText={setFormTitulo}
                  placeholder="Ej. Abogado, Bachiller Académico, Contador Público"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A'
                  }}
                />
              </View>

              {/* Institución */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Institución Educativa Emisora *
                </Text>
                <TextInput
                  value={formInstitucion}
                  onChangeText={setFormInstitucion}
                  placeholder="Ej. Universidad Nacional de Colombia, Colegio Mayor"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A'
                  }}
                />
              </View>

              {/* Fila Fecha y Tarjeta */}
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    Fecha de Grado / Expedición
                  </Text>
                  <TextInput
                    value={formFechaGrado}
                    onChangeText={setFormFechaGrado}
                    placeholder="AAAA-MM-DD (o NO CONSTA)"
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: '#0F172A'
                    }}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    N° Tarjeta / Registro
                  </Text>
                  <TextInput
                    value={formTarjeta}
                    onChangeText={setFormTarjeta}
                    placeholder="Opcional (Ej. 345612 CSJ)"
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: '#0F172A'
                    }}
                  />
                </View>
              </View>

              {/* Cumple Requisito */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                  ¿Cumple Requisito Exigido para el Cargo?
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setFormCumple(true)}
                    style={{
                      flex: 1,
                      backgroundColor: formCumple ? '#DCFCE7' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: formCumple ? '#16A34A' : '#CBD5E1',
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons
                      name={formCumple ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={formCumple ? '#15803D' : '#64748B'}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: formCumple ? '#15803D' : '#64748B' }}>
                      Sí Cumple Requisito
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setFormCumple(false)}
                    style={{
                      flex: 1,
                      backgroundColor: !formCumple ? '#FEF3C7' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: !formCumple ? '#D97706' : '#CBD5E1',
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons
                      name={!formCumple ? 'alert-circle' : 'ellipse-outline'}
                      size={16}
                      color={!formCumple ? '#B45309' : '#64748B'}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: !formCumple ? '#B45309' : '#64748B' }}>
                      En Evaluación / Adicional
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Justificación */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  Justificación / Criterio de Validación
                </Text>
                <TextInput
                  value={formJustificacion}
                  onChangeText={setFormJustificacion}
                  multiline
                  numberOfLines={2}
                  placeholder="Ej. Cumple con el núcleo básico del conocimiento exigido en el manual de funciones."
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A',
                    minHeight: 56
                  }}
                />
              </View>
            </ScrollView>

            {/* Botones Acciones Modal */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14 }}>
              <TouchableOpacity
                onPress={() => setModalTituloVisible(false)}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: '#F1F5F9',
                  borderWidth: 1,
                  borderColor: '#CBD5E1'
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={guardarTituloForm}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 18,
                  borderRadius: 8,
                  backgroundColor: '#1E40AF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {editandoIndex !== null ? 'Actualizar Título' : 'Agregar Título'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal
        visible={modalEliminarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalEliminarVisible(false)}
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
              padding: 22,
              width: '100%',
              maxWidth: 420,
              borderWidth: 1,
              borderColor: '#E2E8F0'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Ionicons name="trash-bin-outline" size={24} color="#DC2626" />
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                Eliminar Título Académico
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 20 }}>
              ¿Estás seguro de que deseas eliminar este título formativo de este expediente? Recuerda guardar los cambios para sincronizarlos con la base de datos.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setModalEliminarVisible(false)}
                style={{
                  backgroundColor: '#F1F5F9',
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#CBD5E1'
                }}
              >
                <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={ejecutarEliminarTitulo}
                style={{
                  backgroundColor: '#DC2626',
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
