import React, { useState, useEffect, useMemo } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import { ingresosService, CargoEvaluado, AnalisisCompleto } from '../../lib/ingresosService';

export default function NuevaValidacionScreen() {
  const router = useRouter();

  // Estados de Cargo y Buscador
  const [cargos, setCargos] = useState<CargoEvaluado[]>([]);
  const [cargoSeleccionado, setCargoSeleccionado] = useState<CargoEvaluado | null>(null);
  const [busquedaCargo, setBusquedaCargo] = useState('');
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [nombreCargo, setNombreCargo] = useState('Profesional Especializado');
  const [codigoCargo, setCodigoCargo] = useState('222');
  const [gradoCargo, setGradoCargo] = useState('24');
  const [dependenciaCargo, setDependenciaCargo] = useState('Dirección Distrital de Doctrina y Asuntos Normativos');
  const [mesesExigidos, setMesesExigidos] = useState('54');
  const [formacionExigida, setFormacionExigida] = useState('Título profesional en Derecho o afines. Título de posgrado relacionado.');
  const [funcionesTexto, setFuncionesTexto] = useState(
    '1. Proyectar conceptos jurídicos sobre temas de doctrina distrital y asuntos normativos de competencia de la entidad.\n2. Analizar y revisar proyectos de actos administrativos, decretos, resoluciones y proyectos de acuerdo distritales.\n3. Sustanciar respuestas a consultas y derechos de petición formulados por entidades públicas o ciudadanos en materia jurídica.\n4. Participar en la formulación, seguimiento y evaluación de políticas jurídicas de alcance distrital.\n5. Asistir técnicamente a los organismos distritales en la correcta aplicación e interpretación de la normatividad vigente.'
  );

  // Estados de Candidato
  const [candidatoNombre, setCandidatoNombre] = useState('');
  const [candidatoDoc, setCandidatoDoc] = useState('');
  const [candidatoEmail, setCandidatoEmail] = useState('');
  const [candidatoTel, setCandidatoTel] = useState('');

  // Estados de Archivos PDF
  const [archivosPdf, setArchivosPdf] = useState<Array<{ name: string; base64: string; size?: number }>>([]);

  // Estados de Proceso
  const [analizando, setAnalizando] = useState(false);
  const [progresoTexto, setProgresoTexto] = useState('');

  // Resultado del análisis previo a guardar
  const [analisisResultado, setAnalisisResultado] = useState<AnalisisCompleto | null>(null);
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
      const data = await ingresosService.obtenerCargos();
      setCargos(data || []);
      if (data && data.length > 0) {
        seleccionarCargo(data[0]);
      }
    } catch (e) {
      console.log('No se pudieron cargar cargos predefinidos');
    }
  };

  const cargosFiltrados = useMemo(() => {
    if (!busquedaCargo.trim()) return cargos;
    const query = busquedaCargo.toLowerCase().trim();
    return cargos.filter(c =>
      (c.nombre && c.nombre.toLowerCase().includes(query)) ||
      (c.codigo && c.codigo.toString().toLowerCase().includes(query)) ||
      (c.grado && c.grado.toString().toLowerCase().includes(query)) ||
      (c.dependencia && c.dependencia.toLowerCase().includes(query))
    );
  }, [cargos, busquedaCargo]);

  const seleccionarCargo = (c: CargoEvaluado) => {
    setCargoSeleccionado(c);
    setNombreCargo(c.nombre);
    setCodigoCargo(c.codigo || '');
    setGradoCargo(c.grado || '');
    setDependenciaCargo(c.dependencia || '');
    setMesesExigidos(String(c.requisito_experiencia_meses || 0));
    setFormacionExigida(c.requisitos_formacion || '');
    if (Array.isArray(c.funciones_cargo)) {
      setFuncionesTexto(c.funciones_cargo.join('\n'));
    }
    setMostrarCatalogo(false);
  };

  // Selección de archivos PDF con expo-document-picker
  const seleccionarArchivos = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets) return;

      const nuevosArchivos: Array<{ name: string; base64: string; size?: number }> = [];

      for (const asset of result.assets) {
        let base64 = '';
        if (Platform.OS === 'web' && asset.file) {
          base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(asset.file as Blob);
          });
        } else {
          // En móvil nativo Expo
          const FileSystem = require('expo-file-system');
          base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64
          });
        }

        nuevosArchivos.push({
          name: asset.name,
          base64: base64,
          size: asset.size
        });
      }

      setArchivosPdf(prev => [...prev, ...nuevosArchivos]);
    } catch (err: any) {
      mostrarMensaje('Error al seleccionar archivos', err.message || 'No se pudieron cargar los archivos.');
    }
  };

  const eliminarArchivo = (index: number) => {
    setArchivosPdf(prev => prev.filter((_, i) => i !== index));
  };

  const iniciarAnalisisIA = async () => {
    if (!nombreCargo.trim()) {
      mostrarMensaje('Datos Incompletos', 'Debes ingresar el nombre del cargo a evaluar.');
      return;
    }
    if (archivosPdf.length === 0) {
      mostrarMensaje('Sin Certificados', 'Debes adjuntar al menos un archivo PDF de certificación laboral.');
      return;
    }

    try {
      setAnalizando(true);
      setProgresoTexto('Preparando certificados y enviando a Gemini...');

      const funcionesArray = funcionesTexto
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const cargoPayload: CargoEvaluado = {
        id: cargoSeleccionado?.id,
        nombre: nombreCargo,
        codigo: codigoCargo,
        grado: gradoCargo,
        dependencia: dependenciaCargo,
        requisito_experiencia_meses: parseFloat(mesesExigidos) || 54,
        requisitos_formacion: formacionExigida,
        funciones_cargo: funcionesArray
      };

      const candidatoPayload = {
        nombre: candidatoNombre || 'Candidato en Evaluación',
        documento: candidatoDoc || 'NO CONSTA',
        email: candidatoEmail,
        telefono: candidatoTel
      };

      setProgresoTexto('Analizando documentos con IA y cotejando funciones oficiales...');
      const resultado = await ingresosService.analizarDocumentos(
        archivosPdf,
        cargoPayload,
        candidatoPayload
      );

      setProgresoTexto('Auditando traslapes y calculando tiempos válidos...');
      setAnalisisResultado(resultado);
      setAnalizando(false);
    } catch (err: any) {
      setAnalizando(false);
      mostrarMensaje('Error en el Análisis', err.message || 'Ocurrió un error al procesar los documentos.');
    }
  };

  const confirmarYGuardar = async () => {
    if (!analisisResultado) return;
    try {
      setGuardando(true);
      const res = await ingresosService.guardarValidacion(analisisResultado);
      setGuardando(false);
      router.replace(`/ingresos/${res.id}`);
    } catch (err: any) {
      setGuardando(false);
      mostrarMensaje('Error al Guardar', err.message || 'No se pudo guardar la validación en la base de datos.');
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
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
            Nueva Validación de Ingreso
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, maxWidth: 1100, alignSelf: 'center', width: '100%' }}>
        {!analisisResultado ? (
          <>
            {/* SECCIÓN 1: DATOS DEL CARGO Y FUNCIONES OFICIALES */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 22,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 20
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Ionicons name="briefcase" size={22} color="#991B1B" />
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>
                  1. Perfil del Cargo y Funciones Oficiales del Manual
                </Text>
              </View>

              {/* BUSCADOR DE CARGOS OFICIALES DEL MANUAL */}
              <View
                style={{
                  marginBottom: 18,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0'
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                    🔍 Buscar Cargo en el Manual Oficial SJD:
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {cargos.length} cargos disponibles
                  </Text>
                </View>

                {/* Barra de Búsqueda */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      height: 42
                    }}
                  >
                    <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <TextInput
                      placeholder="Buscar por nombre, código, grado o dependencia..."
                      placeholderTextColor="#94A3B8"
                      value={busquedaCargo}
                      onChangeText={(t) => {
                        setBusquedaCargo(t);
                        if (!mostrarCatalogo) setMostrarCatalogo(true);
                      }}
                      onFocus={() => setMostrarCatalogo(true)}
                      style={{ flex: 1, color: '#0F172A', fontSize: 14 }}
                    />
                    {busquedaCargo.length > 0 && (
                      <TouchableOpacity onPress={() => setBusquedaCargo('')} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => setMostrarCatalogo(!mostrarCatalogo)}
                    style={{
                      backgroundColor: mostrarCatalogo ? '#0F172A' : '#1E293B',
                      paddingHorizontal: 14,
                      height: 42,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons name={mostrarCatalogo ? 'chevron-up' : 'list'} size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                      {mostrarCatalogo ? 'Ocultar' : 'Ver Lista'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Cargo Seleccionado Actualmente */}
                {cargoSeleccionado && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#EFF6FF',
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginTop: 10
                    }}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                      <Text style={{ fontSize: 13, color: '#1E40AF', fontWeight: '600' }} numberOfLines={1}>
                        <Text style={{ fontWeight: '800' }}>{cargoSeleccionado.nombre}</Text> (Cód. {cargoSeleccionado.codigo || 'N/A'} - Gr. {cargoSeleccionado.grado || 'N/A'}) • {cargoSeleccionado.dependencia || 'N/A'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setMostrarCatalogo(true)}
                      style={{ marginLeft: 8 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>Cambiar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Lista Desplegable de Resultados */}
                {mostrarCatalogo && (
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      maxHeight: 270,
                      overflow: 'hidden'
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: '#F1F5F9',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderBottomWidth: 1,
                        borderBottomColor: '#E2E8F0',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                        {cargosFiltrados.length} cargo(s) encontrado(s)
                      </Text>
                      <TouchableOpacity onPress={() => setMostrarCatalogo(false)}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 230 }}>
                      {cargosFiltrados.length === 0 ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
                            No se encontraron cargos con "{busquedaCargo}".
                          </Text>
                          <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4 }}>
                            Puedes diligenciar los datos manualmente en los campos inferiores.
                          </Text>
                        </View>
                      ) : (
                        cargosFiltrados.map((c, idx) => {
                          const esSeleccionado =
                            cargoSeleccionado?.id === c.id ||
                            (cargoSeleccionado?.nombre === c.nombre &&
                              cargoSeleccionado?.codigo === c.codigo &&
                              cargoSeleccionado?.grado === c.grado &&
                              cargoSeleccionado?.dependencia === c.dependencia);

                          return (
                            <TouchableOpacity
                              key={c.id || idx}
                              onPress={() => seleccionarCargo(c)}
                              style={{
                                padding: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: '#F1F5F9',
                                backgroundColor: esSeleccionado ? '#EFF6FF' : '#FFFFFF',
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 10
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                    {c.nombre}
                                  </Text>
                                  <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 11, color: '#475569', fontWeight: '700' }}>
                                      Cód. {c.codigo || 'N/A'} - Gr. {c.grado || 'N/A'}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
                                  {c.dependencia || 'Sin dependencia asignada'}
                                </Text>
                              </View>

                              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>
                                    {c.requisito_experiencia_meses}m req.
                                  </Text>
                                </View>
                                {Array.isArray(c.funciones_cargo) && (
                                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>
                                    {c.funciones_cargo.length} funciones
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                <View style={{ flex: 2, minWidth: 240 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Nombre del Cargo *
                  </Text>
                  <TextInput
                    value={nombreCargo}
                    onChangeText={setNombreCargo}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A'
                    }}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 100 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Código
                  </Text>
                  <TextInput
                    value={codigoCargo}
                    onChangeText={setCodigoCargo}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A'
                    }}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 100 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Grado
                  </Text>
                  <TextInput
                    value={gradoCargo}
                    onChangeText={setGradoCargo}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A'
                    }}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 140 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Meses Requeridos *
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    value={mesesExigidos}
                    onChangeText={setMesesExigidos}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A',
                      fontWeight: '700'
                    }}
                  />
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                  Dependencia
                </Text>
                <TextInput
                  value={dependenciaCargo}
                  onChangeText={setDependenciaCargo}
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: '#FFFFFF',
                    fontSize: 14,
                    color: '#0F172A'
                  }}
                />
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                  Requisitos de Formación Académica
                </Text>
                <TextInput
                  value={formacionExigida}
                  onChangeText={setFormacionExigida}
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: '#FFFFFF',
                    fontSize: 14,
                    color: '#0F172A'
                  }}
                />
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                  Funciones Oficiales del Cargo (Manual de Funciones) - Una por línea *
                </Text>
                <TextInput
                  multiline
                  numberOfLines={5}
                  value={funcionesTexto}
                  onChangeText={setFuncionesTexto}
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: '#FFFFFF',
                    fontSize: 13,
                    color: '#0F172A',
                    minHeight: 110,
                    textAlignVertical: 'top'
                  }}
                />
              </View>
            </View>

            {/* SECCIÓN 2: DATOS DEL CANDIDATO */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 22,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 20
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Ionicons name="person" size={22} color="#991B1B" />
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>
                  2. Datos del Aspirante / Candidato
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                <View style={{ flex: 1, minWidth: 240 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Nombre Completo
                  </Text>
                  <TextInput
                    placeholder="Ej. Carlos Andrés Mendoza"
                    placeholderTextColor="#94A3B8"
                    value={candidatoNombre}
                    onChangeText={setCandidatoNombre}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A'
                    }}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 200 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Número de Documento / Cédula
                  </Text>
                  <TextInput
                    placeholder="Ej. 1018456789"
                    placeholderTextColor="#94A3B8"
                    value={candidatoDoc}
                    onChangeText={setCandidatoDoc}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A'
                    }}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 200 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                    Correo Electrónico
                  </Text>
                  <TextInput
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor="#94A3B8"
                    value={candidatoEmail}
                    onChangeText={setCandidatoEmail}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      fontSize: 14,
                      color: '#0F172A'
                    }}
                  />
                </View>
              </View>
            </View>

            {/* SECCIÓN 3: SUBIDA DE CERTIFICADOS EN PDF */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 22,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 24
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="document-attach" size={22} color="#991B1B" />
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>
                    3. Certificados Laborales (PDF)
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={seleccionarArchivos}
                  style={{
                    backgroundColor: '#1E293B',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    Adjuntar Certificados
                  </Text>
                </TouchableOpacity>
              </View>

              {archivosPdf.length === 0 ? (
                <TouchableOpacity
                  onPress={seleccionarArchivos}
                  style={{
                    borderWidth: 2,
                    borderColor: '#CBD5E1',
                    borderStyle: 'dashed',
                    borderRadius: 12,
                    padding: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F8FAFC'
                  }}
                >
                  <Ionicons name="document-text-outline" size={44} color="#94A3B8" />
                  <Text style={{ marginTop: 10, fontSize: 15, fontWeight: '700', color: '#1E293B' }}>
                    Haz clic aquí para seleccionar los certificados PDF
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                    Puedes seleccionar uno o varios archivos simultáneamente.
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 10 }}>
                  {archivosPdf.map((file, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        backgroundColor: '#F1F5F9',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#E2E8F0'
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Ionicons name="document" size={24} color="#DC2626" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                            {file.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748B' }}>
                            Certificado #{idx + 1}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => eliminarArchivo(idx)}
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* BOTÓN DE ACCIÓN PRINCIPAL */}
            <TouchableOpacity
              onPress={iniciarAnalisisIA}
              disabled={analizando}
              style={{
                backgroundColor: '#991B1B',
                paddingVertical: 16,
                borderRadius: 10,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#991B1B',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8
              }}
            >
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                Ejecutar Análisis y Cotejo con IA Gemini
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* VISTA PREVIA INMEDIATA DEL ANÁLISIS */
          <View style={{ gap: 20 }}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 24,
                borderWidth: 1,
                borderColor: '#E2E8F0'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>DICTAMEN PRELIMINAR</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                    {analisisResultado.candidato.nombre}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>
                    Cédula: {analisisResultado.candidato.documento} • Cargo: {analisisResultado.cargo_evaluado.nombre}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor:
                      analisisResultado.consolidado.resultado_final === 'CUMPLE'
                        ? '#DCFCE7'
                        : analisisResultado.consolidado.resultado_final === 'NO_CUMPLE'
                        ? '#FEE2E2'
                        : '#FEF3C7',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color:
                        analisisResultado.consolidado.resultado_final === 'CUMPLE'
                          ? '#16A34A'
                          : analisisResultado.consolidado.resultado_final === 'NO_CUMPLE'
                          ? '#DC2626'
                          : '#D97706'
                    }}
                  >
                    {analisisResultado.consolidado.resultado_final.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  padding: 16,
                  marginTop: 18,
                  borderLeftWidth: 4,
                  borderLeftColor: '#0F172A'
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
                  Justificación Técnica:
                </Text>
                <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20 }}>
                  {analisisResultado.consolidado.justificacion}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 18 }}>
                <View style={{ flex: 1, minWidth: 150, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Requisito Exigido</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>
                    {analisisResultado.consolidado.requisito_minimo_meses} meses
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 150, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Exp. Relacionada Neta</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#16A34A' }}>
                    {analisisResultado.consolidado.experiencia_relacionada_meses} meses
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 150, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Excluido por Traslapes</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#DC2626' }}>
                    {analisisResultado.consolidado.tiempo_excluido_por_traslapes_meses} meses
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 150, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Diferencia</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>
                    {analisisResultado.consolidado.diferencia_meses >= 0 ? '+' : ''}
                    {analisisResultado.consolidado.diferencia_meses} meses
                  </Text>
                </View>
              </View>
            </View>

            {/* Resumen de Certificados Analizados */}
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                Certificados Extraídos ({analisisResultado.certificados.length})
              </Text>

              {analisisResultado.certificados.map((c, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 10,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>
                      {c.id_certificado}: {c.entidad}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 4,
                        backgroundColor: c.clasificacion_experiencia === 'RELACIONADA' ? '#DCFCE7' : '#FEE2E2'
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: c.clasificacion_experiencia === 'RELACIONADA' ? '#16A34A' : '#DC2626'
                        }}
                      >
                        {c.clasificacion_experiencia}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                    Cargo: {c.cargo_certificado} • Periodo: {c.fecha_inicio} al {c.fecha_fin || 'Vigente'}
                  </Text>

                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                    Tiempo Certificado: {c.tiempo_certificado?.meses_totales_aproximados} meses ({c.tiempo_certificado?.anios}a, {c.tiempo_certificado?.meses}m, {c.tiempo_certificado?.dias}d)
                  </Text>

                  {c.traslapes && c.traslapes.length > 0 && (
                    <View style={{ backgroundColor: '#FEF2F2', padding: 8, borderRadius: 6, marginTop: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                        ⚠️ TRASLAPE IDENTIFICADO:
                      </Text>
                      {c.traslapes.map((t, tidx) => (
                        <Text key={tidx} style={{ fontSize: 11, color: '#991B1B' }}>
                          • {t.explicacion}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* BOTONES DE CONFIRMACIÓN */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setAnalisisResultado(null)}
                style={{
                  flex: 1,
                  backgroundColor: '#E2E8F0',
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#334155', fontWeight: '700', fontSize: 14 }}>
                  Volver a Editar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmarYGuardar}
                disabled={guardando}
                style={{
                  flex: 2,
                  backgroundColor: '#16A34A',
                  paddingVertical: 14,
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
                  <Ionicons name="save" size={18} color="#FFFFFF" />
                )}
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                  {guardando ? 'Guardando...' : 'Confirmar y Guardar Dictamen Oficial'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal de Progreso del Análisis IA */}
      <Modal visible={analizando} transparent={true} animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 32,
              alignItems: 'center',
              maxWidth: 440,
              width: '100%'
            }}
          >
            <ActivityIndicator size="large" color="#991B1B" />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 18 }}>
              Analizando Certificados con IA
            </Text>
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              {progresoTexto || 'Procesando documentos y auditando requisitos...'}
            </Text>
            <View style={{ marginTop: 20, backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>
                Aplicando las 18 reglas de analista documental y cotejo funcional estricto.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Notificaciones (Regla: No alerts) */}
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
